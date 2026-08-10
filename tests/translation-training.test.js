const assert = require("assert");
const path = require("path");

const translationTrainingModule = require(path.join(__dirname, "..", "mobile", "translation-training-data.js"));
const questions = translationTrainingModule.getTranslationTrainingQuestions();

assert.strictEqual(Array.isArray(questions), true, "translation training questions should be available");
assert.strictEqual(questions.length, 44, "translation training should contain 44 questions including the newest 15 samples");
assert.strictEqual(questions[0].level, "A", "existing questions should carry level metadata");
const previousAddedQuestions = questions.filter((question) => Number(question.id) >= 6 && Number(question.id) <= 14);
assert.strictEqual(previousAddedQuestions.length, 9, "previously added sample questions should remain 9");
assert.strictEqual(previousAddedQuestions.filter((question) => question.level === "A").length, 3, "previously added level A samples should remain 3");
assert.strictEqual(previousAddedQuestions.filter((question) => question.level === "B").length, 3, "previously added level B samples should remain 3");
assert.strictEqual(previousAddedQuestions.filter((question) => question.level === "C").length, 3, "previously added level C samples should remain 3");
const middleAddedQuestions = questions.filter((question) => Number(question.id) >= 15 && Number(question.id) <= 29);
assert.strictEqual(middleAddedQuestions.length, 15, "middle added sample questions should remain 15");
assert.strictEqual(middleAddedQuestions.filter((question) => question.level === "A").length, 5, "middle added level A samples should remain 5");
assert.strictEqual(middleAddedQuestions.filter((question) => question.level === "B").length, 5, "middle added level B samples should remain 5");
assert.strictEqual(middleAddedQuestions.filter((question) => question.level === "C").length, 5, "middle added level C samples should remain 5");
const latestAddedQuestions = questions.filter((question) => Number(question.id) >= 30);
assert.strictEqual(latestAddedQuestions.length, 15, "latest added sample questions should be 15");
assert.strictEqual(latestAddedQuestions.filter((question) => question.level === "A").length, 5, "latest added level A samples should be 5");
assert.strictEqual(latestAddedQuestions.filter((question) => question.level === "B").length, 5, "latest added level B samples should be 5");
assert.strictEqual(latestAddedQuestions.filter((question) => question.level === "C").length, 5, "latest added level C samples should be 5");
assert.strictEqual(questions.filter((question) => question.level === "A").length, 18, "total level A questions should be 18");
assert.strictEqual(questions.filter((question) => question.level === "B").length, 13, "total level B questions should be 13");
assert.strictEqual(questions.filter((question) => question.level === "C").length, 13, "total level C questions should be 13");

const sessionSignatures = new Set();
for (let runIndex = 0; runIndex < 5; runIndex += 1) {
	const sessionQuestions = translationTrainingModule.createTranslationTrainingSessionQuestions(questions);
	assert.strictEqual(sessionQuestions.length, 10, `session ${runIndex + 1} should contain 10 questions`);
	const levelOrder = sessionQuestions.map((question) => String(question.level || "").toUpperCase());
	const idOrder = sessionQuestions.map((question) => Number(question.id));
	const aCount = levelOrder.filter((level) => level === "A").length;
	const bCount = levelOrder.filter((level) => level === "B").length;
	const cCount = levelOrder.filter((level) => level === "C").length;
	assert.strictEqual(aCount, 3, `session ${runIndex + 1} should contain 3 A questions`);
	assert.strictEqual(bCount, 4, `session ${runIndex + 1} should contain 4 B questions`);
	assert.strictEqual(cCount, 3, `session ${runIndex + 1} should contain 3 C questions`);
	assert.strictEqual(levelOrder[0] === "C", false, `session ${runIndex + 1} should not start with C`);
	assert.strictEqual(new Set(idOrder).size, 10, `session ${runIndex + 1} should not contain duplicated question IDs`);
	assert.strictEqual(levelOrder.includes("A") && levelOrder.includes("B") && levelOrder.includes("C"), true, `session ${runIndex + 1} should mix A/B/C levels`);

	let hasConsecutiveC = false;
	let maxStreak = 1;
	let currentStreak = 1;
	for (let index = 1; index < levelOrder.length; index += 1) {
		if (levelOrder[index] === "C" && levelOrder[index - 1] === "C") {
			hasConsecutiveC = true;
		}
		if (levelOrder[index] === levelOrder[index - 1]) {
			currentStreak += 1;
			maxStreak = Math.max(maxStreak, currentStreak);
		} else {
			currentStreak = 1;
		}
	}
	assert.strictEqual(hasConsecutiveC, false, `session ${runIndex + 1} should not place C consecutively`);
	assert.strictEqual(maxStreak <= 2, true, `session ${runIndex + 1} should avoid long same-level blocks`);

	const signature = `${levelOrder.join("")}:${idOrder.join("-")}`;
	sessionSignatures.add(signature);
	console.log(`[session-${runIndex + 1}] counts=A${aCount}/B${bCount}/C${cCount} ids=${idOrder.join(",")} order=${levelOrder.join("")} hasConsecutiveC=${hasConsecutiveC} firstLevel=${levelOrder[0]}`);
}
assert.strictEqual(sessionSignatures.size >= 2, true, "session generation should not be fixed to one order");

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
assert.deepStrictEqual(questions[2].parts[1].fixedPhrases, ["私は"], "question 3 second slash should keep obvious subject as fixed phrase");
assert.deepStrictEqual(questions[5].parts[1].fixedPhrases, ["ケンが"], "question 6 second slash should keep proper noun subject as fixed phrase");
assert.deepStrictEqual(questions[8].parts[0].fixedPhrases, ["マイは"], "question 9 first slash should keep proper noun subject as fixed phrase");
assert.deepStrictEqual(questions[11].parts[0].fixedPhrases, ["タクは"], "question 12 first slash should keep proper noun subject as fixed phrase");
assert.deepStrictEqual(questions[12].parts[0].fixedPhrases, ["アヤは"], "question 13 first slash should keep proper noun subject as fixed phrase");
assert.deepStrictEqual(questions[13].parts[0].fixedPhrases, ["リクは"], "question 14 first slash should keep proper noun subject as fixed phrase");
assert.strictEqual(questions[11].parts[0].selectionGroups.some((group) => group.options.includes("ケンは") || group.options.includes("リクは")), false, "question 12 should not include meaningless proper-name distractors");
assert.strictEqual(questions[12].parts[0].selectionGroups.some((group) => group.options.includes("ユキは") || group.options.includes("メイは")), false, "question 13 should not include meaningless proper-name distractors");
assert.strictEqual(questions[13].parts[0].selectionGroups.some((group) => group.options.includes("タクは") || group.options.includes("ケンは")), false, "question 14 should not include meaningless proper-name distractors");
assert.strictEqual(questions[10].parts[1].selectionGroups.some((group) => group.key === "she"), true, "question 11 should keep pronoun-based selection where reference interpretation matters");
assert.strictEqual(questions[11].parts[2].selectionGroups.some((group) => group.key === "he"), true, "question 12 should keep pronoun-based selection where reference interpretation matters");
assert.strictEqual(questions[13].parts[6].selectionGroups.some((group) => group.key === "they"), true, "question 14 should keep pronoun-based selection where reference interpretation matters");
assert.strictEqual(questions[0].parts[0].selectionGroups[0].correctIndex, 0, "question 1 first selection should map to the first displayed option");
assert.strictEqual(questions[0].parts[0].selectionGroups[1].correctIndex, 0, "question 1 second selection should map to the first displayed option");
assert.strictEqual(questions[0].parts[1].selectionGroups[0].correctIndex, 0, "question 1 third selection should map to the first displayed option");
assert.strictEqual(questions[1].parts[0].selectionGroups[0].correctIndex, 0, "question 2 first selection should map to the first displayed option");
assert.strictEqual(questions[1].parts[1].selectionGroups[0].correctIndex, 0, "question 2 second selection should map to the first displayed option");
assert.strictEqual(questions[2].parts[0].selectionGroups[0].correctIndex, 0, "question 3 first selection should map to the first displayed option");
assert.strictEqual(questions[2].parts[0].selectionGroups[1].correctIndex, 0, "question 3 first slash object selection should map to the first displayed option");
assert.strictEqual(questions[2].parts[1].selectionGroups[0].correctIndex, 1, "question 3 second slash verb selection should map to the second displayed option");
assert.strictEqual(questions[2].parts[1].selectionGroups[1].correctIndex, 0, "question 3 second slash object selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[0].selectionGroups[0].correctIndex, 0, "question 4 first selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[0].selectionGroups[1].correctIndex, 0, "question 4 first slash verb selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[0].selectionGroups[2].correctIndex, 0, "question 4 first slash place selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[1].selectionGroups[0].correctIndex, 0, "question 4 second slash action selection should map to the first displayed option");
assert.strictEqual(questions[3].parts[1].selectionGroups[1].correctIndex, 0, "question 4 second slash object selection should map to the first displayed option");
assert.strictEqual(questions[4].parts[0].selectionGroups[0].correctIndex, 0, "question 5 first selection should map to the first displayed option");
assert.strictEqual(questions[4].parts[1].selectionGroups[0].correctIndex, 0, "question 5 second selection should map to the first displayed option");
assert.strictEqual(questions[4].parts[1].selectionGroups[1].correctIndex, 0, "question 5 third selection should map to the first displayed option");
assert.strictEqual(questions[4].parts[1].selectionGroups[2].correctIndex, 0, "question 5 fourth selection should map to the first displayed option");
assert.strictEqual(questions[5].english, "I heard that / Ken visited his grandmother yesterday.", "question 6 should match A-1 sample text");
assert.strictEqual(questions[8].parts.length, 3, "question 9 should contain 3 slash parts");
assert.strictEqual(questions[9].parts[1].selectionGroups[0].options[0], "～して以来", "question 10 should include since-connection options");
assert.strictEqual(questions[13].parts.length, 7, "question 14 should contain 7 slash parts");
assert.strictEqual(questions[14].english, "I will give the present to my sister / tomorrow.", "question 15 should match A-4 sample text");
assert.strictEqual(questions[19].english, "I hear that / you are preparing for a school festival / with your classmates.", "question 20 should match B-4 sample text");
assert.strictEqual(questions[24].english, "Miki went to a bookstore / to buy a birthday present for her friend. / When she got there, / she couldn't find the book she wanted. / But a store clerk showed her another book, / and she decided to buy it.", "question 25 should match C-4 sample text");
assert.strictEqual(questions[28].parts.length, 7, "question 29 should contain 7 slash parts");
assert.deepStrictEqual(questions[14].parts[1].fixedPhrases, ["明日"], "question 15 second slash should be fixed-only");
assert.deepStrictEqual(questions[15].parts[1].fixedPhrases, ["来年"], "question 16 second slash should be fixed-only");
assert.deepStrictEqual(questions[16].parts[1].fixedPhrases, ["放課後に"], "question 17 second slash should be fixed-only");
assert.deepStrictEqual(questions[17].parts[1].fixedPhrases, ["3年間"], "question 18 second slash should be fixed-only");
assert.deepStrictEqual(questions[18].parts[0].fixedPhrases, ["ミカは"], "question 19 first slash should keep proper noun subject fixed");
assert.deepStrictEqual(questions[24].parts[0].fixedPhrases, ["ミキは"], "question 25 first slash should keep proper noun subject fixed");
assert.deepStrictEqual(questions[25].parts[0].fixedPhrases, ["コウタは"], "question 26 first slash should keep proper noun subject fixed");
assert.deepStrictEqual(questions[26].parts[0].fixedPhrases, ["ナナが"], "question 27 first slash should keep proper noun subject fixed");
assert.deepStrictEqual(questions[27].parts[0].fixedPhrases, ["ソラは"], "question 28 first slash should keep proper noun subject fixed");
assert.deepStrictEqual(questions[28].parts[0].fixedPhrases, ["ハルカは普段"], "question 29 first slash should keep proper noun subject fixed");
assert.deepStrictEqual(questions[19].parts[2].fixedPhrases, ["クラスメートと"], "question 20 third slash should be fixed-only");
assert.deepStrictEqual(questions[23].parts[2].fixedPhrases, ["長い間"], "question 24 third slash should be fixed-only");
assert.deepStrictEqual(questions[26].parts[3].fixedPhrases, ["約20分間"], "question 27 fourth slash should be fixed-only");
assert.strictEqual(questions[29].english, "My father told me / to come home early.", "question 30 should match A-9 sample text");
assert.strictEqual(questions[30].parts[1].selectionGroups.length, 0, "question 31 second slash should be fixed-only");
assert.strictEqual(questions[31].parts[0].selectionGroups[0].key, "if", "question 32 should keep if as a focused connector choice");
assert.strictEqual(questions[32].parts[0].selectionGroups.length, 0, "question 33 first slash should allow fixed-only progression");
assert.strictEqual(questions[33].parts[0].selectionGroups.length, 0, "question 34 first slash should allow fixed-only progression");
assert.strictEqual(questions[34].parts[2].selectionGroups.length, 0, "question 35 third slash should be fixed-only");
assert.strictEqual(questions[35].parts[1].selectionGroups[0].key, "so-he", "question 36 second slash should keep so as a focused connector choice");
assert.strictEqual(questions[36].parts[2].selectionGroups[0].key, "inside-it", "question 37 third slash should keep referent interpretation choice");
assert.strictEqual(questions[37].parts[1].selectionGroups.length, 0, "question 38 second slash should be fixed-only");
assert.strictEqual(questions[38].parts[2].selectionGroups.length, 0, "question 39 third slash should be fixed-only");
assert.strictEqual(questions[39].parts.length, 8, "question 40 should contain 8 slash parts");
assert.strictEqual(questions[40].parts.length, 8, "question 41 should contain 8 slash parts");
assert.strictEqual(questions[41].parts.length, 8, "question 42 should contain 8 slash parts");
assert.strictEqual(questions[42].parts.length, 9, "question 43 should contain 9 slash parts");
assert.strictEqual(questions[43].parts.length, 9, "question 44 should contain 9 slash parts");
assert.strictEqual(questions[39].parts[5].selectionGroups.some((group) => group.key === "one-liked"), true, "question 40 should keep one-referent interpretation choice");
assert.strictEqual(questions[40].parts[5].fixedPhrases.includes("それらの"), true, "question 41 should keep them reference to koalas in fixed phrase");
assert.strictEqual(questions[40].parts[6].fixedPhrases.includes("それらを友達に"), true, "question 41 should keep them reference to pictures in fixed phrase");
assert.strictEqual(questions[42].parts[8].selectionGroups.some((group) => group.key === "to-them"), true, "question 43 should keep them-referent interpretation choice");
assert.strictEqual(questions[43].parts[4].selectionGroups.some((group) => group.key === "it-before"), true, "question 44 should keep it-referent interpretation choice");
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
assert.strictEqual(layoutSequence[0].type, "fixed", "the layout sequence should place fixed phrases before selection columns");
assert.strictEqual(layoutSequence[0].phrases[0], "私は", "the fixed phrase block should expose the display phrase");
assert.strictEqual(layoutSequence[1].type, "column", "the layout sequence should include the first selection column");
assert.strictEqual(layoutSequence[1].groupIndex, 0, "the first selection column should carry its group index");
assert.strictEqual(layoutSequence[2].type, "column", "the layout sequence should include the second selection column");
assert.strictEqual(layoutSequence[2].groupIndex, 1, "the second selection column should carry its group index");

const fixedOnlySequence = translationTrainingModule.buildTranslationTrainingLayoutSequence(questions[14].parts[1], ["明日"]);
assert.strictEqual(fixedOnlySequence.length, 1, "fixed-only parts should still produce one layout item");
assert.strictEqual(fixedOnlySequence[0].type, "fixed", "fixed-only parts should render fixed-card layout entries");
const fixedOnlySequenceLatest = translationTrainingModule.buildTranslationTrainingLayoutSequence(questions[32].parts[0], ["トムは", "ケーキを買った"]);
assert.strictEqual(fixedOnlySequenceLatest.length, 1, "latest fixed-only parts should still produce one layout item");
assert.strictEqual(fixedOnlySequenceLatest[0].type, "fixed", "latest fixed-only parts should render fixed-card layout entries");

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
