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
    ok: /const\s+pronLevel\s*=\s*Number\(entry\?\.pronunciation\?\.level\s*\|\|\s*0\)\s*\|\|\s*0;[\s\S]*?const\s+meaningLevel\s*=\s*Number\(entry\?\.meaningState\?\.level\s*\|\|\s*0\)\s*\|\|\s*0;[\s\S]*?return\s+pronLevel\s*>\s*0\s*&&\s*meaningLevel\s*>\s*0;/.test(source)
  },
  {
    name: "vocabulary sample completion uses explicit pronunciation and meaning decisions",
    ok: /const\s+pronunciationDecision\s*=\s*sample\.pronunciationChoice\s*===\s*"ok"\s*\|\|\s*sample\.pronunciationChoice\s*===\s*"ng";[\s\S]*?const\s+meaningDecision\s*=\s*sample\.meaningChoice\s*===\s*"ok"\s*\|\|\s*sample\.meaningChoice\s*===\s*"ng";/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary completion regression checks passed (${checks.length})`);
