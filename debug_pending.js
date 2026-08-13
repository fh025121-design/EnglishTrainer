const fs = require('fs');
const vm = require('vm');
const path = require('path');
const appCode = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');

const originalPromise = global.Promise;
let created = [];
class TrackedPromise extends originalPromise {
  constructor(executor) {
    const stack = new Error().stack;
    created.push(stack);
    super((resolve, reject) => {
      try {
        executor(resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

const context = {
  window: {
    ENGLISH_TRAINER_RELEASE_INFO: { releaseHistory: [] },
    PcFirebaseAuthState: { status: 'logged-out', user: null },
    innerWidth: 1200,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(callback) { if (callback) callback(); return 0; },
    getFirebaseCurrentUser() { return null; },
    watchFamilyDocument(_familyId, callbacks = {}) {
      callbacks.onUpdate?.({ children: {} });
      return () => {};
    },
    watchLearningHistoryEntriesFromFirestore(_uid, callbacks = {}) {
      callbacks.onUpdate?.([]);
      return () => {};
    },
    loadPointStateFromFirestore: async () => ({ exists: false, data: null }),
    savePointStateToFirestore: async () => true,
    loadGameTicketsFromFirestore: async () => ({ exists: false, data: null }),
    saveGameTicketsToFirestore: async () => true,
    loadStudyCoreFromFirestore: async () => ({ exists: false, data: null }),
    saveStudyCoreToFirestore: async () => true,
    deleteStudyCoreBackupFromFirestore: async () => true,
    loadStudyCoreBackupsFromFirestore: async () => ({ backups: [] })
  },
  document: {
    body: { dataset: {} },
    getElementById() { return null; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    addEventListener() {}
  },
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
context.Promise = TrackedPromise;
vm.createContext(context);
vm.runInContext(appCode, context, { filename: 'app.js' });
console.log('PROMISES_CREATED', created.length);
for (let i = 0; i < Math.min(10, created.length); i++) {
  const entry = created[i];
  console.log('---');
  console.log(String(entry).split('\n').slice(0, 12).join('\n'));
}
console.log('handle names', process._getActiveHandles().map((handle) => handle && handle.constructor && handle.constructor.name));
console.log('done');
setTimeout(() => process.exit(0), 500);
