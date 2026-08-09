const assert = require("assert");
const { getTrainingMenuCards, formatPointSummary } = require("../training-menu-config");

const pointConfig = {
  rewardByTrainingMode: {
    preposition: 1,
    response: 1,
    "irregular-verb": 1
  },
  dailyCapByTrainingMode: {
    preposition: 40,
    response: 60,
    "irregular-verb": 60
  }
};

const cards = getTrainingMenuCards(pointConfig);
const irregularCard = cards.find((card) => card.key === "irregular-verb");
const prepositionCard = cards.find((card) => card.key === "preposition");
const instantCard = cards.find((card) => card.key === "instant-composition");

assert.ok(irregularCard, "should include irregular-verb card");
assert.strictEqual(irregularCard.pointLabel, "＋1P / 1日60P");
assert.strictEqual(prepositionCard.pointLabel, "＋1P / 1日40P");
assert.strictEqual(instantCard.pointLabel, "準備中");
assert.strictEqual(formatPointSummary("response", pointConfig), "＋1P / 1日60P");
assert.strictEqual(formatPointSummary("irregular-verb-training", pointConfig), "＋1P / 1日60P");
assert.strictEqual(formatPointSummary("preposition-training", pointConfig), "＋1P / 1日40P");

console.log("training-menu-config tests passed");
