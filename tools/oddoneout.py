#!/usr/bin/env python3
"""
Build the Odd One Out question bank.

The TRUE options come straight from medals.json — every sport that ever awarded an
Olympic medal, with a fact generated from the data (when it ran, who dominated it).
That means the true answers cannot be wrong, and the reveal writes itself.

Only the DECOYS are hand-written: real sports that have never awarded an Olympic medal.
Demonstration sports (bowling, korfball, water skiing, roller hockey, wushu) are
deliberately excluded from the decoy list — "was it Olympic?" has a genuinely arguable
answer for those, and a quiz should not hinge on a technicality.
"""
import json, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, 'src', 'data', 'medals.json'), encoding='utf-8'))

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sports_he import SPORT_HE as HE

# Real sports that have NEVER awarded an Olympic medal. Demonstration sports excluded.
DECOYS = [
 ('Kabaddi','קבאדי'),('Netball','נטבול'),('Sepak Takraw','ספאק טקראו'),('Floorball','פלורבול'),
 ('Futsal','פוטסל'),('Billiards','ביליארד'),('Snooker','סנוקר'),('Darts','חצים'),
 ('Chess','שחמט'),('Orienteering','ניווט ספורטיבי'),('Sumo','סומו'),('Muay Thai','מואי תאי'),
 ('Kickboxing','קיקבוקסינג'),('Sambo','סמבו'),('Arm Wrestling','הורדת ידיים'),
 ('Pétanque','פטאנק'),('Bocce','בוצ׳ה'),('Racquetball','רקטבול'),('Padel','פאדל'),
 ('Pickleball','פיקלבול'),('Hurling','הרלינג'),('Gaelic Football','כדורגל גאלי'),
 ('Australian Rules Football','כדורגל אוסטרלי'),('Dodgeball','מחניים'),
 ('Ultimate Frisbee','אולטימטיב פריזבי'),('Dragon Boat Racing','מירוץ סירות דרקון'),
 ('Tchoukball','צ׳וקבול'),('Underwater Hockey','הוקי תת-מימי'),('Cheerleading','צ׳ירלידינג'),
 ('Powerlifting','פאוארליפטינג'),('Bodybuilding','פיתוח גוף'),('Shinty','שינטי'),
 ('Camogie','קמוגי'),('Pesäpallo','פסאפאלו'),('Fistball','פיסטבול'),('Broomball','ברומבול'),
 ('Kin-Ball','קין-בול'),('Sepaktakraw Beach','ספאק טקראו חופים'),('Rope Skipping','קפיצה בחבל'),
 ('Foot Volley','פוטבולי'),('Speedway','ספידוויי'),('Rally Racing','ראלי'),
]

MODERN = 2020  # a sport still contested in 2020/2024 is "current"

rows, sports, years = D['rows'], D['sports'], D['years']
by_sport = collections.defaultdict(lambda: {'years': set(), 'noc': collections.Counter(), 'total': 0})
for noc, si, yr, g, s, b in rows:
    e = by_sport[sports[si]]
    e['years'].add(yr); e['noc'][noc] += g + s + b; e['total'] += g + s + b

names   = {k: v['name'] for k, v in D['countries'].items()}
names_he = {k: v.get('nameHe') or v['name'] for k, v in D['countries'].items()}
real = []
for name, e in by_sport.items():
    ys = sorted(e['years'])
    top, n = e['noc'].most_common(1)[0]
    current = ys[-1] >= MODERN
    one_off = len(ys) == 1
    # A fact you could not have guessed — that is what makes the reveal land.
    # A long absence is the most interesting thing about a sport — surface it rather
    # than flattening it into "since 1900", which hides a 112-year gap.
    gap = max(((ys[i+1] - ys[i], ys[i], ys[i+1]) for i in range(len(ys)-1)), default=(0, 0, 0))
    who   = names.get(top, top)
    whoHe = names_he.get(top, top)
    if one_off:
        fact_en = f'Olympic in {ys[0]} only. {who} won the most medals ({n}).'
        fact_he = f'הייתה אולימפית ב-{ys[0]} בלבד. {whoHe} זכתה במרב המדליות ({n}).'
    elif gap[0] >= 16:
        fact_en = (f'Olympic in {ys[0]}, then absent for {gap[0]} years until {gap[2]}. '
                   f'{who} has won the most ({n}).')
        fact_he = (f'הייתה אולימפית ב-{ys[0]}, נעדרה {gap[0]} שנים וחזרה ב-{gap[2]}. '
                   f'{whoHe} זכתה במרב ({n}).')
    elif current:
        fact_en = f'Contested at {len(ys)} Games since {ys[0]}. {who} leads with {n} medals.'
        fact_he = f'נערכה ב-{len(ys)} משחקים מאז {ys[0]}. {whoHe} מובילה עם {n} מדליות.'
    else:
        fact_en = (f'Olympic from {ys[0]} to {ys[-1]}, then dropped for good. '
                   f'{who} won the most ({n}).')
        fact_he = (f'הייתה אולימפית מ-{ys[0]} עד {ys[-1]}, ואז הוסרה לתמיד. '
                   f'{whoHe} זכתה במרב ({n}).')
    real.append({
        'name': name, 'nameHe': HE.get(name, name),
        'first': ys[0], 'last': ys[-1], 'games': len(ys), 'total': e['total'],
        'current': current, 'discontinued': not current,
        'factEn': fact_en, 'factHe': fact_he,
    })

real.sort(key=lambda r: -r['total'])
missing_he = [r['name'] for r in real if r['name'] not in HE]
out = {
    'real': real,
    'decoys': [{'name': n, 'nameHe': h} for n, h in DECOYS],
    'note': 'real[] is derived from medals.json and is self-verifying. decoys[] are real '
            'sports that never awarded an Olympic medal; demonstration sports are excluded.',
}
with open(os.path.join(ROOT, 'src', 'data', 'oddoneout.json'), 'w', encoding='utf-8') as f:
    json.dump(out, f, ensure_ascii=False, separators=(',', ':'))

overlap = {r['name'].lower() for r in real} & {n.lower() for n, _ in DECOYS}
print(f'real sports: {len(real)}  (discontinued: {sum(1 for r in real if r["discontinued"])})')
print(f'decoys:      {len(DECOYS)}')
print(f'possible questions: {sum(1 for r in real if r["discontinued"]):,} discontinued x {len(DECOYS)} decoys')
if overlap: sys.exit(f'FATAL: decoy is also a real Olympic sport: {overlap}')
if missing_he: print(f'WARNING missing Hebrew: {missing_he}')
print('no decoy collides with a real Olympic sport ✓')
