import D from '../data/draft.json'
import { makeRng, randInt, sample, shuffle } from '../lib/seed'
import { maxAssignment } from '../lib/assignment'

export const CANDIDATE_OPTIONS = [4, 6, 8, 10]
export const DEFAULT_CANDIDATES = 8   // 8 gets flat rounds to 2% (career) / 7% (edition) on a pure random draw
export const ROUND_OPTIONS = [5, 8, 10]
export const DEFAULT_ROUNDS = 5

export const CATEGORIES = D.categories
export const POINT_TABLE = D.pointTable

/**
 * One engine, three formats. They share the point table, the data and the UI —
 * only the card and the pool filter differ.
 */
/**
 * What a card reveals before you pick. Sport and era are the real signal (Judo averages
 * 12.7 points a head, Basketball 1.0), so hiding them is the genuine hard mode.
 */
export const DIFFICULTIES = [
  { id: 'normal', label: { en: 'Normal', he: 'רגיל' },
    hint: { en: 'Cards show sport and year.', he: 'הכרטיסים מציגים ענף ושנה.' } },
  { id: 'hard', label: { en: 'Hard', he: 'קשה' },
    hint: { en: 'Name only — no sport, no year, nothing but the athlete.',
            he: 'שם בלבד — בלי ענף, בלי שנה.' } },
]

export const FORMATS = [
  { id: 'career',  label: { en: 'Career',  he: 'קריירה' },
    hint: { en: 'One card per athlete, scored on their best result ever plus 2 per extra Games.',
            he: 'כרטיס לכל ספורטאי, לפי התוצאה הטובה ביותר בקריירה ועוד 2 לכל אולימפיאדה נוספת.' } },
  { id: 'edition', label: { en: 'Edition', he: 'מהדורה' },
    hint: { en: 'One card per athlete per Games — Ze\'evi 2004 and Ze\'evi 2008 are different picks.',
            he: 'כרטיס לכל ספורטאי בכל אולימפיאדה — זאבי 2004 וזאבי 2008 הם בחירות שונות.' } },
  { id: 'rolling', label: { en: 'Rolling', he: 'מתגלגל' },
    hint: { en: 'Each round draws a year and a sport category; you draft only from that slot.',
            he: 'בכל סיבוב מוגרלים שנה וקטגוריית ספורט, ואתם בוחרים רק מתוכה.' } },
  { id: 'squad', label: { en: 'Squad', he: 'סגל' }, fixedRounds: 4,
    hint: { en: 'Fill one slot per category. Combat is boom-or-bust (15 medallists, median 3) while Team & Racket is flat (median 11, no medallists) — so take the safe pick early or hold out for the big one.',
            he: 'מלאו משבצת אחת לכל קטגוריה. לחימה היא הכל או כלום, קבוצתי ומחבט יציבה — האם לקחת בטוח או להמתין לגדול?' } },
]

/**
 * Career and Squad draw from athletes[] (scored on a whole career); Edition and Rolling
 * draw from editions[] (scored on one Games). Getting this wrong yields NaN, not a wrong
 * number — the two pools have different score fields.
 */
const scoreOf = (card, format) =>
  (format === 'career' || format === 'squad' ? card.career : card.pts)

/**
 * Draw weight. Scoring stays honest — most Israeli Olympians genuinely did not place, so
 * 30% of the pool scores 1 — but a uniform draw then puts 2.5 duds on every 8-card board
 * and it reads as broken. Weighting by sqrt(score) tilts the board without distorting the
 * scores themselves: measured over 60k boards it moves duds 2.5 -> 1.6, strong cards
 * 1.1 -> 1.9, leaving a board with real texture rather than a wall of ones.
 *
 * sqrt, not linear: weighting by score itself over-represents medallists so heavily that
 * the average best card approaches a medal every round.
 */
const drawWeight = (card, format) => Math.sqrt(Math.max(0, scoreOf(card, format))) + 1

/** Weighted sample without replacement, deterministic for a given rng. */
function weightedSample(rng, pool, k, format, exclude = new Set(), keyOf = (c) => c) {
  const items = pool.filter((c) => !exclude.has(keyOf(c)))
  const picked = []
  const w = items.map((c) => drawWeight(c, format))
  let total = w.reduce((a, b) => a + b, 0)
  for (let n = 0; n < k && items.length; n++) {
    let r = rng() * total
    let i = 0
    while (i < items.length - 1 && (r -= w[i]) > 0) i++
    picked.push(items[i])
    total -= w[i]
    items.splice(i, 1)
    w.splice(i, 1)
  }
  return picked
}

/**
 * A round needs a right answer worth finding. Drawn purely at random, 14% of career
 * rounds and 27% of edition rounds have no candidate scoring above 3 — the player is
 * choosing between four also-rans, which is noise rather than a decision.
 *
 * So one card per round is drawn from the "strong" pool (8th place or better) and the
 * rest uniformly. Position is shuffled afterwards, so the guarantee leaks nothing.
 * Rolling is exempt: its pool is a single (year, category) slot, and a weak slot is an
 * honest part of that format.
 */
const STRONG = 6

/** Rolling slots that contain at least one card worth finding. */
const PLAYABLE_CELLS = D.cells.filter(([year, cat]) =>
  D.editions.some((e) => e.year === year && e.cat === cat && e.pts >= STRONG))

/** Build the whole run up front so a card is never offered twice. */
function buildRun(runSeed, opts) {
  const format = opts.format || 'career'
  const cands = opts.candidates || DEFAULT_CANDIDATES
  const rounds = format === 'squad' ? 4 : (opts.rounds || DEFAULT_ROUNDS)
  const rng = makeRng(`${runSeed}|${format}|${rounds}|${cands}`)
  const picks = []

  if (format === 'squad') {
    // One slot per category. The categories have genuinely different shapes:
    //   Combat, Strength & Target  median 3, top-10% 26, 15 medallists  (boom or bust)
    //   Team & Racket              median 11, top-10% 11, 0 medallists  (flat and safe)
    //   Water                      median 3,  top-10% 14, best 42
    //   Athletics/Gym/Cycling      median 1,  top-10% 10
    // so the real decision is whether to bank a safe Team & Racket pick now or keep the
    // slot open hoping for a judoka.
    //
    // Which category a pick consumes is the PLAYER'S choice, so the run cannot pre-decide
    // it. Instead every board carries at least one card from each of the four categories —
    // that guarantees a legal pick however the player has filled their slots.
    for (let r = 0; r < 4; r++) {
      const cards = []
      for (let cat = 0; cat < 4; cat++) {
        const pool = D.athletes.filter((a) => a.cat === cat)
        cards.push(...weightedSample(rng, pool, 1, format))
      }
      const seen = new Set(cards.map((c) => c.aid))
      cards.push(...weightedSample(rng, D.athletes, cands - cards.length, format, seen, (c) => c.aid))
      picks.push({ cards: shuffle(rng, cards), slot: null })
    }
    // Best possible score is an assignment: 4 boards x 4 categories, each board
    // contributing its best card in whichever category it is assigned to.
    const table = picks.map((p) =>
      [0, 1, 2, 3].map((cat) => {
        const inCat = p.cards.filter((c) => c.cat === cat)
        return inCat.length ? Math.max(...inCat.map((c) => c.career)) : 0
      }))
    const { total } = maxAssignment(table)
    return { picks, best: total, format, rounds: 4, squad: true }
  }

  if (format === 'rolling') {
    // Two filters. The converter already dropped (year x category) cells with fewer than
    // 4 athletes. Here we also drop slots containing nothing worth picking — a 1968
    // Combat slot of four also-rans is a dead round however honest it is.
    // Drawing without replacement stops a slot repeating within a run.
    const cells = sample(rng, PLAYABLE_CELLS, Math.min(rounds, PLAYABLE_CELLS.length))
    for (const [year, cat] of cells) {
      const pool = D.editions.filter((e) => e.year === year && e.cat === cat)
      // A cell can hold more than 4 athletes, so the strong card has to be drawn
      // deliberately or a good slot can still produce a dead round.
      const strong = pool.filter((e) => e.pts >= STRONG)
      const cards = strong.length ? [strong[randInt(rng, strong.length)]] : []
      const seen = new Set(cards.map((c) => `${c.aid}:${c.year}`))
      cards.push(...weightedSample(rng, pool, cands - cards.length, format, seen,
                                   (c) => `${c.aid}:${c.year}`))
      picks.push({ cards: shuffle(rng, cards), slot: { year, cat } })
    }
  } else {
    const pool = format === 'career' ? D.athletes : D.editions
    const strong = pool.filter((c) => scoreOf(c, format) >= STRONG)
    const keyOf = (c) => (format === 'career' ? c.aid : `${c.aid}:${c.year}`)
    const taken = new Set()

    for (let r = 0; r < rounds; r++) {
      const cards = weightedSample(rng, pool, cands, format, taken, keyOf)
      cards.forEach((c) => taken.add(keyOf(c)))
      picks.push({ cards: shuffle(rng, cards), slot: null })
    }
  }
  const best = picks.reduce((s, p) => s + Math.max(...p.cards.map((c) => scoreOf(c, format))), 0)
  return { picks, best, format, rounds: picks.length }
}

const cache = new Map()
function getRun(runSeed, opts) {
  const key = `${runSeed}|${opts.format}|${opts.rounds}|${opts.candidates}`
  if (!cache.has(key)) cache.set(key, buildRun(runSeed, opts))
  if (cache.size > 20) cache.delete(cache.keys().next().value)
  return cache.get(key)
}

export function makeQuestion(seed, round = 0, opts = {}) {
  const run = getRun(opts.runSeed || seed, opts)
  const p = run.picks[Math.min(round, run.picks.length - 1)]
  return {
    cards: p.cards,
    slot: p.slot,
    format: run.format,
    run,
    context: p.slot ? { sport: CATEGORIES[p.slot.cat].name, year: p.slot.year } : null,
  }
}

export const maxScore = (opts) => (opts?.runSeed ? getRun(opts.runSeed, opts).best : null)
export const cardScore = scoreOf

export const draft = {
  id: 'draft',
  icon: '🇮🇱',
  scoring: 'rounds',
  rounds: DEFAULT_ROUNDS,
  roundOptions: ROUND_OPTIONS,
  formats: FORMATS,
  difficulties: DIFFICULTIES,
  candidateOptions: CANDIDATE_OPTIONS,
  defaultCandidates: DEFAULT_CANDIDATES,
  categories: CATEGORIES,
  title: { en: 'The Draft', he: 'הדראפט' },
  blurb: { en: 'Build an Israeli Olympic team.', he: 'בנו נבחרת אולימפית ישראלית.' },
  prompt: { en: 'Pick one for your team', he: 'בחרו אחד לנבחרת שלכם' },
  makeQuestion,
  maxScore,
  cardScore,
  stats: { athletes: D.athletes.length, editions: D.editions.length, cells: D.cells.length },
}
