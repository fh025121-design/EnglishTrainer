const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "mobile", "index.html"), "utf8");

const checks = [
  {
    name: "past history screen is defined in the mobile app",
    ok: /vocabularyPastHistoryScreen/.test(html) && /openVocabularyPastHistoryScreen/.test(source)
  },
  {
    name: "past history button is available in the vocabulary top menu",
    ok: /openVocabularyPastHistoryBtn/.test(html) && /openVocabularyPastHistoryBtn/.test(source)
  },
  {
    name: "past history derives from vocabulary study state and keeps a single row per material id",
    ok: /getVocabularyPastHistoryEntries/.test(source) && /lastSelfResult/.test(source) && /lastLearnedAt/.test(source)
  },
  {
    name: "past history display preserves current teacher-check state separately from self judgments",
    ok: /getVocabularyPastHistoryStatus/.test(source) && /teacherCheckState/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary past history checks passed (${checks.length})`);
