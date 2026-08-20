#!/usr/bin/env python3
"""
Update the app from an edited spreadsheet, in one command.

    npm run update

Put the new TournamentsDescription_Updated_LA28_Master.xlsx in the project's data/
folder (replacing the old one) and run that. It does four things in order:

  1. Snapshots the current data so it can tell you what your edit actually changed.
  2. Regenerates src/data/*.json from the workbook.
  3. Shows a diff — events added, removed, dates moved, names changed.
  4. Runs the audit and prints anything that looks wrong in the new file.

It deliberately does NOT rebuild or deploy. Read the diff first: a spreadsheet edit that
was meant to add three events and instead removed four hundred is exactly the mistake
this is here to catch, and it is much easier to fix before it is live.

When the diff looks right, `npm run publish` commits and pushes it, and the live site
rebuilds itself. See DEPLOY.md.
"""
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'src', 'data', 'tournaments.json')


def load(path):
    try:
        with open(path, encoding='utf-8') as f:
            return {t['id']: t for t in json.load(f)}
    except Exception:
        return {}


def field_changes(a, b, fields):
    return [(f, a.get(f), b.get(f)) for f in fields if a.get(f) != b.get(f)]


def main():
    before = load(DATA)

    print('=' * 72)
    print('1. Rebuilding the data from the workbook')
    print('=' * 72)
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'tournaments.py')] + sys.argv[1:])
    if r.returncode != 0:
        sys.exit('\nThe converter failed — nothing was changed. Fix the error above and re-run.')

    after = load(DATA)

    print()
    print('=' * 72)
    print('2. What changed')
    print('=' * 72)

    added = [i for i in after if i not in before]
    removed = [i for i in before if i not in after]
    WATCH = ('start', 'end', 'name', 'location', 'city', 'dateStatus', 'level', 'url')
    changed = []
    for i in after:
        if i in before:
            d = field_changes(before[i], after[i], WATCH)
            if d:
                changed.append((i, d))

    if not (added or removed or changed):
        print('  Nothing. The workbook produces exactly the same data as before.')
    else:
        print(f'  {len(added)} added   {len(removed)} removed   {len(changed)} modified'
              f'   ({len(before)} -> {len(after)} events)')

    # Removals are the dangerous direction: an accidental filter or a deleted sheet shows
    # up here as hundreds of events silently vanishing from the app.
    if removed:
        print(f'\n  REMOVED ({len(removed)}):')
        for i in removed[:20]:
            t = before[i]
            print(f'    - {t.get("start") or "no date":<11} {t.get("sport", ""):<16} {t.get("name", "")[:48]}')
        if len(removed) > 20:
            print(f'    ... and {len(removed) - 20} more')
        if len(removed) > len(before) * 0.1:
            print('\n    !! That is more than a tenth of the file. Check the workbook before building.')

    if added:
        print(f'\n  ADDED ({len(added)}):')
        for i in added[:20]:
            t = after[i]
            print(f'    + {t.get("start") or "no date":<11} {t.get("sport", ""):<16} {t.get("name", "")[:48]}')
        if len(added) > 20:
            print(f'    ... and {len(added) - 20} more')

    if changed:
        print(f'\n  MODIFIED ({len(changed)}):')
        for i, diffs in changed[:25]:
            print(f'    ~ {after[i].get("name", i)[:52]}')
            for f, old, new in diffs:
                print(f'        {f}: {old!r} -> {new!r}')
        if len(changed) > 25:
            print(f'    ... and {len(changed) - 25} more')

    print()
    print('=' * 72)
    print('3. Checking the new workbook for impossible dates')
    print('=' * 72)
    subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'audit.py')] + sys.argv[1:])

    print()
    print('Happy with all of that?  npm run publish   — commits, pushes, and the site')
    print('rebuilds itself. Or replace the .xlsx on github.com and skip the terminal.')
    print('See DEPLOY.md.')


if __name__ == '__main__':
    main()
