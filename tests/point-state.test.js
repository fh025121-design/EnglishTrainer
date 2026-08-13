const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const appCode = fs.readFileSync(require("path").join(__dirname, "..", "app.js"), "utf8")
  .replace(/\ninit\(\);\s*$/, "\n");
const createModalElement = () => ({
  classList: {
    add() {},
    remove() {},
    contains() { return false; },
    toggle() {}
  },
  setAttribute() {},
  getAttribute() { return null; },
  addEventListener() {},
  textContent: "",
  value: "",
  innerHTML: ""
});
const documentStub = {
  body: { dataset: {} },
  getElementById(id) {
    const map = {
      gameTicketModal: createModalElement(),
      gameTicketTitle: createModalElement(),
      gameTicketMinutesText: createModalElement(),
      gameTicketBodyText: createModalElement(),
      gameTicketIntroText: createModalElement(),
      gameTicketThirtyPoster: createModalElement(),
      gameTicketPosterValue: createModalElement(),
      gameTicketPosterTicketValue: createModalElement(),
      gameTicketPosterCaption: createModalElement(),
      challengeTicketChanceModal: createModalElement(),
      challengeTicketChanceStartBtn: createModalElement(),
      trainingCompleteScreen: createModalElement(),
      homeScreen: createModalElement(),
      exchangeTicketScreen: createModalElement()
    };
    return map[id] || null;
  },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  addEventListener() {}
};
const context = {
  window: {
    ENGLISH_TRAINER_RELEASE_INFO: { releaseHistory: [] },
    PcFirebaseAuthState: { status: "logged-out", user: null },
    innerWidth: 1200,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(callback) { callback && callback(); return 0; },
    getFirebaseCurrentUser() { return null; },
    watchFamilyDocument() { return () => {}; },
    watchLearningHistoryEntriesFromFirestore() { return () => {}; },
    loadPointStateFromFirestore: async () => ({ exists: false, data: null }),
    savePointStateToFirestore: async () => true,
    loadGameTicketsFromFirestore: async () => ({ exists: false, data: null }),
    saveGameTicketsToFirestore: async () => true,
    loadStudyCoreFromFirestore: async () => ({ exists: false, data: null }),
    saveStudyCoreToFirestore: async () => true,
    deleteStudyCoreBackupFromFirestore: async () => true,
    loadStudyCoreBackupsFromFirestore: async () => ({ backups: [] })
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
const gameTicketMinutes = vm.runInContext("GAME_TICKET_CONFIG.ticketOptions.map((entry) => entry.minutes)", context);
assert.strictEqual(
  JSON.stringify(gameTicketMinutes),
  JSON.stringify([5, 10, 15, 60]),
  "game tickets should include a 60-minute option alongside the existing ticket durations"
);
const keyedStorage = {
  data: {
    "english-trainer-state-v1": JSON.stringify({ settings: { gameTicketConfig: context.createDefaultGameTicketConfig() }, stats: { completedSessions: [], gameTickets: context.createDefaultGameTicketStats(), trainingProfiles: context.createDefaultTrainingProfiles(), prepositionTraining: context.createDefaultPrepositionTrainingStats(), normalDayProgressByDay: {}, extraTrainingDailyCounter: context.createDefaultExtraTrainingDailyCounter() }, review: { records: {} }, items: context.buildVocabularyItems(), session: null }),
    "english-trainer-state-v1-test-user": JSON.stringify({ settings: { gameTicketConfig: { normalRules: [{ id: "rule-1", name: "テスト", targetTraining: "challenge", threshold: 90, minutes: 5, chance: 0.5, enabled: false, dailyCap: 1 }], events: [{ id: "event-1", name: "イベント", type: "draw", targetTraining: "challenge", threshold: 141, enabled: false, startImage: "", maxQuestions: 5, rewardMinutes: 5, outcomes: [{ minutes: 30, chance: 1.0 }] }], dailyCap: 2, dailyGrantCapByMinutes: { 5: 20, 15: 20, 30: 10, 60: 10 }, ticketImages: { 30: "", 60: "" }, challengeAnnouncementImage: "", eventStartImages: {}, modeLabels: { challenge: "過去の間違い", weakFocus: "苦手特訓", other: "その他の特訓" } } }, stats: { completedSessions: [], gameTickets: context.createDefaultGameTicketStats(), trainingProfiles: context.createDefaultTrainingProfiles(), prepositionTraining: context.createDefaultPrepositionTrainingStats(), normalDayProgressByDay: {}, extraTrainingDailyCounter: context.createDefaultExtraTrainingDailyCounter() }, review: { records: {} }, items: context.buildVocabularyItems(), session: null })
  }
};
context.localStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(keyedStorage.data, key) ? keyedStorage.data[key] : null; },
  setItem(key, value) { keyedStorage.data[key] = String(value); },
  removeItem(key) { delete keyedStorage.data[key]; },
  key(index) { return Object.keys(keyedStorage.data)[index] || null; },
  get length() { return Object.keys(keyedStorage.data).length; }
};
const stateFromScopedKey = context.loadState();
assert.strictEqual(stateFromScopedKey.settings.gameTicketConfig.normalRules[0].enabled, false, "scoped user state should override the generic fallback state on reload");
assert.strictEqual(stateFromScopedKey.settings.gameTicketConfig.events[0].enabled, false, "scoped user event state should override the generic fallback state on reload");
const storage = {
  data: {}
};
context.localStorage = {
  getItem(key) { return Object.prototype.hasOwnProperty.call(storage.data, key) ? storage.data[key] : null; },
  setItem(key, value) { storage.data[key] = String(value); },
  removeItem(key) { delete storage.data[key]; }
};
const persistableState = {
  settings: {
    gameTicketConfig: {
      normalRules: [{ id: "rule-1", name: "テスト", targetTraining: "challenge", threshold: 30, minutes: 15, chance: 0.5, enabled: true, dailyCap: 1 }],
      events: [{ id: "event-1", name: "イベント", type: "draw", targetTraining: "challenge", threshold: 50, enabled: true, startImage: "", maxQuestions: 5, rewardMinutes: 15, outcomes: [{ minutes: 30, chance: 0.5 }, { minutes: 60, chance: 0.2 }] }],
      dailyCap: 2,
      dailyGrantCapByMinutes: { 5: 20, 15: 20, 30: 10, 60: 10 },
      ticketImages: { 30: "", 60: "" },
      challengeAnnouncementImage: "announce.png",
      eventStartImages: {},
      modeLabels: { challenge: "過去の間違い", weakFocus: "苦手特訓", other: "その他の特訓" }
    },
    typingConfig: context.sanitizeTypingConfig(),
    trainingCorrectChimePreset: context.TRAINING_CORRECT_CHIME_DEFAULT_PRESET
  },
  stats: {
    completedSessions: [],
    dailyPerformanceByDate: {},
    studyTimeByDate: {},
    dailyStatsByDate: {},
    previousSessionWeakQuestionIds: [],
    pendingSessionNotice: "",
    unlockedDayMax: 1,
    gameTickets: context.createDefaultGameTicketStats(),
    trainingProfiles: context.createDefaultTrainingProfiles(),
    prepositionTraining: context.createDefaultPrepositionTrainingStats(),
    normalDayProgressByDay: {},
    extraTrainingDailyCounter: context.createDefaultExtraTrainingDailyCounter()
  },
  review: { records: {} },
  items: context.buildVocabularyItems(),
  session: null
};
context.obj = persistableState;
vm.runInContext("state = obj;", context);
context.saveState();
const loadedState = context.loadState();
assert.ok(loadedState.settings.gameTicketConfig, "loaded state should include gameTicketConfig");
assert.strictEqual(loadedState.settings.gameTicketConfig.challengeAnnouncementImage, "announce.png", "state should survive a save/load cycle without a Firebase UID");
const config = context.getGameTicketConfig();
assert.strictEqual(Boolean(config.ticketImages), true, "game ticket config should include ticket image settings");
assert.strictEqual(config.ticketImages[30], "", "30-minute ticket image should default to an empty string");
assert.strictEqual(config.ticketImages[60], "", "60-minute ticket image should default to an empty string");
assert.strictEqual(typeof config.dailyGrantCapByMinutes, "object", "daily grant cap settings should exist");
assert.strictEqual(config.dailyGrantCapByMinutes[5], 20, "5-minute cap should default to the configured per-day value");
const dailyCapStore = context.ensureGameTicketState();
dailyCapStore.dailyGrantByMinutes = { "2026-08-13": { 5: 20 } };
assert.strictEqual(context.canGrantNewGameTicketForDay(dailyCapStore, 5), false, "grants should stop when the 5-minute daily cap is reached");
assert.strictEqual(context.canGrantNewGameTicketForDay(dailyCapStore, 15), true, "different ticket types should keep independent daily caps");
const capConfig = context.getGameTicketConfig();
const originalCap5 = capConfig.dailyGrantCapByMinutes[5];
capConfig.dailyGrantCapByMinutes[5] = 1;
const targetedCapStore = context.ensureGameTicketState();
targetedCapStore.dailyGrantByMinutes = {};
context.registerGameTicketDailyGrant(targetedCapStore, 5, "2026-08-13", { targetTraining: "challenge", derivedFromTargetTrainingPoints: true });
assert.strictEqual(
  context.canGrantNewGameTicketForDay(targetedCapStore, 5, "2026-08-13", { targetTraining: "challenge", derivedFromTargetTrainingPoints: true }),
  false,
  "same target-training-origin grant should count toward the daily cap"
);
const nonTargetCapStore = context.ensureGameTicketState();
nonTargetCapStore.dailyGrantByMinutes = {};
context.registerGameTicketDailyGrant(nonTargetCapStore, 5, "2026-08-13", { targetTraining: "challenge", derivedFromTargetTrainingPoints: true });
context.registerGameTicketDailyGrant(nonTargetCapStore, 5, "2026-08-13", { targetTraining: "normal", derivedFromTargetTrainingPoints: false });
assert.strictEqual(
  context.canGrantNewGameTicketForDay(nonTargetCapStore, 5, "2026-08-13", { targetTraining: "challenge", derivedFromTargetTrainingPoints: true }),
  false,
  "non-target grant paths should not increase the challenge-cap count"
);
capConfig.dailyGrantCapByMinutes[5] = originalCap5;
const irregularBucket = context.getLearningHistoryModeBucket({ mode: "不規則動詞特訓" });
assert.strictEqual(irregularBucket.key, "irregularVerb", "irregular-verb should have its own history bucket key");
assert.strictEqual(irregularBucket.label, "不規則動詞特訓", "irregular-verb should have its own history bucket label");
const settingsContainer = {
  innerHTML: "",
  querySelectorAll() { return []; },
  querySelector() { return null; }
};
context.document = {
  ...documentStub,
  getElementById(id) {
    if (id === "gameTicketRuleTableBody") return { innerHTML: "", querySelectorAll() { return []; }, querySelector() { return null; } };
    if (id === "gameTicketEventList") return settingsContainer;
    if (id === "gameTicketAnnouncementImageInput") return { replaceWith() {} };
    if (id === "gameTicketThirtyImageInput") return { replaceWith() {} };
    if (id === "gameTicketSixtyImageInput") return { replaceWith() {} };
    if (id === "gameTicketDailyCap5Input") return { value: "20" };
    if (id === "gameTicketDailyCap15Input") return { value: "20" };
    if (id === "gameTicketDailyCap30Input") return { value: "10" };
    if (id === "gameTicketDailyCap60Input") return { value: "10" };
    return documentStub.getElementById(id);
  },
  querySelectorAll() { return []; },
  querySelector() { return null; }
};
const baselineGameTicketConfig = context.createDefaultGameTicketConfig();
context.state = { settings: { gameTicketConfig: {
  normalRules: [],
  events: [{
    id: "challenge-seq-1",
    name: "連続正解チャレンジ",
    type: "consecutiveCorrect",
    targetTraining: "challenge",
    threshold: 100,
    enabled: true,
    startImage: "",
    maxQuestions: 5,
    rewardMinutes: 5,
    outcomes: []
  }],
  dailyGrantCapByMinutes: { 5: 20, 15: 20, 30: 10, 60: 10 },
  challengeAnnouncementImage: "",
  eventStartImages: {},
  ticketImages: { 30: "", 60: "" },
  modeLabels: { challenge: "過去の間違い", weakFocus: "苦手特訓", other: "その他の特訓" },
  dailyCap: 2
} } };
context.renderGameTicketSettingsUi();
assert.ok(!settingsContainer.innerHTML.includes('data-field="outcomePercent"'), "consecutive-correct events should hide draw outcomes");
assert.ok(settingsContainer.innerHTML.includes('maxQuestions'), "consecutive-correct events should show maxQuestions");
assert.ok(settingsContainer.innerHTML.includes('rewardMinutes'), "consecutive-correct events should show rewardMinutes selection");
context.state = { settings: { gameTicketConfig: baselineGameTicketConfig } };
const currentGameTicketConfig = context.getGameTicketConfig();
const eventA = (currentGameTicketConfig.events || []).find((event) => Number(event.threshold) === 141 && String(event.targetTraining || "challenge") === "challenge");
assert.ok(eventA, "current gameTicketConfig should include the A event for 141P");
assert.strictEqual(eventA.enabled, true, "event A should be enabled in the current config");
assert.strictEqual(eventA.outcomes[0].minutes, 30, "event A should award a 30-minute ticket");
assert.strictEqual(eventA.outcomes[0].chance, 0.3, "event A should award 30 minutes with 30% chance");
assert.strictEqual(eventA.outcomes[1].minutes, 60, "event A should award a 60-minute ticket");
assert.strictEqual(eventA.outcomes[1].chance, 0.1, "event A should award 60 minutes with 10% chance");
assert.strictEqual(eventA.outcomes[2].minutes, 0, "event A should include a miss outcome");
assert.strictEqual(eventA.outcomes[2].chance, 0.6, "event A should include a miss outcome with 60% chance");
const eventB = (currentGameTicketConfig.events || []).find((event) => Number(event.threshold) === 261 && String(event.targetTraining || "challenge") === "challenge");
assert.ok(eventB, "current gameTicketConfig should include the B event for 261P");
assert.strictEqual(eventB.enabled, true, "event B should be enabled in the current config");
assert.strictEqual(eventB.outcomes[0].minutes, 60, "event B should award a 60-minute ticket");
assert.strictEqual(eventB.outcomes[0].chance, 1, "event B should award 60 minutes with 100% chance");
const rollResultAtThirty = (() => {
  const originalMath = context.Math || Math;
  const originalRandom = originalMath.random.bind(originalMath);
  const patchedMath = Object.create(originalMath);
  patchedMath.random = () => 0.10;
  context.Math = patchedMath;
  const result = context.resolveChallengeSpecialDrawResult("2026-08-13", 141);
  context.Math = originalMath;
  return result;
})();
assert.strictEqual(rollResultAtThirty.outcome, "30", "roll 0.10 should resolve to the 30-minute outcome for the current config");
assert.strictEqual(rollResultAtThirty.minutes, 30, "roll 0.10 should award 30 minutes for the current config");
const rollResultAtSixty = (() => {
  const originalMath = context.Math || Math;
  const patchedMath = Object.create(originalMath);
  patchedMath.random = () => 0.35;
  context.Math = patchedMath;
  const result = context.resolveChallengeSpecialDrawResult("2026-08-13", 141);
  context.Math = originalMath;
  return result;
})();
assert.strictEqual(rollResultAtSixty.outcome, "60", "roll 0.35 should resolve to the 60-minute outcome for the current config");
assert.strictEqual(rollResultAtSixty.minutes, 60, "roll 0.35 should award 60 minutes for the current config");
const rollResultAtMiss = (() => {
  const originalMath = context.Math || Math;
  const patchedMath = Object.create(originalMath);
  patchedMath.random = () => 0.80;
  context.Math = patchedMath;
  const result = context.resolveChallengeSpecialDrawResult("2026-08-13", 141);
  context.Math = originalMath;
  return result;
})();
assert.strictEqual(rollResultAtMiss.outcome, "miss", "roll 0.80 should resolve to miss for the current config");
assert.strictEqual(rollResultAtMiss.minutes, 0, "roll 0.80 should award zero minutes for the current config");
assert.strictEqual(context.sanitizeChallengeTicketSpecialState({ processed: false, result: "miss", awardedMinutes: 0, queued: true }).queued, true, "queued special draws should survive reload state sanitization");
assert.strictEqual(context.normalizeStoredImageReference("data:image/png;base64,AAAA"), "data:image/png;base64,AAAA", "data URLs should be preserved as stored image references");
assert.strictEqual(context.normalizeStoredImageReference("https://example.com/image.png"), "https://example.com/image.png", "legacy remote image URLs should remain valid image references");
assert.strictEqual(context.normalizeStoredImageReference("C:/fake/image.png"), "", "local filesystem paths should not be saved as image references");
const imageConfig = context.sanitizeGameTicketConfig({
  ticketImages: { 30: "data:image/png;base64,BBBB", 60: "http://example.com/60.png" },
  challengeAnnouncementImage: "data:image/png;base64,CCCC",
  eventStartImages: { eventA: "data:image/png;base64,DDDD" }
});
assert.strictEqual(imageConfig.ticketImages[30], "data:image/png;base64,BBBB", "data URL ticket images should be preserved");
assert.strictEqual(imageConfig.challengeAnnouncementImage, "data:image/png;base64,CCCC", "data URL announcement images should be preserved");
assert.strictEqual(imageConfig.eventStartImages.eventA, "data:image/png;base64,DDDD", "event-specific image references should be preserved");
context.showGameTicketModal({ id: "reward-dup-1", minutes: 30, type: "random" });
context.showGameTicketModal({ id: "reward-dup-1", minutes: 30, type: "random" });
assert.strictEqual(context.isGameTicketRewardAlreadyShown({ id: "reward-dup-1" }), true, "a reward ID should only display once");
const pendingReplayStore = context.ensureGameTicketState();
pendingReplayStore.inventory = [];
pendingReplayStore.earnedHistory = [];
pendingReplayStore.pendingRewards = [
  { id: "reward-queued-1", minutes: 5, queuedAt: Date.now(), type: "random" },
  { id: "reward-queued-2", minutes: 15, queuedAt: Date.now() + 1, type: "random" }
];
context.shownGameTicketRewardIds = new Set(["reward-queued-1"]);
vm.runInContext(`
  globalThis.__pendingReplayModalCalls__ = { count: 0 };
  globalThis.__pendingReplayOriginalShowGameTicketModal__ = showGameTicketModal;
  showGameTicketModal = (...args) => {
    globalThis.__pendingReplayModalCalls__.count += 1;
    return globalThis.__pendingReplayOriginalShowGameTicketModal__(...args);
  };
  showPendingGameTicketModalIfAny();
`, context);
assert.strictEqual(vm.runInContext("globalThis.__pendingReplayModalCalls__.count", context), 0, "legacy pendingRewards should be ignored and never re-trigger a delayed reward modal");
const zeroPointPendingStore = context.ensureGameTicketState();
zeroPointPendingStore.pendingRewards = [{ id: "reward-zero-1", minutes: 5, queuedAt: Date.now(), type: "random" }];
const zeroPointModalCalls = { count: 0 };
const originalShowGameTicketModal = vm.runInContext("showGameTicketModal", context);
vm.runInContext(`
  globalThis.__zeroPointModalCalls__ = { count: 0 };
  globalThis.__zeroPointOriginalShowGameTicketModal__ = showGameTicketModal;
  showGameTicketModal = (...args) => {
    globalThis.__zeroPointModalCalls__.count += 1;
    return globalThis.__zeroPointOriginalShowGameTicketModal__(...args);
  };
  pendingTrainingCompleteContext = { showTicketAfter: true, earnedPoints: 0 };
  showPendingGameTicketModalIfAny();
`, context);
assert.strictEqual(vm.runInContext("globalThis.__zeroPointModalCalls__.count", context), 0, "zero-point challenge completion should not auto-open a ticket modal for a pending reward");
vm.runInContext(`
  showGameTicketModal = globalThis.__zeroPointOriginalShowGameTicketModal__ || showGameTicketModal;
  pendingTrainingCompleteContext = null;
`, context);
const thresholdPassResult = context.queueChallengeSpecialDrawForThresholdCrossing("2026-08-12", 138, 141, context.ensureGameTicketState());
assert.strictEqual(Array.isArray(thresholdPassResult), true, "crossing the threshold should queue a special draw");
assert.strictEqual(thresholdPassResult.length, 1, "crossing the threshold should queue exactly one draw");
assert.strictEqual(thresholdPassResult[0], "p141", "P141 should be queued when challenge points cross the threshold");
const unchangedThresholdResult = context.queueChallengeSpecialDrawForThresholdCrossing("2026-08-12", 150, 150, context.ensureGameTicketState());
assert.strictEqual(Array.isArray(unchangedThresholdResult), true, "re-rendering with the same total should keep the queue empty");
assert.strictEqual(unchangedThresholdResult.length, 0, "unchanged challenge totals should not trigger a new draw");
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

const firebaseSource = fs.readFileSync(require("path").join(__dirname, "..", "mobile", "firebase.js"), "utf8");
assert.ok(firebaseSource.includes("translationTrainingPointsByDate"), "mobile Firebase point state should include the translation-training map");
assert.ok(firebaseSource.includes("sanitizePointDayMap(source.translationTrainingPointsByDate)"), "mobile Firebase point state should sanitize the translation-training point map");
assert.ok(firebaseSource.includes("sumPointMap(next.translationTrainingPointsByDate)"), "mobile Firebase hydration should include translation-training totals in daily summary totals");
assert.ok(firebaseSource.includes("mergePointDayMapByMax(base.translationTrainingPointsByDate, incoming.translationTrainingPointsByDate)"), "mobile Firebase merge logic should preserve translation-training points across syncs");

const persistedDisabledConfig = {
  normalRules: [{ id: "rule-off-1", name: "OFFルール", targetTraining: "challenge", threshold: 147, minutes: 5, chance: 0.5, enabled: false, dailyCap: 1 }],
  events: [{ id: "event-off-1", name: "OFFイベント", type: "draw", targetTraining: "challenge", threshold: 193, enabled: false, startImage: "", maxQuestions: 5, rewardMinutes: 5, outcomes: [{ minutes: 30, chance: 1.0 }] }],
  dailyCap: 2,
  dailyGrantCapByMinutes: { 5: 20, 15: 20, 30: 10, 60: 10 },
  ticketImages: { 30: "", 60: "" },
  challengeAnnouncementImage: "",
  eventStartImages: {},
  modeLabels: { challenge: "過去の間違い", weakFocus: "苦手特訓", other: "その他の特訓" }
};
context.state = {
  settings: { gameTicketConfig: persistedDisabledConfig },
  stats: { completedSessions: [], dailyPerformanceByDate: {}, studyTimeByDate: {}, dailyStatsByDate: {}, previousSessionWeakQuestionIds: [], pendingSessionNotice: "", unlockedDayMax: 1, gameTickets: context.createDefaultGameTicketStats(), trainingProfiles: context.createDefaultTrainingProfiles(), prepositionTraining: context.createDefaultPrepositionTrainingStats(), normalDayProgressByDay: {}, extraTrainingDailyCounter: context.createDefaultExtraTrainingDailyCounter() },
  review: { records: {} },
  items: context.buildVocabularyItems(),
  session: null
};
context.saveState();
const reloadedDisabledState = context.loadState();
assert.strictEqual(reloadedDisabledState.settings.gameTicketConfig.normalRules[0].enabled, false, "disabled rules should remain OFF after save/load");
assert.strictEqual(reloadedDisabledState.settings.gameTicketConfig.events[0].enabled, false, "disabled events should remain OFF after save/load");
console.log("point-state tests passed");
