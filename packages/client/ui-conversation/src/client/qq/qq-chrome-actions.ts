// Per-session chrome-action registry: the composer chrome (small toolbar /
// bottom row) and the window chrome (big toolbar) need verbs whose targets
// live inside other trees — ChatView owns loadOlder/scrollToBottom and the
// last-reply text, InputBar owns the textarea focus. The registry is a
// module store keyed by session: renderers register on mount (effect
// disposer), readers use the plain getters from event handlers.

import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'

/** Verbs the chat view can serve to the QQ chrome. */
export interface QQChatActions {
  /** Pull one older history page (聊天记录/H). */
  loadOlder: () => void
  /** Scroll the transcript to the newest message (↓). */
  scrollToBottom: () => void
  /** Full text of the most recent settled assistant reply (截图/✂/🎤). */
  lastReplyText: () => string
}

/** Verbs the composer bar can serve to the QQ chrome. */
export interface QQComposerActions {
  /** Focus the draft textarea (短信 / 邀请). */
  focusComposer: () => void
  /**
   * Append a `> text` quote block to the draft and focus the composer
   * (消息操作行「引用」). The inserter is registered by the composer bar,
   * so the verb is session-scoped with the live machine.
   */
  quote: (text: string) => void
}

/** Verbs the window chrome's group bar can serve (群空间 / 企业好友). */
export interface QQGroupActions {
  /** Toggle the expandable member list of the current session's group. */
  toggleMembers: () => void
}

const chatActions = new Map<SessionId, QQChatActions>()
const composerActions = new Map<SessionId, QQComposerActions>()
const groupActions = new Map<SessionId, QQGroupActions>()
const listeners = new Set<() => void>()

function notify(): void {
  for (const listener of listeners) listener()
}

/** Register the chat-view verbs for one session; returns the disposer. */
export function registerQqChatActions(sessionId: SessionId, actions: QQChatActions): () => void {
  chatActions.set(sessionId, actions)
  notify()
  return () => {
    if (chatActions.get(sessionId) === actions) {
      chatActions.delete(sessionId)
      notify()
    }
  }
}

/** Register the composer-bar verbs for one session; returns the disposer. */
export function registerQqComposerActions(sessionId: SessionId, actions: QQComposerActions): () => void {
  composerActions.set(sessionId, actions)
  notify()
  return () => {
    if (composerActions.get(sessionId) === actions) {
      composerActions.delete(sessionId)
      notify()
    }
  }
}

/** Register the group-bar verbs for one session; returns the disposer. */
export function registerQqGroupActions(sessionId: SessionId, actions: QQGroupActions): () => void {
  groupActions.set(sessionId, actions)
  notify()
  return () => {
    if (groupActions.get(sessionId) === actions) {
      groupActions.delete(sessionId)
      notify()
    }
  }
}

/** Plain read of the chat-view verbs (event-handler path). */
export function qqChatActions(sessionId: SessionId | undefined): QQChatActions | undefined {
  return sessionId === undefined ? undefined : chatActions.get(sessionId)
}

/** Plain read of the composer-bar verbs (event-handler path). */
export function qqComposerActions(sessionId: SessionId | undefined): QQComposerActions | undefined {
  return sessionId === undefined ? undefined : composerActions.get(sessionId)
}

/** Plain read of the group-bar verbs (event-handler path). */
export function qqGroupActions(sessionId: SessionId | undefined): QQGroupActions | undefined {
  return sessionId === undefined ? undefined : groupActions.get(sessionId)
}
