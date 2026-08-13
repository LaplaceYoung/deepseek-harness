// QQ2006 chrome actions: the real DSH verbs behind every window-chrome
// button. One factory per session, built by apply.ts from the root services
// (layout/sessions/workspaces/theme), the input hub (composer focus, slash
// menu, model popup) and the chat store (view switching). Buttons that have
// no official-code equivalent keep their QQ visual but bind to the nearest
// official service — model popup via the slash trigger, settings via the
// sidebar trigger, archive via workspaces.archiveSession — and every press
// answers with a QQTip feedback line.

import type { Context } from '@deepseek-ai/cordis'
import type { BoundActions } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { ThemeRuntime } from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import type { createChatStore } from '../stores.ts'
import type { InputHub } from '../input/hub.ts'
import { NS } from '../locales.ts'
import { qqChatActions, qqComposerActions } from './qq-chrome-actions.ts'
import { qqTip } from './qq-feedback.ts'
import { cycleQqWinSkin, type QQWinSkin } from './qq-win-skin.ts'
import { playQqSound, toggleQqSound } from './qq-sound.ts'

/** The window-chrome verb bundle (title bar + big/small toolbars + bottom row). */
export interface QQChromeActions {
  /** 更换颜色 (title): advance the win-skin preset. */
  cycleWinSkin: () => void
  /** 菜单 (title) / 群邮件: open the settings panel. */
  openSettings: () => void
  /** 隐藏 (title): collapse the main (sidebar) panel. */
  toggleSidebar: () => void
  /** 关闭 (title): clear the current session back to the no-session view. */
  clearSession: () => void
  /** 短信 / 邀请: focus the composer draft. */
  focusComposer: () => void
  /** 邀请: prefill a start-subagent prompt template and focus. */
  inviteSubagent: () => void
  /** 视频 / 消息模式(T): switch the active view tab (chat ↔ trajectory). */
  setView: (view: string) => void
  /** 语音: toggle the new-message alert sound. */
  toggleNewMessageSound: () => void
  /** 聊天记录(H): load an older history page (delegates to the chat view). */
  loadOlder: () => void
  /** ↓: scroll the transcript to the newest message (delegates to the chat view). */
  scrollToBottom: () => void
  /** A 字体: cycle 小/中/大 message font size. */
  cycleFontSize: () => void
  /** 传文件: scroll to the latest tool call row. */
  locateLatestToolCall: () => void
  /** 3D秀: open the details panel. */
  openDetails: () => void
  /** 窗口: collapse the details panel. */
  closeDetails: () => void
  /** 群空间: open the current session's subagent catalog. */
  openSubagentCatalog: () => void
  /** 群成员头像: open one child (subagent) session. */
  openChildSession: (childId: SessionId) => void
  /** 音乐: open the /model selection popup (via the slash trigger). */
  openModelMenu: () => void
  /** 其他 / ☰: toggle the slash command menu. */
  toggleCommandMenu: () => void
  /** ☺ / 超级表情: append an emoji to the draft and focus. */
  insertEmoji: (emoji: string) => void
  /** 🖼: append an image-reference template to the draft. */
  insertImageTemplate: () => void
  /** 分享 (big toolbar): copy the session share text. */
  copyShareText: () => void
  /** 截图 / ✂: copy the most recent assistant reply. */
  copyLastReply: () => void
  /** 🎤 语音对讲: read the most recent reply aloud (TTS, toggle off). */
  speakLastReply: () => void
  /** 🎵 场景: cycle 浅色 → 深色 → QQ2006. */
  cycleTheme: () => void
  /** 黑名单: archive the current session. */
  archiveSession: () => void
}

const WIN_SKIN_LABEL: Record<QQWinSkin, string> = {
  classic: '经典蓝',
  pink: '粉红',
  mint: '薄荷绿',
  violet: '紫罗兰',
}

/** Synthetic slash-menu trigger hit for programmatic menu/model launches. */
interface TriggerHitShape {
  trigger: '/'
  query: string
  position: 'leading' | 'inline'
  span: { start: number; end: number; draftRev: number }
}

interface QQChromeDeps {
  ctx: Context
  inputHub: InputHub
  chatActions: BoundActions<ReturnType<typeof createChatStore>>
  sessionId: SessionId
  t: TranslateNS<typeof NS>
}

/** Build the per-session chrome verb bundle. */
export function createQqChromeActions({
  ctx, inputHub, chatActions, sessionId, t,
}: QQChromeDeps): QQChromeActions {
  const sessions = ctx.sessions
  const workspaces = ctx.workspaces
  const layout = ctx.layout
  // ui-theme is optional (the Appearance row may be composed out); ctx.get
  // returns undefined for an unprovided service — the optional-service idiom.
  const theme = ctx.get('theme') as ThemeRuntime | undefined

  const viewExists = (id: string): boolean =>
    ctx.slots.entries('conversation.view').some(entry => entry.options.id === id)

  const focusComposer = (): void => {
    qqComposerActions(sessionId)?.focusComposer()
    // The InputBar may not have mounted its registration yet (blank session
    // settling); the resident textarea is the stable fallback target.
    document.querySelector<HTMLTextAreaElement>('[data-input-scroll] textarea')?.focus({ preventScroll: true })
  }

  const triggerHit = (query: string): TriggerHitShape => {
    const shell = inputHub.shell(sessionId)
    const snapshot = shell.snapshot
    const caret = snapshot.draft.length
    return {
      trigger: '/',
      query,
      position: snapshot.draft.slice(0, caret).trim() === '' ? 'leading' : 'inline',
      span: { start: caret, end: caret, draftRev: snapshot.draftRev },
    }
  }

  const insertIntoDraft = (text: string): void => {
    const shell = inputHub.shell(sessionId)
    shell.setDraft(shell.snapshot.draft + text)
    focusComposer()
  }

  return {
    cycleWinSkin() {
      const next = cycleQqWinSkin()
      playQqSound('global')
      qqTip(t('qq.winSkin.switched', { name: WIN_SKIN_LABEL[next] }))
    },
    openSettings() {
      // Official equivalent of the legacy SettingsService: the sidebar-foot
      // trigger that opens the settings modal is always mounted (wide or
      // rail), so a programmatic click is the real open path.
      const trigger = document.querySelector<HTMLButtonElement>('[data-slot="sidebar.settings"] button')
      if (trigger !== null) {
        trigger.click()
        return
      }
      // No settings plugin composed: reveal the sidebar where the trigger
      // lives and say so.
      layout.toggleSidebar()
      qqTip(t('qq.settingsUnavailable'))
    },
    toggleSidebar() {
      layout.toggleSidebar()
      playQqSound('global')
      qqTip(t('qq.sidebarToggled'))
    },
    clearSession() {
      sessions.clear()
      playQqSound('global')
      qqTip(t('qq.sessionCleared'))
    },
    focusComposer() {
      focusComposer()
      playQqSound('global')
    },
    inviteSubagent() {
      insertIntoDraft(t('qq.inviteTemplate'))
      playQqSound('global')
      qqTip(t('qq.inviteHint'))
    },
    setView(view: string) {
      if (viewExists(view)) {
        chatActions.setView(view)
        qqTip(t('qq.viewSwitched', { view }))
        return
      }
      qqTip(t('qq.viewUnavailable', { view }))
    },
    toggleNewMessageSound() {
      const next = toggleQqSound()
      if (next) playQqSound('msg')
      qqTip(next ? t('qq.soundOn') : t('qq.soundOff'))
    },
    loadOlder() {
      const actions = qqChatActions(sessionId)
      if (actions === undefined) {
        qqTip(t('qq.historyUnavailable'))
        return
      }
      actions.loadOlder()
      playQqSound('global')
    },
    scrollToBottom() {
      const actions = qqChatActions(sessionId)
      if (actions === undefined) {
        qqTip(t('qq.scrollUnavailable'))
        return
      }
      actions.scrollToBottom()
      playQqSound('global')
    },
    cycleFontSize() {
      const current = document.body.getAttribute('data-qq-font')
      const next = current === 's' ? 'l' : current === 'l' ? null : 's'
      if (next === null) document.body.removeAttribute('data-qq-font')
      else document.body.setAttribute('data-qq-font', next)
      playQqSound('global')
      qqTip(t(next === 's' ? 'qq.font.small' : next === 'l' ? 'qq.font.large' : 'qq.font.medium'))
    },
    locateLatestToolCall() {
      const row = document.querySelector<HTMLElement>(
        '[data-chat-flow] [data-chat-flow-kind="tool-call"]:last-of-type',
      )
      if (row === null) {
        qqTip(t('qq.noToolCall'))
        return
      }
      row.scrollIntoView({ block: 'nearest' })
      playQqSound('global')
      qqTip(t('qq.toolCallLocated'))
    },
    openDetails() {
      layout.openDetails()
      playQqSound('global')
      qqTip(t('qq.detailsOpened'))
    },
    closeDetails() {
      layout.closeDetails()
      playQqSound('global')
      qqTip(t('qq.detailsClosed'))
    },
    openSubagentCatalog() {
      sessions.setSubagentCatalogOpen(sessionId, true)
      playQqSound('global')
      qqTip(t('qq.catalogOpened'))
    },
    openChildSession(childId: SessionId) {
      const address = sessions.subagentAddress(childId)
      if (address !== undefined) {
        sessions.openSubagent(address)
        return
      }
      sessions.open(childId)
      playQqSound('global')
    },
    openModelMenu() {
      const triggers = inputHub.inputTriggers(sessionId)
      if (triggers === undefined) {
        qqTip(t('qq.modelUnavailable'))
        return
      }
      triggers.toggleSource('command', triggerHit('model'))
      playQqSound('global')
    },
    toggleCommandMenu() {
      const triggers = inputHub.inputTriggers(sessionId)
      if (triggers === undefined) {
        qqTip(t('qq.commandsUnavailable'))
        return
      }
      triggers.toggleSource('command', triggerHit(''))
      playQqSound('global')
    },
    insertEmoji(emoji: string) {
      insertIntoDraft(emoji)
      playQqSound('global')
    },
    insertImageTemplate() {
      insertIntoDraft(t('qq.imageTemplate'))
      playQqSound('global')
    },
    copyShareText() {
      const summary = sessions.list.getSnapshot().byId[sessionId]
      void writeClipboard(t('qq.shareText', {
        title: summary?.displayTitle ?? sessionId,
        id: sessionId,
      })).then((ok) => {
        qqTip(ok ? t('qq.shareCopied') : t('qq.copyFailed'))
      })
    },
    copyLastReply() {
      const text = qqChatActions(sessionId)?.lastReplyText() ?? ''
      if (text === '') {
        qqTip(t('qq.noReply'))
        return
      }
      void writeClipboard(text).then((ok) => {
        qqTip(ok ? t('qq.replyCopied') : t('qq.copyFailed'))
      })
    },
    speakLastReply() {
      if (typeof speechSynthesis === 'undefined') {
        qqTip(t('qq.ttsUnavailable'))
        return
      }
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel()
        qqTip(t('qq.ttsStopped'))
        return
      }
      const text = qqChatActions(sessionId)?.lastReplyText() ?? ''
      if (text === '') {
        qqTip(t('qq.noReply'))
        return
      }
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      speechSynthesis.speak(utterance)
      qqTip(t('qq.ttsStarted'))
    },
    cycleTheme() {
      if (theme === undefined) {
        qqTip(t('qq.themeUnavailable'))
        return
      }
      const snapshot = theme.getTheme()
      const current = snapshot.preference === 'system' ? snapshot.active.id : snapshot.preference
      const next = current === 'dark' ? 'qq2006' : current === 'qq2006' ? 'light' : 'dark'
      theme.setTheme(next)
      qqTip(t('qq.themeSwitched', { theme: next }))
    },
    archiveSession() {
      void workspaces.archiveSession(sessionId).then(() => {
        sessions.clear()
        playQqSound('global')
        qqTip(t('qq.archived'))
      }).catch(() => {
        qqTip(t('qq.archiveFailed'))
      })
    },
  }
}
