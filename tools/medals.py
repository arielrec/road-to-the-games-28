#!/usr/bin/env python3
"""
Build the Olympic medal dataset for the Games tab.

Merges three sources into one country x sport x year table, counted the way the
official Olympic medal table counts: ONE medal per event per country, not one per
athlete. A basketball gold is 1 medal, not 12.

  1896-2016  athlete_events_through_2026.csv   (moderndive / Olympedia)
  2020       medals.csv                        (Tokyo official results)
  2024       medallists.csv                    (Paris official results)

Why the 2020/2024 override: the athlete file is missing ~80 events per Games for
Tokyo and Paris — essentially every team, relay and crew event. 2024 Rowing contains
only the two single sculls; there are no athletics relays at all. Left alone it
under-counts those Games by ~242 medals each.

Every result is validated against medal_table_summary.csv, which is a verified
per-edition medal table. If this script's numbers drift from it, trust that file.
"""
import pandas as pd, json, os, sys, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from countries_he import HE as COUNTRY_HE
from sports_he import SPORT_HE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def find_src():
    for c in ('../datasetOlympic', 'datasetOlympic', '..', '.'):
        d = os.path.normpath(os.path.join(ROOT, c))
        if os.path.exists(os.path.join(d, 'medal_table_summary.csv')):
            return d
    sys.exit('Could not find datasetOlympic/. Pass its folder as the first argument.')

SRC = sys.argv[1] if len(sys.argv) > 1 else find_src()
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'src', 'data')
os.makedirs(OUT, exist_ok=True)
print(f'reading  {SRC}\nwriting  {OUT}\n')

# The 2020/2024 feeds use fine disciplines; 1896-2016 uses coarse sports.
# Map fine -> coarse so one sport axis spans every Games.
FINE2COARSE = {
    'Cycling Road': 'Cycling', 'Cycling Track': 'Cycling', 'Cycling BMX Freestyle': 'Cycling',
    'Cycling BMX Racing': 'Cycling', 'Cycling Mountain Bike': 'Cycling',
    'Artistic Gymnastics': 'Gymnastics', 'Rhythmic Gymnastics': 'Gymnastics',
    'Trampoline Gymnastics': 'Gymnastics',
    'Canoe Slalom': 'Canoeing', 'Canoe Sprint': 'Canoeing',
    'Artistic Swimming': 'Synchronized Swimming', 'Marathon Swimming': 'Swimming',
    '3x3 Basketball': 'Basketball', 'Beach Volleyball': 'Volleyball',
    'Equestrian': 'Equestrianism', 'Baseball/Softball': 'Baseball',
}
MEDALS = ('Gold', 'Silver', 'Bronze')
issues = []

# ---- 1896-2016 -------------------------------------------------------------
a = pd.read_csv(os.path.join(SRC, 'athlete_events_through_2026.csv'), low_memory=False)
old = a[(a.Season == 'Summer') & a.Medal.notna() & (a.Year <= 2016)]
old = old.drop_duplicates(['Year', 'Event', 'NOC', 'Medal'])
frames = [pd.DataFrame({'year': old.Year, 'noc': old.NOC, 'sport': old.Sport, 'medal': old.Medal})]

# ---- 2020 / 2024 -----------------------------------------------------------
def official(path, year, medal_col='medal_type'):
    d = pd.read_csv(os.path.join(SRC, path), low_memory=False)
    d = d.drop_duplicates(['discipline', 'event', 'country_code', medal_col])
    return pd.DataFrame({
        'year': year,
        'noc': d.country_code,
        'sport': d.discipline.map(lambda x: FINE2COARSE.get(x, x)),
        'medal': d[medal_col].str.replace(' Medal', '', regex=False),
    })

frames.append(official('medals.csv', 2020))
frames.append(official('medallists.csv', 2024))
M = pd.concat(frames, ignore_index=True)
M = M[M.medal.isin(MEDALS)]

# ---- validate against the verified table -----------------------------------
v = pd.read_csv(os.path.join(SRC, 'medal_table_summary.csv'))
v = v[v.season == 'Summer']
chk = pd.DataFrame({'verified': v.groupby('year').total.sum(), 'built': M.groupby('year').size()}).fillna(0).astype(int)
chk['d'] = chk.built - chk.verified
for yr, r in chk[chk.d != 0].iterrows():
    issues.append(f'{yr}: built {r.built} vs verified {r.verified} ({r.d:+d})')
acc = 100 * (1 - abs(chk.d).sum() / chk.verified.sum())
print(f'{len(M):,} medals, {M.year.min()}-{M.year.max()}, '
      f'{M.sport.nunique()} sports, {M.noc.nunique()} NOCs')
print(f'accuracy vs verified table: {acc:.2f}%  ({len(chk[chk.d != 0])} of {len(chk)} Games differ)\n')

# ---- country names ---------------------------------------------------------
names = (v.sort_values('year').drop_duplicates('noc', keep='last').set_index('noc').country.to_dict())
for n in M.noc.unique():
    names.setdefault(n, n)
# Prefer the short display name where we have one — "People's Republic of China"
# does not fit on a flag card.
def disp(noc):
    return COUNTRY_HE.get(noc, (names.get(noc, noc), ''))[0]
def disp_he(noc):
    return COUNTRY_HE.get(noc, ('', ''))[1] or disp(noc)

# ---- emit ------------------------------------------------------------------
# Compact: rows of [noc, sport_index, year, gold, silver, bronze]
sports = sorted(M.sport.unique())
si = {s: i for i, s in enumerate(sports)}
g = M.groupby(['noc', 'sport', 'year']).medal.value_counts().unstack(fill_value=0)
for c in MEDALS:
    if c not in g: g[c] = 0
g = g.reset_index()
rows = [[r.noc, si[r.sport], int(r.year), int(r.Gold), int(r.Silver), int(r.Bronze)]
        for r in g.itertuples()]

totals = collections.Counter()
for noc, _, _, go, s_, b in rows:
    totals[noc] += go + s_ + b

data = {
    'schema': ['noc', 'sportIndex', 'year', 'gold', 'silver', 'bronze'],
    'sports': sports,
    'sportsHe': [SPORT_HE.get(x, x) for x in sports],
    'years': sorted(int(y) for y in M.year.unique()),
    'countries': {n: {'name': disp(n), 'nameHe': disp_he(n), 'full': names.get(n, n),
                      'total': totals[n]} for n in sorted(totals)},
    'rows': rows,
    'note': 'Summer Games only. One medal per event per country (official counting), '
            'not one per athlete. Historical nations (URS, GDR, FRG, YUG, EUN) are kept '
            'separate and are never merged into successor states.',
    'accuracy': round(acc, 2),
}
with open(os.path.join(OUT, 'medals.json'), 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

print(f'medals.json: {len(rows):,} rows, {len(sports)} sports, {len(totals)} countries')
if issues:
    print(f'\n{len(issues)} Games differ from the verified table '
          f'(early Games are genuinely disputed in the historical record):')
    for i in issues: print('  -', i)
