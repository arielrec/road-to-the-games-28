import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TOURNAMENTS, SPORTS } from '../lib/data'
import { filterTournaments, sortTournaments, EMPTY_FILTERS } from '../lib/filters'
import { statusOf, todayISO, countdownLabel, formatRange } from '../lib/dates'
import { usePrefs } from '../lib/prefs'
import { useT, L } from '../lib/i18n'
import FilterBar from '../components/FilterBar'
import TournamentList from '../components/TournamentList'
import TournamentCard from '../components/TournamentCard'

export default function HomePage() {
  const { lang, followed } = usePrefs()
  const t = useT(lang)
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, onlyFollowed: followed.length > 0 })
  const today = todayISO()

  const results = useMemo(
    () => sortTournaments(filterTournaments(TOURNAMENTS, filters, followed, today)),
    [filters, followed, today]
  )

  const live = results.filter((x) => statusOf(x, today) === 'live')
  const tba = results.filter((x) => statusOf(x, today) === 'tba')
  // Everything else in the current view: upcoming normally, past when the user asks for it.
  const upcoming = results.filter((x) => ['upcoming', 'past'].includes(statusOf(x, today)))
  const nextMajor = upcoming.find((x) => x.isMajor)

  const followedSports = SPORTS.filter((s) => followed.includes(s.slug))
  const totalUpcoming = TOURNAMENTS.filter((x) => ['upcoming', 'live'].includes(statusOf(x, today))).length

  return (
    <>
      <section className="wrap hero">
        <h1>{t.appName}</h1>
        <p>{t.tagline}</p>
        <div className="stats">
          <div className="stat"><b className="tnum">{totalUpcoming}</b><small>{t.upcomingCount}</small></div>
          <div className="stat"><b className="tnum">{TOURNAMENTS.length}</b><small>{t.tournaments}</small></div>
          <div className="stat"><b className="tnum">{SPORTS.length}</b><small>{t.nav.sports}</small></div>
          {live.length > 0 && <div className="stat"><b className="tnum" style={{ color: 'var(--live)' }}>{live.length}</b><small>{t.onNow}</small></div>}
        </div>
      </section>

      {followedSports.length > 0 && (
        <div className="wrap" style={{ marginTop: 4 }}>
          <div className="chips">
            {followedSports.map((s) => (
              <Link key={s.slug} to={`/sports/${s.slug}`} className="chip">
                {s.logoUrl && <img src={s.logoUrl} alt="" />} {L(s, 'name', lang)}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="wrap">
        <FilterBar filters={filters} onChange={setFilters} scope={TOURNAMENTS} lang={lang}
                   followed={followed} resultCount={results.length} />
      </div>

      <main className="wrap">
        {nextMajor && filters.when === 'upcoming' && (
          <>
            <div className="sec"><h2>{t.nextMajor}</h2></div>
            <div className="cards"><TournamentCard t={nextMajor} lang={lang} /></div>
          </>
        )}

        {live.length > 0 && (
          <>
            <div className="sec">
              <span className="dot live" /><h2>{t.happeningNow}</h2>
              <span className="count">{live.length}</span>
            </div>
            <TournamentList items={live} lang={lang} grouped={false} />
          </>
        )}

        {upcoming.length > 0 && (
          <>
            <div className="sec">
              <h2>{filters.when === 'past' ? t.past : t.nextUp}</h2>
              <span className="count">{upcoming.length} {t.results}</span>
            </div>
            <TournamentList items={upcoming} lang={lang} />
          </>
        )}

        {tba.length > 0 && (
          <>
            <div className="sec">
              <h2>{lang === 'he' ? 'תאריך טרם נקבע' : 'Dates to be announced'}</h2>
              <span className="count">{tba.length}</span>
            </div>
            <TournamentList items={tba} lang={lang} grouped={false} />
          </>
        )}

        {results.length === 0 && (
          <div className="empty">
            <h3>{filters.onlyFollowed && followed.length ? t.followedEmpty : t.noResults}</h3>
            <p>{filters.onlyFollowed && followed.length ? t.followedEmptyBody : ''}</p>
            {filters.onlyFollowed && (
              <button className="btn primary" onClick={() => setFilters({ ...filters, onlyFollowed: false })}>
                {t.allSports}
              </button>
            )}
          </div>
        )}
      </main>
    </>
  )
}
