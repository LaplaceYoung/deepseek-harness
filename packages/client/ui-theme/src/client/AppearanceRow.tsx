/**
 * Appearance preference row registered into the General section item slot
 * (figma 501:30012 'Frame 2117131228'): title + preference cubes.
 * Registered by this package — the theme feature owns its own settings
 * surface. Selection follows the persisted preference, never the resolved
 * active theme.
 */
import clsx from 'clsx'
import {
  IconDarkOutline16, IconFollowsystemOutline16, IconLightOutline16, IconNewChatOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime, PropsStore } from '@deepseek-ai/dsh-client-ui-slots'
import type { ThemeKey } from './locales.ts'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type { createAppearanceRowStore } from './settings-store.ts'
import css from './AppearanceRow.module.css'

/** Injected business face: the preference write (t rides the standard locale seat). */
export interface AppearanceRowInjected {
  /** Switch the theme preference (a registered theme id or `system`). */
  setTheme: (id: string) => void
}

/** Full component props: runtime share + store share + locale seat + injected face. */
export type AppearanceRowComponentProps =
  PropsRuntime<'settings.general.item'> & PropsStore<ReturnType<typeof createAppearanceRowStore>>
  & PropsLocale<'settings.theme'> & AppearanceRowInjected

/** One appearance cube: the three built-in preferences or a registered theme
 * (the Weixin skin registers `wexin` through the theme service, so its cube
 * is a literal-label sibling of the built-in trio — the row's own dictionary
 * only knows the built-ins). */
interface ThemeCube {
  /** Theme id: a built-in preference or a registered theme id. */
  id: string
  /** Locale key for built-in cubes. */
  labelKey?: ThemeKey
  /** Literal label for registered-theme cubes with no locale seat. */
  label?: string
  Icon: typeof IconLightOutline16
}

/** Cube order and icons (figma 501:30015-30017: Light, Dark, System; the
 * Weixin skin rides the same row as its skin-owned option, and a later
 * registered skin would slot before it). */
const CUBES: readonly ThemeCube[] = [
  { id: 'light', labelKey: 'appearance.light', Icon: IconLightOutline16 },
  { id: 'dark', labelKey: 'appearance.dark', Icon: IconDarkOutline16 },
  { id: 'system', labelKey: 'appearance.system', Icon: IconFollowsystemOutline16 },
  { id: 'wexin', label: '微信皮肤', Icon: IconNewChatOutline16 },
]

/**
 * Render the Appearance row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function AppearanceRow({ t, setTheme, useStore }: AppearanceRowComponentProps) {
  const preference = useStore(s => s.preference)
  return (
    <div className={css.group}>
      <div className={css.title}>{t('appearance.title')}</div>
      <div className={css.cubeRow}>
        {CUBES.map(({ id, labelKey, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={clsx(css.themeCube, preference === id && css.selected)}
            aria-pressed={preference === id}
            data-theme={id}
            onClick={() => { setTheme(id) }}
          >
            <Icon />
            {label !== undefined ? label : t(labelKey as ThemeKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
