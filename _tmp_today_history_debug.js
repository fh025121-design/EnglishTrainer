const fs = require("fs");
const vm = require("vm");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "mobile", "mobile.js"), "utf8");
const names = [
  "getVocabularyHistoryTodayKey",
  "getVocabularyHistoryWordKey",
  "normalizeVocabularyHistoryStatus",
  "recordVocabularySampleHistoryJudgment",
  "getVocabularySampleCompletedWordIds",
  "getVocabularySampleCompletedWordCount",
  "getVocabularyTodayHistoryEntries",
  "getVocabularyHistoryWeaknessScore",
  "continueVocabularySample",
  "handleVocabularySampleChoice"
];
const snippets = names.map((name) => {
  const re = new RegExp("function " + name + "\\([^)]*\\) \\{[\\s\\S]*?\\n  \\}");
  return source.match(re)?.[0] ?? null;
}).filter(Boolean);

const sandbox = {
  state: {
    vocabularySample: null,
    vocabularyStudy: { entries: [] },
    vocabularyTodayHistoryMap: {},
    learningHistorySession: null,
    currentScreen: "vocabularySampleScreen"
  },
  window: {
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    },
    addEventListener() {},
    location: { search: "" },
    clearInterval() {},
    setInterval() { return 1; },
    Audio: function () { return { preload: "auto", play: () => Promise.resolve() }; }
  },
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
  getCurrentMobileFirebaseUser: () => ({ uid: "u1" }),
  getVocabularyRealWordBank: () => [
    { id: "apple", word: "apple", partOfSpeech: "名詞", meaning: "りんご", grade: "5" },
    { id: "banana", word: "banana", partOfSpeech: "名詞", meaning: "バナナ", grade: "5" },
    { id: "cherry", word: "cherry", partOfSpeech: "名詞", meaning: "さくらんぼ", grade: "5" }
  ],
  getMobileLearningHistoryDayKey: () => "2026-08-25",
  getVocabularyHistoryTodayKey: () => "2026-08-25",
  getVocabularyHistoryWordKey: (wordItem) => `${String(wordItem?.id || wordItem?.word || "").trim()}|${String(wordItem?.partOfSpeech || "").trim()}`,
  normalizeVocabularyHistoryStatus: (value) => value === "ok" ? "○" : value === "ng" ? "△" : "—",
  getVocabularySampleWordItem: () => {
    const sample = sandbox.state.vocabularySample;
    if (!sample || !Array.isArray(sample.words)) return null;
    return sample.words[sample.index] || null;
  },
  getVocabularySampleCompletedWordIds: (sample = sandbox.state.vocabularySample) => {
    if (!sample || !Array.isArray(sample.completedWordIds)) return [];
    return sample.completedWordIds.map((id) => String(id || "").trim()).filter(Boolean);
  },
  getVocabularySampleCompletedWordCount: (sample = sandbox.state.vocabularySample) => {
    if (!sample) return 0;
    return Math.max(0, Number(sample.completedWordCount) || 0);
  },
  saveVocabularyTodayHistoryMap: () => {},
  saveState: () => {},
  flushMobileVocabularySync: async () => {},
  flushMobileVocabularyTodayHistorySync: async () => {},
  updateVocabularyStudyEntryAfterJudgment: () => true,
  advanceVocabularyNormalProgress: () => {},
  normalizeVocabularySampleSessionState: (sample) => sample,
  playVocabularySampleCorrectChime: () => true,
  renderVocabularySampleScreen: () => {},
  showScreen: () => {},
  finalizeMobileLearningHistorySession: () => {},
  startMobileLearningHistorySession: () => {},
  finalizeVocabularySampleHistorySession: () => {},
  stopVocabularySampleTimer: () => {},
  getVocabularyHistoryWeaknessScore: (entry) => {
    if (!entry || typeof entry !== "object") return 0;
    return [entry.pronunciation, entry.meaning].filter((value) => value === "△").length;
  }
};

vm.runInNewContext(snippets.join("\n"), sandbox, { filename: "vocab-history-debug.js" });

function buildSample(words) {
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

async function runTrace(label, entries, decisions) {
  sandbox.state.vocabularySample = buildSample(entries);
  sandbox.state.vocabularyTodayHistoryMap = {};
  console.log("\n=== " + label + " ===");
  for (const [kind, value] of decisions) {
    const itemBefore = sandbox.getVocabularySampleWordItem();
    const currentWordKeyBefore = sandbox.state.vocabularySample.currentWordKey;
    const itemKeyBefore = `${String(itemBefore?.id || itemBefore?.word || "").trim()}|${String(itemBefore?.partOfSpeech || "").trim()}`;
    console.log("before", kind, { currentWordKeyBefore, itemKeyBefore, sampleIndex: sandbox.state.vocabularySample.index, word: itemBefore?.word, partOfSpeech: itemBefore?.partOfSpeech });
    await sandbox.handleVocabularySampleChoice(kind, value);
    const itemAfter = sandbox.getVocabularySampleWordItem();
    const keyAfter = `${String(itemAfter?.id || itemAfter?.word || "").trim()}|${String(itemAfter?.partOfSpeech || "").trim()}`;
    const today = sandbox.state.vocabularyTodayHistoryMap["2026-08-25"] || {};
    console.log("after", kind, { currentWordKey: sandbox.state.vocabularySample.currentWordKey, itemKeyAfter: keyAfter, sampleIndex: sandbox.state.vocabularySample.index, todayEntries: Object.keys(today), todayMap: JSON.stringify(today) });
  }
}

(async () => {
  await runTrace("apple", [{ id: "apple", word: "apple", partOfSpeech: "名詞" }], [["pronunciation", "ok"], ["meaning", "ok"]]);
  await runTrace("banana+cherry", [{ id: "banana", word: "banana", partOfSpeech: "名詞" }, { id: "cherry", word: "cherry", partOfSpeech: "名詞" }], [["pronunciation", "ok"], ["meaning", "△"], ["pronunciation", "△"], ["meaning", "ok"]]);
})();
