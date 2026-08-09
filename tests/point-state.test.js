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
assert.strictEqual(context.normalizeLearningMode("irregular-verb-training"), "不規則動詞特訓", "irregular-verb should normalize to a learning-history mode");
const irregularBucket = context.getLearningHistoryModeBucket({ mode: "不規則動詞特訓" });
assert.strictEqual(irregularBucket.key, "irregularVerb", "irregular-verb should have its own history bucket key");
assert.strictEqual(irregularBucket.label, "不規則動詞特訓", "irregular-verb should have its own history bucket label");
assert.strictEqual(
  context.formatTrainingDailyPointSummary(11, {
    preposition: 2,
    response: 1,
    idiom: 3,
    challenge: 4,
    "irregular-verb": 1
  }),
  "本日の累計11P（前置詞2P　応答文1P　熟語3P　不規則動詞1P　過去問4P）",
  "daily point summary should show each item separately"
);
assert.strictEqual(
  context.formatTrainingDailyPointBreakdown({
    preposition: 2,
    response: 1,
    idiom: 3,
    challenge: 4,
    "irregular-verb": 1
  }),
  "前置詞2P　応答文1P　熟語3P　不規則動詞1P　過去問4P",
  "exchange page breakdown should show each training item separately"
);

console.log("point-state tests passed");
