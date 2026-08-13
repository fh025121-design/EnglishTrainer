const fs = require('fs');
const vm = require('vm');
const appCode = fs.readFileSync('app.js', 'utf8');
const NativePromise = global.Promise;
const created = [];
class TrackedPromise extends NativePromise {
  constructor(executor) {
    const stack = new Error().stack;
    created.push(stack);
    super((resolve, reject) => {
      try { executor(resolve, reject); } catch (error) { reject(error); }
    });
  }
}

global.Promise = TrackedPromise;
const context = {
  Promise: TrackedPromise,
  window: {
    ENGLISH_TRAINER_RELEASE_INFO: { releaseHistory: [] },
    PcFirebaseAuthState: { status: 'logged-out', user: null },
    innerWidth: 1200,
    addEventListener() {},
    removeEventListener() {},
    requestAnimationFrame(cb) { if (cb) cb(); return 0; },
    getFirebaseCurrentUser() { return null; },
    watchFamilyDocument(_familyId, callbacks = {}) { console.log('watchFamilyDocument called'); callbacks.onUpdate?.({ children: {} }); return () => {}; },
    watchLearningHistoryEntriesFromFirestore(_uid, callbacks = {}) { console.log('watchLearningHistoryEntriesFromFirestore called'); callbacks.onUpdate?.([]); return () => {}; },
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
    getElementById(id) { console.log('getElementById', id); return null; },
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
console.log('before run');
vm.createContext(context);
vm.runInContext(appCode, context, { filename: 'app.js' });
console.log('after run');
console.log('promise count', created.length);
created.slice(0, 20).forEach((stack, index) => {
  console.log('--- promise', index, '---');
  console.log(stack.split('\n').slice(0, 12).join('\n'));
});
setTimeout(() => { console.log('timer done'); process.exit(0); }, 800);
