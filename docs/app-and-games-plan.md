# Olympic Tournaments — Full Plan

The app in one line: **what's coming up across 42 Olympic sports, in English and Hebrew** —
plus a Games tab that teaches Olympic history through play.

Two data worlds, deliberately separate:

| | Source | Covers | Powers |
|---|---|---|---|
| **Tournaments** | your two Excel workbooks | 845 future/recent events, 42 sports | Next Up, Calendar, Sports |
| **Medals** | merged Olympedia + official 2020/2024 feeds | 18,176 medals, 1896–2024, 54 sports, 157 NOCs | Games |

They share the shell — language, theme, navigation, visual language — and nothing else.
That separation is deliberate: updating the Excel can never break a game, and adding a game
can never break the calendar.

---

# Part 1 — The app

## Navigation

Five tabs. Desktop: top bar. Mobile: bottom bar. Identical routes.

```
⚡ Next Up      🗓 Calendar      🏅 Sports      🎮 Games      ★ My Sports
```

## 1.1 Next Up  `/`  — built

The default screen. Answers "what should I care about right now?"

```
┌────────────────────────────────────────────────────────┐
│  Olympic Tournaments                                   │
│  Every world and continental event, in one place.      │
│  [162 upcoming] [845 total] [42 sports] [4 on now]     │
│                                                        │
│  🔍 search…   [Upcoming|On now|Past|All]  [★ mine] [⚙] │
│  ────────────────────────────────────────────────────  │
│  NEXT MAJOR CHAMPIONSHIP                               │
│  ▌🏐 2026 Volleyball Women's Euros    21 Aug–6 Sep     │
│                                                        │
│  ● HAPPENING NOW  4                                    │
│   🏑 2026 FIH Hockey World Cup        15–30 Aug  On now│
│                                                        │
│  NEXT UP  46 results                                   │
│  AUGUST 2026                                           │
│   🤼 2026 Wrestling U20 Worlds        17–23 Aug        │
│  …                                                     │
│  DATES TO BE ANNOUNCED  58                             │
└────────────────────────────────────────────────────────┘
```

**Next major championship** is pinned because 456 of 845 events are International Tournaments —
without it the marquee events drown. **Dates to be announced** surfaces the 58 undated rows
instead of hiding them; it doubles as your own to-do list for the Excel.

## 1.2 Calendar  `/calendar` — built

Month grid where multi-day events span their whole range, colour-coded by level.
Today outlined in gold. Month / List toggle. Below the grid, the same card list for that month.
On mobile the events collapse to coloured bars so the grid still fits.

## 1.3 Sports  `/sports` and `/sports/:slug` — built

Grid of 42 pictograms with a ☆ follow toggle on each. Sport page shows that sport's
tournaments through the same filter engine, a link to the federation's official calendar, and —
when a sport has nothing upcoming — the most recent edition instead of an empty screen.

## 1.4 My Sports  `/me` — built

Follow sports, switch language, switch theme. Stored in `localStorage`.

## 1.5 Games  `/games` — this plan

---

# Part 2 — The Games shell

Built once, reused by all five games. Getting this right matters more than any single game.

## 2.1 Games hub  `/games`

```
┌────────────────────────────────────────────────────────┐
│  Games                                                 │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  🔥 DAILY CHALLENGE          🇰🇪 vs 🇯🇲            │  │
│  │  More Medals · All-time      streak 3   [Play]   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                        │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐          │
│  │ 🏅          │ │ 🥇🥈🥉      │ │ 🚩          │          │
│  │ More Medals│ │ Podium     │ │Flags&Sports│          │
│  │ best: 14   │ │ best: 7    │ │ best: 340  │          │
│  └────────────┘ └────────────┘ └────────────┘          │
│  ┌────────────┐ ┌────────────┐                         │
│  │ ❓          │ │ 🇮🇱          │                         │
│  │Odd One Out │ │ The Draft  │                         │
│  │ best: 22   │ │ best: 61   │                         │
│  └────────────┘ └────────────┘                         │
└────────────────────────────────────────────────────────┘
```

Each tile shows the personal best, so the hub is also the stats screen.

## 2.2 `<GameShell>` — the shared component

Four states, one flow, every game:

```
  SETUP  ──►  PLAY  ──►  RESULT
    ▲                      │
    └──────  play again ───┘
```

- **SETUP** — mode picker (games 1–3) or straight to play (4–5)
- **PLAY** — question, answer, immediate reveal, next
- **RESULT** — score, personal best, share text, play again

The shell owns: score/streak state, the timer if any, keyboard shortcuts (1/2/3, Enter),
the reveal animation, bilingual strings, RTL mirroring, and persistence of bests.
A game supplies only: a question generator, a render function, and a scoring rule.

## 2.3 Determinism — a rule, not a feature

**No `Math.random()` anywhere in game logic.** Every generator takes a seed and returns
the same questions for the same seed. Practice mode seeds from the clock; the daily
challenge seeds from the date.

This costs nothing now and is the only thing that makes a shareable daily challenge
possible later without a rewrite. It also makes bugs reproducible.

## 2.4 Scoring and stats

Per game, in `localStorage` alongside existing prefs:

```
{ played, bestStreak, bestScore, lastPlayed, dailyStreak, history: [last 20] }
```

Shown on the hub tiles and the result screen. No account, no backend.

---

# Part 3 — The games

## 3.1 More Medals  🏅

**Two flags. Which country has won more Olympic medals?** Endless streak.

### Modes

| Mode | Prompt shown | Playable Qs |
|---|---|---|
| All-time | just the two flags | 2,269 |
| By sport | `Judo` + two flags | 18,412 |
| By year | `2016` + two flags | 23,133 |
| Sport + year | `Judo · 2016` + two flags | 27,577 |

Each constrained mode offers **Pick one** (always Judo) or **Random each round** (a different
sport every question). Random is the default — it plays better and it multiplies the pool.

### Layout

```
┌────────────────────────────────────┐        ┌────────────────────────────────────┐
│  ←   Judo · 2016          🔥 7      │        │  ←   Judo · 2016          🔥 8  ✓   │
│                                    │        │                                    │
│  Which won more medals?            │  ───►  │  Which won more medals?            │
│                                    │ answer │                                    │
│   ┌──────────┐    ┌──────────┐     │        │   ┌──────────┐    ┌──────────┐     │
│   │    🇯🇵     │    │    🇫🇷     │     │        │   │  🇯🇵  12  │ ✓  │  🇫🇷  10  │     │
│   │  Japan   │    │  France  │     │        │   │  Japan   │    │  France  │     │
│   └──────────┘    └──────────┘     │        │   └──────────┘    └──────────┘     │
│                                    │        │            [ Next → ]              │
└────────────────────────────────────┘        └────────────────────────────────────┘
```

Two big tap targets, side by side on desktop, stacked on mobile. Reveal shows both counts
so every question teaches something even when you get it wrong.

Country names sit under each flag by default; the *Flags only* setting (§4.2) hides them for
players who want the harder version.

### Difficulty ramp — derived, not chosen

No easy/medium/hard selector. The question bank is pre-ranked by relative gap, and as the
streak grows the pairs get closer:

```
  streak 0–4    gap > 60%      "USA vs Kenya"
  streak 5–9    gap 25–60%     "France vs Italy"
  streak 10+    gap < 25%      "Hungary vs Sweden"     (1,729–2,322 such questions exist)
```

Self-balancing, and "how far can I get" beats picking a difficulty every time.

### Rules

- Both countries must have >0 medals in the slice, and the counts must differ. Ties and
  zero-vs-zero are excluded at build time, not filtered at play time.
- Both countries must be **recognisable** (≥25 medals all-time → 68 countries). A valid
  question between two nations nobody can place is not a question.
- 8 sports are excluded from By sport: Aeronautics, Alpinism, Basque Pelota, Croquet,
  Ice Hockey, Racquets, Roque, **Breaking**. Breaking is the instructive one — 6 countries,
  one Games, one medal each, so *every* pair is a tie.

---

## 3.2 Podium  🥇🥈🥉

**Given a sport and a year, put three countries in medal order.** Hard mode of More Medals,
same dataset, near-free to build on top of it.

### Modes

Same four. 280 sport+year cells can produce an orderable top three of recognisable countries;
30 sports and all 31 years work at the coarser levels.

### Layout

Tap-to-place, not drag — drag is miserable on mobile.

```
┌──────────────────────────────────────┐
│  ←   Athletics · 2016         3 / 5   │
│                                      │
│  Put these in medal order            │
│                                      │
│    ┌────┐   ┌────┐   ┌────┐          │
│    │ 🇰🇪  │   │ 🇺🇸  │   │ 🇯🇲  │   pool  │
│    └────┘   └────┘   └────┘          │
│                                      │
│      🥇        🥈        🥉           │
│    ┌────┐   ┌────┐   ┌────┐          │
│    │    │   │    │   │    │          │
│    └────┘   └────┘   └────┘          │
│                                      │
│            [ Confirm ]               │
└──────────────────────────────────────┘
```

**Scoring: partial credit.** 3 points for a perfect order, 1 for each correctly placed
country. All-or-nothing on a 3-way ordering is punishing — 1/6 of random guesses are perfect,
so most rounds would score zero and it would read as unfair.

Reveal shows all three medal counts.

---

## 3.3 Flags & Sports  🚩

**5 rounds. Each round: a flag. Choose the sport that country is best at.**

### The rule that makes it a game

**No repeats.** Once a sport is used it is gone for the round. Five flags, five unique
sports — an *allocation* problem, not a recall quiz. Spend Athletics on Kenya now, or hold
it in case Jamaica comes up?

That tension is the game, and it holds under **both** scoring systems below.

### Two scoring systems — the player picks

| | Scores | Rewards | Feels like |
|---|---|---|---|
| **Total medals** | raw count in that sport | volume knowledge | "who is big at what" |
| **Specialty %** | share of that country's medals from that sport | identity knowledge | "what is this country known for" |

**Subtlety:** both systems rank a *single* country's sports identically — share is just count
divided by that country's fixed total. What differs is **who deserves the scarce sport**:
Total gives Athletics to the USA (876), Specialty gives it to Kenya (~100 vs the USA's ~31).
The modes diverge at the allocation level, not at "which sport is this country best at".

```
  TOTAL MEDALS                          SPECIALTY %
  🇺🇸 USA   -> Athletics   876 pts        🇰🇪 Kenya -> Athletics  ~100 pts
  🇰🇪 Kenya -> Athletics    ~35 pts        🇺🇸 USA   -> Athletics   ~31 pts
```

Genuinely different games. **Total medals** makes big nations valuable and turns no-repeat
into scarce-resource allocation — you only get to spend Athletics once, so spend it on the
USA. **Specialty %** inverts that: small focused nations score highest, and the tension
becomes matching each country to what it is actually known for.

Neither is a strict improvement on the other, which is why both ship.

**Scores are tracked per scoring system**, since 876 and 100 are not comparable. Combined
with the *Flags only* toggle that gives four separate bests for this game — `total`,
`total:flagsonly`, `share`, `share:flagsonly`. The hub tile shows the best for whatever the
player currently has selected.

### Only TWO difficulty modes here, not four

**Correction to the earlier plan.** More Medals and Podium take four modes; Flags & Sports
cannot. *By sport* and *Sport + year* are nonsensical when **the sport is the answer** — you
cannot fix the round to Judo and then ask which sport the country is best at.

| Mode | Prompt | Notes |
|---|---|---|
| **All-time** | flag | the flagship; works under both scoring systems |
| **By year** | flag + year | "what did they win in 2016?" — prefer **Total medals** here |

Under *Specialty %* a fixed year goes coarse: a country with 3 medals that year can only
score 0 / 33 / 67 / 100. That reads well for Israel 2020 (2 of 4 medals were gymnastics) but
collapses to a coin flip for one-medal countries. Which is precisely why **Total medals**
matters — it is the better fit for year-constrained rounds.

### Layout

```
┌────────────────────────────────────────┐
│  ←   Round 3 / 5              148 pts   │
│                                        │
│              🇰🇪                        │
│             Kenya                      │
│                                        │
│   Which sport are they best at?        │
│                                        │
│   ┌──────────┐┌──────────┐┌──────────┐ │
│   │ Athletics││ Swimming ││   Judo   │ │
│   └──────────┘└──────────┘└──────────┘ │
│   ┌──────────┐┌──────────┐┌──────────┐ │
│   │  Boxing  ││ ~~Rowing~~││ Cycling │ │
│   └──────────┘└─ used ───┘└──────────┘ │
└────────────────────────────────────────┘
```

**The palette is every sport available in the slice** — all 54 all-time, or just those
contested that year (19–36) for *By year*. Alphabetical, so the ordering leaks nothing about
which sports are biggest. Used ones greyed out.

I originally specced a 9-sport shortlist, on the assumption that a big palette would destroy
the no-repeat tension: 5 rounds over 9 sports consumes 55% of the palette, over 54 it consumes
9%. **Measurement disproved that.** Across 53 eligible countries there are only **15 distinct
"best sport" answers** — Athletics alone is the answer for 18 of them — so **75% of rounds
still contain a collision** where two countries want the same sport. Scarcity comes from
concentrated answers, not a small palette.

**Rounds are selectable: 5 / 10 / 15 / 20, default 10.** Bests are tracked per round count,
since a 20-round score is not comparable to a 5-round one.

One consequence worth knowing: the run optimum is an **assignment problem**, and 20 rounds
over 54 sports is ~1e30 permutations. It is solved exactly with the Hungarian algorithm
(`src/lib/assignment.js`), verified against brute force on 400 random matrices.

### 1v1

Both players get the same 5 flags and the same palette, pick blind, reveal together. Same
seed, two score columns. Pass-and-play, no networking.

## 3.4 Odd One Out  ❓

**Four sports. Three were Olympic, one never was.**

### The nice surprise

The *true* options come free from the medal data. These are all real Olympic sports sitting
in `medals.json` right now:

> Aeronautics · Alpinism · Art Competitions · Basque Pelota · Cricket · Croquet ·
> Jeu De Paume · Lacrosse · Motorboating · Polo · Racquets · Roque · Tug-Of-War

Only the **fakes** need writing by hand — perhaps 40 plausible-sounding non-Olympic sports.
That halves the content work, and it means the true answers are guaranteed correct.

### Layout

```
┌────────────────────────────────────┐
│  ←   Odd One Out          🔥 12     │
│                                    │
│  Which was NEVER an Olympic sport? │
│                                    │
│   ┌────────────┐ ┌────────────┐    │
│   │ Tug-of-War │ │  Croquet   │    │
│   └────────────┘ └────────────┘    │
│   ┌────────────┐ ┌────────────┐    │
│   │   Roque    │ │Sepak Takraw│    │
│   └────────────┘ └────────────┘    │
│                                    │
│  ▸ reveal: "Roque — a form of      │
│    croquet. Olympic in 1904 only,  │
│    and the USA won all 3 medals."  │
└────────────────────────────────────┘
```

**The reveal is the payoff.** Each true sport gets one line of real history, drawn from the
data — year, host, who won. That is what makes it delightful rather than a lookup quiz.

Endless streak. No modes needed.

---

## 3.5 The Draft  🇮🇱

**Build an Israeli Olympic team and score it on how those athletes actually did.**

`Israeli_Olympic_Athletes_Results.xlsx` supplied the placement data that was missing:
**473 Summer athletes, 898 athlete-event rows, 75% with a final rank.** That unblocked
everything below.

---

### Not three games — one game, four draft formats

All three formats share the same point table, the same athlete data and the same UI.
They differ only in **what a draftable card is** and **how the pool is filtered each round**.
Build the engine once; the formats are configuration.

| Format | A card is… | Pool | Scored on |
|---|---|---|---|
| **1. Career** | an athlete | 473 | best result ever, +2 per extra Games |
| **2. Edition** | an athlete *at one Games* | 614 | that Games' result only |
| **3. Rolling** | an athlete *at one Games* | filtered by a drawn (year × category) | that Games' result only |
| **4. Squad** | an athlete | 475, one slot per category | best result ever |

**Squad** is the allocation format. You fill one slot per category, and the categories have
genuinely different shapes:

```
  Combat, Strength & Target   median  3   top-10% 26   15 medallists   boom or bust
  Team & Racket               median 11   top-10% 11    0 medallists   flat and safe
  Water                       median  3   top-10% 14   best 42
  Athletics / Gym / Cycling   median  1   top-10% 10
```

So a Team & Racket footballer is reliably worth ~11 and never more — take it and move on.
A Combat pick is usually worthless but might be a judoka worth 30. The decision is whether
to bank the safe slot now or hold it open. Every board carries at least one card from each
category, so there is always a legal pick however the slots have filled.

Format 2 lets the same person appear twice — *Arik Ze'evi 2004* (bronze) and *Ze'evi 2008*
are different cards, which is a nicer question than a single career average. 103 athletes
appear more than once; the maximum is 4 editions.

---

### The point table  — agreed

| Result | Pts | | Result | Pts |
|---|---|---|---|---|
| 🥇 Gold | 40 | | 6th | 9 |
| 🥈 Silver | 30 | | 7th | 7 |
| 🥉 Bronze | 24 | | 8th | 6 |
| 4th | 14 | | 9th–16th | 3 |
| 5th | 11 | | 17th+ | 1 |
| | | | DNS / DNF / DQ | 0 |

Medal-dominant: a gold is ~3.6× a 5th place. **Summer only** — Israel has never medalled at
a Winter Games, so those 29 athletes could never score.

**Career format adds +2 per additional Games.** Peak achievement dominates; longevity breaks
ties. Arik Ze'evi (bronze, 4 Games) reaches 30, edging a one-time bronze medallist.

---

### Why not "sum of all results" — a bias worth recording

Summing every result scored best in simulation, but it is structurally unfair:

```
  Artistic Gymnastics   6.4 entries per athlete
  Swimming              3.0
  Judo                  2.3
  Athletics             1.7
  Football              1.0     <- every team-sport athlete has exactly one
  Basketball            1.0
```

It would reward gymnasts and swimmers over footballers purely for how their sport is
structured. Rejected.

### Candidates per round — 4 / 6 / 8 / 10, default 8

20,000 simulated 5-round drafts:

| Aggregation | Cands | Perfect | Random | Skill gap | Dead rounds |
|---|---|---|---|---|---|
| Best only | 3 | 52 | 26 | 26 | **8.8%** |
| Best + Games | 3 | 57 | 29 | 28 | 5.9% |
| **Best + Games** | **4** | **67** | **29** | **37** | **2.2%** |

A *dead round* is one where every candidate is a dud; a *flat* round is one where nothing
beats 3 points. Raising the candidate count fixes both without distorting the pool:

| Cands | career dead / flat | edition dead / flat |
|---|---|---|
| 4 | 2.4% / 14% | 5.4% / 27% |
| 6 | 0.3% / 5% | 1.2% / 14% |
| **8** | **0.1% / 2%** | **0.3% / 7%** |
| 10 | 0.0% / 1% | 0.1% / 4% |

Default 8, adjustable. This replaces the earlier trick of forcing one strong card into every
board — a bigger board is a more honest fix than rigging the draw.

---

### Format 3 — the four sport categories

Israel's 30 Summer sports, grouped to be both intuitive and evenly sized:

| Category | Athletes | Sports |
|---|---:|---|
| **Water** | 125 | Swimming, Sailing, Artistic Swimming, Canoe, Diving, Marathon Swimming, Surfing |
| **Athletics, Gymnastics & Cycling** | 131 | Athletics, Rhythmic & Artistic Gymnastics, Triathlon, Cycling, Equestrian |
| **Combat, Strength & Target** | 113 | Judo, Wrestling, Fencing, Boxing, Taekwondo, Weightlifting, Shooting, Archery |
| **Team & Racket** | 104 | Football, Baseball, Basketball, Tennis, Badminton, Table Tennis, Golf |

**Feasibility check.** 18 Games × 4 categories = 72 cells. 5 are empty and 18 hold fewer than
4 athletes — too thin to draft from. From 1984 onward, **0 of 44 cells are empty** and only 3
are thin.

So rather than a hard year cut, **only draw cells with ≥4 athletes** — 54 of 72 qualify. That
keeps genuinely interesting old cells (1952 Team, 16 athletes) while skipping the impossible
ones.

---

### Layout

```
┌──────────────────────────────────────────┐
│  ←   The Draft            Round 2 / 5     │
│      2004 · Combat, Strength & Target     │   ← format 3 only
│                                          │
│  YOUR TEAM                          38    │
│   1. Yael Arad      Judo 1992      🥈 30  │
│   2. ______                              │
│                                          │
│  PICK ONE                                │
│   ┌────────────────────────────────────┐ │
│   │ Arik Ze'evi      · Judo · 2004     │ │
│   │ Gal Fridman      · Sailing · 2004  │ │
│   │ Michael Kolganov · Canoe · 2004    │ │
│   │ Alex Averbukh    · Athletics· 2004 │ │
│   └────────────────────────────────────┘ │
│                                          │
│  ▸ reveal: Ze'evi — Bronze, Half-Heavy   │
└──────────────────────────────────────────┘
```

Sport and year are shown on every card, and that is deliberate: with 473 athletes of whom
maybe 50 are household names, **sport and era are the real signal**. Best-score by sport
ranges from Judo 12.7 and Sailing 7.7 down to Athletics 1.7 and Basketball 1.0 — so
"a 2004 judoka" versus "a 1996 swimmer" is an informed bet even when the name means nothing.
That is the game working through knowledge rather than recall.

**Global athletes = a future hard mode**, once this proves out.

# Part 4 — Cross-cutting

## 4.1 Flags — a real task, not a detail

The games are flag-driven, so this needs solving properly.

**Problem 1: IOC codes are not ISO codes.** Flag libraries key on ISO 3166 (`de`, `ch`, `nl`);
the Olympics use NOC codes (`GER`, `SUI`, `NED`). ~136 live NOCs need a mapping table.

**Problem 2: 21 NOCs no longer exist** — and you chose to keep them separate, correctly.
Nine are in the recognisable set and *will* appear in questions:

```
URS 1005 · GDR 409 · FRG 204 · TCH 146 · EUN 112 · YUG 83 · ROC 71 · TPE 43 · SRB 29
```

Standard flag libraries have none of them. Historical flags come from Wikimedia Commons as SVG.

**Problem 3: some have no national flag at all.** EUN (Unified Team), IOA, AIN and EOR
(Refugee Team) competed under the Olympic flag. They need the Olympic rings as their emblem.

**Do not use emoji flags.** They render as letter pairs on Windows, and there is no 🇸🇺.

**Plan:** one `flags.json` mapping NOC → SVG, bundled locally. ~157 small SVGs. Build it once
with the same converter pattern, and validate that every NOC in `medals.json` resolves —
a missing flag should fail the build, not appear as a blank box mid-game.

## 4.2 Names on flags — a display setting, not a mode

Most people do not know 68 flags. Without names, every country game tests flag recognition
rather than Olympic knowledge.

**Default: flag + name. Toggle: *Flags only* as the hard variant.** Applies globally to
More Medals, Podium and Flags & Sports, stored in preferences beside language and theme.

It is deliberately **not** a fifth mode — multiplying it with the four difficulty modes would
give eight combinations and an unusable setup screen.

Scores are tracked as two separate bests (`best`, `bestFlagsOnly`) rather than a points
multiplier, so a single number never means two different things depending on a forgotten
setting.

Side effect worth knowing: with names available, a **missing flag degrades to a name-only
card** instead of an empty box — so historical flags we have not sourced yet stay playable.

## 4.3 Daily Challenge

One puzzle a day, same for everyone, shareable result. A **wrapper** around any game, not a
separate build — which is exactly why §2.3's determinism rule exists.

```
Olympic Tournaments · 12 Aug
More Medals — All-time
🟩🟩🟩🟥🟩  4/5   streak 3
```

Rotate the game daily so the tab stays fresh. Add once two games are solid.

## 4.4 Language

Everything bilingual, English default, Hebrew flips to RTL — same as the rest of the app.
Sport names in the medal data are English-only today; the ~54 that appear in games need
Hebrew, and 42 of them already have it in `sports.json` from your Excel. The remaining
~12 are historical sports (Roque, Jeu De Paume, Basque Pelota) that need a translation
decision — possibly leave transliterated.

---

# Part 5 — Status and order

## Data — done

| File | Rows | Status |
|---|---|---|
| `tournaments.json` | 845 | ✅ 42 sports, bilingual |
| `sports.json` | 42 | ✅ logos + federation links |
| `medals.json` | 6,642 | ✅ 1896–2024, **99.76%** vs verified table; 2020 & 2024 exact |
| `mode_viability.json` | — | ✅ all four modes confirmed viable |
| `flags.json` | 157 | ✅ 147 flag files, 251 KB, hybrid SVG/WebP |

## Build order

```
✅ Odd One Out       shell proven: SETUP/PLAY/RESULT, streaks, seeding, share grid
✅ Flags             147 files, 251 KB — 141 auto, 2 aliased, 4 authored, 5 name-only
✅ More Medals       4 modes, derived difficulty ramp
✅ Podium            rounds scoring, tap-to-place, partial credit
✅ Flags & Sports    2 scoring systems x 2 modes, full 54-sport palette
✅ The Draft         3 formats: Career / Edition / Rolling
▶  Daily Challenge   wrapper over the five games — the only one left
```

**Resolved:** non-medallist scoring. `Israeli_Olympic_Athletes_Results.xlsx` supplied the
placement data, so the Draft is unblocked — 40/30/24 for medals down to 1 for a finish,
best-result aggregation, 4 candidates a round, three draft formats over one engine.
