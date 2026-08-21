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
