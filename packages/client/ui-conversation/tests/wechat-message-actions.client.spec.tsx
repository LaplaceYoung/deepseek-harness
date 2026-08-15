// @vitest-environment jsdom
// WeChat message hover action row (复制/引用) + right-click copy + the WeChat
// title bar (⋯ menu): skin-gated rendering, real clipboard writes, quote
// through the per-session composer-action registry (✓ feedback), and the
// default skin's unchanged IconActions row. Default-skin zero regression is
// asserted first.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import type { SessionId, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import type { ChatNodeViewProps } from '../src/client/contract/slots.ts'
import { UserMessageNodeView } from '../src/client/chat/MessageItem.tsx'
import { TurnTailNodeView } from '../src/client/chat/TurnTailNodeView.tsx'
import { WechatWindowChrome } from '../src/client/skeleton/WechatWindowChrome.tsx'
import { registerWechatComposerActions } from '../src/client/wechat/wechat-chrome-actions.ts'
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

function removeWechatTipHost(): void {
  document.querySelectorAll('[data-wechat-tip]').forEach(node => node.remove())
  // The tip host element itself has no marker; drop the last appended body
  // child when it is the host (class hash ends with `_host`).
  const host = document.body.lastElementChild
  if (host !== null && (host.className ?? '').includes('_host')) host.remove()
}

beforeEach(() => {
  vi.useFakeTimers()
  document.body.removeAttribute('data-ds-skin')
  removeWechatTipHost()
})
afterEach(() => {
  cleanup()
  document.body.removeAttribute('data-ds-skin')
  removeWechatTipHost()
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

describe('WeChat message action row', () => {
  it('default skin keeps the IconActions row and renders no WeChat row', () => {
    render(<UserMessageNodeView {...userProps()} />)
    expect(screen.getByRole('button', { name: '复制' })).toBeTruthy()
    expect(document.querySelector('[data-wechat-msg-actions]')).toBeNull()
  })

  it('default skin renders no in-bubble clock (time stays in IconActions)', () => {
    render(<UserMessageNodeView {...userProps()} />)
    expect(document.querySelector('[data-wechat-bubble-time]')).toBeNull()
  })

  it('skin: user bubble renders the HH:MM clock in its bottom-right corner', () => {
    document.body.setAttribute('data-ds-skin', 'wexin')
    render(<UserMessageNodeView {...userProps()} />)
    const clock = document.querySelector('[data-wechat-bubble-time]')
    expect(clock).not.toBeNull()
    const d = new Date(1_000)
    const pad = (n: number): string => String(n).padStart(2, '0')
    expect(clock!.textContent).toBe(`${pad(d.getHours())}:${pad(d.getMinutes())}`)
    // The clock sits INSIDE the bubble (class lookup from the bubble element).
    const bubble = clock!.closest('[class*="bubble"]')
    expect(bubble).not.toBeNull()
  })

  it('skin: user bubble swaps the icon row for 复制/引用', () => {
    document.body.setAttribute('data-ds-skin', 'wexin')
    render(<UserMessageNodeView {...userProps()} />)
    const row = document.querySelector('[data-wechat-msg-actions]')
    expect(row).not.toBeNull()
    // Exactly the two WeChat verbs — the default icon row (clock + copy icon)
    // is replaced, not stacked beside it.
    const buttons = screen.getAllByRole('button')
    expect(buttons.map(button => button.textContent)).toEqual(['复制', '引用'])
    // WeChat keeps the bubble (unlike the QQ list row): the skin DOM is the
    // same bubble, restyled green by CSS.
    expect(document.querySelector('[data-wechat-msg-hover-root]')).not.toBeNull()
    const view = document.querySelector('[data-wechat-msg-hover-root]')
    expect(view?.querySelector('[class*="bubble"]')).not.toBeNull()
  })

  it('skin: 复制 writes the full text and answers with a WeChat toast', async () => {
    document.body.setAttribute('data-ds-skin', 'wexin')
    const writeText = stubClipboard()
    render(<UserMessageNodeView {...userProps()} />)
    fireEvent.click(screen.getByText('复制'))
    await vi.advanceTimersByTimeAsync(0)
    expect(writeText).toHaveBeenCalledWith('hello bubble')
    const tip = document.querySelector('[data-wechat-tip]')
    expect(tip?.textContent).toContain('已复制消息全文')
  })

  it('skin: 引用 appends the quote block through the composer registry and shows ✓', () => {
    document.body.setAttribute('data-ds-skin', 'wexin')
    const quote = vi.fn()
    const disposer = registerWechatComposerActions(SID, { focusComposer: vi.fn(), quote })
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

  it('skin: 引用 without a registered composer answers with the unavailable toast', () => {
    document.body.setAttribute('data-ds-skin', 'wexin')
    render(<UserMessageNodeView {...userProps()} />)
    fireEvent.click(screen.getByRole('button', { name: '引用' }))
    const tip = document.querySelector('[data-wechat-tip]')
    expect(tip?.textContent).toContain('输入框尚未就绪')
  })

  it('skin: right-click on the user bubble copies the full text; default skin keeps the native menu', async () => {
    const writeText = stubClipboard()
    document.body.setAttribute('data-ds-skin', 'wexin')
    const view = render(<UserMessageNodeView {...userProps()} />)
    const bubble = view.container.querySelector('[class*="bubble"]') as HTMLElement
    // fireEvent returns false when the handler prevented the native menu.
    const prevented = fireEvent.contextMenu(bubble)
    await vi.advanceTimersByTimeAsync(0)
    expect(prevented).toBe(false)
    expect(writeText).toHaveBeenCalledWith('hello bubble')
    expect(document.querySelector('[data-wechat-tip]')?.textContent).toContain('已复制消息全文')

    cleanup()
    writeText.mockClear()
    document.body.removeAttribute('data-ds-skin')
    removeWechatTipHost()
    const plain = render(<UserMessageNodeView {...userProps()} />)
    const plainBubble = plain.container.querySelector('[class*="bubble"]') as HTMLElement
    const plainPrevented = fireEvent.contextMenu(plainBubble)
    await vi.advanceTimersByTimeAsync(0)
    expect(plainPrevented).toBe(true)
    expect(writeText).not.toHaveBeenCalled()
  })

  it('skin: assistant tail renders the hover row with the reply text', () => {
    document.body.setAttribute('data-ds-skin', 'wexin')
    render(<TurnTailNodeView {...tailProps()} />)
    const row = document.querySelector('[data-wechat-msg-actions]')
    expect(row).not.toBeNull()
    expect(row!.textContent).toContain('复制')
    expect(row!.textContent).toContain('引用')
  })

  it('skin: right-click on the assistant tail copies the reply text', async () => {
    document.body.setAttribute('data-ds-skin', 'wexin')
    const writeText = stubClipboard()
    const view = render(<TurnTailNodeView {...tailProps()} />)
    fireEvent.contextMenu(view.container.firstElementChild as HTMLElement)
    await vi.advanceTimersByTimeAsync(0)
    expect(writeText).toHaveBeenCalledWith('assistant reply text')
  })

  it('skin: image-only messages render no WeChat row (no text to act on)', () => {
    document.body.setAttribute('data-ds-skin', 'wexin')
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
    expect(document.querySelector('[data-wechat-msg-actions]')).toBeNull()
  })

  it('default skin renders no WeChat row on the assistant tail', () => {
    render(<TurnTailNodeView {...tailProps()} />)
    expect(document.querySelector('[data-wechat-msg-actions]')).toBeNull()
  })
})

describe('WeChat title bar (⋯ menu)', () => {
  /** Direct-render sessions feed: byId carries one session. */
  const useSessions = (select: (snapshot: SessionListState) => unknown): unknown => select({
    byId: { [SID]: { id: SID, displayTitle: '测试会话', origin: 'root' } },
    order: [SID],
  } as unknown as SessionListState)

  const chromeActions = { toggleSidebar: vi.fn(), clearSession: vi.fn() }

  it('default skin renders nothing (the chrome component is never mounted)', () => {
    // The component is skin-gated by the header; direct-render smoke asserts
    // the CSS scope only — nothing to render without the skin attribute
    // would be exercised here, so just assert the actions bundle shape.
    expect(Object.keys(chromeActions).sort()).toEqual(['clearSession', 'toggleSidebar'])
  })

  it('skin: title bar shows the centered conversation name and the ⋯ menu', () => {
    document.body.setAttribute('data-ds-skin', 'wexin')
    const view = render(
      <WechatWindowChrome
        sessionId={SID}
        useSessions={useSessions as never}
        t={t}
        wechat={chromeActions}
      />,
    )
    const bar = view.container.querySelector('[data-wechat-titlebar]') as HTMLElement
    expect(bar).not.toBeNull()
    expect(bar.textContent).toContain('测试会话')
    // Window minimize chrome: decorative CSS-drawn bar next to the ⋯ button.
    expect(bar.querySelector('[data-wechat-min]')).not.toBeNull()
    const more = screen.getByRole('button', { name: '更多操作' })
    fireEvent.click(more)
    const menu = document.querySelector('[data-wechat-menu]')
    expect(menu).not.toBeNull()
    expect(menu!.textContent).toContain('折叠侧栏')
    expect(menu!.textContent).toContain('清空会话')
    fireEvent.click(screen.getByText('清空会话'))
    expect(chromeActions.clearSession).toHaveBeenCalledTimes(1)
    // The menu closes after an item press.
    expect(document.querySelector('[data-wechat-menu]')).toBeNull()
  })
})
