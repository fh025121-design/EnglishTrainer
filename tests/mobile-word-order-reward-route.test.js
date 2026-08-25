const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");
const leaveFunction = source.match(/function leaveWordOrderTrainingToHome\(\) \{[\s\S]*?\n  \}/);
assert.ok(leaveFunction, "leaveWordOrderTrainingToHome should exist");

const checks = [
  {
    name: "word-order interruption path opens the shared reward screen using the session earned points",
    ok: /openPointRewardScreen\("wordOrder", earnedPoints, \{ onClose: renderHome \}\)/.test(leaveFunction[0])
  },
  {
    name: "word-order reward path only renders home when there are no earned points",
    ok: /if \(earnedPoints > 0\) \{[\s\S]*?openPointRewardScreen\("wordOrder", earnedPoints, \{ onClose: renderHome \}\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?renderHome\(\);/.test(leaveFunction[0])
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`word-order reward route checks passed (${checks.length})`);
