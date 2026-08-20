/**
 * Calendar export. Builds RFC 5545 text in the browser and downloads it — no backend,
 * no dependency, works offline.
 *
 * All-day events use DATE values, and DTEND is exclusive per the spec, so a tournament
 * ending on the 24th must be written as the 25th or calendars drop the final day.
 */
const pad = (n) => String(n).padStart(2, '0')
const stamp = (iso) => iso.replace(/-/g, '')

function nextDay(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + 1))
  return `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`
}

/** Escape per RFC 5545: backslash, semicolon, comma, newline. */
const esc = (s = '') => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;')
  .replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

/** Fold lines at 75 octets, continuation lines start with a space. */
function fold(line) {
  const out = []
  let s = line
  while (s.length > 73) { out.push(s.slice(0, 73)); s = ' ' + s.slice(73) }
  out.push(s)
  return out.join('\r\n')
}

function vevent(t, lang = 'en') {
  const name = (lang === 'he' ? t.nameHe : t.name) || t.name
  const place = [t.city, (lang === 'he' ? t.locationHe : t.location)].filter(Boolean).join(', ')
  const sport = (lang === 'he' ? t.sportHe : t.sport) || t.sport
  const desc = [t.description, sport + (t.discipline ? ` · ${t.discipline}` : ''),
                t.level, t.provisional ? `(${t.dateStatus})` : '', t.url]
    .filter(Boolean).join('\n')
  return [
    'BEGIN:VEVENT',
    fold(`UID:${esc(t.id)}@road-to-the-games`),
    `DTSTART;VALUE=DATE:${stamp(t.start)}`,
    `DTEND;VALUE=DATE:${nextDay(t.end || t.start)}`,
    fold(`SUMMARY:${esc(name)}`),
    place ? fold(`LOCATION:${esc(place)}`) : null,
    fold(`DESCRIPTION:${esc(desc)}`),
    t.url ? fold(`URL:${esc(t.url)}`) : null,
    t.provisional ? 'STATUS:TENTATIVE' : 'STATUS:CONFIRMED',
    'END:VEVENT',
  ].filter(Boolean).join('\r\n')
}

export function buildIcs(items, lang = 'en') {
  const dated = items.filter((t) => t.start)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Road to the Games//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold('X-WR-CALNAME:Road to the Games'),
    ...dated.map((t) => vevent(t, lang)),
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcs(items, filename = 'tournaments.ics', lang = 'en') {
  const list = Array.isArray(items) ? items : [items]
  const blob = new Blob([buildIcs(list, lang)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return list.filter((t) => t.start).length
}
