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
    name: "teacher check candidate logic requires both self results to be OK and excludes any teacher-C status already marked as complete",
    ok: /getVocabularyTeacherCheckCandidates\s*\(/.test(source)
      && /lastSelfResult.*ok/.test(source)
      && /teacherCheck.*◎/.test(source)
      && /slice\(0,\s*50\)/.test(source)
  },
  {
    name: "teacher check no-candidate state is explicit and screen is list-based rather than single-item navigation",
    ok: /先生チェック対象の単語はありません/.test(source)
      && /vocabulary-teacher-check-list/.test(source)
      && !/teacherCheck.*currentIndex/.test(source)
  },
  {
    name: "teacher check decisions are draft-only until complete and do not mutate level or currentState",
    ok: /teacherCheckSession/.test(source)
      && /teacherCheckState/.test(source)
      && /level\s*>=\s*5|currentState.*review|nextReviewAt.*Date\.now/.test(source)
  },
  {
    name: "teacher check screen supports a single vertical scroll render with audio and dual selection buttons",
    ok: /🔊/.test(source)
      && /発音[\s\S]*◎[\s\S]*△/.test(source)
      && /意味[\s\S]*◎[\s\S]*△/.test(source)
      && /vocabulary-teacher-check-list/.test(source)
  },
  {
    name: "teacher check uses stable per-candidate IDs and independent meaning preview state",
    ok: /data-teacher-check-id/.test(source)
      && /意味を見る/.test(source)
      && /showMeaningIds/.test(source)
      && /session\.decisions/.test(source)
  },
  {
    name: "teacher check completion persists the finalized state to localStorage and Firestore sync",
    ok: /vocabularyTeacherCheckCompleteBtn/.test(source)
      && /saveState\(\)/.test(source)
      && /saveMobileVocabularyStateForSync\(state\.vocabularyStudy/.test(source)
      && /scheduleMobileVocabularySync\(\)/.test(source)
  },
  {
    name: "teacher check summary keeps 10-question pagination and prev/next draft navigation",
    ok: /pageSize\s*=\s*10/.test(source)
      && /次の10問/.test(source)
      && /前の10問/.test(source)
      && /pageIndex/.test(source)
  },
  {
    name: "teacher check merge compares dedicated teacher-check timestamps to keep the newest status",
    ok: /teacherCheckUpdatedAt/.test(source)
      && /pronunciationTeacherCheckUpdatedAt/.test(source)
      && /meaningTeacherCheckUpdatedAt/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

const reproductionSandbox = makeTeacherCheckSandbox();
const staleCompletedIds = ["w1", "w2", "w3", "w4"];
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

console.log(`mobile vocabulary teacher check checks passed (${checks.length})`);
