#!/usr/bin/env python3
"""
Check the tournament workbook for dates that cannot be right.

Run it after editing the .xlsx and before `npm run data`:

    python tools/audit.py "C:\\path\\to\\folder"      # folder holding the workbook
    python tools/audit.py                             # if it sits where convert expects

Writes data-issues.csv next to the app and prints a summary. It does NOT change
anything — the fixes that are actually applied live in tools/tournaments.py, and the
point of this script is to tell you what still needs fixing at the source.

What it looks for, and why each rule exists:

  Impossible span      An event running more than a year. Found two: both FIBA U19 World
                       Cups had their end year typed as 2027 instead of 2025, and a single
                       such row paints every cell of the calendar for two years.
  Truncated span       A championship stored as one or two days when others of the same
                       kind run a week. Found the 2025 Wrestling U17 Worlds stored as one
                       day in March when it ran 28 Jul - 3 Aug.
  Invented precision   A far-future event given an exact day and marked Confirmed when the
                       organiser has only published a month. Found four IHF World
                       Championships pinned to the 15th and the 1st.
  Order / gaps         End before start, a start with no end, no dates at all.
  Coverage             Rows with no official link, so you can see what is worth filling in.

One-day events are NOT flagged on their own: Milano-Sanremo, Paris-Roubaix and the
Diamond League meetings genuinely last a day, and so does each discipline leg of the
European Youth climbing championships.
"""
import os
import re
import sys

import pandas as pd

MASTER = 'TournamentsDescription_Updated_LA28_Master.xlsx'
SHEET = 'All Tournaments'

# Competitions that really are one or two days, so a short span is not a red flag.
GENUINELY_SHORT = re.compile(
    r'Milano-Sanremo|Sanremo|Flanders|Roubaix|Li[eè]ge|Lombardia|Amstel|Fl[eè]che|'
    r'Diamond League|Relays|Continental Tour|Classic|Monument|Marathon\b|Race Walk',
    re.I)


def find_src():
    for cand in (sys.argv[1] if len(sys.argv) > 1 else None,
                 os.path.join(os.path.dirname(__file__), '..', 'data'),
                 os.path.join(os.path.dirname(__file__), '..'),
                 os.getcwd()):
        if cand and os.path.exists(os.path.join(cand, MASTER)):
            return cand
    sys.exit(f'Could not find {MASTER}. Pass its folder as the first argument.')


def main():
    src = find_src()
    df = pd.read_excel(os.path.join(src, MASTER), sheet_name=SHEET)
    ds = pd.to_datetime(df['date_start'], errors='coerce')
    de = pd.to_datetime(df['date_end'], errors='coerce')
    df = df.assign(span=(de - ds).dt.days + 1)

    found = []

    def flag(sev, kind, row, note):
        found.append({
            'severity': sev, 'issue': kind, 'id': row['id'], 'sport': row['sport'],
            'name': row['name'], 'date_start': str(row['date_start'])[:10],
            'date_end': str(row['date_end'])[:10], 'date_status': row['date_status'],
            'note': note,
        })

    for _, r in df[de < ds].iterrows():
        flag('HIGH', 'End before start', r, 'the end date precedes the start date')

    for _, r in df[df['span'] > 366].iterrows():
        flag('HIGH', 'Impossible span', r,
             f"{int(r['span'])} days — the end year is almost certainly a typo")

    # "Short" is relative: compare each row with others of the same sport AND level, and
    # only complain when there are enough siblings for the comparison to mean anything.
    key = df['sport'].astype(str) + ' | ' + df['competition_level'].astype(str)
    median = df.groupby(key)['span'].transform('median')
    siblings = df.groupby(key)['span'].transform('count')
    short = df[(df['span'].notna()) & (siblings >= 4) & (df['span'] <= 2)
               & (df['span'] <= median / 3)]
    for i, r in short.iterrows():
        if GENUINELY_SHORT.search(str(r['name'])):
            continue
        flag('HIGH', 'Truncated span', r,
             f"{int(r['span'])} day(s); others of this type run about {median[i]:.0f}")

    far = df[(ds > pd.Timestamp('2028-12-31')) & (df['date_status'] == 'Confirmed')]
    for _, r in far.iterrows():
        flag('MEDIUM', 'Invented precision', r,
             'single-day placeholder marked Confirmed' if r['span'] == 1
             else 'far-future event marked Confirmed — check the schedule is really published')

    for _, r in df[ds.notna() & de.isna()].iterrows():
        flag('MEDIUM', 'No end date', r, 'has a start date but no end date')
    for _, r in df[ds.isna() & de.isna()].iterrows():
        flag('LOW', 'No dates', r, f"date_status is {r['date_status']}")
    for _, r in df[df['official_event_url'].isna()].iterrows():
        flag('LOW', 'No official link', r, 'official_event_url is blank')

    rep = pd.DataFrame(found)
    rank = {'HIGH': 0, 'MEDIUM': 1, 'LOW': 2}
    rep = rep.sort_values(['severity', 'issue', 'date_start'],
                          key=lambda c: c.map(rank) if c.name == 'severity' else c)
    out = os.path.join(os.path.dirname(__file__), '..', 'data-issues.csv')
    rep.to_csv(out, index=False)

    print(f'read     {os.path.join(src, MASTER)}')
    print(f'rows     {len(df)}\n')
    print(rep.groupby(['severity', 'issue']).size().to_string())
    print(f'\n{rep["id"].nunique()} of {len(df)} rows flagged at least once')
    print(f'report   {os.path.abspath(out)}\n')
    for _, r in rep[rep.severity == 'HIGH'].iterrows():
        print(f'  {r["issue"]:<18} {str(r["sport"])[:16]:<16} {str(r["name"])[:44]:<44} '
              f'{r["date_start"]}..{r["date_end"]}  {r["note"]}')


if __name__ == '__main__':
    main()
