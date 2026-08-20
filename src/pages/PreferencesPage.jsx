import { Link } from 'react-router-dom'
import { SPORTS, TOURNAMENTS, META } from '../lib/data'
import { statusOf, todayISO } from '../lib/dates'
import { usePrefs, setPrefs } from '../lib/prefs'
import { useT, L } from '../lib/i18n'

export default function PreferencesPage() {
  const { lang, followed, theme, toggleFollow, setLang } = usePrefs()
  const t = useT(lang)
  const today = todayISO()

  const upcoming = {}
  for (const x of TOURNAMENTS) {
    if (['upcoming', 'live'].includes(statusOf(x, today))) upcoming[x.sportSlug] = (upcoming[x.sportSlug] || 0) + 1
  }

  return (
    <>
      <section className="wrap hero">
        <h1>{t.nav.prefs}</h1>
        <p>{t.followedEmptyBody}</p>
      </section>

      <main className="wrap">
        <div className="sec"><h2>{t.pickSports}</h2><span className="count">{followed.length} / {SPORTS.length}</span></div>

        <div className="chips">
          {SPORTS.map((s) => {
            const on = followed.includes(s.slug)
            return (
              <button key={s.slug} className={`chip ${on ? 'on' : ''}`} onClick={() => toggleFollow(s.slug)}>
                {s.logoUrl && <img src={s.logoUrl} alt="" />}
                {L(s, 'name', lang)}
                <span className="n">{upcoming[s.slug] || 0}</span>
              </button>
            )
          })}
        </div>

        <div className="row" style={{ marginTop: 14, gap: 8 }}>
          <button className="btn" onClick={() => setPrefs({ followed: SPORTS.map((s) => s.slug) })}>{t.allSports}</button>
          <button className="btn" onClick={() => setPrefs({ followed: [] })}>{t.clear}</button>
        </div>

        <div className="sec"><h2>{lang === 'he' ? 'שפה' : 'Language'}</h2></div>
        <div className="segmented">
          <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>English</button>
          <button className={lang === 'he' ? 'on' : ''} onClick={() => setLang('he')}>עברית</button>
        </div>

        <div className="sec"><h2>{lang === 'he' ? 'תצוגה' : 'Appearance'}</h2></div>
        <div className="segmented">
          <button className={theme === 'dark' ? 'on' : ''} onClick={() => setPrefs({ theme: 'dark' })}>{lang === 'he' ? 'כהה' : 'Dark'}</button>
          <button className={theme === 'light' ? 'on' : ''} onClick={() => setPrefs({ theme: 'light' })}>{lang === 'he' ? 'בהיר' : 'Light'}</button>
        </div>

        <div className="sec"><h2>{lang === 'he' ? 'אודות' : 'About'}</h2></div>
        <div className="about">
          <p>
            {lang === 'he'
              ? 'פרויקט עצמאי. אינו קשור לוועד האולימפי הבינלאומי, לוועדים הלאומיים או לאיגודי הספורט, ואינו מייצג אותם.'
              : 'An independent project. Not affiliated with, endorsed by, or representing the International Olympic Committee, any National Olympic Committee, or any sports federation.'}
          </p>
          <p>
            {lang === 'he'
              ? 'התאריכים נאספו מלוחות השנה של האיגודים והם משתנים. לפני שקובעים משהו — בדקו בעמוד הרשמי של האירוע, שמקושר מכל אירוע שיש לו כזה.'
              : 'Dates are compiled from federation calendars and do change. Before planning anything around one, check the event\u2019s official page — linked from every event that has one.'}
          </p>
          <p>
            {lang === 'he'
              ? 'לא נאסף עליכם מידע. אין שרת, אין חשבונות ואין מדידה. הענפים שאתם עוקבים אחריהם, השפה, ערכת הצבעים והתוצאות שמורים בדפדפן שלכם בלבד.'
              : 'Nothing about you is collected. There is no server, no account and no analytics. Your followed sports, language, theme and game scores are stored only in this browser.'}
          </p>
        </div>

        <footer className="foot">
          {t.dataThrough} {META.years[0]}–{META.years[META.years.length - 1]} · {META.tournamentCount} {t.tournaments} · {META.sportCount} {t.nav.sports}
          {META.undated > 0 && <> · {META.undated} {t.tba}</>}
        </footer>
      </main>
    </>
  )
}
