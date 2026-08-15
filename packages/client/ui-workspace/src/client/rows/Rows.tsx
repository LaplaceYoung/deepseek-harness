/**
 * Workspace browser tree row components (figma Cell set 14:3080): pure presentational —
 * all data and callbacks arrive via props. Hover swaps (folder->chevron,
 * time->ellipsis, action buttons) are CSS-only. Row ... menus are visual-only
 * except workspace Rename/Delete and session Rename/Fork/Archive; the session
 * and workspace hover cards are suppressed while a menu is open.
 */
import { useState } from 'react'
import clsx from 'clsx'
import {
  HoverCard, IconArchiveOutline20, IconBranchOutline16, IconEditOutline16,
  IconEllipsisOutline16, IconFolderClose16, IconFolderOpen16, IconPlusOutline16,
  IconTrashOutline16, IconTriangleRightFill14, Menu, StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { StateDotState } from '@deepseek-ai/dsh-client-ui-primitives'
import type { WorkspaceBrowserProps } from '../contract/slots.ts'
import type { GroupNode, SearchResultNode, SessionNode } from '../tree.ts'
import { relativeTime } from '../tree.ts'
import { useWexinSkin } from '../wexin-skin.ts'
import css from './Rows.module.css'

/** The standard locale seat, prop-passed from the browser root. */
type RowTranslate = WorkspaceBrowserProps['t']

/** Row display title: blank rows show the localized New Session label. */
function displayTitle(node: SessionNode, t: RowTranslate): string {
  return node.blank ? t('session.new') : node.title
}

/** WeChat avatar gradients, one deterministic stop pair per palette index. */
const WEXIN_AVATAR_STOPS: readonly (readonly [string, string])[] = [
  ['rgb(7, 193, 96)', 'rgb(5, 162, 81)'],
  ['rgb(86, 140, 224)', 'rgb(52, 100, 196)'],
  ['rgb(240, 150, 62)', 'rgb(222, 108, 26)'],
  ['rgb(148, 118, 226)', 'rgb(104, 70, 192)'],
  ['rgb(66, 170, 178)', 'rgb(34, 128, 138)'],
  ['rgb(226, 106, 106)', 'rgb(194, 60, 60)'],
]

/** Deterministic avatar gradient for a row key (session id or search id). */
function wexinAvatarGradient(key: string): readonly [string, string] {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  // The modulo keeps the index inside the palette by construction.
  const FALLBACK: readonly [string, string] = ['#07c160', '#05a251']
  return WEXIN_AVATAR_STOPS[Math.abs(hash) % WEXIN_AVATAR_STOPS.length] ?? FALLBACK
}

/**
 * WeChat time cell: the classic absolute-style clock — HH:MM today, 昨天
 * yesterday, 周X within the week, M月D日 this year, YYYY年M月D日 before that.
 * Forced Chinese (WeChat semantics under any locale).
 */
function wexinTimeLabel(updatedAt: number, now: number): string {
  const d = new Date(updatedAt)
  const n = new Date(now)
  const startOfDay = (x: Date): number => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dayDiff = Math.round((startOfDay(n) - startOfDay(d)) / 86_400_000)
  const pad2 = (v: number): string => String(v).padStart(2, '0')
  if (dayDiff <= 0) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  if (dayDiff === 1) return '昨天'
  if (dayDiff < 7) return `周${'日一二三四五六'[d.getDay()]}`
  if (d.getFullYear() === n.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日`
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** WeChat summary line: the session's live state in forced-Chinese copy. */
function wexinSummary(node: SessionNode): string {
  if (node.blank) return '开始新的会话'
  switch (node.pendingInteraction) {
    case 'approval': return '等待你的批准'
    case 'plan-review': return '等待你审阅计划'
    case 'question': return '等待你的回答'
    case undefined: break
    /* v8 ignore next -- closed PendingInteractionStatus union */
    default: return assertNever(node.pendingInteraction)
  }
  if (node.running) {
    return node.runningSubagentCount > 0
      ? `正在运行 ${node.runningSubagentCount} 个子任务…`
      : '正在运行…'
  }
  if (node.completed) return '已完成'
  return '暂无消息'
}

/**
 * WeChat avatar: 40×40 rounded square tinted by the row key hash, centered
 * first character of the display title (deterministic, no image assets).
 */
function WexinAvatar({ id, label }: { id: string; label: string }) {
  const [from, to] = wexinAvatarGradient(id)
  return (
    <span
      className={css.wexinAvatar}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-hidden="true"
    >
      {Array.from(label)[0] ?? '?'}
    </span>
  )
}

/** Localized compact relative time ("刚刚"/"5分钟" in zh, "now"/"5min" in en). */
function timeLabel(updatedAt: number, now: number, t: RowTranslate): string {
  const { unit, n } = relativeTime(updatedAt, now)
  return unit === 'now' ? t('time.now') : t(`time.${unit}`, { n })
}

/** Hover-card variant: distances wrap in the ago template; the now bucket stays bare (no "now ago"). */
function hoverTimeLabel(updatedAt: number, now: number, t: RowTranslate): string {
  const { unit, n } = relativeTime(updatedAt, now)
  return unit === 'now' ? t('time.now') : t('time.ago', { t: t(`time.${unit}`, { n }) })
}

/**
 * Absolute creation time through the dictionary's date template (the message
 * clock pattern): `toLocaleString` would follow the browser language, not the
 * app locale, and produce mixed-language text after a switch.
 */
function createdLabel(createdAt: number, t: RowTranslate): string {
  const d = new Date(createdAt)
  const pad2 = (v: number): string => String(v).padStart(2, '0')
  const date = t('date.ymd', { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() })
  return t('hover.created', { time: `${date} ${pad2(d.getHours())}:${pad2(d.getMinutes())}` })
}

/** Hover-card body: workspace title, full directory path, absolute creation time. */
function WorkspaceHoverContent({ label, cwd, createdAt, t }: {
  label: string
  cwd: string | undefined
  createdAt: number
  t: RowTranslate
}) {
  return (
    <div className={css.hoverContent}>
      <div className={css.hoverTitle}>{label}</div>
      <div className={css.hoverPath}>{cwd}</div>
      <div className={css.hoverTime}>{createdLabel(createdAt, t)}</div>
    </div>
  )
}

/**
 * Row drag wiring supplied by the tree owner. `drop` reports the half of the
 * row where the pointer released so the owner can resolve an insert anchor.
 */
export interface RowDragProps {
  /** Start dragging this row. */
  start: () => void
  /** A compatible row drag is in flight. */
  active: boolean
  /** Current marker on this row: insert line above, below, or none. */
  marker: 'before' | 'after' | null
  /** Report the hovered half while a compatible drag passes over this row. */
  hover: (half: 'before' | 'after') => void
  drop: (half: 'before' | 'after') => void
  end: () => void
}

/** Drag lifecycle owned by a workspace row; its enclosing group owns hit testing. */
interface WorkspaceRowDragProps {
  start: () => void
  end: () => void
}

/** Pointer-position half of a row (insert line above or below). */
function rowHalf(e: { clientY: number; currentTarget: HTMLElement }): 'before' | 'after' {
  const rect = e.currentTarget.getBoundingClientRect()
  return e.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
}

/**
 * Project (workspace) header row: folder + title;
 * hover reveals the chevron and create button, and dwelling on a real
 * Workspace shows its hover card (the ungrouped bucket has none).
 * `containsCurrent` arrives on the node (derivation fact, no renderer scan).
 * @param props.group - derived group node.
 * @param props.onToggle - expand/collapse the group.
 * @param props.onCreate - start a frontend Session inside this Workspace.
 * @param props.drag - optional workspace-row drag wiring.
 * @param props.t - the browser root's locale seat.
 * @returns the row element.
 */
export function ProjectRowItem({ group, onToggle, onCreate, actions, drag, t }: {
  group: GroupNode
  onToggle: () => void
  onCreate: () => void
  /** Real-Workspace actions; absent for the ungrouped bucket (no menu shown). */
  actions?: { rename: () => void; delete: () => void } | undefined
  /** Present only for real Workspace rows in the grouped view. */
  drag?: WorkspaceRowDragProps | undefined
  t: RowTranslate
}) {
  const row = group
  const wexinSkin = useWexinSkin()
  // The ungrouped bucket has no workspace title: its label is dictionary copy.
  // WeChat copy is Chinese under any locale.
  const label = row.workspaceId === undefined
    ? (wexinSkin ? '未分组' : t('group.ungrouped'))
    : row.label
  const active = group.expanded && group.containsCurrent
  const [menuOpen, setMenuOpen] = useState(false)
  const workspaceMenuItems = [
    { id: 'rename', label: t('rename'), icon: <IconEditOutline16 /> },
    { id: 'delete', label: t('delete.workspace'), icon: <IconTrashOutline16 />, danger: true },
  ]
  const ownRow = (
    <div
      className={clsx(css.projectRow, menuOpen && css.menuOpen)}
      role="treeitem"
      aria-expanded={row.expanded}
      onClick={onToggle}
      draggable={drag !== undefined}
      onDragStart={drag === undefined
        ? undefined
        : (e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', row.key)
          drag.start()
        }}
      onDragEnd={drag?.end}
    >
      <span className={clsx(css.slot, css.folder, active && css.folderActive)}>
        {row.expanded ? <IconFolderOpen16 /> : <IconFolderClose16 />}
      </span>
      <span className={clsx(css.slot, css.chevron)}>
        <IconTriangleRightFill14 className={clsx(css.arrow, row.expanded && css.arrowOpen)} />
      </span>
      <span className={css.projectText}>
        <span className={css.title}>{label}</span>
      </span>
      <span className={css.rowActions}>
        {actions !== undefined && (
          <Menu
            open={menuOpen}
            onClose={() => { setMenuOpen(false) }}
            items={workspaceMenuItems}
            onSelect={(id) => {
              setMenuOpen(false)
              // Unknown ids leave before the dispatch: a future menu row must
              // not inherit the destructive branch as an else fallback.
              /* v8 ignore next -- workspaceMenuItems carries exactly these two rows today. */
              if (id !== 'rename' && id !== 'delete') return
              if (id === 'rename') actions.rename()
              else actions.delete()
            }}
            portal
            closeOnPointerLeave
            anchor={(
              <button
                type="button"
                className={css.iconButton}
                aria-label={t('actions.workspace.aria', { name: label })}
                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
              >
                <IconEllipsisOutline16 />
              </button>
            )}
          />
        )}
        <button
          type="button"
          className={css.iconButton}
          aria-label={t('actions.newSession.aria', { name: label })}
          onClick={(e) => { e.stopPropagation(); onCreate() }}
        >
          <IconPlusOutline16 />
        </button>
      </span>
    </div>
  )
  // The ungrouped bucket has no backing Workspace: no card to show.
  if (row.createdAt === undefined) return ownRow
  return (
    <HoverCard
      anchor={ownRow}
      content={<WorkspaceHoverContent label={row.label} cwd={row.cwd} createdAt={row.createdAt} t={t} />}
      disabled={menuOpen}
      copyText={row.cwd}
      copyLabel={t('copy')}
      copiedLabel={t('hover.copied')}
    />
  )
}

/* v8 ignore next 3 -- closed-union backstop; only reached if the status is forged */
function assertNever(value: never): never {
  throw new Error(`unknown pending interaction: ${String(value)}`)
}

interface SessionStatus {
  state: StateDotState
  label: string
}

/**
 * Session status presentation; pending interaction is primary and live activity
 * outranks completion reminders.
 */
function sessionStatuses(
  node: Pick<SessionNode, 'pendingInteraction' | 'running' | 'runningSubagentCount' | 'completed'>,
  t: RowTranslate,
): readonly [SessionStatus, ...SessionStatus[]] {
  const subagents: SessionStatus | undefined = node.runningSubagentCount === 0
    ? undefined
    : {
      state: 'ongoing',
      label: t(
        node.runningSubagentCount === 1
          ? 'status.subagentsRunning.one'
          : 'status.subagentsRunning.other',
        { n: node.runningSubagentCount },
      ),
    }
  let pending: SessionStatus | undefined
  switch (node.pendingInteraction) {
    case 'approval':
      pending = { state: 'warning', label: t('status.waitingApproval') }
      break
    case 'plan-review':
      pending = { state: 'warning', label: t('status.planReview') }
      break
    case 'question':
      pending = { state: 'warning', label: t('status.waitingAnswer') }
      break
    case undefined: break
    /* v8 ignore next -- closed PendingInteractionStatus union */
    default: return assertNever(node.pendingInteraction)
  }
  if (pending !== undefined) return subagents === undefined ? [pending] : [pending, subagents]
  if (node.running) {
    const primary: SessionStatus = { state: 'ongoing', label: t('status.running') }
    return subagents === undefined ? [primary] : [primary, subagents]
  }
  if (subagents !== undefined) return [subagents]
  if (node.completed) return [{ state: 'done', label: t('status.completed') }]
  return [{ state: 'done', label: t('status.idle') }]
}

/** Primary status dot plus every status's screen-reader label, shared by the search and session rows. */
function SessionStatusDots({ statuses }: { statuses: readonly [SessionStatus, ...SessionStatus[]] }) {
  return (
    <>
      <StateDot state={statuses[0].state} />
      {statuses.map(status => (
        <span className={css.visuallyHidden} key={status.label}>{status.label}</span>
      ))}
    </>
  )
}

/** Hover-card body: full title, relative time, and every relevant live status. */
function SessionHoverContent({ node, now, t }: { node: SessionNode; now: number; t: RowTranslate }) {
  const statuses = sessionStatuses(node, t)
  return (
    <div className={css.hoverContent}>
      <div className={css.hoverTitle}>{displayTitle(node, t)}</div>
      {/* Same placeholder rule as the row's trailing cell: no timestamp
          before the first prompt. */}
      {!node.blank && <div className={css.hoverTime}>{hoverTimeLabel(node.updatedAt, now, t)}</div>}
      {statuses.map(status => (
        <div className={css.hoverStatus} key={status.label}>
          <StateDot state={status.state} />
          <span>{status.label}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * One flat search result: title, Workspace context, and optional content
 * excerpt. Search navigation opens the session only; it does not address an
 * event inside the conversation.
 * @param props.result - merged local/content search row.
 * @param props.currentId - selected session id.
 * @param props.onOpen - open the selected session.
 * @param props.t - Workspace-browser translation seat.
 * @returns the result button.
 */
export function SearchResultItem({ result, currentId, onOpen, t }: {
  result: SearchResultNode
  currentId: string | undefined
  onOpen: (id: SearchResultNode['id']) => void
  t: RowTranslate
}) {
  const selected = result.id === currentId
  const statuses = sessionStatuses(result, t)
  const primaryStatus = statuses[0]
  const wexinSkin = useWexinSkin()
  return (
    <button
      type="button"
      className={clsx(css.searchResultRow, selected && css.selected)}
      role="treeitem"
      aria-selected={selected}
      onClick={() => { onOpen(result.id) }}
    >
      {wexinSkin && <WexinAvatar id={result.id} label={result.title} />}
      <span className={css.searchResultHeading}>
        <span className={css.slot}>
          {(primaryStatus.state !== 'done' || result.completed) && (
            <SessionStatusDots statuses={statuses} />
          )}
        </span>
        <span className={css.searchResultTitle}>{result.title}</span>
      </span>
      <span className={css.searchResultMeta}>
        <span className={css.searchResultWorkspace}>{result.workspace}</span>
        {result.snippet !== undefined && (
          <span className={css.searchResultSnippet}>{result.snippet}</span>
        )}
      </span>
    </button>
  )
}

/**
 * One top-level 34px session row: status dot (pending user interaction outranks
 * own or descendant activity), title, relative time, and the row actions menu.
 * @param props.node - derived session node.
 * @param props.currentId - selected session id (row highlight).
 * @param props.now - epoch ms for relative-time formatting.
 * @param props.onOpen - open a session by id.
 * @param props.onRename - open the session rename dialog (id + current title).
 * @param props.onFork - fork a session at its last completed turn.
 * @param props.onArchive - archive a session by id.
 * @param props.drag - optional draggable-row wiring.
 * @param props.flat - omit the empty status slot in the hierarchy-free flat list.
 * @param props.t - the browser root's locale seat.
 * @returns the session row.
 */
export function SessionNodeItem({ node, currentId, now, onOpen, onRename, onFork, onArchive, drag, flat = false, t }: {
  node: SessionNode
  currentId: string | undefined
  now: number
  onOpen: (id: SessionNode['id']) => void
  /** Open the browser-owned session rename dialog (row menu action). */
  onRename: (id: SessionNode['id'], currentTitle: string) => void
  /** Fork a session at its last completed turn (row menu action). */
  onFork: (id: SessionNode['id']) => void
  /** Archive this session (row menu action; commits without a dialog). */
  onArchive: (id: SessionNode['id']) => void
  /** Present only on draggable rows (workspace-group sessions outside search). */
  drag?: RowDragProps | undefined
  /** The row is rendered without a parent Workspace header. */
  flat?: boolean | undefined
  t: RowTranslate
}) {
  const row = node
  const title = displayTitle(node, t)
  const selected = node.id === currentId
  const statuses = sessionStatuses(node, t)
  const primaryStatus = statuses[0]
  const showStatus = primaryStatus.state !== 'done' || row.completed
  const wexinSkin = useWexinSkin()
  // WeChat copy is Chinese under any locale (the blank row's provisional title).
  const wexinTitle = wexinSkin && node.blank ? '新会话' : title
  // The WeChat unread dot: any live activity on a conversation that is not
  // the one being read (pending interaction, running, or the finished-but-
  // unopened completion reminder) paints the classic green badge next to the
  // nickname. The selected row is being read, so it never carries one.
  const wexinUnread = wexinSkin && !selected
    && (node.pendingInteraction !== undefined || node.running || node.completed)
  const [menuOpen, setMenuOpen] = useState(false)
  // Archive hides the row through the registry-global archive set and never
  // touches the session log, so it is not styled as destructive and needs no
  // confirmation dialog.
  const sessionMenuItems = [
    { id: 'rename', label: t('rename'), icon: <IconEditOutline16 /> },
    { id: 'fork', label: t('menu.fork'), icon: <IconBranchOutline16 /> },
    // 20-native glyph in the menu's 16px icon slot (Menu.module.css .itemIcon).
    { id: 'archive', label: t('menu.archiveSession'), icon: <IconArchiveOutline20 size={16} /> },
  ]
  // Figma session cell: pad 8, status slot 16, then a 4px title gap.
  const ownRow = (
    <div
      className={clsx(
        css.sessionRow, selected && css.selected, menuOpen && css.menuOpen,
        !wexinSkin && flat && !showStatus && css.flatSessionRowWithoutStatus,
        drag?.marker === 'before' && css.dropBefore, drag?.marker === 'after' && css.dropAfter,
      )}
      role="treeitem"
      aria-selected={selected}
      onClick={() => { onOpen(node.id) }}
      draggable={drag !== undefined}
      onDragStart={drag === undefined
        ? undefined
        : (e) => {
          e.dataTransfer.effectAllowed = 'move'
          e.dataTransfer.setData('text/plain', node.id)
          drag.start()
        }}
      onDragEnd={drag?.end}
      onDragOver={drag === undefined
        ? undefined
        : (e) => {
          if (!drag.active) return
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          drag.hover(rowHalf(e))
        }}
      onDrop={drag === undefined
        ? undefined
        : (e) => {
          if (!drag.active) return
          e.preventDefault()
          drag.drop(rowHalf(e))
        }}
    >
      {wexinSkin ? (
        <>
          {/* WeChat cell: 40×40 avatar + nickname/time over the summary line. */}
          <WexinAvatar id={node.id} label={wexinTitle} />
          <span className={css.wexinBody}>
            <span className={css.wexinLine}>
              <span className={css.wexinTitleWrap}>
                <span className={css.title}>{wexinTitle}</span>
                {/* Unread conversations wear the green dot beside the name. */}
                {wexinUnread && <span className={css.wexinUnread} aria-hidden="true" />}
              </span>
              {/* A blank New Session row is a provisional placeholder: nothing has
                  happened in it yet, so no timestamp or row verbs (see below). */}
              {!row.blank && <span className={css.time}>{wexinTimeLabel(row.updatedAt, now)}</span>}
            </span>
            <span className={css.wexinSummary}>{wexinSummary(node)}</span>
          </span>
        </>
      ) : (
        <>
          {/* Pending interaction and own or descendant activity outrank the
              finished-but-unviewed reminder, which returns after activity stops
              and is cleared by opening the session. */}
          {(!flat || showStatus) && (
            <span className={css.slot}>
              {showStatus && <SessionStatusDots statuses={statuses} />}
            </span>
          )}
          <span className={css.title}>{title}</span>
          {/* A blank New Session row is a provisional placeholder: nothing has
              happened in it yet, so a "now" timestamp and the row verbs
              (rename/fork/archive) would all act on content that does not
              exist — both trailing cells stay off until the first prompt. */}
          {!row.blank && <span className={css.time}>{timeLabel(row.updatedAt, now, t)}</span>}
        </>
      )}
      {!row.blank && (
        <span className={css.rowActions}>
          <Menu
            open={menuOpen}
            onClose={() => { setMenuOpen(false) }}
            items={sessionMenuItems}
            onSelect={(id) => {
              setMenuOpen(false)
              if (id === 'rename') onRename(node.id, row.title)
              if (id === 'fork') onFork(node.id)
              if (id === 'archive') onArchive(node.id)
            }}
            portal
            closeOnPointerLeave
            anchor={(
              <button
                type="button"
                className={css.iconButton}
                aria-label={t('actions.session.aria', { name: title })}
                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v) }}
              >
                <IconEllipsisOutline16 />
              </button>
            )}
          />
        </span>
      )}
    </div>
  )
  return (
    <HoverCard
      anchor={ownRow}
      content={<SessionHoverContent node={node} now={now} t={t} />}
      disabled={menuOpen || drag?.active === true}
      copyText={row.blank ? undefined : row.title}
      copyLabel={t('copy')}
      copiedLabel={t('hover.copied')}
    />
  )
}
