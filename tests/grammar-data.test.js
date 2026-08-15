const assert = require('assert');
const { getGrammarLessonByUnitId } = require('../grammar-data');

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
console.log('grammar-data tests passed');
