(function () {
  function normalizeModeKey(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeIdList(values) {
    const seen = new Set();
    const out = [];
    (Array.isArray(values) ? values : []).forEach((entry) => {
      const id = String(entry || "").trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      out.push(id);
    });
    return out;
  }

  function resolveBankIds(bank) {
    const candidates = Array.isArray(bank) ? bank : [];
    return normalizeIdList(candidates.map((question) => {
      if (!question || typeof question !== "object") return "";
      const directId = String(question.id || "").trim();
      if (directId) return directId;
      return String(question.base || question.answer || question.question || question.english || question.japanese || question.preposition || "").trim();
    }));
  }

  function ensureModeBucket(store, modeKey) {
    const safeStore = store && typeof store === "object" && !Array.isArray(store) ? store : { byMode: {} };
    safeStore.byMode = safeStore.byMode && typeof safeStore.byMode === "object" && !Array.isArray(safeStore.byMode) ? safeStore.byMode : {};
    const bucketKey = normalizeModeKey(modeKey);
    if (!bucketKey) return safeStore;
    if (!Array.isArray(safeStore.byMode[bucketKey])) {
      safeStore.byMode[bucketKey] = [];
    }
    return safeStore;
  }

  function sanitizeCoverageStore(store) {
    const fallback = buildDefaultCoverageStore();
    if (!store || typeof store !== "object" || Array.isArray(store)) return fallback;
    const safeStore = store;
    safeStore.byMode = safeStore.byMode && typeof safeStore.byMode === "object" && !Array.isArray(safeStore.byMode) ? safeStore.byMode : {};
    const nextByMode = {};
    Object.entries(safeStore.byMode).forEach(([modeKey, value]) => {
      const normalizedKey = normalizeModeKey(modeKey);
      if (!normalizedKey) return;
      nextByMode[normalizedKey] = normalizeIdList(Array.isArray(value) ? value : []);
    });
    safeStore.byMode = nextByMode;
    return safeStore;
  }

  function buildDefaultCoverageStore() {
    return { byMode: {} };
  }

  function markQuestionShown(store, modeKey, questionId) {
    const safeStore = sanitizeCoverageStore(store);
    const normalizedModeKey = normalizeModeKey(modeKey);
    const normalizedId = String(questionId || "").trim();
    if (!normalizedModeKey || !normalizedId) return safeStore;
    const bucket = ensureModeBucket(safeStore, normalizedModeKey).byMode[normalizedModeKey];
    if (!bucket.includes(normalizedId)) {
      bucket.push(normalizedId);
    }
    return safeStore;
  }

  function buildCoverageSummary(store, modeKey, bank) {
    const safeStore = sanitizeCoverageStore(store);
    const normalizedModeKey = normalizeModeKey(modeKey);
    const bankIds = resolveBankIds(bank);
    const seenIds = normalizeIdList((safeStore.byMode[normalizedModeKey] || []).filter((id) => bankIds.includes(String(id))))
      .filter((id) => bankIds.includes(id));
    const unseenIds = bankIds.filter((id) => !seenIds.includes(id));
    const registeredTotal = bankIds.length;
    const seenCount = seenIds.length;
    const unseenCount = unseenIds.length;

    return {
      modeKey: normalizedModeKey,
      registeredTotal,
      targetCount: registeredTotal,
      seenCount,
      unseenCount,
      seenIds,
      unseenIds,
      coverageRate: registeredTotal > 0 ? Number(((seenCount / registeredTotal) * 100).toFixed(2)) : 0
    };
  }

  const api = {
    buildDefaultCoverageStore,
    sanitizeCoverageStore,
    markQuestionShown,
    buildCoverageSummary,
    normalizeModeKey,
    normalizeIdList,
    resolveBankIds
  };

  if (typeof window !== "undefined") {
    window.trainingCoverage = api;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
