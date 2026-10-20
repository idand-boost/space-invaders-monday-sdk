import { SeamlessApiClient } from '@mondaydotcomorg/api'
import { DEV_ENDPOINT } from './queries'

// One function, two worlds:
// - inside monday (the board view iframe): SeamlessApiClient asks monday to make
//   the call, using the app's scopes. No token involved.
// - in a plain browser tab (npm run dev): POST the query to the dev-only endpoint in
//   the Vite dev server. The server adds the token, so it never reaches the browser.

type Variables = Record<string, unknown>

const insideMonday = window.self !== window.top
const seamless = insideMonday ? new SeamlessApiClient() : null

export async function mondayRequest<T>(query: string, variables: Variables): Promise<T> {
  if (seamless) return unwrapData<T>(await seamless.request<unknown>(query, variables))

  // The endpoint is dev-only. In a production build this branch is removed, so a plain
  // tab outside monday has no way to reach monday at all.
  if (!import.meta.env.DEV) throw new Error('monday is only available inside monday or in npm run dev')

  const res = await fetch(DEV_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const body = (await res.json().catch(() => null)) as { data?: T; error?: string } | null
  if (!res.ok || !body || body.data === undefined) {
    throw new Error(body?.error ?? `monday dev endpoint answered ${res.status}`)
  }
  return body.data
}

// Inside monday the response comes back wrapped as { data: { ...fields } } (sometimes with extra
// message fields like requestId). Peel the wrapper so both worlds return just { create_group: ... }.
function unwrapData<T>(response: unknown): T {
  let current = response
  while (typeof current === 'object' && current !== null && 'data' in current && typeof current.data === 'object') {
    current = current.data
  }
  return current as T
}
