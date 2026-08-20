import { useCallback, useEffect, useState } from 'react'
import { hashString } from './seed'
import { GAMES } from '../games/registry'
import { todayISO } from './dates'

/**
 * One puzzle a day, the same one for everybody.
 *
 * This works only because every game generates its questions from a seed through a pure
 * function — the same seed and the same settings always produce the same run. So the
 * "server" that decides today's puzzle is the date itself. Nothing is fetched, nothing is
 * stored anywhere but the player's own browser, and two people on opposite sides of the
 * world get identical questions with no infrastructure between them.
 *
 * The settings have to be pinned. If the daily inherited whatever the player last chose,
 * two people would get different runs from the same date and comparing scores would be
 * meaningless — so every daily is played at the default mode, default scoring and default
 * length, and the setup screen is skipped entirely.
 */

const KEY = 'olympic-app:daily:v1'
const EPOCH = '2026-01-01'   // day 1, so the share text has a small human number

/** Whole days between two ISO dates. */
function daysBetween(a, b) {
  const [ya, ma, da] = a.split('-').map(Number)
  const [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000)
}

export const dailyNumber = (dateISO = todayISO()) => daysBetween(EPOCH, dateISO) + 1

/**
 * Which game today is, and exactly how it is set up.
 *
 * The game rotates by date rather than by a fixed weekday cycle, so the order is not
 * predictable from "it's Tuesday" but is identical for everyone on the same date.
 */
export function dailyPuzzle(dateISO = todayISO()) {
  const h = hashString('daily:' + dateISO)
  const game = GAMES[h % GAMES.length]
  return {
    date: dateISO,
    number: dailyNumber(dateISO),
    game,
    seed: `daily:${dateISO}`,
    // Defaults only — see the note above about why these cannot follow the player.
    opts: {
      mode: game.modes ? game.modes[0].id : null,
      scoring: game.scorings ? game.scorings[0].id : null,
      format: game.formats ? game.formats[0].id : null,
      difficulty: game.difficulties ? game.difficulties[0].id : null,
      rounds: game.rounds || 10,
      candidates: game.defaultCandidates || 4,
      sportIndex: null,
      year: null,
      flagsOnly: false,
    },
  }
}

const read = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}
let store = read()
const listeners = new Set()
const flush = () => {
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* private mode */ }
  listeners.forEach((l) => l())
}

/** Today's finished attempt, or null if it has not been played yet. */
export const dailyResult = (dateISO = todayISO()) => store.results?.[dateISO] || null

/**
 * Record a finished daily. Only the first attempt of a day counts — replaying to improve
 * a score you have already shared would make the number mean nothing.
 */
export function recordDaily(dateISO, gameId, score, marks, maxPossible = null) {
  if (store.results?.[dateISO]) return dailyResult(dateISO)
  const entry = { gameId, score, marks, maxPossible, number: dailyNumber(dateISO) }
  store = { ...store, results: { ...(store.results || {}), [dateISO]: entry } }
  flush()
  return entry
}

const shiftISO = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + days))
  return t.toISOString().slice(0, 10)
}

/**
 * Consecutive days played, counting back from today.
 *
 * Today not being played yet does not break a streak — otherwise the number would read
 * zero every morning until you got round to it, which is exactly when it should be
 * encouraging you.
 */
export function dailyStreak(dateISO = todayISO()) {
  const res = store.results || {}
  let day = res[dateISO] ? dateISO : shiftISO(dateISO, -1)
  let n = 0
  while (res[day]) { n++; day = shiftISO(day, -1) }
  return n
}

export const dailyPlayedCount = () => Object.keys(store.results || {}).length

/** Hours and minutes until the next puzzle, for the "come back tomorrow" line. */
export function timeUntilNextDaily() {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0)
  const ms = next - now
  return { hours: Math.floor(ms / 3600000), minutes: Math.floor((ms % 3600000) / 60000) }
}

/** Share text in the Wordle shape: a headline number and a grid, no spoilers. */
export function dailyShareText(entry, lang = 'en') {
  const game = GAMES.find((g) => g.id === entry.gameId)
  const title = game ? (game.title[lang] || game.title.en) : entry.gameId
  const grid = (entry.marks || []).map((m) => (m === 'part' ? '🟨' : m ? '🟩' : '🟥')).join('')
  const score = entry.maxPossible ? `${entry.score}/${entry.maxPossible}` : `${entry.score}`
  const head = lang === 'he' ? 'הדרך למשחקים' : 'Road to the Games'
  return `${head} #${entry.number} · ${title} ${score}\n${grid}`
}

export function useDaily() {
  const [, tick] = useState(0)
  useEffect(() => {
    const l = () => tick((n) => n + 1)
    listeners.add(l)
    return () => listeners.delete(l)
  }, [])
  return useCallback(() => dailyResult(), [])
}
