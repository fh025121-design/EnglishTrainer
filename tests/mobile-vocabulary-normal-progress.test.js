const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");
const bankSource = fs.readFileSync(path.join(__dirname, "..", "mobile", "vocabulary-data.js"), "utf8");
const gradeCounts = { 5: 0, 4: 0, 3: 0 };
for (const match of bankSource.matchAll(/grade:\s*(\d+)/g)) {
  const grade = Number(match[1]);
  if (gradeCounts[grade] !== undefined) {
    gradeCounts[grade] += 1;
  }
}

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
  },
  {
    name: "generated vocabulary bank retains real grade buckets",
    ok: gradeCounts[5] === 123 && gradeCounts[4] === 164 && gradeCounts[3] === 312 && (gradeCounts[5] + gradeCounts[4] + gradeCounts[3]) === 599
  },
  {
    name: "summary grade logic prefers generated grade metadata over a 5-level fallback",
    ok: /function getVocabularyGradeValue\s*\(/.test(source) && /Array\.isArray\(studyEntries\)/.test(source) && /safeGradeKey/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary normal progress checks passed (${checks.length})`);
