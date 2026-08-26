const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");

function makeSandbox() {
  const store = {};
  const sharedState = { wordLearningState: {}, vocabularyStudy: null, vocabularyTodayHistoryMap: {} };
  const realBank = [
    { id: "w1", word: "apple", partOfSpeech: "名詞", meaning: "りんご", level: "5" },
    { id: "w2", word: "banana", partOfSpeech: "名詞", meaning: "バナナ", level: "5" },
    { id: "w3", word: "cherry", partOfSpeech: "名詞", meaning: "さくらんぼ", level: "5" }
  ];

  const createElementStub = () => ({
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild() {},
    setAttribute() {},
    getAttribute() { return null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    cloneNode() { return createElementStub(); },
    focus() {},
    blur() {},
    click() {},
    innerHTML: "",
    textContent: "",
    value: "",
    checked: false,
    disabled: false,
    options: [],
    selectedIndex: 0,
    length: 0,
    children: [],
    parentNode: null,
    closest() { return null; },
    matches() { return false; },
    contains() { return false; }
  });

  const elementCache = new Map();
  const document = {
    body: { classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } },
    getElementById(id) {
      const key = String(id || "");
      if (!elementCache.has(key)) {
        elementCache.set(key, createElementStub());
      }
      return elementCache.get(key);
    },
    querySelector() { return createElementStub(); },
    querySelectorAll() { return []; },
    addEventListener() {},
    createElement() {
      return createElementStub();
    }
  };

  const windowObj = {
    localStorage: {
      getItem(key) { return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setItem(key, value) { store[key] = String(value); },
      removeItem(key) { delete store[key]; }
    },
    addEventListener() {},
    removeEventListener() {},
    location: { search: "", href: "https://example.com/mobile/index.html" },
    document,
    state: sharedState,
    MOBILE_VOCABULARY_REAL_WORD_BANK: realBank,
    ENGLISH_TRAINER_RELEASE_INFO: { releaseHistory: [{ version: "test" }] },
    navigator: { userAgent: "node" }
  };

  document.readyState = "loading";
  windowObj.addEventListener = () => {};
  document.addEventListener = () => {};

  const sandbox = {
    console,
    Date,
    Math,
    Number,
    String,
    Object,
    Array,
    Set,
    Map,
    Intl,
    URLSearchParams,
    Audio: function () { return { preload() {}, play() { return Promise.resolve(); } }; },
    window: windowObj,
    document,
    state: sharedState,
    getCurrentMobileFirebaseUser: () => ({ uid: "uid-1" }),
    getVocabularyRealWordBank: () => realBank,
    buildVocabularyRealStudyState: () => ({
      targetWordCount: 1000,
      entries: [],
      progressMap: {},
      session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
      gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
    }),
    saveMobileVocabularyStateForSync: () => null,
    loadMobileVocabularyStateForSync: () => null,
    scheduleMobileVocabularySync: () => {},
    flushMobileVocabularySync: async () => {},
    flushMobileVocabularyTodayHistorySync: async () => {},
    renderVocabularyPastHistoryScreen: () => {},
    showScreen: () => {},
    saveState: () => {},
    getMobileVocabularySyncUid: () => "uid-1",
    getMobileBrowserDeviceId: () => "node-test-device",
    sanitizeMobileLearningHistoryDeviceName: (value) => String(value || "").trim() || "node-test-device",
    getMobileLearningHistoryDeviceName: () => "node-test-device"
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "mobile.js" });
  return { sandbox, store };
}

(async () => {
  const { sandbox, store } = makeSandbox();

  assert.ok(typeof sandbox.window.createWordLearningStateEntry === "function", "word learning state entry factory should exist");
  assert.ok(typeof sandbox.window.normalizeWordLearningStatus === "function", "status normalizer should exist");
  assert.ok(typeof sandbox.window.getWordLearningStateManagementRows === "function", "management-row helper should exist");
  assert.ok(typeof sandbox.window.saveWordLearningStateForSync === "function", "local save helper should exist");
  assert.ok(typeof sandbox.window.mergeWordLearningStateByLatest === "function", "wordId merge helper should exist");
  assert.ok(typeof sandbox.window.buildWordLearningStateAdminSummary === "function", "admin summary helper should exist");

  const empty = sandbox.window.createWordLearningStateEntry("w1");
  assert.strictEqual(empty.pronunciationStatus, "－", "new entries start unjudged");
  assert.strictEqual(empty.meaningStatus, "－", "new entries start unjudged");
  assert.strictEqual(empty.questionCount, 0, "new entries start at zero completions");
  assert.strictEqual(empty.lastStudiedAt, 0, "new entries must not get a synthetic lastStudiedAt");

  const generatedMap = sandbox.window.buildWordLearningStateMap();
  assert.strictEqual(generatedMap.w1.lastStudiedAt, 0, "generated unlearned entries must remain unset");
  assert.strictEqual(generatedMap.w1.questionCount, 0, "generated unlearned entries must start at zero");

  const first = sandbox.window.finalizeWordLearningStateForCompletion("w1", "○", "○");
  assert.strictEqual(first.pronunciationStatus, "○", "first completion keeps pronunciation status");
  assert.strictEqual(first.meaningStatus, "○", "first completion keeps meaning status");
  assert.strictEqual(first.questionCount, 1, "one completion increments questionCount");
  assert.ok(Number.isFinite(first.lastStudiedAt), "lastStudiedAt should be set");

  const second = sandbox.window.finalizeWordLearningStateForCompletion("w1", "△", "○");
  assert.strictEqual(second.pronunciationStatus, "△", "later completion uses newer status");
  assert.strictEqual(second.meaningStatus, "○", "later completion updates meaning status");
  assert.strictEqual(second.questionCount, 2, "repeated completion increments again");

  const map = sandbox.window.sanitizeWordLearningStateMap({
    w1: { wordId: "w1", pronunciationStatus: "△", meaningStatus: "○", lastStudiedAt: 10, questionCount: 2 },
    w2: { wordId: "w2", pronunciationStatus: "－", meaningStatus: "－", lastStudiedAt: null, questionCount: 0 }
  });
  assert.strictEqual(map.w1.questionCount, 2, "sanitizer keeps valid completion counts");

  const merged = sandbox.window.mergeWordLearningStateByLatest(
    { w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 10, questionCount: 1 }, w2: { wordId: "w2", pronunciationStatus: "－", meaningStatus: "－", lastStudiedAt: null, questionCount: 0 } },
    { w1: { wordId: "w1", pronunciationStatus: "△", meaningStatus: "○", lastStudiedAt: 20, questionCount: 2 }, w3: { wordId: "w3", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 30, questionCount: 1 } }
  );
  assert.strictEqual(merged.w1.questionCount, 2, "newer same word state wins");
  assert.strictEqual(merged.w3.questionCount, 1, "new word is added by merge");

  const unlearnedMerge = sandbox.window.mergeWordLearningStateByLatest(
    { w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 10, questionCount: 1 } },
    { w1: { wordId: "w1", pronunciationStatus: "－", meaningStatus: "－", lastStudiedAt: 20, questionCount: 0 } }
  );
  assert.strictEqual(unlearnedMerge.w1.questionCount, 1, "zero-question reset state must not replace learned state");
  assert.strictEqual(unlearnedMerge.w1.lastStudiedAt, 10, "learned state timestamp must be preserved when incoming data is unlearned");
  assert.strictEqual(unlearnedMerge.w1.pronunciationStatus, "○", "learned statuses must survive an unlearned merge");
  assert.strictEqual(unlearnedMerge.w1.meaningStatus, "○", "learned meanings must survive an unlearned merge");

  const learningStateMerge = sandbox.window.mergeWordLearningStateByLatest(
    { w1: { wordId: "w1", pronunciationStatus: "△", meaningStatus: "○", lastStudiedAt: 100, questionCount: 2, perfectPairCount: 1, isMastered: false, learningStateStatus: "learning" } },
    { w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 200, questionCount: 3, perfectPairCount: 3, isMastered: false, learningStateStatus: "learning" } }
  );
  assert.strictEqual(learningStateMerge.w1.perfectPairCount, 3, "firebase-latest perfectPairCount should survive merge");
  assert.strictEqual(learningStateMerge.w1.isMastered, false, "firebase-latest isMastered should survive merge");
  assert.strictEqual(learningStateMerge.w1.learningStateStatus, "learning", "firebase-latest learningStateStatus should survive merge");

  const masteredStateMerge = sandbox.window.mergeWordLearningStateByLatest(
    { w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 100, questionCount: 5, perfectPairCount: 5, isMastered: true, learningStateStatus: "mastered" } },
    { w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 200, questionCount: 7, perfectPairCount: 5, isMastered: true, learningStateStatus: "mastered" } }
  );
  assert.strictEqual(masteredStateMerge.w1.isMastered, true, "mastered flag should survive merge");
  assert.strictEqual(masteredStateMerge.w1.learningStateStatus, "mastered", "mastered learningStateStatus should survive merge");

  const localKey = sandbox.window.getWordLearningStateStorageKey("uid-1");
  sandbox.window.saveWordLearningStateForSync({ w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 123, questionCount: 1 } }, "uid-1");
  const savedRaw = JSON.parse(store[localKey]);
  assert.strictEqual(savedRaw.w1.questionCount, 1, "saved map persists questionCount");

  const restored = sandbox.window.loadWordLearningStateForSync("uid-1");
  assert.strictEqual(restored.w1.meaningStatus, "○", "restore keeps meaning state after local load");

  sandbox.window.saveWordLearningStateForSync(sandbox.window.buildWordLearningStateMap(), "uid-1");
  sandbox.window.finalizeWordLearningStateForCompletion("w1", "○", "○");
  sandbox.window.finalizeWordLearningStateForCompletion("w2", "○", "△");
  const rows = sandbox.window.getWordLearningStateManagementRows();
  assert.strictEqual(rows.length >= 3, true, "management rows should cover all tracked words");
  assert.strictEqual(rows.some((row) => row.wordId === "w1" && row.questionCount === 1), true, "completed word appears in management rows");

  const adminSummary = sandbox.window.buildWordLearningStateAdminSummary({
    w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 123456, questionCount: 1 },
    w2: { wordId: "w2", pronunciationStatus: "△", meaningStatus: "－", lastStudiedAt: 0, questionCount: 0 },
    w3: { wordId: "w3", pronunciationStatus: "－", meaningStatus: "－", lastStudiedAt: 0, questionCount: 0 }
  });
  assert.strictEqual(adminSummary.totalWords >= 3, true, "summary includes target word count");
  assert.strictEqual(adminSummary.learnedCount, 1, "learned count reflects questionCount > 0");
  assert.strictEqual(adminSummary.unlearnedCount, 2, "unlearned count counts zero-question words");
  assert.strictEqual(adminSummary.rows.some((row) => row.wordId === "w1" && row.word === "apple"), true, "admin summary rows map to real vocabulary words");

  assert.ok(typeof sandbox.window.buildWordLearningStateProgressSummary === "function", "wordLearningState progress summary should exist");
  const progressSummary = sandbox.window.buildWordLearningStateProgressSummary({
    w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 100, questionCount: 4, perfectPairCount: 4, isMastered: false },
    w2: { wordId: "w2", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 200, questionCount: 5, perfectPairCount: 5, isMastered: true },
    w3: { wordId: "w3", pronunciationStatus: "－", meaningStatus: "－", lastStudiedAt: 0, questionCount: 0, perfectPairCount: 0, isMastered: false }
  });
  assert.strictEqual(progressSummary.totalWords, 3, "progress summary counts total available words");
  assert.strictEqual(progressSummary.learningCount, 1, "learning count should ignore unlearned words and count only active words");
  assert.strictEqual(progressSummary.masteredCount, 1, "mastered count should use isMastered and wordLearningState only");
  assert.strictEqual(progressSummary.masteredWordIds.includes("w2"), true, "mastered word should be tracked in the progress summary");

  const teacherStateMap = {
    w1: { wordId: "w1", pronunciationStatus: "◎", meaningStatus: "△", lastStudiedAt: 100, questionCount: 3, perfectPairCount: 2, isMastered: false, learningStateStatus: "learning" },
    w2: { wordId: "w2", pronunciationStatus: "◎", meaningStatus: "◎", lastStudiedAt: 200, questionCount: 2, perfectPairCount: 2, isMastered: false, learningStateStatus: "learning" }
  };
  const teacherProgress = sandbox.window.buildWordLearningStateProgressSummary(teacherStateMap);
  assert.strictEqual(teacherProgress.learningCount, 2, "teacher-checked learning words stay in the canonical learning bucket");
  assert.strictEqual(teacherProgress.masteredCount, 0, "teacher checks do not promote a word without a normal mastery threshold");
  assert.strictEqual(sandbox.window.normalizeWordLearningStatus("◎", "－"), "◎", "teacher success should stay distinct from ordinary ○");
  assert.strictEqual(sandbox.window.normalizeWordLearningStatus("○", "－"), "○", "ordinary success should remain ○");

  sandbox.window.MOBILE_VOCABULARY_REAL_WORD_BANK = [
    { id: "g5-a", word: "grade-5-a", partOfSpeech: "名詞", meaning: "5級A", level: "5" },
    { id: "g5-b", word: "grade-5-b", partOfSpeech: "名詞", meaning: "5級B", level: "5" },
    { id: "g4-a", word: "grade-4-a", partOfSpeech: "名詞", meaning: "4級A", level: "4" },
    { id: "g4-b", word: "grade-4-b", partOfSpeech: "名詞", meaning: "4級B", level: "4" },
    { id: "g3-a", word: "grade-3-a", partOfSpeech: "名詞", meaning: "3級A", level: "3" }
  ];
  sandbox.state.wordLearningState = {
    "g5-a": { wordId: "g5-a", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 1000, questionCount: 1, isMastered: false, learningStateStatus: "learning" },
    "g5-b": { wordId: "g5-b", pronunciationStatus: "○", meaningStatus: "△", lastStudiedAt: 1010, questionCount: 1, isMastered: false, learningStateStatus: "learning" },
    "g4-a": { wordId: "g4-a", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 1020, questionCount: 1, isMastered: false, learningStateStatus: "learning" },
    "g4-b": { wordId: "g4-b", pronunciationStatus: "○", meaningStatus: "△", lastStudiedAt: 1030, questionCount: 1, isMastered: false, learningStateStatus: "learning" },
    "g3-a": { wordId: "g3-a", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 1040, questionCount: 1, isMastered: false, learningStateStatus: "learning" }
  };
  const learningEntries = sandbox.window.getWordLearningStateProgressEntries("learning");
  const gradeSummary5 = sandbox.window.getVocabularyGradeProgressDisplay("5");
  const gradeSummary4 = sandbox.window.getVocabularyGradeProgressDisplay("4");
  const gradeSummary3 = sandbox.window.getVocabularyGradeProgressDisplay("3");
  const gradeTotal = gradeSummary5.count + gradeSummary4.count + gradeSummary3.count;
  assert.strictEqual(learningEntries.length, 5, "learning state should hold five unique learning words");
  assert.strictEqual(gradeSummary5.count, 2, "5級 should count exactly the two 5級 learning words");
  assert.strictEqual(gradeSummary4.count, 2, "4級 should count exactly the two 4級 learning words");
  assert.strictEqual(gradeSummary3.count, 1, "3級 should count exactly the one 3級 learning word");
  assert.strictEqual(gradeTotal, learningEntries.length, "grade totals must match the learning total without duplicates");
  assert.strictEqual(sandbox.window.getVocabularyProgressListEntries("grade", "5").length, 2, "grade list should use the same learning-state source");
  assert.strictEqual(sandbox.window.getVocabularyProgressListEntries("grade", "4").length, 2, "grade list should use the same learning-state source");
  assert.strictEqual(sandbox.window.getVocabularyProgressListEntries("grade", "3").length, 1, "grade list should use the same learning-state source");

  const teacherCheckCanonical = sandbox.window.sanitizeWordLearningStateMap({
    w1: { wordId: "w1", pronunciationStatus: "◎", meaningStatus: "△", questionCount: 1, lastStudiedAt: 111 }
  });
  assert.strictEqual(teacherCheckCanonical.w1.pronunciationStatus, "◎", "canonical state preserves the teacher's current ◎ value");
  assert.strictEqual(teacherCheckCanonical.w1.meaningStatus, "△", "canonical state preserves the teacher's current △ value");
  assert.strictEqual(Object.prototype.hasOwnProperty.call(teacherCheckCanonical.w1, "teacherCheckState"), false, "teacherCheckState is not persisted in canonical state");

  sandbox.window.saveWordLearningStateForSync({}, "uid-1");
  let masteredEntry = null;
  for (let index = 0; index < 4; index += 1) {
    masteredEntry = sandbox.window.finalizeWordLearningStateForCompletion("w1", "○", "○");
  }
  assert.strictEqual(masteredEntry.perfectPairCount, 4, "first four perfect completions accumulate");
  assert.strictEqual(masteredEntry.isMastered, false, "four perfect completions are not yet mastered");
  masteredEntry = sandbox.window.finalizeWordLearningStateForCompletion("w1", "○", "○");
  assert.strictEqual(masteredEntry.perfectPairCount, 5, "fifth perfect completion crosses the required threshold");
  assert.strictEqual(masteredEntry.isMastered, true, "fifth perfect completion marks the word as mastered");
  masteredEntry = sandbox.window.finalizeWordLearningStateForCompletion("w1", "○", "△");
  assert.strictEqual(masteredEntry.isMastered, false, "a later delta clears mastery");
  assert.strictEqual(masteredEntry.learningStateStatus, "learning", "later delta moves the word back to learning state");
  masteredEntry = sandbox.window.finalizeWordLearningStateForCompletion("w1", "○", "○");
  assert.strictEqual(masteredEntry.isMastered, true, "next perfect completion remasters the word");

  const continuousMap = {};
  for (let index = 0; index < 20; index += 1) {
    const wordId = `word-${index}`;
    const isMasteredWord = index < 5;
    continuousMap[wordId] = {
      wordId,
      pronunciationStatus: isMasteredWord ? "○" : (index % 2 === 0 ? "○" : "△"),
      meaningStatus: isMasteredWord ? "○" : (index % 3 === 0 ? "○" : "△"),
      lastStudiedAt: 1000 + index * 10,
      questionCount: isMasteredWord ? 5 : 1,
      perfectPairCount: isMasteredWord ? 5 : (index % 2 === 0 ? 1 : 0),
      isMastered: isMasteredWord,
      learningStateStatus: isMasteredWord ? "mastered" : "learning"
    };
  }
  const continuousSummary = sandbox.window.buildWordLearningStateProgressSummary(continuousMap);
  assert.strictEqual(continuousSummary.totalWords, 20, "continuous summary counts all 20 tracked words");
  assert.strictEqual(continuousSummary.masteredCount, 5, "five mastered words remain counted exactly once each");
  assert.strictEqual(continuousSummary.learningCount, 15, "learning count excludes unlearned entries and counts unique active words");
  assert.strictEqual(continuousSummary.learningWordIds.length, 15, "repeated study of the same word does not create extra learning entries");

  const persistedF5Map = {
    "vocab-3-although-item-484": {
      wordId: "vocab-3-although-item-484",
      pronunciationStatus: "△",
      meaningStatus: "○",
      questionCount: 1,
      lastStudiedAt: 1234567890
    }
  };
  sandbox.window.localStorage.setItem("english-trainer-mobile-word-learning-state-v1:uid-1", JSON.stringify(persistedF5Map));
  sandbox.window.MobileFirebaseAuthState = { status: "logged-in", user: { uid: "uid-1" } };
  sandbox.window.getMobileFirebaseCurrentUser = () => ({ uid: "uid-1" });
  sandbox.window.bindMobileAuthState();
  const reloadedRows = sandbox.window.getWordLearningStateManagementRows();
  const reloadedEntry = reloadedRows.find((row) => row.wordId === "vocab-3-although-item-484");
  assert.ok(reloadedEntry, "auth-triggered load restores the learned entry into management rows");
  assert.strictEqual(reloadedEntry.pronunciationStatus, "△", "auth-triggered load keeps learned pronunciation status");
  assert.strictEqual(reloadedEntry.meaningStatus, "○", "auth-triggered load keeps learned meaning status");
  assert.strictEqual(reloadedEntry.questionCount, 1, "auth-triggered load keeps learned questionCount");
  assert.strictEqual(reloadedEntry.lastStudiedAt, 1234567890, "auth-triggered load preserves saved lastStudiedAt");

  sandbox.state.wordLearningState = {
    w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 2000, questionCount: 1, perfectPairCount: 1, isMastered: false, learningStateStatus: "learning" },
    w2: { wordId: "w2", pronunciationStatus: "△", meaningStatus: "○", lastStudiedAt: 3000, questionCount: 2, perfectPairCount: 1, isMastered: false, learningStateStatus: "learning" },
    w3: { wordId: "w3", pronunciationStatus: "○", meaningStatus: "△", lastStudiedAt: 4000, questionCount: 3, perfectPairCount: 2, isMastered: false, learningStateStatus: "learning" }
  };
  sandbox.state.vocabularyStudy = {
    entries: [
      { id: "legacy-1", word: "legacy", pronunciation: { level: 5 }, meaningState: { level: 5 }, meaning: "旧語彙", partOfSpeech: "名詞" },
      { id: "legacy-2", word: "legacy-2", pronunciation: { level: 5 }, meaningState: { level: 5 }, meaning: "旧語彙2", partOfSpeech: "名詞" }
    ]
  };
  const learningList = sandbox.window.getVocabularyProgressListEntries("status", "learning");
  assert.strictEqual(learningList.length, 3, "status list should come from wordLearningState, not legacy history");
  assert.strictEqual(learningList.every((entry) => entry.wordId && entry.wordId.startsWith("w")), true, "status list should use wordLearningState wordIds");

  const stateAdminSummary = sandbox.window.buildWordLearningStateAdminSummary(sandbox.state.wordLearningState);
  const visibleAdminRows = stateAdminSummary.rows.filter((row) => row.questionCount > 0);
  assert.strictEqual(visibleAdminRows.length, 3, "initial admin view should only show words with questionCount > 0");
  assert.strictEqual(stateAdminSummary.totalWords, 3, "totalWords should still represent the tracked bank size");

  sandbox.window.loadMobileWordLearningStateFromFirestore = async () => ({
    ok: true,
    exists: true,
    wordLearningState: {
      remoteW1: { wordId: "remoteW1", pronunciationStatus: "◎", meaningStatus: "◎", lastStudiedAt: 777, questionCount: 4, perfectPairCount: 4, isMastered: false, learningStateStatus: "learning" }
    }
  });
  sandbox.window.saveMobileWordLearningStateToFirestore = async (map) => {
    sandbox.window.__lastSavedWordState = map;
    return { ok: true, saved: true, wordLearningState: map };
  };
  sandbox.state.wordLearningState = {};
  sandbox.mobileAuthLastStatus = "logged-out";
  sandbox.mobileAuthLastUid = "";
  sandbox.window.MobileFirebaseAuthState = { status: "logged-in", user: { uid: "uid-1" } };
  sandbox.window.getMobileFirebaseCurrentUser = () => ({ uid: "uid-1" });
  sandbox.window.bindMobileAuthState();
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(sandbox.state.wordLearningState.remoteW1.questionCount, 4, "auth bootstrap should load and apply remote wordLearningState data for logged-in users");
  await sandbox.window.initializeWordLearningStateSyncForCurrentUser({ force: true });
  assert.strictEqual(sandbox.state.wordLearningState.remoteW1.questionCount, 4, "remote Firestore state should win when loading a logged-in user");
  assert.strictEqual(sandbox.window.localStorage.getItem("english-trainer-mobile-word-learning-state-v1:uid-1").includes("remoteW1"), true, "remote state should be written back to localStorage during load");

  sandbox.state.wordLearningState = {
    localOnly: { wordId: "localOnly", pronunciationStatus: "△", meaningStatus: "○", lastStudiedAt: 900, questionCount: 2, perfectPairCount: 1, isMastered: false, learningStateStatus: "learning" }
  };
  sandbox.window.saveState("localOnly");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.strictEqual(Boolean(sandbox.window.__lastSavedWordState), true, "saveState should persist wordLearningState to Firestore for logged-in users");
  assert.strictEqual(sandbox.window.__lastSavedWordState.localOnly.questionCount, 2, "saveState should persist the sanitized local wordLearningState snapshot");

  const local13 = {
    a: { wordId: "a", pronunciationStatus: "○", meaningStatus: "△", lastSelfResult: "ok", lastStudiedAt: 200, questionCount: 7, perfectPairCount: 1, isMastered: false, learningStateStatus: "learning" },
    b: { wordId: "b", pronunciationStatus: "○", meaningStatus: "○", lastSelfResult: "ok", lastStudiedAt: 300, questionCount: 6, perfectPairCount: 2, isMastered: false, learningStateStatus: "learning" },
    c: { wordId: "c", pronunciationStatus: "－", meaningStatus: "－", lastSelfResult: null, lastStudiedAt: 0, questionCount: 0, perfectPairCount: 0, isMastered: false, learningStateStatus: "unlearned" },
    d: { wordId: "d", pronunciationStatus: "○", meaningStatus: "○", lastSelfResult: "ok", lastStudiedAt: 400, questionCount: 10, perfectPairCount: 5, isMastered: true, learningStateStatus: "mastered" }
  };
  const remote3 = {
    a: { wordId: "a", pronunciationStatus: "○", meaningStatus: "○", lastSelfResult: "ok", lastStudiedAt: 100, questionCount: 5, perfectPairCount: 1, isMastered: false, learningStateStatus: "learning" },
    y: { wordId: "y", pronunciationStatus: "△", meaningStatus: "○", lastSelfResult: "ng", lastStudiedAt: 500, questionCount: 3, perfectPairCount: 0, isMastered: false, learningStateStatus: "learning" },
    z: { wordId: "z", pronunciationStatus: "◎", meaningStatus: "◎", lastSelfResult: "ok", lastStudiedAt: 600, questionCount: 2, perfectPairCount: 2, isMastered: false, learningStateStatus: "learning" }
  };

  const merged13 = sandbox.window.mergeWordLearningStateByLatest(local13, remote3);
  assert.strictEqual(Object.keys(merged13).length, 6, "union merge should retain local-only and remote-only entries without deleting learned words");
  assert.strictEqual(merged13.a.questionCount, 7, "questionCount should use the max of local and remote values");
  assert.strictEqual(merged13.a.meaningStatus, "△", "newer local status should win for current state fields");
  assert.strictEqual(merged13.a.lastStudiedAt, 200, "lastStudiedAt should stay on the newest learned record, which is the local record here");
  assert.strictEqual(merged13.y.questionCount, 3, "remote-only learned word should be preserved");
  assert.strictEqual(merged13.z.questionCount, 2, "remote-only word should survive the union merge");
  assert.strictEqual(merged13.c.questionCount, 0, "unlearned local entries should remain unlearned");
  assert.strictEqual(merged13.d.isMastered, true, "mastered local state must survive merge");

  const localOnlyWord = { x: { wordId: "x", pronunciationStatus: "○", meaningStatus: "○", lastStudiedAt: 900, questionCount: 2, perfectPairCount: 1, isMastered: false, learningStateStatus: "learning" } };
  const remoteOnlyWord = { y: { wordId: "y", pronunciationStatus: "△", meaningStatus: "○", lastStudiedAt: 100, questionCount: 1, perfectPairCount: 0, isMastered: false, learningStateStatus: "learning" } };
  const unionResult = sandbox.window.mergeWordLearningStateByLatest(localOnlyWord, remoteOnlyWord);
  assert.strictEqual(Object.keys(unionResult).length, 2, "local-only and remote-only wordIds should both survive union");
  assert.strictEqual(unionResult.x.questionCount, 2, "local-only progress is preserved");
  assert.strictEqual(unionResult.y.questionCount, 1, "remote-only progress is preserved");

  const localNewer = {
    n: { wordId: "n", pronunciationStatus: "○", meaningStatus: "△", lastSelfResult: "ok", lastStudiedAt: 200, questionCount: 7, perfectPairCount: 3, isMastered: false, learningStateStatus: "learning" }
  };
  const remoteNewer = {
    n: { wordId: "n", pronunciationStatus: "△", meaningStatus: "○", lastSelfResult: "ng", lastStudiedAt: 300, questionCount: 5, perfectPairCount: 2, isMastered: false, learningStateStatus: "learning" }
  };
  const newerLocalMerge = sandbox.window.mergeWordLearningStateByLatest(localNewer, remoteNewer);
  assert.strictEqual(newerLocalMerge.n.questionCount, 7, "questionCount should use the max across both entries even when remote is newer");
  assert.strictEqual(newerLocalMerge.n.pronunciationStatus, "△", "newer remote status should win when the remote record is newer");
  assert.strictEqual(newerLocalMerge.n.meaningStatus, "○", "newer remote meaning status should win");

  const localZeroReset = {
    zeroWord: { wordId: "zeroWord", pronunciationStatus: "○", meaningStatus: "○", lastSelfResult: "ok", lastStudiedAt: 100, questionCount: 1, perfectPairCount: 1, isMastered: false, learningStateStatus: "learning" }
  };
  const remoteZeroReset = {
    zeroWord: { wordId: "zeroWord", pronunciationStatus: "－", meaningStatus: "－", lastSelfResult: "", lastStudiedAt: 200, questionCount: 0, perfectPairCount: 0, isMastered: false, learningStateStatus: "unlearned" }
  };
  const zeroResetMerge = sandbox.window.mergeWordLearningStateByLatest(localZeroReset, remoteZeroReset);
  assert.strictEqual(zeroResetMerge.zeroWord.questionCount, 1, "zero-question reset should not erase the learned value");
  assert.strictEqual(zeroResetMerge.zeroWord.pronunciationStatus, "○", "learned current status should survive a later unlearned reset");

  console.log("mobile word learning state checks passed");
})();
