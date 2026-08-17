const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { getGrammarLessonByUnitId, getGrammarUnitCatalog } = require('../grammar-data');

const appScript = fs.readFileSync(require.resolve('../app.js'), 'utf8');
const sandbox = {
  console,
  window: {
    ENGLISH_TRAINER_RELEASE_INFO: { releaseHistory: [] },
    addEventListener() {},
    setTimeout() { return 0; },
    clearTimeout() {},
    requestAnimationFrame() { return 0; },
    cancelAnimationFrame() {},
    matchMedia() { return { matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }; },
    navigator: { userAgent: 'node' },
    speechSynthesis: { cancel() {}, speak() {}, getVoices() { return []; } },
    AudioContext: function AudioContext() {},
    URLSearchParams,
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    btoa: (value) => Buffer.from(value, 'binary').toString('base64')
  },
  document: {
    addEventListener() {},
    body: { dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    createElement() {
      return {
        style: {},
        dataset: {},
        classList: { add() {}, remove() {}, toggle() {} },
        appendChild() {},
        addEventListener() {},
        setAttribute() {},
        remove() {},
        focus() {},
        textContent: '',
        innerHTML: '',
        value: ''
      };
    }
  },
  localStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  navigator: { userAgent: 'node' },
  sessionStorage: {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  },
  crypto: { randomUUID() { return 'test-id'; } },
  setTimeout() { return 0; },
  clearTimeout() {},
  alert() {},
  confirm() { return true; },
  prompt() { return ''; },
  fetch() { return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); }
};
sandbox.window.document = sandbox.document;
sandbox.globalThis = sandbox;
sandbox.self = sandbox;
sandbox.global = sandbox;
vm.runInNewContext(appScript, sandbox, { filename: 'app.js' });

const unitCatalog = getGrammarUnitCatalog();
assert.ok(Array.isArray(unitCatalog), 'should expose the unit catalog');
assert.ok(unitCatalog.some((unit) => Number(unit.id) === 1), 'should include Unit 1');
assert.ok(unitCatalog.some((unit) => Number(unit.id) === 2), 'should include Unit 2');
assert.strictEqual(unitCatalog.find((unit) => Number(unit.id) === 2)?.enabled, true, 'Unit 2 should be enabled with the formal lesson');

const lesson = getGrammarLessonByUnitId(1);
assert.ok(lesson, 'should load Unit 1 lesson');
assert.strictEqual(lesson.unitId, 1, 'should expose the shared unit id');
assert.strictEqual(lesson.title, 'be動詞', 'should keep the Unit 1 title');
assert.ok(Array.isArray(lesson.pointQuestions), 'should define pointQuestions');
assert.ok(lesson.pointQuestions.length >= 3, 'should include at least three point-check questions');
assert.ok(Array.isArray(lesson.practiceQuestions), 'should define practiceQuestions');
assert.ok(Array.isArray(lesson.wordOrderQuestions), 'should define wordOrderQuestions');
assert.ok(Array.isArray(lesson.wordOrderQuestions[0]?.words) && lesson.wordOrderQuestions[0].words.length > 0, 'should include words for the word-order exercise');
assert.ok(typeof lesson.wordOrderQuestions[0]?.japanese === 'string' && lesson.wordOrderQuestions[0].japanese.trim().length > 0, 'should include the Japanese sentence for the word-order exercise');
assert.ok(Array.isArray(lesson.sentenceQuestions), 'should define sentenceQuestions');
assert.ok(Array.isArray(lesson.pointSummary) || typeof lesson.pointSummary === 'string', 'should provide a fixed point summary');
assert.ok(/am\s*\/\s*is\s*\/\s*are|be動詞は/.test(String(lesson.pointSummary || '')), 'should include the be-verb summary');
assert.deepStrictEqual(
  lesson.pointQuestions.map((question) => question.id),
  ['p1', 'p2', 'p3'],
  'should keep the point-check order stable and one-way'
);

const unit2Lesson = getGrammarLessonByUnitId(2);
assert.ok(unit2Lesson, 'should load Unit 2 lesson');
assert.strictEqual(unit2Lesson.unitId, 2, 'should expose the Unit 2 id');
assert.strictEqual(unit2Lesson.title, '一般動詞（1・2人称）', 'should use the formal Unit 2 topic title from the markdown');
assert.ok(typeof unit2Lesson.pointSummary === 'string' && unit2Lesson.pointSummary.includes('一般動詞'), 'should include the formal Unit 2 point summary');
assert.ok(unit2Lesson.pointSummaryContent?.mainPoint && unit2Lesson.pointSummaryContent.mainPoint.includes('一般動詞'), 'should include the formal Unit 2 main point');
assert.ok(Array.isArray(unit2Lesson.pointSummaryContent?.table) && unit2Lesson.pointSummaryContent.table.length >= 4, 'should include the formal Unit 2 summary table');
assert.ok(Array.isArray(unit2Lesson.pointSummaryContent?.examples) && unit2Lesson.pointSummaryContent.examples.length >= 3, 'should include the formal Unit 2 example cards');
assert.ok(Array.isArray(unit2Lesson.pointQuestions) && unit2Lesson.pointQuestions.length >= 5, 'should include all five Unit 2 point-check questions');
assert.ok(Array.isArray(unit2Lesson.wordOrderQuestions) && unit2Lesson.wordOrderQuestions.length >= 7, 'should include all seven Unit 2 word-order questions');
assert.ok(Array.isArray(unit2Lesson.sentenceQuestions) && unit2Lesson.sentenceQuestions.length >= 13, 'should include all Unit 2 sentence questions');

const practiceQuestion = {
  japanese: '私はテニスをします。',
  english: 'I play tennis.',
  prompt: '私はテニスをします。\nI play tennis.\n英語で入力'
};
assert.strictEqual(
  sandbox.buildGrammarPromptText(practiceQuestion, 'practice'),
  '私はテニスをします。\nI play tennis.\n英語で入力',
  'should not duplicate the same Japanese sentence when the prompt already includes it'
);

console.log('grammar-data tests passed');
