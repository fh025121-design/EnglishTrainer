#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
EnglishTrainer 用 音声ファイル一括生成スクリプト

同じフォルダにある data.js を読み込み、
指定した Day 範囲の単語・熟語の英語音声を audio/*.mp3 として保存します。

初回のみ、コマンドプロンプトで次を実行してください。
    py -m pip install edge-tts

実行:
    py make_audio.py

既存音声も作り直す:
    py make_audio.py --overwrite
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import edge_tts
except ImportError:
    print()
    print("edge-tts がインストールされていません。")
    print("次のコマンドを1回だけ実行してください。")
    print()
    print("    py -m pip install edge-tts")
    print()
    sys.exit(1)


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_FILE = BASE_DIR / "data.js"
DEFAULT_OUTPUT_DIR = BASE_DIR / "audio"

# 中学生向けに聞き取りやすい米国英語音声
DEFAULT_VOICE = "en-US-AriaNeural"
DEFAULT_RATE = "-12%"
DEFAULT_VOLUME = "+0%"
DEFAULT_START_DAY = 8
DEFAULT_END_DAY = 40


def remove_js_comments(text: str) -> str:
    """文字列内を壊さない範囲で JavaScript コメントを除去する。"""
    result: list[str] = []
    i = 0
    quote: str | None = None
    escaped = False

    while i < len(text):
        char = text[i]
        next_char = text[i + 1] if i + 1 < len(text) else ""

        if quote is not None:
            result.append(char)

            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None

            i += 1
            continue

        if char in ("'", '"', "`"):
            quote = char
            result.append(char)
            i += 1
            continue

        if char == "/" and next_char == "/":
            i += 2
            while i < len(text) and text[i] not in "\r\n":
                i += 1
            continue

        if char == "/" and next_char == "*":
            i += 2
            while i + 1 < len(text) and not (
                text[i] == "*" and text[i + 1] == "/"
            ):
                i += 1
            i += 2
            continue

        result.append(char)
        i += 1

    return "".join(result)


def find_array_text(js_text: str) -> str:
    """
    data.js 内の vocabularyBank 配列部分を取り出す。
    例:
        window.vocabularyBank = [ ... ];
        const vocabularyBank = [ ... ];
    """
    patterns = (
        r"(?:window\.)?vocabularyBank\s*=\s*\[",
        r"(?:const|let|var)\s+vocabularyBank\s*=\s*\[",
    )

    match = None
    for pattern in patterns:
        match = re.search(pattern, js_text)
        if match:
            break

    if not match:
        raise ValueError(
            "data.js 内に vocabularyBank = [ ... ] が見つかりません。"
        )

    start = match.end() - 1
    depth = 0
    quote: str | None = None
    escaped = False

    for index in range(start, len(js_text)):
        char = js_text[index]

        if quote is not None:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue

        if char in ("'", '"', "`"):
            quote = char
            continue

        if char == "[":
            depth += 1
        elif char == "]":
            depth -= 1
            if depth == 0:
                return js_text[start : index + 1]

    raise ValueError("vocabularyBank の閉じる ] が見つかりません。")


def quote_unquoted_keys(text: str) -> str:
    """JavaScript オブジェクトの未引用キーを JSON 形式に近づける。"""
    return re.sub(
        r'([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)',
        r'\1"\2"\3',
        text,
    )


def convert_single_quoted_strings(text: str) -> str:
    """
    JavaScript のシングルクォート文字列を JSON のダブルクォートに変換する。
    テンプレート文字列も通常文字列として扱う。
    """
    output: list[str] = []
    i = 0
    in_double_quote = False
    escaped_in_double = False

    while i < len(text):
        char = text[i]

        # 既にダブルクォート文字列の中なら、そのまま通す
        if in_double_quote:
            output.append(char)
            if escaped_in_double:
                escaped_in_double = False
            elif char == "\\":
                escaped_in_double = True
            elif char == '"':
                in_double_quote = False
            i += 1
            continue

        # ダブルクォート開始
        if char == '"':
            in_double_quote = True
            output.append(char)
            i += 1
            continue

        # シングルクォート/テンプレート文字列のみ JSON 文字列へ変換
        if char in ("'", "`"):
            quote = char
            i += 1
            value: list[str] = []

            while i < len(text):
                char = text[i]

                if char == "\\" and i + 1 < len(text):
                    next_char = text[i + 1]

                    escapes = {
                        "n": "\n",
                        "r": "\r",
                        "t": "\t",
                        "b": "\b",
                        "f": "\f",
                        "v": "\v",
                        "0": "\0",
                    }

                    if next_char in escapes:
                        value.append(escapes[next_char])
                    elif next_char in ("'", '"', "`", "\\", "/"):
                        value.append(next_char)
                    else:
                        value.append("\\")
                        value.append(next_char)

                    i += 2
                    continue

                if char == quote:
                    i += 1
                    break

                value.append(char)
                i += 1
            else:
                raise ValueError("data.js 内に閉じていない文字列があります。")

            output.append(json.dumps("".join(value), ensure_ascii=False))
            continue

        output.append(char)
        i += 1

    return "".join(output)


def js_array_to_python(array_text: str) -> list[dict[str, Any]]:
    """JavaScript 配列を Python のリストへ変換する。"""
    text = remove_js_comments(array_text)
    text = convert_single_quoted_strings(text)
    text = quote_unquoted_keys(text)

    # JavaScript 固有値を JSON 値に寄せる
    text = re.sub(r"\bundefined\b", "null", text)
    text = re.sub(r"\bNaN\b", "null", text)
    text = re.sub(r",(\s*[}\]])", r"\1", text)

    try:
        data = json.loads(text)
    except json.JSONDecodeError as error:
        nearby = text[max(0, error.pos - 120) : error.pos + 120]
        raise ValueError(
            "data.js の解析に失敗しました。\n"
            f"位置: {error.pos}\n"
            f"付近: {nearby}"
        ) from error

    if not isinstance(data, list):
        raise ValueError("vocabularyBank が配列ではありません。")

    return [item for item in data if isinstance(item, dict)]


def load_vocabulary(data_file: Path) -> list[dict[str, Any]]:
    """data.js から vocabularyBank を読み込む。"""
    if not data_file.exists():
        raise FileNotFoundError(
            f"data.js が見つかりません: {data_file}"
        )

    js_text = data_file.read_text(encoding="utf-8-sig")
    array_text = find_array_text(js_text)
    return js_array_to_python(array_text)


def clean_speech_text(value: Any) -> str:
    """音声化する英語を整える。"""
    text = str(value or "").strip()

    # 複数正解が | や / で並んでいる場合は先頭を読む
    if "|" in text:
        text = text.split("|", 1)[0].strip()

    # "answer / alternative" は読み上げが不自然なので基本的に先頭を採用
    if " / " in text:
        text = text.split(" / ", 1)[0].strip()

    # 空欄記号を除去
    text = re.sub(r"_+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    return text


def get_speech_text(item: dict[str, Any]) -> str:
    """
    読み上げる文字列の優先順位。
    data.js に audio があればそれを最優先する。
    """
    for key in ("audio", "answer", "english"):
        text = clean_speech_text(item.get(key))
        if text:
            return text
    return ""


def normalize_audio_base_name(value: Any) -> str:
    """data.js の normalizeAudioBaseName と同じ規則で正規化する。"""
    text = str(value or "").lower()
    text = text.replace("someone", "person")
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = text.strip("_")
    text = re.sub(r"_+", "_", text)
    return text


def get_output_filename(item: dict[str, Any], fallback: str) -> str:
    """
    保存ファイル名を決定する。
    1) audioFile があればそのファイル名を最優先
    2) なければ answer を normalizeAudioBaseName 規則でファイル化
    """
    raw_audio_file = str(item.get("audioFile") or "").strip()
    if raw_audio_file:
        # query/hash を除外し、最終要素のファイル名だけを使う
        cleaned = raw_audio_file.split("?", 1)[0].split("#", 1)[0].replace("\\", "/")
        base_name = Path(cleaned).name
        if base_name:
            stem = safe_file_stem(Path(base_name).stem, fallback)
            suffix = Path(base_name).suffix or ".mp3"
            return f"{stem}{suffix}"

    normalized = normalize_audio_base_name(item.get("answer"))
    if normalized:
        return f"{normalized}.mp3"

    return f"{safe_file_stem(fallback, fallback)}.mp3"


def get_item_day(item: dict[str, Any]) -> int | None:
    value = item.get("day")
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def safe_file_stem(value: Any, fallback: str) -> str:
    """Windows/GitHubで安全なファイル名にする。"""
    text = str(value or "").strip()
    if not text:
        text = fallback

    text = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", text)
    text = re.sub(r"\s+", "_", text)
    text = text.strip(" ._")

    return text or fallback


async def create_audio(
    text: str,
    output_file: Path,
    voice: str,
    rate: str,
    volume: str,
    retries: int = 3,
) -> None:
    """1件のMP3を生成する。通信エラー時は再試行する。"""
    last_error: Exception | None = None

    for attempt in range(1, retries + 1):
        try:
            communicate = edge_tts.Communicate(
                text=text,
                voice=voice,
                rate=rate,
                volume=volume,
            )

            temporary_file = output_file.with_suffix(".tmp.mp3")

            if temporary_file.exists():
                temporary_file.unlink()

            await communicate.save(str(temporary_file))

            if not temporary_file.exists() or temporary_file.stat().st_size == 0:
                raise RuntimeError("生成された音声ファイルが空です。")

            temporary_file.replace(output_file)
            return

        except Exception as error:
            last_error = error

            temporary_file = output_file.with_suffix(".tmp.mp3")
            if temporary_file.exists():
                temporary_file.unlink()

            if attempt < retries:
                await asyncio.sleep(attempt * 1.5)

    raise RuntimeError(
        f"{retries}回試しても音声を生成できませんでした: {last_error}"
    )


async def generate_all(args: argparse.Namespace) -> int:
    items = load_vocabulary(args.data)
    args.output.mkdir(parents=True, exist_ok=True)

    targets_by_filename: dict[str, tuple[int, str, str, Path]] = {}
    skipped_no_text = 0
    skipped_out_of_day = 0
    skipped_wrong_type = 0
    skipped_duplicates = 0

    for index, item in enumerate(items, start=1):
        day = get_item_day(item)
        if day is None or day < args.start_day or day > args.end_day:
            skipped_out_of_day += 1
            continue

        item_type = str(item.get("type") or "").strip().lower()
        if item_type not in ("word", "phrase"):
            skipped_wrong_type += 1
            continue

        speech_text = get_speech_text(item)

        if not speech_text:
            skipped_no_text += 1
            print(f"[読上げ対象なし] {index}: {item}")
            continue

        item_id = safe_file_stem(item.get("id"), str(index))
        file_name = get_output_filename(item, item_id)
        output_file = args.output / file_name

        if file_name in targets_by_filename:
            skipped_duplicates += 1
            continue

        targets_by_filename[file_name] = (index, file_name, speech_text, output_file)

    targets = list(targets_by_filename.values())

    total = len(targets)
    created = 0
    skipped_existing = 0
    failed = 0
    failed_items: list[tuple[str, str]] = []

    print()
    print("========================================")
    print(" EnglishTrainer 音声ファイル生成")
    print("========================================")
    print(f"data.js       : {args.data}")
    print(f"出力フォルダ  : {args.output}")
    print(f"登録データ数  : {len(items)}")
    print(f"対象Day       : Day{args.start_day} ～ Day{args.end_day}")
    print(f"対象件数      : {total}")
    print(f"音声          : {args.voice}")
    print(f"速度          : {args.rate}")
    print("========================================")
    print()

    semaphore = asyncio.Semaphore(max(1, args.jobs))

    async def process(
        position: int,
        file_name: str,
        speech_text: str,
        output_file: Path,
    ) -> None:
        nonlocal created, skipped_existing, failed

        if output_file.exists() and output_file.stat().st_size > 0 and not args.overwrite:
            skipped_existing += 1
            print(
                f"[{position:>4}/{total}] スキップ: "
                f"{output_file.name}  ({speech_text})"
            )
            return

        async with semaphore:
            try:
                await create_audio(
                    text=speech_text,
                    output_file=output_file,
                    voice=args.voice,
                    rate=args.rate,
                    volume=args.volume,
                )
                created += 1
                print(
                    f"[{position:>4}/{total}] 作成完了: "
                    f"{output_file.name}  ({speech_text})"
                )
            except Exception as error:
                failed += 1
                failed_items.append((speech_text, output_file.name))
                print(
                    f"[{position:>4}/{total}] エラー: "
                    f"{file_name}  ({speech_text})\n"
                    f"                 {error}"
                )

    tasks = [
        asyncio.create_task(
            process(position, file_name, speech_text, output_file)
        )
        for position, (_, file_name, speech_text, output_file)
        in enumerate(targets, start=1)
    ]

    if tasks:
        await asyncio.gather(*tasks)

    print()
    print("========================================")
    print(" 完了")
    print("========================================")
    print(f"対象件数       : {total}")
    print(f"新規生成数     : {created}")
    print(f"既存スキップ数 : {skipped_existing}")
    print(f"重複スキップ数 : {skipped_duplicates}")
    print(f"失敗数         : {failed}")
    print(f"対象外Day      : {skipped_out_of_day}")
    print(f"対象外type     : {skipped_wrong_type}")
    print(f"読上げ対象なし : {skipped_no_text}")
    print(f"保存先         : {args.output.resolve()}")
    print("========================================")
    print()

    print("失敗した英語とファイル名:")
    if failed_items:
        for speech_text, file_name in failed_items:
            print(f"- {speech_text} -> {file_name}")
    else:
        print("- なし")
    print()

    if failed:
        print("一部失敗しました。通信状態を確認して、もう一度実行してください。")
        return 1

    print("音声ファイルの生成は正常に完了しました。")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="EnglishTrainer の data.js から MP3 音声を一括生成します。"
    )

    parser.add_argument(
        "--data",
        type=Path,
        default=DEFAULT_DATA_FILE,
        help="入力する data.js の場所",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help="MP3を保存するフォルダ",
    )
    parser.add_argument(
        "--voice",
        default=DEFAULT_VOICE,
        help="edge-tts の英語音声名",
    )
    parser.add_argument(
        "--rate",
        default=DEFAULT_RATE,
        help='読み上げ速度。例: "-12%%", "+0%%"',
    )
    parser.add_argument(
        "--volume",
        default=DEFAULT_VOLUME,
        help='音量。例: "+0%%", "+10%%"',
    )
    parser.add_argument(
        "--jobs",
        type=int,
        default=3,
        help="同時生成数。通常は3のままでOK",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="既存のMP3もすべて作り直す",
    )
    parser.add_argument(
        "--start-day",
        type=int,
        default=DEFAULT_START_DAY,
        help="生成対象の開始Day（既定: 8）",
    )
    parser.add_argument(
        "--end-day",
        type=int,
        default=DEFAULT_END_DAY,
        help="生成対象の終了Day（既定: 40）",
    )

    args = parser.parse_args()
    if args.start_day < 1 or args.end_day < 1:
        parser.error("--start-day と --end-day は1以上を指定してください。")
    if args.start_day > args.end_day:
        parser.error("--start-day は --end-day 以下を指定してください。")
    return args


def main() -> None:
    args = parse_args()

    # 相対パスを make_audio.py の場所基準にそろえる
    if not args.data.is_absolute():
        args.data = (BASE_DIR / args.data).resolve()

    if not args.output.is_absolute():
        args.output = (BASE_DIR / args.output).resolve()

    try:
        exit_code = asyncio.run(generate_all(args))
    except KeyboardInterrupt:
        print("\n処理を中断しました。")
        exit_code = 130
    except Exception as error:
        print()
        print("エラーが発生しました。")
        print(error)
        print()
        exit_code = 1

    raise SystemExit(exit_code)


if __name__ == "__main__":
    main()
