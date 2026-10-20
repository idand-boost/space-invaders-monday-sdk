import mondaySdk from 'monday-sdk-js'

// The one place the game talks to the monday page around it (monday-sdk-js).
// The rest of the app calls these small functions, never mondaySdk() directly.
//
// Two worlds:
// - inside monday (the board view iframe): the real SDK.
// - in a plain browser tab (npm run dev): the SDK's promises may never resolve there,
//   so we swap in mocks. The context and storage can be mocked. execute() can't:
//   it changes the monday page itself, so the mock only logs what would have happened.

/** Decided once at startup: an iframe has a parent window, a plain tab doesn't. */
export const isInsideMonday = window.self !== window.top

const monday = isInsideMonday ? mondaySdk() : null

export type Theme = 'light' | 'dark' | 'black'

/** The context fields the game uses. See the monday docs (monday.get) for the full list. */
export interface AppContext {
  instanceType?: string
  /** Only board views and item views have a single board. A dashboard widget has boardIds only. */
  boardId?: number | string
  theme: Theme
  user?: { id: number | string; isViewOnly?: boolean }
}

// The test board id is for local development only. It is read here, in the mock, and never
// decides where the game writes inside monday.
const DEV_BOARD_ID = (import.meta.env.VITE_DEV_BOARD_ID as string | undefined)?.trim()

const MOCK_CONTEXT: AppContext = {
  instanceType: 'board_view',
  boardId: DEV_BOARD_ID || undefined,
  theme: window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
  user: { id: 'mock-user', isViewOnly: false },
}

export async function getContext(): Promise<AppContext> {
  if (monday) return (await monday.get('context')).data as AppContext
  return MOCK_CONTEXT
}

/** Calls back on every context change (theme, view mode...). Returns a function that stops listening. */
export function onContextChange(callback: (context: AppContext) => void): () => void {
  if (monday) return monday.listen('context', (res) => callback(res.data as AppContext))
  callback(MOCK_CONTEXT)
  return () => {}
}

// ---------------------------------------------------------------------------------------------
// Storage. Global storage (monday.storage) is shared by the whole app in the account, on every
// board. Values are strings. Every read and write returns a version, which changes when the
// value changes: pass the version you read to setItem so you never overwrite someone else.

export interface Storage {
  getItem(key: string): Promise<{ data: { value: string | null; version: string | null; success: boolean } }>
  setItem(
    key: string,
    value: string,
    options?: { previous_version?: string | null },
  ): Promise<{ data: { success: boolean; version?: string; error?: string } }>
}

// Same keys and same return shape as monday.storage, kept in localStorage.
function localStore(prefix: string): Storage {
  const read = (key: string) => {
    try {
      const raw = localStorage.getItem(prefix + key)
      return raw ? (JSON.parse(raw) as { value: string; version: string }) : null
    } catch {
      return null
    }
  }
  return {
    async getItem(key) {
      const stored = read(key)
      return { data: { value: stored?.value ?? null, version: stored?.version ?? null, success: true } }
    },
    async setItem(key, value, options) {
      const current = read(key)?.version ?? null
      if (options?.previous_version !== undefined && options.previous_version !== current) {
        return {
          data: { success: false, error: `Version mismatch: key ${key} was updated from another context` },
        }
      }
      const version = crypto.randomUUID().slice(0, 5)
      localStorage.setItem(prefix + key, JSON.stringify({ value, version }))
      return { data: { success: true, version } }
    },
  }
}

export const globalStorage: Storage = monday ? monday.storage : localStore('space-invaders:mock-global:')

// ---------------------------------------------------------------------------------------------
// execute: make monday do something (open an item card, show a notice). Can't be mocked.

type ExecuteParams = {
  openItemCard: { itemId: number; kind?: 'columns' | 'updates' }
  notice: { message: string; type?: 'success' | 'error' | 'info'; timeout?: number }
}

export async function execute<T extends keyof ExecuteParams>(type: T, params: ExecuteParams[T]) {
  if (monday) {
    return monday.execute(type, params)
  }
  console.info(`[monday mock] execute("${type}") only works inside monday. It would have run with:`, params)
}
