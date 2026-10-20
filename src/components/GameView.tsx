import type { ReactNode } from 'react'
import * as C from '../game/constants'
import { alienRect } from '../game/engine'
import { cellsToPath, SPRITES } from '../game/sprites'
import type { GameState, Shield } from '../game/types'

const WHITE = '#f4f4f4'
const GREEN = '#33ff66'
const RED = '#ff3355'

interface SpriteProps {
  d: string
  x: number
  y: number
  fill: string
}

function Sprite({ d, x, y, fill }: SpriteProps) {
  return <path d={d} transform={`translate(${Math.round(x)} ${Math.round(y)})`} fill={fill} />
}

function ShieldView({ shield }: { shield: Shield }) {
  return <Sprite d={cellsToPath(shield.cells, C.SHIELD_W, C.SHIELD_H)} x={shield.x} y={shield.y} fill={GREEN} />
}

function Text({
  x,
  y,
  children,
  fill = WHITE,
  anchor = 'start',
}: {
  x: number
  y: number
  children: ReactNode
  fill?: string
  anchor?: 'start' | 'middle' | 'end'
}) {
  return (
    <text x={x} y={y} fill={fill} textAnchor={anchor} className="pixel-text">
      {children}
    </text>
  )
}

const pad = (n: number) => String(n).padStart(4, '0')

function Hud({ state }: { state: GameState }) {
  return (
    <g>
      <Text x={12} y={10}>
        SCORE
      </Text>
      <Text x={12} y={20}>
        {pad(state.score)}
      </Text>
      <Text x={C.WIDTH / 2} y={10} anchor="middle">
        HI-SCORE
      </Text>
      <Text x={C.WIDTH / 2} y={20} anchor="middle">
        {pad(state.hiScore)}
      </Text>
      <Text x={C.WIDTH - 12} y={10} anchor="end">
        WAVE
      </Text>
      <Text x={C.WIDTH - 12} y={20} anchor="end">
        {state.wave + 1}
      </Text>
    </g>
  )
}

function Footer({ state }: { state: GameState }) {
  return (
    <g>
      <rect x={0} y={C.GROUND_Y} width={C.WIDTH} height={1} fill={GREEN} />
      <Text x={10} y={C.GROUND_Y + 13}>
        {state.lives}
      </Text>
      {Array.from({ length: Math.max(0, state.lives - 1) }, (_, i) => (
        <Sprite key={i} d={SPRITES.player} x={24 + i * 16} y={C.GROUND_Y + 6} fill={GREEN} />
      ))}
    </g>
  )
}

const blink = (state: GameState) => Math.floor(state.time * 2) % 2 === 0

function TitleScreen({ state }: { state: GameState }) {
  const rows: { d: string; label: string; fill: string; w: number }[] = [
    { d: SPRITES.ufo, label: '= ? MYSTERY', fill: RED, w: C.UFO_W },
    { d: SPRITES.aliens[0][0], label: '= 30 POINTS', fill: WHITE, w: C.ALIEN_W[0] },
    { d: SPRITES.aliens[1][0], label: '= 20 POINTS', fill: WHITE, w: C.ALIEN_W[1] },
    { d: SPRITES.aliens[2][1], label: '= 10 POINTS', fill: WHITE, w: C.ALIEN_W[2] },
  ]
  return (
    <g>
      <Text x={C.WIDTH / 2} y={70} anchor="middle">
        PLAY
      </Text>
      <Text x={C.WIDTH / 2} y={90} anchor="middle" fill={GREEN}>
        SPACE INVADERS
      </Text>
      <Text x={C.WIDTH / 2} y={118} anchor="middle">
        *SCORE ADVANCE TABLE*
      </Text>
      {rows.map((row, i) => (
        <g key={i}>
          <Sprite d={row.d} x={72 - row.w / 2} y={128 + i * 16} fill={row.fill} />
          <Text x={86} y={135 + i * 16}>
            {row.label}
          </Text>
        </g>
      ))}
      {blink(state) && (
        <Text x={C.WIDTH / 2} y={210} anchor="middle">
          PRESS ENTER TO START
        </Text>
      )}
    </g>
  )
}

function Banner({ title, subtitle, state }: { title: string; subtitle?: string; state: GameState }) {
  return (
    <g>
      <rect
        x={40}
        y={100}
        width={C.WIDTH - 80}
        height={subtitle ? 40 : 26}
        fill="#000"
        stroke={GREEN}
        strokeWidth={1}
      />
      <Text x={C.WIDTH / 2} y={116} anchor="middle" fill={RED}>
        {title}
      </Text>
      {subtitle && blink(state) && (
        <Text x={C.WIDTH / 2} y={131} anchor="middle">
          {subtitle}
        </Text>
      )}
    </g>
  )
}

export function GameView({ state }: { state: GameState }) {
  const { formation, phase } = state
  const showPlay = phase !== 'title'
  const playerVisible = phase === 'playing' || phase === 'paused' || phase === 'waveClear'
  const explosionFrame = Math.floor(state.time * 10) % 2

  return (
    <svg
      className="screen"
      viewBox={`0 0 ${C.WIDTH} ${C.HEIGHT}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label="Space Invaders"
    >
      <rect width={C.WIDTH} height={C.HEIGHT} fill="#000" />
      <Hud state={state} />

      {phase === 'title' && <TitleScreen state={state} />}

      {showPlay && (
        <g>
          {state.aliens.map((alien) => {
            if (!alien.alive) return null
            const r = alienRect(state, alien)
            return (
              <Sprite
                key={alien.row * C.ALIEN_COLS + alien.col}
                d={SPRITES.aliens[alien.type][formation.frame]}
                x={r.x}
                y={r.y}
                fill={WHITE}
              />
            )
          })}

          {state.ufo && <Sprite d={SPRITES.ufo} x={state.ufo.x} y={C.UFO_Y} fill={RED} />}

          {state.shields.map((shield, i) => (
            <ShieldView key={i} shield={shield} />
          ))}

          {playerVisible && <Sprite d={SPRITES.player} x={state.playerX} y={C.PLAYER_Y} fill={GREEN} />}
          {phase === 'dying' && (
            <Sprite d={SPRITES.playerExplosion[explosionFrame]} x={state.playerX} y={C.PLAYER_Y} fill={GREEN} />
          )}

          {state.playerBullets.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={1} height={C.PLAYER_BULLET_H} fill={WHITE} />
          ))}
          {state.alienBullets.map((b, i) => (
            <Sprite key={i} d={SPRITES.alienBullet[(Math.floor(b.y / 4) + i) % 2]} x={b.x - 1} y={b.y} fill={WHITE} />
          ))}

          {state.explosions.map((e, i) => {
            if (e.kind === 'alien') return <Sprite key={i} d={SPRITES.alienExplosion} x={e.x} y={e.y} fill={WHITE} />
            if (e.kind === 'shot') {
              const fill = e.y > C.SHIELD_Y - 8 ? GREEN : WHITE
              return <Sprite key={i} d={SPRITES.shotExplosion} x={e.x} y={e.y} fill={fill} />
            }
            return (
              <Text key={i} x={e.x + C.UFO_W / 2} y={e.y + 7} anchor="middle" fill={RED}>
                {e.label}
              </Text>
            )
          })}
        </g>
      )}

      <Footer state={state} />

      {phase === 'paused' && <Banner title="PAUSED" subtitle="P OR CLICK TO RESUME" state={state} />}
      {phase === 'waveClear' && <Banner title={`WAVE ${state.wave + 1} CLEAR`} state={state} />}
      {phase === 'gameOver' && <Banner title="GAME OVER" subtitle="PRESS ENTER" state={state} />}
    </svg>
  )
}
