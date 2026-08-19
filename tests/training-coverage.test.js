const test = require('node:test');
const assert = require('node:assert/strict');

const coverageLib = require('../training-coverage.js');

const bank = [
  { id: 'word-1', japanese: 'A', english: 'a' },
  { id: 'word-2', japanese: 'B', english: 'b' },
  { id: 'word-3', japanese: 'C', english: 'c' }
];

test('markQuestionShown stores each ID once and counts unseen items correctly', () => {
  const store = coverageLib.buildDefaultCoverageStore();

  coverageLib.markQuestionShown(store, 'word', 'word-1');
  coverageLib.markQuestionShown(store, 'word', 'word-1');
  coverageLib.markQuestionShown(store, 'word', 'word-2');

  const summary = coverageLib.buildCoverageSummary(store, 'word', bank);
  assert.equal(summary.registeredTotal, 3);
  assert.equal(summary.targetCount, 3);
  assert.equal(summary.seenCount, 2);
  assert.equal(summary.unseenCount, 1);
  assert.deepEqual(summary.unseenIds, ['word-3']);
});

test('buildCoverageSummary exposes the admin-friendly values', () => {
  const store = coverageLib.buildDefaultCoverageStore();
  coverageLib.markQuestionShown(store, 'phrase', 'phrase-1');

  const summary = coverageLib.buildCoverageSummary(store, 'phrase', [
    { id: 'phrase-1' },
    { id: 'phrase-2' },
    { id: 'phrase-3' }
  ]);

  assert.equal(summary.coverageRate, 33.33);
  assert.equal(summary.unseenCount, 2);
  assert.deepEqual(summary.seenIds, ['phrase-1']);
  assert.deepEqual(summary.unseenIds, ['phrase-2', 'phrase-3']);
});

test('main page loads the coverage script before app.js', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const appScriptIndex = html.indexOf('app.js');
  const coverageScriptIndex = html.indexOf('training-coverage.js');

  assert.notEqual(appScriptIndex, -1);
  assert.notEqual(coverageScriptIndex, -1);
  assert.ok(coverageScriptIndex < appScriptIndex, 'coverage script should be loaded before app.js');
});

test('mobile page loads the coverage script before mobile.js', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'mobile', 'index.html'), 'utf8');
  const mobileScriptIndex = html.indexOf('mobile.js');
  const coverageScriptIndex = html.indexOf('training-coverage.js');

  assert.notEqual(mobileScriptIndex, -1);
  assert.notEqual(coverageScriptIndex, -1);
  assert.ok(coverageScriptIndex < mobileScriptIndex, 'coverage script should be loaded before mobile.js');
});
