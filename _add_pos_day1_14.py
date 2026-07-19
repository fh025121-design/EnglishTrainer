import json
import re
import zipfile
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

DATA_PATH = Path('data.js')
BACKUP_PATH = Path('data.js.bak_day1_14_before_pos_20260720.js')
REPORT_PATH = Path('_pos_add_report_day1_14.json')

DOCS = [
    Path('STEP1単語熟語_Day1-7.docx'),
    Path('STEP1_単語熟語_Day8-9(1).docx'),
    Path('STEP1_単語熟語_Day10-14(1).docx'),
]

DOC_DAY_RANGES = {
    'STEP1単語熟語_Day1-7.docx': set(range(1, 8)),
    'STEP1_単語熟語_Day8-9(1).docx': {8, 9},
    'STEP1_単語熟語_Day10-14(1).docx': set(range(10, 15)),
}

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

TARGET_POS = ['名詞', '動詞', '形容詞', '副詞', '前置詞', '接続詞', '代名詞', '助動詞', '冠詞', '疑問詞', 'その他']


def normalize_space(s: str) -> str:
    return re.sub(r'\s+', ' ', (s or '').strip())


def normalize_answer(s: str) -> str:
    s = normalize_space(s).lower()
    return s


def normalize_pos(raw: str) -> str:
    t = normalize_space(raw).replace('（', '(').replace('）', ')')
    if not t:
        return 'その他'
    if '疑問詞' in t:
        return '疑問詞'
    if '助動詞' in t:
        return '助動詞'
    if '代名詞' in t:
        return '代名詞'
    if '接続詞' in t:
        return '接続詞'
    if '前置詞' in t:
        return '前置詞'
    if '副詞' in t:
        return '副詞'
    if '形容詞' in t:
        return '形容詞'
    if '動詞' in t:
        return '動詞'
    if '名詞' in t:
        return '名詞'
    if '冠詞' in t:
        return '冠詞'

    head = t[:2]
    if '疑' in t:
        return '疑問詞'
    if '助' in t:
        return '助動詞'
    if '代' in t:
        return '代名詞'
    if '接' in t:
        return '接続詞'
    if '前' in t:
        return '前置詞'
    if '副' in t:
        return '副詞'
    if '形' in t:
        return '形容詞'
    if '動' in t:
        return '動詞'
    if '名' in t:
        return '名詞'
    if '冠' in t:
        return '冠詞'
    if head in {'v.', 'vi', 'vt'}:
        return '動詞'
    if head in {'n.', 'no'}:
        return '名詞'
    if head in {'ad', 'a.'}:
        return '形容詞'
    return 'その他'


def cell_text(tc):
    texts = []
    for t in tc.findall('.//w:t', NS):
        if t.text:
            texts.append(t.text)
    return normalize_space(''.join(texts))


def parse_doc_tables(docx_path: Path):
    with zipfile.ZipFile(docx_path, 'r') as zf:
        xml_bytes = zf.read('word/document.xml')
    root = ET.fromstring(xml_bytes)
    body = root.find('w:body', NS)
    tables = []
    for tbl in body.findall('w:tbl', NS):
        rows = []
        for tr in tbl.findall('w:tr', NS):
            rows.append([cell_text(tc) for tc in tr.findall('w:tc', NS)])
        tables.append(rows)
    return tables


def extract_candidates(docx_path: Path):
    candidates = []
    tables = parse_doc_tables(docx_path)
    for rows in tables:
        for row in rows:
            cells = [c for c in row if c]
            if len(cells) < 3:
                continue
            c0 = cells[0]
            if c0 in {'英語', 'English', '熟語', 'No.', 'No'}:
                continue

            english = normalize_answer(cells[0])
            pos_raw = cells[1]
            japanese = cells[2]

            if not english or not japanese:
                continue
            if re.search(r'ひとこと|例文|解説|ポイント|day\s*\d+', english, re.IGNORECASE):
                continue
            if not re.match(r"^[a-z0-9 '\-()/.]+$", english):
                continue

            candidates.append({
                'answer': english,
                'japanese': japanese,
                'partOfSpeech': normalize_pos(pos_raw),
                'rawPos': pos_raw,
                'source': docx_path.name,
            })
    return candidates


def pick_pos_for_item(item, doc_candidates):
    ans = item['answer']
    jp = normalize_space(item['japanese'])
    matches = [c for c in doc_candidates if c['answer'] == ans]
    if not matches:
        return None, {'reason': 'answer_not_found_in_word_doc'}

    pos_set = sorted({m['partOfSpeech'] for m in matches})
    if len(pos_set) == 1:
        return pos_set[0], None

    jp_matches = [m for m in matches if normalize_space(m['japanese']) == jp]
    jp_pos_set = sorted({m['partOfSpeech'] for m in jp_matches})
    if len(jp_pos_set) == 1:
        return jp_pos_set[0], None

    return None, {
        'reason': 'ambiguous_pos',
        'answer': ans,
        'japanese': item['japanese'],
        'candidatePos': pos_set,
        'candidates': matches[:8],
    }


def extract_target_word_records(data_text: str):
    out = []
    for m in re.finditer(r'\{[^\n]*\bid:\s*"(D(\d{2})-W\d{2})"[^\n]*\bday:\s*(\d+)\b[^\n]*\btype:\s*"word"[^\n]*\banswer:\s*"([^"]+)"[^\n]*\}', data_text):
        id_full = m.group(1)
        day_from_id = int(m.group(2))
        day_field = int(m.group(3))
        ans = normalize_answer(m.group(4))
        if day_from_id != day_field:
            continue
        if not (1 <= day_field <= 14):
            continue
        out.append({'id': id_full, 'day': day_field, 'answer': ans, 'span': (m.start(), m.end())})
    return out


def main():
    report = {
        'backupExistsBefore': BACKUP_PATH.exists(),
        'docsPresent': {str(p): p.exists() for p in DOCS},
        'addedCount': 0,
        'targetWordCount': 0,
        'unprocessed': [],
        'uncertainFromWord': [],
        'duplicateId': False,
        'missingIds': [],
        'existingFieldsChanged': False,
        'jsSyntaxLike': True,
    }

    if not report['backupExistsBefore']:
        raise SystemExit('Backup file not found. Aborting.')

    data_text = DATA_PATH.read_text(encoding='utf-8')
    backup_text = BACKUP_PATH.read_text(encoding='utf-8')
    target_records = extract_target_word_records(data_text)
    report['targetWordCount'] = len(target_records)

    # Build candidate map from each source doc.
    candidates_by_doc = {}
    for p in DOCS:
        if p.exists():
            candidates_by_doc[p.name] = extract_candidates(p)

    lines = data_text.splitlines(True)
    new_lines = []
    added_ids = []
    unprocessed = []

    for line in lines:
        m = re.search(r'\bid:\s*"(D(\d{2})-W\d{2})"', line)
        if not m:
            new_lines.append(line)
            continue
        day = int(m.group(2))
        if not (1 <= day <= 14):
            new_lines.append(line)
            continue
        if 'type: "word"' not in line:
            new_lines.append(line)
            continue

        ans_m = re.search(r'\banswer:\s*"([^"]+)"', line)
        if not ans_m:
            new_lines.append(line)
            continue
        ans = normalize_answer(ans_m.group(1))
        if 'partOfSpeech:' in line:
            new_lines.append(line)
            continue

        jp_m = re.search(r'\bjapanese:\s*"([^"]+)"', line)
        jp = jp_m.group(1) if jp_m else ''

        source_doc_name = None
        for name, day_set in DOC_DAY_RANGES.items():
            if day in day_set:
                source_doc_name = name
                break

        candidates = candidates_by_doc.get(source_doc_name or '', [])
        pos, uncertain = pick_pos_for_item({'day': day, 'answer': ans, 'japanese': jp}, candidates)

        if not pos:
            id_full = m.group(1)
            item = {'id': id_full, 'day': day, 'answer': ans}
            if uncertain:
                item.update(uncertain)
            unprocessed.append(item)
            new_lines.append(line)
            continue

        line2 = line.replace('hint: ""', f'partOfSpeech: "{pos}", hint: ""', 1)
        if line2 == line:
            id_full = m.group(1)
            unprocessed.append({'id': id_full, 'day': day, 'answer': ans, 'reason': 'hint field not found'})
            new_lines.append(line)
            continue

        added_ids.append(m.group(1))
        new_lines.append(line2)

    new_text = ''.join(new_lines)

    # Verify existing fields unchanged by normalizing out partOfSpeech-only insertion.
    normalized_new = re.sub(r'partOfSpeech:\s*"[^"]+",\s*', '', new_text)
    report['existingFieldsChanged'] = (normalized_new != backup_text)

    # ID integrity check.
    ids = re.findall(r'\bid:\s*"(D\d{2}-[WP]\d{2})"', new_text)
    report['duplicateId'] = len(ids) != len(set(ids))

    by_day_missing = []
    for d in range(1, 15):
        expected = {f'D{d:02d}-W{i:02d}' for i in range(1, 21)} | {f'D{d:02d}-P{i:02d}' for i in range(1, 6)}
        actual = {x for x in ids if x.startswith(f'D{d:02d}-')}
        miss = sorted(expected - actual)
        if miss:
            by_day_missing.extend(miss)
    report['missingIds'] = by_day_missing

    # Simple syntax-like checks.
    report['jsSyntaxLike'] = new_text.startswith('window.vocabularyBank = [') and new_text.rstrip().endswith('];')

    if report['existingFieldsChanged']:
        report['status'] = 'aborted_existing_fields_changed'
    else:
        DATA_PATH.write_text(new_text, encoding='utf-8')
        report['status'] = 'ok'

    report['addedCount'] = len(added_ids)
    report['addedIds'] = added_ids
    report['unprocessed'] = unprocessed

    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
