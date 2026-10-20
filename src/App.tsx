import { useEffect, useReducer, useState } from 'react'
import { EndScreen, type KilledAlien } from './components/EndScreen'
import { GameView } from './components/GameView'
import { createGame, startGame, togglePause, update } from './game/engine'
import type { Input } from './game/types'
import {
  getContext,
  isInsideMonday,
  loadHighScore,
  onContextChange,
  randomAlienName,
  recordAlienKilled,
  setBoardFromContext,
  showNotice,
  startRound,
  submitScore,
  type AppContext,
  type Round,
} from './monday'

const MOVE_LEFT = new Set(['ArrowLeft', 'KeyA'])
const MOVE_RIGHT = new Set(['ArrowRight', 'KeyD'])
const FIRE = new Set(['Space', 'ArrowUp', 'KeyW'])
const PREVENT_DEFAULT = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

/** What the game knows about monday for the current round. Mutable, like the game state. */
interface Session {
  round: Round | null
  kills: KilledAlien[]
  /** The best score on every board, from global storage. */
  sharedHighScore: number
  /** This round beat the shared high score. */
  newBest: boolean
}

export default function App() {
  // The game state is a plain mutable object owned by the engine.
  // React only re-renders it once per animation frame.
  const [game] = useState(() => createGame(0))
  const [session] = useState<Session>(() => ({ round: null, kills: [], sharedHighScore: 0, newBest: false }))
  const [context, setContext] = useState<AppContext | null>(null)
  const [, renderFrame] = useReducer((n: number) => n + 1, 0)

  // Where are we? Read monday's context once, then follow every change (board, theme...).
  useEffect(() => {
    const apply = (ctx: AppContext) => {
      setContext(ctx)
      setBoardFromContext(ctx)
      document.documentElement.dataset.theme = ctx.theme
    }
    void getContext().then(apply)
    return onContextChange(apply)
  }, [])

  useEffect(() => {
    const showHighScore = (score: number) => {
      session.sharedHighScore = score
      game.hiScore = Math.max(game.hiScore, score)
    }
    void loadHighScore().then(showHighScore)

    const onGameStarted = () => {
      session.round = startRound()
      session.kills = []
      session.newBest = false
      // Someone may have set a new high score on another board since we last looked.
      void loadHighScore().then(showHighScore)
    }

    const onAlienKilled = () => {
      const alien: KilledAlien = { name: randomAlienName(), itemId: null, pending: session.round !== null }
      session.kills.push(alien)
      void recordAlienKilled(session.round, alien.name).then((itemId) => {
        alien.itemId = itemId
        alien.pending = false
      })
    }

    const onGameOver = async () => {
      if (game.score <= 0) return
      const { isNewBest, highScore } = await submitScore(game.score)
      showHighScore(highScore)
      if (isNewBest) {
        session.newBest = true
        showNotice(`New high score: ${highScore}! 👾`, 'success')
      }
    }

    const input: Input = { left: false, right: false, fire: false, firePressed: false }

    const setKey = (code: string, pressed: boolean) => {
      if (MOVE_LEFT.has(code)) input.left = pressed
      if (MOVE_RIGHT.has(code)) input.right = pressed
      if (FIRE.has(code)) input.fire = pressed
    }

    // Keys currently held down. One-shot actions (pause, start, fire) only trigger on the
    // first keydown of a press: some browsers/OSes send auto-repeat keydowns without
    // setting `e.repeat`, which would otherwise toggle pause again while P is held.
    const heldKeys = new Set<string>()

    // Some keyboards/remappers report an empty `code`, so fall back to `key`.
    const keyId = (e: KeyboardEvent) => e.code || e.key
    const isPauseKey = (e: KeyboardEvent) =>
      e.code === 'KeyP' || e.code === 'Escape' || e.key === 'p' || e.key === 'P' || e.key === 'Escape'

    const onKeyDown = (e: KeyboardEvent) => {
      if (PREVENT_DEFAULT.has(e.code)) e.preventDefault()
      setKey(e.code, true)
      if (e.repeat || heldKeys.has(keyId(e))) return
      heldKeys.add(keyId(e))
      if (FIRE.has(e.code)) input.firePressed = true
      if (e.code === 'Enter' && (game.phase === 'title' || game.phase === 'gameOver')) {
        e.preventDefault() // don't also click a focused alien on the end screen
        startGame(game)
      }
      if (isPauseKey(e)) togglePause(game)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      heldKeys.delete(keyId(e))
      setKey(e.code, false)
    }
    // A keyup can be lost while the window is unfocused (app switch, Cmd+P dialog...).
    // Forget held keys whenever focus comes back so a stale entry can't swallow presses.
    const onFocus = () => heldKeys.clear()
    const onBlur = () => {
      heldKeys.clear()
      input.left = input.right = input.fire = input.firePressed = false
      if (game.phase === 'playing') togglePause(game)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    let lastPhase = game.phase
    let last = performance.now()
    let raf = requestAnimationFrame(function frame(now) {
      update(game, input, (now - last) / 1000)
      input.firePressed = false
      for (const event of game.events.splice(0)) {
        if (event.type === 'gameStarted') onGameStarted()
        else if (event.type === 'alienKilled') onAlienKilled()
      }
      if (game.phase === 'gameOver' && lastPhase !== 'gameOver') void onGameOver()
      lastPhase = game.phase
      last = now
      renderFrame()
      raf = requestAnimationFrame(frame)
    })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [game, session])

  return (
    <main
      className="app"
      onPointerDown={() => {
        if (game.phase === 'paused') togglePause(game)
      }}
    >
      <div className="stage">
        <GameView state={game} />
        {game.phase === 'gameOver' && <EndScreen kills={session.kills} newBest={session.newBest} />}
      </div>
      <p className="status">
        High score on every board: <strong>{session.sharedHighScore}</strong>
        {!isInsideMonday && <span className="badge">mock mode: not inside monday</span>}
        {context && !context.boardId && <span className="badge">no board: kills are not saved</span>}
      </p>
      <p className="controls">
        <kbd>←</kbd> <kbd>→</kbd> move · <kbd>Space</kbd> fire · <kbd>P</kbd> pause · <kbd>Enter</kbd> start
      </p>
    </main>
  )
}
