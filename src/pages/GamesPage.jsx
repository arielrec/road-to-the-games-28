import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GAMES, COMING_SOON } from '../games/registry'
import { overallFor, useGameStats } from '../lib/gameStats'
import { dailyPuzzle, dailyResult, dailyStreak, dailyShareText, timeUntilNextDaily, useDaily } from '../lib/daily'
import { usePrefs } from '../lib/prefs'
import { useT } from '../lib/i18n'

export default function GamesPage() {
  const { lang } = usePrefs()
  const t = useT(lang)
  useGameStats() // re-render when a score is recorded
  useDaily()     // ...and when today's daily is finished

  const puzzle = dailyPuzzle()
  const done = dailyResult(puzzle.date)
  const streak = dailyStreak(puzzle.date)
  const until = timeUntilNextDaily()
  const he = lang === 'he'
  const [copied, setCopied] = useState(false)
  const shareDaily = () => {
    navigator.clipboard?.writeText(dailyShareText(done, lang)).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }

  return (
    <>
      <section className="wrap hero">
        <h1>{t.gamesTitle}</h1>
        <p>{lang === 'he' ? 'למדו את ההיסטוריה האולימפית דרך משחק.' : 'Learn Olympic history by playing.'}</p>
      </section>

      <main className="wrap">
        {/* The daily sits above the grid, not in it: it is one puzzle a day rather than a
            game you choose, and burying it among five cards hides the reason to come back. */}
        {done ? (
          <div className="dailycard done">
            <div className="dailytop">
              <span className="dailytag">{he ? 'האתגר היומי' : 'Daily challenge'} #{puzzle.number}</span>
              <span className="dim">{he ? 'הושלם' : 'done'} ✓</span>
            </div>
            <div className="dailyrow">
              <div className="dailyscore tnum">
                {done.score}{done.maxPossible ? <span className="outof"> / {done.maxPossible}</span> : null}
              </div>
              <div className="dailygrid">
                {(done.marks || []).map((m, i) => (
                  <span key={i}>{m === 'part' ? '🟨' : m ? '🟩' : '🟥'}</span>
                ))}
              </div>
            </div>
            <div className="dailyfoot">
              <span>{streak} {he ? 'ימים ברצף' : 'day streak'}</span>
              <span className="dim">·</span>
              <span>{he ? 'הבא בעוד' : 'next in'} {until.hours}h {until.minutes}m</span>
              <button className="btn" onClick={shareDaily} style={{ marginInlineStart: 'auto' }}>
                {copied ? (he ? '✓ הועתק' : '✓ Copied') : (he ? 'שיתוף' : 'Share')}
              </button>
            </div>
          </div>
        ) : (
          <Link to="/daily" className="dailycard">
            <div className="dailytop">
              <span className="dailytag">{he ? 'האתגר היומי' : 'Daily challenge'} #{puzzle.number}</span>
              {streak > 0 && <span className="dim">{streak} {he ? 'ימים ברצף' : 'day streak'}</span>}
            </div>
            <div className="dailyrow">
              <div className="gicon">{puzzle.game.icon}</div>
              <div>
                <div className="nm">{puzzle.game.title[lang] || puzzle.game.title.en}</div>
                <div className="bl">{he
                  ? 'אותה חידה בדיוק לכולם היום.'
                  : 'The same puzzle for everyone today.'}</div>
              </div>
              <span className="btn primary" style={{ marginInlineStart: 'auto' }}>
                {he ? 'שחק' : 'Play'}
              </span>
            </div>
          </Link>
        )}

        <div className="gamegrid">
          {GAMES.map((g) => {
            const s = overallFor(g.id)
            return (
              <Link key={g.id} to={`/games/${g.id}`} className="gamecard">
                <div className="gicon">{g.icon}</div>
                <div className="nm">{g.title[lang] || g.title.en}</div>
                <div className="bl">{g.blurb[lang] || g.blurb.en}</div>
                <div className="meta">
                  {s.played > 0 ? (
                    <>
                      <span className="bestbadge">
                        {lang === 'he' ? 'שיא' : 'best'} <b className="tnum">{s.best}</b>
                      </span>
                      <span className="plays tnum">
                        {s.played} {lang === 'he' ? (s.played === 1 ? 'משחק' : 'משחקים') : s.played === 1 ? 'play' : 'plays'}
                      </span>
                    </>
                  ) : (
                    <span className="dim">{lang === 'he' ? 'שחק עכשיו' : 'play now'}</span>
                  )}
                </div>
              </Link>
            )
          })}

          {COMING_SOON.map((g) => (
            <div key={g.id} className="gamecard soon">
              <div className="gicon">{g.icon}</div>
              <div className="nm">{g.title[lang] || g.title.en}</div>
              <div className="bl">{g.blurb[lang] || g.blurb.en}</div>
              <div className="meta dim">{t.gamesSoon}</div>
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
