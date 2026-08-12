const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('app.js', 'utf8');
const fakeElement = (id = '') => ({
  id,
  value: '',
  checked: false,
  dataset: {},
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  style: {},
  addEventListener() {},
  removeEventListener() {},
  setAttribute() {},
  getAttribute() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  appendChild() {},
  innerHTML: '',
  textContent: '',
  disabled: false,
  focus() {},
  blur() {},
  click() {}
});

const documentStub = {
  body: { dataset: {} },
  getElementById: (id) => {
    if (!documentStub.__elements) documentStub.__elements = new Map();
    if (!documentStub.__elements.has(id)) documentStub.__elements.set(id, fakeElement(id));
    return documentStub.__elements.get(id);
  },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  addEventListener() {},
  removeEventListener() {}
};

const context = {
  window: {
    ENGLISH_TRAINER_RELEASE_INFO: { releaseHistory: [] },
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(cb) { if (cb) cb(); return 0; }
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
vm.runInContext(source, context, { filename: 'app.js' });

const makeStore = (day, challengePoints) => {
  const store = context.createDefaultGameTicketStats();
  context.state = { stats: { gameTickets: store }, items: [], session: null };
  const pointState = {
    balance: 0,
    totalEarned: 0,
    dailyEarnedByDate: {},
    dailyEarnedByModeByDate: { [day]: { challenge: challengePoints } }
  };
  context.getPointState = () => pointState;
  context.getPointTodayKey = () => day;
  context.hydratePointDaySnapshots = () => {};
  context.savePointState = () => {};
  return store;
};

const result = {};

let store = makeStore('2026-08-12', 141);
result.P141 = context.processChallengeGameTicketAwards(store);
context.executePendingChallengeTicketChance();
result.P141State = store.challengeTicketStateByDate['2026-08-12'].special;
result.P141Inventory = store.inventory.map((t) => t.minutes);

store = makeStore('2026-08-12', 221);
result.P221 = context.processChallengeGameTicketAwards(store);
context.executePendingChallengeTicketChance();
result.P221State = store.challengeTicketStateByDate['2026-08-12'].special;
result.P221Inventory = store.inventory.map((t) => t.minutes);

store = makeStore('2026-08-12', 261);
store.challengeTicketStateByDate = {
  '2026-08-12': {
    special: {
      p141: { processed: true, result: 'miss', awardedMinutes: 0 },
      p221: { processed: true, result: '30', awardedMinutes: 30 },
      p261: { processed: false, result: 'miss', awardedMinutes: 0 }
    }
  }
};
result.P261 = context.processChallengeGameTicketAwards(store);
context.executePendingChallengeTicketChance();
result.P261State = store.challengeTicketStateByDate['2026-08-12'].special;
result.P261Inventory = store.inventory.map((t) => t.minutes);

store = makeStore('2026-08-13', 141);
result.Normal = context.processChallengeGameTicketAwards(store);
context.executePendingChallengeTicketChance();
result.NormalState = store.challengeTicketStateByDate['2026-08-13'].special;
result.NormalInventory = store.inventory.map((t) => t.minutes);

console.log(JSON.stringify(result, null, 2));
