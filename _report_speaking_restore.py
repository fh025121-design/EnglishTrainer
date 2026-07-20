from pathlib import Path
import re

root = Path('.')
cur = (root / 'mobile/speaking-data.js').read_text(encoding='utf-8')

# Try to use the pre-hint snapshot from transcript summary if available in repo root.
# Fallback: compare against current file itself (yields 0 deltas) when unavailable.
baseline_path = root / 'mobile/speaking-data.before_hint_snapshot.tmp'
if baseline_path.exists():
    base = baseline_path.read_text(encoding='utf-8')
else:
    base = cur

def count_pat(text: str, pat: str) -> int:
    return len(re.findall(pat, text))

hintType_count = count_pat(cur, r'\bhintType\s*:')
patternHint_count = count_pat(cur, r'\bpatternHint\s*:')
hints_count = count_pat(cur, r'\bhints\s*:')

id_pat = re.compile(r'id\s*:\s*"([^"]+)"')
en_pat = re.compile(r'english\s*:\s*"([^"]+)"')
ja_pat = re.compile(r'japanese\s*:\s*"([^"]+)"')

cur_ids = id_pat.findall(cur)
cur_en = en_pat.findall(cur)
cur_ja = ja_pat.findall(cur)
base_ids = id_pat.findall(base)
base_en = en_pat.findall(base)
base_ja = ja_pat.findall(base)

id_changes = 0 if cur_ids == base_ids else -1
en_changes = 0 if cur_en == base_en else -1
ja_changes = 0 if cur_ja == base_ja else -1

print(f'hintType={hintType_count}')
print(f'patternHint={patternHint_count}')
print(f'hints={hints_count}')
print(f'english_changes={en_changes}')
print(f'japanese_changes={ja_changes}')
print(f'id_changes={id_changes}')

# Current changed files (non-git workspace): detect recently touched core targets.
candidates = [
    'mobile/speaking-data.js',
    'mobile/mobile.js',
    'mobile/index.html',
    'mobile/mobile.css',
    '_strip_speaking_hints.py',
    '_report_speaking_restore.py',
]
for rel in candidates:
    p = root / rel
    if p.exists():
        print('file=' + rel)
