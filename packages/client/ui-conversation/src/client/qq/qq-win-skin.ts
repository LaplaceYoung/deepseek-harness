// QQ2006 chat-window skin presets — the titlebar 更换颜色 button cycles
// 经典蓝 / 粉红 / 薄荷绿 / 紫罗兰. Persisted in localStorage `dsh.qq.winSkin`
// (shared with the Settings → General 聊天窗口配色 row owned by ui-theme),
// applied as `data-qq-win-skin` on the conversation root and consumed as
// `--qq-win-*` custom properties by the bubble/panel/input skin patches.
//
// Default-skin zero impact: the attribute only exists inside
// `body[data-ds-skin='qq2006']`-scoped CSS, so a classic-skin value on the
// root is inert until the QQ2006 skin is active.

import { useSyncExternalStore } from 'react'

/** The four QQ2006 window presets, in cycle order. */
export const QQ_WIN_SKINS = ['classic', 'pink', 'mint', 'violet'] as const
export type QQWinSkin = (typeof QQ_WIN_SKINS)[number]

/** Static membership table for the preset union (cycle + external writes). */
const QQ_WIN_SKIN_SET: Record<QQWinSkin, true> = {
  classic: true,
  pink: true,
  mint: true,
  violet: true,
}

/** localStorage key shared with the ui-theme Appearance/settings row. */
export const QQ_WIN_SKIN_KEY = 'dsh.qq.winSkin'
/** Window event name the settings row (and this package) listen to. */
export const QQ_WIN_SKIN_EVENT = 'qq:win-skin'

function readStored(): QQWinSkin {
  try {
    const value = localStorage.getItem(QQ_WIN_SKIN_KEY)
    return value !== null && value in QQ_WIN_SKIN_SET ? (value as QQWinSkin) : 'classic'
  } catch {
    return 'classic'
  }
}

let current: QQWinSkin = readStored()
const listeners = new Set<() => void>()

/** Current preset (module store; also re-readable via storage events). */
export function qqWinSkin(): QQWinSkin {
  return current
}

/** Persist + broadcast one preset change (guarded: no-op for the same value). */
function publishQqWinSkin(next: QQWinSkin): void {
  if (current === next) return
  current = next
  try {
    localStorage.setItem(QQ_WIN_SKIN_KEY, next)
  } catch {
    // Private mode: the cycle still applies for this session.
  }
  for (const listener of listeners) listener()
  window.dispatchEvent(new CustomEvent<QQWinSkin>(QQ_WIN_SKIN_EVENT, { detail: next }))
}

/** Advance to the next preset; returns the newly active preset. */
export function cycleQqWinSkin(): QQWinSkin {
  const next = QQ_WIN_SKINS[(QQ_WIN_SKINS.indexOf(current) + 1) % QQ_WIN_SKINS.length] ?? 'classic'
  publishQqWinSkin(next)
  return next
}

/** External writes (the Settings 聊天窗口配色 row) keep this store in sync. */
export function setQqWinSkin(next: QQWinSkin): void {
  if (!(next in QQ_WIN_SKIN_SET)) return
  publishQqWinSkin(next)
}

export function subscribeQqWinSkin(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** Live preset; re-renders the conversation root so the attribute moves. */
export function useQqWinSkin(): QQWinSkin {
  return useSyncExternalStore(subscribeQqWinSkin, qqWinSkin)
}
