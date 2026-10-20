// Logical screen size (the original arcade resolution, rotated).
export const WIDTH = 224
export const HEIGHT = 256

export const HUD_BOTTOM = 26
export const GROUND_Y = 236

export const PLAYER_Y = 216
export const PLAYER_W = 13
export const PLAYER_H = 8
export const PLAYER_SPEED = 110
export const PLAYER_MIN_X = 8
export const PLAYER_MAX_X = WIDTH - 8 - PLAYER_W
export const START_LIVES = 3
export const EXTRA_LIFE_SCORE = 1500

export const PLAYER_BULLET_SPEED = 340
export const MAX_PLAYER_BULLETS = 4
export const PLAYER_FIRE_COOLDOWN = 0.12
export const PLAYER_BULLET_H = 4
export const ALIEN_BULLET_SPEED = 90
export const ALIEN_BULLET_W = 3
export const ALIEN_BULLET_H = 7
export const MAX_ALIEN_BULLETS = 3

export const ALIEN_COLS = 12
export const ALIEN_ROWS = 6
export const ALIEN_CELL_W = 16
export const ALIEN_CELL_H = 16
export const ALIEN_BOX_W = 12
export const ALIEN_H = 8
// Index by alien type: 0 = squid, 1 = crab, 2 = octopus.
export const ALIEN_W = [8, 11, 12] as const
export const ALIEN_POINTS = [30, 20, 10] as const
export const FORMATION_START_X = 14
export const FORMATION_START_Y = 56
export const FORMATION_STEP_X = 2
export const FORMATION_DROP = 8
export const FORMATION_MARGIN = 6

export const SHIELD_COUNT = 4
export const SHIELD_W = 22
export const SHIELD_H = 16
export const SHIELD_Y = 184

export const UFO_Y = 36
export const UFO_W = 16
export const UFO_H = 7
export const UFO_SPEED = 45
// The arcade picks the mystery score from a table indexed by shots fired.
export const UFO_POINTS = [100, 50, 50, 100, 150, 100, 100, 50, 300, 100, 100, 100, 50, 150, 100] as const

export const DEATH_DURATION = 2
export const WAVE_CLEAR_DURATION = 2
export const MAX_DT = 0.05
