const assert = require('assert');
const { getGrammarLessonByUnitId } = require('../grammar-data');

const lesson = getGrammarLessonByUnitId(1);
assert.ok(lesson, 'should load Unit 1 lesson');
assert.ok(Array.isArray(lesson.pointQuestions), 'should define pointQuestions');
assert.ok(lesson.pointQuestions.length >= 3, 'should include multiple point checks before summary');
assert.ok(/be動詞は/.test(lesson.pointText || ''), 'should include the point summary text');
console.log('grammar-data tests passed');
