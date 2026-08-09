const test = require('node:test');
const assert = require('node:assert/strict');
const irregularVerbs = require('../irregular-verbs.js');

test('buildIrregularVerbQuestionSet returns unique questions and prioritizes unanswered verbs', () => {
  const verbs = [
    { id: 'go', base: 'go', past: 'went', pastParticiple: 'gone', japanese: '行く' },
    { id: 'eat', base: 'eat', past: 'ate', pastParticiple: 'eaten', japanese: '食べる' },
    { id: 'see', base: 'see', past: 'saw', pastParticiple: 'seen', japanese: '見る' }
  ];
  const stats = {
    eat: { attempts: 3, correct: 1 }
  };

  const questions = irregularVerbs.buildIrregularVerbQuestionSet(verbs, 2, { stats });

  assert.equal(questions.length, 2);
  assert.equal(new Set(questions.map((entry) => entry.id)).size, 2);
  assert.ok(questions.some((entry) => entry.id === 'go'));
  assert.ok(questions.some((entry) => entry.id === 'see'));
});

test('evaluateIrregularVerbAnswer accepts aliases and multiple candidate answers', () => {
  const question = {
    id: 'go',
    base: 'go',
    past: 'went',
    pastParticiple: 'gone',
    japanese: '行く'
  };

  assert.equal(irregularVerbs.evaluateIrregularVerbAnswer(question, 'past', 'went'), true);
  assert.equal(irregularVerbs.evaluateIrregularVerbAnswer(question, 'past', 'go / went'), true);
  assert.equal(irregularVerbs.evaluateIrregularVerbAnswer(question, 'past', 'did not go'), false);
  assert.equal(irregularVerbs.evaluateIrregularVerbAnswer(question, 'pastParticiple', 'gone'), true);
  assert.equal(irregularVerbs.evaluateIrregularVerbAnswer(question, 'past', 'went.'), true);
});

test('buildIrregularVerbQuestionSet prioritizes preferred question ids', () => {
  const verbs = [
    { id: 'go', base: 'go', past: 'went', pastParticiple: 'gone', japanese: '行く' },
    { id: 'eat', base: 'eat', past: 'ate', pastParticiple: 'eaten', japanese: '食べる' },
    { id: 'see', base: 'see', past: 'saw', pastParticiple: 'seen', japanese: '見る' }
  ];

  const questions = irregularVerbs.buildIrregularVerbQuestionSet(verbs, 2, { preferredQuestionIds: ['see'] });

  assert.equal(questions.length, 2);
  assert.equal(questions[0].id, 'see');
});

test('evaluateIrregularVerbAnswer accepts a combined past and past participle answer', () => {
  const question = {
    id: 'find',
    base: 'find',
    past: 'found',
    pastParticiple: 'found',
    japanese: '見つける'
  };

  assert.equal(irregularVerbs.evaluateIrregularVerbAnswer(question, 'combined', 'found found'), true);
  assert.equal(irregularVerbs.evaluateIrregularVerbAnswer(question, 'combined', 'found'), false);
  assert.equal(irregularVerbs.evaluateIrregularVerbAnswer(question, 'combined', 'found find'), false);
});

test('evaluateIrregularVerbAnswer accepts alternate accepted forms for each slot', () => {
  const question = {
    id: 'get',
    base: 'get',
    past: ['got', 'gotten'],
    pastParticiple: ['got', 'gotten'],
    japanese: '得る'
  };

  assert.equal(irregularVerbs.evaluateIrregularVerbAnswer(question, 'combined', 'got got'), true);
  assert.equal(irregularVerbs.evaluateIrregularVerbAnswer(question, 'combined', 'gotten gotten'), true);
  assert.equal(irregularVerbs.evaluateIrregularVerbAnswer(question, 'combined', 'got gotten'), true);
});

test('getIrregularVerbPromptLabel builds a readable prompt', () => {
  const question = {
    id: 'go',
    base: 'go',
    past: 'went',
    pastParticiple: 'gone',
    japanese: '行く'
  };

  assert.equal(irregularVerbs.getIrregularVerbPromptLabel(question, 'past'), 'go → 過去形');
  assert.equal(irregularVerbs.getIrregularVerbPromptLabel(question, 'pastParticiple'), 'go → 過去分詞');
});

test('getIrregularVerbSessionPlan returns training and test settings', () => {
  assert.deepEqual(irregularVerbs.getIrregularVerbSessionPlan('training', 'past'), {
    mode: 'training',
    form: 'past',
    questionCount: 10,
    label: '特訓'
  });

  assert.deepEqual(irregularVerbs.getIrregularVerbSessionPlan('test', 'past'), {
    mode: 'test',
    form: 'past',
    questionCount: 20,
    label: 'テスト'
  });
});
