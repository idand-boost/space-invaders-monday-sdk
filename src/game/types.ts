export type Phase = 'title' | 'playing' | 'paused' | 'dying' | 'waveClear' | 'gameOver'

/** 0 = squid (30 pts), 1 = crab (20 pts), 2 = octopus (10 pts). */
export type AlienType = 0 | 1 | 2

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Alien {
  row: number
  col: number
  type: AlienType
  alive: boolean
}

export interface Formation {
  x: number
  y: number
  dir: 1 | -1
  stepTimer: number
  frame: 0 | 1
}

/** Bullets are positioned by their center column `x` and top edge `y`. */
export interface Bullet {
  x: number
  y: number
}

export interface Shield {
  x: number
  y: number
  cells: Uint8Array
}

export interface Ufo {
  x: number
  dir: 1 | -1
  points: number
}

export type ExplosionKind = 'alien' | 'shot' | 'ufo'

export interface Explosion {
  x: number
  y: number
  kind: ExplosionKind
  ttl: number
  label?: string
}

export interface Input {
  left: boolean
  right: boolean
  fire: boolean
  /** Latched on keydown so a tap shorter than one frame still fires. */
  firePressed: boolean
}

/** Things that happened this frame, for code outside the engine (like monday) to react to. */
export type GameEvent = { type: 'gameStarted' } | { type: 'alienKilled'; alienType: AlienType }

export interface GameState {
  events: GameEvent[]
  phase: Phase
  phaseTimer: number
  time: number
  score: number
  hiScore: number
  lives: number
  wave: number
  extraLifeAwarded: boolean
  shotsFired: number
  playerX: number
  playerBullets: Bullet[]
  fireCooldown: number
  alienBullets: Bullet[]
  alienFireTimer: number
  aliens: Alien[]
  formation: Formation
  shields: Shield[]
  ufo: Ufo | null
  ufoTimer: number
  explosions: Explosion[]
}
