import re
from pathlib import Path

text = Path('mobile/mobile.js').read_text(encoding='utf-8')

m = re.search(r'\bW2\s*:\s*Object\.freeze\(\{', text)
if not m:
    raise SystemExit('W2 block not found')
start = m.end() - 1

level = 0
end = None
for i in range(start, len(text)):
    ch = text[i]
    if ch == '{':
        level += 1
    elif ch == '}':
        level -= 1
        if level == 0:
            end = i
            break
if end is None:
    raise SystemExit('W2 block end not found')

w2 = text[start:end+1]

keys = ['2026-06-29','2026-06-30','2026-07-01','2026-07-02','2026-07-03','2026-07-04','2026-07-05']
print('W2_DAY_COUNTS')
for k in keys:
    dm = re.search(rf'"{k}"\s*:\s*Object\.freeze\(\[', w2)
    if not dm:
        print(f'{k}\tmissing')
        continue
    ds = dm.end()-1
    lv = 0
    de = None
    for j in range(ds, len(w2)):
        c = w2[j]
        if c == '[':
            lv += 1
        elif c == ']':
            lv -= 1
            if lv == 0:
                de = j
                break
    arr = w2[ds:de+1]
    cnt = len(re.findall(r'\bword\s*:\s*"', arr))
    print(f'{k}\t{cnt}')

first = re.search(r'"2026-06-29"\s*:\s*Object\.freeze\(\[\s*\{(.*?)\}\s*,', w2, re.S)
if not first:
    raise SystemExit('first item not found')
chunk = first.group(1)
def pick(field):
    mm = re.search(rf'\b{field}\s*:\s*"([^"]*)"', chunk)
    return mm.group(1) if mm else ''

print('W2_FIRST_DAY_FIRST_ITEM')
print('word\t'+pick('word'))
print('example\t'+pick('example'))
print('exampleJapanese\t'+pick('exampleJapanese'))
print('W1_PRESENT\t'+('yes' if re.search(r'\bW1\s*:', text) else 'no'))
print('W5_PRESENT\t'+('yes' if re.search(r'\bW5\s*:', text) else 'no'))
