// QQComposerChrome: the QQ2006 composer chrome — the small toolbar (8
// buttons over the IMSmallToolbar* assets, A 字体/表情/其他/图片/截图/场景/
// 超级表情/语音对讲) registered on 'conversation.input.dock' (its own line
// directly above the input card), and the bottom button row (聊天记录(H)/
// 消息模式(T)/↓/☰/☺/🖼/✂/🎵) on 'conversation.composer.dock' (the band under
// the card). Both entries are skin-gated: they render nothing unless the
// QQ2006 skin is active, so the default skin keeps its exact composer DOM.
// All behavior goes through the injected QQChromeActions bundle.

import { memo } from 'react'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { QQChromeActions } from '../qq/qq-actions.ts'
import type { ConversationKey } from '../locales.ts'
import { useQqSkin } from '../qq/qq-skin.ts'
import css from './QQComposerChrome.module.css'

/** Injected share for both composer-chrome entries. */
export interface QQComposerChromeInjected {
  /** Real-verb bundle for every toolbar button. */
  qq: QQChromeActions
}

interface SmallToolbarEntry {
  id: string
  label: ConversationKey
  icon: string
  run: (qq: QQChromeActions) => () => void
}

/** The eight small-toolbar buttons (IMSmallToolbar* 18×18 assets). */
const SMALL_TOOLBAR: readonly SmallToolbarEntry[] = [
  { id: 'font', label: 'qq.small.font', icon: '/qq2006/img/im/IMSmallToolbarFont.png', run: q => q.cycleFontSize },
  { id: 'face', label: 'qq.small.face', icon: '/qq2006/img/im/IMSmallToolbarFace.png', run: q => () => q.insertEmoji('😊') },
  { id: 'other', label: 'qq.small.other', icon: '/qq2006/img/im/IMSmallToolbarOtherContent.png', run: q => q.toggleCommandMenu },
  { id: 'picture', label: 'qq.small.picture', icon: '/qq2006/img/im/IMSmallToolbarPicture.png', run: q => q.insertImageTemplate },
  { id: 'catch', label: 'qq.small.catch', icon: '/qq2006/img/im/IMSmallToolbarCatch.png', run: q => q.copyLastReply },
  { id: 'scene', label: 'qq.small.scene', icon: '/qq2006/img/im/IMSmallToolbarScene.png', run: q => q.cycleTheme },
  { id: 'superbag', label: 'qq.small.superbag', icon: '/qq2006/img/im/IMSmallToolbarSuperbag.png', run: q => () => q.insertEmoji('🎉') },
  { id: 'ptt', label: 'qq.small.ptt', icon: '/qq2006/img/im/IMSmallToolbarPtt.png', run: q => q.speakLastReply },
]

interface BottomRowEntry {
  id: string
  label: ConversationKey
  glyph: string
  run: (qq: QQChromeActions) => () => void
}

/** The bottom button row under the input card (glyph buttons). */
const BOTTOM_ROW: readonly BottomRowEntry[] = [
  { id: 'history', label: 'qq.bottom.history', glyph: 'H', run: q => q.loadOlder },
  { id: 'mode', label: 'qq.bottom.mode', glyph: 'T', run: q => () => q.setView('trajectory') },
  { id: 'down', label: 'qq.bottom.down', glyph: '↓', run: q => q.scrollToBottom },
  { id: 'menu', label: 'qq.bottom.menu', glyph: '☰', run: q => q.toggleCommandMenu },
  { id: 'face', label: 'qq.bottom.face', glyph: '☺', run: q => () => q.insertEmoji('😊') },
  { id: 'image', label: 'qq.bottom.image', glyph: '🖼', run: q => q.insertImageTemplate },
  { id: 'copy', label: 'qq.bottom.copy', glyph: '✂', run: q => q.copyLastReply },
  { id: 'theme', label: 'qq.bottom.theme', glyph: '🎵', run: q => q.cycleTheme },
]

export type QQSmallToolbarProps =
  PropsRuntime<'conversation.input.dock'> & QQComposerChromeInjected & PropsLocale<'conversation'>

/**
 * The small toolbar: its own line directly above the input card.
 * @param props - runtime kit + injected actions + locale.
 * @returns the toolbar, or null while the QQ2006 skin is inactive.
 */
export const QQSmallToolbar = memo(function QQSmallToolbar({ qq, t }: QQSmallToolbarProps) {
  const qqSkin = useQqSkin()
  if (!qqSkin) return null
  return (
    <div className={css.dockRow} data-qq-small-toolbar>
      <div className={css.toolbar}>
        {SMALL_TOOLBAR.map(entry => (
          <button
            key={entry.id}
            type="button"
            className={css.smallButton}
            aria-label={t(entry.label)}
            title={t(entry.label)}
            data-qq-tool={entry.id}
            onClick={entry.run(qq)}
          >
            <img src={entry.icon} alt="" className={css.smallIcon} />
          </button>
        ))}
      </div>
    </div>
  )
})

export type QQBottomRowProps =
  PropsRuntime<'conversation.composer.dock'> & QQComposerChromeInjected & PropsLocale<'conversation'>

/**
 * The bottom button row under the input card.
 * @param props - runtime kit + injected actions + locale.
 * @returns the row, or null while the QQ2006 skin is inactive.
 */
export const QQBottomRow = memo(function QQBottomRow({ qq, t }: QQBottomRowProps) {
  const qqSkin = useQqSkin()
  if (!qqSkin) return null
  return (
    <div className={css.bottomRow} data-qq-bottom-row>
      {BOTTOM_ROW.map(entry => (
        <button
          key={entry.id}
          type="button"
          className={css.bottomButton}
          aria-label={t(entry.label)}
          title={t(entry.label)}
          data-qq-tool={entry.id}
          onClick={entry.run(qq)}
        >
          <span className={css.bottomGlyph} aria-hidden>{entry.glyph}</span>
        </button>
      ))}
    </div>
  )
})
