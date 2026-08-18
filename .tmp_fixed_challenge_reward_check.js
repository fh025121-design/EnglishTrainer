const fs = require('fs');
const vm = require('vm');
const script = fs.readFileSync('app.js', 'utf8').replace(/\ninit\(\);\s*$/, '\n');
const modal = () => ({
  classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
  setAttribute() {},
  getAttribute() { return null; },
  addEventListener() {},
  textContent: '',
  value: '',
  innerHTML: ''
});
const elementMap = new Map();
const getElement = (id) => {
  if (!elementMap.has(id)) {
    elementMap.set(id, modal());
  }
  return elementMap.get(id);
};
const doc = {
  body: { dataset: {} },
  getElementById(id) {
    return getElement(id) || null;
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
  document: doc,
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
vm.runInContext(script, context, { filename: 'app.js' });
const today = context.getPointTodayKey();
const store = context.ensureGameTicketState();
store.challengeTicketStateByDate = {};
const spec = { 90: 100, 147: 50, 193: 50, 199: 100, 240: 300 };
for (const [threshold, reward] of Object.entries(spec)) {
  const pointState = context.createDefaultPointState();
  pointState.balance = 0;
  pointState.totalEarned = 0;
  pointState.dailyEarnedByDate[today] = Number(threshold) - 1;
  pointState.dailyEarnedByModeByDate[today] = {
    ...pointState.dailyEarnedByModeByDate[today],
    challenge: Number(threshold) - 1
  };
  context.savePointState(pointState);
  context.processChallengeGameTicketAwards(store, today, Number(threshold) - 1, Number(threshold));
  const label = context.document.getElementById('pointRewardAmountText').textContent;
  if (label !== `${reward}ポイント獲得！`) {
    throw new Error(`threshold ${threshold}: expected ${reward}ポイント獲得！ but got ${label}`);
  }
  store.challengeTicketStateByDate = {};
  console.log(`${threshold}: ${label}`);
}
console.log('point reward modal checks passed:', JSON.stringify(spec));
