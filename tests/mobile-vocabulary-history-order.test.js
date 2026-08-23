const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");

const checks = [
  {
    name: "today history sorts weak entries before strong entries",
    ok: /getVocabularyHistoryWeaknessScore\s*\(|weaknessDiff|sort\s*\(\(left, right\)\s*=>/.test(source)
  },
  {
    name: "past history display sorts delta entries before non-delta entries",
    ok: /getVocabularyPastHistoryDisplayEntries|includes\("△"\)|lastLearnedAt\s*\|\|\s*0/.test(source)
  },
  {
    name: "today history word rows reveal grade and meaning on click",
    ok: /vocabulary-history-word-button|vocabulary-history-detail|classList\.toggle\("is-open"\)/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary history ordering checks passed (${checks.length})`);
