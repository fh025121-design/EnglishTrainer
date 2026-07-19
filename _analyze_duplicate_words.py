import re
import collections
from pathlib import Path

text = Path('data.js').read_text(encoding='utf-8')
pattern = re.compile(
    r'id:\s*"D(\d{2})-W\d{2}"[^\n]*?type:\s*"word"[^\n]*?japanese:\s*"([^"]+)"[^\n]*?answer:\s*"([^"]+)"'
)

by_japanese = collections.defaultdict(set)
for day, japanese, answer in pattern.findall(text):
    if 1 <= int(day) <= 40:
        by_japanese[japanese].add(answer.strip().lower())

rows = sorted((jp, sorted(list(ans))) for jp, ans in by_japanese.items() if len(ans) >= 2)
print('COUNT', len(rows))
for jp, answers in rows:
    print(jp + '\t' + ' | '.join(answers))
