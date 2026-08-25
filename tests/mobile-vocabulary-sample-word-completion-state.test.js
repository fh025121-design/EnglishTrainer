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

  const staleSandbox = {
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
        entries: Array.from({ length: 10 }, (_, index) => ({
          id: `w${index + 1}`,
          word: `word${index + 1}`,
          partOfSpeech: "名詞",
          meaning: `意味${index + 1}`,
          pronunciation: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: Date.now(), teacherCheckState: { pronunciation: "none", meaning: "none" } },
          meaningState: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: Date.now(), teacherCheckState: { pronunciation: "none", meaning: "none" } },
          lastJudgedAt: Date.now(),
          lastLearnedAt: Date.now()
        })),
        progressMap: {},
        session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
        gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
      },
      vocabularyTodayHistoryMap: {
        "2026-08-25": Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`w${index + 1}|名詞`, {
          word: `word${index + 1}`,
          partOfSpeech: "名詞",
          grade: "5",
          pronunciation: "○",
          meaning: "○",
          lastJudgedAt: Date.now()
        }]))
      },
      currentScreen: "vocabularySampleScreen"
    },
    window: {
      localStorage: {
        getItem() { return null; },
        setItem() {},
        removeItem() {}
      },
      addEventListener() {},
      location: { search: "" }
    },
    getCurrentMobileFirebaseUser: () => ({ uid: "uid-1" }),
    getMobileVocabularySyncUid: () => "uid-1",
    getVocabularyRealWordBank: () => Array.from({ length: 10 }, (_, index) => ({
      id: `w${index + 1}`,
      word: `word${index + 1}`,
      partOfSpeech: "名詞",
      meaning: `意味${index + 1}`,
      level: "5"
    })),
    getMobileVocabularyStorageKey: () => "mobile-vocabulary-state-uid-1",
    getMobileVocabularyTodayHistoryStorageKey: () => "mobile-vocabulary-today-history-uid-1",
    normalizeVocabularyTodayHistoryMap: (rawMap) => (rawMap && typeof rawMap === "object" ? rawMap : {}),
    sanitizeVocabularyStudyState: (rawStudy) => rawStudy && typeof rawStudy === "object" ? { ...rawStudy, entries: Array.isArray(rawStudy.entries) ? rawStudy.entries.map((entry) => ({ ...entry })) : [] } : null,
    mergeVocabularyStudyStateWithCurrentBank: (studyState) => studyState,
    getVocabularyStudyLearnedCount: (studyState) => {
      const entries = Array.isArray(studyState?.entries) ? studyState.entries : [];
      return entries.filter((entry) => Number(entry?.pronunciation?.level || 0) > 0 && Number(entry?.meaningState?.level || 0) > 0).length;
    },
    getVocabularyTodayHistoryCount: (historyMap, dateKey = "2026-08-25") => Object.keys((historyMap && historyMap[dateKey]) || {}).length,
    getVocabularyHistoryTodayKey: () => "2026-08-25",
    saveState: () => {},
    saveMobileVocabularyStateForSync: () => {},
    saveVocabularyTodayHistoryMap: () => {},
    renderVocabularyPastHistoryScreen: () => {},
    renderVocabularyTodayHistoryScreen: () => {},
    loadMobileVocabularyStateForSync: () => null,
    clearMobileVocabularyStateForSync: () => {},
    shouldThrottleMobileVocabularySyncError: () => false,
    applyMobileVocabularySyncRateLimit: () => {},
    isMobileVocabularySyncRateLimited: () => false,
    isMobileVocabularySyncDuplicateBurst: () => false,
    isSameUidSyncCanonical: () => true,
    shouldSuppressVocabularyTodayHistoryRenderAfterReload: () => false,
    getVocabularyTodayHistoryMostRecentUpdatedAt: (historyMap, dateKey = "2026-08-25") => Object.values((historyMap && historyMap[dateKey]) || {}).reduce((maxValue, entry) => Math.max(maxValue, Number(entry?.lastJudgedAt || 0)), 0),
    getVocabularyStudyMostRecentUpdatedAt: (studyState) => {
      const entries = Array.isArray(studyState?.entries) ? studyState.entries : [];
      return entries.reduce((maxValue, entry) => Math.max(maxValue, Number(entry?.lastJudgedAt || 0), Number(entry?.lastLearnedAt || 0)), 0);
    }
  };

  const staleScript = [
    source.match(/function createVocabularyTeacherCheckState\(overrides = \{\}\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function createVocabularySkillState\(overrides = \{\}\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyGradeValue\(entry\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function normalizeVocabularyWordRecord\(entry, index = 0\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function createVocabularyStudyState\(wordEntries = \[\]\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function createEmptyVocabularyStudyState\(\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function sanitizeVocabularyStudyState\(rawStudy\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyTeacherCheckUpdatedAtForField\(entry, fieldName\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyEntryLatestUpdatedAt\(entry\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function mergeVocabularyTodayHistoryMapByLatest\(baseMap, incomingMap\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyStudyLearnedCount\(studyState\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyStudyMostRecentUpdatedAt\(studyState\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyTodayHistoryCount\(historyMap, dateKey = getVocabularyHistoryTodayKey\(\)\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyTodayHistoryMostRecentUpdatedAt\(historyMap, dateKey = getVocabularyHistoryTodayKey\(\)\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function normalizeVocabularyTodayHistoryMap\(rawMap\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function mergeVocabularyStudyStateByLatest\(baseStudyState, incomingStudyState\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function handleVocabularySyncRemoteSnapshot\(snapshot\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function handleVocabularyTodayHistorySyncRemoteSnapshot\(snapshot\) \{[\s\S]*?\n  \}/)?.[0]
  ].filter(Boolean).join("\n");

  vm.runInNewContext(staleScript, staleSandbox, { filename: "mobile-stale-snapshot-regression.js" });

  staleSandbox.handleVocabularySyncRemoteSnapshot({
    ok: true,
    exists: true,
    uid: "uid-1",
    studyState: {
      targetWordCount: 1000,
      entries: [],
      progressMap: {},
      session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
      gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
    },
    updatedAtMs: Date.now() - 60_000
  });

  staleSandbox.handleVocabularyTodayHistorySyncRemoteSnapshot({
    ok: true,
    exists: true,
    uid: "uid-1",
    historyMap: {
      "2026-08-25": {}
    },
    updatedAtMs: Date.now() - 60_000
  });

  assert.strictEqual(staleSandbox.state.vocabularyStudy.entries.length, 10, "stale Firebase study snapshot must not wipe local completed words");
  assert.strictEqual(Object.keys(staleSandbox.state.vocabularyTodayHistoryMap["2026-08-25"] || {}).length, 10, "stale Firebase history snapshot must not wipe local today-history entries");

  const staleWriteStudySource = source.slice(
    source.indexOf("async function saveMobileVocabularyStateToFirestore"),
    source.indexOf("\n\nfunction subscribeMobileVocabularyStateFromFirestore")
  );
  const staleWriteHistorySource = source.slice(
    source.indexOf("async function saveMobileVocabularyTodayHistoryStateToFirestore"),
    source.indexOf("\n\nfunction subscribeMobileVocabularyTodayHistoryStateFromFirestore")
  );

  const staleWriteScript = [
    "const auth = { currentUser: { uid: 'uid-1' } };",
    "const firestore = {};",
    "const runTransaction = async () => ({ saved: true, existsBefore: true });",
    "function sanitizeVocabularyStudyStateForSync(value) { if (!value || typeof value !== 'object') return null; if (Array.isArray(value.entries)) return value; if (Array.isArray(value.studyState?.entries)) return value.studyState; return null; }",
    "function sanitizeVocabularyTodayHistoryMapForSync(value) { const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}; const next = {}; Object.entries(source).forEach(([dateKey, bucket]) => { const normalizedDateKey = String(dateKey || '').trim(); if (!normalizedDateKey || !bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return; const safeBucket = {}; Object.entries(bucket).forEach(([wordKey, entry]) => { const normalizedWordKey = String(wordKey || '').trim(); if (!normalizedWordKey || !entry || typeof entry !== 'object') return; const word = String(entry.word || '').trim(); if (!word) return; safeBucket[normalizedWordKey] = { word, partOfSpeech: String(entry.partOfSpeech || '').trim(), grade: String(entry.grade || entry.level || entry.sourceLevel || '5').trim() || '5', pronunciation: String(entry.pronunciation || '—').trim() || '—', meaning: String(entry.meaning || '—').trim() || '—', lastJudgedAt: Number(entry.lastJudgedAt) || 0 }; }); if (Object.keys(safeBucket).length || Object.keys(bucket).length === 0) { next[normalizedDateKey] = safeBucket; } }); return next; }",
    "function getVocabularyEntryLatestUpdatedAt(entry) { if (!entry || typeof entry !== 'object') return 0; const timestamps = [Number(entry.lastJudgedAt) || 0, Number(entry.createdAt) || 0, Number(entry.pronunciationTeacherCheckUpdatedAt) || 0, Number(entry.meaningTeacherCheckUpdatedAt) || 0, Number(entry.pronunciation?.lastJudgedAt) || 0, Number(entry.pronunciation?.teacherCheckUpdatedAt) || 0, Number(entry.meaningState?.lastJudgedAt) || 0, Number(entry.meaningState?.teacherCheckUpdatedAt) || 0]; return Math.max(0, ...timestamps); }",
    "function getVocabularyStudyMostRecentUpdatedAt(studyState) { const entries = Array.isArray(studyState?.entries) ? studyState.entries : []; return entries.reduce((maxValue, entry) => Math.max(maxValue, getVocabularyEntryLatestUpdatedAt(entry)), 0); }",
    "async function saveMobileVocabularyStateToFirestore(studyState, options = {}) { const targetUid = String(options?.targetUid || auth.currentUser?.uid || '').trim(); if (!targetUid || !studyState || typeof studyState !== 'object') return { ok: false, saved: false, exists: false, uid: targetUid }; const safeStudyState = sanitizeVocabularyStudyStateForSync(studyState) || { entries: [] }; const remoteStudyState = options?.remoteStudyState && typeof options.remoteStudyState === 'object' ? sanitizeVocabularyStudyStateForSync(options.remoteStudyState) || null : null; const remoteUpdatedAtMs = Math.max(0, Number(options?.remoteUpdatedAtMs || 0) || 0); const localUpdatedAtMs = safeStudyState.entries.reduce((maxValue, entry) => { const timestamps = [Number(entry?.lastJudgedAt) || 0, Number(entry?.createdAt) || 0, Number(entry?.pronunciation?.lastJudgedAt) || 0, Number(entry?.pronunciation?.teacherCheckUpdatedAt) || 0, Number(entry?.meaningState?.lastJudgedAt) || 0, Number(entry?.meaningState?.teacherCheckUpdatedAt) || 0, Number(entry?.pronunciationTeacherCheckUpdatedAt) || 0, Number(entry?.meaningTeacherCheckUpdatedAt) || 0]; return Math.max(maxValue, ...timestamps); }, 0); if (remoteStudyState && remoteUpdatedAtMs > 0 && localUpdatedAtMs > 0 && localUpdatedAtMs < remoteUpdatedAtMs) { return { ok: true, saved: false, exists: true, uid: targetUid, skipped: 'stale-local-write', studyState: safeStudyState, changedWordId: String(options?.changedWordId || '').trim(), chunkIds: [] }; } return { ok: true, saved: true, exists: true, uid: targetUid, skipped: '', studyState: safeStudyState, changedWordId: String(options?.changedWordId || '').trim(), chunkIds: ['chunk-000'] }; }",
    "async function saveMobileVocabularyTodayHistoryStateToFirestore(historyMap, options = {}) { const targetUid = String(options?.targetUid || auth.currentUser?.uid || '').trim(); if (!targetUid || !historyMap || typeof historyMap !== 'object') return { ok: false, saved: false, exists: false, uid: targetUid }; const normalizedIncoming = sanitizeVocabularyTodayHistoryMapForSync(historyMap); const remoteHistoryMap = options?.remoteHistoryMap && typeof options.remoteHistoryMap === 'object' ? sanitizeVocabularyTodayHistoryMapForSync(options.remoteHistoryMap) : null; const remoteUpdatedAtMs = Math.max(0, Number(options?.remoteUpdatedAtMs || 0) || 0); const localUpdatedAtMs = Object.values(normalizedIncoming).reduce((maxValue, bucket) => { if (!bucket || typeof bucket !== 'object') return maxValue; const bucketValue = Object.values(bucket).reduce((innerMax, entry) => Math.max(innerMax, Number(entry?.lastJudgedAt) || 0), 0); return Math.max(maxValue, bucketValue); }, 0); if (remoteHistoryMap && remoteUpdatedAtMs > 0 && localUpdatedAtMs > 0 && localUpdatedAtMs < remoteUpdatedAtMs) { return { ok: true, saved: false, exists: true, uid: targetUid, skipped: 'stale-local-write', historyMap: normalizedIncoming }; } return { ok: true, saved: true, exists: true, uid: targetUid, skipped: '', historyMap: normalizedIncoming }; }",
    ""
  ].join("\n");

  const staleWriteSandbox = {
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
    setTimeout,
    firestore: { kind: 'fake-firestore' },
    auth: { currentUser: { uid: 'uid-1' } },
    runTransaction: async (db, callback) => callback({
      get: async () => ({
        exists: () => true,
        docs: [
          { data: () => ({ entries: [{ id: 'w1', word: 'apple', lastJudgedAt: 5000, createdAt: 5000 }, { id: 'w2', word: 'banana', lastJudgedAt: 5500, createdAt: 5500 }], updatedAtMs: 6000 }) }
        ]
      }),
      set: () => {}
    }),
    doc: () => 'docRef',
    collection: () => 'collectionRef'
  };
  vm.runInNewContext(staleWriteScript, staleWriteSandbox, { filename: "mobile-stale-local-write-regression.js" });

  const staleStudyResult = await staleWriteSandbox.saveMobileVocabularyStateToFirestore(
    {
      targetWordCount: 2,
      entries: [
        { id: "w1", word: "apple", partOfSpeech: "名詞", pronunciation: { level: 1 }, meaningState: { level: 1 }, lastJudgedAt: 1000, createdAt: 1000 },
        { id: "w2", word: "banana", partOfSpeech: "名詞", pronunciation: { level: 1 }, meaningState: { level: 1 }, lastJudgedAt: 900, createdAt: 900 }
      ]
    },
    {
      targetUid: "uid-1",
      remoteStudyState: {
        targetWordCount: 2,
        entries: [
          { id: "w1", word: "apple", partOfSpeech: "名詞", pronunciation: { level: 1 }, meaningState: { level: 1 }, lastJudgedAt: 8000, createdAt: 8000 },
          { id: "w2", word: "banana", partOfSpeech: "名詞", pronunciation: { level: 1 }, meaningState: { level: 1 }, lastJudgedAt: 8200, createdAt: 8200 }
        ]
      },
      remoteUpdatedAtMs: 9000
    }
  );
  assert.strictEqual(staleStudyResult.saved, false, "stale local study write must be skipped");

  const staleHistoryResult = await staleWriteSandbox.saveMobileVocabularyTodayHistoryStateToFirestore(
    {
      "2026-08-25": {
        "w1|名詞": { word: "apple", partOfSpeech: "名詞", pronunciation: "○", meaning: "○", lastJudgedAt: 1000 },
        "w2|名詞": { word: "banana", partOfSpeech: "名詞", pronunciation: "○", meaning: "○", lastJudgedAt: 1200 }
      }
    },
    {
      targetUid: "uid-1",
      remoteHistoryMap: {
        "2026-08-25": {
          "w1|名詞": { word: "apple", partOfSpeech: "名詞", pronunciation: "○", meaning: "○", lastJudgedAt: 8000 },
          "w2|名詞": { word: "banana", partOfSpeech: "名詞", pronunciation: "○", meaning: "○", lastJudgedAt: 8100 }
        }
      },
      remoteUpdatedAtMs: 9000
    }
  );
  assert.strictEqual(staleHistoryResult.saved, false, "stale local history write must be skipped");

  const wordMergeScript = [
    source.match(/function createVocabularyTeacherCheckState\(overrides = \{\}\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function createVocabularySkillState\(overrides = \{\}\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyGradeValue\(entry\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function normalizeVocabularyWordRecord\(entry, index = 0\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function createVocabularyStudyState\(wordEntries = \[\]\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function createEmptyVocabularyStudyState\(\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function sanitizeVocabularyStudyState\(rawStudy\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyTeacherCheckUpdatedAtForField\(entry, fieldName\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyEntryLatestUpdatedAt\(entry\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function mergeVocabularyTodayHistoryMapByLatest\(baseMap, incomingMap\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyStudyLearnedCount\(studyState\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyStudyMostRecentUpdatedAt\(studyState\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyTodayHistoryCount\(historyMap, dateKey = getVocabularyHistoryTodayKey\(\)\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function getVocabularyTodayHistoryMostRecentUpdatedAt\(historyMap, dateKey = getVocabularyHistoryTodayKey\(\)\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function normalizeVocabularyTodayHistoryMap\(rawMap\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function mergeVocabularyStudyStateByLatest\(baseStudyState, incomingStudyState\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function handleVocabularySyncRemoteSnapshot\(snapshot\) \{[\s\S]*?\n  \}/)?.[0],
    source.match(/function handleVocabularyTodayHistorySyncRemoteSnapshot\(snapshot\) \{[\s\S]*?\n  \}/)?.[0]
  ].filter(Boolean).join("\n");

  const wordMergeSandbox = {
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
            id: "apple",
            word: "apple",
            partOfSpeech: "名詞",
            pronunciation: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 1000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
            meaningState: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 1000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
            lastJudgedAt: 1000,
            createdAt: 1000
          }
        ],
        progressMap: {},
        session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
        gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
      },
      vocabularyTodayHistoryMap: {
        "2026-08-25": {
          "apple|名詞": { word: "apple", partOfSpeech: "名詞", pronunciation: "○", meaning: "○", lastJudgedAt: 1000 }
        }
      },
      currentScreen: "vocabularySampleScreen"
    },
    window: {
      localStorage: {
        getItem() { return null; },
        setItem() {},
        removeItem() {}
      },
      addEventListener() {},
      location: { search: "" }
    },
    getCurrentMobileFirebaseUser: () => ({ uid: "uid-1" }),
    getMobileVocabularySyncUid: () => "uid-1",
    getVocabularyRealWordBank: () => [
      { id: "apple", word: "apple", partOfSpeech: "名詞", meaning: "りんご", level: "5" },
      { id: "banana", word: "banana", partOfSpeech: "名詞", meaning: "バナナ", level: "5" }
    ],
    getMobileVocabularyTodayHistoryStorageKey: () => "mobile-vocabulary-today-history-uid-1",
    getVocabularySyncEntryLatestUpdatedAt: (targetValue) => {
      const numericValue = Number(targetValue);
      return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
    },
    sanitizeVocabularyStudyState: (rawStudy) => rawStudy && typeof rawStudy === "object" ? { ...rawStudy, entries: Array.isArray(rawStudy.entries) ? rawStudy.entries.map((entry) => ({ ...entry })) : [] } : null,
    mergeVocabularyStudyStateWithCurrentBank: (studyState) => studyState,
    getVocabularyStudyLearnedCount: (studyState) => {
      const entries = Array.isArray(studyState?.entries) ? studyState.entries : [];
      return entries.filter((entry) => Number(entry?.pronunciation?.level || 0) > 0 && Number(entry?.meaningState?.level || 0) > 0).length;
    },
    getVocabularyTodayHistoryCount: (historyMap, dateKey = "2026-08-25") => Object.keys((historyMap && historyMap[dateKey]) || {}).length,
    getVocabularyHistoryTodayKey: () => "2026-08-25",
    saveState: () => {},
    saveMobileVocabularyStateForSync: () => {},
    saveVocabularyTodayHistoryMap: () => {},
    renderVocabularyPastHistoryScreen: () => {},
    renderVocabularyTodayHistoryScreen: () => {},
    loadMobileVocabularyStateForSync: () => null,
    clearMobileVocabularyStateForSync: () => {},
    shouldThrottleMobileVocabularySyncError: () => false,
    applyMobileVocabularySyncRateLimit: () => {},
    isMobileVocabularySyncRateLimited: () => false,
    isMobileVocabularySyncDuplicateBurst: () => false,
    isSameUidSyncCanonical: () => true,
    shouldSuppressVocabularyTodayHistoryRenderAfterReload: () => false,
    getVocabularyTodayHistoryMostRecentUpdatedAt: (historyMap, dateKey = "2026-08-25") => Object.values((historyMap && historyMap[dateKey]) || {}).reduce((maxValue, entry) => Math.max(maxValue, Number(entry?.lastJudgedAt || 0)), 0),
    getVocabularyStudyMostRecentUpdatedAt: (studyState) => {
      const entries = Array.isArray(studyState?.entries) ? studyState.entries : [];
      return entries.reduce((maxValue, entry) => Math.max(maxValue, Number(entry?.lastJudgedAt || 0), Number(entry?.createdAt || 0)), 0);
    }
  };

  vm.runInNewContext(wordMergeScript, wordMergeSandbox, { filename: "mobile-word-merge-regression.js" });

  wordMergeSandbox.handleVocabularySyncRemoteSnapshot({
    ok: true,
    exists: true,
    uid: "uid-1",
    studyState: {
      targetWordCount: 1000,
      entries: [{
        id: "banana",
        word: "banana",
        partOfSpeech: "名詞",
        pronunciation: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 5000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
        meaningState: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 5000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
        lastJudgedAt: 5000,
        createdAt: 5000
      }],
      progressMap: {},
      session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
      gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
    },
    updatedAtMs: 9000
  });

  assert.strictEqual(wordMergeSandbox.state.vocabularyStudy.entries.length, 2, "same-uid sync must retain both different words");
  assert.ok(wordMergeSandbox.state.vocabularyStudy.entries.some((entry) => String(entry.id).trim() === "apple"), "apple should stay after same-uid sync");
  assert.ok(wordMergeSandbox.state.vocabularyStudy.entries.some((entry) => String(entry.id).trim() === "banana"), "banana should be added after same-uid sync");

  wordMergeSandbox.handleVocabularyTodayHistorySyncRemoteSnapshot({
    ok: true,
    exists: true,
    uid: "uid-1",
    historyMap: {
      "2026-08-25": {
        "banana|名詞": { word: "banana", partOfSpeech: "名詞", pronunciation: "○", meaning: "○", lastJudgedAt: 5000 }
      }
    },
    updatedAtMs: 9000
  });

  assert.strictEqual(Object.keys(wordMergeSandbox.state.vocabularyTodayHistoryMap["2026-08-25"] || {}).length, 2, "same-uid history sync must retain both different word keys");
  assert.ok(Object.prototype.hasOwnProperty.call(wordMergeSandbox.state.vocabularyTodayHistoryMap["2026-08-25"] || {}, "apple|名詞"), "apple history should remain");
  assert.ok(Object.prototype.hasOwnProperty.call(wordMergeSandbox.state.vocabularyTodayHistoryMap["2026-08-25"] || {}, "banana|名詞"), "banana history should be added");

  const newerAppleState = {
    targetWordCount: 1000,
    entries: [{
      id: "apple",
      word: "apple",
      partOfSpeech: "名詞",
      pronunciation: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 1000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
      meaningState: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 1000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
      lastJudgedAt: 1000,
      createdAt: 1000
    }],
    progressMap: {},
    session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
    gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
  };

  const newerAppleRemote = {
    targetWordCount: 1000,
    entries: [{
      id: "apple",
      word: "apple",
      partOfSpeech: "名詞",
      pronunciation: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 2000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
      meaningState: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 2000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
      lastJudgedAt: 2000,
      createdAt: 2000
    }],
    progressMap: {},
    session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
    gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
  };

  const mergedApple = wordMergeSandbox.mergeVocabularyStudyStateByLatest(newerAppleState, newerAppleRemote);
  assert.strictEqual(mergedApple.entries.length, 1, "same-word merge should keep one entry");
  assert.strictEqual(Number(mergedApple.entries[0].lastJudgedAt || 0), 2000, "newer same-word judgment should win");

  const uidGuardSandbox = {
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
        entries: [{
          id: "apple",
          word: "apple",
          partOfSpeech: "名詞",
          pronunciation: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 1000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
          meaningState: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 1000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
          lastJudgedAt: 1000,
          createdAt: 1000
        }],
        progressMap: {},
        session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
        gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
      },
      vocabularyTodayHistoryMap: {
        "2026-08-25": {
          "apple|名詞": { word: "apple", partOfSpeech: "名詞", pronunciation: "○", meaning: "○", lastJudgedAt: 1000 }
        }
      },
      currentScreen: "vocabularySampleScreen"
    },
    window: {
      localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
      addEventListener() {},
      location: { search: "" }
    },
    getCurrentMobileFirebaseUser: () => ({ uid: "uid-parent" }),
    getMobileVocabularySyncUid: () => "uid-parent",
    getVocabularyRealWordBank: () => [{ id: "apple", word: "apple", partOfSpeech: "名詞", meaning: "りんご", level: "5" }, { id: "banana", word: "banana", partOfSpeech: "名詞", meaning: "バナナ", level: "5" }],
    getMobileVocabularyTodayHistoryStorageKey: () => "mobile-vocabulary-today-history-uid-parent",
    sanitizeVocabularyStudyState: (rawStudy) => rawStudy && typeof rawStudy === "object" ? { ...rawStudy, entries: Array.isArray(rawStudy.entries) ? rawStudy.entries.map((entry) => ({ ...entry })) : [] } : null,
    mergeVocabularyStudyStateWithCurrentBank: (studyState) => studyState,
    getVocabularyStudyLearnedCount: (studyState) => (Array.isArray(studyState?.entries) ? studyState.entries.length : 0),
    getVocabularyHistoryTodayKey: () => "2026-08-25",
    getVocabularyTodayHistoryCount: (historyMap, dateKey = "2026-08-25") => Object.keys((historyMap && historyMap[dateKey]) || {}).length,
    saveState: () => {},
    saveMobileVocabularyStateForSync: () => {},
    saveVocabularyTodayHistoryMap: () => {},
    renderVocabularyPastHistoryScreen: () => {},
    renderVocabularyTodayHistoryScreen: () => {},
    loadMobileVocabularyStateForSync: () => null,
    clearMobileVocabularyStateForSync: () => {},
    shouldThrottleMobileVocabularySyncError: () => false,
    applyMobileVocabularySyncRateLimit: () => {},
    isMobileVocabularySyncRateLimited: () => false,
    isMobileVocabularySyncDuplicateBurst: () => false,
    isSameUidSyncCanonical: (uid) => String(uid || "").trim() === "uid-parent",
    shouldSuppressVocabularyTodayHistoryRenderAfterReload: () => false,
    getVocabularyTodayHistoryMostRecentUpdatedAt: (historyMap, dateKey = "2026-08-25") => Object.values((historyMap && historyMap[dateKey]) || {}).reduce((maxValue, entry) => Math.max(maxValue, Number(entry?.lastJudgedAt || 0)), 0),
    getVocabularyStudyMostRecentUpdatedAt: (studyState) => {
      const entries = Array.isArray(studyState?.entries) ? studyState.entries : [];
      return entries.reduce((maxValue, entry) => Math.max(maxValue, Number(entry?.lastJudgedAt || 0), Number(entry?.createdAt || 0)), 0);
    }
  };

  vm.runInNewContext(wordMergeScript, uidGuardSandbox, { filename: "mobile-uid-guard-regression.js" });

  uidGuardSandbox.handleVocabularySyncRemoteSnapshot({
    ok: true,
    exists: true,
    uid: "uid-son",
    studyState: {
      targetWordCount: 1000,
      entries: [{
        id: "banana",
        word: "banana",
        partOfSpeech: "名詞",
        pronunciation: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 3000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
        meaningState: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 3000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
        lastJudgedAt: 3000,
        createdAt: 3000
      }],
      progressMap: {},
      session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
      gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
    },
    updatedAtMs: 4000
  });

  uidGuardSandbox.handleVocabularyTodayHistorySyncRemoteSnapshot({
    ok: true,
    exists: true,
    uid: "uid-son",
    historyMap: {
      "2026-08-25": {
        "banana|名詞": { word: "banana", partOfSpeech: "名詞", pronunciation: "○", meaning: "○", lastJudgedAt: 3000 }
      }
    },
    updatedAtMs: 4000
  });

  assert.strictEqual(uidGuardSandbox.state.vocabularyStudy.entries.length, 1, "different UID study data must not be merged into parent state");
  assert.strictEqual(Object.keys(uidGuardSandbox.state.vocabularyTodayHistoryMap["2026-08-25"] || {}).length, 1, "different UID history data must not be merged into parent history");
  assert.strictEqual(uidGuardSandbox.state.vocabularyStudy.entries[0].id, "apple", "parent study keeps only its own apple entry");
  assert.ok(Object.prototype.hasOwnProperty.call(uidGuardSandbox.state.vocabularyTodayHistoryMap["2026-08-25"] || {}, "apple|名詞"), "parent history keeps only its own apple history");

  const sameUidDifferentWordSandbox = {
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
        entries: [{
          id: "apple",
          word: "apple",
          partOfSpeech: "名詞",
          pronunciation: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 1000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
          meaningState: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 1000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
          lastJudgedAt: 1000,
          createdAt: 1000
        }],
        progressMap: {},
        session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
        gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
      },
      vocabularyTodayHistoryMap: {
        "2026-08-25": {
          "apple|名詞": { word: "apple", partOfSpeech: "名詞", pronunciation: "○", meaning: "○", lastJudgedAt: 1000 }
        }
      },
      currentScreen: "vocabularySampleScreen"
    },
    window: {
      localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
      addEventListener() {},
      location: { search: "" }
    },
    getCurrentMobileFirebaseUser: () => ({ uid: "uid-1" }),
    getMobileVocabularySyncUid: () => "uid-1",
    getVocabularyRealWordBank: () => [{ id: "apple", word: "apple", partOfSpeech: "名詞", meaning: "りんご", level: "5" }, { id: "banana", word: "banana", partOfSpeech: "名詞", meaning: "バナナ", level: "5" }],
    getMobileVocabularyTodayHistoryStorageKey: () => "mobile-vocabulary-today-history-uid-1",
    sanitizeVocabularyStudyState: (rawStudy) => rawStudy && typeof rawStudy === "object" ? { ...rawStudy, entries: Array.isArray(rawStudy.entries) ? rawStudy.entries.map((entry) => ({ ...entry })) : [] } : null,
    mergeVocabularyStudyStateWithCurrentBank: (studyState) => studyState,
    getVocabularyStudyLearnedCount: (studyState) => (Array.isArray(studyState?.entries) ? studyState.entries.length : 0),
    getVocabularyHistoryTodayKey: () => "2026-08-25",
    getVocabularyTodayHistoryCount: (historyMap, dateKey = "2026-08-25") => Object.keys((historyMap && historyMap[dateKey]) || {}).length,
    saveState: () => {},
    saveMobileVocabularyStateForSync: () => {},
    saveVocabularyTodayHistoryMap: () => {},
    renderVocabularyPastHistoryScreen: () => {},
    renderVocabularyTodayHistoryScreen: () => {},
    loadMobileVocabularyStateForSync: () => null,
    clearMobileVocabularyStateForSync: () => {},
    shouldThrottleMobileVocabularySyncError: () => false,
    applyMobileVocabularySyncRateLimit: () => {},
    isMobileVocabularySyncRateLimited: () => false,
    isMobileVocabularySyncDuplicateBurst: () => false,
    isSameUidSyncCanonical: () => true,
    shouldSuppressVocabularyTodayHistoryRenderAfterReload: () => false,
    getVocabularyTodayHistoryMostRecentUpdatedAt: (historyMap, dateKey = "2026-08-25") => Object.values((historyMap && historyMap[dateKey]) || {}).reduce((maxValue, entry) => Math.max(maxValue, Number(entry?.lastJudgedAt || 0)), 0),
    getVocabularyStudyMostRecentUpdatedAt: (studyState) => {
      const entries = Array.isArray(studyState?.entries) ? studyState.entries : [];
      return entries.reduce((maxValue, entry) => Math.max(maxValue, Number(entry?.lastJudgedAt || 0), Number(entry?.createdAt || 0)), 0);
    }
  };

  vm.runInNewContext(wordMergeScript, sameUidDifferentWordSandbox, { filename: "mobile-sameuid-differentword-regression.js" });

  sameUidDifferentWordSandbox.handleVocabularySyncRemoteSnapshot({
    ok: true,
    exists: true,
    uid: "uid-1",
    studyState: {
      targetWordCount: 1000,
      entries: [{
        id: "banana",
        word: "banana",
        partOfSpeech: "名詞",
        pronunciation: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 2000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
        meaningState: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 2000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
        lastJudgedAt: 2000,
        createdAt: 2000
      }],
      progressMap: {},
      session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
      gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
    },
    updatedAtMs: 3000
  });

  sameUidDifferentWordSandbox.handleVocabularyTodayHistorySyncRemoteSnapshot({
    ok: true,
    exists: true,
    uid: "uid-1",
    historyMap: {
      "2026-08-25": {
        "banana|名詞": { word: "banana", partOfSpeech: "名詞", pronunciation: "○", meaning: "○", lastJudgedAt: 2000 }
      }
    },
    updatedAtMs: 3000
  });

  assert.strictEqual(sameUidDifferentWordSandbox.state.vocabularyStudy.entries.length, 2, "same-uid sync must keep apple and banana after both completions");
  assert.deepStrictEqual(sameUidDifferentWordSandbox.state.vocabularyStudy.entries.map((entry) => String(entry.id).trim()).sort(), ["apple", "banana"], "same-uid sync must retain both words");
  assert.strictEqual(Object.keys(sameUidDifferentWordSandbox.state.vocabularyTodayHistoryMap["2026-08-25"] || {}).length, 2, "same-uid history sync must keep both apple and banana today-history entries");

  const sameWordTimestampSandbox = {
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
    state: { vocabularyStudy: null },
    getVocabularyRealWordBank: () => [{ id: "apple", word: "apple", partOfSpeech: "名詞", meaning: "りんご", level: "5" }]
  };

  vm.runInNewContext(wordMergeScript, sameWordTimestampSandbox, { filename: "mobile-sameword-fieldtimestamp-regression.js" });

  const localSameWordState = {
    targetWordCount: 1000,
    entries: [{
      id: "apple",
      word: "apple",
      partOfSpeech: "名詞",
      pronunciation: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 1000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
      meaningState: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 1000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
      lastJudgedAt: 1000,
      createdAt: 1000
    }],
    progressMap: {},
    session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
    gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
  };

  const remoteSameWordState = {
    targetWordCount: 1000,
    entries: [{
      id: "apple",
      word: "apple",
      partOfSpeech: "名詞",
      pronunciation: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 2000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
      meaningState: { level: 1, lastSelfResult: "ok", lastSelfJudgedAt: 3000, teacherCheckState: { pronunciation: "none", meaning: "none" } },
      lastJudgedAt: 3000,
      createdAt: 3000
    }],
    progressMap: {},
    session: { questionCount: 0, failedWordIds: [], recentFailedWordIds: [] },
    gradeSummary: { 5: { total: 0, mastered: 0 }, 4: { total: 0, mastered: 0 }, 3: { total: 0, mastered: 0 } }
  };

  const mergedSameWord = sameWordTimestampSandbox.mergeVocabularyStudyStateByLatest(localSameWordState, remoteSameWordState);
  assert.strictEqual(mergedSameWord.entries.length, 1, "same-word merge must keep a single apple entry");
  assert.strictEqual(Number(mergedSameWord.entries[0].pronunciation.lastSelfJudgedAt || 0), 2000, "newer pronunciation judgment must win");
  assert.strictEqual(Number(mergedSameWord.entries[0].meaningState.lastSelfJudgedAt || 0), 3000, "newer meaning judgment must win");

  console.log("mobile vocabulary stale local save regression checks passed");
  console.log("mobile vocabulary stale-firebase rollback regression checks passed");
  console.log("No.175 same-uid merge, same-word newer-field merge, and different-uid isolation checks passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
