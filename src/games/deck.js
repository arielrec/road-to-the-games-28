/**
 * Run memory for the country games.
 *
 * Without it the generator has no idea what it already showed you: More Medals draws
 * 2 countries a round and Podium draws 3, both from a pool of 66, so the birthday
 * problem alone puts a repeat in almost every run — measured at 2.5 repeated slots per
 * 10 rounds all-time, and 11 of 30 for Podium in Sport+Year, where the slice can be a
 * dozen countries. Players read that as "it keeps showing me the same flags", and they
 * are right.
 *
 * makeQuestion() has to stay pure: React re-renders call it again for the same round
 * and it must return the same question both times. So the deck is not consumed as we
 * go — each run keeps an indexed list of the questions it has already produced, and
 * building question i looks at what questions 0..i-1 used.
 */

import { weightedPick } from '../lib/seed'

const RUNS = new Map()
const MAX_RUNS = 24

/** How many country slots of history to keep. Beyond this the oldest fall out. */
const MEMORY = 48
/** How many recent slices (sports) to steer away from when the mode re-rolls one. */
const SLICE_MEMORY = 8

function getRun(key) {
  let run = RUNS.get(key)
  if (!run) {
    run = { items: [], recent: [], recentSlices: [], recentYears: [] }
    RUNS.set(key, run)
    // Bounded so a long session cannot grow this without limit.
    if (RUNS.size > MAX_RUNS) RUNS.delete(RUNS.keys().next().value)
  }
  return run
}

/**
 * The question for `index` in this run, building any earlier ones it depends on.
 *
 * `build(i, recent, recentSlices)` must return the question plus a `used` array of the
 * country codes it put on screen; that array is what later rounds avoid. If the mode
 * also picks a slice per round it reports it as `usedSlice`, so consecutive rounds do
 * not keep landing on the same sport — which is what dragged the same countries back.
 */
export function questionAt(key, index, build) {
  const run = getRun(key)
  while (run.items.length <= index) {
    const i = run.items.length
    const q = build(i, run.recent, run.recentSlices, run.recentYears)
    run.items.push(q)
    run.recent.push(...(q.used || []))
    if (run.recent.length > MEMORY) run.recent.splice(0, run.recent.length - MEMORY)
    if (q.usedSlice !== null && q.usedSlice !== undefined) {
      run.recentSlices.push(q.usedSlice)
      if (run.recentSlices.length > SLICE_MEMORY) run.recentSlices.shift()
    }
    if (q.usedYear !== null && q.usedYear !== undefined) {
      run.recentYears.push(q.usedYear)
      if (run.recentYears.length > SLICE_MEMORY) run.recentYears.shift()
    }
  }
  return run.items[index]
}

/**
 * Prefer slices this run has not used yet, and among those the ones that still have
 * unseen countries in them. Falls back to the full pool rather than ever returning
 * nothing — a stale sport beats no question.
 */
export function freshSlice(rng, pool, recentSlices, unseenCount) {
  const unused = pool.filter((s) => !recentSlices.includes(s.i))
  const from = unused.length ? unused : pool
  // Weighted rather than filtered: a sport with 30 unseen countries should come up more
  // often than one with 4, but the small sports must stay reachable or the game turns
  // into Athletics and Swimming every round.
  // Deliberately gentle. An earlier version used ^1.5, which handed Athletics and
  // Shooting ~7% of all rounds each while Skateboarding got 0.03% — and since the big
  // sports are exactly where the ubiquitous nations medal, that concentration was half
  // the reason the same flags kept coming up. Freshness still wins, size barely nudges.
  const w = from.map((s) => Math.pow(Math.max(0, unseenCount(s.i) - 2), 0.6) + 0.5)
  return weightedPick(rng, from, w)
}

/**
 * Same idea for a plain list of values (the Games year). `unseenCount` is optional:
 * pass it and a year that still has plenty of unshown countries is favoured.
 */
export function freshFrom(rng, values, recent, unseenCount = null) {
  const unused = values.filter((v) => !recent.includes(v))
  const from = unused.length ? unused : values
  if (!unseenCount) return from[Math.floor(rng() * from.length)]
  const w = from.map((v) => Math.pow(Math.max(0, unseenCount(v) - 2), 0.6) + 0.5)
  return weightedPick(rng, from, w)
}

/**
 * Which countries to avoid this round.
 *
 * A slice can be far smaller than the memory — Softball has four eligible countries.
 * Avoiding everything recent would leave nothing to ask, so when the pool runs dry the
 * memory collapses to the previous round only: a repeat three rounds apart is a much
 * smaller sin than a dead question, and back-to-back repeats never happen either way.
 */
export function avoidSet(recent, poolNocs, minFree = 3) {
  const avoid = new Set(recent)
  let free = 0
  for (const n of poolNocs) if (!avoid.has(n)) free++
  return free >= minFree ? avoid : new Set(recent.slice(-3))
}

/** Test hook — drops all run memory. */
export const resetRuns = () => RUNS.clear()
