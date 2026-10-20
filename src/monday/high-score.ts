import { globalStorage } from './sdk'

// The high score lives in global storage: one key, shared by every board the app is on.
const KEY = 'highScore'
const MAX_ATTEMPTS = 3

interface Stored {
  score: number
}

function parse(value: string | null): number {
  if (!value) return 0 // never saved yet: not an error
  try {
    const score = (JSON.parse(value) as Stored).score
    return Number.isFinite(score) ? score : 0
  } catch {
    return 0
  }
}

/** The best score on every board, or 0 if nobody has played yet. */
export async function loadHighScore(): Promise<number> {
  try {
    const res = await globalStorage.getItem(KEY)
    return res.data.success ? parse(res.data.value) : 0
  } catch (err) {
    console.warn('[monday] could not read the high score:', err)
    return 0
  }
}

/**
 * Save `score` if it beats the stored high score. Saves with the version from getItem, so if
 * another player saved in between, monday refuses and we read again and decide again.
 * Returns the high score after the attempt, and whether ours is now the best.
 */
export async function submitScore(score: number): Promise<{ isNewBest: boolean; highScore: number }> {
  let best = 0
  try {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const { value, version } = (await globalStorage.getItem(KEY)).data
      best = parse(value)
      if (score <= best) return { isNewBest: false, highScore: best }

      const res = await globalStorage.setItem(
        KEY,
        JSON.stringify({ score } satisfies Stored),
        version ? { previous_version: version } : undefined,
      )
      if (res.data.success) return { isNewBest: true, highScore: score }
      // Someone else saved in between: loop, read their score, and check again.
    }
  } catch (err) {
    console.warn('[monday] could not save the high score:', err)
  }
  return { isNewBest: false, highScore: best }
}
