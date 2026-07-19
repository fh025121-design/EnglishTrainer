import re
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

DOCS = [
    Path("STEP1単語熟語_Day1-7.docx"),
    Path("STEP1_単語熟語_Day8-9(1).docx"),
    Path("STEP1_単語熟語_Day10-14(1).docx"),
]

NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}


def cell_text(tc):
    texts = []
    for t in tc.findall('.//w:t', NS):
        if t.text:
            texts.append(t.text)
    return ''.join(texts).strip()


def iter_tables(docx_path: Path):
    with zipfile.ZipFile(docx_path, 'r') as zf:
        xml_bytes = zf.read('word/document.xml')
    root = ET.fromstring(xml_bytes)
    body = root.find('w:body', NS)
    for tbl in body.findall('w:tbl', NS):
        rows = []
        for tr in tbl.findall('w:tr', NS):
            cells = [cell_text(tc) for tc in tr.findall('w:tc', NS)]
            rows.append(cells)
        yield rows


def main():
    for doc in DOCS:
        print(f"=== {doc} ===")
        if not doc.exists():
            print('MISSING')
            continue
        for i, rows in enumerate(iter_tables(doc), start=1):
            print(f"TABLE {i} rows={len(rows)}")
            for r in rows[:12]:
                print('  ', r)
            print('---')


if __name__ == '__main__':
    main()
