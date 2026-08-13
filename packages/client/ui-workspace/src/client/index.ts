/**
 * Workspace plugin, browser half. Two registrations: WorkspaceBrowser fills
 * the sidebar shell's `sidebar.workspaces` hole (the whole browsing region),
 * and WorkspacePicker fills the conversation hero's picker hole
 * (`conversation.hero.workspace` — both hero forms). Both read real Host
 * Workspaces through the global useWorkspaces hook, and each declares its
 * own `single` directory-flow child hole for the composed picker package's
 * client half (see the contract module doc). Export discipline:
 * packages/client/AGENTS.md.
 */
import type { HostObservable } from '@deepseek-ai/dsh-client-ui-slots'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// The QQ2006 panel drives optional cross-plugin services (ctx.layout from
// ui-layout, ctx.inputTriggers from ui-input-trigger) through the cordis
// string-keyed `ctx.get` face — no value or type imports, so ui-workspace
// stays dependency-light and absent services degrade to tip-only feedback.
import type { QQPanelActions, WorkspaceBrowserInjected, WorkspacePickerInjected } from './contract/slots.ts'
import { createWorkspaceViewStore } from './stores.ts'
import { WorkspaceBrowser } from './WorkspaceBrowser.tsx'
import { WorkspacePicker } from './WorkspacePicker.tsx'
import { en, zh, type WorkspaceKey } from './locales.ts'

export type {
  DirectoryFlowOwnerProps, DirectoryFlowSlotName, DirectoryPickingHooks, DirectoryPickingInjected,
  QQPanelActions, WorkspaceBrowserInjected, WorkspaceBrowserProps, WorkspacePickerInjected, WorkspacePickerProps,
} from './contract/slots.ts'
export type { WorkspaceKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The workspace browsing region and pick/create flow copy. */
    workspace: WorkspaceKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'workspace'

/**
 * Required services (cordis fiber inject). The target slots are declared by
 * the ui-sidebar / ui-conversation applies, whose activation order relative
 * to this one is NOT constrained: dsh.client.inject edges are informational
 * (loading/prefetch metadata, never apply sequencing) and neither owner
 * provides a waitable service. apply therefore depends on each slot
 * declaration through `slots.inject()` instead of assuming order.
 */
export const inject = ['slots', 'sessions', 'workspaces', 'locale']

/**
 * Register the browser and picker once their slot declarations are on the
 * ledger. Inject factories return plain callbacks; data reads use the
 * framework's global hooks.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-workspace: dictionaries')

  const searchSessions: WorkspaceBrowserInjected['searchSessions'] = async (query, signal) => {
    const result = await ctx.sessions.search(query, signal)
    if (!result.ok) throw new Error(result.error.message)
    return result.value
  }

  // Stable per-surface occupancy sources (the renderer's hook cache keys by
  // source identity): true while the surface's directory-flow hole is filled.
  const flowSource = (hole: 'sidebar.workspaces.directoryFlow' | 'conversation.hero.workspace.directoryFlow'): HostObservable<boolean> => ({
    getSnapshot: () => ctx.slots.entries(hole).length > 0,
    subscribe: listener => ctx.slots.subscribe(hole, listener),
  })
  const browserFlowSource = flowSource('sidebar.workspaces.directoryFlow')
  const pickerFlowSource = flowSource('conversation.hero.workspace.directoryFlow')
  // QQ2006 main-panel verbs bound to official services, read lazily so an
  // absent service (tests, minimal compositions) degrades to tip-only.
  // Structural faces of the optional services (ui-layout / ui-input-trigger):
  // string-keyed ctx.get keeps them dependency-free.
  type LayoutFace = { toggleSidebar(): void; openDetails(): void }
  type InputTriggersFace = {
    sessionOf(actx: object): { toggleSource(source: string, hit: unknown): void }
  }
  const qqPanel = (): QQPanelActions => {
    const layout = ctx.get('layout') as LayoutFace | undefined
    const inputTriggers = ctx.get('inputTriggers') as InputTriggersFace | undefined
    const slashHit = (query: string): unknown => ({
      trigger: '/',
      query,
      position: 'leading',
      span: { start: 0, end: 0, draftRev: 0 },
    })
    return {
      newSession: () => { ctx.workspaces.startSession() },
      toggleSidebar: () => { layout?.toggleSidebar() },
      openDetails: () => { layout?.openDetails() },
      openModelMenu: (sessionId) => {
        const scope = ctx.sessions.scope(sessionId)
        if (scope === undefined || inputTriggers === undefined) return
        inputTriggers.sessionOf(scope).toggleSource('command', slashHit('model'))
      },
      toggleCommandMenu: (sessionId) => {
        const scope = ctx.sessions.scope(sessionId)
        if (scope === undefined || inputTriggers === undefined) return
        inputTriggers.sessionOf(scope).toggleSource('command', slashHit(''))
      },
      openSubagentCatalog: (sessionId) => { ctx.sessions.setSubagentCatalogOpen(sessionId, true) },
      focusComposer: () => {
        // Official composer hook (same `[data-input-scroll]` contract the
        // conversation InputBar exposes): fall back to focusing the textarea.
        document.querySelector<HTMLTextAreaElement>('[data-input-scroll] textarea')?.focus({ preventScroll: true })
      },
      locateLatestToolCall: () => {
        document.querySelector<HTMLElement>(
          '[data-chat-flow] [data-chat-flow-kind="tool-call"]:last-of-type',
        )?.scrollIntoView({ block: 'nearest' })
      },
      toggleNewMessageSound: () => {
        // Shared with ui-conversation's QQ sound module (dsh.qq.sound): flip
        // the same localStorage contract and play the alert when enabled.
        const next = localStorage.getItem('dsh.qq.sound') !== '0'
        const enabled = !next
        try {
          localStorage.setItem('dsh.qq.sound', enabled ? '1' : '0')
        } catch {
          // Private mode: the toggle still applies for this session.
        }
        if (enabled) {
          try {
            void new Audio('/qq2006/sound/msg.mp3').play().catch(() => {})
          } catch {
            // Audio constructor can throw in restricted environments.
          }
        }
        return enabled
      },
    }
  }
  const browserInjected = (): WorkspaceBrowserInjected => ({
    qq: qqPanel(),
    // Explicit group actions keep their target; unscoped New Session inherits
    // the current Session Workspace before the recent-Workspace fallback.
    startSession: (workspaceId) => { ctx.workspaces.startSession(workspaceId) },
    open: (sessionId) => { ctx.sessions.open(sessionId) },
    searchSessions,
    searchResultLimit: ctx.sessions.searchResultLimit,
    renameSession: async (sessionId, title) => {
      // Row → session-face hop: rename is a per-session verb (ISession), not
      // a list-service verb; the binding resolves any listed session.
      const session = ctx.sessions.binding(sessionId)?.session
      if (session === undefined) throw new Error(`unknown session "${sessionId}"`)
      const result = await session.rename(title)
      if (!result.ok) throw new Error(result.error.message)
    },
    forkSession: (sessionId) => {
      ctx.sessions.fork({ sessionId, increaseTitle: true })
        .then((childId) => { ctx.sessions.open(childId) })
        .catch(() => {
          // Fork or child-rename failure keeps the current selection.
        })
    },
    renameWorkspace: async (workspaceId, title) => { await ctx.workspaces.rename(workspaceId, title) },
    deleteWorkspace: async (workspaceId) => { await ctx.workspaces.delete(workspaceId) },
    insertWorkspaceBefore: async (workspaceId, beforeWorkspaceId) => {
      await ctx.workspaces.insertBefore(workspaceId, beforeWorkspaceId)
    },
    archiveSession: async (sessionId) => { await ctx.workspaces.archiveSession(sessionId) },
    insertSessionBefore: async (workspaceId, sessionId, beforeSessionId) => {
      await ctx.workspaces.insertSessionBefore(workspaceId, sessionId, beforeSessionId)
    },
    createWorkspace: input => ctx.workspaces.create(input),
    hooks: { directoryFlow: browserFlowSource },
  })
  const pickerInjected = (): WorkspacePickerInjected => ({
    createWorkspace: input => ctx.workspaces.create(input),
    hooks: { directoryFlow: pickerFlowSource },
  })
  // Each registration declares its directory-flow child in the same call;
  // slot injection follows both the owner and declaration HMR lifetimes.
  ctx.slots.inject('sidebar.workspaces', () => ctx.slots.register(
    {
      name: 'sidebar.workspaces',
      children: { 'sidebar.workspaces.directoryFlow': { kind: 'single', scope: 'root' } },
      store: createWorkspaceViewStore(),
      inject: browserInjected,
      locale: NS,
    },
    WorkspaceBrowser,
  ))
  ctx.slots.inject('conversation.hero.workspace', () => ctx.slots.register(
    {
      name: 'conversation.hero.workspace',
      children: { 'conversation.hero.workspace.directoryFlow': { kind: 'single', scope: 'root' } },
      inject: pickerInjected,
      locale: NS,
    },
    WorkspacePicker,
  ))
}
