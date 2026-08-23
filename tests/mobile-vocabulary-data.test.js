const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'mobile', 'mobile.js'), 'utf8');

test('mobile vocabulary data layer exposes real word bank and review state scaffolding', () => {
  assert.match(source, /const\s+MOBILE_VOCABULARY_REAL_WORD_BANK\s*=\s*\[/, 'should define a real word bank');
  assert.match(source, /function\s+createVocabularyStudyState\s*\(wordEntries\s*=\s*\[]\)/, 'should define a study-state builder');
  assert.match(source, /function\s+buildVocabularyRealStudyState\s*\(\)/, 'should define a real study-state builder');
  assert.match(source, /function\s+getVocabularyCandidateQueue\s*\(studyState,\s*now\s*=\s*Date\.now\(\)\)/, 'should define a queue-priority helper');
  assert.match(source, /function\s+getVocabularyProgressSummary\s*\(studyState\)/, 'should define a progress summary helper');
  assert.match(source, /1:\s*1,\s*2:\s*3,\s*3:\s*7,\s*4:\s*14,\s*5:\s*30/, 'should encode the 1, 3, 7, 14, 30 review ladder');
});

test('mobile app includes a dedicated vocabulary data file and grade-based real bank', () => {
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'mobile', 'index.html'), 'utf8');
  assert.match(html, /vocabulary-data\.js/, 'should load the dedicated vocabulary data module');

  const dataFile = require('node:path').join(__dirname, '..', 'mobile', 'vocabulary-data.js');
  assert.ok(fs.existsSync(dataFile), 'should create the app vocabulary data file');

  const dataSource = fs.readFileSync(dataFile, 'utf8');
  assert.match(dataSource, /window\.MOBILE_VOCABULARY_REAL_WORD_BANK\s*=\s*\[/, 'should export the real bank on window');
  assert.match(dataSource, /grade:\s*5|grade:\s*4|grade:\s*3/, 'should preserve grade information');
});

test('mobile vocabulary practice generates canonical history entries using completed-word counts', () => {
  assert.match(source, /function\s+getVocabularySampleCompletedWordCount\s*\(/, 'should count completed vocabulary words by finished pronunciation + meaning judgments');
  assert.match(source, /function\s+finalizeVocabularySampleHistorySession\s*\(/, 'should finalize the canonical mobile learning history session');
  assert.match(source, /questionCount:\s*getVocabularySampleCompletedWordCount\s*\(/, 'should save the number of completed words as questionCount');
  assert.match(source, /mode:\s*["']Vocabulary["']/, 'should use the canonical Vocabulary mode label for history entries');
});

test('mobile app defaults back to the home screen after a fresh load or reload', () => {
  assert.match(source, /function\s+isMobileReloadNavigation\s*\(/, 'should detect an actual reload navigation state');
  assert.match(source, /handlePageShow\s*\(\)[\s\S]*?isMobileReloadNavigation\s*\(/, 'should gate the home-screen reset on reload detection');
  assert.match(source, /initialize\s*\(\)[\s\S]*?isMobileReloadNavigation\s*\(/, 'should apply the reload guard during initialization');
});
