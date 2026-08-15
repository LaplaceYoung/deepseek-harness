// WechatMessageActions: the WeChat message hover action row (复制 / 引用).
// Shown only while the active skin is on (the default skin keeps its
// IconActions row): copy writes the full message text and answers with a
// WeChat-style toast; quote appends a `> text` block to the composer draft
// through the per-session composer-action registry (the composer bar
// registers the inserter) and swaps the button to a brief ✓. Reveal rides
// the owning message row's `data-wechat-msg-hover-root` scope.

import { useEffect, useRef, useState } from 'react'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import { writeClipboard } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ChatViewSlotProps } from '../contract/slots.ts'
import { wechatComposerActions } from '../wechat/wechat-chrome-actions.ts'
import { wechatTip } from '../wechat/wechat-feedback.ts'
import { useWexinSkin } from '../wechat/wechat-skin.ts'
import css from './WechatMessageActions.module.css'

export interface WechatMessageActionsProps {
  /** Full plain text the copy / quote verbs operate on. */
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

/** WeChat hover action row; renders nothing outside the active skin. */
export function WechatMessageActions({ text, sessionId, t }: WechatMessageActionsProps) {
  const wexinSkin = useWexinSkin()
  // The ✓ feedback window: same one-shot discipline as the default copy
  // icon (a re-click during the window neither re-quotes nor stacks timers).
  const [quoted, setQuoted] = useState(false)
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => () => {
    if (quoteTimer.current !== null) clearTimeout(quoteTimer.current)
  }, [])
  if (!wexinSkin) return null
  const onCopy = (): void => {
    void writeClipboard(text).then((ok) => {
      wechatTip(ok ? t('wechat.msg.copied') : t('wechat.copyFailed'))
    })
  }
  const onQuote = (): void => {
    const actions = wechatComposerActions(sessionId)
    if (actions === undefined) {
      wechatTip(t('wechat.msg.quoteUnavailable'))
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
  return (
    <div className={css.row} data-wechat-msg-actions>
      <button type="button" className={css.action} onClick={onCopy}>{t('wechat.msg.copy')}</button>
      <button
        type="button"
        className={css.action}
        data-quoted={quoted || undefined}
        aria-label={t('wechat.msg.quote')}
        onClick={onQuote}
      >
        {quoted ? t('wechat.msg.quoteDone') : t('wechat.msg.quote')}
      </button>
    </div>
  )
}
