// QQ2006 message-meta time formatting: the original list row shows the
// clock as HH:MM:SS beside the sender name, with the full date on hover.

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** `HH:MM:SS` clock for the QQ2006 message meta line. */
export function qqClockTime(ms: number): string {
  const d = new Date(ms)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

/** Full `YYYY-MM-DD HH:MM:SS` string for the meta line's hover title. */
export function qqFullDateTime(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} `
    + `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}
