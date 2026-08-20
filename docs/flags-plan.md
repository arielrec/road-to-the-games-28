# Flags — Plan for Review

The last data task before the country games. Nothing here is built yet.

**Decided:** the five entities with no recognisable flag — **EUN, ROC, EOR, IOA, AIN** — stay
in the medal data so totals remain correct, but are **never used as the visual prompt** in a
flag game. Showing the Russian tricolour for ROC would be factually wrong, and an emblem no
player can identify makes a coin-flip question. Cost: a handful of question pairs out of
tens of thousands.

**Decided:** country **names are shown alongside flags by default**, with a *Flags only*
toggle as the hard variant. See §0 — this changes several things downstream.

---

## 0. Names alongside flags — and why it changes the rest

Most people do not know 68 flags. Without names, every country game is gated on flag
recognition rather than on Olympic knowledge, which is not the thing we are trying to test.

**Default: flag + name. Toggle: *Flags only* for the hard variant.**

```
   NAMES SHOWN (default)              FLAGS ONLY (hard)
   ┌──────────┐  ┌──────────┐         ┌──────────┐  ┌──────────┐
   │    🇭🇺     │  │    🇸🇪     │         │    🇭🇺     │  │    🇸🇪     │
   │ Hungary  │  │  Sweden  │         │          │  │          │
   └──────────┘  └──────────┘         └──────────┘  └──────────┘
```

### It is a setting, not a fifth mode

It must **not** multiply with the four difficulty modes — that would give eight combinations
and a confusing setup screen. One toggle, applied globally across More Medals, Podium and
Flags & Sports, remembered in preferences next to language and theme.

### Track two bests, not a score multiplier

Tempting to award bonus points for playing without names. Better not to: it makes a single
"best" number mean two different things depending on a setting the player may have forgotten.
Instead store `best` and `bestFlagsOnly` separately. Two clean numbers beat one muddied one,
and *Flags only* becomes a genuine second challenge rather than a scoring tweak.

### Three problems this quietly solves

1. **Accessibility.** The games stop being a flag quiz for people who came for the Olympics.
2. **Historical flags become answerable.** `URS` labelled *Soviet Union* is a fair question
   even for a player who has never seen the flag. Without the label it is guesswork.
3. **A missing flag degrades instead of breaking.** This is the big one — see below.

### It de-risks the five flags I cannot fetch

With names always available as a fallback, a missing asset renders as a **name-only card**
rather than an empty box. So the build no longer has to hard-fail on a missing flag:

```
  missing flag + names shown   ->  name-only card, question still works
  missing flag + Flags only    ->  skip that question in this mode
```

Practical consequence: **I can ship all 157 immediately**, with URS, GDR, ANZ, AHO and WIF
as name-only cards, and drop the real SVGs in later without touching any game code.
Those five stop being a blocker and become an improvement.

The build should still *report* every missing flag loudly — it just no longer needs to refuse
to build.

---

## 1. Coverage — 157 NOCs, three buckets

| Bucket | Count | Source | Status |
|---|---:|---|---|
| Live countries | **141** | `flag-icons` (MIT, 271 SVGs, ISO 3166 naming) | drops straight in |
| Defunct states | **11** | see §3 — mixed | needs work |
| Excluded from prompts | **5** | EUN · ROC · EOR · IOA · AIN | no asset needed |

141 + 11 + 5 = 157. Full coverage is reachable.

---

## 2. The NOC → ISO mapping

The unavoidable manual piece. IOC codes are not ISO codes and the differences are not
guessable: `GER`→`de`, `SUI`→`ch`, `NED`→`nl`, `RSA`→`za`, `KSA`→`sa`, `TPE`→`tw`.

I drafted all 141 while measuring, and the coverage check immediately caught one of my own
mistakes — **Lebanon is `LIB` in IOC, not `LBN`** — which had silently failed to resolve.
That is exactly the bug class that otherwise appears as a blank box mid-game.

**Therefore: the map is validated at build time, not by eye.** Every NOC present in
`medals.json` must resolve to a real file, or `tools/flags.py` exits non-zero and the build
fails. A missing flag is a broken question, not a cosmetic defect.

---

## 3. The 11 historical flags — the only genuinely manual work

Not all equal. Three tiers:

**Tier 1 — aliases of existing flags (no new asset):**

| NOC | | Note |
|---|---|---|
| `FRG` West Germany | → modern German flag | identical design; the FRG used the plain black-red-gold tricolour |
| `TCH` Czechoslovakia | → modern Czech flag | Czechia kept the Czechoslovak flag after the 1993 split |

Worth stating in the app somewhere — both are genuinely interesting facts, not shortcuts.

**Tier 2 — simple geometry, safe to author directly as SVG (~1 KB each):**

`YUG` Yugoslavia (blue-white-red + red star) · `SCG` Serbia and Montenegro (blue-white-red) ·
`BOH` Bohemia (white over red) · `UAR` United Arab Republic (red-white-black + two green stars)

**Tier 3 — detailed emblems, need a real source:**

`URS` Soviet Union (hammer, sickle and star) · `GDR` East Germany (compass-and-rye emblem) ·
`ANZ` Australasia · `AHO` Netherlands Antilles · `WIF` West Indies Federation

Wikimedia Commons has all five. **These I cannot fetch from inside this session** — the tools
here return web pages as text, not binary files. So either you download five SVGs, or I
author approximations and we accept they are not exact. **I would not ship approximations of
the Soviet flag** — URS is the third-largest medal entity in Olympic history at 1,005 medals
and will appear constantly. It should be right.

**This is the one thing I need from you.** Five files.

---

## 4. Format — hybrid, decided per flag by a script

Measured across all 271 flag-icons files:

| Strategy | Total |
|---|---:|
| All SVG (SVGO-optimised) | 1,899 KB |
| All WebP @ 320px | 1,044 KB |
| **Hybrid — smaller of the two, per flag** | **627 KB** |

Neither format wins outright, which is why this should be a build-time decision rather than
a policy:

```
  Serbia   SVG 177 KB  ->  WebP   7 KB     (detailed coat of arms: WebP wins by 96%)
  Mexico   SVG  82 KB  ->  WebP   3 KB
  Spain    SVG  79 KB  ->  WebP   4 KB
  France   SVG  <1 KB  ->  WebP  <1 KB     (three stripes: SVG wins)
  Japan    SVG  <1 KB  ->  WebP   1 KB     (SVG wins)
```

For your 157 NOCs the hybrid lands around **360 KB**. Since only 68 countries are
recognisable enough to appear in questions, flags **lazy-load on demand** rather than sitting
in the main bundle — first paint of the Games tab should not pull 360 KB of flags it will
not use.

320 px wide is 2× the ~160 px display size, so it stays crisp on retina.

---

## 5. What `tools/flags.py` will do

```
1. read src/data/medals.json                    -> the 157 NOCs that must resolve
2. apply the NOC -> ISO map                     -> 141 from vendored flag-icons
3. add the 11 historical (2 aliased, 4 authored, 5 sourced)
4. skip the 5 no-prompt entities, and mark them noPrompt: true
5. for each flag: SVGO the SVG, render WebP @320, keep whichever is smaller
6. write src/assets/flags/ + src/data/flags.json
7. WARN loudly for any NOC with no asset, and mark it nameOnly: true
   (was: hard-fail — relaxed now that names make a missing flag survivable)
```

`flags.json` shape:

```json
{ "ISR": { "file": "isr.svg", "name": "Israel", "nameHe": "ישראל" },
  "URS": { "file": "urs.webp", "name": "Soviet Union", "nameHe": "ברית המועצות",
           "historical": true, "years": [1952, 1988] },
  "URS-example": { "nameOnly": true },
  "ROC": { "noPrompt": true } }
```

`historical: true` lets the UI add a small "no longer competes" marker — useful context, and
it stops a player thinking the app is broken when a flag they do not recognise appears.

---

## 6. Licensing

- **flag-icons — MIT.** Fine to vendor and redistribute. Attribution goes in the README.
- **Wikimedia historical flags** — mostly public domain (simple designs / government works),
  but **each of the five needs its licence checked individually** before publishing. For a
  personal project this is moot; for a public deploy it is not.
- Flags authored here are original geometry, so no licence question.

---

## 7. Open questions for you

1. **The five Tier-3 flags are no longer blocking** (§0). Whenever convenient, drop URS, GDR,
   ANZ, AHO, WIF from Wikimedia Commons as SVG into `datasetOlympic/flags/` and they will be
   picked up on the next build. Until then they render as name-only cards.
2. **Should historical flags carry a date caption** ("Soviet Union · 1952–1988")? Friendlier,
   and it stops a player assuming the app is broken. I would show it — the medal data already
   knows the years, so it costs nothing.
3. **Should *Flags only* be off or on by default?** I would default it **off** (names shown).
   Discoverable as a challenge for the people who want it, not a wall for everyone else.
4. **Circular or rectangular flags?** Rectangular with rounded corners. Circular crops badly
   for flags whose design lives at the edges — Kuwait, Czechia, the Nordic crosses.
