import { useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { TOURNAMENT_BY_ID, SPORT_BY_SLUG, editionsOf, seriesLegsOf, isReal, safeUrl } from '../lib/data'
import { sortTournaments } from '../lib/filters'
import { statusOf, todayISO, formatRange, countdownLabel } from '../lib/dates'
import { downloadIcs } from '../lib/ics'
import { usePrefs } from '../lib/prefs'
import { useT, L, V } from '../lib/i18n'
import TournamentList from '../components/TournamentList'
import { LEVEL_CLASS } from '../components/TournamentCard'


export default function TournamentPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { lang, followed, toggleFollow } = usePrefs()
  const t = useT(lang)
  const td = t.td
  const today = todayISO()
  const x = TOURNAMENT_BY_ID[id]

  const [copied, setCopied] = useState(false)

  const legs = useMemo(() => (x ? sortTournaments(seriesLegsOf(x)) : []), [x])
  const editions = useMemo(() => (x ? editionsOf(x) : []), [x])

  if (!x) {
    return (
      <div className="wrap">
        <div className="empty" style={{ marginTop: 40 }}>
          <h3>{td.notFound}</h3>
          <Link className="btn" to="/">{t.nav.home}</Link>
        </div>
      </div>
    )
  }

  const sport = SPORT_BY_SLUG[x.sportSlug]
  const status = statusOf(x, today)
  const cd = countdownLabel(x, lang, today)
  // 'Several' / 'TBD' are placeholders in the source file, not places. Test the English
  // field — the Hebrew translation of the placeholder ("על\"ה") would slip past otherwise.
  const place = [x.city, isReal(x.location) ? L(x, 'location', lang) : '']
    .filter(Boolean).join(', ')
  const following = followed.includes(x.sportSlug)

  // Only rows with something real to say. A grid full of "TBD" reads as broken data.
  const facts = [
    [td.sport, L(x, 'sport', lang)],
    [td.discipline, L(x, 'discipline', lang)],
    [td.level, L(x, 'level', lang)],
    [td.compLevel, V(x.compLevel, lang)],
    [td.scope, V(x.scope, lang)],
    [td.continent, V(x.continent, lang)],
    [td.region, V(x.region, lang)],
    [td.gender, V(x.gender, lang)],
    [td.ageGroup, V(x.ageGroup, lang)],
    [td.federation, x.federation],
    [td.contFederation, x.contFederation],
    [td.series, x.seriesName],
    [td.seriesStage, x.seriesStage],
    [td.seriesLevel, x.seriesLevel],
    [td.dateStatus, V(x.dateStatus, lang)],
    [td.description, x.description],
  ].filter(([, v]) => isReal(v))

  const copy = () => {
    const url = window.location.href
    const done = () => { setCopied(true); setTimeout(() => setCopied(false), 1600) }
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, done)
    else done()
  }

  return (
    <>
      <div className="wrap" style={{ paddingTop: 16 }}>
        <button className="linkbtn" onClick={() => nav(-1)}>← {lang === 'he' ? 'חזרה' : 'Back'}</button>
      </div>

      <section className={`wrap tdhero ${status === 'live' ? 'live' : ''}`}>
        <Link to={`/sports/${x.sportSlug}`} className="tdlogo" title={L(x, 'sport', lang)}>
          {x.logoUrl && <img src={x.logoUrl} alt="" />}
        </Link>

        <div className="tdmain">
          <div className="tdpills">
            <span className={`pill ${LEVEL_CLASS[x.level] || 'it'}`}>{L(x, 'level', lang)}</span>
            {x.ageGroup && x.ageGroup !== 'Senior' && <span className="pill">{V(x.ageGroup, lang)}</span>}
            {x.gender && <span className="pill">{V(x.gender, lang)}</span>}
            {x.isSeriesFinal && <span className="pill wc">{td.seriesFinal}</span>}
            {status === 'tba' && <span className="pill tba">{t.tba}</span>}
          </div>

          <h1>{L(x, 'name', lang)}</h1>

          <div className="tdwhen">
            <span className="tnum">{formatRange(x, lang)}</span>
            {x.provisional && <span className="prov" title={x.dateStatus}>~</span>}
            {place && <><span className="dim"> · </span><span>{place}</span></>}
            {cd && <span className={`cd ${status === 'live' ? 'live' : ''}`}>{cd}</span>}
          </div>

          <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
            {x.start && (
              <button className="btn primary" onClick={() => downloadIcs(x, `${x.id}.ics`, lang)}>
                🗓 {t.addToCalendar}
              </button>
            )}
            {x.url && <a className="btn" href={safeUrl(x.url)} target="_blank" rel="noopener noreferrer">{td.officialPage} ↗</a>}
            <button className="btn" onClick={copy}>{copied ? `✓ ${td.copied}` : `🔗 ${td.copyLink}`}</button>
            <button className="btn" onClick={() => toggleFollow(x.sportSlug)}>
              {following ? `★ ${t.following}` : `☆ ${t.follow}`}
            </button>
          </div>
        </div>
      </section>

      <main className="wrap">
        {x.isQualifier && (
          <div className="notice qual">
            <span>🎯</span>
            <div>
              <b>{td.qualification}</b>
              {x.qualMethod && <div>{td.method}: {x.qualMethod}</div>}
              {x.quota && <div>{td.quota}: {x.quota}</div>}
              {!x.qualMethod && x.olympic && <div>{V(x.olympic, lang)}</div>}
            </div>
          </div>
        )}

        <div className="sec"><h2>{td.about}</h2></div>
        <dl className="facts">
          {facts.map(([k, v]) => (
            <div key={k} className="fact">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        {legs.length > 0 && (
          <>
            <div className="sec">
              <h2>{td.otherLegs}</h2>
              <span className="count">{legs.length}</span>
            </div>
            <TournamentList items={legs} lang={lang} showSport={false} grouped={false} />
          </>
        )}

        {editions.length > 0 && (
          <>
            <div className="sec">
              <h2>{td.editions}</h2>
              <span className="count">{editions.length}</span>
            </div>
            <TournamentList items={editions} lang={lang} showSport={false} grouped={false} />
          </>
        )}

        <div className="row" style={{ margin: '18px 0 6px' }}>
          <Link className="btn" to={`/sports/${x.sportSlug}`}>
            {sport?.logoUrl && <img src={sport.logoUrl} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />}
            {td.allInSport.replace('%s', L(x, 'sport', lang))}
          </Link>
        </div>
      </main>
    </>
  )
}
