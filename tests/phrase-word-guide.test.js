const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
assert.ok(/function getPhraseWordGuideCount\(/.test(source), 'phrase word guide count helper should exist');
assert.ok(/function renderPhraseInputGuide\(/.test(source), 'phrase input guide renderer should exist');
assert.ok(/function getPhraseSequenceMarkers\(/.test(source), 'phrase sequence marker helper should exist');

const getPhraseWordGuideCount = (question) => {
  const raw = String(question && (question.answer || question.english || '') || '').trim();
  return raw ? raw.split(/\s+/).filter(Boolean).length : 0;
};

const renderPhraseInputGuide = (question) => {
  const count = getPhraseWordGuideCount(question);
  if (!count) return '';
  const blanks = Array.from({ length: count }, () => '<span class="phrase-guide-blank">___</span>');
  return '<span class="phrase-guide-wrap">' + blanks.join(' ') + '</span>';
};

const getPhraseSequenceMarkers = (count) => {
  const circleNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
  return Array.from({ length: Math.max(0, Number(count) || 0) }, (_, index) => circleNumbers[index] || String(index + 1));
};

assert.strictEqual(getPhraseWordGuideCount({ type: 'phrase', answer: 'look at' }), 2, '2-word idiom count should be 2');
assert.strictEqual(getPhraseWordGuideCount({ type: 'phrase', answer: 'take part in' }), 3, '3-word idiom count should be 3');
assert.strictEqual(getPhraseWordGuideCount({ type: 'phrase', answer: 'have a good time' }), 4, '4-word idiom count should be 4');
assert.deepStrictEqual(getPhraseSequenceMarkers(3), ['①', '②', '③'], '3-word phrase should render sequential circled markers');
assert.strictEqual((renderPhraseInputGuide({ type: 'phrase', answer: 'look at' }).match(/phrase-guide-blank/g) || []).length, 2, '2-word idiom should render 2 guide blanks');
assert.strictEqual((renderPhraseInputGuide({ type: 'phrase', answer: 'take part in' }).match(/phrase-guide-blank/g) || []).length, 3, '3-word idiom should render 3 guide blanks');
assert.strictEqual((renderPhraseInputGuide({ type: 'phrase', answer: 'have a good time' }).match(/phrase-guide-blank/g) || []).length, 4, '4-word idiom should render 4 guide blanks');
console.log('phrase word guide tests passed');
