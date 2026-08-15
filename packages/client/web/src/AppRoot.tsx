/**
 * Shell root: boot loading page → (boot settled) → real UI in one switch.
 * Pure kernel component with zero plugin dependencies — before settled it may
 * only rely on itself (the fail-loud presentation must not depend on the
 * system whose failure it reports; the status/signal stores are kernel-own,
 * shell self-sufficiency rule); the real UI is produced by the
 * app-shell entry once every entry is active. A failed boot keeps the
 * loading page, lists the per-entry fiber states and the sweep report (fail
 * loud, no partial UI).
 *
 * Weixin skin: the boot card is wrapped in a WeChat login window (green logo
 * head / account+password form / remember+auto-login checkboxes /
 * three-state green login button). Every piece is `display:none` outside
 * `body[data-ds-skin='wexin']` (AppRoot.module.css zero-pollution
 * contract), so the default loading page renders byte-for-byte as before.
 * The window is purely presentational chrome for the boot gate: pressing
 * 登录 runs the 登录中… feedback while the boot chain settles, and in the
 * failed state the button becomes 重试 (reload). Account/remember/
 * auto-login preferences persist under dsh.wexin.* keys; the password never
 * persists (no real credentials are stored — boot auth is not a thing).
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { KernelSignal, LoaderStatus } from './loader-status.ts'
import css from './AppRoot.module.css'

/** AppRoot props: settled signal, fiber-state projection feed, boot failure report, deferred real-UI factory. */
export interface AppRootProps {
  /** True once the boot chain settled (loader quiesced + all entries ACTIVE); the boot closure flips it. */
  settled: KernelSignal<boolean>
  /** Per-entry fiber-state projection store (drives loading/failed rendering). */
  status: KernelSignal<LoaderStatus>
  /** Boot failure report (the settle rejection message); undefined while loading or after success. */
  error: KernelSignal<string | undefined>
  /** Builds the real UI; called only after settled. */
  renderApp: () => ReactNode
}

/** Skin attribute/value the ui-skin-wexin plugin mirrors (spelled out: no
 * value imports in the shell — see boot.tsx). */
const SKIN_ATTRIBUTE = 'data-ds-skin'
const SKIN_VALUE = 'wexin'

/** localStorage keys owned by the WeChat login window (dsh.wexin.* namespace). */
const WX_ACCOUNT_KEY = 'dsh.wexin.account'
const WX_REMEMBER_KEY = 'dsh.wexin.remember'
const WX_AUTO_LOGIN_KEY = 'dsh.wexin.autoLogin'

/** Connecting-dots cycle period (登录中 → 登录中. → .. → ...). */
const DOTS_MS = 400
/** Auto-login arm delay after the checkbox is ticked. */
const AUTO_LOGIN_MS = 400
/** How long the "connecting" feedback runs before the button settles back. */
const CONNECTING_WINDOW_MS = 2000

function readStorage(key: string): string | undefined {
  if (typeof localStorage === 'undefined') return undefined
  try {
    return localStorage.getItem(key) ?? undefined
  } catch {
    return undefined // Privacy-mode storage failure: default.
  }
}

function writeStorage(key: string, value: string): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // Privacy-mode storage failure: the preference simply does not persist.
  }
}

/** Boot gate: loading page until the boot settles; failures stay here. */
export function AppRoot(props: AppRootProps) {
  const settled = useSyncExternalStore(props.settled.subscribe, props.settled.getSnapshot)
  const status = useSyncExternalStore(props.status.subscribe, props.status.getSnapshot)
  const error = useSyncExternalStore(props.error.subscribe, props.error.getSnapshot)
  const failed = Object.entries(status).filter(([, s]) => s === 'failed')
  const loud = error !== undefined || failed.length > 0

  // ── Weixin login-window state (cosmetic; default skin renders nothing) ──
  const [account, setAccount] = useState(() => readStorage(WX_ACCOUNT_KEY) ?? 'DeepSeek')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => readStorage(WX_REMEMBER_KEY) !== '0')
  const [autoLogin, setAutoLogin] = useState(() => readStorage(WX_AUTO_LOGIN_KEY) === '1')
  const [pressed, setPressed] = useState(false)
  const [dots, setDots] = useState('')
  const autoFired = useRef(false)
  // Set by boot.tsx before this component renders; the plugin re-mirrors it
  // after settle, so a snapshot read is authoritative for the boot page.
  const skinActive = typeof document !== 'undefined' && document.body?.getAttribute(SKIN_ATTRIBUTE) === SKIN_VALUE

  const connecting = pressed && !settled && !loud
  useEffect(() => {
    if (!connecting) return
    const timer = window.setInterval(() => {
      setDots(dots => (dots.length >= 3 ? '' : `${dots}.`))
    }, DOTS_MS)
    return () => window.clearInterval(timer)
  }, [connecting])

  // Single-trigger connecting window: after 2s the button settles back
  // (WeChat semantics — no endless animation loop).
  useEffect(() => {
    if (!pressed || settled || loud) return
    const timer = window.setTimeout(() => setPressed(false), CONNECTING_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [pressed, settled, loud])

  // Auto-login: ticked → press 登录 once after a beat (ref-guarded, never
  // re-armed by subsequent renders).
  useEffect(() => {
    if (!skinActive || !autoLogin || autoFired.current || settled || loud) return
    const timer = window.setTimeout(() => {
      autoFired.current = true
      setPressed(true)
    }, AUTO_LOGIN_MS)
    return () => window.clearTimeout(timer)
  }, [skinActive, autoLogin, settled, loud])

  const handleAccountChange = (value: string): void => {
    setAccount(value)
    writeStorage(WX_ACCOUNT_KEY, value)
  }

  const handleRememberChange = (next: boolean): void => {
    setRemember(next)
    writeStorage(WX_REMEMBER_KEY, next ? '1' : '0')
    // WeChat linkage: clearing 记住账号 also clears 自动登录.
    if (!next) {
      setAutoLogin(false)
      writeStorage(WX_AUTO_LOGIN_KEY, '0')
    }
  }

  const handleAutoLoginChange = (next: boolean): void => {
    setAutoLogin(next)
    writeStorage(WX_AUTO_LOGIN_KEY, next ? '1' : '0')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    if (loud) {
      // Failed state: the button is 重试 — reload the shell.
      window.location.reload()
      return
    }
    if (account.trim() === '') return
    setPressed(true)
  }

  if (settled) return <>{props.renderApp()}</>

  const loginLabel = connecting
    ? `登录中${dots}`
    : loud
      ? '重试'
      : autoLogin
        ? '自动登录'
        : '登录'

  return (
    <div className={css.boot}>
      <div className={css.card}>
        {/* Weixin login window — hidden outside the skin scope (CSS contract). */}
        <div className={css.wxWindow}>
          <div className={css.wxHead}>
            <span className={css.wxLogo} aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 3.5c-4.7 0-8.5 3.4-8.5 7.6 0 2.3 1.2 4.4 3.1 5.8V20l3.4-1.7c.6.1 1.3.2 2 .2 4.7 0 8.5-3.4 8.5-7.6S16.7 3.5 12 3.5Z"
                  fill="#fff"
                />
              </svg>
            </span>
            <span className={css.wxTitle}>微信登录</span>
          </div>
          <button type="button" className={css.wxClose} tabIndex={-1} aria-hidden="true" />
          <div className={css.wxBody}>
            <form className={css.wxForm} onSubmit={handleSubmit}>
              <label className={css.wxField}>
                <span className={css.wxFieldLabel}>微信号</span>
                <input
                  className={css.wxInput}
                  value={account}
                  onChange={event => handleAccountChange(event.target.value)}
                  placeholder="请输入微信号"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className={css.wxField}>
                <span className={css.wxFieldLabel}>密码</span>
                <input
                  className={css.wxInput}
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="请输入密码（本机不保存）"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <div className={css.wxCheckRow}>
                <label className={css.wxCheck}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={event => handleRememberChange(event.target.checked)}
                  />
                  记住账号
                </label>
                <label className={css.wxCheck}>
                  <input
                    type="checkbox"
                    checked={autoLogin}
                    onChange={event => handleAutoLoginChange(event.target.checked)}
                  />
                  自动登录
                </label>
              </div>
              <button
                type="submit"
                className={`wexin-btn ${css.wxLoginBtn}${connecting ? ` ${css.wxConnecting}` : ''}`}
                disabled={account.trim() === '' && !loud}
              >
                {loginLabel}
              </button>
            </form>
          </div>
        </div>
        <div className={css.wordmark}>HARNESS</div>
        {!loud
          ? (
            <>
              <div className={css.spinner} />
              <div className={css.hint}>Loading plugins…</div>
            </>
          )
          : (
            <div className={css.failed}>
              <div className={css.failedTitle}>Failed to load plugins</div>
              {failed.map(([id]) => <div key={id} className={css.failedItem}>{id}</div>)}
              {error !== undefined && <div className={css.failedItem}>{error}</div>}
            </div>
          )}
      </div>
    </div>
  )
}
