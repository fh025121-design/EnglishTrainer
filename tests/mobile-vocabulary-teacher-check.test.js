const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "mobile", "index.html"), "utf8");

function makeTeacherCheckSandbox() {
  const realBank = [
    { id: "w1", word: "apple", partOfSpeech: "名詞", meaning: "りんご", level: "5" },
    { id: "w2", word: "banana", partOfSpeech: "名詞", meaning: "バナナ", level: "5" },
    { id: "w3", word: "cherry", partOfSpeech: "名詞", meaning: "さくらんぼ", level: "5" },
    { id: "w4", word: "date", partOfSpeech: "名詞", meaning: "日付", level: "5" },
    { id: "w5", word: "elderberry", partOfSpeech: "名詞", meaning: "エルダーベリー", level: "5" }
  ];
  const state = {
    settings: { startDay: 1, endDay: 30, speechRateMode: "slow" },
    wordLearningState: {},
    teacherCheckSession: { completedCandidateIds: ["w1", "w2", "w3", "w4"], decisions: {}, showMeaningIds: [], candidates: [] },
    vocabularyStudy: { entries: [] },
    speakingUi: {
      startDay: 1,
      endDay: 7,
      selectedConversationWeekId: "week1",
      speakingWordSelectedWeekId: "week1",
      speakingWordSelectedDayKey: "week1-day1",
      vocabularyRangeMode: "auto"
    }
  };
  realBank.forEach((entry) => {
    state.wordLearningState[entry.id] = {
      wordId: entry.id,
      pronunciationStatus: "○",
      meaningStatus: "○",
      lastSelfResult: "ok",
      lastStudiedAt: 1000,
      questionCount: 1,
      perfectPairCount: 0,
      isMastered: false,
      learningStateStatus: "learning"
    };
  });
  const nullElement = () => ({
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
    cloneNode() { return nullElement(); },
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
  const documentStub = {
    getElementById() { return nullElement(); },
    querySelector() { return nullElement(); },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
    createElement() { return nullElement(); },
    body: { classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } }
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
    Audio: function () { return { play() { return Promise.resolve(); } }; },
    window: {
      state,
      MOBILE_VOCABULARY_REAL_WORD_BANK: realBank,
      localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
      document: documentStub,
      location: { search: "" },
      navigator: { userAgent: "node" },
      addEventListener() {},
      removeEventListener() {}
    },
    document: documentStub,
    getVocabularyRealWordBank: () => realBank,
    getCurrentMobileFirebaseUser: () => ({ uid: "u1" }),
    saveWordLearningStateForSync: () => {},
    saveState: () => {},
    saveMobileVocabularyStateForSync: () => {},
    scheduleMobileVocabularySync: () => {},
    renderVocabularyPastHistoryScreen: () => {},
    showScreen: () => {},
    buildVocabularyRealStudyState: () => ({ entries: [] }),
    mergeVocabularyStudyStateWithCurrentBank: () => ({ entries: [] }),
    getMobileVocabularySyncUid: () => "u1"
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: "mobile.js" });
  return sandbox;
}

const checks = [
  {
    name: "teacher check screen exists in page and app logic",
    ok: /vocabularyTeacherCheckScreen/.test(html) && /teacherCheck/.test(source)
  },
  {
    name: "teacher check uses the exclusive three-category model and the auto priority order",
    ok: /getVocabularyTeacherCheckSummaryCounts\s*\(/.test(source)
      && /unconfirmed.*delta.*checked/.test(source)
      && /\[\s*おまかせ\s*\]/.test(source)
      && !/全単語から/.test(source)
  },
  {
    name: "teacher check no-candidate state is explicit and screen is single-item review rather than count-based paging",
    ok: /先生チェック対象の単語はありません/.test(source)
      && /pageSize\s*=\s*1/.test(source)
      && !/次の10問/.test(source)
      && !/チェック語数/.test(source)
  },
  {
    name: "teacher check decisions remain draft-only until the single-item flow advances",
    ok: /teacherCheckSession/.test(source)
      && /session\.decisions/.test(source)
      && /pageIndex/.test(source)
      && /次へ/.test(source)
  },
  {
    name: "teacher check screen supports audio, dual selection buttons, and meaning toggle state",
    ok: /🔊/.test(source)
      && /発音[\s\S]*◎[\s\S]*△/.test(source)
      && /意味[\s\S]*◎[\s\S]*△/.test(source)
      && /showMeaningIds/.test(source)
  },
  {
    name: "teacher check uses stable per-candidate IDs and keeps the selection list exclusive by bucket",
    ok: /data-teacher-check-id/.test(source)
      && /meaning-toggle/.test(source)
      && /bucket\s*===\s*"unconfirmed"/.test(source)
      && /bucket\s*===\s*"delta"/.test(source)
  },
  {
    name: "teacher check completion still persists the finalized state and syncs it",
    ok: /saveState\(\)/.test(source)
      && /saveMobileVocabularyStateForSync\(state\.vocabularyStudy/.test(source)
      && /scheduleMobileVocabularySync\(\)/.test(source)
  },
  {
    name: "teacher check no longer exposes count-based setup controls at all",
    ok: !/10語/.test(source)
      && !/20語/.test(source)
      && !/全件/.test(source)
      && !/チェック語数/.test(source)
  },
  {
    name: "teacher check keeps the newest status update and the manual review sequence",
    ok: /teacherCheckUpdatedAt/.test(source)
      && /pronunciationTeacherCheckUpdatedAt/.test(source)
      && /meaningTeacherCheckUpdatedAt/.test(source)
      && /次へ/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

const reproductionSandbox = makeTeacherCheckSandbox();
const staleCompletedIds = ["w1", "w2", "w3", "w4"];
const freshWordLearningState = Object.fromEntries(
  reproductionSandbox.window.MOBILE_VOCABULARY_REAL_WORD_BANK.map((entry) => [
    entry.id,
    {
      wordId: entry.id,
      pronunciationStatus: "○",
      meaningStatus: "○",
      lastSelfResult: "ok",
      lastStudiedAt: 1000,
      questionCount: 1,
      perfectPairCount: 0,
      isMastered: false,
      learningStateStatus: "learning"
    }
  ])
);
reproductionSandbox.window.state.wordLearningState = freshWordLearningState;
const possibleCandidates = reproductionSandbox.window.getVocabularyTeacherCheckCandidates();
assert.strictEqual(possibleCandidates.length, 5, "the canonical wordLearningState source contains five teacher-check candidates");

reproductionSandbox.window.state.teacherCheckSession = {
  candidates: [],
  decisions: {},
  showMeaningIds: [],
  completedCandidateIds: staleCompletedIds,
  pageIndex: 0
};
reproductionSandbox.window.openVocabularyTeacherCheckScreen();
assert.strictEqual(reproductionSandbox.window.state.teacherCheckSession.candidates.length, 5, "opening a fresh teacher-check session clears stale completion IDs before rebuilding candidates");

const sixtyFiveSandbox = makeTeacherCheckSandbox();
const fortyFiveWordState = Object.fromEntries(
  Array.from({ length: 55 }, (_, index) => {
    const wordId = `w${index + 1}`;
    return [wordId, {
      wordId,
      pronunciationStatus: "○",
      meaningStatus: "○",
      lastSelfResult: "ok",
      lastStudiedAt: 1000 + index,
      questionCount: 1,
      perfectPairCount: 0,
      isMastered: false,
      learningStateStatus: "learning"
    }];
  })
);
sixtyFiveSandbox.window.state.wordLearningState = fortyFiveWordState;
const noCapCandidates = sixtyFiveSandbox.window.getVocabularyTeacherCheckCandidates();
assert.strictEqual(noCapCandidates.length, 55, "candidate extraction returns the full matching candidate set without a 50-word cap");
sixtyFiveSandbox.window.state.teacherCheckSession = { candidates: [], decisions: {}, showMeaningIds: [], completedCandidateIds: [], pageIndex: 0 };
sixtyFiveSandbox.window.state.teacherCheckSession.candidates = sixtyFiveSandbox.window.buildVocabularyTeacherCheckCandidates(sixtyFiveSandbox.window.state.teacherCheckSession);
assert.strictEqual(sixtyFiveSandbox.window.state.teacherCheckSession.candidates.length, 55, "session candidates also include the full matching set without a 50-word cap");

const categorySandbox = makeTeacherCheckSandbox();
categorySandbox.window.state.wordLearningState = {
  w1: { wordId: "w1", pronunciationStatus: "○", meaningStatus: "○", lastSelfResult: "ok", lastStudiedAt: 1000, questionCount: 1, perfectPairCount: 0, isMastered: false, learningStateStatus: "learning" },
  w2: { wordId: "w2", pronunciationStatus: "○", meaningStatus: "△", lastSelfResult: "ok", lastStudiedAt: 1000, questionCount: 1, perfectPairCount: 0, isMastered: false, learningStateStatus: "learning" },
  w3: { wordId: "w3", pronunciationStatus: "△", meaningStatus: "○", lastSelfResult: "ok", lastStudiedAt: 1000, questionCount: 1, perfectPairCount: 0, isMastered: false, learningStateStatus: "learning" },
  w4: { wordId: "w4", pronunciationStatus: "◎", meaningStatus: "△", lastSelfResult: "ok", lastStudiedAt: 1000, questionCount: 1, perfectPairCount: 0, isMastered: false, learningStateStatus: "learning" },
  w5: { wordId: "w5", pronunciationStatus: "△", meaningStatus: "◎", lastSelfResult: "ok", lastStudiedAt: 1000, questionCount: 1, perfectPairCount: 0, isMastered: false, learningStateStatus: "learning" },
  w6: { wordId: "w6", pronunciationStatus: "◎", meaningStatus: "◎", lastSelfResult: "ok", lastStudiedAt: 1000, questionCount: 1, perfectPairCount: 0, isMastered: false, learningStateStatus: "learning" },
  w7: { wordId: "w7", pronunciationStatus: "◎", meaningStatus: "○", lastSelfResult: "ok", lastStudiedAt: 1000, questionCount: 1, perfectPairCount: 0, isMastered: false, learningStateStatus: "learning" }
};
const categoryCounts = categorySandbox.window.getVocabularyTeacherCheckSummaryCounts();
assert.deepStrictEqual({ ...categoryCounts }, { unconfirmed: 2, delta: 4, checked: 1 }, "three exclusive teacher-check categories should be counted from the canonical state");
assert.deepStrictEqual(categorySandbox.window.getVocabularyTeacherCheckCandidates("unconfirmed").map((entry) => entry.id), ["w1", "w7"], "unconfirmed mode should only include the ○-only bucket without overlap");
assert.deepStrictEqual(categorySandbox.window.getVocabularyTeacherCheckCandidates("delta").map((entry) => entry.id), ["w2", "w3", "w4", "w5"], "delta mode should only include the △ bucket without overlap");
assert.deepStrictEqual(categorySandbox.window.getVocabularyTeacherCheckCandidates("checked").map((entry) => entry.id), ["w6"], "checked mode should only include ◎◎");
assert.ok(/次へ/.test(source), "the teacher-check flow should use a single-question next action");
assert.ok(!/次の10問/.test(source), "the old count-based next label should be removed");
assert.ok(!/全単語から/.test(source), "the old all-words start option should be removed from the setup screen");
console.log(`mobile vocabulary teacher check checks passed (${checks.length + 6})`);
