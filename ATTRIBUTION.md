# Data and asset sources

Read this before publishing the app anywhere public. Everything below is fine for
personal use; two items need a decision before the app goes on the open web, and they are
marked **CHECK BEFORE PUBLISHING**.

## Tournament data

`TournamentsDescription_Updated_LA28_Master.xlsx` — compiled by hand for this project from
international federation calendars. 1,338 events, 682 with a link to the organiser's own
page. Facts about when a public sporting event takes place are not copyrightable; the
compilation is your own work.

Six rows are corrected in `tools/tournaments.py` against published sources, each with the
URL beside it. Five more had invented precise dates replaced with "TBA" or "provisional".
Run `npm run audit` to regenerate the list of rows that still need checking.

## Medal data

Merged in `tools/medals.py` from three sources:

- `athlete_events_through_2026.csv` — the moderndive/olympicAthletes dataset on GitHub,
  itself derived from the Sports Reference / OlyMADMen data. Widely redistributed for
  educational use; confirm the repository's licence file before commercial use.
- Official Tokyo 2020 and Paris 2024 results files supplied by you, used because the
  bulk dataset is missing roughly 80 team events per Games for those two editions.

`Israeli_Olympic_Athletes_Results.xlsx` — your own compilation, used by The Draft.

## Flags

147 flag images in `src/assets/flags/`. Current-nation flags come from
[flag-icons](https://github.com/lipis/flag-icons) (MIT). Historical flags were either
supplied by you from Wikimedia Commons or authored in `tools/flags_authored/`. Flags of
sovereign states are generally public domain, but a few Wikimedia files carry attribution
requirements — check any you took from there.

Two NOCs (the Soviet Union and East Germany) deliberately have no flag and render as name
cards instead.

## Sport pictograms — **CHECK BEFORE PUBLISHING**

43 images in `src/assets/logos/`, supplied by you as 1024×1024 PNGs and optimised here
from 29 MB to 3.4 MB. **I do not know where these came from and cannot verify their
licence.** If any of them are official Olympic or federation pictograms, they are
copyrighted and cannot be republished without permission. If you drew or generated them,
there is nothing to do. This is the single most likely thing to cause a takedown, and it
is the one question only you can answer.

## The word "Olympic" — **CHECK BEFORE PUBLISHING**

"Olympic", "Olympics", "Olympiad", the five rings and the motto are protected marks of the
International Olympic Committee in most countries, and national committees enforce them
against unaffiliated apps. This is why the app is called **Road to the Games** and not
"Olympic Tournaments".

The name is clear. What is left to consider: the app description, the app-store listing if
there is one, and the game titles. Describing the content factually ("world and continental
championships", "medal totals by country") is normal reporting. Implying endorsement, or
using the rings, is not.


## Named athletes — a privacy note, not a blocker

The Draft names 475 real Israeli Olympians with their sport, the Games they competed at
and where they placed. That is personal data under GDPR even though every fact is a
published sporting result about someone competing in public. Three things make it low
risk: the data is public and was published by the organisers themselves, it is limited to
their sporting record with nothing private attached, and a public-interest / journalistic
basis covers this kind of sports reporting.

Worth doing anyway if the app goes public: be ready to remove an individual on request,
and keep the source file so a correction can actually be made. Do not add anything beyond
competition results — no dates of birth, no photographs, no contact details.

## Security posture

- **No backend, no accounts, no analytics, no cookies.** Nothing about a visitor leaves
  their browser. This is what keeps the privacy story short.
- **Content-Security-Policy** in `index.html` locks `script-src` to `'self'`, so nothing
  outside the app's own files can execute whatever ends up in the data.
- **`public/_headers`** adds the headers a meta tag cannot set — `frame-ancestors`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. Netlify and Cloudflare Pages
  read it automatically. GitHub Pages cannot set headers, so there only the meta CSP
  applies and the app can be framed by other sites.
- **External links** pass through `safeUrl()`, which allows only http(s), and carry
  `rel="noopener noreferrer"`.
- **Dependencies**: `npm audit` reports 0 vulnerabilities. Re-check before each deploy;
  React Router had two moderate advisories that the v7 upgrade cleared.

## Fonts

Heebo, **self-hosted** from the `@fontsource/heebo` npm package (OFL-1.1), only the five
weights the design uses and only the Latin and Hebrew subsets — about 87 KB. It used to
load from Google Fonts, which was the app's single third-party request and the only reason
the privacy story needed more than one sentence.

## What the app sends anywhere

Nothing at all. No backend, no analytics, no cookies, no accounts, and — since the font
was brought in-house — no third-party requests of any kind. Verified by loading every
screen with request logging on: the only host contacted is the one serving the app.
Followed sports, language, theme, game scores and daily results live in the visitor's own
`localStorage` and never leave the device. The only outbound traffic is a link the visitor
chooses to click.
