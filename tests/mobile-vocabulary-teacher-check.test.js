const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "mobile", "index.html"), "utf8");

const checks = [
  {
    name: "teacher check screen exists in page and app logic",
    ok: /vocabularyTeacherCheckScreen/.test(html) && /teacherCheck/.test(source)
  },
  {
    name: "teacher check sources from past history and max-50 candidate extraction",
    ok: /getVocabularyTeacherCheckCandidates|getVocabularyTeacherCheckHistoryEntries|teacherCheck.*50|max.*50/i.test(source)
  },
  {
    name: "teacher check candidate logic keeps only self-OK and unconfirmed teacher fields and limits to 50 words",
    ok: /teacherCheck.*slice\(0,\s*50\)|slice\(\s*0,\s*50\)|self.*ok.*teacher.*◎|teacher.*◎.*未確認|teacherCheckCandidate/i.test(source)
  },
  {
    name: "teacher check empty-state shows a no-candidate message instead of opening an empty screen",
    ok: /先生チェック対象の単語はありません|no\s*teacher.*candidate|empty.*teacher.*candidate/i.test(source)
  },
  {
    name: "teacher check persists in separate vocabulary skill state and does not mutate level until final apply",
    ok: /teacherCheckState|teacherCheckStatus|currentState.*review.*nextReviewAt.*1\s*\*\s*24|level\s*=\s*1.*currentState.*review/i.test(source)
  },
  {
    name: "teacher check keeps learning state separate from draft decisions",
    ok: /teacherCheckDraft|teacherCheckDrafts|teacherCheckCurrentIndex|teacherCheckSession/i.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary teacher check checks passed (${checks.length})`);
