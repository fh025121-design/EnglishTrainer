(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.TrainingMenuConfig = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function getTrainingPointKey(mode, pointConfig = {}) {
    const normalized = String(mode || "").trim().toLowerCase();
    const candidates = [normalized];
    if (normalized === "preposition-training") {
      candidates.push("preposition");
    }
    if (normalized === "response-training") {
      candidates.push("response");
    }
    if (normalized === "irregular-verb-training") {
      candidates.push("irregular-verb");
    }
    if (normalized === "irregular-verb") {
      candidates.push("irregular-verb-training");
    }
    if (normalized === "phrase-spiral" || normalized === "idiom" || normalized === "phrase") {
      candidates.push("idiom");
    }
    if (normalized === "challenge" || normalized === "review" || normalized === "past-mistakes") {
      candidates.push("challenge");
    }
    return candidates.find((candidate) => {
      if (!candidate) return false;
      return Boolean(pointConfig?.rewardByTrainingMode?.[candidate] || pointConfig?.dailyCapByTrainingMode?.[candidate]);
    }) || normalized;
  }

  function formatPointSummary(mode, pointConfig = {}) {
    const pointKey = getTrainingPointKey(mode, pointConfig);
    const reward = Number(pointConfig?.rewardByTrainingMode?.[pointKey] || 0);
    const cap = Number(pointConfig?.dailyCapByTrainingMode?.[pointKey] || 0);
    if (!reward || !cap) {
      return "ポイント付与なし";
    }
    return `＋${reward}P / 1日${cap}P`;
  }

  function getTrainingMenuCards(pointConfig = {}) {
    return [
      {
        id: "trainingIdiomBtn",
        key: "idiom",
        title: "熟語特訓",
        description: "熟語の意味と使い方を整理して反復",
        mode: "phrase-spiral",
        isReady: true,
        pointLabel: "ポイント付与なし"
      },
      {
        id: "trainingPrepositionBtn",
        key: "preposition",
        title: "前置詞特訓",
        description: "前置詞の使い分けを集中して確認",
        mode: "preposition-training",
        isReady: true,
        pointLabel: formatPointSummary("preposition", pointConfig)
      },
      {
        id: "trainingResponseBtn",
        key: "response",
        title: "応答文特訓",
        description: "英語の返し方を自然に身につける",
        mode: "response-training",
        isReady: true,
        pointLabel: formatPointSummary("response", pointConfig)
      },
      {
        id: "trainingIrregularVerbBtn",
        key: "irregular-verb",
        title: "不規則動詞特訓",
        description: "原形を見て過去形と過去分詞を入力",
        mode: "irregular-verb-training",
        isReady: true,
        pointLabel: formatPointSummary("irregular-verb", pointConfig)
      },
      {
        id: "trainingInstantCompositionBtn",
        key: "instant-composition",
        title: "瞬間英作文",
        description: "準備中です",
        mode: null,
        isReady: false,
        pointLabel: "準備中"
      }
    ];
  }

  return {
    formatPointSummary,
    getTrainingMenuCards
  };
});
