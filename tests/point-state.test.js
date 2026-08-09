const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const appCode = fs.readFileSync(require("path").join(__dirname, "..", "app.js"), "utf8");
const documentStub = {
  body: { dataset: {} },
  getElementById() { return null; },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  addEventListener() {}
};
const context = {
  window: {
    ENGLISH_TRAINER_RELEASE_INFO: { releaseHistory: [] },
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(callback) { callback && callback(); return 0; }
  },
  document: documentStub,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  console,
  Date,
  setTimeout,
  clearTimeout,
  navigator: { userAgent: "node" },
  location: { href: "http://localhost/" }
};
context.globalThis = context;
context.window.globalThis = context;
vm.createContext(context);
vm.runInContext(appCode, context, { filename: "app.js" });

const sanitized = context.sanitizePointState({
  dailyEarnedByDate: { "2026-08-09": 4 },
  dailyEarnedByModeByDate: {
    "2026-08-09": {
      preposition: 1,
      response: 1,
      challenge: 0,
      "irregular-verb": 2,
      idiom: 3
    }
  }
});

assert.strictEqual(sanitized.dailyEarnedByModeByDate["2026-08-09"].idiom, 3, "idiom points should be preserved");
assert.strictEqual(context.inferPointModeFromLearningHistoryEntry("phrase-spiral"), "idiom", "phrase-spiral should map to the idiom point mode");

console.log("point-state tests passed");
