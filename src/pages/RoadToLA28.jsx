import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { QUALIFIERS, SPORT_BY_SLUG, META , safeUrl } from '../lib/data'
import { sortTournaments } from '../lib/filters'
import { statusOf, todayISO, formatRange, countdownLabel } from '../lib/dates'
import { usePrefs } from '../lib/prefs'
import { L } from '../lib/i18n'
import { downloadIcs } from '../lib/ics'

const T = {
  en: { title: 'Road to LA28', lede: 'Every event that feeds Olympic qualification.',
        direct: 'Direct Qualifier', ranking: 'Olympic Ranking', pathway: 'Qualification Pathway',
        events: 'events', sports: 'sports', quota: 'Quota', how: 'How it counts',
        all: 'All', upcoming: 'Upcoming', bySport: 'By sport', export: 'Export',
        none: 'No qualification events match.', tba: 'Date TBA' },
  he: { title: 'הדרך ל-LA28', lede: 'כל האירועים שמזכים בהעפלה אולימפית.',
        direct: 'מעפיל ישיר', ranking: 'דירוג אולימפי', pathway: 'מסלול העפלה',
        events: 'אירועים', sports: 'ענפים', quota: 'מכסה', how: 'כיצד נספר',
        all: 'הכל', upcoming: 'קרובים', bySport: 'לפי ענף', export: 'ייצוא',
        none: 'אין אירועי העפלה מתאימים.', tba: 'תאריך טרם נקבע' },
}

const KIND = {
  'Direct Qualifier': { cls: 'wc', key: 'direct' },
  'Olympic Ranking': { cls: 'cc', key: 'ranking' },
  'Qualification Pathway': { cls: 'wjc', key: 'pathway' },
}

export default function RoadToLA28() {
  const { lang } = usePrefs()
  const t = T[lang] || T.en
  const today = todayISO()
  const [when, setWhen] = useState('upcoming')
  const [kind, setKind] = useState(null)

  const list = useMemo(() => {
    let l = QUALIFIERS
    if (when === 'upcoming') l = l.filter((x) => statusOf(x, today) !== 'past')
    if (kind) l = l.filter((x) => x.olympic === kind)
    return sortTournaments(l)
  }, [when, kind, today])

  const bySport = useMemo(() => {
    const m = new Map()
    for (const x of list) {
      if (!m.has(x.sportSlug)) m.set(x.sportSlug, [])
      m.get(x.sportSlug).push(x)
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length)
  }, [list])

  const counts = useMemo(() => {
    const c = {}
    for (const x of QUALIFIERS) c[x.olympic] = (c[x.olympic] || 0) + 1
    return c
  }, [])

  return (
    <>
      <section className="wrap hero">
        <h1>🎯 {t.title}</h1>
        <p>{t.lede}</p>
        <div className="stats">
          <div className="stat"><b className="tnum">{QUALIFIERS.length}</b><small>{t.events}</small></div>
          <div className="stat"><b className="tnum">{new Set(QUALIFIERS.map((x) => x.sportSlug)).size}</b><small>{t.sports}</small></div>
          {Object.entries(counts).map(([k, n]) => (
            <div className="stat" key={k}><b className="tnum">{n}</b><small>{t[KIND[k]?.key] || k}</small></div>
          ))}
        </div>
      </section>

      <div className="wrap">
        <div className="filterbar">
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <div className="segmented">
              <button className={when === 'upcoming' ? 'on' : ''} onClick={() => setWhen('upcoming')}>{t.upcoming}</button>
              <button className={when === 'all' ? 'on' : ''} onClick={() => setWhen('all')}>{t.all}</button>
            </div>
            <div className="chips">
              {Object.keys(counts).map((k) => (
                <button key={k} className={`chip ${kind === k ? 'on' : ''}`}
                        onClick={() => setKind(kind === k ? null : k)}>
                  {t[KIND[k]?.key] || k} <span className="n">{counts[k]}</span>
                </button>
              ))}
            </div>
            <button className="btn" onClick={() => downloadIcs(list, 'road-to-la28.ics', lang)}>
              🗓 {t.export}
            </button>
            <span className="dim tnum" style={{ marginInlineStart: 'auto' }}>{list.length}</span>
          </div>
        </div>
      </div>

      <main className="wrap">
        {!list.length && <div className="empty"><h3>{t.none}</h3></div>}

        {bySport.map(([slug, items]) => {
          const sport = SPORT_BY_SLUG[slug]
          return (
            <section key={slug} className="qsport">
              <div className="qhead">
                {sport?.logoUrl && <img src={sport.logoUrl} alt="" />}
                <Link to={`/sports/${slug}`}><h2>{sport ? L(sport, 'name', lang) : slug}</h2></Link>
                <span className="count tnum">{items.length}</span>
              </div>
              <div className="qrows">
                {items.map((x) => (
                  <div key={x.id} className={`qrow ${statusOf(x, today) === 'past' ? 'past' : ''}`}>
                    <div className="qmain">
                      <div className="qname">
                        {L(x, 'name', lang)}
                        {x.url && <a className="iconlink" href={safeUrl(x.url)} target="_blank" rel="noopener noreferrer">↗</a>}
                      </div>
                      <div className="qmeta">
                        <span className={`pill ${KIND[x.olympic]?.cls || 'it'}`}>
                          {t[KIND[x.olympic]?.key] || x.olympic}
                        </span>
                        {x.quota && <span className="pill">{t.quota}: {x.quota}</span>}
                        <span>{[x.city, L(x, 'location', lang)].filter(Boolean).join(', ')}</span>
                      </div>
                      {x.qualMethod && <div className="qhow"><b>{t.how}:</b> {x.qualMethod}</div>}
                    </div>
                    <div className="qwhen">
                      <div className="tnum">{x.start ? formatRange(x, lang) : t.tba}</div>
                      <div className="dim">{countdownLabel(x, lang)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </main>
    </>
  )
}
