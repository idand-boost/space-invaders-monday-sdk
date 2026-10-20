import * as C from './constants'
import type { Alien, AlienType, Bullet, GameState, Input, Rect, Shield } from './types'

// The whole game simulation lives here as plain TypeScript. It mutates a
// GameState in place; React only reads that state to draw it.

const SUBSTEP = 2

const rand = (min: number, max: number) => min + Math.random() * (max - min)

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

export function createGame(hiScore = 0): GameState {
  const state: GameState = {
    events: [],
    phase: 'title',
    phaseTimer: 0,
    time: 0,
    score: 0,
    hiScore,
    lives: C.START_LIVES,
    wave: 0,
    extraLifeAwarded: false,
    shotsFired: 0,
    playerX: 0,
    playerBullets: [],
    fireCooldown: 0,
    alienBullets: [],
    alienFireTimer: 0,
    aliens: [],
    formation: { x: 0, y: 0, dir: 1, stepTimer: 0, frame: 0 },
    shields: [],
    ufo: null,
    ufoTimer: 0,
    explosions: [],
  }
  setupWave(state)
  return state
}

export function startGame(state: GameState) {
  Object.assign(state, createGame(state.hiScore), { phase: 'playing' })
  state.events.push({ type: 'gameStarted' })
}

export function togglePause(state: GameState) {
  if (state.phase === 'playing') state.phase = 'paused'
  else if (state.phase === 'paused') state.phase = 'playing'
}

function alienTypeForRow(row: number): AlienType {
  if (row === 0) return 0
  return row < 3 ? 1 : 2
}

function createShields(): Shield[] {
  const gap = (C.WIDTH - C.SHIELD_COUNT * C.SHIELD_W) / (C.SHIELD_COUNT + 1)
  return Array.from({ length: C.SHIELD_COUNT }, (_, i) => {
    const cells = new Uint8Array(C.SHIELD_W * C.SHIELD_H)
    for (let y = 0; y < C.SHIELD_H; y++) {
      for (let x = 0; x < C.SHIELD_W; x++) {
        const cut = 4 - y
        const roundedTop = y < 4 && (x < cut || x >= C.SHIELD_W - cut)
        const archInset = y === 11 ? 7 : y === 12 ? 6 : 5
        const arch = y >= 11 && x >= archInset && x < C.SHIELD_W - archInset
        cells[y * C.SHIELD_W + x] = roundedTop || arch ? 0 : 1
      }
    }
    return { x: Math.round(gap + i * (C.SHIELD_W + gap)), y: C.SHIELD_Y, cells }
  })
}

function setupWave(state: GameState) {
  state.aliens = []
  for (let row = 0; row < C.ALIEN_ROWS; row++) {
    for (let col = 0; col < C.ALIEN_COLS; col++) {
      state.aliens.push({ row, col, type: alienTypeForRow(row), alive: true })
    }
  }
  state.formation = {
    x: C.FORMATION_START_X,
    y: C.FORMATION_START_Y + Math.min(state.wave, 5) * C.FORMATION_DROP,
    dir: 1,
    stepTimer: 0,
    frame: 0,
  }
  state.shields = createShields()
  state.playerX = Math.round((C.WIDTH - C.PLAYER_W) / 2)
  state.playerBullets = []
  state.alienBullets = []
  state.alienFireTimer = 1.5
  state.ufo = null
  state.ufoTimer = rand(15, 25)
  state.explosions = []
}

export function alienRect(state: GameState, alien: Alien): Rect {
  const w = C.ALIEN_W[alien.type]
  return {
    x: state.formation.x + alien.col * C.ALIEN_CELL_W + Math.floor((C.ALIEN_BOX_W - w) / 2),
    y: state.formation.y + alien.row * C.ALIEN_CELL_H,
    w,
    h: C.ALIEN_H,
  }
}

const playerRect = (state: GameState): Rect => ({ x: state.playerX, y: C.PLAYER_Y, w: C.PLAYER_W, h: C.PLAYER_H })
const playerBulletRect = (b: Bullet): Rect => ({ x: b.x, y: b.y, w: 1, h: C.PLAYER_BULLET_H })
const alienBulletRect = (b: Bullet): Rect => ({ x: b.x - 1, y: b.y, w: C.ALIEN_BULLET_W, h: C.ALIEN_BULLET_H })
const ufoRect = (x: number): Rect => ({ x, y: C.UFO_Y, w: C.UFO_W, h: C.UFO_H })

function addScore(state: GameState, points: number) {
  state.score += points
  state.hiScore = Math.max(state.hiScore, state.score)
  if (!state.extraLifeAwarded && state.score >= C.EXTRA_LIFE_SCORE) {
    state.extraLifeAwarded = true
    state.lives++
  }
}

function explodeShot(state: GameState, x: number, y: number) {
  state.explosions.push({ x: x - 4, y: y - 4, kind: 'shot', ttl: 0.2 })
}

/** Returns the local shield cell range covered by a rect, or null if none. */
function shieldOverlap(shield: Shield, r: Rect) {
  const x0 = Math.max(0, Math.floor(r.x - shield.x))
  const x1 = Math.min(C.SHIELD_W - 1, Math.ceil(r.x + r.w - shield.x) - 1)
  const y0 = Math.max(0, Math.floor(r.y - shield.y))
  const y1 = Math.min(C.SHIELD_H - 1, Math.ceil(r.y + r.h - shield.y) - 1)
  return x0 > x1 || y0 > y1 ? null : { x0, x1, y0, y1 }
}

function erodeShield(shield: Shield, cx: number, cy: number) {
  for (let dy = -3; dy <= 3; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx
      const y = cy + dy
      if (x < 0 || y < 0 || x >= C.SHIELD_W || y >= C.SHIELD_H) continue
      const dist = dx * dx + dy * dy
      if (dist <= 2 || (dist <= 8 && Math.random() < 0.5)) shield.cells[y * C.SHIELD_W + x] = 0
    }
  }
}

/** If the rect touches a solid shield cell, blast a hole there and return true. */
function hitShields(state: GameState, r: Rect): boolean {
  for (const shield of state.shields) {
    const o = shieldOverlap(shield, r)
    if (!o) continue
    for (let y = o.y0; y <= o.y1; y++) {
      for (let x = o.x0; x <= o.x1; x++) {
        if (shield.cells[y * C.SHIELD_W + x]) {
          erodeShield(shield, x, y)
          return true
        }
      }
    }
  }
  return false
}

/** Aliens marching through shields wipe out whatever they overlap. */
function clearShieldsUnder(state: GameState, r: Rect) {
  for (const shield of state.shields) {
    const o = shieldOverlap(shield, r)
    if (!o) continue
    for (let y = o.y0; y <= o.y1; y++) {
      for (let x = o.x0; x <= o.x1; x++) shield.cells[y * C.SHIELD_W + x] = 0
    }
  }
}

function killPlayer(state: GameState) {
  state.phase = 'dying'
  state.phaseTimer = C.DEATH_DURATION
  state.playerBullets = []
  state.lives = Math.max(0, state.lives - 1)
}

function updatePlayer(state: GameState, input: Input, dt: number) {
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0)
  state.playerX = Math.min(C.PLAYER_MAX_X, Math.max(C.PLAYER_MIN_X, state.playerX + dir * C.PLAYER_SPEED * dt))
  state.fireCooldown = Math.max(0, state.fireCooldown - dt)
  if (
    (input.fire || input.firePressed) &&
    state.fireCooldown === 0 &&
    state.playerBullets.length < C.MAX_PLAYER_BULLETS
  ) {
    state.playerBullets.push({ x: Math.round(state.playerX) + 6, y: C.PLAYER_Y - C.PLAYER_BULLET_H })
    state.fireCooldown = C.PLAYER_FIRE_COOLDOWN
    state.shotsFired++
  }
}

function updatePlayerBullets(state: GameState, dt: number) {
  for (const bullet of [...state.playerBullets]) moveBullet(state, bullet, dt)
}

/** Moves one player bullet, and removes it from the state when it hits something. */
function moveBullet(state: GameState, bullet: Bullet, dt: number) {
  const remove = () => {
    state.playerBullets = state.playerBullets.filter((b) => b !== bullet)
  }
  let remaining = C.PLAYER_BULLET_SPEED * dt
  while (remaining > 0) {
    const step = Math.min(SUBSTEP, remaining)
    remaining -= step
    bullet.y -= step
    const r = playerBulletRect(bullet)

    if (bullet.y <= C.HUD_BOTTOM) {
      explodeShot(state, bullet.x, C.HUD_BOTTOM + 2)
      remove()
      return
    }

    for (const alien of state.aliens) {
      if (!alien.alive) continue
      const ar = alienRect(state, alien)
      if (overlaps(r, ar)) {
        alien.alive = false
        state.events.push({ type: 'alienKilled', alienType: alien.type })
        addScore(state, C.ALIEN_POINTS[alien.type])
        state.explosions.push({ x: ar.x + ar.w / 2 - 6.5, y: ar.y, kind: 'alien', ttl: 0.25 })
        remove()
        return
      }
    }

    if (state.ufo && overlaps(r, ufoRect(state.ufo.x))) {
      addScore(state, state.ufo.points)
      state.explosions.push({ x: state.ufo.x, y: C.UFO_Y, kind: 'ufo', ttl: 1.2, label: String(state.ufo.points) })
      state.ufo = null
      state.ufoTimer = rand(20, 30)
      remove()
      return
    }

    if (hitShields(state, r)) {
      explodeShot(state, bullet.x, bullet.y)
      remove()
      return
    }

    const hitIndex = state.alienBullets.findIndex((ab) => overlaps(r, alienBulletRect(ab)))
    if (hitIndex >= 0) {
      explodeShot(state, bullet.x, bullet.y)
      state.alienBullets.splice(hitIndex, 1)
      remove()
      return
    }
  }
}

function stepInterval(aliveCount: number, wave: number) {
  return (0.012 + (0.6 * (aliveCount - 1)) / (C.ALIEN_ROWS * C.ALIEN_COLS - 1)) * Math.pow(0.92, wave)
}

function updateFormation(state: GameState, alive: Alien[], dt: number) {
  const f = state.formation
  f.stepTimer -= dt
  if (f.stepTimer > 0) return
  // Reset rather than accumulate, so the formation never takes more than one step per frame.
  f.stepTimer = stepInterval(alive.length, state.wave)
  f.frame = f.frame === 0 ? 1 : 0

  let minX = Infinity
  let maxX = -Infinity
  for (const alien of alive) {
    const r = alienRect(state, alien)
    minX = Math.min(minX, r.x)
    maxX = Math.max(maxX, r.x + r.w)
  }
  const hitsEdge =
    (f.dir === 1 && maxX + C.FORMATION_STEP_X > C.WIDTH - C.FORMATION_MARGIN) ||
    (f.dir === -1 && minX - C.FORMATION_STEP_X < C.FORMATION_MARGIN)
  if (hitsEdge) {
    f.y += C.FORMATION_DROP
    f.dir = f.dir === 1 ? -1 : 1
  } else {
    f.x += C.FORMATION_STEP_X * f.dir
  }

  for (const alien of alive) clearShieldsUnder(state, alienRect(state, alien))
}

function updateAlienFire(state: GameState, alive: Alien[], dt: number) {
  state.alienFireTimer -= dt
  if (state.alienFireTimer > 0 || state.alienBullets.length >= C.MAX_ALIEN_BULLETS) return
  state.alienFireTimer = rand(0.5, 1.4) * Math.pow(0.9, Math.min(state.wave, 8))

  // Only the bottom-most alien in each column can shoot.
  const shooters = new Map<number, Alien>()
  for (const alien of alive) {
    const current = shooters.get(alien.col)
    if (!current || alien.row > current.row) shooters.set(alien.col, alien)
  }
  const candidates = [...shooters.values()]
  if (candidates.length === 0) return

  const playerCenter = state.playerX + C.PLAYER_W / 2
  let shooter = candidates[Math.floor(Math.random() * candidates.length)]
  if (Math.random() < 0.4) {
    // Sometimes aim: pick the column closest to the player.
    shooter = candidates.reduce((best, a) => {
      const da = Math.abs(alienRect(state, a).x + 6 - playerCenter)
      const db = Math.abs(alienRect(state, best).x + 6 - playerCenter)
      return da < db ? a : best
    })
  }
  const r = alienRect(state, shooter)
  state.alienBullets.push({ x: Math.floor(r.x + r.w / 2), y: r.y + r.h })
}

function updateAlienBullets(state: GameState, dt: number) {
  const speed = C.ALIEN_BULLET_SPEED * (1 + Math.min(state.wave, 6) * 0.08)
  const survivors: Bullet[] = []
  for (const bullet of state.alienBullets) {
    let remaining = speed * dt
    let alive = true
    while (alive && remaining > 0) {
      const step = Math.min(SUBSTEP, remaining)
      remaining -= step
      bullet.y += step
      const r = alienBulletRect(bullet)
      if (bullet.y + C.ALIEN_BULLET_H >= C.GROUND_Y) {
        explodeShot(state, bullet.x, C.GROUND_Y - 6)
        alive = false
      } else if (hitShields(state, r)) {
        explodeShot(state, bullet.x, bullet.y + C.ALIEN_BULLET_H)
        alive = false
      } else if (state.phase === 'playing' && overlaps(r, playerRect(state))) {
        killPlayer(state)
        alive = false
      }
    }
    if (alive) survivors.push(bullet)
  }
  state.alienBullets = survivors
}

function updateUfo(state: GameState, aliveCount: number, dt: number) {
  if (!state.ufo) {
    state.ufoTimer -= dt
    if (state.ufoTimer <= 0 && aliveCount >= 8) {
      const dir = Math.random() < 0.5 ? 1 : -1
      state.ufo = {
        x: dir === 1 ? -C.UFO_W : C.WIDTH,
        dir,
        points: C.UFO_POINTS[state.shotsFired % C.UFO_POINTS.length],
      }
    }
    return
  }
  state.ufo.x += state.ufo.dir * C.UFO_SPEED * dt
  if (state.ufo.x < -C.UFO_W - 1 || state.ufo.x > C.WIDTH + 1) {
    state.ufo = null
    state.ufoTimer = rand(20, 30)
  }
}

function updateExplosions(state: GameState, dt: number) {
  for (const e of state.explosions) e.ttl -= dt
  state.explosions = state.explosions.filter((e) => e.ttl > 0)
}

export function update(state: GameState, input: Input, rawDt: number) {
  // Clamp so a background tab doesn't produce one giant frame.
  const dt = Math.min(rawDt, C.MAX_DT)
  state.time += dt
  if (state.phase === 'paused') return
  updateExplosions(state, dt)

  switch (state.phase) {
    case 'dying':
      state.phaseTimer -= dt
      if (state.phaseTimer <= 0) {
        if (state.lives > 0) {
          state.phase = 'playing'
          state.playerX = Math.round((C.WIDTH - C.PLAYER_W) / 2)
          state.alienBullets = []
        } else {
          state.phase = 'gameOver'
        }
      }
      return
    case 'waveClear':
      state.phaseTimer -= dt
      if (state.phaseTimer <= 0) {
        state.wave++
        setupWave(state)
        state.phase = 'playing'
      }
      return
    case 'playing':
      break
    default:
      return
  }

  updatePlayer(state, input, dt)
  updatePlayerBullets(state, dt)

  const alive = state.aliens.filter((a) => a.alive)
  if (alive.length === 0) {
    state.phase = 'waveClear'
    state.phaseTimer = C.WAVE_CLEAR_DURATION
    state.playerBullets = []
    state.alienBullets = []
    state.ufo = null
    return
  }

  updateFormation(state, alive, dt)
  updateAlienFire(state, alive, dt)
  updateAlienBullets(state, dt)
  updateUfo(state, alive.length, dt)

  // Invasion: aliens reaching the cannon's row ends the game outright.
  if (state.phase === 'playing' && alive.some((a) => alienRect(state, a).y + C.ALIEN_H >= C.PLAYER_Y)) {
    killPlayer(state)
    state.lives = 0
  }
}
