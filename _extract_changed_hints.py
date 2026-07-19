import re
from pathlib import Path

text = Path('data.js').read_text(encoding='utf-8')
pattern = re.compile(r'id:\s*"(D(\d{2})-W\d{2})"[^\n]*?type:\s*"word"[^\n]*?japanese:\s*"([^"]+)"[^\n]*?answer:\s*"([^"]+)"[^\n]*?hint:\s*"([^"]+)"')
rows = []
for wid, day, jp, ans, hint in pattern.findall(text):
    if 1 <= int(day) <= 40 and hint.strip():
        rows.append((wid, jp, ans, hint))
rows.sort(key=lambda x: x[0])
print('COUNT\t' + str(len(rows)))
for r in rows:
    print('\t'.join(r))
