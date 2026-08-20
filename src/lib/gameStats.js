import { useCallback, useEffect, useState } from 'react'

const KEY = 'olympic-app:games:v1'
const blank = () => ({ played: 0, best: 0, lastScore: null, history: [] })

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
let store = read()
const listeners = new Set()
const flush = () => {
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* private mode */ }
  listeners.forEach((l) => l({ ...store }))
}

export const statsFor = (gameId, variant = '') =>
  ({ ...blank(), ...(store[gameId + (variant ? ':' + variant : '')] || {}) })

/**
 * Every score this game has recorded, added up across its modes.
 *
 * Scores are stored per VARIANT — "flags-sports:total:r10" and "flags-sports:share:r20"
 * are separate records, because 20 rounds of Specialty % is not the same challenge as 10
 * rounds of Total medals and one number cannot honestly stand for both. The Games page,
 * though, was reading the bare game id, a key that recordResult never writes for a game
 * with any settings at all — so Flags & Sports and The Draft showed "play now" forever
 * however much you played them, and the other three hid any score set with a setting
 * changed. Aggregate on read instead: the card shows the best you have ever managed at
 * this game, and the in-game header keeps the like-for-like number for the exact mode.
 */
export function overallFor(gameId) {
  const prefix = gameId + ':'
  let played = 0, best = 0, bestVariant = '', lastScore = null
  for (const key of Object.keys(store)) {
    if (key !== gameId && !key.startsWith(prefix)) continue
    const s = store[key]
    played += s.played || 0
    if ((s.best || 0) > best) { best = s.best; bestVariant = key.slice(gameId.length + 1) }
    if (s.lastScore !== null && s.lastScore !== undefined) lastScore = s.lastScore
  }
  return { played, best, bestVariant, lastScore }
}

/** Returns { isBest } so the result screen can celebrate a personal best. */
export function recordResult(gameId, score, variant = '') {
  const key = gameId + (variant ? ':' + variant : '')
  const s = statsFor(gameId, variant)
  const isBest = score > s.best
  store = {
    ...store,
    [key]: {
      played: s.played + 1,
      best: Math.max(s.best, score),
      lastScore: score,
      history: [...s.history, score].slice(-20),
    },
  }
  flush()
  return { isBest }
}

export function useGameStats() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const l = () => setTick((t) => t + 1)
    listeners.add(l)
    return () => listeners.delete(l)
  }, [])
  return useCallback((gameId) => statsFor(gameId), [])
}
