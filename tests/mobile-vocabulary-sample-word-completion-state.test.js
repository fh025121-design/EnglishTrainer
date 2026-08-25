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

  const fiveWordSequence = [
    ["pronunciation", "ok"],
    ["meaning", "ok"],
    ["pronunciation", "ok"],
    ["meaning", "ng"],
    ["pronunciation", "ng"],
    ["meaning", "ok"],
    ["pronunciation", "ng"],
    ["meaning", "ng"],
    ["pronunciation", "ok"],
    ["meaning", "ok"]
  ];

  const fiveWordSandbox = buildSandbox();
  fiveWordSandbox.sandbox.state.vocabularySample = createSample([
    { id: "w1", word: "apple", partOfSpeech: "名詞", meaning: "りんご" },
    { id: "w2", word: "banana", partOfSpeech: "名詞", meaning: "バナナ" },
    { id: "w3", word: "cherry", partOfSpeech: "名詞", meaning: "さくらんぼ" },
    { id: "w4", word: "date", partOfSpeech: "名詞", meaning: "日付" },
    { id: "w5", word: "elderberry", partOfSpeech: "名詞", meaning: "エルダベリー" }
  ]);
  fiveWordSandbox.sandbox.state.vocabularyStudy = fiveWordSandbox.sandbox.buildVocabularyRealStudyState();
  fiveWordSandbox.sandbox.state.vocabularyTodayHistoryMap = {};
  fiveWordSandbox.resetContinueCount();
  fiveWordSandbox.resetChimeCount();

  for (const [kind, value] of fiveWordSequence) {
    await fiveWordSandbox.sandbox.handleVocabularySampleChoice(kind, value);
  }

  assert.strictEqual(fiveWordSandbox.sandbox.state.vocabularySample.completedWordCount, 5, "five completions must accumulate to five completed words");
  assert.strictEqual(fiveWordSandbox.sandbox.state.vocabularySample.completedWordIds.length, 5, "five completions must record five unique word ids");
  assert.strictEqual(fiveWordSandbox.sandbox.getVocabularyTodayHistoryEntries().length, 5, "five completions must produce five today-history entries");
  assert.strictEqual(fiveWordSandbox.getContinueCount(), 5, "the five-word flow must advance through every word");
  assert.strictEqual(fiveWordSandbox.getChimeCount(), 2, "only the two ○○ outcomes should trigger the correct chime");

  const syncFailureSandbox = buildSandbox();
  syncFailureSandbox.sandbox.state.vocabularySample = createSample([
    { id: "w1", word: "apple", partOfSpeech: "名詞", meaning: "りんご" },
    { id: "w2", word: "banana", partOfSpeech: "名詞", meaning: "バナナ" },
    { id: "w3", word: "cherry", partOfSpeech: "名詞", meaning: "さくらんぼ" },
    { id: "w4", word: "date", partOfSpeech: "名詞", meaning: "日付" },
    { id: "w5", word: "elderberry", partOfSpeech: "名詞", meaning: "エルダベリー" }
  ]);
  syncFailureSandbox.sandbox.state.vocabularyStudy = syncFailureSandbox.sandbox.buildVocabularyRealStudyState();
  syncFailureSandbox.sandbox.state.vocabularyTodayHistoryMap = {};
  syncFailureSandbox.sandbox.saveState = () => {
    throw new Error("sync failed");
  };
  syncFailureSandbox.sandbox.flushMobileVocabularySync = async () => {
    throw new Error("sync failed");
  };
  syncFailureSandbox.sandbox.flushMobileVocabularyTodayHistorySync = async () => {
    throw new Error("sync failed");
  };
  syncFailureSandbox.resetContinueCount();

  for (const [kind, value] of [
    ["pronunciation", "ok"],
    ["meaning", "ok"],
    ["pronunciation", "ok"],
    ["meaning", "ng"],
    ["pronunciation", "ng"],
    ["meaning", "ok"],
    ["pronunciation", "ng"],
    ["meaning", "ng"],
    ["pronunciation", "ok"],
    ["meaning", "ok"]
  ]) {
    await syncFailureSandbox.sandbox.handleVocabularySampleChoice(kind, value);
  }

  assert.strictEqual(syncFailureSandbox.sandbox.state.vocabularySample.completedWordCount, 5, "sync failures must not stop completion progression");
  assert.strictEqual(syncFailureSandbox.sandbox.getVocabularyTodayHistoryEntries().length, 5, "sync failures must not remove today-history entries");
  assert.strictEqual(syncFailureSandbox.sandbox.state.vocabularySample.index, 5, "the five-word run must reach the end without stalling");

  const historyScript = [
    source.match(/function createVocabularyTeacherCheckState\(overrides = \{\}\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function createVocabularySkillState\(overrides = \{\}\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyGradeValue\(entry\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function normalizeVocabularyWordRecord\(entry, index = 0\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function mergeVocabularyStudyStateByLatest\(baseStudyState, incomingStudyState\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyPastHistoryEntries\(\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyTeacherCheckCandidates\(\) \{[\s\S]*?\n  \}/)?.[0]
  ].filter(Boolean).join("\n");

  const historySandbox = {
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
    state: {
      vocabularyStudy: {
        targetWordCount: 1000,
        entries: [
          {
            id: "w1",
            word: "apple",
            partOfSpeech: "名詞",
            meaning: "りんご",
            pronunciation: { level: 1, lastSelfResult: "ok", teacherCheckState: { pronunciation: "none", meaning: "none" } },
            meaningState: { level: 1, lastSelfResult: "ok", teacherCheckState: { pronunciation: "none", meaning: "none" } },
            lastJudgedAt: Date.now(),
            createdAt: Date.now()
          },
          {
            id: "w2",
            word: "banana",
            partOfSpeech: "名詞",
            meaning: "バナナ",
            pronunciation: { level: 1, lastSelfResult: "ok", teacherCheckState: { pronunciation: "none", meaning: "none" } },
            meaningState: { level: 1, lastSelfResult: "ok", teacherCheckState: { pronunciation: "none", meaning: "none" } },
            lastJudgedAt: Date.now(),
            createdAt: Date.now()
          }
        ],
        progressMap: {},
        session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
        gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
      },
      vocabularyTodayHistoryMap: {},
      vocabularyPastHistoryFilter: "all",
      currentScreen: "homeScreen"
    },
    getVocabularyRealWordBank: () => [
      { id: "w1", word: "apple", partOfSpeech: "名詞", meaning: "りんご", level: "5" },
      { id: "w2", word: "banana", partOfSpeech: "名詞", meaning: "バナナ", level: "5" }
    ],
    getVocabularyStudyEntryById: (wordId) => {
      const normalizedId = String(wordId || "").trim();
      return historySandbox.state.vocabularyStudy.entries.find((entry) => String(entry.id || entry.word || "").trim() === normalizedId) || null;
    },
    getVocabularyCurrentSelfStatus: (skillState) => {
      if (!skillState || typeof skillState !== "object") return "none";
      const raw = String(skillState.lastSelfResult || "").trim();
      if (raw === "ok") return "○";
      if (raw === "ng") return "△";
      return "none";
    },
    getVocabularyTeacherCheckStatusText: (skillState, fieldName = "pronunciation") => {
      if (!skillState || typeof skillState !== "object") return "none";
      const teacherValue = String(skillState.teacherCheckStatus || skillState.teacherCheckState?.[fieldName] || "none").trim();
      if (teacherValue === "◎" || teacherValue === "ok") return "◎";
      if (teacherValue === "△" || teacherValue === "ng") return "△";
      return "none";
    },
    sanitizeVocabularyStudyState: (rawStudy) => {
      if (!rawStudy || typeof rawStudy !== "object") return null;
      const entries = Array.isArray(rawStudy.entries) ? rawStudy.entries : [];
      return { ...rawStudy, entries: entries.map((entry) => ({ ...entry })) };
    },
    createVocabularyStudyState: (entries = []) => ({
      targetWordCount: 1000,
      entries,
      progressMap: Object.fromEntries(entries.map((entry) => [String(entry.id || entry.word || ""), entry])),
      session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
      gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
    }),
    getVocabularyPastHistoryStatus: (skillState, fieldName = "pronunciation") => {
      if (!skillState || typeof skillState !== "object") return "—";
      const raw = String(skillState.lastSelfResult || "").trim();
      if (raw === "ok") return "○";
      if (raw === "ng") return "△";
      const setting = skillState.teacherCheckState?.[fieldName] || skillState.teacherCheckStatus || "";
      const teacher = String(setting || "").trim();
      if (teacher === "ok" || teacher === "◎") return "○";
      if (teacher === "ng" || teacher === "△") return "△";
      return "—";
    }
  };
  vm.runInNewContext(historyScript, historySandbox, { filename: "mobile-history-regression.js" });

  const normalized = vm.runInContext("normalizeVocabularyWordRecord(state.vocabularyStudy.entries[0], 0)", historySandbox);
  assert.strictEqual(normalized.pronunciation.lastSelfResult, "ok", "normalizeVocabularyWordRecord must preserve the pronunciation self-result");
  assert.strictEqual(normalized.meaningState.lastSelfResult, "ok", "normalizeVocabularyWordRecord must preserve the meaning self-result");

  const mergedStudy = vm.runInContext("mergeVocabularyStudyStateByLatest({ targetWordCount: 1000, entries: [state.vocabularyStudy.entries[0]] }, { targetWordCount: 1000, entries: [state.vocabularyStudy.entries[1]] })", historySandbox);
  assert.strictEqual(mergedStudy.entries.length, 2, "mergeVocabularyStudyStateByLatest should keep both entries");
  assert.strictEqual(mergedStudy.entries[0].pronunciation.lastSelfResult, "ok", "merged study entries must retain pronunciation self-results");
  assert.strictEqual(mergedStudy.entries[0].meaningState.lastSelfResult, "ok", "merged study entries must retain meaning self-results");

  const pastHistoryEntries = vm.runInContext("getVocabularyPastHistoryEntries()", historySandbox);
  assert.strictEqual(Array.isArray(pastHistoryEntries) && pastHistoryEntries.length, 2, "past-history should include both completed words");
  assert.strictEqual(pastHistoryEntries[0].pronunciationStatus, "○", "past-history pronunciation should retain the self-judgment");
  assert.strictEqual(pastHistoryEntries[0].meaningStatus, "○", "past-history meaning should retain the self-judgment");

  const teacherCandidates = vm.runInContext("getVocabularyTeacherCheckCandidates()", historySandbox);
  assert.strictEqual(Array.isArray(teacherCandidates) && teacherCandidates.length, 2, "teacher-check candidate count should match the two self-completed words");

  console.log("mobile vocabulary completion state checks passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
