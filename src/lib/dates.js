export const todayISO = () => {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export const parseISO = (iso) => {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const daysBetween = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000)

/** upcoming | live | past | tba */
export function statusOf(t, today = todayISO()) {
  if (!t.start) return 'tba'
  const end = t.end || t.start
  if (end < today) return 'past'
  if (t.start <= today) return 'live'
  return 'upcoming'
}

const MONTHS = {
  en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
  he: ['ינו','פבר','מרץ','אפר','מאי','יונ','יול','אוג','ספט','אוק','נוב','דצמ'],
}
export const MONTHS_LONG = {
  en: ['January','February','March','April','May','June','July','August','September','October','November','December'],
  he: ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'],
}
export const WEEKDAYS = {
  en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  he: ['א','ב','ג','ד','ה','ו','ש'],
}

/** "12–18 Aug 2026" / "28 Sep – 6 Oct 2027" — collapses the shared parts. */
export function formatRange(t, lang = 'en') {
  if (!t.start) return lang === 'he' ? 'תאריך טרם נקבע' : 'Date TBA'
  const s = parseISO(t.start)
  const e = parseISO(t.end || t.start)
  const M = MONTHS[lang] || MONTHS.en
  const day = (d) => d.getDate()
  if (+s === +e) return `${day(s)} ${M[s.getMonth()]} ${s.getFullYear()}`
  if (s.getFullYear() === e.getFullYear()) {
    if (s.getMonth() === e.getMonth()) return `${day(s)}–${day(e)} ${M[s.getMonth()]} ${s.getFullYear()}`
    return `${day(s)} ${M[s.getMonth()]} – ${day(e)} ${M[e.getMonth()]} ${s.getFullYear()}`
  }
  return `${day(s)} ${M[s.getMonth()]} ${s.getFullYear()} – ${day(e)} ${M[e.getMonth()]} ${e.getFullYear()}`
}

/** "in 3 days" / "starts tomorrow" / "on now" */
export function countdownLabel(t, lang = 'en', today = todayISO()) {
  const st = statusOf(t, today)
  if (st === 'tba') return null
  if (st === 'live') return lang === 'he' ? 'מתקיים כעת' : 'On now'
  if (st === 'past') return null
  const d = daysBetween(today, t.start)
  if (lang === 'he') {
    if (d === 0) return 'מתחיל היום'
    if (d === 1) return 'מתחיל מחר'
    if (d < 7) return `בעוד ${d} ימים`
    if (d < 31) return `בעוד ${Math.round(d / 7)} שבועות`
    if (d < 365) return `בעוד ${Math.round(d / 30)} חודשים`
    return `בעוד ${Math.floor(d / 365)} שנים`
  }
  if (d === 0) return 'Starts today'
  if (d === 1) return 'Starts tomorrow'
  if (d < 7) return `In ${d} days`
  if (d < 31) return `In ${Math.round(d / 7)} weeks`
  if (d < 365) return `In ${Math.round(d / 30)} months`
  const y = Math.floor(d / 365)
  return `In ${y} year${y > 1 ? 's' : ''}`
}
