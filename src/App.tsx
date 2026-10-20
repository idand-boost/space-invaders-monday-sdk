import { useEffect, useReducer, useState } from 'react'
import { GameView } from './components/GameView'
import { createGame, startGame, togglePause, update } from './game/engine'
import type { Input } from './game/types'
import { recordAlienKilled, startRound } from './monday'

const HI_SCORE_KEY = 'space-invaders:hi-score'

function loadHiScore() {
  const value = Number(localStorage.getItem(HI_SCORE_KEY))
  return Number.isFinite(value) ? value : 0
}

const MOVE_LEFT = new Set(['ArrowLeft', 'KeyA'])
const MOVE_RIGHT = new Set(['ArrowRight', 'KeyD'])
const FIRE = new Set(['Space', 'ArrowUp', 'KeyW'])
const PREVENT_DEFAULT = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])

export default function App() {
  // The game state is a plain mutable object owned by the engine.
  // React only re-renders it once per animation frame.
  const [game] = useState(() => createGame(loadHiScore()))
  const [, renderFrame] = useReducer((n: number) => n + 1, 0)

  useEffect(() => {
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
      if (e.code === 'Enter' && (game.phase === 'title' || game.phase === 'gameOver')) startGame(game)
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

    let savedHiScore = game.hiScore
    let last = performance.now()
    let raf = requestAnimationFrame(function frame(now) {
      update(game, input, (now - last) / 1000)
      input.firePressed = false
      for (const event of game.events.splice(0)) {
        if (event.type === 'gameStarted') startRound()
        else if (event.type === 'alienKilled') void recordAlienKilled()
      }
      last = now
      if (game.hiScore > savedHiScore) {
        savedHiScore = game.hiScore
        localStorage.setItem(HI_SCORE_KEY, String(savedHiScore))
      }
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
  }, [game])

  return (
    <main
      className="app"
      onPointerDown={() => {
        if (game.phase === 'paused') togglePause(game)
      }}
    >
      <GameView state={game} />
      <p className="controls">
        <kbd>←</kbd> <kbd>→</kbd> move · <kbd>Space</kbd> fire · <kbd>P</kbd> pause · <kbd>Enter</kbd> start
      </p>
    </main>
  )
}
