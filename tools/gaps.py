#!/usr/bin/env python3
"""Report exactly which sports/series need future events added to the Excel."""
import json, datetime, collections, sys, os
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'data')
T = json.load(open(os.path.join(D,'tournaments.json'), encoding='utf-8'))
S = json.load(open(os.path.join(D,'sports.json'), encoding='utf-8'))
today = datetime.date.today()
iso = today.isoformat()

fut = collections.Counter(t['sport'] for t in T if t['start'] and t['start'] >= iso)
last = {}
for t in T:
    if t['start'] and t['start'] < iso:
        if t['sport'] not in last or t['start'] > last[t['sport']]['start']:
            last[t['sport']] = t
undated = collections.defaultdict(list)
for t in T:
    if not t['start']: undated[t['sport']].append(t)

rows = sorted(S, key=lambda s: (fut.get(s['name'],0), s['name']))
print(f"GAP REPORT  ({today})   {sum(fut.values())} upcoming of {len(T)} total\n")
print(f"{'SPORT':<26}{'UPCOMING':>9}{'TBA':>5}  LAST EVENT IN FILE")
print('-'*95)
for s in rows:
    n, u = fut.get(s['name'],0), len(undated.get(s['name'],[]))
    l = last.get(s['name'])
    tag = '  <-- ADD' if n == 0 else ''
    print(f"{s['name']:<26}{n:>9}{u:>5}  {(l['start']+'  '+l['name'][:40]) if l else '(none)'}{tag}")

print("\n\nDATE-TBA ROWS  (in the file, no date yet)\n" + '-'*95)
for sport in sorted(undated):
    for t in sorted(undated[sport], key=lambda x: x['id']):
        print(f"  {t['id']:<28} {t['sport']:<24} {t['name'][:44]:<46} {t['location']}")
