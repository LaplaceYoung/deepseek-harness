/**
 * QQ2006 main-panel chrome: the user head (avatar / status / nickname plus
 * the six 16×16 top buttons) and the ten-button panel bar, rendered above
 * the browsing region's search. Skin-only: the whole block mounts only while
 * `body[data-ds-skin='qq2006']` is live, so the default skin keeps its exact
 * DOM; every rule in QQMainPanel.module.css is additionally scoped to that
 * attribute. Each button press answers with a feedback tip (the official
 * ui-primitives Toast, yellow under the skin).
 *
 * Bindings are the closest official DSH services — new session, sidebar
 * fold, details panel, model-selector popup and command palette through the
 * slash trigger, subagent catalog, composer focus, tool-call locate, sound
 * toggle. Buttons with no official equivalent (邀请 / 视频) keep their QQ
 * visual and answer with a tip only.
 */
import { useState } from 'react'
import { Toast } from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { QQPanelActions, WorkspaceBrowserProps } from './contract/slots.ts'
import type { WorkspaceKey } from './locales.ts'
import { useQqSkin } from './qq-skin.ts'
import css from './QQMainPanel.module.css'

/** One user-head mini button (original 16×16 top-level asset). */
interface HeadButton {
  key: string
  labelKey: WorkspaceKey
  asset: string
  /** The QQPanelActions member this button drives. */
  run: (qq: QQPanelActions, sessionId: SessionId | undefined) => void
  tip: (t: WorkspaceBrowserProps['t'], sessionId: SessionId | undefined) => string
}

/** One panel-bar button (original 24×24 panel-bar asset). */
interface BarButton {
  key: string
  labelKey: WorkspaceKey
  asset: string
  run: (qq: QQPanelActions, sessionId: SessionId | undefined) => void
  tip: (t: WorkspaceBrowserProps['t'], sessionId: SessionId | undefined) => string
}

const AVATAR = '/qq2006/img/avatar/1.png'

/** User head mini buttons, left to right: 手机短信 / 邮箱 / 安全中心 / QQ空间 / QQ音乐 / 消息管理器. */
const HEAD_BUTTONS: readonly HeadButton[] = [
  {
    key: 'sms', labelKey: 'qq.mini.sms', asset: '/qq2006/img/MobileMsgButton.png',
    run: (qq) => { qq.focusComposer() },
    tip: t => t('qq.tip.composerFocused'),
  },
  {
    key: 'mail', labelKey: 'qq.mini.mail', asset: '/qq2006/img/MailButton.png',
    run: (qq) => { qq.newSession() },
    tip: t => t('qq.tip.newSession'),
  },
  {
    key: 'security', labelKey: 'qq.mini.security', asset: '/qq2006/img/security_normal.png',
    run: (qq) => { qq.toggleSidebar() },
    tip: t => t('qq.tip.sidebarToggled'),
  },
  {
    key: 'qqhome', labelKey: 'qq.mini.qqhome', asset: '/qq2006/img/QQHome.png',
    run: (qq) => { qq.openDetails() },
    tip: t => t('qq.tip.detailsOpened'),
  },
  {
    key: 'music', labelKey: 'qq.mini.music', asset: '/qq2006/img/QQMusicButton.png',
    run: (qq, sessionId) => { if (sessionId !== undefined) qq.openModelMenu(sessionId) },
    tip: (t, sessionId) => (sessionId === undefined ? t('qq.tip.needSession') : t('qq.tip.modelMenu')),
  },
  {
    key: 'manager', labelKey: 'qq.mini.manager', asset: '/qq2006/img/MsgManagerButton.png',
    run: (qq, sessionId) => { if (sessionId !== undefined) qq.toggleCommandMenu(sessionId) },
    tip: (t, sessionId) => (sessionId === undefined ? t('qq.tip.needSession') : t('qq.tip.commandMenu')),
  },
]

/** Panel bar buttons, left to right: 短信 / 邀请 / 视频 / 语音 / 传文件 / 3D秀 / 企业好友 / 自定义面板 / 邮箱 / 无线乐园. */
const BAR_BUTTONS: readonly BarButton[] = [
  {
    key: 'sms', labelKey: 'qq.bar.sms', asset: '/qq2006/img/panel-bar/MobileButton.png',
    run: (qq) => { qq.focusComposer() },
    tip: t => t('qq.tip.composerFocused'),
  },
  {
    key: 'invite', labelKey: 'qq.bar.invite', asset: '/qq2006/img/panel-bar/FriendButton.png',
    run: () => {},
    tip: t => t('qq.tip.invite'),
  },
  {
    key: 'video', labelKey: 'qq.bar.video', asset: '/qq2006/img/panel-bar/RtxButton.png',
    run: () => {},
    tip: t => t('qq.tip.video'),
  },
  {
    key: 'voice', labelKey: 'qq.bar.voice', asset: '/qq2006/img/panel-bar/ContentsButton.png',
    run: (qq) => { qq.toggleNewMessageSound() },
    tip: t => t('qq.tip.soundToggled'),
  },
  {
    key: 'file', labelKey: 'qq.bar.file', asset: '/qq2006/img/panel-bar/NetDiskButton.png',
    run: (qq) => { qq.locateLatestToolCall() },
    tip: t => t('qq.tip.toolCallLocated'),
  },
  {
    key: 'show3d', labelKey: 'qq.bar.show3d', asset: '/qq2006/img/panel-bar/IntegratePanel.png',
    run: (qq) => { qq.openDetails() },
    tip: t => t('qq.tip.detailsOpened'),
  },
  {
    key: 'enterprise', labelKey: 'qq.bar.enterprise', asset: '/qq2006/img/panel-bar/SBuddyButton.png',
    run: (qq, sessionId) => { if (sessionId !== undefined) qq.openSubagentCatalog(sessionId) },
    tip: (t, sessionId) => (sessionId === undefined ? t('qq.tip.needSession') : t('qq.tip.catalogOpened')),
  },
  {
    key: 'custom', labelKey: 'qq.bar.custom', asset: '/qq2006/img/panel-bar/CustomButton.png',
    run: (qq, sessionId) => { if (sessionId !== undefined) qq.toggleCommandMenu(sessionId) },
    tip: (t, sessionId) => (sessionId === undefined ? t('qq.tip.needSession') : t('qq.tip.commandMenu')),
  },
  {
    key: 'mail', labelKey: 'qq.bar.mail', asset: '/qq2006/img/panel-bar/BlankPanel.png',
    run: (qq) => { qq.newSession() },
    tip: t => t('qq.tip.newSession'),
  },
  {
    key: 'park', labelKey: 'qq.bar.park', asset: '/qq2006/img/panel-bar/EaseButton.png',
    run: (qq) => { qq.newSession() },
    tip: t => t('qq.tip.newSession'),
  },
]

/** Transient feedback tip state shared by both bars (one at a time). */
interface TipState {
  text: string
  seq: number
}

/**
 * The QQ2006 main panel chrome. Mounts nothing unless the skin is live.
 * @param props.qq - the injected verb bundle (official service bindings).
 * @param props.currentSessionId - selected session, for session-scoped verbs.
 * @param props.t - the browsing region's locale seat.
 * @returns the user head + panel bar block.
 */
export function QQMainPanel({ qq, currentSessionId, t }: {
  qq: QQPanelActions
  currentSessionId: SessionId | undefined
  t: WorkspaceBrowserProps['t']
}) {
  const qqSkin = useQqSkin()
  const [tip, setTip] = useState<TipState | null>(null)
  if (!qqSkin) return null

  const press = (run: (qq: QQPanelActions, sessionId: SessionId | undefined) => void,
    tipText: string): void => {
    run(qq, currentSessionId)
    setTip(prev => ({ text: tipText, seq: (prev?.seq ?? 0) + 1 }))
  }
  const tipText = (button: HeadButton | BarButton): string => button.tip(t, currentSessionId)

  return (
    <div className={css.panel} data-qq-main-panel>
      <div className={css.userHead} data-qq-user-head>
        <img className={css.avatar} src={AVATAR} alt="" />
        <div className={css.headIdentity}>
          <span className={css.nickname}>{t('qq.head.nickname')}</span>
          <span className={css.statusLine}>
            <i className={css.statusDot} aria-hidden />
            <span>{t('qq.head.online')}</span>
          </span>
        </div>
        <div className={css.miniButtons}>
          {HEAD_BUTTONS.map(button => (
            <button
              key={button.key}
              type="button"
              className={css.miniButton}
              style={{ backgroundImage: `url('${button.asset}')` }}
              data-qq-mini={button.key}
              aria-label={t(button.labelKey)}
              title={t(button.labelKey)}
              onClick={() => { press(button.run, tipText(button)) }}
            />
          ))}
        </div>
      </div>
      <div className={css.panelBar} data-qq-panel-bar>
        {BAR_BUTTONS.map(button => (
          <button
            key={button.key}
            type="button"
            className={css.barButton}
            style={{ backgroundImage: `url('${button.asset}')` }}
            data-qq-bar={button.key}
            aria-label={t(button.labelKey)}
            title={t(button.labelKey)}
            onClick={() => { press(button.run, tipText(button)) }}
          />
        ))}
      </div>
      {tip !== null && (
        <Toast key={tip.seq} text={tip.text} onDone={() => { setTip(null) }} />
      )}
    </div>
  )
}
