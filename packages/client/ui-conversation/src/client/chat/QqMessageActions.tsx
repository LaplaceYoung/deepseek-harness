// QqMessageActions: the QQ2006 message hover action row (复制 / 引用 / 转发).
// Shown only while the active skin is on (the default skin keeps its
// IconActions row): copy writes the full message text and answers with a
// QQTip; quote appends a `> text` block to the composer draft through the
// per-session composer-action registry (the composer bar registers the
// inserter) and swaps the button to a brief ✓; forward copies the quote-
// format text — the QQ 转发 semantics (paste into another session/external).
// Reveal rides the owning message row's `data-qq-msg-hover-root` scope.

import { useEffect, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import { qqComposerActions } from '../qq/qq-chrome-actions.ts'
import { qqTip } from '../qq/qq-feedback.ts'
import { useQqSkin } from '../qq/qq-skin.ts'
import css from './QqMessageActions.module.css'

export interface QqMessageActionsProps {
  /** Full plain text the copy / quote / forward verbs operate on. */
  text: string
  /**
   * The session whose composer receives the quote; its composer-action
   * registration serves the inserter. Absent in unit mounts without the
   * skin, where the row renders nothing anyway.
   */
  sessionId?: SessionId | undefined
  /** The owning view's locale seat, passed down as a plain prop. */
  t: ChatViewSlotProps['t']
}

/** QQ2006 hover action row; renders nothing outside the active skin. */
export function QqMessageActions({ text, sessionId, t }: QqMessageActionsProps) {
  const qqSkin = useQqSkin()
  // The ✓ feedback window: same one-shot discipline as the default copy
  // icon (a re-click during the window neither re-quotes nor stacks timers).
  const [quoted, setQuoted] = useState(false)
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (quoteTimer.current !== null) clearTimeout(quoteTimer.current)
  }, [])
  if (!qqSkin) return null
  const onCopy = (): void => {
    void writeClipboard(text).then((ok) => {
      qqTip(ok ? t('qq.msg.copied') : t('qq.copyFailed'))
    })
  }
  const onQuote = (): void => {
    const actions = qqComposerActions(sessionId)
    if (actions === undefined) {
      qqTip(t('qq.msg.quoteUnavailable'))
    } else {
      actions.quote(text)
    }
    setQuoted(true)
    if (quoteTimer.current !== null) clearTimeout(quoteTimer.current)
    quoteTimer.current = window.setTimeout(() => {
      quoteTimer.current = null
      setQuoted(false)
    }, 1000)
  }
  const onForward = (): void => {
    void writeClipboard(`> ${text}`).then((ok) => {
      qqTip(ok ? t('qq.msg.forwarded') : t('qq.copyFailed'))
    })
  }
  return (
    <div className={css.row} data-qq-msg-actions>
      <button type="button" className={css.action} onClick={onCopy}>{t('qq.msg.copy')}</button>
      <button
        type="button"
        className={css.action}
        data-quoted={quoted || undefined}
        aria-label={t('qq.msg.quote')}
        onClick={onQuote}
      >
        {quoted ? t('qq.msg.quoteDone') : t('qq.msg.quote')}
      </button>
      <button type="button" className={css.action} onClick={onForward}>{t('qq.msg.forward')}</button>
    </div>
  )
}
