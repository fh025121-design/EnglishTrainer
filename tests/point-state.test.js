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
assert.strictEqual(sanitized.dailyEarnedByModeByDate["2026-08-09"]["irregular-verb"], 2, "irregular-verb points should be preserved");
assert.strictEqual(context.inferPointModeFromLearningHistoryEntry("phrase-spiral"), "idiom", "phrase-spiral should map to the idiom point mode");
assert.strictEqual(context.normalizeLearningMode("irregular-verb-training"), "不規則動詞特訓", "irregular-verb should normalize to a learning-history mode");
const irregularBucket = context.getLearningHistoryModeBucket({ mode: "不規則動詞特訓" });
assert.strictEqual(irregularBucket.key, "irregularVerb", "irregular-verb should have its own history bucket key");
assert.strictEqual(irregularBucket.label, "不規則動詞特訓", "irregular-verb should have its own history bucket label");
assert.strictEqual(context.shouldAwardTrainingPointForAnswerAttempt({ isFirstAttempt: true, isCorrect: true, isReviewSession: false }), true, "first-attempt correct answers should award training points");
assert.strictEqual(context.shouldAwardTrainingPointForAnswerAttempt({ isFirstAttempt: false, isCorrect: true, isReviewSession: false }), false, "corrected retry answers should not award training points");
assert.strictEqual(context.shouldAwardTrainingPointForAnswerAttempt({ isFirstAttempt: true, isCorrect: true, isReviewSession: true }), false, "review answers should not award training points");
assert.strictEqual(context.shouldPlayTrainingCorrectChimeForSession({ mode: "challenge" }), true, "challenge should play the training correct chime");
assert.strictEqual(context.shouldPlayTrainingCorrectChimeForSession({ mode: "phrase-spiral" }), true, "phrase training should play the training correct chime");
assert.strictEqual(context.shouldPlayTrainingCorrectChimeForSession({ mode: "review" }), false, "review should not play the training correct chime");
const originalPointState = JSON.parse(JSON.stringify(context.getPointState()));
const todayKey = context.getPointTodayKey();
const freshPointState = JSON.parse(JSON.stringify(originalPointState));
freshPointState.balance = 0;
freshPointState.totalEarned = 0;
freshPointState.dailyEarnedByDate[todayKey] = 0;
freshPointState.dailyEarnedByModeByDate[todayKey] = {
  preposition: 0,
  response: 0,
  challenge: 0,
  "irregular-verb": 0,
  idiom: 0
};
context.savePointState(freshPointState);
assert.strictEqual(context.awardPointsForTrainingMode("challenge"), 3, "challenge should award 3P");
context.savePointState(freshPointState);
assert.strictEqual(context.awardPointsForTrainingMode("irregular-verb"), 2, "irregular-verb should award 2P");
assert.strictEqual(context.formatPointValue(freshPointState.dailyEarnedByModeByDate[todayKey].challenge), "0P", "challenge point formatting should stay mode-specific");
const cappedPointState = JSON.parse(JSON.stringify(freshPointState));
cappedPointState.dailyEarnedByDate[todayKey] = 299;
cappedPointState.dailyEarnedByModeByDate[todayKey].challenge = 299;
context.savePointState(cappedPointState);
assert.strictEqual(context.awardPointsForTrainingMode("challenge"), 1, "challenge should still award the last point before its cap");
context.savePointState(cappedPointState);
cappedPointState.dailyEarnedByDate[todayKey] = 100;
cappedPointState.dailyEarnedByModeByDate[todayKey]["irregular-verb"] = 100;
context.savePointState(cappedPointState);
assert.strictEqual(context.awardPointsForTrainingMode("irregular-verb"), 0, "irregular-verb should stop at 100P");
context.savePointState(originalPointState);
assert.strictEqual(
  context.formatTrainingDailyPointSummary(86, {
    "day-study": 50,
    "unstudied-clear": 25,
    preposition: 2,
    response: 1,
    idiom: 3,
    challenge: 4,
    "irregular-verb": 1
  }),
  "本日の累計86P（Day学習50P　未学習なし25P　熟語3P　前置詞2P　応答文1P　不規則動詞1P　過去の間違い4P）",
  "daily point summary should show each item separately"
);
assert.strictEqual(
  context.formatTrainingDailyPointBreakdown({
    "day-study": 50,
    "unstudied-clear": 25,
    preposition: 2,
    response: 1,
    idiom: 3,
    challenge: 4,
    "irregular-verb": 1
  }),
  "Day学習50P　未学習なし25P　熟語3P　前置詞2P　応答文1P　不規則動詞1P　過去の間違い4P",
  "exchange page breakdown should show each training item separately"
);

console.log("point-state tests passed");
