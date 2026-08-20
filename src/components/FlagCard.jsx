import { flagSrc, displayName, isHistorical, historicalYears } from '../games/medalData'

const flagUrls = import.meta.glob('../assets/flags/*.{svg,webp}', { eager: true, import: 'default' })
const URLS = Object.fromEntries(
  Object.entries(flagUrls).map(([p, u]) => [p.split('/').pop(), u])
)

/**
 * The question itself, in the country games.
 *
 * Names show by default — most people do not know 68 flags, and without the name the
 * game tests flag recognition rather than Olympic knowledge. `showName={false}` is the
 * harder variant. A country with no flag asset falls back to a name card, which is why
 * a missing historical flag never breaks a question.
 */
export default function FlagCard({ noc, lang = 'en', showName = true, total = null, state = '' }) {
  const file = flagSrc(noc)
  const url = file ? URLS[file] : null
  const name = displayName(noc, lang)
  const years = isHistorical(noc) ? historicalYears(noc) : null

  return (
    <div className={`flagcard ${state}`}>
      <div className="flagimg">
        {url
          ? <img src={url} alt={showName ? '' : name} loading="lazy" />
          : <span className="flagfallback">{noc}</span>}
      </div>
      {showName && <div className="flagname">{name}</div>}
      {showName && years && (
        <div className="flagyears tnum">{years[0]}–{years[1]}</div>
      )}
      {total !== null && <div className="flagtotal tnum">{total}</div>}
    </div>
  )
}
