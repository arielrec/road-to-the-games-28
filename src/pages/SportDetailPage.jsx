import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SPORT_BY_SLUG, TOURNAMENTS } from '../lib/data'
import { filterTournaments, sortTournaments, EMPTY_FILTERS } from '../lib/filters'
import { statusOf, todayISO, formatRange } from '../lib/dates'
import { usePrefs } from '../lib/prefs'
import { useT, L } from '../lib/i18n'
import FilterBar from '../components/FilterBar'
import TournamentList from '../components/TournamentList'
import { downloadIcs } from '../lib/ics'
import { safeUrl } from '../lib/data'

export default function SportDetailPage() {
  const { slug } = useParams()
  const { lang, followed, toggleFollow } = usePrefs()
  const t = useT(lang)
  const today = todayISO()
  const sport = SPORT_BY_SLUG[slug]

  const scope = useMemo(() => TOURNAMENTS.filter((x) => x.sportSlug === slug), [slug])
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS })

  const results = useMemo(
    () => sortTournaments(filterTournaments(scope, filters, [], today)),
    [scope, filters, today]
  )

  if (!sport) {
    return <div className="wrap"><div className="empty" style={{ marginTop: 40 }}><h3>Sport not found</h3><Link className="btn" to="/sports">{t.backToSports}</Link></div></div>
  }

  const upcoming = scope.filter((x) => ['upcoming', 'live'].includes(statusOf(x, today)))
  const past = sortTournaments(scope.filter((x) => statusOf(x, today) === 'past')).reverse()
  const lastEdition = past[0]
  const on = followed.includes(sport.slug)

  return (
    <>
      <div className="wrap" style={{ paddingTop: 16 }}>
        <Link to="/sports" className="linkbtn">← {t.backToSports}</Link>
      </div>

      <section className="wrap sporthero">
        {sport.logoUrl && <img src={sport.logoUrl} alt="" />}
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>{L(sport, 'name', lang)}</h1>
          <div className="sub">
            {sport.count} {t.tournaments} · <b style={{ color: upcoming.length ? 'var(--live)' : 'var(--text-3)' }}>{upcoming.length}</b> {t.upcomingCount}
          </div>
        </div>
        <div className="row">
          <button className={`btn ${on ? '' : 'primary'}`} onClick={() => toggleFollow(sport.slug)}>
            {on ? `★ ${t.following}` : `☆ ${t.follow}`}
          </button>
          <button className="btn" onClick={() => downloadIcs(results, `${sport.slug}.ics`, lang)}>
            🗓 {lang === 'he' ? 'ייצוא ליומן' : 'Export'}
          </button>
          {sport.links[0] && (
            <a className="btn" href={safeUrl(sport.links[0])} target="_blank" rel="noopener noreferrer">{t.federation} ↗</a>
          )}
        </div>
      </section>

      {upcoming.length === 0 && (
        <div className="wrap" style={{ marginTop: 12 }}>
          <div className="notice">
            <span>⏳</span>
            <div>
              <b>{t.noUpcoming}.</b>{' '}
              {lastEdition && <>{t.lastEdition}: {L(lastEdition, 'name', lang)} — {formatRange(lastEdition, lang)}.</>}
            </div>
          </div>
        </div>
      )}

      {sport.disciplines.length > 0 && (
        <div className="wrap">
          <div className="chips" style={{ marginTop: 14 }}>
            {sport.disciplines.map((d) => {
              const active = (filters.disciplines || []).includes(d.source)
              return (
                <button key={d.slug} className={`chip ${active ? 'on' : ''}`}
                        onClick={() => setFilters((f) => ({
                          ...f,
                          disciplines: active
                            ? f.disciplines.filter((x) => x !== d.source)
                            : [...(f.disciplines || []), d.source],
                        }))}>
                  {lang === 'he' ? d.nameHe : d.name} <span className="n">{d.count}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="wrap">
        <FilterBar filters={filters} onChange={setFilters} scope={scope} lang={lang}
                   hide={['sports']} resultCount={results.length} />
      </div>

      <main className="wrap">
        <div className="sec"><h2>{filters.when === 'past' ? t.past : t.upcoming}</h2><span className="count">{results.length} {t.results}</span></div>
        <TournamentList items={results} lang={lang} showSport={false} />
      </main>
    </>
  )
}
