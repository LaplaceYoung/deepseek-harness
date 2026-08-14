// @vitest-environment jsdom
// QQ2006 message hover action row (复制/引用/转发) + right-click copy:
// skin-gated rendering, real clipboard writes, quote through the per-session
// composer-action registry (✓ feedback), and the default skin's unchanged
// IconActions row. Default-skin zero regression is asserted first.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import type { SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNodeViewProps } from '../src/client/contract/slots.ts'
import { UserMessageNodeView } from '../src/client/chat/MessageItem.tsx'
import { TurnTailNodeView } from '../src/client/chat/TurnTailNodeView.tsx'
import { registerQqComposerActions } from '../src/client/qq/qq-chrome-actions.ts'
import { zh } from '../src/client/locales.ts'
import { chatSnapshotFixture } from './chat-snapshot-fixture.client.ts'

const SID = 's1' as SessionId

// Mirrors the real lookup chain (conversation namespace, then common).
const t: ChatNodeViewProps['t'] = makeTranslate(zh, commonZh)

/** Clipboard stub shared by the write assertions. */
function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
  return writeText
}

function removeQqTipHost(): void {
  document.querySelectorAll('[data-qq-tip]').forEach(node => node.remove())
  // The tip host element itself has no marker; drop the last appended body
  // child when it is the host (class hash ends with `_host`).
  const host = document.body.lastElementChild
  if (host !== null && (host.className ?? '').includes('_host')) host.remove()
}

beforeEach(() => {
  vi.useFakeTimers()
  document.body.removeAttribute('data-ds-skin')
  removeQqTipHost()
})
afterEach(() => {
  cleanup()
  document.body.removeAttribute('data-ds-skin')
  removeQqTipHost()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Minimal user-node props (session-scope standard kit carries sessionId). */
function userProps(over: Partial<ChatNodeViewProps<'user'>> = {}): ChatNodeViewProps<'user'> {
  return {
    sessionId: SID,
    loadImage: vi.fn(() => Promise.resolve('')),
    t,
    node: {
      key: 'fixture:user:1',
      id: '1',
      target: 'chat',
      kind: 'user',
      anchorSeq: 1,
      location: { kind: 'session' },
      visibility: 'visible',
      data: {
        content: [{ type: 'text', text: 'hello bubble' }],
        time: 1_000,
        source: null,
      },
    },
    ...over,
  } as unknown as ChatNodeViewProps<'user'>
}

/** Closed turn + tail node built through the real snapshot fixture. */
function tailProps(): Parameters<typeof TurnTailNodeView>[0] {
  const slice = chatSnapshotFixture({
    nodes: [
      { kind: 'user', seq: 1, time: 1_000, content: [{ type: 'text', text: 'q' }], source: null } as never,
      { kind: 'assistant', seq: 2, time: 2_000, turn: 1, step: 1, blocks: [{ kind: 'text', text: 'assistant reply text' }] } as never,
    ],
    turnEnds: new Map([[1, 3]]),
  })
  const node = [...slice.nodes.values()].find(candidate => candidate.kind === 'turn-tail')
  if (node === undefined) throw new Error('fixture produced no turn-tail node')
  return {
    sessionId: SID,
    useSession: (select: (snapshot: unknown) => unknown) => select({ chat: slice } as never),
    openFile: vi.fn(),
    forkAt: vi.fn(),
    renderSlot: () => null,
    renderSlotChain: () => null,
    t,
    node,
  } as unknown as Parameters<typeof TurnTailNodeView>[0]
}

describe('QQ2006 message action row', () => {
  it('default skin keeps the IconActions row and renders no QQ row', () => {
    render(<UserMessageNodeView {...userProps()} />)
    expect(screen.getByRole('button', { name: '复制' })).toBeTruthy()
    expect(document.querySelector('[data-qq-msg-actions]')).toBeNull()
  })

  it('skin: user bubble swaps the icon row for 复制/引用/转发', () => {
    document.body.setAttribute('data-ds-skin', 'qq2006')
    render(<UserMessageNodeView {...userProps()} />)
    const row = document.querySelector('[data-qq-msg-actions]')
    expect(row).not.toBeNull()
    // Exactly the three QQ verbs — the default icon row (clock + copy icon)
    // is replaced, not stacked beside it.
    const buttons = screen.getAllByRole('button')
    expect(buttons.map(button => button.textContent)).toEqual(['复制', '引用', '转发'])
  })

  it('skin: user message renders the QQ list row (昵称 + HH:MM:SS + 文本行), no bubble', () => {
    document.body.setAttribute('data-ds-skin', 'qq2006')
    const view = render(<UserMessageNodeView {...userProps()} />)
    const row = view.container.querySelector('[data-qq-msg-row]') as HTMLElement
    expect(row).not.toBeNull()
    expect(row.getAttribute('data-self')).not.toBeNull()
    const meta = row.querySelector('[class*="qqMsgMeta"]') as HTMLElement
    expect(meta).not.toBeNull()
    // 昵称（自己 = 我）+ 时间 span HH:MM:SS；完整日期挂在 title 上。
    expect(meta.textContent).toContain('我')
    expect(meta.textContent).toMatch(/\d{2}:\d{2}:\d{2}/)
    expect(meta.getAttribute('title')).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    const text = row.querySelector('[class*="qqMsgText"]') as HTMLElement
    expect(text.textContent).toBe('hello bubble')
    // 原版列表式：皮肤行内不再出现气泡。
    expect(row.querySelector('[class*="bubble"]')).toBeNull()
  })

  it('skin: 复制 writes the full text and answers with a QQTip', async () => {
    document.body.setAttribute('data-ds-skin', 'qq2006')
    const writeText = stubClipboard()
    render(<UserMessageNodeView {...userProps()} />)
    fireEvent.click(screen.getByText('复制'))
    await vi.advanceTimersByTimeAsync(0)
    expect(writeText).toHaveBeenCalledWith('hello bubble')
    const tip = document.querySelector('[data-qq-tip]')
    expect(tip?.textContent).toContain('已复制消息全文')
  })

  it('skin: 引用 appends the quote block through the composer registry and shows ✓', () => {
    document.body.setAttribute('data-ds-skin', 'qq2006')
    const quote = vi.fn()
    const disposer = registerQqComposerActions(SID, { focusComposer: vi.fn(), quote })
    try {
      render(<UserMessageNodeView {...userProps()} />)
      const button = screen.getByRole('button', { name: '引用' })
      fireEvent.click(button)
      expect(quote).toHaveBeenCalledWith('hello bubble')
      expect(button.getAttribute('data-quoted')).toBe('true')
      // ✓ feedback reverts after 1s (act flushes the timer-driven state).
      act(() => { vi.advanceTimersByTime(1_000) })
      expect(button.getAttribute('data-quoted')).toBeNull()
    } finally {
      disposer()
    }
  })

  it('skin: 引用 without a registered composer answers with the unavailable tip', () => {
    document.body.setAttribute('data-ds-skin', 'qq2006')
    render(<UserMessageNodeView {...userProps()} />)
    fireEvent.click(screen.getByRole('button', { name: '引用' }))
    const tip = document.querySelector('[data-qq-tip]')
    expect(tip?.textContent).toContain('输入框尚未就绪')
  })

  it('skin: 转发 copies the quote-format text', async () => {
    document.body.setAttribute('data-ds-skin', 'qq2006')
    const writeText = stubClipboard()
    render(<UserMessageNodeView {...userProps()} />)
    fireEvent.click(screen.getByText('转发'))
    await vi.advanceTimersByTimeAsync(0)
    expect(writeText).toHaveBeenCalledWith('> hello bubble')
  })

  it('skin: right-click on the user message copies the full text; default skin keeps the native menu', async () => {
    const writeText = stubClipboard()
    document.body.setAttribute('data-ds-skin', 'qq2006')
    const view = render(<UserMessageNodeView {...userProps()} />)
    const row = view.container.querySelector('[data-qq-msg-row]') as HTMLElement
    const text = row.querySelector('[class*="qqMsgText"]') as HTMLElement
    // fireEvent returns false when the handler prevented the native menu.
    const prevented = fireEvent.contextMenu(text)
    await vi.advanceTimersByTimeAsync(0)
    expect(prevented).toBe(false)
    expect(writeText).toHaveBeenCalledWith('hello bubble')
    expect(document.querySelector('[data-qq-tip]')?.textContent).toContain('已复制消息全文')

    cleanup()
    writeText.mockClear()
    document.body.removeAttribute('data-ds-skin')
    removeQqTipHost()
    const plain = render(<UserMessageNodeView {...userProps()} />)
    const plainBubble = plain.container.querySelector('[class*="bubble"]') as HTMLElement
    const plainPrevented = fireEvent.contextMenu(plainBubble)
    await vi.advanceTimersByTimeAsync(0)
    expect(plainPrevented).toBe(true)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('skin: assistant tail renders the hover row with the reply text', () => {
    document.body.setAttribute('data-ds-skin', 'qq2006')
    render(<TurnTailNodeView {...tailProps()} />)
    const row = document.querySelector('[data-qq-msg-actions]')
    expect(row).not.toBeNull()
    expect(row!.textContent).toContain('复制')
    expect(row!.textContent).toContain('引用')
    expect(row!.textContent).toContain('转发')
  })

  it('skin: right-click on the assistant tail copies the reply text', async () => {
    document.body.setAttribute('data-ds-skin', 'qq2006')
    const writeText = stubClipboard()
    const view = render(<TurnTailNodeView {...tailProps()} />)
    fireEvent.contextMenu(view.container.firstElementChild as HTMLElement)
    await vi.advanceTimersByTimeAsync(0)
    expect(writeText).toHaveBeenCalledWith('assistant reply text')
  })

  it('skin: image-only messages render no QQ row (no text to act on)', () => {
    document.body.setAttribute('data-ds-skin', 'qq2006')
    render(<UserMessageNodeView {...userProps({
      node: {
        key: 'fixture:user:1',
        id: '1',
        target: 'chat',
        kind: 'user',
        anchorSeq: 1,
        location: { kind: 'session' },
        visibility: 'visible',
        data: { content: [{ type: 'image', attachment: { attachmentId: 'a', mediaType: 'image/png', bytes: 1, width: 8, height: 8 } }], time: 1_000, source: null } as never,
      },
    })} />)
    expect(document.querySelector('[data-qq-msg-actions]')).toBeNull()
  })

  it('default skin renders no QQ row on the assistant tail', () => {
    render(<TurnTailNodeView {...tailProps()} />)
    expect(document.querySelector('[data-qq-msg-actions]')).toBeNull()
  })
})
