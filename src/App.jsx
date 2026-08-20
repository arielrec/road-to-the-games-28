import { useEffect } from 'react'
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { usePrefs } from './lib/prefs'
import { useT } from './lib/i18n'
import icon from './assets/icon.png'

import ErrorBoundary from './components/ErrorBoundary'
import HomePage from './pages/HomePage'
import CalendarPage from './pages/CalendarPage'
import SportsPage from './pages/SportsPage'
import SportDetailPage from './pages/SportDetailPage'
import TournamentPage from './pages/TournamentPage'
import GamesPage from './pages/GamesPage'
import GamePlayPage, { DailyPlayPage } from './pages/GamePlayPage'
import RoadToLA28 from './pages/RoadToLA28'
import PreferencesPage from './pages/PreferencesPage'

const NAV = [
  { to: '/', key: 'home', ic: '⚡', end: true },
  { to: '/calendar', key: 'calendar', ic: '🗓' },
  { to: '/sports', key: 'sports', ic: '🏅' },
  { to: '/la28', key: 'la28', ic: '🎯' },
  { to: '/games', key: 'games', ic: '🎮' },
  { to: '/me', key: 'prefs', ic: '★' },
]

function Shell({ children }) {
  const { lang, theme, toggleLang } = usePrefs()
  const t = useT(lang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr'
    document.documentElement.dataset.theme = theme
    document.title = t.appName
  }, [lang, theme, t.appName])

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <NavLink to="/" className="brand">
            <img src={icon} alt="" />
            <span>{t.appName}</span>
          </NavLink>
          <nav className="tabs">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `tab ${isActive ? 'on' : ''}`}>
                {t.nav[n.key]}
              </NavLink>
            ))}
          </nav>
          <button className="icon-btn" onClick={toggleLang} title="Language" style={{ marginInlineStart: 8 }}>
            {lang === 'en' ? 'עב' : 'EN'}
          </button>
        </div>
      </header>

      {children}

      <nav className="botnav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'on' : '')}>
            <span className="ic">{n.ic}</span>
            <span>{t.nav[n.key]}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export default function App() {
  return (
    <HashRouter>
      <Shell>
        {/* Inside Shell, so a broken screen still leaves the nav usable. */}
        <ErrorBoundary>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/sports" element={<SportsPage />} />
          <Route path="/sports/:slug" element={<SportDetailPage />} />
          <Route path="/t/:id" element={<TournamentPage />} />
          <Route path="/la28" element={<RoadToLA28 />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/daily" element={<DailyPlayPage />} />
          <Route path="/games/:id" element={<GamePlayPage />} />
          <Route path="/me" element={<PreferencesPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ErrorBoundary>
      </Shell>
    </HashRouter>
  )
}
