const assert = require("assert");
const { getTrainingMenuCards, formatPointSummary } = require("../training-menu-config");

const pointConfig = {
  rewardByTrainingMode: {
    preposition: 1,
    response: 1,
    "irregular-verb": 2,
    challenge: 3,
    idiom: 1
  },
  dailyCapByTrainingMode: {
    preposition: 30,
    response: 40,
    "irregular-verb": 100,
    challenge: 300,
    idiom: 30
  }
};

const pointSummaryMap = {
  preposition: { earned: 12, cap: 30 },
  response: { earned: 25, cap: 40 },
  challenge: { earned: 28, cap: 300 },
  "irregular-verb": { earned: 8, cap: 100 },
  idiom: { earned: 0, cap: 0 }
};

const cards = getTrainingMenuCards(pointConfig, pointSummaryMap);
const irregularCard = cards.find((card) => card.key === "irregular-verb");
const challengeCard = cards.find((card) => card.key === "challenge");
const prepositionCard = cards.find((card) => card.key === "preposition");
const idiomCard = cards.find((card) => card.key === "idiom");
const grammarCard = cards.find((card) => card.key === "grammar");
const instantCard = cards.find((card) => card.key === "instant-composition");

assert.ok(irregularCard, "should include irregular-verb card");
assert.strictEqual(irregularCard.icon, "🔄");
assert.ok(challengeCard, "should include challenge card");
assert.strictEqual(challengeCard.icon, "🎯");
assert.strictEqual(prepositionCard.icon, "🧭");
assert.strictEqual(idiomCard.icon, "📖");
assert.ok(grammarCard, "should include grammar card");
assert.strictEqual(grammarCard.title, "文法");
assert.strictEqual(grammarCard.icon, "🧠");
assert.strictEqual(instantCard.icon, "⚡");
assert.strictEqual(challengeCard.pointLabel, "本日 28P / 300P");
assert.strictEqual(challengeCard.pointDetail, undefined);
assert.strictEqual(irregularCard.pointLabel, "本日 8P / 100P");
assert.strictEqual(prepositionCard.pointLabel, "本日 12P / 30P");
assert.strictEqual(idiomCard.pointLabel, "本日 0P / 30P");
assert.strictEqual(instantCard.pointLabel, "準備中");
assert.strictEqual(formatPointSummary("response", pointConfig, { response: { earned: 25, cap: 40 } }), "本日 25P / 40P");
assert.strictEqual(formatPointSummary("challenge", pointConfig, { challenge: { earned: 28, cap: 300 } }), "本日 28P / 300P");
assert.strictEqual(formatPointSummary("irregular-verb-training", pointConfig, { "irregular-verb": { earned: 100, cap: 100 } }), "本日 100P / 100P ✓ 上限");
assert.strictEqual(formatPointSummary("preposition-training", pointConfig, { preposition: { earned: 0, cap: 30 } }), "本日 0P / 30P");

console.log("training-menu-config tests passed");
