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
    name: "normal round queue state is persisted in localStorage for shuffled rounds",
    ok: /MOBILE_VOCABULARY_NORMAL_QUEUE_STORAGE_KEY/.test(source) && /function getVocabularyNormalRoundState\s*\(/.test(source) && /function generateVocabularyNormalRoundQueue\s*\(/.test(source)
  },
  {
    name: "grade summary display uses study-progress labels instead of fixed mastered counts",
    ok: /function getVocabularyGradeProgressDisplay\s*\(/.test(source) && /function getVocabularyEntryDisplayStatus\s*\(/.test(source) && /学習中/.test(source)
  },
  {
    name: "grade and state browse screens are available for read-only list views",
    ok: /function openVocabularyProgressList\s*\(/.test(source) && /function renderVocabularyProgressList\s*\(/.test(source) && /vocabularyProgressListScreen/.test(source)
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
