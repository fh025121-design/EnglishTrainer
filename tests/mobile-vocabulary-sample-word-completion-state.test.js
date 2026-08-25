const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");
const handleMatch = source.match(/async function handleVocabularySampleChoice\(kind, value\) \{[\s\S]*?\n  \}/);
assert.ok(handleMatch, "should extract the real vocabulary sample completion handler");

const sharedState = {
  vocabularySample: null,
  vocabularyStudy: null,
  vocabularyTodayHistoryMap: {}
};

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
    session: {
      questionCount: 0,
      failedWordIds: [],
      recentFailedWordIds: []
    },
    gradeSummary: {
      5: { total: 0, mastered: 0 },
      4: { total: 0, mastered: 0 },
      3: { total: 0, mastered: 0 }
    }
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
  playVocabularySampleCorrectChime: () => true,
  renderVocabularySampleScreen: () => {},
  showScreen: () => {},
  saveState: () => {},
  flushMobileVocabularySync: async () => {},
  flushMobileVocabularyTodayHistorySync: async () => {},
  advanceVocabularyNormalProgress: () => {},
  continueVocabularySample: () => {
    const sample = sharedState.vocabularySample;
    if (!sample) return;
    sample.index += 1;
    sample.currentWordKey = null;
    sample.currentWordCompleted = false;
  }
};

vm.runInNewContext(handleMatch[0], sandbox, { filename: "mobile-vocabulary-sample-flow.js" });

sharedState.vocabularyStudy = sandbox.buildVocabularyRealStudyState();
sharedState.vocabularySample = {
  words: [{ id: "w1", word: "apple", partOfSpeech: "名詞", meaning: "りんご" }],
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

const item = sandbox.getVocabularySampleWordItem();
const itemKey = `${String(item.id || item.word || "").trim()}|${String(item.partOfSpeech || "").trim()}`;

sandbox.handleVocabularySampleChoice("pronunciation", "ok");
sandbox.handleVocabularySampleChoice("meaning", "ok");

assert.strictEqual(sharedState.vocabularySample.completedWordCount, 1, "first completed word should be counted once");
assert.strictEqual(sharedState.vocabularySample.completedWordIds.includes(itemKey), true, "same word should be recorded once");
assert.ok(sharedState.vocabularyStudy.entries.some((entry) => String(entry.id) === "w1"), "study state should include the completed word");
assert.strictEqual(Boolean(sharedState.vocabularyTodayHistoryMap["2026-08-25"]?.[itemKey]), true, "today history should store the completed word result");

sharedState.vocabularySample.currentWordCompleted = false;
sandbox.handleVocabularySampleChoice("pronunciation", "ok");
assert.strictEqual(sharedState.vocabularySample.completedWordCount, 1, "same word should not be counted twice after duplicate completion");

console.log("mobile vocabulary completion state checks passed");
