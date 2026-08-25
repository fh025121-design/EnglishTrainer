const fs = require('fs');
const vm = require('vm');
const source = fs.readFileSync('mobile/mobile.js', 'utf8');
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
].filter(Boolean).join('\n');
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
  state: {
    vocabularyStudy: {
      targetWordCount: 1000,
      entries: [{id:'apple', word:'apple', partOfSpeech:'–¼ŽŒ', pronunciation:{level:1,lastSelfResult:'ok',lastSelfJudgedAt:1000,teacherCheckState:{pronunciation:'none',meaning:'none'}}, meaningState:{level:1,lastSelfResult:'ok',lastSelfJudgedAt:1000,teacherCheckState:{pronunciation:'none',meaning:'none'}}, lastJudgedAt:1000, createdAt:1000}],
      progressMap: {},
      session: { questionCount:0, failedWordIds:[], recentFailedWordIds:[] },
      gradeSummary: {5:{total:0, mastered:0}, 4:{total:0, mastered:0}, 3:{total:0, mastered:0}}
    },
    vocabularyTodayHistoryMap: {'2026-08-25': {'apple|–¼ŽŒ': {word:'apple', partOfSpeech:'–¼ŽŒ', pronunciation:'›', meaning:'›', lastJudgedAt:1000}}},
    currentScreen: 'vocabularySampleScreen'
  },
  window: { localStorage: { getItem(){return null;}, setItem(){}, removeItem(){} }, addEventListener(){}, location:{search:''} },
  getCurrentMobileFirebaseUser: () => ({ uid: 'uid-1' }),
  getMobileVocabularySyncUid: () => 'uid-1',
  getVocabularyRealWordBank: () => [{ id:'apple', word:'apple', partOfSpeech:'–¼ŽŒ', meaning:'‚è‚ñ‚²', level:'5' }, { id:'banana', word:'banana', partOfSpeech:'–¼ŽŒ', meaning:'ƒoƒiƒi', level:'5' }],
  getMobileVocabularyTodayHistoryStorageKey: () => 'mobile-vocabulary-today-history-uid-1',
  getVocabularySyncEntryLatestUpdatedAt: (targetValue) => { const numericValue = Number(targetValue); return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0; },
  sanitizeVocabularyStudyState: (rawStudy) => rawStudy && typeof rawStudy === 'object' ? { ...rawStudy, entries: Array.isArray(rawStudy.entries) ? rawStudy.entries.map((entry) => ({ ...entry })) : [] } : null,
  mergeVocabularyStudyStateWithCurrentBank: (studyState) => studyState,
  getVocabularyStudyLearnedCount: (studyState) => Array.isArray(studyState?.entries) ? studyState.entries.filter((entry) => Number(entry?.pronunciation?.level || 0) > 0 && Number(entry?.meaningState?.level || 0) > 0).length : 0,
  getVocabularyTodayHistoryCount: (historyMap, dateKey = '2026-08-25') => Object.keys((historyMap && historyMap[dateKey]) || {}).length,
  getVocabularyHistoryTodayKey: () => '2026-08-25',
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
  getVocabularyTodayHistoryMostRecentUpdatedAt: (historyMap, dateKey = '2026-08-25') => Object.values((historyMap && historyMap[dateKey]) || {}).reduce((maxValue, entry) => Math.max(maxValue, Number(entry?.lastJudgedAt || 0)), 0),
  getVocabularyStudyMostRecentUpdatedAt: (studyState) => {
    const entries = Array.isArray(studyState?.entries) ? studyState.entries : [];
    return entries.reduce((maxValue, entry) => Math.max(maxValue, Number(entry?.lastJudgedAt || 0), Number(entry?.createdAt || 0)), 0);
  }
};
vm.runInNewContext(wordMergeScript, sandbox, { filename:'mobile-word-merge-regression.js' });
sandbox.handleVocabularySyncRemoteSnapshot({
  ok: true,
  exists: true,
  uid: 'uid-1',
  studyState: {
    targetWordCount: 1000,
    entries: [{
      id: 'banana',
      word: 'banana',
      partOfSpeech: '–¼ŽŒ',
      pronunciation: { level:1, lastSelfResult:'ok', lastSelfJudgedAt:5000, teacherCheckState:{ pronunciation:'none', meaning:'none' } },
      meaningState: { level:1, lastSelfResult:'ok', lastSelfJudgedAt:5000, teacherCheckState:{ pronunciation:'none', meaning:'none' } },
      lastJudgedAt: 5000,
      createdAt: 5000
    }],
    progressMap: {},
    session: { questionCount:0, failedWordIds:[], recentFailedWordIds:[] },
    gradeSummary: {5:{total:0, mastered:0}, 4:{total:0, mastered:0}, 3:{total:0, mastered:0}}
  },
  updatedAtMs: 9000
});
console.log('study ids', sandbox.state.vocabularyStudy.entries.map((entry) => String(entry.id).trim()).sort());
console.log('history keys', Object.keys(sandbox.state.vocabularyTodayHistoryMap['2026-08-25'] || {}));
