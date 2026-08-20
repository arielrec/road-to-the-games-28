import { useMemo, useState } from 'react'
import { TOURNAMENTS } from '../lib/data'
import { filterTournaments, sortTournaments, EMPTY_FILTERS } from '../lib/filters'
import { todayISO, parseISO, MONTHS_LONG, WEEKDAYS, formatRange } from '../lib/dates'
import { usePrefs } from '../lib/prefs'
import { useT, L } from '../lib/i18n'
import { downloadIcs } from '../lib/ics'
import FilterBar from '../components/FilterBar'
import TournamentList from '../components/TournamentList'
import { LEVEL_CLASS } from '../components/TournamentCard'

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const T = {
  en: { starting: 'Starting', ongoing: 'Ongoing', nothing: 'Nothing on this day',
        clear: 'Back to month', export: 'Export month', startsOnly: 'Starts only',
        startsOnlyHint: 'Hide events that merely run through a day' },
  he: { starting: 'מתחילים', ongoing: 'ממשיכים', nothing: 'אין אירועים ביום זה',
        clear: 'חזרה לחודש', export: 'ייצוא החודש', startsOnly: 'רק התחלות',
        startsOnlyHint: 'הסתר אירועים שרק נמשכים ביום זה' },
}

export default function CalendarPage() {
  const { lang, followed } = usePrefs()
  const t = useT(lang)
  const tt = T[lang] || T.en
  const today = todayISO()
  const now = parseISO(today)

  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [view, setView] = useState('month')
  const [selected, setSelected] = useState(null)
  const [startsOnly, setStartsOnly] = useState(true)
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, when: 'all', onlyFollowed: followed.length > 0 })

  const matched = useMemo(
    () => sortTournaments(filterTournaments(TOURNAMENTS, filters, followed, today)),
    [filters, followed, today]
  )

  /**
   * Two maps, not one. Most people care about what *starts* on a day; a 200-day league
   * that merely runs through it is noise — before this split, four long events painted
   * every cell of every month and the grid was unreadable.
   */
  const { starts, running } = useMemo(() => {
    const s = new Map(), r = new Map()
    const add = (m, k, v) => { if (!m.has(k)) m.set(k, []); m.get(k).push(v) }
    for (const x of matched) {
      if (!x.start) continue
      add(s, x.start, x)
      const from = parseISO(x.start)
      const to = parseISO(x.end || x.start)
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const k = iso(d)
        if (k !== x.start) add(r, k, x)
      }
    }
    return { starts: s, running: r }
  }, [matched])

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1)
    const start = new Date(first)
    start.setDate(1 - first.getDay())
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursor])

  const shift = (n) => {
    const d = new Date(cursor.y, cursor.m + n, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
    setSelected(null)
  }
  const monthKey = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`
  const monthLabel = `${MONTHS_LONG[lang][cursor.m]} ${cursor.y}`
  const monthMatches = matched.filter((x) => x.start && x.start.slice(0, 7) === monthKey)

  const dayStarts = selected ? (starts.get(selected) || []) : []
  const dayRunning = selected ? (running.get(selected) || []) : []
  const selDate = selected ? parseISO(selected) : null

  return (
    <>
      <section className="wrap hero" style={{ paddingBottom: 0 }}>
        <h1>{t.nav.calendar}</h1>
      </section>

      <div className="wrap">
        <FilterBar filters={filters} onChange={(f) => { setFilters(f); setSelected(null) }}
                   scope={TOURNAMENTS} lang={lang} followed={followed} showWhen={false}
                   resultCount={matched.length} />
      </div>

      <main className="wrap">
        <div className="calhead">
          <button className="icon-btn" onClick={() => shift(-1)} aria-label="previous month">‹</button>
          <button className="icon-btn" onClick={() => shift(1)} aria-label="next month">›</button>
          <h2>{monthLabel}</h2>
          <button className="linkbtn" onClick={() => { setCursor({ y: now.getFullYear(), m: now.getMonth() }); setSelected(null) }}>
            {t.today}
          </button>
          <label className="switchrow small" title={tt.startsOnlyHint}>
            <input type="checkbox" checked={startsOnly} onChange={() => setStartsOnly((v) => !v)} />
            <span>{tt.startsOnly}</span>
          </label>
          <div className="segmented" style={{ marginInlineStart: 'auto' }}>
            <button className={view === 'month' ? 'on' : ''} onClick={() => setView('month')}>{t.month}</button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>{t.list}</button>
          </div>
        </div>

        {view === 'month' ? (
          <>
            <div className="calgrid">
              {WEEKDAYS[lang].map((d) => <div key={d} className="caldow">{d}</div>)}
              {cells.map((d) => {
                const k = iso(d)
                const st = starts.get(k) || []
                const rn = running.get(k) || []
                const shown = startsOnly ? st : [...st, ...rn]
                const out = d.getMonth() !== cursor.m
                return (
                  <button key={k}
                          className={`calcell ${out ? 'out' : ''} ${k === today ? 'today' : ''} ${selected === k ? 'sel' : ''} ${shown.length ? '' : 'empty'}`}
                          onClick={() => setSelected(selected === k ? null : k)}>
                    <div className="calrow">
                      <span className="d tnum">{d.getDate()}</span>
                      {shown.length > 0 && <span className="cnt tnum">{shown.length}</span>}
                    </div>
                    <div className="bars">
                      {st.slice(0, 4).map((x) => (
                        <span key={x.id} className={`bar ${LEVEL_CLASS[x.level] || 'it'}`} title={L(x, 'name', lang)} />
                      ))}
                      {!startsOnly && rn.slice(0, 2).map((x) => (
                        <span key={x.id} className={`bar run ${LEVEL_CLASS[x.level] || 'it'}`} />
                      ))}
                    </div>
                    {startsOnly && rn.length > 0 && <span className="runhint tnum">+{rn.length}</span>}
                  </button>
                )
              })}
            </div>

            {selected ? (
              <section className="daypanel">
                <div className="sec">
                  <h2>{WEEKDAYS[lang][selDate.getDay()]} {selDate.getDate()} {MONTHS_LONG[lang][selDate.getMonth()]}</h2>
                  <span className="count">{dayStarts.length + dayRunning.length}</span>
                  <button className="linkbtn" style={{ marginInlineStart: 'auto' }}
                          onClick={() => setSelected(null)}>× {tt.clear}</button>
                </div>
                {!dayStarts.length && !dayRunning.length && <div className="empty"><h3>{tt.nothing}</h3></div>}
                {dayStarts.length > 0 && (
                  <>
                    <div className="daylbl">{tt.starting} · {dayStarts.length}</div>
                    <TournamentList items={dayStarts} lang={lang} grouped={false} />
                  </>
                )}
                {dayRunning.length > 0 && (
                  <>
                    <div className="daylbl">{tt.ongoing} · {dayRunning.length}</div>
                    <TournamentList items={dayRunning} lang={lang} grouped={false} />
                  </>
                )}
              </section>
            ) : (
              <>
                <div className="sec">
                  <h2>{monthLabel}</h2>
                  <span className="count">{monthMatches.length} {t.results}</span>
                  {monthMatches.length > 0 && (
                    <button className="linkbtn" style={{ marginInlineStart: 'auto' }}
                            onClick={() => downloadIcs(monthMatches, `${monthKey}.ics`, lang)}>
                      🗓 {tt.export}
                    </button>
                  )}
                </div>
                <TournamentList items={monthMatches} lang={lang} grouped={false} />
              </>
            )}
          </>
        ) : (
          <TournamentList items={matched} lang={lang} />
        )}
      </main>
    </>
  )
}
