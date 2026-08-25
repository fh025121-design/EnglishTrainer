const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");
const handleMatch = source.match(/async function handleVocabularySampleChoice\(kind, value\) \{[\s\S]*?\n  \}/);
assert.ok(handleMatch, "should extract the real vocabulary sample completion handler");

function createSample(words) {
  return {
    words,
    index: 0,
    pronunciationChecked: false,
    pronunciationChoice: null,
    meaningChecked: false,
    meaningChoice: null,
    meaningRevealed: false,
    finished: false,
    sessionExpired: false,
    timerDeadlineAt: null,
    timerIntervalId: null,
    completedWordCount: 0,
    completedWordIds: [],
    historyFinalized: false,
    currentWordKey: null,
    currentWordCompleted: false,
    currentWordId: null
  };
}

function buildSandbox() {
  const sharedState = {
    vocabularySample: null,
    vocabularyStudy: null,
    vocabularyTodayHistoryMap: {}
  };
  let continueVocabularySampleCallCount = 0;
  let chimeCallCount = 0;

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
    state: sharedState,
    window: {
      localStorage: {
        getItem() { return null; },
        setItem() {},
        removeItem() {}
      },
      addEventListener() {},
      location: { search: "" }
    },
    getVocabularyRealWordBank: () => [{
      id: "w1",
      word: "apple",
      partOfSpeech: "名詞",
      meaning: "りんご",
      grade: "5"
    }],
    buildVocabularyRealStudyState: () => ({
      targetWordCount: 1000,
      entries: [],
      progressMap: {},
      session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
      gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
    }),
    normalizeVocabularySampleSessionState: (sample) => sample,
    getVocabularySampleWordItem: () => {
      const sample = sharedState.vocabularySample;
      return sample && Array.isArray(sample.words) ? sample.words[sample.index] || null : null;
    },
    getVocabularyHistoryTodayKey: () => "2026-08-25",
    getVocabularyHistoryWordKey: (wordItem) => `${String(wordItem?.id || wordItem?.word || "").trim()}|${String(wordItem?.partOfSpeech || "").trim()}`,
    recordVocabularySampleHistoryJudgment: (wordItem, kind, value) => {
      const todayKey = sandbox.getVocabularyHistoryTodayKey();
      const wordKey = sandbox.getVocabularyHistoryWordKey(wordItem);
      const bucket = sharedState.vocabularyTodayHistoryMap[todayKey] || {};
      const entry = bucket[wordKey] || {
        word: wordItem.word,
        partOfSpeech: wordItem.partOfSpeech || "名詞",
        pronunciation: "—",
        meaning: "—",
        lastJudgedAt: 0
      };
      entry[kind] = value === "ok" ? "○" : "△";
      entry.lastJudgedAt = Date.now();
      bucket[wordKey] = entry;
      sharedState.vocabularyTodayHistoryMap[todayKey] = bucket;
      return true;
    },
    updateVocabularyStudyEntryAfterJudgment: (wordItem, kind, value) => {
      if (!sharedState.vocabularyStudy) {
        sharedState.vocabularyStudy = sandbox.buildVocabularyRealStudyState();
      }
      const normalizedId = String(wordItem.id || wordItem.word || "").trim();
      const entry = sharedState.vocabularyStudy.entries.find((candidate) => String(candidate.id) === normalizedId) || {
        id: normalizedId,
        word: wordItem.word,
        partOfSpeech: wordItem.partOfSpeech || "名詞",
        pronunciation: { level: 0 },
        meaningState: { level: 0 }
      };
      if (!sharedState.vocabularyStudy.entries.some((candidate) => String(candidate.id) === normalizedId)) {
        sharedState.vocabularyStudy.entries.push(entry);
      }
      const target = kind === "meaning" ? entry.meaningState : entry.pronunciation;
      target.level = value === "ok" ? 1 : 1;
      return entry;
    },
    getVocabularySampleCompletedWordIds: (sample = sharedState.vocabularySample) => {
      if (!sample || typeof sample !== "object") return [];
      const rawIds = Array.isArray(sample.completedWordIds) ? sample.completedWordIds : [];
      return rawIds.map((wordId) => String(wordId || "").trim()).filter(Boolean);
    },
    playVocabularySampleCorrectChime: () => {
      chimeCallCount += 1;
      return true;
    },
    renderVocabularySampleScreen: () => {},
    showScreen: () => {},
    saveState: () => {},
    flushMobileVocabularySync: async () => {},
    flushMobileVocabularyTodayHistorySync: async () => {},
    advanceVocabularyNormalProgress: () => {},
    getVocabularyTodayHistoryEntries: () => {
      const todayKey = sandbox.getVocabularyHistoryTodayKey();
      const todayMap = sharedState.vocabularyTodayHistoryMap[todayKey] || {};
      return Object.values(todayMap)
        .filter((entry) => entry && String(entry.word || "").trim())
        .filter((entry) => String(entry.pronunciation || "—").trim() !== "—" && String(entry.meaning || "—").trim() !== "—");
    },
    continueVocabularySample: () => {
      const sample = sharedState.vocabularySample;
      continueVocabularySampleCallCount += 1;
      if (!sample) return;
      sample.index += 1;
      sample.pronunciationChecked = false;
      sample.pronunciationChoice = null;
      sample.meaningChecked = false;
      sample.meaningChoice = null;
      sample.meaningRevealed = false;
      sample.currentWordKey = null;
      sample.currentWordCompleted = false;
    }
  };

  vm.runInNewContext(handleMatch[0], sandbox, { filename: "mobile-vocabulary-sample-flow.js" });

  return {
    sandbox,
    getContinueCount: () => continueVocabularySampleCallCount,
    getChimeCount: () => chimeCallCount,
    resetContinueCount: () => {
      continueVocabularySampleCallCount = 0;
    },
    resetChimeCount: () => {
      chimeCallCount = 0;
    }
  };
}

(async () => {
  const { sandbox, getContinueCount, getChimeCount, resetContinueCount, resetChimeCount } = buildSandbox();

  const words = [
    { id: "apple", word: "apple", partOfSpeech: "名詞", meaning: "りんご" },
    { id: "banana", word: "banana", partOfSpeech: "名詞", meaning: "バナナ" }
  ];
  sandbox.state.vocabularySample = createSample(words);
  sandbox.state.vocabularyStudy = sandbox.buildVocabularyRealStudyState();
  sandbox.state.vocabularyTodayHistoryMap = {};
  resetContinueCount();
  resetChimeCount();

  await sandbox.handleVocabularySampleChoice("pronunciation", "ok");
  assert.strictEqual(sandbox.state.vocabularySample.completedWordCount, 0, "the first judgment must not finalize a word");
  assert.strictEqual(getChimeCount(), 0, "the first judgment must not trigger a correct chime");

  await sandbox.handleVocabularySampleChoice("meaning", "ok");
  assert.strictEqual(sandbox.state.vocabularySample.completedWordCount, 1, "apple completion should count once");
  assert.strictEqual(sandbox.state.vocabularySample.completedWordIds.includes("apple|名詞"), true, "apple should be counted once in completedWordIds");
  assert.strictEqual(sandbox.getVocabularyTodayHistoryEntries().length, 1, "apple completion should show exactly one today-history row");
  assert.strictEqual(getChimeCount(), 1, "only the final ○○ pair should trigger the correct chime");
  assert.strictEqual(getContinueCount(), 1, "apple completion should trigger exactly one continue call");

  await sandbox.handleVocabularySampleChoice("pronunciation", "ng");
  await sandbox.handleVocabularySampleChoice("meaning", "ok");

  assert.strictEqual(sandbox.state.vocabularySample.completedWordCount, 2, "banana completion should increase the count to two");
  assert.strictEqual(sandbox.state.vocabularySample.completedWordIds.includes("banana|名詞"), true, "banana should be counted once in completedWordIds");
  assert.strictEqual(sandbox.getVocabularyTodayHistoryEntries().length, 2, "two completed words should show exactly two today-history rows");
  assert.strictEqual(getContinueCount(), 2, "banana completion should trigger a second continue call");

  const failingSave = buildSandbox();
  failingSave.sandbox.state.vocabularySample = createSample([
    { id: "apple", word: "apple", partOfSpeech: "名詞", meaning: "りんご" },
    { id: "banana", word: "banana", partOfSpeech: "名詞", meaning: "バナナ" }
  ]);
  failingSave.sandbox.state.vocabularyStudy = failingSave.sandbox.buildVocabularyRealStudyState();
  failingSave.sandbox.state.vocabularyTodayHistoryMap = {};
  failingSave.sandbox.saveState = () => {
    throw new Error("saveState failed");
  };
  failingSave.sandbox.flushMobileVocabularySync = async () => {
    throw new Error("flushMobileVocabularySync failed");
  };
  failingSave.sandbox.flushMobileVocabularyTodayHistorySync = async () => {
    throw new Error("flushMobileVocabularyTodayHistorySync failed");
  };
  failingSave.resetContinueCount();

  await failingSave.sandbox.handleVocabularySampleChoice("pronunciation", "ok");
  await failingSave.sandbox.handleVocabularySampleChoice("meaning", "ok");

  assert.strictEqual(failingSave.sandbox.state.vocabularySample.index, 1, "save failures must not block the next-word advance");
  assert.strictEqual(failingSave.getContinueCount(), 1, "completion should still continue despite persistence errors");

  console.log("mobile vocabulary completion state checks passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
