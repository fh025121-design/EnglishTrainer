const fs = require('fs');
const vm = require('vm');
const appCode = fs.readFileSync('app.js', 'utf8').replace(/\ninit\(\);\s*$/, '\n');
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
      exchangeTicketScreen: createModalElement(),
      gameTicketRuleTableBody: { innerHTML: '', querySelectorAll() { return []; }, querySelector() { return null; } },
      gameTicketEventList: { innerHTML: '', querySelectorAll() { return []; }, querySelector() { return null; } },
      gameTicketAnnouncementImageInput: { replaceWith() {} },
      gameTicketThirtyImageInput: { replaceWith() {} },
      gameTicketSixtyImageInput: { replaceWith() {} },
      gameTicketDailyCap5Input: { value: '20' },
      gameTicketDailyCap15Input: { value: '20' },
      gameTicketDailyCap30Input: { value: '10' },
      gameTicketDailyCap60Input: { value: '10' }
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
    requestAnimationFrame(cb) { cb && cb(); return 0; },
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
context.state = { stats: { gameTickets: context.createDefaultGameTicketStats() } };
const store = context.ensureGameTicketState();
store.pendingRewards = [
  { id: 'reward-queued-1', minutes: 5, queuedAt: Date.now(), type: 'random' },
  { id: 'reward-queued-2', minutes: 15, queuedAt: Date.now() + 1, type: 'random' }
];
context.showGameTicketModal({ id: 'reward-dup-1', minutes: 30, type: 'random' });
context.showGameTicketModal({ id: 'reward-dup-1', minutes: 30, type: 'random' });
console.log('dup seen', context.isGameTicketRewardAlreadyShown({ id: 'reward-dup-1' }));
context.shownGameTicketRewardIds = new Set(['reward-queued-1']);
console.log('before', store.pendingRewards.map((r) => r.id));
context.showPendingGameTicketModalIfAny();
console.log('after', store.pendingRewards.map((r) => r.id));
console.log('shown', Array.from(context.getShownGameTicketRewardIdSet(store)));
