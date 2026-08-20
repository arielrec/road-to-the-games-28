import data from '../data/oddoneout.json'
import { makeRng, sample, shuffle, randInt } from '../lib/seed'

const REAL = data.real
const DECOYS = data.decoys
/**
 * "Rare" = dropped from the programme, or contested at six Games or fewer.
 * 25 of the 54 qualify. Drawing the true options from here is what makes the question
 * hard: next to Athletics and Swimming, any decoy is obvious, but next to Roque,
 * Jeu de Paume and Basque Pelota it is a real question.
 */
const RARE = REAL.filter((r) => r.discontinued || r.games <= 6)
const COMMON = REAL.filter((r) => !(r.discontinued || r.games <= 6))

/**
 * Three real Olympic sports + one that never was.
 *
 * The real options come from medals.json, so a "true" answer can never be wrong.
 * Difficulty rises by shifting the real options from famous current sports toward
 * obscure discontinued ones — "Roque" next to "Kabaddi" is genuinely hard.
 */
export function makeQuestion(seed, streak = 0) {
  const rng = makeRng(seed)

  // Two rare sports from the start, all three once the streak builds. A single common
  // sport early on gives a foothold without giving the answer away.
  const nRare = Math.min(3, 2 + Math.floor(streak / 5))
  const reals = [
    ...sample(rng, RARE, Math.min(nRare, RARE.length)),
    ...sample(rng, COMMON, 3 - Math.min(nRare, RARE.length)),
  ]
  const decoy = DECOYS[randInt(rng, DECOYS.length)]

  const options = shuffle(rng, [
    ...reals.map((r) => ({ ...r, isReal: true })),
    { ...decoy, isReal: false },
  ])
  return { options, answerIndex: options.findIndex((o) => !o.isReal) }
}

export const oddOneOut = {
  id: 'odd-one-out',
  icon: '❓',
  scoring: 'streak',
  title: { en: 'Odd One Out', he: 'מי לא שייך' },
  blurb: {
    en: 'Three were Olympic sports. One never was.',
    he: 'שלושה היו ענפים אולימפיים. אחד מעולם לא.',
  },
  prompt: {
    en: 'Which was NEVER an Olympic sport?',
    he: 'איזה ענף מעולם לא היה אולימפי?',
  },
  makeQuestion,
  stats: { real: REAL.length, rare: RARE.length, decoys: DECOYS.length },
}
