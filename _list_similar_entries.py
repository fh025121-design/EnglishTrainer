import re
from pathlib import Path

text = Path('data.js').read_text(encoding='utf-8')

line_pattern = re.compile(
    r'id:\s*"D(\d{2})-W\d{2}"[^\n]*?japanese:\s*"([^"]+)"[^\n]*?answer:\s*"([^"]+)"[^\n]*?similar:\s*\[(.*?)\]'
)
sim_pattern = re.compile(r'\{\s*answer:\s*"([^"]+)"\s*,\s*reason:\s*"([^"]+)"\s*\}')

rows = []
for day, jp, answer, sim_block in line_pattern.findall(text):
    day_i = int(day)
    if not (1 <= day_i <= 40):
        continue
    sims = sim_pattern.findall(sim_block)
    if not sims:
        continue
    for s_ans, s_reason in sims:
        rows.append((day_i, jp, answer, s_ans, s_reason))

rows.sort(key=lambda x: (x[0], x[1], x[2], x[3]))

print(f'COUNT\t{len(rows)}')
print('DAY\t日本語\t英語\tsimilar\treason')
for d, jp, ans, s, r in rows:
    print(f'{d}\t{jp}\t{ans}\t{s}\t{r}')
