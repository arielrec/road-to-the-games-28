import { makeRng, randInt, pick, shuffle, weightedPick } from '../lib/seed'
import { countsFor, usableYears, usableSports, sportsInYear, SPORTS, SPORTS_HE, YEARS, anyFlagsClash, breadthWeight } from './medalData'
import { MODES } from './moreMedals'
import { questionAt, avoidSet, freshSlice, freshFrom } from './deck'

// A podium needs THREE distinct totals, not two — so its usable sports and years are a
// stricter subset than More Medals'. Computing them up front stops the mode quietly
// falling back to a slice the player did not choose.
const PODIUM_SPORTS = usableSports(3, false)
const PODIUM_SPORTS_WITH_YEAR = usableSports(3, true)

export const ROUNDS = 10
export const MAX_PER_ROUND = 3

/**
 * Difficulty is the SMALLEST gap in the triple, because that is the pair a player can
 * actually get wrong. A wide minimum gap means the order is obvious.
 */
function spreadBand(round) {
  if (round < 3) return [0.4, 1]
  if (round < 7) return [0.15, 0.4]
  return [0, 0.15]
}

/**
 * Three countries with three DISTINCT totals — a tie makes the ordering unanswerable.
 *
 * Triples are sampled from anywhere in the ranking. An earlier version only considered
 * CONSECUTIVE triples, and since the gaps at the very top are enormous (USA 2783 vs GBR
 * 1022) exactly one triple satisfied the easy band — so the first three rounds of every
 * single game were USA, GBR, URS.
 */
/**
 * One country per medal total, because a podium with a tie is unanswerable.
 *
 * Which one matters enormously. The first version kept whichever country came first in
 * the sorted table, and since that order never changes, every country tied with a
 * higher-sorting one was permanently unreachable: 26 of Judo's 49 medal nations could
 * never appear, ever, and Shooting always showed Norway and never Russia or Switzerland.
 * That single line was the biggest reason the same flags kept coming back.
 *
 * Now the representative is drawn per question — away from countries already seen this
 * run, and away from the nations that medal in everything.
 */
function representatives(rng, counts, avoid, balance) {
  const groups = new Map()
  for (const [noc, n] of counts) {
    if (!groups.has(n)) groups.set(n, [])
    groups.get(n).push(noc)
  }
  const out = []
  for (const [total, nocs] of groups) {
    if (nocs.length === 1) { out.push([nocs[0], total]); continue }
    const w = nocs.map((noc) =>
      (balance ? breadthWeight(noc) : 1) * (avoid.has(noc) ? 0.12 : 1))
    out.push([weightedPick(rng, nocs, w), total])
  }
  return out.sort((a, b) => b[1] - a[1])
}

function pickTriple(rng, counts, round, avoid = new Set(), balance = false) {
  const distinct = representatives(rng, counts, avoid, balance)
  if (distinct.length < 3) return null

  const spread = (t) => {
    const [a, b, c] = t
    return Math.min((a[1] - b[1]) / a[1], (b[1] - c[1]) / b[1])
  }
  const draw = () => {
    const i = randInt(rng, distinct.length)
    let j = randInt(rng, distinct.length)
    let k = randInt(rng, distinct.length)
    if (i === j || j === k || i === k) return null
    return [distinct[i], distinct[j], distinct[k]].sort((x, y) => y[1] - x[1])
  }

  // Three countries a round out of a pool that can be a dozen: without this the same
  // flags came back roughly every third round. A triple of countries not yet seen this
  // run wins; one repeat is taken only if the band offers nothing better.
  //
  // Small pools get an exhaustive search rather than random sampling. Sampling 500
  // triples out of a 12-country sport keeps landing on the same handful, and the fresh
  // triple that does exist is easy to miss — which is exactly where the repeats were.
  const bands = [spreadBand(round), [0.15, 0.4], [0.4, 1], [0, 1]]
  const repeatsIn = (t) => t.reduce((n, [noc]) => n + (avoid.has(noc) ? 1 : 0), 0)

  if (distinct.length <= 40) {
    for (const [lo, hi] of bands) {
      const tiers = [[], [], []]
      for (let i = 0; i < distinct.length; i++)
        for (let j = i + 1; j < distinct.length; j++)
          for (let k = j + 1; k < distinct.length; k++) {
            const t = [distinct[i], distinct[j], distinct[k]]   // counts are sorted desc
            const g = spread(t)
            if (g <= lo || g > hi) continue
            if (anyFlagsClash(t.map(([noc]) => noc))) continue
            const r = repeatsIn(t)
            if (r <= 2) tiers[r].push(t)
          }
      for (const tier of tiers) {
        if (!tier.length) continue
        if (!balance) return tier[randInt(rng, tier.length)]
        return weightedPick(rng, tier,
          tier.map((t) => t.reduce((w, [noc]) => w * breadthWeight(noc), 1)))
      }
    }
  } else {
    for (const [lo, hi] of bands) {
      let fallback = null
      for (let tries = 0; tries < 500; tries++) {
        const t = draw()
        if (!t) continue
        const g = spread(t)
        if (g <= lo || g > hi) continue
        if (anyFlagsClash(t.map(([noc]) => noc))) continue
        const r = repeatsIn(t)
        if (r === 0) return t
        if (r === 1 && !fallback) fallback = t
      }
      if (fallback) return fallback
    }
  }
  // last resort: the first three distinct values that do not show the same flag twice
  for (let i = 0; i < distinct.length; i++)
    for (let j = i + 1; j < distinct.length; j++)
      for (let k = j + 1; k < distinct.length; k++) {
        const t = [distinct[i], distinct[j], distinct[k]]
        if (!anyFlagsClash(t.map(([noc]) => noc))) return t
      }
  return null
}

function buildQuestion(seed, round = 0, opts = {}, recent = [], recentSlices = [], recentYears = [], depth = 0) {
  const rng = makeRng(seed)
  if (depth > 3) return buildQuestion(seed + ':f', round, { mode: 'alltime' }, recent, recentSlices, recentYears, 99)
  const mode = MODES.find((m) => m.id === opts.mode) || MODES[0]

  const fixedSport = mode.sport ? (opts.sportIndex ?? null) : null
  const fixedYear = mode.year ? (opts.year ?? null) : null

  let year = fixedYear
  let sportIndex = fixedSport
  if (mode.year && year === null) {
    const ys = usableYears(sportIndex, 3)
    const seenNow = new Set(recent)
    const unseenInYear = (y) =>
      countsFor(sportIndex, y).reduce((n, [noc]) => n + (seenNow.has(noc) ? 0 : 1), 0)
    year = ys.length ? freshFrom(rng, ys, recentYears, unseenInYear) : null
  }
  if (mode.sport && sportIndex === null) {
    // prefer a sport this run has not used and that still has unseen countries in it
    const pool = mode.year ? sportsInYear(year, 3) : PODIUM_SPORTS
    const seen = new Set(recent)
    const unseenIn = (si) => countsFor(si, year).reduce((n, [noc]) => n + (seen.has(noc) ? 0 : 1), 0)
    sportIndex = freshSlice(rng, pool.length ? pool : PODIUM_SPORTS, recentSlices, unseenIn).i
  }

  const counts = countsFor(sportIndex, year)
  const avoid = avoidSet(recent, counts.map((c) => c[0]), 4)
  const triple = pickTriple(rng, counts, round, avoid, sportIndex !== null)
  if (!triple) {
    const relaxed = { ...opts, sportIndex: fixedSport, year: fixedYear }
    if (fixedSport === null && mode.sport) return buildQuestion(seed + ':x', round, relaxed, recent, recentSlices, recentYears, depth + 1)
    if (fixedYear === null && mode.year) return buildQuestion(seed + ':y', round, relaxed, recent, recentSlices, recentYears, depth + 1)
    return buildQuestion(seed + ':z', round, { mode: 'alltime' }, recent, recentSlices, recentYears, depth + 1)
  }

  const correct = triple.map(([noc, total]) => ({ noc, total }))  // already descending
  return {
    pool: shuffle(rng, correct),
    correct,
    correctOrder: correct.map((c) => c.noc),
    used: correct.map((c) => c.noc),
    usedSlice: sportIndex,
    usedYear: year,
    context: { sport: sportIndex !== null ? SPORTS[sportIndex] : null,
               sportHe: sportIndex !== null ? SPORTS_HE[sportIndex] : null, year: year ?? null },
  }
}

const runKey = (opts) =>
  `podium|${opts.runSeed || 'x'}|${opts.mode}|${opts.sportIndex ?? 'r'}|${opts.year ?? 'r'}`

export function makeQuestion(seed, round = 0, opts = {}) {
  if (!opts.runSeed) return buildQuestion(seed, round, opts, [])
  return questionAt(runKey(opts), round, (i, recent, recentSlices, recentYears) =>
    buildQuestion(`${opts.runSeed}:${i}`, i, opts, recent, recentSlices, recentYears))
}

/** 3 for a perfect podium, otherwise 1 per correctly placed country. */
export function scorePlacement(placed, correctOrder) {
  const hits = placed.filter((noc, i) => noc === correctOrder[i]).length
  return { points: hits === 3 ? 3 : hits, hits, perfect: hits === 3 }
}

export const podium = {
  id: 'podium',
  icon: '🥇',
  scoring: 'rounds',
  rounds: ROUNDS,
  maxPerRound: MAX_PER_ROUND,
  usesFlags: true,
  modes: MODES,
  title: { en: 'Podium', he: 'פודיום' },
  blurb: { en: 'Put three countries in medal order.', he: 'סדרו שלוש מדינות לפי מדליות.' },
  prompt: { en: 'Put these in medal order', he: 'סדרו לפי מספר מדליות' },
  makeQuestion,
  scorePlacement,
  sports: PODIUM_SPORTS_WITH_YEAR,
  years: YEARS,
}
