import { memo, useMemo } from 'react'
import type { ChatNodeViewProps, TurnTailOwnerProps } from '../contract/slots.ts'
import { AssistantMarkdown } from './AssistantMarkdown.tsx'

/** Streaming, settled, and interrupted Assistant states share one keyed renderer instance. */
export const AssistantNodeView = memo(function AssistantNodeView({
  node, useTurnData, openFile, loadImage, fileMentions, sessionId, useSessions, t,
}: ChatNodeViewProps<'assistant-step'>) {
  const data = node.data
  // QQ2006 sender name on assistant rows: the conversation's display title
  // (standard sessions kit; absent in direct-render unit mounts).
  const otherName = useSessions === undefined
    ? undefined
    : useSessions(s => s.byId[sessionId]?.displayTitle ?? sessionId)
  const turn = node.location.kind === 'turn' || node.location.kind === 'step'
    ? node.location.turn
    : undefined
  const tail = useTurnData('turn-tail')
  const owner = useMemo<TurnTailOwnerProps | undefined>(() => {
    if (turn?.status !== 'closed' || data.finalNode === undefined) return undefined
    if (tail?.closing?.finalNode.seq !== data.finalNode.seq) return undefined
    return { turn, seq: data.finalNode.seq, openFile }
  }, [data.finalNode, openFile, tail, turn])
  const mentions = useMemo(
    () => owner === undefined ? undefined : fileMentions(owner),
    [fileMentions, owner],
  )
  return (
    <AssistantMarkdown
      blocks={data.blocks}
      streaming={data.status === 'running'}
      interrupted={data.status === 'interrupted'}
      loadImage={loadImage}
      mentions={mentions}
      time={data.time}
      otherName={otherName}
      t={t}
    />
  )
})
