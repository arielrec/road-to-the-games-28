# Updating the tournament data

Three steps, a few minutes, no coding.

## 1. Edit the spreadsheet

Open `data/TournamentsDescription_Updated_LA28_Master.xlsx` and edit the
**All Tournaments** sheet. That sheet is what the app reads — the per-sport sheets are
reference copies and are ignored.

Adding an event means adding a row. The columns that matter most:

| Column | Notes |
|---|---|
| `id` | must be unique — the app uses it in the event's own web address |
| `name` | shown as the title. Include the year, as the existing rows do |
| `date_start`, `date_end` | leave both blank if the dates are not announced |
| `date_status` | `Confirmed`, `Provisional`, `Host Confirmed - Dates TBA`, `Dates Confirmed - Host TBA` |
| `sport` | must match an existing sport exactly, or it gets no logo |
| `official_event_url` | the organiser's page. Optional, but it is what makes an event trustworthy |

Do not invent a precise date to fill a gap. Leave it blank and set the status — the app
shows "Date TBA" honestly, and a made-up date presented as Confirmed is worse than none.

## 2. Run one command

```
npm run update
```

It regenerates the data, then tells you **exactly what your edit did**:

```
12 added   0 removed   3 modified   (1338 -> 1350 events)

  ADDED (12):
    + 2027-03-14  Judo             2027 Judo Grand Slam Tbilisi
  MODIFIED (3):
    ~ 2027 Fencing World Championship
        start: '2027-07-20' -> '2027-07-24'
```

Then it runs the audit and prints anything that cannot be right — dates spanning a year,
a week-long championship stored as one day, a far-future event with an invented exact day.

**Read the removed list.** An edit meant to add three events that instead removes four
hundred is the failure this step exists to catch, and it warns you loudly if more than a
tenth of the file disappears.

## 3. Publish

```
npm run publish
```

It shows the same report, asks for confirmation, then commits and pushes. The live site
rebuilds itself in two to three minutes — there is nothing to upload.

**Or skip the terminal entirely**: replace the `.xlsx` through GitHub's website and the
same pipeline runs by itself. See DEPLOY.md.

## If something goes wrong

The converter refuses to write anything if it cannot read the workbook, so a bad file
leaves the previous data in place. If a build ever looks wrong, the last known-good
`src/data/*.json` is whatever you had before running `npm run update`.

`npm run audit` on its own checks the spreadsheet without changing anything.
