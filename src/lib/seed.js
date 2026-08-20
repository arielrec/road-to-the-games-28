/**
 * Deterministic randomness.
 *
 * Game logic must NEVER call Math.random(). Every question generator takes a seeded
 * RNG, so the same seed always produces the same questions. That is what makes a
 * shareable daily challenge possible without rewriting the games, and it makes any
 * bug reproducible from the seed alone.
 */

/** 32-bit string hash (FNV-1a) — stable across browsers and sessions. */
export function hashString(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** mulberry32 — small, fast, good enough distribution for quiz shuffling. */
export function makeRng(seed) {
  let a = typeof seed === 'string' ? hashString(seed) : seed >>> 0
  return function rng() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const randInt = (rng, n) => Math.floor(rng() * n)
export const pick = (rng, arr) => arr[randInt(rng, arr.length)]

/** Fisher–Yates on a copy. */
export function shuffle(rng, arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** n distinct items, without replacement. */
export const sample = (rng, arr, n) => shuffle(rng, arr).slice(0, n)

/** Weighted pick. weights[i] corresponds to arr[i]; all must be >= 0. */
export function weightedPick(rng, arr, weights) {
  const total = weights.reduce((s, w) => s + w, 0)
  if (total <= 0) return pick(rng, arr)
  let r = rng() * total
  for (let i = 0; i < arr.length; i++) {
    r -= weights[i]
    if (r <= 0) return arr[i]
  }
  return arr[arr.length - 1]
}

/** Stable seed for "today's puzzle", identical for every player. */
export const dailySeed = (gameId, dateISO) => `${gameId}:${dateISO}`
