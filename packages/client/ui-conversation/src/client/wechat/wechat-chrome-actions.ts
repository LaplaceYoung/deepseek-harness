// Per-session composer-action registry: the WeChat message hover row (引用)
// needs a verb whose target lives inside the InputBar tree (the composer
// machine owns the draft). The registry is a module store keyed by session:
// the composer bar registers on mount (effect disposer), readers use the
// plain getters from event handlers.

import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'

/** Verbs the composer bar can serve to the WeChat hover actions. */
export interface WechatComposerActions {
  /** Focus the draft textarea. */
  focusComposer: () => void
  /**
   * Append a `> text` quote block to the draft and focus the composer
   * (消息操作行「引用」). The inserter is registered by the composer bar,
   * so the verb is session-scoped with the live machine.
   */
  quote: (text: string) => void
}

const composerActions = new Map<SessionId, WechatComposerActions>()

/** Register the composer-bar verbs for one session; returns the disposer. */
export function registerWechatComposerActions(
  sessionId: SessionId,
  actions: WechatComposerActions,
): () => void {
  composerActions.set(sessionId, actions)
  return () => {
    if (composerActions.get(sessionId) === actions) {
      composerActions.delete(sessionId)
    }
  }
}

/** Plain read of the composer-bar verbs (event-handler path). */
export function wechatComposerActions(sessionId: SessionId | undefined): WechatComposerActions | undefined {
  return sessionId === undefined ? undefined : composerActions.get(sessionId)
}
