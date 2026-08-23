const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");

const checks = [
  {
    name: "pronunciation-only state does not count as learning",
    ok: /if \(pronunciationLevel >= 5 && meaningLevel >= 5\) return "mastered";\s*if \(pronunciationLevel > 0 && meaningLevel > 0\) return "learning";/.test(source)
  },
  {
    name: "debug learned count requires both fields to be completed",
    ok: /const learnedCount = studyEntries\.filter\(\(entry\) => \{\s*const pronLevel = Number\(entry\?\.pronunciation\?\.level \|\| 0\) \|\| 0;\s*const meaningLevel = Number\(entry\?\.meaningState\?\.level \|\| 0\) \|\| 0;\s*return pronLevel > 0 && meaningLevel > 0;/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary completion regression checks passed (${checks.length})`);
