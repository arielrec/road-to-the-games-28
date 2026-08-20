import { TOURNAMENTS } from './data'
import { statusOf, todayISO } from './dates'

/**
 * The filter model. The LA28 master carries ten filterable dimensions, so facets live in
 * one object rather than as named fields — adding a dimension means adding it to FACET_DEFS
 * and nothing else.
 */
export const FACET_DEFS = [
  { key: 'compLevel',  label: { en: 'Level',       he: 'רמה' } },
  { key: 'ageGroup',   label: { en: 'Age group',   he: 'קבוצת גיל' } },
  { key: 'continent',  label: { en: 'Continent',   he: 'יבשת' } },
  { key: 'scope',      label: { en: 'Scope',       he: 'היקף' } },
  { key: 'federation', label: { en: 'Federation',  he: 'איגוד' } },
  { key: 'seriesName', label: { en: 'Series',      he: 'סדרה' } },
  { key: 'location',   label: { en: 'Country',     he: 'מדינה' } },
  { key: 'dateStatus', label: { en: 'Date status', he: 'סטטוס תאריך' } },
  { key: 'olympic',    label: { en: 'LA28',        he: 'LA28' } },
]

export const EMPTY_FILTERS = {
  q: '',
  when: 'upcoming',      // upcoming | live | past | all
  sports: [],            // sport slugs
  disciplines: [],       // source-sport names, within a sport
  years: [],
  facets: {},            // { compLevel: [...], continent: [...], ... }
  onlyFollowed: false,
  onlyQualifiers: false,
}

/** One filter engine, shared by Home, Calendar, Sport pages and Road to LA28. */
export function filterTournaments(all = TOURNAMENTS, f = EMPTY_FILTERS, followed = [], today = todayISO()) {
  const q = f.q?.trim().toLowerCase()
  const sports = new Set(f.sports || [])
  const disciplines = new Set(f.disciplines || [])
  const years = new Set((f.years || []).map(Number))
  const follow = new Set(followed || [])
  const facetPairs = Object.entries(f.facets || {}).filter(([, v]) => v && v.length)

  return all.filter((t) => {
    if (f.onlyFollowed && follow.size && !follow.has(t.sportSlug)) return false
    if (f.onlyQualifiers && !t.isQualifier) return false
    if (sports.size && !sports.has(t.sportSlug)) return false
    if (disciplines.size && !disciplines.has(t.sourceSport)) return false
    if (years.size && !years.has(t.year)) return false
    for (const [key, vals] of facetPairs) if (!vals.includes(t[key])) return false
    if (q && !t._h.includes(q)) return false

    const st = statusOf(t, today)
    switch (f.when) {
      case 'upcoming': return st === 'upcoming' || st === 'live' || st === 'tba'
      case 'live':     return st === 'live'
      case 'past':     return st === 'past'
      default:         return true
    }
  })
}

export const byDate = (a, b) =>
  (a.start || '9999-99-99').localeCompare(b.start || '9999-99-99') || a.sport.localeCompare(b.sport)
export const sortTournaments = (list) => [...list].sort(byDate)

/** Reachable values for every facet, given the current result set. */
export function facetsFor(list, lang = 'en') {
  const out = {}
  for (const { key } of FACET_DEFS) {
    const m = new Map()
    for (const t of list) {
      const v = t[key]
      if (v) m.set(v, (m.get(v) || 0) + 1)
    }
    out[key] = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }
  out.years = [...new Set(list.map((t) => t.year).filter(Boolean))].sort()
  out.sports = (() => {
    const m = new Map()
    for (const t of list) m.set(t.sportSlug, (m.get(t.sportSlug) || 0) + 1)
    return m
  })()
  return out
}

export const groupByMonth = (list) => {
  const out = new Map()
  for (const t of list) {
    const key = t.start ? t.start.slice(0, 7) : 'tba'
    if (!out.has(key)) out.set(key, [])
    out.get(key).push(t)
  }
  return out
}

export const activeFilterCount = (f) =>
  (f.q ? 1 : 0) + (f.sports?.length || 0) + (f.disciplines?.length || 0) + (f.years?.length || 0) +
  Object.values(f.facets || {}).reduce((n, v) => n + (v?.length || 0), 0) +
  (f.onlyQualifiers ? 1 : 0)

export const toggleFacet = (f, key, value) => {
  const cur = f.facets?.[key] || []
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
  const facets = { ...f.facets, [key]: next }
  if (!next.length) delete facets[key]
  return { ...f, facets }
}
