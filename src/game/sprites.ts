type Bitmap = readonly string[]

/** Converts a '#'-pixel bitmap into a single SVG path made of horizontal runs. */
function bitmapToPath(rows: Bitmap): string {
  let d = ''
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (row[x] !== '#') {
        x++
        continue
      }
      const start = x
      while (x < row.length && row[x] === '#') x++
      d += `M${start} ${y}h${x - start}v1h${start - x}z`
    }
  })
  return d
}

/** Same as bitmapToPath, for a flat 0/1 cell array (used by shields). */
export function cellsToPath(cells: Uint8Array, width: number, height: number): string {
  let d = ''
  for (let y = 0; y < height; y++) {
    let x = 0
    while (x < width) {
      if (!cells[y * width + x]) {
        x++
        continue
      }
      const start = x
      while (x < width && cells[y * width + x]) x++
      d += `M${start} ${y}h${x - start}v1h${start - x}z`
    }
  }
  return d
}

const SQUID: [Bitmap, Bitmap] = [
  ['...##...', '..####..', '.######.', '##.##.##', '########', '..#..#..', '.#.##.#.', '#.#..#.#'],
  ['...##...', '..####..', '.######.', '##.##.##', '########', '.#.##.#.', '#......#', '.#....#.'],
]

const CRAB: [Bitmap, Bitmap] = [
  [
    '..#.....#..',
    '...#...#...',
    '..#######..',
    '.##.###.##.',
    '###########',
    '#.#######.#',
    '#.#.....#.#',
    '...##.##...',
  ],
  [
    '..#.....#..',
    '#..#...#..#',
    '#.#######.#',
    '###.###.###',
    '###########',
    '.#########.',
    '..#.....#..',
    '.#.......#.',
  ],
]

const OCTOPUS: [Bitmap, Bitmap] = [
  [
    '....####....',
    '.##########.',
    '############',
    '###..##..###',
    '############',
    '...##..##...',
    '..##.##.##..',
    '##........##',
  ],
  [
    '....####....',
    '.##########.',
    '############',
    '###..##..###',
    '############',
    '..###..###..',
    '.##..##..##.',
    '..##....##..',
  ],
]

const PLAYER: Bitmap = [
  '......#......',
  '.....###.....',
  '.....###.....',
  '.###########.',
  '#############',
  '#############',
  '#############',
  '#############',
]

const PLAYER_EXPLOSION: [Bitmap, Bitmap] = [
  [
    '.....#.......',
    '.......#..#..',
    '....#.#......',
    '..#.......#..',
    '......#.##...',
    '.#..#######..',
    '..##########.',
    '.############',
  ],
  [
    '.......#.....',
    '..#.......#..',
    '.......#.....',
    '.....#...#...',
    '#...##.#.##..',
    '..#########.#',
    '.###########.',
    '#############',
  ],
]

const UFO: Bitmap = [
  '.....######.....',
  '...##########...',
  '..############..',
  '.##.##.##.##.##.',
  '################',
  '..###..##..###..',
  '...#........#...',
]

const ALIEN_EXPLOSION: Bitmap = [
  '....#...#....',
  '.#...#.#...#.',
  '..#.......#..',
  '...#.....#...',
  '##.........##',
  '...#.....#...',
  '..#..#.#..#..',
  '.#..#...#..#.',
]

const SHOT_EXPLOSION: Bitmap = [
  '#..#..#.',
  '..#...#.',
  '.######.',
  '########',
  '.######.',
  '..#..#..',
  '.#..#..#',
  '#..#....',
]

const ALIEN_BULLET: [Bitmap, Bitmap] = [
  ['.#.', '#..', '.#.', '..#', '.#.', '#..', '.#.'],
  ['.#.', '..#', '.#.', '#..', '.#.', '..#', '.#.'],
]

const pair = (frames: [Bitmap, Bitmap]): [string, string] => [bitmapToPath(frames[0]), bitmapToPath(frames[1])]

export const SPRITES = {
  aliens: [pair(SQUID), pair(CRAB), pair(OCTOPUS)] as const,
  player: bitmapToPath(PLAYER),
  playerExplosion: pair(PLAYER_EXPLOSION),
  ufo: bitmapToPath(UFO),
  alienExplosion: bitmapToPath(ALIEN_EXPLOSION),
  shotExplosion: bitmapToPath(SHOT_EXPLOSION),
  alienBullet: pair(ALIEN_BULLET),
}
