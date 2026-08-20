import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { SPORTS, TOURNAMENTS } from '../lib/data'
import { statusOf, todayISO } from '../lib/dates'
import { usePrefs } from '../lib/prefs'
import { useT, L } from '../lib/i18n'

export default function SportsPage() {
  const { lang, followed, toggleFollow } = usePrefs()
  const t = useT(lang)
  const [q, setQ] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)
  const today = todayISO()

  const upcomingBySport = useMemo(() => {
    const m = {}
    for (const x of TOURNAMENTS) {
      const s = statusOf(x, today)
      if (s === 'upcoming' || s === 'live') m[x.sportSlug] = (m[x.sportSlug] || 0) + 1
    }
    return m
  }, [today])

  const list = SPORTS.filter((s) => {
    if (onlyMine && !followed.includes(s.slug)) return false
    if (!q.trim()) return true
    const needle = q.trim().toLowerCase()
    return s.name.toLowerCase().includes(needle) || (s.nameHe || '').includes(q.trim())
  })

  return (
    <>
      <section className="wrap hero" style={{ paddingBottom: 8 }}>
        <h1>{t.nav.sports}</h1>
        <p>{t.pickSports} — {t.follow.toLowerCase()} ★</p>
      </section>

      <div className="wrap">
        <div className="filterbar">
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <div className="searchbox">
              <input type="search" value={q} placeholder={t.nav.sports} onChange={(e) => setQ(e.target.value)} />
            </div>
            {followed.length > 0 && (
              <button className={`chip ${onlyMine ? 'on' : ''}`} onClick={() => setOnlyMine((v) => !v)}>
                ★ {t.onlyMySports} <span className="n">{followed.length}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="wrap">
        <div className="sportgrid" style={{ marginTop: 16 }}>
          {list.map((s) => {
            const up = upcomingBySport[s.slug] || 0
            const on = followed.includes(s.slug)
            return (
              <div key={s.slug} style={{ position: 'relative' }}>
                <Link to={`/sports/${s.slug}`} className="sportcard">
                  {s.logoUrl && <img src={s.logoUrl} alt="" loading="lazy" />}
                  <div className="nm">{L(s, 'name', lang)}</div>
                  <div className="ct">
                    {up > 0 ? <><b>{up}</b> {t.upcomingCount}</> : <span>{s.count} {t.tournaments}</span>}
                  </div>
                  {s.disciplines.length > 0 && (
                    <div className="discct">{s.disciplines.length} {lang === 'he' ? 'תת-ענפים' : 'disciplines'}</div>
                  )}
                </Link>
                <button
                  className={`starbtn ${on ? 'on' : ''}`}
                  aria-label={on ? t.following : t.follow}
                  onClick={() => toggleFollow(s.slug)}
                >
                  {on ? '★' : '☆'}
                </button>
              </div>
            )
          })}
        </div>
        {list.length === 0 && <div className="empty"><h3>{t.noResults}</h3></div>}
      </main>
    </>
  )
}
