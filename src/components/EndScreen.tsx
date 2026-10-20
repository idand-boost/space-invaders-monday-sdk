import { openItemCard } from '../monday'

/** An alien killed this round. `itemId` is the id monday returned for its item, once it arrives. */
export interface KilledAlien {
  name: string
  itemId: string | null
  /** The item is still being created on the board. */
  pending: boolean
}

/** Shown over the game when it ends: every alien killed this round. Click one to open its item card. */
export function EndScreen({ kills, newBest }: { kills: KilledAlien[]; newBest: boolean }) {
  return (
    <section className="end-screen" aria-label="Aliens killed this round">
      {newBest && <p className="end-screen__best">NEW HIGH SCORE!</p>}
      <h2 className="end-screen__title">ALIENS KILLED THIS ROUND: {kills.length}</h2>
      {kills.length > 0 && (
        <ol className="end-screen__list">
          {kills.map((alien, i) => (
            <li key={i}>
              <button
                type="button"
                disabled={!alien.itemId}
                title={
                  alien.itemId ? 'Open its item card' : alien.pending ? 'Saving to the board...' : 'Not on the board'
                }
                onClick={(e) => {
                  if (alien.itemId) openItemCard(alien.itemId)
                  e.currentTarget.blur() // keep Enter for "play again"
                }}
              >
                {alien.name}
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
