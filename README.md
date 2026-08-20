# Olympic Tournaments

Upcoming world and continental tournaments across 42 Olympic sports, in English and Hebrew.

Built from two spreadsheets — `Sports.xlsx` and `TournamentsDescription.xlsx` — which stay the
single source of truth. The app never edits them; a converter turns them into JSON at build time.

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

Deploying: the build is fully static and uses hash routing, so `dist/` can be dropped on
Netlify, GitHub Pages, or any static host with no server config or redirect rules.

---

## Updating the tournament data

`TournamentsDescription_Updated_LA28_Master.xlsx` is the single source. Its **All Tournaments**
sheet carries all 1,338 events across 39 columns, and the per-sport sheets sum to it exactly.
`Sports.xlsx` is no longer needed — Hebrew, federations and official URLs all come from the master.

```bash
npm run data     # tools/tournaments.py -> tournaments.json + sports.json + meta.json
npm run gaps     # which sports still need future events
```

### Sport -> discipline hierarchy

The source lists 42 "sports", but six are sailing classes and five are cycling disciplines.
`tools/sport_tree.py` groups them into **24 real sports**: Sailing holds six classes, Cycling
five, Aquatics five, Gymnastics three, Canoe/Basketball/Volleyball two each.

This matters beyond tidiness — before it, following sailing meant following six separate
entries, and the sports grid showed six near-identical tiles.

### What the converter reports rather than fixes

Long spans are only flagged past 365 days, because season-format competitions (Pro League,
Nations League) legitimately run for months. Two Basketball rows trip it — mistyped end years,
still present in the source.

---

Putting it online: see **DEPLOY.md**.
Updating the data later: see **UPDATE.md** (or just run `npm run update`).
Before publishing anywhere public: see **ATTRIBUTION.md**.

## Project layout

```
tools/update.py         one command: rebuild data + show the diff + audit
tools/tournaments.py    Excel  ->  src/data/*.json          (re-runnable)
tools/audit.py          checks the workbook for impossible dates, changes nothing
tools/gaps.py           which sports need future events added
src/data/*.json         generated — do not hand-edit
src/assets/logos/       42 sport pictograms (optimised: 29 MB -> 3.4 MB)

src/lib/data.js         loads JSON, attaches logo URLs, precomputes search text
src/lib/filters.js      THE filter engine — every screen calls filterTournaments()
src/lib/dates.js        parsing, status (upcoming/live/past/tba), bilingual formatting
src/lib/prefs.js        followed sports + language + theme, persisted to localStorage
src/lib/i18n.js         UI strings; L(obj, field, lang) picks name vs nameHe

src/components/         TournamentCard, TournamentList, FilterBar
src/pages/              Home, Calendar, Sports, SportDetail, Games, Preferences
```

### The one idea worth knowing

Every screen filters through the same function:

```js
filterTournaments(scope, filters, followedSports, today)
```

`scope` is the set of tournaments that screen cares about — all of them on Home and Calendar,
one sport's worth on a sport page. Filters therefore behave identically everywhere, and adding a
new facet means touching `filters.js` and `FilterBar.jsx` only.

`facetsFor(list, lang)` returns only the filter values still reachable, with counts, so the UI
never offers a filter that would return nothing. Filter *values* stay English internally, so a
language switch preserves the user's selection.

---

## Games

The Games tab lives in `src/games/` and shares the app shell but not its data.

```
tools/medals.py       merges 3 medal sources -> src/data/medals.json   (validated)
tools/viability.py    how many real questions each game mode yields
tools/oddoneout.py    builds the Odd One Out bank from medals.json
tools/countries_he.py Hebrew + short display names by IOC code

src/lib/seed.js       seeded RNG — game logic never calls Math.random()
src/lib/gameStats.js  per-game best/played/history in localStorage
src/components/GameShell.jsx   SETUP -> PLAY -> RESULT, shared by every game
src/games/registry.js which games are live, which are still coming
```

### Odd One Out draws from rare sports

The true options come mostly from the 25 sports that were dropped or ran at six Games or
fewer. Next to Athletics and Swimming any decoy is obvious; next to Roque, Jeu de Paume and
Basque Pelota it is a real question. Two rare options from the first round, three once the
streak builds.

### The determinism rule

**Game logic must never call `Math.random()`.** Every question generator takes a seed:

```js
game.makeQuestion(`${seedBase}:${streak}`, streak)
```

Same seed, same question, always. That is what makes a shareable daily challenge possible
later without rewriting the games — seed from the date instead of the clock — and it means
any bug can be reproduced from its seed alone.

### The Draft — one engine, four formats

`tools/draft.py` turns `Israeli_Olympic_Athletes_Results.xlsx` into `draft.json`. That
workbook is the only source with **placement** data — the medal dataset knows who won a
medal but not who came 4th, which is why non-medallists could not be scored before.

```
475 athletes    Career format  — best result ever, +2 per extra Games
614 editions    Edition format — one card per athlete per Games
 36 slots       Rolling format — draws a (year x sport-category) slot each round
  4 slots       Squad format   — one slot per category; safe-but-flat vs boom-or-bust
```

### Scoring is a percentile, not a rank

Medals are absolute (40/30/24). **Everything else is scored against the size of the field
in that exact event at that exact Games**, because rank alone is meaningless: 7th of 8 is
near-last while 10th of 100 is excellent, and a rank table scored them almost the same.

```
pts = 20 x (1 - pct)^1.35        pct = (rank - 1) / (field - 1)

  7th of 8    ->  2        5th of 16   -> 13
  5th of 6    ->  2        10th of 100 -> 18
  15th of 16  ->  1         4th of 60  -> 19
```

Capped at 20 so a placing never outscores a bronze. The exponent is a balance: 2.5 separates
the top beautifully but crushes 43% of the pool to one point; 1.35 keeps 7th-of-8 worthless
while leaving the middle of the field distinguishable.

**Field sizes come from `athlete_events_through_2026.csv`**, which lists every competitor
rather than only medallists — teams for team events, athletes otherwise. 96% of rows match
by event; the rest fall back to a sport-year median, and the converter reports how many.

This is what fixed the squad-sport distortion. Israel's 2020 baseball team finished 5th of
six having lost every game; under a rank table all 24 players scored the same as a real 5th
place. They now score 2, while the 1968 footballers who finished 5th of sixteen score 13.

Summer only.

**Why not "sum of every result":** entries per athlete are 6.4 for gymnasts and 3.0 for
swimmers but exactly 1.0 for every team-sport athlete, so summing would reward gymnasts over
footballers purely for how their sport is structured.

### What a card may reveal

Three things leaked the answer before a pick and are now hidden until the reveal:

- **the medal icon** — a gold next to a name is the answer, on sight
- **the Games count** — in Career format it literally encodes the +2/extra-Games bonus
- **sport and year** in *Hard* difficulty — sport is the strongest single predictor of
  score (Judo averages 12.7 a head, Basketball 1.0), so hiding it is the real hard mode

### Every round has to be worth playing

With only 4 candidates, **14% of career rounds and 27% of edition rounds had no candidate
worth more than 3 points** — four also-rans is noise, not a decision. Raising the board to
**8 candidates** (adjustable 4/6/8/10) cuts that to 2% and 7% without rigging the draw.

Rolling still needs a slot-level filter: 16 of 52 (year x category) slots contain nothing
worth picking at all and are excluded, leaving 36.

**Scoring field per format matters:** Career and Squad draw from `athletes[]` and score on
`career`; Edition and Rolling draw from `editions[]` and score on `pts`. Mixing them yields
NaN rather than a wrong number.

### The calendar shows starts, not spans

Four events legitimately run for months (UEFA Nations League 262 days, FIH Pro League 202).
Painting them across every cell told the reader nothing, and before the end-year typos in
two Basketball rows were repaired, a single event covered every cell for two years.

So the grid separates **starting** from **ongoing**: bars for what begins that day, a
muted `+N` for what merely runs through it, and a *Starts only* toggle on by default.
Cells show a count and coloured bars rather than truncated titles — four stacked
"2025 FIBA Men's U1..." labels conveyed nothing. Clicking a day opens it in full, split
into Starting and Ongoing.

### Two scoring models

`scoring: 'streak'` — endless, ends on a wrong answer (Odd One Out, More Medals).
`scoring: 'rounds'` — fixed rounds with points, `submit(points, mark)` per round (Podium).

The shell handles both; a game just declares which it is.

### Whole-run games

Most games generate one question per step. Flags & Sports needs a **single sport palette
shared across all five rounds**, so the shell passes `opts.runSeed` (stable for the run)
alongside the per-step seed. The game builds and caches the whole run from it.

It also solves the optimal assignment exactly so the result can say "125 of a possible 218"
rather than an unanchored number. That is a real assignment problem — 20 rounds over 54
sports is ~1e30 permutations — so `src/lib/assignment.js` implements Hungarian/JV in
O(n^2 m). It is verified against brute force on 400 random matrices; at 20x54 it solves in
under a millisecond.

The sport palette is **every** sport in the slice: all 54 all-time, or the 19-36 contested in
a chosen year. A 9-sport shortlist was the original design, dropped after measuring that
no-repeat tension survives a full palette — only 15 distinct "best sport" answers exist across
53 countries, so 75% of rounds still contain a collision.

### A player's chosen slice is never silently swapped

If the player fixes a year, the generator picks a SPORT that works in that year rather than
a random one. When a slice yields no question it relaxes only what the player did *not*
choose. Before this, choosing 1996 could produce "Art Competitions - 1936": the random sport
had no 1996 edition, and the fallback discarded the year instead of re-rolling the sport.

`sportsInYear(year, minDistinct)` in `medalData.js` is what makes that possible.

### Podium samples triples, it does not walk the ranking

Triples are drawn from anywhere in the table and filtered by their SMALLEST relative gap —
the pair a player can actually get wrong. An earlier version only considered *consecutive*
triples; because the gaps at the top are enormous (USA 2783 vs GBR 1022), exactly one triple
cleared the easy band, so the first three rounds of every game were USA, GBR, URS.
Variety went from 1 distinct triple per difficulty band to ~583 in 600 draws.

### Mode viability is enforced, not assumed

`usableYears(sportIndex, minDistinct)` and `usableSports(minDistinct, withYear)` in
`medalData.js` compute which slices can actually produce a question. **A duel needs 2
distinct totals; a podium needs 3.** Podium's sport list is therefore a stricter subset —
43 sports for More Medals, 29 for Podium's sport+year mode.

Getting this wrong is subtle and bad: the mode silently falls back to another slice, so the
player picks "Sport + year" and quietly gets an all-time question. Before this was enforced,
Podium's sport+year mode fell back **45% of the time**.

### Adding a game

Export an object with `id`, `icon`, `title`, `blurb`, `prompt` and `makeQuestion(seed, streak)`,
add it to `GAMES` in `registry.js`, and render its options inside `<GameShell>`. The shell
handles score, streak, persistence, keyboard input, the result screen and share text.

### Rebuilding the game data

```bash
python tools/medals.py       # -> medals.json, validated against the verified medal table
python tools/viability.py    # -> how many questions each mode has
python tools/oddoneout.py    # -> oddoneout.json
python tools/flags.py        # -> src/assets/flags/ + flags.json   (asset build, see below)
```

`medals.py` prints every Games where its count differs from the verified table rather than
hiding it. `oddoneout.py` hard-fails if a decoy is ever also a real Olympic sport.

### Flags

`tools/flags.py` is an **asset build** — its outputs are committed, so you never need to run
it just to run the app. It needs `cairosvg`, `Pillow` and `svgo`, plus `flag-icons`
(a devDependency, so `npm install` provides it).

157 NOCs, three buckets: **141** live countries from `flag-icons` via the `NOC -> ISO` table in
`tools/noc_iso.py`, **2** aliases (West Germany used the plain German tricolour; Czechia kept
the Czechoslovak flag), **4** historical flags authored in `tools/flags_authored/`, and **5**
entities that competed under the Olympic flag (EUN, ROC, EOR, IOA, AIN) which stay in the
medal totals but are never shown as a visual prompt.

Format is chosen **per flag** by whichever is smaller. Neither wins outright — Serbia is
177 KB as SVG and 7 KB as WebP, while France is under 1 KB as SVG and larger as WebP.
Result: 147 files, **251 KB**.

To add a missing historical flag (URS, GDR, ANZ, AHO, WIF), drop `<noc>.svg` into
`datasetOlympic/flags/` and re-run. Until then those render as name cards — which is safe,
because names are shown beside flags by default.

### Names on flags

Country names show beside flags by default; *Flags only* is the harder variant, toggled on
each country game's setup screen and stored globally in preferences.

It is a **setting, not a fifth mode** — multiplying it with the four difficulty modes would
give eight combinations. Scores are kept as two separate bests (`more-medals` and
`more-medals:flagsonly`) rather than a points multiplier, so one number never means two
different things depending on a forgotten toggle.

## Notes

- **Language**: opens in English; the toggle (top-right) switches to Hebrew and flips the whole
  layout to RTL. The choice persists.
- **Following sports**: stored in `localStorage` under `olympic-app:prefs:v1`. No account needed.
  If you later want preferences to sync across devices, `src/lib/prefs.js` is the only file that
  has to change.
- **Games tab**: all five games are playable — More Medals, Podium, Flags & Sports,
  The Draft (3 formats) and Odd One Out. The daily challenge wrapper is still to build.
- **Bundle**: ~107 KB gzipped, and the tournament JSON is bundled rather than fetched, so
  filtering is instant and the app works offline after first load.
