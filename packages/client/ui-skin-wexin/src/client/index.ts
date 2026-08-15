/**
 * QQ2006 skin plugin. Two jobs, both presentation-only:
 *
 * 1. Register the `qq2006` theme with the theme service (id
 *    `qq2006`, light colorScheme so the dark base palette never applies)
 *    carrying the coral-blue alias-token overrides. The registration puts
 *    the skin on the Appearance settings row as a selectable cube and
 *    persists through the theme service's own `dsh.theme` storage key —
 *    the boot kernel reads that key to restore the attribute before the
 *    loading page renders.
 *
 * 2. Mirror the resolved active theme onto `body[data-ds-skin]` so the
 *    scoped skin stylesheet (`src/styles/qq2006.css`, imported by the web
 *    shell base.css) and the component `.module.css` skin patches activate.
 *    The mirror is an exact retraction set: the plugin only ever removes
 *    the attribute it set, so foreign attributes survive.
 */
import type { Context } from '@deepseek-ai/cordis'
// Type-only: pulls the theme service's Context merge (ctx.theme) and the
// snapshot type; erased at build time, so no runtime cross-package value
// import (client bundle purity gate).
import type { ThemeSnapshot } from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'

/** Theme id this skin registers; also the value of the body skin attribute. */
export const THEME_ID = 'wexin'

/** Body attribute the skin mirror writes (component patches scope on it). */
export const SKIN_ATTRIBUTE = 'data-ds-skin'

/**
 * QQ2006 coral-blue alias-token overrides, applied by the theme presenter as
 * inline CSS variables on body (the light base palette + these overrides
 * produce the classic 2006 look; component-level chrome comes from the skin
 * stylesheet and per-component patches).
 */
export const QQ2006_TOKENS: Readonly<Record<string, string>> = Object.freeze({
  '--dsw-alias-bg-base': 'rgb(247, 247, 247)',
  '--dsw-alias-bg-layer-1': 'rgb(255, 255, 255)',
  '--dsw-alias-bg-layer-2': 'rgb(247, 247, 247)',
  '--dsw-alias-bg-layer-3': 'rgb(235, 235, 235)',
  '--dsw-alias-bg-mask-1': 'rgba(255, 255, 255, 0.96)',
  '--dsw-alias-bg-mask-2': 'rgba(247, 247, 247, 0.9)',
  '--dsw-alias-bg-mask-3': 'rgba(235, 235, 235, 0.85)',
  '--dsw-alias-bg-mask-photo': 'rgba(255, 255, 255, 0.9)',
  '--dsw-alias-bg-mask-drop': 'rgba(247, 247, 247, 0.8)',
  '--dsw-alias-bg-module-platform': 'rgb(247, 247, 247)',
  '--dsw-alias-bg-multi-select': 'rgb(204, 230, 215)',
  '--dsw-alias-bg-overlay': 'rgba(255, 255, 255, 0.95)',
  '--dsw-alias-bg-skeleton': 'rgb(230, 230, 230)',
  '--dsw-alias-border-inverted': 'rgb(220, 220, 220)',
  '--dsw-alias-border-inverted2': 'rgb(210, 210, 210)',
  '--dsw-alias-border-l1': 'rgb(200, 200, 200)',
  '--dsw-alias-border-l2': 'rgb(178, 178, 178)',
  '--dsw-alias-border-l2-darkmode-thin': 'rgb(178, 178, 178)',
  '--dsw-alias-border-l3': 'rgb(150, 150, 150)',
  '--dsw-alias-border-l4': 'rgb(120, 120, 120)',
  '--dsw-alias-brand-primary': 'rgb(7, 193, 96)',
  '--dsw-alias-brand-primary-invert': 'rgb(255, 255, 255)',
  '--dsw-alias-brand-primary-new-colorprimary-new-color': 'rgb(7, 193, 96)',
  '--dsw-alias-brand-text': 'rgb(255, 255, 255)',
  '--dsw-alias-button-contrast-fill': 'rgb(7, 193, 96)',
  '--dsw-alias-button-elevated-fill': 'rgb(250, 253, 255)',
  '--dsw-alias-button-floating-fill': 'rgb(255, 255, 255)',
  '--dsw-alias-button-floating-hover': 'rgb(224, 240, 253)',
  '--dsw-alias-button-ghost-active-border': 'rgb(7, 193, 96)',
  '--dsw-alias-button-ghost-active-fill': 'rgb(204, 230, 215)',
  '--dsw-alias-button-ghost-active-hover': 'rgb(186, 222, 203)',
  '--dsw-alias-button-info-fill': 'rgb(219, 237, 226)',
  '--dsw-alias-button-info-hover': 'rgb(199, 230, 210)',
  '--dsw-alias-button-primary-dimmed': 'rgb(130, 214, 163)',
  '--dsw-alias-button-primary-fill': 'rgb(7, 193, 96)',
  '--dsw-alias-button-primary-hover': 'rgb(38, 210, 112)',
  '--dsw-alias-button-tool-bar-fill': 'rgb(247, 247, 247)',
  '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(247, 247, 247, 0)',
  '--dsw-alias-button-tool-bar-hover': 'rgb(224, 224, 224)',
  '--dsw-alias-interactive-bg-active': 'rgb(214, 214, 214)',
  '--dsw-alias-interactive-bg-hover': 'rgb(224, 224, 224)',
  '--dsw-alias-interactive-bg-hover-accent': 'rgb(199, 230, 210)',
  '--dsw-alias-interactive-bg-hover-danger': 'rgb(250, 218, 218)',
  '--dsw-alias-interactive-bg-hover-solid': 'rgb(38, 210, 112)',
  '--dsw-alias-label-caption': 'rgb(150, 154, 157)',
  '--dsw-alias-label-dimmed': 'rgb(150, 154, 157)',
  '--dsw-alias-label-primary': 'rgb(55, 59, 62)',
  '--dsw-alias-label-primary-bluish': 'rgb(55, 59, 62)',
  '--dsw-alias-label-primary-dimmed': 'rgb(130, 134, 137)',
  '--dsw-alias-label-primary-foreground': 'rgb(255, 255, 255)',
  '--dsw-alias-label-primary-inverted': 'rgb(255, 255, 255)',
  '--dsw-alias-label-secondary': 'rgb(150, 154, 157)',
  '--dsw-alias-label-tertiary': 'rgb(150, 154, 157)',
  '--dsw-alias-markdown-citation': 'rgb(235, 235, 235)',
  '--dsw-alias-markdown-code-block': 'rgb(247, 247, 247)',
  '--dsw-alias-markdown-code-block-banner': 'rgb(224, 224, 224)',
  '--dsw-alias-markdown-code-segment-selected': 'rgb(199, 230, 210)',
  '--dsw-alias-markdown-code-segment-unselected': 'rgb(235, 245, 253)',
  '--dsw-alias-markdown-inline-code': 'rgb(235, 235, 235)',
  '--dsw-alias-markdown-placeholder': 'rgb(150, 154, 157)',
  '--dsw-alias-markdown-tag': 'rgb(224, 224, 224)',
  '--dsw-alias-scrollbar-bg-l1': 'rgb(228, 228, 228)',
  '--dsw-alias-scrollbar-bg-l2': 'rgb(224, 224, 224)',
  '--dsw-alias-scrollbar-hover-l1': 'rgb(190, 190, 190)',
  '--dsw-alias-scrollbar-hover-l2': 'rgb(160, 160, 160)',
  '--dsw-alias-state-business-primary': 'rgb(7, 193, 96)',
  '--dsw-alias-state-business-tertiary': 'rgb(224, 224, 224)',
  '--dsw-alias-state-error-primary': 'rgb(250, 81, 81)',
  '--dsw-alias-state-error-secondary': 'rgb(253, 226, 226)',
  '--dsw-alias-state-success-primary': 'rgb(7, 193, 96)',
  '--dsw-alias-state-success-secondary': 'rgb(219, 237, 226)',
  '--dsw-alias-state-success-tertiary': 'rgb(205, 236, 216)',
  '--dsw-alias-state-warn-label': 'rgb(179, 127, 30)',
  '--dsw-alias-state-warn-primary': 'rgb(250, 185, 80)',
  '--dsw-alias-state-warn-secondary': 'rgb(253, 243, 214)',
  '--dsw-alias-state-warn-tertiary': 'rgb(250, 234, 191)',
  '--dsw-alias-toast-bg': 'rgb(255, 249, 235)',
  '--dsw-alias-tooltip-bg': 'rgb(255, 249, 235)',
})

/** Required services: the theme registry (theme/change + register). */
export const inject = ['theme']

/**
 * Client plugin body: register the theme and mirror the active theme onto
 * the body skin attribute (exact retraction set).
 * @param ctx - client cordis context.
 */
export function apply(ctx: Context): void {
  ctx.theme.register({
    id: THEME_ID,
    colorScheme: 'light',
    tokens: { ...QQ2006_TOKENS },
  })

  // Restore a persisted preference this theme owns. The theme service's
  // restorePreference only accepts the built-in trio (light/dark/system), so
  // a persisted 'qq2006' falls back to 'system' at service construction.
  // Re-assert it now that the id is registered: setTheme persists (same
  // value) and republishes, so the mirror below applies the attribute. The
  // storage key is spelled out because ui-theme is not a module-table entry
  // (a value import would trip the client bundle purity gate); the shell's
  // boot.tsx reads the same key for the pre-settle loading page.
  if (typeof localStorage !== 'undefined') {
    try {
      if (localStorage.getItem('dsh.theme') === THEME_ID) ctx.theme.setTheme(THEME_ID)
    } catch {
      // Privacy-mode storage failure: the preference simply does not restore.
    }
  }

  const sync = (snapshot: ThemeSnapshot): void => {
    // Node e2e boots have no document; the mirror is browser presentation.
    if (typeof document === 'undefined') return
    if (snapshot.active.id === THEME_ID) document.body.setAttribute(SKIN_ATTRIBUTE, THEME_ID)
    else document.body.removeAttribute(SKIN_ATTRIBUTE)
  }
  ctx.on('theme/change', sync)
  // Seal the window between register()'s own event and this listener: a
  // snapshot read is authoritative at any point.
  sync(ctx.theme.getTheme())
}
