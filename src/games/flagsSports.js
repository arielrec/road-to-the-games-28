import { makeRng, pick, shuffle, randInt } from '../lib/seed'
import { countsForAll, usableYears, SPORTS, YEARS, COUNTRIES, PROMPTABLE } from './medalData'
import { maxAssignment } from '../lib/assignment'

export const ROUND_OPTIONS = [5, 10, 15, 20]
export const DEFAULT_ROUNDS = 10

/** Every sport, alphabetical — neutral ordering leaks nothing about which are biggest. */
const ALL_SPORTS = SPORTS.map((name, i) => ({ name, i })).sort((a, b) => a.name.localeCompare(b.name))

/** Sports actually contested in a given year, so By year never offers an impossible answer. */
const yearSportCache = new Map()
function sportsInYear(year) {
  if (year === null) return ALL_SPORTS.map((s) => s.i)
  if (yearSportCache.has(year)) return yearSportCache.get(year)
  const out = ALL_SPORTS.filter((s) => countsForAll(s.i, year).length > 0).map((s) => s.i)
  yearSportCache.set(year, out)
  return out
}

export const MODES = [
  { id: 'alltime', label: { en: 'All-time', he: 'כל הזמנים' }, year: false },
  { id: 'year',    label: { en: 'By year',  he: 'לפי שנה' },   year: true  },
]

export const SCORINGS = [
  { id: 'total', label: { en: 'Total medals', he: 'סך המדליות' },
    hint: { en: 'Points = medals that country won in the sport you pick. Big nations are worth the most — so spend your scarce sports on them.',
            he: 'ניקוד = מספר המדליות של המדינה בענף שבחרתם. מדינות גדולות שוות יותר.' } },
  { id: 'share', label: { en: 'Specialty %', he: 'התמחות %' },
    hint: { en: 'Points = the share of that country\'s medals from the sport you pick. Small focused nations score highest — Kenya scores near 100 for Athletics.',
            he: 'ניקוד = אחוז המדליות של המדינה שהגיעו מהענף שבחרתם. מדינות קטנות וממוקדות מנצחות.' } },
]

/**
 * Every nation that has ever won a medal — 152, not the 53 this game used to allow.
 *
 * The old floor was 40 career medals, which is the right idea for "who won more?" but
 * exactly wrong here. This game asks what a country is BEST at, and a country with one
 * sport is the clearest question in the set: Ethiopia is Athletics, Fiji is Rugby Sevens,
 * Kosovo is Judo, Israel is Judo. A floor of 40 threw away two thirds of the pool and
 * left the same big nations coming round every game.
 */
const CANDIDATES = PROMPTABLE

/**
 * ...with one caveat that only shows up once you play it.
 *
 * In Specialty % every country is worth up to 100, so a one-medal nation is a perfectly
 * good round — the whole pool is playable. In Total medals it is not: the USA's best
 * sport is worth 876 and Turkmenistan's is worth 1, so half a run drawn from the very
 * bottom would be rounds where the answer cannot matter. Total medals therefore keeps a
 * floor — still 78 nations against the 53 this game allowed before, and every one of
 * them worth playing.
 */
const TOTAL_FLOOR = 15
const poolFor = (scoring) =>
  scoring === 'share' ? CANDIDATES : CANDIDATES.filter((n) => COUNTRIES[n].total >= TOTAL_FLOOR)

/** Per-country medal totals by sport, for a slice. */
function profile(noc, year) {
  const out = []
  for (let si = 0; si < SPORTS.length; si++) {
    const row = countsForAll(si, year).find(([n]) => n === noc)
    if (row) out.push({ si, n: row[1] })
  }
  return out.sort((a, b) => b.n - a.n)
}

export function scoreOf(noc, si, year, scoring) {
  const p = profile(noc, year)
  const hit = p.find((x) => x.si === si)
  if (!hit) return 0
  if (scoring === 'total') return hit.n
  const total = p.reduce((s, x) => s + x.n, 0)
  return total ? Math.round((100 * hit.n) / total) : 0
}

/**
 * Best achievable total under the no-repeat rule — an assignment problem.
 * Brute force is not an option at this size: 20 rounds over 54 sports is ~1e30
 * permutations. maxAssignment solves it exactly in under a millisecond.
 */
function bestAssignment(nocs, palette, year, scoring) {
  const table = nocs.map((noc) => palette.map((si) => scoreOf(noc, si, year, scoring)))
  const { total, assignment } = maxAssignment(table)
  return { best: total, assignment: assignment.map((j) => palette[j]) }
}

/**
 * One country per medal-history tier, then ordered narrowest-first.
 *
 * Two problems to solve at once. Drawing uniformly from 152 nations would make almost
 * every round an obscure one; drawing by medal weight would put the same giants back.
 * So the pool is cut into as many tiers as there are rounds and one country is taken
 * from each: every run gets a giant, a mid-nation and a minnow, and with ~15 countries
 * per tier the specific line-up is different every time.
 *
 * Order matters just as much. A country with a single medal sport must be asked while
 * that sport is still unspent, so the roster runs narrowest-first — Ethiopia comes up
 * before Germany, never after it. Combined with the repair pass below, that is what
 * makes "a country is only unusable if every sport it medals in is already gone" true
 * by construction rather than by luck.
 */
function drawRoster(rng, pool, n, palette, year, scoring) {
  const inPalette = new Set(palette)
  const sportsOf = (noc) => profile(noc, year).filter((p) => inPalette.has(p.si)).length

  const ranked = [...pool].sort(
    (a, b) => (COUNTRIES[b]?.total || 0) - (COUNTRIES[a]?.total || 0) || a.localeCompare(b)
  )
  const tiers = []
  for (let i = 0; i < n; i++) {
    const lo = Math.floor((i * ranked.length) / n)
    const hi = Math.floor(((i + 1) * ranked.length) / n)
    tiers.push(ranked.slice(lo, Math.max(hi, lo + 1)))
  }
  let picked = tiers.map((t) => t[randInt(rng, t.length)])

  // Repair pass: if the optimal assignment cannot give some country a sport of its own
  // worth more than zero, that country is unanswerable however well the player plays.
  // Swap it for another from its own tier and try again.
  for (let attempt = 0; attempt < 40; attempt++) {
    const table = picked.map((noc) => palette.map((si) => scoreOf(noc, si, year, scoring)))
    const { assignment } = maxAssignment(table)
    const deadIndex = picked.findIndex((noc, i) => table[i][assignment[i]] <= 0)
    if (deadIndex === -1) break
    // A country is only stuck because every sport it medals in is already spoken for, so
    // the replacement has to be one with more room. Own tier first to keep the size
    // spread, then anywhere in the pool rather than give up on the round.
    const free = (c) => !picked.includes(c) && sportsOf(c) > 0
    const own = tiers[deadIndex].filter(free)
    const from = (own.length ? own : ranked.filter(free))
      .sort((a, b) => sportsOf(b) - sportsOf(a))
      .slice(0, 12)
    if (!from.length) break
    picked[deadIndex] = from[randInt(rng, from.length)]
  }

  // Narrowest first. Ties broken by the seed so the order is not alphabetical.
  const jitter = shuffle(rng, picked.map((_, i) => i))
  return picked
    .map((noc, i) => ({ noc, s: sportsOf(noc), j: jitter[i] }))
    .sort((a, b) => a.s - b.s || a.j - b.j)
    .map((x) => x.noc)
}

/** Builds the whole run at once, so the palette is shared across every round. */
function buildRun(runSeed, opts) {
  const rounds = opts.rounds || DEFAULT_ROUNDS
  const rng = makeRng(`${runSeed}|${opts.mode}|${opts.scoring}|${opts.year ?? 'r'}|${rounds}`)
  const mode = MODES.find((m) => m.id === opts.mode) || MODES[0]

  let year = null
  if (mode.year) {
    year = opts.year ?? null
    if (year === null) year = pick(rng, usableYears(null, 2).filter((y) => y >= 1960))
  }

  // The palette is EVERY sport available in this slice — all 54 all-time, or just the
  // ones contested that year (19-36). No shortlist: with only 15 distinct "best sport"
  // answers across 53 countries, no-repeat still forces a trade-off in ~75% of rounds,
  // so scarcity comes from concentrated answers rather than a small palette.
  const palette = sportsInYear(year)

  // Anything with at least one scoring sport in this slice is fair game.
  const scoring = opts.scoring || 'total'
  const pool = poolFor(scoring).filter((n) => profile(n, year).length >= 1)
  const usable = pool.length >= rounds ? pool : CANDIDATES
  const nocs = drawRoster(rng, usable, Math.min(rounds, usable.length), palette, year, scoring)

  const { best, assignment } = bestAssignment(nocs, palette, year, scoring)
  return { nocs, palette, year, best, assignment, rounds: nocs.length }
}

const runCache = new Map()
function getRun(runSeed, opts) {
  const key = `${runSeed}|${opts.mode}|${opts.scoring}|${opts.year ?? 'r'}|${opts.rounds || DEFAULT_ROUNDS}`
  if (!runCache.has(key)) runCache.set(key, buildRun(runSeed, opts))
  if (runCache.size > 20) runCache.delete(runCache.keys().next().value)
  return runCache.get(key)
}

export function makeQuestion(seed, round = 0, opts = {}) {
  const run = getRun(opts.runSeed || seed, opts)
  return {
    noc: run.nocs[round],
    palette: run.palette,
    year: run.year,
    run,
    context: { sport: null, year: run.year },
  }
}

/** Best achievable score for this run — lets the result read "148 of a possible 216". */
export function maxScore(opts) {
  if (!opts?.runSeed) return null
  return getRun(opts.runSeed, opts).best
}

export const flagsSports = {
  id: 'flags-sports',
  icon: '🚩',
  scoring: 'rounds',
  rounds: DEFAULT_ROUNDS,
  roundOptions: ROUND_OPTIONS,
  usesFlags: true,
  modes: MODES,
  scorings: SCORINGS,
  title: { en: 'Flags & Sports', he: 'דגלים וענפים' },
  blurb: { en: 'What is this country best at?', he: 'במה המדינה הזו הכי טובה?' },
  prompt: { en: 'Which sport are they best at?', he: 'באיזה ענף הם הכי טובים?' },
  makeQuestion,
  maxScore,
  scoreOf,
  years: YEARS.filter((y) => y >= 1960),
}
