import re
from pathlib import Path

text = Path('data.js').read_text(encoding='utf-8')
pattern = re.compile(r'\{ id: "(D(\d{2})-W\d{2})", day: \d+, type: "word", japanese: "([^"]+)", answer: "([^"]+)", hint: "([^"]*)", similar: (\[[^\]]*\]) \}')
rows = []
for wid, day, jp, ans, hint, sim in pattern.findall(text):
    if 1 <= int(day) <= 40 and hint:
        rows.append((wid, jp, ans, hint))
rows.sort(key=lambda x: x[0])
print('COUNT\t' + str(len(rows)))
for wid, jp, ans, hint in rows:
    print(f'{wid}\t{jp}\t{ans}\t{hint}')
