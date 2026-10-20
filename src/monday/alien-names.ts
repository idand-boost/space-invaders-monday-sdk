const FIRST_NAMES = [
  'Grok',
  'Zorp',
  'Blip',
  'Xenu',
  'Glorb',
  'Squee',
  'Vorgon',
  'Zibble',
  'Narf',
  'Plork',
  'Kreel',
  'Moxie',
  'Quib',
  'Throk',
  'Wobbo',
  'Yarg',
  'Fnord',
  'Snarg',
  'Bleep',
  'Zaphod',
]
const EPITHETS = [
  'the Great',
  'the Terrible',
  'the Squishy',
  'the Unlucky',
  'the Brave',
  'the Shiny',
  'the Wobbly',
  'the Magnificent',
  'the Tiny',
  'the Hungry',
  'the Slightly Confused',
  'of Planet Zog',
  'the Third',
  'the Dramatic',
  'the Forgotten',
  'Jr.',
]

const pick = <T>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]

/** A fun name for a fallen alien, like "Grok the Great". */
export function randomAlienName() {
  return `${pick(FIRST_NAMES)} ${pick(EPITHETS)}`
}
