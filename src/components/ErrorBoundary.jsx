import { Component } from 'react'

/**
 * The difference between "one screen is broken" and "the app is broken".
 *
 * Without this, any error thrown while rendering unmounts the whole React tree and the
 * visitor gets a white page with no explanation and no way back — and on a static site
 * with no server logs, no way for anyone to find out it happened. Several bugs during
 * this build did exactly that: a missing i18n key, a card whose data ran out mid-round.
 * They were caught because a browser console was open; a visitor would just have left.
 *
 * The reload button targets the home route specifically, because the usual cause is one
 * bad route or one bad record, and going back to a known-good screen actually recovers.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // No telemetry to send it to, but a real stack in the console beats a blank screen
    // when someone reports "it stopped working".
    console.error('[Road to the Games] render failed:', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const he = document.documentElement.lang === 'he'
    return (
      <div className="wrap">
        <div className="empty" style={{ marginTop: 60 }}>
          <h3>{he ? 'משהו השתבש במסך הזה' : 'Something went wrong on this screen'}</h3>
          <p>
            {he
              ? 'שאר האפליקציה תקינה. חזרו למסך הראשי כדי להמשיך.'
              : 'The rest of the app is fine. Go back to the home screen to carry on.'}
          </p>
          <button
            className="btn primary"
            onClick={() => {
              window.location.hash = '#/'
              window.location.reload()
            }}
          >
            {he ? 'למסך הראשי' : 'Back to home'}
          </button>
          <details style={{ marginTop: 18, textAlign: 'start', maxWidth: 520, marginInline: 'auto' }}>
            <summary style={{ cursor: 'pointer', fontSize: 12.5, color: 'var(--text-3)' }}>
              {he ? 'פרטים טכניים' : 'Technical details'}
            </summary>
            <pre style={{ fontSize: 11.5, whiteSpace: 'pre-wrap', color: 'var(--text-3)', marginTop: 8 }}>
              {String(error?.stack || error)}
            </pre>
          </details>
        </div>
      </div>
    )
  }
}
