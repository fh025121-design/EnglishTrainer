const fs = require('fs');
const vm = require('vm');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, 'mobile', 'mobile.js'), 'utf8');
const realBank = [
  { id: 'w1', word: 'apple', partOfSpeech: '名詞', meaning: 'りんご', level: '5' },
  { id: 'w2', word: 'banana', partOfSpeech: '名詞', meaning: 'バナナ', level: '5' },
  { id: 'w3', word: 'cherry', partOfSpeech: '名詞', meaning: 'さくらんぼ', level: '5' }
];
const store = {};
const makeElement = () => ({
  style: {}, dataset: {}, classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
  appendChild(){}, setAttribute(){}, getAttribute(){ return null; }, querySelector(){ return null; },
  querySelectorAll(){ return []; }, addEventListener(){}, removeEventListener(){}, dispatchEvent(){ return true; },
  cloneNode(){ return makeElement(); }, focus(){}, blur(){}, click(){}, innerHTML: '', textContent: '', value: '',
  checked: false, disabled: false, options: [], selectedIndex: 0, length: 0, children: [], parentNode: null,
  closest(){ return null; }, matches(){ return false; }, contains(){ return false; }
});
const document = {
  body: { classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } } },
  getElementById(){ return makeElement(); },
  querySelector(){ return makeElement(); },
  querySelectorAll(){ return []; },
  addEventListener(){}, createElement(){ return makeElement(); }
};
const sandbox = {
  console, Date, Math, Number, String, Object, Array, Set, Map, Intl, URLSearchParams,
  Audio: function () { return { preload(){}, play(){ return Promise.resolve(); } }; },
  window: {
    localStorage: {
      getItem(key){ return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null; },
      setItem(key, value){ store[key] = String(value); },
      removeItem(key){ delete store[key]; }
    },
    addEventListener(){}, removeEventListener(){},
    location: { search: '', href: 'https://example.com/mobile/index.html' },
    document,
    MOBILE_VOCABULARY_REAL_WORD_BANK: realBank,
    ENGLISH_TRAINER_RELEASE_INFO: { releaseHistory: [{ version: 'test' }] },
    navigator: { userAgent: 'node' }
  },
  document,
  state: { wordLearningState: {}, vocabularyStudy: null, vocabularyTodayHistoryMap: {} },
  getCurrentMobileFirebaseUser: () => ({ uid: 'uid-1' }),
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
  getMobileVocabularySyncUid: () => 'uid-1'
};
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'mobile.js' });
const map = {
  w1: { wordId: 'w1', pronunciationStatus: '○', meaningStatus: '○', lastStudiedAt: 2000, questionCount: 1, perfectPairCount: 1, isMastered: false, learningStateStatus: 'learning' },
  w2: { wordId: 'w2', pronunciationStatus: '△', meaningStatus: '○', lastStudiedAt: 3000, questionCount: 2, perfectPairCount: 1, isMastered: false, learningStateStatus: 'learning' },
  w3: { wordId: 'w3', pronunciationStatus: '○', meaningStatus: '△', lastStudiedAt: 4000, questionCount: 3, perfectPairCount: 2, isMastered: false, learningStateStatus: 'learning' }
};
const sanitized = sandbox.window.sanitizeWordLearningStateMap(map);
console.log('sanitized', sanitized);
console.log('display', Object.values(sanitized).map((entry) => ({ wordId: entry.wordId, status: sandbox.window.getWordLearningStateDisplayStatus(entry) })));
console.log('progress entries', sandbox.window.getWordLearningStateProgressEntries('learning'));
console.log('list entries', sandbox.window.getVocabularyProgressListEntries('status', 'learning'));
