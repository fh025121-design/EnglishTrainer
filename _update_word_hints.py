import re
from pathlib import Path

DATA_PATH = Path('data.js')
REPORT_PATH = Path('_updated_hint_words.tsv')

text = DATA_PATH.read_text(encoding='utf-8')

# Rule 1: if similar exists, prefer semantic distinction hints.
semantic_hint = {
    'see': '自然に目に入る',
    'look': '意識して見る',
    'watch': 'じっと見る',
    'hear': '自然に聞こえる',
    'listen': '意識して聞く',
    'say': '言葉を言う',
    'tell': '相手に伝える',
    'speak': '言語を話す',
    'talk': '会話する',
    'bring': '話し手のいる方へ持ってくる',
    'take': '話し手から離れる方へ持っていく',
    'come': '話し手のいる方へ来る',
    'go': '話し手から離れる方へ行く',
    'borrow': '借りる',
    'lend': '貸す',
    'begin': '始まりに重点',
    'start': '開始する',
    'finish': '最後まで終える',
    'stop': '途中で止める',
}

# Rule 3: antonym pairs that can be left without hint.
skip_answers = {'forget', 'remember', 'open', 'close'}

# Rule 2: similar無し + duplicated Japanese that is confusing.
length_hint_by_pair = {
    ('する', 'do'): '動詞・2文字',
    ('する', 'play'): '動詞・4文字',
    ('出発する', 'depart'): '動詞・6文字',
    ('出発する', 'leave'): '動詞・5文字',
    ('授業', 'class'): '名詞・5文字',
    ('授業', 'lesson'): '名詞・6文字',
    ('確認する', 'check'): '動詞・5文字',
    ('確認する', 'confirm'): '動詞・7文字',
    ('賢い', 'clever'): '形容詞・6文字',
    ('賢い', 'smart'): '形容詞・5文字',
    ('速い', 'fast'): '形容詞・4文字',
    ('速い', 'rapid'): '形容詞・5文字',
    ('速く', 'fast'): '副詞・4文字',
    ('速く', 'quickly'): '副詞・7文字',
    ('難しい', 'difficult'): '形容詞・9文字',
    ('難しい', 'hard'): '形容詞・4文字',
    ('高い', 'expensive'): '形容詞・9文字',
    ('高い', 'high'): '形容詞・4文字',
}

pattern = re.compile(
    r'(\{ id: "D(?P<day>\d{2})-W(?P<idx>\d{2})", day: (?P<daynum>\d+), type: "word", japanese: "(?P<jp>[^"]+)", answer: "(?P<ans>[^"]+)", hint: ")(?P<hint>[^"]*)(", similar: (?P<sim>\[[^\]]*\]) \})'
)

changes = []


def repl(m: re.Match) -> str:
    day = int(m.group('day'))
    if not (1 <= day <= 40):
        return m.group(0)

    jp = m.group('jp')
    ans_raw = m.group('ans')
    ans = ans_raw.strip().lower()
    old_hint = m.group('hint')
    sim = m.group('sim').strip()

    new_hint = old_hint
    has_sim = sim != '[]'

    if has_sim and ans in semantic_hint and ans not in skip_answers:
        new_hint = semantic_hint[ans]
    elif not has_sim:
        new_hint = length_hint_by_pair.get((jp, ans), old_hint)

    if new_hint != old_hint:
        word_id = f'D{day:02d}-W{int(m.group("idx")):02d}'
        changes.append((word_id, jp, ans_raw, old_hint, new_hint))

    return m.group(1) + new_hint + m.group(7)


new_text = pattern.sub(repl, text)
DATA_PATH.write_text(new_text, encoding='utf-8')

lines = ['id\t日本語\t英語\t旧hint\t新hint']
for row in changes:
    lines.append('\t'.join(row))
REPORT_PATH.write_text('\n'.join(lines), encoding='utf-8')

print(f'UPDATED\t{len(changes)}')
print(f'REPORT\t{REPORT_PATH}')
