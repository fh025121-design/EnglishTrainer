const assert = require("assert");
const path = require("path");

const translationTrainingModule = require(path.join(__dirname, "..", "mobile", "translation-training-data.js"));
const questions = translationTrainingModule.getTranslationTrainingQuestions();

assert.strictEqual(Array.isArray(questions), true, "translation training questions should be available");
assert.strictEqual(questions.length, 5, "translation training should contain 5 fixed questions");
assert.strictEqual(questions[0].parts.length, 2, "first question should have two slash parts");
assert.deepStrictEqual(questions[0].parts[0].fixedPhrases, ["私は"], "the first slash should expose a fixed phrase before the selection columns");
assert.strictEqual(questions[0].parts[0].selectionGroups[0].options[0], "行った", "the first selection column should expose its first card option");
assert.strictEqual(questions[0].parts[0].selectionGroups[1].options[1], "博物館に", "the second selection column should expose its second card option");
assert.strictEqual(questions[0].parts[1].selectionGroups[0].options[0], "必要だったので", "the second slash should expose its first card option");
assert.deepStrictEqual(translationTrainingModule.getTranslationTrainingDisplayFixedPhrases(questions[0].parts[1]), ["本が"], "display fixed phrases should hide option text that is also selectable");
assert.strictEqual(questions[0].parts[0].selectionGroups[0].correctIndex, 0, "question 1 first selection should map to the first displayed option");
assert.strictEqual(questions[0].parts[0].selectionGroups[1].correctIndex, 0, "question 1 second selection should map to the first displayed option");
assert.strictEqual(questions[0].parts[1].selectionGroups[0].correctIndex, 0, "question 1 third selection should map to the first displayed option");
assert.strictEqual(questions[1].parts[0].selectionGroups[0].correctIndex, 0, "question 2 first selection should map to the first displayed option");
assert.strictEqual(questions[1].parts[1].selectionGroups[0].correctIndex, 0, "question 2 second selection should map to the first displayed option");
assert.strictEqual(questions[2].parts[0].selectionGroups[0].correctIndex, 0, "question 3 first selection should map to the first displayed option");
assert.strictEqual(questions[2].parts[1].selectionGroups[0].correctIndex, 1, "question 3 second selection should map to the second displayed option");
assert.strictEqual(questions[3].parts[0].selectionGroups[0].correctIndex, 0, "question 4 first selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[1].selectionGroups[0].correctIndex, 0, "question 4 second selection should map to the first displayed option");
assert.strictEqual(questions[4].parts[0].selectionGroups[0].correctIndex, 0, "question 5 first selection should map to the first displayed option");
assert.strictEqual(questions[4].parts[1].selectionGroups[0].correctIndex, 0, "question 5 second selection should map to the first displayed option");
assert.strictEqual(questions[4].parts[1].selectionGroups[1].correctIndex, 0, "question 5 third selection should map to the first displayed option");
assert.strictEqual(questions[0].japanese, "本が必要だったので、私は図書館へ行きました。", "the natural Japanese translation should be present");
assert.strictEqual(translationTrainingModule.getTranslationTrainingQuestion(1).id, 1, "question lookup should return the first question for index 1");
assert.strictEqual(translationTrainingModule.getTranslationTrainingQuestion(2).id, 2, "question lookup should return the second question for index 2");

const firstQuestion = questions[0];
const firstHighlightState = translationTrainingModule.buildTranslationTrainingEnglishDisplaySegments(firstQuestion, 0);
assert.strictEqual(firstHighlightState[0].state, "current", "the current slash should be highlighted for the first part");
assert.strictEqual(firstHighlightState[1].state, "pending", "the later slash should stay pending before it is answered");

const secondHighlightState = translationTrainingModule.buildTranslationTrainingEnglishDisplaySegments(firstQuestion, 1);
assert.strictEqual(secondHighlightState[0].state, "completed", "the already answered part should be marked as completed");
assert.strictEqual(secondHighlightState[1].state, "current", "the next part should become the current highlight");

console.log("translation training tests passed");
