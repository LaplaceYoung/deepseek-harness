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
 * QQ2006 skin: the boot card is wrapped in a classic QQ2006 login window
 * (title band / banner / account form / remember+auto-login checkboxes /
 * three-state gradient login button). Every piece is `display:none` outside
 * `body[data-ds-skin='qq2006']` (AppRoot.module.css zero-pollution
 * contract), so the default loading page renders byte-for-byte as before.
 * The window is purely presentational chrome for the boot gate: pressing
 * 登录 runs the QQ "connecting" dots while the boot chain settles, and in
 * the failed state the button becomes 重试 (reload). Account/remember/
 * auto-login preferences persist under dsh.qq.* keys; the password never
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

/** Skin attribute/value the ui-skin-qq2006 plugin mirrors (spelled out: no
 * value imports in the shell — see boot.tsx). */
const SKIN_ATTRIBUTE = 'data-ds-skin'
const SKIN_VALUE = 'qq2006'

/** localStorage keys owned by the QQ login window (dsh.qq.* namespace). */
const QQ_ACCOUNT_KEY = 'dsh.qq.account'
const QQ_REMEMBER_KEY = 'dsh.qq.remember'
const QQ_AUTO_LOGIN_KEY = 'dsh.qq.autoLogin'

/** Connecting-dots cycle period (连接中 → 连接中. → .. → ...). */
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

  // ── QQ2006 login-window state (cosmetic; default skin renders nothing) ──
  const [account, setAccount] = useState(() => readStorage(QQ_ACCOUNT_KEY) ?? 'DeepSeek')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(() => readStorage(QQ_REMEMBER_KEY) !== '0')
  const [autoLogin, setAutoLogin] = useState(() => readStorage(QQ_AUTO_LOGIN_KEY) === '1')
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
  // (QQ semantics — no endless animation loop).
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
    writeStorage(QQ_ACCOUNT_KEY, value)
  }

  const handleRememberChange = (next: boolean): void => {
    setRemember(next)
    writeStorage(QQ_REMEMBER_KEY, next ? '1' : '0')
    // QQ linkage: clearing 记住密码 also clears 自动登录.
    if (!next) {
      setAutoLogin(false)
      writeStorage(QQ_AUTO_LOGIN_KEY, '0')
    }
  }

  const handleAutoLoginChange = (next: boolean): void => {
    setAutoLogin(next)
    writeStorage(QQ_AUTO_LOGIN_KEY, next ? '1' : '0')
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
    ? `连接中${dots}`
    : loud
      ? '重试'
      : autoLogin
        ? '自动登录'
        : '登录'

  return (
    <div className={css.boot}>
      <div className={css.card}>
        {/* QQ2006 login window — hidden outside the skin scope (CSS contract). */}
        <div className={css.qqWindow}>
          <div className={`${css.qqTitle} qq-skin-title`}>
            <span className={css.qqTitleText}>QQ2006 登录</span>
            <span className={css.qqTitleBtns}>
              <button type="button" className="qq-skin-btn-min" tabIndex={-1} aria-hidden="true" />
              <button type="button" className="qq-skin-btn-menu" tabIndex={-1} aria-hidden="true" />
              <button type="button" className="qq-skin-btn-close" tabIndex={-1} aria-hidden="true" />
            </span>
          </div>
          <div className={`${css.qqHead} qq-skin-head`}>
            <div className={css.qqBanner} role="img" aria-label="QQ2006" />
          </div>
          <div className={`${css.qqBody} qq-skin-body`}>
            <form className={css.qqForm} onSubmit={handleSubmit}>
              <label className={css.qqField}>
                <span className={css.qqFieldLabel}>QQ号码</span>
                <input
                  className={css.qqInput}
                  value={account}
                  onChange={event => handleAccountChange(event.target.value)}
                  placeholder="QQ号码"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <label className={css.qqField}>
                <span className={css.qqFieldLabel}>密码</span>
                <input
                  className={css.qqInput}
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  placeholder="密码（本机不保存）"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <div className={css.qqCheckRow}>
                <label className={css.qqCheck}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={event => handleRememberChange(event.target.checked)}
                  />
                  记住密码
                </label>
                <label className={css.qqCheck}>
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
                className={`qq-btn ${css.qqLoginBtn}${connecting ? ` ${css.qqConnecting}` : ''}`}
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
