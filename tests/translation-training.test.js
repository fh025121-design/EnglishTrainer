const assert = require("assert");
const path = require("path");

const translationTrainingModule = require(path.join(__dirname, "..", "mobile", "translation-training-data.js"));
const questions = translationTrainingModule.getTranslationTrainingQuestions();

assert.strictEqual(Array.isArray(questions), true, "translation training questions should be available");
assert.strictEqual(questions.length, 5, "translation training should contain 5 fixed questions");
assert.strictEqual(questions[0].parts.length, 2, "first question should have two slash parts");
assert.strictEqual(questions[0].parts[0].options[0], "私は図書館へ行きました", "first part should have the expected correct option");
assert.strictEqual(questions[0].parts[1].options[1], "本が必要だったので", "second part should have the expected correct option");
assert.strictEqual(questions[0].japanese, "本が必要だったので、私は図書館へ行きました。", "the natural Japanese translation should be present");
assert.strictEqual(translationTrainingModule.getTranslationTrainingQuestion(1).id, 1, "question lookup should return the first question for index 1");
assert.strictEqual(translationTrainingModule.getTranslationTrainingQuestion(2).id, 2, "question lookup should return the second question for index 2");

console.log("translation training tests passed");
