import { randomAlienName } from './alien-names'
import { mondayRequest } from './client'
import { CREATE_GROUP, CREATE_ITEM } from './queries'

// Board id is not a secret: it is the number in the board URL after /boards/.
// Set it as VITE_MONDAY_BOARD_ID in .env (see README).
const BOARD_ID = (import.meta.env.VITE_MONDAY_BOARD_ID as string | undefined)?.trim()

let warnedAboutBoard = false
let currentGroupId: Promise<string> | null = null

function boardIdOrWarn() {
  if (BOARD_ID) return BOARD_ID
  if (!warnedAboutBoard) {
    warnedAboutBoard = true
    console.warn('[monday] VITE_MONDAY_BOARD_ID is missing in .env, so nothing will be written to monday. See README.')
  }
  return null
}

function roundName(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `Game ${date} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}

/** A new game starts: open a new group on the board, named with the date and time. */
export function startRound() {
  const boardId = boardIdOrWarn()
  if (!boardId) return
  const group = mondayRequest<{ create_group: { id: string } }>(CREATE_GROUP, {
    boardId,
    groupName: roundName(),
  }).then((data) => data.create_group.id)
  currentGroupId = group
  group.catch((err: unknown) => console.warn('[monday] could not create the group:', errorMessage(err)))
}

/** An alien was killed: add an item with a fun name to the current group. */
export async function recordAlienKilled() {
  const boardId = boardIdOrWarn()
  if (!boardId || !currentGroupId) return
  try {
    const groupId = await currentGroupId
    await mondayRequest(CREATE_ITEM, { boardId, groupId, itemName: randomAlienName() })
  } catch (err) {
    // Keep the game running whatever monday says.
    console.warn('[monday] could not create the item:', errorMessage(err))
  }
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : String(err)
}
