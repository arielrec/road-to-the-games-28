#!/usr/bin/env python3
"""
Can the four game modes actually exist?

Before building a mode selector, count how many REAL questions each mode yields.
A question is only valid if both countries have >0 medals in that slice and their
counts differ - otherwise it is unanswerable ("Fencing 1996, Israel or Norway?"
is zero versus zero) or a tie.

"Playable" additionally requires both countries to be recognisable, proxied here
by >=25 medals all-time. A technically-valid question between two nations nobody
can place is not a question worth asking.
"""
import json, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(ROOT, 'src', 'data', 'medals.json'), encoding='utf-8'))
SPORTS, ROWS = D['sports'], D['rows']
MIN_FAME = int(sys.argv[1]) if len(sys.argv) > 1 else 25
HARD_GAP = 0.25   # counts within 25% of each other = a hard question

fame = {n: v['total'] for n, v in D['countries'].items()}
BIG = {n for n, t in fame.items() if t >= MIN_FAME}

def slice_counts(key):
    m = collections.defaultdict(collections.Counter)
    for noc, si, yr, g, s, b in ROWS:
        m[key(si, yr)][noc] += g + s + b
    return m

def score(counts):
    """-> (valid pairs, playable pairs, hard playable pairs)"""
    c = {k: v for k, v in counts.items() if v > 0}
    ks = list(c)
    valid = playable = hard = 0
    for i in range(len(ks)):
        for j in range(i + 1, len(ks)):
            a, b = c[ks[i]], c[ks[j]]
            if a == b: continue
            valid += 1
            if ks[i] in BIG and ks[j] in BIG:
                playable += 1
                if abs(a - b) / max(a, b) <= HARD_GAP: hard += 1
    return valid, playable, hard

def podiums(counts):
    """cells that can produce an orderable top-3 of recognisable countries"""
    c = {k: v for k, v in counts.items() if v > 0 and k in BIG}
    top = sorted(c.values(), reverse=True)[:3]
    return len(top) == 3 and len(set(top)) == 3

MODES = {
    'All-time':     lambda si, yr: 0,
    'By sport':     lambda si, yr: si,
    'By year':      lambda si, yr: yr,
    'Sport + year': lambda si, yr: (si, yr),
}

print(f'Recognisable = >={MIN_FAME} medals all-time -> {len(BIG)} of {len(fame)} countries')
print(f'Hard = the two counts within {int(HARD_GAP*100)}% of each other\n')
print(f"{'MODE':<15}{'cells':>7}{'usable':>8}{'valid Qs':>11}{'playable':>11}{'hard':>8}{'podiums':>9}")
print('-' * 69)
summary = {}
for name, key in MODES.items():
    sl = slice_counts(key)
    V = P = H = usable = pods = 0
    for cell, counts in sl.items():
        v, p, h = score(counts)
        V += v; P += p; H += h
        if p: usable += 1
        if podiums(counts): pods += 1
    summary[name] = dict(cells=len(sl), usable=usable, valid=V, playable=P, hard=H, podiums=pods)
    print(f'{name:<15}{len(sl):>7}{usable:>8}{V:>11,}{P:>11,}{H:>8,}{pods:>9}')
print('-' * 69)

# which slices are unusable, so the UI can hide them
sl = slice_counts(lambda si, yr: si)
dead = sorted(SPORTS[si] for si, c in sl.items() if score(c)[1] == 0)
print(f'\nSports with no playable question ({len(dead)}) - exclude from By sport:')
print('  ' + ', '.join(dead))

best = sorted(((score(c)[1], SPORTS[si]) for si, c in sl.items()), reverse=True)[:10]
print('\nStrongest sports:')
for n, s in best: print(f'  {s:<22}{n:>6,}')

json.dump(summary, open(os.path.join(ROOT, 'src', 'data', 'mode_viability.json'), 'w'), indent=1)
print('\nwrote src/data/mode_viability.json')
