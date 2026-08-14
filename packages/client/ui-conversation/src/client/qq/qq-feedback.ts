// QQTip: the transient bottom-center feedback tip QQ2006 shows after button
// presses (「已切换到…」「已打开…」). A single host element under document.body
// holds one tip at a time; the CSS module classes are hashed and applied
// directly, so the element works without a skin-scope ancestor — it is only
// ever created from skin-gated UI actions.

import tipCss from '../skeleton/QQTip.module.css'

let host: HTMLDivElement | null = null
let timer: ReturnType<typeof setTimeout> | undefined

/**
 * Show one QQ-style feedback tip for ~1.4s, replacing any previous tip.
 * @param text - tip copy.
 */
export function qqTip(text: string): void {
  // A host removed from the document (test teardown, a reflowing layout that
  // clears body children) must not keep swallowing tips through the stale
  // reference — recreate it when detached.
  if (host === null || !host.isConnected) {
    host = document.createElement('div')
    host.className = tipCss.host ?? ''
    document.body.appendChild(host)
  }
  const tip = document.createElement('div')
  tip.className = tipCss.tip ?? ''
  tip.textContent = text
  tip.setAttribute('data-qq-tip', '')
  host.replaceChildren(tip)
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    host?.replaceChildren()
  }, 1400)
}
