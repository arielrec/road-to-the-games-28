import { makeRng, randInt, pick, weightedPick } from '../lib/seed'
import { questionAt, avoidSet, freshSlice, freshFrom } from './deck'
import { countsFor, usableYears, sportsInYear, PLAYABLE_SPORTS, SPORTS, SPORTS_HE, YEARS, flagsClash, breadthWeight } from './medalData'

export const MODES = [
  { id: 'alltime',   label: { en: 'All-time',     he: 'כל הזמנים' },   sport: false, year: false },
  { id: 'sport',     label: { en: 'By sport',     he: 'לפי ענף' },     sport: true,  year: false },
  { id: 'year',      label: { en: 'By year',      he: 'לפי שנה' },     sport: false, year: true  },
  { id: 'sportyear', label: { en: 'Sport + year', he: 'ענף ושנה' },    sport: true,  year: true  },
]

/**
 * Difficulty is derived from the streak, never chosen by the player.
 * Early questions have a wide gap between the two counts; later ones get close.
 */
function gapBand(streak) {
  if (streak < 5) return [0.6, 1]     // "USA vs Kenya"
  if (streak < 10) return [0.25, 0.6] // "France vs Italy"
  return [0, 0.25]                    // "Hungary vs Sweden"
}

/**
 * Pick a pair whose relative gap sits in the band, widening if nothing fits.
 *
 * Within a band, a pair of two countries you have not seen this run beats a pair with
 * one, which beats a pair with two. Difficulty stays the primary key — a fresh but
 * trivial pair at streak 12 would be worse than a repeat — but with 66 countries there
 * is almost always a fresh pair inside the right band.
 */
function pickPair(rng, counts, streak, avoid = new Set(), balance = false) {
  const bands = [gapBand(streak), [0.25, 0.6], [0.6, 1], [0, 1]]
  for (const [lo, hi] of bands) {
    const tiers = [[], [], []]   // 0 seen, 1 seen, 2 seen
    for (let i = 0; i < counts.length; i++) {
      for (let j = i + 1; j < counts.length; j++) {
        const a = counts[i][1], b = counts[j][1]
        if (a === b) continue
        const gap = Math.abs(a - b) / Math.max(a, b)
        if (gap <= lo || gap > hi) continue
        if (flagsClash(counts[i][0], counts[j][0])) continue
        const seen = (avoid.has(counts[i][0]) ? 1 : 0) + (avoid.has(counts[j][0]) ? 1 : 0)
        tiers[seen].push([counts[i], counts[j]])
      }
    }
    for (const tier of tiers) {
      if (!tier.length) continue
      if (!balance) return tier[randInt(rng, tier.length)]
      // Inside a single sport, weight against nations that medal in everything.
      return weightedPick(rng, tier, tier.map(([a, b]) => breadthWeight(a[0]) * breadthWeight(b[0])))
    }
  }
  return null
}

function buildQuestion(seed, streak = 0, opts = {}, recent = [], recentSlices = [], recentYears = [], depth = 0) {
  const rng = makeRng(seed)
  // A constrained slice can have no valid pair (e.g. a sport contested at one Games where
  // everyone won the same). We retry with the constraints dropped; the depth guard stops
  // that ever becoming an infinite loop.
  if (depth > 3) return buildQuestion(seed + ':f', streak, { mode: 'alltime' }, recent, recentSlices, recentYears, 99)
  const mode = MODES.find((m) => m.id === opts.mode) || MODES[0]

  // "random each round" is the default and plays better than a fixed slice.
  // Whatever the player fixed is never re-rolled — only the random half is.
  const fixedSport = mode.sport ? (opts.sportIndex ?? null) : null
  const fixedYear = mode.year ? (opts.year ?? null) : null

  let year = fixedYear
  let sportIndex = fixedSport
  if (mode.year && year === null) {
    const ys = usableYears(sportIndex, 2)
    const seenNow = new Set(recent)
    const unseenInYear = (y) =>
      countsFor(sportIndex, y).reduce((n, [noc]) => n + (seenNow.has(noc) ? 0 : 1), 0)
    year = ys.length ? freshFrom(rng, ys, recentYears, unseenInYear) : null
  }
  if (mode.sport && sportIndex === null) {
    // choose a sport that actually works in this year, rather than one that does not,
    // and prefer one this run has not visited — re-rolling onto Swimming every other
    // round is the main reason the same flags kept coming back in the sport modes.
    const pool = mode.year ? sportsInYear(year, 2) : PLAYABLE_SPORTS
    const seen = new Set(recent)
    const unseenIn = (si) => countsFor(si, year).reduce((n, [noc]) => n + (seen.has(noc) ? 0 : 1), 0)
    sportIndex = freshSlice(rng, pool.length ? pool : PLAYABLE_SPORTS, recentSlices, unseenIn).i
  }

  const counts = countsFor(sportIndex, year)
  const avoid = avoidSet(recent, counts.map((c) => c[0]))
  const pair = pickPair(rng, counts, streak, avoid, sportIndex !== null)
  if (!pair) {
    // relax only what the player did NOT choose
    const relaxed = { ...opts,
      sportIndex: fixedSport,
      year: fixedYear }
    if (fixedSport === null && mode.sport) return buildQuestion(seed + ':x', streak, relaxed, recent, recentSlices, recentYears, depth + 1)
    if (fixedYear === null && mode.year) return buildQuestion(seed + ':y', streak, relaxed, recent, recentSlices, recentYears, depth + 1)
    return buildQuestion(seed + ':z', streak, { mode: 'alltime' }, recent, recentSlices, recentYears, depth + 1)
  }

  const options = rng() < 0.5 ? [pair[0], pair[1]] : [pair[1], pair[0]]
  const answerIndex = options[0][1] > options[1][1] ? 0 : 1
  return {
    options: options.map(([noc, total]) => ({ noc, total })),
    answerIndex,
    used: options.map(([noc]) => noc),
    usedSlice: sportIndex,
    usedYear: year,
    context: {
      sport: sportIndex !== null ? SPORTS[sportIndex] : null,
      sportHe: sportIndex !== null ? SPORTS_HE[sportIndex] : null,
      year: year ?? null,
    },
  }
}

/**
 * A run remembers its own countries, so the key has to change whenever the slice does —
 * switching to By sport mid-session must not inherit the all-time run's memory.
 */
const runKey = (opts) =>
  `${opts.runSeed || 'x'}|${opts.mode}|${opts.sportIndex ?? 'r'}|${opts.year ?? 'r'}`

export function makeQuestion(seed, streak = 0, opts = {}) {
  if (!opts.runSeed) return buildQuestion(seed, streak, opts, [])
  return questionAt(runKey(opts), streak, (i, recent, recentSlices, recentYears) =>
    buildQuestion(`${opts.runSeed}:${i}`, i, opts, recent, recentSlices, recentYears))
}

export const moreMedals = {
  id: 'more-medals',
  icon: '🏅',
  scoring: 'streak',
  usesFlags: true,
  modes: MODES,
  title: { en: 'More Medals', he: 'מי עם יותר' },
  blurb: { en: 'Two flags. Which country won more?', he: 'שני דגלים. מי זכתה ביותר?' },
  prompt: { en: 'Which won more Olympic medals?', he: 'מי זכתה ביותר מדליות אולימפיות?' },
  makeQuestion,
  sports: PLAYABLE_SPORTS,
  years: YEARS,
}
