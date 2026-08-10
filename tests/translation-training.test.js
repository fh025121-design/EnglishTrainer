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
assert.deepStrictEqual(questions[1].parts[1].fixedPhrases, ["彼女は"], "question 2 reason clause should expose an explicit subject phrase for forward processing");
assert.strictEqual(questions[2].parts[0].selectionGroups[0].options[0], "あとで・私は", "question 3 first slash should start from the after+subject chunk");
assert.strictEqual(questions[2].parts[0].selectionGroups[1].options[0], "宿題を", "question 3 first slash should keep homework as an object chunk");
assert.strictEqual(questions[4].parts[1].selectionGroups[0].options[0], "しかし・私は", "question 5 but-clause should start from connector+subject");
assert.strictEqual(questions[4].parts[1].selectionGroups[2].options[0], "それに", "question 5 but-clause should keep object phrase after the verb chunk");
assert.strictEqual(questions[0].parts[0].selectionGroups[0].correctIndex, 0, "question 1 first selection should map to the first displayed option");
assert.strictEqual(questions[0].parts[0].selectionGroups[1].correctIndex, 0, "question 1 second selection should map to the first displayed option");
assert.strictEqual(questions[0].parts[1].selectionGroups[0].correctIndex, 0, "question 1 third selection should map to the first displayed option");
assert.strictEqual(questions[1].parts[0].selectionGroups[0].correctIndex, 0, "question 2 first selection should map to the first displayed option");
assert.strictEqual(questions[1].parts[1].selectionGroups[0].correctIndex, 0, "question 2 second selection should map to the first displayed option");
assert.strictEqual(questions[2].parts[0].selectionGroups[0].correctIndex, 0, "question 3 first selection should map to the first displayed option");
assert.strictEqual(questions[2].parts[0].selectionGroups[1].correctIndex, 0, "question 3 first slash object selection should map to the first displayed option");
assert.strictEqual(questions[2].parts[1].selectionGroups[0].correctIndex, 0, "question 3 second slash subject selection should map to the first displayed option");
assert.strictEqual(questions[2].parts[1].selectionGroups[1].correctIndex, 1, "question 3 second slash verb selection should map to the second displayed option");
assert.strictEqual(questions[2].parts[1].selectionGroups[2].correctIndex, 0, "question 3 second slash object selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[0].selectionGroups[0].correctIndex, 0, "question 4 first selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[0].selectionGroups[1].correctIndex, 0, "question 4 first slash verb selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[0].selectionGroups[2].correctIndex, 0, "question 4 first slash place selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[1].selectionGroups[0].correctIndex, 0, "question 4 second slash subject selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[1].selectionGroups[1].correctIndex, 0, "question 4 second slash action selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[1].selectionGroups[2].correctIndex, 0, "question 4 second slash object selection should map to the first displayed option");
assert.strictEqual(questions[4].parts[0].selectionGroups[0].correctIndex, 0, "question 5 first selection should map to the first displayed option");
assert.strictEqual(questions[4].parts[1].selectionGroups[0].correctIndex, 0, "question 5 second selection should map to the first displayed option");
assert.strictEqual(questions[4].parts[1].selectionGroups[1].correctIndex, 0, "question 5 third selection should map to the first displayed option");
assert.strictEqual(questions[4].parts[1].selectionGroups[2].correctIndex, 0, "question 5 fourth selection should map to the first displayed option");
assert.strictEqual(questions[0].japanese, "本が必要だったので、私は図書館へ行きました。", "the natural Japanese translation should be present");
assert.strictEqual(translationTrainingModule.getTranslationTrainingQuestion(1).id, 1, "question lookup should return the first question for index 1");
assert.strictEqual(translationTrainingModule.getTranslationTrainingQuestion(2).id, 2, "question lookup should return the second question for index 2");

const freshState = translationTrainingModule.createTranslationTrainingState(questions);
assert.strictEqual(freshState.questionIndex, 0, "a fresh translation-training state should start at the first question");
assert.deepStrictEqual(freshState.partSelections, {}, "a fresh translation-training state should not preselect any cards");
assert.strictEqual(freshState.builtJapanese, "", "a fresh translation-training state should not carry over built Japanese text");

const previousState = translationTrainingModule.createTranslationTrainingState(questions);
previousState.partSelections = { 0: { verb: { optionIndex: 0, isCorrect: true } } };
previousState.builtJapanese = "答えます";
previousState.answeredGroupKeys = ["verb"];
const resetState = translationTrainingModule.resetTranslationTrainingQuestionState(previousState);
assert.deepStrictEqual(resetState.partSelections, {}, "resetting a question state should clear prior card selections");
assert.strictEqual(resetState.builtJapanese, "", "resetting a question state should clear built Japanese text");
assert.deepStrictEqual(resetState.answeredGroupKeys, [], "resetting a question state should clear answered-group tracking");

const firstQuestion = questions[0];
const firstHighlightState = translationTrainingModule.buildTranslationTrainingEnglishDisplaySegments(firstQuestion, 0);
assert.strictEqual(firstHighlightState[0].state, "current", "the current slash should be highlighted for the first part");
assert.strictEqual(firstHighlightState[1].state, "pending", "the later slash should stay pending before it is answered");
assert.strictEqual(firstHighlightState[0].marker, "▶", "the current slash should expose a current-part marker");
assert.strictEqual(firstHighlightState[1].marker, "", "the pending slash should not expose a marker");

const layoutSequence = translationTrainingModule.buildTranslationTrainingLayoutSequence(firstQuestion.parts[0], ["私は"]);
assert.strictEqual(layoutSequence[0].type, "column", "the layout sequence should include the first selection column");
assert.strictEqual(layoutSequence[0].groupIndex, 0, "the first selection column should carry its group index");
assert.strictEqual(layoutSequence[1].type, "fixed", "the layout sequence should insert the fixed phrase block between the columns");
assert.strictEqual(layoutSequence[1].phrases[0], "私は", "the fixed phrase block should expose the display phrase");
assert.strictEqual(layoutSequence[2].type, "column", "the layout sequence should include the second selection column");
assert.strictEqual(layoutSequence[2].groupIndex, 1, "the second selection column should carry its group index");

const secondHighlightState = translationTrainingModule.buildTranslationTrainingEnglishDisplaySegments(firstQuestion, 1);
assert.strictEqual(secondHighlightState[0].state, "completed", "the already answered part should be marked as completed");
assert.strictEqual(secondHighlightState[1].state, "current", "the next part should become the current highlight");
assert.strictEqual(secondHighlightState[1].marker, "▶", "the next slash should expose the current-part marker once it becomes current");

const correctCardState = translationTrainingModule.getTranslationTrainingCardDisplayState({ isCorrect: true, groupIndex: 0, optionIndex: 0 });
assert.strictEqual(correctCardState.marker, "○", "correct selections should display a clear circle marker");
assert.strictEqual(correctCardState.state, "correct", "correct selections should use the correct state");
const incorrectCardState = translationTrainingModule.getTranslationTrainingCardDisplayState({ isCorrect: false, groupIndex: 0, optionIndex: 0 });
assert.strictEqual(incorrectCardState.marker, "×", "incorrect selections should display a clear cross marker");
assert.strictEqual(incorrectCardState.state, "incorrect", "incorrect selections should use the incorrect state");

console.log("translation training tests passed");
