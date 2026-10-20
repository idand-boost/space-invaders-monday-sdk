// monday-sdk-js ships its types as .ts source files, which this project's strict compiler
// settings (verbatimModuleSyntax, erasableSyntaxOnly) refuse to compile. tsconfig.app.json
// points the import here instead, with just the parts the game uses. The code that runs is
// still the real package: Vite ignores this file.

interface MondayResponse<T> {
  data: T
}

interface MondayStorageApi {
  getItem(key: string): Promise<MondayResponse<{ value: string | null; version: string | null; success: boolean }>>
  setItem(
    key: string,
    value: string,
    options?: { previous_version?: string | null },
  ): Promise<MondayResponse<{ success: boolean; version?: string; error?: string }>>
  deleteItem(key: string): Promise<MondayResponse<{ success: boolean }>>
}

export interface MondayClientSdk {
  get(type: 'context' | 'settings' | 'itemIds' | 'sessionToken'): Promise<MondayResponse<unknown>>
  listen(
    type: 'context' | 'settings' | 'events' | 'filter',
    callback: (res: MondayResponse<unknown>) => void,
  ): () => void
  execute(type: string, params?: Record<string, unknown>): Promise<MondayResponse<unknown>>
  set(type: 'settings' | 'location', params: Record<string, unknown>): Promise<MondayResponse<unknown>>
  storage: MondayStorageApi & { instance: MondayStorageApi }
}

export default function mondaySdk(): MondayClientSdk
