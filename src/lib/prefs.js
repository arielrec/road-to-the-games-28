import { useCallback, useEffect, useState } from 'react'

const KEY = 'olympic-app:prefs:v1'
const DEFAULTS = { lang: 'en', followed: [], theme: 'dark', flagsOnly: false }

const read = () => {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}
const write = (p) => {
  try { localStorage.setItem(KEY, JSON.stringify(p)) } catch { /* private mode */ }
}

let current = read()
const listeners = new Set()
const emit = () => listeners.forEach((l) => l(current))

export function setPrefs(patch) {
  current = { ...current, ...patch }
  write(current)
  emit()
}

export function usePrefs() {
  const [p, setP] = useState(current)
  useEffect(() => {
    listeners.add(setP)
    return () => listeners.delete(setP)
  }, [])

  const toggleFollow = useCallback((slug) => {
    const has = current.followed.includes(slug)
    setPrefs({ followed: has ? current.followed.filter((s) => s !== slug) : [...current.followed, slug] })
  }, [])

  const setLang = useCallback((lang) => setPrefs({ lang }), [])
  const toggleFlagsOnly = useCallback(() => setPrefs({ flagsOnly: !current.flagsOnly }), [])
  const toggleLang = useCallback(() => setPrefs({ lang: current.lang === 'en' ? 'he' : 'en' }), [])

  return { ...p, toggleFollow, setLang, toggleLang, toggleFlagsOnly,
           isFollowing: (s) => p.followed.includes(s) }
}
