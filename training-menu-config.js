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

  function formatPointSummary(mode, pointConfig = {}, pointSummaryMap = {}) {
    const pointKey = getTrainingPointKey(mode, pointConfig);
    const summary = pointSummaryMap?.[pointKey] || pointSummaryMap?.[mode] || null;
    const earned = Number(summary?.earned || 0);
    const cap = Number(summary?.cap || pointConfig?.dailyCapByTrainingMode?.[pointKey] || 0);
    if (!cap) {
      return "ポイントなし";
    }
    if (earned >= cap) {
      return `本日 ${earned}P / ${cap}P ✓ 上限`;
    }
    return `本日 ${earned}P / ${cap}P`;
  }

  function getTrainingMenuCards(pointConfig = {}, pointSummaryMap = {}) {
    return [
      {
        id: "trainingIdiomBtn",
        key: "idiom",
        title: "熟語特訓",
        icon: "📖",
        mode: "phrase-spiral",
        isReady: true,
        pointLabel: formatPointSummary("idiom", pointConfig, pointSummaryMap)
      },
      {
        id: "trainingChallengeBtn",
        key: "challenge",
        title: "過去の間違いに挑戦",
        icon: "🎯",
        mode: "challenge",
        isReady: true,
        pointLabel: formatPointSummary("challenge", pointConfig, pointSummaryMap)
      },
      {
        id: "trainingPrepositionBtn",
        key: "preposition",
        title: "前置詞特訓",
        icon: "🧭",
        mode: "preposition-training",
        isReady: true,
        pointLabel: formatPointSummary("preposition", pointConfig, pointSummaryMap)
      },
      {
        id: "trainingResponseBtn",
        key: "response",
        title: "応答文特訓",
        icon: "🗣️",
        mode: "response-training",
        isReady: true,
        pointLabel: formatPointSummary("response", pointConfig, pointSummaryMap)
      },
      {
        id: "trainingIrregularVerbBtn",
        key: "irregular-verb",
        title: "不規則動詞特訓",
        icon: "🔄",
        mode: "irregular-verb-training",
        isReady: true,
        pointLabel: formatPointSummary("irregular-verb", pointConfig, pointSummaryMap)
      },
      {
        id: "trainingInstantCompositionBtn",
        key: "instant-composition",
        title: "瞬間英作文",
        icon: "⚡",
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
