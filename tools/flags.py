#!/usr/bin/env python3
"""
Build the flag assets and src/data/flags.json.

This is an ASSET build, not a data build — its outputs are committed, so nobody else
needs cairosvg/svgo installed to run the app. Re-run it only when adding flags.

Sources, in priority order per NOC:
  1. datasetOlympic/flags/<noc>.svg   user-supplied (historical flags from Wikimedia)
  2. tools/flags_authored/<noc>.svg   simple historical flags authored here
  3. flag-icons <iso>.svg             141 live countries, via tools/noc_iso.py
  4. none                             -> nameOnly: renders as a name card

Format is chosen PER FLAG by whichever is smaller. Neither wins outright: Serbia is
177 KB as SVG and 7 KB as WebP (detailed coat of arms), while France is under 1 KB as
SVG and larger as WebP. Measured across all 271 flag-icons files, hybrid is 627 KB
against 1,899 KB for all-SVG.

Nothing here hard-fails on a missing flag. Country names are shown beside flags by
default, so a missing asset degrades to a name-only card rather than an empty box.
Missing flags ARE reported loudly.
"""
import hashlib
import json, os, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'tools'))
from noc_iso import NOC_ISO, ALIAS, NO_PROMPT, HISTORICAL

OUT_DIR = os.path.join(ROOT, 'src', 'assets', 'flags')
AUTHORED = os.path.join(ROOT, 'tools', 'flags_authored')
WIDTH = 320   # 2x the ~160px display size

def find_flagicons():
    for c in ('node_modules/flag-icons/flags/4x3', '../node_modules/flag-icons/flags/4x3',
              '/tmp/node_modules/flag-icons/flags/4x3'):
        p = c if os.path.isabs(c) else os.path.normpath(os.path.join(ROOT, c))
        if os.path.isdir(p): return p
    return None

def user_flags():
    for c in ('../datasetOlympic/flags', 'datasetOlympic/flags'):
        p = os.path.normpath(os.path.join(ROOT, c))
        if os.path.isdir(p): return p
    return None

FI, USER = find_flagicons(), user_flags()
D = json.load(open(os.path.join(ROOT, 'src', 'data', 'medals.json'), encoding='utf-8'))
os.makedirs(OUT_DIR, exist_ok=True)
for f in os.listdir(OUT_DIR):
    os.remove(os.path.join(OUT_DIR, f))

try:
    import cairosvg
    from PIL import Image
    CAN_RASTER = True
except ImportError:
    CAN_RASTER = False

HAS_SVGO = shutil.which('svgo') is not None

def emit(noc, src):
    """Write the smaller of optimised-SVG and WebP. Returns the filename written."""
    lo = noc.lower()
    cands = []
    svg_out = os.path.join(OUT_DIR, f'{lo}.svg')
    if HAS_SVGO:
        r = subprocess.run(['svgo', src, '-o', svg_out, '--multipass', '-q'], capture_output=True)
        if r.returncode != 0 or not os.path.exists(svg_out): shutil.copy(src, svg_out)
    else:
        shutil.copy(src, svg_out)
    cands.append((os.path.getsize(svg_out), f'{lo}.svg', svg_out))

    if CAN_RASTER:
        webp_out = os.path.join(OUT_DIR, f'{lo}.webp')
        try:
            tmp = os.path.join(OUT_DIR, '_t.png')
            cairosvg.svg2png(url=src, write_to=tmp, output_width=WIDTH, output_height=int(WIDTH * 0.75))
            Image.open(tmp).convert('RGB').save(webp_out, 'WEBP', quality=88, method=6)
            os.remove(tmp)
            cands.append((os.path.getsize(webp_out), f'{lo}.webp', webp_out))
        except Exception:
            pass

    cands.sort()
    keep = cands[0]
    for _, _, path in cands[1:]:
        if os.path.exists(path): os.remove(path)
    return keep[1], keep[0]

def source_for(noc):
    if USER and os.path.exists(os.path.join(USER, f'{noc.lower()}.svg')):
        return os.path.join(USER, f'{noc.lower()}.svg'), 'supplied'
    if os.path.exists(os.path.join(AUTHORED, f'{noc.lower()}.svg')):
        return os.path.join(AUTHORED, f'{noc.lower()}.svg'), 'authored'
    iso = ALIAS[noc][0] if noc in ALIAS else NOC_ISO.get(noc)
    if iso and FI and os.path.exists(os.path.join(FI, f'{iso}.svg')):
        return os.path.join(FI, f'{iso}.svg'), ('alias' if noc in ALIAS else 'flag-icons')
    return None, None

flags, counts, total, name_only, unmapped = {}, {}, 0, [], []
for noc, meta in sorted(D['countries'].items()):
    entry = {'name': meta['name'], 'nameHe': meta.get('nameHe') or meta['name']}
    if noc in NO_PROMPT:
        entry['noPrompt'] = True
        entry['why'] = NO_PROMPT[noc]
        flags[noc] = entry
        counts['noPrompt'] = counts.get('noPrompt', 0) + 1
        continue
    if noc in HISTORICAL:
        nm, y0, y1 = HISTORICAL[noc]
        entry['historical'] = True
        entry['years'] = [y0, y1]
    if noc in ALIAS:
        entry['aliasNote'] = ALIAS[noc][1]

    src, kind = source_for(noc)
    if not src:
        entry['nameOnly'] = True
        name_only.append(noc)
        if noc not in HISTORICAL: unmapped.append(noc)
    else:
        fn, size = emit(noc, src)
        entry['file'] = fn
        total += size
        counts[kind] = counts.get(kind, 0) + 1
    flags[noc] = entry

# ---------------------------------------------------------------------------
# Pixel-identical flags.
#
# West Germany flew the same black-red-gold tricolour as Germany, and Czechia kept
# Czechoslovakia's flag when the federation split. Their asset files are byte-for-byte
# identical, so a quiz question pairing them shows the SAME PICTURE TWICE and cannot be
# answered from the flag at all. Tag each such set with a shared group id and let the
# games refuse to put two members of a group in one question.
_by_hash = {}
for noc, entry in flags.items():
    fn = entry.get('file')
    if not fn:
        continue
    h = hashlib.sha1(open(os.path.join(ROOT, 'src', 'assets', 'flags', fn), 'rb').read()).hexdigest()
    _by_hash.setdefault(h, []).append(noc)
lookalikes = sorted(v for v in _by_hash.values() if len(v) > 1)
for gi, group in enumerate(lookalikes):
    for noc in group:
        flags[noc]['sameFlag'] = gi
print(f'\nidentical flag images: {lookalikes or "none"}')

json.dump({'flags': flags, 'width': WIDTH,
           'note': 'noPrompt = competed under the Olympic flag, never used as a visual '
                   'prompt. nameOnly = no asset yet, renders as a name card.'},
          open(os.path.join(ROOT, 'src', 'data', 'flags.json'), 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))

print(f'flag-icons : {FI or "NOT FOUND"}')
print(f'supplied   : {USER or "(none)"}')
print(f'svgo {"yes" if HAS_SVGO else "no"} | raster {"yes" if CAN_RASTER else "no"}\n')
for k, v in sorted(counts.items()): print(f'  {k:<12}{v:>4}')
print(f'  {"nameOnly":<12}{len(name_only):>4}  {name_only}')
print(f'\n{sum(counts.values()) - counts.get("noPrompt", 0)} flag files, {total/1024:.0f} KB total')
if unmapped:
    print(f'\n!! {len(unmapped)} NOCs have no flag and are not known-historical: {unmapped}')
