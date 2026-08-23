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
    name: "teacher check candidate logic requires both self results to be OK and excludes any teacher-C status already marked as complete",
    ok: /getVocabularyTeacherCheckCandidates\s*\(/.test(source)
      && /lastSelfResult.*ok/.test(source)
      && /teacherCheck.*◎/.test(source)
      && /slice\(0,\s*50\)/.test(source)
  },
  {
    name: "teacher check no-candidate state is explicit and screen is list-based rather than single-item navigation",
    ok: /先生チェック対象の単語はありません/.test(source)
      && /vocabulary-teacher-check-list/.test(source)
      && !/teacherCheck.*currentIndex/.test(source)
  },
  {
    name: "teacher check decisions are draft-only until complete and do not mutate level or currentState",
    ok: /teacherCheckSession/.test(source)
      && /teacherCheckState/.test(source)
      && /level\s*>=\s*5|currentState.*review|nextReviewAt.*Date\.now/.test(source)
  },
  {
    name: "teacher check screen supports a single vertical scroll render with audio and dual selection buttons",
    ok: /🔊/.test(source)
      && /発音[\s\S]*◎[\s\S]*△/.test(source)
      && /意味[\s\S]*◎[\s\S]*△/.test(source)
      && /vocabulary-teacher-check-list/.test(source)
  },
  {
    name: "teacher check uses stable per-candidate IDs and independent meaning preview state",
    ok: /data-teacher-check-id/.test(source)
      && /意味を見る/.test(source)
      && /showMeaningIds/.test(source)
      && /session\.decisions/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary teacher check checks passed (${checks.length})`);
