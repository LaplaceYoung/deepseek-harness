// QQWindowChrome: the classic 2006 chat-window frame rendered by the session
// header while the QQ2006 skin is active — the 24px title strip with the four
// title buttons (更换颜色 / 菜单 / 隐藏 / 关闭), the 61px big-toolbar band
// (12 buttons over the IMBigToolbar* assets; the 44px button row sits on the
// band's light surface above the dark bottom strip), and the group-chat
// chrome (群公告 yellow bar + member bar + online-first member list) for
// sessions with subagent children. Every button drives a real DSH service
// through the injected QQChromeActions bundle (see qq/qq-actions.ts); the
// utility classes .qq-skin-title / .qq-skin-head / .qq-skin-btn-* are the
// global nine-slice kit from ui-skin-qq2006.

import { useEffect, useMemo, useState } from 'react'
import type { SessionId, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { TranslateNS } from '@deepseek-ai/dsh-client-locale/client'
import type { QQChromeActions } from '../qq/qq-actions.ts'
import { registerQqGroupActions } from '../qq/qq-chrome-actions.ts'
import { NS, type ConversationKey } from '../locales.ts'
import css from './QQWindowChrome.module.css'

/** One member row of the current session's subagent children. */
interface GroupMember {
  id: SessionId
  displayTitle: string
  running: boolean
}

/** Direct subagent children of `sessionId`, online (running) first. */
function groupMembersOf(list: SessionListState, sessionId: SessionId): GroupMember[] {
  return Object.values(list.byId)
    .filter(member => member.parentId === sessionId)
    .map(member => ({ id: member.id, displayTitle: member.displayTitle, running: member.running }))
    .sort((a, b) => {
      if (a.running !== b.running) return a.running ? -1 : 1
      return a.displayTitle.localeCompare(b.displayTitle)
    })
}

function equalMembers(left: readonly GroupMember[], right: readonly GroupMember[]): boolean {
  return left.length === right.length
    && left.every((member, index) => {
      const other = right[index]
      return other !== undefined
        && member.id === other.id
        && member.running === other.running
        && member.displayTitle === other.displayTitle
    })
}

/** Deterministic QQ avatar for a session id (avatar/1..117 pool). */
function memberAvatar(id: string): string {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  }
  return `/qq2006/img/avatar/${1 + (hash % 117)}.png`
}

interface BigToolbarEntry {
  id: string
  label: ConversationKey
  icon: string
  run: (qq: QQChromeActions) => () => void
}

/** The twelve big-toolbar buttons in QQ2006 order (IMBigToolbar* assets). */
const BIG_TOOLBAR: readonly BigToolbarEntry[] = [
  { id: 'sms', label: 'qq.big.sms', icon: '/qq2006/img/im/IMBigToolbarMQQ.png', run: q => q.focusComposer },
  { id: 'video', label: 'qq.big.video', icon: '/qq2006/img/im/IMBigToolbarVideo.png', run: q => () => q.setView('trajectory') },
  { id: 'voice', label: 'qq.big.voice', icon: '/qq2006/img/im/IMBigToolbarMutiAudio.png', run: q => q.toggleNewMessageSound },
  { id: 'file', label: 'qq.big.file', icon: '/qq2006/img/im/IMBigToolbarSendFile.png', run: q => q.locateLatestToolCall },
  { id: '3d', label: 'qq.big.3d', icon: '/qq2006/img/im/IMBigToolbar3DShow.png', run: q => q.openDetails },
  { id: 'invite', label: 'qq.big.invite', icon: '/qq2006/img/im/IMBigToolbarInvite.png', run: q => q.inviteSubagent },
  { id: 'share', label: 'qq.big.share', icon: '/qq2006/img/im/IMBigToolbarShare.png', run: q => q.copyShareText },
  { id: 'music', label: 'qq.big.music', icon: '/qq2006/img/im/IMBigToolbarMusic.png', run: q => q.openModelMenu },
  { id: 'groupmail', label: 'qq.big.groupmail', icon: '/qq2006/img/im/IMBigToolbarGroupmail.png', run: q => q.openSettings },
  { id: 'window', label: 'qq.big.window', icon: '/qq2006/img/im/IMBigToolbarWindow.png', run: q => q.closeDetails },
  { id: 'blacklist', label: 'qq.big.blacklist', icon: '/qq2006/img/im/IMBigToolBarBlackList.png', run: q => q.archiveSession },
  { id: 'group', label: 'qq.big.group', icon: '/qq2006/img/im/IMBigToolbarGroupSpace.png', run: q => q.openSubagentCatalog },
]

export interface QQWindowChromeProps {
  /** The rendered session. */
  sessionId: SessionId
  /** Global sessions feed (member/avatar data). */
  useSessions: SnapshotSelectorHook<SessionListState>
  /** Locale seat (window + group copy). */
  t: TranslateNS<typeof NS>
  /** The real-verb bundle for every chrome button. */
  qq: QQChromeActions
}

/**
 * The QQ2006 window frame: title strip + big toolbar + group chrome.
 * @param props - session, sessions feed, locale, and the action bundle.
 * @returns the window chrome block (skin-gated by the caller).
 */
export function QQWindowChrome({ sessionId, useSessions, t, qq }: QQWindowChromeProps) {
  const [membersOpen, setMembersOpen] = useState(false)
  const members = useSessions(s => groupMembersOf(s, sessionId), equalMembers)
  const displayTitle = useSessions(s => s.byId[sessionId]?.displayTitle ?? sessionId)
  const online = useMemo(() => members.filter(member => member.running).length, [members])
  const group = members.length > 0

  // 群空间 (big toolbar) / 企业好友 (panel bar) toggle this list through the
  // shared chrome registry; the effect rides the group's existence so a
  // session without subagent children has no registered verb (the action
  // then answers with the honest 无子智能体 tip).
  useEffect(() => {
    if (!group) return
    return registerQqGroupActions(sessionId, {
      toggleMembers: () => { setMembersOpen(value => !value) },
    })
  }, [sessionId, group])

  return (
    <div className={css.windowChrome} data-qq-window-chrome>
      {/* 24px title strip (BackgroundTitle* nine-slice) with the 4 title buttons. */}
      <div className="qq-skin-title">
        <div className={css.titleRow}>
          <span className={css.titleText} title={displayTitle}>{displayTitle}</span>
          <div className={css.titleButtons}>
            <button
              type="button"
              className="qq-skin-btn-color"
              aria-label={t('qq.title.color')}
              title={t('qq.title.color')}
              onClick={qq.cycleWinSkin}
            />
            <button
              type="button"
              className="qq-skin-btn-menu"
              aria-label={t('qq.title.menu')}
              title={t('qq.title.menu')}
              onClick={qq.openSettings}
            />
            <button
              type="button"
              className="qq-skin-btn-min"
              aria-label={t('qq.title.hide')}
              title={t('qq.title.hide')}
              onClick={qq.toggleSidebar}
            />
            <button
              type="button"
              className="qq-skin-btn-close"
              aria-label={t('qq.title.close')}
              title={t('qq.title.close')}
              onClick={qq.clearSession}
            />
          </div>
        </div>
      </div>
      {/* 61px big toolbar (BackgroundTitle2* nine-slice); the 44px button
          row rides the band's light surface above the dark bottom strip. */}
      <div className="qq-skin-head">
        <div className={css.bigBar} data-qq-big-toolbar>
          {BIG_TOOLBAR.map(entry => (
            <button
              key={entry.id}
              type="button"
              className={css.bigButton}
              aria-label={t(entry.label)}
              title={t(entry.label)}
              data-qq-tool={entry.id}
              onClick={entry.run(qq)}
            >
              <img src={entry.icon} alt="" className={css.bigIcon} />
            </button>
          ))}
        </div>
      </div>
      {/* Group chrome: announcement bar + member bar (+ expandable list). */}
      {group && (
        <div className={css.groupChrome} data-qq-group>
          <div className={css.announceBar}>
            <span className={css.announcePrefix}>{t('qq.announce')}</span>
            {t('qq.announceText', { n: members.length, online })}
          </div>
          <div className={css.memberBar}>
            <button
              type="button"
              className={css.memberToggle}
              aria-expanded={membersOpen}
              onClick={() => { setMembersOpen(value => !value) }}
            >
              <span className={css.memberAvatars}>
                {members.slice(0, 5).map(member => (
                  <img
                    key={member.id}
                    src={memberAvatar(member.id)}
                    alt=""
                    className={css.memberAvatar}
                    title={`${member.displayTitle}（${member.running ? t('qq.online') : t('qq.offline')}）`}
                  />
                ))}
              </span>
              <span className={css.memberCount}>{t('qq.memberCount', { n: members.length, online })}</span>
              <span className={css.memberChevron} aria-hidden>{membersOpen ? '▲' : '▼'}</span>
            </button>
            {membersOpen && (
              <div className={css.memberList} data-qq-member-list>
                {members.map(member => (
                  <button
                    key={member.id}
                    type="button"
                    className={css.memberRow}
                    onClick={() => { qq.openChildSession(member.id); setMembersOpen(false) }}
                  >
                    <img src={memberAvatar(member.id)} alt="" className={css.memberListAvatar} />
                    <span className={css.memberName}>{member.displayTitle}</span>
                    <span className={member.running ? css.memberStateOn : css.memberStateOff}>
                      {member.running ? t('qq.online') : t('qq.offline')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
