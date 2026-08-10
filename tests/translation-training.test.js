const assert = require("assert");
const path = require("path");

const translationTrainingModule = require(path.join(__dirname, "..", "mobile", "translation-training-data.js"));
const questions = translationTrainingModule.getTranslationTrainingQuestions();

assert.strictEqual(Array.isArray(questions), true, "translation training questions should be available");
assert.strictEqual(questions.length, 74, "translation training should contain 74 questions including the newest 15 samples");
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
const latestAddedQuestions = questions.filter((question) => Number(question.id) >= 60);
assert.strictEqual(latestAddedQuestions.length, 15, "latest added sample questions should be 15");
assert.strictEqual(latestAddedQuestions.filter((question) => question.level === "A").length, 3, "latest added level A samples should be 3");
assert.strictEqual(latestAddedQuestions.filter((question) => question.level === "B").length, 6, "latest added level B samples should be 6");
assert.strictEqual(latestAddedQuestions.filter((question) => question.level === "C").length, 6, "latest added level C samples should be 6");
const priorLatestAddedQuestions = questions.filter((question) => Number(question.id) >= 45 && Number(question.id) <= 59);
assert.strictEqual(priorLatestAddedQuestions.length, 15, "prior latest added sample questions should remain 15");
assert.strictEqual(priorLatestAddedQuestions.filter((question) => question.level === "A").length, 3, "prior latest added level A samples should remain 3");
assert.strictEqual(priorLatestAddedQuestions.filter((question) => question.level === "B").length, 6, "prior latest added level B samples should remain 6");
assert.strictEqual(priorLatestAddedQuestions.filter((question) => question.level === "C").length, 6, "prior latest added level C samples should remain 6");
assert.strictEqual(questions.filter((question) => question.level === "A").length, 24, "total level A questions should be 24");
assert.strictEqual(questions.filter((question) => question.level === "B").length, 25, "total level B questions should be 25");
assert.strictEqual(questions.filter((question) => question.level === "C").length, 25, "total level C questions should be 25");

const sessionSignatures = new Set();
for (let runIndex = 0; runIndex < 10; runIndex += 1) {
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
assert.strictEqual(questions[44].english, "I have to finish this report / before dinner.", "question 45 should match A-14 sample text");
assert.strictEqual(questions[45].english, "This bag is cheaper / than that one.", "question 46 should match A-15 sample text");
assert.strictEqual(questions[46].english, "I need something / to drink.", "question 47 should match A-16 sample text");
assert.strictEqual(questions[47].english, "After I finished breakfast, / my father asked me / to help him wash the car.", "question 48 should match B-14 sample text");
assert.strictEqual(questions[48].english, "I have never used this camera, / so my sister showed me / how to use it.", "question 49 should match B-15 sample text");
assert.strictEqual(questions[49].english, "If you come to my house tomorrow, / we can watch the movie / together.", "question 50 should match B-16 sample text");
assert.strictEqual(questions[50].english, "When the teacher came into the room, / the students were talking / about the school trip.", "question 51 should match B-17 sample text");
assert.strictEqual(questions[51].english, "Rina couldn't go to the party / because she had to work / that evening.", "question 52 should match B-18 sample text");
assert.strictEqual(questions[52].english, "The book was more interesting / than I expected, / so I finished it in one day.", "question 53 should match B-19 sample text");
assert.strictEqual(questions[53].english, "Aki wanted to make dinner for her family, / but she did not know what to cook. / She looked in the refrigerator / and found some chicken and vegetables. / Then she searched for an easy recipe online. / After reading it, / she decided to make chicken soup. / Her family liked it very much, / so Aki wanted to make it again.", "question 54 should match C-14 sample text");
assert.strictEqual(questions[54].english, "Hiro went to the station / to meet his cousin from Osaka. / He arrived there early, / so he waited at a coffee shop nearby. / While he was drinking juice, / his cousin sent him a message. / The train was twenty minutes late, / but Hiro did not mind waiting. / He was happy when his cousin finally arrived.", "question 55 should match C-15 sample text");
assert.strictEqual(questions[55].english, "Mina joined the school tennis club / this spring. / At first, she could not hit the ball well, / and she often felt tired after practice. / However, she practiced three times a week / and asked older students for advice. / After two months, / she could play much better. / Her coach told her / that she had improved a lot.", "question 56 should match C-16 sample text");
assert.strictEqual(questions[56].english, "Koji needed a book / for his history report. / He first looked for it at the school library, / but another student was using it. / The librarian told him / that the city library had the same book. / So Koji went there after school. / He found the book / and borrowed it for one week. / He finished his report two days later.", "question 57 should match C-17 sample text");
assert.strictEqual(questions[57].english, "Yuna received an e-mail from her friend / who lives in Canada. / Her friend asked her / what Japanese food she liked best. / Yuna thought about the question / for a few minutes. / She decided to write about curry rice / because her family often makes it together. / She also sent her friend a picture / that she took at dinner last week.", "question 58 should match C-18 sample text");
assert.strictEqual(questions[58].english, "Takumi and his classmates planned a school event / for younger students. / They wanted everyone to enjoy it, / so they prepared several games. / On the morning of the event, / one of the games did not work well. / The students were worried, / but their teacher gave them an idea. / They changed the rules a little, / and the younger students had a great time. / Takumi was glad that they did not give up.", "question 59 should match C-19 sample text");
assert.strictEqual(questions[59].english, "Have you ever been to Kyoto / before?", "question 60 should match A-17 sample text");
assert.strictEqual(questions[60].english, "You should take an umbrella / because it may rain.", "question 61 should match A-18 sample text");
assert.strictEqual(questions[61].english, "This box is too heavy / for me to carry.", "question 62 should match A-19 sample text");
assert.strictEqual(questions[62].english, "Since I moved to this town, / I have made many friends / at school.", "question 63 should match B-20 sample text");
assert.strictEqual(questions[63].english, "My teacher told us / that the museum would close early / that day.", "question 64 should match B-21 sample text");
assert.strictEqual(questions[64].english, "I didn't know / which bus to take, / so I asked a station worker.", "question 65 should match B-22 sample text");
assert.strictEqual(questions[65].english, "The boy who is standing by the door / is my cousin / from Nagoya.", "question 66 should match B-23 sample text");
assert.strictEqual(questions[66].english, "Mika was so tired / that she went to bed / before nine.", "question 67 should match B-24 sample text");
assert.strictEqual(questions[67].english, "I was looking for my keys / when my brother found them / under the table.", "question 68 should match B-25 sample text");
assert.strictEqual(questions[68].english, "Mai received a message from her cousin / on Saturday morning. / Her cousin wanted to visit a new shopping mall / near Mai's house. / Mai had never been there, / so they decided to go together. / When they arrived, / many people were waiting outside. / They learned that the mall would open / thirty minutes later. / Instead of going home, / they waited at a nearby cafe.", "question 69 should match C-20 sample text");
assert.strictEqual(questions[69].english, "Ken's class was preparing for a school festival / when their teacher gave them some news. / The room they planned to use / was not available. / At first, the students were disappointed, / because they had already decorated it. / However, another teacher offered them a larger room. / The students moved their decorations there / and changed their plan a little. / In the end, / more people could visit their activity / than they had expected.", "question 70 should match C-21 sample text");
assert.strictEqual(questions[70].english, "Ryo wanted to improve his English, / so he started watching short videos / in English every evening. / At first, he could understand only a few words. / His teacher told him / not to worry about understanding everything. / She suggested watching the same video several times. / Ryo followed her advice, / and after a few weeks, / he noticed that he could understand much more. / Now he enjoys studying English this way.", "question 71 should match C-22 sample text");
assert.strictEqual(questions[71].english, "Nana's grandmother lives in a small town / near the sea. / During summer vacation, / Nana stayed with her for three days. / One morning, her grandmother asked her / to help pick vegetables in the garden. / After they finished the work, / they used some of the vegetables / to make lunch together. / Nana had never cooked that dish before, / but her grandmother showed her what to do. / Nana liked the meal so much / that she asked for the recipe.", "question 72 should match C-23 sample text");
assert.strictEqual(questions[72].english, "Sota was going to play soccer / with his friends after school, / but one of them hurt his leg / during P.E. class. / They decided not to play soccer that day. / Instead, they went to the library / to work on their science project. / While they were looking for information, / they found an interesting book about space. / They borrowed it / because they thought it would help their project.", "question 73 should match C-24 sample text");
assert.strictEqual(questions[73].english, "Eri saw a poster about a volunteer event / at her community center. / The event was for people / who wanted to clean a nearby park. / Eri had never joined a volunteer event before, / but she decided to try it. / On Sunday morning, / she met the other volunteers at the park. / They picked up trash / and planted some flowers. / After the work was finished, / Eri was tired but happy. / She said that she wanted to join again / if there was another event.", "question 74 should match C-25 sample text");
assert.strictEqual(questions[59].parts[0].selectionGroups[0].key, "have-never-been", "question 60 should keep current perfect experience choice");
assert.strictEqual(questions[60].parts[0].selectionGroups[0].key, "should", "question 61 should keep should as a focused modal choice");
assert.strictEqual(questions[61].parts[0].selectionGroups[0].key, "too", "question 62 should keep too as a focused comparative-intensity choice");
assert.strictEqual(questions[62].parts[0].selectionGroups[0].key, "since", "question 63 should keep since as a focused connector choice");
assert.strictEqual(questions[63].parts[1].selectionGroups.some((group) => group.key === "that"), true, "question 64 should keep that-clause choice");
assert.strictEqual(questions[64].parts[1].selectionGroups.some((group) => group.key === "which-bus-to-take"), true, "question 65 should keep which-to construction choice");
assert.strictEqual(questions[65].parts[0].selectionGroups.some((group) => group.key === "who"), true, "question 66 should keep relative clause choice");
assert.strictEqual(questions[66].parts[0].selectionGroups.some((group) => group.key === "so"), true, "question 67 should keep so-that relation choice");
assert.strictEqual(questions[67].parts[1].selectionGroups.some((group) => group.key === "when"), true, "question 68 should keep when-clause choice");
assert.strictEqual(questions[68].parts[4].selectionGroups.some((group) => group.key === "had-never-been"), true, "question 69 should keep the had-never-been interpretation choice");
assert.strictEqual(questions[69].parts[2].selectionGroups.some((group) => group.key === "they-planned"), true, "question 70 should keep the relative-clause interpretation choice");
assert.strictEqual(questions[70].parts[1].selectionGroups.some((group) => group.key === "so"), true, "question 71 should keep so-clause choice");
assert.strictEqual(questions[71].parts[5].selectionGroups.some((group) => group.key === "to-help-pick"), true, "question 72 should keep ask 人 to / help structure");
assert.strictEqual(questions[72].parts[4].selectionGroups.some((group) => group.key === "not-to-play"), true, "question 73 should keep negative decision choice");
assert.strictEqual(questions[73].parts[3].selectionGroups.some((group) => group.key === "who"), true, "question 74 should keep relative clause choice");
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
