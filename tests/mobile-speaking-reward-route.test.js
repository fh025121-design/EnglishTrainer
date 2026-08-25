const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");
const completeScreen = source.match(/function renderSpeakingWordCompleteScreen\(\) \{[\s\S]*?\n  \}/);
const leaveFunction = source.match(/function leaveSpeakingWordPracticeToDaySelect\(\) \{[\s\S]*?\n  \}/);

assert.ok(completeScreen, "renderSpeakingWordCompleteScreen should exist");
assert.ok(leaveFunction, "leaveSpeakingWordPracticeToDaySelect should exist");

const checks = [
  {
    name: "normal speaking completion uses the shared reward screen with earned points",
    ok: /const earnedPoints = Math\.max\(0, Number\(practice\.completedCount \|\| 0\) \* 2\);[\s\S]*?if \(earnedPoints > 0\) \{[\s\S]*?openPointRewardScreen\("speakingVocabulary", earnedPoints, \{ onClose: renderHome \}\);[\s\S]*?return;[\s\S]*?\}/.test(completeScreen[0])
  },
  {
    name: "interrupted speaking practice uses the shared reward screen with earned points",
    ok: /const earnedPoints = practice \? Math\.max\(0, Number\(practice\.completedCount \|\| 0\) \* 2\) : 0;[\s\S]*?if \(earnedPoints > 0\) \{[\s\S]*?openPointRewardScreen\("speakingVocabulary", earnedPoints, \{ onClose: renderSpeakingWordDaySelectScreen \}\);[\s\S]*?return;[\s\S]*?\}/.test(leaveFunction[0])
  },
  {
    name: "zero point sessions do not show the reward screen",
    ok: /if \(earnedPoints > 0\) \{[\s\S]*?openPointRewardScreen\([\s\S]*?\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?renderHome\(\);/.test(completeScreen[0]) && /if \(earnedPoints > 0\) \{[\s\S]*?openPointRewardScreen\([\s\S]*?\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?renderSpeakingWordDaySelectScreen\(\);/.test(leaveFunction[0])
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`speaking reward route checks passed (${checks.length})`);
