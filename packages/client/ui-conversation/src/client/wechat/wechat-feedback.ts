// wechatTip: the transient WeChat-style feedback toast (「已复制…」) shown
// after skin actions. A single host element under document.body holds one
// toast at a time; the CSS module classes are hashed and applied directly,
// so the element works without a skin-scope ancestor — it is only ever
// created from skin-gated UI actions.

import tipCss from '../skeleton/WechatTip.module.css'

let host: HTMLDivElement | null = null
let timer: ReturnType<typeof setTimeout> | undefined

/**
 * Show one WeChat-style feedback toast for ~1.4s, replacing any previous one.
 * @param text - toast copy.
 */
export function wechatTip(text: string): void {
  // A host removed from the document (test teardown, a reflowing layout that
  // clears body children) must not keep swallowing toasts through the stale
  // reference — recreate it when detached.
  if (host === null || !host.isConnected) {
    host = document.createElement('div')
    host.className = tipCss.host ?? ''
    document.body.appendChild(host)
  }
  const tip = document.createElement('div')
  tip.className = tipCss.tip ?? ''
  tip.textContent = text
  tip.setAttribute('data-wechat-tip', '')
  host.replaceChildren(tip)
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    host?.replaceChildren()
  }, 1400)
}
