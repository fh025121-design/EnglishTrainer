const fs = require('fs');
const vm = require('vm');
const appCode = fs.readFileSync(require('path').join(__dirname, 'app.js'), 'utf8')
  .replace(/\ninit\(\);\s*$/, '\n');
const createModalElement = () => ({
  classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
  setAttribute() {},
  getAttribute() { return null; },
  addEventListener() {},
  textContent: '',
  value: '',
  innerHTML: ''
});
const documentStub = {
  body: { dataset: {} },
  getElementById(id) {
    const map = {
      gameTicketModal: createModalElement(),
      gameTicketTitle: createModalElement(),
      gameTicketMinutesText: createModalElement(),
      gameTicketBodyText: createModalElement(),
      gameTicketIntroText: createModalElement(),
      gameTicketThirtyPoster: createModalElement(),
      gameTicketPosterValue: createModalElement(),
      gameTicketPosterTicketValue: createModalElement(),
      gameTicketPosterCaption: createModalElement(),
      challengeTicketChanceModal: createModalElement(),
      challengeTicketChanceStartBtn: createModalElement(),
      trainingCompleteScreen: createModalElement(),
      homeScreen: createModalElement(),
      exchangeTicketScreen: createModalElement()
    };
    return map[id] || null;
  },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  addEventListener() {}
};
const context = {
  window: {
    ENGLISH_TRAINER_RELEASE_INFO: { releaseHistory: [] },
    PcFirebaseAuthState: { status: 'logged-out', user: null },
    innerWidth: 1200,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(callback) { callback && callback(); return 0; },
    getFirebaseCurrentUser() { return null; },
    watchFamilyDocument() { return () => {}; },
    watchLearningHistoryEntriesFromFirestore() { return () => {}; },
    loadPointStateFromFirestore: async () => ({ exists: false, data: null }),
    savePointStateToFirestore: async () => true,
    loadGameTicketsFromFirestore: async () => ({ exists: false, data: null }),
    saveGameTicketsToFirestore: async () => true,
    loadStudyCoreFromFirestore: async () => ({ exists: false, data: null }),
    saveStudyCoreToFirestore: async () => true,
    deleteStudyCoreBackupFromFirestore: async () => true,
    loadStudyCoreBackupsFromFirestore: async () => ({ backups: [] })
  },
  document: documentStub,
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  console,
  Date,
  setTimeout,
  clearTimeout,
  navigator: { userAgent: 'node' },
  location: { href: 'http://localhost/' }
};
context.globalThis = context;
context.window.globalThis = context;
vm.createContext(context);
vm.runInContext(appCode, context, { filename: 'app.js' });

const persistableState = {
  settings: {
    gameTicketConfig: {
      normalRules: [],
      events: [{
        id: 'challenge-seq-1',
        name: '連続正解チャレンジ',
        type: 'consecutiveCorrect',
        targetTraining: 'challenge',
        threshold: 100,
        enabled: true,
        startImage: '',
        maxQuestions: 5,
        rewardMinutes: 5,
        outcomes: []
      }],
      dailyGrantCapByMinutes: { 5: 20, 15: 20, 30: 10, 60: 10 },
      challengeAnnouncementImage: '',
      eventStartImages: {},
      ticketImages: { 30: '', 60: '' },
      modeLabels: { challenge: '過去の間違い', weakFocus: '苦手特訓', other: 'その他の特訓' },
      dailyCap: 2
    }
  },
  stats: {
    completedSessions: [],
    dailyPerformanceByDate: {},
    studyTimeByDate: {},
    dailyStatsByDate: {},
    previousSessionWeakQuestionIds: [],
    pendingSessionNotice: '',
    unlockedDayMax: 1,
    gameTickets: context.createDefaultGameTicketStats(),
    trainingProfiles: context.createDefaultTrainingProfiles(),
    prepositionTraining: context.createDefaultPrepositionTrainingStats(),
    normalDayProgressByDay: {},
    extraTrainingDailyCounter: context.createDefaultExtraTrainingDailyCounter()
  },
  review: { records: {} },
  items: context.buildVocabularyItems(),
  session: null
};
context.state = persistableState;

context.showGameTicketModal({ id: 'reward-dup-1', minutes: 30, type: 'random' });
context.showGameTicketModal({ id: 'reward-dup-1', minutes: 30, type: 'random' });
const pendingReplayStore = context.ensureGameTicketState();
pendingReplayStore.inventory = [];
pendingReplayStore.earnedHistory = [];
pendingReplayStore.pendingRewards = [
  { id: 'reward-queued-1', minutes: 5, queuedAt: Date.now(), type: 'random' },
  { id: 'reward-queued-2', minutes: 15, queuedAt: Date.now() + 1, type: 'random' }
];
context.shownGameTicketRewardIds = new Set(['reward-queued-1']);
console.log('before set state', pendingReplayStore.shownRewardIds);
console.log('before pending', pendingReplayStore.pendingRewards.map((reward) => reward.id));
context.showPendingGameTicketModalIfAny();
console.log('after pending', pendingReplayStore.pendingRewards.map((reward) => reward.id));
console.log('after set state', pendingReplayStore.shownRewardIds);
console.log('global set', [...context.shownGameTicketRewardIds]);
