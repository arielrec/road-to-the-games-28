#!/usr/bin/env python3
"""
Build the tournament data from TournamentsDescription_Updated_LA28_Master.xlsx.

Replaces the old convert.py. The master workbook carries 39 columns against the old 14,
so everything the app needs — Hebrew, federation, official URLs, LA28 qualification —
comes from this one file. Sports.xlsx is no longer required.

Outputs:
  tournaments.json  1338 events, flattened and normalised
  sports.json       24 parent sports with disciplines nested (was 42 flat)
  meta.json         facet vocabularies for the filter panel
"""
import pandas as pd, json, os, sys, re, unicodedata, collections, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from sport_tree import PARENTS, CHILD_TO_PARENT, DISCIPLINE_LABEL, STANDALONE_LOGO

MASTER = 'TournamentsDescription_Updated_LA28_Master.xlsx'

def find_src():
    """
    Where the workbook lives.

    `data/` inside the project comes first and is the intended home: drop the updated
    .xlsx there, run one command, done. The other locations are kept so an existing
    checkout that keeps the file beside the project still works.
    """
    if len(sys.argv) > 1 and os.path.exists(os.path.join(sys.argv[1], MASTER)):
        return sys.argv[1]
    for c in ('data', '.', '..', '../datasetOlympic', 'datasetOlympic'):
        d = os.path.normpath(os.path.join(ROOT, c))
        if os.path.exists(os.path.join(d, MASTER)): return d
    sys.exit(
        f'Could not find {MASTER}.\n'
        f'Put it in the project\'s data/ folder, or pass its folder as the first argument.')

SRC = sys.argv[1] if len(sys.argv) > 1 else find_src()
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, 'src', 'data')
os.makedirs(OUT, exist_ok=True)
print(f'reading  {SRC}\nwriting  {OUT}\n')

def clean(v):
    if v is None or (isinstance(v, float) and pd.isna(v)): return ''
    s = unicodedata.normalize('NFC', str(v).replace('\xa0', ' '))
    return re.sub(r'\s+', ' ', s).strip()

def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', clean(s).lower()).strip('-')


# ---------------------------------------------------------------------------
# Verified corrections to the source workbook.
#
# Each of these was checked against the organiser or Wikipedia in August 2026 and the
# spreadsheet is demonstrably wrong. They are applied here rather than silently in the
# app so that the fix is reviewable and so the same edit can be made in the .xlsx —
# once the source is corrected these entries become no-ops.
#
#   id -> (start, end, date_status or None to leave alone, why)
CORRECTIONS = {
    # End year typed as 2027; the tournament is named 2025 and ran in 2025.
    # https://en.wikipedia.org/wiki/2025_FIBA_Under-19_Basketball_World_Cup
    'Basketball2025WChMU19': ('2025-06-28', '2025-07-06', None, 'end year typo 2027 -> 2025'),
    # https://en.wikipedia.org/wiki/2025_FIBA_Under-19_Women%27s_Basketball_World_Cup
    'Basketball2025WChWU19': ('2025-07-12', '2025-07-20', None, 'end year typo 2027 -> 2025'),

    # Stored as a single day; the championship runs a week (Caorle, Italy).
    # https://en.wikipedia.org/wiki/2025_European_U20_Wrestling_Championships
    'Wrestling2025EChU20': ('2025-06-30', '2025-07-06', None, 'one day -> 30 Jun - 6 Jul'),
    # Stored as a single day in MARCH; the event was 28 Jul - 3 Aug in Athens. The day of
    # the month survived and the month did not, which smells like a d/m swap upstream.
    # https://en.wikipedia.org/wiki/2025_U17_World_Wrestling_Championships
    'Wrestling2025WChU17': ('2025-07-28', '2025-08-03', None, 'wrong month and one day -> 28 Jul - 3 Aug'),

    # Two days in the wrong week. Gdynia is right; the regatta ran 6-14 June.
    # https://www.470.org/en/events-2/2025-470-world-championship/
    'Sai4702025WCh': ('2025-06-06', '2025-06-14', None, 'wrong week -> 6-14 Jun'),

    # 26-27 July is the POOL swimming block. Open water was 15-20 July at Sentosa.
    # https://en.wikipedia.org/wiki/Open_water_swimming_at_the_2025_World_Aquatics_Championships
    'OpenWater2025WCh': ('2025-07-15', '2025-07-20', None, 'pool dates used for open water -> 15-20 Jul'),
}

# Dates that are not actually published yet but are stored as a precise "Confirmed" day.
# The hosts are decided; the schedule is not. Presenting an invented single day as
# confirmed is worse than admitting the month is all anyone knows.
#   id -> (status, why)
UNPUBLISHED_DATES = {
    # IHF has named the hosts for 2029/2031; only the month is known.
    # https://www.olympics.com/en/news/handball-world-championships-hosts-announcement
    'Handball2029WChM': ('Host Confirmed - Dates TBA', 'only "January 2029" is announced'),
    'Handball2029WChW': ('Host Confirmed - Dates TBA', 'only the month is announced'),
    'Handball2031WChM': ('Host Confirmed - Dates TBA', 'only the month is announced'),
    'Handball2031WChW': ('Host Confirmed - Dates TBA', 'only the month is announced'),
    # UEFA has published only "June - July 2032".
    # https://en.wikipedia.org/wiki/UEFA_Euro_2032
    'Football2032EChM': ('Provisional', 'UEFA has announced only June-July 2032'),
}

# The workbook writes "Man's" / "Woman's" in 26 event names, and once as "Wome's".
GENDER_SPELLING = [
    (re.compile(r"\bMan'?s\b"), "Men's"),
    (re.compile(r"\bWoman'?s\b"), "Women's"),
    (re.compile(r"\bWome'?s\b"), "Women's"),
    (re.compile(r"\bMan' Euro\b"), "Men's Euro"),
]

def fix_name(n):
    for pat, rep in GENDER_SPELLING:
        n = pat.sub(rep, n)
    return n

# A `city` that is really a slice of the event name is worse than a blank one — the card
# prints it as a place. "Europe Zakopane Speed" is a competition label with a real city
# buried in it, so strip the label words and keep what is left; "EuroHockey" and
# "Man' Euro" are nothing but label and become blank.
CITY_NOISE = re.compile(
    r"\b(Euro(pe|Basket|Hockey|Surf|Volley)?|World|Champion(ship)?s?|Youth|Sevens|Cup|"
    r"Boulder|Lead|Speed|Combined|Men'?s?|Wome'?n?'?s?|Man'?s?|Woman'?s?)\b",
    re.I)

def fix_city(c, name):
    if not c: return ''
    kept = CITY_NOISE.sub(' ', c)
    kept = re.sub(r"[\s'\-]+$|^[\s'\-]+", '', re.sub(r'\s+', ' ', kept)).strip()
    # Only intervene when the value really came out of the name; a genuine city that
    # happens to contain a stop word ("Newcastle upon Tyne") is left alone.
    if kept == c: return c
    if c.lower().replace("'", '') not in name.lower().replace("'", '') and kept and kept in name:
        return kept
    return kept if kept and len(kept) > 2 else ''

df = pd.read_excel(os.path.join(SRC, MASTER), sheet_name='All Tournaments')
issues = []

def as_date(v):
    if pd.isna(v): return None
    try:
        d = pd.to_datetime(v, dayfirst=True, errors='coerce')
        return None if pd.isna(d) else d.date()
    except Exception: return None

rows = []
for i, r in df.iterrows():
    sport = clean(r['sport'])
    parent = CHILD_TO_PARENT.get(sport, sport)
    ds, de = as_date(r['date_start']), as_date(r['date_end'])
    rid = clean(r['id'])
    status_override = None

    if rid in CORRECTIONS:
        a, b, st, why = CORRECTIONS[rid]
        issues.append(f'{rid}: corrected — {why}')
        ds, de = datetime.date.fromisoformat(a), datetime.date.fromisoformat(b)
        status_override = st
    if rid in UNPUBLISHED_DATES:
        st, why = UNPUBLISHED_DATES[rid]
        issues.append(f'{rid}: {why} — status -> {st}')
        status_override = st
        if st.endswith('Dates TBA'):
            ds = de = None

    if ds and de and de < ds:
        issues.append(f'{clean(r["id"])}: end before start'); de = ds
    # Season-format competitions (Pro League, Nations League) legitimately run for months.
    # A span over a year cannot be one season, and is almost always a mistyped end year —
    # left alone, a single such row paints EVERY cell of the calendar for two years.
    if ds and de and (de - ds).days > 365:
        try:
            fixed = de.replace(year=ds.year)
            if fixed < ds: fixed = de.replace(year=ds.year + 1)
            if ds <= fixed and (fixed - ds).days <= 365:
                issues.append(f'{clean(r["id"])}: end-year typo {de} -> {fixed}')
                de = fixed
            else:
                issues.append(f'{clean(r["id"])}: spans {(de-ds).days}d — cannot repair, left as-is')
        except ValueError:
            pass

    disc = clean(r.get('discipline')) or (DISCIPLINE_LABEL.get(sport, (sport, sport))[0]
                                          if sport in CHILD_TO_PARENT else '')
    rows.append({
        'id': clean(r['id']),
        'sport': parent, 'sportSlug': slug(parent),
        'sportHe': PARENTS.get(parent, {}).get('he') or clean(r['sport_hebrew']),
        'discipline': disc if sport in CHILD_TO_PARENT else clean(r.get('discipline')),
        'disciplineHe': DISCIPLINE_LABEL.get(sport, ('', ''))[1] if sport in CHILD_TO_PARENT else '',
        'sourceSport': sport,
        'name': fix_name(clean(r['name'])), 'nameHe': clean(r['name_hebrew']),
        'description': clean(r['description']),
        'location': clean(r['location']), 'locationHe': clean(r['location_hebrew']),
        'city': fix_city(clean(r.get('city')), clean(r['name'])),
        'start': ds.isoformat() if ds else None,
        'end': de.isoformat() if de else (ds.isoformat() if ds else None),
        'year': ds.year if ds else None,
        'level': clean(r['type']), 'levelHe': clean(r['type_hebrew']),
        'compLevel': clean(r.get('competition_level')),
        'series': clean(r['type_specific']), 'seriesHe': clean(r['type_specific_hebrew']),
        'seriesName': clean(r.get('series_name')), 'seriesStage': clean(r.get('series_stage')),
        'seriesLevel': clean(r.get('series_level')),
        'isSeriesFinal': clean(r.get('is_series_final')) == 'Yes',
        'continent': clean(r.get('host_continent')),
        'scope': clean(r.get('geographic_scope')),
        'region': clean(r.get('region_name')),
        'gender': clean(r.get('gender')),
        'ageGroup': clean(r.get('age_group')),
        'age': clean(r.get('age')),
        'federation': clean(r.get('federation')),
        'contFederation': clean(r.get('continental_federation')),
        'dateStatus': status_override or clean(r.get('date_status')),
        'olympic': clean(r.get('olympic_relevance')),
        'qualFor': clean(r.get('qualification_for')),
        'qualMethod': clean(r.get('qualification_method')),
        'quota': clean(r.get('quota_places')),
        'url': clean(r.get('official_event_url')),
    })

rows.sort(key=lambda t: (t['start'] or '9999-12-31', t['sport'], t['name']))
for t in rows:
    t['_h'] = ' '.join([t['name'], t['nameHe'], t['location'], t['locationHe'], t['city'],
                        t['sport'], t['sportHe'], t['discipline'], t['series'], t['seriesHe'],
                        t['seriesName'], t['seriesStage'], t['federation'], t['description']]).lower()

# ---- sports: 24 parents with disciplines nested -----------------------------
by_sport = collections.defaultdict(list)
for t in rows: by_sport[t['sport']].append(t)

sports = []
for name, ts in by_sport.items():
    if name in PARENTS:
        logo, he = PARENTS[name]['logo'], PARENTS[name]['he']
        kids = [c for c in PARENTS[name]['children'] if any(t['sourceSport'] == c for t in ts)]
        disciplines = [{
            'source': c, 'slug': slug(c),
            'name': DISCIPLINE_LABEL.get(c, (c, c))[0],
            'nameHe': DISCIPLINE_LABEL.get(c, ('', ''))[1] or c,
            'count': sum(1 for t in ts if t['sourceSport'] == c),
        } for c in kids]
    else:
        logo = STANDALONE_LOGO.get(name, slug(name).replace('-', '_'))
        he = ts[0]['sportHe']
        disciplines = []
    sports.append({
        'name': name, 'slug': slug(name), 'nameHe': he, 'logo': f'{logo}.png',
        'count': len(ts), 'disciplines': disciplines,
        'federations': sorted({t['federation'] for t in ts if t['federation']}),
        'links': sorted({t['url'] for t in ts if t['url']})[:1],
    })
sports.sort(key=lambda s: s['name'])

missing_logo = [s['name'] for s in sports
                if not os.path.exists(os.path.join(ROOT, 'src', 'assets', 'logos', s['logo']))]

def vocab(key):
    c = collections.Counter(t[key] for t in rows if t[key])
    return [{'v': k, 'n': n} for k, n in c.most_common()]

meta = {
    'generated': pd.Timestamp.now('UTC').isoformat(timespec='seconds'),
    'count': len(rows), 'sportCount': len(sports),
    'undated': sum(1 for t in rows if not t['start']),
    'years': sorted({t['year'] for t in rows if t['year']}),
    'facets': {k: vocab(k) for k in
               ['level', 'compLevel', 'ageGroup', 'gender', 'continent', 'scope',
                'federation', 'dateStatus', 'olympic', 'seriesName', 'location']},
    'withUrl': sum(1 for t in rows if t['url']),
    'qualifiers': sum(1 for t in rows if t['olympic'] in ('Direct Qualifier', 'Olympic Ranking')),
}

for fn, obj in (('tournaments.json', rows), ('sports.json', sports), ('meta.json', meta)):
    with open(os.path.join(OUT, fn), 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))

print(f'tournaments : {len(rows)}   (undated {meta["undated"]}, with official URL {meta["withUrl"]})')
print(f'sports      : {len(sports)}  (was 42 flat; {sum(1 for s in sports if s["disciplines"])} have disciplines)')
print(f'LA28 quals  : {meta["qualifiers"]}')
if missing_logo: print(f'!! missing logo files: {missing_logo}')
if issues:
    print(f'\n{len(issues)} rows to check:')
    for i in issues[:10]: print('  -', i)
