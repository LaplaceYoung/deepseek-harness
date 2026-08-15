// Live WeChat skin reader: the body[data-ds-skin='wexin'] attribute the
// ui-skin-wexin plugin mirrors (and boot.tsx restores before the loading
// page renders). The sidebar shell renders the WeChat nav-bar avatar ONLY
// while this returns true, so the default skin keeps its exact DOM; the CSS
// patches in this package are additionally scoped to
// `body[data-ds-skin='wexin']` ancestors, so both layers are skin-gated.
//
// The same reader exists in ui-workspace (wexin-skin.ts) and ui-conversation
// (wechat/wechat-skin.ts): each package must be self-contained, and the
// pattern is deliberately tiny.

import { useSyncExternalStore } from 'react'

const SKIN = 'wexin'

/** Synchronous attribute read (event handlers, layout effects). */
export function isWexinSkin(): boolean {
  return document.body.getAttribute('data-ds-skin') === SKIN
}

const listeners = new Set<() => void>()
let observer: MutationObserver | null = null

/** Arm the body-attribute observer once (idempotent). */
function ensure(): void {
  if (observer !== null) return
  observer = new MutationObserver(() => {
    for (const listener of listeners) listener()
  })
  observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-skin'] })
}

function subscribe(listener: () => void): () => void {
  ensure()
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Live skin flag; re-renders the consumer when the skin attribute flips. */
export function useWexinSkin(): boolean {
  ensure()
  return useSyncExternalStore(subscribe, isWexinSkin)
}
