// WeChat chrome actions: the real DSH verbs behind the title-bar ⋯ menu.
// One factory per session, built by apply.ts from the root services
// (layout/sessions) and the locale seat. The WeChat window keeps only the
// minimal verbs WeChat semantics allow — collapse the sidebar, clear the
// session — and every press answers with a WeChat-style toast.

import type { Context } from '@deepseek-ai/cordis'
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import type { NS } from '../locales.ts'
import { wechatTip } from './wechat-feedback.ts'

/** The title-bar verb bundle (⋯ menu). */
export interface WechatChromeActions {
  /** 折叠侧栏: collapse the main (sidebar) panel. */
  toggleSidebar: () => void
  /** 清空会话: clear the current session back to the no-session view. */
  clearSession: () => void
}

interface WechatChromeDeps {
  ctx: Context
  t: TranslateNS<typeof NS>
}

/** Build the per-session title-bar verb bundle. */
export function createWechatChromeActions({ ctx, t }: WechatChromeDeps): WechatChromeActions {
  const layout = ctx.layout
  const sessions = ctx.sessions
  return {
    toggleSidebar() {
      layout.toggleSidebar()
      wechatTip(t('wechat.sidebarToggled'))
    },
    clearSession() {
      sessions.clear()
      wechatTip(t('wechat.sessionCleared'))
    },
  }
}
