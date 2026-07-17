# Audio files

Put pronunciation MP3 files in this folder.

Naming rule:
- File name is generated from each entry's `answer` in `data.js`
- Lowercase
- Non-alphanumeric characters replaced with `_`
- Example: `be interested in` -> `audio/be_interested_in.mp3`

If a file is missing, the app logs `音声ファイルがありません` and continues without blocking progression.
