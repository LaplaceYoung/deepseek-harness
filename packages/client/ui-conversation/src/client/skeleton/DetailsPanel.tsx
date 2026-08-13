// DetailsPanel: close button + the selected call's args and
// result — args as JSON, the result raw except for a terminal-card call, whose
// Output section is the command's terminal card. Reads the
// selection from the shared chat
// store (conversation writes, this panel reads — the cross-registration
// share the store seat exists for) and derives the call material from the
// session snapshot — no data of its own.

import { Fragment } from 'react'
import { CodeBlock } from '@deepseek-ai/dsh-client-ui-primitives'
import { shallowEqual } from '@deepseek-ai/dsh-client-runtime/client'
import type { ConversationSnapshot, RunningToolCall, ToolCallBlock, ToolResultNode } from '@deepseek-ai/dsh-client-runtime/client'
import type { DetailsSlotProps } from '../contract/slots.ts'
import { findToolCall } from '../chat/tool-node-reader.ts'
import { useQqSkin } from '../qq/qq-skin.ts'
import css from './DetailsPanel.module.css'

/** Full props composed by reference from the contract (automatic shares & injected share). */
export type DetailsPanelProps = DetailsSlotProps

/** Session statistics backing the QQ秀「个人空间」numbers. */
interface QqShowStats {
  /** user message nodes → 日记条数. */
  user: number
  /** assistant-step nodes → 日记评论. */
  assistant: number
  /** tool-call nodes → 相册张数. */
  tool: number
  /** all flow nodes → 收藏数. */
  total: number
}

/** Count flow nodes by kind (原版 日记/相册/收藏 数字的会话统计兜底). */
function qqShowStatsOf(s: ConversationSnapshot): QqShowStats {
  let user = 0
  let assistant = 0
  let tool = 0
  for (const key of s.chat.order) {
    const node = s.chat.nodes.get(key)
    if (node === undefined) continue
    if (node.kind === 'user') user += 1
    else if (node.kind === 'assistant-step') assistant += 1
    else if (node.kind === 'tool-call') tool += 1
  }
  return { user, assistant, tool, total: s.chat.order.length }
}

/**
 * QQ2006 聊天窗口右侧 QQ 秀栏（原版 .qq-im-side）：上半「对方形象」
 * 钮 + show1.gif 展示区、中段「个人空间」信息区（#f6f6f6 底、藏青字、
 * 红色数字）、下半「我的形象」+ show3.gif。侧栏钮 hover 换 Hover 图。
 * @param props - session stats, friend display title, locale seat.
 * @returns the QQ 秀 sidebar.
 */
function QqShowSidebar({ stats, t }: {
  stats: QqShowStats
  t: DetailsPanelProps['t']
}) {
  return (
    <div className={css.qqSide} data-qq-show-side>
      <section className={css.qqShowSection}>
        <button type="button" className={css.qqSideBtn}>{t('qq.side.theirAvatar')}</button>
        <div
          className={css.qqShow}
          style={{ backgroundImage: "url('/qq2006/img/im/show1.gif')" }}
        />
      </section>
      <section className={css.qqZone}>
        <button type="button" className={css.qqSideBtn}>{t('qq.side.zone')}</button>
        <div className={css.qqZoneRow}>{t('qq.side.summaryLabel')}{t('qq.side.motto')}</div>
        <div className={css.qqZoneRow}>
          {t('qq.side.diaryLabel')}<span className={css.qqZoneNum}>{stats.user}</span>{t('qq.side.diarySuffix')}<span className={css.qqZoneNum}>{stats.assistant}</span>{t('qq.side.commentsLabel')}
        </div>
        <div className={css.qqZoneRow}>
          {t('qq.side.albumLabel')}<span className={css.qqZoneNum}>{stats.tool}</span>{t('qq.side.albumSuffix')}<span className={css.qqZoneNum}>{stats.user + stats.assistant}</span>{t('qq.side.commentsLabel')}
        </div>
        <div className={css.qqZoneRow}>
          {t('qq.side.favoriteLabel')}<span className={css.qqZoneNum}>{stats.total}</span>{t('qq.side.favoriteSuffix')}
        </div>
      </section>
      <section className={css.qqShowSection}>
        <button type="button" className={css.qqSideBtn}>{t('qq.side.myAvatar')}</button>
        <div
          className={css.qqShow}
          style={{ backgroundImage: "url('/qq2006/img/im/show3.gif')" }}
        />
      </section>
    </div>
  )
}

/**
 * Selected call material: the call's display name and args plus the frozen
 * block slice it came from. `block` is a snapshot-cached reference, so the
 * wrapper stays shallow-equal across unrelated snapshot frames; the settled /
 * running split is read off it with the `'kind' in block` discrimination
 * instead of duplicated as flags.
 */
interface CallMaterial {
  name: string
  argsRaw: string | null
  block: ToolCallBlock
}

/** Material of a settled result node (native call or run_code sub-dispatch). */
function settledMaterial(node: ToolResultNode, callId: string): CallMaterial {
  return { name: node.call?.name ?? callId, argsRaw: node.call?.argsRaw ?? null, block: node }
}

/** Material of an in-flight call (native call or run_code sub-dispatch). */
function runningMaterial(call: RunningToolCall): CallMaterial {
  return { name: call.name, argsRaw: call.argsRaw, block: call }
}

function materialFor(s: ConversationSnapshot, callId: string): CallMaterial | null {
  const found = findToolCall(s, callId)
  if (found === undefined) return null
  return 'kind' in found ? settledMaterial(found, callId) : runningMaterial(found)
}

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    // Not JSON (streaming fragment or plain text): show verbatim.
    return raw
  }
}

/** Flatten a settled result for the no-ui-tool fallback. */
function rawResultText(block: ToolCallBlock): string {
  if (!('kind' in block)) return ''
  const parts = block.content.map(item => item.type === 'text' ? item.text : JSON.stringify(item, null, 2))
  if (parts.length === 0 && block.error !== undefined) parts.push(`${block.error.name}: ${block.error.code}`)
  return parts.join('\n')
}

export function DetailsPanel({ useSession, useSessions, sessionId, useStore, renderSlot, closeDetails, t }: DetailsPanelProps) {
  const selection = useStore(s => s.selection)
  // Session workspace root: an omitted or relative terminal cwd resolves
  // against it, which the pure presenter cannot see.
  const sessionCwd = useSessions(list => list.byId[sessionId]?.cwd)
  const callId = selection?.callId
  // QQ2006 skin: the right column is the QQ 秀 sidebar — the numbers come
  // from this session's own statistics (消息数/工具调用数兜底), so the
  // selector stays stable across unrelated snapshot frames.
  const qqSkin = useQqSkin()
  const qqStats = useSession(s => qqShowStatsOf(s), shallowEqual)
  // materialFor builds a fresh wrapper; shallowEqual short-circuits on its
  // stable members (result node reference rides the snapshot's structural sharing).
  const material = useSession(
    s => (callId === undefined ? null : materialFor(s, callId)),
    (a, b) => shallowEqual(a, b))

  // 皮肤下右侧栏整栏替换为 QQ 秀侧栏（原版 .qq-im-side）。
  if (qqSkin) {
    return (
      <div className={css.root}>
        <QqShowSidebar stats={qqStats} t={t} />
      </div>
    )
  }

  return (
    <div className={css.root}>
      <div className={css.header}>
        <div className={css.title}>
          {selection === null ? t('details.title') : material?.name ?? selection.toolName ?? t('details.title')}
        </div>
        <button
          type="button" className={css.close} aria-label={t('details.close')}
          onClick={() => { closeDetails() }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className={css.body}>
        {selection === null || callId === undefined
          ? <div className={css.empty}>{t('details.empty')}</div>
          : material === null
            ? <div className={css.empty}>{t('details.notInWindow')}</div>
            : (
              <>
                {material.argsRaw !== null && (
                  <section className={css.section}>
                    <div className={css.sectionLabel}>{t('details.input')}</div>
                    <CodeBlock code={pretty(material.argsRaw)} lang="json" copyLabel={t('copy')} copiedLabel={t('copied')} />
                  </section>
                )}
                <section className={css.section}>
                  <div className={css.sectionLabel}>{t('details.output')}</div>
                  {/* Keyed by the selected call: the body owns per-call view
                      state (the terminal card's expand and copy), which React
                      would otherwise carry into the next selection because the
                      panel does not unmount between calls. */}
                  <Fragment key={callId}>
                    {renderSlot('conversation.details.tool', { block: material.block, cwd: sessionCwd }, {
                      fallback: 'kind' in material.block
                        ? (
                          <pre className={css.code} data-error={material.block.isError || undefined}>
                            {rawResultText(material.block)}
                          </pre>
                        )
                        : <div className={css.empty}>{t('details.running')}</div>,
                    })}
                  </Fragment>
                </section>
              </>
            )}
      </div>
    </div>
  )
}
