import TournamentCard from './TournamentCard'
import { groupByMonth } from '../lib/filters'
import { MONTHS_LONG } from '../lib/dates'
import { useT } from '../lib/i18n'

export default function TournamentList({ items, lang = 'en', grouped = true, showSport = true, limit }) {
  const t = useT(lang)
  const list = limit ? items.slice(0, limit) : items

  if (!list.length) {
    return (
      <div className="empty">
        <h3>{t.noResults}</h3>
      </div>
    )
  }

  if (!grouped) {
    return (
      <div className="cards">
        {list.map((x) => <TournamentCard key={x.id} t={x} lang={lang} showSport={showSport} />)}
      </div>
    )
  }

  const groups = groupByMonth(list)
  return (
    <div>
      {[...groups.entries()].map(([key, rows]) => {
        let label = t.tba
        if (key !== 'tba') {
          const [y, m] = key.split('-')
          label = `${MONTHS_LONG[lang][Number(m) - 1]} ${y}`
        }
        return (
          <section key={key}>
            <div className="monthhead">{label}</div>
            <div className="cards">
              {rows.map((x) => <TournamentCard key={x.id} t={x} lang={lang} showSport={showSport} />)}
            </div>
          </section>
        )
      })}
    </div>
  )
}
