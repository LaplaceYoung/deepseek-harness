// QQ2006 sound effects: the new-message alert (msg.mp3, toggleable via the
// 语音 big-toolbar button, persisted in `dsh.qq.sound`) and the send click
// (Global.mp3). All playback is best-effort (autoplay policy / missing
// media degrade silently) and only ever triggered from skin-gated UI.

/** localStorage key for the new-message alert toggle. */
export const QQ_SOUND_KEY = 'dsh.qq.sound'

function readToggle(): boolean {
  try {
    return localStorage.getItem(QQ_SOUND_KEY) !== '0'
  } catch {
    return true
  }
}

function writeToggle(enabled: boolean): void {
  try {
    localStorage.setItem(QQ_SOUND_KEY, enabled ? '1' : '0')
  } catch {
    // Private mode: the toggle still applies for this session.
  }
}

let enabled = readToggle()

/** Whether the new-message alert is currently enabled (module store). */
export function qqSoundEnabled(): boolean {
  return enabled
}

/** Flip the alert toggle; returns the new state. */
export function toggleQqSound(): boolean {
  enabled = !enabled
  writeToggle(enabled)
  return enabled
}

const SOUND_SRC: Record<'msg' | 'global', string> = {
  msg: '/qq2006/sound/msg.mp3',
  global: '/qq2006/sound/Global.mp3',
}

/**
 * Play one QQ sound. `msg` respects the alert toggle; `global` (send click)
 * always plays.
 * @param name - which sound.
 */
export function playQqSound(name: 'msg' | 'global'): void {
  if (name === 'msg' && !enabled) return
  try {
    void new Audio(SOUND_SRC[name]).play().catch(() => {
      // Autoplay restrictions or a missing asset: never surface an error.
    })
  } catch {
    // Audio constructor can throw in restricted environments.
  }
}
