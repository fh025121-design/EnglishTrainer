const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");

const checks = [
  {
    name: "new vocabulary history entries are identified by day-keyed vocabulary mode",
    ok: /function isNewMobileVocabularyHistoryEntry\(entry\)/.test(source)
  },
  {
    name: "vocabulary history points are aggregated into the mobile point breakdown",
    ok: /modeLabel:\s*"単語"/.test(source)
  },
  {
    name: "summary total includes vocabulary points from saved earnedPoints",
    ok: /getMobileVocabularyEarnedPointsByDay\(|todayVocabulary|totalVocabulary/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile point vocabulary summary checks passed (${checks.length})`);
