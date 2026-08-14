import { memo } from 'react'
import type { PropsRenderSlots } from '@deepseek-ai/dsh-client-ui-slots'
import { writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatNodeViewProps, TurnTailOwnerProps } from '../contract/slots.ts'
import { useQqSkin } from '../qq/qq-skin.ts'
import { qqTip } from '../qq/qq-feedback.ts'
import { MessageIconActions } from './MessageIconActions.tsx'
import { QqMessageActions } from './QqMessageActions.tsx'
import { assistantText } from './turn-assistant.ts'
import css from './TurnTailNodeView.module.css'

type TurnTailNodeViewProps = ChatNodeViewProps<'turn-tail'>
  & PropsRenderSlots<'conversation.chat.turnTail' | 'conversation.chat.assistant-actions'>

/** Turn-local actions and feature tail over the Location index, independent of Assistant placement. */
export const TurnTailNodeView = memo(function TurnTailNodeView({
  node, openFile, forkAt, renderSlot, renderSlotChain, t, useSession, sessionId,
}: TurnTailNodeViewProps) {
  const data = node.data
  const hasLaterChatNode = useSession(snapshot =>
    snapshot.chat.locations.getTurn(data.turn).at(-1) !== node.key)
  // QQ2006: hover action row (复制/引用/转发) above the tail + right-click
  // copy on the message body; interactive descendants (links, code blocks,
  // buttons) keep their native menus. The default skin keeps its chrome.
  // Hook order is fixed — the flag is read before the early returns below.
  const qqSkin = useQqSkin()
  const turn = node.location.kind === 'turn' || node.location.kind === 'step'
    ? node.location.turn
    : undefined
  if (turn === undefined) return null
  const closing = data.closing
  const owner: TurnTailOwnerProps = { turn, seq: closing?.finalNode.seq ?? data.seq, openFile }
  const tail = renderSlotChain('conversation.chat.turnTail', owner)
  if (closing === null) return tail === null ? null : <div className={css.root}>{tail}</div>
  const runMs = turn.start === undefined || turn.end === undefined
    ? undefined
    : Math.max(0, turn.end.time - turn.start.time)
  // Interruption-frozen partials carry no messageId, so they address no
  // durable message and contribute no per-message actions.
  const messageId = closing.finalNode.messageId
  const assistantActions = messageId === undefined
    ? null
    : renderSlot('conversation.chat.assistant-actions', { messageId })
  const tailText = assistantText(closing.blocks)
  return (
    <div
      className={css.root}
      data-turn-tail={data.turn}
      data-time-hover-root
      data-qq-msg-hover-root={qqSkin || undefined}
      onContextMenu={qqSkin
        ? (event) => {
          const target = event.target instanceof Element ? event.target : null
          if (target === null || target.closest('a, button, pre, code, [contenteditable]') !== null) return
          event.preventDefault()
          void writeClipboard(tailText).then((ok) => {
            qqTip(ok ? t('qq.msg.copied') : t('qq.copyFailed'))
          })
        }
        : undefined}
    >
      {qqSkin && tailText !== '' && <QqMessageActions text={tailText} sessionId={sessionId} t={t} />}
      {tail}
      <MessageIconActions
        text={tailText}
        time={closing.time}
        runMs={runMs}
        ttftMs={data.ttftMs}
        tokensPerSecond={data.tokensPerSecond}
        clock="end"
        onBranch={() => { forkAt(closing.finalNode.seq) }}
        branchUnavailable={data.branchUnavailable || hasLaterChatNode}
        className={css.actions}
        extraActions={assistantActions}
        t={t}
      />
    </div>
  )
})
