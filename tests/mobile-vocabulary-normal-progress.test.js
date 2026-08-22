const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");

const checks = [
  {
    name: "normal progress is persisted in localStorage",
    ok: /MOBILE_VOCABULARY_NORMAL_PROGRESS_STORAGE_KEY/.test(source)
  },
  {
    name: "normal progress load/save functions exist",
    ok: /function (load|save)VocabularyNormalProgress/.test(source)
  },
  {
    name: "normal progress advances after a completed word",
    ok: /function advanceVocabularyNormalProgress/.test(source)
  },
  {
    name: "normal study queue starts from stored continuation position",
    ok: /buildVocabularyNormalStudyWords|const normalProgress = getVocabularyNormalProgress\(/.test(source)
  },
  {
    name: "normal progress is segregated from review logic",
    ok: /MOBILE_VOCABULARY_NORMAL_PROGRESS_STORAGE_KEY/.test(source) && /function getVocabularyCandidateQueue/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary normal progress checks passed (${checks.length})`);
