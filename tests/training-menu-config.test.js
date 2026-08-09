const assert = require("assert");
const { getTrainingMenuCards, formatPointSummary } = require("../training-menu-config");

const pointConfig = {
  rewardByTrainingMode: {
    preposition: 1,
    response: 1,
    "irregular-verb": 1,
    idiom: 1
  },
  dailyCapByTrainingMode: {
    preposition: 30,
    response: 40,
    "irregular-verb": 40,
    idiom: 30
  }
};

const pointSummaryMap = {
  preposition: { earned: 12, cap: 30 },
  response: { earned: 25, cap: 40 },
  "irregular-verb": { earned: 8, cap: 40 },
  idiom: { earned: 0, cap: 0 }
};

const cards = getTrainingMenuCards(pointConfig, pointSummaryMap);
const irregularCard = cards.find((card) => card.key === "irregular-verb");
const prepositionCard = cards.find((card) => card.key === "preposition");
const idiomCard = cards.find((card) => card.key === "idiom");
const instantCard = cards.find((card) => card.key === "instant-composition");

assert.ok(irregularCard, "should include irregular-verb card");
assert.strictEqual(irregularCard.icon, "🔄");
assert.strictEqual(prepositionCard.icon, "🧭");
assert.strictEqual(idiomCard.icon, "📖");
assert.strictEqual(instantCard.icon, "⚡");
assert.strictEqual(irregularCard.pointLabel, "本日 8P / 40P");
assert.strictEqual(prepositionCard.pointLabel, "本日 12P / 30P");
assert.strictEqual(idiomCard.pointLabel, "本日 0P / 30P");
assert.strictEqual(instantCard.pointLabel, "準備中");
assert.strictEqual(formatPointSummary("response", pointConfig, { response: { earned: 25, cap: 40 } }), "本日 25P / 40P");
assert.strictEqual(formatPointSummary("irregular-verb-training", pointConfig, { "irregular-verb": { earned: 40, cap: 40 } }), "本日 40P / 40P ✓ 上限");
assert.strictEqual(formatPointSummary("preposition-training", pointConfig, { preposition: { earned: 0, cap: 30 } }), "本日 0P / 30P");

console.log("training-menu-config tests passed");
