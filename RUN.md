# Running the app

## One-time setup

**1. Install Node.js** — https://nodejs.org, take the LTS build. Version 18 or newer.
   Check it worked by opening a terminal and running:

   ```
   node -v
   ```

**2. Unzip `olympic-app.zip`** somewhere sensible, e.g. `Desktop\olympic-app`.

**3. Open a terminal in that folder.**
   On Windows: open the folder in File Explorer, click the address bar, type `cmd`, press Enter.

**4. Install the dependencies** (once, takes a minute):

   ```
   npm install
   ```

## Every time

```
npm run dev
```

Then open the address it prints — normally **http://localhost:5173**.
Leave the terminal open while you use the app; `Ctrl+C` stops it.

## Building a version you can host

```
npm run build
```

Produces a `dist/` folder that is pure static files. Drag that folder onto Netlify, or push it
to GitHub Pages — no server, no database, no configuration. `npm run preview` serves the built
version locally if you want to check it before uploading.

---

# Updating the data

Only needed when you change a spreadsheet. Requires **Python 3** plus:

```
pip install pandas openpyxl
```

| Command | Reads | Writes |
|---|---|---|
| `npm run data` | `TournamentsDescription_Updated_LA28_Master.xlsx` | tournaments, sports, meta |
| `npm run gaps` | the generated JSON | a report of which sports lack future events |
| `npm run medals` | `datasetOlympic/` medal CSVs | `medals.json` for the games |
| `npm run draft` | `Israeli_Olympic_Athletes_Results.xlsx` | `draft.json` |

The scripts look for the workbooks in the **parent folder** of the app by default, so this layout
works with no arguments:

```
NewTournamentOlympicApp\
├── TournamentsDescription_Updated_LA28_Master.xlsx
├── datasetOlympic\
└── olympic-app\          <- the unzipped app, run npm here
```

Otherwise pass the folder explicitly:

```
python tools/tournaments.py "C:\Users\ariel\Desktop\NewTournamentOlympicApp"
```

`npm run flags` rebuilds the flag images. You will not normally need it — the images are
already included — and it needs extra tools (`cairosvg`, `Pillow`, `svgo`).

---

# If something goes wrong

**`npm` is not recognised** — Node isn't installed, or the terminal was open before you installed
it. Close the terminal, open a new one, try again.

**Port 5173 already in use** — something else is running. `npm run dev -- --port 5174`.

**Blank page after `npm run build`** — open `dist/index.html` directly and it will be blank by
design; the build expects to be served. Use `npm run preview` instead.

**`python` is not recognised** — only affects the data scripts, not running the app. On Windows
try `py` instead of `python`, or install Python from python.org and tick *Add to PATH*.
