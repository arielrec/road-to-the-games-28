import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrefs, setPrefs } from '../lib/prefs'
import { recordResult, statsFor, overallFor } from '../lib/gameStats'
import { recordDaily, dailyResult, dailyStreak, dailyShareText, timeUntilNextDaily } from '../lib/daily'
import { todayISO } from '../lib/dates'
import { sportName } from '../games/medalData'

const T = {
  en: { back: 'Games', start: 'Start', play: 'Play', again: 'Play again', next: 'Next',
        streak: 'Streak', best: 'Best', score: 'Score', over: 'Game over', newBest: 'New personal best!',
        correct: 'Correct', wrong: 'Not quite', share: 'Share', copied: 'Copied', round: 'Round',
        mode: 'Mode', which: 'Which one?', random: 'Random each round', showNames: 'Show country names',
        flagsOnly: 'Flags only', harder: 'harder',
        allModes: 'all modes', thisMode: 'this mode', played: 'played',
        daily: 'Daily challenge', dailyDone: 'You have played today', streakDays: 'day streak',
        nextIn: 'Next puzzle in', sameForAll: 'Everyone gets this exact puzzle today',
        backToGames: 'All games' },
  he: { back: 'משחקים', start: 'התחל', play: 'שחק', again: 'שחק שוב', next: 'הבא',
        streak: 'רצף', best: 'שיא', score: 'ניקוד', over: 'המשחק נגמר', newBest: 'שיא אישי חדש!',
        correct: 'נכון', wrong: 'לא בדיוק', share: 'שתף', copied: 'הועתק', round: 'סיבוב',
        mode: 'מצב', which: 'איזה?', random: 'אקראי בכל סיבוב', showNames: 'הצג שמות מדינות',
        flagsOnly: 'דגלים בלבד', harder: 'קשה יותר',
        allModes: 'כל המצבים', thisMode: 'המצב הזה', played: 'משחקים',
        daily: 'האתגר היומי', dailyDone: 'כבר שיחקתם היום', streakDays: 'ימים ברצף',
        nextIn: 'החידה הבאה בעוד', sameForAll: 'כולם מקבלים היום בדיוק את החידה הזו',
        backToGames: 'כל המשחקים' },
}

/**
 * SETUP -> PLAY -> RESULT, shared by every game.
 *
 * The shell owns score/streak, persistence, keyboard input and the result screen.
 * A game supplies only makeQuestion() and a renderer for its options.
 */
export default function GameShell({ game, children, daily = null }) {
  const { lang, flagsOnly } = usePrefs()
  const t = T[lang] || T.en
  // A daily starts immediately: there is nothing to configure, because everyone has to
  // play the identical run for the score to mean anything.
  const [phase, setPhase] = useState(daily ? 'play' : 'setup')
  const [seedBase, setSeedBase] = useState(() => (daily ? daily.seed : `${game.id}:${Date.now()}`))
  const [streak, setStreak] = useState(0)
  const [picked, setPicked] = useState(null)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [marks, setMarks] = useState([])
  const [round, setRound] = useState(0)      // rounds-scored games
  const [score, setScore] = useState(0)
  const [pending, setPending] = useState(0)  // points banked but not yet advanced past
  const [mode, setMode] = useState(daily ? daily.opts.mode : (game.modes ? game.modes[0].id : null))
  const [scoring, setScoring] = useState(daily ? daily.opts.scoring : (game.scorings ? game.scorings[0].id : null))
  const [format, setFormat] = useState(daily ? daily.opts.format : (game.formats ? game.formats[0].id : null))
  const [difficulty, setDifficulty] = useState(daily ? daily.opts.difficulty : (game.difficulties ? game.difficulties[0].id : null))
  const [rounds, setRounds] = useState(daily ? daily.opts.rounds : (game.rounds || 10))
  const [candidates, setCandidates] = useState(game.defaultCandidates || 4)
  const [sportIndex, setSportIndex] = useState(null)  // null = random each round
  const [year, setYear] = useState(null)

  // Flags-only is a genuinely different challenge, so it keeps its own best rather
  // than a score multiplier that would make one number mean two things.
  const isRounds = game.scoring === 'rounds'
  // Squad fixes its own length (one slot per category), so a format can override the picker.
  const fixed = game.formats?.find((f) => f.id === format)?.fixedRounds
  const totalRounds = fixed || (game.roundOptions ? rounds : game.rounds)
  const variant = [scoring, format, difficulty, game.roundOptions ? `r${totalRounds}` : '',
                   game.usesFlags && flagsOnly ? 'flagsonly' : ''].filter(Boolean).join(':')
  const stats = statsFor(game.id, variant)
  // Two different numbers, and the setup screen was showing the wrong one. `stats` is
  // this exact mode — the like-for-like target while you play. `overall` is your best at
  // the game whatever the settings, which is what belongs on a summary and is what the
  // Games page shows. Flipping a setting used to drop the headline to 0.
  const overall = overallFor(game.id)
  // runSeed lets a game generate its whole run at once — Flags & Sports needs one
  // shared sport palette across all five rounds, not a fresh one per question.
  const opts = useMemo(() => ({ mode, sportIndex, year, runSeed: seedBase, scoring, rounds, format, candidates, difficulty }),
                       [mode, sportIndex, year, seedBase, scoring, rounds, format, candidates, difficulty])
  const step = isRounds ? round : streak
  const question = useMemo(
    () => (phase === 'play' ? game.makeQuestion(`${seedBase}:${step}`, step, opts) : null),
    [game, seedBase, step, phase, opts]
  )
  const activeMode = game.modes?.find((m) => m.id === mode)
  // Either a flat per-round cap (Podium) or a run-specific optimum (Flags & Sports).
  const maxPossible = game.maxScore ? game.maxScore(opts)
    : game.maxPerRound ? totalRounds * game.maxPerRound : null

  // finish() is created before the last mark lands in state, so read them through refs
  // rather than adding marks to its dependency list and rebuilding it every round.
  const marksRef = useRef([]); marksRef.current = marks
  const maxPossibleRef = useRef(null); maxPossibleRef.current = maxPossible

  const start = useCallback(() => {
    setSeedBase(`${game.id}:${Date.now()}`)
    setStreak(0); setRound(0); setScore(0); setPending(0)
    setPicked(null); setMarks([]); setResult(null); setCopied(false)
    setPhase('play')
  }, [game.id])

  const answer = useCallback((i) => {
    if (picked !== null) return
    setPicked(i)
    setMarks((m) => [...m, i === question.answerIndex])
  }, [picked, question])

  const next = useCallback(() => { setPicked(null); setStreak((s) => s + 1) }, [])

  /** Called from the reveal, so the player controls when the run ends. */
  const finish = useCallback((finalScore) => {
    const value = typeof finalScore === 'number' ? finalScore : streak
    const r = recordResult(game.id, value, variant)
    if (daily) recordDaily(daily.date, game.id, value, marksRef.current, maxPossibleRef.current)
    setResult({ score: value, ...r })
    setPhase('result')
  }, [game.id, streak, variant, daily])

  /**
   * Rounds-scored games (Podium) submit points rather than a right/wrong index.
   * `mark` drives the share grid: 🟩 perfect, 🟨 partial, 🟥 nothing.
   */
  const submit = useCallback((points, mark = null) => {
    const next = score + points
    setPending(0)
    setScore(next)
    setMarks((m) => [...m, mark ?? (points > 0)])
    const last = round + 1 >= totalRounds
    if (last) setTimeout(() => finish(next), 0)
    else setRound((r) => r + 1)
  }, [score, round, totalRounds, finish])

  // number keys pick an option, Enter advances
  useEffect(() => {
    if (phase !== 'play') return
    const onKey = (e) => {
      if (e.key === 'Enter' && picked !== null) {
        return picked === question.answerIndex ? next() : finish()
      }
      const n = Number(e.key)
      if (n >= 1 && n <= (question?.options?.length || 0)) answer(n - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, picked, question, answer, next, finish])

  const share = () => {
    const grid = marks.map((m) => (m === 'part' ? '🟨' : m ? '🟩' : '🟥')).join('')
    const text = daily
      ? dailyShareText(dailyResult(daily.date) || { gameId: game.id, score: result?.score,
          marks, maxPossible, number: daily.number }, lang)
      : `${game.title[lang] || game.title.en} — ${result.score}\n${grid}\n${todayISO()}`
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }

  if (phase === 'setup') {
    return (
      <div className="wrap gamewrap">
        <Link to="/games" className="linkbtn">← {t.back}</Link>
        <div className="gamehero">
          <div className="gicon">{game.icon}</div>
          <h1>{game.title[lang] || game.title.en}</h1>
          <p className="muted">{game.blurb[lang] || game.blurb.en}</p>
          <div className="stats" style={{ justifyContent: 'center' }}>
            <div className="stat"><b className="tnum">{overall.best}</b><small>{t.best} · {t.allModes}</small></div>
            <div className="stat"><b className="tnum">{overall.played}</b><small>{t.played}</small></div>
            {stats.played > 0 && stats.best !== overall.best && (
              <div className="stat"><b className="tnum">{stats.best}</b><small>{t.best} · {t.thisMode}</small></div>
            )}
          </div>

          {game.modes && (
            <div className="setupblock">
              <div className="lbl">{t.mode}</div>
              <div className="segmented wrapseg">
                {game.modes.map((m) => (
                  <button key={m.id} className={mode === m.id ? 'on' : ''}
                          onClick={() => { setMode(m.id); setSportIndex(null); setYear(null) }}>
                    {m.label[lang] || m.label.en}
                  </button>
                ))}
              </div>

              {activeMode?.sport && (
                <><div className="lbl sub">{lang === 'he' ? 'ענף' : 'Sport'}</div>
                <select className="picker" value={sportIndex ?? ''}
                        onChange={(e) => setSportIndex(e.target.value === '' ? null : Number(e.target.value))}>
                  <option value="">🎲 {t.random}</option>
                  {game.sports.map((s2) => <option key={s2.i} value={s2.i}>{sportName(s2.i, lang)}</option>)}
                </select></>
              )}
              {activeMode?.year && (
                <><div className="lbl sub">{lang === 'he' ? 'שנה' : 'Year'}</div>
                <select className="picker tnum" value={year ?? ''}
                        onChange={(e) => setYear(e.target.value === '' ? null : Number(e.target.value))}>
                  <option value="">🎲 {t.random}</option>
                  {game.years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select></>
              )}
            </div>
          )}

          {game.formats && (
            <div className="setupblock">
              <div className="lbl">{lang === 'he' ? 'סוג דראפט' : 'Draft format'}</div>
              <div className="segmented wrapseg">
                {game.formats.map((f) => (
                  <button key={f.id} className={format === f.id ? 'on' : ''}
                          onClick={() => setFormat(f.id)}>{f.label[lang] || f.label.en}</button>
                ))}
              </div>
              <p className="hint">
                {(game.formats.find((x) => x.id === format)?.hint?.[lang]) ||
                 game.formats.find((x) => x.id === format)?.hint?.en}
              </p>
            </div>
          )}

          {game.scorings && (
            <div className="setupblock">
              <div className="lbl">{lang === 'he' ? 'שיטת ניקוד' : 'Scoring'}</div>
              <div className="segmented wrapseg">
                {game.scorings.map((sc) => (
                  <button key={sc.id} className={scoring === sc.id ? 'on' : ''}
                          onClick={() => setScoring(sc.id)}>
                    {sc.label[lang] || sc.label.en}
                  </button>
                ))}
              </div>
              <p className="hint">
                {(game.scorings.find((x) => x.id === scoring)?.hint?.[lang]) ||
                 game.scorings.find((x) => x.id === scoring)?.hint?.en}
              </p>
            </div>
          )}

          {game.difficulties && (
            <div className="setupblock">
              <div className="lbl">{lang === 'he' ? 'רמת קושי' : 'Difficulty'}</div>
              <div className="segmented wrapseg">
                {game.difficulties.map((d) => (
                  <button key={d.id} className={difficulty === d.id ? 'on' : ''}
                          onClick={() => setDifficulty(d.id)}>{d.label[lang] || d.label.en}</button>
                ))}
              </div>
              <p className="hint">
                {(game.difficulties.find((x) => x.id === difficulty)?.hint?.[lang]) ||
                 game.difficulties.find((x) => x.id === difficulty)?.hint?.en}
              </p>
            </div>
          )}

          {game.candidateOptions && (
            <div className="setupblock">
              <div className="lbl">{lang === 'he' ? 'מועמדים בכל סיבוב' : 'Candidates per round'}</div>
              <div className="segmented wrapseg">
                {game.candidateOptions.map((n) => (
                  <button key={n} className={`tnum ${candidates === n ? 'on' : ''}`}
                          onClick={() => setCandidates(n)}>{n}</button>
                ))}
              </div>
            </div>
          )}

          {game.roundOptions && !fixed && (
            <div className="setupblock">
              <div className="lbl">{lang === 'he' ? 'מספר סיבובים' : 'Rounds'}</div>
              <div className="segmented wrapseg">
                {game.roundOptions.map((r) => (
                  <button key={r} className={`tnum ${rounds === r ? 'on' : ''}`}
                          onClick={() => setRounds(r)}>{r}</button>
                ))}
              </div>
            </div>
          )}

          {game.usesFlags && (
            <div className="setupblock">
              <label className="switchrow">
                <input type="checkbox" checked={!flagsOnly}
                       onChange={() => setPrefs({ flagsOnly: !flagsOnly })} />
                <span>{t.showNames}</span>
                {flagsOnly && <span className="pill">{t.flagsOnly} · {t.harder}</span>}
              </label>
            </div>
          )}

          <button className="btn primary big" onClick={start}>{t.start}</button>
        </div>
      </div>
    )
  }

  if (phase === 'result') {
    // A daily has no "play again": the whole point is one attempt at a puzzle everyone
    // shares, so the result screen offers the streak and the share text instead.
    const until = daily ? timeUntilNextDaily() : null
    const streakDays = daily ? dailyStreak(daily.date) : 0
    return (
      <div className="wrap gamewrap">
        <Link to="/games" className="linkbtn">← {t.back}</Link>
        <div className="gamehero">
          <div className="gicon">{result.isBest ? '🏆' : game.icon}</div>
          <h1>{daily ? `${t.daily} #${daily.number}` : t.over}</h1>
          <div className="bigscore tnum">
            {result.score}
            {isRounds && maxPossible ? <span className="outof"> / {maxPossible}</span> : null}
          </div>
          <p className="muted">{result.isBest ? t.newBest : `${t.best} ${stats.best}`}</p>
          <div className="sharegrid">
            {marks.map((m, i) => <span key={i}>{m === 'part' ? '🟨' : m ? '🟩' : '🟥'}</span>)}
          </div>

          {daily && (
            <>
              <div className="stats" style={{ justifyContent: 'center', marginTop: 16 }}>
                <div className="stat"><b className="tnum">{streakDays}</b><small>{t.streakDays}</small></div>
                <div className="stat">
                  <b className="tnum">{until.hours}h {until.minutes}m</b><small>{t.nextIn}</small>
                </div>
              </div>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>{t.sameForAll}</p>
            </>
          )}

          <div className="row" style={{ justifyContent: 'center', marginTop: 18 }}>
            {daily
              ? <Link className="btn primary big" to="/games">{t.backToGames}</Link>
              : <button className="btn primary big" onClick={start}>{t.again}</button>}
            <button className="btn" onClick={share}>{copied ? `✓ ${t.copied}` : t.share}</button>
          </div>
        </div>
      </div>
    )
  }

  const revealed = picked !== null
  const correct = revealed && picked === question.answerIndex
  const shownStreak = streak + (correct ? 1 : 0)
  return (
    <div className="wrap gamewrap">
      <div className="gamebar">
        <Link to="/games" className="linkbtn">← {t.back}</Link>
        {question.context && (question.context.sport || question.context.year) && (
          <div className="ctxpill">
            {question.context.sportHe && lang === 'he' ? question.context.sportHe : question.context.sport}
            {question.context.sport && question.context.year ? ' · ' : ''}
            <span className="tnum">{question.context.year || ''}</span>
          </div>
        )}
        <div className="row" style={{ gap: 14 }}>
          <span className="dim" title={`${t.best} — ${t.thisMode}`}>{t.best} <b className="tnum">{stats.best}</b></span>
          {isRounds ? (
            <>
              <span className="dim">{t.round} <b className="tnum">{round + 1}/{totalRounds}</b></span>
              <span className="streakpill on">⭐ <b className="tnum">{score + pending}</b></span>
            </>
          ) : (
            <span className={`streakpill ${shownStreak > 0 ? 'on' : ''}`}>🔥 <b className="tnum">{shownStreak}</b></span>
          )}
        </div>
      </div>
      {children({ question, picked, revealed, correct, answer, next, finish, submit, setPending,
                  round, score, lang, t, scoring, format, difficulty, runSeed: seedBase, totalRounds,
                  showName: !(game.usesFlags && flagsOnly), context: question.context })}
    </div>
  )
}
