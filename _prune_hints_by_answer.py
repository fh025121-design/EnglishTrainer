import re
from pathlib import Path

DATA = Path('data.js')
REPORT_REMOVED = Path('_hints_removed.tsv')
REPORT_REMAIN = Path('_hints_remaining.tsv')

remove_answers = {
    'do', 'play',
    'depart', 'leave',
    'class', 'lesson',
    'borrow', 'lend',
    'start', 'begin',
    'finish', 'stop',
}

keep_answers = {
    'see', 'look', 'watch',
    'hear', 'listen',
    'say', 'tell', 'speak', 'talk',
    'bring', 'take',
    'come', 'go',
    'fast', 'quickly',
    'high', 'expensive',
    'smart', 'clever',
    'difficult', 'hard',
    'check', 'confirm',
}

text = DATA.read_text(encoding='utf-8')

pattern = re.compile(
    r'(?P<pre>\{ id: "(?P<id>D\d{2}-W\d{2})", day: \d+, type: "word", japanese: "(?P<jp>[^"]+)", answer: "(?P<ans>[^"]+)", hint: ")(?P<hint>[^"]*)(?P<post>", similar: \[[^\]]*\] \})'
)

removed = []


def repl(m: re.Match) -> str:
    ans_raw = m.group('ans')
    ans = ans_raw.strip().lower()
    hint = m.group('hint')
    if ans in remove_answers and hint:
        removed.append((m.group('id'), m.group('jp'), ans_raw, hint))
        return m.group('pre') + '' + m.group('post')
    return m.group(0)


new_text = pattern.sub(repl, text)
DATA.write_text(new_text, encoding='utf-8')

# Re-scan after write for remaining hints in keep set.
text2 = DATA.read_text(encoding='utf-8')
remain = []
for m in pattern.finditer(text2):
    ans_raw = m.group('ans')
    ans = ans_raw.strip().lower()
    hint = m.group('hint')
    if ans in keep_answers and hint:
        remain.append((m.group('id'), m.group('jp'), ans_raw, hint))

removed.sort(key=lambda x: x[0])
remain.sort(key=lambda x: x[0])

REPORT_REMOVED.write_text(
    'id\t日本語\t英語\t削除hint\n' + '\n'.join('\t'.join(r) for r in removed),
    encoding='utf-8'
)
REPORT_REMAIN.write_text(
    'id\t日本語\t英語\t残存hint\n' + '\n'.join('\t'.join(r) for r in remain),
    encoding='utf-8'
)

print(f'REMOVED\t{len(removed)}')
print(f'REMAIN\t{len(remain)}')
