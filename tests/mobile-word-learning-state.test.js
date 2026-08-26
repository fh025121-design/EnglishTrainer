const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");

function makeSandbox() {
  const store = {};
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
    state: { wordLearningState: {}, vocabularyStudy: null, vocabularyTodayHistoryMap: {} },
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
    getMobileVocabularySyncUid: () => "uid-1"
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
  assert.ok(typeof sandbox.window.buildWordLearningStateDebugSnapshot === "function", "single-word debug snapshot helper should exist");

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

  const debugSnapshot = sandbox.window.buildWordLearningStateDebugSnapshot(
    { w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "△", lastStudiedAt: 12345, questionCount: 2 } },
    { w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "△", lastStudiedAt: 12345, questionCount: 2 } }
  );
  assert.strictEqual(debugSnapshot.wordId, "w1", "debug snapshot keeps the tracked wordId");
  assert.strictEqual(debugSnapshot.wordLabel, "apple", "debug snapshot resolves the real English word");
  assert.strictEqual(debugSnapshot.currentPronunciationStatus, "○", "debug snapshot reports the current pronunciation status");
  assert.strictEqual(debugSnapshot.savedMeaningStatus, "△", "debug snapshot reports saved meaning status");
  assert.strictEqual(debugSnapshot.wordIdMatches, true, "debug snapshot checks same wordId source equality");

  console.log("mobile word learning state checks passed");
})();
