const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 430, height: 930 } });
  const page = await context.newPage();

  const tabState = {
    network: [],
    batchGetDocuments: 0,
    listenChannel: 0,
    commitWrite: 0,
    otherFirestore: 0,
    totalFirestore: 0,
    loadStudy: 0,
    loadHist: 0,
    studySubStart: 0,
    histSubStart: 0,
    studyUnsub: 0,
    histUnsub: 0,
    studySnapshot: 0,
    histSnapshot: 0,
    studyError: 0,
    histError: 0,
    studyActive: 0,
    histActive: 0,
    loginReady: false,
    uid: null,
    events: []
  };

  const recordNet = (url, method) => {
    const u = String(url || '');
    if (!u.includes('firestore.googleapis.com') && !u.includes('google.firestore')) return;
    const kind = u.includes(':batchGet') ? 'batchGetDocuments'
      : u.includes('Listen/channel') ? 'listenChannel'
      : /\/write\b|\/commit\b|:batchWrite|:runQuery/.test(u) ? 'commitWrite'
      : 'otherFirestore';
    tabState.totalFirestore += 1;
    if (kind === 'batchGetDocuments') tabState.batchGetDocuments += 1;
    if (kind === 'listenChannel') tabState.listenChannel += 1;
    if (kind === 'commitWrite') tabState.commitWrite += 1;
    if (kind === 'otherFirestore') tabState.otherFirestore += 1;
    if (tabState.network.length < 200) {
      tabState.network.push({ t: Date.now(), kind, method: String(method || 'GET'), url: u.slice(0, 300) });
    }
  };

  page.on('request', (req) => {
    const u = req.url();
    if (u.includes('firestore.googleapis.com') || u.includes('google.firestore')) {
      recordNet(u, req.method());
    }
  });

  await page.addInitScript(() => {
    const state = window.__probe = {
      network: [],
      batchGetDocuments: 0,
      listenChannel: 0,
      commitWrite: 0,
      otherFirestore: 0,
      totalFirestore: 0,
      loadStudy: 0,
      loadHist: 0,
      studySubStart: 0,
      histSubStart: 0,
      studyUnsub: 0,
      histUnsub: 0,
      studySnapshot: 0,
      histSnapshot: 0,
      studyError: 0,
      histError: 0,
      studyActive: 0,
      histActive: 0,
      events: []
    };

    const recordNet = (url, method) => {
      const u = String(url || '');
      if (!u.includes('firestore.googleapis.com') && !u.includes('google.firestore')) return;
      const kind = u.includes(':batchGet') ? 'batchGetDocuments'
        : u.includes('Listen/channel') ? 'listenChannel'
        : /\/write\b|\/commit\b|:batchWrite|:runQuery/.test(u) ? 'commitWrite'
        : 'otherFirestore';
      state.totalFirestore += 1;
      if (kind === 'batchGetDocuments') state.batchGetDocuments += 1;
      if (kind === 'listenChannel') state.listenChannel += 1;
      if (kind === 'commitWrite') state.commitWrite += 1;
      if (kind === 'otherFirestore') state.otherFirestore += 1;
      if (state.network.length < 200) {
        state.network.push({ t: Date.now(), kind, method: String(method || 'GET'), url: u.slice(0, 300) });
      }
    };

    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
      recordNet(url, method);
      return origOpen.call(this, method, url, async, user, password);
    };

    const origFetch = window.fetch;
    window.fetch = function(input, init) {
      const u = String(typeof input === 'string' ? input : input && input.url ? input.url : '');
      if (u.includes('firestore.googleapis.com') || u.includes('google.firestore')) {
        recordNet(u, (init && init.method) || 'GET');
      }
      return origFetch.call(this, input, init);
    };

    const installLoadCounter = (name) => {
      const orig = window[name];
      if (typeof orig !== 'function') return;
      window[name] = function(...args) {
        state.loadStudy += 1;
        state.events.push({ kind: 'load', name, at: Date.now(), args: args.length });
        return orig.apply(this, args);
      };
    };

    const installLoadCounterHist = (name) => {
      const orig = window[name];
      if (typeof orig !== 'function') return;
      window[name] = function(...args) {
        state.loadHist += 1;
        state.events.push({ kind: 'load', name, at: Date.now(), args: args.length });
        return orig.apply(this, args);
      };
    };

    const installSubscriptionCounter = (name, kind) => {
      const orig = window[name];
      if (typeof orig !== 'function') return;
      window[name] = function(onChange, options = {}) {
        if (kind === 'study') {
          state.studySubStart += 1;
          state.studyActive += 1;
        } else {
          state.histSubStart += 1;
          state.histActive += 1;
        }
        const wrappedOnChange = (snapshot) => {
          if (kind === 'study') {
            state.studySnapshot += 1;
            if (snapshot && snapshot.error) state.studyError += 1;
          } else {
            state.histSnapshot += 1;
            if (snapshot && snapshot.error) state.histError += 1;
          }
          return onChange && onChange(snapshot);
        };
        const unsub = orig.call(this, wrappedOnChange, options);
        const wrappedUnsub = () => {
          if (kind === 'study') {
            state.studyUnsub += 1;
            state.studyActive = Math.max(0, state.studyActive - 1);
          } else {
            state.histUnsub += 1;
            state.histActive = Math.max(0, state.histActive - 1);
          }
          return unsub && unsub();
        };
        return wrappedUnsub;
      };
    };

    installLoadCounter('loadMobileVocabularyStateFromFirestore');
    installLoadCounterHist('loadMobileVocabularyTodayHistoryStateFromFirestore');
    installSubscriptionCounter('subscribeMobileVocabularyStateFromFirestore', 'study');
    installSubscriptionCounter('subscribeMobileVocabularyTodayHistoryStateFromFirestore', 'hist');
  });

  const readProbe = async () => page.evaluate(() => {
    const p = window.__probe || {
      network: [],
      batchGetDocuments: 0,
      listenChannel: 0,
      commitWrite: 0,
      otherFirestore: 0,
      totalFirestore: 0,
      loadStudy: 0,
      loadHist: 0,
      studySubStart: 0,
      histSubStart: 0,
      studyUnsub: 0,
      histUnsub: 0,
      studySnapshot: 0,
      histSnapshot: 0,
      studyError: 0,
      histError: 0,
      studyActive: 0,
      histActive: 0,
      events: []
    };
    return {
      totalFirestore: p.totalFirestore,
      batchGetDocuments: p.batchGetDocuments,
      listenChannel: p.listenChannel,
      commitWrite: p.commitWrite,
      otherFirestore: p.otherFirestore,
      loadStudy: p.loadStudy,
      loadHist: p.loadHist,
      studySubStart: p.studySubStart,
      histSubStart: p.histSubStart,
      studyUnsub: p.studyUnsub,
      histUnsub: p.histUnsub,
      studySnapshot: p.studySnapshot,
      histSnapshot: p.histSnapshot,
      studyError: p.studyError,
      histError: p.histError,
      studyActive: p.studyActive,
      histActive: p.histActive,
      networkSample: p.network.slice(-20),
      events: p.events.slice(-20)
    };
  });

  await page.goto('https://fh025121-design.github.io/EnglishTrainer/mobile/?v=20260824-1400', { waitUntil: 'domcontentloaded' });
  const initial = await readProbe();

  await page.fill('#mobileLoginEmailInput', 'fh025121@gmail.com');
  await page.fill('#mobileLoginPasswordInput', 'Aiueo0822!');
  await page.click('#mobileLoginSubmitBtn');

  const samples = [];
  for (let sec = 1; sec <= 60; sec++) {
    await page.waitForTimeout(1000);
    const sample = await readProbe();
    samples.push({ sec, ...sample });
  }

  const final = await readProbe();
  console.log(JSON.stringify({ initial, final, samples: samples.slice(-10) }, null, 2));
  await browser.close();
})();
