/**
 * The font, self-hosted.
 *
 * It used to load from Google Fonts, which was the app's only third-party request — and
 * the only reason the privacy story needed a paragraph rather than a sentence. The npm
 * package ships the same OFL-licensed files, so the typography is byte-identical and now
 * nothing about a visitor leaves their browser. Only the five weights the design uses,
 * and only the Latin and Hebrew subsets, so this costs about 60 KB rather than the 944 KB
 * the full package contains.
 */
import '@fontsource/heebo/latin-400.css'
import '@fontsource/heebo/latin-500.css'
import '@fontsource/heebo/latin-600.css'
import '@fontsource/heebo/latin-700.css'
import '@fontsource/heebo/latin-800.css'
import '@fontsource/heebo/hebrew-400.css'
import '@fontsource/heebo/hebrew-500.css'
import '@fontsource/heebo/hebrew-600.css'
import '@fontsource/heebo/hebrew-700.css'
import '@fontsource/heebo/hebrew-800.css'

import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)
