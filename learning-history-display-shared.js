(function (global) {
  function resolveDayNumberForDisplay(entryLike) {
    const source = entryLike && typeof entryLike === "object" ? entryLike : {};
    const candidates = [source.dayNumber, source.day, source.studyDay];
    for (const candidate of candidates) {
      if (typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 1) {
        return Math.floor(candidate);
      }
      const text = String(candidate || "").trim();
      if (!text) continue;
      if (/^\d+$/.test(text)) {
        const parsed = Number(text);
        if (Number.isFinite(parsed) && parsed >= 1) {
          return Math.floor(parsed);
        }
      }
    }
    return 0;
  }

  function isLikelyPhraseLearningHistoryEntry(entryLike) {
    const entry = entryLike && typeof entryLike === "object" ? entryLike : {};
    const rawMode = String(entry.mode || "").trim().toLowerCase();
    if (rawMode) {
      return rawMode.includes("phrase") || rawMode.includes("idiom") || rawMode.includes("熟語");
    }
    const dayNumber = resolveDayNumberForDisplay(entry);
    if (dayNumber >= 1) return false;
    const questionCount = Math.max(0, Number(entry.questionCount) || 0);
    const activeStudySeconds = Math.max(0, Number(entry.activeStudySeconds) || 0);
    return questionCount > 0 || activeStudySeconds > 0;
  }

  function stripPcWeekDayPrefix(modeLike) {
    const mode = String(modeLike || "").trim();
    if (!mode) return "";
    return mode.replace(/^Week\s*\d+\s+[^\s]+(?:曜|曜日)?\s+/i, "").trim();
  }

  function resolvePcCategory(modeLike, entryLike = null) {
    const mode = stripPcWeekDayPrefix(modeLike);
    const lowerMode = mode.toLowerCase();
    if (!mode) {
      const dayNumber = resolveDayNumberForDisplay(entryLike);
      if (dayNumber >= 1) return "Day学習";
      return isLikelyPhraseLearningHistoryEntry(entryLike) ? "熟語特訓" : "不明";
    }
    if (mode === "Day" || mode === "Day学習" || lowerMode === "normal") return "Day学習";
    if (mode === "extraTraining" || lowerMode === "extratraining" || lowerMode === "extra-training" || mode === "追加特訓") return "追加特訓";
    if (mode === "過去の間違い" || lowerMode === "review" || lowerMode === "challenge") return "過去の間違い";
    if (mode === "前置詞特訓" || lowerMode === "preposition" || lowerMode === "preposition-training") return "前置詞特訓";
    if (mode === "応答文特訓" || lowerMode === "response" || lowerMode === "response-training") return "応答文特訓";
    if (mode === "不規則動詞特訓" || lowerMode === "irregular-verb" || lowerMode === "irregular-verb-training") return "不規則動詞特訓";
    if (mode === "単語・熟語学習" || mode === "Vocabulary" || lowerMode === "vocabulary") return "単語練習";
    if (mode.includes("熟語") || lowerMode.includes("phrase") || lowerMode.includes("idiom")) return "熟語特訓";
    if (mode.includes("単語")) return "単語特訓";
    return mode || "不明";
  }

  function resolvePcModeLabel(entryLike, options = {}) {
    const entry = entryLike && typeof entryLike === "object" ? entryLike : {};
    const normalized = resolvePcCategory(entry.mode, entry);
    if (normalized !== "Day学習") return normalized;
    if (!options?.withDayNumber) return normalized;
    const dayNumber = resolveDayNumberForDisplay(entry);
    const fallbackDayNumber = Number(options?.fallbackDayNumber);
    const effectiveDayNumber = dayNumber >= 1
      ? dayNumber
      : (Number.isFinite(fallbackDayNumber) && fallbackDayNumber >= 1 ? Math.floor(fallbackDayNumber) : 0);
    if (effectiveDayNumber < 1) return normalized;
    return `Day学習（Day${effectiveDayNumber}）`;
  }

  function resolvePcDaySummaryLabel(dayEntries) {
    const source = Array.isArray(dayEntries) ? dayEntries : [];
    const dayNumberSet = new Set(
      source
        .filter((entry) => resolvePcCategory(entry?.mode, entry) === "Day学習")
        .map((entry) => resolveDayNumberForDisplay(entry))
        .filter((value) => value >= 1)
    );
    if (dayNumberSet.size === 1) {
      const [dayNumber] = [...dayNumberSet];
      return `Day学習（Day${dayNumber}）`;
    }
    return "Day学習";
  }

  function getPcModeBucket(modeOrEntry) {
    const entryLike = modeOrEntry && typeof modeOrEntry === "object" ? modeOrEntry : null;
    const mode = entryLike ? entryLike.mode : modeOrEntry;
    const normalized = resolvePcCategory(mode, entryLike);
    if (normalized === "Day学習") return { key: "day", label: "Day学習" };
    if (normalized === "追加特訓") return { key: "extra", label: "追加特訓" };
    if (normalized === "単語特訓") return { key: "word", label: "単語特訓" };
    if (normalized === "熟語特訓") return { key: "phrase", label: "熟語特訓" };
    if (normalized === "不規則動詞特訓") return { key: "irregularVerb", label: "不規則動詞特訓" };
    if (normalized === "過去の間違い") return { key: "review", label: "過去の間違い" };
    const fallbackLabel = normalized || "不明";
    return { key: `mode:${fallbackLabel}`, label: fallbackLabel };
  }

  function getPcModeSummaryOrder() {
    return ["day", "extra", "phrase", "irregularVerb", "review", "word"];
  }

  function getPcModeSummaryEntries(summary) {
    const modeTotals = summary?.modeTotals && typeof summary.modeTotals === "object" ? summary.modeTotals : {};
    const knownOrder = getPcModeSummaryOrder();
    const keys = Object.keys(modeTotals);
    const dynamicKeys = keys.filter((key) => !knownOrder.includes(key)).sort((left, right) => {
      const leftLabel = String(modeTotals[left]?.label || "");
      const rightLabel = String(modeTotals[right]?.label || "");
      return leftLabel.localeCompare(rightLabel, "ja");
    });
    return [...knownOrder, ...dynamicKeys]
      .map((key) => ({ key, ...(modeTotals[key] || {}) }))
      .filter((entry) => Math.max(0, Number(entry.questionCount) || 0) > 0 || Math.max(0, Number(entry.activeStudySeconds) || 0) > 0);
  }

  function getPcSummaryRowLabel(entryLike, options = {}) {
    const entry = entryLike && typeof entryLike === "object" ? entryLike : {};
    const rawLabel = String(entry.label || "").trim() || "不明";
    if (rawLabel === "-") return "不明";
    if (rawLabel === "Day学習" && options?.dayLabel) return String(options.dayLabel);
    return rawLabel;
  }

  global.LearningHistoryDisplayShared = Object.freeze({
    resolveDayNumberForDisplay,
    isLikelyPhraseLearningHistoryEntry,
    stripPcWeekDayPrefix,
    resolvePcCategory,
    resolvePcModeLabel,
    resolvePcDaySummaryLabel,
    getPcModeBucket,
    getPcModeSummaryOrder,
    getPcModeSummaryEntries,
    getPcSummaryRowLabel
  });
})(window);
