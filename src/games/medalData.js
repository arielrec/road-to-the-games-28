import M from '../data/medals.json'
import F from '../data/flags.json'

export const SPORTS = M.sports
export const SPORTS_HE = M.sportsHe || M.sports
export const sportName = (si, lang) => (lang === 'he' ? SPORTS_HE[si] : SPORTS[si]) || SPORTS[si]
export const YEARS = M.years
export const COUNTRIES = M.countries
export const FLAGS = F.flags

// [noc, sportIndex, year, gold, silver, bronze]
const ROWS = M.rows

/**
 * Countries recognisable enough to make a fair question.
 *
 * Lowered from 25 to 15 on the same reasoning as the wider Flags & Sports pool: at 25
 * the duel games saw only 66 nations, and the twelve just below the line — Israel,
 * Latvia, Algeria, Armenia, Chile, Malaysia, the Bahamas, Trinidad, Tunisia, Venezuela,
 * the Philippines, the Dominican Republic — are hardly obscure. The difficulty bands,
 * not the floor, are what keep a question answerable.
 */
const FAME_THRESHOLD = 15

/**
 * A country is eligible as a *visual prompt* if it is well enough known AND has a flag
 * (or at least a name card). noPrompt entities — EUN, ROC, EOR, IOA, AIN — competed
 * under the Olympic flag, so they stay in the medal totals but are never shown.
 */
export const ELIGIBLE = new Set(
  Object.keys(COUNTRIES).filter(
    (n) => COUNTRIES[n].total >= FAME_THRESHOLD && !FLAGS[n]?.noPrompt
  )
)

/** Sports with too few contenders to ask about — 8 of them, including Breaking. */
const bySportCount = {}
for (const [noc, si, , g, s, b] of ROWS) {
  if (!ELIGIBLE.has(noc)) continue
  bySportCount[si] = bySportCount[si] || new Set()
  bySportCount[si].add(noc)
}
export const PLAYABLE_SPORTS = SPORTS
  .map((name, i) => ({ name, i, n: bySportCount[i]?.size || 0 }))
  .filter((s) => s.n >= 4)
  .sort((a, b) => a.name.localeCompare(b.name))

/**
 * How many sports a country has ever medalled in.
 *
 * This is the reason the sport modes kept showing the same flags. The USA medals in 40+
 * sports and Germany in 35, while Ethiopia medals in one and Jamaica in two — so when a
 * question is drawn from a single sport, the ubiquitous nations are candidates almost
 * every time and the narrow ones almost never. Measured before this was corrected:
 * Japan appeared 15x more often than Ethiopia in By sport, and Australia 77x more often
 * than South Africa in Podium's By sport. Selection weights by 1/sqrt(breadth) to pull
 * that back without pretending Ethiopia is as broad a medal nation as the USA.
 */
export const BREADTH = (() => {
  const out = {}
  const seen = new Set()
  for (const [noc, si] of ROWS) {
    if (!ELIGIBLE.has(noc)) continue
    const k = noc + '|' + si
    if (seen.has(k)) continue
    seen.add(k)
    out[noc] = (out[noc] || 0) + 1
  }
  return out
})()

/**
 * Selection weight that offsets a country's ubiquity across sports.
 *
 * The exponent is a deliberate compromise. At 1.0 exposure is closest to flat, but
 * inside Athletics it would make Ethiopia 44x likelier than the USA, which is a strange
 * question to ask about Olympic medals. At 0.75 the top nations sit at roughly twice an
 * even share instead of fifteen times it, and every question still looks sensible.
 */
export const breadthWeight = (noc) => 1 / Math.pow(BREADTH[noc] || 1, 0.75)

/**
 * Every country that can be used as a visual prompt — 152 of them, against the 66 that
 * clear the fame threshold.
 *
 * The threshold exists because "did Fiji or Kosovo win more medals?" is a coin flip, not
 * a question. But Flags & Sports asks something completely different — "what is this
 * country best at?" — and there a narrow country is the BEST kind of question: Ethiopia
 * is Athletics, Fiji is Rugby Sevens, Kosovo is Judo. Restricting that game to the same
 * 53 big nations was throwing away its most interesting two thirds.
 */
export const PROMPTABLE = Object.keys(COUNTRIES).filter(
  (n) => COUNTRIES[n].total > 0 && !FLAGS[n]?.noPrompt
)
const PROMPTABLE_SET = new Set(PROMPTABLE)

const cache = new Map()
const allCache = new Map()

/**
 * Medal totals per country WITHOUT the fame threshold. Same numbers as countsFor for the
 * countries they share — this only adds rows, it never changes a total.
 */
export function countsForAll(sportIndex = null, year = null) {
  const key = `${sportIndex}|${year}`
  if (allCache.has(key)) return allCache.get(key)
  const out = {}
  for (const [noc, si, yr, g, s, b] of ROWS) {
    if (sportIndex !== null && si !== sportIndex) continue
    if (year !== null && yr !== year) continue
    if (!PROMPTABLE_SET.has(noc)) continue
    out[noc] = (out[noc] || 0) + g + s + b
  }
  const list = Object.entries(out).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  allCache.set(key, list)
  return list
}

/**
 * Medal totals per country for a slice of the data.
 * sportIndex/year of null means "don't constrain on that axis".
 */
export function countsFor(sportIndex = null, year = null) {
  const key = `${sportIndex}|${year}`
  if (cache.has(key)) return cache.get(key)
  const out = {}
  for (const [noc, si, yr, g, s, b] of ROWS) {
    if (sportIndex !== null && si !== sportIndex) continue
    if (year !== null && yr !== year) continue
    if (!ELIGIBLE.has(noc)) continue
    out[noc] = (out[noc] || 0) + g + s + b
  }
  const list = Object.entries(out).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  cache.set(key, list)
  return list
}

/**
 * Slices that can actually produce a question, so the UI never offers a dead one.
 * `minDistinct` is how many DIFFERENT totals the slice needs: 2 for a duel,
 * 3 for a podium. Getting this wrong makes a mode silently fall back to another
 * slice — you pick "Sport + year" and quietly get an all-time question.
 */
export function usableYears(sportIndex = null, minDistinct = 2) {
  return YEARS.filter((y) => new Set(countsFor(sportIndex, y).map((x) => x[1])).size >= minDistinct)
}

/** Sports that can produce a question at the given granularity. */
export function usableSports(minDistinct = 2, withYear = false) {
  return PLAYABLE_SPORTS.filter((s) => {
    if (!withYear) return new Set(countsFor(s.i, null).map((x) => x[1])).size >= minDistinct
    return usableYears(s.i, minDistinct).length > 0
  })
}

/**
 * Sports that work IN a specific year. Needed so a player-chosen year is honoured:
 * without this the generator picks a random sport, finds no valid pair (Art Competitions
 * did not run in 1996), and falls back by discarding the year the player asked for.
 */
export function sportsInYear(year, minDistinct = 2) {
  if (year === null || year === undefined) return usableSports(minDistinct, false)
  return PLAYABLE_SPORTS.filter(
    (s) => new Set(countsFor(s.i, year).map((x) => x[1])).size >= minDistinct
  )
}

/**
 * Countries whose flag image is pixel-identical to another's — West Germany flew the
 * same tricolour as Germany, and Czechia kept Czechoslovakia's flag. Showing both in one
 * question puts the SAME PICTURE on screen twice, which is unanswerable from the flag and
 * reads as a bug. The group ids come from a content hash of the assets in tools/flags.py.
 */
export const sameFlagGroup = (noc) => FLAGS[noc]?.sameFlag ?? null

/** True when these two must never appear in the same question. */
export function flagsClash(a, b) {
  const ga = sameFlagGroup(a)
  return ga !== null && ga === sameFlagGroup(b)
}

/** True when any pair in the list would clash. */
export const anyFlagsClash = (nocs) =>
  nocs.some((a, i) => nocs.slice(i + 1).some((b) => flagsClash(a, b)))

export const flagSrc = (noc) => FLAGS[noc]?.file || null
export const displayName = (noc, lang) =>
  (lang === 'he' ? FLAGS[noc]?.nameHe : FLAGS[noc]?.name) || COUNTRIES[noc]?.name || noc
export const isHistorical = (noc) => !!FLAGS[noc]?.historical
export const historicalYears = (noc) => FLAGS[noc]?.years
