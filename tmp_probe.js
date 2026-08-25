const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, 'mobile', 'mobile.js'), 'utf8');
const handleMatch = source.match(/async function handleVocabularySampleChoice\(kind, value\) \{[\s\S]*?\n  \}/);
if (!handleMatch) throw new Error('handler not found');

const sharedState = { vocabularySample: null, vocabularyStudy: null, vocabularyTodayHistoryMap: {} };
let continueVocabularySampleCallCount = 0;
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
    location: { search: '' }
  },
  getVocabularyRealWordBank: () => [{ id: 'w1', word: 'apple', partOfSpeech: '名詞', meaning: 'りんご', grade: '5' }],
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
  getVocabularyHistoryTodayKey: () => '2026-08-25',
  getVocabularyHistoryWordKey: (wordItem) => `${String(wordItem?.id || wordItem?.word || '').trim()}|${String(wordItem?.partOfSpeech || '').trim()}`,
  recordVocabularySampleHistoryJudgment: (wordItem, kind, value) => {
    const todayKey = sandbox.getVocabularyHistoryTodayKey();
    const wordKey = sandbox.getVocabularyHistoryWordKey(wordItem);
    const bucket = sharedState.vocabularyTodayHistoryMap[todayKey] || {};
    const entry = bucket[wordKey] || {
      word: wordItem.word,
      partOfSpeech: wordItem.partOfSpeech || '名詞',
      pronunciation: '—',
      meaning: '—',
      lastJudgedAt: 0
    };
    entry[kind] = value === 'ok' ? '○' : '△';
    entry.lastJudgedAt = Date.now();
    bucket[wordKey] = entry;
    sharedState.vocabularyTodayHistoryMap[todayKey] = bucket;
    return true;
  },
  updateVocabularyStudyEntryAfterJudgment: (wordItem, kind, value) => {
    if (!sharedState.vocabularyStudy) sharedState.vocabularyStudy = sandbox.buildVocabularyRealStudyState();
    const normalizedId = String(wordItem.id || wordItem.word || '').trim();
    const entry = sharedState.vocabularyStudy.entries.find((candidate) => String(candidate.id) === normalizedId) || {
      id: normalizedId,
      word: wordItem.word,
      partOfSpeech: wordItem.partOfSpeech || '名詞',
      pronunciation: { level: 0 },
      meaningState: { level: 0 }
    };
    if (!sharedState.vocabularyStudy.entries.some((candidate) => String(candidate.id) === normalizedId)) sharedState.vocabularyStudy.entries.push(entry);
    const target = kind === 'meaning' ? entry.meaningState : entry.pronunciation;
    target.level = value === 'ok' ? 1 : 1;
    return entry;
  },
  getVocabularySampleCompletedWordIds: (sample = sharedState.vocabularySample) => {
    if (!sample || typeof sample !== 'object') return [];
    const rawIds = Array.isArray(sample.completedWordIds) ? sample.completedWordIds : [];
    return rawIds.map((wordId) => String(wordId || '').trim()).filter(Boolean);
  },
  playVocabularySampleCorrectChime: () => true,
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
      .filter((entry) => entry && String(entry.word || '').trim())
      .filter((entry) => String(entry.pronunciation || '—').trim() !== '—' && String(entry.meaning || '—').trim() !== '—');
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

vm.runInNewContext(handleMatch[0], sandbox, { filename: 'mobile-vocabulary-sample-flow.js' });

async function runSequence(label, words, steps) {
  sharedState.vocabularyStudy = sandbox.buildVocabularyRealStudyState();
  sharedState.vocabularySample = {
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
  sharedState.vocabularyTodayHistoryMap = {};
  continueVocabularySampleCallCount = 0;
  console.log('--- ' + label + ' start');
  for (const [kind, value] of steps) {
    console.log('before', kind, value, JSON.stringify({
      index: sharedState.vocabularySample.index,
      completedWordCount: sharedState.vocabularySample.completedWordCount,
      completedWordIds: sharedState.vocabularySample.completedWordIds,
      map: sharedState.vocabularyTodayHistoryMap,
      visible: sandbox.getVocabularyTodayHistoryEntries()
    }));
    await sandbox.handleVocabularySampleChoice(kind, value);
    console.log('after ', kind, value, JSON.stringify({
      index: sharedState.vocabularySample.index,
      completedWordCount: sharedState.vocabularySample.completedWordCount,
      completedWordIds: sharedState.vocabularySample.completedWordIds,
      map: sharedState.vocabularyTodayHistoryMap,
      visible: sandbox.getVocabularyTodayHistoryEntries(),
      continueCalls: continueVocabularySampleCallCount
    }));
  }
}

(async () => {
  await runSequence('apple+banana', [
    { id: 'apple', word: 'apple', partOfSpeech: '名詞', meaning: 'りんご' },
    { id: 'banana', word: 'banana', partOfSpeech: '名詞', meaning: 'バナナ' }
  ], [
    ['pronunciation', 'ok'],
    ['meaning', 'ng'],
    ['pronunciation', 'ng'],
    ['meaning', 'ok']
  ]);
})();
