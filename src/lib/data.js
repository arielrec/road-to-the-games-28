import tournaments from '../data/tournaments.json'
import sports from '../data/sports.json'
import meta from '../data/meta.json'

const logoModules = import.meta.glob('../assets/logos/*.png', { eager: true, import: 'default' })
const LOGOS = Object.fromEntries(
  Object.entries(logoModules).map(([path, url]) => [path.split('/').pop(), url])
)

export const SPORTS = sports.map((s) => ({ ...s, logoUrl: LOGOS[s.logo] }))
export const META = meta
export const FACETS = meta.facets
export const SPORT_BY_SLUG = Object.fromEntries(SPORTS.map((s) => [s.slug, s]))

export const LEVELS = [
  'World Championship',
  'Continental Championship',
  'World Junior Championship',
  'Continental Junior Championship',
  'International Tournament',
]

const MAJOR_LEVELS = new Set(['World Championship', 'Continental Championship'])

/** Events that feed the LA28 qualification pathway. */
export const OLYMPIC_QUALIFIER = new Set(['Direct Qualifier', 'Olympic Ranking', 'Qualification Pathway'])

/** A date the app should not present as settled. */
export const isProvisional = (t) => !!t.dateStatus && t.dateStatus !== 'Confirmed'

export const TOURNAMENTS = tournaments.map((t) => ({
  ...t,
  logoUrl: SPORT_BY_SLUG[t.sportSlug]?.logoUrl,
  isMajor: MAJOR_LEVELS.has(t.level),
  isQualifier: OLYMPIC_QUALIFIER.has(t.olympic),
  provisional: isProvisional(t),
}))

export const QUALIFIERS = TOURNAMENTS.filter((t) => t.isQualifier)

export const TOURNAMENT_BY_ID = Object.fromEntries(TOURNAMENTS.map((t) => [t.id, t]))

/**
 * Editions of the *same* competition in other years. The year is the only part of the
 * name allowed to differ — everything that defines the competition (sport, discipline,
 * level, gender, age group) has to match, or "European Championship" would collapse
 * every sport into one pile.
 */
const editionKey = (t) =>
  [t.sportSlug, t.discipline, t.level, t.gender, t.ageGroup,
   t.name.replace(/\d{4}(\/\d{2,4})?/g, '').replace(/\s+/g, ' ').trim().toLowerCase()].join('|')

const EDITIONS = new Map()
for (const t of TOURNAMENTS) {
  const k = editionKey(t)
  if (!EDITIONS.has(k)) EDITIONS.set(k, [])
  EDITIONS.get(k).push(t)
}

/** Other years of this same competition, oldest first. */
export const editionsOf = (t) =>
  (EDITIONS.get(editionKey(t)) || [])
    .filter((x) => x.id !== t.id)
    .sort((a, b) => (a.start || '') .localeCompare(b.start || ''))

/** The other stops of the same series in the same season. */
export const seriesLegsOf = (t) =>
  !t.seriesName ? [] : TOURNAMENTS.filter(
    (x) => x.id !== t.id && x.seriesName === t.seriesName && x.year === t.year &&
           (!t.gender || !x.gender || x.gender === t.gender)
  )


/** Placeholder values the source file uses for "not a real place / not known yet". */
export const PLACEHOLDERS = new Set(['', 'TBD', 'TBA', 'False', 'Several', 'Multiple'])

/**
 * True when a field names something real. Always test the English source value —
 * the Hebrew translation of a placeholder would slip past a check on the localised text.
 */
export const isReal = (v) => !!v && !PLACEHOLDERS.has(String(v))


/**
 * Only ever hand http(s) to an href.
 *
 * Every one of the 706 links in the workbook is https today, so this changes nothing
 * now. It exists because the links come from a spreadsheet that gets edited by hand:
 * one cell containing `javascript:...` would otherwise become script execution on click,
 * and a `data:text/html` one a phishing page on your own origin. Cheap insurance against
 * a future edit nobody would think to review.
 */
export function safeUrl(url) {
  if (!url) return null
  try {
    const u = new URL(String(url).trim(), window.location.href)
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : null
  } catch {
    return null
  }
}
