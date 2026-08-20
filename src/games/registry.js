import { oddOneOut } from './oddOneOut'
import { moreMedals } from './moreMedals'
import { podium } from './podium'
import { flagsSports } from './flagsSports'
import { draft } from './draft'

/** Games that are playable today. Add entries as each one is built. */
export const GAMES = [moreMedals, podium, flagsSports, draft, oddOneOut]

/** Designed and specced, not yet built — shown greyed on the hub so the plan stays visible. */
export const COMING_SOON = []

export const gameById = (id) => GAMES.find((g) => g.id === id)
