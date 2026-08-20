# Putting the site online

The app is a folder of plain files. There is no server to run, no database, nothing to
keep alive — a host just has to hand those files to whoever asks. That is why it can be
hosted free, permanently, with no card on file.

Everything below assumes you have run:

```
npm run build
```

which fills the **`dist`** folder. That folder *is* the website. Nothing outside it needs
to be uploaded, ever.

---

## The fastest way — two minutes, no account

1. Go to **https://app.netlify.com/drop**
2. Drag the whole **`dist`** folder onto the page.
3. Wait about twenty seconds.

You get a live address like `https://sparkly-donut-a1b2c3.netlify.app` and the site is
public. Send that link to anyone.

The catch: without an account the site expires after an hour. Sign up (free, GitHub or
email) while it is open and it becomes permanent, and you can rename it to something like
`road-to-the-games.netlify.app`.

Use this to see it live today. If you like it, do the next section properly.

---

## The one I would actually use — Cloudflare Pages

Free, no bandwidth limit, and it applies the security headers the app ships with.

1. Make a free account at **https://dash.cloudflare.com**
2. In the sidebar: **Workers & Pages** → **Create** → **Pages** →
   **Upload assets** (not "Connect to Git" — that comes later if you want it).
3. Name the project, e.g. `road-to-the-games`.
4. Drag the **`dist`** folder in. Click **Deploy site**.

Live at `https://road-to-the-games.pages.dev` within a minute.

**To update it later**: same page → **Create new deployment** → drag the new `dist`
folder. The old version stays available at its own address, so if an update goes wrong you
can point people back at the previous one while you fix it.

### Why this one

The app ships a `public/_headers` file that ends up in `dist`. Cloudflare and Netlify read
it automatically and apply the protections described in ATTRIBUTION.md — most importantly
`frame-ancestors`, which stops another site from embedding yours inside a hidden frame.

**GitHub Pages cannot set headers at all.** It will host the app perfectly well and the
in-page CSP still applies, but that one protection is silently lost. If you specifically
want GitHub Pages, that is the trade-off.

---

## Your own domain name

Both hosts do this free — you only pay for the name itself, roughly $10-15 a year from
Namecheap, Cloudflare Registrar or Porkbun.

On Cloudflare Pages: your project → **Custom domains** → **Set up a domain**. If you
bought the name at Cloudflare it is two clicks. Elsewhere, they show you two DNS records
to paste into your registrar. HTTPS is issued automatically and free.

A name is worth it if you plan to share this widely. `roadtothegames.com` is a very
different thing to send someone than `sparkly-donut-a1b2c3.netlify.app`.

---

## Automatic updates, if you get tired of dragging folders

Once the routine of "edit spreadsheet → `npm run update` → `npm run build` → drag folder"
gets old, connect a Git repository and the last two steps happen by themselves.

1. Put the project on GitHub (a private repository is fine — the site is still public).
2. Cloudflare Pages → **Connect to Git** → pick the repository.
3. Build command: `npm run build`. Output directory: `dist`.

After that, every push rebuilds and redeploys the site on its own. Your update routine
becomes: edit the spreadsheet, `npm run update`, read the report, commit, push.

Worth knowing: the build then runs on Cloudflare's machines, which have Node but **not
Python or pandas** — so `npm run update` still has to run on your computer, and the
generated `src/data/*.json` must be committed. That is already how the project works: the
JSON files are checked in, not generated at deploy time.

---

## Before you send the link to anyone

- Open it on a phone, not just a laptop. The bottom navigation and the calendar are the
  two places where a phone behaves differently.
- Try the Hebrew toggle on the live site once. It flips the whole layout right-to-left.
- Paste the link into WhatsApp or Slack and check the preview card appears — that is the
  `og-image.png` in `dist`.
- Read **ATTRIBUTION.md** once more. The pictograms question is settled, but the wording
  you use to describe the app publicly is the remaining thing to get right.

---

## If something looks broken once it is live

**Blank page, or everything unstyled.** Almost always a partial upload — the `assets`
folder did not go up with `index.html`. Re-upload the whole `dist` folder.

**A link into the app 404s.** Should not happen: the app uses `#` addresses
(`/#/calendar`) precisely so no server configuration is needed. If you see it, something
rewrote the URL — check you did not enable a "single page app" redirect rule that strips
the `#`.

**An update did not appear.** `index.html` is set to never cache, but browsers can be
stubborn. Reload with Ctrl+Shift+R once. If it persists, check the deployment actually
finished on the host's dashboard.

**Old data after an update.** You rebuilt but uploaded the previous `dist`. The build
prints the file names it wrote — check they match what you dragged.
