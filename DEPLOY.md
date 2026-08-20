# Putting the site online, and keeping it updated

Set this up once — about fifteen minutes — and from then on updating the live site means
**replacing one file in a web page**. No terminal, no uploading, no build step, nothing
installed on your computer. You can do it from a phone.

If you would rather just see it live in two minutes and worry about this later, skip to
[The two-minute version](#the-two-minute-version) at the bottom. But the setup below is
the one worth doing, and doing it first saves redoing it.

---

## How it will work when it is done

```
  You replace data/…Master.xlsx on github.com
                    │
                    ▼
  GitHub runs the pipeline automatically:
      convert the spreadsheet → check the dates → build the site
                    │
                    ▼
  The live site updates. Two to three minutes, start to finish.
```

The spreadsheet is the source of truth and it lives *inside* the project, so there is
never a question of which copy is current or whether someone forgot to rebuild.

---

## Step 1 — Put the project on GitHub

The project is already a git repository with everything committed. It just needs
somewhere to live.

1. Make a free account at **https://github.com** if you do not have one.
2. Go to **https://github.com/new**.
   - **Repository name**: `road-to-the-games`
   - **Public** or **Private** — either works. The *site* is public either way; this only
     controls who can see the source and the spreadsheet.
   - Do **not** tick "Add a README" or any other initialise option. The project already
     has its files and an empty repository is what we want.
   - Click **Create repository**.
3. GitHub then shows a page with commands. Ignore most of it. Open a terminal in the
   project folder and run the two lines it shows under *"…or push an existing repository"*.
   They look like this, with your username:

```
git remote add origin https://github.com/YOUR-USERNAME/road-to-the-games.git
git push -u origin main
```

The first time, GitHub asks you to sign in. On Windows a browser window opens — sign in
there and it remembers you from then on.

---

## Step 2 — Turn on the automatic build

1. In your new repository on GitHub, click **Settings** (top right of the repo, not your
   account settings).
2. In the left sidebar, click **Pages**.
3. Under **Source**, change the dropdown from *Deploy from a branch* to
   **GitHub Actions**.

That is the whole configuration. There is nothing to fill in and nothing to save.

4. Click the **Actions** tab at the top. You should see a run called *Build and deploy*
   already in progress from your push. It takes two to three minutes.

When the tick turns green, your site is live at:

```
https://YOUR-USERNAME.github.io/road-to-the-games/
```

Settings → Pages shows the exact address once the first deploy finishes.

---

## Step 3 — Updating it, forever after

### The easy way — no terminal at all

1. On GitHub, open the **`data`** folder in your repository.
2. Click **Add file** → **Upload files**.
3. Drag your edited `.xlsx` in. It must keep the same filename.
4. Type a short note in the box — "added 2027 judo events" — and click
   **Commit changes**.

That is it. The **Actions** tab shows the rebuild running, and two or three minutes later
the live site has your new data.

Click into the finished run and you get a **Data check** report: how many events, and
anything that looks impossible — a date spanning a year, a week-long championship stored
as a single day, a far-future event with an invented exact date.

### The terminal way — if you want to see the diff first

Replace `data/…Master.xlsx` on your computer, then:

```
npm run publish
```

or double-click **`publish.bat`** on Windows. It regenerates the data, shows you exactly
what your edit did, and asks before publishing:

```
12 added   0 removed   3 modified   (1338 → 1350 events)

  ADDED (12):
    + 2027-03-14  Judo   2027 Judo Grand Slam Tbilisi
  MODIFIED (3):
    ~ 2027 Fencing World Championship
        start: '2027-07-20' → '2027-07-24'

Publish these changes to the live site? [y/N]
```

**Read the removed list.** An edit meant to add three events that instead removes four
hundred is precisely what this prompt exists to catch.

`npm run update` does the same without publishing, if you only want to look.

---

## A proper domain name

GitHub Pages supports custom domains free, with automatic HTTPS. You pay only for the name
— roughly $10–15 a year from Cloudflare Registrar, Namecheap or Porkbun.

Repository **Settings → Pages → Custom domain**, type the name, and GitHub tells you which
DNS records to add at your registrar. Tick **Enforce HTTPS** once it goes green.

`roadtothegames.com` is a very different thing to send someone than a long default URL.

---

## If you want the strictest security headers

The app ships a `public/_headers` file with `frame-ancestors`, `X-Frame-Options` and
friends. **GitHub Pages cannot set HTTP headers at all**, so that file is ignored there.
Cloudflare Pages and Netlify both honour it.

For this app that difference is small — there is no login and no sensitive action to
hijack, so clickjacking has nothing to steal, and the in-page `Content-Security-Policy`
still applies either way. Do not let it complicate your setup. If you later want it:

1. Free account at **https://dash.cloudflare.com**
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick the repository
3. Build command `npm run build`, output directory `dist`

Caveat: Cloudflare's build machines have Node but **not Python**, so the spreadsheet
conversion would not run there. You would go back to running `npm run update` locally and
committing the generated `src/data/*.json`, losing the upload-the-xlsx-in-a-browser trick.
That is the real trade-off, and it is why GitHub Actions is the default here.

---

## The two-minute version

Just want to see it live right now? Run `npm run build`, then drag the **`dist`** folder
onto **https://app.netlify.com/drop**. You get a public address in about twenty seconds.
Without an account it expires in an hour; sign up while it is open to keep it.

Fine for showing someone today. Not a substitute for Step 1.

---

## When something looks wrong

**The Actions run failed (red X).** Click it and read the first red step.
*Convert the spreadsheet* failing means the workbook is malformed — a renamed sheet, a
deleted column. The live site is untouched; fix the file and upload again.

**The run went green but the site did not change.** Reload with Ctrl+Shift+R. `index.html`
is set never to cache, but browsers can be stubborn.

**A link into the app gives a 404.** Should not happen — the app uses `#` addresses
(`/#/calendar`) exactly so that no server configuration is needed. If you see it, check
nobody added a redirect rule that strips the `#`.

**You want the previous version back.** Actions tab → the last good run → **Re-run all
jobs**. That republishes exactly what was live before, in about two minutes.
