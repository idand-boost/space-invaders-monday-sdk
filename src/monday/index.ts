import { mondayRequest } from './client'
import { CREATE_GROUP, CREATE_ITEM } from './queries'
import { execute } from './sdk'

export { randomAlienName } from './alien-names'
export { loadHighScore, submitScore } from './high-score'
export { getContext, isInsideMonday, onContextChange, type AppContext, type Theme } from './sdk'

// No board id lives in the code: it comes from monday's context (see sdk.ts).
let currentBoardId: string | null = null
let warnedAboutBoard = false

/**
 * Keep the board the game writes to in step with monday's context. Only a board view has a
 * single board: in any other feature (a dashboard widget has several boards) nothing is written.
 */
export function setBoardFromContext(context: { instanceType?: string; boardId?: number | string }) {
  const isBoardView = context.instanceType === undefined || context.instanceType === 'board_view'
  // Ids can arrive as numbers. The API takes them as ID strings.
  currentBoardId = isBoardView && context.boardId ? String(context.boardId) : null
  if (!currentBoardId && !warnedAboutBoard) {
    warnedAboutBoard = true
    console.warn(
      '[monday] no board in the context, so nothing will be written to monday. ' +
        'Outside monday, set VITE_DEV_BOARD_ID in .env (see README).',
    )
  }
}

/** One game on the board: the group it opened, and the board it opened it on. */
export interface Round {
  boardId: string
  groupId: Promise<string>
}

function roundName(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `Game ${date} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

/** A new game starts: open a new group on the current board, named with the date and time. */
export function startRound(): Round | null {
  // Remember the board now: if the context changes mid-game, this round stays on its board.
  const boardId = currentBoardId
  if (!boardId) return null
  const groupId = mondayRequest<{ create_group: { id: string } }>(CREATE_GROUP, {
    boardId,
    groupName: roundName(),
  }).then((data) => data.create_group.id)
  groupId.catch((err: unknown) => console.warn('[monday] could not create the group:', errorMessage(err)))
  return { boardId, groupId }
}

/** An alien was killed: add an item with its name to the round's group. Returns the item id monday gives it. */
export async function recordAlienKilled(round: Round | null, name: string): Promise<string | null> {
  if (!round) return null
  try {
    const groupId = await round.groupId
    const data = await mondayRequest<{ create_item: { id: string } }>(CREATE_ITEM, {
      boardId: round.boardId,
      groupId,
      itemName: name,
    })
    return data.create_item.id
  } catch (err) {
    // Keep the game running whatever monday says.
    console.warn('[monday] could not create the item:', errorMessage(err))
    return null
  }
}

/** Open the alien's item card in monday, like clicking the item on the board. */
export function openItemCard(itemId: string) {
  void execute('openItemCard', { itemId: Number(itemId) })
}

/** A message at the top of monday. */
export function showNotice(message: string, type: 'success' | 'info' | 'error' = 'info') {
  void execute('notice', { message, type, timeout: 5000 })
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}
