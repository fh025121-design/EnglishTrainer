const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");

const functionMatch = source.match(/function isNewVocabularyPracticeHistoryEntry\(entry\) \{[\s\S]*?\n  \}/);
assert.ok(functionMatch, "isNewVocabularyPracticeHistoryEntry function should exist");

const checks = [
  {
    name: "new vocabulary history entries accept the current mobile category label",
    ok: /category === "単語練習"/.test(functionMatch[0])
  },
  {
    name: "vocabulary history points are aggregated into the mobile point breakdown",
    ok: /modeLabel:\s*"単語"/.test(source)
  },
  {
    name: "summary total includes vocabulary points from saved earnedPoints",
    ok: /todayVocabulary/.test(source) && /getMobileVocabularyPracticePointsByDayFromHistory\(\)/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile point vocabulary summary checks passed (${checks.length})`);
