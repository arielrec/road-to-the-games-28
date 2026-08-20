import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import GameShell from '../components/GameShell'
import FlagCard from '../components/FlagCard'
import { gameById } from '../games/registry'
import { scorePlacement } from '../games/podium'
import { scoreOf } from '../games/flagsSports'
import { SPORTS, sportName } from '../games/medalData'
import { cardScore, CATEGORIES } from '../games/draft'
import { L, useT } from '../lib/i18n'
import { dailyPuzzle, dailyResult } from '../lib/daily'

/** Odd One Out — four text options, three of them real Olympic sports. */
function TextOptions({ game, question, picked, revealed, correct, answer, next, finish, lang, t }) {
  return (
    <>
      <h2 className="qprompt">{game.prompt[lang] || game.prompt.en}</h2>
      <div className="optgrid">
        {question.options.map((o, i) => {
          const isAnswer = i === question.answerIndex
          const cls = !revealed ? '' : isAnswer ? 'right' : i === picked ? 'wrong' : 'faded'
          return (
            <button key={o.name} className={`opt ${cls}`} disabled={revealed} onClick={() => answer(i)}>
              <span className="k">{i + 1}</span>
              <span className="nm">{L(o, 'name', lang)}</span>
              {revealed && isAnswer && <span className="tag">{lang === 'he' ? 'לא אולימפי' : 'never Olympic'}</span>}
            </button>
          )
        })}
      </div>
      {revealed && (
        <div className={`reveal ${correct ? 'ok' : 'bad'}`}>
          <div className="verdict">{correct ? `✓ ${t.correct}` : `✕ ${t.wrong}`}</div>
          <ul className="facts">
            {question.options.filter((o) => o.isReal).map((o) => (
              <li key={o.name}><b>{L(o, 'name', lang)}</b> — {lang === 'he' ? o.factHe : o.factEn}</li>
            ))}
          </ul>
          <button className="btn primary big" onClick={correct ? next : finish}>
            {correct ? `${t.next} →` : (lang === 'he' ? 'לתוצאה →' : 'See result →')}
          </button>
        </div>
      )}
    </>
  )
}

/** More Medals — two flag cards, side by side. */
function FlagDuel({ game, question, picked, revealed, correct, answer, next, finish, lang, t, showName }) {
  return (
    <>
      <h2 className="qprompt">{game.prompt[lang] || game.prompt.en}</h2>
      <div className="duel">
        {question.options.map((o, i) => {
          const isAnswer = i === question.answerIndex
          // In a two-way duel the loser must stay readable — the reveal is there to
          // teach BOTH counts, so it is dimmed, not hidden.
          const cls = !revealed ? '' : isAnswer ? 'right' : i === picked ? 'wrong' : 'lost'
          return (
            <button key={o.noc} className={`duelbtn ${cls}`} disabled={revealed} onClick={() => answer(i)}>
              <FlagCard noc={o.noc} lang={lang} showName={showName}
                        total={revealed ? o.total : null} />
            </button>
          )
        })}
      </div>
      {revealed && (
        <div className={`reveal ${correct ? 'ok' : 'bad'}`}>
          <div className="verdict">{correct ? `✓ ${t.correct}` : `✕ ${t.wrong}`}</div>
          <button className="btn primary big" onClick={correct ? next : finish}>
            {correct ? `${t.next} →` : (lang === 'he' ? 'לתוצאה →' : 'See result →')}
          </button>
        </div>
      )}
    </>
  )
}

/**
 * Podium — tap to place, never drag. Drag is miserable on a phone, and this is
 * the one game whose whole interaction is arrangement.
 */
function Podium({ game, question, submit, setPending, round, lang, t, showName }) {
  const [slots, setSlots] = useState([null, null, null])
  const [done, setDone] = useState(null)

  // new question -> clear the board
  useEffect(() => { setSlots([null, null, null]); setDone(null); setPending(0) }, [question, setPending])

  const placed = new Set(slots.filter(Boolean))
  const place = (noc) => {
    if (done || placed.has(noc)) return
    const i = slots.indexOf(null)
    if (i === -1) return
    const next = [...slots]; next[i] = noc; setSlots(next)
  }
  const lift = (i) => {
    if (done) return
    const next = [...slots]; next[i] = null; setSlots(next)
  }
  const confirm = () => {
    const r = scorePlacement(slots, question.correctOrder)
    setDone(r)
    setPending(r.points)   // show the points immediately, not a click later
  }
  const advance = () => submit(done.points, done.perfect ? true : done.hits > 0 ? 'part' : false)

  const MEDALS = ['🥇', '🥈', '🥉']
  const full = slots.every(Boolean)
  const byNoc = Object.fromEntries(question.correct.map((c) => [c.noc, c]))

  return (
    <>
      <h2 className="qprompt">{game.prompt[lang] || game.prompt.en}</h2>

      {!done && (
        <div className="pool">
          {question.pool.map((o) => (
            <button key={o.noc} className={`poolcard ${placed.has(o.noc) ? 'used' : ''}`}
                    disabled={placed.has(o.noc)} onClick={() => place(o.noc)}>
              <FlagCard noc={o.noc} lang={lang} showName={showName} />
            </button>
          ))}
        </div>
      )}

      <div className="podium">
        {slots.map((noc, i) => {
          const right = done && question.correctOrder[i] === noc
          const cls = done ? (right ? 'right' : 'wrong') : noc ? 'filled' : 'empty'
          const shown = done ? question.correctOrder[i] : noc
          return (
            <button key={i} className={`slot ${cls}`} onClick={() => lift(i)} disabled={!!done}>
              <span className="medal">{MEDALS[i]}</span>
              {shown
                ? <FlagCard noc={shown} lang={lang} showName={showName}
                            total={done ? byNoc[shown]?.total : null} />
                : <span className="slotempty">—</span>}
              {done && !right && noc && (
                <span className="youput">{lang === 'he' ? 'בחרת' : 'you put'}: {noc}</span>
              )}
            </button>
          )
        })}
      </div>

      {!done && (
        <div className="reveal">
          <button className="btn primary big" disabled={!full} onClick={confirm}>
            {lang === 'he' ? 'אישור' : 'Confirm'}
          </button>
        </div>
      )}

      {done && (
        <div className={`reveal ${done.perfect ? 'ok' : done.hits ? 'part' : 'bad'}`}>
          <div className="verdict">
            {done.perfect
              ? `✓ ${lang === 'he' ? 'פודיום מושלם' : 'Perfect podium'} +3`
              : `${done.hits} / 3 ${lang === 'he' ? 'במקום' : 'in place'} +${done.points}`}
          </div>
          <button className="btn primary big" onClick={advance}>
            {round + 1 >= game.rounds
              ? (lang === 'he' ? 'לתוצאה →' : 'See result →')
              : `${t.next} →`}
          </button>
        </div>
      )}
    </>
  )
}

/**
 * Flags & Sports — one flag per round, pick a sport, and a sport can only be used once.
 * The used-sport set has to survive across rounds, so it lives here keyed on the run seed.
 */
function FlagsSports({ game, question, submit, setPending, round, lang, t, showName, scoring, runSeed, totalRounds }) {
  const [used, setUsed] = useState([])
  const [choice, setChoice] = useState(null)

  useEffect(() => { setUsed([]); setChoice(null) }, [runSeed])
  useEffect(() => { setChoice(null) }, [question])

  const { noc, palette, year, run } = question
  const pickSport = (si) => {
    if (choice !== null || used.includes(si)) return
    const points = scoreOf(noc, si, year, scoring)
    setChoice({ si, points })
    setPending(points)
  }
  const advance = () => {
    setUsed((u) => [...u, choice.si])
    submit(choice.points, choice.points > 0 ? (choice.points >= 20 ? true : 'part') : false)
  }

  /**
   * Two different "best" answers, and collapsing them into one is what made this hint
   * look broken.
   *
   *   trueBest — what the country is actually best at. This is the answer to the
   *              question printed on the screen, and it never changes.
   *   bestLeft — the most the round could still have been worth, given the sports
   *              already spent. This is what the player is scored against.
   *
   * The old code only computed the second and labelled it "best was". Spend Athletics on
   * Algeria in round 1 and Tunisia arrives in round 3 to be told its best sport is
   * Taekwondo — flatly wrong — and a country whose only sport was already gone was
   * reported as a flat zero, reading as though it had never competed at all.
   */
  const ptsFor = (si) => scoreOf(noc, si, year, scoring)
  let trueBest = null, trueBestPts = -1
  let bestLeft = null, bestLeftPts = -1
  for (const si of palette) {
    const v = ptsFor(si)
    if (v > trueBestPts) { trueBestPts = v; trueBest = si }
    if (!used.includes(si) && v > bestLeftPts) { bestLeftPts = v; bestLeft = si }
  }
  // Nothing on the board can score for this country any more — say so, rather than
  // naming whichever leftover sport happened to sort first with a zero beside it.
  const nothingLeft = bestLeftPts <= 0
  // GameShell's `t` is its own small shell dictionary, not the app strings.
  const fs = useT(lang).fs
  const unit = scoring === 'share' ? '%' : ''
  const last = round + 1 >= totalRounds

  return (
    <>
      <div className="fsflag">
        <FlagCard noc={noc} lang={lang} showName={showName} />
      </div>
      <h2 className="qprompt">{game.prompt[lang] || game.prompt.en}</h2>

      <div className="palette wide">
        {palette.map((si) => {
          const isUsed = used.includes(si)
          const isChoice = choice?.si === si
          const isBest = choice && si === bestLeft && !nothingLeft
          // The real answer, greyed out because an earlier round spent it.
          const isSpentBest = choice && isUsed && si === trueBest && trueBestPts > 0
          const cls = isChoice ? 'chosen' : isBest ? 'best' : isSpentBest ? 'used spentbest' : isUsed ? 'used' : ''
          return (
            <button key={si} className={`sportbtn ${cls}`} disabled={isUsed || choice !== null}
                    onClick={() => pickSport(si)}>
              {sportName(si, lang)}
              {isChoice && <span className="pts">+{choice.points}{unit}</span>}
              {isBest && !isChoice && <span className="pts">{bestLeftPts}{unit}</span>}
              {isSpentBest && <span className="pts">{trueBestPts}{unit}</span>}
            </button>
          )
        })}
      </div>

      {choice && (
        <div className={`reveal ${nothingLeft ? 'part'
          : choice.points >= bestLeftPts ? 'ok' : choice.points > 0 ? 'part' : 'bad'}`}>
          <div className="verdict">
            +{choice.points}{unit}
            {nothingLeft && <span className="bestwas"> · {fs.nothingLeft}</span>}
            {!nothingLeft && bestLeftPts > choice.points && (
              <span className="bestwas"> · {fs.bestLeft} {sportName(bestLeft, lang)} ({bestLeftPts}{unit})</span>
            )}
            {trueBestPts > 0 && trueBest !== choice.si && trueBest !== bestLeft && (
              <span className="bestwas spent"> · {fs.reallyBest} {sportName(trueBest, lang)} ({trueBestPts}{unit}) — {fs.spent}</span>
            )}
          </div>
          <button className="btn primary big" onClick={advance}>
            {last ? (lang === 'he' ? 'לתוצאה →' : 'See result →') : `${t.next} →`}
          </button>
        </div>
      )}

      {!choice && used.length > 0 && (
        <p className="usednote">
          {lang === 'he' ? 'ענפים שכבר בזבזתם' : 'Sports already spent'}: {used.map((u) => sportName(u, lang)).join(', ')}
        </p>
      )}
    </>
  )
}

/**
 * The Draft — pick one of four athletes per round, keep the points they actually scored.
 * Sport and year appear on every card on purpose: with 475 athletes of whom ~50 are
 * household names, sport and era are the real signal (Judo averages 12.7 points a head,
 * Basketball 1.0), so an unfamiliar name is still an informed bet.
 */
function Draft({ game, question, submit, setPending, round, lang, t, format, difficulty, totalRounds }) {
  const [team, setTeam] = useState([])
  const [choice, setChoice] = useState(null)
  const [filled, setFilled] = useState([])   // squad: categories already used

  useEffect(() => { setTeam([]); setChoice(null); setFilled([]) }, [question.run])
  useEffect(() => { setChoice(null) }, [question])

  const isSquad = format === 'squad'
  // Hard mode hides sport and year. Both leak: sport is the strongest predictor of score,
  // and in Career format the Games count literally encodes the +2/Games bonus.
  const hard = difficulty === 'hard'
  const { cards, slot } = question
  const catName = (i) => game.categories?.[i]?.[lang === 'he' ? 'nameHe' : 'name'] ?? ''
  const legal = (c) => !isSquad || !filled.includes(c.cat)
  const pickable = cards.filter(legal)
  const bestCard = pickable.reduce((a, c) => (cardScore(c, format) > cardScore(a, format) ? c : a), pickable[0])
  const bestPts = bestCard ? cardScore(bestCard, format) : 0

  const take = (card) => {
    if (choice || !legal(card)) return
    const pts = cardScore(card, format)
    setChoice({ card, pts })
    setPending(pts)
  }
  const advance = () => {
    setTeam((tm) => [...tm, { ...choice.card, pts: choice.pts }])
    if (isSquad) setFilled((f) => [...f, choice.card.cat])
    submit(choice.pts, choice.pts >= 24 ? true : choice.pts > 0 ? 'part' : false)
  }
  const last = round + 1 >= totalRounds
  const medalIcon = (m) => (m === 'Gold' ? '🥇' : m === 'Silver' ? '🥈' : m === 'Bronze' ? '🥉' : '')

  return (
    <>
      {slot && (
        <div className="slotbanner">
          <span className="tnum">{slot.year}</span> · {CATEGORIES[slot.cat][lang === 'he' ? 'nameHe' : 'name']}
        </div>
      )}

      {isSquad && (
        <div className="catslots">
          {(game.categories || []).map((c, i) => (
            <span key={i} className={`catslot ${filled.includes(i) ? 'done' : ''}`}>
              {filled.includes(i) ? '✓ ' : ''}{c[lang === 'he' ? 'nameHe' : 'name']}
            </span>
          ))}
        </div>
      )}

      {team.length > 0 && (
        <div className="teamlist">
          <div className="lbl">{lang === 'he' ? 'הנבחרת שלכם' : 'Your team'}</div>
          {team.map((m, i) => (
            <div key={i} className="teamrow">
              <span className="nm">{medalIcon(m.medal)} {m.name}</span>
              <span className="dim">{(lang === 'he' ? m.sportHe : m.sport) || m.sport} · {m.year || m.bestYear || m.first}</span>
              <b className="tnum">+{m.pts}</b>
            </div>
          ))}
        </div>
      )}

      <h2 className="qprompt">{game.prompt[lang] || game.prompt.en}</h2>

      <div className="cardlist">
        {cards.map((c) => {
          const pts = cardScore(c, format)
          const isChoice = choice?.card === c
          const isBest = choice && c === bestCard
          const spent = !legal(c)
          const cls = isChoice ? 'chosen' : isBest ? 'best' : spent ? 'spent' : choice ? 'faded' : ''
          return (
            <button key={`${c.aid}:${c.year || 'c'}`} className={`athcard ${cls}`}
                    disabled={!!choice || spent} onClick={() => take(c)}>
              <div className="ath">
                {/* the medal icon is revealed with the score, never before — it was
                    giving the answer away on sight */}
                <div className="nm">{choice ? `${medalIcon(c.medal)} ` : ''}{c.name}</div>
                <div className="meta">
                  {isSquad && <span className="catchip">{catName(c.cat)}</span>}
                  {hard && !choice
                    ? <span className="dim">{lang === 'he' ? 'ללא רמזים' : 'no hints'}</span>
                    : <>
                        {(lang === 'he' ? c.sportHe : c.sport) || c.sport} · <span className="tnum">{c.year
                          ? c.year
                          : (c.games > 1 ? `${c.first}–${c.last}` : c.first)}</span>
                      </>}
                </div>
              </div>
              {choice && (
                <div className="res">
                  <b className="tnum">{pts}</b>
                  <span className="lbl2">{c.label}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {choice && (
        <div className={`reveal ${choice.pts >= bestPts ? 'ok' : choice.pts > 0 ? 'part' : 'bad'}`}>
          <div className="verdict">
            +{choice.pts}
            {bestCard && choice.card !== bestCard && (
              <span className="bestwas"> · {lang === 'he' ? 'הכי טוב היה' : 'best was'} {bestCard.name} ({bestPts})</span>
            )}
          </div>
          <button className="btn primary big" onClick={advance}>
            {last ? (lang === 'he' ? 'לתוצאה →' : 'See result →') : `${t.next} →`}
          </button>
        </div>
      )}
    </>
  )
}

const RENDERERS = {
  'odd-one-out': TextOptions,
  'more-medals': FlagDuel,
  podium: Podium,
  'flags-sports': FlagsSports,
  draft: Draft,
}

export default function GamePlayPage() {
  const { id } = useParams()
  const game = gameById(id)
  if (!game) return <Navigate to="/games" replace />
  const Render = RENDERERS[id] || TextOptions
  return <GameShell game={game}>{(p) => <Render game={game} {...p} />}</GameShell>
}

/**
 * The daily is the same shell and the same renderers — only the settings and the seed
 * come from the date instead of from the player. Anything else would have meant a second
 * copy of every game screen to keep in sync.
 */
export function DailyPlayPage() {
  const puzzle = dailyPuzzle()
  const done = dailyResult(puzzle.date)
  if (done) return <Navigate to="/games" replace />
  const Render = RENDERERS[puzzle.game.id] || TextOptions
  return (
    <GameShell game={puzzle.game} daily={puzzle}>
      {(p) => <Render game={puzzle.game} {...p} />}
    </GameShell>
  )
}
