import { useMemo, useState } from 'react'
import { SPORTS } from '../lib/data'
import { facetsFor, activeFilterCount, toggleFacet, EMPTY_FILTERS, FACET_DEFS } from '../lib/filters'
import { useT, L } from '../lib/i18n'

const T = {
  en: { sport: 'Sport', discipline: 'Discipline', year: 'Year', more: 'more', less: 'less',
        qualifiers: 'LA28 pathway', results: 'results' },
  he: { sport: 'ענף', discipline: 'תת-ענף', year: 'שנה', more: 'עוד', less: 'פחות',
        qualifiers: 'מסלול LA28', results: 'תוצאות' },
}

/** One facet group. Long lists collapse to a preview so ten dimensions still fit on a screen. */
function Group({ label, entries, isOn, onToggle, preview = 10, render }) {
  const [open, setOpen] = useState(false)
  if (!entries.length) return null
  const shown = open ? entries : entries.slice(0, preview)
  return (
    <div className="fgroup">
      <div className="lbl">{label}</div>
      <div className="chips">
        {shown.map((e) => render(e))}
        {entries.length > preview && (
          <button className="chip ghost" onClick={() => setOpen((o) => !o)}>
            {open ? '− ' : `+${entries.length - preview} `}
          </button>
        )}
      </div>
    </div>
  )
}

export default function FilterBar({
  filters, onChange, scope, lang = 'en', followed = [], hide = [], showWhen = true, resultCount,
}) {
  const t = useT(lang)
  const tt = T[lang] || T.en
  const [open, setOpen] = useState(false)
  const facets = useMemo(() => facetsFor(scope, lang), [scope, lang])
  const n = activeFilterCount(filters)
  const show = (k) => !hide.includes(k)

  const hasFacet = (key, v) => (filters.facets?.[key] || []).includes(v)
  const flip = (key, v) => onChange(toggleFacet(filters, key, v))
  const toggleList = (key, v) => {
    const cur = filters[key] || []
    onChange({ ...filters, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] })
  }

  const sportsInScope = SPORTS
    .filter((s) => facets.sports.get(s.slug))
    .sort((a, b) => facets.sports.get(b.slug) - facets.sports.get(a.slug))

  return (
    <div className="filterbar">
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <div className="searchbox">
          <input type="search" value={filters.q} placeholder={t.search}
                 onChange={(e) => onChange({ ...filters, q: e.target.value })} />
        </div>

        {showWhen && (
          <div className="segmented">
            {['upcoming', 'live', 'past', 'all'].map((w) => (
              <button key={w} className={filters.when === w ? 'on' : ''}
                      onClick={() => onChange({ ...filters, when: w })}>
                {w === 'upcoming' ? t.upcoming : w === 'live' ? t.onNow : w === 'past' ? t.past : t.all}
              </button>
            ))}
          </div>
        )}

        {followed.length > 0 && (
          <button className={`chip ${filters.onlyFollowed ? 'on' : ''}`}
                  onClick={() => onChange({ ...filters, onlyFollowed: !filters.onlyFollowed })}>
            ★ {t.onlyMySports}
          </button>
        )}

        <button className={`chip ${filters.onlyQualifiers ? 'on' : ''}`}
                onClick={() => onChange({ ...filters, onlyQualifiers: !filters.onlyQualifiers })}>
          🎯 {tt.qualifiers}
        </button>

        <button className={`btn ${n ? 'primary' : ''}`} onClick={() => setOpen((o) => !o)}>
          {t.filters}{n > 0 ? ` · ${n}` : ''} {open ? '▲' : '▼'}
        </button>

        {n > 0 && (
          <button className="linkbtn" onClick={() => onChange({
            ...EMPTY_FILTERS, when: filters.when, onlyFollowed: filters.onlyFollowed })}>
            {t.clear}
          </button>
        )}

        {resultCount !== undefined && (
          <span className="dim tnum" style={{ marginInlineStart: 'auto' }}>
            {resultCount} {tt.results}
          </span>
        )}
      </div>

      {open && (
        <div className="drawer">
          {show('sports') && sportsInScope.length > 1 && (
            <Group label={tt.sport} entries={sportsInScope} preview={12}
                   render={(s) => (
                     <button key={s.slug}
                             className={`chip ${(filters.sports || []).includes(s.slug) ? 'on' : ''}`}
                             onClick={() => toggleList('sports', s.slug)}>
                       {s.logoUrl && <img src={s.logoUrl} alt="" />}
                       {L(s, 'name', lang)} <span className="n">{facets.sports.get(s.slug)}</span>
                     </button>
                   )} />
          )}

          {FACET_DEFS.filter((d) => show(d.key)).map((d) => (
            <Group key={d.key} label={d.label[lang] || d.label.en} entries={facets[d.key]}
                   preview={d.key === 'federation' || d.key === 'location' || d.key === 'seriesName' ? 8 : 12}
                   render={([v, c]) => (
                     <button key={v} className={`chip ${hasFacet(d.key, v) ? 'on' : ''}`}
                             onClick={() => flip(d.key, v)}>
                       {v} <span className="n">{c}</span>
                     </button>
                   )} />
          ))}

          {facets.years.length > 1 && (
            <Group label={tt.year} entries={facets.years} preview={12}
                   render={(y) => (
                     <button key={y} className={`chip tnum ${(filters.years || []).includes(y) ? 'on' : ''}`}
                             onClick={() => toggleList('years', y)}>{y}</button>
                   )} />
          )}
        </div>
      )}
    </div>
  )
}
