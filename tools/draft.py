#!/usr/bin/env python3
"""
Build the Draft game data from Israeli_Olympic_Athletes_Results.xlsx.

That workbook is the only source with PLACEMENT data — the medal dataset knows who won
a medal but not who came 4th, which is why non-medallists could not be scored before.

Emits three things, because the Draft is one engine with three formats:
  athletes[]  one card per athlete            -> Career format
  editions[]  one card per athlete per Games  -> Edition and Rolling formats
  cells[]     (year, category) pairs with >=4 athletes -> Rolling format draws from these

Summer only: Israel has never medalled at a Winter Games, so those 29 athletes could
never score.
"""
import pandas as pd, json, os, sys, collections, re, unicodedata
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sports_he import SPORT_HE

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def find_src():
    for c in ('../datasetOlympic', 'datasetOlympic', '..'):
        d = os.path.normpath(os.path.join(ROOT, c))
        if os.path.exists(os.path.join(d, 'Israeli_Olympic_Athletes_Results.xlsx')):
            return d
    sys.exit('Could not find Israeli_Olympic_Athletes_Results.xlsx')

SRC = sys.argv[1] if len(sys.argv) > 1 else find_src()
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'src', 'data')
print(f'reading  {SRC}\nwriting  {OUT}\n')

# Medals are absolute — a bronze is a bronze whatever the field.
POINTS = {'Gold': 40, 'Silver': 30, 'Bronze': 24}
FINISHED, DNS = 1, 0
NO_RESULT = {'Did not start', 'Did not finish', 'Disqualified',
             'Did not start in this team event', 'Eliminated'}

# Everything else is scored on PERCENTILE, not rank.
#
# Rank alone is meaningless without the size of the field: 7th of 8 is near-last, while
# 10th of 100 is excellent, and a flat rank table scored them 8 and 3. Worse, Israel's 2020
# baseball team finished 5th of six having lost every game, and all 24 players scored the
# same as a genuine 5th in a 60-strong individual field.
#
# pct = (rank - 1) / (field - 1), so the winner is 0.0 and last place is 1.0.
#   7th of 8    -> 0.86 ->  2
#   5th of 6    -> 0.80 ->  3
#   5th of 16   -> 0.27 -> 13
#   10th of 100 -> 0.09 -> 18
#   4th of 60   -> 0.05 -> 19
# Capped at 20 so a non-medal placing always sits below a bronze.
#
# The exponent is a deliberate balance. Steeper (2.5) separates the top beautifully but
# crushes 43% of the pool to a single point, which reads as broken. 1.35 keeps 7th-of-8
# clearly worthless while leaving the middle of the field distinguishable.
PCT_MAX, PCT_EXP = 20, 1.35

def pct_points(rank, field):
    if not field or field < 2: return FINISHED
    pct = min(1.0, max(0.0, (rank - 1) / (field - 1)))
    return max(FINISHED, min(PCT_MAX, round(PCT_MAX * (1 - pct) ** PCT_EXP)))

CATEGORIES = [
    ('Water', 'ספורט מים',
     ['Swimming', 'Sailing', 'Artistic Swimming', 'Canoe Sprint', 'Canoe Slalom',
      'Diving', 'Marathon Swimming', 'Surfing', 'Rowing', 'Water Polo']),
    ('Athletics, Gymnastics & Cycling', 'אתלטיקה, התעמלות ואופניים',
     ['Athletics', 'Rhythmic Gymnastics', 'Artistic Gymnastics', 'Trampoline',
      'Triathlon', 'Modern Pentathlon', 'Cycling Road', 'Cycling Track',
      'Cycling Mountain Bike', 'Cycling BMX Racing', 'Equestrian Jumping',
      'Equestrian Dressage', 'Equestrian Eventing', 'Sport Climbing']),
    ('Combat, Strength & Target', 'לחימה, כוח ומטרה',
     ['Judo', 'Wrestling', 'Fencing', 'Boxing', 'Taekwondo', 'Weightlifting',
      'Karate', 'Shooting', 'Archery']),
    ('Team & Racket', 'קבוצתי ומחבט',
     ['Football', 'Baseball', 'Basketball', 'Tennis', 'Badminton', 'Table Tennis',
      'Golf', 'Handball', 'Volleyball', 'Softball']),
]
CAT_OF = {s: i for i, (_, _, sports) in enumerate(CATEGORIES) for s in sports}

E = pd.read_excel(os.path.join(SRC, 'Israeli_Olympic_Athletes_Results.xlsx'),
                  sheet_name='Event Results')
E = E[E.Season == 'Summer'].copy()
E['sport'] = E.Sport.str.replace(r'\s*\(.*\)', '', regex=True).str.strip()
E['rank'] = pd.to_numeric(E.Final_Rank, errors='coerce')
E['medal'] = E.Medal.fillna('None')

no_he = sorted(set(E.sport) - set(SPORT_HE))
if no_he: print(f'!! sports missing Hebrew: {no_he}')
unknown = sorted(set(E.sport) - set(CAT_OF))
if unknown:
    print(f'!! {len(unknown)} sports not in a category, defaulting to Team & Racket: {unknown}')

def points(row):
    if row['medal'] in POINTS: return POINTS[row['medal']]
    k = row['rank']
    if pd.isna(k):
        return DNS if str(row['Result_Status']) in NO_RESULT else FINISHED
    return pct_points(int(k), row['field'])

def label(row):
    """Show the field size: "5th of 6" is the whole point of the scoring, and without it
    a player cannot tell a near-last finish from a strong one."""
    m = row['medal']
    ev = re.sub(r',\s*(Men|Women|Mixed)$', '', str(row['Event'])).strip()
    if m in POINTS: return f'{m} — {ev}'
    k, f = row.get('rank'), row.get('field')
    if pd.notna(k) and f and f >= 2:
        return f'{int(k)} of {int(f)} — {ev}'
    r = str(row['Readable_Result'] or '').strip()
    return f'{r} — {ev}' if r and r.lower() != 'nan' else ev

# ---- field sizes -----------------------------------------------------------
# athlete_events lists EVERY competitor, not only medallists, so the size of each
# (Year, Event) field is derivable: teams for team events, athletes otherwise.
AE = os.path.join(SRC, 'athlete_events_through_2026.csv')
if not os.path.exists(AE):
    sys.exit('Need athlete_events_through_2026.csv alongside the Israeli workbook — '
             'it is the only source of field sizes, which the scoring depends on.')
A = pd.read_csv(AE, low_memory=False)
A = A[A.Season == 'Summer']

def _norm(x):
    x = unicodedata.normalize('NFKD', str(x)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9 ]', ' ', x)

_STOP = {'men', 'women', 'mixed', 'open', 's', 'the', 'and'}
def _toks(x): return {t for t in _norm(x).split() if t and t not in _STOP}
def _gender(x):
    x = _norm(x)
    return 'W' if 'women' in x else 'X' if 'mixed' in x else 'M' if 'men' in x else '?'

_fld = A.groupby(['Year', 'Event']).agg(ath=('ID', 'nunique'), noc=('NOC', 'nunique')).reset_index()
_byYear = collections.defaultdict(list)
for _r in _fld.itertuples(index=False):
    _byYear[_r.Year].append((_r.Event, _toks(_r.Event), _gender(_r.Event), _r.ath, _r.noc))
# median field per (sport-ish, year), used when an event cannot be matched
_medAth = _fld.assign(sp=_fld.Event.str.split().str[0]).groupby(['Year', 'sp']).ath.median()
_medNoc = _fld.assign(sp=_fld.Event.str.split().str[0]).groupby(['Year', 'sp']).noc.median()
_isrEvents = collections.defaultdict(set)
for _r in A[A.NOC == 'ISR'].itertuples(index=False):
    _isrEvents[(_r.Year, _norm(_r.Name))].add(_r.Event)

E['squad'] = E.groupby(['Year', 'Event']).Athlete_ID.transform('nunique')
E['isTeam'] = E.Team_or_Individual == 'Team'

_fallback = 0
def field_for(row):
    global _fallback
    yr, ev, sp = int(row['Year']), str(row['Event']), row['sport']
    want = _toks(sp) | _toks(ev)
    g = _gender(ev)
    own = _isrEvents.get((yr, _norm(row['Athlete'])), set())
    pool = [x for x in _byYear.get(yr, []) if (not own or x[0] in own)] or _byYear.get(yr, [])
    best, bs = None, -1
    for name, tk, gg, ath, noc in pool:
        if g != '?' and gg != '?' and g != gg: continue
        sc = len(want & tk) / max(1, len(want | tk))
        if sc > bs: bs, best = sc, (ath, noc)
    if best and bs >= 0.34:
        return best[1] if row['isTeam'] else best[0]
    _fallback += 1
    key = (yr, sp.split()[0])
    med = (_medNoc if row['isTeam'] else _medAth).get(key)
    return int(med) if pd.notna(med) else None

E['field'] = E.apply(field_for, axis=1)
E['pts'] = E.apply(points, axis=1)
E['label'] = E.apply(label, axis=1)
E['cat'] = E.sport.map(CAT_OF).fillna(3).astype(int)

# ---- editions: one card per athlete per Games -------------------------------
editions = []
for (aid, name, year), g in E.groupby(['Athlete_ID', 'Athlete', 'Year']):
    top = g.loc[g.pts.idxmax()]
    editions.append({
        'aid': str(aid), 'name': name, 'year': int(year),
        'sport': top['sport'], 'sportHe': SPORT_HE.get(top['sport'], top['sport']),
        'cat': int(top['cat']),
        'pts': int(top['pts']), 'label': top['label'],
        'field': int(top['field']) if pd.notna(top['field']) else None,
        'rank': int(top['rank']) if pd.notna(top['rank']) else None,
        'medal': top['medal'] if top['medal'] in POINTS else None,
        'entries': int(len(g)),
    })
editions.sort(key=lambda e: (e['year'], e['name']))

# ---- athletes: one card per person -----------------------------------------
athletes = []
for (aid, name), g in E.groupby(['Athlete_ID', 'Athlete']):
    top = g.loc[g.pts.idxmax()]
    years = sorted(set(int(y) for y in g.Year))
    best = int(top['pts'])
    athletes.append({
        'aid': str(aid), 'name': name,
        'sport': top['sport'], 'sportHe': SPORT_HE.get(top['sport'], top['sport']),
        'cat': int(top['cat']),
        'first': years[0], 'last': years[-1], 'games': len(years),
        'best': best,
        # peak dominates; longevity is a tiebreaker, not a driver
        'career': best + 2 * (len(years) - 1),
        'label': top['label'], 'bestYear': int(top['Year']),
        'field': int(top['field']) if pd.notna(top['field']) else None,
        'rank': int(top['rank']) if pd.notna(top['rank']) else None,
        'medal': top['medal'] if top['medal'] in POINTS else None,
    })
athletes.sort(key=lambda a: a['name'])

# ---- rolling cells: only (year, category) pairs deep enough to draft from ----
counts = collections.Counter((e['year'], e['cat']) for e in editions)
cells = [[y, c, n] for (y, c), n in sorted(counts.items()) if n >= 4]

data = {
    'pointTable': {'Gold': 40, 'Silver': 30, 'Bronze': 24,
                   'placing': 'percentile: 20 x (1 - pct)^2.5, capped at 20',
                   'competed, no rank': 1, 'DNS/DNF/DQ': 0},
    'careerBonusPerExtraGames': 2,
    'categories': [{'name': n, 'nameHe': h} for n, h, _ in CATEGORIES],
    'athletes': athletes,
    'editions': editions,
    'cells': cells,
}
with open(os.path.join(OUT, 'draft.json'), 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

print(f'athletes : {len(athletes)}')
print(f'editions : {len(editions)}  ({sum(1 for a in athletes if a["games"] > 1)} athletes appear more than once)')
print(f'cells    : {len(cells)} of {len(counts)} (year x category) pairs have >=4 athletes')
print(f'medallists: {sum(1 for a in athletes if a["medal"])}')
print(f'\nfield sizes matched from athlete_events: {len(E) - _fallback} of {len(E)} '
      f'({100*(len(E)-_fallback)/len(E):.0f}%); {_fallback} used a sport-year median')
import collections as _c
_d = _c.Counter(a['career'] for a in athletes)
print(f'\nscore spread: {len(_d)} distinct | at 1: {_d[1]} ({100*_d[1]/len(athletes):.0f}%) | median '
      f'{sorted(a["career"] for a in athletes)[len(athletes)//2]} | max {max(_d)}')
print('\ncategory sizes:')
for i, (n, _, _) in enumerate(CATEGORIES):
    print(f'  {n:<34}{sum(1 for a in athletes if a["cat"] == i):>4}')
print(f'\nscore spread — median {sorted(a["career"] for a in athletes)[len(athletes)//2]}, '
      f'max {max(a["career"] for a in athletes)}')
