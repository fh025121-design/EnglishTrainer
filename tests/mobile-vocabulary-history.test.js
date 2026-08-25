const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");

const checks = [
  {
    name: "completed word count is the canonical session metric",
    ok: /const completedWordCount = getVocabularySampleCompletedWordCount\(sample\);[\s\S]*?questionCount:\s*completedWordCount/.test(source)
  },
  {
    name: "two points per completed word",
    ok: /const earnedPoints = completedWordCount \* 2;/.test(source)
  },
  {
    name: "same session is saved only once",
    ok: /if \(!sample \|\| sample\.historyFinalized\)\s*return;\s*sample\.historyFinalized\s*=\s*true;/.test(source)
  },
  {
    name: "home summary counts new vocabulary by iso day key while excluding legacy week-style labels",
    ok: /const isNewVocabularyEntry = \(category === "Vocabulary" \|\| category === "単語練習"\) && isIsoDayKey\(dayNumber\);[\s\S]*?const isLegacyVocabularyEntry = \(category === "Vocabulary" \|\| category === "単語練習"\) && \/week\/i\.test\(dayNumber\);/.test(source)
  },
  {
    name: "zero question-count entries are rejected before save",
    ok: /if \(Math\.max\(0,\s*Number\(sanitized\.questionCount\)\s*\|\|\s*0\)\s*===\s*0\)\s*\{\s*return;/.test(source)
  },
  {
    name: "today history excludes partially completed judgments",
    ok: /String\(entry\.pronunciation \|\| "—"\)\.trim\(\) !== "—" && String\(entry\.meaning \|\| "—"\)\.trim\(\) !== "—"/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary history checks passed (${checks.length})`);
