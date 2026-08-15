const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");
const match = source.match(/function parseWeekNumber\(weekId\)[\s\S]*?function isSpeakingLevel1Week\(week\) \{[\s\S]*?\n\s*return weekNumber >= 1 && weekNumber <= \d+;\s*\n\s*\}/);
assert.ok(match, "Week1-7 Level1 flow helper should exist");
assert.ok(/<= 7/.test(match[0]), "Week7 should follow the same Level1/会話構成 as Week1-6");

const context = { console, Date, setTimeout, clearTimeout };
vm.createContext(context);
vm.runInContext(match[0], context);
assert.strictEqual(typeof context.parseWeekNumber, "function", "parseWeekNumber should be available");
assert.strictEqual(context.isSpeakingLevel1Week({ weekId: "W7" }), true, "W7 should use the same Level1 flow as Week1-6");
assert.strictEqual(context.isSpeakingLevel1Week({ weekId: "W8" }), false, "Only Week1-7 should use the Level1 flow");
console.log("mobile Week7 flow tests passed");
