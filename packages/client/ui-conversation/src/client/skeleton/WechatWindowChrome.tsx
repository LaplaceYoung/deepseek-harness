// WechatWindowChrome: the WeChat-style title bar rendered by the session
// header while the wexin skin is active — a white 44px bar with the
// conversation name centered and a ⋯ button at the right. The ⋯ menu carries
// the minimal verbs WeChat semantics allow (折叠侧栏 / 清空会话), each driving
// a real DSH service through the injected WechatChromeActions bundle (see
// wechat/wechat-actions.ts) and answering with a WeChat-style toast.

import { useEffect, useRef, useState } from 'react'
import type { SessionId, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import type { WechatChromeActions } from '../wechat/wechat-actions.ts'
import type { NS } from '../locales.ts'
import css from './WechatWindowChrome.module.css'

export interface WechatWindowChromeProps {
  /** The rendered session. */
  sessionId: SessionId
  /** Global sessions feed (display title). */
  useSessions: SnapshotSelectorHook<SessionListState>
  /** Locale seat (title + menu copy). */
  t: TranslateNS<typeof NS>
  /** The real-verb bundle for every menu item. */
  wechat: WechatChromeActions
}

/** The ⋯ overflow menu of the WeChat title bar. */
function OverflowMenu({ t, wechat, onClose }: {
  t: TranslateNS<typeof NS>
  wechat: WechatChromeActions
  onClose: () => void
}) {
  return (
    <div className={css.menu} role="menu" data-wechat-menu>
      <button
        type="button"
        role="menuitem"
        className={css.menuItem}
        onClick={() => {
          onClose()
          wechat.toggleSidebar()
        }}
      >
        {t('wechat.title.collapseSidebar')}
      </button>
      <button
        type="button"
        role="menuitem"
        className={css.menuItem}
        onClick={() => {
          onClose()
          wechat.clearSession()
        }}
      >
        {t('wechat.title.clearSession')}
      </button>
    </div>
  )
}

/**
 * The WeChat window title bar: white surface, centered conversation name,
 * ⋯ button (right) opening the minimal overflow menu. Skin-gated by the
 * caller; the ⋯ menu closes on outside click or Escape.
 * @param props - session, sessions feed, locale seat, and the action bundle.
 * @returns the title bar block.
 */
export function WechatWindowChrome({ sessionId, useSessions, t, wechat }: WechatWindowChromeProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const displayTitle = useSessions(s => s.byId[sessionId]?.displayTitle ?? sessionId)
  const moreRef = useRef<HTMLDivElement | null>(null)

  // The ⋯ menu is a lightweight self-contained popover: close on outside
  // pointer-down and Escape, mirroring the Menu atom's dismissal semantics.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: PointerEvent): void => {
      const root = moreRef.current
      if (root === null) return
      const target = event.target instanceof Node ? event.target : null
      if (target !== null && root.contains(target)) return
      setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <div className={css.titlebar} data-wechat-titlebar>
      <span className={css.title} title={displayTitle}>{displayTitle}</span>
      <div ref={moreRef} className={css.more}>
        <button
          type="button"
          className={css.moreBtn}
          aria-label={t('wechat.title.more')}
          aria-haspopup="menu"
          aria-expanded={menuOpen || undefined}
          onClick={() => { setMenuOpen(value => !value) }}
        >
          <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden>
            <circle cx="3.2" cy="8" r="1.4" fill="currentColor" />
            <circle cx="8" cy="8" r="1.4" fill="currentColor" />
            <circle cx="12.8" cy="8" r="1.4" fill="currentColor" />
          </svg>
        </button>
        {/* Window minimize chrome (微信桌面窗口控制）：纯 CSS 自绘的
            一条横杠，装饰性控件 — 无窗口可最小化，所以不接收焦点。 */}
        <button
          type="button"
          className={css.minBtn}
          data-wechat-min
          tabIndex={-1}
          aria-hidden="true"
        />
        {menuOpen && <OverflowMenu t={t} wechat={wechat} onClose={() => { setMenuOpen(false) }} />}
      </div>
    </div>
  )
}
