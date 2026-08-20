import { Link } from 'react-router-dom'
import { L } from '../lib/i18n'
import { formatRange, countdownLabel, statusOf } from '../lib/dates'
import { downloadIcs } from '../lib/ics'
import { safeUrl } from '../lib/data'
import { isReal } from '../lib/data'

export const LEVEL_CLASS = {
  'World Championship': 'wc',
  'Continental Championship': 'cc',
  'World Junior Championship': 'wjc',
  'Continental Junior Championship': 'cjc',
  'International Tournament': 'it',
}

export default function TournamentCard({ t, lang = 'en', showSport = true }) {
  const status = statusOf(t)
  const cd = countdownLabel(t, lang)
  const cls = LEVEL_CLASS[t.level] || 'it'
  const place = [t.city, isReal(t.location) ? L(t, 'location', lang) : ''].filter(Boolean).join(', ')

  return (
    <article className={`card ${status === 'live' ? 'live' : ''} ${t.isMajor ? 'major' : ''}`}>
      <Link to={`/t/${t.id}`} className="logo" title={L(t, 'name', lang)}>
        {t.logoUrl && <img src={t.logoUrl} alt="" loading="lazy" />}
      </Link>

      <div className="stack">
        <div className="title">
          <Link to={`/t/${t.id}`}>{L(t, 'name', lang)}</Link>
          {t.isQualifier && <span className="qualdot" title="LA28 pathway">🎯</span>}
        </div>
        <div className="sub">
          {showSport && <Link to={`/sports/${t.sportSlug}`}>{L(t, 'sport', lang)}</Link>}
          {showSport && t.discipline && <span className="disc">{L(t, 'discipline', lang)}</span>}
          {showSport && <span className="dim">·</span>}
          <span>{place}</span>
          <span className={`pill ${cls}`}>{L(t, 'level', lang)}</span>
          {t.ageGroup && t.ageGroup !== 'Senior' && <span className="pill">{t.ageGroup}</span>}
          {t.seriesName && <span className="pill">{t.seriesName}</span>}
          {status === 'tba' && <span className="pill tba">{lang === 'he' ? 'תאריך טרם נקבע' : 'TBA'}</span>}
        </div>
      </div>

      <div className="when">
        <div className="date tnum">
          {formatRange(t, lang)}
          {t.provisional && <span className="prov" title={t.dateStatus}>~</span>}
        </div>
        {cd && <div className={`cd ${status === 'live' ? 'live' : ''}`}>{cd}</div>}
        <div className="cardacts">
          <Link className="iconlink" to={`/t/${t.id}`}
                title={lang === 'he' ? 'פרטי האירוע' : 'Event details'}>›</Link>
          {t.start && (
            <button className="iconlink" title={lang === 'he' ? 'הוסף ליומן' : 'Add to calendar'}
                    onClick={() => downloadIcs(t, `${t.id}.ics`, lang)}>🗓</button>
          )}
          {t.url && (
            <a className="iconlink" href={safeUrl(t.url)} target="_blank" rel="noopener noreferrer"
               title={lang === 'he' ? 'האתר הרשמי' : 'Official page'}>↗</a>
          )}
        </div>
      </div>
    </article>
  )
}
