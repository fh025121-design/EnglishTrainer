(function () {
  const MOBILE_LEARNING_HISTORY_STORAGE_KEY = "english-trainer-mobile-learning-history-v1";
  const MOBILE_LEARNING_HISTORY_MAX_ENTRIES = 1000;
  const MOBILE_ADMIN_LEARNING_HISTORY_PIN = "12345";
  const MOBILE_ADMIN_FAMILY_ID = "inoue";
  const MOBILE_DEVICE_ID_STORAGE_KEY = "english-trainer-mobile-device-id-v1";
  const MOBILE_FAMILY_SON_UID_CACHE_KEY = "english-trainer-mobile-son-uid-v1";
  const MOBILE_PENDING_LEARNING_HISTORY_STORAGE_KEY = "english-trainer-mobile-pending-learning-history-v1";
  const MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY = "english-trainer-mobile-vocabulary-today-history-v1";
  const MOBILE_VOCABULARY_RELOAD_GUARD_STORAGE_KEY = "englishTrainerMobileReloadGuard";
  const MOBILE_VOCABULARY_NORMAL_PROGRESS_STORAGE_KEY = "english-trainer-mobile-vocabulary-normal-progress-v1";
  const MOBILE_VOCABULARY_NORMAL_QUEUE_STORAGE_KEY = "english-trainer-mobile-vocabulary-normal-queue-v1";
  const MOBILE_FIXED_CHILD_UID = "fgoUGLIB3HNwtTiGnGmejp3zUSo2";
  const MOBILE_LEARNING_HISTORY_DEVICE_NAME_SON = "長男モバイル";
  const MOBILE_LEARNING_HISTORY_DEVICE_NAME_OTHER = "その他";
  const HOME_ACCOUNT_PARENT_EMAIL_PREFIX = "fh025";
  const HOME_ACCOUNT_PARENT_ALIAS = "fh025121";
  const HOME_ACCOUNT_SON_ALIAS = "RRR";
  const MOBILE_STORAGE_KEY = "englishTrainerMobile_state_v1";
  const MOBILE_WORD_ORDER_STATS_STORAGE_KEY = "englishTrainerMobileWordOrderStats_v1";
  const MOBILE_WORD_ORDER_STATS_LEGACY_OWNER_UID_KEY = "englishTrainerMobileWordOrderStatsOwnerUid_v1";
  const MOBILE_WORD_ORDER_STATS_PENDING_SYNC_STORAGE_KEY = "english-trainer-mobile-word-order-stats-pending-sync-v1";
  const SPEAKING_PROGRESS_KEY = "englishTrainerSpeakingProgress";
  const SPEAKING_RECENT_PROGRESS_KEY = "englishTrainerSpeakingRecentProgress_v1";
  const SPEAKING_REVIEW_STATS_KEY = "englishTrainerSpeakingReviewStats_v1";
  const SPEAKING_REVIEW_SESSION_KEY = "englishTrainerSpeakingReviewSession_v1";
  const SPEAKING_WORD_DAY_COMPLETION_KEY = "englishTrainerSpeakingWordDayCompletion_v1";
  const SPEAKING_REVIEW_MAX_GROUPS = 20;
  const SPEAKING_REVIEW_SET_SIZE = 4;
  const SETTINGS_INFO = window.ENGLISH_TRAINER_RELEASE_INFO || Object.freeze({
    adminPassword: "12345",
    releaseHistory: []
  });
  const APP_VERSION = SETTINGS_INFO.releaseHistory[0]?.version || "0/0000/0000";
  const MOBILE_POINT_STORAGE_KEY = "english-trainer-mobile-points-v1";
  const MOBILE_POINT_PENDING_SYNC_STORAGE_KEY = "english-trainer-mobile-points-pending-sync-v1";
  const MOBILE_POINT_CONFIG = Object.freeze({
    homeworkSpeakingDailyMax: 30,
    reviewSpeakingDailyMax: 400,
    wordOrderDailyMax: 50,
    totalDailyMax: Number.POSITIVE_INFINITY,
    homeworkCompletionReward: 10,
    wordOrderCorrectReward: 1,
    seasonalNote: "summer-2026"
  });
  const MOBILE_POINT_HISTORY_PAGE_SIZE = 3;
  const MOBILE_POINT_REWARD_SCREEN_CONFIG = Object.freeze({
    homework: Object.freeze({
      title: "🎉 宿題の発話お疲れさま！",
      categoryLabel: "宿題発話"
    }),
    review: Object.freeze({
      title: "🎉 復習お疲れさま！",
      categoryLabel: "復習発話"
    }),
    translation: Object.freeze({
      title: "🎉 和訳トレーニングお疲れさま！",
      categoryLabel: "和訳"
    })
  });
  const MOBILE_DAY_MIN = 1;
  const MOBILE_DAY_MAX = 40;
  const SPEAKING_WEEK_MIN = 1;
  const SPEAKING_WEEK_MAX = 20;
  const ENABLE_SPEAKING_KEYWORD_DEBUG = true;
  const SESSION_QUESTION_COUNT = 10;
  const WORD_ORDER_DAY_RANGES = Object.freeze([
    Object.freeze({ value: "1-7", label: "Day 1 - 7", startDay: 1, endDay: 7 }),
    Object.freeze({ value: "8-14", label: "Day 8 - 14", startDay: 8, endDay: 14 }),
    Object.freeze({ value: "15-21", label: "Day 15 - 21", startDay: 15, endDay: 21 }),
    Object.freeze({ value: "22-28", label: "Day 22 - 28", startDay: 22, endDay: 28 }),
    Object.freeze({ value: "29-35", label: "Day 29 - 35", startDay: 29, endDay: 35 }),
    Object.freeze({ value: "36-40", label: "Day 36 - 40", startDay: 36, endDay: 40 })
  ]);
  let mobilePointStateCache = null;
  let mobilePointStateCacheUid = "";
  let mobilePointHistoryVisibleCount = MOBILE_POINT_HISTORY_PAGE_SIZE;
  let mobileHomeTodayLearningSource = "localStorage";
  let mobileHomeTodayLearningEntries = [];
  let mobileHomeTodayLearningRefreshPromise = null;
  let mobilePointSyncCurrentUid = "";
  let mobilePointSyncReady = false;
  let mobilePointSyncAllowCreate = false;
  let mobilePointSyncInFlight = null;
  let mobilePointSyncQueued = false;
  let mobilePointSyncUnsubscribe = null;
  let wordOrderStatsCache = null;
  let wordOrderStatsSyncCurrentUid = "";
  let wordOrderStatsSyncReady = false;
  let wordOrderStatsSyncInFlight = null;
  let wordOrderStatsSyncQueued = false;
  let wordOrderStatsSyncUnsubscribe = null;

  function formatPointValue(value) {
    return `${new Intl.NumberFormat("ja-JP").format(Math.max(0, Math.floor(Number(value) || 0)))}P`;
  }

  function getMobilePointStorageKey(uid = getCurrentMobilePointSyncUid()) {
    const safeUid = String(uid || "").trim();
    return safeUid ? `${MOBILE_POINT_STORAGE_KEY}:${safeUid}` : MOBILE_POINT_STORAGE_KEY;
  }

  function getMobilePointPendingSyncStorageKey(uid = getCurrentMobilePointSyncUid()) {
    const safeUid = String(uid || "").trim();
    return safeUid ? `${MOBILE_POINT_PENDING_SYNC_STORAGE_KEY}:${safeUid}` : MOBILE_POINT_PENDING_SYNC_STORAGE_KEY;
  }

  function getMobilePointJstDateKey(offsetDays = 0) {
    const base = Date.now() + (Number(offsetDays || 0) * 24 * 60 * 60 * 1000);
    return formatTimestampToJstDisplay(base).slice(0, 10).replace(/\//g, "-");
  }

  function createDefaultMobilePointState() {
    return {
      homeworkSpeakingPointsByDate: {},
      homeworkSpeakingCompletionsByDate: {},
      reviewSpeakingPointsByDate: {},
      reviewSpeakingCountByDate: {},
      wordOrderPointsByDate: {},
      translationTrainingPointsByDate: {},
      todayEarned: 0,
      previousDayEarned: 0,
      totalEarned: 0
    };
  }

  function sanitizeMobilePointState(value) {
    const source = value && typeof value === "object" ? value : {};
    const homeworkSpeakingPointsByDate = source.homeworkSpeakingPointsByDate && typeof source.homeworkSpeakingPointsByDate === "object"
      ? Object.fromEntries(
        Object.entries(source.homeworkSpeakingPointsByDate).map(([dayKey, earned]) => [String(dayKey), Math.max(0, Math.floor(Number(earned) || 0))])
      )
      : {};
    const homeworkSpeakingCompletionsByDate = source.homeworkSpeakingCompletionsByDate && typeof source.homeworkSpeakingCompletionsByDate === "object"
      ? Object.fromEntries(
        Object.entries(source.homeworkSpeakingCompletionsByDate).map(([dayKey, count]) => [String(dayKey), Math.max(0, Math.floor(Number(count) || 0))])
      )
      : {};
    const reviewSpeakingPointsByDate = source.reviewSpeakingPointsByDate && typeof source.reviewSpeakingPointsByDate === "object"
      ? Object.fromEntries(
        Object.entries(source.reviewSpeakingPointsByDate).map(([dayKey, earned]) => [String(dayKey), Math.max(0, Math.floor(Number(earned) || 0))])
      )
      : {};
    const reviewSpeakingCountByDate = source.reviewSpeakingCountByDate && typeof source.reviewSpeakingCountByDate === "object"
      ? Object.fromEntries(
        Object.entries(source.reviewSpeakingCountByDate).map(([dayKey, count]) => [String(dayKey), Math.max(0, Math.floor(Number(count) || 0))])
      )
      : {};
    const wordOrderPointsByDate = source.wordOrderPointsByDate && typeof source.wordOrderPointsByDate === "object"
      ? Object.fromEntries(
        Object.entries(source.wordOrderPointsByDate).map(([dayKey, earned]) => [String(dayKey), Math.max(0, Math.floor(Number(earned) || 0))])
      )
      : {};
    const translationTrainingPointsByDate = source.translationTrainingPointsByDate && typeof source.translationTrainingPointsByDate === "object"
      ? Object.fromEntries(
        Object.entries(source.translationTrainingPointsByDate).map(([dayKey, earned]) => [String(dayKey), Math.max(0, Math.floor(Number(earned) || 0))])
      )
      : {};
    return {
      homeworkSpeakingPointsByDate,
      homeworkSpeakingCompletionsByDate,
      reviewSpeakingPointsByDate,
      reviewSpeakingCountByDate,
      wordOrderPointsByDate,
      translationTrainingPointsByDate,
      todayEarned: Math.max(0, Math.floor(Number(source.todayEarned) || 0)),
      previousDayEarned: Math.max(0, Math.floor(Number(source.previousDayEarned) || 0)),
      totalEarned: Math.max(0, Math.floor(Number(source.totalEarned) || 0))
    };
  }

  function hydrateMobilePointDaySnapshots(pointState) {
    const todayKey = getMobilePointJstDateKey(0);
    const previousKey = getMobilePointJstDateKey(-1);
    const todayHomework = Math.max(0, Number(pointState.homeworkSpeakingPointsByDate?.[todayKey]) || 0);
    const todayReview = Math.max(0, Number(pointState.reviewSpeakingPointsByDate?.[todayKey]) || 0);
    const todayWordOrder = Math.max(0, Number(pointState.wordOrderPointsByDate?.[todayKey]) || 0);
    const todayTranslation = Math.max(0, Number(pointState.translationTrainingPointsByDate?.[todayKey]) || 0);
    const previousHomework = Math.max(0, Number(pointState.homeworkSpeakingPointsByDate?.[previousKey]) || 0);
    const previousReview = Math.max(0, Number(pointState.reviewSpeakingPointsByDate?.[previousKey]) || 0);
    const previousWordOrder = Math.max(0, Number(pointState.wordOrderPointsByDate?.[previousKey]) || 0);
    const previousTranslation = Math.max(0, Number(pointState.translationTrainingPointsByDate?.[previousKey]) || 0);
    pointState.todayEarned = todayHomework + todayReview + todayWordOrder + todayTranslation;
    pointState.previousDayEarned = previousHomework + previousReview + previousWordOrder + previousTranslation;

    const homeworkTotal = Object.values(pointState.homeworkSpeakingPointsByDate || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const reviewTotal = Object.values(pointState.reviewSpeakingPointsByDate || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const wordOrderTotal = Object.values(pointState.wordOrderPointsByDate || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const translationTotal = Object.values(pointState.translationTrainingPointsByDate || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const computedTotal = Math.floor(Math.max(0, homeworkTotal + reviewTotal + wordOrderTotal + translationTotal));
    pointState.totalEarned = computedTotal;
    return pointState;
  }

  function isNewVocabularyPracticeHistoryEntry(entry) {
    if (!entry || typeof entry !== "object") return false;
    const category = resolveMobileLearningHistoryCategory(entry);
    const dayNumber = String(entry.dayNumber || "").trim();
    return category === "Vocabulary" && isIsoDayKey(dayNumber);
  }

  function isNewMobileVocabularyHistoryEntry(entry) {
    return isNewVocabularyPracticeHistoryEntry(entry);
  }

  function getMobileVocabularyPracticePointsByDayFromHistory() {
    const byDay = {};
    const entries = Array.isArray(loadMobileLearningHistoryEntries()) ? loadMobileLearningHistoryEntries() : [];
    entries.forEach((entry) => {
      if (!isNewVocabularyPracticeHistoryEntry(entry)) return;
      const dayKey = getMobileLearningHistoryDayKey(entry.endedAt || entry.startedAt || Date.now());
      const points = Math.max(0, parseMobileLearningHistoryEarnedPoints(entry.earnedPoints));
      if (points <= 0) return;
      byDay[dayKey] = Math.max(0, Number(byDay[dayKey] || 0)) + points;
    });
    return byDay;
  }

  function getMobileVocabularyEarnedPointsByDay() {
    return getMobileVocabularyPracticePointsByDayFromHistory();
  }

  function getMobilePointSummary(pointState = getMobilePointState()) {
    const todayKey = getMobilePointJstDateKey(0);
    const todayHomework = Math.max(0, Number(pointState.homeworkSpeakingPointsByDate?.[todayKey]) || 0);
    const todayReview = Math.max(0, Number(pointState.reviewSpeakingPointsByDate?.[todayKey]) || 0);
    const todayWordOrder = Math.max(0, Number(pointState.wordOrderPointsByDate?.[todayKey]) || 0);
    const todayTranslation = Math.max(0, Number(pointState.translationTrainingPointsByDate?.[todayKey]) || 0);
    const vocabByDay = getMobileVocabularyPracticePointsByDayFromHistory();
    const todayVocabulary = Math.max(0, Number(vocabByDay[todayKey] || 0));
    return {
      todayHomework,
      todayReview,
      todayWordOrder,
      todayTranslation,
      todayVocabulary,
      todayEarned: Math.max(0, Number(pointState.todayEarned) || 0) + todayVocabulary,
      previousDayEarned: Math.max(0, Number(pointState.previousDayEarned) || 0),
      totalEarned: Math.max(0, Number(pointState.totalEarned) || 0) + Object.values(vocabByDay).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0)
    };
  }

  function recordMobileTrainingCoverageSeen(modeKey, questionId) {
    const coverageApi = window.trainingCoverage;
    if (!coverageApi || typeof coverageApi.markQuestionShown !== "function") {
      return null;
    }
    const mode = String(modeKey || "").trim();
    const id = String(questionId || "").trim();
    if (!mode || !id) return null;
    const storageKey = "english-trainer-pc-training-coverage-v1";
    let store = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        store = JSON.parse(raw);
      }
    } catch (_error) {
      store = null;
    }
    const safeStore = coverageApi.markQuestionShown(store || coverageApi.buildDefaultCoverageStore(), mode, id);
    try {
      localStorage.setItem(storageKey, JSON.stringify(safeStore));
    } catch (_error) {
      // Ignore quota failures; runtime tracking still succeeds in-memory.
    }
    return safeStore;
  }

  function getMobilePointDailyTotalRemaining(pointState = getMobilePointState()) {
    void pointState;
    return Number.POSITIVE_INFINITY;
  }

  function getReviewSpeakingRewardForCount(reviewCount) {
    const safeCount = Math.max(0, Math.floor(Number(reviewCount) || 0));
    if (safeCount <= 0) return 0;
    if (safeCount <= 10) return 5;
    if (safeCount <= 15) return 10;
    return 15;
  }

  function calculateReviewSpeakingBatchReward(pointState, pendingCount) {
    const todayKey = getMobilePointJstDateKey(0);
    const currentReviewCount = Math.max(0, Number(pointState.reviewSpeakingCountByDate?.[todayKey]) || 0);
    const currentPoints = Math.max(0, Number(pointState.reviewSpeakingPointsByDate?.[todayKey]) || 0);
    const safePendingCount = Math.max(0, Math.floor(Number(pendingCount) || 0));
    const speakingCapRemaining = Math.max(0, Number(MOBILE_POINT_CONFIG.reviewSpeakingDailyMax) || 0) - currentPoints;
    const totalCapRemaining = getMobilePointDailyTotalRemaining(pointState);
    let remaining = Math.max(0, Math.min(speakingCapRemaining, totalCapRemaining));
    let earned = 0;

    for (let index = 1; index <= safePendingCount; index += 1) {
      const reward = getReviewSpeakingRewardForCount(currentReviewCount + index);
      if (reward <= 0 || remaining <= 0) continue;
      const gained = Math.min(reward, remaining);
      earned += gained;
      remaining -= gained;
    }

    return {
      todayKey,
      earned: Math.max(0, earned),
      nextReviewCount: currentReviewCount + safePendingCount,
      nextPoints: currentPoints + Math.max(0, earned)
    };
  }

  function awardHomeworkSpeakingPoints() {
    const pointState = getMobilePointState();
    const todayKey = getMobilePointJstDateKey(0);
    const currentCompletionCount = Math.max(0, Number(pointState.homeworkSpeakingCompletionsByDate?.[todayKey]) || 0);
    const currentPoints = Math.max(0, Number(pointState.homeworkSpeakingPointsByDate?.[todayKey]) || 0);
    const nextCompletionCount = currentCompletionCount + 1;
    pointState.homeworkSpeakingCompletionsByDate[todayKey] = nextCompletionCount;

    if (currentPoints >= MOBILE_POINT_CONFIG.homeworkSpeakingDailyMax) {
      saveMobilePointState(pointState);
      return 0;
    }

    const reward = nextCompletionCount <= 3 ? MOBILE_POINT_CONFIG.homeworkCompletionReward : 0;
    const homeworkCapRemaining = Math.max(0, MOBILE_POINT_CONFIG.homeworkSpeakingDailyMax - currentPoints);
    const totalCapRemaining = getMobilePointDailyTotalRemaining(pointState);
    const earned = Math.max(0, Math.min(reward, homeworkCapRemaining, totalCapRemaining));
    pointState.homeworkSpeakingPointsByDate[todayKey] = currentPoints + earned;
    saveMobilePointState(pointState);
    return earned;
  }

  function awardWordOrderPoints(correctCount = 1) {
    const safeCorrectCount = Math.max(0, Math.floor(Number(correctCount) || 0));
    if (safeCorrectCount <= 0) return 0;
    const pointState = getMobilePointState();
    const todayKey = getMobilePointJstDateKey(0);
    const currentPoints = Math.max(0, Number(pointState.wordOrderPointsByDate?.[todayKey]) || 0);
    const baseReward = safeCorrectCount * Math.max(0, Number(MOBILE_POINT_CONFIG.wordOrderCorrectReward) || 0);
    const wordOrderCapRemaining = Math.max(0, MOBILE_POINT_CONFIG.wordOrderDailyMax - currentPoints);
    const totalCapRemaining = getMobilePointDailyTotalRemaining(pointState);
    const earned = Math.max(0, Math.min(baseReward, wordOrderCapRemaining, totalCapRemaining));
    pointState.wordOrderPointsByDate[todayKey] = currentPoints + earned;
    saveMobilePointState(pointState);
    return earned;
  }

  function awardTranslationTrainingPoints(correctCount = 1) {
    const safeCorrectCount = Math.max(0, Math.floor(Number(correctCount) || 0));
    if (safeCorrectCount <= 0) return 0;
    const pointState = getMobilePointState();
    const todayKey = getMobilePointJstDateKey(0);
    const currentPoints = Math.max(0, Number(pointState.translationTrainingPointsByDate?.[todayKey]) || 0);
    const baseReward = safeCorrectCount * Math.max(0, Number(MOBILE_POINT_CONFIG.wordOrderCorrectReward) || 0);
    const translationCapRemaining = Math.max(0, MOBILE_POINT_CONFIG.wordOrderDailyMax - currentPoints);
    const totalCapRemaining = getMobilePointDailyTotalRemaining(pointState);
    const earned = Math.max(0, Math.min(baseReward, translationCapRemaining, totalCapRemaining));
    pointState.translationTrainingPointsByDate[todayKey] = currentPoints + earned;
    saveMobilePointState(pointState);
    return earned;
  }

  function awardReviewSpeakingPoints(pendingCount = 1) {
    const pointState = getMobilePointState();
    const batch = calculateReviewSpeakingBatchReward(pointState, pendingCount);
    pointState.reviewSpeakingCountByDate[batch.todayKey] = batch.nextReviewCount;
    pointState.reviewSpeakingPointsByDate[batch.todayKey] = batch.nextPoints;
    saveMobilePointState(pointState);
    return batch.earned;
  }

  function getReviewSessionPendingPointConversationCount(session = state.speakingReviewSession) {
    return Math.max(0, Math.floor(Number(session?.pendingPointConversationCount) || 0));
  }

  function incrementReviewSessionPendingPointCount(session = state.speakingReviewSession) {
    if (!session || typeof session !== "object") return 0;
    const nextCount = getReviewSessionPendingPointConversationCount(session) + 1;
    session.pendingPointConversationCount = nextCount;
    return nextCount;
  }

  function applyPendingReviewSpeakingPoints(session = state.speakingReviewSession, options = {}) {
    const pendingCount = getReviewSessionPendingPointConversationCount(session);
    if (pendingCount <= 0) return 0;
    const earned = awardReviewSpeakingPoints(pendingCount);
    if (session && typeof session === "object") {
      session.pendingPointConversationCount = 0;
      if (options.persistSession !== false) {
        saveSpeakingReviewSession();
      }
    }
    return earned;
  }

  function buildReviewExitConfirmMessage() {
    const pointState = getMobilePointState();
    const todayKey = getMobilePointJstDateKey(0);
    const reviewCount = Math.max(0, Number(pointState.reviewSpeakingCountByDate?.[todayKey]) || 0);
    const reviewPoints = Math.max(0, Number(pointState.reviewSpeakingPointsByDate?.[todayKey]) || 0);
    const pendingCount = getReviewSessionPendingPointConversationCount();
    const pendingEarnedPreview = pendingCount > 0
      ? calculateReviewSpeakingBatchReward(pointState, pendingCount).earned
      : 0;
    let nextLine = "本日の復習ポイントは最大400Pです。";

    if (reviewCount < 10) {
      const remaining = 10 - reviewCount;
      nextLine = `あと${remaining}回で＋${remaining * 5}P獲得できます。`;
    } else if (reviewCount < 15) {
      const remaining = 15 - reviewCount;
      nextLine = `あと${remaining}回で＋${remaining * 10}P獲得できます。`;
    } else {
      const cap = Math.max(0, Number(MOBILE_POINT_CONFIG.reviewSpeakingDailyMax) || 0);
      const remainingPoints = Math.max(0, cap - reviewPoints);
      if (remainingPoints <= 0) {
        nextLine = "本日の復習ポイントは上限に到達しています。";
      } else {
        const remaining = Math.ceil(remainingPoints / 15);
        nextLine = `あと${remaining}回で＋最大${remainingPoints}P獲得できます。`;
      }
    }

    return [
      "復習を終了しますか？",
      "",
      `現在、復習で${formatPointValue(reviewPoints)}獲得中です。`,
      pendingCount > 0 ? `今回まとめて ${formatPointValue(pendingEarnedPreview)} を加算します。` : "",
      "",
      nextLine
    ].filter(Boolean).join("\n");
  }

  function loadMobilePointState(uid = getCurrentMobilePointSyncUid()) {
    try {
      const raw = window.localStorage.getItem(getMobilePointStorageKey(uid));
      if (!raw) return createDefaultMobilePointState();
      return sanitizeMobilePointState(JSON.parse(raw));
    } catch (_error) {
      return createDefaultMobilePointState();
    }
  }

  function loadMobilePendingPointStateForSync(uid = getCurrentMobilePointSyncUid()) {
    try {
      const raw = window.localStorage.getItem(getMobilePointPendingSyncStorageKey(uid));
      if (!raw) return null;
      return hydrateMobilePointDaySnapshots(sanitizeMobilePointState(JSON.parse(raw)));
    } catch (_error) {
      return null;
    }
  }

  function saveMobilePendingPointStateForSync(pointState, uid = getCurrentMobilePointSyncUid()) {
    const sanitized = hydrateMobilePointDaySnapshots(sanitizeMobilePointState(pointState));
    window.localStorage.setItem(getMobilePointPendingSyncStorageKey(uid), JSON.stringify(sanitized));
  }

  function clearMobilePendingPointStateForSync(uid = getCurrentMobilePointSyncUid()) {
    window.localStorage.removeItem(getMobilePointPendingSyncStorageKey(uid));
  }

  function persistMobilePointStateLocally(pointState, uid = getCurrentMobilePointSyncUid()) {
    mobilePointStateCache = hydrateMobilePointDaySnapshots(sanitizeMobilePointState(pointState));
    mobilePointStateCacheUid = String(uid || "").trim();
    window.localStorage.setItem(getMobilePointStorageKey(uid), JSON.stringify(mobilePointStateCache));
    return mobilePointStateCache;
  }

  function sanitizePointMapForCompare(value) {
    const source = value && typeof value === "object" ? value : {};
    const keys = Object.keys(source).sort((left, right) => left.localeCompare(right, "ja"));
    const next = {};
    keys.forEach((key) => {
      next[key] = Math.max(0, Math.floor(Number(source[key]) || 0));
    });
    return next;
  }

  function sanitizePointModeMapByDayForCompare(value) {
    const source = value && typeof value === "object" ? value : {};
    const dayKeys = Object.keys(source).sort((left, right) => left.localeCompare(right, "ja"));
    const next = {};
    dayKeys.forEach((dayKey) => {
      next[dayKey] = sanitizePointMapForCompare(source[dayKey]);
    });
    return next;
  }

  function buildStableMobilePointStateSnapshot(value) {
    const sanitized = hydrateMobilePointDaySnapshots(sanitizeMobilePointState(value));
    return {
      homeworkSpeakingPointsByDate: sanitizePointMapForCompare(sanitized.homeworkSpeakingPointsByDate),
      homeworkSpeakingCompletionsByDate: sanitizePointMapForCompare(sanitized.homeworkSpeakingCompletionsByDate),
      reviewSpeakingPointsByDate: sanitizePointMapForCompare(sanitized.reviewSpeakingPointsByDate),
      reviewSpeakingCountByDate: sanitizePointMapForCompare(sanitized.reviewSpeakingCountByDate),
      wordOrderPointsByDate: sanitizePointMapForCompare(sanitized.wordOrderPointsByDate),
      translationTrainingPointsByDate: sanitizePointMapForCompare(sanitized.translationTrainingPointsByDate),
      dailyEarnedByDate: sanitizePointMapForCompare(sanitized.dailyEarnedByDate),
      dailyEarnedByModeByDate: sanitizePointModeMapByDayForCompare(sanitized.dailyEarnedByModeByDate),
      todayEarned: Math.max(0, Math.floor(Number(sanitized.todayEarned) || 0)),
      previousDayEarned: Math.max(0, Math.floor(Number(sanitized.previousDayEarned) || 0)),
      totalEarned: Math.max(0, Math.floor(Number(sanitized.totalEarned) || 0))
    };
  }

  function areMobilePointStatesEqual(left, right) {
    return JSON.stringify(buildStableMobilePointStateSnapshot(left)) === JSON.stringify(buildStableMobilePointStateSnapshot(right));
  }

  function mergePointMapByMax(baseMap, incomingMap) {
    const merged = { ...sanitizePointMapForCompare(baseMap) };
    Object.entries(sanitizePointMapForCompare(incomingMap)).forEach(([key, value]) => {
      merged[key] = Math.max(Math.max(0, Number(merged[key]) || 0), Math.max(0, Number(value) || 0));
    });
    return merged;
  }

  function mergePointModeMapByDayMax(baseMap, incomingMap) {
    const merged = sanitizePointModeMapByDayForCompare(baseMap);
    const incoming = sanitizePointModeMapByDayForCompare(incomingMap);
    Object.entries(incoming).forEach(([dayKey, modeMap]) => {
      merged[dayKey] = mergePointMapByMax(merged[dayKey], modeMap);
    });
    return merged;
  }

  function mergeMobilePointStateByMax(baseState, incomingState) {
    const base = buildStableMobilePointStateSnapshot(baseState);
    const incoming = buildStableMobilePointStateSnapshot(incomingState);
    return hydrateMobilePointDaySnapshots({
      homeworkSpeakingPointsByDate: mergePointMapByMax(base.homeworkSpeakingPointsByDate, incoming.homeworkSpeakingPointsByDate),
      homeworkSpeakingCompletionsByDate: mergePointMapByMax(base.homeworkSpeakingCompletionsByDate, incoming.homeworkSpeakingCompletionsByDate),
      reviewSpeakingPointsByDate: mergePointMapByMax(base.reviewSpeakingPointsByDate, incoming.reviewSpeakingPointsByDate),
      reviewSpeakingCountByDate: mergePointMapByMax(base.reviewSpeakingCountByDate, incoming.reviewSpeakingCountByDate),
      wordOrderPointsByDate: mergePointMapByMax(base.wordOrderPointsByDate, incoming.wordOrderPointsByDate),
      translationTrainingPointsByDate: mergePointMapByMax(base.translationTrainingPointsByDate, incoming.translationTrainingPointsByDate),
      dailyEarnedByDate: mergePointMapByMax(base.dailyEarnedByDate, incoming.dailyEarnedByDate),
      dailyEarnedByModeByDate: mergePointModeMapByDayMax(base.dailyEarnedByModeByDate, incoming.dailyEarnedByModeByDate),
      todayEarned: Math.max(base.todayEarned, incoming.todayEarned),
      previousDayEarned: Math.max(base.previousDayEarned, incoming.previousDayEarned),
      totalEarned: Math.max(base.totalEarned, incoming.totalEarned)
    });
  }

  function getCurrentMobileFirebaseUser() {
    return typeof window.getMobileFirebaseCurrentUser === "function"
      ? window.getMobileFirebaseCurrentUser()
      : (window.MobileFirebase?.auth?.currentUser || null);
  }

  function getCurrentMobilePointSyncUid() {
    return String(getCurrentMobileFirebaseUser()?.uid || "").trim();
  }

  function refreshMobilePointUiAfterSync() {
    if (state.currentScreen === "acquiredPointsScreen") {
      renderMobilePointSummaryScreen();
      return;
    }
    if (state.currentScreen === "pointRewardScreen" && state.pointRewardScreenState) {
      const summary = getMobilePointSummary();
      state.pointRewardScreenState.todayEarned = Math.max(0, Number(summary.todayEarned) || 0);
      state.pointRewardScreenState.totalEarned = Math.max(0, Number(summary.totalEarned) || 0);
      renderPointRewardScreen();
    }
  }

  function handleMobilePointSyncRemoteSnapshot(snapshot) {
    if (!snapshot?.ok || !snapshot.exists || !snapshot.pointState) {
      return;
    }
    const uid = String(snapshot.uid || getCurrentMobilePointSyncUid() || "").trim();
    const incoming = hydrateMobilePointDaySnapshots(sanitizeMobilePointState(snapshot.pointState));
    if (!areMobilePointStatesEqual(getMobilePointState(), incoming)) {
      persistMobilePointStateLocally(incoming, uid);
      refreshMobilePointUiAfterSync();
    }
    const pending = loadMobilePendingPointStateForSync(uid);
    if (!pending) {
      clearMobilePendingPointStateForSync(uid);
      return;
    }
    if (areMobilePointStatesEqual(pending, incoming)) {
      clearMobilePendingPointStateForSync(uid);
      return;
    }
    const merged = mergeMobilePointStateByMax(incoming, pending);
    if (!areMobilePointStatesEqual(merged, incoming)) {
      persistMobilePointStateLocally(merged, uid);
      saveMobilePendingPointStateForSync(merged, uid);
      scheduleMobilePointStateSync();
      refreshMobilePointUiAfterSync();
      return;
    }
    clearMobilePendingPointStateForSync(uid);
  }

  async function initializeMobilePointSyncForCurrentUser(options = {}) {
    const force = options?.force === true;
    const uid = getCurrentMobilePointSyncUid();
    if (!uid) {
      mobilePointSyncCurrentUid = "";
      mobilePointSyncReady = false;
      mobilePointSyncAllowCreate = false;
      if (typeof mobilePointSyncUnsubscribe === "function") {
        mobilePointSyncUnsubscribe();
      }
      mobilePointSyncUnsubscribe = null;
      return false;
    }

    if (!force && mobilePointSyncReady && mobilePointSyncCurrentUid === uid) {
      return true;
    }

    if (typeof mobilePointSyncUnsubscribe === "function") {
      mobilePointSyncUnsubscribe();
    }
    mobilePointSyncUnsubscribe = null;

    const loadRemote = window.loadMobilePointStateFromFirestore;
    if (typeof loadRemote !== "function") {
      mobilePointSyncCurrentUid = uid;
      mobilePointSyncReady = false;
      mobilePointSyncAllowCreate = false;
      return false;
    }

    mobilePointStateCache = null;
    mobilePointStateCacheUid = uid;

    let remoteResult = null;
    try {
      remoteResult = await loadRemote({ targetUid: uid });
    } catch (_error) {
      remoteResult = null;
    }

    if (remoteResult?.ok && remoteResult.exists && remoteResult.pointState) {
      persistMobilePointStateLocally(remoteResult.pointState, uid);
      mobilePointSyncCurrentUid = uid;
      mobilePointSyncReady = true;
      mobilePointSyncAllowCreate = false;
      refreshMobilePointUiAfterSync();
    } else {
      persistMobilePointStateLocally(createDefaultMobilePointState(), uid);
      mobilePointSyncCurrentUid = uid;
      mobilePointSyncReady = true;
      mobilePointSyncAllowCreate = true;
      refreshMobilePointUiAfterSync();
    }

    const subscribeRemote = window.subscribeMobilePointStateFromFirestore;
    if (typeof subscribeRemote === "function") {
      mobilePointSyncUnsubscribe = subscribeRemote((snapshot) => {
        handleMobilePointSyncRemoteSnapshot(snapshot);
      }, { targetUid: uid });
    }

    if (mobilePointSyncReady) {
      await flushMobilePointStateSync();
    }
    return mobilePointSyncReady;
  }

  async function flushMobilePointStateSync() {
    if (mobilePointSyncInFlight) {
      mobilePointSyncQueued = true;
      return mobilePointSyncInFlight;
    }

    mobilePointSyncInFlight = (async () => {
      do {
        mobilePointSyncQueued = false;
        const uid = getCurrentMobilePointSyncUid();
        if (!uid || !mobilePointSyncReady || mobilePointSyncCurrentUid !== uid) {
          break;
        }

        const saveRemote = window.saveMobilePointStateToFirestore;
        if (typeof saveRemote !== "function") {
          break;
        }

        const pending = loadMobilePendingPointStateForSync();
        const sourceState = pending || getMobilePointState();
        saveMobilePendingPointStateForSync(sourceState, uid);

        const result = await saveRemote(sourceState, {
          targetUid: uid,
          allowCreate: mobilePointSyncAllowCreate,
          sourceDeviceId: String(getMobileBrowserDeviceId() || "").trim(),
          sourceDeviceName: sanitizeMobileLearningHistoryDeviceName(getMobileLearningHistoryDeviceName())
        }).catch(() => null);

        if (!result?.ok || !result.saved) {
          break;
        }

        if (result.pointState) {
          persistMobilePointStateLocally(result.pointState, uid);
          refreshMobilePointUiAfterSync();
        }
        clearMobilePendingPointStateForSync(uid);
        mobilePointSyncAllowCreate = false;
      } while (mobilePointSyncQueued);
    })();

    try {
      await mobilePointSyncInFlight;
    } finally {
      mobilePointSyncInFlight = null;
    }
  }

  function scheduleMobilePointStateSync() {
    const latest = getMobilePointState();
    const uid = getCurrentMobilePointSyncUid();
    saveMobilePendingPointStateForSync(latest, uid);
    if (!uid) {
      return;
    }
    if (!mobilePointSyncReady || mobilePointSyncCurrentUid !== uid) {
      initializeMobilePointSyncForCurrentUser().catch(() => false);
      return;
    }
    flushMobilePointStateSync().catch(() => undefined);
  }

  function saveMobilePointState(pointState, options = {}) {
    const nextState = persistMobilePointStateLocally(pointState, getCurrentMobilePointSyncUid());
    if (options?.skipSync !== true) {
      scheduleMobilePointStateSync();
    }
    return nextState;
  }

  function refreshWordOrderUiAfterSync() {
    if (state.currentScreen === "wordOrderTrainingScreen" && !state.wordOrderTraining) {
      renderWordOrderDayRangeProgress();
    }
  }

  function handleWordOrderStatsSyncRemoteSnapshot(snapshot) {
    if (!snapshot?.ok || !snapshot.exists || !snapshot.statsMap) {
      return;
    }
    const uid = String(snapshot.uid || "").trim();
    const incoming = sanitizeWordOrderStatsMap(snapshot.statsMap);
    const current = loadWordOrderStatsMap({ targetUid: uid, forceReload: true });
    const merged = mergeWordOrderStatsMapByMax(current, incoming);
    if (!areWordOrderStatsMapsEqual(current, merged)) {
      saveWordOrderStatsMap(merged, { targetUid: uid, skipSync: true });
      refreshWordOrderUiAfterSync();
    }

    const pending = loadMobilePendingWordOrderStatsForSync();
    if (!pending || pending.uid !== uid) {
      return;
    }
    const mergedWithPending = mergeWordOrderStatsMapByMax(incoming, pending.statsMap);
    if (areWordOrderStatsMapsEqual(mergedWithPending, incoming)) {
      clearMobilePendingWordOrderStatsForSync();
      return;
    }
    saveMobilePendingWordOrderStatsForSync(uid, mergedWithPending);
    scheduleWordOrderStatsSync(mergedWithPending, { uid });
  }

  async function initializeWordOrderStatsSyncForCurrentUser(options = {}) {
    const force = options?.force === true;
    const uid = getCurrentWordOrderStatsUid();
    if (!uid) {
      wordOrderStatsSyncCurrentUid = "";
      wordOrderStatsSyncReady = false;
      wordOrderStatsCache = null;
      if (typeof wordOrderStatsSyncUnsubscribe === "function") {
        wordOrderStatsSyncUnsubscribe();
      }
      wordOrderStatsSyncUnsubscribe = null;
      return false;
    }

    if (!force && wordOrderStatsSyncReady && wordOrderStatsSyncCurrentUid === uid) {
      return true;
    }

    if (typeof wordOrderStatsSyncUnsubscribe === "function") {
      wordOrderStatsSyncUnsubscribe();
    }
    wordOrderStatsSyncUnsubscribe = null;

    const localBaseline = loadWordOrderStatsMap({ targetUid: uid, forceReload: true });
    const loadRemote = window.loadMobileWordOrderStatsFromFirestore;
    if (typeof loadRemote !== "function") {
      wordOrderStatsSyncCurrentUid = uid;
      wordOrderStatsSyncReady = false;
      return false;
    }

    let remoteResult = null;
    try {
      remoteResult = await loadRemote({ targetUid: uid });
    } catch (_error) {
      remoteResult = null;
    }

    if (remoteResult?.ok && remoteResult.exists && remoteResult.statsMap) {
      const merged = mergeWordOrderStatsMapByMax(localBaseline, remoteResult.statsMap);
      saveWordOrderStatsMap(merged, { targetUid: uid, skipSync: true });
      wordOrderStatsSyncCurrentUid = uid;
      wordOrderStatsSyncReady = true;
      refreshWordOrderUiAfterSync();
    } else {
      const saveRemote = window.saveMobileWordOrderStatsToFirestore;
      if (typeof saveRemote === "function") {
        const bootstrapResult = await saveRemote(localBaseline, {
          targetUid: uid,
          allowCreate: true,
          sourceDeviceId: String(getMobileBrowserDeviceId() || "").trim(),
          sourceDeviceName: sanitizeMobileLearningHistoryDeviceName(getMobileLearningHistoryDeviceName())
        }).catch(() => null);
        if (bootstrapResult?.ok && bootstrapResult.saved && bootstrapResult.statsMap) {
          saveWordOrderStatsMap(bootstrapResult.statsMap, { targetUid: uid, skipSync: true });
          clearMobilePendingWordOrderStatsForSync();
          wordOrderStatsSyncCurrentUid = uid;
          wordOrderStatsSyncReady = true;
          refreshWordOrderUiAfterSync();
        } else {
          wordOrderStatsSyncCurrentUid = uid;
          wordOrderStatsSyncReady = false;
        }
      } else {
        wordOrderStatsSyncCurrentUid = uid;
        wordOrderStatsSyncReady = false;
      }
    }

    const subscribeRemote = window.subscribeMobileWordOrderStatsFromFirestore;
    if (typeof subscribeRemote === "function") {
      wordOrderStatsSyncUnsubscribe = subscribeRemote((snapshot) => {
        handleWordOrderStatsSyncRemoteSnapshot(snapshot);
      }, { targetUid: uid });
    }

    if (wordOrderStatsSyncReady) {
      await flushWordOrderStatsSync();
    }
    return wordOrderStatsSyncReady;
  }

  async function flushWordOrderStatsSync() {
    if (wordOrderStatsSyncInFlight) {
      wordOrderStatsSyncQueued = true;
      return wordOrderStatsSyncInFlight;
    }

    wordOrderStatsSyncInFlight = (async () => {
      do {
        wordOrderStatsSyncQueued = false;
        const uid = getCurrentWordOrderStatsUid();
        if (!uid || !wordOrderStatsSyncReady || wordOrderStatsSyncCurrentUid !== uid) {
          break;
        }

        const saveRemote = window.saveMobileWordOrderStatsToFirestore;
        if (typeof saveRemote !== "function") {
          break;
        }

        const pending = loadMobilePendingWordOrderStatsForSync();
        const sourceStats = pending?.uid === uid
          ? pending.statsMap
          : loadWordOrderStatsMap({ targetUid: uid, forceReload: true });
        saveMobilePendingWordOrderStatsForSync(uid, sourceStats);

        const result = await saveRemote(sourceStats, {
          targetUid: uid,
          allowCreate: true,
          sourceDeviceId: String(getMobileBrowserDeviceId() || "").trim(),
          sourceDeviceName: sanitizeMobileLearningHistoryDeviceName(getMobileLearningHistoryDeviceName())
        }).catch(() => null);

        if (!result?.ok || !result.saved) {
          break;
        }

        if (result.statsMap) {
          saveWordOrderStatsMap(result.statsMap, { targetUid: uid, skipSync: true });
          refreshWordOrderUiAfterSync();
        }
        clearMobilePendingWordOrderStatsForSync();
      } while (wordOrderStatsSyncQueued);
    })();

    try {
      await wordOrderStatsSyncInFlight;
    } finally {
      wordOrderStatsSyncInFlight = null;
    }
  }

  function scheduleWordOrderStatsSync(statsMap, options = {}) {
    const uid = String(options?.uid || getCurrentWordOrderStatsUid() || "").trim();
    const normalized = sanitizeWordOrderStatsMap(statsMap);
    if (!uid) {
      return;
    }
    saveMobilePendingWordOrderStatsForSync(uid, normalized);
    if (!wordOrderStatsSyncReady || wordOrderStatsSyncCurrentUid !== uid) {
      initializeWordOrderStatsSyncForCurrentUser().catch(() => false);
      return;
    }
    flushWordOrderStatsSync().catch(() => undefined);
  }

  function getMobilePointState() {
    const uid = getCurrentMobilePointSyncUid();
    if (!mobilePointStateCache || mobilePointStateCacheUid !== uid) {
      mobilePointStateCache = hydrateMobilePointDaySnapshots(loadMobilePointState(uid));
      mobilePointStateCacheUid = uid;
      if (uid) {
        persistMobilePointStateLocally(mobilePointStateCache, uid);
      }
    }
    return mobilePointStateCache;
  }

  function formatMobilePointHistoryDateLabel(dayKey) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || ""));
    if (!match) return String(dayKey || "-");
    return `${Number(match[2])}/${Number(match[3])}`;
  }

  function mapMobilePointModeLabel(modeKey) {
    const key = String(modeKey || "").trim().toLowerCase();
    if (!key) return "";
    if (key === "day" || key === "normal" || key === "day-study" || key === "daystudy") return "Day学習";
    if (key.includes("phrase") || key.includes("idiom") || key.includes("熟語")) return "熟語特訓";
    if (key.includes("preposition") || key.includes("前置詞")) return "前置詞特訓";
    if (key.includes("response") || key.includes("応答")) return "応答文特訓";
    if (key === "review" || key === "challenge" || key.includes("過去")) return "過去の間違い";
    if (key.includes("dayadvance") || key.includes("day-advance") || key.includes("bonus") || key.includes("進行")) return "Day進行ボーナス";
    if (key === "homework" || key.includes("宿題")) return "宿題";
    if (key === "speaking" || key.includes("発話")) return "発話";
    if (key.includes("vocabulary") || key.includes("単語")) return "単語";
    if (key.includes("wordorder") || key.includes("語順")) return "語順";
    if (key.includes("translation") || key.includes("和訳")) return "和訳";
    return String(modeKey || "").trim();
  }

  function buildMobilePointModeBreakdownByDay(pointState, dayKey) {
    const modeRows = [];
    const modeMap = pointState?.dailyEarnedByModeByDate?.[dayKey];
    if (modeMap && typeof modeMap === "object") {
      Object.entries(modeMap).forEach(([modeKey, value]) => {
        const points = Math.max(0, Math.floor(Number(value) || 0));
        if (points <= 0) return;
        modeRows.push({
          modeLabel: mapMobilePointModeLabel(modeKey),
          points
        });
      });
      const vocabularyExtra = Math.max(0, Number(getMobileVocabularyPracticePointsByDayFromHistory()[dayKey] || 0));
      if (vocabularyExtra > 0 && !modeRows.some((row) => row.modeLabel === "単語")) {
        modeRows.push({ modeLabel: "単語", points: vocabularyExtra });
      }
      return modeRows
        .filter((row) => row.modeLabel)
        .sort((left, right) => right.points - left.points || left.modeLabel.localeCompare(right.modeLabel, "ja"));
    }

    const fallbackRows = [
      { modeLabel: "発話", points: Math.max(0, Math.floor(Number(pointState?.reviewSpeakingPointsByDate?.[dayKey]) || 0)) },
      { modeLabel: "宿題", points: Math.max(0, Math.floor(Number(pointState?.homeworkSpeakingPointsByDate?.[dayKey]) || 0)) },
      { modeLabel: "語順", points: Math.max(0, Math.floor(Number(pointState?.wordOrderPointsByDate?.[dayKey]) || 0)) },
      { modeLabel: "和訳", points: Math.max(0, Math.floor(Number(pointState?.translationTrainingPointsByDate?.[dayKey]) || 0)) }
    ].filter((row) => row.points > 0);

    const vocabularyRows = Math.max(0, Number(getMobileVocabularyPracticePointsByDayFromHistory()[dayKey] || 0));
    if (vocabularyRows > 0) {
      fallbackRows.push({ modeLabel: "単語", points: vocabularyRows });
    }

    return fallbackRows.sort((left, right) => right.points - left.points || left.modeLabel.localeCompare(right.modeLabel, "ja"));
  }

  function getMobilePointDayTotal(pointState, dayKey, modeRows = null) {
    const dailyValue = Math.max(0, Math.floor(Number(pointState?.dailyEarnedByDate?.[dayKey]) || 0));
    if (dailyValue > 0) return dailyValue;
    const rows = Array.isArray(modeRows) ? modeRows : buildMobilePointModeBreakdownByDay(pointState, dayKey);
    return rows.reduce((sum, row) => sum + Math.max(0, Number(row.points) || 0), 0);
  }

  function collectMobilePointEarnedDayKeys(pointState) {
    const keySet = new Set();
    const registerFromMap = (mapLike) => {
      if (!mapLike || typeof mapLike !== "object") return;
      Object.entries(mapLike).forEach(([dayKey, value]) => {
        const points = Math.max(0, Math.floor(Number(value) || 0));
        if (points > 0) keySet.add(String(dayKey));
      });
    };

    registerFromMap(pointState?.dailyEarnedByDate);
    registerFromMap(pointState?.reviewSpeakingPointsByDate);
    registerFromMap(pointState?.homeworkSpeakingPointsByDate);
    registerFromMap(pointState?.wordOrderPointsByDate);
    registerFromMap(pointState?.translationTrainingPointsByDate);

    if (pointState?.dailyEarnedByModeByDate && typeof pointState.dailyEarnedByModeByDate === "object") {
      Object.entries(pointState.dailyEarnedByModeByDate).forEach(([dayKey, modeMap]) => {
        if (!modeMap || typeof modeMap !== "object") return;
        const hasEarned = Object.values(modeMap).some((value) => Math.max(0, Math.floor(Number(value) || 0)) > 0);
        if (hasEarned) keySet.add(String(dayKey));
      });
    }

    Object.keys(getMobileVocabularyPracticePointsByDayFromHistory()).forEach((dayKey) => {
      if (Math.max(0, Number(getMobileVocabularyPracticePointsByDayFromHistory()[dayKey] || 0)) > 0) {
        keySet.add(String(dayKey));
      }
    });

    return [...keySet].sort((left, right) => right.localeCompare(left));
  }

  function buildMobilePointHistoryRows(pointState) {
    const dayKeys = collectMobilePointEarnedDayKeys(pointState);
    return dayKeys.map((dayKey) => {
      const modeRows = buildMobilePointModeBreakdownByDay(pointState, dayKey);
      const totalPoints = getMobilePointDayTotal(pointState, dayKey, modeRows);
      return {
        dayKey,
        totalPoints,
        modeRows
      };
    }).filter((row) => row.totalPoints > 0);
  }

  function renderMobilePointHistoryList(pointState) {
    const historyList = document.getElementById("mobilePointsHistoryList");
    const moreButton = document.getElementById("mobilePointsHistoryMoreBtn");
    if (!historyList || !moreButton) return;

    const historyRows = buildMobilePointHistoryRows(pointState);
    const visibleCount = Math.max(MOBILE_POINT_HISTORY_PAGE_SIZE, Math.floor(Number(mobilePointHistoryVisibleCount) || MOBILE_POINT_HISTORY_PAGE_SIZE));
    const visibleRows = historyRows.slice(0, visibleCount);

    if (!visibleRows.length) {
      historyList.innerHTML = '<p class="status-text mobile-points-empty">獲得履歴はまだありません</p>';
      moreButton.classList.add("hidden");
      return;
    }

    historyList.innerHTML = visibleRows.map((row) => {
      const breakdownMarkup = row.modeRows
        .filter((modeRow) => Math.max(0, Number(modeRow.points) || 0) > 0)
        .map((modeRow) => `
          <p class="mobile-points-history-mode-row">
            <span class="mobile-points-history-mode-label">${escapeHtml(modeRow.modeLabel)}</span>
            <span class="mobile-points-history-mode-value">+${Math.max(0, Number(modeRow.points) || 0)}P</span>
          </p>
        `)
        .join("");

      return `
        <article class="mobile-points-history-day-card">
          <p class="mobile-points-history-day-head">
            <span>${escapeHtml(formatMobilePointHistoryDateLabel(row.dayKey))}</span>
            <span>${Math.max(0, Number(row.totalPoints) || 0)}P</span>
          </p>
          <div class="mobile-points-history-mode-list">
            ${breakdownMarkup || '<p class="status-text mobile-points-empty">内訳なし</p>'}
          </div>
        </article>
      `;
    }).join("");

    const hasMore = historyRows.length > visibleRows.length;
    moreButton.classList.toggle("hidden", !hasMore);
  }

  function renderMobilePointSummaryScreen() {
    const todayTotalText = document.getElementById("mobilePointsTodayTotalText");
    const todayBreakdownText = document.getElementById("mobilePointsTodayBreakdownText");
    const totalEarnedText = document.getElementById("mobilePointsTotalEarnedText");
    if (!todayTotalText || !todayBreakdownText || !totalEarnedText) return;

    const pointState = getMobilePointState();
    const todayKey = getMobilePointJstDateKey(0);
    const todayModeRows = buildMobilePointModeBreakdownByDay(pointState, todayKey);
    const todayTotal = getMobilePointDayTotal(pointState, todayKey, todayModeRows);
    const summary = getMobilePointSummary(pointState);

    todayTotalText.textContent = `本日の獲得ポイント ${todayTotal}P`;
    if (todayModeRows.length) {
      todayBreakdownText.textContent = `（${todayModeRows.map((row) => `${row.modeLabel} ${Math.max(0, Number(row.points) || 0)}P`).join("・")}）`;
    } else {
      todayBreakdownText.textContent = "（本日の獲得はありません）";
    }
    totalEarnedText.textContent = `累計獲得 ${Math.max(0, Number(summary.totalEarned) || 0)}P`;

    renderMobilePointHistoryList(pointState);
  }

  function createPointRewardScreenState(rewardType, earnedPoints, options = {}) {
    const config = MOBILE_POINT_REWARD_SCREEN_CONFIG[rewardType] || MOBILE_POINT_REWARD_SCREEN_CONFIG.homework;
    const summary = getMobilePointSummary();
    return {
      rewardType,
      title: config.title,
      categoryLabel: config.categoryLabel,
      earnedPoints: Math.max(0, Math.floor(Number(earnedPoints) || 0)),
      todayEarned: Math.max(0, Math.floor(Number(options.todayEarned ?? summary.todayEarned) || 0)),
      totalEarned: Math.max(0, Math.floor(Number(options.totalEarned ?? summary.totalEarned) || 0)),
      onClose: typeof options.onClose === "function" ? options.onClose : renderHome,
      extras: options.extras && typeof options.extras === "object" ? { ...options.extras } : {}
    };
  }

  function renderPointRewardScreen() {
    const rewardState = state.pointRewardScreenState;
    if (!rewardState) {
      renderHome();
      return;
    }
    elements.pointRewardTitleText.textContent = rewardState.title;
    elements.pointRewardCategoryText.textContent = rewardState.categoryLabel;
    elements.pointRewardEarnedText.textContent = `＋${formatPointValue(rewardState.earnedPoints)}`;
    elements.pointRewardTodayText.textContent = `本日の獲得 ${formatPointValue(rewardState.todayEarned)}`;
    elements.pointRewardTotalText.textContent = `累計 ${formatPointValue(rewardState.totalEarned)}`;
    showScreen("pointRewardScreen");
  }

  function openPointRewardScreen(rewardType, earnedPoints, options = {}) {
    if (Math.max(0, Number(earnedPoints) || 0) <= 0) {
      const fallback = typeof options.onClose === "function" ? options.onClose : null;
      if (fallback) fallback();
      return;
    }
    state.pointRewardScreenState = createPointRewardScreenState(rewardType, earnedPoints, options);
    renderPointRewardScreen();
  }

  function closePointRewardScreen() {
    const onClose = state.pointRewardScreenState?.onClose;
    state.pointRewardScreenState = null;
    if (typeof onClose === "function") {
      onClose();
      return;
    }
    renderHome();
  }

  const SPEAKING_WORD_PRACTICE_DATA = Object.freeze({
    W1: Object.freeze({
      "2026-06-22": Object.freeze([
        {
          word: "what",
          meaning: "何",
          example: "What sport do you play?",
          exampleJapanese: "あなたは何のスポーツをしますか？"
        },
        {
          word: "where",
          meaning: "どこで",
          example: "Where do you study?",
          exampleJapanese: "あなたはどこで勉強しますか？"
        },
        {
          word: "when",
          meaning: "いつ",
          example: "When do you practice?",
          exampleJapanese: "あなたはいつ練習しますか？"
        },
        {
          word: "usually",
          meaning: "ふつう",
          example: "I usually study at home.",
          exampleJapanese: "私はたいてい家で勉強します。"
        },
        {
          word: "home",
          meaning: "家",
          example: "I study at home.",
          exampleJapanese: "私は家で勉強します。"
        },
        {
          word: "evening",
          meaning: "夕方・夜",
          example: "I study in the evening.",
          exampleJapanese: "私は夕方（夜）に勉強します。"
        }
      ]),
      "2026-06-23": Object.freeze([
        {
          word: "daily",
          meaning: "毎日の",
          example: "This is my daily life.",
          exampleJapanese: "これが私の日常生活です。"
        },
        {
          word: "breakfast",
          meaning: "朝食",
          example: "I have breakfast at home.",
          exampleJapanese: "私は家で朝食を食べます。"
        },
        {
          word: "lunch",
          meaning: "昼食",
          example: "I have lunch at school.",
          exampleJapanese: "私は学校で昼食を食べます。"
        },
        {
          word: "dinner",
          meaning: "夕食",
          example: "I have dinner with my family.",
          exampleJapanese: "私は家族と一緒に夕食を食べます。"
        },
        {
          word: "usually",
          meaning: "ふつう",
          example: "I usually read books.",
          exampleJapanese: "私はたいてい本を読みます。"
        },
        {
          word: "night",
          meaning: "夜",
          example: "I read books at night.",
          exampleJapanese: "私は夜に本を読みます。"
        }
      ]),
      "2026-06-24": Object.freeze([
        {
          word: "friend",
          meaning: "友達",
          example: "My friend likes soccer.",
          exampleJapanese: "私の友達はサッカーが好きです。"
        },
        {
          word: "classmate",
          meaning: "クラスメート",
          example: "He is my classmate.",
          exampleJapanese: "彼は私のクラスメートです。"
        },
        {
          word: "plays",
          meaning: "〜をする",
          example: "She plays tennis.",
          exampleJapanese: "彼女はテニスをします。"
        },
        {
          word: "likes",
          meaning: "〜が好き",
          example: "He likes English.",
          exampleJapanese: "彼は英語が好きです。"
        },
        {
          word: "studies",
          meaning: "勉強する",
          example: "She studies math.",
          exampleJapanese: "彼女は数学を勉強します。"
        },
        {
          word: "reads",
          meaning: "読む",
          example: "He reads books.",
          exampleJapanese: "彼は本を読みます。"
        }
      ]),
      "2026-06-25": Object.freeze([
        {
          word: "swim",
          meaning: "泳ぐ",
          example: "I can swim.",
          exampleJapanese: "私は泳ぐことができます。"
        },
        {
          word: "run",
          meaning: "走る",
          example: "I can run fast.",
          exampleJapanese: "私は速く走ることができます。"
        },
        {
          word: "cook",
          meaning: "料理する",
          example: "I can cook dinner.",
          exampleJapanese: "私は夕食を作ることができます。"
        },
        {
          word: "draw",
          meaning: "描く",
          example: "I can draw pictures.",
          exampleJapanese: "私は絵を描くことができます。"
        },
        {
          word: "fast",
          meaning: "速く",
          example: "I can run fast.",
          exampleJapanese: "私は速く走ることができます。"
        },
        {
          word: "a little",
          meaning: "少し",
          example: "I can speak English a little.",
          exampleJapanese: "私は英語を少し話すことができます。"
        }
      ]),
      "2026-06-26": Object.freeze([
        {
          word: "bag",
          meaning: "かばん",
          example: "This is my bag.",
          exampleJapanese: "これは私のかばんです。"
        },
        {
          word: "notebook",
          meaning: "ノート",
          example: "This is my notebook.",
          exampleJapanese: "これは私のノートです。"
        },
        {
          word: "pencil",
          meaning: "鉛筆",
          example: "This is my pencil.",
          exampleJapanese: "これは私の鉛筆です。"
        },
        {
          word: "pens",
          meaning: "ペン",
          example: "These are my pens.",
          exampleJapanese: "これらは私のペンです。"
        },
        {
          word: "books",
          meaning: "本",
          example: "These are my books.",
          exampleJapanese: "これらは私の本です。"
        },
        {
          word: "shoes",
          meaning: "くつ",
          example: "Those are his shoes.",
          exampleJapanese: "あれらは彼の靴です。"
        }
      ]),
      "2026-06-27": Object.freeze([
        {
          word: "went",
          meaning: "行った",
          example: "I went to school yesterday.",
          exampleJapanese: "私は昨日、学校に行きました。"
        },
        {
          word: "played",
          meaning: "した",
          example: "I played soccer yesterday.",
          exampleJapanese: "私は昨日、サッカーをしました。"
        },
        {
          word: "studied",
          meaning: "勉強した",
          example: "I studied English yesterday.",
          exampleJapanese: "私は昨日、英語を勉強しました。"
        },
        {
          word: "had",
          meaning: "食べた・持った",
          example: "I had lunch at school.",
          exampleJapanese: "私は学校で昼食を食べました。"
        },
        {
          word: "read",
          meaning: "読んだ",
          example: "I read a book yesterday.",
          exampleJapanese: "私は昨日、本を読みました。"
        },
        {
          word: "weekend",
          meaning: "週末",
          example: "I like weekends.",
          exampleJapanese: "私は週末が好きです。"
        }
      ]),
      "2026-06-28": Object.freeze([
        {
          word: "week",
          meaning: "週",
          example: "This week was good.",
          exampleJapanese: "今週は良かったです。"
        },
        {
          word: "practice",
          meaning: "練習する",
          example: "I practice English.",
          exampleJapanese: "私は英語を練習します。"
        },
        {
          word: "question",
          meaning: "質問",
          example: "I answer questions.",
          exampleJapanese: "私は質問に答えます。"
        },
        {
          word: "answer",
          meaning: "答える",
          example: "I answer in English.",
          exampleJapanese: "私は英語で答えます。"
        },
        {
          word: "sentence",
          meaning: "文",
          example: "I can write short sentences.",
          exampleJapanese: "私は短い文を書くことができます。"
        },
        {
          word: "again",
          meaning: "もう一度",
          example: "I read it again.",
          exampleJapanese: "私はそれをもう一度読みます。"
        }
      ])
    }),
    W2: Object.freeze({
      "2026-06-29": Object.freeze([
        {
          word: "who",
          meaning: "だれ",
          example: "Who is your friend?",
          exampleJapanese: "あなたの友達は誰ですか？"
        },
        {
          word: "what",
          meaning: "何",
          example: "What subject do you like?",
          exampleJapanese: "あなたは何の教科が好きですか？"
        },
        {
          word: "where",
          meaning: "どこ",
          example: "Where do you study?",
          exampleJapanese: "あなたはどこで勉強しますか？"
        },
        {
          word: "when",
          meaning: "いつ",
          example: "When do you practice?",
          exampleJapanese: "あなたはいつ練習しますか？"
        },
        {
          word: "usually",
          meaning: "ふつう",
          example: "I usually study at home.",
          exampleJapanese: "私はたいてい家で勉強します。"
        },
        {
          word: "library",
          meaning: "図書館",
          example: "I read books in the library.",
          exampleJapanese: "私は図書館で本を読みます。"
        }
      ]),
      "2026-06-30": Object.freeze([
        {
          word: "class",
          meaning: "授業",
          example: "I have English class today.",
          exampleJapanese: "今日は英語の授業があります。"
        },
        {
          word: "lunch",
          meaning: "昼食",
          example: "I have lunch at school.",
          exampleJapanese: "私は学校で昼食を食べます。"
        },
        {
          word: "usually",
          meaning: "ふつう",
          example: "I usually go to school by train.",
          exampleJapanese: "私はたいてい電車で学校に行きます。"
        },
        {
          word: "practice",
          meaning: "練習する",
          example: "I practice soccer after school.",
          exampleJapanese: "私は放課後にサッカーを練習します。"
        },
        {
          word: "break",
          meaning: "休み時間",
          example: "I talk with my friends during break.",
          exampleJapanese: "私は休み時間中に友達とおしゃべりをします。"
        },
        {
          word: "daily",
          meaning: "毎日の",
          example: "This is my daily routine.",
          exampleJapanese: "これが私の日課（毎日の習慣）です。"
        }
      ]),
      "2026-07-01": Object.freeze([
        {
          word: "friend",
          meaning: "友達",
          example: "My friend is Yuta.",
          exampleJapanese: "私の友達はユウタです。"
        },
        {
          word: "likes",
          meaning: "好きです",
          example: "He likes soccer.",
          exampleJapanese: "彼はサッカーが好きです。"
        },
        {
          word: "plays",
          meaning: "します",
          example: "She plays tennis.",
          exampleJapanese: "彼女はテニスをします。"
        },
        {
          word: "studies",
          meaning: "勉強します",
          example: "He studies English.",
          exampleJapanese: "彼は英語を勉強します。"
        },
        {
          word: "helps",
          meaning: "助けます",
          example: "She helps her friends.",
          exampleJapanese: "彼女は友達を助けます（手伝います）。"
        },
        {
          word: "kind",
          meaning: "親切な",
          example: "My friend is kind.",
          exampleJapanese: "私の友達は親切です。"
        }
      ]),
      "2026-07-02": Object.freeze([
        {
          word: "swim",
          meaning: "泳ぐ",
          example: "I can swim.",
          exampleJapanese: "私は泳ぐことができます。"
        },
        {
          word: "run",
          meaning: "走る",
          example: "I can run fast.",
          exampleJapanese: "私は速く走ることができます。"
        },
        {
          word: "speak",
          meaning: "話す",
          example: "I can speak English.",
          exampleJapanese: "私は英語を話すことができます。"
        },
        {
          word: "cook",
          meaning: "料理する",
          example: "I can cook dinner.",
          exampleJapanese: "私は夕食を作ることができます。"
        },
        {
          word: "draw",
          meaning: "描く",
          example: "I can draw pictures.",
          exampleJapanese: "私は絵を描くことができます。"
        },
        {
          word: "well",
          meaning: "上手に",
          example: "I can play tennis well.",
          exampleJapanese: "私は上手にテニスをすることができます。"
        }
      ]),
      "2026-07-03": Object.freeze([
        {
          word: "notebook",
          meaning: "ノート",
          example: "This is my notebook.",
          exampleJapanese: "これは私のノートです。"
        },
        {
          word: "pencil",
          meaning: "鉛筆",
          example: "This is my pencil.",
          exampleJapanese: "これは私の鉛筆です。"
        },
        {
          word: "pens",
          meaning: "ペン",
          example: "These are my pens.",
          exampleJapanese: "これらは私のペンです。"
        },
        {
          word: "books",
          meaning: "本",
          example: "These are my books.",
          exampleJapanese: "これらは私の本です。"
        },
        {
          word: "use",
          meaning: "使う",
          example: "I use them at school.",
          exampleJapanese: "私はそれらを学校で使います。"
        },
        {
          word: "important",
          meaning: "大切な",
          example: "These books are important.",
          exampleJapanese: "これらの本は大切です。"
        }
      ]),
      "2026-07-04": Object.freeze([
        {
          word: "went",
          meaning: "行った",
          example: "I went to school yesterday.",
          exampleJapanese: "私は昨日、学校に行きました。"
        },
        {
          word: "played",
          meaning: "した",
          example: "I played soccer yesterday.",
          exampleJapanese: "私は昨日、サッカーをしました。"
        },
        {
          word: "studied",
          meaning: "勉強した",
          example: "I studied English yesterday.",
          exampleJapanese: "私は昨日、英語を勉強しました。"
        },
        {
          word: "had",
          meaning: "食べた・持った",
          example: "I had dinner with my family.",
          exampleJapanese: "私は家族と一緒に夕食を食べました。"
        },
        {
          word: "read",
          meaning: "読んだ",
          example: "I read a book yesterday.",
          exampleJapanese: "私は昨日、本を読みました。"
        },
        {
          word: "weekend",
          meaning: "週末",
          example: "I like weekends.",
          exampleJapanese: "私は週末が好きです。"
        }
      ]),
      "2026-07-05": Object.freeze([
        {
          word: "goal",
          meaning: "目標",
          example: "My goal is to speak English.",
          exampleJapanese: "私の目標は英語を話すことです。"
        },
        {
          word: "practice",
          meaning: "練習する",
          example: "I practice English every day.",
          exampleJapanese: "私は毎日英語を練習します。"
        },
        {
          word: "mistake",
          meaning: "間違い",
          example: "I make mistakes sometimes.",
          exampleJapanese: "私はときどき間違いをします。"
        },
        {
          word: "again",
          meaning: "もう一度",
          example: "I try again.",
          exampleJapanese: "私はもう一度挑戦（やって）みます。"
        },
        {
          word: "clear",
          meaning: "はっきりした",
          example: "My answer is clear.",
          exampleJapanese: "私の答えは明確（はっきり）しています。"
        },
        {
          word: "useful",
          meaning: "役に立つ",
          example: "This practice is useful.",
          exampleJapanese: "この練習は役に立ちます。"
        }
      ])
    }),
    W3: Object.freeze({
      "2026-07-06": Object.freeze([
        {
          word: "speech",
          meaning: "スピーチ",
          example: "I gave a short speech.",
          exampleJapanese: "私は短いスピーチをしました。"
        },
        {
          word: "topic",
          meaning: "テーマ",
          example: "The topic is About Me.",
          exampleJapanese: "テーマは「私について」です。"
        },
        {
          word: "nervous",
          meaning: "緊張した",
          example: "I was nervous.",
          exampleJapanese: "私は緊張していました。"
        },
        {
          word: "clear",
          meaning: "はっきりした",
          example: "His answer was clear.",
          exampleJapanese: "彼の答えは明確（はっきり）していました。"
        },
        {
          word: "try again",
          meaning: "もう一度やる",
          example: "I try again.",
          exampleJapanese: "私はもう一度やってみます。"
        },
        {
          word: "mistake",
          meaning: "間違い",
          example: "I made a mistake.",
          exampleJapanese: "私は間違いを（一つ）しました。"
        }
      ]),
      "2026-07-07": Object.freeze([
        {
          word: "usually",
          meaning: "ふつう",
          example: "I usually study at home.",
          exampleJapanese: "私はたいてい家で勉強します。"
        },
        {
          word: "morning",
          meaning: "朝",
          example: "I study in the morning.",
          exampleJapanese: "私は朝に勉強します。"
        },
        {
          word: "evening",
          meaning: "夕方・夜",
          example: "I read in the evening.",
          exampleJapanese: "私は夕方（夜）に本を読みます。"
        },
        {
          word: "homework",
          meaning: "宿題",
          example: "I do my homework.",
          exampleJapanese: "私は宿題をします。"
        },
        {
          word: "before",
          meaning: "〜の前に",
          example: "I read before dinner.",
          exampleJapanese: "私は夕食の前に本を読みます。"
        },
        {
          word: "after",
          meaning: "〜の後に",
          example: "I study after dinner.",
          exampleJapanese: "私は夕食の後に勉強します。"
        }
      ]),
      "2026-07-08": Object.freeze([
        {
          word: "skill",
          meaning: "技能・できること",
          example: "English is a useful skill.",
          exampleJapanese: "英語は役に立つ技能です。"
        },
        {
          word: "fast",
          meaning: "速く",
          example: "I can run fast.",
          exampleJapanese: "私は速く走ることができます。"
        },
        {
          word: "well",
          meaning: "上手に",
          example: "She can play tennis well.",
          exampleJapanese: "彼女はテニスを上手にすることができます。"
        },
        {
          word: "a little",
          meaning: "少し",
          example: "I can speak English a little.",
          exampleJapanese: "私は英語を少し話すことができます。"
        },
        {
          word: "practice",
          meaning: "練習する",
          example: "I practice every day.",
          exampleJapanese: "私は毎日練習します。"
        },
        {
          word: "difficult",
          meaning: "難しい",
          example: "Speaking is difficult.",
          exampleJapanese: "話すことは難しいです。"
        }
      ]),
      "2026-07-09": Object.freeze([
        {
          word: "yesterday",
          meaning: "昨日",
          example: "I studied English yesterday.",
          exampleJapanese: "私は昨日、英語を勉強しました。"
        },
        {
          word: "went",
          meaning: "行った",
          example: "I went to school.",
          exampleJapanese: "私は学校に行きました。"
        },
        {
          word: "played",
          meaning: "した・遊んだ",
          example: "I played soccer.",
          exampleJapanese: "私はサッカーをしました。"
        },
        {
          word: "studied",
          meaning: "勉強した",
          example: "I studied English.",
          exampleJapanese: "私は英語を勉強しました。"
        },
        {
          word: "had",
          meaning: "食べた・持った",
          example: "I had lunch.",
          exampleJapanese: "私は昼食を食べました。"
        },
        {
          word: "read",
          meaning: "読んだ",
          example: "I read a book.",
          exampleJapanese: "私は本を読みました。"
        }
      ]),
      "2026-07-10": Object.freeze([
        {
          word: "remember",
          meaning: "覚える",
          example: "I remember the word.",
          exampleJapanese: "私はその単語を覚えています。"
        },
        {
          word: "meaning",
          meaning: "意味",
          example: "I know the meaning.",
          exampleJapanese: "私はその意味を知っています。"
        },
        {
          word: "example",
          meaning: "例",
          example: "This is an example.",
          exampleJapanese: "これは一例です。"
        },
        {
          word: "sentence",
          meaning: "文",
          example: "I make a sentence.",
          exampleJapanese: "私は文を作ります。"
        },
        {
          word: "underline",
          meaning: "下線を引く",
          example: "I underline the word.",
          exampleJapanese: "私はその単語に下線を引きます。"
        },
        {
          word: "useful",
          meaning: "役に立つ",
          example: "This is useful.",
          exampleJapanese: "これは役に立ちます。"
        }
      ]),
      "2026-07-11": Object.freeze([
        {
          word: "class",
          meaning: "授業・クラス",
          example: "I have English class.",
          exampleJapanese: "私は英語の授業があります。"
        },
        {
          word: "subject",
          meaning: "科目",
          example: "My favorite subject is English.",
          exampleJapanese: "私の大好きな科目は英語です。"
        },
        {
          word: "friend",
          meaning: "友達",
          example: "I have many friends.",
          exampleJapanese: "私はたくさんの友達がいます。"
        },
        {
          word: "lunch",
          meaning: "昼食",
          example: "I have lunch at school.",
          exampleJapanese: "私は学校で昼食を食べます。"
        },
        {
          word: "club",
          meaning: "部活",
          example: "I practice after school.",
          exampleJapanese: "私は放課後に（部活の）練習をします。"
        },
        {
          word: "week",
          meaning: "週",
          example: "This week was busy.",
          exampleJapanese: "今週は忙しかったです。"
        }
      ]),
      "2026-07-12": Object.freeze([
        {
          word: "answer",
          meaning: "答える",
          example: "I answer questions.",
          exampleJapanese: "私は質問に答えます。"
        },
        {
          word: "question",
          meaning: "質問",
          example: "This is a question.",
          exampleJapanese: "これは質問です。"
        },
        {
          word: "clearly",
          meaning: "はっきりと",
          example: "I speak clearly.",
          exampleJapanese: "私ははっきりと話します。"
        },
        {
          word: "again",
          meaning: "もう一度",
          example: "I try again.",
          exampleJapanese: "私はもう一度挑戦（やって）みます。"
        },
        {
          word: "because",
          meaning: "なぜなら",
          example: "I like English because it is useful.",
          exampleJapanese: "役に立つので、私は英語が好きです。"
        },
        {
          word: "goal",
          meaning: "目標",
          example: "My goal is to speak English.",
          exampleJapanese: "私の目標は英語を話すことです。"
        }
      ])
    }),
    W4: Object.freeze({
      "2026-07-13": Object.freeze([
        {
          word: "answer",
          meaning: "答える・答え",
          example: "I answer the question.",
          exampleJapanese: "私は質問に答えます。"
        },
        {
          word: "subject",
          meaning: "科目",
          example: "My favorite subject is English.",
          exampleJapanese: "私の大好きな科目は英語です。"
        },
        {
          word: "at first",
          meaning: "最初は",
          example: "At first, he was quiet.",
          exampleJapanese: "最初、彼は静かでした。"
        },
        {
          word: "because",
          meaning: "なぜなら",
          example: "I like English because it is interesting.",
          exampleJapanese: "面白いので、私は英語が好きです。"
        },
        {
          word: "clear",
          meaning: "はっきりした",
          example: "Her answer was clear.",
          exampleJapanese: "彼女の答えは明確（はっきり）していました。"
        },
        {
          word: "second",
          meaning: "2番目の",
          example: "His second answer was longer.",
          exampleJapanese: "彼の2番目の答えは（1番目より）長かったです。"
        }
      ]),
      "2026-07-14": Object.freeze([
        {
          word: "usually",
          meaning: "たいてい",
          example: "She usually studies after dinner.",
          exampleJapanese: "彼女はたいてい夕食後に勉強します。"
        },
        {
          word: "before",
          meaning: "〜の前に",
          example: "I read before bed.",
          exampleJapanese: "私は寝る前に（本を）読みます。"
        },
        {
          word: "practice",
          meaning: "練習する",
          example: "He practices baseball.",
          exampleJapanese: "彼は野球を練習します。"
        },
        {
          word: "every day",
          meaning: "毎日",
          example: "She studies every day.",
          exampleJapanese: "彼女は毎日勉強します。"
        },
        {
          word: "brother",
          meaning: "兄・弟",
          example: "Her brother plays baseball.",
          exampleJapanese: "彼女の兄弟（兄/弟）は野球をします。"
        },
        {
          word: "finish",
          meaning: "終える",
          example: "She finishes her homework.",
          exampleJapanese: "彼女は宿題を終わらせます。"
        }
      ]),
      "2026-07-15": Object.freeze([
        {
          word: "cook",
          meaning: "料理する",
          example: "I can cook dinner.",
          exampleJapanese: "私は夕食を作ることができます。"
        },
        {
          word: "sandwich",
          meaning: "サンドイッチ",
          example: "He can make a sandwich.",
          exampleJapanese: "彼はサンドイッチを作ることができます。"
        },
        {
          word: "simple",
          meaning: "簡単な",
          example: "This is a simple meal.",
          exampleJapanese: "これは簡単な食事です。"
        },
        {
          word: "yet",
          meaning: "まだ",
          example: "I cannot cook curry yet.",
          exampleJapanese: "私はまだカレーを作ることができません。"
        },
        {
          word: "together",
          meaning: "一緒に",
          example: "We cook together.",
          exampleJapanese: "私たちは一緒に料理をします。"
        },
        {
          word: "Sunday",
          meaning: "日曜日",
          example: "We practice on Sundays.",
          exampleJapanese: "私たちは毎週日曜日に練習をします。"
        }
      ]),
      "2026-07-16": Object.freeze([
        {
          word: "library",
          meaning: "図書館",
          example: "I went to the library.",
          exampleJapanese: "私は図書館に行きました。"
        },
        {
          word: "wrote",
          meaning: "write の過去形（書いた）",
          example: "She wrote three sentences.",
          exampleJapanese: "彼女は文を3つ書きました。"
        },
        {
          word: "after lunch",
          meaning: "昼食後",
          example: "We played after lunch.",
          exampleJapanese: "私たちは昼食後に遊びました。"
        },
        {
          word: "friend",
          meaning: "友達",
          example: "I met my friend.",
          exampleJapanese: "私は友達に会いました。"
        },
        {
          word: "morning",
          meaning: "朝",
          example: "I studied in the morning.",
          exampleJapanese: "私は朝に勉強しました。"
        },
        {
          word: "English book",
          meaning: "英語の本",
          example: "I read an English book.",
          exampleJapanese: "私は英語の本を読みました。"
        }
      ]),
      "2026-07-17": Object.freeze([
        {
          word: "dictionary",
          meaning: "辞書",
          example: "This is my dictionary.",
          exampleJapanese: "これは私の辞書です。"
        },
        {
          word: "card",
          meaning: "カード",
          example: "These are my English cards.",
          exampleJapanese: "これらは私の英語カードです。"
        },
        {
          word: "notebook",
          meaning: "ノート",
          example: "That is her notebook.",
          exampleJapanese: "あれは彼女のノートです。"
        },
        {
          word: "pen",
          meaning: "ペン",
          example: "Those are her pens.",
          exampleJapanese: "あれらは彼女のペンです。"
        },
        {
          word: "use",
          meaning: "使う",
          example: "I use it every day.",
          exampleJapanese: "私はそれを毎日使います。"
        },
        {
          word: "whose",
          meaning: "だれの",
          example: "Whose notebook is that?",
          exampleJapanese: "あれは誰のノートですか？"
        }
      ]),
      "2026-07-18": Object.freeze([
        {
          word: "busy",
          meaning: "忙しい",
          example: "He had a busy day.",
          exampleJapanese: "彼は忙しい一日を過ごしました。"
        },
        {
          word: "clean",
          meaning: "掃除する",
          example: "He cleaned his room.",
          exampleJapanese: "彼は自分の部屋を掃除しました。"
        },
        {
          word: "help",
          meaning: "手伝う",
          example: "He helped his mother.",
          exampleJapanese: "彼は母親を手伝いました。"
        },
        {
          word: "finish",
          meaning: "終える",
          example: "He finished his homework.",
          exampleJapanese: "彼は宿題を終わらせました。"
        },
        {
          word: "tired",
          meaning: "疲れた",
          example: "He was tired.",
          exampleJapanese: "彼は疲れていました。"
        },
        {
          word: "happy",
          meaning: "うれしい",
          example: "He was happy.",
          exampleJapanese: "彼は嬉しかったです。"
        }
      ]),
      "2026-07-19": Object.freeze([
        {
          word: "goal",
          meaning: "目標",
          example: "My goal is to speak English.",
          exampleJapanese: "私の目標は英語を話すことです。"
        },
        {
          word: "clearly",
          meaning: "はっきりと",
          example: "I speak clearly.",
          exampleJapanese: "私ははっきりと話します。"
        },
        {
          word: "question",
          meaning: "質問",
          example: "I answer a question.",
          exampleJapanese: "私は質問に答えます。"
        },
        {
          word: "useful",
          meaning: "役に立つ",
          example: "English is useful.",
          exampleJapanese: "英語は役に立ちます。"
        },
        {
          word: "improve",
          meaning: "上達する",
          example: "I want to improve my English.",
          exampleJapanese: "私は英語を上達させたいです。"
        },
        {
          word: "review",
          meaning: "復習する",
          example: "I review my homework.",
          exampleJapanese: "私は宿題を復習します。"
        }
      ])
    }),
    W5: Object.freeze({
      "2026-07-20": Object.freeze([
        {
          word: "improve",
          meaning: "上達する",
          example: "I want to improve my English.",
          exampleJapanese: "私は英語を上達させたいです。"
        },
        {
          word: "at first",
          meaning: "最初は",
          example: "At first, I spoke slowly.",
          exampleJapanese: "最初は、私はゆっくり話しました。"
        },
        {
          word: "instead",
          meaning: "その代わりに",
          example: "I read aloud instead.",
          exampleJapanese: "私はその代わりに音読しました。"
        },
        {
          word: "notice",
          meaning: "気づく",
          example: "I noticed my mistake.",
          exampleJapanese: "私は自分の間違いに気づきました。"
        },
        {
          word: "continue",
          meaning: "続ける",
          example: "I continued the practice.",
          exampleJapanese: "私はその練習を続けました。"
        },
        {
          word: "more quickly",
          meaning: "より速く",
          example: "I can answer more quickly.",
          exampleJapanese: "私はもっと速く答えることができます。"
        }
      ]),
      "2026-07-21": Object.freeze([
        {
          word: "usually",
          meaning: "たいてい",
          example: "He usually studies at home.",
          exampleJapanese: "彼はたいてい家で勉強します。"
        },
        {
          word: "sometimes",
          meaning: "ときどき",
          example: "She sometimes reads books.",
          exampleJapanese: "彼女はときどき本を読みます。"
        },
        {
          word: "before dinner",
          meaning: "夕食前に",
          example: "He practices before dinner.",
          exampleJapanese: "彼は夕食前に練習します。"
        },
        {
          word: "afterward",
          meaning: "そのあとで",
          example: "She studies afterward.",
          exampleJapanese: "彼女はそのあとで勉強します。"
        },
        {
          word: "member",
          meaning: "部員・一員",
          example: "He is a team member.",
          exampleJapanese: "彼はチームの一員です。"
        },
        {
          word: "routine",
          meaning: "日課",
          example: "This is her daily routine.",
          exampleJapanese: "これは彼女の日課です。"
        }
      ]),
      "2026-07-22": Object.freeze([
        {
          word: "during",
          meaning: "～の間に",
          example: "I read during lunch.",
          exampleJapanese: "私は昼食の間に本を読みます。"
        },
        {
          word: "library",
          meaning: "図書館",
          example: "She studies in the library.",
          exampleJapanese: "彼女は図書館で勉強します。"
        },
        {
          word: "together",
          meaning: "一緒に",
          example: "We practice together.",
          exampleJapanese: "私たちは一緒に練習します。"
        },
        {
          word: "reason",
          meaning: "理由",
          example: "What is the reason?",
          exampleJapanese: "理由は何ですか。"
        },
        {
          word: "choose",
          meaning: "選ぶ",
          example: "I chose this book.",
          exampleJapanese: "私はこの本を選びました。"
        },
        {
          word: "quiet",
          meaning: "静かな",
          example: "The library is quiet.",
          exampleJapanese: "その図書館は静かです。"
        }
      ]),
      "2026-07-23": Object.freeze([
        {
          word: "arrive",
          meaning: "到着する",
          example: "We arrived at nine.",
          exampleJapanese: "私たちは9時に到着しました。"
        },
        {
          word: "begin",
          meaning: "始まる",
          example: "The game began at ten.",
          exampleJapanese: "試合は10時に始まりました。"
        },
        {
          word: "before",
          meaning: "～の前に",
          example: "We practiced before the game.",
          exampleJapanese: "私たちは試合の前に練習しました。"
        },
        {
          word: "after",
          meaning: "～のあとに",
          example: "We ate lunch after the game.",
          exampleJapanese: "私たちは試合のあとに昼食を食べました。"
        },
        {
          word: "finally",
          meaning: "最後に",
          example: "Finally, we went home.",
          exampleJapanese: "最後に、私たちは家に帰りました。"
        },
        {
          word: "excited",
          meaning: "わくわくした",
          example: "I was excited.",
          exampleJapanese: "私はわくわくしていました。"
        }
      ]),
      "2026-07-24": Object.freeze([
        {
          word: "correct",
          meaning: "正しい",
          example: "This sentence is correct.",
          exampleJapanese: "この文は正しいです。"
        },
        {
          word: "mistake",
          meaning: "間違い",
          example: "I found a mistake.",
          exampleJapanese: "私は間違いを見つけました。"
        },
        {
          word: "change",
          meaning: "直す・変える",
          example: "Change the verb form.",
          exampleJapanese: "動詞の形を直してください。"
        },
        {
          word: "form",
          meaning: "形",
          example: "Use the past form.",
          exampleJapanese: "過去形を使ってください。"
        },
        {
          word: "carefully",
          meaning: "注意深く",
          example: "Read the sentence carefully.",
          exampleJapanese: "その文を注意深く読んでください。"
        },
        {
          word: "check",
          meaning: "確認する",
          example: "Check the subject first.",
          exampleJapanese: "最初に主語を確認してください。"
        }
      ]),
      "2026-07-25": Object.freeze([
        {
          word: "event",
          meaning: "行事",
          example: "Our school had an event.",
          exampleJapanese: "私たちの学校では行事がありました。"
        },
        {
          word: "prepare",
          meaning: "準備する",
          example: "We prepared for the event.",
          exampleJapanese: "私たちはその行事の準備をしました。"
        },
        {
          word: "visitor",
          meaning: "訪問者",
          example: "Many visitors came.",
          exampleJapanese: "多くの訪問者が来ました。"
        },
        {
          word: "explain",
          meaning: "説明する",
          example: "I explained the rules.",
          exampleJapanese: "私はルールを説明しました。"
        },
        {
          word: "nervous",
          meaning: "緊張した",
          example: "I was nervous at first.",
          exampleJapanese: "私は最初、緊張していました。"
        },
        {
          word: "successful",
          meaning: "成功した",
          example: "The event was successful.",
          exampleJapanese: "その行事は成功しました。"
        }
      ]),
      "2026-07-26": Object.freeze([
        {
          word: "review",
          meaning: "復習する",
          example: "I review my homework.",
          exampleJapanese: "私は宿題を復習します。"
        },
        {
          word: "understand",
          meaning: "理解する",
          example: "I understand the passage.",
          exampleJapanese: "私はその文章を理解しています。"
        },
        {
          word: "explain",
          meaning: "説明する",
          example: "I can explain my answer.",
          exampleJapanese: "私は自分の答えを説明できます。"
        },
        {
          word: "practice",
          meaning: "練習する",
          example: "I practice every day.",
          exampleJapanese: "私は毎日練習します。"
        },
        {
          word: "difficult",
          meaning: "難しい",
          example: "This question is difficult.",
          exampleJapanese: "この問題は難しいです。"
        },
        {
          word: "goal",
          meaning: "目標",
          example: "I have a new goal.",
          exampleJapanese: "私には新しい目標があります。"
        }
      ])
    }),
    W6: Object.freeze({
      "2026-07-27": Object.freeze([
        {
          word: "decide",
          meaning: "決める",
          example: "I decided to practice every day.",
          exampleJapanese: "私は毎日練習することに決めました。"
        },
        {
          word: "quiet",
          meaning: "静かな",
          example: "The library is quiet.",
          exampleJapanese: "図書館は静かです。"
        },
        {
          word: "enough",
          meaning: "十分な",
          example: "Ten minutes is enough for today.",
          exampleJapanese: "今日は10分で十分です。"
        },
        {
          word: "however",
          meaning: "しかし",
          example: "It was difficult. However, I tried again.",
          exampleJapanese: "それは難しかったです。しかし、私はもう一度やってみました。"
        },
        {
          word: "result",
          meaning: "結果",
          example: "I saw a good result.",
          exampleJapanese: "私は良い結果を得ました。"
        },
        {
          word: "confident",
          meaning: "自信のある",
          example: "I feel more confident now.",
          exampleJapanese: "今はより自信を感じています。"
        }
      ]),
      "2026-07-28": Object.freeze([
        {
          word: "always",
          meaning: "いつも",
          example: "She always reads after dinner.",
          exampleJapanese: "彼女はいつも夕食後に読みます。"
        },
        {
          word: "usually",
          meaning: "たいてい",
          example: "He usually walks to school.",
          exampleJapanese: "彼はたいてい歩いて学校に行きます。"
        },
        {
          word: "sometimes",
          meaning: "ときどき",
          example: "She sometimes studies with me.",
          exampleJapanese: "彼女はときどき私と一緒に勉強します。"
        },
        {
          word: "never",
          meaning: "決して〜ない",
          example: "He never forgets his notebook.",
          exampleJapanese: "彼は決して自分のノートを忘れません。"
        },
        {
          word: "prepare",
          meaning: "準備する",
          example: "She prepares for class.",
          exampleJapanese: "彼女は授業の準備をします。"
        },
        {
          word: "explain",
          meaning: "説明する",
          example: "He explains the answer clearly.",
          exampleJapanese: "彼は答えをはっきりと説明します。"
        }
      ]),
      "2026-07-29": Object.freeze([
        {
          word: "during",
          meaning: "〜の間に",
          example: "I read during lunch break.",
          exampleJapanese: "私は昼休みの間に読みます。"
        },
        {
          word: "meeting",
          meaning: "集まり、会議",
          example: "We had a club meeting.",
          exampleJapanese: "私たちは部活のミーティングを開きました。"
        },
        {
          word: "member",
          meaning: "メンバー",
          example: "Each member had a job.",
          exampleJapanese: "各メンバーに仕事がありました。"
        },
        {
          word: "choose",
          meaning: "選ぶ",
          example: "We chose a short story.",
          exampleJapanese: "私たちは短い物語を選びました。"
        },
        {
          word: "reason",
          meaning: "理由",
          example: "Tell me the reason.",
          exampleJapanese: "理由を教えてください。"
        },
        {
          word: "together",
          meaning: "一緒に",
          example: "We practiced together.",
          exampleJapanese: "私たちは一緒に練習しました。"
        }
      ]),
      "2026-07-30": Object.freeze([
        {
          word: "find",
          meaning: "見つける",
          example: "I found my old notebook.",
          exampleJapanese: "私は自分の古いノートを見つけました。"
        },
        {
          word: "make",
          meaning: "作る",
          example: "We made a poster.",
          exampleJapanese: "私たちはポスターを作りました。"
        },
        {
          word: "feel",
          meaning: "感じる",
          example: "I felt nervous.",
          exampleJapanese: "私は緊張を感じました。"
        },
        {
          word: "finally",
          meaning: "ついに、最後に",
          example: "Finally, I finished it.",
          exampleJapanese: "ついに、私はそれを終わらせました。"
        },
        {
          word: "before",
          meaning: "〜の前に",
          example: "I checked it before class.",
          exampleJapanese: "私は授業の前にそれを確認しました。"
        },
        {
          word: "afterwards",
          meaning: "その後で",
          example: "We talked afterwards.",
          exampleJapanese: "私たちはその後で話しました。"
        }
      ]),
      "2026-07-31": Object.freeze([
        {
          word: "subject",
          meaning: "主語",
          example: "Check the subject first.",
          exampleJapanese: "最初に主語を確認しなさい。"
        },
        {
          word: "verb",
          meaning: "動詞",
          example: "Then check the verb.",
          exampleJapanese: "それから動詞を確認しなさい。"
        },
        {
          word: "form",
          meaning: "形",
          example: "Use the correct form.",
          exampleJapanese: "正しい形を使いなさい。"
        },
        {
          word: "order",
          meaning: "順番",
          example: "Check the word order.",
          exampleJapanese: "語順を確認しなさい。"
        },
        {
          word: "correct",
          meaning: "正しい",
          example: "Write the correct sentence.",
          exampleJapanese: "正しい文を書きなさい。"
        },
        {
          word: "compare",
          meaning: "比べる",
          example: "Compare the two sentences.",
          exampleJapanese: "2つの文を比べなさい。"
        }
      ]),
      "2026-08-01": Object.freeze([
        {
          word: "message",
          meaning: "メッセージ",
          example: "I read your message.",
          exampleJapanese: "私はあなたのメッセージを読みました。"
        },
        {
          word: "invite",
          meaning: "招待する",
          example: "I want to invite you.",
          exampleJapanese: "私はあなたを招待したいです。"
        },
        {
          word: "available",
          meaning: "都合がつく",
          example: "Are you available on Saturday?",
          exampleJapanese: "土曜日は都合がつきますか？"
        },
        {
          word: "bring",
          meaning: "持ってくる",
          example: "Please bring your notebook.",
          exampleJapanese: "ノートを持ってきてください。"
        },
        {
          word: "practice room",
          meaning: "練習室",
          example: "Meet me in the practice room.",
          exampleJapanese: "練習室で会いましょう。"
        },
        {
          word: "reply",
          meaning: "返信する",
          example: "Please reply today.",
          exampleJapanese: "今日中に返信してください。"
        }
      ]),
      "2026-08-02": Object.freeze([
        {
          word: "review",
          meaning: "復習する",
          example: "I reviewed this week's work.",
          exampleJapanese: "私は今週の課題を復習しました。"
        },
        {
          word: "detail",
          meaning: "細部、詳しい情報",
          example: "I found an important detail.",
          exampleJapanese: "私は重要な詳細を見つけました。"
        },
        {
          word: "main idea",
          meaning: "要点",
          example: "I understood the main idea.",
          exampleJapanese: "私は要点を理解しました。"
        },
        {
          word: "mistake",
          meaning: "間違い",
          example: "I corrected a mistake.",
          exampleJapanese: "私は間違いを直しました。"
        },
        {
          word: "reason",
          meaning: "理由",
          example: "I explained the reason.",
          exampleJapanese: "私は理由を説明しました。"
        },
        {
          word: "goal",
          meaning: "目標",
          example: "I made a new goal.",
          exampleJapanese: "私は新しい目標を立てました。"
        }
      ])
    }),
    W7: Object.freeze({
      "2026-08-03": Object.freeze([
        {
          word: "restart",
          meaning: "再開する",
          example: "I restarted my English practice.",
          exampleJapanese: "私は英語の練習を再開しました。"
        },
        {
          word: "remember",
          meaning: "思い出す",
          example: "I remembered the rule.",
          exampleJapanese: "私はそのルールを思い出しました。"
        },
        {
          word: "basic",
          meaning: "基本の",
          example: "I checked the basic sentence.",
          exampleJapanese: "私は基本の文を確認しました。"
        },
        {
          word: "again",
          meaning: "もう一度",
          example: "I read it again.",
          exampleJapanese: "私はそれをもう一度読みました。"
        },
        {
          word: "carefully",
          meaning: "注意深く",
          example: "I checked it carefully.",
          exampleJapanese: "私はそれを注意深く確認しました。"
        },
        {
          word: "ready",
          meaning: "準備ができた",
          example: "I am ready to study.",
          exampleJapanese: "私は勉強する準備ができています。"
        }
      ]),
      "2026-08-04": Object.freeze([
        {
          word: "routine",
          meaning: "日課",
          example: "This is my morning routine.",
          exampleJapanese: "これは私の朝の日課です。"
        },
        {
          word: "usually",
          meaning: "たいてい",
          example: "She usually studies after dinner.",
          exampleJapanese: "彼女はたいてい夕食後に勉強します。"
        },
        {
          word: "sometimes",
          meaning: "ときどき",
          example: "He sometimes reads at school.",
          exampleJapanese: "彼はときどき学校で本を読みます。"
        },
        {
          word: "before",
          meaning: "〜の前に",
          example: "She studies before dinner.",
          exampleJapanese: "彼女は夕食前に勉強します。"
        },
        {
          word: "afterwards",
          meaning: "その後",
          example: "He rests afterwards.",
          exampleJapanese: "彼はそのあと休憩します。"
        },
        {
          word: "habit",
          meaning: "習慣",
          example: "Reading is a good habit.",
          exampleJapanese: "読書はよい習慣です。"
        }
      ]),
      "2026-08-05": Object.freeze([
        {
          word: "borrow",
          meaning: "借りる",
          example: "I borrowed a book.",
          exampleJapanese: "私は本を借りました。"
        },
        {
          word: "return",
          meaning: "返す",
          example: "I returned it on Friday.",
          exampleJapanese: "私は金曜日にそれを返しました。"
        },
        {
          word: "library",
          meaning: "図書館",
          example: "We met at the library.",
          exampleJapanese: "私たちは図書館で会いました。"
        },
        {
          word: "because",
          meaning: "〜なので",
          example: "I went there because I needed a book.",
          exampleJapanese: "本が必要だったので、私はそこへ行きました。"
        },
        {
          word: "together",
          meaning: "一緒に",
          example: "We studied together.",
          exampleJapanese: "私たちは一緒に勉強しました。"
        },
        {
          word: "information",
          meaning: "情報",
          example: "I found the information.",
          exampleJapanese: "私はその情報を見つけました。"
        }
      ]),
      "2026-08-06": Object.freeze([
        {
          word: "first",
          meaning: "最初に",
          example: "First, I checked my bag.",
          exampleJapanese: "最初に、私はカバンを確認しました。"
        },
        {
          word: "then",
          meaning: "それから",
          example: "Then, I went outside.",
          exampleJapanese: "それから、私は外へ出ました。"
        },
        {
          word: "find",
          meaning: "見つける",
          example: "I found my key.",
          exampleJapanese: "私は鍵を見つけました。"
        },
        {
          word: "lose",
          meaning: "なくす",
          example: "I lost my key.",
          exampleJapanese: "私は鍵をなくしました。"
        },
        {
          word: "finally",
          meaning: "最後に",
          example: "Finally, I went home.",
          exampleJapanese: "最後に、私は家に帰りました。"
        },
        {
          word: "relieved",
          meaning: "ほっとした",
          example: "I felt relieved.",
          exampleJapanese: "私は安心しました（ほっとしました）。"
        }
      ]),
      "2026-08-07": Object.freeze([
        {
          word: "error",
          meaning: "誤り",
          example: "I found an error.",
          exampleJapanese: "私は間違いを見つけました。"
        },
        {
          word: "correct",
          meaning: "正しい",
          example: "Write the correct sentence.",
          exampleJapanese: "正しい文を書きなさい。"
        },
        {
          word: "base form",
          meaning: "動詞の原形",
          example: "Use the base form.",
          exampleJapanese: "動詞の原形を使いなさい。"
        },
        {
          word: "subject",
          meaning: "主語",
          example: "Check the subject.",
          exampleJapanese: "主語を確認しなさい。"
        },
        {
          word: "tense",
          meaning: "時制",
          example: "Check the tense.",
          exampleJapanese: "時制を確認しなさい。"
        },
        {
          word: "rule",
          meaning: "ルール",
          example: "Remember the rule.",
          exampleJapanese: "ルールを覚えておきなさい。"
        }
      ]),
      "2026-08-08": Object.freeze([
        {
          word: "event",
          meaning: "行事",
          example: "Our school has an event.",
          exampleJapanese: "私たちの学校には行事があります。"
        },
        {
          word: "join",
          meaning: "参加する",
          example: "I want to join the event.",
          exampleJapanese: "私はその行事に楽しく参加したいです。"
        },
        {
          word: "meeting room",
          meaning: "会議室",
          example: "Meet in the meeting room.",
          exampleJapanese: "会議室で集まりなさい。"
        },
        {
          word: "bring",
          meaning: "持ってくる",
          example: "Please bring a pencil.",
          exampleJapanese: "鉛筆を持ってきてください。"
        },
        {
          word: "start",
          meaning: "始まる",
          example: "The event starts at ten.",
          exampleJapanese: "その行事は10時に始まります。"
        },
        {
          word: "finish",
          meaning: "終わる",
          example: "It finishes at noon.",
          exampleJapanese: "それは正午に終わります。"
        }
      ]),
      "2026-08-09": Object.freeze([
        {
          word: "main idea",
          meaning: "要点",
          example: "Find the main idea first.",
          exampleJapanese: "最初に要点を見つけなさい。"
        },
        {
          word: "detail",
          meaning: "細部",
          example: "Check the details next.",
          exampleJapanese: "次に詳細を確認しなさい。"
        },
        {
          word: "review",
          meaning: "復習する",
          example: "I reviewed my homework.",
          exampleJapanese: "私は宿題を復習しました。"
        },
        {
          word: "progress",
          meaning: "進歩",
          example: "I can see my progress.",
          exampleJapanese: "私は自分の上達（進歩）が分かります。"
        },
        {
          word: "difficult",
          meaning: "難しい",
          example: "This question was difficult.",
          exampleJapanese: "この問題は難しかったです。"
        },
        {
          word: "goal",
          meaning: "目標",
          example: "I made a new goal.",
          exampleJapanese: "私は新しい目標を立てました。"
        }
      ])
    })
  });
  const SPEAKING_WORD_DEFAULT_WEEK_ID = Object.keys(SPEAKING_WORD_PRACTICE_DATA)[0] || "";
  const SPEAKING_WORD_DEFAULT_DAY_KEY = Object.keys(SPEAKING_WORD_PRACTICE_DATA[SPEAKING_WORD_DEFAULT_WEEK_ID] || {})[0] || "";
  const MOBILE_SPEECH_RATES = {
    slow: 0.82,
    normal: 0.92
  };
  const WEEKDAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"];

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let mobileAdminLearningHistorySelectedDayKey = "";
  let mobileAdminLearningHistoryFamilyChildren = [];
  let mobileAdminLearningHistorySelectedChildKey = "parent";
  let mobileAdminLearningHistorySelectedChildUid = "";
  let mobileAdminLearningHistorySelectedDeviceType = "mobile";
  let mobileAdminLearningHistorySourceEntries = [];
  let mobileRuntimeDeviceId = "";
  let mobileCachedSonUid = "";
  let mobileFamilyIdentityRefreshPromise = null;
  let mobilePendingLearningHistoryEntries = [];
  let mobileLearningHistoryFlushPromise = null;
  let mobileFirestoreSdkPromise = null;
  let mobileAuthLastStatus = "pending";
  let mobileAuthLastUid = "";
  let mobileAuthListenerBound = false;
  const MOBILE_VOCABULARY_SYNC_COOLDOWN_MS = 5000;
  const MOBILE_VOCABULARY_SYNC_DEDUPE_MS = 1500;
  let vocabularySyncCurrentUid = "";
  let vocabularySyncReady = false;
  let vocabularySyncAllowCreate = false;
  let vocabularySyncInFlight = null;
  let vocabularySyncQueued = false;
  let vocabularySyncUnsubscribe = null;
  let vocabularySyncCache = null;
  let vocabularySyncCacheUid = "";
  let vocabularySyncRateLimitUntil = 0;
  let vocabularySyncLastOperationAtMs = 0;
  let vocabularyStateOwnerUid = "";
  let vocabularyTodayHistoryOwnerUid = "";
  let vocabularyTodayHistorySyncCurrentUid = "";
  let vocabularyTodayHistorySyncReady = false;
  let vocabularyTodayHistorySyncAllowCreate = false;
  let vocabularyTodayHistorySyncInFlight = null;
  let vocabularyTodayHistorySyncQueued = false;
  let vocabularyTodayHistorySyncUnsubscribe = null;
  let vocabularyTodayHistorySyncRateLimitUntil = 0;
  let vocabularyTodayHistorySyncLastOperationAtMs = 0;

  function shouldThrottleMobileVocabularySyncError(kind, error) {
    if (!error) return false;
    const errorText = String(error?.code || error?.message || error?.name || error || "").toLowerCase();
    return errorText.includes("429") || errorText.includes("resource-exhausted") || errorText.includes("too many requests");
  }

  function isMobileVocabularySyncRateLimited(kind) {
    const limitUntil = kind === "todayHistory"
      ? Number(vocabularyTodayHistorySyncRateLimitUntil) || 0
      : Number(vocabularySyncRateLimitUntil) || 0;
    return Number.isFinite(limitUntil) && Date.now() < limitUntil;
  }

  function applyMobileVocabularySyncRateLimit(kind, error) {
    const now = Date.now();
    const cooldownMs = MOBILE_VOCABULARY_SYNC_COOLDOWN_MS;
    if (kind === "todayHistory") {
      vocabularyTodayHistorySyncRateLimitUntil = now + cooldownMs;
      vocabularyTodayHistorySyncLastOperationAtMs = now;
      return true;
    }
    vocabularySyncRateLimitUntil = now + cooldownMs;
    vocabularySyncLastOperationAtMs = now;
    if (shouldThrottleMobileVocabularySyncError(kind, error)) {
      console.warn("[MobileVocabularySync] rate limited; skipping immediate retry", { kind, cooldownMs, error });
    }
    return true;
  }

  function isMobileVocabularySyncDuplicateBurst(kind) {
    const now = Date.now();
    if (kind === "todayHistory") {
      return vocabularyTodayHistorySyncLastOperationAtMs > 0 && now - vocabularyTodayHistorySyncLastOperationAtMs < MOBILE_VOCABULARY_SYNC_DEDUPE_MS;
    }
    return vocabularySyncLastOperationAtMs > 0 && now - vocabularySyncLastOperationAtMs < MOBILE_VOCABULARY_SYNC_DEDUPE_MS;
  }

  const state = {
    settings: {
      rangeMode: "auto",
      startDay: MOBILE_DAY_MIN,
      endDay: MOBILE_DAY_MAX,
      speechRateMode: "slow"
    },
    stats: {
      studySessions: 0,
      questionCount: 0,
      firstTryCorrect: 0,
      secondTryCorrect: 0,
      fullyIncorrect: 0
    },
    session: null,
    speakingUi: {
      selectedConversationWeekId: "",
      selectedConversationDayKeys: [],
      activeConversationDayKeys: [],
      vocabularyRangeMode: "auto",
      startDay: MOBILE_DAY_MIN,
      endDay: MOBILE_DAY_MAX,
      speakingWordSelectedWeekId: SPEAKING_WORD_DEFAULT_WEEK_ID,
      speakingWordSelectedDayKey: SPEAKING_WORD_DEFAULT_DAY_KEY,
      speakingWordDaySelectBackTarget: "week-select",
      speakingWordPractice: null
    },
    speakingProgress: null,
    speakingDayProgressMap: {},
    speakingLegacyUnresolvedProgress: null,
    speakingReviewStatsMap: {},
    speakingWordDayCompletionMap: {},
    speakingReviewSession: null,
    speakingReviewPlannedQueue: [],
    speakingMode: "week",
    recentSpeakingProgress: [],
    speakingTranslationVisible: false,
    speakingAudioPlaying: false,
    speakingAudioWatchdogId: null,
    speakingLineStatus: "idle",
    speakingUtterance: null,
    speakingHintVisible: false,
    speakingHintStep: 0,
    speakingHintTitle: "",
    speakingHintText: "",
    speakingLevel1MissingKeywords: [],
    speakingRecognitionDebugHtml: "",
    speakingLevel1Session: null,
    speakingLevel1AttemptUsed: 0,
    speakingLevel1AttemptKey: "",
    speakingRecognitionInProgress: false,
    speakingRecognition: null,
    speakingAutoAdvanceTimerId: null,
    vocabularySample: null,
    vocabularyStudy: null,
    vocabularyTodayHistoryMap: {},
    teacherCheckSession: null,
    vocabularyPastHistoryFilter: "all",
    wordOrderTraining: null,
    wordOrderSelectedRangeValue: WORD_ORDER_DAY_RANGES[0].value,
    translationTraining: null,
    translationTrainingCurrentPartIndex: 0,
    translationTrainingPartCompleted: false,
    translationTrainingSpeechDetected: false,
    translationTrainingSpeechTimerId: null,
    learningHistorySession: null,
    currentScreen: "homeScreen",
    confirmAction: null,
    pointRewardScreenState: null,
    micTestRecognition: null
  };

  const elements = {};

  const MOBILE_VOCABULARY_SAMPLE_WORDS = [
    {
      word: "environment",
      partOfSpeech: "名詞",
      meaning: "環境",
      accent: "en-VI-ron-ment",
      accentFocus: "VI",
      phonetic: "/ ɪnˈvaɪrənmənt /"
    },
    {
      word: "receive",
      partOfSpeech: "動詞",
      meaning: "受け取る",
      accent: "re-CEIVE",
      accentFocus: "CEIVE",
      phonetic: "/ rɪˈsiːv /"
    },
    {
      word: "important",
      partOfSpeech: "形容詞",
      meaning: "重要な",
      accent: "im-POR-tant",
      accentFocus: "POR",
      phonetic: "/ ɪmˈpɔːrtənt /"
    }
  ];

  const MOBILE_VOCABULARY_REAL_WORD_BANK = [
    { id: "environment", word: "environment", level: "5", partOfSpeech: "名詞", meaning: "環境", accent: "en-VI-ron-ment", accentFocus: "VI", phonetic: "/ ɪnˈvaɪrənmənt /", exampleSentence: "We need a clean environment.", exampleTranslation: "きれいな環境が必要です。" },
    { id: "receive", word: "receive", level: "5", partOfSpeech: "動詞", meaning: "受け取る", accent: "re-CEIVE", accentFocus: "CEIVE", phonetic: "/ rɪˈsiːv /", exampleSentence: "I received a letter.", exampleTranslation: "手紙を受け取りました。" },
    { id: "important", word: "important", level: "5", partOfSpeech: "形容詞", meaning: "重要な", accent: "im-POR-tant", accentFocus: "POR", phonetic: "/ ɪmˈpɔːrtənt /", exampleSentence: "It is important to study.", exampleTranslation: "勉強することは重要です。" },
    { id: "practice", word: "practice", level: "4", partOfSpeech: "名詞", meaning: "練習", accent: "PRAK-tis", accentFocus: "PRAK", phonetic: "/ ˈpræk.tɪs /", exampleSentence: "Daily practice helps.", exampleTranslation: "毎日の練習が役立ちます。" },
    { id: "careful", word: "careful", level: "4", partOfSpeech: "形容詞", meaning: "注意深い", accent: "CARE-ful", accentFocus: "CARE", phonetic: "/ ˈkeə.fəl /", exampleSentence: "Be careful with the knife.", exampleTranslation: "ナイフには気をつけて。" },
    { id: "result", word: "result", level: "3", partOfSpeech: "名詞", meaning: "結果", accent: "re-ZULT", accentFocus: "ZULT", phonetic: "/ rɪˈzʌlt /", exampleSentence: "The result was good.", exampleTranslation: "結果は良かったです。" }
  ];

  function createVocabularyTeacherCheckState(overrides = {}) {
    return {
      pronunciation: "none",
      meaning: "none",
      ...overrides
    };
  }

  function createVocabularySkillState(overrides = {}) {
    const normalizedTeacherCheckState = createVocabularyTeacherCheckState(overrides.teacherCheckState || {});
    const teacherCheckStatus = String(
      overrides.teacherCheckStatus ||
      normalizedTeacherCheckState.pronunciation ||
      normalizedTeacherCheckState.meaning ||
      "none"
    ).trim() || "none";

    return {
      currentState: "unlearned",
      level: 0,
      nextReviewAt: null,
      lastJudgedAt: null,
      lastJudgedBy: "self",
      teacherCheckStatus,
      teacherCheckState: normalizedTeacherCheckState,
      teacherCheckUpdatedAt: null,
      ...overrides,
      teacherCheckStatus: String(overrides.teacherCheckStatus || normalizedTeacherCheckState.pronunciation || normalizedTeacherCheckState.meaning || "none").trim() || "none",
      teacherCheckState: createVocabularyTeacherCheckState(overrides.teacherCheckState || {}),
      teacherCheckUpdatedAt: Number(overrides.teacherCheckUpdatedAt ?? overrides.teacherCheckUpdated ?? 0) || null
    };
  }

  function getVocabularyReviewDelayDays(level) {
    const reviewMap = {
      1: 1,
      2: 3,
      3: 7,
      4: 14,
      5: 30
    };
    return reviewMap[Number(level)] || 0;
  }

  function getVocabularyNextReviewAt(level, now = Date.now()) {
    const delayDays = getVocabularyReviewDelayDays(level);
    if (!delayDays) return null;
    return now + (delayDays * 24 * 60 * 60 * 1000);
  }

  function getVocabularyGradeValue(entry) {
    if (!entry || typeof entry !== "object") return "5";
    const rawGrade = entry.grade ?? entry.sourceLevel ?? entry.level ?? entry.gradeLevel ?? "5";
    const gradeText = String(rawGrade ?? "").trim();
    if (["5", "4", "3"].includes(gradeText)) return gradeText;
    if (["5級", "4級", "3級"].includes(gradeText)) return gradeText.replace("級", "");
    const digits = gradeText.match(/([345])/);
    if (digits) return digits[1];
    const numericValue = Number(rawGrade);
    if ([5, 4, 3].includes(numericValue)) return String(numericValue);
    return "5";
  }

  function normalizeVocabularyWordRecord(entry, index = 0) {
    const word = String(entry?.word || "").trim();
    if (!word) return null;
    const wordId = String(entry?.id || entry?.word || `${index}-${word}`);
    const pronunciation = entry?.pronunciation || {};
    const meaning = entry?.meaningState || {};
    const pronunciationTeacherCheckValue = String(entry?.pronunciationTeacherCheck || entry?.pronunciation?.teacherCheckStatus || entry?.teacherCheckState?.pronunciation || "none").trim() || "none";
    const meaningTeacherCheckValue = String(entry?.meaningTeacherCheck || entry?.meaningState?.teacherCheckStatus || entry?.teacherCheckState?.meaning || "none").trim() || "none";
    const pronunciationTeacherCheckUpdatedAt = Number(entry?.pronunciationTeacherCheckUpdatedAt || pronunciation.teacherCheckUpdatedAt || pronunciation.teacherCheckState?.pronunciationUpdatedAt || entry?.lastJudgedAt || pronunciation.lastJudgedAt || 0) || 0;
    const meaningTeacherCheckUpdatedAt = Number(entry?.meaningTeacherCheckUpdatedAt || meaning.teacherCheckUpdatedAt || meaning.teacherCheckState?.meaningUpdatedAt || entry?.lastJudgedAt || meaning.lastJudgedAt || 0) || 0;
    return {
      id: wordId,
      word,
      level: getVocabularyGradeValue(entry),
      partOfSpeech: entry?.partOfSpeech || "名詞",
      meaning: entry?.meaning || "",
      accent: entry?.accent || "",
      accentFocus: entry?.accentFocus || "",
      phonetic: entry?.phonetic || "",
      exampleSentence: entry?.exampleSentence || "",
      exampleTranslation: entry?.exampleTranslation || "",
      pronunciationTeacherCheck: pronunciationTeacherCheckValue,
      meaningTeacherCheck: meaningTeacherCheckValue,
      pronunciationTeacherCheckUpdatedAt,
      meaningTeacherCheckUpdatedAt,
      pronunciation: createVocabularySkillState({
        currentState: pronunciation.currentState || "unlearned",
        level: Number(pronunciation.level || 0),
        nextReviewAt: pronunciation.nextReviewAt || null,
        lastJudgedAt: pronunciation.lastJudgedAt || null,
        lastJudgedBy: pronunciation.lastJudgedBy || "self",
        teacherCheckStatus: pronunciationTeacherCheckValue,
        teacherCheckState: createVocabularyTeacherCheckState({
          pronunciation: pronunciationTeacherCheckValue,
          meaning: meaningTeacherCheckValue
        }),
        teacherCheckUpdatedAt: Number(pronunciation.teacherCheckUpdatedAt || pronunciationTeacherCheckUpdatedAt || 0) || null,
        ...pronunciation,
        teacherCheckState: createVocabularyTeacherCheckState(pronunciation.teacherCheckState || {
          pronunciation: pronunciationTeacherCheckValue,
          meaning: meaningTeacherCheckValue
        })
      }),
      meaningState: createVocabularySkillState({
        currentState: meaning.currentState || "unlearned",
        level: Number(meaning.level || 0),
        nextReviewAt: meaning.nextReviewAt || null,
        lastJudgedAt: meaning.lastJudgedAt || null,
        lastJudgedBy: meaning.lastJudgedBy || "self",
        teacherCheckStatus: meaningTeacherCheckValue,
        teacherCheckState: createVocabularyTeacherCheckState({
          pronunciation: pronunciationTeacherCheckValue,
          meaning: meaningTeacherCheckValue
        }),
        teacherCheckUpdatedAt: Number(meaning.teacherCheckUpdatedAt || meaningTeacherCheckUpdatedAt || 0) || null,
        ...meaning,
        teacherCheckState: createVocabularyTeacherCheckState(meaning.teacherCheckState || {
          pronunciation: pronunciationTeacherCheckValue,
          meaning: meaningTeacherCheckValue
        })
      }),
      lastJudgedAt: entry?.lastJudgedAt || null,
      lastJudgedBy: entry?.lastJudgedBy || "self",
      lastSelfResult: entry?.lastSelfResult || null,
      lastSelfJudgedAt: entry?.lastSelfJudgedAt || null,
      lastHumanConfirmedAt: entry?.lastHumanConfirmedAt || null,
      sessionFailedAt: entry?.sessionFailedAt || null,
      sessionRetryAfterQuestionCount: Number(entry?.sessionRetryAfterQuestionCount || 0),
      createdAt: entry?.createdAt || Date.now(),
      reviewHistory: Array.isArray(entry?.reviewHistory) ? entry.reviewHistory.slice() : []
    };
  }

  function createVocabularyStudyState(wordEntries = []) {
    const normalizedEntries = wordEntries
      .map((entry, index) => normalizeVocabularyWordRecord(entry, index))
      .filter(Boolean);
    const studyState = {
      targetWordCount: 1000,
      entries: normalizedEntries,
      progressMap: Object.fromEntries(normalizedEntries.map((entry) => [entry.id, entry])),
      session: {
        questionCount: 0,
        failedWordIds: [],
        recentFailedWordIds: []
      },
      gradeSummary: {
        5: { total: 0, mastered: 0 },
        4: { total: 0, mastered: 0 },
        3: { total: 0, mastered: 0 }
      }
    };
    studyState.entries.forEach((entry) => {
      const gradeKey = getVocabularyGradeValue(entry);
      if (!studyState.gradeSummary[gradeKey]) {
        studyState.gradeSummary[gradeKey] = { total: 0, mastered: 0 };
      }
      studyState.gradeSummary[gradeKey].total += 1;
      const isMastered = entry.pronunciation.level >= 5 && entry.meaningState.level >= 5;
      if (isMastered) {
        studyState.gradeSummary[gradeKey].mastered += 1;
      }
    });
    return studyState;
  }

  function createEmptyVocabularyStudyState() {
    return {
      targetWordCount: 0,
      entries: [],
      progressMap: {},
      session: {
        questionCount: 0,
        failedWordIds: [],
        recentFailedWordIds: []
      },
      gradeSummary: {
        5: { total: 0, mastered: 0 },
        4: { total: 0, mastered: 0 },
        3: { total: 0, mastered: 0 }
      }
    };
  }

  function sanitizeVocabularyStudyState(rawStudy) {
    if (!rawStudy || typeof rawStudy !== "object") return null;
    const sourceEntries = Array.isArray(rawStudy.entries) ? rawStudy.entries : [];
    const normalizedEntries = sourceEntries
      .map((entry, index) => normalizeVocabularyWordRecord(entry, index))
      .filter(Boolean);
    if (!normalizedEntries.length) {
      const emptyStudy = createEmptyVocabularyStudyState();
      if (Number.isFinite(Number(rawStudy.targetWordCount))) {
        emptyStudy.targetWordCount = Math.max(0, Number(rawStudy.targetWordCount) || 0);
      }
      if (rawStudy.session && typeof rawStudy.session === "object") {
        emptyStudy.session = {
          questionCount: Math.max(0, Number(rawStudy.session.questionCount) || 0),
          failedWordIds: Array.isArray(rawStudy.session.failedWordIds)
            ? rawStudy.session.failedWordIds.map((value) => String(value || "").trim()).filter(Boolean)
            : [],
          recentFailedWordIds: Array.isArray(rawStudy.session.recentFailedWordIds)
            ? rawStudy.session.recentFailedWordIds.map((value) => String(value || "").trim()).filter(Boolean)
            : []
        };
      }
      return emptyStudy;
    }
    const studyState = createVocabularyStudyState(normalizedEntries);
    if (Number.isFinite(Number(rawStudy.targetWordCount))) {
      studyState.targetWordCount = Math.max(0, Number(rawStudy.targetWordCount) || studyState.targetWordCount);
    }
    if (rawStudy.session && typeof rawStudy.session === "object") {
      studyState.session = {
        questionCount: Math.max(0, Number(rawStudy.session.questionCount) || 0),
        failedWordIds: Array.isArray(rawStudy.session.failedWordIds)
          ? rawStudy.session.failedWordIds.map((value) => String(value || "").trim()).filter(Boolean)
          : [],
        recentFailedWordIds: Array.isArray(rawStudy.session.recentFailedWordIds)
          ? rawStudy.session.recentFailedWordIds.map((value) => String(value || "").trim()).filter(Boolean)
          : []
      };
    }
    return studyState;
  }

  function getVocabularySkillStatus(skillState) {
    if (!skillState || !skillState.level) return "unlearned";
    if (skillState.level >= 5) return "mastered";
    if (skillState.nextReviewAt && skillState.nextReviewAt <= Date.now()) return "due";
    return "learning";
  }

  function getVocabularyWordProgressStatus(entry) {
    const pronunciationLevel = Number(entry?.pronunciation?.level ?? 0);
    const meaningLevel = Number(entry?.meaningState?.level ?? 0);
    if (pronunciationLevel >= 5 && meaningLevel >= 5) return "mastered";
    if (pronunciationLevel > 0 && meaningLevel > 0) return "learning";
    return "unlearned";
  }

  function getVocabularyTeacherCheckUpdatedAtForField(entry, fieldName) {
    if (!entry || typeof entry !== "object") return 0;
    const skill = fieldName === "meaning" ? entry.meaningState : entry.pronunciation;
    const fieldKey = fieldName === "meaning" ? "meaningTeacherCheckUpdatedAt" : "pronunciationTeacherCheckUpdatedAt";
    const directValue = Number(entry?.[fieldKey] ?? skill?.teacherCheckUpdatedAt ?? skill?.teacherCheckState?.[`${fieldName}UpdatedAt`] ?? 0) || 0;
    if (directValue) return directValue;
    return Number(skill?.lastJudgedAt || entry?.lastJudgedAt || entry?.createdAt || 0) || 0;
  }

  function applyTeacherCheckState(skillState, fieldName, status, options = {}) {
    if (!skillState || !skillState.teacherCheckState || typeof skillState.teacherCheckState !== "object") {
      skillState.teacherCheckState = createVocabularyTeacherCheckState();
    }
    if (!fieldName || !["pronunciation", "meaning"].includes(fieldName)) {
      return skillState;
    }
    const nextStatus = status === "ok" ? "◎" : status === "ng" ? "△" : "none";
    const now = Number(options.now || Date.now()) || Date.now();
    skillState.teacherCheckUpdatedAt = now;
    skillState.teacherCheckState[fieldName] = nextStatus;
    skillState.teacherCheckStatus = nextStatus === "none" ? "none" : nextStatus;
    if (options.entry && typeof options.entry === "object") {
      const topLevelField = fieldName === "meaning" ? "meaningTeacherCheck" : "pronunciationTeacherCheck";
      const topLevelTimestampField = fieldName === "meaning" ? "meaningTeacherCheckUpdatedAt" : "pronunciationTeacherCheckUpdatedAt";
      options.entry[topLevelField] = nextStatus;
      options.entry[topLevelTimestampField] = now;
    }
    return skillState;
  }

  function clearTeacherCheckStateForField(skillState, fieldName) {
    if (!skillState || !skillState.teacherCheckState || typeof skillState.teacherCheckState !== "object") {
      return skillState;
    }
    if (!fieldName || !["pronunciation", "meaning"].includes(fieldName)) {
      return skillState;
    }
    skillState.teacherCheckState[fieldName] = "none";
    skillState.teacherCheckStatus = "none";
    return skillState;
  }

  function applyVocabularySkillResult(entry, field, result, judgedBy = "self", now = Date.now()) {
    const skill = field === "meaning" ? entry.meaningState : entry.pronunciation;
    if (!skill) return entry;
    skill.lastSelfResult = result === "ok" ? "ok" : "ng";
    skill.lastSelfJudgedAt = now;
    if (result === "ok") {
      const nextLevel = Math.min(5, Number(skill.level || 0) + 1);
      skill.level = nextLevel;
      skill.currentState = nextLevel >= 5 ? "mastered" : "learning";
      skill.lastJudgedAt = now;
      skill.lastJudgedBy = judgedBy;
      skill.nextReviewAt = getVocabularyNextReviewAt(nextLevel, now);
      if (nextLevel >= 5) {
        skill.currentState = "mastered";
      }
    } else {
      const resetLevel = 1;
      skill.level = resetLevel;
      skill.currentState = "review";
      skill.lastJudgedAt = now;
      skill.lastJudgedBy = judgedBy;
      skill.nextReviewAt = getVocabularyNextReviewAt(resetLevel, now);
      clearTeacherCheckStateForField(skill, field === "meaning" ? "meaning" : "pronunciation");
      const teacherField = field === "meaning" ? "meaningTeacherCheck" : "pronunciationTeacherCheck";
      if (entry && typeof entry === "object") {
        entry[teacherField] = "none";
      }
      entry.sessionFailedAt = now;
      entry.sessionRetryAfterQuestionCount = 15;
    }
    entry.lastJudgedAt = now;
    entry.lastJudgedBy = judgedBy;
    entry.lastLearnedAt = now;
    return entry;
  }

  function appendVocabularySessionQuestion(studyState) {
    if (!studyState || !studyState.session) return;
    studyState.session.questionCount += 1;
  }

  function getVocabularyStudyEntryById(wordId) {
    if (!state.vocabularyStudy || !Array.isArray(state.vocabularyStudy.entries)) return null;
    const normalizedId = String(wordId || "").trim();
    if (!normalizedId) return null;
    return state.vocabularyStudy.entries.find((entry) => String(entry?.id || entry?.word || "").trim() === normalizedId) || null;
  }

  function updateVocabularyStudyEntryAfterJudgment(wordItem, kind, value) {
    if (!wordItem || !kind || !value) return null;
    if (!state.vocabularyStudy) {
      state.vocabularyStudy = buildVocabularyRealStudyState();
    }
    const normalizedId = String(wordItem.id || wordItem.word || "").trim();
    if (!normalizedId) return null;
    let entry = getVocabularyStudyEntryById(normalizedId);
    if (!entry) {
      const fallbackEntry = getVocabularyRealWordBank().find((candidate) => String(candidate.id || candidate.word || "").trim() === normalizedId) || wordItem;
      entry = normalizeVocabularyWordRecord(fallbackEntry, state.vocabularyStudy.entries.length);
      if (!entry) return null;
      state.vocabularyStudy.entries.push(entry);
      state.vocabularyStudy.progressMap[entry.id] = entry;
    }
    const fieldName = kind === "meaning" ? "meaning" : "pronunciation";
    const result = value === "ok" ? "ok" : "ng";
    applyVocabularySkillResult(entry, fieldName, result, "self", Date.now());
    state.vocabularyStudy.progressMap[entry.id] = entry;
    saveState();
    return entry;
  }

  function getVocabularyCandidateQueue(studyState, now = Date.now()) {
    if (!studyState || !studyState.entries) return [];
    const failedRevisit = studyState.entries.filter((entry) => {
      const hasRetryWindow = Number(entry.sessionRetryAfterQuestionCount || 0) > 0 && Number(studyState.session?.questionCount || 0) >= Number(entry.sessionRetryAfterQuestionCount || 0);
      return hasRetryWindow;
    });
    const dueEntries = studyState.entries.filter((entry) => {
      const pronunciationDue = entry.pronunciation && entry.pronunciation.nextReviewAt && entry.pronunciation.nextReviewAt <= now;
      const meaningDue = entry.meaningState && entry.meaningState.nextReviewAt && entry.meaningState.nextReviewAt <= now;
      return pronunciationDue || meaningDue;
    });
    const newEntries = studyState.entries.filter((entry) => {
      const pronunciationNew = Number(entry.pronunciation.level || 0) === 0;
      const meaningNew = Number(entry.meaningState.level || 0) === 0;
      return pronunciationNew || meaningNew;
    });
    const orderedLevels = ["5", "4", "3"];
    const orderedNewEntries = [...newEntries].sort((a, b) => {
      const levelDiff = orderedLevels.indexOf(String(a.level || "5")) - orderedLevels.indexOf(String(b.level || "5"));
      if (levelDiff !== 0) return levelDiff;
      return a.word.localeCompare(b.word);
    });
    return [...failedRevisit, ...dueEntries, ...orderedNewEntries];
  }

  function getVocabularyProgressSummary(studyState) {
    const entries = studyState?.entries || [];
    const totalWords = entries.length;
    const masteredWords = entries.filter((entry) => entry.pronunciation.level >= 5 && entry.meaningState.level >= 5).length;
    const gradeSummary = Object.fromEntries((Object.keys(studyState?.gradeSummary || {}) || []).map((gradeKey) => {
      const grade = studyState.gradeSummary[gradeKey] || { total: 0, mastered: 0 };
      return [gradeKey, { total: grade.total || 0, mastered: grade.mastered || 0 }];
    }));
    return {
      targetWordCount: Number(studyState?.targetWordCount || 1000),
      totalWords,
      masteredWords,
      learningWords: entries.filter((entry) => getVocabularyWordProgressStatus(entry) === "learning").length,
      dueWords: entries.filter((entry) => getVocabularyWordProgressStatus(entry) === "due").length,
      gradeSummary
    };
  }

  function mergeVocabularyStudyStateWithCurrentBank(studyState, realWordBank = getVocabularyRealWordBank()) {
    const currentBank = Array.isArray(realWordBank) && realWordBank.length ? realWordBank : getVocabularyRealWordBank();
    const candidateEntries = Array.isArray(studyState?.entries) ? studyState.entries : [];
    const persistedById = new Map();
    candidateEntries.forEach((entry) => {
      const normalizedId = String(entry?.id || entry?.word || "").trim();
      if (!normalizedId) return;
      const normalizedEntry = normalizeVocabularyWordRecord(entry, persistedById.size);
      if (normalizedEntry) {
        persistedById.set(normalizedId, normalizedEntry);
      }
    });

    const mergedEntries = currentBank
      .map((entry, index) => {
        const normalizedWord = normalizeVocabularyWordRecord(entry, index);
        if (!normalizedWord) return null;
        const savedEntry = persistedById.get(String(normalizedWord.id || normalizedWord.word || "").trim());
        if (!savedEntry) {
          return normalizedWord;
        }

        const mergedPronunciation = createVocabularySkillState({
          ...normalizedWord.pronunciation,
          ...savedEntry.pronunciation,
          level: Number(savedEntry.pronunciation?.level ?? normalizedWord.pronunciation?.level ?? 0),
          nextReviewAt: savedEntry.pronunciation?.nextReviewAt ?? normalizedWord.pronunciation?.nextReviewAt ?? null,
          currentState: savedEntry.pronunciation?.currentState || normalizedWord.pronunciation?.currentState || "unlearned",
          lastJudgedAt: savedEntry.pronunciation?.lastJudgedAt ?? normalizedWord.pronunciation?.lastJudgedAt ?? null,
          lastJudgedBy: savedEntry.pronunciation?.lastJudgedBy || normalizedWord.pronunciation?.lastJudgedBy || "self"
        });

        const mergedMeaningState = createVocabularySkillState({
          ...normalizedWord.meaningState,
          ...savedEntry.meaningState,
          level: Number(savedEntry.meaningState?.level ?? normalizedWord.meaningState?.level ?? 0),
          nextReviewAt: savedEntry.meaningState?.nextReviewAt ?? normalizedWord.meaningState?.nextReviewAt ?? null,
          currentState: savedEntry.meaningState?.currentState || normalizedWord.meaningState?.currentState || "unlearned",
          lastJudgedAt: savedEntry.meaningState?.lastJudgedAt ?? normalizedWord.meaningState?.lastJudgedAt ?? null,
          lastJudgedBy: savedEntry.meaningState?.lastJudgedBy || normalizedWord.meaningState?.lastJudgedBy || "self"
        });

        return {
          ...normalizedWord,
          ...savedEntry,
          id: normalizedWord.id,
          word: normalizedWord.word,
          level: normalizedWord.level,
          pronunciation: mergedPronunciation,
          meaningState: mergedMeaningState,
          lastJudgedAt: savedEntry.lastJudgedAt || normalizedWord.lastJudgedAt || null,
          lastJudgedBy: savedEntry.lastJudgedBy || normalizedWord.lastJudgedBy || "self"
        };
      })
      .filter(Boolean);

    const nextStudyState = createVocabularyStudyState(mergedEntries);
    if (studyState && typeof studyState.targetWordCount === "number") {
      nextStudyState.targetWordCount = Math.max(0, Number(studyState.targetWordCount) || nextStudyState.targetWordCount);
    }
    if (studyState && studyState.session && typeof studyState.session === "object") {
      nextStudyState.session = {
        questionCount: Math.max(0, Number(studyState.session.questionCount) || 0),
        failedWordIds: Array.isArray(studyState.session.failedWordIds) ? studyState.session.failedWordIds.slice() : [],
        recentFailedWordIds: Array.isArray(studyState.session.recentFailedWordIds) ? studyState.session.recentFailedWordIds.slice() : []
      };
    }
    return nextStudyState;
  }

  function buildVocabularyRealStudyState(existingStudyState = null) {
    const realWordBank = Array.isArray(window.MOBILE_VOCABULARY_REAL_WORD_BANK) && window.MOBILE_VOCABULARY_REAL_WORD_BANK.length
      ? window.MOBILE_VOCABULARY_REAL_WORD_BANK
      : MOBILE_VOCABULARY_REAL_WORD_BANK;
    const baseState = createVocabularyStudyState(realWordBank.map((entry) => ({
      ...entry,
      pronunciation: { currentState: "unlearned", level: 0, nextReviewAt: null },
      meaningState: { currentState: "unlearned", level: 0, nextReviewAt: null }
    })));
    if (!existingStudyState) {
      return baseState;
    }
    return mergeVocabularyStudyStateWithCurrentBank(existingStudyState, realWordBank);
  }

  function getVocabularyRealWordBank() {
    const bank = Array.isArray(window.MOBILE_VOCABULARY_REAL_WORD_BANK) && window.MOBILE_VOCABULARY_REAL_WORD_BANK.length
      ? window.MOBILE_VOCABULARY_REAL_WORD_BANK
      : MOBILE_VOCABULARY_REAL_WORD_BANK;
    return Array.isArray(bank) ? bank.filter(Boolean) : [];
  }

  function getVocabularySafeNormalProgressIndex(index, totalWords = getVocabularyRealWordBank().length) {
    const safeTotal = Math.max(1, Math.floor(Number(totalWords) || 0));
    const safeIndex = Math.max(0, Math.floor(Number(index) || 0));
    return safeIndex % safeTotal;
  }

  function generateVocabularyNormalRoundQueue(bank = getVocabularyRealWordBank()) {
    const source = Array.isArray(bank) ? bank.filter(Boolean) : [];
    const queue = source
      .map((entry) => String(entry?.id || entry?.word || "").trim())
      .filter(Boolean);
    if (!queue.length) {
      return [];
    }
    return shuffleArray(queue.filter((value, index, values) => values.indexOf(value) === index));
  }

  function getVocabularyNormalRoundState() {
    const bank = getVocabularyRealWordBank();
    const totalWords = bank.length;
    const fallbackQueue = generateVocabularyNormalRoundQueue(bank);

    try {
      const raw = window.localStorage.getItem(MOBILE_VOCABULARY_NORMAL_QUEUE_STORAGE_KEY);
      if (raw === null || raw === undefined || raw === "") {
        return {
          queue: fallbackQueue,
          cursor: 0,
          total: totalWords,
          round: 1
        };
      }

      const parsed = JSON.parse(raw);
      const queue = Array.isArray(parsed?.queue) ? parsed.queue.map((value) => String(value || "").trim()).filter(Boolean) : fallbackQueue;
      const safeQueue = queue.length ? queue : fallbackQueue;
      const total = Math.max(1, totalWords || safeQueue.length);
      const cursor = Number.isFinite(Number(parsed?.cursor)) ? Math.max(0, Math.min(Number(parsed.cursor), Math.max(0, safeQueue.length - 1))) : 0;
      return {
        queue: safeQueue,
        cursor,
        total,
        round: Math.max(1, Number(parsed?.round) || 1)
      };
    } catch (_error) {
      return {
        queue: fallbackQueue,
        cursor: 0,
        total: totalWords,
        round: 1
      };
    }
  }

  function saveVocabularyNormalRoundState(nextState) {
    const safeQueue = Array.isArray(nextState?.queue) ? nextState.queue.map((value) => String(value || "").trim()).filter(Boolean) : [];
    const totalWords = getVocabularyRealWordBank().length;
    const payload = {
      queue: safeQueue,
      cursor: Number.isFinite(Number(nextState?.cursor)) ? Math.max(0, Math.floor(Number(nextState.cursor) || 0)) : 0,
      round: Number.isFinite(Number(nextState?.round)) ? Math.max(1, Math.floor(Number(nextState.round) || 1)) : 1,
      total: Math.max(totalWords, safeQueue.length)
    };

    if (!payload.queue.length && totalWords) {
      payload.queue = generateVocabularyNormalRoundQueue(getVocabularyRealWordBank());
    }
    if (payload.queue.length && payload.cursor > payload.queue.length - 1) {
      payload.cursor = payload.queue.length - 1;
    }

    try {
      window.localStorage.setItem(MOBILE_VOCABULARY_NORMAL_QUEUE_STORAGE_KEY, JSON.stringify(payload));
    } catch (_error) {
      // Ignore storage failures; the in-memory session still proceeds as usual.
    }

    return payload;
  }

  function getVocabularyNormalProgress() {
    const normalRound = getVocabularyNormalRoundState();
    return normalRound.queue.length ? Math.min(Math.max(0, Number(normalRound.cursor) || 0), normalRound.queue.length - 1) : 0;
  }

  function saveVocabularyNormalProgress(index) {
    const normalRound = getVocabularyNormalRoundState();
    const totalWords = normalRound.queue.length || getVocabularyRealWordBank().length;
    const safeIndex = totalWords ? Math.max(0, Math.min(Math.floor(Number(index) || 0), totalWords - 1)) : 0;
    const nextRound = {
      ...normalRound,
      cursor: safeIndex,
      total: totalWords
    };
    saveVocabularyNormalRoundState(nextRound);
    return safeIndex;
  }

  function advanceVocabularyNormalProgress(step = 1) {
    const safeStep = Math.max(1, Math.floor(Number(step) || 1));
    const normalRound = getVocabularyNormalRoundState();
    const totalWords = normalRound.queue.length || getVocabularyRealWordBank().length;
    if (!totalWords) return 0;

    const nextCursor = normalRound.cursor + safeStep;
    if (nextCursor >= totalWords) {
      const refreshedQueue = generateVocabularyNormalRoundQueue(getVocabularyRealWordBank());
      const nextState = {
        queue: refreshedQueue,
        cursor: 0,
        total: refreshedQueue.length || totalWords,
        round: (Number(normalRound.round) || 1) + 1
      };
      saveVocabularyNormalRoundState(nextState);
      return 0;
    }

    const nextState = {
      ...normalRound,
      cursor: nextCursor,
      total: totalWords,
      round: Number(normalRound.round) || 1
    };
    saveVocabularyNormalRoundState(nextState);
    return nextCursor;
  }

  function buildVocabularyNormalStudyWords(bank = getVocabularyRealWordBank(), startIndex = getVocabularyNormalProgress()) {
    const source = Array.isArray(bank) ? bank.filter(Boolean) : [];
    const totalWords = source.length;
    if (!totalWords) return [];

    const roundState = getVocabularyNormalRoundState();
    const persistentQueue = Array.isArray(roundState.queue) && roundState.queue.length ? roundState.queue : generateVocabularyNormalRoundQueue(source);
    const byId = new Map(source.map((item) => [String(item?.id || item?.word || "").trim(), item]).filter((entry) => entry[0]));
    const orderedSource = persistentQueue
      .map((wordId) => byId.get(String(wordId || "").trim()))
      .filter(Boolean);
    const safeSource = orderedSource.length ? orderedSource : source;
    const safeStartIndex = getVocabularySafeNormalProgressIndex(startIndex, safeSource.length);
    return Array.from({ length: safeSource.length }, (_, offset) => safeSource[(safeStartIndex + offset) % safeSource.length]);
  }

  function getVocabularyNormalStudyWords() {
    return buildVocabularyNormalStudyWords();
  }

  function getVocabularySampleWordItem() {
    const sample = state.vocabularySample || null;
    if (!sample || !Array.isArray(sample.words) || !sample.words.length) return null;
    return sample.words[Math.max(0, Math.min(sample.index || 0, sample.words.length - 1))] || null;
  }

  function buildVocabularySampleAccentMarkup(accentText, focusText) {
    if (!accentText) return "";
    if (!focusText) return accentText;
    const escapedAccent = String(accentText).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
    const escapedFocus = String(focusText).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
    const pattern = new RegExp(escapedFocus.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const highlighted = escapedAccent.replace(pattern, `<span class="vocabulary-sample-accent-focus">${escapedFocus}</span>`);
    return highlighted;
  }

  function refreshVocabularySampleTimerDisplay() {
    const sample = state.vocabularySample;
    const timerText = elements?.vocabularySampleTimerText;
    const progressText = elements?.vocabularySampleProgressText;
    if (!sample || !timerText) return;

    const questionNumber = Math.max(1, Number(sample.completedWordCount) + 1);
    if (progressText) {
      progressText.textContent = `${questionNumber}問目`;
    }

    const deadlineAt = Number(sample.timerDeadlineAt) || 0;
    const remainingMs = Math.max(0, deadlineAt - Date.now());
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const safeRemaining = Math.max(0, totalSeconds);
    const minutes = Math.floor(safeRemaining / 60);
    const seconds = safeRemaining % 60;
    const valueNode = timerText.querySelector(".vocabulary-sample-timer-value");
    if (valueNode) {
      valueNode.textContent = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    if (safeRemaining <= 0 && !sample.sessionExpired) {
      sample.sessionExpired = true;
      sample.finished = false;
      sample.meaningChecked = true;
      sample.meaningRevealed = true;
      sample.pronunciationChecked = true;
    }
  }

  function stopVocabularySampleTimer() {
    const sample = state.vocabularySample;
    if (!sample) return;
    if (sample.timerIntervalId) {
      window.clearInterval(sample.timerIntervalId);
      sample.timerIntervalId = null;
    }
    sample.timerDeadlineAt = Number(sample.timerDeadlineAt) || 0;
  }

  function resumeVocabularySampleTimer() {
    const sample = state.vocabularySample;
    if (!sample || sample.timerIntervalId) return;
    if (!Number(sample.timerDeadlineAt)) {
      sample.timerDeadlineAt = Date.now() + 10 * 60 * 1000;
    }
    sample.timerIntervalId = window.setInterval(() => {
      if (!state.vocabularySample) return;
      const current = state.vocabularySample;
      const remainingMs = Math.max(0, Number(current.timerDeadlineAt || 0) - Date.now());
      if (remainingMs <= 0) {
        current.sessionExpired = true;
        current.finished = false;
        refreshVocabularySampleTimerDisplay();
        stopVocabularySampleTimer();
        return;
      }
      refreshVocabularySampleTimerDisplay();
    }, 1000);
  }

  function startVocabularySampleTimer() {
    const sample = state.vocabularySample;
    if (!sample) return;

    stopVocabularySampleTimer();
    sample.timerDeadlineAt = Date.now() + 10 * 60 * 1000;
    sample.sessionExpired = false;
    refreshVocabularySampleTimerDisplay();

    sample.timerIntervalId = window.setInterval(() => {
      if (!state.vocabularySample) return;
      const current = state.vocabularySample;
      const remainingMs = Math.max(0, Number(current.timerDeadlineAt || 0) - Date.now());
      if (remainingMs <= 0) {
        current.sessionExpired = true;
        current.finished = false;
        refreshVocabularySampleTimerDisplay();
        stopVocabularySampleTimer();
        return;
      }
      refreshVocabularySampleTimerDisplay();
    }, 1000);
  }

  function normalizeVocabularyPronunciationDisplay(entry) {
    const raw = String(entry?.phonetic ?? "").trim();
    if (!raw) return "";
    return raw;
  }

  function normalizeVocabularySampleSessionState(sample = state.vocabularySample, preferredWordItem = getVocabularySampleWordItem()) {
    if (!sample || typeof sample !== "object") return sample;

    const currentWordItem = preferredWordItem || getVocabularySampleWordItem();
    const itemKey = currentWordItem
      ? `${String(currentWordItem.id || currentWordItem.word || "").trim()}|${String(currentWordItem.partOfSpeech || "").trim()}`
      : "";

    if (itemKey) {
      const currentWordKey = String(sample.currentWordKey || sample.currentWordId || "").trim();
      if (!currentWordKey || currentWordKey !== itemKey) {
        sample.currentWordKey = itemKey;
        sample.currentWordId = itemKey;
        sample.pronunciationChoice = null;
        sample.meaningChoice = null;
        sample.meaningChecked = false;
        sample.meaningRevealed = false;
        sample.currentWordCompleted = false;
      }
    }

    if (sample.pronunciationChoice !== "ok" && sample.pronunciationChoice !== "ng") {
      sample.meaningChoice = null;
      sample.meaningChecked = false;
      sample.meaningRevealed = false;
    }

    if (sample.currentWordKey && itemKey && sample.currentWordKey !== itemKey) {
      sample.pronunciationChoice = null;
      sample.meaningChoice = null;
      sample.meaningChecked = false;
      sample.meaningRevealed = false;
      sample.currentWordCompleted = false;
      sample.currentWordKey = itemKey;
      sample.currentWordId = itemKey;
    }

    return sample;
  }

  function renderVocabularySampleScreen() {
    const sample = normalizeVocabularySampleSessionState(state.vocabularySample || null, getVocabularySampleWordItem());
    if (!sample) {
      showScreen("speakingHomeScreen");
      return;
    }

    if (sample.finished && !sample.historyFinalized) {
      finalizeVocabularySampleHistorySession("completed");
    }

    const wordItem = getVocabularySampleWordItem();
    if (!wordItem) {
      showScreen("speakingHomeScreen");
      return;
    }

    if (sample.finished) {
      elements.vocabularySamplePartOfSpeechText.textContent = "";
      elements.vocabularySampleWordText.textContent = "";
      elements.vocabularySamplePronunciationText.textContent = "";
      elements.vocabularySampleMeaningResultText.textContent = "";
      elements.vocabularySamplePronunciationArea.classList.add("hidden");
      elements.vocabularySampleAccentBlock.classList.add("hidden");
      elements.vocabularySampleMeaningArea.classList.add("hidden");
      elements.vocabularySampleMeaningResultBlock.classList.add("hidden");
      elements.vocabularySampleNextWrap.classList.add("hidden");
      elements.vocabularySampleCompleteBlock.classList.remove("hidden");
      stopVocabularySampleTimer();
      showScreen("vocabularySampleScreen");
      return;
    }

    elements.vocabularySampleHeaderText.textContent = "本日の学習";
    refreshVocabularySampleTimerDisplay();

    elements.vocabularySamplePartOfSpeechText.textContent = `〈${wordItem.partOfSpeech}〉`;
    elements.vocabularySampleWordText.textContent = wordItem.word;
    elements.vocabularySamplePronunciationText.textContent = normalizeVocabularyPronunciationDisplay(wordItem);

    const accentVisible = sample.pronunciationChecked;
    const pronunciationSelected = sample.pronunciationChoice;
    const meaningSelected = sample.meaningChoice;
    const pronunciationDecision = sample.pronunciationChoice === "ok" || sample.pronunciationChoice === "ng";
    const meaningDecision = sample.meaningChoice === "ok" || sample.meaningChoice === "ng";
    const pronunciationJudged = pronunciationDecision;
    const meaningVisible = sample.meaningRevealed || sample.meaningChecked || pronunciationJudged;
    const meaningChoiceVisible = sample.meaningRevealed || sample.meaningChecked || pronunciationJudged;
    const canRevealMeaning = pronunciationJudged;

    elements.vocabularySamplePronunciationArea.classList.remove("hidden");
    elements.vocabularySampleMeaningArea.classList.remove("hidden");
    elements.vocabularySampleMeaningResultBlock.classList.remove("hidden");
    elements.vocabularySampleNextWrap.classList.add("hidden");
    elements.vocabularySampleCompleteBlock.classList.add("hidden");

    const accentChoiceRow = elements.vocabularySampleAccentBlock.querySelector(".vocabulary-sample-choice-row");
    const accentSlot = elements.vocabularySampleAccentBlock.querySelector(".vocabulary-sample-accent-slot");
    const accentJudgmentSlot = elements.vocabularySampleAccentBlock.querySelector(".vocabulary-sample-judgment-slot");
    if (accentChoiceRow) {
      accentChoiceRow.classList.toggle("is-visible", accentVisible);
    }
    if (accentJudgmentSlot) {
      accentJudgmentSlot.classList.toggle("is-visible", accentVisible);
    }
    if (accentVisible) {
      elements.vocabularySampleAccentText.innerHTML = buildVocabularySampleAccentMarkup(wordItem.accent, wordItem.accentFocus);
      elements.vocabularySampleAccentBlock.classList.remove("hidden");
      if (accentSlot) accentSlot.classList.add("is-visible");
    } else {
      elements.vocabularySampleAccentText.textContent = "";
      elements.vocabularySampleAccentBlock.classList.remove("hidden");
      if (accentSlot) accentSlot.classList.remove("is-visible");
    }

    [elements.vocabularySamplePronunciationOkBtn, elements.vocabularySamplePronunciationNgBtn].forEach((button) => {
      const isOk = button.id === "vocabularySamplePronunciationOkBtn";
      button.classList.toggle("is-selected", pronunciationSelected === (isOk ? "ok" : "ng"));
    });

    if (sample.pronunciationChecked) {
      elements.vocabularySamplePronunciationBtn.disabled = false;
      elements.vocabularySamplePronunciationBtn.textContent = "もう一度聞く 🔊";
      elements.vocabularySampleAccentBlock.classList.remove("hidden");
    } else {
      elements.vocabularySamplePronunciationBtn.disabled = false;
      elements.vocabularySamplePronunciationBtn.textContent = "声に出したら、聞く 🔊";
      elements.vocabularySampleAccentBlock.classList.remove("hidden");
    }

    elements.vocabularySampleMeaningBtn.disabled = !canRevealMeaning;
    if (sample.meaningRevealed || sample.meaningChecked) {
      elements.vocabularySampleMeaningBtn.textContent = "意味";
      elements.vocabularySampleMeaningResultBlock.classList.remove("hidden");
    } else {
      elements.vocabularySampleMeaningBtn.textContent = "意味を言ったら、確認";
      elements.vocabularySampleMeaningResultBlock.classList.remove("hidden");
    }

    const meaningChoiceRow = elements.vocabularySampleMeaningResultBlock.querySelector(".vocabulary-sample-meaning-row");
    const meaningJudgmentSlot = elements.vocabularySampleMeaningResultBlock.querySelector(".vocabulary-sample-meaning-judgment-slot");
    if (meaningChoiceRow) {
      meaningChoiceRow.classList.toggle("is-visible", meaningChoiceVisible);
    }
    if (meaningJudgmentSlot) {
      meaningJudgmentSlot.classList.toggle("is-visible", meaningChoiceVisible);
    }
    if (sample.meaningRevealed || sample.meaningChecked) {
      elements.vocabularySampleMeaningResultText.textContent = wordItem.meaning;
      elements.vocabularySampleMeaningResultText.style.visibility = "visible";
      elements.vocabularySampleMeaningResultText.style.opacity = "1";
      elements.vocabularySampleMeaningInlineText.textContent = wordItem.meaning;
      elements.vocabularySampleMeaningInlineText.classList.add("is-visible");
    } else {
      elements.vocabularySampleMeaningResultText.textContent = "";
      elements.vocabularySampleMeaningResultText.style.visibility = "hidden";
      elements.vocabularySampleMeaningResultText.style.opacity = "0";
      elements.vocabularySampleMeaningInlineText.textContent = "";
      elements.vocabularySampleMeaningInlineText.classList.remove("is-visible");
    }

    [elements.vocabularySampleMeaningOkBtn, elements.vocabularySampleMeaningNgBtn].forEach((button) => {
      const isOk = button.id === "vocabularySampleMeaningOkBtn";
      button.classList.toggle("is-selected", meaningSelected === (isOk ? "ok" : "ng"));
    });

    elements.vocabularySampleNextWrap.classList.add("hidden");
    elements.vocabularySampleNextBtn.textContent = sample.index >= sample.words.length - 1 ? "終了" : "次へ";

    showScreen("vocabularySampleScreen");
  }

  function startVocabularySample() {
    state.vocabularyStudy = mergeVocabularyStudyStateWithCurrentBank(state.vocabularyStudy || buildVocabularyRealStudyState(), getVocabularyRealWordBank());
    const realWordBank = getVocabularyRealWordBank();
    const studyWords = buildVocabularyNormalStudyWords(realWordBank, getVocabularyNormalProgress());
    state.vocabularySample = {
      words: studyWords.map((item) => ({
        id: item.id || item.word,
        word: item.word,
        partOfSpeech: item.partOfSpeech || "名詞",
        meaning: item.meaning || "",
        accent: item.accent || "",
        accentFocus: item.accentFocus || item.accent || "",
        phonetic: item.phonetic || "",
        exampleSentence: item.exampleSentence || "",
        exampleTranslation: item.exampleTranslation || ""
      })),
      index: 0,
      pronunciationChecked: false,
      pronunciationChoice: null,
      meaningChecked: false,
      meaningChoice: null,
      meaningRevealed: false,
      finished: false,
      sessionExpired: false,
      timerDeadlineAt: null,
      timerIntervalId: null,
      completedWordCount: 0,
      historyFinalized: false,
      currentWordKey: null,
      currentWordCompleted: false
    };
    if (!state.vocabularySample.words.length) {
      state.vocabularySample.words = realWordBank.map((item) => ({
        id: item.id || item.word,
        word: item.word,
        partOfSpeech: item.partOfSpeech || "名詞",
        meaning: item.meaning || "",
        accent: item.accent || "",
        accentFocus: item.accentFocus || item.accent || "",
        phonetic: item.phonetic || "",
        exampleSentence: item.exampleSentence || "",
        exampleTranslation: item.exampleTranslation || ""
      }));
    }
    state.vocabularySample.currentWordKey = `${String(state.vocabularySample.words[0]?.id || state.vocabularySample.words[0]?.word || "").trim()}|${String(state.vocabularySample.words[0]?.partOfSpeech || "").trim()}`;
    state.vocabularySample.currentWordId = state.vocabularySample.currentWordKey;
    normalizeVocabularySampleSessionState(state.vocabularySample, getVocabularySampleWordItem());
    if (!state.learningHistorySession) {
      startMobileLearningHistorySession({
        source: "vocabulary",
        mode: "Vocabulary",
        dayNumber: getVocabularyHistoryTodayKey(),
        startedAt: Date.now(),
        session: null
      });
    }
    startVocabularySampleTimer();
    renderVocabularySampleScreen();
  }

  function continueVocabularySample() {
    const sample = state.vocabularySample;
    if (!sample) return;
    if (sample.sessionExpired) {
      sample.finished = true;
      sample.currentWordCompleted = false;
      sample.currentWordKey = null;
      stopVocabularySampleTimer();
      finalizeVocabularySampleHistorySession("completed");
      renderVocabularySampleScreen();
      return;
    }
    if (sample.index >= sample.words.length - 1) {
      sample.finished = true;
      sample.currentWordCompleted = false;
      sample.currentWordKey = null;
      stopVocabularySampleTimer();
      finalizeVocabularySampleHistorySession("completed");
      renderVocabularySampleScreen();
      return;
    }
    sample.index += 1;
    sample.pronunciationChecked = false;
    sample.pronunciationChoice = null;
    sample.meaningChecked = false;
    sample.meaningChoice = null;
    sample.meaningRevealed = false;
    sample.currentWordCompleted = false;
    sample.currentWordKey = null;
    renderVocabularySampleScreen();
  }

  function handleVocabularySamplePronunciationCheck() {
    const sample = state.vocabularySample;
    const item = getVocabularySampleWordItem();
    if (!sample || !item) return;
    sample.pronunciationChecked = true;
    sample.meaningChecked = false;
    sample.meaningRevealed = false;
    speakMobileEnglishText(item.word);
    renderVocabularySampleScreen();
  }

  function handleVocabularySampleMeaningReveal() {
    const sample = state.vocabularySample;
    if (!sample) return;
    const pronunciationDecision = sample.pronunciationChoice === "ok" || sample.pronunciationChoice === "ng";
    if (!pronunciationDecision) return;
    sample.meaningRevealed = true;
    sample.meaningChecked = true;
    renderVocabularySampleScreen();
  }

  function getVocabularyHistoryTodayKey() {
    return getMobileLearningHistoryDayKey(Date.now());
  }

  function getVocabularyHistoryWordKey(wordItem) {
    return `${String(wordItem?.id || wordItem?.word || "").trim()}|${String(wordItem?.partOfSpeech || "").trim()}`;
  }

  function normalizeVocabularyHistoryStatus(value) {
    if (value === "ok") return "○";
    if (value === "ng") return "△";
    return "—";
  }

  function getVocabularyTeacherCheckStatusValue(value) {
    const normalized = String(value || "none").trim();
    if (normalized === "ok" || normalized === "◎") return "◎";
    if (normalized === "ng" || normalized === "△") return "△";
    if (normalized === "self-done") return "◎";
    return "none";
  }

  function getVocabularySkillTeacherCheckStatus(skillState) {
    if (!skillState || typeof skillState !== "object") return "none";
    if (skillState.teacherCheckStatus) {
      return getVocabularyTeacherCheckStatusValue(skillState.teacherCheckStatus);
    }
    if (skillState.teacherCheckState && typeof skillState.teacherCheckState === "object") {
      const teacherValue = skillState.teacherCheckState.pronunciation || skillState.teacherCheckState.meaning || "none";
      return getVocabularyTeacherCheckStatusValue(teacherValue);
    }
    return "none";
  }

  function getVocabularyCurrentSelfStatus(skillState) {
    if (!skillState || typeof skillState !== "object") return "none";
    const raw = String(skillState.lastSelfResult || "").trim();
    if (raw === "ok") return "○";
    if (raw === "ng") return "△";
    return "none";
  }

  function getVocabularyTeacherCheckStatusText(skillState, fieldName) {
    if (!skillState || typeof skillState !== "object") return "none";
    const teacherCheckState = skillState.teacherCheckState && typeof skillState.teacherCheckState === "object"
      ? skillState.teacherCheckState
      : {};
    const directValue = String(skillState.teacherCheckStatus || teacherCheckState[fieldName] || "none").trim();
    if (directValue === "◎" || directValue === "ok") return "◎";
    if (directValue === "△" || directValue === "ng") return "△";
    return "none";
  }

  function getVocabularyHistoryDisplayValue(entry, fieldName) {
    const normalizedField = fieldName === "meaning" ? "meaning" : "pronunciation";
    if (!entry || typeof entry !== "object") return "—";
    const teacherCheckField = normalizedField === "meaning" ? "meaningTeacherCheck" : "pronunciationTeacherCheck";
    const selfValue = String(entry[normalizedField] || "—").trim();
    if (selfValue === "△") return "△";
    const teacherValue = String(entry[teacherCheckField] || "none").trim();
    if (selfValue === "○" && teacherValue === "◎") return "◎";
    return selfValue === "○" ? "○" : "—";
  }

  function getVocabularyHistoryWeaknessScore(entry) {
    if (!entry || typeof entry !== "object") return 0;
    let score = 0;
    if (String(getVocabularyHistoryDisplayValue(entry, "pronunciation") || "—").trim() === "△") score += 1;
    if (String(getVocabularyHistoryDisplayValue(entry, "meaning") || "—").trim() === "△") score += 1;
    return score;
  }

  function getVocabularySampleCompletedWordCount(sample = state.vocabularySample) {
    if (!sample || typeof sample !== "object") return 0;
    const count = Number(sample.completedWordCount);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  function finalizeVocabularySampleHistorySession(completedReason = "completed") {
    const sample = state.vocabularySample;
    if (!sample || sample.historyFinalized) return;
    sample.historyFinalized = true;
    if (!state.learningHistorySession) {
      return;
    }
    const completedWordCount = getVocabularySampleCompletedWordCount(sample);
    const earnedPoints = completedWordCount * 2;
    finalizeMobileLearningHistorySession({
      completedReason,
      mode: "Vocabulary",
      dayNumber: getVocabularyHistoryTodayKey(),
      summary: {
        questionCount: completedWordCount,
        correctCount: completedWordCount,
        accuracy: completedWordCount > 0 ? 100 : 0,
        earnedPoints
      }
    });
  }

  function normalizeVocabularyTodayHistoryMap(rawMap) {
    if (!rawMap || typeof rawMap !== "object" || Array.isArray(rawMap)) {
      return {};
    }

    const safeMap = {};
    Object.entries(rawMap).forEach(([dateKey, bucket]) => {
      if (!dateKey || typeof dateKey !== "string" || !bucket || typeof bucket !== "object" || Array.isArray(bucket)) {
        return;
      }

      const safeBucket = {};
      Object.entries(bucket).forEach(([wordKey, entry]) => {
        if (!wordKey || typeof wordKey !== "string" || !entry || typeof entry !== "object") {
          return;
        }
        const word = String(entry.word || "").trim();
        if (!word) {
          return;
        }

        safeBucket[wordKey] = {
          word,
          partOfSpeech: String(entry.partOfSpeech || "").trim(),
          grade: String(entry.grade || entry.sourceLevel || entry.level || "5").trim() || "5",
          pronunciation: String(entry.pronunciation || "—").trim() || "—",
          pronunciationText: String(entry.pronunciationText || "").trim() || "",
          meaning: String(entry.meaning || "—").trim() || "—",
          meaningText: String(entry.meaningText || "").trim() || "",
          pronunciationTeacherCheck: ["none", "◎", "△"].includes(String(entry.pronunciationTeacherCheck || "").trim()) ? String(entry.pronunciationTeacherCheck || "").trim() : "none",
          meaningTeacherCheck: ["none", "◎", "△"].includes(String(entry.meaningTeacherCheck || "").trim()) ? String(entry.meaningTeacherCheck || "").trim() : "none",
          lastJudgedAt: Number(entry.lastJudgedAt) || 0
        };
      });

      if (Object.keys(safeBucket).length || Object.keys(bucket).length === 0) {
        safeMap[dateKey] = safeBucket;
      }
    });

    return safeMap;
  }

  function readVocabularyTodayHistoryMapFromStorageKey(storageKey) {
    if (!storageKey || !String(storageKey || "").trim()) {
      return {};
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw || !raw.trim()) return {};
      const parsed = JSON.parse(raw);
      return normalizeVocabularyTodayHistoryMap(parsed) || {};
    } catch (_error) {
      return {};
    }
  }

  function getMobileVocabularyTodayHistoryStorageKey(uid = getCurrentMobileFirebaseUser()?.uid || "") {
    const safeUid = String(uid || "").trim();
    return safeUid ? `${MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY}:${safeUid}` : MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY;
  }

  function getVocabularySyncEntryLatestUpdatedAt(targetValue) {
    const numericValue = Number(targetValue);
    return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
  }

  function getVocabularyEntryLatestUpdatedAt(entry) {
    if (!entry || typeof entry !== "object") {
      return 0;
    }
    const timestamps = [
      getVocabularySyncEntryLatestUpdatedAt(entry.lastJudgedAt),
      getVocabularySyncEntryLatestUpdatedAt(entry.createdAt),
      getVocabularySyncEntryLatestUpdatedAt(entry.pronunciationTeacherCheckUpdatedAt),
      getVocabularySyncEntryLatestUpdatedAt(entry.meaningTeacherCheckUpdatedAt),
      getVocabularySyncEntryLatestUpdatedAt(entry.pronunciation?.lastJudgedAt),
      getVocabularySyncEntryLatestUpdatedAt(entry.pronunciation?.teacherCheckUpdatedAt),
      getVocabularySyncEntryLatestUpdatedAt(entry.meaningState?.lastJudgedAt),
      getVocabularySyncEntryLatestUpdatedAt(entry.meaningState?.teacherCheckUpdatedAt),
      getVocabularySyncEntryLatestUpdatedAt(entry.teacherCheckState?.pronunciationUpdatedAt),
      getVocabularySyncEntryLatestUpdatedAt(entry.teacherCheckState?.meaningUpdatedAt)
    ];
    return Math.max(0, ...timestamps);
  }

  function mergeVocabularyTodayHistoryMapByLatest(baseMap, incomingMap) {
    const base = normalizeVocabularyTodayHistoryMap(baseMap || {});
    const incoming = normalizeVocabularyTodayHistoryMap(incomingMap || {});
    const merged = {};
    const dateKeys = new Set([...Object.keys(base), ...Object.keys(incoming)]);

    dateKeys.forEach((dateKey) => {
      const baseBucket = base[dateKey] && typeof base[dateKey] === "object" ? base[dateKey] : {};
      const incomingBucket = incoming[dateKey] && typeof incoming[dateKey] === "object" ? incoming[dateKey] : {};
      const mergedBucket = {};
      const wordKeys = new Set([...Object.keys(baseBucket), ...Object.keys(incomingBucket)]);

      wordKeys.forEach((wordKey) => {
        const baseEntry = baseBucket[wordKey] || null;
        const incomingEntry = incomingBucket[wordKey] || null;
        if (!baseEntry && incomingEntry) {
          mergedBucket[wordKey] = incomingEntry;
          return;
        }
        if (!incomingEntry && baseEntry) {
          mergedBucket[wordKey] = baseEntry;
          return;
        }
        if (!baseEntry || !incomingEntry) return;

        const leftUpdated = Math.max(
          getVocabularySyncEntryLatestUpdatedAt(baseEntry.lastJudgedAt),
          getVocabularySyncEntryLatestUpdatedAt(baseEntry.pronunciationTeacherCheckUpdatedAt),
          getVocabularySyncEntryLatestUpdatedAt(baseEntry.meaningTeacherCheckUpdatedAt)
        );
        const rightUpdated = Math.max(
          getVocabularySyncEntryLatestUpdatedAt(incomingEntry.lastJudgedAt),
          getVocabularySyncEntryLatestUpdatedAt(incomingEntry.pronunciationTeacherCheckUpdatedAt),
          getVocabularySyncEntryLatestUpdatedAt(incomingEntry.meaningTeacherCheckUpdatedAt)
        );
        mergedBucket[wordKey] = rightUpdated >= leftUpdated ? incomingEntry : baseEntry;
      });

      if (Object.keys(mergedBucket).length) {
        merged[dateKey] = mergedBucket;
      }
    });

    return merged;
  }

  function loadVocabularyTodayHistoryMap() {
    const currentUid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
    const previousMap = state.vocabularyTodayHistoryMap && typeof state.vocabularyTodayHistoryMap === "object"
      ? state.vocabularyTodayHistoryMap
      : {};

    if (currentUid) {
      const uidStorageKey = getMobileVocabularyTodayHistoryStorageKey(currentUid);
      const uidMap = readVocabularyTodayHistoryMapFromStorageKey(uidStorageKey);
      const nextMap = Object.keys(uidMap).length ? uidMap : normalizeVocabularyTodayHistoryMap(previousMap) || {};
      state.vocabularyTodayHistoryMap = normalizeVocabularyTodayHistoryMap(nextMap) || {};
      vocabularyTodayHistoryOwnerUid = currentUid;
      window.localStorage.removeItem(MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY);
      return state.vocabularyTodayHistoryMap;
    }

    const candidateKeys = [];
    const pushUniqueKey = (storageKey) => {
      if (!storageKey || !String(storageKey || "").trim()) return;
      if (!candidateKeys.includes(storageKey)) {
        candidateKeys.push(storageKey);
      }
    };

    try {
      const storagePrefix = `${MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY}:`;
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const storageKey = window.localStorage.key(index);
        if (!storageKey || typeof storageKey !== "string") continue;
        if (storageKey === MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY || storageKey.startsWith(storagePrefix)) {
          pushUniqueKey(storageKey);
        }
      }
    } catch (_error) {
      // Ignore storage enumeration failures and fall back to the known keys below.
    }

    pushUniqueKey(MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY);

    let nextMap = {};
    candidateKeys.forEach((storageKey) => {
      const loaded = readVocabularyTodayHistoryMapFromStorageKey(storageKey);
      if (!Object.keys(loaded).length) return;
      nextMap = mergeVocabularyTodayHistoryMapByLatest(nextMap, loaded);
    });

    if (!Object.keys(nextMap).length && Object.keys(previousMap).length) {
      nextMap = normalizeVocabularyTodayHistoryMap(previousMap) || {};
    }

    state.vocabularyTodayHistoryMap = nextMap;
    return state.vocabularyTodayHistoryMap;
  }

  function saveVocabularyTodayHistoryMap() {
    try {
      const currentUid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
      const bucket = state.vocabularyTodayHistoryMap && typeof state.vocabularyTodayHistoryMap === "object"
        ? state.vocabularyTodayHistoryMap
        : {};
      const storageKeys = [];
      if (currentUid) {
        const uidStorageKey = getMobileVocabularyTodayHistoryStorageKey(currentUid);
        storageKeys.push(uidStorageKey);
        window.localStorage.removeItem(MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY);
      } else {
        storageKeys.push(MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY);
      }
      storageKeys.forEach((storageKey) => {
        if (!storageKey || !String(storageKey || "").trim()) return;
        window.localStorage.setItem(storageKey, JSON.stringify(bucket));
      });
      if (currentUid) {
        vocabularyTodayHistoryOwnerUid = currentUid;
      }
      if (currentUid) {
        scheduleMobileVocabularyTodayHistorySync();
      }
    } catch (_error) {
      // Ignore storage failures; keep the in-memory map for the current session.
    }
  }

  function recordVocabularySampleHistoryJudgment(wordItem, kind, value) {
    if (!wordItem || !kind || !value) return;
    const todayKey = getVocabularyHistoryTodayKey();
    const wordKey = getVocabularyHistoryWordKey(wordItem);
    const bucket = state.vocabularyTodayHistoryMap && typeof state.vocabularyTodayHistoryMap === "object"
      ? state.vocabularyTodayHistoryMap
      : {};
    const todayMap = bucket[todayKey] && typeof bucket[todayKey] === "object" ? bucket[todayKey] : {};
    const existing = todayMap[wordKey] || {
      word: String(wordItem.word || "").trim(),
      partOfSpeech: String(wordItem.partOfSpeech || "").trim(),
      grade: String(wordItem.grade ?? wordItem.level ?? wordItem.sourceLevel ?? wordItem.gradeLevel ?? "5").trim() || "5",
      pronunciation: "—",
      pronunciationText: "",
      meaning: "—",
      meaningText: "",
      pronunciationTeacherCheck: "none",
      meaningTeacherCheck: "none",
      lastJudgedAt: 0
    };
    if (kind === "pronunciation") {
      existing.pronunciation = normalizeVocabularyHistoryStatus(value);
      existing.pronunciationText = String(wordItem.phonetic || wordItem.pronunciation || existing.pronunciationText || "").trim();
      existing.lastJudgedAt = Date.now();
    }
    if (kind === "meaning") {
      existing.meaning = normalizeVocabularyHistoryStatus(value);
      existing.meaningText = String(wordItem.meaning || wordItem.japanese || existing.meaningText || "").trim();
      existing.lastJudgedAt = Date.now();
    }
    if (!existing.grade || !["5", "4", "3"].includes(String(existing.grade).trim())) {
      existing.grade = String(wordItem.grade ?? wordItem.level ?? wordItem.sourceLevel ?? wordItem.gradeLevel ?? "5").trim() || "5";
    }
    todayMap[wordKey] = existing;
    bucket[todayKey] = todayMap;
    state.vocabularyTodayHistoryMap = bucket;
    saveVocabularyTodayHistoryMap();
  }

  function getVocabularyHistoryDetailData(entry) {
    const wordText = String(entry?.word || "").trim();
    const realBankEntry = getVocabularyRealWordBank().find((candidate) => {
      const candidateWord = String(candidate?.word || "").trim();
      const candidateId = String(candidate?.id || "").trim();
      const entryId = String(entry?.id || "").trim();
      return candidateWord && candidateWord === wordText || candidateId && candidateId === entryId;
    });

    const gradeValue = String(realBankEntry?.grade ?? realBankEntry?.level ?? realBankEntry?.sourceLevel ?? entry?.grade ?? "5").trim() || "5";
    const normalizedGrade = ["5", "4", "3"].includes(gradeValue) ? gradeValue : (String(gradeValue).replace(/級/g, "").trim() || "5");
    const meaningValue = String(realBankEntry?.meaning || entry?.meaningText || entry?.meaning || "意味未設定").trim() || "意味未設定";

    return {
      grade: normalizedGrade,
      meaning: meaningValue
    };
  }

  function getVocabularyTodayHistoryEntries() {
    const todayKey = getVocabularyHistoryTodayKey();
    const bucket = state.vocabularyTodayHistoryMap && typeof state.vocabularyTodayHistoryMap === "object"
      ? state.vocabularyTodayHistoryMap
      : {};
    const todayMap = bucket[todayKey] && typeof bucket[todayKey] === "object" ? bucket[todayKey] : {};
    return Object.values(todayMap)
      .filter((entry) => entry && String(entry.word || "").trim())
      .filter((entry) => entry.pronunciation !== "—" || entry.meaning !== "—")
      .sort((left, right) => {
        const weaknessDiff = getVocabularyHistoryWeaknessScore(right) - getVocabularyHistoryWeaknessScore(left);
        if (weaknessDiff !== 0) return weaknessDiff;
        return String(left.word || "").localeCompare(String(right.word || ""), "ja");
      });
  }

  function shouldSuppressVocabularyTodayHistoryRenderAfterReload() {
    if (!isCurrentSonLoginForMobileLearningHistory()) {
      return false;
    }
    if (getVocabularyTeacherCheckRouteScreen()) {
      return false;
    }
    return Boolean(isMobileReloadNavigation());
  }

  function handleVocabularyTodayHistorySyncRemoteSnapshot(snapshot) {
    if (snapshot?.error && shouldThrottleMobileVocabularySyncError("todayHistory", snapshot.error)) {
      applyMobileVocabularySyncRateLimit("todayHistory", snapshot.error);
      return;
    }
    if (isMobileVocabularySyncRateLimited("todayHistory") || isMobileVocabularySyncDuplicateBurst("todayHistory")) {
      return;
    }
    if (!snapshot?.ok || !snapshot.exists) {
      return;
    }
    const uid = String(snapshot.uid || getCurrentMobileFirebaseUser()?.uid || "").trim();
    const incomingMap = normalizeVocabularyTodayHistoryMap(snapshot.historyMap || {});
    const localBaseline = normalizeVocabularyTodayHistoryMap(state.vocabularyTodayHistoryMap) || {};
    const localTodayHistoryCount = getVocabularyTodayHistoryCount(localBaseline, getVocabularyHistoryTodayKey());
    const remoteTodayHistoryCount = getVocabularyTodayHistoryCount(incomingMap, getVocabularyHistoryTodayKey());
    const localCompareUpdatedAtMs = getVocabularyTodayHistoryMostRecentUpdatedAt(localBaseline, getVocabularyHistoryTodayKey());
    const remoteUpdatedAtMs = Number(snapshot?.updatedAtMs || 0) || 0;

    if (isSameUidSyncCanonical(uid)) {
      state.vocabularyTodayHistoryMap = normalizeVocabularyTodayHistoryMap(incomingMap) || {};
      if (!Object.keys(state.vocabularyTodayHistoryMap || {}).length && Object.keys(localBaseline || {}).length) {
        state.vocabularyTodayHistoryMap = normalizeVocabularyTodayHistoryMap(localBaseline) || {};
      }
      saveVocabularyTodayHistoryMap();
      if (uid) {
        const mobileSyncKey = getMobileVocabularyTodayHistoryStorageKey(uid);
        window.localStorage.setItem(mobileSyncKey, JSON.stringify(state.vocabularyTodayHistoryMap));
      }
      if (!shouldSuppressVocabularyTodayHistoryRenderAfterReload() && state.currentScreen === "vocabularyTodayHistoryScreen") {
        renderVocabularyTodayHistoryScreen();
      }
      return;
    }

    if (!incomingMap || !Object.keys(incomingMap).length) {
      const hasLocalEntries = Object.keys(localBaseline || {}).length > 0;
      if (hasLocalEntries) {
        state.vocabularyTodayHistoryMap = normalizeVocabularyTodayHistoryMap(localBaseline) || {};
        if (!shouldSuppressVocabularyTodayHistoryRenderAfterReload() && state.currentScreen === "vocabularyTodayHistoryScreen") {
          renderVocabularyTodayHistoryScreen();
        }
        return;
      }
      state.vocabularyTodayHistoryMap = {};
      if (!shouldSuppressVocabularyTodayHistoryRenderAfterReload() && state.currentScreen === "vocabularyTodayHistoryScreen") {
        renderVocabularyTodayHistoryScreen();
      }
      return;
    }
    const currentLocal = localBaseline;
    const mergedMap = mergeVocabularyTodayHistoryMapByLatest(currentLocal, incomingMap);
    const mergedTodayHistoryCount = getVocabularyTodayHistoryCount(mergedMap, getVocabularyHistoryTodayKey());
    state.vocabularyTodayHistoryMap = normalizeVocabularyTodayHistoryMap(mergedMap) || {};
    saveVocabularyTodayHistoryMap();
    if (uid) {
      const mobileSyncKey = getMobileVocabularyTodayHistoryStorageKey(uid);
      window.localStorage.setItem(mobileSyncKey, JSON.stringify(state.vocabularyTodayHistoryMap));
    }
    if (!shouldSuppressVocabularyTodayHistoryRenderAfterReload() && state.currentScreen === "vocabularyTodayHistoryScreen") {
      renderVocabularyTodayHistoryScreen();
    }
  }

  async function initializeMobileVocabularyTodayHistorySyncForCurrentUser(options = {}) {
    const force = options?.force === true;
    const uid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
    if (!uid) {
      vocabularyTodayHistorySyncCurrentUid = "";
      vocabularyTodayHistorySyncReady = false;
      vocabularyTodayHistorySyncAllowCreate = false;
      if (typeof vocabularyTodayHistorySyncUnsubscribe === "function") {
        vocabularyTodayHistorySyncUnsubscribe();
      }
      vocabularyTodayHistorySyncUnsubscribe = null;
      return false;
    }

    if (!force && vocabularyTodayHistorySyncReady && vocabularyTodayHistorySyncCurrentUid === uid) {
      return true;
    }

    if (isMobileVocabularySyncRateLimited("todayHistory") || isMobileVocabularySyncDuplicateBurst("todayHistory")) {
      vocabularyTodayHistorySyncCurrentUid = uid;
      vocabularyTodayHistorySyncReady = vocabularyTodayHistorySyncReady && vocabularyTodayHistorySyncCurrentUid === uid;
      return vocabularyTodayHistorySyncReady;
    }

    if (typeof vocabularyTodayHistorySyncUnsubscribe === "function") {
      vocabularyTodayHistorySyncUnsubscribe();
    }
    vocabularyTodayHistorySyncUnsubscribe = null;

    const localBaseline = normalizeVocabularyTodayHistoryMap(state.vocabularyTodayHistoryMap) || {};
    const remoteLoad = window.loadMobileVocabularyTodayHistoryStateFromFirestore;
    if (typeof remoteLoad !== "function") {
      vocabularyTodayHistorySyncCurrentUid = uid;
      vocabularyTodayHistorySyncReady = false;
      vocabularyTodayHistorySyncAllowCreate = false;
      return false;
    }

    let remoteResult = null;
    try {
      remoteResult = await remoteLoad({ targetUid: uid });
    } catch (_error) {
      remoteResult = null;
    }

    const remoteHistoryMap = remoteResult?.ok && remoteResult.exists && remoteResult.historyMap
      ? normalizeVocabularyTodayHistoryMap(remoteResult.historyMap)
      : {};
    if (remoteResult?.ok && remoteResult.exists) {
      const sameUidCanonical = isSameUidSyncCanonical(uid);
      const usesCanonicalRemote = sameUidCanonical || Object.keys(remoteHistoryMap).length > 0;
      const mergedHistoryMap = sameUidCanonical
        ? normalizeVocabularyTodayHistoryMap(remoteHistoryMap) || {}
        : usesCanonicalRemote
          ? mergeVocabularyTodayHistoryMapByLatest(localBaseline, remoteHistoryMap)
          : localBaseline;
      state.vocabularyTodayHistoryMap = normalizeVocabularyTodayHistoryMap(mergedHistoryMap) || {};
      saveVocabularyTodayHistoryMap();
      vocabularyTodayHistorySyncCurrentUid = uid;
      vocabularyTodayHistorySyncReady = true;
      vocabularyTodayHistorySyncAllowCreate = false;
    } else {
      state.vocabularyTodayHistoryMap = normalizeVocabularyTodayHistoryMap(localBaseline) || {};
      saveVocabularyTodayHistoryMap();
      vocabularyTodayHistorySyncCurrentUid = uid;
      vocabularyTodayHistorySyncReady = true;
      vocabularyTodayHistorySyncAllowCreate = true;
    }
    if (!shouldSuppressVocabularyTodayHistoryRenderAfterReload() && state.currentScreen === "vocabularyTodayHistoryScreen") {
      renderVocabularyTodayHistoryScreen();
    }

    const subscribeRemote = window.subscribeMobileVocabularyTodayHistoryStateFromFirestore;
    if (typeof subscribeRemote === "function") {
      vocabularyTodayHistorySyncUnsubscribe = subscribeRemote((snapshot) => {
        if (snapshot?.error && shouldThrottleMobileVocabularySyncError("todayHistory", snapshot.error)) {
          applyMobileVocabularySyncRateLimit("todayHistory", snapshot.error);
          return;
        }
        if (isMobileVocabularySyncRateLimited("todayHistory") || isMobileVocabularySyncDuplicateBurst("todayHistory")) {
          return;
        }
        handleVocabularyTodayHistorySyncRemoteSnapshot(snapshot);
      }, { targetUid: uid });
    }

    if (vocabularyTodayHistorySyncReady) {
      await flushMobileVocabularyTodayHistorySync();
    }
    return vocabularyTodayHistorySyncReady;
  }

  async function flushMobileVocabularyTodayHistorySync() {
    if (vocabularyTodayHistorySyncInFlight) {
      vocabularyTodayHistorySyncQueued = true;
      return vocabularyTodayHistorySyncInFlight;
    }
    if (isMobileVocabularySyncRateLimited("todayHistory") || isMobileVocabularySyncDuplicateBurst("todayHistory")) {
      return;
    }

    vocabularyTodayHistorySyncInFlight = (async () => {
      do {
        vocabularyTodayHistorySyncQueued = false;
        const uid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
        if (!uid || !vocabularyTodayHistorySyncReady || vocabularyTodayHistorySyncCurrentUid !== uid) {
          break;
        }
        if (isMobileVocabularySyncRateLimited("todayHistory") || isMobileVocabularySyncDuplicateBurst("todayHistory")) {
          break;
        }

        const saveRemote = window.saveMobileVocabularyTodayHistoryStateToFirestore;
        if (typeof saveRemote !== "function") {
          break;
        }

        const sourceMap = loadVocabularyTodayHistoryMap();
        vocabularyTodayHistorySyncLastOperationAtMs = Date.now();
        let result = null;
        try {
          result = await saveRemote(sourceMap, {
            targetUid: uid,
            allowCreate: vocabularyTodayHistorySyncAllowCreate,
            sourceDeviceId: String(getMobileBrowserDeviceId() || "").trim(),
            sourceDeviceName: sanitizeMobileLearningHistoryDeviceName(getMobileLearningHistoryDeviceName())
          });
        } catch (error) {
          if (shouldThrottleMobileVocabularySyncError("todayHistory", error)) {
            applyMobileVocabularySyncRateLimit("todayHistory", error);
          }
          break;
        }

        if (shouldThrottleMobileVocabularySyncError("todayHistory", result?.error)) {
          applyMobileVocabularySyncRateLimit("todayHistory", result.error);
          break;
        }
        if (!result?.ok || !result.saved) {
          break;
        }

        if (result.historyMap) {
          state.vocabularyTodayHistoryMap = normalizeVocabularyTodayHistoryMap(result.historyMap) || {};
          saveVocabularyTodayHistoryMap();
        }

        vocabularyTodayHistorySyncAllowCreate = false;
      } while (vocabularyTodayHistorySyncQueued);
    })();

    try {
      await vocabularyTodayHistorySyncInFlight;
    } finally {
      vocabularyTodayHistorySyncInFlight = null;
    }
  }

  function scheduleMobileVocabularyTodayHistorySync() {
    const uid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
    if (!uid) return;
    if (isMobileVocabularySyncRateLimited("todayHistory") || isMobileVocabularySyncDuplicateBurst("todayHistory")) {
      return;
    }
    const latest = state.vocabularyTodayHistoryMap || {};
    const storageKey = getMobileVocabularyTodayHistoryStorageKey(uid);
    window.localStorage.setItem(storageKey, JSON.stringify(latest));
    if (!vocabularyTodayHistorySyncReady || vocabularyTodayHistorySyncCurrentUid !== uid) {
      initializeMobileVocabularyTodayHistorySyncForCurrentUser().catch(() => false);
      return;
    }
    flushMobileVocabularyTodayHistorySync().catch(() => undefined);
  }

  function getVocabularyPastHistoryStatus(skillState, fieldName) {
    if (!skillState || typeof skillState !== "object") return "—";
    const teacherCheck = skillState.teacherCheckState && typeof skillState.teacherCheckState === "object"
      ? skillState.teacherCheckState[fieldName]
      : "none";
    const teacherStatus = String(teacherCheck || skillState.teacherCheckStatus || "none").trim();
    const selfResult = String(skillState.lastSelfResult || "").trim();
    if (selfResult === "ng") return "△";
    if (selfResult === "ok") {
      return teacherStatus === "◎" ? "◎" : "○";
    }
    return "—";
  }

  function getVocabularyPastHistoryEntries() {
    const studyState = state.vocabularyStudy && typeof state.vocabularyStudy === "object" ? state.vocabularyStudy : null;
    const entries = Array.isArray(studyState?.entries) ? studyState.entries : [];

    return entries
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const pronunciationSkill = entry.pronunciation || {};
        const meaningSkill = entry.meaningState || {};
        const pronunciationJudgeAt = Number(pronunciationSkill.lastSelfJudgedAt || pronunciationSkill.lastJudgedAt || entry.lastJudgedAt || 0) || 0;
        const meaningJudgeAt = Number(meaningSkill.lastSelfJudgedAt || meaningSkill.lastJudgedAt || entry.lastJudgedAt || 0) || 0;
        const lastLearnedAt = Math.max(pronunciationJudgeAt, meaningJudgeAt, Number(entry.lastLearnedAt || entry.lastJudgedAt || 0) || 0);
        if (!lastLearnedAt) return null;

        const detailEntry = getVocabularyRealWordBank().find((candidate) => String(candidate?.id || candidate?.word || "").trim() === String(entry?.id || entry?.word || "").trim()) || entry;
        const gradeValue = String(detailEntry?.grade ?? detailEntry?.level ?? detailEntry?.sourceLevel ?? entry?.level ?? "5").trim() || "5";
        const normalizedGrade = ["5", "4", "3"].includes(gradeValue) ? gradeValue : (String(gradeValue).replace(/級/g, "").trim() || "5");
        const pronunciationStatus = getVocabularyPastHistoryStatus(pronunciationSkill, "pronunciation");
        const meaningStatus = getVocabularyPastHistoryStatus(meaningSkill, "meaning");

        return {
          id: String(entry.id || entry.word || "").trim(),
          word: String(entry.word || "").trim(),
          grade: normalizedGrade,
          partOfSpeech: String(detailEntry?.partOfSpeech || entry.partOfSpeech || "名詞").trim() || "名詞",
          meaning: String(detailEntry?.meaning || entry.meaning || "意味未設定").trim() || "意味未設定",
          phonetic: String(detailEntry?.phonetic || entry.phonetic || "").trim() || "",
          pronunciationStatus,
          meaningStatus,
          lastLearnedAt
        };
      })
      .filter(Boolean)
      .sort((left, right) => Number(right.lastLearnedAt || 0) - Number(left.lastLearnedAt || 0));
  }

  function getVocabularyPastHistoryEntryCategory(entry) {
    if (!entry || typeof entry !== "object") return "none";
    const studyEntry = getVocabularyStudyEntryById(String(entry.id || entry.word || "").trim()) || null;
    if (!studyEntry || typeof studyEntry !== "object") return "none";

    const pronunciationSkill = studyEntry.pronunciation || null;
    const meaningSkill = studyEntry.meaningState || null;
    if (!pronunciationSkill && !meaningSkill) return "none";

    const pronunciationSelf = getVocabularyCurrentSelfStatus(pronunciationSkill);
    const meaningSelf = getVocabularyCurrentSelfStatus(meaningSkill);
    const pronunciationTeacher = getVocabularyTeacherCheckStatusText(pronunciationSkill, "pronunciation");
    const meaningTeacher = getVocabularyTeacherCheckStatusText(meaningSkill, "meaning");

    const hasDelta = pronunciationSelf === "△" || meaningSelf === "△" || pronunciationTeacher === "△" || meaningTeacher === "△";
    if (hasDelta) return "learning";

    const bothChecked = pronunciationTeacher === "◎" && meaningTeacher === "◎";
    if (bothChecked) return "checked";

    const bothSelfOk = pronunciationSelf === "○" && meaningSelf === "○";
    if (bothSelfOk) return "pending";

    return "none";
  }

  function getVocabularyPastHistorySummary() {
    const entries = Array.isArray(getVocabularyPastHistoryEntries()) ? getVocabularyPastHistoryEntries().slice() : [];
    const summary = { learning: 0, pending: 0, checked: 0 };

    entries.forEach((entry) => {
      const category = getVocabularyPastHistoryEntryCategory(entry);
      if (category === "learning") summary.learning += 1;
      else if (category === "pending") summary.pending += 1;
      else if (category === "checked") summary.checked += 1;
    });

    return summary;
  }

  function getVocabularyPastHistoryDisplayEntries(filterValue = state.vocabularyPastHistoryFilter || "all") {
    const entries = Array.isArray(getVocabularyPastHistoryEntries()) ? getVocabularyPastHistoryEntries().slice() : [];
    const normalizedFilter = ["all", "learning", "pending", "checked"].includes(String(filterValue || "all")) ? String(filterValue || "all") : "all";
    const filteredEntries = normalizedFilter === "all"
      ? entries
      : entries.filter((entry) => getVocabularyPastHistoryEntryCategory(entry) === normalizedFilter);

    if (normalizedFilter === "all") {
      return filteredEntries.sort((left, right) => {
        const leftHasDelta = [left?.pronunciationStatus, left?.meaningStatus].includes("△");
        const rightHasDelta = [right?.pronunciationStatus, right?.meaningStatus].includes("△");

        if (leftHasDelta !== rightHasDelta) {
          return leftHasDelta ? -1 : 1;
        }

        return Number(right?.lastLearnedAt || 0) - Number(left?.lastLearnedAt || 0);
      });
    }

    return filteredEntries.sort((left, right) => Number(right?.lastLearnedAt || 0) - Number(left?.lastLearnedAt || 0));
  }

  function renderVocabularyPastHistoryScreen() {
    const list = elements.vocabularyPastHistoryList;
    const summary = elements.vocabularyPastHistorySummary;
    const filters = elements.vocabularyPastHistoryFilters;
    if (!list) return;

    const entries = getVocabularyPastHistoryDisplayEntries();
    const summaryData = getVocabularyPastHistorySummary();

    if (summary) {
      const summaryEntries = [
        { key: "learning", label: "学習中", value: summaryData.learning },
        { key: "pending", label: "先生チェック待ち", value: summaryData.pending },
        { key: "checked", label: "チェック済み", value: summaryData.checked }
      ];
      summary.innerHTML = summaryEntries.map((item) => {
        const modifier = item.key === "pending" ? " is-pending" : "";
        return `<span class="vocabulary-history-summary-item${modifier}">${item.label} ${item.value}語</span>`;
      }).join("");
    }

    if (filters) {
      const buttons = filters.querySelectorAll(".vocabulary-history-filter-btn");
      const activeFilter = state.vocabularyPastHistoryFilter || "all";
      buttons.forEach((button) => {
        const isActive = String(button.dataset.filter || "all") === String(activeFilter || "all");
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
      });
    }

    list.innerHTML = "";

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "status-text";
      empty.textContent = "該当する履歴はありません。";
      list.appendChild(empty);
      showScreen("vocabularyPastHistoryScreen");
      return;
    }

    const header = document.createElement("div");
    header.className = "vocabulary-history-row vocabulary-history-row--header";
    header.innerHTML = '<span class="vocabulary-history-index">No.</span><span class="vocabulary-history-word">単語</span><span class="vocabulary-history-status">発音</span><span class="vocabulary-history-status">意味</span><span class="vocabulary-history-status">最終学習</span>';
    list.appendChild(header);

    const rows = [];
    entries.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "vocabulary-history-row";
      row.dataset.wordId = String(entry.id || entry.word || "").trim();
      row.classList.remove("is-open");

      const serial = document.createElement("span");
      serial.className = "vocabulary-history-index";
      serial.textContent = `${index + 1}`;

      const wordButton = document.createElement("button");
      wordButton.type = "button";
      wordButton.className = "vocabulary-history-word-button";
      wordButton.textContent = entry.word;
      wordButton.setAttribute("aria-expanded", "false");

      const pronunciation = document.createElement("span");
      pronunciation.className = "vocabulary-history-status";
      pronunciation.textContent = ` ${entry.pronunciationStatus}`;

      const meaning = document.createElement("span");
      meaning.className = "vocabulary-history-status";
      meaning.textContent = ` ${entry.meaningStatus}`;

      const lastLearned = document.createElement("span");
      lastLearned.className = "vocabulary-history-status";
      lastLearned.textContent = ` ${new Date(entry.lastLearnedAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}`;

      const detail = document.createElement("div");
      detail.className = "vocabulary-history-detail";
      detail.hidden = true;
      detail.innerHTML = `
        <span class="vocabulary-history-detail-text">${entry.grade}級　　${entry.partOfSpeech}　　${entry.meaning}</span>
      `;

      const setRowExpanded = (isOpen) => {
        row.classList.toggle("is-open", isOpen);
        wordButton.setAttribute("aria-expanded", String(isOpen));
        detail.hidden = !isOpen;
      };

      row.addEventListener("click", () => {
        const willOpen = !row.classList.contains("is-open");
        rows.forEach((candidate) => {
          if (candidate !== row) {
            candidate.classList.remove("is-open");
            const candidateButton = candidate.querySelector(".vocabulary-history-word-button");
            const candidateDetail = candidate.querySelector(".vocabulary-history-detail");
            if (candidateButton) candidateButton.setAttribute("aria-expanded", "false");
            if (candidateDetail) candidateDetail.hidden = true;
          }
        });
        setRowExpanded(willOpen);
      });

      row.append(serial, wordButton, pronunciation, meaning, lastLearned, detail);
      rows.push(row);
      list.appendChild(row);
    });

    showScreen("vocabularyPastHistoryScreen");
  }

  function openVocabularyPastHistoryScreen() {
    renderVocabularyPastHistoryScreen();
  }

  function renderVocabularyTodayHistoryScreen() {
    if (shouldSuppressVocabularyTodayHistoryRenderAfterReload()) {
      if (state.currentScreen !== "homeScreen") {
        showScreen("homeScreen");
      }
      renderHome();
      return;
    }

    const list = elements.vocabularyTodayHistoryList;
    if (!list) return;

    const entries = getVocabularyTodayHistoryEntries();
    list.innerHTML = "";

    const titleNode = document.querySelector("#vocabularyTodayHistoryScreen .vocabulary-history-panel h2");
    if (titleNode) {
      titleNode.textContent = `今日の履歴 ${entries.length}問`;
    }

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "status-text";
      empty.textContent = "まだ判定した単語はありません。";
      list.appendChild(empty);
      showScreen("vocabularyTodayHistoryScreen");
      return;
    }

    const header = document.createElement("div");
    header.className = "vocabulary-history-row vocabulary-history-row--header";
    header.innerHTML = '<span class="vocabulary-history-index">No.</span><span class="vocabulary-history-word">単語</span><span class="vocabulary-history-status">発音</span><span class="vocabulary-history-status">意味</span>';
    list.appendChild(header);

    const rows = [];
    entries.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "vocabulary-history-row";
      row.classList.remove("is-open");

      const serial = document.createElement("span");
      serial.className = "vocabulary-history-index";
      serial.textContent = `${index + 1}`;

      const wordButton = document.createElement("button");
      wordButton.type = "button";
      wordButton.className = "vocabulary-history-word-button";
      wordButton.textContent = entry.word;
      wordButton.setAttribute("aria-expanded", "false");

      const pronunciation = document.createElement("span");
      pronunciation.className = "vocabulary-history-status";
      pronunciation.textContent = getVocabularyHistoryDisplayValue(entry, "pronunciation");
      if (String(pronunciation.textContent || "—").trim() === "△") pronunciation.classList.add("is-weak");

      const meaning = document.createElement("span");
      meaning.className = "vocabulary-history-status";
      meaning.textContent = getVocabularyHistoryDisplayValue(entry, "meaning");
      if (String(meaning.textContent || "—").trim() === "△") meaning.classList.add("is-weak");

      const detail = document.createElement("div");
      detail.className = "vocabulary-history-detail";
      detail.hidden = true;

      const detailInfo = getVocabularyHistoryDetailData(entry);
      const detailGrade = document.createElement("span");
      detailGrade.className = "vocabulary-history-detail-grade";
      detailGrade.textContent = `${detailInfo.grade}級`;

      const detailMeaningText = document.createElement("span");
      detailMeaningText.className = "vocabulary-history-detail-meaning";
      detailMeaningText.textContent = detailInfo.meaning || "意味未設定";

      detail.append(detailGrade, detailMeaningText);

      row.addEventListener("click", () => {
        const willOpen = !row.classList.contains("is-open");
        rows.forEach((candidate) => {
          if (candidate !== row) {
            candidate.classList.remove("is-open");
            const candidateButton = candidate.querySelector(".vocabulary-history-word-button");
            const candidateDetail = candidate.querySelector(".vocabulary-history-detail");
            if (candidateButton) candidateButton.setAttribute("aria-expanded", "false");
            if (candidateDetail) candidateDetail.hidden = true;
          }
        });
        row.classList.toggle("is-open", willOpen);
        wordButton.setAttribute("aria-expanded", String(willOpen));
        detail.hidden = !willOpen;
      });

      row.append(serial, wordButton, pronunciation, meaning, detail);
      rows.push(row);
      list.appendChild(row);
    });

    showScreen("vocabularyTodayHistoryScreen");
  }

  function openVocabularyTodayHistoryScreen() {
    stopVocabularySampleTimer();
    renderVocabularyTodayHistoryScreen();
  }

  function getVocabularyTeacherCheckCandidates() {
    const historyEntries = Array.isArray(getVocabularyPastHistoryEntries()) ? getVocabularyPastHistoryEntries().slice() : [];
    const candidates = [];

    historyEntries.forEach((entry) => {
      if (!entry || !entry.id || !entry.word) return;

      const studyEntry = getVocabularyStudyEntryById(String(entry.id || entry.word || "").trim()) || null;
      const pronunciationSkill = studyEntry && studyEntry.pronunciation ? studyEntry.pronunciation : null;
      const meaningSkill = studyEntry && studyEntry.meaningState ? studyEntry.meaningState : null;
      const pronunciationSelf = getVocabularyCurrentSelfStatus(pronunciationSkill);
      const meaningSelf = getVocabularyCurrentSelfStatus(meaningSkill);
      const pronunciationSelfOk = pronunciationSelf === "○" || String(pronunciationSkill?.lastSelfResult || "").trim() === "ok";
      const meaningSelfOk = meaningSelf === "○" || String(meaningSkill?.lastSelfResult || "").trim() === "ok";
      if (!pronunciationSelfOk || !meaningSelfOk) return;

      const pronunciationTeacher = getVocabularyTeacherCheckStatusText(pronunciationSkill, "pronunciation");
      const meaningTeacher = getVocabularyTeacherCheckStatusText(meaningSkill, "meaning");
      const pronunciationTeacherComplete = pronunciationTeacher === "◎" || String(pronunciationSkill?.teacherCheckStatus || "").trim() === "◎";
      const meaningTeacherComplete = meaningTeacher === "◎" || String(meaningSkill?.teacherCheckStatus || "").trim() === "◎";
      if (pronunciationTeacherComplete && meaningTeacherComplete) return;

      candidates.push({
        id: String(entry.id || entry.word || "").trim(),
        word: String(entry.word || "").trim(),
        grade: String(entry.grade || "5").trim() || "5",
        partOfSpeech: String(entry.partOfSpeech || "名詞").trim() || "名詞",
        meaning: String(entry.meaning || "意味未設定").trim() || "意味未設定",
        pronunciationText: String(entry.phonetic || "").trim(),
        lastLearnedAt: Number(entry.lastLearnedAt || 0) || 0
      });
    });

    return candidates
      .sort((left, right) => Number(right.lastLearnedAt || 0) - Number(left.lastLearnedAt || 0))
      .slice(0, 50);
  }

  function buildVocabularyTeacherCheckCandidates() {
    return getVocabularyTeacherCheckCandidates();
  }

  function getVocabularyTeacherCheckPageInfo(session) {
    const candidates = Array.isArray(session?.candidates) ? session.candidates : [];
    const pageSize = 10;
    const total = candidates.length;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const pageIndex = Math.max(0, Math.min(Number(session?.pageIndex || 0) || 0, pageCount - 1));
    const startIndex = pageIndex * pageSize;
    const endIndex = Math.min(total, startIndex + pageSize);
    const pageCandidates = candidates.slice(startIndex, endIndex);
    const startNumber = total ? startIndex + 1 : 0;
    const endNumber = total ? endIndex : 0;
    const isCurrentPageComplete = pageCandidates.every((candidate) => {
      const decision = session?.decisions?.[candidate.id] || { pronunciation: "none", meaning: "none" };
      return String(decision.pronunciation || "none").trim() !== "none" && String(decision.meaning || "none").trim() !== "none";
    });
    return {
      pageSize,
      total,
      pageCount,
      pageIndex,
      startIndex,
      endIndex,
      startNumber,
      endNumber,
      pageCandidates,
      isCurrentPageComplete
    };
  }

  function renderVocabularyTeacherCheckScreen() {
    if (!state.teacherCheckSession) {
      state.teacherCheckSession = {
        candidates: buildVocabularyTeacherCheckCandidates(),
        decisions: {},
        showMeaningIds: [],
        pageIndex: 0
      };
    }

    const session = state.teacherCheckSession;
    const candidates = Array.isArray(session.candidates) ? session.candidates : [];
    const contentEl = elements.vocabularyTeacherCheckContent;
    const metaEl = elements.vocabularyTeacherCheckMeta;
    const prevBtn = elements.vocabularyTeacherCheckPrevBtn;
    const nextBtn = elements.vocabularyTeacherCheckNextBtn;
    const completeBtn = elements.vocabularyTeacherCheckCompleteBtn;
    if (!contentEl || !metaEl) return;
    if (!candidates.length) {
      metaEl.textContent = "0 / 0";
      if (prevBtn) prevBtn.classList.add("hidden");
      if (nextBtn) nextBtn.classList.add("hidden");
      if (completeBtn) completeBtn.classList.add("hidden");
      contentEl.innerHTML = '<p class="status-text">先生チェック対象の単語はありません。</p>';
      return;
    }

    if (!Array.isArray(session.showMeaningIds)) {
      session.showMeaningIds = [];
    }

    const pageInfo = getVocabularyTeacherCheckPageInfo(session);
    session.pageIndex = pageInfo.pageIndex;
    const decisions = session.decisions && typeof session.decisions === "object" ? session.decisions : {};
    const showMeaningIds = new Set(session.showMeaningIds.map((value) => String(value || "").trim()).filter(Boolean));
    metaEl.textContent = `${pageInfo.startNumber}～${pageInfo.endNumber} / ${pageInfo.total}`;

    if (prevBtn) {
      prevBtn.classList.toggle("hidden", pageInfo.pageIndex === 0);
      prevBtn.textContent = "前の10問";
    }
    if (nextBtn) {
      nextBtn.classList.toggle("hidden", pageInfo.pageIndex >= pageInfo.pageCount - 1);
      nextBtn.textContent = "次の10問";
    }
    if (completeBtn) {
      completeBtn.classList.toggle("hidden", pageInfo.pageIndex < pageInfo.pageCount - 1);
      completeBtn.textContent = "チェック完了";
    }

    contentEl.innerHTML = `
      <div class="vocabulary-teacher-check-list">
        ${pageInfo.pageCandidates.map((candidate, index) => {
          const decision = decisions[candidate.id] || { pronunciation: "none", meaning: "none" };
          const showMeaning = showMeaningIds.has(candidate.id);
          const pageOffset = pageInfo.startIndex + index + 1;
          return `
            <div class="vocabulary-teacher-check-card" data-teacher-check-card-id="${String(candidate.id || "").trim()}">
              <div class="vocabulary-teacher-check-header">
                <span class="vocabulary-teacher-check-index">${pageOffset}.</span>
                <span class="vocabulary-teacher-check-grade">${candidate.grade}級</span>
                <span class="vocabulary-teacher-check-part-of-speech">${candidate.partOfSpeech}</span>
                <button type="button" class="secondary-btn vocabulary-teacher-check-audio-btn" data-teacher-check-action="audio" data-teacher-check-id="${String(candidate.id || "").trim()}" data-teacher-check-audio="${String(candidate.word || "").trim()}">
                  🔊
                </button>
              </div>
              <div class="vocabulary-teacher-check-word-row">
                <p class="vocabulary-teacher-check-word">${candidate.word}</p>
              </div>
              <div class="vocabulary-teacher-check-row">
                <span class="vocabulary-teacher-check-label">発音</span>
                <div class="vocabulary-teacher-check-choice-row">
                  <button type="button" class="secondary-btn ${decision.pronunciation === "ok" ? "is-selected" : ""}" data-teacher-check-action="decision" data-teacher-check-id="${String(candidate.id || "").trim()}" data-teacher-check-field="pronunciation" data-teacher-check-value="ok">◎</button>
                  <button type="button" class="secondary-btn ${decision.pronunciation === "ng" ? "is-selected" : ""}" data-teacher-check-action="decision" data-teacher-check-id="${String(candidate.id || "").trim()}" data-teacher-check-field="pronunciation" data-teacher-check-value="ng">△</button>
                </div>
              </div>
              <div class="vocabulary-teacher-check-row">
                <span class="vocabulary-teacher-check-label">意味</span>
                <div class="vocabulary-teacher-check-choice-row">
                  <button type="button" class="secondary-btn ${decision.meaning === "ok" ? "is-selected" : ""}" data-teacher-check-action="decision" data-teacher-check-id="${String(candidate.id || "").trim()}" data-teacher-check-field="meaning" data-teacher-check-value="ok">◎</button>
                  <button type="button" class="secondary-btn ${decision.meaning === "ng" ? "is-selected" : ""}" data-teacher-check-action="decision" data-teacher-check-id="${String(candidate.id || "").trim()}" data-teacher-check-field="meaning" data-teacher-check-value="ng">△</button>
                </div>
              </div>
              <button type="button" class="ghost-btn vocabulary-teacher-check-meaning-toggle" data-teacher-check-action="toggle-meaning" data-teacher-check-id="${String(candidate.id || "").trim()}">
                ${showMeaning ? "意味を隠す" : "意味を見る"}
              </button>
              <div class="vocabulary-teacher-check-meaning-preview ${showMeaning ? "" : "is-hidden"}">${showMeaning ? candidate.meaning : ""}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    contentEl.onpointerup = (event) => {
      const button = event.target && event.target.closest ? event.target.closest("[data-teacher-check-action]") : null;
      if (!button) return;
      handleVocabularyTeacherCheckAction(button, event);
    };
    contentEl.onclick = (event) => {
      const button = event.target && event.target.closest ? event.target.closest("[data-teacher-check-action]") : null;
      if (!button) return;
      if (button.dataset.teacherCheckTapHandled === "1") {
        delete button.dataset.teacherCheckTapHandled;
        return;
      }
      handleVocabularyTeacherCheckAction(button, event);
    };
  }

  function updateVocabularyTeacherCheckSelectionState(cardId) {
    const contentEl = elements.vocabularyTeacherCheckContent;
    const session = state.teacherCheckSession;
    if (!contentEl || !session || !cardId) return;
    const card = contentEl.querySelector(`[data-teacher-check-card-id="${CSS.escape(String(cardId))}"]`);
    if (!card) return;
    const decision = session.decisions && session.decisions[cardId] ? session.decisions[cardId] : { pronunciation: "none", meaning: "none" };
    const fieldGroups = ["pronunciation", "meaning"];
    fieldGroups.forEach((fieldName) => {
      const buttons = card.querySelectorAll(`[data-teacher-check-field="${fieldName}"]`);
      buttons.forEach((button) => {
        const isSelected = String(button.dataset.teacherCheckValue || "") === String(decision[fieldName] || "none");
        button.classList.toggle("is-selected", isSelected);
      });
    });
  }

  function updateVocabularyTeacherCheckMeaningToggleState(cardId) {
    const contentEl = elements.vocabularyTeacherCheckContent;
    const session = state.teacherCheckSession;
    if (!contentEl || !session || !cardId) return;
    const card = contentEl.querySelector(`[data-teacher-check-card-id="${CSS.escape(String(cardId))}"]`);
    if (!card) return;
    const showMeaning = Array.isArray(session.showMeaningIds) && session.showMeaningIds.includes(cardId);
    const toggleButton = card.querySelector(".vocabulary-teacher-check-meaning-toggle");
    const preview = card.querySelector(".vocabulary-teacher-check-meaning-preview");
    const candidate = (Array.isArray(session.candidates) ? session.candidates : []).find((entry) => String(entry.id || "") === String(cardId));
    if (toggleButton) {
      toggleButton.textContent = showMeaning ? "意味を隠す" : "意味を見る";
    }
    if (preview) {
      preview.classList.toggle("is-hidden", !showMeaning);
      preview.textContent = showMeaning && candidate ? candidate.meaning : "";
    }
  }

  function handleVocabularyTeacherCheckAction(button, event) {
    if (!button || !event || !state.teacherCheckSession) return;
    const action = String(button.dataset.teacherCheckAction || "").trim();
    const candidateId = String(button.dataset.teacherCheckId || candidateIdFromButton(button) || "").trim();
    if (!candidateId) return;

    if (event.type === "pointerup" || event.type === "touchend") {
      button.dataset.teacherCheckTapHandled = "1";
    }

    if (action === "audio") {
      const text = String(button.dataset.teacherCheckAudio || "").trim();
      if (text) {
        speakMobileEnglishText(text);
      }
      return;
    }

    if (action === "toggle-meaning") {
      const session = state.teacherCheckSession;
      const showMeaningIds = Array.isArray(session.showMeaningIds) ? session.showMeaningIds : [];
      const hasCandidate = showMeaningIds.includes(candidateId);
      session.showMeaningIds = hasCandidate
        ? showMeaningIds.filter((value) => String(value || "").trim() !== candidateId)
        : [...showMeaningIds, candidateId];
      updateVocabularyTeacherCheckMeaningToggleState(candidateId);
      return;
    }

    if (action === "decision") {
      const session = state.teacherCheckSession;
      const field = String(button.dataset.teacherCheckField || "").trim();
      const value = String(button.dataset.teacherCheckValue || "").trim();
      if (!field || !["pronunciation", "meaning"].includes(field) || !value) return;
      if (!session.decisions[candidateId]) session.decisions[candidateId] = { pronunciation: "none", meaning: "none" };
      const currentValue = session.decisions[candidateId][field] || "none";
      session.decisions[candidateId][field] = currentValue === value ? "none" : value;
      updateVocabularyTeacherCheckSelectionState(candidateId);
      return;
    }
  }

  function candidateIdFromButton(button) {
    const directId = String(button?.dataset?.teacherCheckId || "").trim();
    if (directId) return directId;
    const card = button?.closest(".vocabulary-teacher-check-card");
    if (!card) return "";
    return String(card.dataset.teacherCheckCardId || "").trim();
  }

  function getVocabularyTeacherCheckRouteScreen() {
    if (!window || !window.location) return false;
    const params = new URLSearchParams(String(window.location.search || ""));
    return params.get("teacherCheck") === "1" || params.get("openTeacherCheck") === "1";
  }

  function openVocabularyTeacherCheckScreen() {
    state.teacherCheckSession = {
      candidates: buildVocabularyTeacherCheckCandidates(),
      decisions: {},
      showMeaningIds: []
    };
    renderVocabularyTeacherCheckScreen();
    showScreen("vocabularyTeacherCheckScreen");
  }

  window.openVocabularyTodayHistoryScreen = openVocabularyTodayHistoryScreen;
  window.renderVocabularyTodayHistoryScreen = renderVocabularyTodayHistoryScreen;

  function playVocabularySampleCorrectChime() {
    if (typeof Audio !== "function") return false;
    const audio = new Audio("../assets/sounds/correct-05-3.mp3");
    audio.preload = "auto";
    audio.play().catch(() => undefined);
    return true;
  }

  async function handleVocabularySampleChoice(kind, value) {
    const sample = normalizeVocabularySampleSessionState(state.vocabularySample || null, getVocabularySampleWordItem());
    if (!sample) return;
    const item = getVocabularySampleWordItem();
    if (!item) return;
    if (value !== "ok" && value !== "ng") return;
    const itemKey = `${String(item.id || item.word || "").trim()}|${String(item.partOfSpeech || "").trim()}`;
    sample.currentWordKey = itemKey;
    sample.currentWordId = itemKey;

    if (value === "ok") {
      playVocabularySampleCorrectChime();
    }

    if (kind === "pronunciation") {
      sample.pronunciationChoice = value;
      sample.pronunciationChecked = true;
      sample.meaningChoice = null;
      sample.meaningChecked = false;
      sample.meaningRevealed = false;
      recordVocabularySampleHistoryJudgment(item, "pronunciation", value);
      updateVocabularyStudyEntryAfterJudgment(item, "pronunciation", value);
    }
    if (kind === "meaning") {
      sample.meaningChoice = value;
      sample.meaningChecked = true;
      recordVocabularySampleHistoryJudgment(item, "meaning", value);
      updateVocabularyStudyEntryAfterJudgment(item, "meaning", value);
    }

    const nextPronunciationDecision = sample.pronunciationChoice === "ok" || sample.pronunciationChoice === "ng";
    const nextMeaningDecision = sample.meaningChoice === "ok" || sample.meaningChoice === "ng";
    if (nextPronunciationDecision && nextMeaningDecision) {
      if (!sample.currentWordCompleted || sample.currentWordKey !== itemKey) {
        sample.currentWordCompleted = true;
        sample.currentWordKey = itemKey;
        sample.completedWordCount = getVocabularySampleCompletedWordCount(sample) + 1;
        advanceVocabularyNormalProgress();
      }
      const changedWordId = String(item.id || item.word || "").trim();
      saveState(changedWordId);
      await flushMobileVocabularySync(changedWordId);
      await flushMobileVocabularyTodayHistorySync();
      continueVocabularySample();
      return;
    }

    renderVocabularySampleScreen();
    showScreen("vocabularySampleScreen");
  }

  function formatTimestampToJstDisplay(timestamp) {
    if (!Number.isFinite(Number(timestamp))) return "";
    const date = new Date(Number(timestamp));
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${byType.year}/${byType.month}/${byType.day} ${byType.hour}:${byType.minute}`;
  }

  function formatMobileLearningDuration(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minute = Math.floor(safeSeconds / 60);
    const remain = safeSeconds % 60;
    if (minute > 0) {
      return remain > 0 ? `${minute}分${remain}秒` : `${minute}分`;
    }
    return `${remain}秒`;
  }

  function getMobileLearningTicketSnapshot() {
    return { earnedCount: 0, usedCount: 0 };
  }

  function normalizeMobileLearningModeLabel(mode, session = null) {
    const normalizedMode = String(mode || "").trim();
    if (normalizedMode === "speaking") return "スピーキング";
    if (normalizedMode === "typing") {
      return "Vocabulary";
    }
    if (normalizedMode === "conversation") return "会話練習";
    if (normalizedMode === "review") return "過去の間違い";
    if (normalizedMode === "word-order" || normalizedMode === "wordorder") return "語順トレーニング";
    if (normalizedMode === "translation") return "和訳トレーニング";
    return normalizedMode || "-";
  }

  function getMobileLearningDayNumberFromSession(session) {
    if (!session || !Array.isArray(session.questions) || !session.questions.length) return "";
    const days = [...new Set(session.questions.map((item) => Number(item?.day)).filter((value) => Number.isFinite(value)))].sort((a, b) => a - b);
    if (!days.length) return "";
    if (days.length === 1) return `Day${days[0]}`;
    return `Day${days[0]}-${days[days.length - 1]}`;
  }

  function getMobileLearningHistoryDayNumberFromSpeakingProgress(progress) {
    const dayKey = String(progress?.dayKey || "").trim();
    if (!dayKey) return "";
    const weekId = String(progress?.weekId || "").trim();
    return weekId ? `${weekId} ${dayKey}` : dayKey;
  }

  function buildMobileBrowserDeviceId() {
    try {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
      }
    } catch (_error) {
      // Fallback below.
    }
    const randomPart = Math.random().toString(36).slice(2, 10);
    return `mobile-${Date.now().toString(36)}-${randomPart}`;
  }

  function getMobileBrowserDeviceId() {
    try {
      const stored = String(window.localStorage.getItem(MOBILE_DEVICE_ID_STORAGE_KEY) || "").trim();
      if (stored) {
        mobileRuntimeDeviceId = stored;
        return stored;
      }
      const created = buildMobileBrowserDeviceId();
      mobileRuntimeDeviceId = created;
      window.localStorage.setItem(MOBILE_DEVICE_ID_STORAGE_KEY, created);
      return created;
    } catch (_error) {
      if (!mobileRuntimeDeviceId) {
        mobileRuntimeDeviceId = buildMobileBrowserDeviceId();
      }
      return mobileRuntimeDeviceId;
    }
  }

  function sanitizeMobileLearningHistoryDeviceName(value) {
    const text = String(value || "").trim().replace(/\s+/g, " ");
    if (!text) return "";
    return text.slice(0, 40);
  }

  function readMobileCachedSonUid() {
    try {
      return String(window.localStorage.getItem(MOBILE_FAMILY_SON_UID_CACHE_KEY) || "").trim();
    } catch (_error) {
      return "";
    }
  }

  function writeMobileCachedSonUid(value) {
    const normalized = String(value || "").trim();
    mobileCachedSonUid = normalized;
    try {
      if (normalized) {
        window.localStorage.setItem(MOBILE_FAMILY_SON_UID_CACHE_KEY, normalized);
      } else {
        window.localStorage.removeItem(MOBILE_FAMILY_SON_UID_CACHE_KEY);
      }
    } catch (_error) {
      // Ignore persistence failures.
    }
  }

  async function refreshMobileFamilyIdentityCache() {
    if (mobileFamilyIdentityRefreshPromise) {
      return mobileFamilyIdentityRefreshPromise;
    }
    mobileFamilyIdentityRefreshPromise = (async () => {
      const currentUser = typeof window.getMobileFirebaseCurrentUser === "function"
        ? window.getMobileFirebaseCurrentUser()
        : (window.MobileFirebase?.auth?.currentUser || null);
      const currentUid = String(currentUser?.uid || "").trim();
      const firestore = window.MobileFirebase?.firestore || null;
      if (!currentUid || !firestore) {
        return false;
      }
      try {
        const sdk = await getMobileFirestoreSdk();
        const familyDoc = await sdk.getDoc(sdk.doc(firestore, "families", MOBILE_ADMIN_FAMILY_ID));
        const sonUid = familyDoc.exists() ? String(familyDoc.data()?.children?.son?.uid || "").trim() : "";
        writeMobileCachedSonUid(sonUid);
        renderMobileHomeAccountAlias();
        return true;
      } catch (_error) {
        return false;
      }
    })();
    try {
      return await mobileFamilyIdentityRefreshPromise;
    } finally {
      mobileFamilyIdentityRefreshPromise = null;
    }
  }

  function isCurrentSonLoginForMobileLearningHistory() {
    const currentUser = typeof window.getMobileFirebaseCurrentUser === "function"
      ? window.getMobileFirebaseCurrentUser()
      : (window.MobileFirebase?.auth?.currentUser || null);
    const currentUid = String(currentUser?.uid || "").trim();
    if (!currentUid) return false;
    if (!mobileCachedSonUid) {
      mobileCachedSonUid = readMobileCachedSonUid();
    }
    return Boolean(mobileCachedSonUid && currentUid === mobileCachedSonUid);
  }

  function getMobileLearningHistoryDeviceName() {
    if (isCurrentSonLoginForMobileLearningHistory()) {
      return MOBILE_LEARNING_HISTORY_DEVICE_NAME_SON;
    }
    return MOBILE_LEARNING_HISTORY_DEVICE_NAME_OTHER;
  }

  function buildMobileLearningHistoryDeviceInfo() {
    return {
      deviceType: "mobile",
      deviceId: String(getMobileBrowserDeviceId() || "").trim(),
      deviceName: sanitizeMobileLearningHistoryDeviceName(getMobileLearningHistoryDeviceName())
    };
  }

  function buildMobileLearningHistoryEntryIdentity(entry) {
    const source = {
      startedAt: Number(entry?.startedAt) || 0,
      endedAt: Number(entry?.endedAt) || 0,
      mode: String(entry?.mode || ""),
      dayNumber: String(entry?.dayNumber || ""),
      questionCount: Math.max(0, Number(entry?.questionCount) || 0),
      correctCount: Math.max(0, Number(entry?.correctCount) || 0),
      completedReason: String(entry?.completedReason || "completed")
    };
    return JSON.stringify(source);
  }

  function loadMobilePendingLearningHistoryEntries() {
    try {
      const raw = window.localStorage.getItem(MOBILE_PENDING_LEARNING_HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeMobileLearningHistoryEntry).filter((entry) => {
        if (!entry) return false;
        return Math.max(0, Number(entry.questionCount) || 0) > 0;
      });
    } catch (_error) {
      return [];
    }
  }

  function saveMobilePendingLearningHistoryEntries(entries) {
    const sanitized = Array.isArray(entries)
      ? entries.map(sanitizeMobileLearningHistoryEntry).filter((entry) => {
        if (!entry) return false;
        return Math.max(0, Number(entry.questionCount) || 0) > 0;
      })
      : [];
    if (!sanitized.length) {
      mobilePendingLearningHistoryEntries = [];
      window.localStorage.removeItem(MOBILE_PENDING_LEARNING_HISTORY_STORAGE_KEY);
      return;
    }
    mobilePendingLearningHistoryEntries = sanitized.slice(-MOBILE_LEARNING_HISTORY_MAX_ENTRIES);
    window.localStorage.setItem(
      MOBILE_PENDING_LEARNING_HISTORY_STORAGE_KEY,
      JSON.stringify(mobilePendingLearningHistoryEntries)
    );
  }

  function enqueueMobilePendingLearningHistoryEntry(entry) {
    const sanitized = sanitizeMobileLearningHistoryEntry(entry);
    if (!sanitized) return;
    if (Math.max(0, Number(sanitized.questionCount) || 0) === 0) {
      return;
    }
    const next = Array.isArray(mobilePendingLearningHistoryEntries)
      ? mobilePendingLearningHistoryEntries.slice()
      : [];
    const targetIdentity = buildMobileLearningHistoryEntryIdentity(sanitized);
    const exists = next.some((item) => buildMobileLearningHistoryEntryIdentity(item) === targetIdentity);
    if (!exists) {
      next.push(sanitized);
    }
    saveMobilePendingLearningHistoryEntries(next);
  }

  async function resolveMobileLearningHistoryDeviceInfoForSave() {
    const currentUser = typeof window.getMobileFirebaseCurrentUser === "function"
      ? window.getMobileFirebaseCurrentUser()
      : (window.MobileFirebase?.auth?.currentUser || null);
    const currentUid = String(currentUser?.uid || "").trim();
    const baseInfo = {
      deviceType: "mobile",
      deviceId: String(getMobileBrowserDeviceId() || "").trim(),
      deviceName: ""
    };
    if (!currentUid) {
      return { resolved: false, deviceInfo: baseInfo };
    }

    if (!mobileCachedSonUid) {
      mobileCachedSonUid = readMobileCachedSonUid();
    }
    if (!mobileCachedSonUid) {
      await refreshMobileFamilyIdentityCache().catch(() => false);
      if (!mobileCachedSonUid) {
        mobileCachedSonUid = readMobileCachedSonUid();
      }
    }
    if (!mobileCachedSonUid) {
      return { resolved: false, deviceInfo: baseInfo };
    }

    const isSon = currentUid === mobileCachedSonUid;
    return {
      resolved: true,
      deviceInfo: {
        ...baseInfo,
        deviceName: sanitizeMobileLearningHistoryDeviceName(
          isSon ? MOBILE_LEARNING_HISTORY_DEVICE_NAME_SON : MOBILE_LEARNING_HISTORY_DEVICE_NAME_OTHER
        )
      }
    };
  }

  function normalizeMobileLearningHistoryEntryForSave(entry, deviceInfo) {
    const sanitized = sanitizeMobileLearningHistoryEntry(entry);
    if (!sanitized) return null;
    return {
      ...sanitized,
      deviceType: "mobile",
      deviceId: String(deviceInfo?.deviceId || getMobileBrowserDeviceId() || "").trim(),
      deviceName: sanitizeMobileLearningHistoryDeviceName(deviceInfo?.deviceName)
    };
  }

  function saveResolvedMobileLearningHistoryEntry(entry) {
    const normalizedEntry = sanitizeMobileLearningHistoryEntry(entry);
    if (!normalizedEntry) return;
    const identity = buildMobileLearningHistoryEntryIdentity(normalizedEntry);
    const current = loadMobileLearningHistoryEntries();
    const exists = current.some((item) => buildMobileLearningHistoryEntryIdentity(item) === identity);
    if (!exists) {
      current.push(normalizedEntry);
      saveMobileLearningHistoryEntries(current);
    }

    const saveToFirestore = window.saveMobileLearningHistoryToFirestore;
    if (typeof saveToFirestore === "function") {
      Promise.resolve(saveToFirestore(normalizedEntry)).catch((error) => {
        console.error("Failed to save mobile learning history to Firestore", error);
      });
    }
  }

  async function flushMobilePendingLearningHistoryEntries() {
    if (mobileLearningHistoryFlushPromise) {
      return mobileLearningHistoryFlushPromise;
    }

    mobileLearningHistoryFlushPromise = (async () => {
      if (!Array.isArray(mobilePendingLearningHistoryEntries) || !mobilePendingLearningHistoryEntries.length) {
        mobilePendingLearningHistoryEntries = loadMobilePendingLearningHistoryEntries();
      }
      if (!mobilePendingLearningHistoryEntries.length) {
        saveMobilePendingLearningHistoryEntries([]);
        return 0;
      }

      const pending = mobilePendingLearningHistoryEntries.slice();
      const remaining = [];
      let savedCount = 0;
      for (const entry of pending) {
        const resolved = await resolveMobileLearningHistoryDeviceInfoForSave();
        if (!resolved?.resolved) {
          remaining.push(entry);
          continue;
        }
        const normalized = normalizeMobileLearningHistoryEntryForSave(entry, resolved.deviceInfo);
        if (!normalized) {
          continue;
        }
        saveResolvedMobileLearningHistoryEntry(normalized);
        savedCount += 1;
      }

      saveMobilePendingLearningHistoryEntries(remaining);
      return savedCount;
    })();

    try {
      return await mobileLearningHistoryFlushPromise;
    } finally {
      mobileLearningHistoryFlushPromise = null;
    }
  }

  function parseMobileLearningHistoryEarnedPoints(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
    const text = String(value ?? "").trim();
    if (!text) return 0;
    const numeric = Number(text);
    if (Number.isFinite(numeric)) {
      return Math.max(0, Math.floor(numeric));
    }
    const ascii = text.replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xFEE0));
    const match = ascii.match(/[+-]?\d+(?:\.\d+)?/);
    if (!match) return 0;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
  }

  function sanitizeMobileLearningHistoryEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const startedAt = Number(raw.startedAt);
    const endedAt = Number(raw.endedAt);
    if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return null;
    return {
      learnedAt: typeof raw.learnedAt === "string" && raw.learnedAt ? raw.learnedAt : formatTimestampToJstDisplay(endedAt),
      startedAt,
      endedAt,
      startedAtDisplay: typeof raw.startedAtDisplay === "string" && raw.startedAtDisplay ? raw.startedAtDisplay : formatTimestampToJstDisplay(startedAt),
      endedAtDisplay: typeof raw.endedAtDisplay === "string" && raw.endedAtDisplay ? raw.endedAtDisplay : formatTimestampToJstDisplay(endedAt),
      activeStudySeconds: Math.max(0, Number(raw.activeStudySeconds) || 0),
      mode: typeof raw.mode === "string" ? raw.mode : "-",
      dayNumber: typeof raw.dayNumber === "string" ? raw.dayNumber : "",
      questionCount: Math.max(0, Number(raw.questionCount) || 0),
      correctCount: Math.max(0, Number(raw.correctCount) || 0),
      earnedPoints: parseMobileLearningHistoryEarnedPoints(raw.earnedPoints),
      accuracy: Math.max(0, Math.min(100, Number(raw.accuracy) || 0)),
      completedReason: raw.completedReason === "interrupted" ? "interrupted" : "completed",
      deviceType: normalizeMobileAdminLearningHistoryDeviceType(raw.deviceType),
      deviceId: String(raw.deviceId || "").trim(),
      deviceName: sanitizeMobileLearningHistoryDeviceName(raw.deviceName),
      ticket: {
        earned: {
          count: Math.max(0, Number(raw.ticket?.earned?.count) || 0)
        },
        used: {
          count: Math.max(0, Number(raw.ticket?.used?.count) || 0)
        }
      }
    };
  }

  function loadMobileLearningHistoryEntries() {
    try {
      const raw = window.localStorage.getItem(MOBILE_LEARNING_HISTORY_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(sanitizeMobileLearningHistoryEntry).filter(Boolean);
    } catch (_error) {
      return [];
    }
  }

  function getMobileLearningHistoryJstParts(timestamp) {
    const date = new Date(Number(timestamp) || Date.now());
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false
    });
    return Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  }

  function getMobileLearningHistoryDayKey(timestamp) {
    const parts = getMobileLearningHistoryJstParts(timestamp);
    return `${parts.year || "0000"}-${parts.month || "00"}-${parts.day || "00"}`;
  }

  function isIsoDayKey(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "").trim());
  }

  function parseMobileLearningHistoryDayNumberInfo(dayNumber) {
    const text = String(dayNumber || "").trim();
    if (!text) {
      return { weekNumber: null, dayKey: "" };
    }

    let match = /^W(\d+)\s+(\d{4}-\d{2}-\d{2})$/i.exec(text);
    if (match) {
      return {
        weekNumber: Number(match[1]) || null,
        dayKey: match[2]
      };
    }

    match = /^Week\s*(\d+)\s+(\d{4}-\d{2}-\d{2})$/i.exec(text);
    if (match) {
      return {
        weekNumber: Number(match[1]) || null,
        dayKey: match[2]
      };
    }

    if (isIsoDayKey(text)) {
      return { weekNumber: null, dayKey: text };
    }

    return { weekNumber: null, dayKey: "" };
  }

  function getWeekNumberFromSpeakingDayKey(dayKey) {
    if (!isIsoDayKey(dayKey)) return null;
    const week = getSpeakingWeeks().find((entry) => {
      const start = String(entry?.startDate || "").trim();
      const end = String(entry?.endDate || "").trim();
      return isIsoDayKey(start) && isIsoDayKey(end) && start <= dayKey && dayKey <= end;
    });
    const directWeekNumber = parseWeekNumber(week?.weekId || "");
    if (Number.isFinite(directWeekNumber)) {
      return directWeekNumber;
    }

    // When dayKey is outside currently defined speaking weeks, keep week labels stable
    // by extending weeks in 7-day blocks from the first known speaking week.
    const datedWeeks = getSpeakingWeeks()
      .map((entry) => {
        const start = String(entry?.startDate || "").trim();
        const weekNumber = parseWeekNumber(entry?.weekId || "");
        if (!isIsoDayKey(start) || !Number.isFinite(weekNumber)) return null;
        return { start, weekNumber };
      })
      .filter(Boolean)
      .sort((left, right) => (left.start < right.start ? -1 : left.start > right.start ? 1 : 0));

    if (!datedWeeks.length) return null;
    const anchor = datedWeeks[0];
    const anchorDate = new Date(`${anchor.start}T00:00:00+09:00`);
    const targetDate = new Date(`${dayKey}T00:00:00+09:00`);
    if (!Number.isFinite(anchorDate.getTime()) || !Number.isFinite(targetDate.getTime())) return null;
    const diffDays = Math.floor((targetDate.getTime() - anchorDate.getTime()) / (24 * 60 * 60 * 1000));
    const extendedWeek = anchor.weekNumber + Math.floor(diffDays / 7);
    return extendedWeek >= 1 ? extendedWeek : 1;
  }

  function getMobileLearningHistoryWeekDayContext(entry) {
    const parsed = parseMobileLearningHistoryDayNumberInfo(entry?.dayNumber);
    const fallbackDayKey = getMobileLearningHistoryDayKey(entry?.endedAt || entry?.startedAt || Date.now());
    const dayKey = isIsoDayKey(parsed.dayKey) ? parsed.dayKey : fallbackDayKey;
    const weekNumber = Number.isFinite(parsed.weekNumber)
      ? parsed.weekNumber
      : getWeekNumberFromSpeakingDayKey(dayKey);
    const weekdayBase = isIsoDayKey(dayKey) ? getJstWeekdayLabel(dayKey) : "";
    const weekday = weekdayBase && weekdayBase !== "?" ? `${weekdayBase}曜` : "-";
    return {
      weekLabel: Number.isFinite(weekNumber) ? `Week${weekNumber}` : "Week-",
      weekdayLabel: weekday,
      dayKey
    };
  }

  function stripMobileLearningHistoryWeekDayPrefix(modeLike) {
    return window.LearningHistoryDisplayShared?.stripPcWeekDayPrefix(modeLike) || String(modeLike || "").trim();
  }

  function isLikelyPcPhraseLearningHistoryEntry(entryLike) {
    return window.LearningHistoryDisplayShared?.isLikelyPhraseLearningHistoryEntry(entryLike) || false;
  }

  function resolveMobilePcLearningHistoryCategory(entry) {
    return window.LearningHistoryDisplayShared?.resolvePcCategory(entry?.mode, entry) || "不明";
  }

  function resolveMobilePcLearningHistoryModeLabel(entry) {
    return window.LearningHistoryDisplayShared?.resolvePcModeLabel(entry, { withDayNumber: true }) || "不明";
  }

  function getMobileAdminPcModeSummaryRows(summary, dayEntries) {
    const sharedEntries = window.LearningHistoryDisplayShared?.getPcModeSummaryEntries(summary) || [];
    const dayLabel = window.LearningHistoryDisplayShared?.resolvePcDaySummaryLabel(dayEntries || []) || "";
    return sharedEntries.map((entry) => ({
      label: window.LearningHistoryDisplayShared?.getPcSummaryRowLabel(entry, { dayLabel }) || String(entry?.label || "-"),
      activeStudySeconds: Math.max(0, Number(entry?.activeStudySeconds) || 0),
      questionCount: Math.max(0, Number(entry?.questionCount) || 0),
      earnedPoints: parseMobileLearningHistoryEarnedPoints(entry?.earnedPoints),
      accuracy: Math.max(0, Number(entry?.accuracy) || 0)
    }));
  }

  function resolveMobileLearningHistoryCategory(entry) {
    const mode = String(entry?.mode || "").trim();
    const lowerMode = mode.toLowerCase();
    const deviceType = normalizeMobileAdminLearningHistoryDeviceType(entry?.deviceType);
    if (deviceType === "pc") {
      return resolveMobilePcLearningHistoryCategory(entry);
    }

    if (mode === "会話練習" || lowerMode === "conversation") return "会話練習";
    if (mode === "過去の間違い" || mode === "復習" || lowerMode === "review") return "復習";
    if (mode.includes("語順") || lowerMode.includes("word-order") || lowerMode.includes("wordorder")) return "語順";
    if (mode.includes("和訳") || lowerMode.includes("translation")) return "和訳";

    const dayNumber = String(entry?.dayNumber || "").trim();
    const parsed = parseMobileLearningHistoryDayNumberInfo(dayNumber);
    if (mode === "スピーキング") {
      return parsed.dayKey ? "会話練習" : "Vocabulary";
    }
    if (mode.includes("単語") || mode.includes("熟語") || lowerMode === "typing" || /^day\d+/i.test(dayNumber)) {
      return "Vocabulary";
    }
    return mode || "-";
  }

  function buildMobileLearningHistoryStudyLabel(entry) {
    const mode = String(entry?.mode || "").trim();
    const deviceType = normalizeMobileAdminLearningHistoryDeviceType(entry?.deviceType);
    if (deviceType === "pc") {
      return {
        weekDayText: "",
        categoryText: resolveMobilePcLearningHistoryModeLabel(entry)
      };
    }
    const weekDay = getMobileLearningHistoryWeekDayContext(entry);
    const categoryText = resolveMobileLearningHistoryCategory(entry);
    const dayNumberText = String(entry?.dayNumber || "").trim();
    const shouldShowDayNumber = categoryText === "語順" || mode.includes("word-order") || mode.includes("wordorder");
    const shouldShowRangeDash = categoryText === "復習";
    const shouldHideWeekDay = categoryText === "和訳" || mode.includes("translation");
    return {
      weekDayText: shouldShowDayNumber && dayNumberText
        ? dayNumberText
        : (shouldShowRangeDash ? "－" : (shouldHideWeekDay ? "" : `${weekDay.weekLabel} ${weekDay.weekdayLabel}`)),
      categoryText
    };
  }

  function formatMobileLearningHistoryDateLabel(dayKey) {
    const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(dayKey || ""));
    if (!match) return String(dayKey || "");
    return `${Number(match[2])}/${Number(match[3])}`;
  }

  function formatMobileLearningHistoryClockRange(startedAt, endedAt) {
    const startValue = Number(startedAt);
    const endValue = Number(endedAt);
    const normalizedStart = Number.isFinite(startValue) && Number.isFinite(endValue)
      ? Math.min(startValue, endValue)
      : startedAt;
    const normalizedEnd = Number.isFinite(startValue) && Number.isFinite(endValue)
      ? Math.max(startValue, endValue)
      : endedAt;
    const startParts = getMobileLearningHistoryJstParts(normalizedStart);
    const endParts = getMobileLearningHistoryJstParts(normalizedEnd);
    const startClock = `${startParts.hour || "00"}:${startParts.minute || "00"}`;
    const endClock = `${endParts.hour || "00"}:${endParts.minute || "00"}`;
    const startClockRank = Number((startParts.hour || "00") + (startParts.minute || "00"));
    const endClockRank = Number((endParts.hour || "00") + (endParts.minute || "00"));
    if (Number.isFinite(startClockRank) && Number.isFinite(endClockRank) && startClockRank > endClockRank) {
      return `${endClock}〜${startClock}`;
    }
    return `${startClock}〜${endClock}`;
  }

  function formatMobileLearningHistoryStartClock(startedAt) {
    const parts = getMobileLearningHistoryJstParts(startedAt);
    return `${parts.hour || "00"}:${parts.minute || "00"}`;
  }

  function formatMobileLearningDurationMinutesSeconds(seconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
    const minute = Math.floor(safeSeconds / 60);
    const remain = safeSeconds % 60;
    return `${minute}分${remain}秒`;
  }

  function formatMobileLearningHistoryFullDateLabel(dayKey) {
    const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(dayKey || ""));
    if (!match) return String(dayKey || "");
    return `${match[1]}/${match[2]}/${match[3]}`;
  }

  function shiftMobileLearningHistoryDayKey(dayKey, deltaDays) {
    const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(dayKey || ""));
    if (!match) return String(dayKey || "");
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    date.setUTCDate(date.getUTCDate() + Number(deltaDays || 0));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }

  function createEmptyMobileLearningHistoryDaySummary(dayKey) {
    return finalizeMobileLearningHistoryDaySummary({
      dayKey,
      label: formatMobileLearningHistoryDateLabel(dayKey),
      activeStudySeconds: 0,
      questionCount: 0,
      correctCount: 0,
      modeTotals: createMobileLearningHistoryModeTotals(),
      entries: []
    });
  }

  function finalizeMobileLearningHistoryDaySummary(summary) {
    const nextSummary = finalizeMobileLearningHistoryTotals(summary);
    nextSummary.label = formatMobileLearningHistoryDateLabel(nextSummary.dayKey || nextSummary.label || "");
    Object.values(nextSummary.modeTotals || {}).forEach((modeEntry) => {
      modeEntry.accuracy = modeEntry.questionCount ? Math.round((modeEntry.correctCount / modeEntry.questionCount) * 100) : 0;
      modeEntry.activeStudyMinutes = Math.max(0, Math.round(modeEntry.activeStudySeconds / 60));
    });
    return nextSummary;
  }

  function getMobileLearningHistoryDaySummary(model, dayKey) {
    if (model?.dayMap?.has(dayKey)) {
      return finalizeMobileLearningHistoryDaySummary({ ...model.dayMap.get(dayKey), dayKey });
    }
    return createEmptyMobileLearningHistoryDaySummary(dayKey);
  }

  function getMobileLearningHistorySelectedDayTitle(dayKey, todayDayKey) {
    const label = formatMobileLearningHistoryFullDateLabel(dayKey);
    return dayKey === todayDayKey ? `今日（${label}）` : label;
  }

  function getMobileLearningHistoryModeBucket(entry) {
    const category = resolveMobileLearningHistoryCategory(entry);
    if (category === "Day学習") return { key: "day", label: "Day学習" };
    if (category === "追加特訓") return { key: "extra", label: "追加特訓" };
    if (category === "熟語特訓") return { key: "phrase", label: "熟語特訓" };
    if (category === "単語特訓") return { key: "word", label: "単語特訓" };
    if (category === "前置詞特訓") return { key: "preposition", label: "前置詞特訓" };
    if (category === "応答文特訓") return { key: "response", label: "応答文特訓" };
    if (category === "不規則動詞特訓") return { key: "irregularVerb", label: "不規則動詞特訓" };
    if (category === "過去の間違い") return { key: "reviewPc", label: "過去の間違い" };
    if (category === "Vocabulary") return { key: "vocabulary", label: "Vocabulary" };
    if (category === "会話練習") return { key: "conversation", label: "会話練習" };
    if (category === "復習") return { key: "review", label: "復習" };
    if (category === "語順") return { key: "wordOrder", label: "語順" };
    if (category === "和訳") return { key: "translation", label: "和訳" };
    const fallbackLabel = String(entry?.mode || "").trim() || "-";
    return { key: `mode:${fallbackLabel}`, label: fallbackLabel };
  }

  function createMobileLearningHistoryModeTotals() {
    return {
      day: { label: "Day学習", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      extra: { label: "追加特訓", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      phrase: { label: "熟語特訓", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      word: { label: "単語特訓", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      preposition: { label: "前置詞特訓", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      response: { label: "応答文特訓", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      irregularVerb: { label: "不規則動詞特訓", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      reviewPc: { label: "過去の間違い", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      vocabulary: { label: "Vocabulary", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      conversation: { label: "会話練習", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      review: { label: "復習", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      wordOrder: { label: "語順", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      translation: { label: "和訳", activeStudySeconds: 0, questionCount: 0, correctCount: 0 }
    };
  }

  function ensureMobileLearningHistoryModeTotal(modeTotals, bucketInfo) {
    if (!modeTotals || !bucketInfo?.key) return null;
    const existing = modeTotals[bucketInfo.key];
    if (existing && typeof existing === "object") {
      if (!String(existing.label || "").trim()) {
        existing.label = bucketInfo.label;
      }
      return existing;
    }
    const created = {
      label: String(bucketInfo.label || "-") || "-",
      activeStudySeconds: 0,
      questionCount: 0,
      correctCount: 0
    };
    modeTotals[bucketInfo.key] = created;
    return created;
  }

  function addMobileLearningHistoryTotals(target, entry) {
    if (!target || !entry) return;
    target.activeStudySeconds += Math.max(0, Number(entry.activeStudySeconds) || 0);
    target.questionCount += Math.max(0, Number(entry.questionCount) || 0);
    target.correctCount += Math.max(0, Number(entry.correctCount) || 0);
  }

  function finalizeMobileLearningHistoryTotals(entry) {
    const questionCount = Math.max(0, Number(entry.questionCount) || 0);
    const correctCount = Math.max(0, Number(entry.correctCount) || 0);
    return {
      ...entry,
      accuracy: questionCount ? Math.round((correctCount / questionCount) * 100) : 0,
      activeStudyMinutes: Math.max(0, Math.round(Math.max(0, Number(entry.activeStudySeconds) || 0) / 60))
    };
  }

  function buildMobileLearningHistoryInsights(entries) {
    const source = Array.isArray(entries) ? entries.slice().sort((left, right) => Number(right.endedAt) - Number(left.endedAt)) : [];
    const todayDayKey = getMobileLearningHistoryDayKey(Date.now());
    const monthParts = getMobileLearningHistoryJstParts(Date.now());
    const currentMonthKey = `${monthParts.year || "0000"}-${monthParts.month || "00"}`;
    const todayUtc = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());

    const dayMap = new Map();
    source.forEach((entry) => {
      const dayKey = getMobileLearningHistoryDayKey(entry.endedAt);
      if (!dayMap.has(dayKey)) {
        dayMap.set(dayKey, {
          dayKey,
          entries: [],
          activeStudySeconds: 0,
          questionCount: 0,
          correctCount: 0,
          modeTotals: createMobileLearningHistoryModeTotals()
        });
      }
      const bucket = dayMap.get(dayKey);
      bucket.entries.push(entry);
      addMobileLearningHistoryTotals(bucket, entry);
      const modeBucket = getMobileLearningHistoryModeBucket(entry);
      addMobileLearningHistoryTotals(ensureMobileLearningHistoryModeTotal(bucket.modeTotals, modeBucket), entry);
    });

    const daySummaries = [...dayMap.values()].map((summary) => finalizeMobileLearningHistoryTotals(summary));
    daySummaries.forEach((summary) => {
      Object.values(summary.modeTotals).forEach((modeEntry) => {
        modeEntry.accuracy = modeEntry.questionCount ? Math.round((modeEntry.correctCount / modeEntry.questionCount) * 100) : 0;
        modeEntry.activeStudyMinutes = Math.max(0, Math.round(modeEntry.activeStudySeconds / 60));
      });
    });

    const recentDaySummaries = daySummaries
      .filter((summary) => {
        const utc = Date.UTC(Number(summary.dayKey.slice(0, 4)), Number(summary.dayKey.slice(5, 7)) - 1, Number(summary.dayKey.slice(8, 10)));
        const diffDays = Math.floor((todayUtc - utc) / 86400000);
        return diffDays >= 0 && diffDays < 30;
      })
      .sort((left, right) => right.dayKey.localeCompare(left.dayKey))
      .slice(0, 7);

    const todaySummary = finalizeMobileLearningHistoryTotals({ activeStudySeconds: 0, questionCount: 0, correctCount: 0, modeTotals: createMobileLearningHistoryModeTotals() });
    source.filter((entry) => getMobileLearningHistoryDayKey(entry.endedAt) === todayDayKey).forEach((entry) => {
      addMobileLearningHistoryTotals(todaySummary, entry);
      const modeBucket = getMobileLearningHistoryModeBucket(entry);
      addMobileLearningHistoryTotals(ensureMobileLearningHistoryModeTotal(todaySummary.modeTotals, modeBucket), entry);
    });
    Object.values(todaySummary.modeTotals).forEach((modeEntry) => {
      modeEntry.accuracy = modeEntry.questionCount ? Math.round((modeEntry.correctCount / modeEntry.questionCount) * 100) : 0;
      modeEntry.activeStudyMinutes = Math.max(0, Math.round(modeEntry.activeStudySeconds / 60));
    });
    todaySummary.dayKey = todayDayKey;
    todaySummary.label = formatMobileLearningHistoryDateLabel(todayDayKey);
    todaySummary.accuracy = todaySummary.questionCount ? Math.round((todaySummary.correctCount / todaySummary.questionCount) * 100) : 0;
    todaySummary.activeStudyMinutes = Math.max(0, Math.round(todaySummary.activeStudySeconds / 60));

    const withinWeekEntries = source.filter((entry) => {
      const dayKey = getMobileLearningHistoryDayKey(entry.endedAt);
      const utc = Date.UTC(Number(dayKey.slice(0, 4)), Number(dayKey.slice(5, 7)) - 1, Number(dayKey.slice(8, 10)));
      const diffDays = Math.floor((todayUtc - utc) / 86400000);
      return diffDays >= 0 && diffDays < 7;
    });
    const withinMonthEntries = source.filter((entry) => getMobileLearningHistoryDayKey(entry.endedAt).slice(0, 7) === currentMonthKey);

    const buildTotals = (periodEntries) => {
      const summary = finalizeMobileLearningHistoryTotals({ activeStudySeconds: 0, questionCount: 0, correctCount: 0 });
      periodEntries.forEach((entry) => addMobileLearningHistoryTotals(summary, entry));
      summary.accuracy = summary.questionCount ? Math.round((summary.correctCount / summary.questionCount) * 100) : 0;
      summary.activeStudyMinutes = Math.max(0, Math.round(summary.activeStudySeconds / 60));
      return summary;
    };

    return {
      todaySummary,
      recentDaySummaries,
      weekSummary: buildTotals(withinWeekEntries),
      monthSummary: buildTotals(withinMonthEntries),
      dayMap,
      source
    };
  }

  function buildMobileLearningHistoryDetailEntries(dayEntries) {
    return (Array.isArray(dayEntries) ? dayEntries : [])
      .slice()
      .sort((left, right) => Number(left.startedAt || left.endedAt || 0) - Number(right.startedAt || right.endedAt || 0));
  }

  function saveMobileLearningHistoryEntries(entries) {
    const sanitized = Array.isArray(entries) ? entries.map(sanitizeMobileLearningHistoryEntry).filter(Boolean) : [];
    if (!sanitized.length) {
      window.localStorage.removeItem(MOBILE_LEARNING_HISTORY_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(
      MOBILE_LEARNING_HISTORY_STORAGE_KEY,
      JSON.stringify(sanitized.slice(-MOBILE_LEARNING_HISTORY_MAX_ENTRIES))
    );
  }

  async function appendMobileLearningHistoryEntry(entry) {
    const sanitized = sanitizeMobileLearningHistoryEntry(entry);
    if (!sanitized) return;
    if (Math.max(0, Number(sanitized.questionCount) || 0) === 0) {
      return;
    }

    const resolved = await resolveMobileLearningHistoryDeviceInfoForSave();
    if (!resolved?.resolved) {
      enqueueMobilePendingLearningHistoryEntry(sanitized);
      refreshMobileFamilyIdentityCache()
        .catch(() => false)
        .finally(() => {
          flushMobilePendingLearningHistoryEntries().catch(() => 0);
        });
      return;
    }

    const normalizedEntry = normalizeMobileLearningHistoryEntryForSave(sanitized, resolved.deviceInfo);
    if (!normalizedEntry) return;
    saveResolvedMobileLearningHistoryEntry(normalizedEntry);
    flushMobilePendingLearningHistoryEntries().catch(() => 0);
  }

  function startMobileLearningHistorySession(meta = {}) {
    const pointSummary = getMobilePointSummary();
    state.learningHistorySession = {
      source: String(meta.source || "other"),
      mode: String(meta.mode || "other"),
      dayNumber: String(meta.dayNumber || ""),
      startedAt: Number(meta.startedAt) || Date.now(),
      lastActivityAt: Number(meta.startedAt) || Date.now(),
      activeStudyMs: 0,
      isPaused: false,
      pausedAt: null,
      pointTotalEarnedAtStart: Math.max(0, Number(pointSummary?.totalEarned) || 0),
      ticketSnapshot: getMobileLearningTicketSnapshot(),
      meta: { ...meta }
    };
  }

  function accumulateMobileLearningActivityUntil(now = Date.now()) {
    const session = state.learningHistorySession;
    if (!session || session.isPaused) return;
    const safeNow = Number(now) || Date.now();
    const lastActivityAt = Number(session.lastActivityAt) || session.startedAt || safeNow;
    const delta = safeNow - lastActivityAt;
    if (delta > 0) {
      session.activeStudyMs += delta;
    }
    session.lastActivityAt = safeNow;
  }

  function pauseMobileLearningHistorySession(now = Date.now()) {
    const session = state.learningHistorySession;
    if (!session || session.isPaused) return;
    const safeNow = Number(now) || Date.now();
    accumulateMobileLearningActivityUntil(safeNow);
    session.isPaused = true;
    session.pausedAt = safeNow;
    session.lastActivityAt = null;
  }

  function resumeMobileLearningHistorySession(now = Date.now()) {
    const session = state.learningHistorySession;
    if (!session || !session.isPaused) return;
    const safeNow = Number(now) || Date.now();
    session.isPaused = false;
    session.pausedAt = null;
    session.lastActivityAt = safeNow;
  }

  function recordMobileLearningActivity() {
    accumulateMobileLearningActivityUntil(Date.now());
  }

  function finalizeMobileLearningHistorySession(options = {}) {
    const session = state.learningHistorySession;
    if (!session) return;
    const now = Number(options.endedAt) || Date.now();
    if (!session.isPaused) {
      accumulateMobileLearningActivityUntil(now);
    }

    const summary = options.summary || {};
    const currentPointSummary = getMobilePointSummary();
    const pointTotalAtStart = Math.max(0, Number(session.pointTotalEarnedAtStart) || 0);
    const currentTotalEarned = Math.max(0, Number(currentPointSummary?.totalEarned) || 0);
    const earnedPointsDelta = Math.max(0, currentTotalEarned - pointTotalAtStart);
    const summaryEarnedPoints = Object.prototype.hasOwnProperty.call(summary, "earnedPoints")
      ? parseMobileLearningHistoryEarnedPoints(summary.earnedPoints)
      : earnedPointsDelta;
    const entry = sanitizeMobileLearningHistoryEntry({
      learnedAt: formatTimestampToJstDisplay(now),
      startedAt: session.startedAt,
      endedAt: now,
      startedAtDisplay: formatTimestampToJstDisplay(session.startedAt),
      endedAtDisplay: formatTimestampToJstDisplay(now),
      activeStudySeconds: Math.round(session.activeStudyMs / 1000),
      mode: normalizeMobileLearningModeLabel(options.mode || session.mode, options.session || session.meta?.session || null),
      dayNumber: String(options.dayNumber || session.dayNumber || ""),
      questionCount: Math.max(0, Number(summary.questionCount) || 0),
      correctCount: Math.max(0, Number(summary.correctCount) || 0),
      earnedPoints: summaryEarnedPoints,
      accuracy: Math.max(0, Math.min(100, Number(summary.accuracy) || 0)),
      completedReason: options.completedReason === "interrupted" ? "interrupted" : "completed",
      deviceType: "mobile",
      deviceId: String(getMobileBrowserDeviceId() || "").trim(),
      deviceName: "",
      ticket: {
        earned: { count: 0 },
        used: { count: 0 }
      }
    });
    if (entry) {
      void appendMobileLearningHistoryEntry(entry);
    }
    state.learningHistorySession = null;
  }

  function getCurrentMobileLearningHistorySummary() {
    const session = state.session;
    if (session) {
      return {
        mode: normalizeMobileLearningModeLabel(session.mode, session),
        dayNumber: getMobileLearningDayNumberFromSession(session),
        questionCount: Math.max(0, Number(session.questions?.length) || 0),
        correctCount: Math.max(0, Number(session.stats?.firstTryCorrect) || 0) + Math.max(0, Number(session.stats?.secondTryCorrect) || 0),
        accuracy: (() => {
          const total = Math.max(0, Number(session.questions?.length) || 0);
          const correct = Math.max(0, Number(session.stats?.firstTryCorrect) || 0) + Math.max(0, Number(session.stats?.secondTryCorrect) || 0);
          return total ? Math.round((correct / total) * 100) : 0;
        })()
      };
    }

    if (isReviewSpeakingModeActive()) {
      const reviewSession = state.speakingReviewSession;
      const reviewQueue = Array.isArray(reviewSession?.reviewQueue) ? reviewSession.reviewQueue : [];
      const currentIndex = Math.max(0, Number(reviewSession?.currentIndex) || 0);
      const completed = Math.min(reviewQueue.length, currentIndex + (reviewSession?.lineIndex > 0 ? 1 : 0));
      return {
        mode: "過去の間違い",
        dayNumber: getMobileLearningHistoryDayNumberFromSpeakingProgress(reviewQueue[0] || {}),
        questionCount: completed,
        correctCount: completed,
        accuracy: completed > 0 ? 100 : 0
      };
    }

    if (state.speakingProgress) {
      const progress = state.speakingProgress;
      const week = getSpeakingProgressWeek();
      const currentConversation = getCurrentSpeakingConversation();
      const totalQuestions = Math.max(1, Number(progress.conversationOrder?.length) || 0);
      const completedQuestions = Math.max(0, Number(progress.completedConversationIds?.length) || 0) + Math.max(0, Number(progress.conversationIndex) || 0);
      const mode = isSpeakingLevel1Week(week) ? "スピーキング" : "会話練習";
      return {
        mode,
        dayNumber: getMobileLearningHistoryDayNumberFromSpeakingProgress(progress),
        questionCount: totalQuestions,
        correctCount: completedQuestions,
        accuracy: totalQuestions ? Math.round((completedQuestions / totalQuestions) * 100) : 0
      };
    }

    return null;
  }

  function parseVersionValueToTimestamp(value) {
    const source = String(value || "").trim();
    if (!source) return null;

    const numeric = Number(source);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }

    const toUtcFromJstParts = (year, month, day, hour, minute, second = 0) => Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 9,
      Number(minute),
      Number(second),
      0
    );

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(?:\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})$/i.test(source)) {
      const parsedUtc = Date.parse(source);
      return Number.isFinite(parsedUtc) ? parsedUtc : null;
    }

    if (/\b(UTC|GMT)\b/i.test(source)) {
      const parsedUtc = Date.parse(source);
      return Number.isFinite(parsedUtc) ? parsedUtc : null;
    }

    let match = source.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
    if (match) {
      const [, year, month, day, hour, minute] = match;
      return toUtcFromJstParts(year, month, day, hour, minute, 0);
    }

    match = source.match(/^(\d{4})-(\d{2})-(\d{2})[\sT](\d{2}):(\d{2})(?::(\d{2}))?(?:\s*JST)?$/i);
    if (match) {
      const [, year, month, day, hour, minute, second = "0"] = match;
      return toUtcFromJstParts(year, month, day, hour, minute, second);
    }

    match = source.match(/^(\d{2})\/(\d{2})(\d{2})\/(\d{2})(\d{2})$/);
    if (match) {
      const [, yy, month, day, hour, minute] = match;
      const fullYear = 2000 + Number(yy);
      return toUtcFromJstParts(fullYear, month, day, hour, minute, 0);
    }

    return null;
  }

  function formatVersionForJstDisplay(value) {
    const timestamp = parseVersionValueToTimestamp(value);
    if (!Number.isFinite(timestamp)) return String(value || "");
    return formatTimestampToJstDisplay(timestamp);
  }

  function getReleaseHistoryDayKey(entry) {
    const versionText = String(entry?.version || "").trim();
    const timestamp = parseVersionValueToTimestamp(versionText);
    if (Number.isFinite(timestamp)) {
      return formatTimestampToJstDisplay(timestamp).slice(0, 10);
    }
    return versionText.slice(0, 10);
  }

  function createReleaseHistorySummaryEntry(entries, label) {
    const source = Array.isArray(entries) ? entries : [];
    if (!source.length) return null;

    const previewNotes = source
      .map((entry) => String(entry?.note || "").trim())
      .filter(Boolean);
    const noteText = previewNotes.length ? previewNotes.join(" / ") : `更新内容を${source.length}件まとめて表示`;

    return {
      version: source[0].version,
      note: label ? `${label} ${noteText}` : noteText
    };
  }

  function buildReleaseHistoryDisplayEntries(entries) {
    const source = Array.isArray(entries) ? entries : [];
    if (!source.length) return [];

    const grouped = [];
    const today = formatTimestampToJstDisplay(Date.now()).slice(0, 10);

    for (let index = 0; index < source.length; ) {
      const dayKey = getReleaseHistoryDayKey(source[index]);
      let endIndex = index + 1;
      while (endIndex < source.length && getReleaseHistoryDayKey(source[endIndex]) === dayKey) {
        endIndex += 1;
      }

      const dayEntries = source.slice(index, endIndex);
      if (index === 0 && dayKey === today && dayEntries.length >= 9) {
        grouped.push(...dayEntries.slice(0, 4));
        const summaryEntry = createReleaseHistorySummaryEntry(dayEntries.slice(4), `${dayKey}分まとめ`);
        if (summaryEntry) grouped.push(summaryEntry);
      } else if (dayEntries.length >= 2) {
        const summaryEntry = createReleaseHistorySummaryEntry(dayEntries, `${dayKey}分まとめ`);
        if (summaryEntry) grouped.push(summaryEntry);
      } else {
        grouped.push(...dayEntries);
      }

      index = endIndex;
    }

    return grouped;
  }

  function hideMobileUpdateHistory() {
    if (elements.mobileUpdateHistoryPanel) {
      elements.mobileUpdateHistoryPanel.classList.add("hidden");
      elements.mobileUpdateHistoryPanel.innerHTML = "";
    }
    if (elements.mobileUpdateHistoryStatusText) {
      elements.mobileUpdateHistoryStatusText.textContent = "";
      elements.mobileUpdateHistoryStatusText.classList.add("hidden");
    }
  }

  function renderMobileVersionInfo() {
    if (elements.mobileVersionText) {
      elements.mobileVersionText.textContent = formatVersionForJstDisplay(APP_VERSION);
    }
  }

  function unlockMobileUpdateHistory() {
    if (!elements.mobileUpdateHistoryPasswordInput || !elements.mobileUpdateHistoryPanel) return;
    if (elements.mobileUpdateHistoryPasswordInput.value !== SETTINGS_INFO.adminPassword) {
      hideMobileUpdateHistory();
      if (elements.mobileUpdateHistoryStatusText) {
        elements.mobileUpdateHistoryStatusText.textContent = "パスワードが違います。";
        elements.mobileUpdateHistoryStatusText.classList.remove("hidden");
      }
      return;
    }

    const historyMarkup = buildReleaseHistoryDisplayEntries(SETTINGS_INFO.releaseHistory)
      .map((entry) => `<li><span class="settings-history-version">${formatVersionForJstDisplay(entry.version)}</span><span>${entry.note}</span></li>`)
      .join("");
    elements.mobileUpdateHistoryPanel.innerHTML = `<ul class="settings-history-list">${historyMarkup}</ul>`;
    elements.mobileUpdateHistoryPanel.classList.remove("hidden");
    if (elements.mobileUpdateHistoryStatusText) {
      elements.mobileUpdateHistoryStatusText.textContent = "";
      elements.mobileUpdateHistoryStatusText.classList.add("hidden");
    }
  }

  function hideMobileAdminLearningHistory() {
    if (elements.mobileAdminLearningHistoryPanel) {
      elements.mobileAdminLearningHistoryPanel.classList.add("hidden");
      elements.mobileAdminLearningHistoryPanel.innerHTML = "";
    }
    if (elements.mobileAdminLearningHistoryStatusText) {
      elements.mobileAdminLearningHistoryStatusText.textContent = "";
      elements.mobileAdminLearningHistoryStatusText.classList.add("hidden");
    }
  }

  function renderMobileAdminLearningHistoryList() {
    if (!elements.mobileAdminLearningHistoryPanel) return;
    const todayDayKey = getMobileLearningHistoryDayKey(Date.now());
    const entries = getMobileAdminLearningHistoryFilteredEntries((Array.isArray(mobileAdminLearningHistorySourceEntries) ? mobileAdminLearningHistorySourceEntries : [])
      .slice()
      .sort((left, right) => Number(right.createdAt || right.endedAt || 0) - Number(left.createdAt || left.endedAt || 0)));
    if (!entries.length) {
      elements.mobileAdminLearningHistoryPanel.innerHTML = '<p class="status-text">履歴はありません</p>';
      elements.mobileAdminLearningHistoryPanel.classList.remove("hidden");
      return;
    }

    const model = buildMobileLearningHistoryInsights(entries);
    if (!mobileAdminLearningHistorySelectedDayKey || !/^\d{4}-\d{2}-\d{2}$/.test(mobileAdminLearningHistorySelectedDayKey) || mobileAdminLearningHistorySelectedDayKey > todayDayKey) {
      mobileAdminLearningHistorySelectedDayKey = todayDayKey;
    }

    const selectedDayKey = mobileAdminLearningHistorySelectedDayKey <= todayDayKey ? mobileAdminLearningHistorySelectedDayKey : todayDayKey;
    mobileAdminLearningHistorySelectedDayKey = selectedDayKey;
    const selectedDaySummary = getMobileLearningHistoryDaySummary(model, selectedDayKey);
    const selectedDayEntries = buildMobileLearningHistoryDetailEntries(selectedDaySummary?.entries || []);
    const isPcHistoryView = mobileAdminLearningHistorySelectedDeviceType === "pc";
    const pcModeSummaryRows = isPcHistoryView
      ? getMobileAdminPcModeSummaryRows(selectedDaySummary, selectedDaySummary?.entries || [])
      : [];
    const canMoveNext = shiftMobileLearningHistoryDayKey(selectedDayKey, 1) <= todayDayKey;
    const selectedDayHasEntries = selectedDayEntries.length > 0;

    elements.mobileAdminLearningHistoryPanel.innerHTML = `
      <div class="mobile-admin-history-view">
        ${renderMobileAdminLearningHistoryControls()}
        <section class="mobile-admin-history-overview">
          <div class="mobile-admin-history-streak-row">🔥連続${state.stats.streak || 0}日</div>
          <div class="mobile-admin-history-period-blocks">
            <div class="mobile-admin-history-period-block">
              <p class="mobile-admin-history-period-label">今週</p>
              <p class="mobile-admin-history-period-value">${formatMobileLearningDuration(model.weekSummary.activeStudySeconds)}</p>
              <p class="mobile-admin-history-period-meta">${model.weekSummary.questionCount}問 ${model.weekSummary.accuracy}%</p>
            </div>
            <div class="mobile-admin-history-period-block">
              <p class="mobile-admin-history-period-label">今月</p>
              <p class="mobile-admin-history-period-value">${formatMobileLearningDuration(model.monthSummary.activeStudySeconds)}</p>
              <p class="mobile-admin-history-period-meta">${model.monthSummary.questionCount}問 ${model.monthSummary.accuracy}%</p>
            </div>
          </div>
        </section>

        <section class="mobile-admin-history-today-section">
          <div class="mobile-admin-history-date-switch">
            <div class="mobile-admin-history-date-title-wrap">
              <h3>📅 ${getMobileLearningHistorySelectedDayTitle(selectedDayKey, todayDayKey)}</h3>
            </div>
            <div class="mobile-admin-history-date-nav">
              <button class="mobile-admin-history-date-nav-btn" type="button" data-day-shift="prev">◀ 前日</button>
              <button class="mobile-admin-history-date-nav-btn" type="button" data-day-shift="next"${canMoveNext ? "" : " disabled"}>▶ 次の日</button>
            </div>
          </div>
          <div class="mobile-admin-history-selected-summary">
            ${selectedDayHasEntries ? `
              <div class="mobile-admin-history-total-stats">
                <span>${formatMobileLearningDuration(selectedDaySummary.activeStudySeconds)}</span>
                <span>${selectedDaySummary.questionCount}問</span>
                ${isPcHistoryView ? `<span>+${Math.max(0, Number(selectedDaySummary.earnedPoints) || 0)}P</span>` : ""}
                <span>${selectedDaySummary.accuracy}%</span>
              </div>
              <div class="mobile-admin-history-mode-summary-list">
                ${(isPcHistoryView ? pcModeSummaryRows : Object.values(selectedDaySummary.modeTotals).filter((entry) => entry.questionCount > 0 || entry.activeStudySeconds > 0)).map((entry) => `
                  <div class="mobile-admin-history-mode-summary-row">
                    <span>${escapeHtml(entry.label)}</span>
                    <span>${escapeHtml(formatMobileLearningDuration(entry.activeStudySeconds))}</span>
                    <span>${entry.questionCount}問</span>
                    ${isPcHistoryView ? `<span>+${Math.max(0, Number(entry.earnedPoints) || 0)}P</span>` : ""}
                    <span>${entry.accuracy}%</span>
                  </div>
                `).join("")}
              </div>
            ` : '<p class="status-text">この日は学習記録がありません</p>'}
          </div>
        </section>

        <section class="mobile-admin-history-detail-section">
          <div class="mobile-admin-history-section-header">
            <h3>日別詳細</h3>
            <p class="mobile-admin-history-detail-date">${formatMobileLearningHistoryDateLabel(selectedDaySummary?.dayKey || selectedDayKey)}</p>
          </div>
          <article class="admin-learning-history-card">
            <div class="mobile-admin-history-detail-list">
              ${selectedDayHasEntries ? selectedDayEntries.map((entry) => {
                const completionLabel = entry.completedReason === "interrupted" ? "中断" : "完了";
                const activeStudySeconds = Math.max(0, Number(entry.activeStudySeconds) || 0);
                const rawQuestionCount = Math.max(0, Number(entry.questionCount) || 0);
                const rawCorrectCount = Math.max(0, Number(entry.correctCount) || 0);
                const isReviewCategory = resolveMobileLearningHistoryCategory(entry) === "復習";
                const questionCount = isReviewCategory ? rawCorrectCount : rawQuestionCount;
                const correctCount = Math.max(0, Math.min(questionCount, rawCorrectCount));
                const accuracyPercent = questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0;
                const earnedPoints = parseMobileLearningHistoryEarnedPoints(entry.earnedPoints);
                const studyLabel = buildMobileLearningHistoryStudyLabel(entry);
                const startClock = formatMobileLearningHistoryStartClock(entry.startedAt);
                return `
                  <div class="mobile-admin-history-detail-item">
                    <p class="mobile-admin-history-detail-row mobile-admin-history-detail-row-main">
                      <span class="mobile-admin-history-detail-time">${startClock}～</span>
                      ${studyLabel.weekDayText ? `<span class="mobile-admin-history-detail-meta">${escapeHtml(studyLabel.weekDayText)}</span>` : ""}
                      <span class="mobile-admin-history-detail-mode">${escapeHtml(studyLabel.categoryText)}</span>
                      <span class="mobile-admin-history-detail-meta">実学習 ${formatMobileLearningDurationMinutesSeconds(activeStudySeconds)}</span>
                    </p>
                    <p class="mobile-admin-history-detail-row mobile-admin-history-detail-row-sub">
                      <span class="mobile-admin-history-detail-meta">${correctCount}/${questionCount}正解（${accuracyPercent}%）</span>
                      <span class="mobile-admin-history-detail-meta">+${earnedPoints}P</span>
                      <span class="mobile-admin-history-detail-meta">${completionLabel}</span>
                    </p>
                  </div>
                `;
              }).join('<div class="mobile-admin-history-detail-separator"></div>') : '<p class="status-text">この日は学習記録がありません</p>'}
            </div>
          </article>
        </section>
      </div>
    `;

    elements.mobileAdminLearningHistoryPanel.querySelectorAll("[data-day-shift]").forEach((button) => {
      button.addEventListener("click", () => {
        const shift = button.getAttribute("data-day-shift");
        const todayKey = getMobileLearningHistoryDayKey(Date.now());
        const currentDayKey = /^\d{4}-\d{2}-\d{2}$/.test(String(mobileAdminLearningHistorySelectedDayKey || ""))
          ? String(mobileAdminLearningHistorySelectedDayKey)
          : todayKey;
        if (shift === "prev") {
          mobileAdminLearningHistorySelectedDayKey = shiftMobileLearningHistoryDayKey(currentDayKey, -1);
        } else if (shift === "next" && canMoveNext) {
          mobileAdminLearningHistorySelectedDayKey = shiftMobileLearningHistoryDayKey(currentDayKey, 1);
        }
        if (mobileAdminLearningHistorySelectedDayKey > todayKey) {
          mobileAdminLearningHistorySelectedDayKey = todayKey;
        }
        renderMobileAdminLearningHistoryList();
      });
    });
    bindMobileAdminLearningHistoryControls();
    elements.mobileAdminLearningHistoryPanel.classList.remove("hidden");
  }

  async function unlockMobileAdminLearningHistory() {
    if (!elements.mobileAdminLearningHistoryPanel) return;
    const currentUser = typeof window.getMobileFirebaseCurrentUser === "function"
      ? window.getMobileFirebaseCurrentUser()
      : (window.MobileFirebase?.auth?.currentUser || null);
    const currentUid = String(currentUser?.uid || "").trim();
    if (!currentUid) {
      mobileAdminLearningHistorySourceEntries = [];
      mobileAdminLearningHistorySelectedDayKey = "";
      if (elements.mobileAdminLearningHistoryStatusText) {
        elements.mobileAdminLearningHistoryStatusText.textContent = "認証状態を確認しています...";
        elements.mobileAdminLearningHistoryStatusText.classList.remove("hidden");
      }
      hideMobileAdminLearningHistory();
      return;
    }

    if (elements.mobileAdminLearningHistoryStatusText) {
      elements.mobileAdminLearningHistoryStatusText.textContent = "読み込み中...";
      elements.mobileAdminLearningHistoryStatusText.classList.remove("hidden");
    }
    try {
      const options = await loadMobileAdminFamilyOptionsFromFirestore();
      mobileAdminLearningHistoryFamilyChildren = options;
      if (!mobileAdminLearningHistoryFamilyChildren.length) {
        throw new Error("family options unavailable");
      }

      const selectedParent = mobileAdminLearningHistoryFamilyChildren.find((child) => child.key === "parent") || null;
      const selectedSon = mobileAdminLearningHistoryFamilyChildren.find((child) => child.key === "son") || null;
      const isChildLogin = Boolean(selectedSon?.uid && currentUid && selectedSon.uid === currentUid);

      const selected = isChildLogin
        ? (selectedSon || mobileAdminLearningHistoryFamilyChildren[0])
        : (mobileAdminLearningHistoryFamilyChildren.find((child) => child.key === mobileAdminLearningHistorySelectedChildKey)
          || selectedParent
          || mobileAdminLearningHistoryFamilyChildren[0]);
      mobileAdminLearningHistorySelectedChildKey = isChildLogin ? "son" : selected.key;
      mobileAdminLearningHistorySelectedChildUid = isChildLogin ? currentUid : selected.uid;
      mobileAdminLearningHistorySelectedDeviceType = isChildLogin ? "mobile" : "pc";
      mobileAdminLearningHistorySelectedDayKey = "";
      mobileAdminLearningHistorySourceEntries = await loadMobileAdminLearningHistoryEntriesFromFirestore(mobileAdminLearningHistorySelectedChildUid);
      renderMobileAdminLearningHistoryList();
      if (elements.mobileAdminLearningHistoryStatusText) {
        elements.mobileAdminLearningHistoryStatusText.textContent = "";
        elements.mobileAdminLearningHistoryStatusText.classList.add("hidden");
      }
    } catch (_error) {
      hideMobileAdminLearningHistory();
      if (elements.mobileAdminLearningHistoryStatusText) {
        elements.mobileAdminLearningHistoryStatusText.textContent = "履歴の取得に失敗しました。";
        elements.mobileAdminLearningHistoryStatusText.classList.remove("hidden");
      }
    }
  }

  function renderMobileAdminLearningHistoryScreen() {
    hideMobileAdminLearningHistory();
    showScreen("mobileAdminLearningHistoryScreen");
    unlockMobileAdminLearningHistory();
  }

  function getMobileAdminLearningHistoryDeviceOptions() {
    return [
      { key: "pc", label: "PC版" },
      { key: "mobile", label: "モバイル版" }
    ];
  }

  function normalizeMobileAdminLearningHistoryDeviceType(deviceType) {
    return String(deviceType || "").trim().toLowerCase() === "mobile" ? "mobile" : "pc";
  }

  function getMobileAdminLearningHistoryFilteredEntries(entries) {
    const source = Array.isArray(entries) ? entries : [];
    return source.filter((entry) => normalizeMobileAdminLearningHistoryDeviceType(entry?.deviceType) === mobileAdminLearningHistorySelectedDeviceType);
  }

  function buildMobileAdminFamilyOptions(family, currentUser) {
    const familyChildren = Array.isArray(family?.children) ? family.children : [];
    const sonEntry = familyChildren.find((child) => child?.key === "son" && child?.uid);
    const currentUid = String(currentUser?.uid || "").trim();
    const parentUid = String(family?.parentUid || "").trim();
    const sonUid = String(sonEntry?.uid || "").trim();
    const isParentLogin = Boolean(currentUid && parentUid && currentUid === parentUid);
    const isChildLogin = Boolean(currentUid && sonUid && currentUid === sonUid);
    const options = [];
    if (isChildLogin) {
      options.push({ key: "son", name: "長男", uid: currentUid });
      return options;
    }
    if (isParentLogin && parentUid) {
      options.push({ key: "parent", name: "私", uid: String(family.parentUid || "").trim() });
    }
    if (sonEntry?.uid) {
      options.push({ key: "son", name: "長男", uid: String(sonEntry.uid || "").trim() });
    }
    if (!options.length && String(currentUser?.uid || "").trim()) {
      options.push({ key: "parent", name: "私", uid: String(currentUser.uid || "").trim() });
    }
    return options;
  }

  function renderMobileAdminLearningHistoryControls() {
    const userButtons = mobileAdminLearningHistoryFamilyChildren.length
      ? mobileAdminLearningHistoryFamilyChildren.map((child) => {
        const isSelected = child.key === mobileAdminLearningHistorySelectedChildKey;
        return `<button class="admin-history-toggle-btn${isSelected ? " is-active" : ""}" type="button" data-mobile-admin-history-user-key="${escapeHtml(child.key)}" aria-pressed="${isSelected ? "true" : "false"}">${escapeHtml(child.name || child.key)}</button>`;
      }).join("")
      : '<p class="status-text">表示できるユーザーがありません</p>';
    const deviceButtons = getMobileAdminLearningHistoryDeviceOptions().map((device) => {
      const isSelected = device.key === mobileAdminLearningHistorySelectedDeviceType;
      return `<button class="admin-history-toggle-btn${isSelected ? " is-active" : ""}" type="button" data-mobile-admin-history-device-key="${escapeHtml(device.key)}" aria-pressed="${isSelected ? "true" : "false"}">${escapeHtml(device.label)}</button>`;
    }).join("");
    return `
      <div class="admin-learning-history-controls">
        <div class="admin-learning-history-user-row">
          <label class="status-text">表示するユーザー</label>
          <div class="admin-history-toggle-group" role="group" aria-label="表示するユーザー">${userButtons}</div>
        </div>
        <div class="admin-learning-history-device-row">
          <label class="status-text">表示する端末</label>
          <div class="admin-history-toggle-group" role="group" aria-label="表示する端末">${deviceButtons}</div>
        </div>
      </div>
    `;
  }

  function bindMobileAdminLearningHistoryControls() {
    const root = elements.mobileAdminLearningHistoryPanel;
    if (!root) return;

    root.querySelectorAll("[data-mobile-admin-history-user-key]").forEach((button) => {
      button.addEventListener("click", async () => {
        const nextKey = String(button.getAttribute("data-mobile-admin-history-user-key") || "");
        const selectedChild = mobileAdminLearningHistoryFamilyChildren.find((child) => child.key === nextKey) || null;
        if (!selectedChild || selectedChild.key === mobileAdminLearningHistorySelectedChildKey) return;
        mobileAdminLearningHistorySelectedChildKey = selectedChild.key;
        mobileAdminLearningHistorySelectedChildUid = selectedChild.uid;
        mobileAdminLearningHistorySelectedDayKey = "";
        mobileAdminLearningHistorySourceEntries = await loadMobileAdminLearningHistoryEntriesFromFirestore(selectedChild.uid);
        renderMobileAdminLearningHistoryList();
      });
    });

    root.querySelectorAll("[data-mobile-admin-history-device-key]").forEach((button) => {
      button.addEventListener("click", () => {
        const nextKey = String(button.getAttribute("data-mobile-admin-history-device-key") || "");
        if (!nextKey || nextKey === mobileAdminLearningHistorySelectedDeviceType) return;
        mobileAdminLearningHistorySelectedDeviceType = nextKey === "mobile" ? "mobile" : "pc";
        mobileAdminLearningHistorySelectedDayKey = "";
        renderMobileAdminLearningHistoryList();
      });
    });
  }

  async function getMobileFirestoreSdk() {
    if (!mobileFirestoreSdkPromise) {
      mobileFirestoreSdkPromise = import("https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js");
    }
    return mobileFirestoreSdkPromise;
  }

  async function loadMobileAdminFamilyOptionsFromFirestore() {
    const user = typeof window.getMobileFirebaseCurrentUser === "function"
      ? window.getMobileFirebaseCurrentUser()
      : (window.MobileFirebase?.auth?.currentUser || null);
    const firestore = window.MobileFirebase?.firestore || null;
    const currentUid = String(user?.uid || "").trim();
    const path = "families/inoue";
    if (!currentUid || !firestore) {
      console.log("[Family DEBUG]\npath:", path, "\nfamilyUid:", "", "\ncurrentUid:", currentUid, "\nauthState:", user ? "logged-in" : "logged-out");
      return [];
    }

    console.log("[Family DEBUG]\npath:", path, "\nfamilyUid:", "", "\ncurrentUid:", currentUid, "\nauthState:", user ? "logged-in" : "logged-out");
    try {
      const sdk = await getMobileFirestoreSdk();
      const familyDoc = await sdk.getDoc(sdk.doc(firestore, "families", MOBILE_ADMIN_FAMILY_ID));
      const familyData = familyDoc.exists() ? {
        parentUid: String(familyDoc.data()?.parentUid || ""),
        children: Object.entries(familyDoc.data()?.children || {}).map(([key, value]) => ({
          key: String(key || ""),
          uid: String(value?.uid || "")
        }))
      } : null;
      const sonUid = familyDoc.exists() ? String(familyDoc.data()?.children?.son?.uid || "").trim() : "";
      console.log("[Family DEBUG]\npath:", path, "\nfamilyUid:", sonUid, "\ncurrentUid:", currentUid, "\nauthState:", user ? "logged-in" : "logged-out");
      writeMobileCachedSonUid(sonUid);
      return buildMobileAdminFamilyOptions(familyData, user);
    } catch (error) {
      console.error("[Family ERROR]\ncode:", error?.code || "", "\nmessage:", error?.message || "", "\npath:", path);
      throw error;
    }
  }

  function normalizeMobileAdminLearningHistoryFirestoreEntry(docSnapshot) {
    const data = typeof docSnapshot?.data === "function" ? docSnapshot.data() || {} : {};
    const createdAtMillis = typeof data.createdAt?.toMillis === "function"
      ? Number(data.createdAt.toMillis()) || 0
      : Math.max(0, Number(data.createdAt?.seconds) || 0) * 1000;
    const startedAt = Math.max(0, Number(data.startedAt) || 0);
    const endedAt = Math.max(0, Number(data.endedAt) || 0);
    const normalizedDeviceType = normalizeMobileAdminLearningHistoryDeviceType(data.deviceType);
    return {
      id: String(docSnapshot?.id || ""),
      uid: String(data.uid || ""),
      email: String(data.email || ""),
      learnedAt: String(data.studyDate || ""),
      startedAt,
      endedAt,
      activeStudySeconds: Math.max(0, Number(data.activeStudySeconds) || 0),
      mode: String(data.mode || ""),
      dayNumber: String(data.dayNumber || ""),
      questionCount: Math.max(0, Number(data.questionCount) || 0),
      correctCount: Math.max(0, Number(data.correctCount) || 0),
      earnedPoints: parseMobileLearningHistoryEarnedPoints(data.earnedPoints),
      accuracy: Math.max(0, Math.min(100, Number(data.accuracy) || 0)),
      completedReason: String(data.completedReason || "completed"),
      ticket: {
        earned: { count: Math.max(0, Number(data.ticketEarned) || 0) },
        used: { count: Math.max(0, Number(data.ticketUsed) || 0) }
      },
      deviceType: normalizedDeviceType,
      deviceId: String(data.deviceId || "").trim(),
      deviceName: sanitizeMobileLearningHistoryDeviceName(data.deviceName),
      createdAt: createdAtMillis
    };
  }

  async function loadMobileAdminLearningHistoryEntriesFromFirestore(targetUid) {
    const currentUser = typeof window.getMobileFirebaseCurrentUser === "function"
      ? window.getMobileFirebaseCurrentUser()
      : (window.MobileFirebase?.auth?.currentUser || null);
    const currentUid = String(currentUser?.uid || "").trim();
    const resolvedUid = String(targetUid || "").trim();
    const safeTargetUid = resolvedUid || currentUid;
    const firestore = window.MobileFirebase?.firestore || null;
    const path = safeTargetUid ? `users/${safeTargetUid}/learningHistory` : "users/<unknown>/learningHistory";
    if (!safeTargetUid || !firestore) {
      console.log("[LearningHistory DEBUG]\ncurrentUid:", currentUid, "\ntargetUid:", safeTargetUid, "\nfamilyUid:", "", "\npath:", path, "\nauthState:", currentUser ? "logged-in" : "logged-out");
      return [];
    }

    console.log("[LearningHistory DEBUG]\ncurrentUid:", currentUid, "\ntargetUid:", safeTargetUid, "\nfamilyUid:", "", "\npath:", path, "\nauthState:", currentUser ? "logged-in" : "logged-out");
    try {
      const sdk = await getMobileFirestoreSdk();
      const snapshot = await sdk.getDocs(sdk.query(sdk.collection(firestore, "users", safeTargetUid, "learningHistory"), sdk.orderBy("createdAt", "desc")));
      return snapshot.docs.map(normalizeMobileAdminLearningHistoryFirestoreEntry);
    } catch (error) {
      console.error("[LearningHistory ERROR]\ncode:", error?.code || "", "\nmessage:", error?.message || "", "\ncurrentUid:", currentUid, "\ntargetUid:", safeTargetUid, "\npath:", path);
      throw error;
    }
  }

  function createDefaultMobileState() {
    return {
      settings: {
        rangeMode: "auto",
        startDay: MOBILE_DAY_MIN,
        endDay: MOBILE_DAY_MAX,
        speechRateMode: "slow"
      },
      stats: {
        studySessions: 0,
        questionCount: 0,
        firstTryCorrect: 0,
        secondTryCorrect: 0,
        fullyIncorrect: 0
      },
      vocabularyStudy: null
    };
  }

  function createDefaultSpeakingUiState() {
    return {
      selectedConversationWeekId: "",
      selectedConversationDayKeys: [],
      activeConversationDayKeys: [],
      vocabularyRangeMode: "auto",
      startDay: MOBILE_DAY_MIN,
      endDay: MOBILE_DAY_MAX,
      speakingWordSelectedWeekId: SPEAKING_WORD_DEFAULT_WEEK_ID,
      speakingWordSelectedDayKey: SPEAKING_WORD_DEFAULT_DAY_KEY,
      speakingWordDaySelectBackTarget: "week-select",
      speakingWordPractice: null
    };
  }

  function clampDay(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return MOBILE_DAY_MIN;
    return Math.max(MOBILE_DAY_MIN, Math.min(MOBILE_DAY_MAX, Math.round(numeric)));
  }

  function clampWeek(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return SPEAKING_WEEK_MIN;
    return Math.max(SPEAKING_WEEK_MIN, Math.min(SPEAKING_WEEK_MAX, Math.round(numeric)));
  }

  function sanitizeMobileState(raw) {
    const fallback = createDefaultMobileState();
    const source = raw && typeof raw === "object" ? raw : {};
    const rangeMode = source.settings?.rangeMode === "day" ? "day" : "auto";
    let startDay = clampDay(source.settings?.startDay);
    let endDay = clampDay(source.settings?.endDay);
    if (startDay > endDay) {
      const minDay = Math.min(startDay, endDay);
      const maxDay = Math.max(startDay, endDay);
      startDay = minDay;
      endDay = maxDay;
    }
    const sanitizedStudy = sanitizeVocabularyStudyState(source.vocabularyStudy);
    const loadedVocabularyStudy = sanitizedStudy
      ? mergeVocabularyStudyStateWithCurrentBank(sanitizedStudy, getVocabularyRealWordBank())
      : buildVocabularyRealStudyState();
    return {
      settings: {
        rangeMode,
        startDay,
        endDay,
        speechRateMode: source.settings?.speechRateMode === "normal" ? "normal" : fallback.settings.speechRateMode
      },
      stats: {
        studySessions: Math.max(0, Number(source.stats?.studySessions) || 0),
        questionCount: Math.max(0, Number(source.stats?.questionCount) || 0),
        firstTryCorrect: Math.max(0, Number(source.stats?.firstTryCorrect) || 0),
        secondTryCorrect: Math.max(0, Number(source.stats?.secondTryCorrect) || 0),
        fullyIncorrect: Math.max(0, Number(source.stats?.fullyIncorrect) || 0)
      },
      vocabularyStudy: loadedVocabularyStudy
    };
  }

  function getCurrentVocabularyStateOwnerUid() {
    return String(vocabularyStateOwnerUid || "").trim();
  }

  function isVocabularyStateOwnerCurrentUid(uid = getCurrentMobileFirebaseUser()?.uid || "") {
    const currentUid = String(uid || getCurrentMobileFirebaseUser()?.uid || "").trim();
    const ownerUid = String(vocabularyStateOwnerUid || "").trim();
    return Boolean(currentUid) && (!ownerUid || ownerUid === currentUid);
  }

  function detachVocabularyRuntimeStateForUserSwitch(nextUid = getCurrentMobileFirebaseUser()?.uid || "") {
    const currentUid = String(nextUid || "").trim();
    const ownerUid = String(vocabularyStateOwnerUid || "").trim();
    if (!currentUid || !ownerUid || ownerUid === currentUid) {
      return;
    }
    state.teacherCheckSession = null;
    state.vocabularyStudy = null;
    state.vocabularyTodayHistoryMap = {};
    vocabularyStateOwnerUid = "";
    vocabularyTodayHistoryOwnerUid = "";
  }

  function loadState() {
    const currentUid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
    const raw = window.localStorage.getItem(MOBILE_STORAGE_KEY);
    if (currentUid && vocabularyStateOwnerUid && vocabularyStateOwnerUid !== currentUid) {
      state.teacherCheckSession = null;
      state.vocabularyStudy = null;
      state.vocabularyTodayHistoryMap = {};
      vocabularyStateOwnerUid = "";
      vocabularyTodayHistoryOwnerUid = "";
    }
    if (currentUid) {
      const uidStudy = loadMobileVocabularyStateForSync(currentUid);
      const uidHistory = readVocabularyTodayHistoryMapFromStorageKey(getMobileVocabularyTodayHistoryStorageKey(currentUid));
      Object.assign(state, createDefaultMobileState());
      state.vocabularyStudy = sanitizeVocabularyStudyState(uidStudy)
        ? mergeVocabularyStudyStateWithCurrentBank(uidStudy, getVocabularyRealWordBank())
        : buildVocabularyRealStudyState();
      state.vocabularyTodayHistoryMap = normalizeVocabularyTodayHistoryMap(uidHistory) || {};
      vocabularyStateOwnerUid = currentUid;
      vocabularyTodayHistoryOwnerUid = currentUid;
      window.localStorage.removeItem(MOBILE_STORAGE_KEY);
      window.localStorage.removeItem(MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY);
      return;
    }
    if (!raw) {
      Object.assign(state, createDefaultMobileState());
      state.vocabularyStudy = buildVocabularyRealStudyState();
      return;
    }
    try {
      const sanitizedState = sanitizeMobileState(JSON.parse(raw));
      Object.assign(state, sanitizedState);
      if (!state.vocabularyStudy) {
        state.vocabularyStudy = buildVocabularyRealStudyState();
      } else {
        state.vocabularyStudy = mergeVocabularyStudyStateWithCurrentBank(state.vocabularyStudy, getVocabularyRealWordBank());
      }
    } catch (_error) {
      Object.assign(state, createDefaultMobileState());
      state.vocabularyStudy = buildVocabularyRealStudyState();
    }
  }

  function sanitizeSpeakingProgress(raw) {
    if (!raw || typeof raw !== "object") return null;
    const weekId = String(raw.weekId || "").trim();
    const dayKey = String(raw.dayKey || raw.date || raw.dayId || "").trim();
    const conversationOrder = Array.isArray(raw.conversationOrder)
      ? raw.conversationOrder.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const completedConversationIds = Array.isArray(raw.completedConversationIds)
      ? [...new Set(raw.completedConversationIds.map((value) => String(value || "").trim()).filter(Boolean))]
      : [];
    if (!weekId || !conversationOrder.length) return null;
    return {
      weekId,
      dayKey,
      conversationOrder,
      conversationIndex: Math.max(0, Number(raw.conversationIndex) || 0),
      lineIndex: Math.max(0, Number(raw.lineIndex) || 0),
      completedRounds: Math.max(0, Number(raw.completedRounds) || 0),
      conversationSetCount: Math.max(0, Number(raw.conversationSetCount) || 0),
      completedConversationIds,
      phase: raw.phase === "conversationComplete" ? "conversationComplete" : "line",
      updatedAt: Number(raw.updatedAt) || Date.now()
    };
  }

  function sanitizeSpeakingReviewStatEntry(raw, fallbackConversationId = "") {
    if (!raw || typeof raw !== "object") return null;
    const conversationId = String(raw.conversationId || fallbackConversationId || "").trim();
    if (!conversationId) return null;
    return {
      conversationId,
      lastSpokenAt: Math.max(0, Number(raw.lastSpokenAt) || 0),
      spokenCountTotal: Math.max(0, Number(raw.spokenCountTotal) || 0)
    };
  }

  function loadSpeakingReviewStats() {
    const raw = window.localStorage.getItem(SPEAKING_REVIEW_STATS_KEY);
    if (!raw) {
      state.speakingReviewStatsMap = {};
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const source = parsed && typeof parsed === "object" ? parsed : {};
      const nextMap = {};
      Object.keys(source).forEach((conversationId) => {
        const entry = sanitizeSpeakingReviewStatEntry(source[conversationId], conversationId);
        if (!entry) return;
        nextMap[entry.conversationId] = entry;
      });
      state.speakingReviewStatsMap = nextMap;
    } catch (_error) {
      state.speakingReviewStatsMap = {};
    }
  }

  function saveSpeakingReviewStats() {
    const keys = Object.keys(state.speakingReviewStatsMap || {});
    if (!keys.length) {
      window.localStorage.removeItem(SPEAKING_REVIEW_STATS_KEY);
      return;
    }
    window.localStorage.setItem(SPEAKING_REVIEW_STATS_KEY, JSON.stringify(state.speakingReviewStatsMap));
  }

  function buildSpeakingWordDayCompletionId(weekId, dayKey) {
    const normalizedWeekId = String(weekId || "").trim();
    const normalizedDayKey = String(dayKey || "").trim();
    if (!normalizedWeekId || !normalizedDayKey) return "";
    return `${normalizedWeekId}__${normalizedDayKey}`;
  }

  function sanitizeSpeakingWordDayCompletionMap(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const nextMap = {};
    Object.entries(source).forEach(([storageId, value]) => {
      const id = String(storageId || "").trim();
      if (!id) return;
      nextMap[id] = Math.max(0, Math.floor(Number(value) || 0));
    });
    return nextMap;
  }

  function loadSpeakingWordDayCompletionMap() {
    const raw = window.localStorage.getItem(SPEAKING_WORD_DAY_COMPLETION_KEY);
    if (!raw) {
      state.speakingWordDayCompletionMap = {};
      return;
    }
    try {
      state.speakingWordDayCompletionMap = sanitizeSpeakingWordDayCompletionMap(JSON.parse(raw));
    } catch (_error) {
      state.speakingWordDayCompletionMap = {};
    }
  }

  function saveSpeakingWordDayCompletionMap() {
    const sanitized = sanitizeSpeakingWordDayCompletionMap(state.speakingWordDayCompletionMap);
    state.speakingWordDayCompletionMap = sanitized;
    if (!Object.keys(sanitized).length) {
      window.localStorage.removeItem(SPEAKING_WORD_DAY_COMPLETION_KEY);
      return;
    }
    window.localStorage.setItem(SPEAKING_WORD_DAY_COMPLETION_KEY, JSON.stringify(sanitized));
  }

  function getSpeakingWordDayCompletionCount(weekId, dayKey) {
    const storageId = buildSpeakingWordDayCompletionId(weekId, dayKey);
    if (!storageId) return 0;
    return Math.max(0, Number(state.speakingWordDayCompletionMap?.[storageId]) || 0);
  }

  function recordSpeakingWordDayCompletion(weekId, dayKey) {
    const storageId = buildSpeakingWordDayCompletionId(weekId, dayKey);
    if (!storageId) return 0;
    const current = getSpeakingWordDayCompletionCount(weekId, dayKey);
    const nextCount = current + 1;
    state.speakingWordDayCompletionMap[storageId] = nextCount;
    saveSpeakingWordDayCompletionMap();
    return nextCount;
  }

  function getSpeakingWordDayStatusSummary(weekId, dayKey, canStart) {
    if (!canStart) {
      return { text: "準備中", tone: "not-started" };
    }
    const completionCount = getSpeakingWordDayCompletionCount(weekId, dayKey);
    if (completionCount <= 0) {
      return { text: "未開始", tone: "not-started" };
    }
    if (completionCount === 1) {
      return { text: "1回完了", tone: "first-round" };
    }
    if (completionCount === 2) {
      return { text: "2回完了", tone: "first-round" };
    }
    return { text: "完了", tone: "complete" };
  }

  function sanitizeSpeakingReviewQueueItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    const weekId = String(raw.weekId || "").trim();
    const dayKey = String(raw.dayKey || raw.date || "").trim();
    const conversationId = String(raw.conversationId || "").trim();
    if (!weekId || !dayKey || !conversationId) return null;
    const week = getSpeakingWeek(weekId);
    const conversation = getSpeakingConversationById(week, conversationId);
    if (!week || !conversation || String(conversation?.date || "").trim() !== dayKey) return null;
    return { weekId, dayKey, conversationId };
  }

  function sanitizeSpeakingReviewSession(raw) {
    if (!raw || typeof raw !== "object") return null;
    const reviewQueue = Array.isArray(raw.reviewQueue)
      ? raw.reviewQueue.map((entry) => sanitizeSpeakingReviewQueueItem(entry)).filter(Boolean)
      : [];
    if (!reviewQueue.length) return null;
    const currentIndex = Math.min(
      Math.max(0, Number(raw.currentIndex) || 0),
      reviewQueue.length - 1
    );
    const currentItem = reviewQueue[currentIndex] || null;
    const currentContext = getReviewConversationContextByItem(currentItem);
    const maxLineIndex = Math.max(0, Number(currentContext?.conversation?.lines?.length || 1) - 1);
    return {
      reviewQueue,
      currentIndex,
      lineIndex: Math.min(Math.max(0, Number(raw.lineIndex) || 0), maxLineIndex),
      pendingPointConversationCount: Math.max(0, Math.floor(Number(raw.pendingPointConversationCount) || 0)),
      updatedAt: Math.max(0, Number(raw.updatedAt) || Date.now())
    };
  }

  function loadSpeakingReviewSession() {
    const raw = window.localStorage.getItem(SPEAKING_REVIEW_SESSION_KEY);
    if (!raw) {
      state.speakingReviewSession = null;
      return;
    }
    try {
      state.speakingReviewSession = sanitizeSpeakingReviewSession(JSON.parse(raw));
    } catch (_error) {
      state.speakingReviewSession = null;
    }
  }

  function saveSpeakingReviewSession() {
    const session = sanitizeSpeakingReviewSession(state.speakingReviewSession);
    if (!session) {
      state.speakingReviewSession = null;
      window.localStorage.removeItem(SPEAKING_REVIEW_SESSION_KEY);
      return;
    }
    session.updatedAt = Date.now();
    state.speakingReviewSession = session;
    window.localStorage.setItem(SPEAKING_REVIEW_SESSION_KEY, JSON.stringify(session));
  }

  function clearSpeakingReviewSession() {
    if (state.learningHistorySession) {
      finalizeMobileLearningHistorySession({
        completedReason: "completed",
        mode: "review",
        summary: getCurrentMobileLearningHistorySummary() || {}
      });
    }
    state.speakingReviewSession = null;
    state.speakingReviewPlannedQueue = [];
    window.localStorage.removeItem(SPEAKING_REVIEW_SESSION_KEY);
  }

  function finishSpeakingReviewSession(completedCount) {
    const safeCompletedCount = Math.max(0, Number(completedCount) || 0);
    const earnedPoints = applyPendingReviewSpeakingPoints(state.speakingReviewSession, { persistSession: false });
    if (state.learningHistorySession) {
      const reviewSummary = getCurrentMobileLearningHistorySummary() || {};
      reviewSummary.earnedPoints = earnedPoints;
      finalizeMobileLearningHistorySession({
        completedReason: "completed",
        mode: "review",
        summary: reviewSummary
      });
    }
    clearSpeakingReviewSession();
    resetSpeakingHintState();
    state.speakingTranslationVisible = false;
    state.speakingLineStatus = "awaitingStart";
    const onClose = () => {
      if (safeCompletedCount >= SPEAKING_REVIEW_MAX_GROUPS) {
        renderSpeakingReviewCompleteScreen();
        return;
      }
      renderSpeakingReviewTopScreen();
    };
    if (earnedPoints > 0) {
      openPointRewardScreen("review", earnedPoints, { onClose });
      return;
    }
    onClose();
  }

  function continueAfterReviewConversationAdvance(session, onContinue, onFinish) {
    if (session.currentIndex < session.reviewQueue.length - 1) {
      session.currentIndex += 1;
      session.lineIndex = 0;
      resetSpeakingHintState();
      state.speakingTranslationVisible = false;
      saveSpeakingReviewSession();
      onContinue();
      return;
    }

    onFinish();
  }

  function getSpeakingConversationForProgress(progress, week = getSpeakingWeek(progress?.weekId)) {
    if (!progress || !week) return null;
    const conversationId = Array.isArray(progress.conversationOrder)
      ? String(progress.conversationOrder[progress.conversationIndex] || "").trim()
      : "";
    if (!conversationId) return null;
    return getSpeakingConversationById(week, conversationId);
  }

  function parseSpeakingDayNumberFromId(conversationId) {
    const match = /-D(\d+)-/i.exec(String(conversationId || "").trim());
    if (!match) return null;
    const numeric = Number(match[1]);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function getSpeakingDayNumber(week, conversation) {
    const fromId = parseSpeakingDayNumberFromId(conversation?.id);
    if (Number.isFinite(fromId)) return fromId;
    const distinctDates = [...new Set((week?.shortConversations || []).map((entry) => String(entry?.date || "").trim()).filter(Boolean))];
    const dayIndex = distinctDates.indexOf(String(conversation?.date || "").trim());
    return dayIndex >= 0 ? dayIndex + 1 : 1;
  }

  function isSpeakingWeekComplete(progress) {
    return getSpeakingCompletedRounds(progress) >= getSpeakingTargetRounds(progress);
  }

  function isSpeakingProgressAtInitialPosition(progress) {
    if (!progress) return true;
    return getSpeakingCompletedRounds(progress) === 0
      && Math.max(0, Number(progress.conversationIndex) || 0) === 0
      && Math.max(0, Number(progress.lineIndex) || 0) === 0
      && Math.max(0, Number(progress.conversationSetCount) || 0) === 0
      && progress.phase === "line";
  }

  function createRecentSpeakingProgressEntry(progress) {
    const week = getSpeakingWeek(progress?.weekId);
    const conversation = getSpeakingConversationForProgress(progress, week);
    if (!progress || !week || !conversation || isSpeakingProgressAtInitialPosition(progress) || isSpeakingWeekComplete(progress)) {
      return null;
    }

    const daySetProgress = getSpeakingDaySetProgress(week, conversation, progress.lineIndex);
    return {
      weekId: progress.weekId,
      dayNumber: getSpeakingDayNumber(week, conversation),
      conversationIndex: Math.max(0, Number(progress.conversationIndex) || 0),
      lineIndex: Math.max(0, Number(progress.lineIndex) || 0),
      completedRounds: getSpeakingCompletedRounds(progress),
      daySetNumber: daySetProgress.currentSet,
      totalDaySets: daySetProgress.totalSets,
      updatedAt: Date.now(),
      conversationOrder: Array.isArray(progress.conversationOrder) ? [...progress.conversationOrder] : [],
      conversationSetCount: Math.max(0, Number(progress.conversationSetCount) || 0),
      completedConversationIds: Array.isArray(progress.completedConversationIds) ? [...progress.completedConversationIds] : [],
      phase: progress.phase === "conversationComplete" ? "conversationComplete" : "line"
    };
  }

  function sanitizeRecentSpeakingProgressEntry(raw) {
    if (!raw || typeof raw !== "object") return null;
    const progress = sanitizeSpeakingProgress(raw);
    if (!progress) return null;
    const week = getSpeakingWeek(progress.weekId);
    const conversation = getSpeakingConversationForProgress(progress, week);
    if (!week || !conversation || isSpeakingWeekComplete(progress)) return null;
    const daySetProgress = getSpeakingDaySetProgress(week, conversation, progress.lineIndex);
    return {
      weekId: progress.weekId,
      dayNumber: Number.isFinite(Number(raw.dayNumber)) ? Math.max(1, Number(raw.dayNumber)) : getSpeakingDayNumber(week, conversation),
      conversationIndex: progress.conversationIndex,
      lineIndex: progress.lineIndex,
      completedRounds: progress.completedRounds,
      daySetNumber: Number.isFinite(Number(raw.daySetNumber)) ? Math.max(1, Number(raw.daySetNumber)) : daySetProgress.currentSet,
      totalDaySets: Number.isFinite(Number(raw.totalDaySets)) ? Math.max(1, Number(raw.totalDaySets)) : daySetProgress.totalSets,
      updatedAt: Number(raw.updatedAt) || Date.now(),
      conversationOrder: progress.conversationOrder,
      conversationSetCount: progress.conversationSetCount,
      completedConversationIds: progress.completedConversationIds,
      phase: progress.phase
    };
  }

  function loadRecentSpeakingProgress() {
    const raw = window.localStorage.getItem(SPEAKING_RECENT_PROGRESS_KEY);
    if (!raw) {
      state.recentSpeakingProgress = [];
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const entries = Array.isArray(parsed)
        ? parsed.map((entry) => sanitizeRecentSpeakingProgressEntry(entry)).filter(Boolean)
        : [];
      const deduped = [];
      const seenWeeks = new Set();
      entries
        .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0))
        .forEach((entry) => {
          if (seenWeeks.has(entry.weekId)) return;
          seenWeeks.add(entry.weekId);
          deduped.push(entry);
        });
      state.recentSpeakingProgress = deduped.slice(0, 3);
    } catch (_error) {
      state.recentSpeakingProgress = [];
    }
  }

  function saveRecentSpeakingProgress() {
    if (!state.recentSpeakingProgress.length) {
      window.localStorage.removeItem(SPEAKING_RECENT_PROGRESS_KEY);
      return;
    }
    window.localStorage.setItem(SPEAKING_RECENT_PROGRESS_KEY, JSON.stringify(state.recentSpeakingProgress));
  }

  function removeRecentSpeakingProgressByWeek(weekId) {
    const nextEntries = state.recentSpeakingProgress.filter((entry) => entry.weekId !== weekId);
    if (nextEntries.length === state.recentSpeakingProgress.length) return;
    state.recentSpeakingProgress = nextEntries;
    saveRecentSpeakingProgress();
  }

  function upsertRecentSpeakingProgress(progress = state.speakingProgress) {
    if (!progress?.weekId) return;
    const nextEntry = createRecentSpeakingProgressEntry(progress);
    if (!nextEntry) {
      removeRecentSpeakingProgressByWeek(progress.weekId);
      return;
    }
    state.recentSpeakingProgress = [
      nextEntry,
      ...state.recentSpeakingProgress.filter((entry) => entry.weekId !== nextEntry.weekId)
    ].slice(0, 3);
    saveRecentSpeakingProgress();
  }

  function createEmptySpeakingProgressStore() {
    return {
      version: 2,
      dayProgress: {},
      legacyUnresolved: null
    };
  }

  function mergeSpeakingProgressEntries(baseProgress, incomingProgress) {
    const base = sanitizeSpeakingProgress(baseProgress) || null;
    const incoming = sanitizeSpeakingProgress(incomingProgress) || null;
    if (!incoming) return base;
    if (!base) return incoming;

    const weekId = String(base.weekId || incoming.weekId || "").trim();
    const dayKey = String(base.dayKey || incoming.dayKey || "").trim();
    if (!weekId || !dayKey) return incoming;

    const mergedConversationOrder = [...new Set([
      ...(Array.isArray(base.conversationOrder) ? base.conversationOrder : []),
      ...(Array.isArray(incoming.conversationOrder) ? incoming.conversationOrder : [])
    ])];
    const mergedCompletedConversationIds = [...new Set([
      ...(Array.isArray(base.completedConversationIds) ? base.completedConversationIds : []),
      ...(Array.isArray(incoming.completedConversationIds) ? incoming.completedConversationIds : [])
    ])];

    const merged = {
      weekId,
      dayKey,
      conversationOrder: mergedConversationOrder,
      conversationIndex: Math.max(
        Math.max(0, Number(base.conversationIndex) || 0),
        Math.max(0, Number(incoming.conversationIndex) || 0)
      ),
      lineIndex: Math.max(
        Math.max(0, Number(base.lineIndex) || 0),
        Math.max(0, Number(incoming.lineIndex) || 0)
      ),
      completedRounds: Math.max(
        Math.max(0, Number(base.completedRounds) || 0),
        Math.max(0, Number(incoming.completedRounds) || 0)
      ),
      conversationSetCount: Math.max(
        Math.max(0, Number(base.conversationSetCount) || 0),
        Math.max(0, Number(incoming.conversationSetCount) || 0)
      ),
      completedConversationIds: mergedCompletedConversationIds,
      phase: (Number(incoming.updatedAt) || 0) >= (Number(base.updatedAt) || 0)
        ? incoming.phase
        : base.phase,
      updatedAt: Math.max(Number(base.updatedAt) || 0, Number(incoming.updatedAt) || 0)
    };

    return sanitizeSpeakingProgress(merged) || incoming;
  }

  function mergeSpeakingDayProgressMap(sourceMap) {
    const normalizedSource = sourceMap && typeof sourceMap === "object" ? sourceMap : {};
    const merged = {};
    Object.entries(normalizedSource).forEach(([storageId, rawEntry]) => {
      const entry = sanitizeStoredSpeakingProgressEntry(rawEntry);
      if (!entry) return;
      const normalizedId = buildSpeakingDayProgressId(entry.weekId, entry.dayKey);
      if (!normalizedId) return;
      const current = merged[normalizedId] || sanitizeStoredSpeakingProgressEntry(state.speakingDayProgressMap?.[normalizedId] || {});
      merged[normalizedId] = mergeSpeakingProgressEntries(current, entry);
    });

    Object.entries(state.speakingDayProgressMap || {}).forEach(([storageId, rawEntry]) => {
      if (merged[storageId]) return;
      const entry = sanitizeStoredSpeakingProgressEntry(rawEntry);
      if (!entry) return;
      merged[storageId] = entry;
    });

    return merged;
  }

  function restoreSpeakingWeekCompletionState(weekId, dayKeys) {
    const normalizedWeekId = String(weekId || "").trim();
    if (!normalizedWeekId) return false;
    const week = getSpeakingWeek(normalizedWeekId);
    if (!week) return false;

    const normalizedDayKeys = [...new Set((Array.isArray(dayKeys) ? dayKeys : [])
      .map((dayKey) => String(dayKey || "").trim())
      .filter((dayKey) => Boolean(dayKey)))];
    if (!normalizedDayKeys.length) {
      normalizedDayKeys.push(...getSpeakingOrderedDayKeys(week));
    }
    if (!normalizedDayKeys.length) return false;

    const isOneShotRestoreTarget = normalizedWeekId === "W6" || normalizedWeekId === "W7";
    let changed = false;
    normalizedDayKeys.forEach((dayKey) => {
      const storageId = buildSpeakingDayProgressId(normalizedWeekId, dayKey);
      const existing = getStoredSpeakingDayProgress(normalizedWeekId, dayKey);
      const baseProgress = existing ? sanitizeSpeakingProgress(existing) : createSpeakingProgress(normalizedWeekId, [dayKey]);
      if (!baseProgress) return;

      const conversationIds = getSpeakingPracticeConversationIds(week, [dayKey]);
      const mergedOrder = [...new Set([...(Array.isArray(baseProgress.conversationOrder) ? baseProgress.conversationOrder : []), ...conversationIds])];
      const completedIds = isOneShotRestoreTarget
        ? [...new Set(conversationIds)]
        : [...new Set([...(Array.isArray(baseProgress.completedConversationIds) ? baseProgress.completedConversationIds : []), ...conversationIds])];
      const restoreRounds = isOneShotRestoreTarget ? 1 : Math.max(Math.max(0, Number(baseProgress.completedRounds) || 0), getSpeakingTargetRounds(baseProgress));
      const restoreSetCount = isOneShotRestoreTarget ? 1 : Math.max(Math.max(0, Number(baseProgress.conversationSetCount) || 0), 1);
      const snapshot = sanitizeSpeakingProgress({
        ...baseProgress,
        weekId: normalizedWeekId,
        dayKey,
        conversationOrder: mergedOrder,
        conversationIndex: Math.max(0, Number(baseProgress.conversationIndex) || 0),
        lineIndex: Math.max(0, Number(baseProgress.lineIndex) || 0),
        completedRounds: restoreRounds,
        conversationSetCount: restoreSetCount,
        completedConversationIds: completedIds,
        phase: "conversationComplete",
        updatedAt: Date.now()
      });
      if (!snapshot) return;
      state.speakingDayProgressMap[storageId] = snapshot;
      if (state.speakingProgress && state.speakingProgress.weekId === normalizedWeekId && resolveSpeakingProgressDayKey(week, state.speakingProgress) === dayKey) {
        state.speakingProgress = { ...snapshot };
      }
      changed = true;
    });

    if (changed) {
      persistSpeakingProgressStore();
    }
    return changed;
  }

  function persistSpeakingProgressStore() {
    const snapshot = createEmptySpeakingProgressStore();
    snapshot.dayProgress = { ...state.speakingDayProgressMap };
    if (state.speakingLegacyUnresolvedProgress) {
      snapshot.legacyUnresolved = state.speakingLegacyUnresolvedProgress;
    }
    window.localStorage.setItem(SPEAKING_PROGRESS_KEY, JSON.stringify(snapshot));
  }

  function sanitizeStoredSpeakingProgressEntry(raw) {
    const progress = sanitizeSpeakingProgress(raw);
    if (!progress) return null;
    const week = getSpeakingWeek(progress.weekId);
    if (!week) return null;

    const validConversationIds = new Set(week.shortConversations.map((conversation) => conversation.id));
    const nextOrder = progress.conversationOrder.filter((conversationId) => validConversationIds.has(conversationId));
    if (!nextOrder.length) return null;

    progress.conversationOrder = nextOrder;
    progress.conversationIndex = Math.min(Math.max(0, progress.conversationIndex), nextOrder.length - 1);
    progress.completedConversationIds = progress.completedConversationIds.filter((conversationId) => validConversationIds.has(conversationId));
    progress.dayKey = resolveSpeakingProgressDayKey(week, progress);
    if (!progress.dayKey) return null;
    return progress;
  }

  function migrateLegacySpeakingProgress(rawLegacy) {
    const migratedStore = createEmptySpeakingProgressStore();
    const legacyProgress = sanitizeStoredSpeakingProgressEntry(rawLegacy);
    if (!legacyProgress) {
      migratedStore.legacyUnresolved = {
        reason: "invalid-legacy-progress",
        raw: rawLegacy
      };
      return { store: migratedStore, activeProgress: null };
    }

    const week = getSpeakingWeek(legacyProgress.weekId);
    const selectedDayKeys = getSpeakingSelectedDayKeysFromOrder(week, legacyProgress.conversationOrder);
    if (selectedDayKeys.length !== 1) {
      migratedStore.legacyUnresolved = {
        reason: "cannot-resolve-single-day",
        missing: "conversationOrder maps to multiple or zero day keys",
        raw: rawLegacy
      };
      return { store: migratedStore, activeProgress: null };
    }

    legacyProgress.dayKey = selectedDayKeys[0];
    const storageId = buildSpeakingDayProgressId(legacyProgress.weekId, legacyProgress.dayKey);
    migratedStore.dayProgress[storageId] = legacyProgress;
    return { store: migratedStore, activeProgress: legacyProgress };
  }

  function loadSpeakingProgress() {
    const raw = window.localStorage.getItem(SPEAKING_PROGRESS_KEY);
    state.speakingDayProgressMap = {};
    state.speakingLegacyUnresolvedProgress = null;
    state.speakingProgress = null;
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 2 && parsed?.dayProgress && typeof parsed.dayProgress === "object") {
        const nextMap = {};
        Object.keys(parsed.dayProgress).forEach((storageId) => {
          const progress = sanitizeStoredSpeakingProgressEntry(parsed.dayProgress[storageId]);
          if (!progress) return;
          const normalizedStorageId = buildSpeakingDayProgressId(progress.weekId, progress.dayKey);
          if (!normalizedStorageId) return;
          nextMap[normalizedStorageId] = progress;
        });
        state.speakingDayProgressMap = nextMap;
        if (parsed.legacyUnresolved && typeof parsed.legacyUnresolved === "object") {
          state.speakingLegacyUnresolvedProgress = parsed.legacyUnresolved;
        }
      } else {
        const migrated = migrateLegacySpeakingProgress(parsed);
        state.speakingDayProgressMap = migrated.store.dayProgress;
        state.speakingLegacyUnresolvedProgress = migrated.store.legacyUnresolved || null;
        persistSpeakingProgressStore();
      }

      const entries = Object.values(state.speakingDayProgressMap);
      if (!entries.length) {
        state.speakingProgress = null;
      } else {
        entries.sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
        state.speakingProgress = { ...entries[0] };
        setActiveSpeakingDayQueue([state.speakingProgress.dayKey], state.speakingProgress.dayKey);
      }

      getSpeakingWeeks().forEach((week) => {
        const weekId = String(week?.weekId || "").trim();
        if (!weekId) return;
        if (weekId !== "W6" && weekId !== "W7") return;
        restoreSpeakingWeekCompletionState(weekId, getSpeakingOrderedDayKeys(week));
      });

      if (state.speakingProgress) {
        const week = getSpeakingWeek(state.speakingProgress.weekId);
        if (week) {
          const currentDayKey = resolveSpeakingProgressDayKey(week, state.speakingProgress);
          if (currentDayKey) {
            setActiveSpeakingDayQueue([currentDayKey], currentDayKey);
          }
        }
      }
    } catch (_error) {
      state.speakingDayProgressMap = {};
      state.speakingLegacyUnresolvedProgress = null;
      state.speakingProgress = null;
    }
  }

  function saveSpeakingProgress() {
    if (!state.speakingProgress) {
      persistSpeakingProgressStore();
      return;
    }

    const week = getSpeakingWeek(state.speakingProgress.weekId);
    const dayKey = resolveSpeakingProgressDayKey(week, state.speakingProgress);
    if (!week || !dayKey) {
      persistSpeakingProgressStore();
      return;
    }

    state.speakingProgress.dayKey = dayKey;
    state.speakingProgress.updatedAt = Date.now();
    const storageId = buildSpeakingDayProgressId(state.speakingProgress.weekId, dayKey);
    if (storageId) {
      const currentEntry = state.speakingDayProgressMap[storageId] || null;
      const nextEntry = mergeSpeakingProgressEntries(currentEntry, state.speakingProgress);
      if (nextEntry) {
        state.speakingDayProgressMap[storageId] = nextEntry;
      }
    }
    state.speakingDayProgressMap = mergeSpeakingDayProgressMap(state.speakingDayProgressMap);
    persistSpeakingProgressStore();
    upsertRecentSpeakingProgress(state.speakingProgress);
  }

  function clearSpeakingProgress() {
    state.speakingDayProgressMap = {};
    state.speakingLegacyUnresolvedProgress = null;
    state.speakingUi.activeConversationDayKeys = [];
    state.speakingProgress = null;
    state.speakingTranslationVisible = false;
    state.speakingAudioPlaying = false;
    state.speakingUtterance = null;
    state.recentSpeakingProgress = [];
    window.localStorage.removeItem(SPEAKING_PROGRESS_KEY);
  }

  function getVocabularyStudyLearnedCount(studyState) {
    const entries = studyState && Array.isArray(studyState.entries) ? studyState.entries : [];
    return entries.filter((entry) => {
      const pronLevel = Number(entry?.pronunciation?.level || 0) || 0;
      const meaningLevel = Number(entry?.meaningState?.level || 0) || 0;
      return pronLevel > 0 && meaningLevel > 0;
    }).length;
  }

  function getVocabularyStudyMostRecentUpdatedAt(studyState) {
    const entries = studyState && Array.isArray(studyState.entries) ? studyState.entries : [];
    if (!entries.length) return 0;
    return entries.reduce((maxTimestamp, entry) => {
      const timestamps = [
        Number(entry?.lastJudgedAt || 0),
        Number(entry?.createdAt || 0),
        Number(entry?.pronunciationTeacherCheckUpdatedAt || 0),
        Number(entry?.meaningTeacherCheckUpdatedAt || 0),
        Number(entry?.pronunciation?.lastJudgedAt || 0),
        Number(entry?.pronunciation?.teacherCheckUpdatedAt || 0),
        Number(entry?.meaningState?.lastJudgedAt || 0),
        Number(entry?.meaningState?.teacherCheckUpdatedAt || 0)
      ];
      const latestEntryTimestamp = Math.max(0, ...timestamps.filter(Number.isFinite));
      return Math.max(maxTimestamp, latestEntryTimestamp);
    }, 0);
  }

  function getVocabularyTodayHistoryCount(historyMap, dateKey = getVocabularyHistoryTodayKey()) {
    if (!historyMap || typeof historyMap !== "object") return 0;
    const bucket = historyMap[dateKey] && typeof historyMap[dateKey] === "object" ? historyMap[dateKey] : {};
    return Object.keys(bucket).length;
  }

  function getVocabularyTodayHistoryMostRecentUpdatedAt(historyMap, dateKey = getVocabularyHistoryTodayKey()) {
    if (!historyMap || typeof historyMap !== "object") return 0;
    const bucket = historyMap[dateKey] && typeof historyMap[dateKey] === "object" ? historyMap[dateKey] : {};
    return Object.values(bucket).reduce((maxTimestamp, entry) => {
      const latestEntryTimestamp = Math.max(
        0,
        Number(entry?.lastJudgedAt || 0),
        Number(entry?.pronunciationTeacherCheckUpdatedAt || 0),
        Number(entry?.meaningTeacherCheckUpdatedAt || 0)
      );
      return Math.max(maxTimestamp, latestEntryTimestamp);
    }, 0);
  }

  function isSameUidSyncCanonical(uid = getCurrentMobileFirebaseUser()?.uid || "") {
    const currentUid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
    const targetUid = String(uid || currentUid || "").trim();
    return Boolean(currentUid) && Boolean(targetUid) && targetUid === currentUid;
  }

  function saveState(changedWordId = "") {
    const currentUid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
    if (currentUid && !vocabularyStateOwnerUid) {
      vocabularyStateOwnerUid = currentUid;
    }
    const canPersistStudyState = currentUid && vocabularyStateOwnerUid === currentUid;
    const safeStudyState = canPersistStudyState && state.vocabularyStudy
      ? sanitizeVocabularyStudyState(state.vocabularyStudy) || createEmptyVocabularyStudyState()
      : null;
    const snapshot = {
      settings: state.settings,
      stats: state.stats,
      vocabularyStudy: safeStudyState
    };
    if (currentUid) {
      const uidStorageKey = getMobileVocabularyStorageKey(currentUid);
      const uidStudy = safeStudyState || createEmptyVocabularyStudyState();
      window.localStorage.setItem(uidStorageKey, JSON.stringify(uidStudy));
      window.localStorage.removeItem(MOBILE_STORAGE_KEY);
    } else {
      window.localStorage.setItem(MOBILE_STORAGE_KEY, JSON.stringify(snapshot));
    }
    const uid = getMobileVocabularySyncUid();
    if (uid && vocabularyStateOwnerUid === uid && isVocabularyStateOwnerCurrentUid(uid)) {
      scheduleMobileVocabularySync(changedWordId);
    }
  }

  function isCurrentMobileChildUid(uid = getCurrentMobileFirebaseUser()?.uid || "") {
    const currentUid = String(uid || getCurrentMobileFirebaseUser()?.uid || "").trim();
    if (!currentUid) return false;
    if (currentUid === MOBILE_FIXED_CHILD_UID) {
      return true;
    }
    if (!mobileCachedSonUid) {
      mobileCachedSonUid = readMobileCachedSonUid();
    }
    return Boolean(mobileCachedSonUid && currentUid === mobileCachedSonUid);
  }

  function getMobileVocabularyStorageKey(uid = getCurrentMobileFirebaseUser()?.uid || "") {
    const safeUid = String(uid || "").trim();
    return safeUid ? `english-trainer-mobile-vocabulary-state-v1:${safeUid}` : "english-trainer-mobile-vocabulary-state-v1";
  }

  function loadMobileVocabularyStateForSync(uid = getCurrentMobileFirebaseUser()?.uid || "") {
    const currentUid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
    const targetUid = String(uid || currentUid || "").trim();
    if (!targetUid || (currentUid && targetUid !== currentUid)) {
      return null;
    }
    try {
      const raw = window.localStorage.getItem(getMobileVocabularyStorageKey(targetUid));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? sanitizeVocabularyStudyState(parsed) || null : null;
    } catch (_error) {
      return null;
    }
  }

  function saveMobileVocabularyStateForSync(studyState, uid = getCurrentMobileFirebaseUser()?.uid || "") {
    const currentUid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
    const targetUid = String(uid || currentUid || "").trim();
    if (!targetUid || (currentUid && targetUid !== currentUid)) {
      return null;
    }
    const normalized = studyState && typeof studyState === "object" ? sanitizeVocabularyStudyState(studyState) : null;
    if (!normalized) {
      window.localStorage.removeItem(getMobileVocabularyStorageKey(targetUid));
      return null;
    }
    window.localStorage.setItem(getMobileVocabularyStorageKey(targetUid), JSON.stringify(normalized));
    vocabularyStateOwnerUid = targetUid;
    return normalized;
  }

  function clearMobileVocabularyStateForSync(uid = getCurrentMobileFirebaseUser()?.uid || "") {
    const currentUid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
    const targetUid = String(uid || currentUid || "").trim();
    if (targetUid) {
      window.localStorage.removeItem(getMobileVocabularyStorageKey(targetUid));
    }
  }

  function getMobileVocabularySyncUid() {
    return String(getCurrentMobileFirebaseUser()?.uid || "").trim();
  }

  function mergeVocabularyStudyStateByLatest(baseStudyState, incomingStudyState) {
    const base = sanitizeVocabularyStudyState(baseStudyState) || createVocabularyStudyState();
    const incoming = sanitizeVocabularyStudyState(incomingStudyState) || null;
    if (!incoming) return base;
    if (!base || !base.entries) return incoming;

    const mergedById = new Map();
    const ids = new Set([
      ...base.entries.map((entry) => String(entry?.id || entry?.word || "").trim()).filter(Boolean),
      ...incoming.entries.map((entry) => String(entry?.id || entry?.word || "").trim()).filter(Boolean)
    ]);

    ids.forEach((wordId) => {
      const baseEntry = base.entries.find((entry) => String(entry?.id || entry?.word || "").trim() === wordId) || null;
      const incomingEntry = incoming.entries.find((entry) => String(entry?.id || entry?.word || "").trim() === wordId) || null;
      if (!baseEntry && incomingEntry) {
        mergedById.set(wordId, normalizeVocabularyWordRecord(incomingEntry, mergedById.size));
        return;
      }
      if (!incomingEntry && baseEntry) {
        mergedById.set(wordId, normalizeVocabularyWordRecord(baseEntry, mergedById.size));
        return;
      }

      const leftPronUpdated = getVocabularyTeacherCheckUpdatedAtForField(baseEntry, "pronunciation");
      const rightPronUpdated = getVocabularyTeacherCheckUpdatedAtForField(incomingEntry, "pronunciation");
      const leftMeaningUpdated = getVocabularyTeacherCheckUpdatedAtForField(baseEntry, "meaning");
      const rightMeaningUpdated = getVocabularyTeacherCheckUpdatedAtForField(incomingEntry, "meaning");
      const leftUpdated = getVocabularyEntryLatestUpdatedAt(baseEntry);
      const rightUpdated = getVocabularyEntryLatestUpdatedAt(incomingEntry);
      const winnerEntry = rightUpdated >= leftUpdated ? incomingEntry : baseEntry;

      const mergedEntry = normalizeVocabularyWordRecord({ ...winnerEntry }, mergedById.size);
      const pronStatusSource = rightPronUpdated >= leftPronUpdated ? incomingEntry : baseEntry;
      const meaningStatusSource = rightMeaningUpdated >= leftMeaningUpdated ? incomingEntry : baseEntry;
      const pronStatus = String(pronStatusSource?.pronunciationTeacherCheck || pronStatusSource?.pronunciation?.teacherCheckStatus || pronStatusSource?.teacherCheckState?.pronunciation || "none").trim() || "none";
      const meaningStatus = String(meaningStatusSource?.meaningTeacherCheck || meaningStatusSource?.meaningState?.teacherCheckStatus || meaningStatusSource?.teacherCheckState?.meaning || "none").trim() || "none";
      const pronTimestamp = Math.max(leftPronUpdated, rightPronUpdated);
      const meaningTimestamp = Math.max(leftMeaningUpdated, rightMeaningUpdated);

      mergedEntry.pronunciationTeacherCheck = pronStatus;
      mergedEntry.meaningTeacherCheck = meaningStatus;
      mergedEntry.pronunciationTeacherCheckUpdatedAt = pronTimestamp;
      mergedEntry.meaningTeacherCheckUpdatedAt = meaningTimestamp;
      mergedEntry.pronunciation = createVocabularySkillState({
        ...mergedEntry.pronunciation,
        teacherCheckStatus: pronStatus,
        teacherCheckState: createVocabularyTeacherCheckState({
          pronunciation: pronStatus,
          meaning: meaningStatus
        }),
        teacherCheckUpdatedAt: pronTimestamp,
        lastJudgedAt: mergedEntry.pronunciation?.lastJudgedAt || null,
        lastJudgedBy: mergedEntry.pronunciation?.lastJudgedBy || "self"
      });
      mergedEntry.meaningState = createVocabularySkillState({
        ...mergedEntry.meaningState,
        teacherCheckStatus: meaningStatus,
        teacherCheckState: createVocabularyTeacherCheckState({
          pronunciation: pronStatus,
          meaning: meaningStatus
        }),
        teacherCheckUpdatedAt: meaningTimestamp,
        lastJudgedAt: mergedEntry.meaningState?.lastJudgedAt || null,
        lastJudgedBy: mergedEntry.meaningState?.lastJudgedBy || "self"
      });
      mergedEntry.lastJudgedAt = winnerEntry.lastJudgedAt || mergedEntry.lastJudgedAt || null;
      mergedEntry.lastJudgedBy = winnerEntry.lastJudgedBy || mergedEntry.lastJudgedBy || "self";

      mergedById.set(wordId, mergedEntry);
    });

    const mergedEntries = [...mergedById.values()].filter(Boolean);
    const mergedStudy = createVocabularyStudyState(mergedEntries);
    if (Number.isFinite(Number(base.targetWordCount)) || Number.isFinite(Number(incoming.targetWordCount))) {
      mergedStudy.targetWordCount = Math.max(
        0,
        Number(base.targetWordCount || incoming.targetWordCount || mergedStudy.targetWordCount) || mergedStudy.targetWordCount
      );
    }
    return mergedStudy;
  }

  function handleVocabularySyncRemoteSnapshot(snapshot) {
    if (snapshot?.error && shouldThrottleMobileVocabularySyncError("study", snapshot.error)) {
      applyMobileVocabularySyncRateLimit("study", snapshot.error);
      return;
    }
    if (isMobileVocabularySyncRateLimited("study") || isMobileVocabularySyncDuplicateBurst("study")) {
      return;
    }
    const uid = String(snapshot?.uid || getMobileVocabularySyncUid() || "").trim();
    if (!snapshot?.ok || !snapshot.exists) {
      return;
    }
    const incomingStudy = sanitizeVocabularyStudyState(snapshot.studyState || null);
    const localBaseline = sanitizeVocabularyStudyState(state.vocabularyStudy) ? state.vocabularyStudy : buildVocabularyRealStudyState();
    const localLearnedCount = getVocabularyStudyLearnedCount(localBaseline);
    const remoteLearnedCount = getVocabularyStudyLearnedCount(incomingStudy);
    const localCompareUpdatedAtMs = getVocabularyStudyMostRecentUpdatedAt(localBaseline);
    const remoteUpdatedAtMs = Number(snapshot?.updatedAtMs || 0) || 0;

    if (isSameUidSyncCanonical(uid)) {
      state.vocabularyStudy = mergeVocabularyStudyStateWithCurrentBank(incomingStudy, getVocabularyRealWordBank());
      if (!sanitizeVocabularyStudyState(state.vocabularyStudy) && sanitizeVocabularyStudyState(localBaseline)) {
        state.vocabularyStudy = mergeVocabularyStudyStateWithCurrentBank(localBaseline, getVocabularyRealWordBank());
      }
      saveState();
      saveMobileVocabularyStateForSync(state.vocabularyStudy, uid);
      if (state.currentScreen === "vocabularyPastHistoryScreen") {
        renderVocabularyPastHistoryScreen();
      }
      return;
    }

    if (!incomingStudy || !Array.isArray(incomingStudy.entries) || !incomingStudy.entries.length) {
      if (sanitizeVocabularyStudyState(localBaseline)) {
        state.vocabularyStudy = mergeVocabularyStudyStateWithCurrentBank(localBaseline, getVocabularyRealWordBank());
        saveState();
        saveMobileVocabularyStateForSync(state.vocabularyStudy, uid);
      }
      if (state.currentScreen === "vocabularyPastHistoryScreen") {
        renderVocabularyPastHistoryScreen();
      }
      return;
    }
    const currentLocal = localBaseline;
    const mergedStudy = mergeVocabularyStudyStateByLatest(currentLocal, incomingStudy);
    const mergedLearnedCount = getVocabularyStudyLearnedCount(mergedStudy);
    if (sanitizeVocabularyStudyState(mergedStudy)) {
      state.vocabularyStudy = mergeVocabularyStudyStateWithCurrentBank(mergedStudy, getVocabularyRealWordBank());
      saveState();
      saveMobileVocabularyStateForSync(state.vocabularyStudy, uid);
    }
    const pending = loadMobileVocabularyStateForSync(uid);
    if (!pending) {
      clearMobileVocabularyStateForSync(uid);
      return;
    }
    if (JSON.stringify(sanitizeVocabularyStudyState(pending)) === JSON.stringify(sanitizeVocabularyStudyState(mergedStudy))) {
      clearMobileVocabularyStateForSync(uid);
      return;
    }
    saveMobileVocabularyStateForSync(mergedStudy, uid);
    if (state.currentScreen === "vocabularyPastHistoryScreen") {
      renderVocabularyPastHistoryScreen();
    }
  }

  async function initializeMobileVocabularySyncForCurrentUser(options = {}) {
    const force = options?.force === true;
    const uid = getMobileVocabularySyncUid();
    if (!uid) {
      vocabularySyncCurrentUid = "";
      vocabularySyncReady = false;
      vocabularySyncAllowCreate = false;
      if (typeof vocabularySyncUnsubscribe === "function") {
        vocabularySyncUnsubscribe();
      }
      vocabularySyncUnsubscribe = null;
      return false;
    }

    if (!force && vocabularySyncReady && vocabularySyncCurrentUid === uid) {
      return true;
    }

    if (isMobileVocabularySyncRateLimited("study") || isMobileVocabularySyncDuplicateBurst("study")) {
      vocabularySyncCurrentUid = uid;
      vocabularySyncReady = vocabularySyncReady && vocabularySyncCurrentUid === uid;
      return vocabularySyncReady;
    }

    if (typeof vocabularySyncUnsubscribe === "function") {
      vocabularySyncUnsubscribe();
    }
    vocabularySyncUnsubscribe = null;

    const localBaseline = sanitizeVocabularyStudyState(state.vocabularyStudy) ? state.vocabularyStudy : buildVocabularyRealStudyState();
    const remoteLoad = window.loadMobileVocabularyStateFromFirestore;
    if (typeof remoteLoad !== "function") {
      vocabularySyncCurrentUid = uid;
      vocabularySyncReady = false;
      vocabularySyncAllowCreate = false;
      return false;
    }

    let remoteResult = null;
    try {
      remoteResult = await remoteLoad({ targetUid: uid });
    } catch (_error) {
      remoteResult = null;
    }

    if (remoteResult?.ok && remoteResult.exists) {
      const remoteStudyState = sanitizeVocabularyStudyState(remoteResult.studyState || null) || createEmptyVocabularyStudyState();
      const sameUidCanonical = isSameUidSyncCanonical(uid);
      const mergedStudy = sameUidCanonical
        ? remoteStudyState
        : mergeVocabularyStudyStateByLatest(localBaseline, remoteStudyState);
      state.vocabularyStudy = mergeVocabularyStudyStateWithCurrentBank(mergedStudy, getVocabularyRealWordBank());
      vocabularyStateOwnerUid = uid;
      saveState();
      saveMobileVocabularyStateForSync(state.vocabularyStudy, uid);
      vocabularySyncCurrentUid = uid;
      vocabularySyncReady = true;
      vocabularySyncAllowCreate = false;
    } else {
      const nextBaseline = sanitizeVocabularyStudyState(localBaseline) ? localBaseline : buildVocabularyRealStudyState();
      state.vocabularyStudy = mergeVocabularyStudyStateWithCurrentBank(nextBaseline, getVocabularyRealWordBank());
      vocabularyStateOwnerUid = uid;
      saveState();
      saveMobileVocabularyStateForSync(state.vocabularyStudy, uid);
      vocabularySyncCurrentUid = uid;
      vocabularySyncReady = true;
      vocabularySyncAllowCreate = true;
    }

    const subscribeRemote = window.subscribeMobileVocabularyStateFromFirestore;
    if (typeof subscribeRemote === "function") {
      vocabularySyncUnsubscribe = subscribeRemote((snapshot) => {
        if (snapshot?.error && shouldThrottleMobileVocabularySyncError("study", snapshot.error)) {
          applyMobileVocabularySyncRateLimit("study", snapshot.error);
          return;
        }
        if (isMobileVocabularySyncRateLimited("study") || isMobileVocabularySyncDuplicateBurst("study")) {
          return;
        }
        handleVocabularySyncRemoteSnapshot(snapshot);
      }, { targetUid: uid });
    }

    if (vocabularySyncReady) {
      await flushMobileVocabularySync();
    }
    return vocabularySyncReady;
  }

  async function flushMobileVocabularySync(changedWordId = "") {
    if (vocabularySyncInFlight) {
      vocabularySyncQueued = true;
      return vocabularySyncInFlight;
    }
    if (isMobileVocabularySyncRateLimited("study") || isMobileVocabularySyncDuplicateBurst("study")) {
      return;
    }

    vocabularySyncInFlight = (async () => {
      do {
        vocabularySyncQueued = false;
        const uid = getMobileVocabularySyncUid();
        if (!uid || !vocabularySyncReady || vocabularySyncCurrentUid !== uid || !isVocabularyStateOwnerCurrentUid(uid)) {
          break;
        }
        if (isMobileVocabularySyncRateLimited("study") || isMobileVocabularySyncDuplicateBurst("study")) {
          break;
        }

        const saveRemote = window.saveMobileVocabularyStateToFirestore;
        if (typeof saveRemote !== "function") {
          break;
        }

        const sourceStudy = loadMobileVocabularyStateForSync(uid) || (isVocabularyStateOwnerCurrentUid(uid) ? state.vocabularyStudy : null) || buildVocabularyRealStudyState();
        const normalizedSource = sanitizeVocabularyStudyState(sourceStudy) ? sourceStudy : state.vocabularyStudy || buildVocabularyRealStudyState();
        saveMobileVocabularyStateForSync(normalizedSource, uid);
        vocabularySyncLastOperationAtMs = Date.now();

        let result = null;
        try {
          result = await saveRemote(normalizedSource, {
            targetUid: uid,
            allowCreate: vocabularySyncAllowCreate,
            sourceDeviceId: String(getMobileBrowserDeviceId() || "").trim(),
            sourceDeviceName: sanitizeMobileLearningHistoryDeviceName(getMobileLearningHistoryDeviceName()),
            changedWordId: String(changedWordId || "").trim()
          });
        } catch (error) {
          if (shouldThrottleMobileVocabularySyncError("study", error)) {
            applyMobileVocabularySyncRateLimit("study", error);
          }
          break;
        }

        if (shouldThrottleMobileVocabularySyncError("study", result?.error)) {
          applyMobileVocabularySyncRateLimit("study", result.error);
          break;
        }
        if (!result?.ok || !result.saved) {
          break;
        }

        if (result.studyState) {
          state.vocabularyStudy = mergeVocabularyStudyStateWithCurrentBank(result.studyState, getVocabularyRealWordBank());
          saveState(String(changedWordId || "").trim());
          saveMobileVocabularyStateForSync(state.vocabularyStudy, uid);
        }
        clearMobileVocabularyStateForSync(uid);
        vocabularySyncAllowCreate = false;
      } while (vocabularySyncQueued);
    })();

    try {
      await vocabularySyncInFlight;
    } finally {
      vocabularySyncInFlight = null;
    }
  }

  function scheduleMobileVocabularySync(changedWordId = "") {
    const uid = getMobileVocabularySyncUid();
    if (!uid || !isVocabularyStateOwnerCurrentUid(uid)) return;
    if (isMobileVocabularySyncRateLimited("study") || isMobileVocabularySyncDuplicateBurst("study")) {
      return;
    }
    const latest = state.vocabularyStudy || buildVocabularyRealStudyState();
    saveMobileVocabularyStateForSync(latest, uid);
    if (!vocabularySyncReady || vocabularySyncCurrentUid !== uid) {
      initializeMobileVocabularySyncForCurrentUser().catch(() => false);
      return;
    }
    flushMobileVocabularySync(changedWordId).catch(() => undefined);
  }

  function saveMobileVocabularyState(targetStudyState, options = {}) {
    const currentUid = String(getCurrentMobileFirebaseUser()?.uid || "").trim();
    if (!currentUid) {
      return state.vocabularyStudy || null;
    }
    if (!vocabularyStateOwnerUid) {
      vocabularyStateOwnerUid = currentUid;
    }
    if (vocabularyStateOwnerUid !== currentUid) {
      return state.vocabularyStudy || null;
    }
    const nextStudy = sanitizeVocabularyStudyState(targetStudyState) ? targetStudyState : state.vocabularyStudy || buildVocabularyRealStudyState();
    state.vocabularyStudy = mergeVocabularyStudyStateWithCurrentBank(nextStudy, getVocabularyRealWordBank());
    vocabularyStateOwnerUid = currentUid;
    saveState(String(options?.changedWordId || "").trim());
    if (options?.skipSync !== true) {
      scheduleMobileVocabularySync(String(options?.changedWordId || "").trim());
    }
    return state.vocabularyStudy;
  }

  function saveVocabularyStudyStateToSync(targetStudyState, options = {}) {
    return saveMobileVocabularyState(targetStudyState, options);
  }

  function getVocabularySource() {
    const bank = Array.isArray(window.vocabularyBank) ? window.vocabularyBank : [];
    return bank
      .filter((entry) => Number(entry.day) >= MOBILE_DAY_MIN && Number(entry.day) <= MOBILE_DAY_MAX)
      .map((entry) => ({
        id: String(entry.id || ""),
        day: clampDay(entry.day),
        type: entry.type === "phrase" ? "phrase" : "word",
        japanese: String(entry.learningJapanese || entry.japanese || ""),
        displayJapanese: String(entry.japanese || entry.learningJapanese || ""),
        answer: String(entry.answer || ""),
        speechText: String(entry.answer || "")
      }))
      .filter((entry) => entry.id && entry.displayJapanese && entry.answer);
  }

  function normalizeAnswer(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[’`´]/g, "'")
      .replace(/[.,!?]+$/g, "")
      .replace(/[.,!?]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isCorrectRecognition(expected, transcriptList) {
    const target = normalizeAnswer(expected);
    return transcriptList.some((entry) => normalizeAnswer(entry) === target);
  }

  function shuffleArray(items) {
    const next = items.slice();
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const temp = next[index];
      next[index] = next[swapIndex];
      next[swapIndex] = temp;
    }
    return next;
  }

  function getSpeakingWeeks() {
    const weeks = Array.isArray(window.speakingData?.weeks) ? window.speakingData.weeks : [];
    return weeks
      .map((week) => ({
        weekId: String(week?.weekId || "").trim(),
        label: String(week?.label || "").trim(),
        startDate: String(week?.startDate || "").trim(),
        endDate: String(week?.endDate || "").trim(),
        shortConversations: Array.isArray(week?.shortConversations)
          ? week.shortConversations
            .map((conversation) => ({
              id: String(conversation?.id || "").trim(),
              date: String(conversation?.date || "").trim(),
              lines: Array.isArray(conversation?.lines)
                ? conversation.lines
                  .map((line) => ({
                    speaker: String(line?.speaker || "").trim(),
                    english: String(line?.english || "").trim(),
                    japanese: String(line?.japanese || "").trim(),
                    hintType: String(line?.hintType || "").trim().toLowerCase(),
                    patternHint: String(line?.patternHint || "").trim(),
                    keywords: Array.isArray(line?.keywords)
                      ? line.keywords.map((keyword) => String(keyword || "").trim()).filter(Boolean)
                      : [],
                    hints: Array.isArray(line?.hints)
                      ? line.hints.map((hint) => String(hint || "").trim()).filter(Boolean)
                      : []
                  }))
                  .filter((line) => line.speaker && line.english)
                : []
            }))
            .filter((conversation) => conversation.id && conversation.lines.length)
          : []
      }))
      .filter((week) => week.weekId && week.label);
  }

  function getSpeakingWeek(weekId) {
    return getSpeakingWeeks().find((week) => week.weekId === weekId) || null;
  }

  function getSpeakingConversationById(week, conversationId) {
    if (!week) return null;
    return week.shortConversations.find((conversation) => conversation.id === conversationId) || null;
  }

  function getSpeakingProgressWeek() {
    return getSpeakingWeek(state.speakingProgress?.weekId);
  }

  function getCurrentSpeakingConversation() {
    if (isReviewSpeakingModeActive()) {
      const context = getCurrentReviewConversationContext();
      return context?.conversation || null;
    }
    const week = getSpeakingProgressWeek();
    const progress = state.speakingProgress;
    if (!week || !progress) return null;
    const conversationId = progress.conversationOrder[progress.conversationIndex] || "";
    return getSpeakingConversationById(week, conversationId);
  }

  function getCurrentSpeakingLine() {
    const conversation = getCurrentSpeakingConversation();
    const lineIndex = isReviewSpeakingModeActive()
      ? Math.max(0, Number(state.speakingReviewSession?.lineIndex) || 0)
      : Math.max(0, Number(state.speakingProgress?.lineIndex) || 0);
    return conversation?.lines?.[lineIndex] || null;
  }

  function isReviewSpeakingModeActive() {
    return state.speakingMode === "review" && Boolean(state.speakingReviewSession?.reviewQueue?.length);
  }

  function getCurrentReviewQueueItem() {
    const session = state.speakingReviewSession;
    if (!session || !Array.isArray(session.reviewQueue) || !session.reviewQueue.length) return null;
    return session.reviewQueue[Math.max(0, Number(session.currentIndex) || 0)] || null;
  }

  function getReviewConversationContextByItem(item) {
    const week = getSpeakingWeek(item?.weekId);
    const conversation = getSpeakingConversationById(week, item?.conversationId);
    if (!week || !conversation) return null;
    return { week, conversation };
  }

  function getCurrentReviewConversationContext() {
    const item = getCurrentReviewQueueItem();
    return getReviewConversationContextByItem(item);
  }

  function getAllSpeakingConversationRefs() {
    const refs = [];
    getSpeakingWeeks().forEach((week) => {
      week.shortConversations.forEach((conversation) => {
        const dayKey = String(conversation?.date || "").trim();
        if (!dayKey || !conversation?.id) return;
        refs.push({
          weekId: week.weekId,
          dayKey,
          conversationId: conversation.id
        });
      });
    });
    return refs;
  }

  function countSpeakingConversationSpokenTotal(conversationRef) {
    if (!conversationRef) return 0;
    const dayProgress = getStoredSpeakingDayProgress(conversationRef.weekId, conversationRef.dayKey);
    if (!dayProgress) return 0;
    return getSpeakingConversationSpokenCount(dayProgress, conversationRef.conversationId);
  }

  function getCurrentHomeworkWeekIdForReview() {
    const activeWeekId = String(state.speakingProgress?.weekId || "").trim();
    if (activeWeekId) return activeWeekId;

    if (Array.isArray(state.recentSpeakingProgress) && state.recentSpeakingProgress.length) {
      const recentWeekId = String(state.recentSpeakingProgress[0]?.weekId || "").trim();
      if (recentWeekId) return recentWeekId;
    }

    const dayProgressEntries = Object.values(state.speakingDayProgressMap || {});
    let latestWeekId = "";
    let latestUpdatedAt = -1;
    dayProgressEntries.forEach((entry) => {
      const weekId = String(entry?.weekId || "").trim();
      const updatedAt = Math.max(0, Number(entry?.updatedAt) || 0);
      if (!weekId || updatedAt <= latestUpdatedAt) return;
      latestUpdatedAt = updatedAt;
      latestWeekId = weekId;
    });
    if (latestWeekId) return latestWeekId;

    const weeks = getSpeakingWeeks();
    return String(weeks[0]?.weekId || "").trim();
  }

  function getReviewPriorityScore(conversationRef, currentWeekId) {
    const weekId = String(conversationRef?.weekId || "").trim();
    const conversationId = String(conversationRef?.conversationId || "").trim();
    const isCurrentWeek = Boolean(currentWeekId) && weekId === currentWeekId;
    const homeworkSpokenCount = Math.max(0, countSpeakingConversationSpokenTotal(conversationRef));
    const isHomeworkUnfinished = homeworkSpokenCount < 3;

    const reviewStat = sanitizeSpeakingReviewStatEntry(
      state.speakingReviewStatsMap?.[conversationId] || {},
      conversationId
    ) || {
      conversationId,
      lastSpokenAt: 0,
      spokenCountTotal: 0
    };

    const spokenCountTotal = Math.max(0, Number(reviewStat.spokenCountTotal) || 0);
    const lastSpokenAt = Math.max(0, Number(reviewStat.lastSpokenAt) || 0);
    const hasReviewHistory = lastSpokenAt > 0 || spokenCountTotal > 0;
    const staleRank = lastSpokenAt > 0 ? lastSpokenAt : -1;

    return {
      isCurrentWeek,
      isHomeworkUnfinished,
      hasReviewHistory,
      homeworkSpokenCount,
      spokenCountTotal,
      staleRank,
      weekNumber: Number(parseWeekNumber(weekId) || 999),
      conversationId
    };
  }

  function buildTodayReviewQueue() {
    const allRefs = getAllSpeakingConversationRefs();
    const currentWeekId = getCurrentHomeworkWeekIdForReview();
    const queuedIds = new Set();
    const queue = [];

    const appendUnique = (conversationRef) => {
      if (!conversationRef) return;
      if (!conversationRef.weekId || !conversationRef.dayKey || !conversationRef.conversationId) return;
      if (queuedIds.has(conversationRef.conversationId)) return;
      queuedIds.add(conversationRef.conversationId);
      queue.push(conversationRef);
    };

    const scoredRefs = allRefs
      .map((conversationRef) => ({
        conversationRef,
        score: getReviewPriorityScore(conversationRef, currentWeekId)
      }));

    const currentWeekUnfinished = scoredRefs
      .filter((entry) => entry.score.isCurrentWeek && entry.score.isHomeworkUnfinished)
      .sort((a, b) => {
        if (a.score.homeworkSpokenCount !== b.score.homeworkSpokenCount) {
          return a.score.homeworkSpokenCount - b.score.homeworkSpokenCount;
        }
        if (a.score.staleRank !== b.score.staleRank) return a.score.staleRank - b.score.staleRank;
        return a.score.conversationId.localeCompare(b.score.conversationId);
      });

    const pastWeekNoHistory = scoredRefs
      .filter((entry) => !entry.score.isCurrentWeek && !entry.score.hasReviewHistory)
      .sort((a, b) => {
        if (a.score.weekNumber !== b.score.weekNumber) return a.score.weekNumber - b.score.weekNumber;
        return a.score.conversationId.localeCompare(b.score.conversationId);
      });

    const pastWeekWithHistory = scoredRefs
      .filter((entry) => !entry.score.isCurrentWeek && entry.score.hasReviewHistory)
      .sort((a, b) => {
        if (a.score.staleRank !== b.score.staleRank) return a.score.staleRank - b.score.staleRank;
        if (a.score.spokenCountTotal !== b.score.spokenCountTotal) {
          return a.score.spokenCountTotal - b.score.spokenCountTotal;
        }
        if (a.score.weekNumber !== b.score.weekNumber) return a.score.weekNumber - b.score.weekNumber;
        return a.score.conversationId.localeCompare(b.score.conversationId);
      });

    const pastWeekCandidates = [...pastWeekNoHistory.slice(0, 5), ...pastWeekWithHistory];

    const fallbackOthers = scoredRefs
      .filter((entry) => entry.score.isCurrentWeek && !entry.score.isHomeworkUnfinished)
      .sort((a, b) => {
        if (a.score.staleRank !== b.score.staleRank) return a.score.staleRank - b.score.staleRank;
        if (a.score.spokenCountTotal !== b.score.spokenCountTotal) {
          return a.score.spokenCountTotal - b.score.spokenCountTotal;
        }
        return a.score.conversationId.localeCompare(b.score.conversationId);
      });

    const desiredTotal = Math.min(SPEAKING_REVIEW_MAX_GROUPS, scoredRefs.length);
    const unfinishedCount = currentWeekUnfinished.length;

    let baseCurrentTarget = 0;
    let basePastTarget = desiredTotal;
    if (unfinishedCount >= 21) {
      baseCurrentTarget = 15;
      basePastTarget = 5;
    } else if (unfinishedCount >= 14) {
      baseCurrentTarget = 12;
      basePastTarget = 8;
    } else if (unfinishedCount >= 7) {
      baseCurrentTarget = 8;
      basePastTarget = 12;
    } else if (unfinishedCount >= 1) {
      baseCurrentTarget = unfinishedCount;
      basePastTarget = Math.max(0, desiredTotal - baseCurrentTarget);
    }

    let unfinishedTarget = Math.min(baseCurrentTarget, unfinishedCount, desiredTotal);
    let pastTarget = Math.min(basePastTarget, Math.max(0, desiredTotal - unfinishedTarget), pastWeekCandidates.length);

    // If one side lacks candidates, only then fill from the other side.
    while (unfinishedTarget + pastTarget < desiredTotal) {
      if (unfinishedTarget < unfinishedCount) {
        unfinishedTarget += 1;
        continue;
      }
      if (pastTarget < pastWeekCandidates.length) {
        pastTarget += 1;
        continue;
      }
      break;
    }

    for (let index = 0; index < unfinishedTarget; index += 1) {
      appendUnique(currentWeekUnfinished[index]?.conversationRef);
    }
    for (let index = 0; index < pastTarget; index += 1) {
      appendUnique(pastWeekCandidates[index]?.conversationRef);
    }

    if (queue.length < desiredTotal) {
      currentWeekUnfinished.forEach((entry) => appendUnique(entry.conversationRef));
    }
    if (queue.length < desiredTotal) {
      pastWeekCandidates.forEach((entry) => appendUnique(entry.conversationRef));
    }
    if (queue.length < desiredTotal) {
      fallbackOthers.forEach((entry) => appendUnique(entry.conversationRef));
    }

    return queue.slice(0, SPEAKING_REVIEW_MAX_GROUPS);
  }

  function getRemainingReviewQueueCount() {
    const session = sanitizeSpeakingReviewSession(state.speakingReviewSession);
    if (!session) return 0;
    return Math.max(0, session.reviewQueue.length - session.currentIndex);
  }

  function getTodayReviewPlannedQueue() {
    const resumable = sanitizeSpeakingReviewSession(state.speakingReviewSession);
    if (resumable && resumable.currentIndex < resumable.reviewQueue.length) {
      return resumable.reviewQueue.slice(resumable.currentIndex);
    }
    return buildTodayReviewQueue();
  }

  function getTodayReviewPlannedCount() {
    return getTodayReviewPlannedQueue().length;
  }

  function renderSpeakingReviewTopScreen() {
    const resumable = sanitizeSpeakingReviewSession(state.speakingReviewSession);
    const hasResumable = Boolean(resumable && resumable.currentIndex < resumable.reviewQueue.length);
    const plannedQueue = hasResumable
      ? resumable.reviewQueue.slice(resumable.currentIndex)
      : buildTodayReviewQueue();
    state.speakingReviewPlannedQueue = plannedQueue;
    const setCount = Math.ceil(plannedQueue.length / SPEAKING_REVIEW_SET_SIZE);
    elements.todayReviewPlannedCountText.textContent = `おすすめ ${plannedQueue.length} / ${SPEAKING_REVIEW_MAX_GROUPS}組（${setCount}セット）`;
    elements.startTodayReviewBtn.textContent = hasResumable ? "▶ 復習（続きから）" : "▶ 今日の復習を始める";
    elements.startTodayReviewBtn.disabled = plannedQueue.length <= 0;
    showScreen("speakingReviewTopScreen");
  }

  function renderSpeakingReviewCompleteScreen() {
    showScreen("speakingReviewCompleteScreen");
  }

  function startTodaySpeakingReview() {
    if (!state.learningHistorySession) {
      startMobileLearningHistorySession({
        source: "review",
        mode: "review",
        dayNumber: "",
        startedAt: Date.now()
      });
    }
    recordMobileLearningActivity();
    state.speakingMode = "review";
    const resumable = sanitizeSpeakingReviewSession(state.speakingReviewSession);
    if (resumable && resumable.currentIndex < resumable.reviewQueue.length) {
      state.speakingReviewSession = resumable;
      resetSpeakingHintState();
      state.speakingTranslationVisible = false;
      state.speakingLineStatus = "awaitingStart";
      saveSpeakingReviewSession();
      renderConversationPracticeWithAutoPlay();
      return;
    }

    const queue = buildTodayReviewQueue();
    if (!queue.length) {
      window.alert("今日の復習対象はありません。");
      renderSpeakingReviewTopScreen();
      return;
    }

    state.speakingReviewSession = {
      reviewQueue: queue,
      currentIndex: 0,
      lineIndex: 0,
      pendingPointConversationCount: 0,
      updatedAt: Date.now()
    };
    resetSpeakingHintState();
    state.speakingTranslationVisible = false;
    state.speakingLineStatus = "awaitingStart";
    saveSpeakingReviewSession();
    renderConversationPracticeWithAutoPlay();
  }

  function recordSpeakingReviewConversationSpoken(conversationId) {
    const normalizedConversationId = String(conversationId || "").trim();
    if (!normalizedConversationId) return;
    const current = sanitizeSpeakingReviewStatEntry(
      state.speakingReviewStatsMap[normalizedConversationId] || {},
      normalizedConversationId
    ) || {
      conversationId: normalizedConversationId,
      lastSpokenAt: 0,
      spokenCountTotal: 0
    };
    current.lastSpokenAt = Date.now();
    current.spokenCountTotal = Math.max(0, Number(current.spokenCountTotal) || 0) + 1;
    state.speakingReviewStatsMap[normalizedConversationId] = current;
    saveSpeakingReviewStats();
  }

  function resolveSpeakingConversationRefForReviewProgress(conversationId, context = null) {
    const normalizedConversationId = String(conversationId || "").trim();
    if (!normalizedConversationId) return null;

    const contextWeekId = String(context?.weekId || "").trim();
    const contextDayKey = String(context?.dayKey || "").trim();
    if (contextWeekId && contextDayKey) {
      const contextWeek = getSpeakingWeek(contextWeekId);
      const contextConversation = getSpeakingConversationById(contextWeek, normalizedConversationId);
      if (contextWeek && contextConversation && String(contextConversation?.date || "").trim() === contextDayKey) {
        return {
          weekId: contextWeekId,
          dayKey: contextDayKey,
          conversationId: normalizedConversationId
        };
      }
    }

    const allRefs = getAllSpeakingConversationRefs();
    return allRefs.find((ref) => ref.conversationId === normalizedConversationId) || null;
  }

  function reflectReviewConversationInSpeakingDayProgress(conversationId, context = null) {
    const ref = resolveSpeakingConversationRefForReviewProgress(conversationId, context);
    if (!ref) return;

    const week = getSpeakingWeek(ref.weekId);
    if (!week) return;
    const conversation = getSpeakingConversationById(week, ref.conversationId);
    if (!conversation) return;
    const dayKey = String(conversation?.date || "").trim();
    if (!dayKey || dayKey !== String(ref.dayKey || "").trim()) return;

    const storageId = buildSpeakingDayProgressId(ref.weekId, dayKey);
    if (!storageId) return;

    const existingProgress = getStoredSpeakingDayProgress(ref.weekId, dayKey);
    const baseProgress = existingProgress
      ? sanitizeSpeakingProgress(existingProgress)
      : createSpeakingProgress(ref.weekId, [dayKey]);
    if (!baseProgress) return;

    baseProgress.dayKey = dayKey;
    const currentSpokenCount = getSpeakingConversationSpokenCount(baseProgress, ref.conversationId);
    const targetRounds = getSpeakingTargetRounds(baseProgress);
    if (currentSpokenCount >= targetRounds) return;

    const ensureRoundProgress = () => {
      if (!Array.isArray(baseProgress.completedConversationIds)) {
        baseProgress.completedConversationIds = [];
      }

      if (!baseProgress.completedConversationIds.includes(ref.conversationId)) {
        baseProgress.completedConversationIds.push(ref.conversationId);
        return true;
      }

      const dayConversationIds = getSpeakingPracticeConversationIds(week, [dayKey]);
      const requiredConversationIds = dayConversationIds.length
        ? dayConversationIds
        : [ref.conversationId];
      const isCurrentRoundComplete = requiredConversationIds.every(
        (conversationIdInRound) => baseProgress.completedConversationIds.includes(conversationIdInRound)
      );
      if (!isCurrentRoundComplete) return false;

      baseProgress.completedRounds = Math.min(
        targetRounds,
        Math.max(0, Number(baseProgress.completedRounds) || 0) + 1
      );
      if (baseProgress.completedRounds >= targetRounds) {
        baseProgress.completedConversationIds = [];
        return true;
      }

      baseProgress.completedConversationIds = [ref.conversationId];
      return true;
    };

    const didReflect = ensureRoundProgress();
    if (!didReflect) return;

    baseProgress.updatedAt = Date.now();
    state.speakingDayProgressMap[storageId] = sanitizeSpeakingProgress(baseProgress);
    persistSpeakingProgressStore();
  }

  function recordSpeakingReviewConversationCompletion(conversationId, context = null) {
    recordSpeakingReviewConversationSpoken(conversationId);
    reflectReviewConversationInSpeakingDayProgress(conversationId, context);
  }

  function resetSpeakingHintState() {
    state.speakingHintVisible = false;
    state.speakingHintStep = 0;
    state.speakingHintTitle = "";
    state.speakingHintText = "";
    state.speakingLevel1MissingKeywords = [];
    state.speakingRecognitionDebugHtml = "";
  }

  function computeLevenshteinDistance(source, target) {
    const a = String(source || "");
    const b = String(target || "");
    if (!a) return b.length;
    if (!b) return a.length;
    const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let row = 0; row <= a.length; row += 1) matrix[row][0] = row;
    for (let col = 0; col <= b.length; col += 1) matrix[0][col] = col;
    for (let row = 1; row <= a.length; row += 1) {
      for (let col = 1; col <= b.length; col += 1) {
        const cost = a[row - 1] === b[col - 1] ? 0 : 1;
        matrix[row][col] = Math.min(
          matrix[row - 1][col] + 1,
          matrix[row][col - 1] + 1,
          matrix[row - 1][col - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  }

  function findClosestRecognizedFragment(targetKeyword, transcriptList) {
    const normalizedTarget = normalizeSpeakingKeywordToken(targetKeyword);
    const targetTokenCount = normalizedTarget.split(" ").filter(Boolean).length;
    if (!normalizedTarget || !targetTokenCount) return "";

    const rawTranscripts = (Array.isArray(transcriptList) ? transcriptList : [])
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    if (!rawTranscripts.length) return "";

    const candidates = [];
    rawTranscripts.forEach((raw) => {
      const normalized = normalizeSpeakingKeywordToken(raw);
      if (!normalized) return;
      candidates.push({ raw, normalized });

      const rawTokens = raw.split(/\s+/).filter(Boolean);
      for (let start = 0; start < rawTokens.length; start += 1) {
        for (let length = 1; length <= targetTokenCount; length += 1) {
          const slice = rawTokens.slice(start, start + length);
          if (!slice.length) continue;
          const rawSlice = slice.join(" ");
          const normalizedSlice = normalizeSpeakingKeywordToken(rawSlice);
          if (!normalizedSlice) continue;
          candidates.push({ raw: rawSlice, normalized: normalizedSlice });
        }
      }
    });

    if (!candidates.length) return "";
    let best = candidates[0];
    let bestDistance = computeLevenshteinDistance(normalizedTarget, best.normalized);
    for (let index = 1; index < candidates.length; index += 1) {
      const candidate = candidates[index];
      const distance = computeLevenshteinDistance(normalizedTarget, candidate.normalized);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }

    const maxLength = Math.max(normalizedTarget.length, best.normalized.length, 1);
    const similarity = 1 - (bestDistance / maxLength);
    return similarity >= 0.45 ? best.raw : "";
  }

  function setSpeakingKeywordDebugFeedback(lineKeywords, transcriptList, isCorrect, missingKeywords = []) {
    if (!ENABLE_SPEAKING_KEYWORD_DEBUG || isCorrect) {
      state.speakingRecognitionDebugHtml = "";
      return;
    }
    void lineKeywords;
    const incorrectKeywords = Array.isArray(missingKeywords)
      ? missingKeywords.map((keyword) => String(keyword || "").trim()).filter(Boolean)
      : [];
    if (!incorrectKeywords.length) {
      state.speakingRecognitionDebugHtml = "";
      return;
    }

    const recognizedText = incorrectKeywords
      .map((keyword) => findClosestRecognizedFragment(keyword, transcriptList) || "（認識なし）")
      .join(" / ");
    const expectedText = incorrectKeywords.join(" / ");

    state.speakingRecognitionDebugHtml = [
      `<span class="recognition-debug-line recognition-debug-wrong">認識: ❌ ${escapeHtml(recognizedText)}</span>`,
      `<span class="recognition-debug-line recognition-debug-correct">正解: ✅ ${escapeHtml(expectedText)}</span>`
    ].join("<br>");
    console.log(`認識: ❌ ${recognizedText}`);
    console.log(`正解: ✅ ${expectedText}`);
  }

  function getSpeakingHintSpec(line) {
    const hintType = ["none", "noun", "pattern"].includes(line?.hintType)
      ? line.hintType
      : "none";

    if (hintType === "none") {
      return { hintType, hints: [], patternHint: "" };
    }

    if (hintType === "noun") {
      const hints = Array.isArray(line?.hints)
        ? line.hints.map((hint) => String(hint || "").trim()).filter(Boolean)
        : [];
      if (!hints.length) {
        return { hintType: "none", hints: [], patternHint: "" };
      }
      return {
        hintType,
        hints,
        patternHint: ""
      };
    }

    const hints = Array.isArray(line?.hints)
      ? line.hints.map((hint) => String(hint || "").trim()).filter(Boolean)
      : [];
    const patternHint = String(line?.patternHint || "").trim();
    if (!patternHint) {
      return { hintType: "none", hints: [], patternHint: "" };
    }
    return {
      hintType,
      patternHint,
      hints
    };
  }

  function closeSpeakingHint() {
    recordMobileLearningActivity();
    state.speakingHintVisible = false;
    renderConversationPractice();
  }

  function showNextSpeakingHint() {
    recordMobileLearningActivity();
    const line = getCurrentSpeakingLine();
    if (!line) return;
    const spec = getSpeakingHintSpec(line);

    if (spec.hintType === "none") {
      state.speakingHintVisible = true;
      state.speakingHintStep = 1;
      state.speakingHintTitle = "ヒントなし";
      state.speakingHintText = "";
      renderConversationPractice();
      return;
    }

    state.speakingHintVisible = true;

    if (spec.hintType === "noun") {
      const hasSecondHint = Boolean(spec.hints[1]);
      const nextStep = hasSecondHint ? Math.min(2, state.speakingHintStep + 1) : 1;
      state.speakingHintStep = Math.max(1, nextStep);
      if (state.speakingHintStep === 1) {
        state.speakingHintTitle = "💡 ヒント①";
        state.speakingHintText = spec.hints[0] || "ヒントなし";
      } else {
        state.speakingHintTitle = "💡 ヒント②";
        state.speakingHintText = spec.hints[1];
      }
    } else {
      // patternHint is kept in data for internal/reference use, but UI shows only Japanese hint text.
      state.speakingHintStep = 1;
      state.speakingHintTitle = "💡 ヒント①";
      state.speakingHintText = spec.hints[0] || "ヒントなし";
    }

    renderConversationPractice();
  }

  function getSpeechSynthesisEngine() {
    return typeof window.speechSynthesis === "undefined" ? null : window.speechSynthesis;
  }

  function pickEnglishVoice() {
    const speechSynthesis = getSpeechSynthesisEngine();
    if (!speechSynthesis || typeof speechSynthesis.getVoices !== "function") return null;
    const voices = speechSynthesis.getVoices() || [];
    if (!voices.length) return null;
    return voices.find((voice) => /^en-US$/i.test(String(voice.lang || "")))
      || voices.find((voice) => /^en/i.test(String(voice.lang || "")))
      || null;
  }

  function clearSpeakingWatchdog() {
    if (state.speakingAudioWatchdogId) {
      window.clearTimeout(state.speakingAudioWatchdogId);
      state.speakingAudioWatchdogId = null;
    }
  }

  function stopSpeakingAudio() {
    clearSpeakingWatchdog();
    state.speakingAudioPlaying = false;
    state.speakingUtterance = null;
    const speechSynthesis = getSpeechSynthesisEngine();
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }
  }

  function createSpeakingProgress(weekId, selectedDayKeys = null) {
    const week = getSpeakingWeek(weekId);
    if (!week || !week.shortConversations.length) return null;
    const normalizedDayKeys = sanitizeSelectedDayKeys(week, selectedDayKeys, { fallbackToAll: false });
    const dayKey = String(normalizedDayKeys[0] || "").trim();
    return {
      weekId,
      dayKey,
      conversationOrder: getSpeakingConversationOrderForRound(week, 1, normalizedDayKeys),
      conversationIndex: 0,
      lineIndex: 0,
      completedRounds: 0,
      conversationSetCount: 0,
      completedConversationIds: [],
      phase: "line",
      updatedAt: Date.now()
    };
  }

  function parseWeekNumber(weekId) {
    const match = /^W(\d+)$/i.exec(String(weekId || "").trim());
    if (!match) return null;
    const numeric = Number(match[1]);
    return Number.isFinite(numeric) ? numeric : null;
  }

  function isSpeakingLevel1Week(week) {
    const weekNumber = parseWeekNumber(week?.weekId);
    if (!Number.isFinite(weekNumber)) return false;
    return weekNumber >= 1 && weekNumber <= 7;
  }

  function getSpeakingWeekDisplayName(week) {
    const weekNumber = parseWeekNumber(week?.weekId);
    if (Number.isFinite(weekNumber)) {
      return `Week${weekNumber}`;
    }
    return String(week?.weekId || "Week");
  }

  function formatSpeakingMonthDay(value) {
    const source = String(value || "").trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(source);
    if (!match) return "";
    const [, , month, day] = match;
    return `${Number(month)}/${Number(day)}`;
  }

  function getSpeakingWeekDateRangeText(week) {
    const startText = formatSpeakingMonthDay(week?.startDate);
    const endText = formatSpeakingMonthDay(week?.endDate);
    if (startText && endText) {
      return `${startText}～${endText}`;
    }
    return String(week?.label || "").trim();
  }

  function getSpeakingWeekDisplayLabel(week) {
    const rangeText = getSpeakingWeekDateRangeText(week);
    return `${getSpeakingWeekDisplayName(week)}（${rangeText}）`;
  }

  function getSpeakingLevel1QuestionLine(conversation) {
    if (!conversation || !Array.isArray(conversation.lines)) return null;
    const firstLine = conversation.lines[0];
    if (firstLine && String(firstLine?.english || "").trim()) return firstLine;
    return conversation.lines.find((line) => String(line?.english || "").trim()) || null;
  }

  function getSpeakingLevel1AnswerLine(conversation) {
    if (!conversation || !Array.isArray(conversation.lines)) return null;
    const secondLine = conversation.lines[1];
    if (secondLine && String(secondLine?.english || "").trim()) return secondLine;
    return null;
  }

  function createSpeakingLevel1Session(progress, week) {
    return {
      weekId: String(progress?.weekId || "").trim(),
      dayKey: resolveSpeakingProgressDayKey(week, progress),
      startedAt: Date.now(),
      completedCount: Math.max(0, Number(progress?.conversationIndex) || 0),
      correctCount: 0,
      lastConversationId: ""
    };
  }

  function ensureSpeakingLevel1Session(progress, week, conversationId) {
    const normalizedConversationId = String(conversationId || "").trim();
    const needsReset = !state.speakingLevel1Session
      || state.speakingLevel1Session.weekId !== progress.weekId
      || state.speakingLevel1Session.dayKey !== resolveSpeakingProgressDayKey(week, progress);

    if (needsReset) {
      state.speakingLevel1Session = createSpeakingLevel1Session(progress, week);
      state.speakingLevel1AttemptUsed = 0;
      state.speakingLevel1AttemptKey = "";
    }

    if (state.speakingLevel1Session.lastConversationId !== normalizedConversationId) {
      state.speakingLevel1AttemptUsed = 0;
      state.speakingLevel1AttemptKey = "";
      state.speakingLevel1Session.lastConversationId = normalizedConversationId;
      resetSpeakingHintState();
    }

    return state.speakingLevel1Session;
  }

  function clearSpeakingAutoAdvanceTimer() {
    if (!state.speakingAutoAdvanceTimerId) return;
    window.clearTimeout(state.speakingAutoAdvanceTimerId);
    state.speakingAutoAdvanceTimerId = null;
  }

  function clearSpeakingRecognition() {
    const recognition = state.speakingRecognition;
    state.speakingRecognition = null;
    state.speakingRecognitionInProgress = false;
    if (!recognition || typeof recognition.abort !== "function") return;
    try {
      recognition.abort();
    } catch (_error) {
      // noop
    }
  }

  function normalizeSpeakingKeywordToken(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[’`´]/g, "'")
      .replace(/[^a-z0-9'\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isSpeakingLevel1KeywordMatch(lineKeywords, transcriptList) {
    const keywords = Array.isArray(lineKeywords)
      ? lineKeywords
        .map((keyword) => normalizeSpeakingKeywordToken(keyword))
        .filter(Boolean)
      : [];
    const normalizedCandidates = (Array.isArray(transcriptList) ? transcriptList : [])
      .map((entry) => normalizeSpeakingKeywordToken(entry))
      .filter(Boolean);
    if (!keywords.length || !normalizedCandidates.length) return false;
    return normalizedCandidates.some((candidate) => keywords.every((keyword) => candidate.includes(keyword)));
  }

  function analyzeSpeakingLevel1KeywordMatch(lineKeywords, transcriptList) {
    const rawKeywords = Array.isArray(lineKeywords)
      ? lineKeywords.map((keyword) => String(keyword || "").trim()).filter(Boolean)
      : [];
    const normalizedCandidates = (Array.isArray(transcriptList) ? transcriptList : [])
      .map((entry) => normalizeSpeakingKeywordToken(entry))
      .filter(Boolean);
    const normalizedKeywordMap = new Map();
    rawKeywords.forEach((keyword) => {
      const normalized = normalizeSpeakingKeywordToken(keyword);
      if (!normalized || normalizedKeywordMap.has(normalized)) return;
      normalizedKeywordMap.set(normalized, keyword);
    });
    const normalizedKeywords = Array.from(normalizedKeywordMap.keys());
    if (!normalizedKeywords.length || !normalizedCandidates.length) {
      return {
        isCorrect: false,
        missingKeywords: Array.from(normalizedKeywordMap.values())
      };
    }

    const matchedKeywordSet = new Set();
    normalizedKeywords.forEach((keyword) => {
      if (normalizedCandidates.some((candidate) => candidate.includes(keyword))) {
        matchedKeywordSet.add(keyword);
      }
    });
    const missingKeywords = normalizedKeywords
      .filter((keyword) => !matchedKeywordSet.has(keyword))
      .map((keyword) => normalizedKeywordMap.get(keyword))
      .filter(Boolean);

    return {
      isCorrect: missingKeywords.length === 0,
      missingKeywords
    };
  }

  function getSpeakingLevel1HintText(conversation, targetLine, missingKeywords = []) {
    void conversation;
    void targetLine;
    const visibleMissingKeywords = Array.isArray(missingKeywords)
      ? missingKeywords.map((keyword) => String(keyword || "").trim()).filter(Boolean)
      : [];
    if (!visibleMissingKeywords.length) return "Missing:";
    return `Missing: ${visibleMissingKeywords.map((keyword) => `🔴 ${keyword}`).join(" / ")}`;
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeRegExp(text) {
    return String(text || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function buildSpeakingLevel1MissingEnglishHtml(englishText, missingKeywords = []) {
    const source = String(englishText || "");
    const visibleMissingKeywords = Array.isArray(missingKeywords)
      ? missingKeywords.map((keyword) => String(keyword || "").trim()).filter(Boolean)
      : [];
    if (!source || !visibleMissingKeywords.length) return escapeHtml(source);

    const normalizedMissingSet = new Set();
    const uniqueMissingKeywords = [];
    visibleMissingKeywords.forEach((keyword) => {
      const normalized = normalizeSpeakingKeywordToken(keyword);
      if (!normalized || normalizedMissingSet.has(normalized)) return;
      normalizedMissingSet.add(normalized);
      uniqueMissingKeywords.push(normalized);
    });
    if (!uniqueMissingKeywords.length) return escapeHtml(source);

    const ranges = [];
    uniqueMissingKeywords.forEach((normalizedKeyword) => {
      const patternSource = normalizedKeyword
        .split(" ")
        .filter(Boolean)
        .map((part) => escapeRegExp(part))
        .join("\\s+");
      if (!patternSource) return;
      const pattern = new RegExp(`\\b${patternSource}\\b`, "gi");
      let match;
      while ((match = pattern.exec(source))) {
        ranges.push({
          start: match.index,
          end: match.index + match[0].length,
          length: match[0].length
        });
        if (pattern.lastIndex === match.index) {
          pattern.lastIndex += 1;
        }
      }
    });
    if (!ranges.length) return escapeHtml(source);

    ranges.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.length - a.length;
    });

    const merged = [];
    ranges.forEach((range) => {
      const last = merged[merged.length - 1];
      if (!last || range.start >= last.end) {
        merged.push(range);
      }
    });

    let cursor = 0;
    let html = "";
    merged.forEach((range) => {
      html += escapeHtml(source.slice(cursor, range.start));
      html += `<span class="speaking-missing-keyword">${escapeHtml(source.slice(range.start, range.end))}</span>`;
      cursor = range.end;
    });
    html += escapeHtml(source.slice(cursor));
    return html;
  }

  function formatSecondsToJa(durationSeconds) {
    const seconds = Math.max(0, Math.floor(Number(durationSeconds) || 0));
    const minute = Math.floor(seconds / 60);
    const remain = seconds % 60;
    return `${minute}分${String(remain).padStart(2, "0")}秒`;
  }

  function getSpeakingOrderedDayKeys(week) {
    return [...new Set((week?.shortConversations || []).map((entry) => String(entry?.date || "").trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }

  function sanitizeSelectedDayKeys(week, selectedDayKeys, options = {}) {
    const fallbackToAll = options?.fallbackToAll !== false;
    const orderedDayKeys = getSpeakingOrderedDayKeys(week);
    const validSet = new Set(orderedDayKeys);
    const requested = Array.isArray(selectedDayKeys)
      ? [...new Set(selectedDayKeys.map((value) => String(value || "").trim()).filter((value) => validSet.has(value)))]
      : [];
    if (!requested.length) return fallbackToAll ? orderedDayKeys : [];
    const requestedSet = new Set(requested);
    return orderedDayKeys.filter((dayKey) => requestedSet.has(dayKey));
  }

  function getSpeakingSelectedDayKeysFromOrder(week, conversationOrder) {
    const orderedDayKeys = getSpeakingOrderedDayKeys(week);
    const orderSet = new Set();
    (Array.isArray(conversationOrder) ? conversationOrder : []).forEach((conversationId) => {
      const conversation = getSpeakingConversationById(week, conversationId);
      const dayKey = String(conversation?.date || "").trim();
      if (dayKey) orderSet.add(dayKey);
    });
    if (!orderSet.size) return orderedDayKeys;
    return orderedDayKeys.filter((dayKey) => orderSet.has(dayKey));
  }

  function buildSpeakingDayProgressId(weekId, dayKey) {
    const normalizedWeekId = String(weekId || "").trim();
    const normalizedDayKey = String(dayKey || "").trim();
    if (!normalizedWeekId || !normalizedDayKey) return "";
    return `${normalizedWeekId}__${normalizedDayKey}`;
  }

  function resolveSpeakingProgressDayKey(week, progress) {
    const progressDayKey = String(progress?.dayKey || "").trim();
    if (progressDayKey) return progressDayKey;
    const selectedDayKeys = getSpeakingSelectedDayKeysFromOrder(week, progress?.conversationOrder || []);
    return String(selectedDayKeys[0] || "").trim();
  }

  function getStoredSpeakingDayProgress(weekId, dayKey) {
    const storageId = buildSpeakingDayProgressId(weekId, dayKey);
    if (!storageId) return null;
    return state.speakingDayProgressMap[storageId] || null;
  }

  function setActiveSpeakingDayQueue(dayKeys, currentDayKey) {
    const queue = Array.isArray(dayKeys)
      ? [...new Set(dayKeys.map((value) => String(value || "").trim()).filter(Boolean))]
      : [];
    const fallbackCurrentDayKey = String(currentDayKey || "").trim();
    if (!queue.length && fallbackCurrentDayKey) {
      queue.push(fallbackCurrentDayKey);
    }
    state.speakingUi.activeConversationDayKeys = queue;
    if (!fallbackCurrentDayKey) return;
    if (!state.speakingUi.activeConversationDayKeys.includes(fallbackCurrentDayKey)) {
      state.speakingUi.activeConversationDayKeys.unshift(fallbackCurrentDayKey);
    }
  }

  function getNextSpeakingDayKeyFromQueue(progress) {
    const week = getSpeakingProgressWeek();
    if (!week || !progress) return "";
    const currentDayKey = resolveSpeakingProgressDayKey(week, progress);
    const queue = sanitizeSelectedDayKeys(week, state.speakingUi.activeConversationDayKeys, { fallbackToAll: false });
    if (!queue.length || !currentDayKey) return "";
    const currentIndex = queue.indexOf(currentDayKey);
    if (currentIndex < 0) return "";
    return String(queue[currentIndex + 1] || "").trim();
  }

  function getSpeakingConversationKind(conversation) {
    const conversationId = String(conversation?.id || "").trim();
    if (/-QR\d+$/i.test(conversationId)) return "QR";
    if (/-SC\d+$/i.test(conversationId)) return "SC";
    return conversation?.lines?.length === 2 ? "QR" : "SC";
  }

  function getQuickResponseCandidates(dayBucket) {
    return [...(dayBucket?.qr || [])];
  }

  function selectQuickResponseIds(qrCandidates, limit) {
    const normalizedLimit = Math.max(0, Number(limit) || 0);
    if (!normalizedLimit) return [];
    // Keep stable order and limit count by explicit daily homework setting.
    return [...qrCandidates].slice(0, normalizedLimit);
  }

  function getSpeakingDailyHomeworkSetting(week, dayKey) {
    const weekId = String(week?.weekId || "").trim();
    const homework = window.speakingData?.dailyHomework?.[weekId]?.[dayKey];
    const sc = Math.max(0, Number(homework?.sc) || 0);
    const qr = Math.max(0, Number(homework?.qr) || 0);
    const configuredStarts = Array.isArray(homework?.scLineStarts)
      ? homework.scLineStarts.filter((value) => Number.isInteger(value) && value >= 0)
      : [];
    const scLineStarts = configuredStarts.length ? configuredStarts : [0];
    return { sc, qr, scLineStarts };
  }

  function getSpeakingConversationCurrentSetIndex(lineIndex, scLineStarts) {
    const starts = Array.isArray(scLineStarts) && scLineStarts.length ? scLineStarts : [0];
    const currentLine = Math.max(0, Number(lineIndex) || 0);
    let currentSetIndex = 0;
    for (let index = 0; index < starts.length; index += 1) {
      if (currentLine >= starts[index]) {
        currentSetIndex = index;
      } else {
        break;
      }
    }
    return Math.min(currentSetIndex, Math.max(0, starts.length - 1));
  }

  function buildSpeakingDayBucket(week, dayKey) {
    const dayBucket = { sc: [], qr: [] };
    week.shortConversations.forEach((entry) => {
      if (String(entry?.date || "").trim() !== dayKey) return;
      if (getSpeakingConversationKind(entry) === "QR") {
        dayBucket.qr.push(entry);
      } else {
        dayBucket.sc.push(entry);
      }
    });
    return dayBucket;
  }

  function getSpeakingDaySetProgress(week, conversation, lineIndex) {
    const dayKey = String(conversation?.date || "").trim() || "no-date";
    const dayBucket = buildSpeakingDayBucket(week, dayKey);
    const homework = getSpeakingDailyHomeworkSetting(week, dayKey);
    const selectedQrIds = selectQuickResponseIds(getQuickResponseCandidates({
      qr: dayBucket.qr.map((entry) => entry.id)
    }), homework.qr);
    const totalScSets = homework.sc;
    const totalSets = totalScSets + selectedQrIds.length;

    if (getSpeakingConversationKind(conversation) === "SC") {
      const currentScSetIndex = getSpeakingConversationCurrentSetIndex(lineIndex, homework.scLineStarts);
      const currentSet = Math.min(totalScSets, currentScSetIndex + 1);
      return { currentSet, totalSets: Math.max(1, totalSets) };
    }

    const qrIndex = selectedQrIds.indexOf(conversation.id);
    const currentSet = totalScSets + (qrIndex >= 0 ? qrIndex + 1 : 1);
    return { currentSet, totalSets: Math.max(1, totalSets) };
  }

  function getSpeakingPracticeConversationIds(week, selectedDayKeys = null) {
    const perDay = new Map();
    const enabledDayKeys = sanitizeSelectedDayKeys(week, selectedDayKeys);
    const enabledDaySet = new Set(enabledDayKeys);

    week.shortConversations.forEach((conversation) => {
      const dayKey = String(conversation?.date || "").trim() || "no-date";
      if (enabledDaySet.size && !enabledDaySet.has(dayKey)) return;
      if (!perDay.has(dayKey)) {
        perDay.set(dayKey, { sc: [], qr: [] });
      }
      const bucket = perDay.get(dayKey);
      if (getSpeakingConversationKind(conversation) === "QR") {
        bucket.qr.push(conversation.id);
      } else {
        bucket.sc.push(conversation.id);
      }
    });

    const orderedConversationIds = [];
    enabledDayKeys.forEach((dayKey) => {
      const bucket = perDay.get(dayKey);
      if (!bucket) return;
      const homework = getSpeakingDailyHomeworkSetting(week, dayKey);
      orderedConversationIds.push(...bucket.sc);
      const qrCandidates = getQuickResponseCandidates(bucket);
      const selectedQrIds = selectQuickResponseIds(qrCandidates, homework.qr);
      orderedConversationIds.push(...selectedQrIds);
    });

    return orderedConversationIds.length
      ? orderedConversationIds
      : week.shortConversations.map((conversation) => conversation.id);
  }

  function getSpeakingConversationOrderForRound(week, roundNumber, selectedDayKeys = null) {
    const orderedConversationIds = getSpeakingPracticeConversationIds(week, selectedDayKeys);
    if (roundNumber >= 4) {
      return shuffleArray(orderedConversationIds);
    }
    return orderedConversationIds;
  }

  function getSpeakingCompletedRounds(progress = state.speakingProgress) {
    return Math.max(0, Number(progress?.completedRounds) || 0);
  }

  function getSpeakingCurrentRound(progress = state.speakingProgress) {
    const completedRounds = getSpeakingCompletedRounds(progress);
    if (progress?.phase === "conversationComplete") {
      return Math.max(1, completedRounds);
    }
    return completedRounds + 1;
  }

  function getSpeakingTargetRounds(progress = state.speakingProgress) {
    void progress;
    return 5;
  }

  function buildSpeakingContinueLines(progress, week) {
    const completedRounds = getSpeakingCompletedRounds(progress);
    const currentRound = getSpeakingCurrentRound(progress);
    const targetRounds = getSpeakingTargetRounds(progress);

    if (progress.phase === "conversationComplete") {
      if (completedRounds >= 5) {
        return ["5 / 5周 完了", "🌟 Excellent!"];
      }
      return [`${completedRounds} / ${targetRounds}周 完了`];
    }

    return [
      getSpeakingWeekDisplayLabel(week),
      `${completedRounds} / ${targetRounds}周 完了`,
      `${currentRound}周目の途中`
    ];
  }

  function renderButtonLines(button, lines) {
    button.innerHTML = "";
    lines.forEach((line, index) => {
      const span = document.createElement("span");
      span.className = "continue-btn-line";
      if (index === 0) {
        span.classList.add("continue-btn-title");
      } else if (index === 1) {
        span.classList.add("continue-btn-progress");
      } else {
        span.classList.add("continue-btn-detail");
      }
      span.textContent = line;
      button.appendChild(span);
    });
  }

  function getAvailableConversationWeeks() {
    const availableWeeks = getSpeakingWeeks();
    return availableWeeks.sort((a, b) => {
      const aWeek = parseWeekNumber(a.weekId);
      const bWeek = parseWeekNumber(b.weekId);
      if (Number.isFinite(aWeek) && Number.isFinite(bWeek)) {
        return aWeek - bWeek;
      }
      return String(a.weekId || "").localeCompare(String(b.weekId || ""));
    });
  }

  function startConversationPracticeFromSelector() {
    recordMobileLearningActivity();
    const selectedWeek = getSpeakingWeekBySelector();
    if (!selectedWeek) {
      return;
    }
    const previousWeekId = String(state.speakingUi.selectedConversationWeekId || "").trim();
    state.speakingUi.selectedConversationWeekId = selectedWeek.weekId;
    if (previousWeekId !== selectedWeek.weekId) {
      state.speakingUi.selectedConversationDayKeys = [];
    }
    renderConversationDaySelectScreen();
  }

  function startVocabularyPracticeFromConversationSelector() {
    const selectedWeek = getSpeakingWeekBySelector();
    if (!selectedWeek) {
      return;
    }
    state.speakingUi.selectedConversationWeekId = selectedWeek.weekId;
    state.speakingUi.speakingWordSelectedWeekId = selectedWeek.weekId;
    state.speakingUi.speakingWordDaySelectBackTarget = "conversation-select";
    renderSpeakingWordDaySelectScreen();
  }

  function handleSpeakingWordDaySelectBack() {
    if (state.speakingUi.speakingWordDaySelectBackTarget === "conversation-select") {
      renderConversationSelectScreen();
      return;
    }
    renderSpeakingWordWeekSelectScreen();
  }

  function executeStartConversationPractice(week, selectedDayKeys) {
    const progress = createSpeakingProgress(week.weekId, selectedDayKeys);
    if (!progress) {
      window.alert("このWeekの会話データはまだありません。");
      return;
    }

    if (!state.learningHistorySession) {
      startMobileLearningHistorySession({
        source: "conversation",
        mode: isSpeakingLevel1Week(week) ? "speaking" : "conversation",
        dayNumber: getMobileLearningHistoryDayNumberFromSpeakingProgress(progress),
        startedAt: Date.now(),
        session: progress
      });
    }
    recordMobileLearningActivity();

    stopSpeakingAudio();
    state.speakingMode = "week";
    state.speakingProgress = progress;
    state.speakingLevel1Session = null;
    state.speakingLevel1AttemptUsed = 0;
    resetSpeakingHintState();
    state.speakingTranslationVisible = false;
    state.speakingLineStatus = "awaitingStart";
    saveSpeakingProgress();
    renderConversationPracticeWithAutoPlay();
  }

  function startOrResumeSpeakingDay(week, dayKey, dayQueue) {
    const normalizedDayKey = String(dayKey || "").trim();
    if (!week || !normalizedDayKey) {
      renderConversationDaySelectScreen();
      return;
    }

    const queue = sanitizeSelectedDayKeys(week, dayQueue, { fallbackToAll: false });
    setActiveSpeakingDayQueue(queue, normalizedDayKey);

    if (!state.learningHistorySession) {
      startMobileLearningHistorySession({
        source: "conversation",
        mode: isSpeakingLevel1Week(week) ? "speaking" : "conversation",
        dayNumber: normalizedDayKey,
        startedAt: Date.now(),
        session: null
      });
    }
    recordMobileLearningActivity();

    const storedProgress = getStoredSpeakingDayProgress(week.weekId, normalizedDayKey);
    if (storedProgress && hasMeaningfulSpeakingProgress(storedProgress)) {
      stopSpeakingAudio();
      state.speakingMode = "week";
      state.speakingProgress = { ...storedProgress };
      state.speakingLevel1Session = null;
      state.speakingLevel1AttemptUsed = 0;
      resetSpeakingHintState();
      state.speakingTranslationVisible = false;
      state.speakingLineStatus = "awaitingStart";

      if (state.speakingProgress.phase === "conversationComplete") {
        moveToNextSpeakingConversation();
        return;
      }

      saveSpeakingProgress();
      renderConversationPracticeWithAutoPlay();
      return;
    }

    executeStartConversationPractice(week, [normalizedDayKey]);
    setActiveSpeakingDayQueue(queue, normalizedDayKey);
  }

  function restartCurrentSpeakingDayFromBeginning() {
    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    if (!progress || !week) {
      renderConversationDaySelectScreen();
      return;
    }
    const currentDayKey = resolveSpeakingProgressDayKey(week, progress);
    if (!currentDayKey) {
      renderConversationDaySelectScreen();
      return;
    }
    executeStartConversationPractice(week, [currentDayKey]);
    setActiveSpeakingDayQueue(state.speakingUi.activeConversationDayKeys, currentDayKey);
  }

  function hasMeaningfulSpeakingProgress(progress) {
    if (!progress) return false;
    const completedRounds = Math.max(0, Number(progress.completedRounds) || 0);
    const conversationIndex = Math.max(0, Number(progress.conversationIndex) || 0);
    const lineIndex = Math.max(0, Number(progress.lineIndex) || 0);
    const conversationSetCount = Math.max(0, Number(progress.conversationSetCount) || 0);
    const completedCount = Array.isArray(progress.completedConversationIds) ? progress.completedConversationIds.length : 0;
    return completedRounds > 0
      || completedCount > 0
      || conversationIndex > 0
      || lineIndex > 0
      || conversationSetCount > 0
      || progress.phase === "conversationComplete";
  }

  function startConversationPracticeFromSelectedDays() {
    const week = getSpeakingWeek(state.speakingUi.selectedConversationWeekId);
    if (!week) {
      renderConversationSelectScreen();
      return;
    }
    const selectedDayKeys = sanitizeSelectedDayKeys(week, state.speakingUi.selectedConversationDayKeys, { fallbackToAll: false });
    if (!selectedDayKeys.length) {
      window.alert("学習する曜日を1つ以上選択してください。");
      return;
    }

    startOrResumeSpeakingDay(week, selectedDayKeys[0], selectedDayKeys);
  }

  function renderConversationDaySelectActionButtons(week, selectedDayKeys) {
    void week;
    const hasSelectedDays = Array.isArray(selectedDayKeys) && selectedDayKeys.length > 0;
    elements.startSelectedConversationDaysBtn.disabled = !hasSelectedDays;
    elements.startSelectedConversationDaysBtn.textContent = "▶ 学習を始める";
  }

  function startSpeakingVocabularyPractice() {
    if (state.speakingUi.vocabularyRangeMode === "week") {
      renderSpeakingWordWeekSelectScreen();
      return;
    }

    if (state.speakingUi.vocabularyRangeMode === "day") {
      const start = clampDay(state.speakingUi.startDay);
      const end = clampDay(state.speakingUi.endDay);
      state.settings.rangeMode = "day";
      state.settings.startDay = Math.min(start, end);
      state.settings.endDay = Math.max(start, end);
    } else {
      state.settings.rangeMode = "auto";
      state.settings.startDay = MOBILE_DAY_MIN;
      state.settings.endDay = MOBILE_DAY_MAX;
    }
    saveState();
    startStudy("speaking");
  }

  function interleaveBalanced(wordItems, phraseItems) {
    const mixed = [];
    const words = shuffleArray(wordItems);
    const phrases = shuffleArray(phraseItems);
    let expectWord = words.length >= phrases.length;
    while (words.length || phrases.length) {
      if (expectWord && words.length) {
        mixed.push(words.shift());
      } else if (!expectWord && phrases.length) {
        mixed.push(phrases.shift());
      } else if (words.length) {
        mixed.push(words.shift());
      } else if (phrases.length) {
        mixed.push(phrases.shift());
      }
      expectWord = !expectWord;
    }
    return mixed;
  }

  function getRangeSettings() {
    const startDay = clampDay(state.settings.startDay);
    const endDay = clampDay(state.settings.endDay);
    return {
      mode: state.settings.rangeMode,
      startDay: Math.min(startDay, endDay),
      endDay: Math.max(startDay, endDay)
    };
  }

  function getPoolByRange() {
    const settings = getRangeSettings();
    return getVocabularySource().filter((entry) => {
      if (settings.mode === "auto") {
        return entry.day >= MOBILE_DAY_MIN && entry.day <= MOBILE_DAY_MAX;
      }
      return entry.day >= settings.startDay && entry.day <= settings.endDay;
    });
  }

  function buildSessionQuestions() {
    const pool = getPoolByRange();
    const words = pool.filter((entry) => entry.type === "word");
    const phrases = pool.filter((entry) => entry.type === "phrase");
    const mixed = interleaveBalanced(words, phrases);
    if (!mixed.length) return [];

    const selected = [];
    const seenIds = new Set();
    for (const entry of mixed) {
      if (selected.length >= SESSION_QUESTION_COUNT) break;
      if (seenIds.has(entry.id)) continue;
      if (selected.length && selected[selected.length - 1].id === entry.id) continue;
      selected.push(entry);
      seenIds.add(entry.id);
    }

    if (selected.length >= SESSION_QUESTION_COUNT) {
      return selected.slice(0, SESSION_QUESTION_COUNT);
    }

    const fallback = shuffleArray(pool);
    let cursor = 0;
    while (selected.length < SESSION_QUESTION_COUNT && fallback.length) {
      const candidate = fallback[cursor % fallback.length];
      cursor += 1;
      if (!candidate) break;
      const previous = selected[selected.length - 1];
      if (previous && previous.id === candidate.id && fallback.length > 1) continue;
      if (!seenIds.has(candidate.id) || pool.length < SESSION_QUESTION_COUNT) {
        selected.push(candidate);
        seenIds.add(candidate.id);
      }
      if (cursor > fallback.length * 4) break;
    }
    return selected.slice(0, SESSION_QUESTION_COUNT);
  }

  function createSession(mode) {
    return {
      mode,
      questions: buildSessionQuestions(),
      currentIndex: 0,
      attemptsUsed: 0,
      recognitionInProgress: false,
      listeningSupported: Boolean(SpeechRecognitionCtor),
      lastPrimaryTranscript: "",
      transcripts: [],
      feedback: "",
      noticeMessage: "",
      phase: "answering",
      showAnswer: false,
      stats: {
        firstTryCorrect: 0,
        secondTryCorrect: 0,
        fullyIncorrect: 0
      }
    };
  }

  function tokenizeWordOrderSentence(sentence) {
    const normalized = String(sentence || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/([.?])/g, " $1 ")
      .trim();
    return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
  }

  function buildWordOrderAnswerFromTokens(tokens) {
    return (Array.isArray(tokens) ? tokens : []).reduce((result, token, index) => {
      if (!index) return token;
      if (token === "." || token === "?") {
        return `${result}${token}`;
      }
      return `${result} ${token}`;
    }, "");
  }

  function createDefaultWordOrderStatsMap() {
    return {};
  }

  function sanitizeWordOrderStatsEntry(raw) {
    const attempts = Math.max(0, Math.floor(Number(raw?.attempts) || 0));
    const correct = Math.max(0, Math.min(attempts, Math.floor(Number(raw?.correct) || 0)));
    return { attempts, correct };
  }

  function sanitizeWordOrderStatsMap(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const next = {};
    Object.entries(source).forEach(([questionId, value]) => {
      const key = String(questionId || "").trim();
      if (!key) return;
      next[key] = sanitizeWordOrderStatsEntry(value || {});
    });
    return next;
  }

  function mergeWordOrderStatsMapByMax(baseMap, incomingMap) {
    const merged = sanitizeWordOrderStatsMap(baseMap);
    const incoming = sanitizeWordOrderStatsMap(incomingMap);
    Object.entries(incoming).forEach(([questionId, incomingEntry]) => {
      const current = sanitizeWordOrderStatsEntry(merged[questionId] || {});
      merged[questionId] = {
        attempts: Math.max(current.attempts, incomingEntry.attempts),
        correct: Math.max(current.correct, incomingEntry.correct)
      };
    });
    return sanitizeWordOrderStatsMap(merged);
  }

  function areWordOrderStatsMapsEqual(left, right) {
    const normalizedLeft = sanitizeWordOrderStatsMap(left);
    const normalizedRight = sanitizeWordOrderStatsMap(right);
    const leftKeys = Object.keys(normalizedLeft);
    const rightKeys = Object.keys(normalizedRight);
    if (leftKeys.length !== rightKeys.length) return false;
    for (const key of leftKeys) {
      const a = sanitizeWordOrderStatsEntry(normalizedLeft[key] || {});
      const b = sanitizeWordOrderStatsEntry(normalizedRight[key] || {});
      if (a.attempts !== b.attempts || a.correct !== b.correct) {
        return false;
      }
    }
    return true;
  }

  function getCurrentWordOrderStatsUid() {
    return String(getCurrentMobileFirebaseUser()?.uid || "").trim();
  }

  function getScopedWordOrderStatsStorageKey(uid = "") {
    const safeUid = String(uid || "").trim();
    return safeUid ? `${MOBILE_WORD_ORDER_STATS_STORAGE_KEY}:${safeUid}` : MOBILE_WORD_ORDER_STATS_STORAGE_KEY;
  }

  function loadWordOrderStatsMapFromStorageKey(storageKey) {
    try {
      const raw = window.localStorage.getItem(String(storageKey || "").trim());
      if (!raw) return createDefaultWordOrderStatsMap();
      return sanitizeWordOrderStatsMap(JSON.parse(raw));
    } catch (_error) {
      return createDefaultWordOrderStatsMap();
    }
  }

  function saveWordOrderStatsMapToStorageKey(storageKey, statsMap) {
    const key = String(storageKey || "").trim();
    if (!key) return createDefaultWordOrderStatsMap();
    const normalized = sanitizeWordOrderStatsMap(statsMap);
    window.localStorage.setItem(key, JSON.stringify(normalized));
    return normalized;
  }

  function loadMobilePendingWordOrderStatsForSync() {
    try {
      const raw = window.localStorage.getItem(MOBILE_WORD_ORDER_STATS_PENDING_SYNC_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const uid = String(parsed?.uid || "").trim();
      const statsMap = sanitizeWordOrderStatsMap(parsed?.statsMap);
      if (!uid || !Object.keys(statsMap).length) return null;
      return { uid, statsMap };
    } catch (_error) {
      return null;
    }
  }

  function saveMobilePendingWordOrderStatsForSync(uid, statsMap) {
    const safeUid = String(uid || "").trim();
    const normalized = sanitizeWordOrderStatsMap(statsMap);
    if (!safeUid || !Object.keys(normalized).length) {
      window.localStorage.removeItem(MOBILE_WORD_ORDER_STATS_PENDING_SYNC_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(MOBILE_WORD_ORDER_STATS_PENDING_SYNC_STORAGE_KEY, JSON.stringify({ uid: safeUid, statsMap: normalized }));
  }

  function clearMobilePendingWordOrderStatsForSync() {
    window.localStorage.removeItem(MOBILE_WORD_ORDER_STATS_PENDING_SYNC_STORAGE_KEY);
  }

  function loadWordOrderStatsMap(options = {}) {
    const targetUid = options?.targetUid !== undefined
      ? String(options.targetUid || "").trim()
      : getCurrentWordOrderStatsUid();
    if (wordOrderStatsCache && String(wordOrderStatsCache.uid || "") === targetUid && !options?.forceReload) {
      return sanitizeWordOrderStatsMap(wordOrderStatsCache.statsMap);
    }

    const scopedKey = getScopedWordOrderStatsStorageKey(targetUid);
    let scoped = loadWordOrderStatsMapFromStorageKey(scopedKey);

    if (targetUid && !Object.keys(scoped).length) {
      const legacy = loadWordOrderStatsMapFromStorageKey(MOBILE_WORD_ORDER_STATS_STORAGE_KEY);
      const legacyOwnerUid = String(window.localStorage.getItem(MOBILE_WORD_ORDER_STATS_LEGACY_OWNER_UID_KEY) || "").trim();
      const canAdoptLegacy = Object.keys(legacy).length > 0 && (!legacyOwnerUid || legacyOwnerUid === targetUid);
      if (canAdoptLegacy) {
        scoped = legacy;
        saveWordOrderStatsMapToStorageKey(scopedKey, scoped);
        window.localStorage.setItem(MOBILE_WORD_ORDER_STATS_LEGACY_OWNER_UID_KEY, targetUid);
      }
    }

    const normalized = sanitizeWordOrderStatsMap(scoped);
    wordOrderStatsCache = { uid: targetUid, statsMap: normalized };
    return normalized;
  }

  function saveWordOrderStatsMap(statsMap, options = {}) {
    const targetUid = options?.targetUid !== undefined
      ? String(options.targetUid || "").trim()
      : getCurrentWordOrderStatsUid();
    const normalized = sanitizeWordOrderStatsMap(statsMap);
    const scopedKey = getScopedWordOrderStatsStorageKey(targetUid);
    saveWordOrderStatsMapToStorageKey(scopedKey, normalized);
    wordOrderStatsCache = { uid: targetUid, statsMap: normalized };

    if (targetUid && options?.skipSync !== true) {
      scheduleWordOrderStatsSync(normalized, { uid: targetUid });
    }
    return normalized;
  }

  function getWordOrderQuestionStats(questionId) {
    const map = loadWordOrderStatsMap();
    return map[String(questionId || "").trim()] || { attempts: 0, correct: 0 };
  }

  function recordWordOrderQuestionResult(questionId, isCorrect) {
    const key = String(questionId || "").trim();
    if (!key) return;
    const map = loadWordOrderStatsMap();
    const current = sanitizeWordOrderStatsEntry(map[key] || {});
    current.attempts += 1;
    if (isCorrect) {
      current.correct = Math.min(current.attempts, current.correct + 1);
    }
    map[key] = current;
    saveWordOrderStatsMap(map);
  }

  function formatWordOrderQuestionId(day, entryId, fallbackNumber) {
    const safeDay = Math.max(1, Math.floor(Number(day) || 1));
    const numericEntryId = Math.floor(Number(entryId));
    const safeQuestionNumber = Number.isFinite(numericEntryId) && numericEntryId > 0
      ? numericEntryId
      : Math.max(1, Math.floor(Number(fallbackNumber) || 1));
    return `D${String(safeDay).padStart(2, "0")}-Q${String(safeQuestionNumber).padStart(2, "0")}`;
  }

  function buildWeightedWordOrderQuestions(questions) {
    return questions
      .map((question) => {
        const stats = getWordOrderQuestionStats(question.id);
        const attempts = Math.max(0, Number(stats.attempts) || 0);
        const accuracy = attempts > 0 ? (Math.max(0, Number(stats.correct) || 0) / attempts) : 0;

        // Weighted shuffle key (Efraimidis-Spirakis): smaller key appears earlier.
        // This keeps all questions exactly once while making higher-weight items appear sooner.
        let weight = 1.0;
        if (attempts >= 3 && accuracy < 0.7) {
          weight = 1.8;
        } else if (attempts >= 3 && accuracy >= 0.9) {
          weight = 0.65;
        }
        const safeWeight = Math.max(0.2, weight);
        const random = Math.max(Number.EPSILON, Math.random());
        const key = -Math.log(random) / safeWeight;
        return {
          question,
          key
        };
      })
      .sort((a, b) => a.key - b.key)
      .map((item) => item.question);
  }

  function getSelectedWordOrderDayRange() {
    const selectedValue = String(state.wordOrderSelectedRangeValue || WORD_ORDER_DAY_RANGES[0].value);
    return WORD_ORDER_DAY_RANGES.find((item) => item.value === selectedValue) || WORD_ORDER_DAY_RANGES[0];
  }

  function getValidWordOrderDayRangeValue(value) {
    const selectedValue = String(value || "").trim();
    return WORD_ORDER_DAY_RANGES.some((item) => item.value === selectedValue)
      ? selectedValue
      : WORD_ORDER_DAY_RANGES[0].value;
  }

  function setWordOrderDayRangeValue(value) {
    const normalizedValue = getValidWordOrderDayRangeValue(value);
    state.wordOrderSelectedRangeValue = normalizedValue;
    if (Array.isArray(elements.wordOrderDayRangeButtons)) {
      elements.wordOrderDayRangeButtons.forEach((button) => {
        button.classList.toggle("is-selected", String(button.dataset.rangeValue || "") === normalizedValue);
      });
    }
    return normalizedValue;
  }

  function getWordOrderQuestionsByDayRange(startDay, endDay) {
    const bank = Array.isArray(window.wordOrderTrainingBank) ? window.wordOrderTrainingBank : [];
    const dayCounters = {};
    return bank
      .filter((entry) => {
        const day = Number(entry?.day);
        return Number.isFinite(day) && day >= startDay && day <= endDay;
      })
      .map((entry) => {
        const english = String(entry?.english || entry?.answer || "").trim();
        const japanese = String(entry?.japanese || "").trim();
        const tag = String(entry?.tag || entry?.category || "").trim();
        const day = Math.floor(Number(entry?.day) || 0);
        dayCounters[day] = (dayCounters[day] || 0) + 1;
        const stableId = formatWordOrderQuestionId(day, entry?.id, dayCounters[day]);
        const tokens = tokenizeWordOrderSentence(english);
        return {
          id: stableId,
          day,
          english,
          japanese,
          tag,
          tokens
        };
      })
      .filter((item) => item.english && item.japanese && item.tokens.length >= 2);
  }

  function cloneWordOrderCards(cards) {
    return (Array.isArray(cards) ? cards : []).map((card) => ({
      id: String(card.id || ""),
      token: String(card.token || ""),
      isHidden: Boolean(card.isHidden)
    }));
  }

  function buildWordOrderCards(tokens, prefix) {
    return shuffleArray((Array.isArray(tokens) ? tokens : []).map((token, index) => ({
      id: `${prefix}-${index}`,
      token: String(token || "")
    })));
  }

  function getWordOrderDayNumberLabel(dayRange) {
    const startDay = Math.max(1, Math.floor(Number(dayRange?.startDay) || 1));
    const endDay = Math.max(startDay, Math.floor(Number(dayRange?.endDay) || startDay));
    return startDay === endDay ? `Day${startDay}` : `Day${startDay}-${endDay}`;
  }

  function getWordOrderDayRangeCardLabel(value) {
    const normalized = String(value || "").trim();
    return normalized ? `Day${normalized}` : "Day";
  }

  function buildLearnedWordOrderQuestionIdSet() {
    const statsMap = loadWordOrderStatsMap();
    const learnedIds = new Set();
    Object.entries(statsMap || {}).forEach(([questionId, raw]) => {
      const key = String(questionId || "").trim();
      if (!key) return;
      const entry = sanitizeWordOrderStatsEntry(raw || {});
      if (entry.attempts > 0) {
        learnedIds.add(key);
      }
    });
    return learnedIds;
  }

  function buildWordOrderDayRangeProgressSummary(dayRange, learnedQuestionIds) {
    const questions = getWordOrderQuestionsByDayRange(dayRange?.startDay, dayRange?.endDay);
    const total = questions.length;
    const learnedSet = learnedQuestionIds instanceof Set ? learnedQuestionIds : new Set();
    const learned = questions.reduce((count, question) => count + (learnedSet.has(String(question?.id || "")) ? 1 : 0), 0);
    return { learned, total };
  }

  function renderWordOrderDayRangeProgress() {
    if (!Array.isArray(elements.wordOrderDayRangeButtons) || !elements.wordOrderDayRangeButtons.length) return;
    const learnedQuestionIds = buildLearnedWordOrderQuestionIdSet();
    const progressByRange = new Map();
    WORD_ORDER_DAY_RANGES.forEach((range) => {
      progressByRange.set(range.value, buildWordOrderDayRangeProgressSummary(range, learnedQuestionIds));
    });

    elements.wordOrderDayRangeButtons.forEach((button) => {
      const rangeValue = String(button?.dataset?.rangeValue || "").trim();
      const progress = progressByRange.get(rangeValue) || { learned: 0, total: 0 };
      const label = getWordOrderDayRangeCardLabel(rangeValue);
      button.innerHTML = `<span class="word-order-range-label">${label}</span><span class="word-order-range-progress">${progress.learned}/${progress.total}問 学習済</span>`;
    });
  }

  function buildWordOrderLearningHistorySummary(training = state.wordOrderTraining) {
    const correctCount = Math.max(0, Number(training?.correctCount) || 0);
    const incorrectCount = Math.max(0, Number(training?.incorrectCount) || 0);
    const questionCount = Math.max(0, correctCount + incorrectCount);
    return {
      questionCount,
      correctCount,
      accuracy: questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0
    };
  }

  function finalizeWordOrderLearningHistorySession(completedReason = "interrupted") {
    if (!state.learningHistorySession) return;
    finalizeMobileLearningHistorySession({
      completedReason,
      mode: "word-order",
      dayNumber: getWordOrderDayNumberLabel(state.wordOrderTraining?.dayRange),
      summary: buildWordOrderLearningHistorySummary(state.wordOrderTraining)
    });
  }

  function leaveWordOrderTrainingToHome() {
    if (state.wordOrderTraining) {
      finalizeWordOrderLearningHistorySession("interrupted");
    }
    renderHome();
  }

  function setupWordOrderQuestionState(training) {
    if (!training || training.completed) return;
    const question = training.questions[training.questionIndex];
    if (!question) {
      training.completed = true;
      return;
    }
    const cards = buildWordOrderCards(question.tokens, `${question.id}-${training.questionIndex + 1}`);
    training.selectedCards = [];
    training.remainingCards = cloneWordOrderCards(cards).map((card) => ({ ...card, isHidden: false }));
    training.initialCards = cloneWordOrderCards(cards).map((card) => ({ ...card, isHidden: false }));
    training.phase = "answering";
    training.feedback = "";
    training.correctAnswer = "";
  }

  function renderWordOrderRangeSelectScreen() {
    renderWordOrderDayRangeProgress();
    setWordOrderDayRangeValue(state.wordOrderSelectedRangeValue);
    state.wordOrderTraining = null;
    if (elements.wordOrderQuestionPanel) {
      elements.wordOrderQuestionPanel.classList.add("hidden");
    }
    if (elements.wordOrderCompletePanel) {
      elements.wordOrderCompletePanel.classList.add("hidden");
    }
    if (elements.wordOrderRangePanel) {
      elements.wordOrderRangePanel.classList.remove("hidden");
    }
    showScreen("wordOrderTrainingScreen");
  }

  function renderWordOrderTraining() {
    const training = state.wordOrderTraining;
    if (!training) return;

    const questionPanel = elements.wordOrderQuestionPanel;
    const completePanel = elements.wordOrderCompletePanel;
    if (!questionPanel || !completePanel) return;
    if (elements.wordOrderRangePanel) {
      elements.wordOrderRangePanel.classList.add("hidden");
    }

    if (training.completed) {
      questionPanel.classList.add("hidden");
      completePanel.classList.remove("hidden");
      if (elements.wordOrderDayText) {
        elements.wordOrderDayText.textContent = `${training.dayRange?.label || "Day"} 完了`;
      }
      if (elements.wordOrderProgressText) {
        const total = training.questions.length;
        elements.wordOrderProgressText.textContent = `${total} / ${total}`;
      }
      if (elements.wordOrderCompleteSummaryText) {
        const total = training.questions.length;
        elements.wordOrderCompleteSummaryText.textContent = `${training.correctCount} / ${total} 正解`;
      }
      if (elements.wordOrderResultTagText) {
        elements.wordOrderResultTagText.textContent = "";
      }
      showScreen("wordOrderTrainingScreen");
      return;
    }

    const question = training.questions[training.questionIndex];
    if (!question) {
      training.completed = true;
      renderWordOrderTraining();
      return;
    }
    if (question?.id) {
      recordMobileTrainingCoverageSeen("word-order", question.id);
    }

    questionPanel.classList.remove("hidden");
    completePanel.classList.add("hidden");

    if (elements.wordOrderDayText) {
      elements.wordOrderDayText.textContent = training.dayRange?.label || "Day";
    }
    if (elements.wordOrderProgressText) {
      elements.wordOrderProgressText.textContent = `${training.questionIndex + 1} / ${training.questions.length}`;
    }
    if (elements.wordOrderJapaneseText) {
      elements.wordOrderJapaneseText.textContent = question.japanese;
    }
    if (elements.wordOrderAnswerArea) {
      elements.wordOrderAnswerArea.innerHTML = "";
      if (!training.selectedCards.length) {
        const empty = document.createElement("p");
        empty.className = "word-order-card-empty";
        empty.textContent = "ここにカードが並びます";
        elements.wordOrderAnswerArea.appendChild(empty);
      } else {
        const fragment = document.createDocumentFragment();
        training.selectedCards.forEach((card) => {
          const chip = document.createElement("span");
          chip.className = "word-order-card-btn word-order-answer-card";
          chip.textContent = card.token;
          fragment.appendChild(chip);
        });
        elements.wordOrderAnswerArea.appendChild(fragment);
      }
    }

    if (elements.wordOrderCardPool) {
      elements.wordOrderCardPool.innerHTML = "";
      if (training.phase === "judged") {
        elements.wordOrderCardPool.classList.add("hidden");
      } else {
        elements.wordOrderCardPool.classList.remove("hidden");
        const fragment = document.createDocumentFragment();
        let visibleCount = 0;
        training.remainingCards.forEach((card) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "word-order-card-btn";
          button.textContent = card.token;
          if (card.isHidden) {
            button.classList.add("word-order-card-hidden-slot");
            button.disabled = true;
          } else {
            visibleCount += 1;
            button.disabled = training.phase !== "answering";
            button.addEventListener("click", () => {
              selectWordOrderCard(card.id);
            });
          }
          fragment.appendChild(button);
        });
        elements.wordOrderCardPool.appendChild(fragment);
        if (!visibleCount) {
          const empty = document.createElement("p");
          empty.className = "word-order-card-empty";
          empty.textContent = "すべて並べ終わりました";
          elements.wordOrderCardPool.appendChild(empty);
        }
      }
    }
    if (elements.wordOrderCardLabelText) {
      elements.wordOrderCardLabelText.textContent = training.phase === "judged" ? "" : "カード";
    }

    if (elements.wordOrderFeedbackText) {
      elements.wordOrderFeedbackText.textContent = training.feedback || "";
    }
    if (elements.wordOrderCorrectAnswerText) {
      elements.wordOrderCorrectAnswerText.textContent = training.correctAnswer ? `正解: ${training.correctAnswer}` : "";
    }
    if (elements.wordOrderResultTagText) {
      elements.wordOrderResultTagText.textContent = training.phase === "judged" && question.tag
        ? `単元: 【${question.tag}】`
        : "";
    }

    if (elements.wordOrderUndoBtn) {
      elements.wordOrderUndoBtn.disabled = training.phase !== "answering" || !training.selectedCards.length;
    }
    if (elements.wordOrderResetBtn) {
      elements.wordOrderResetBtn.disabled = training.phase !== "answering" || !training.selectedCards.length;
    }
    if (elements.wordOrderSubmitBtn) {
      elements.wordOrderSubmitBtn.textContent = training.phase === "judged"
        ? (training.questionIndex >= training.questions.length - 1 ? "結果へ" : "次へ")
        : "回答";
    }

    showScreen("wordOrderTrainingScreen");
  }

  function startWordOrderTraining() {
    setWordOrderDayRangeValue(state.wordOrderSelectedRangeValue);
    const dayRange = getSelectedWordOrderDayRange();
    const questions = buildWeightedWordOrderQuestions(getWordOrderQuestionsByDayRange(dayRange.startDay, dayRange.endDay));
    if (!questions.length) {
      renderComingSoonScreen({
        title: "語順トレーニング（準備中）",
        message: `${dayRange.label} の語順データは準備中です。`
      });
      return;
    }
    state.wordOrderTraining = {
      dayRange,
      questions,
      questionIndex: 0,
      correctCount: 0,
      incorrectCount: 0,
      selectedCards: [],
      remainingCards: [],
      initialCards: [],
      phase: "answering",
      feedback: "",
      correctAnswer: "",
      completed: false
    };
    if (!state.learningHistorySession) {
      startMobileLearningHistorySession({
        source: "word-order",
        mode: "word-order",
        dayNumber: getWordOrderDayNumberLabel(dayRange),
        startedAt: Date.now()
      });
    }
    setupWordOrderQuestionState(state.wordOrderTraining);
    renderWordOrderTraining();
  }

  function selectWordOrderCard(cardId) {
    const training = state.wordOrderTraining;
    if (!training || training.phase !== "answering") return;
    const card = training.remainingCards.find((item) => item.id === cardId);
    if (!card || card.isHidden) return;
    card.isHidden = true;
    training.selectedCards.push({ id: card.id, token: card.token });
    renderWordOrderTraining();
  }

  function undoWordOrderSelection() {
    const training = state.wordOrderTraining;
    if (!training || training.phase !== "answering" || !training.selectedCards.length) return;
    const card = training.selectedCards.pop();
    const slot = training.remainingCards.find((item) => item.id === card.id);
    if (slot) {
      slot.isHidden = false;
    }
    renderWordOrderTraining();
  }

  function resetWordOrderSelection() {
    const training = state.wordOrderTraining;
    if (!training || training.phase !== "answering") return;
    training.selectedCards = [];
    training.remainingCards = cloneWordOrderCards(training.initialCards).map((card) => ({ ...card, isHidden: false }));
    training.feedback = "";
    training.correctAnswer = "";
    renderWordOrderTraining();
  }

  function moveToNextWordOrderQuestion() {
    const training = state.wordOrderTraining;
    if (!training) return;
    if (training.questionIndex >= training.questions.length - 1) {
      training.completed = true;
      finalizeWordOrderLearningHistorySession("completed");
      renderWordOrderTraining();
      return;
    }
    training.questionIndex += 1;
    setupWordOrderQuestionState(training);
    renderWordOrderTraining();
  }

  function playWordOrderCorrectChime() {
    if (typeof Audio !== "function") return false;
    const audio = new Audio("../assets/sounds/correct-05-3.mp3");
    audio.preload = "auto";
    audio.play().catch(() => undefined);
    return true;
  }

  function submitWordOrderAnswer() {
    const training = state.wordOrderTraining;
    if (!training) return;
    if (training.phase === "judged") {
      moveToNextWordOrderQuestion();
      return;
    }
    const question = training.questions[training.questionIndex];
    if (!question) return;
    if (training.selectedCards.length !== question.tokens.length) {
      training.feedback = "カードをすべて並べてから回答してください。";
      training.correctAnswer = "";
      renderWordOrderTraining();
      return;
    }

    const selectedTokens = training.selectedCards.map((card) => card.token);
    const isCorrect = selectedTokens.every((token, index) => token === question.tokens[index]);
    recordWordOrderQuestionResult(question.id, isCorrect);
    if (isCorrect) {
      training.correctCount += 1;
      awardWordOrderPoints(1);
      training.feedback = "正解です！";
      training.correctAnswer = "";
      playWordOrderCorrectChime();
    } else {
      training.incorrectCount += 1;
      training.feedback = "不正解です。";
      training.correctAnswer = buildWordOrderAnswerFromTokens(question.tokens);
    }

    training.phase = "judged";
    renderWordOrderTraining();
  }

  function showScreen(screenId) {
    ["homeScreen", "acquiredPointsScreen", "speakingHomeScreen", "speakingReviewTopScreen", "speakingReviewCompleteScreen", "pointRewardScreen", "conversationSelectScreen", "conversationDaySelectScreen", "speakingVocabScreen", "vocabularySampleScreen", "vocabularyTodayHistoryScreen", "vocabularyPastHistoryScreen", "vocabularyTeacherCheckScreen", "vocabularyProgressListScreen", "speakingWordWeekSelectScreen", "speakingWordDaySelectScreen", "speakingWordPracticeScreen", "speakingWordCompleteScreen", "conversationPracticeScreen", "conversationCompleteScreen", "studyScreen", "resultScreen", "settingsScreen", "mobileUpdateHistoryScreen", "mobileAdminLearningHistoryScreen", "wordOrderTrainingScreen", "translationTrainingScreen", "comingSoonScreen"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.toggle("active", id === screenId);
      }
    });
    state.currentScreen = screenId;
    renderMobileHomeAccountAlias();
  }

  function resolveHomeAccountAliasForMobileUser(user) {
    const email = String(user?.email || "").trim().toLowerCase();
    if (email.startsWith(HOME_ACCOUNT_PARENT_EMAIL_PREFIX)) {
      return HOME_ACCOUNT_PARENT_ALIAS;
    }
    if (isCurrentSonLoginForMobileLearningHistory()) {
      return HOME_ACCOUNT_SON_ALIAS;
    }
    return "";
  }

  function renderMobileHomeAccountAlias() {
    const aliasNode = document.getElementById("mobileHomeAccountAlias");
    if (!aliasNode) return;
    const currentUser = typeof window.getMobileFirebaseCurrentUser === "function"
      ? window.getMobileFirebaseCurrentUser()
      : (window.MobileFirebase?.auth?.currentUser || null);
    const alias = resolveHomeAccountAliasForMobileUser(currentUser);
    const shouldShow = state.currentScreen === "homeScreen" && Boolean(alias);
    aliasNode.textContent = shouldShow ? alias : "";
    aliasNode.classList.toggle("hidden", !shouldShow);
  }

  async function loadMobileFormalLearningHistoryEntriesForToday({ forceRefresh = false } = {}) {
    const user = typeof window.getMobileFirebaseCurrentUser === "function"
      ? window.getMobileFirebaseCurrentUser()
      : (window.MobileFirebase?.auth?.currentUser || null);
    const uid = String(user?.uid || "").trim();
    const firestore = window.MobileFirebase?.firestore || null;
    if (!uid || !firestore) {
      return { ok: false, entries: [], source: "localStorage" };
    }

    if (!forceRefresh && mobileHomeTodayLearningSource === "firestore" && Array.isArray(mobileHomeTodayLearningEntries) && mobileHomeTodayLearningEntries.length) {
      return { ok: true, entries: mobileHomeTodayLearningEntries.slice(), source: "firestore" };
    }

    try {
      const sdk = await getMobileFirestoreSdk();
      const snapshot = await sdk.getDocs(sdk.query(
        sdk.collection(firestore, "users", uid, "learningHistory"),
        sdk.orderBy("createdAt", "desc")
      ));
      const normalizedEntries = snapshot.docs.map(normalizeMobileAdminLearningHistoryFirestoreEntry);
      const todayDayKey = getMobileLearningHistoryDayKey(Date.now());
      const todayEntries = normalizedEntries.filter((entry) => {
        if (!entry) return false;
        const entryDayKey = getMobileLearningHistoryDayKey(Number(entry.endedAt) || Number(entry.startedAt) || Number(entry.createdAt) || Date.now());
        return entryDayKey === todayDayKey;
      });
      mobileHomeTodayLearningEntries = todayEntries.slice();
      mobileHomeTodayLearningSource = "firestore";
      return { ok: true, entries: todayEntries.slice(), source: "firestore" };
    } catch (error) {
      console.error("Failed to load formal mobile learning history for home summary", error);
      mobileHomeTodayLearningEntries = [];
      mobileHomeTodayLearningSource = "localStorage";
      return { ok: false, entries: [], source: "localStorage" };
    }
  }

  function summarizeHomeTodayLearningEntries(entries) {
    const todayDayKey = getMobileLearningHistoryDayKey(Date.now());
    const result = {
      word: { count: 0, points: 0 },
      wordOrder: { count: 0, points: 0 },
      translation: { count: 0, points: 0 }
    };

    const sourceEntries = Array.isArray(entries) ? entries : [];
    sourceEntries.forEach((entry) => {
      if (!entry || getMobileLearningHistoryDayKey(entry.endedAt || entry.startedAt || Date.now()) !== todayDayKey) {
        return;
      }

      const modeText = String(entry.mode || "").trim();
      const category = resolveMobileLearningHistoryCategory(entry);
      const dayNumber = String(entry.dayNumber || "").trim();
      const entryPoints = parseMobileLearningHistoryEarnedPoints(entry.earnedPoints);
      const questionCount = Math.max(0, Number(entry.questionCount) || 0);
      const isNewVocabularyEntry = category === "Vocabulary" && isIsoDayKey(dayNumber);
      const isLegacyVocabularyEntry = category === "Vocabulary" && /week/i.test(dayNumber);

      if (isNewVocabularyEntry || (/vocabulary/i.test(modeText) || /単語/i.test(modeText)) && !isLegacyVocabularyEntry) {
        result.word.count += questionCount;
        result.word.points += entryPoints;
        return;
      }

      if (category === "語順" || /語順/i.test(modeText) || /wordorder/i.test(modeText) || /word order/i.test(modeText)) {
        result.wordOrder.count += questionCount;
        result.wordOrder.points += entryPoints;
        return;
      }

      if (category === "和訳" || /和訳/i.test(modeText) || /translation/i.test(modeText)) {
        result.translation.count += questionCount;
        result.translation.points += entryPoints;
      }
    });

    return result;
  }

  function getMobileHomeTodayLearningSummary() {
    if (mobileHomeTodayLearningSource === "firestore") {
      return summarizeHomeTodayLearningEntries(Array.isArray(mobileHomeTodayLearningEntries) ? mobileHomeTodayLearningEntries : []);
    }

    const fallbackEntries = Array.isArray(loadMobileLearningHistoryEntries()) ? loadMobileLearningHistoryEntries() : [];
    return summarizeHomeTodayLearningEntries(fallbackEntries);
  }

  async function refreshMobileHomeTodayLearningSummaryFromFirestore() {
    if (mobileHomeTodayLearningRefreshPromise) {
      return mobileHomeTodayLearningRefreshPromise;
    }

    mobileHomeTodayLearningRefreshPromise = (async () => {
      const remoteResult = await loadMobileFormalLearningHistoryEntriesForToday({ forceRefresh: true });
      if (remoteResult.ok) {
        mobileHomeTodayLearningSource = "firestore";
        mobileHomeTodayLearningEntries = remoteResult.entries.slice();
        renderMobileHomeTodayLearningSummary();
        return true;
      }

      mobileHomeTodayLearningSource = "localStorage";
      mobileHomeTodayLearningEntries = Array.isArray(loadMobileLearningHistoryEntries()) ? loadMobileLearningHistoryEntries().slice() : [];
      renderMobileHomeTodayLearningSummary();
      return false;
    })();

    try {
      return await mobileHomeTodayLearningRefreshPromise;
    } finally {
      mobileHomeTodayLearningRefreshPromise = null;
    }
  }

  function renderMobileHomeTodayLearningSummary() {
    const todayValues = {
      word: document.getElementById("todayLearningWordValue"),
      wordOrder: document.getElementById("todayLearningWordOrderValue"),
      translation: document.getElementById("todayLearningTranslationValue")
    };

    const summary = getMobileHomeTodayLearningSummary();

    const formatValue = (metric, unit) => {
      if (!metric || metric.count <= 0) return "未了";
      return `${metric.count}${unit}・${metric.points}P`;
    };

    const wordTile = document.getElementById("openSpeakingFeatureBtn");
    const wordOrderTile = document.getElementById("openWordOrderTrainingBtn");
    const translationTile = document.getElementById("openTranslationTrainingBtn");

    if (wordTile) {
      wordTile.classList.toggle("home-today-learning-item--filled", summary.word.count > 0);
    }
    if (wordOrderTile) {
      wordOrderTile.classList.toggle("home-today-learning-item--filled", summary.wordOrder.count > 0);
    }
    if (translationTile) {
      translationTile.classList.toggle("home-today-learning-item--filled", summary.translation.count > 0);
    }

    if (todayValues.word) {
      todayValues.word.textContent = formatValue(summary.word, "語");
    }
    if (todayValues.wordOrder) {
      todayValues.wordOrder.textContent = formatValue(summary.wordOrder, "問");
    }
    if (todayValues.translation) {
      todayValues.translation.textContent = formatValue(summary.translation, "問");
    }
  }

  function renderHome() {
    setWordOrderDayRangeValue(state.wordOrderSelectedRangeValue);
    hideMobileAdminLearningHistory();
    renderMobileHomeTodayLearningSummary();
    showScreen("homeScreen");
  }

  function clearTranslationTrainingSpeechTimer() {
    if (state.translationTrainingSpeechTimerId) {
      window.clearTimeout(state.translationTrainingSpeechTimerId);
      state.translationTrainingSpeechTimerId = null;
    }
  }

  function startTranslationTraining(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (state.translationTraining) {
      return;
    }
    const questionBank = window.translationTrainingData?.getTranslationTrainingQuestions?.() || [];
    const questions = window.translationTrainingData?.createTranslationTrainingSessionQuestions?.(questionBank) || questionBank;
    if (!questions.length) {
      window.alert("和訳トレーニングの問題がありません。")
      return;
    }
    state.translationTraining = {
      questions,
      questionIndex: 0,
      currentPartIndex: 0,
      completedParts: [],
      currentSelectionIndex: 0,
      completedSelections: [],
      builtJapanese: "",
      answeredGroupKeys: [],
      partSelections: {},
      partFixedTaps: {},
      incorrectAttemptsByGroup: {},
      historyQuestionCount: 0,
      historyCorrectCount: 0,
      historyEarnedPoints: 0,
      historyQuestionHadIncorrectMap: {},
      historyCompletedQuestionMap: {}
    };
    if (!state.learningHistorySession) {
      startMobileLearningHistorySession({
        source: "translation",
        mode: "和訳トレーニング",
        dayNumber: "",
        startedAt: Date.now()
      });
    }
    recordMobileLearningActivity();
    state.translationTrainingCurrentPartIndex = 0;
    state.translationTrainingPartCompleted = false;
    state.translationTrainingSpeechDetected = false;
    clearTranslationTrainingSpeechTimer();
    renderTranslationTrainingQuestion();
    window.requestAnimationFrame(() => {
      showScreen("translationTrainingScreen");
    });
  }

  function isTranslationTrainingSubjectPhrase(value) {
    const text = String(value || "").trim();
    if (!text) return false;
    return /^(私|わたし|僕|ぼく|俺|おれ|彼|彼女|私たち|あなた|君).*(は|が)$/.test(text);
  }

  function buildTranslationTrainingMeaningColumns(currentPart) {
    const displayFixedPhrases = window.translationTrainingData?.getTranslationTrainingDisplayFixedPhrases?.(currentPart) || [];
    const layoutSequence = window.translationTrainingData?.buildTranslationTrainingLayoutSequence?.(currentPart, displayFixedPhrases) || [];
    const columns = [];

    layoutSequence.forEach((item, sequenceIndex) => {
      if (item.type === "fixed") {
        const phrases = Array.isArray(item.phrases) ? item.phrases : [];
        phrases.forEach((phraseText, phraseIndex) => {
          columns.push({
            type: "fixed",
            key: `fixed-${sequenceIndex}-${phraseIndex}`,
            text: String(phraseText || "").trim()
          });
        });
        return;
      }

      const group = item.group;
      if (!group) return;
      columns.push({
        type: "group",
        key: String(group.key || `group-${sequenceIndex}`),
        group,
        groupIndex: Number.isInteger(item.groupIndex) ? item.groupIndex : 0
      });
    });

    return columns.filter((column) => {
      if (column.type === "fixed") return Boolean(column.text);
      return Boolean(column.group && Array.isArray(column.group.options));
    });
  }

  function splitTranslationTrainingColumnRows(columns, availableWidth) {
    const source = Array.isArray(columns) ? columns.slice() : [];
    if (!source.length) {
      return { topRow: [], mainRow: [] };
    }

    const resolvedWidth = Number.isFinite(Number(availableWidth)) ? Number(availableWidth) : (window.innerWidth || 360);
    const subjectIndex = source.findIndex((column) => column.type === "fixed" && isTranslationTrainingSubjectPhrase(column.text));
    const shouldPromoteMidSubject = subjectIndex > 0 && source.length >= 3;
    const shouldPreferTopSubject = shouldPromoteMidSubject || source.length >= 4 || (source.length >= 3 && resolvedWidth <= 380);

    if (!shouldPreferTopSubject || subjectIndex < 0) {
      return { topRow: [], mainRow: source };
    }

    const topRow = [source[subjectIndex]];
    const mainRow = source.filter((_, index) => index !== subjectIndex);
    return { topRow, mainRow };
  }

  function createTranslationTrainingFixedCard(text, options = {}) {
    const isCompleted = Boolean(options?.isCompleted);
    const onTap = typeof options?.onTap === "function" ? options.onTap : null;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-btn translation-training-card translation-training-card--fixed";
    if (isCompleted) {
      button.dataset.resultState = "correct";
    }
    button.setAttribute("aria-pressed", isCompleted ? "true" : "false");

    const cardContent = document.createElement("span");
    cardContent.className = "translation-training-card-content";
    const marker = document.createElement("span");
    marker.className = "translation-training-card-marker";
    marker.textContent = "";
    marker.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "translation-training-card-label";
    label.textContent = text;
    cardContent.appendChild(marker);
    cardContent.appendChild(label);
    button.appendChild(cardContent);

    if (onTap) {
      button.addEventListener("click", () => {
        onTap();
      });
    }

    return button;
  }

  function createTranslationTrainingSlashSeparator() {
    const separator = document.createElement("span");
    separator.textContent = " /";
    separator.className = "translation-training-highlight-separator";
    separator.style.color = "#ff1f1f";
    separator.style.fontWeight = "900";
    separator.style.whiteSpace = "nowrap";
    return separator;
  }

  function buildTranslationTrainingEnglishReadFragment(englishText) {
    const fragment = document.createDocumentFragment();
    const parts = String(englishText || "").split("/").map((part) => part.trim());
    parts.forEach((part, index) => {
      fragment.appendChild(document.createTextNode(part));
      if (index < parts.length - 1) {
        fragment.appendChild(createTranslationTrainingSlashSeparator());
        fragment.appendChild(document.createElement("br"));
      }
    });
    return fragment;
  }

  function getTranslationTrainingPartFixedKeys(part) {
    const displayFixedPhrases = window.translationTrainingData?.getTranslationTrainingDisplayFixedPhrases?.(part) || [];
    const layoutSequence = window.translationTrainingData?.buildTranslationTrainingLayoutSequence?.(part, displayFixedPhrases) || [];
    const fixedKeys = [];
    layoutSequence.forEach((item, sequenceIndex) => {
      if (item?.type !== "fixed") return;
      const phrases = Array.isArray(item?.phrases) ? item.phrases : [];
      phrases.forEach((_, phraseIndex) => {
        fixedKeys.push(`fixed-${sequenceIndex}-${phraseIndex}`);
      });
    });
    return fixedKeys;
  }

  function isTranslationTrainingPartSolved(training, currentPart, partIndex) {
    const selectionGroups = Array.isArray(currentPart?.selectionGroups) ? currentPart.selectionGroups : [];
    const solvedSelections = training?.partSelections?.[partIndex] || {};
    const allGroupsSolved = selectionGroups.every((group) => solvedSelections?.[group.key]?.isCorrect === true);
    const fixedKeys = getTranslationTrainingPartFixedKeys(currentPart);
    const fixedTapMap = training?.partFixedTaps?.[partIndex] || {};
    const allFixedTapped = fixedKeys.every((key) => fixedTapMap?.[key] === true);
    return allGroupsSolved && allFixedTapped;
  }

  function handleTranslationTrainingFixedSelect(fixedKey) {
    const training = state.translationTraining;
    if (!training) return;
    const partIndex = Number(training.currentPartIndex) || 0;
    if (!training.partFixedTaps || typeof training.partFixedTaps !== "object") {
      training.partFixedTaps = {};
    }
    if (!training.partFixedTaps[partIndex]) {
      training.partFixedTaps[partIndex] = {};
    }
    if (training.partFixedTaps[partIndex][fixedKey] === true) {
      return;
    }
    training.partFixedTaps[partIndex][fixedKey] = true;
    window.requestAnimationFrame(() => {
      renderTranslationTrainingQuestion();
    });
  }

  function triggerTranslationTrainingIncorrectFeedback(button) {
    if (!(button instanceof HTMLElement)) return;
    let marker = button.querySelector(".translation-training-incorrect-mark");
    if (!marker) {
      marker = document.createElement("span");
      marker.className = "translation-training-incorrect-mark";
      marker.setAttribute("aria-hidden", "true");
      marker.textContent = "×";
      button.appendChild(marker);
    }
    if (button.translationTrainingIncorrectTimerId) {
      window.clearTimeout(button.translationTrainingIncorrectTimerId);
      button.translationTrainingIncorrectTimerId = null;
    }
    button.classList.remove("translation-training-card--incorrect-flash");
    void button.offsetWidth;
    button.classList.add("translation-training-card--incorrect-flash");
    button.translationTrainingIncorrectTimerId = window.setTimeout(() => {
      button.classList.remove("translation-training-card--incorrect-flash");
      if (marker) {
        marker.remove();
      }
      button.translationTrainingIncorrectTimerId = null;
    }, 500);
  }

  function renderTranslationTrainingQuestion() {
    const training = state.translationTraining;
    if (!training) return;
    const question = training.questions[training.questionIndex];
    if (!question) return;
    const currentPart = question.parts[training.currentPartIndex];
    elements.translationTrainingQuestionPanel.classList.remove("hidden");
    elements.translationTrainingCompletePanel.classList.add("hidden");
    elements.translationTrainingQuestionIndexText.textContent = `${training.questionIndex + 1} / ${training.questions.length}`;
    if (elements.translationTrainingLevelText) {
      elements.translationTrainingLevelText.textContent = String(question.level || "-").trim() || "-";
    }
    const segments = window.translationTrainingData?.buildTranslationTrainingEnglishDisplaySegments?.(question, training.currentPartIndex) || [];
    const englishFragment = document.createDocumentFragment();
    segments.forEach((segment, index) => {
      const wrapper = document.createElement("span");
      wrapper.className = "translation-training-english-part";
      if (segment.state === "current") {
        wrapper.classList.add("translation-training-english-part--current");
      } else if (segment.state === "completed") {
        wrapper.classList.add("translation-training-english-part--completed");
      }
      if (segment.marker) {
        const marker = document.createElement("span");
        marker.className = "translation-training-current-marker";
        marker.textContent = segment.marker;
        wrapper.appendChild(marker);
      }
      const text = document.createElement("span");
      text.className = "translation-training-english-text";
      const segmentText = `${segment.text || ""}`;
      const isNotLastSegment = index < segments.length - 1;
      const isSentenceEnd = /[.?!]["')\]]*$/.test(String(segmentText || "").trim());
      const shouldShowSeparator = isNotLastSegment && !isSentenceEnd;
      if (shouldShowSeparator) {
        const wordMatch = segmentText.match(/^(.*?)(\S+)$/);
        if (wordMatch) {
          const prefix = wordMatch[1] || "";
          const lastWord = wordMatch[2] || "";
          if (prefix) {
            text.appendChild(document.createTextNode(prefix));
          }
          const slashLock = document.createElement("span");
          slashLock.className = "translation-training-slash-lock";

          const lastWordNode = document.createElement("span");
          lastWordNode.textContent = lastWord;
          slashLock.appendChild(lastWordNode);

          slashLock.appendChild(createTranslationTrainingSlashSeparator());

          text.appendChild(slashLock);
        } else {
          const slashLock = document.createElement("span");
          slashLock.className = "translation-training-slash-lock";
          const content = document.createElement("span");
          content.textContent = segmentText;
          const separator = createTranslationTrainingSlashSeparator();
          slashLock.appendChild(content);
          slashLock.appendChild(separator);
          text.appendChild(slashLock);
        }
      } else {
        text.textContent = segmentText;
      }
      wrapper.appendChild(text);
      englishFragment.appendChild(wrapper);
      if (index < segments.length - 1) {
        englishFragment.appendChild(document.createElement("br"));
      }
    });
    elements.translationTrainingEnglishText.innerHTML = "";
    elements.translationTrainingEnglishText.appendChild(englishFragment);
    elements.translationTrainingFeedbackText.textContent = "";
    elements.translationTrainingStatusText.textContent = "";
    elements.translationTrainingStatusText.classList.add("hidden");
    elements.translationTrainingOptionList.innerHTML = "";
    elements.translationTrainingOptionList.classList.add("translation-training-option-list");

    const shouldRenderInlineCurrentEnglish = String(question?.level || "").trim().toUpperCase() === "C";
    if (shouldRenderInlineCurrentEnglish && currentPart) {
      const currentEnglishWrapper = document.createElement("div");
      const currentChip = document.createElement("span");
      currentChip.className = "translation-training-english-part translation-training-english-part--current";

      const marker = document.createElement("span");
      marker.className = "translation-training-current-marker";
      marker.textContent = "▶";
      currentChip.appendChild(marker);

      const currentText = document.createElement("span");
      currentText.className = "translation-training-english-text";
      const partText = String(currentPart?.text || "");
      currentText.textContent = partText;
      currentChip.appendChild(currentText);

      if (!/[.?!]["')\]]*$/.test(partText.trim())) {
        const separator = document.createElement("span");
        separator.textContent = " /";
        separator.className = "translation-training-highlight-separator";
        separator.style.color = "#ff1f1f";
        separator.style.fontWeight = "900";
        separator.style.whiteSpace = "nowrap";
        currentChip.appendChild(separator);
      }

      currentEnglishWrapper.appendChild(currentChip);
      elements.translationTrainingOptionList.appendChild(currentEnglishWrapper);
    }

    const optionShell = document.createElement("div");
    optionShell.className = "translation-training-option-shell";
    const selectionGroups = Array.isArray(currentPart?.selectionGroups) ? currentPart.selectionGroups : [];
    const meaningColumns = buildTranslationTrainingMeaningColumns(currentPart);
    const partIndex = Number(training.currentPartIndex) || 0;
    const currentPartSolved = isTranslationTrainingPartSolved(training, currentPart, partIndex);

    let renderedGroupCount = 0;
    meaningColumns.forEach((columnDef) => {
      const column = document.createElement("div");
      column.className = "translation-training-selection-column";

      if (columnDef.type === "fixed") {
        column.classList.add("translation-training-selection-column--fixed");
        const isTapped = Boolean(training.partFixedTaps?.[partIndex]?.[columnDef.key]);
        column.appendChild(createTranslationTrainingFixedCard(columnDef.text, {
          isCompleted: isTapped,
          onTap: () => handleTranslationTrainingFixedSelect(columnDef.key)
        }));
        optionShell.appendChild(column);
        return;
      }

      column.classList.add("translation-training-selection-column--group");
      if (renderedGroupCount > 0) {
        const divider = document.createElement("div");
        divider.className = "translation-training-group-divider";
        divider.setAttribute("aria-hidden", "true");
        optionShell.appendChild(divider);
      }
      const group = columnDef.group;
      const groupIndex = columnDef.groupIndex;
      const solvedSelection = training.partSelections[training.currentPartIndex]?.[group.key];
      const groupOptions = Array.isArray(group?.options) ? group.options.map((option) => String(option || "")) : [];
      const longestOptionLength = groupOptions.reduce((maxLength, option) => Math.max(maxLength, option.length), 0);
      const groupWidthRem = Math.min(18, Math.max(11.5, longestOptionLength * 0.62 + 2));
      const estimatedLines = Math.min(4, Math.max(1, Math.ceil(longestOptionLength / 12)));
      const groupMinHeightPx = 38 + (estimatedLines - 1) * 18;
      column.style.setProperty("--tt-group-width", `${groupWidthRem}rem`);
      column.style.setProperty("--tt-group-min-height", `${groupMinHeightPx}px`);

      group.options.forEach((optionText, optionIndex) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "secondary-btn translation-training-card";
        const isThisSolvedSelection = Boolean(solvedSelection) && solvedSelection.optionIndex === optionIndex;
        const isThisGroupSolved = Boolean(solvedSelection) && solvedSelection.groupIndex === groupIndex;
        if (isThisSolvedSelection) {
          button.classList.add("active");
          button.dataset.resultState = "selected";
        } else if (solvedSelection) {
          button.classList.add("dimmed");
          button.dataset.resultState = "dimmed";
        }
        if (isThisGroupSolved && solvedSelection && isThisSolvedSelection) {
          const currentResultState = window.translationTrainingData?.getTranslationTrainingCardDisplayState?.({ isCorrect: solvedSelection.isCorrect }) || { state: "" };
          button.dataset.resultState = currentResultState.state || button.dataset.resultState;
        }
        const cardContent = document.createElement("span");
        cardContent.className = "translation-training-card-content";
        const text = document.createElement("span");
        text.className = "translation-training-card-label";
        text.textContent = optionText;
        cardContent.appendChild(text);
        button.appendChild(cardContent);
        button.dataset.groupIndex = String(groupIndex);
        button.dataset.optionIndex = String(optionIndex);
        button.addEventListener("click", () => handleTranslationTrainingOptionSelect(groupIndex, optionIndex, optionText, button));
        column.appendChild(button);
      });
      optionShell.appendChild(column);
      renderedGroupCount += 1;
    });

    elements.translationTrainingOptionList.appendChild(optionShell);
    elements.translationTrainingRetryBtn.disabled = false;
    elements.translationTrainingRetryBtn.textContent = "戻る";
    elements.translationTrainingNextBtn.textContent = "次へ";
    elements.translationTrainingNextBtn.disabled = !currentPartSolved;
    elements.translationTrainingNextBtn.classList.remove("hidden");
  }

  function handleTranslationTrainingOptionSelect(groupIndex, optionIndex, selectedText, selectedButton = null) {
    const training = state.translationTraining;
    if (!training) return;
    const question = training.questions[training.questionIndex];
    const currentPart = question?.parts[training.currentPartIndex];
    if (!question || !currentPart) return;
    const group = currentPart.selectionGroups?.[groupIndex];
    if (!group) return;
    const correctIndex = Number.isInteger(group.correctIndex) ? group.correctIndex : 0;
    const isCorrect = optionIndex === correctIndex;
    const attemptKey = `${training.currentPartIndex}:${group.key}`;
    if (!training.incorrectAttemptsByGroup || typeof training.incorrectAttemptsByGroup !== "object") {
      training.incorrectAttemptsByGroup = {};
    }
    elements.translationTrainingFeedbackText.textContent = isCorrect ? "正解です。" : "";
    if (!isCorrect) {
      const currentQuestionIndex = Math.max(0, Number(training.questionIndex) || 0);
      if (!training.historyQuestionHadIncorrectMap || typeof training.historyQuestionHadIncorrectMap !== "object") {
        training.historyQuestionHadIncorrectMap = {};
      }
      training.historyQuestionHadIncorrectMap[currentQuestionIndex] = true;
      training.incorrectAttemptsByGroup[attemptKey] = Math.max(0, Number(training.incorrectAttemptsByGroup[attemptKey]) || 0) + 1;
      triggerTranslationTrainingIncorrectFeedback(selectedButton);
      return;
    }
    if (!training.partSelections[training.currentPartIndex]) {
      training.partSelections[training.currentPartIndex] = {};
    }
    training.partSelections[training.currentPartIndex][group.key] = {
      groupIndex,
      optionIndex,
      text: selectedText,
      isCorrect
    };
    const selectedTextWithSpace = `${training.builtJapanese}${selectedText}`;
    training.builtJapanese = selectedTextWithSpace;
    training.completedSelections.push({ partIndex: training.currentPartIndex, groupIndex, text: selectedText });
    training.answeredGroupKeys = Array.from(new Set([...training.answeredGroupKeys, group.key]));
    window.requestAnimationFrame(() => {
      renderTranslationTrainingQuestion();
    });
  }

  function advanceTranslationTrainingPart() {
    const training = state.translationTraining;
    if (!training) return;
    const question = training.questions[training.questionIndex];
    if (!question) return;
    const currentPart = question.parts[training.currentPartIndex];
    const isCurrentPartSolved = isTranslationTrainingPartSolved(training, currentPart, Number(training.currentPartIndex) || 0);
    if (!isCurrentPartSolved) return;
    if (training.currentPartIndex + 1 < question.parts.length) {
      training.currentPartIndex += 1;
      training.currentSelectionIndex = 0;
      training.answeredGroupKeys = [];
      state.translationTrainingCurrentPartIndex = training.currentPartIndex;
      state.translationTrainingPartCompleted = false;
      window.requestAnimationFrame(() => {
        renderTranslationTrainingQuestion();
      });
      return;
    }
    state.translationTrainingPartCompleted = true;
    window.requestAnimationFrame(() => {
      renderTranslationTrainingComplete();
    });
  }

  function retreatTranslationTrainingPart() {
    const training = state.translationTraining;
    if (!training) return;
    if (training.currentPartIndex <= 0) {
      return;
    }
    training.currentPartIndex -= 1;
    training.currentSelectionIndex = 0;
    training.answeredGroupKeys = [];
    state.translationTrainingCurrentPartIndex = training.currentPartIndex;
    state.translationTrainingPartCompleted = false;
    window.requestAnimationFrame(() => {
      renderTranslationTrainingQuestion();
    });
  }

  function renderTranslationTrainingComplete() {
    const training = state.translationTraining;
    if (!training) return;
    const question = training.questions[training.questionIndex];
    if (!question) return;
    elements.translationTrainingQuestionPanel.classList.add("hidden");
    elements.translationTrainingCompletePanel.classList.remove("hidden");
    elements.translationTrainingEnglishReadText.innerHTML = "";
    elements.translationTrainingEnglishReadText.appendChild(buildTranslationTrainingEnglishReadFragment(question.english));
    elements.translationTrainingJapaneseText.textContent = question.japanese;
    const questionIndex = Math.max(0, Number(training.questionIndex) || 0);
    if (!training.historyCompletedQuestionMap || typeof training.historyCompletedQuestionMap !== "object") {
      training.historyCompletedQuestionMap = {};
    }
    if (training.historyCompletedQuestionMap[questionIndex] !== true) {
      training.historyCompletedQuestionMap[questionIndex] = true;
      training.historyQuestionCount = Math.max(0, Number(training.historyQuestionCount) || 0) + 1;
      training.historyCorrectCount = Math.max(0, Number(training.historyCorrectCount) || 0) + 1;
      training.historyEarnedPoints = Math.max(0, Number(training.historyEarnedPoints) || 0) + awardTranslationTrainingPoints(1);
    }
    recordMobileLearningActivity();
    state.translationTrainingSpeechDetected = false;
    clearTranslationTrainingSpeechTimer();
  }

  function buildTranslationLearningHistorySummary(training = state.translationTraining) {
    const questionCount = Math.max(0, Number(training?.historyQuestionCount) || 0);
    const correctCount = Math.max(0, Number(training?.historyCorrectCount) || 0);
    return {
      questionCount,
      correctCount,
      accuracy: questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0
    };
  }

  function advanceTranslationTrainingQuestion() {
    const training = state.translationTraining;
    if (!training) return;
    recordMobileLearningActivity();
    if (training.questionIndex + 1 < training.questions.length) {
      training.questionIndex += 1;
      const resetState = window.translationTrainingData?.resetTranslationTrainingQuestionState?.(training) || training;
      Object.assign(training, resetState);
      state.translationTrainingCurrentPartIndex = 0;
      state.translationTrainingPartCompleted = false;
      state.translationTrainingSpeechDetected = false;
      clearTranslationTrainingSpeechTimer();
      renderTranslationTrainingQuestion();
      showScreen("translationTrainingScreen");
      return;
    }
    if (state.learningHistorySession) {
      finalizeMobileLearningHistorySession({
        completedReason: "completed",
        mode: "和訳トレーニング",
        dayNumber: "",
        summary: buildTranslationLearningHistorySummary(training)
      });
    }
    const earnedPoints = Math.max(0, Number(training.historyEarnedPoints) || 0);
    state.translationTraining = null;
    state.translationTrainingCurrentPartIndex = 0;
    state.translationTrainingPartCompleted = false;
    state.translationTrainingSpeechDetected = false;
    clearTranslationTrainingSpeechTimer();
    if (earnedPoints > 0) {
      openPointRewardScreen("translation", earnedPoints, { onClose: renderHome });
      return;
    }
    renderHome();
  }

  function applyMobileAuthState(user) {
    const nextStatus = user ? "logged-in" : "logged-out";
    const nextUid = String(user?.uid || "").trim();
    if (nextStatus === mobileAuthLastStatus && nextUid === mobileAuthLastUid) return;
    mobileAuthLastStatus = nextStatus;
    mobileAuthLastUid = nextUid;
    if (user) {
      const nextUid = String(user?.uid || "").trim();
      const previousOwner = String(vocabularyStateOwnerUid || "").trim();
      if (previousOwner && previousOwner !== nextUid) {
        state.teacherCheckSession = null;
        state.vocabularyStudy = null;
        state.vocabularyTodayHistoryMap = {};
        vocabularyStateOwnerUid = "";
        vocabularyTodayHistoryOwnerUid = "";
      }
      refreshMobileFamilyIdentityCache()
        .catch(() => false)
        .finally(() => {
          flushMobilePendingLearningHistoryEntries().catch(() => 0);
          initializeMobilePointSyncForCurrentUser({ force: true }).catch(() => false);
          initializeWordOrderStatsSyncForCurrentUser({ force: true }).catch(() => false);
          initializeMobileVocabularySyncForCurrentUser({ force: true }).catch(() => false);
          refreshMobileHomeTodayLearningSummaryFromFirestore().catch(() => false);
        });
      renderHome();
      return;
    }
    if (typeof mobilePointSyncUnsubscribe === "function") {
      mobilePointSyncUnsubscribe();
    }
    mobilePointSyncUnsubscribe = null;
    mobilePointSyncCurrentUid = "";
    mobilePointSyncReady = false;
    mobilePointSyncAllowCreate = false;
    mobilePointStateCache = null;
    mobilePointStateCacheUid = "";
    if (typeof wordOrderStatsSyncUnsubscribe === "function") {
      wordOrderStatsSyncUnsubscribe();
    }
    wordOrderStatsSyncUnsubscribe = null;
    wordOrderStatsSyncCurrentUid = "";
    wordOrderStatsSyncReady = false;
    wordOrderStatsCache = null;
    if (typeof vocabularySyncUnsubscribe === "function") {
      vocabularySyncUnsubscribe();
    }
    vocabularySyncUnsubscribe = null;
    vocabularySyncCurrentUid = "";
    vocabularySyncReady = false;
    vocabularySyncAllowCreate = false;
    vocabularySyncCache = null;
    vocabularySyncCacheUid = "";
    flushMobilePendingLearningHistoryEntries().catch(() => 0);
  }

  function bindMobileAuthState() {
    if (!mobileAuthListenerBound) {
      document.addEventListener("mobile-firebase-auth-state", (event) => {
        applyMobileAuthState(event?.detail?.user || null);
      });
      mobileAuthListenerBound = true;
    }

    const authState = window.MobileFirebaseAuthState || {};
    const currentUser = typeof window.getMobileFirebaseCurrentUser === "function"
      ? window.getMobileFirebaseCurrentUser()
      : (authState.user || null);
    if (authState.status === "logged-in" || currentUser) {
      mobileAuthLastStatus = "logged-in";
      mobileAuthLastUid = String(currentUser?.uid || "").trim();
      mobilePointStateCache = null;
      mobilePointStateCacheUid = "";
      mobilePointSyncAllowCreate = false;
      refreshMobileFamilyIdentityCache()
        .catch(() => false)
        .finally(() => {
          flushMobilePendingLearningHistoryEntries().catch(() => 0);
          initializeMobilePointSyncForCurrentUser({ force: true }).catch(() => false);
          initializeWordOrderStatsSyncForCurrentUser({ force: true }).catch(() => false);
          initializeMobileVocabularySyncForCurrentUser({ force: true }).catch(() => false);
          refreshMobileHomeTodayLearningSummaryFromFirestore().catch(() => false);
        });
      renderHome();
      return;
    }
    if (authState.status === "logged-out") {
      mobileAuthLastStatus = "logged-out";
      mobileAuthLastUid = "";
    }
  }

  function renderComingSoonScreen(options = {}) {
    const titleText = document.getElementById("comingSoonTitleText");
    const messageText = document.getElementById("comingSoonMessageText");
    if (titleText) {
      titleText.textContent = options.title || "準備中";
    }
    if (messageText) {
      messageText.textContent = options.message || "この画面は準備中です。まずはスピーキング学習を利用してください。";
    }
    showScreen("comingSoonScreen");
  }

  function refreshMobileCache() {
    const cacheToken = String(Date.now());
    try {
      window.localStorage.setItem("englishTrainerMobileCacheToken", cacheToken);
    } catch (error) {
      // Ignore storage failures and still reload with the in-memory token.
    }
    window.name = cacheToken;
    window.location.reload();
  }

  function getSpeakingResumeInfo() {
    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    if (!progress || !week) return null;
    const total = week.shortConversations.length;
    if (!total) return null;
    return {
      week,
      total,
      completedRounds: getSpeakingCompletedRounds(progress),
      currentRound: getSpeakingCurrentRound(progress),
      targetRounds: getSpeakingTargetRounds(progress),
      lines: buildSpeakingContinueLines(progress, week)
    };
  }

  function formatRecentSpeakingUpdatedAt(timestamp) {
    if (!Number.isFinite(Number(timestamp))) return "";
    const target = new Date(Number(timestamp));
    const now = new Date();
    const toJstParts = (value) => {
      const formatter = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
      const parts = formatter.formatToParts(value);
      return Object.fromEntries(parts.map((part) => [part.type, part.value]));
    };
    const targetParts = toJstParts(target);
    const nowParts = toJstParts(now);
    const targetDateKey = `${targetParts.year}-${targetParts.month}-${targetParts.day}`;
    const nowDateKey = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;
    if (targetDateKey === nowDateKey) {
      return `${Number(targetParts.month)}/${Number(targetParts.day)} ${targetParts.hour}:${targetParts.minute}`;
    }
    const targetMidnight = Date.UTC(Number(targetParts.year), Number(targetParts.month) - 1, Number(targetParts.day));
    const nowMidnight = Date.UTC(Number(nowParts.year), Number(nowParts.month) - 1, Number(nowParts.day));
    const dayDiff = Math.round((nowMidnight - targetMidnight) / 86400000);
    if (dayDiff === 1) {
      return `昨日 ${targetParts.hour}:${targetParts.minute}`;
    }
    return `${Number(targetParts.month)}/${Number(targetParts.day)} ${targetParts.hour}:${targetParts.minute}`;
  }

  function getSpeakingWeekDayCount(week, conversationOrder = null) {
    if (Array.isArray(conversationOrder) && conversationOrder.length) {
      return getSpeakingSelectedDayKeysFromOrder(week, conversationOrder).length;
    }
    return getSpeakingOrderedDayKeys(week).length;
  }

  function buildRecentSpeakingStatusText(entry, week) {
    const totalDays = getSpeakingWeekDayCount(week, entry.conversationOrder);
    const targetRounds = getSpeakingTargetRounds(entry);
    const isDayComplete = entry.phase === "conversationComplete" || entry.daySetNumber >= entry.totalDaySets;
    if (!isDayComplete) {
      return `🎯 ${entry.daySetNumber}セット目に挑戦中`;
    }
    if (entry.dayNumber >= totalDays) {
      const roundNumber = Math.min(targetRounds, getSpeakingCompletedRounds(entry) + 1);
      return `✅ Day${entry.dayNumber} 完了（Round${roundNumber}/${targetRounds} 完了）`;
    }
    return `✅ Day${entry.dayNumber} 完了`;
  }

  function buildRecentSpeakingResumeLabel(entry, week) {
    const totalDays = getSpeakingWeekDayCount(week, entry.conversationOrder);
    const isDayComplete = entry.phase === "conversationComplete" || entry.daySetNumber >= entry.totalDaySets;
    if (!isDayComplete) {
      return "▶ 続きから";
    }
    if (entry.dayNumber >= totalDays) {
      return "▶NEXT Round";
    }
    return `▶ Day${entry.dayNumber + 1}へ`;
  }

  function renderSpeakingRecentProgressList() {
    if (!elements.conversationContinuePanel || !elements.recentProgressList) return;

    const entries = [...state.recentSpeakingProgress].sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0)).slice(0, 3);
    elements.recentProgressList.innerHTML = "";
    elements.conversationContinuePanel.classList.toggle("hidden", !entries.length);
    if (!entries.length) return;

    const fragment = document.createDocumentFragment();
    entries.forEach((entry) => {
      const week = getSpeakingWeek(entry.weekId);
      if (!week) return;

      const card = document.createElement("article");
      card.className = "recent-progress-card recent-progress-card-compact";

      const title = document.createElement("p");
      title.className = "recent-progress-title";
      const weekRangeLabel = String(week?.label || "").replace(/[～〜]/g, "-");
      const weekTitle = weekRangeLabel
        ? `${getSpeakingWeekDisplayName(week)}（${weekRangeLabel}）`
        : getSpeakingWeekDisplayName(week);
      title.textContent = `${weekTitle}　Day${entry.dayNumber}`;

      const statusText = document.createElement("p");
      const isDayComplete = entry.phase === "conversationComplete" || entry.daySetNumber >= entry.totalDaySets;
      statusText.className = `recent-progress-state${isDayComplete ? " recent-progress-state-complete" : " recent-progress-state-active"}`;
      statusText.textContent = buildRecentSpeakingStatusText(entry, week);

      const metaRow = document.createElement("div");
      metaRow.className = "recent-progress-meta-row";

      const updatedText = document.createElement("p");
      updatedText.className = "recent-progress-time";
      updatedText.textContent = `🕒 ${formatRecentSpeakingUpdatedAt(entry.updatedAt)}`;

      const resumeBtn = document.createElement("button");
      resumeBtn.className = "recent-progress-link-btn";
      resumeBtn.type = "button";
      resumeBtn.textContent = buildRecentSpeakingResumeLabel(entry, week);
      resumeBtn.addEventListener("click", () => resumeRecentSpeakingProgress(entry.weekId));

      metaRow.append(updatedText, resumeBtn);
      card.append(title, statusText, metaRow);
      fragment.append(card);
    });

    elements.recentProgressList.append(fragment);
  }

  function findStoredSpeakingProgressForResume(weekId, recentEntry = null) {
    const targetWeekId = String(weekId || "").trim();
    if (!targetWeekId) return null;

    const savedProgressEntries = Object.values(state.speakingDayProgressMap || {})
      .filter((progress) => String(progress?.weekId || "").trim() === targetWeekId)
      .map((progress) => sanitizeSpeakingProgress(progress))
      .filter(Boolean)
      .sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));

    if (!savedProgressEntries.length) return null;

    if (recentEntry && Number.isFinite(Number(recentEntry.dayNumber))) {
      const targetDayNumber = Number(recentEntry.dayNumber);
      const matchingDayProgress = savedProgressEntries.find((progress) => {
        const week = getSpeakingWeek(progress.weekId);
        if (!week) return false;
        const dayNumber = getSpeakingDayNumber(week, getSpeakingConversationForProgress(progress, week));
        return Number.isFinite(dayNumber) && dayNumber === targetDayNumber;
      });
      if (matchingDayProgress) return matchingDayProgress;
    }

    return savedProgressEntries[0];
  }

  function resumeRecentSpeakingProgress(weekId) {
    const entry = state.recentSpeakingProgress.find((item) => item.weekId === weekId) || null;
    const fallbackProgress = findStoredSpeakingProgressForResume(weekId, entry);
    const progress = sanitizeSpeakingProgress(entry) || fallbackProgress;
    const week = getSpeakingWeek(progress?.weekId);
    if (!progress || !week) {
      removeRecentSpeakingProgressByWeek(weekId);
      renderHome();
      return;
    }

    if (!entry && !fallbackProgress) {
      removeRecentSpeakingProgressByWeek(weekId);
      renderHome();
      return;
    }

    state.speakingProgress = progress;
    resetSpeakingHintState();
    state.speakingTranslationVisible = false;
    state.speakingLineStatus = "awaitingStart";
    saveSpeakingProgress();

    if (progress.phase === "conversationComplete") {
      renderConversationCompleteScreen();
      return;
    }
    renderConversationPracticeWithAutoPlay();
  }

  function getJstWeekdayLabel(dayKey) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || "").trim());
    if (!match) return "?";
    const [, year, month, day] = match;
    const dateUtcNoon = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
    const weekdayJa = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", weekday: "short" }).format(dateUtcNoon);
    const normalized = String(weekdayJa || "").trim().replace(/曜日$/, "");
    if (WEEKDAY_LABELS_JA.includes(normalized)) {
      return normalized;
    }
    return "?";
  }

  function getSpeakingWeekBySelector() {
    const availableWeeks = getAvailableConversationWeeks();
    if (!availableWeeks.length) {
      window.alert("会話データがありません。");
      return null;
    }
    const selectedWeekId = String(state.speakingUi.selectedConversationWeekId || "").trim();
    const selectedWeek = availableWeeks.find((week) => week.weekId === selectedWeekId) || availableWeeks[0];
    if (!selectedWeek) {
      window.alert("選択したWeekに会話データがありません。");
      return null;
    }
    return selectedWeek;
  }

  function getSpeakingConversationSpokenCount(progress, conversationId) {
    if (!progress || !conversationId) return 0;
    const completedRounds = Math.max(0, Number(progress.completedRounds) || 0);
    const targetRounds = getSpeakingTargetRounds(progress);
    const completedInCurrentRound = Array.isArray(progress.completedConversationIds)
      && completedRounds < targetRounds
      && progress.completedConversationIds.includes(conversationId)
      ? 1
      : 0;
    return completedRounds + completedInCurrentRound;
  }

  function formatSpeakingRoundProgressBySpokenCount(spokenCount) {
    const count = Math.max(0, Number(spokenCount) || 0);
    if (count <= 0) {
      return { text: "未開始", tone: "not-started" };
    }
    if (count === 1) {
      return { text: "1周目（あと2回）", tone: "first-round" };
    }
    if (count === 2) {
      return { text: "1周目（あと1回）", tone: "first-round" };
    }
    if (count === 3) {
      return { text: "1周完了 ✓", tone: "complete" };
    }
    return { text: `${count - 2}周目`, tone: "complete" };
  }

  function hasCurrentSpeakingDayProgress(week, dayKey) {
    const targetWeekId = String(week?.weekId || "").trim();
    const targetDayKey = String(dayKey || "").trim();
    if (!targetWeekId || !targetDayKey) return false;
    const currentProgress = state.speakingProgress;
    if (!currentProgress) return false;
    const currentWeekId = String(currentProgress?.weekId || "").trim();
    if (currentWeekId !== targetWeekId) return false;
    const currentDayKey = String(resolveSpeakingProgressDayKey(week, currentProgress) || "").trim();
    return currentDayKey === targetDayKey;
  }

  function getStoredSpeakingProgressForDayDisplay(week, dayKey) {
    const targetWeekId = String(week?.weekId || "").trim();
    const targetDayKey = String(dayKey || "").trim();
    if (!targetWeekId || !targetDayKey) return null;

    const currentProgress = state.speakingProgress;
    const currentWeekMatches = currentProgress && String(currentProgress.weekId || "").trim() === targetWeekId;
    if (currentWeekMatches && String(resolveSpeakingProgressDayKey(week, currentProgress) || "").trim() === targetDayKey) {
      return sanitizeSpeakingProgress(currentProgress);
    }

    const storedProgress = getStoredSpeakingDayProgress(targetWeekId, targetDayKey);
    return storedProgress ? sanitizeSpeakingProgress(storedProgress) : null;
  }

  function getDayProgressSummaryText(week, dayKey) {
    const progress = getStoredSpeakingProgressForDayDisplay(week, dayKey);
    if (!progress || !Array.isArray(progress.conversationOrder)) {
      return formatSpeakingRoundProgressBySpokenCount(0);
    }

    const dayOrder = getSpeakingPracticeConversationIds(week, [dayKey]);
    if (!dayOrder.length) {
      return formatSpeakingRoundProgressBySpokenCount(0);
    }

    const spokenCounts = dayOrder.map((conversationId) => getSpeakingConversationSpokenCount(progress, conversationId));
    const slowestCount = spokenCounts.length ? Math.min(...spokenCounts) : 0;
    return formatSpeakingRoundProgressBySpokenCount(slowestCount);
  }

  function renderConversationDaySelectScreen() {
    const week = getSpeakingWeek(state.speakingUi.selectedConversationWeekId);
    if (!week) {
      renderConversationSelectScreen();
      return;
    }

    const orderedDayKeys = getSpeakingOrderedDayKeys(week);
    const selectedDaySet = new Set(sanitizeSelectedDayKeys(week, state.speakingUi.selectedConversationDayKeys, { fallbackToAll: false }));
    state.speakingUi.selectedConversationDayKeys = [...selectedDaySet];

    elements.conversationDaySelectWeekText.textContent = getSpeakingWeekDisplayLabel(week);
    elements.conversationDayChecklist.innerHTML = "";

    const fragment = document.createDocumentFragment();
    orderedDayKeys.forEach((dayKey) => {
      const row = document.createElement("div");
      row.className = "conversation-day-item";

      const checkWrap = document.createElement("label");
      checkWrap.className = "conversation-day-check";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = dayKey;
      checkbox.checked = selectedDaySet.has(dayKey);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          selectedDaySet.add(dayKey);
        } else {
          selectedDaySet.delete(dayKey);
        }
        state.speakingUi.selectedConversationDayKeys = orderedDayKeys.filter((key) => selectedDaySet.has(key));
        renderConversationDaySelectActionButtons(week, state.speakingUi.selectedConversationDayKeys);
      });

      const weekdayText = document.createElement("span");
      weekdayText.textContent = getJstWeekdayLabel(dayKey);

      checkWrap.append(checkbox, weekdayText);

      const progressText = document.createElement("p");
      const progressSummary = getDayProgressSummaryText(week, dayKey);
      progressText.className = `conversation-day-progress conversation-day-progress-${progressSummary.tone}`;
      progressText.textContent = progressSummary.text;

      row.append(checkWrap, progressText);
      fragment.append(row);
    });

    elements.conversationDayChecklist.append(fragment);
    renderConversationDaySelectActionButtons(week, state.speakingUi.selectedConversationDayKeys);

    showScreen("conversationDaySelectScreen");
  }

  function getVocabularyEntryDisplayStatus(entry) {
    const pronunciationLevel = Number(entry?.pronunciation?.level ?? 0);
    const meaningLevel = Number(entry?.meaningState?.level ?? 0);
    if (pronunciationLevel >= 5 && meaningLevel >= 5) return "mastered";
    if (pronunciationLevel > 0 && meaningLevel > 0) return "learning";
    return "unlearned";
  }

  function getVocabularyGradeProgressDisplay(gradeKey) {
    const entries = Array.isArray(state.vocabularyStudy?.entries) && state.vocabularyStudy.entries.length
      ? state.vocabularyStudy.entries
      : getVocabularyRealWordBank().map((entry, index) => normalizeVocabularyWordRecord(entry, index)).filter(Boolean);
    const safeGradeKey = ["5", "4", "3"].includes(String(gradeKey || "")) ? String(gradeKey) : "5";
    const gradeEntries = entries.filter((entry) => getVocabularyGradeValue(entry) === safeGradeKey);
    const total = gradeEntries.length;
    const mastered = gradeEntries.filter((entry) => getVocabularyEntryDisplayStatus(entry) === "mastered").length;
    const learning = gradeEntries.filter((entry) => getVocabularyEntryDisplayStatus(entry) === "learning").length;
    const unlearned = gradeEntries.filter((entry) => getVocabularyEntryDisplayStatus(entry) === "unlearned").length;
    const activeCount = mastered + learning;
    const status = unlearned === 0 ? "mastered" : "learning";
    return {
      gradeKey: safeGradeKey,
      total,
      mastered,
      learning,
      unlearned,
      activeCount,
      status,
      label: status === "mastered" ? "定着" : "学習中",
      count: status === "mastered" ? mastered : activeCount,
      summaryText: status === "mastered" ? `定着 ${mastered} / ${total}` : `学習中 ${activeCount} / ${total}`
    };
  }

  function getVocabularyPracticeEntrySummary() {
    const studyEntries = Array.isArray(state.vocabularyStudy?.entries) && state.vocabularyStudy.entries.length
      ? state.vocabularyStudy.entries
      : getVocabularyRealWordBank().map((entry, index) => normalizeVocabularyWordRecord(entry, index)).filter(Boolean);
    const totalWords = Array.isArray(studyEntries) ? studyEntries.length : 0;
    const summary = {
      totalWords,
      mastered: 0,
      learning: 0,
      unlearned: 0,
      gradeSummary: {
        5: { total: 0, mastered: 0 },
        4: { total: 0, mastered: 0 },
        3: { total: 0, mastered: 0 }
      },
      percent: 0
    };

    if (!totalWords) {
      return summary;
    }

    studyEntries.forEach((entry) => {
      const gradeKey = getVocabularyGradeValue(entry);
      const safeGradeKey = ["5", "4", "3"].includes(gradeKey) ? gradeKey : "5";
      const gradeBucket = summary.gradeSummary[safeGradeKey] || { total: 0, mastered: 0 };
      gradeBucket.total += 1;
      summary.gradeSummary[safeGradeKey] = gradeBucket;

      const status = getVocabularyEntryDisplayStatus(entry);
      if (status === "mastered") {
        summary.mastered += 1;
        gradeBucket.mastered += 1;
        return;
      }

      if (status === "learning") {
        summary.learning += 1;
        return;
      }

      summary.unlearned += 1;
    });

    summary.percent = Math.round((summary.mastered / Math.max(1, totalWords)) * 100);
    return summary;
  }

  function getVocabularyProgressListEntries(filterType, filterValue) {
    const studyEntries = Array.isArray(state.vocabularyStudy?.entries) && state.vocabularyStudy.entries.length
      ? state.vocabularyStudy.entries
      : getVocabularyRealWordBank().map((entry, index) => normalizeVocabularyWordRecord(entry, index)).filter(Boolean);

    if (filterType === "grade") {
      const grade = ["5", "4", "3"].includes(String(filterValue || "")) ? String(filterValue) : "5";
      return studyEntries
        .filter((entry) => getVocabularyGradeValue(entry) === grade)
        .sort((a, b) => a.word.localeCompare(b.word, "ja"));
    }

    const status = ["mastered", "learning", "unlearned"].includes(String(filterValue || "")) ? String(filterValue) : "learning";
    return studyEntries
      .filter((entry) => getVocabularyEntryDisplayStatus(entry) === status)
      .sort((a, b) => {
        const gradeDiff = Number(getVocabularyGradeValue(a)) - Number(getVocabularyGradeValue(b));
        if (gradeDiff !== 0) return gradeDiff;
        return a.word.localeCompare(b.word, "ja");
      });
  }

  function renderVocabularyProgressList(filterType = "grade", filterValue = "5") {
    const titleEl = document.getElementById("vocabularyProgressListTitle");
    const metaEl = document.getElementById("vocabularyProgressListMeta");
    const listEl = document.getElementById("vocabularyProgressList");
    if (!titleEl || !metaEl || !listEl) return;

    const entries = getVocabularyProgressListEntries(filterType, filterValue);
    const isGradeFilter = filterType === "grade";
    const filterLabel = isGradeFilter ? `${String(filterValue || "5")}級` : {
      mastered: "定着",
      learning: "学習中",
      unlearned: "未学習"
    }[String(filterValue || "learning")] || "学習中";

    titleEl.textContent = isGradeFilter ? `${filterLabel}一覧` : `${filterLabel}一覧`;
    const summary = isGradeFilter
      ? getVocabularyGradeProgressDisplay(filterValue)
      : { count: entries.length };
    metaEl.textContent = isGradeFilter ? `${summary.label} ${summary.count} / ${summary.total}` : `${entries.length}語`;

    listEl.innerHTML = entries.length
      ? entries.map((entry) => {
          const status = getVocabularyEntryDisplayStatus(entry);
          const statusLabelMap = { mastered: "定着", learning: "学習中", unlearned: "未学習" };
          const statusText = statusLabelMap[status] || "未学習";
          const partOfSpeech = String(entry?.partOfSpeech || "名詞");
          const meaning = String(entry?.meaning || "");
          return `
            <div class="vocabulary-progress-list-item">
              <div class="vocabulary-progress-list-meta-row">
                <span class="vocabulary-progress-list-grade">${String(getVocabularyGradeValue(entry) || "5")}級</span>
                <span class="vocabulary-progress-list-badge vocabulary-progress-list-badge--${status}">${statusText}</span>
              </div>
              <div class="vocabulary-progress-list-word-row">
                <strong>${String(entry?.word || "-")}</strong>
                <span>${partOfSpeech}</span>
              </div>
              <p class="vocabulary-progress-list-meaning">${meaning || "意味未設定"}</p>
            </div>
          `;
        }).join("")
      : '<div class="vocabulary-progress-list-empty">表示できる単語がありません。</div>';
  }

  function openVocabularyProgressList(filterType = "grade", filterValue = "5") {
    renderVocabularyProgressList(filterType, filterValue);
    showScreen("vocabularyProgressListScreen");
  }

  function renderVocabularyPracticeProgressCard() {
    const card = document.getElementById("vocabularyPracticeProgressCard");
    if (!card) {
      return;
    }

    const summary = getVocabularyPracticeEntrySummary();
    const todaySummary = getMobileHomeTodayLearningSummary().word;
    const totalWords = summary.totalWords || 0;
    const registeredText = document.getElementById("vocabularyPracticeRegisteredText");
    const masteredText = document.getElementById("vocabularyPracticeMasteredText");
    const learningText = document.getElementById("vocabularyPracticeLearningText");
    const unlearnedText = document.getElementById("vocabularyPracticeUnlearnedText");
    const progressBarFill = document.getElementById("vocabularyPracticeProgressBarFill");
    const progressBarCountText = document.getElementById("vocabularyPracticeProgressCountText");
    const gradeSummaryWrap = document.getElementById("vocabularyPracticeGradeSummary");
    const todayText = document.getElementById("vocabularyPracticeTodayText");
    const todayLabel = document.getElementById("vocabularyPracticeTodayLabel");

    if (registeredText) {
      registeredText.textContent = `登録語数 ${totalWords}語`;
    }
    if (masteredText) {
      masteredText.textContent = `${summary.mastered}語`;
    }
    if (learningText) {
      learningText.textContent = `${summary.learning}語`;
    }
    if (unlearnedText) {
      unlearnedText.textContent = `${summary.unlearned}語`;
    }
    if (progressBarFill) {
      progressBarFill.style.width = `${Math.min(100, Math.max(0, summary.percent))}%`;
    }
    if (progressBarCountText) {
      progressBarCountText.textContent = `定着 ${summary.mastered} / ${totalWords}`;
    }
    if (todayLabel) {
      todayLabel.textContent = "今日の学習";
    }
    if (todayText) {
      todayText.textContent = `${todaySummary.count || 0}語・${todaySummary.points || 0}P`;
    }
    if (gradeSummaryWrap) {
      const gradeRows = [
        ["5級", "5"],
        ["4級", "4"],
        ["3級", "3"]
      ];
      gradeSummaryWrap.innerHTML = gradeRows
        .map(([label, gradeKey]) => {
          const display = getVocabularyGradeProgressDisplay(gradeKey);
          return `
            <button
              class="vocabulary-practice-grade-row"
              type="button"
              data-vocabulary-grade="${display.gradeKey}"
              data-vocabulary-grade-label="${label}"
            >
              <span>${label}</span>
              <strong>${display.label} ${display.count} / ${display.total}</strong>
            </button>
          `;
        })
        .join("");
      gradeSummaryWrap.querySelectorAll(".vocabulary-practice-grade-row").forEach((button) => {
        button.addEventListener("click", () => openVocabularyProgressList("grade", button.dataset.vocabularyGrade || "5"));
      });
    }

    card.classList.toggle("hidden", !totalWords);
  }

  function renderSpeakingHome() {
    stopVocabularySampleTimer();
    renderVocabularyPracticeProgressCard();
    showScreen("speakingHomeScreen");
  }

  function renderConversationSelectScreen() {
    const availableWeeks = getAvailableConversationWeeks();
    if (availableWeeks.length && !availableWeeks.some((week) => week.weekId === state.speakingUi.selectedConversationWeekId)) {
      state.speakingUi.selectedConversationWeekId = availableWeeks[0].weekId;
    }
    if (state.speakingUi.selectedConversationWeekId) {
      state.speakingUi.speakingWordSelectedWeekId = state.speakingUi.selectedConversationWeekId;
    }
    elements.conversationWeekSelect.value = String(state.speakingUi.selectedConversationWeekId || "");
    renderSpeakingRecentProgressList();

    showScreen("conversationSelectScreen");
  }

  function renderSpeakingVocabScreen() {
    const dayMode = state.speakingUi.vocabularyRangeMode === "day";
    const weekMode = state.speakingUi.vocabularyRangeMode === "week";
    elements.speakingWordDayRangeFields.classList.toggle("hidden", !dayMode);
    [...document.querySelectorAll('input[name="speakingWordRangeMode"]')].forEach((radio) => {
      radio.checked = radio.value === state.speakingUi.vocabularyRangeMode;
    });
    elements.speakingWordStartDaySelect.value = String(state.speakingUi.startDay);
    elements.speakingWordEndDaySelect.value = String(state.speakingUi.endDay);
    elements.startSpeakingWordPracticeBtn.textContent = weekMode ? "Weekを選ぶ" : "スタート";

    showScreen("speakingVocabScreen");
  }

  function getCurrentQuestion() {
    return state.session?.questions?.[state.session.currentIndex] || null;
  }

  function setSupportNotice(message) {
    elements.speechSupportNotice.textContent = message || "";
    elements.speechSupportNotice.classList.toggle("hidden", !message);
  }

  function renderStudyActions(buttonConfigs) {
    elements.studyActionArea.innerHTML = "";
    buttonConfigs.forEach((config) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = config.variant || "secondary-btn";
      button.textContent = config.label;
      button.disabled = Boolean(config.disabled);
      button.addEventListener("click", config.onClick);
      elements.studyActionArea.appendChild(button);
    });
  }

  function renderFeedback() {
    const session = state.session;
    const question = getCurrentQuestion();
    if (!session || !question) return;

    elements.studyDayText.textContent = `Day${question.day}`;
    elements.studyProgressText.textContent = `問題 ${session.currentIndex + 1} / ${SESSION_QUESTION_COUNT}`;
    elements.studyTypeText.textContent = question.type === "phrase" ? "熟語で答える" : "単語で答える";
    elements.studyPromptText.textContent = question.displayJapanese;
    const showPrimarySpeechButton = session.mode === "speaking" && session.phase === "answering" && session.attemptsUsed === 0;
    const showTypingInput = session.mode === "typing" && session.phase === "answering";
    elements.speechControls.classList.toggle("hidden", !showPrimarySpeechButton);
    elements.typingControls.classList.toggle("hidden", !showTypingInput);

    if (session.mode === "speaking") {
      elements.speechActionBtn.textContent = session.recognitionInProgress ? "🎤 聞き取り中…" : "🎤 話す";
      elements.speechActionBtn.disabled = session.recognitionInProgress || session.phase === "resolved" || !session.listeningSupported;
      elements.speechActionBtn.classList.toggle("listening", session.recognitionInProgress);
      elements.recognizedLabelText.textContent = "聞き取った英語";
    } else {
      elements.typingAnswerInput.value = session.phase === "answering" ? "" : elements.typingAnswerInput.value;
      elements.recognizedLabelText.textContent = "入力した英語";
    }

    const hasFeedback = Boolean(session.feedback);
    elements.feedbackBlock.classList.toggle("hidden", !hasFeedback);
    elements.feedbackMessage.textContent = session.feedback;
    const hasRecognizedText = session.lastPrimaryTranscript !== "";
    elements.recognizedBlock.classList.toggle("hidden", !hasRecognizedText);
    elements.recognizedText.textContent = hasRecognizedText ? session.lastPrimaryTranscript : "";
    elements.answerBlock.classList.toggle("hidden", !session.showAnswer);
    elements.answerText.textContent = session.showAnswer ? question.answer : "";
  }

  function renderStudyScreen() {
    const session = state.session;
    if (!session) {
      renderHome();
      return;
    }
    const question = getCurrentQuestion();
    if (!question) {
      finishSession();
      return;
    }

    renderFeedback();

    if (session.noticeMessage) {
      setSupportNotice(session.noticeMessage);
    } else if (session.mode === "speaking" && !session.listeningSupported) {
      setSupportNotice("この端末またはブラウザでは音声認識を利用できません。Chromeで開くか、タイピング学習を利用してください。");
    } else {
      setSupportNotice("");
    }

    if (session.phase === "resolved") {
      const buttons = [];
      if (!session.wasCorrect) {
        buttons.push({ label: "🔊 発音を聞く", variant: "secondary-btn", onClick: speakCorrectAnswer });
      }
      buttons.push({ label: "次へ", variant: "primary-btn", onClick: goToNextQuestion });
      renderStudyActions(buttons);
    } else if (session.mode === "speaking" && session.attemptsUsed === 1 && !session.wasCorrect) {
      renderStudyActions([
        { label: "🔊 発音を聞く", variant: "secondary-btn", onClick: speakCorrectAnswer },
        { label: session.recognitionInProgress ? "🎤 聞き取り中…" : "🎤 話す", variant: "primary-btn", disabled: session.recognitionInProgress || !session.listeningSupported, onClick: beginSpeechRecognition }
      ]);
    } else {
      renderStudyActions([]);
    }

    showScreen("studyScreen");
  }

  function updateRangeMode(value) {
    state.settings.rangeMode = value === "day" ? "day" : "auto";
    saveState();
    renderHome();
  }

  function updateDayRange(startDay, endDay) {
    const start = clampDay(startDay);
    const end = clampDay(endDay);
    state.settings.startDay = Math.min(start, end);
    state.settings.endDay = Math.max(start, end);
    saveState();
    renderHome();
  }

  function updateSpeechRateMode(value) {
    state.settings.speechRateMode = value === "normal" ? "normal" : "slow";
    saveState();
  }

  function updateConversationWeekSelection(weekId) {
    state.speakingUi.selectedConversationWeekId = String(weekId || "").trim();
    if (state.speakingUi.selectedConversationWeekId) {
      state.speakingUi.speakingWordSelectedWeekId = state.speakingUi.selectedConversationWeekId;
    }
    renderConversationSelectScreen();
  }

  function updateSpeakingVocabularyRangeMode(value) {
    state.speakingUi.vocabularyRangeMode = value === "day"
      ? "day"
      : (value === "week" ? "week" : "auto");
    renderSpeakingVocabScreen();
  }

  function getSpeakingWordWeekShortLabel(weekId) {
    const normalizedWeekId = String(weekId || "").trim();
    if (!normalizedWeekId) return "Week";
    const week = getSpeakingWeek(normalizedWeekId);
    if (week) return getSpeakingWeekDisplayName(week);
    const match = /^W(\d+)$/i.exec(normalizedWeekId);
    return match ? `Week${match[1]}` : normalizedWeekId;
  }

  function getSpeakingWordItemsByWeekDay(weekId, dayKey) {
    const normalizedWeekId = String(weekId || "").trim();
    const normalizedDayKey = String(dayKey || "").trim();
    const rawItems = SPEAKING_WORD_PRACTICE_DATA[normalizedWeekId]?.[normalizedDayKey];
    if (!Array.isArray(rawItems)) return [];
    return rawItems
      .map((item) => ({
        word: String(item?.word || "").trim(),
        meaning: String(item?.meaning || "").trim(),
        example: String(item?.example || "").trim(),
        exampleJapanese: String(item?.exampleJapanese || "").trim()
      }))
      .filter((item) => item.word && item.meaning && item.example);
  }

  function getSpeakingWordAvailableDayKeys(weekId) {
    const normalizedWeekId = String(weekId || "").trim();
    const weekData = SPEAKING_WORD_PRACTICE_DATA[normalizedWeekId];
    if (!weekData || typeof weekData !== "object") return [];
    return Object.keys(weekData)
      .filter((dayKey) => getSpeakingWordItemsByWeekDay(normalizedWeekId, dayKey).length > 0)
      .sort((a, b) => a.localeCompare(b));
  }

  function getSpeakingWordWeekOptions() {
    const speakingWeeks = getSpeakingWeeks();
    const orderedWeekIds = speakingWeeks.map((week) => week.weekId);
    const dataWeekIds = Object.keys(SPEAKING_WORD_PRACTICE_DATA);
    const uniqueWeekIds = [...new Set([...orderedWeekIds, ...dataWeekIds])];

    return uniqueWeekIds.map((weekId) => {
      const week = speakingWeeks.find((entry) => entry.weekId === weekId) || null;
      const label = week ? getSpeakingWeekDisplayLabel(week) : getSpeakingWordWeekShortLabel(weekId);
      return {
        weekId,
        label,
        enabled: getSpeakingWordAvailableDayKeys(weekId).length > 0
      };
    });
  }

  function buildWeekDayKeysFromWeek(week) {
    const directDayKeys = getSpeakingOrderedDayKeys(week);
    if (directDayKeys.length >= 7) {
      return directDayKeys.slice(0, 7);
    }

    const startMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(week?.startDate || "").trim());
    if (startMatch) {
      const base = new Date(Date.UTC(Number(startMatch[1]), Number(startMatch[2]) - 1, Number(startMatch[3]), 12, 0, 0));
      const generated = [];
      for (let offset = 0; offset < 7; offset += 1) {
        const next = new Date(base);
        next.setUTCDate(base.getUTCDate() + offset);
        generated.push(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`);
      }
      return generated;
    }

    return [];
  }

  function renderSpeakingWordWeekSelectScreen() {
    state.speakingUi.speakingWordDaySelectBackTarget = "week-select";
    const options = getSpeakingWordWeekOptions();
    const firstEnabled = options.find((option) => option.enabled);
    if (!options.some((option) => option.weekId === state.speakingUi.speakingWordSelectedWeekId) && firstEnabled) {
      state.speakingUi.speakingWordSelectedWeekId = firstEnabled.weekId;
    }

    elements.speakingWordWeekList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = option.enabled ? "primary-btn large-btn" : "secondary-btn large-btn";
      button.textContent = option.label;
      button.disabled = !option.enabled;
      button.addEventListener("click", () => {
        if (!option.enabled) return;
        state.speakingUi.speakingWordSelectedWeekId = option.weekId;
        renderSpeakingWordDaySelectScreen();
      });
      fragment.append(button);
    });
    elements.speakingWordWeekList.append(fragment);
    showScreen("speakingWordWeekSelectScreen");
  }

  function renderSpeakingWordDaySelectScreen() {
    const weekId = String(state.speakingUi.speakingWordSelectedWeekId || SPEAKING_WORD_DEFAULT_WEEK_ID).trim();
    const week = getSpeakingWeek(weekId);
    elements.speakingWordDaySelectWeekText.textContent = week ? getSpeakingWeekDisplayLabel(week) : getSpeakingWordWeekShortLabel(weekId);
    elements.speakingWordDayChecklist.innerHTML = "";

    const dataDayKeys = getSpeakingWordAvailableDayKeys(weekId);
    const dayKeys = buildWeekDayKeysFromWeek(week);
    const renderDayKeys = dayKeys.length ? dayKeys : dataDayKeys;

    const fragment = document.createDocumentFragment();
    renderDayKeys.forEach((dayKey) => {
      const row = document.createElement("div");
      row.className = "conversation-day-item speaking-word-day-item";
      row.setAttribute("role", "button");
      row.tabIndex = 0;

      const weekday = getJstWeekdayLabel(dayKey);
      const canStart = getSpeakingWordItemsByWeekDay(weekId, dayKey).length > 0;
      const progressSummary = getSpeakingWordDayStatusSummary(weekId, dayKey, canStart);

      const checkWrap = document.createElement("label");
      checkWrap.className = "conversation-day-check speaking-word-day-check";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.disabled = true;
      checkbox.checked = false;

      const weekdayText = document.createElement("span");
      weekdayText.textContent = weekday;

      checkWrap.append(checkbox, weekdayText);

      const startDayPractice = () => {
        if (!canStart) return;
        startSpeakingWordWeekPractice(weekId, dayKey);
      };

      row.addEventListener("click", startDayPractice);
      row.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        startDayPractice();
      });

      const status = document.createElement("p");
      status.className = `conversation-day-progress conversation-day-progress-${progressSummary.tone}`;
      status.textContent = progressSummary.text;

      row.append(checkWrap, status);
      fragment.append(row);
    });

    elements.speakingWordDayChecklist.append(fragment);
    showScreen("speakingWordDaySelectScreen");
  }

  function stopSpeakingWordPracticeRecognition() {
    const practice = state.speakingUi.speakingWordPractice;
    if (!practice) return;
    practice.recognitionInProgress = false;
    const recognition = practice.activeRecognition;
    practice.activeRecognition = null;
    if (!recognition || typeof recognition.abort !== "function") return;
    try {
      recognition.abort();
    } catch (_error) {
      // noop
    }
  }

  function getSpeakingWordPracticeItem() {
    const practice = state.speakingUi.speakingWordPractice;
    if (!practice || !Array.isArray(practice.items)) return null;
    return practice.items[Math.max(0, Number(practice.index) || 0)] || null;
  }

  function speakMobileEnglishText(text) {
    const speechSynthesis = getSpeechSynthesisEngine();
    if (!speechSynthesis || !text) return;
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = "en-US";
    utterance.rate = MOBILE_SPEECH_RATES[state.settings.speechRateMode] || MOBILE_SPEECH_RATES.slow;
    const voice = pickEnglishVoice();
    if (voice) {
      utterance.voice = voice;
    }
    try {
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    } catch (_error) {
      // noop
    }
  }

  function renderSpeakingWordPracticeScreen(options = {}) {
    const practice = state.speakingUi.speakingWordPractice;
    const item = getSpeakingWordPracticeItem();
    if (!practice || !item) {
      renderSpeakingWordDaySelectScreen();
      return;
    }

    const weekday = getJstWeekdayLabel(practice.dayKey);
    elements.speakingWordPracticeWeekText.textContent = `${getSpeakingWordWeekShortLabel(practice.weekId)} ${weekday}曜日`;
    elements.speakingWordPracticeProgressText.textContent = `${practice.index + 1} / ${practice.items.length}`;
    elements.speakingWordPracticeWordText.textContent = item.word;

    elements.speakingWordMeaningText.textContent = item.meaning;
    elements.speakingWordMeaningText.classList.toggle("hidden", !practice.showMeaning);

    elements.speakingWordExampleText.textContent = item.example;
    elements.speakingWordExampleJapaneseText.textContent = item.exampleJapanese;
    elements.speakingWordExampleJapaneseText.classList.toggle("hidden", !practice.showExampleJapanese);

    const firstDone = practice.readCount >= 1 ? "☑" : "□";
    const secondDone = practice.readCount >= 2 ? "☑" : "□";
    elements.speakingWordReadCountText.innerHTML = `${firstDone} 1回目<br>${secondDone} 2回目`;

    elements.speakingWordMicBtn.textContent = practice.recognitionInProgress ? "🎤 聞き取り中…" : "🎤 押して例文を2回読む";
    elements.speakingWordMicBtn.disabled = practice.recognitionInProgress || !SpeechRecognitionCtor;
    elements.speakingWordRecognitionStatusText.textContent = practice.recognitionStatus || "";

    elements.speakingWordNextBtn.disabled = practice.readCount < 2;
    elements.speakingWordNextBtn.textContent = practice.index >= practice.items.length - 1 ? "完了画面へ" : "次の単語へ";

    showScreen("speakingWordPracticeScreen");

    if (options.autoSpeakWord) {
      speakMobileEnglishText(item.word);
    }
  }

  function renderSpeakingWordCompleteScreen() {
    const practice = state.speakingUi.speakingWordPractice;
    if (!practice) {
      renderSpeakingWordDaySelectScreen();
      return;
    }
    finalizeSpeakingWordLearningHistorySession("completed");
    if (!practice.pointAwarded) {
      practice.pointAwarded = true;
      recordSpeakingWordDayCompletion(practice.weekId, practice.dayKey);
    }
    const weekday = getJstWeekdayLabel(practice.dayKey);
    const total = Array.isArray(practice.items) ? practice.items.length : 0;
    elements.speakingWordCompleteTitleText.textContent = `${getSpeakingWordWeekShortLabel(practice.weekId)} ${weekday}曜日`;
    elements.speakingWordCompleteMetaText.textContent = `${total} / ${total} 完了 ✅`;
    showScreen("speakingWordCompleteScreen");
  }

  function startSpeakingWordWeekPractice(weekId, dayKey) {
    const items = getSpeakingWordItemsByWeekDay(weekId, dayKey);
    if (!items.length) return;

    stopSpeakingWordPracticeRecognition();
    state.speakingUi.speakingWordSelectedWeekId = weekId;
    state.speakingUi.speakingWordSelectedDayKey = dayKey;
    state.speakingUi.speakingWordPractice = {
      weekId,
      dayKey,
      items: items.map((item) => ({ ...item })),
      index: 0,
      showMeaning: false,
      showExampleJapanese: false,
      readCount: 0,
      answeredCount: 0,
      correctCount: 0,
      currentItemCorrect: false,
      recognitionInProgress: false,
      recognitionStatus: "",
      activeRecognition: null,
      pointAwarded: false,
      historyFinalized: false
    };

    if (!state.learningHistorySession) {
      startMobileLearningHistorySession({
        source: "vocabulary",
        mode: "Vocabulary",
        dayNumber: `${weekId} ${dayKey}`,
        startedAt: Date.now(),
        session: null
      });
    }

    renderSpeakingWordPracticeScreen({ autoSpeakWord: true });
  }

  function getSpeakingWordLearningHistorySummary(practice) {
    if (!practice) {
      return {
        questionCount: 0,
        correctCount: 0,
        accuracy: 0
      };
    }
    const questionCount = Math.max(0, Number(practice.answeredCount) || 0);
    const correctCount = Math.max(0, Number(practice.correctCount) || 0);
    return {
      questionCount,
      correctCount,
      accuracy: questionCount > 0 ? Math.round((correctCount / questionCount) * 100) : 0
    };
  }

  function finalizeSpeakingWordLearningHistorySession(completedReason) {
    const practice = state.speakingUi.speakingWordPractice;
    if (!practice || practice.historyFinalized) return;
    if (!state.learningHistorySession) {
      practice.historyFinalized = true;
      return;
    }
    finalizeMobileLearningHistorySession({
      completedReason,
      mode: "Vocabulary",
      dayNumber: `${practice.weekId} ${practice.dayKey}`,
      summary: getSpeakingWordLearningHistorySummary(practice)
    });
    practice.historyFinalized = true;
  }

  function leaveSpeakingWordPracticeToDaySelect() {
    finalizeSpeakingWordLearningHistorySession("interrupted");
    stopSpeakingWordPracticeRecognition();
    state.speakingUi.speakingWordPractice = null;
    renderSpeakingWordDaySelectScreen();
  }

  function toggleSpeakingWordMeaning() {
    const practice = state.speakingUi.speakingWordPractice;
    if (!practice) return;
    practice.showMeaning = true;
    renderSpeakingWordPracticeScreen();
  }

  function playSpeakingWordExampleAudio() {
    const item = getSpeakingWordPracticeItem();
    if (!item) return;
    speakMobileEnglishText(item.example);
  }

  function playSpeakingWordAudio() {
    const item = getSpeakingWordPracticeItem();
    if (!item) return;
    speakMobileEnglishText(item.word);
  }

  function toggleSpeakingWordExampleJapanese() {
    const practice = state.speakingUi.speakingWordPractice;
    if (!practice) return;
    practice.showExampleJapanese = true;
    renderSpeakingWordPracticeScreen();
  }

  function beginSpeakingWordExampleRecognition() {
    const practice = state.speakingUi.speakingWordPractice;
    const item = getSpeakingWordPracticeItem();
    if (!practice || !item || practice.recognitionInProgress || !SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    practice.recognitionInProgress = true;
    practice.recognitionStatus = "聞き取り中…";
    practice.activeRecognition = recognition;
    renderSpeakingWordPracticeScreen();

    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;
    recognition.interimResults = false;
    recognition.continuous = false;

    let handled = false;
    recognition.onresult = (event) => {
      if (handled) return;
      handled = true;
      const transcripts = Array.from(event.results?.[0] || [])
        .map((entry) => String(entry.transcript || "").trim())
        .filter(Boolean);
      const hasSpeech = transcripts.length > 0;
      if (hasSpeech) {
        practice.readCount = Math.min(2, Math.max(0, Number(practice.readCount) || 0) + 1);
      }
      const isGood = hasSpeech ? isCorrectRecognition(item.example, transcripts) : false;
      if (isGood) {
        practice.currentItemCorrect = true;
      }
      const head = hasSpeech ? (isGood ? "GOOD" : "Missing") : "聞き取り失敗";
      const heard = transcripts[0] || "（認識なし）";
      practice.recognitionStatus = `${head}: ${heard}`;
      practice.recognitionInProgress = false;
      practice.activeRecognition = null;
      renderSpeakingWordPracticeScreen();
    };

    recognition.onerror = (event) => {
      if (handled) return;
      handled = true;
      practice.recognitionInProgress = false;
      practice.activeRecognition = null;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        practice.recognitionStatus = "マイクの使用が許可されていません。";
      } else {
        practice.recognitionStatus = "うまく聞き取れませんでした。";
      }
      renderSpeakingWordPracticeScreen();
    };

    recognition.onend = () => {
      if (handled) return;
      practice.recognitionInProgress = false;
      practice.activeRecognition = null;
      renderSpeakingWordPracticeScreen();
    };

    try {
      recognition.start();
    } catch (_error) {
      practice.recognitionInProgress = false;
      practice.activeRecognition = null;
      practice.recognitionStatus = "音声認識を開始できませんでした。";
      renderSpeakingWordPracticeScreen();
    }
  }

  function moveToNextSpeakingWordItem() {
    const practice = state.speakingUi.speakingWordPractice;
    if (!practice || practice.readCount < 2) return;

    practice.answeredCount = Math.max(0, Number(practice.answeredCount) || 0) + 1;
    if (practice.currentItemCorrect) {
      practice.correctCount = Math.max(0, Number(practice.correctCount) || 0) + 1;
    }

    if (practice.index >= practice.items.length - 1) {
      practice.currentItemCorrect = false;
      renderSpeakingWordCompleteScreen();
      return;
    }

    practice.index += 1;
    practice.showMeaning = false;
    practice.showExampleJapanese = false;
    practice.readCount = 0;
    practice.currentItemCorrect = false;
    practice.recognitionStatus = "";
    practice.recognitionInProgress = false;
    practice.activeRecognition = null;
    renderSpeakingWordPracticeScreen({ autoSpeakWord: true });
  }

  function updateSpeakingVocabularyDayRange(startDay, endDay) {
    const start = clampDay(startDay);
    const end = clampDay(endDay);
    state.speakingUi.startDay = Math.min(start, end);
    state.speakingUi.endDay = Math.max(start, end);
    renderSpeakingVocabScreen();
  }

  function showConfirm(message, okLabel, onConfirm, options = {}) {
    state.confirmAction = onConfirm;
    elements.confirmMessage.innerHTML = String(message || "").replace(/\n/g, "<br>");
    elements.confirmOkBtn.textContent = okLabel || "OK";
    if (elements.confirmCancelBtn) {
      elements.confirmCancelBtn.textContent = options.cancelLabel || "キャンセル";
    }
    elements.confirmModal.classList.remove("hidden");
    elements.confirmModal.setAttribute("aria-hidden", "false");
  }

  function hideConfirm() {
    state.confirmAction = null;
    elements.confirmModal.classList.add("hidden");
    elements.confirmModal.setAttribute("aria-hidden", "true");
  }

  function speakCorrectAnswer() {
    recordMobileLearningActivity();
    const question = getCurrentQuestion();
    if (!question || typeof window.speechSynthesis === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(question.speechText);
    utterance.lang = "en-US";
    utterance.rate = MOBILE_SPEECH_RATES[state.settings.speechRateMode] || MOBILE_SPEECH_RATES.slow;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function playCurrentSpeakingLine() {
    recordMobileLearningActivity();
    const line = getCurrentSpeakingLine();
    if (!line) return;
    stopSpeakingAudio();

    const speechSynthesis = getSpeechSynthesisEngine();
    if (!speechSynthesis) {
      state.speakingAudioPlaying = false;
      state.speakingLineStatus = "error";
      renderConversationPractice();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(line.english);
    utterance.lang = "en-US";
    utterance.rate = MOBILE_SPEECH_RATES[state.settings.speechRateMode] || MOBILE_SPEECH_RATES.slow;
    const voice = pickEnglishVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.onstart = () => {
      if (state.speakingUtterance !== utterance) return;
      state.speakingAudioPlaying = true;
      state.speakingLineStatus = "playing";
      renderConversationPractice();
    };
    utterance.onend = () => {
      if (state.speakingUtterance !== utterance) return;
      clearSpeakingWatchdog();
      state.speakingAudioPlaying = false;
      state.speakingUtterance = null;
      state.speakingLineStatus = "completed";
      renderConversationPractice();
    };
    utterance.onerror = (event) => {
      if (state.speakingUtterance !== utterance) return;
      clearSpeakingWatchdog();
      state.speakingAudioPlaying = false;
      state.speakingUtterance = null;
      state.speakingLineStatus = "error";
      console.error("Speaking playback error:", event?.error || event);
      renderConversationPractice();
    };

    state.speakingAudioPlaying = true;
    state.speakingLineStatus = "playing";
    state.speakingUtterance = utterance;
    state.speakingAudioWatchdogId = window.setTimeout(() => {
      if (state.speakingUtterance !== utterance) return;
      state.speakingAudioPlaying = false;
      state.speakingUtterance = null;
      state.speakingLineStatus = "error";
      clearSpeakingWatchdog();
      console.error("Speaking playback watchdog timeout");
      renderConversationPractice();
    }, 6000);

    try {
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
      }
      speechSynthesis.cancel();
      speechSynthesis.speak(utterance);
    } catch (error) {
      clearSpeakingWatchdog();
      state.speakingAudioPlaying = false;
      state.speakingUtterance = null;
      state.speakingLineStatus = "error";
      console.error("Speaking playback start failed:", error);
      renderConversationPractice();
    }
  }

  function moveToNextSpeakingLevel1Conversation() {
    if (isReviewSpeakingModeActive()) {
      const session = state.speakingReviewSession;
      const item = getCurrentReviewQueueItem();
      if (!session || !item) return;

      recordSpeakingReviewConversationCompletion(item.conversationId, item);
      incrementReviewSessionPendingPointCount(session);
      continueAfterReviewConversationAdvance(
        session,
        () => {
          state.speakingLineStatus = "awaitingStart";
          renderConversationPracticeWithAutoPlay();
        },
        () => {
          finishSpeakingReviewSession(session.reviewQueue.length);
        }
      );
      return;
    }

    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    const conversation = getCurrentSpeakingConversation();
    if (!progress || !week || !conversation) return;
    if (state.speakingLevel1Session) {
      state.speakingLevel1Session.completedCount = Math.max(
        Math.max(0, Number(state.speakingLevel1Session.completedCount) || 0),
        Math.max(0, Number(progress.conversationIndex) || 0) + 1
      );
    }

    const conversationId = String(progress.conversationOrder[progress.conversationIndex] || "").trim();
    const hasAlreadyCounted = conversationId && progress.completedConversationIds.includes(conversationId);
    if (conversationId && !hasAlreadyCounted) {
      progress.completedConversationIds.push(conversationId);
    }
    if (!hasAlreadyCounted) {
      progress.conversationSetCount = Math.max(0, Number(progress.conversationSetCount) || 0) + 1;
    }

    progress.conversationIndex += 1;
    progress.lineIndex = 0;
    progress.phase = progress.conversationIndex >= progress.conversationOrder.length ? "conversationComplete" : "line";
    saveSpeakingProgress();

    if (progress.phase === "conversationComplete") {
      renderConversationCompleteScreen();
      return;
    }

    state.speakingTranslationVisible = false;
    resetSpeakingHintState();
    state.speakingLineStatus = "awaitingStart";
    renderConversationPracticeWithAutoPlay();
  }

  function moveToSpeakingLevel1AnswerLine() {
    if (isReviewSpeakingModeActive()) {
      const session = state.speakingReviewSession;
      const conversation = getCurrentSpeakingConversation();
      if (!session || !conversation) return;

      const answerLine = getSpeakingLevel1AnswerLine(conversation);
      if (!answerLine) {
        moveToNextSpeakingLevel1Conversation();
        return;
      }

      session.lineIndex = Math.min(1, Math.max(0, conversation.lines.length - 1));
      state.speakingTranslationVisible = false;
      resetSpeakingHintState();
      state.speakingLineStatus = "awaitingStart";
      saveSpeakingReviewSession();
      renderConversationPracticeWithAutoPlay();
      return;
    }

    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    const conversation = getCurrentSpeakingConversation();
    if (!progress || !week || !conversation) return;

    const answerLine = getSpeakingLevel1AnswerLine(conversation);
    if (!answerLine) {
      moveToNextSpeakingLevel1Conversation();
      return;
    }

    progress.lineIndex = 1;
    progress.phase = "line";
    state.speakingTranslationVisible = false;
    resetSpeakingHintState();
    state.speakingLineStatus = "awaitingStart";
    saveSpeakingProgress();
    renderConversationPracticeWithAutoPlay();
  }

  function beginConversationLevel1Recognition() {
    const reviewActive = isReviewSpeakingModeActive();
    const progress = state.speakingProgress;
    const reviewSession = state.speakingReviewSession;
    const reviewContext = reviewActive ? getCurrentReviewConversationContext() : null;
    const week = reviewActive ? reviewContext?.week : getSpeakingProgressWeek();
    const conversation = getCurrentSpeakingConversation();
    const currentLine = getCurrentSpeakingLine();
    if ((!reviewActive && !progress) || !week || !conversation || !currentLine) return;
    if (!isSpeakingLevel1Week(week)) return;
    if (state.speakingAudioPlaying || state.speakingRecognitionInProgress || !SpeechRecognitionCtor) return;

    const currentLineIndex = reviewActive
      ? Math.max(0, Number(reviewSession?.lineIndex) || 0)
      : Math.max(0, Number(progress.lineIndex) || 0);
    const stage = currentLineIndex === 0 ? "question" : "answer";
    const attemptKey = `${conversation.id}:${currentLineIndex}`;
    if (state.speakingLevel1AttemptKey !== attemptKey) {
      state.speakingLevel1AttemptKey = attemptKey;
      state.speakingLevel1AttemptUsed = 0;
    }

    const recognition = new SpeechRecognitionCtor();
    state.speakingRecognition = recognition;
    state.speakingRecognitionInProgress = true;
    state.speakingLineStatus = "listening";
    renderConversationPractice();

    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;
    recognition.interimResults = false;
    recognition.continuous = false;

    let handled = false;
    const settle = () => {
      state.speakingRecognitionInProgress = false;
      state.speakingRecognition = null;
    };

    recognition.onresult = (event) => {
      if (handled) return;
      handled = true;
      const transcripts = Array.from(event.results?.[0] || [])
        .map((item) => String(item.transcript || "").trim())
        .filter(Boolean);
      settle();

      const level1Session = reviewActive
        ? null
        : ensureSpeakingLevel1Session(progress, week, conversation.id);
      const keywordAnalysis = analyzeSpeakingLevel1KeywordMatch(currentLine.keywords, transcripts);
      const isCorrect = keywordAnalysis.isCorrect;
      setSpeakingKeywordDebugFeedback(currentLine.keywords, transcripts, isCorrect, keywordAnalysis.missingKeywords);
      if (isCorrect) {
        state.speakingLevel1MissingKeywords = [];
        if (level1Session && stage === "question") {
          level1Session.completedCount += 1;
        } else if (level1Session) {
          level1Session.correctCount += 1;
        }
        state.speakingLineStatus = "good";
        resetSpeakingHintState();
        renderConversationPractice();
        clearSpeakingAutoAdvanceTimer();
        state.speakingAutoAdvanceTimerId = window.setTimeout(() => {
          state.speakingAutoAdvanceTimerId = null;
          if (stage === "question") {
            moveToSpeakingLevel1AnswerLine();
          } else {
            moveToNextSpeakingLevel1Conversation();
          }
        }, 700);
        return;
      }

      if (state.speakingLevel1AttemptUsed <= 0) {
        state.speakingLevel1AttemptUsed = 1;
        state.speakingLineStatus = "retry";
        state.speakingLevel1MissingKeywords = Array.isArray(keywordAnalysis.missingKeywords)
          ? [...keywordAnalysis.missingKeywords]
          : [];
        state.speakingHintVisible = true;
        state.speakingHintStep = 1;
        state.speakingHintTitle = "Missing:";
        state.speakingHintText = getSpeakingLevel1HintText(conversation, currentLine, keywordAnalysis.missingKeywords);
        renderConversationPractice();
        return;
      }

      if (level1Session && stage === "answer") {
        level1Session.completedCount += 1;
      }
      state.speakingLevel1MissingKeywords = Array.isArray(keywordAnalysis.missingKeywords)
        ? [...keywordAnalysis.missingKeywords]
        : [];
      state.speakingHintVisible = true;
      state.speakingHintStep = 2;
      state.speakingHintTitle = "Missing:";
      state.speakingHintText = getSpeakingLevel1HintText(conversation, currentLine, keywordAnalysis.missingKeywords);
      state.speakingLineStatus = "miss";
      renderConversationPractice();
      clearSpeakingAutoAdvanceTimer();
      state.speakingAutoAdvanceTimerId = window.setTimeout(() => {
        state.speakingAutoAdvanceTimerId = null;
        if (stage === "question") {
          moveToSpeakingLevel1AnswerLine();
        } else {
          moveToNextSpeakingLevel1Conversation();
        }
      }, 2000);
    };

    recognition.onerror = (event) => {
      if (handled) return;
      handled = true;
      settle();
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        state.speakingLineStatus = "mic-denied";
      } else {
        state.speakingLineStatus = "mic-error";
      }
      renderConversationPractice();
    };

    recognition.onend = () => {
      if (!handled) {
        settle();
      }
      renderConversationPractice();
    };

    try {
      recognition.start();
    } catch (_error) {
      settle();
      state.speakingLineStatus = "mic-error";
      renderConversationPractice();
    }
  }

  function renderConversationPractice() {
    if (elements.conversationBackToABtn) {
      elements.conversationBackToABtn.classList.add("hidden");
      elements.conversationBackToABtn.disabled = true;
    }

    if (isReviewSpeakingModeActive()) {
      const session = state.speakingReviewSession;
      const context = getCurrentReviewConversationContext();
      const conversation = context?.conversation;
      const week = context?.week;
      const line = getCurrentSpeakingLine();
      if (!session || !week || !conversation || !line) {
        renderSpeakingReviewTopScreen();
        return;
      }

      if (isSpeakingLevel1Week(week)) {
        const reviewLineIndex = Math.max(0, Number(session.lineIndex) || 0);
        const isQuestionStage = reviewLineIndex === 0;
        const shouldHighlightMissingKeywords = state.speakingLineStatus === "retry" || state.speakingLineStatus === "miss";
        elements.conversationWeekText.textContent = `🔄 今日の復習 ${getSpeakingWeekDisplayLabel(week)} / Level1`;
        elements.conversationProgressText.textContent = `${session.currentIndex + 1} / ${session.reviewQueue.length}会話`;
        elements.conversationSpeakerText.textContent = line.speaker || (isQuestionStage ? "A" : "B");
        elements.conversationEnglishText.innerHTML = buildSpeakingLevel1MissingEnglishHtml(
          line.english,
          shouldHighlightMissingKeywords ? state.speakingLevel1MissingKeywords : []
        );
        elements.conversationJapaneseText.textContent = line.japanese;
        elements.conversationJapaneseBlock.classList.toggle("hidden", !state.speakingTranslationVisible || !line.japanese);

        elements.speakingHintBtn.classList.add("hidden");
        elements.speakingHintBtn.disabled = true;
        elements.speakingHintBlock.classList.toggle("hidden", !state.speakingHintVisible);
        elements.speakingHintTitleText.textContent = state.speakingHintTitle || "💡 ヒント";
        elements.speakingHintText.textContent = state.speakingHintText || "";
        elements.speakingHintText.classList.toggle("speaking-missing-hint", state.speakingHintVisible && state.speakingHintTitle === "Missing:");
        elements.speakingRecognitionDebugText.innerHTML = state.speakingRecognitionDebugHtml || "";

        const hasSpeechSynthesis = Boolean(getSpeechSynthesisEngine());
        if (state.speakingLineStatus === "playing") {
          elements.conversationStatusText.textContent = "再生中…";
        } else if (state.speakingLineStatus === "listening") {
          elements.conversationStatusText.textContent = "🎤 聞き取り中…";
        } else if (state.speakingLineStatus === "good") {
          elements.conversationStatusText.textContent = "GOOD!";
        } else if (state.speakingLineStatus === "retry") {
          elements.conversationStatusText.textContent = "❌ もう1回チャレンジ";
        } else if (state.speakingLineStatus === "miss") {
          elements.conversationStatusText.textContent = "❌ 次の表示へ進みます";
        } else if (state.speakingLineStatus === "mic-denied") {
          elements.conversationStatusText.textContent = "マイクの使用が許可されていません。";
        } else if (state.speakingLineStatus === "mic-error") {
          elements.conversationStatusText.textContent = "うまく聞き取れませんでした。";
        } else if (state.speakingLineStatus === "error") {
          elements.conversationStatusText.textContent = "音声を再生できませんでした。";
        } else if (isQuestionStage) {
          elements.conversationStatusText.textContent = "🎤 マイクで話してみよう";
        } else {
          elements.conversationStatusText.textContent = "▶ 次へ進んでください";
        }

        elements.toggleJapaneseBtn.disabled = state.speakingAudioPlaying || !line.japanese;
        elements.replayConversationAudioBtn.textContent = "▶ もう一度聞く";
        elements.replayConversationAudioBtn.disabled = !hasSpeechSynthesis || state.speakingAudioPlaying || state.speakingRecognitionInProgress;
        elements.conversationMicBtn.classList.remove("hidden");
        elements.conversationMicBtn.classList.toggle("listening", state.speakingRecognitionInProgress);
        elements.conversationMicBtn.textContent = state.speakingRecognitionInProgress ? "🎤 聞き取り中…" : "🎤 話す";
        elements.conversationMicBtn.disabled = state.speakingAudioPlaying || state.speakingRecognitionInProgress || !SpeechRecognitionCtor;
        elements.nextConversationLineBtn.classList.add("hidden");
        elements.nextConversationLineBtn.disabled = true;
        if (elements.conversationBackToABtn) {
          const showBackToA = !isQuestionStage;
          elements.conversationBackToABtn.classList.toggle("hidden", !showBackToA);
          elements.conversationBackToABtn.disabled = !showBackToA || state.speakingAudioPlaying || state.speakingRecognitionInProgress;
        }
        showScreen("conversationPracticeScreen");
        return;
      }

      elements.conversationWeekText.textContent = `🔄 今日の復習 ${getSpeakingWeekDisplayLabel(week)}`;
      elements.conversationProgressText.textContent = `${session.currentIndex + 1} / ${session.reviewQueue.length}会話`;
      elements.conversationSpeakerText.textContent = line.speaker;
      elements.conversationEnglishText.textContent = line.english;
      elements.conversationJapaneseText.textContent = line.japanese;
      elements.conversationJapaneseBlock.classList.toggle("hidden", !state.speakingTranslationVisible || !line.japanese);
      const showSpeakingHintUi = line.speaker === "A";
      elements.speakingHintBtn.classList.toggle("hidden", !showSpeakingHintUi);
      elements.speakingHintBlock.classList.toggle("hidden", !showSpeakingHintUi || !state.speakingHintVisible);
      elements.speakingHintTitleText.textContent = state.speakingHintTitle || "💡 ヒント";
      elements.speakingHintText.textContent = state.speakingHintText || "";
      elements.speakingHintText.classList.remove("speaking-missing-hint");
      const statusPromptText = line.speaker === "A"
        ? "🎤 質問文をシャドーイングし、続きの文章を\n声に出してみよう。"
        : "🎤 シャドーイングしてください";
      const hasSpeechSynthesis = Boolean(getSpeechSynthesisEngine());
      if (state.speakingLineStatus === "playing") {
        elements.conversationStatusText.textContent = "再生中…";
      } else if (state.speakingLineStatus === "error") {
        elements.conversationStatusText.textContent = "音声を再生できませんでした。";
      } else {
        elements.conversationStatusText.textContent = statusPromptText;
      }
      elements.toggleJapaneseBtn.disabled = state.speakingLineStatus === "playing" || !line.japanese;
      elements.speakingHintBtn.disabled = !showSpeakingHintUi || state.speakingLineStatus === "playing";
      elements.replayConversationAudioBtn.textContent = "▶ もう一度聞く";
      elements.replayConversationAudioBtn.disabled = !hasSpeechSynthesis || state.speakingLineStatus === "playing";
      elements.conversationMicBtn.classList.add("hidden");
      elements.conversationMicBtn.disabled = true;
      elements.nextConversationLineBtn.disabled = state.speakingLineStatus !== "completed";
      elements.nextConversationLineBtn.classList.remove("hidden");
      showScreen("conversationPracticeScreen");
      return;
    }

    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    if (!progress || !week) {
      renderConversationSelectScreen();
      return;
    }

    if (progress.phase === "conversationComplete") {
      const targetSets = getSpeakingTargetRounds(progress);
      if (getSpeakingCompletedRounds(progress) >= targetSets) {
        renderConversationCompleteScreen();
      } else {
        moveToNextSpeakingConversation();
      }
      return;
    }

    const conversation = getCurrentSpeakingConversation();
    if (!conversation) {
      renderConversationSelectScreen();
      return;
    }

    const isLevel1 = isSpeakingLevel1Week(week);
    const line = getCurrentSpeakingLine();
    if (!line) {
      renderConversationSelectScreen();
      return;
    }

    if (isLevel1) {
      const level1Session = ensureSpeakingLevel1Session(progress, week, conversation.id);
      const level1LineIndex = Math.max(0, Number(progress.lineIndex) || 0);
      const isQuestionStage = level1LineIndex === 0;
      const shouldHighlightMissingKeywords = state.speakingLineStatus === "retry" || state.speakingLineStatus === "miss";
      elements.conversationWeekText.textContent = `${getSpeakingWeekDisplayLabel(week)} / Level1`;
      elements.conversationProgressText.textContent = `${Math.max(0, Number(level1Session.completedCount) || 0)} / ${progress.conversationOrder.length}会話`;
      elements.conversationSpeakerText.textContent = line.speaker || (isQuestionStage ? "A" : "B");
      elements.conversationEnglishText.innerHTML = buildSpeakingLevel1MissingEnglishHtml(
        line.english,
        shouldHighlightMissingKeywords ? state.speakingLevel1MissingKeywords : []
      );
      elements.conversationJapaneseText.textContent = line.japanese;
      elements.conversationJapaneseBlock.classList.toggle("hidden", !state.speakingTranslationVisible || !line.japanese);

      elements.speakingHintBtn.classList.add("hidden");
      elements.speakingHintBtn.disabled = true;
      elements.speakingHintBlock.classList.toggle("hidden", !state.speakingHintVisible);
      elements.speakingHintTitleText.textContent = state.speakingHintTitle || "💡 ヒント";
      elements.speakingHintText.textContent = state.speakingHintText || "";
      elements.speakingHintText.classList.toggle("speaking-missing-hint", state.speakingHintVisible && state.speakingHintTitle === "Missing:");
      elements.speakingRecognitionDebugText.innerHTML = state.speakingRecognitionDebugHtml || "";

      const hasSpeechSynthesis = Boolean(getSpeechSynthesisEngine());
      if (state.speakingLineStatus === "playing") {
        elements.conversationStatusText.textContent = "再生中…";
      } else if (state.speakingLineStatus === "listening") {
        elements.conversationStatusText.textContent = "🎤 聞き取り中…";
      } else if (state.speakingLineStatus === "good") {
        elements.conversationStatusText.textContent = "GOOD!";
      } else if (state.speakingLineStatus === "retry") {
        elements.conversationStatusText.textContent = "❌ もう1回チャレンジ";
      } else if (state.speakingLineStatus === "miss") {
        elements.conversationStatusText.textContent = "❌ 次の表示へ進みます";
      } else if (state.speakingLineStatus === "mic-denied") {
        elements.conversationStatusText.textContent = "マイクの使用が許可されていません。";
      } else if (state.speakingLineStatus === "mic-error") {
        elements.conversationStatusText.textContent = "うまく聞き取れませんでした。";
      } else if (state.speakingLineStatus === "error") {
        elements.conversationStatusText.textContent = "音声を再生できませんでした。";
      } else if (isQuestionStage) {
        elements.conversationStatusText.textContent = "🎤 マイクで話してみよう";
      } else {
        elements.conversationStatusText.textContent = "▶ 次へ進んでください";
      }

      elements.toggleJapaneseBtn.disabled = state.speakingAudioPlaying || !line.japanese;
      elements.replayConversationAudioBtn.textContent = "▶ もう一度聞く";
      elements.replayConversationAudioBtn.disabled = !hasSpeechSynthesis || state.speakingAudioPlaying || state.speakingRecognitionInProgress;
      elements.conversationMicBtn.classList.remove("hidden");
      elements.conversationMicBtn.classList.toggle("listening", state.speakingRecognitionInProgress);
      elements.conversationMicBtn.textContent = state.speakingRecognitionInProgress ? "🎤 聞き取り中…" : "🎤 話す";
      elements.conversationMicBtn.disabled = state.speakingAudioPlaying || state.speakingRecognitionInProgress || !SpeechRecognitionCtor;
      elements.nextConversationLineBtn.classList.add("hidden");
      elements.nextConversationLineBtn.disabled = true;
      if (elements.conversationBackToABtn) {
        const showBackToA = !isQuestionStage;
        elements.conversationBackToABtn.classList.toggle("hidden", !showBackToA);
        elements.conversationBackToABtn.disabled = !showBackToA || state.speakingAudioPlaying || state.speakingRecognitionInProgress;
      }
      showScreen("conversationPracticeScreen");
      return;
    }

    elements.conversationWeekText.textContent = getSpeakingWeekDisplayLabel(week);
    const daySetProgress = getSpeakingDaySetProgress(week, conversation, progress.lineIndex);
    elements.conversationProgressText.textContent = `${daySetProgress.currentSet} / ${daySetProgress.totalSets}セット  ${progress.conversationIndex + 1} / ${progress.conversationOrder.length}`;
    elements.conversationSpeakerText.textContent = line.speaker;
    elements.conversationEnglishText.textContent = line.english;
    elements.conversationJapaneseText.textContent = line.japanese;
    elements.conversationJapaneseBlock.classList.toggle("hidden", !state.speakingTranslationVisible || !line.japanese);
    const showSpeakingHintUi = line.speaker === "A";
    elements.speakingHintBtn.classList.toggle("hidden", !showSpeakingHintUi);
    elements.speakingHintBlock.classList.toggle("hidden", !showSpeakingHintUi || !state.speakingHintVisible);
    elements.speakingHintTitleText.textContent = state.speakingHintTitle || "💡 ヒント";
    elements.speakingHintText.textContent = state.speakingHintText || "";
    elements.speakingRecognitionDebugText.innerHTML = state.speakingRecognitionDebugHtml || "";
    const statusPromptText = line.speaker === "A"
      ? "🎤 質問文をシャドーイングし、続きの文章を\n声に出してみよう。"
      : "🎤 シャドーイングしてください";
    const hasSpeechSynthesis = Boolean(getSpeechSynthesisEngine());
    if (state.speakingLineStatus === "playing") {
      elements.conversationStatusText.textContent = "再生中…";
    } else if (state.speakingLineStatus === "error") {
      elements.conversationStatusText.textContent = "音声を再生できませんでした。";
    } else {
      elements.conversationStatusText.textContent = statusPromptText;
    }
    elements.toggleJapaneseBtn.disabled = state.speakingLineStatus === "playing" || !line.japanese;
    elements.speakingHintBtn.disabled = !showSpeakingHintUi || state.speakingLineStatus === "playing";
    elements.replayConversationAudioBtn.textContent = "▶ もう一度聞く";
    elements.replayConversationAudioBtn.disabled = !hasSpeechSynthesis || state.speakingLineStatus === "playing";
    elements.conversationMicBtn.classList.add("hidden");
    elements.conversationMicBtn.disabled = true;
    elements.nextConversationLineBtn.disabled = state.speakingLineStatus !== "completed";
    elements.nextConversationLineBtn.classList.remove("hidden");

    showScreen("conversationPracticeScreen");
  }

  function renderConversationPracticeWithAutoPlay() {
    clearSpeakingAutoAdvanceTimer();
    renderConversationPractice();
    playCurrentSpeakingLine();
  }

  function renderConversationCompleteScreen() {
    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    const conversation = getCurrentSpeakingConversation();
    if (!progress || !week) {
      renderConversationSelectScreen();
      return;
    }
    const conversationSetCount = Math.max(0, Number(progress.conversationSetCount) || 0);
    const targetSets = 5;
    const hasNextDay = Boolean(getNextSpeakingDayKeyFromQueue(progress));
    const isLevel1 = isSpeakingLevel1Week(week);
    const daySetProgress = conversation ? getSpeakingDaySetProgress(week, conversation, progress.lineIndex) : null;
    const completedDaySets = daySetProgress?.totalSets || conversationSetCount;
    if (conversationSetCount >= targetSets) {
      elements.conversationCompleteMetaText.innerHTML = "5 / 5セット 完了<br>🌟 Excellent!";
      elements.nextConversationBtn.textContent = hasNextDay ? "次のDayへ" : "このConversationを続ける";
    } else if (progress.conversationIndex >= week.shortConversations.length - 1) {
      elements.conversationCompleteMetaText.textContent = `${completedDaySets} / ${completedDaySets}セット 完了`;
      elements.nextConversationBtn.textContent = "このConversationを続ける";
    } else {
      elements.conversationCompleteMetaText.textContent = `${completedDaySets} / ${completedDaySets}セット 完了`;
      elements.nextConversationBtn.textContent = "このConversationを続ける";
    }

    if (isLevel1 && state.speakingLevel1Session) {
      const durationSeconds = Math.max(0, (Date.now() - Number(state.speakingLevel1Session.startedAt || Date.now())) / 1000);
      elements.conversationLevel1ResultBlock.classList.remove("hidden");
      elements.conversationLevel1CompletedText.textContent = `完了会話数 ${Math.max(0, Number(state.speakingLevel1Session.completedCount) || 0)}`;
      elements.conversationLevel1CorrectText.textContent = `正解数 ${Math.max(0, Number(state.speakingLevel1Session.correctCount) || 0)}`;
      elements.conversationLevel1TimeText.textContent = `学習時間 ${formatSecondsToJa(durationSeconds)}`;
    } else {
      elements.conversationLevel1ResultBlock.classList.add("hidden");
    }

    showScreen("conversationCompleteScreen");
  }

  function resumeSpeakingProgress() {
    clearSpeakingAutoAdvanceTimer();
    clearSpeakingRecognition();
    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    if (!progress || !week) {
      renderConversationSelectScreen();
      return;
    }
    if (progress.phase === "conversationComplete") {
      renderConversationCompleteScreen();
      return;
    }
    state.speakingMode = "week";
    resetSpeakingHintState();
    state.speakingLineStatus = "awaitingStart";
    renderConversationPracticeWithAutoPlay();
  }

  function toggleSpeakingJapanese() {
    if (state.speakingAudioPlaying) return;
    recordMobileLearningActivity();
    state.speakingTranslationVisible = !state.speakingTranslationVisible;
    renderConversationPractice();

  }

  function moveToNextSpeakingLine() {
    if (state.speakingLineStatus !== "completed") return;
    recordMobileLearningActivity();

    if (isReviewSpeakingModeActive()) {
      const session = state.speakingReviewSession;
      const item = getCurrentReviewQueueItem();
      const context = getCurrentReviewConversationContext();
      const conversation = context?.conversation;
      const week = context?.week;
      if (!session || !item || !conversation) return;

      if (week && isSpeakingLevel1Week(week)) {
        const reviewLineIndex = Math.max(0, Number(session.lineIndex) || 0);
        if (reviewLineIndex === 0) return;
        moveToNextSpeakingLevel1Conversation();
        return;
      }

      if (session.lineIndex < conversation.lines.length - 1) {
        session.lineIndex += 1;
        resetSpeakingHintState();
        state.speakingTranslationVisible = false;
        saveSpeakingReviewSession();
        renderConversationPractice();
        playCurrentSpeakingLine();
        return;
      }

      recordSpeakingReviewConversationCompletion(item.conversationId, item);
      incrementReviewSessionPendingPointCount(session);
      continueAfterReviewConversationAdvance(
        session,
        () => {
          renderConversationPractice();
          playCurrentSpeakingLine();
        },
        () => {
          finishSpeakingReviewSession(session.reviewQueue.length);
        }
      );
      return;
    }

    const progress = state.speakingProgress;
    const conversation = getCurrentSpeakingConversation();
    const week = getSpeakingProgressWeek();
    if (!progress || !conversation || !week) return;
    if (isSpeakingLevel1Week(week)) {
      const level1LineIndex = Math.max(0, Number(progress.lineIndex) || 0);
      if (level1LineIndex === 0) return;
      moveToNextSpeakingLevel1Conversation();
      return;
    }

    if (progress.lineIndex < conversation.lines.length - 1) {
      progress.lineIndex += 1;
      resetSpeakingHintState();
      state.speakingTranslationVisible = false;
      progress.phase = "line";
      saveSpeakingProgress();
      renderConversationPractice();
      playCurrentSpeakingLine();
      return;
    }

    const conversationId = progress.conversationOrder[progress.conversationIndex];
    const hasAlreadyCounted = conversationId && progress.completedConversationIds.includes(conversationId);
    if (conversationId && !hasAlreadyCounted) {
      progress.completedConversationIds.push(conversationId);
    }
    if (!hasAlreadyCounted) {
      progress.conversationSetCount = Math.max(0, Number(progress.conversationSetCount) || 0) + 1;
    }

    const daySetProgress = getSpeakingDaySetProgress(week, conversation, progress.lineIndex);
    if (daySetProgress.currentSet < daySetProgress.totalSets) {
      progress.conversationIndex += 1;
      progress.lineIndex = 0;
      resetSpeakingHintState();
      state.speakingTranslationVisible = false;
      progress.phase = "line";
      saveSpeakingProgress();
      renderConversationPractice();
      playCurrentSpeakingLine();
      return;
    }

    progress.phase = "conversationComplete";
    saveSpeakingProgress();
    renderConversationCompleteScreen();
  }

  function leaveSpeakingPractice() {
    recordMobileLearningActivity();
    clearSpeakingAutoAdvanceTimer();
    clearSpeakingRecognition();
    stopSpeakingAudio();
    resetSpeakingHintState();
    state.speakingLineStatus = "awaitingStart";

    const progress = state.speakingProgress;
    const reviewActive = isReviewSpeakingModeActive();
    if (reviewActive) {
      showConfirm(
        buildReviewExitConfirmMessage(),
        "終了する",
        () => {
          const earnedPoints = applyPendingReviewSpeakingPoints(state.speakingReviewSession, { persistSession: true });
          if (state.learningHistorySession) {
            const reviewSummary = getCurrentMobileLearningHistorySummary() || {};
            reviewSummary.earnedPoints = earnedPoints;
            finalizeMobileLearningHistorySession({
              completedReason: "interrupted",
              mode: "review",
              summary: reviewSummary
            });
          }
          saveSpeakingReviewSession();
          if (earnedPoints > 0) {
            openPointRewardScreen("review", earnedPoints, {
              onClose: renderSpeakingReviewTopScreen
            });
            return;
          }
          renderSpeakingReviewTopScreen();
        },
        { cancelLabel: "復習を続ける" }
      );
      return;
    }
    const completed = Boolean(progress) && getSpeakingCompletedRounds(progress) >= getSpeakingTargetRounds(progress);
    if (state.learningHistorySession) {
      finalizeMobileLearningHistorySession({
        completedReason: completed ? "completed" : "interrupted",
        mode: reviewActive ? "review" : (isSpeakingLevel1Week(getSpeakingProgressWeek()) ? "speaking" : "conversation"),
        summary: getCurrentMobileLearningHistorySummary() || {}
      });
    }
    saveSpeakingProgress();
    const sessionProgress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    if (!sessionProgress || !week) {
      renderConversationSelectScreen();
      return;
    }
    state.speakingUi.selectedConversationWeekId = week.weekId;
    state.speakingUi.selectedConversationDayKeys = getSpeakingSelectedDayKeysFromOrder(week, sessionProgress.conversationOrder);
    renderConversationDaySelectScreen();
  }

  function moveToNextSpeakingConversation() {
    if (isReviewSpeakingModeActive()) {
      renderSpeakingReviewTopScreen();
      return;
    }

    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    if (!progress || !week) {
      renderConversationSelectScreen();
      return;
    }

    const targetSets = getSpeakingTargetRounds(progress);
    if (progress.phase === "conversationComplete" && getSpeakingCompletedRounds(progress) >= targetSets) {
      if (!progress.pointAwarded) {
        progress.pointAwarded = true;
        saveSpeakingProgress();
      }
      if (state.learningHistorySession) {
        finalizeMobileLearningHistorySession({
          completedReason: "completed",
          mode: isSpeakingLevel1Week(week) ? "speaking" : "conversation",
          summary: getCurrentMobileLearningHistorySummary() || {}
        });
      }
      const nextDayKey = getNextSpeakingDayKeyFromQueue(progress);
      if (nextDayKey) {
        startOrResumeSpeakingDay(week, nextDayKey, state.speakingUi.activeConversationDayKeys);
        return;
      }
      restartCurrentSpeakingDayFromBeginning();
      return;
    }

    const conversationSetCount = Math.max(0, Number(progress.conversationSetCount) || 0);
    const practiceConversationCount = Array.isArray(progress.conversationOrder)
      ? progress.conversationOrder.length
      : 0;

    void conversationSetCount;

    if (progress.conversationIndex < practiceConversationCount - 1) {
      progress.conversationIndex += 1;
      progress.lineIndex = 0;
      progress.conversationSetCount = 0;
      progress.phase = "line";
      resetSpeakingHintState();
      state.speakingTranslationVisible = false;
      state.speakingLineStatus = "awaitingStart";
      saveSpeakingProgress();
      renderConversationPracticeWithAutoPlay();
      return;
    }

    progress.completedRounds = Math.max(0, Number(progress.completedRounds) || 0) + 1;
    const earnedPoints = awardHomeworkSpeakingPoints();
    const continueAfterHomeworkCompletion = () => {
      if (progress.completedRounds < targetSets) {
        const nextRound = progress.completedRounds + 1;
        const selectedDayKeys = getSpeakingSelectedDayKeysFromOrder(week, progress.conversationOrder);
        progress.conversationOrder = getSpeakingConversationOrderForRound(week, nextRound, selectedDayKeys);
        progress.conversationIndex = 0;
        progress.lineIndex = 0;
        progress.conversationSetCount = 0;
        progress.completedConversationIds = [];
        progress.phase = "line";
        resetSpeakingHintState();
        state.speakingTranslationVisible = false;
        state.speakingLineStatus = "awaitingStart";
        saveSpeakingProgress();
        renderConversationPracticeWithAutoPlay();
        return;
      }

      progress.lineIndex = 0;
      progress.conversationSetCount = 0;
      progress.phase = "conversationComplete";
      state.speakingLineStatus = "awaitingStart";
      saveSpeakingProgress();
      renderConversationCompleteScreen();
    };

    if (earnedPoints > 0) {
      openPointRewardScreen("homework", earnedPoints, {
        onClose: continueAfterHomeworkCompletion
      });
      return;
    }

    continueAfterHomeworkCompletion();
  }

  function returnToSpeakingLevel1QuestionLine() {
    recordMobileLearningActivity();
    clearSpeakingAutoAdvanceTimer();
    clearSpeakingRecognition();
    stopSpeakingAudio();

    if (isReviewSpeakingModeActive()) {
      const session = state.speakingReviewSession;
      const context = getCurrentReviewConversationContext();
      const week = context?.week;
      if (!session || !week || !isSpeakingLevel1Week(week)) return;
      if (Math.max(0, Number(session.lineIndex) || 0) <= 0) return;
      session.lineIndex = 0;
      state.speakingTranslationVisible = false;
      resetSpeakingHintState();
      state.speakingLineStatus = "awaitingStart";
      saveSpeakingReviewSession();
      renderConversationPracticeWithAutoPlay();
      return;
    }

    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    if (!progress || !week || !isSpeakingLevel1Week(week)) return;
    if (Math.max(0, Number(progress.lineIndex) || 0) <= 0) return;
    progress.lineIndex = 0;
    progress.phase = "line";
    state.speakingTranslationVisible = false;
    resetSpeakingHintState();
    state.speakingLineStatus = "awaitingStart";
    saveSpeakingProgress();
    renderConversationPracticeWithAutoPlay();
  }

  function handlePageVisibilityChange() {
    if (document.visibilityState === "hidden") {
      pauseMobileLearningHistorySession(Date.now());
    } else {
      resumeMobileLearningHistorySession(Date.now());
    }

    const speechSynthesis = getSpeechSynthesisEngine();
    if (!speechSynthesis) return;
    if (document.visibilityState === "hidden") {
      stopSpeakingAudio();
      return;
    }
    if (speechSynthesis.paused) {
      try {
        speechSynthesis.resume();
      } catch (_error) {
        // noop
      }
    }
  }

  function setMobileReloadNavigationGuard() {
    try {
      sessionStorage.setItem(MOBILE_VOCABULARY_RELOAD_GUARD_STORAGE_KEY, "1");
    } catch (_error) {
      // noop
    }
    try {
      localStorage.setItem(MOBILE_VOCABULARY_RELOAD_GUARD_STORAGE_KEY, "1");
    } catch (_error) {
      // noop
    }
  }

  function consumeMobileReloadNavigationGuard() {
    const flag = sessionStorage.getItem(MOBILE_VOCABULARY_RELOAD_GUARD_STORAGE_KEY) === "1"
      || localStorage.getItem(MOBILE_VOCABULARY_RELOAD_GUARD_STORAGE_KEY) === "1";
    try {
      sessionStorage.removeItem(MOBILE_VOCABULARY_RELOAD_GUARD_STORAGE_KEY);
    } catch (_error) {
      // noop
    }
    try {
      localStorage.removeItem(MOBILE_VOCABULARY_RELOAD_GUARD_STORAGE_KEY);
    } catch (_error) {
      // noop
    }
    return flag;
  }

  function isMobileReloadNavigation() {
    if (!window || !window.performance) return false;
    try {
      const entries = window.performance.getEntriesByType("navigation");
      if (entries && entries.length && entries[0] && entries[0].type) {
        if (entries[0].type === "reload") {
          return true;
        }
      }
    } catch (_error) {
      // noop
    }
    try {
      if (Boolean(window.performance.navigation) && window.performance.navigation.type === 1) {
        return true;
      }
    } catch (_error) {
      // noop
    }
    try {
      return consumeMobileReloadNavigationGuard();
    } catch (_error) {
      return false;
    }
  }

  function handlePageHide() {
    pauseMobileLearningHistorySession(Date.now());
    stopSpeakingAudio();
    setMobileReloadNavigationGuard();
  }

  function handlePageShow() {
    try {
      const reloadGuard = consumeMobileReloadNavigationGuard();
      if (reloadGuard || (isMobileReloadNavigation() && !getVocabularyTeacherCheckRouteScreen())) {
        showScreen("homeScreen");
        renderHome();
      }
    } catch (_error) {
      // noop
    }
    resumeMobileLearningHistorySession(Date.now());
    const speechSynthesis = getSpeechSynthesisEngine();
    if (!speechSynthesis || !speechSynthesis.paused) return;
    try {
      speechSynthesis.resume();
    } catch (_error) {
      // noop
    }
  }

  function resolveQuestion(correct, primaryTranscript, transcriptList) {
    const session = state.session;
    const question = getCurrentQuestion();
    if (!session || !question) return;

    session.lastPrimaryTranscript = primaryTranscript;
    session.transcripts = transcriptList.slice();
    session.wasCorrect = correct;

    if (correct) {
      session.feedback = "✅ 正解！";
      session.phase = "resolved";
      session.showAnswer = false;
      if (session.attemptsUsed === 1) {
        session.stats.firstTryCorrect += 1;
      } else {
        session.stats.secondTryCorrect += 1;
      }
      renderStudyScreen();
      return;
    }

    if (session.attemptsUsed >= 2) {
      session.feedback = session.mode === "typing" ? "❌ 正しく入力できませんでした" : "❌ 正しく認識されませんでした";
      session.phase = "resolved";
      session.showAnswer = true;
      session.stats.fullyIncorrect += 1;
    } else {
      session.feedback = session.mode === "typing" ? "❌ もう一度入力してみよう" : "❌ もう一度話してみよう";
      session.phase = "answering";
      session.showAnswer = false;
    }
    renderStudyScreen();
  }

  function handleRecognitionFailure(message) {
    const session = state.session;
    if (!session) return;
    session.recognitionInProgress = false;
    session.attemptsUsed += 1;
    resolveQuestion(false, message || "聞き取れませんでした", []);
  }

  function beginSpeechRecognition() {
    recordMobileLearningActivity();
    const session = state.session;
    if (!session || session.recognitionInProgress || !SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    session.recognitionInProgress = true;
    session.activeRecognition = recognition;
    session.noticeMessage = "";
    renderStudyScreen();

    recognition.lang = "en-US";
    recognition.maxAlternatives = 5;
    recognition.interimResults = false;
    recognition.continuous = false;

    let handled = false;
    recognition.onresult = (event) => {
      if (handled) return;
      handled = true;
      const results = Array.from(event.results?.[0] || []);
      const transcripts = results.map((item) => String(item.transcript || "").trim()).filter(Boolean);
      console.log("speech alternatives", transcripts);
      session.recognitionInProgress = false;
      session.attemptsUsed += 1;
      resolveQuestion(
        isCorrectRecognition(getCurrentQuestion().answer, transcripts),
        transcripts[0] || "聞き取れませんでした",
        transcripts
      );
    };

    recognition.onerror = (event) => {
      if (handled) return;
      handled = true;
      session.recognitionInProgress = false;
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        session.noticeMessage = "マイクの使用が許可されていません。ブラウザの設定からマイクを許可してください。";
      } else if (event.error === "no-speech" || event.error === "audio-capture") {
        session.noticeMessage = "うまく聞き取れませんでした。もう一度お試しください。";
      } else {
        session.noticeMessage = "うまく聞き取れませんでした。もう一度お試しください。";
      }
      session.attemptsUsed += 1;
      resolveQuestion(false, "聞き取れませんでした", []);
    };

    recognition.onend = () => {
      session.recognitionInProgress = false;
      renderStudyScreen();
    };

    try {
      recognition.start();
    } catch (_error) {
      session.recognitionInProgress = false;
      renderStudyScreen();
    }
  }

  function submitTypingAnswer() {
    recordMobileLearningActivity();
    const session = state.session;
    if (!session) return;
    const typed = String(elements.typingAnswerInput.value || "").trim();
    session.attemptsUsed += 1;
    resolveQuestion(isCorrectRecognition(getCurrentQuestion().answer, [typed]), typed || "聞き取れませんでした", [typed]);
  }

  function goToNextQuestion() {
    recordMobileLearningActivity();
    const session = state.session;
    if (!session) return;
    session.currentIndex += 1;
    session.attemptsUsed = 0;
    session.recognitionInProgress = false;
    session.lastPrimaryTranscript = "";
    session.transcripts = [];
    session.feedback = "";
    session.noticeMessage = "";
    session.phase = "answering";
    session.showAnswer = false;
    session.wasCorrect = false;
    if (session.currentIndex >= SESSION_QUESTION_COUNT) {
      finishSession();
      return;
    }
    renderStudyScreen();
  }

  function finishSession() {
    const session = state.session;
    if (!session) return;
    if (state.learningHistorySession) {
      finalizeMobileLearningHistorySession({
        completedReason: "completed",
        mode: session.mode,
        session,
        summary: getCurrentMobileLearningHistorySummary() || {}
      });
    }
    state.stats.studySessions += 1;
    state.stats.questionCount += session.questions.length;
    state.stats.firstTryCorrect += session.stats.firstTryCorrect;
    state.stats.secondTryCorrect += session.stats.secondTryCorrect;
    state.stats.fullyIncorrect += session.stats.fullyIncorrect;
    saveState();

    elements.resultSummaryText.textContent = `10問中 ${session.stats.firstTryCorrect + session.stats.secondTryCorrect}問正解`;
    elements.resultFirstTryText.textContent = `1回目で正解 ${session.stats.firstTryCorrect}問`;
    elements.resultSecondTryText.textContent = `2回目で正解 ${session.stats.secondTryCorrect}問`;
    elements.resultFailedText.textContent = `正解を確認 ${session.stats.fullyIncorrect}問`;
    state.lastSessionMode = session.mode;
    state.session = null;
    showScreen("resultScreen");
  }

  function startStudy(mode) {
    const session = createSession(mode);
    if (!session.questions.length) {
      window.alert("出題できる問題がありません。");
      return;
    }
    startMobileLearningHistorySession({
      source: "study",
      mode,
      dayNumber: getMobileLearningDayNumberFromSession(session),
      startedAt: Date.now(),
      session
    });
    state.session = session;
    renderStudyScreen();
  }

  function confirmLeaveStudy() {
    recordMobileLearningActivity();
    showConfirm("学習を中断してホームへ戻りますか？", "ホームへ戻る", () => {
      if (state.learningHistorySession && state.session) {
        finalizeMobileLearningHistorySession({
          completedReason: "interrupted",
          mode: state.session.mode,
          session: state.session,
          summary: getCurrentMobileLearningHistorySummary() || {}
        });
      }
      if (state.session?.activeRecognition) {
        try {
          state.session.activeRecognition.abort();
        } catch (_error) {
          // noop
        }
      }
      state.session = null;
      renderHome();
    });
  }

  function runMicTest() {
    if (!SpeechRecognitionCtor) {
      elements.micTestStatusText.textContent = "この端末またはブラウザでは音声認識を利用できません。Chromeでお試しください。";
      return;
    }
    elements.micTestStatusText.textContent = "マイクテスト中…";
    const recognition = new SpeechRecognitionCtor();
    state.micTestRecognition = recognition;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const results = Array.from(event.results?.[0] || []);
      const transcript = String(results[0]?.transcript || "").trim();
      elements.micTestStatusText.textContent = transcript ? `聞き取り結果: ${transcript}` : "聞き取れませんでした";
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        elements.micTestStatusText.textContent = "マイクの使用が許可されていません。ブラウザの設定からマイクを許可してください。";
      } else {
        elements.micTestStatusText.textContent = "うまく聞き取れませんでした。もう一度お試しください。";
      }
    };
    recognition.onend = () => {
      state.micTestRecognition = null;
    };
    try {
      recognition.start();
    } catch (_error) {
      elements.micTestStatusText.textContent = "マイクテストを開始できませんでした。";
    }
  }

  function resetMobileData() {
    showConfirm(
      "スマホ版の学習履歴と設定をすべて削除します。PC版のデータには影響しません。本当に初期化しますか？",
      "初期化する",
      () => {
        window.localStorage.removeItem(MOBILE_STORAGE_KEY);
        window.localStorage.removeItem(SPEAKING_PROGRESS_KEY);
        window.localStorage.removeItem(SPEAKING_RECENT_PROGRESS_KEY);
        window.localStorage.removeItem(SPEAKING_REVIEW_STATS_KEY);
        window.localStorage.removeItem(SPEAKING_REVIEW_SESSION_KEY);
        Object.assign(state, createDefaultMobileState(), {
          session: null,
          speakingUi: createDefaultSpeakingUiState(),
          speakingProgress: null,
          speakingDayProgressMap: {},
          speakingLegacyUnresolvedProgress: null,
          speakingReviewStatsMap: {},
          speakingReviewSession: null,
          speakingReviewPlannedQueue: [],
          speakingMode: "week",
          recentSpeakingProgress: [],
          speakingTranslationVisible: false,
          speakingAudioPlaying: false,
          speakingAudioWatchdogId: null,
          speakingLineStatus: "idle",
          speakingUtterance: null,
          speakingHintVisible: false,
          speakingHintStep: 0,
          speakingHintTitle: "",
          speakingHintText: "",
          speakingLevel1MissingKeywords: [],
          speakingRecognitionDebugHtml: "",
          speakingLevel1Session: null,
          speakingLevel1AttemptUsed: 0,
          speakingLevel1AttemptKey: "",
          speakingRecognitionInProgress: false,
          speakingRecognition: null,
          speakingAutoAdvanceTimerId: null,
          wordOrderTraining: null,
          wordOrderSelectedRangeValue: WORD_ORDER_DAY_RANGES[0].value,
          currentScreen: "homeScreen",
          confirmAction: null,
          micTestRecognition: null
        });
        saveState();
        syncFormFromState();
        elements.micTestStatusText.textContent = "";
        renderHome();
      }
    );
  }

  function syncFormFromState() {
    if (elements.startDaySelect) {
      elements.startDaySelect.innerHTML = "";
    }
    if (elements.endDaySelect) {
      elements.endDaySelect.innerHTML = "";
    }
    elements.speakingWordStartDaySelect.innerHTML = "";
    elements.speakingWordEndDaySelect.innerHTML = "";
    elements.conversationWeekSelect.innerHTML = "";
    for (let day = MOBILE_DAY_MIN; day <= MOBILE_DAY_MAX; day += 1) {
      const startOption = document.createElement("option");
      startOption.value = String(day);
      startOption.textContent = `Day${day}`;
      const endOption = startOption.cloneNode(true);
      const speakingStartOption = startOption.cloneNode(true);
      const speakingEndOption = startOption.cloneNode(true);
      if (elements.startDaySelect) {
        elements.startDaySelect.appendChild(startOption);
      }
      if (elements.endDaySelect) {
        elements.endDaySelect.appendChild(endOption);
      }
      elements.speakingWordStartDaySelect.appendChild(speakingStartOption);
      elements.speakingWordEndDaySelect.appendChild(speakingEndOption);
    }
    const speakingWeeks = getSpeakingWeeks();
    const availableWeeks = getAvailableConversationWeeks();
    availableWeeks.forEach((weekInfo) => {
      const option = document.createElement("option");
      option.value = weekInfo.weekId;
      option.textContent = getSpeakingWeekDisplayLabel(weekInfo);
      elements.conversationWeekSelect.appendChild(option);
    });
    if (elements.startDaySelect) {
      elements.startDaySelect.value = String(state.settings.startDay);
    }
    if (elements.endDaySelect) {
      elements.endDaySelect.value = String(state.settings.endDay);
    }
    elements.speakingWordStartDaySelect.value = String(state.speakingUi.startDay);
    elements.speakingWordEndDaySelect.value = String(state.speakingUi.endDay);
    if (availableWeeks.length && !availableWeeks.some((week) => week.weekId === state.speakingUi.selectedConversationWeekId)) {
      state.speakingUi.selectedConversationWeekId = availableWeeks[0].weekId;
    }
    if (elements.conversationWeekSelect.options.length) {
      elements.conversationWeekSelect.value = String(state.speakingUi.selectedConversationWeekId || availableWeeks[0]?.weekId || "");
    }

    [...document.querySelectorAll('input[name="speechRateMode"]')].forEach((radio) => {
      radio.checked = radio.value === state.settings.speechRateMode;
    });

    setWordOrderDayRangeValue(state.wordOrderSelectedRangeValue);
  }

  function bindElements() {
    elements.dayRangeFields = document.getElementById("dayRangeFields");
    elements.startDaySelect = document.getElementById("startDaySelect");
    elements.endDaySelect = document.getElementById("endDaySelect");
    elements.conversationWeekSelect = document.getElementById("conversationWeekSelect");
    elements.todayReviewPlannedCountText = document.getElementById("todayReviewPlannedCountText");
    elements.startTodayReviewBtn = document.getElementById("startTodayReviewBtn");
    elements.returnSpeakingReviewCompleteBtn = document.getElementById("returnSpeakingReviewCompleteBtn");
    elements.pointRewardTitleText = document.getElementById("pointRewardTitleText");
    elements.pointRewardCategoryText = document.getElementById("pointRewardCategoryText");
    elements.pointRewardEarnedText = document.getElementById("pointRewardEarnedText");
    elements.pointRewardTodayText = document.getElementById("pointRewardTodayText");
    elements.pointRewardTotalText = document.getElementById("pointRewardTotalText");
    elements.pointRewardOkBtn = document.getElementById("pointRewardOkBtn");
    elements.conversationContinuePanel = document.getElementById("conversationContinuePanel");
    elements.recentProgressList = document.getElementById("recentProgressList");
    elements.conversationDaySelectWeekText = document.getElementById("conversationDaySelectWeekText");
    elements.conversationDayChecklist = document.getElementById("conversationDayChecklist");
    elements.startSelectedConversationDaysBtn = document.getElementById("startSelectedConversationDaysBtn");
    elements.speakingWordDayRangeFields = document.getElementById("speakingWordDayRangeFields");
    elements.speakingWordStartDaySelect = document.getElementById("speakingWordStartDaySelect");
    elements.speakingWordEndDaySelect = document.getElementById("speakingWordEndDaySelect");
    elements.startSpeakingWordPracticeBtn = document.getElementById("startSpeakingWordPracticeBtn");
    elements.speakingWordWeekList = document.getElementById("speakingWordWeekList");
    elements.speakingWordDaySelectWeekText = document.getElementById("speakingWordDaySelectWeekText");
    elements.speakingWordDayChecklist = document.getElementById("speakingWordDayChecklist");
    elements.speakingWordPracticeWeekText = document.getElementById("speakingWordPracticeWeekText");
    elements.speakingWordPracticeProgressText = document.getElementById("speakingWordPracticeProgressText");
    elements.speakingWordPracticeWordText = document.getElementById("speakingWordPracticeWordText");
    elements.vocabularySampleHeaderText = document.getElementById("vocabularySampleHeaderText");
    elements.vocabularySampleProgressText = document.getElementById("vocabularySampleProgressText");
    elements.vocabularySampleTimerText = document.getElementById("vocabularySampleTimerText");
    elements.vocabularySamplePartOfSpeechText = document.getElementById("vocabularySamplePartOfSpeechText");
    elements.vocabularySampleWordText = document.getElementById("vocabularySampleWordText");
    elements.vocabularySamplePronunciationText = document.getElementById("vocabularySamplePronunciationText");
    elements.vocabularySamplePronunciationArea = document.getElementById("vocabularySamplePronunciationArea");
    elements.vocabularySamplePronunciationBtn = document.getElementById("vocabularySamplePronunciationBtn");
    elements.vocabularySampleAccentBlock = document.getElementById("vocabularySampleAccentBlock");
    elements.vocabularySampleAccentText = document.getElementById("vocabularySampleAccentText");
    elements.vocabularySamplePronunciationOkBtn = document.getElementById("vocabularySamplePronunciationOkBtn");
    elements.vocabularySamplePronunciationNgBtn = document.getElementById("vocabularySamplePronunciationNgBtn");
    elements.vocabularySampleMeaningArea = document.getElementById("vocabularySampleMeaningArea");
    elements.vocabularySampleMeaningBtn = document.getElementById("vocabularySampleMeaningBtn");
    elements.vocabularySampleMeaningInlineText = document.getElementById("vocabularySampleMeaningInlineText");
    elements.vocabularySampleMeaningResultBlock = document.getElementById("vocabularySampleMeaningResultBlock");
    elements.vocabularySampleMeaningResultText = document.getElementById("vocabularySampleMeaningResultText");
    elements.vocabularySampleMeaningOkBtn = document.getElementById("vocabularySampleMeaningOkBtn");
    elements.vocabularySampleMeaningNgBtn = document.getElementById("vocabularySampleMeaningNgBtn");
    elements.vocabularySampleNextWrap = document.getElementById("vocabularySampleNextWrap");
    elements.vocabularySampleNextBtn = document.getElementById("vocabularySampleNextBtn");
    elements.vocabularySampleHistoryBtn = document.getElementById("vocabularySampleHistoryBtn");
    elements.vocabularySamplePastHistoryBtn = document.getElementById("vocabularySamplePastHistoryBtn");
    elements.vocabularyTodayHistoryList = document.getElementById("vocabularyTodayHistoryList");
    elements.vocabularyPastHistorySummary = document.getElementById("vocabularyPastHistorySummary");
    elements.vocabularyPastHistoryFilters = document.getElementById("vocabularyPastHistoryFilters");
    elements.vocabularyPastHistoryList = document.getElementById("vocabularyPastHistoryList");
    elements.vocabularyPastHistoryBackBtn = document.getElementById("vocabularyPastHistoryBackBtn");
    elements.vocabularyTodayHistoryBackBtn = document.getElementById("vocabularyTodayHistoryBackBtn");
    elements.vocabularyTeacherCheckBtn = document.getElementById("vocabularyTeacherCheckBtn");
    elements.vocabularyTeacherCheckBackBtn = document.getElementById("vocabularyTeacherCheckBackBtn");
    elements.vocabularyTeacherCheckMeta = document.getElementById("vocabularyTeacherCheckMeta");
    elements.vocabularyTeacherCheckContent = document.getElementById("vocabularyTeacherCheckContent");
    elements.vocabularyTeacherCheckPrevBtn = document.getElementById("vocabularyTeacherCheckPrevBtn");
    elements.vocabularyTeacherCheckNextBtn = document.getElementById("vocabularyTeacherCheckNextBtn");
    elements.vocabularyTeacherCheckCompleteBtn = document.getElementById("vocabularyTeacherCheckCompleteBtn");
    elements.vocabularySampleCompleteBlock = document.getElementById("vocabularySampleCompleteBlock");
    elements.vocabularySampleCompleteBackBtn = document.getElementById("vocabularySampleCompleteBackBtn");
    elements.vocabularySampleBackBtn = document.getElementById("vocabularySampleBackBtn");
    elements.speakingWordPlayBtn = document.getElementById("speakingWordPlayBtn");
    elements.speakingWordMeaningToggleBtn = document.getElementById("speakingWordMeaningToggleBtn");
    elements.speakingWordMeaningText = document.getElementById("speakingWordMeaningText");
    elements.speakingWordExampleText = document.getElementById("speakingWordExampleText");
    elements.speakingWordExamplePlayBtn = document.getElementById("speakingWordExamplePlayBtn");
    elements.speakingWordExampleJapaneseToggleBtn = document.getElementById("speakingWordExampleJapaneseToggleBtn");
    elements.speakingWordExampleJapaneseText = document.getElementById("speakingWordExampleJapaneseText");
    elements.speakingWordReadCountText = document.getElementById("speakingWordReadCountText");
    elements.speakingWordMicBtn = document.getElementById("speakingWordMicBtn");
    elements.speakingWordRecognitionStatusText = document.getElementById("speakingWordRecognitionStatusText");
    elements.speakingWordNextBtn = document.getElementById("speakingWordNextBtn");
    elements.speakingWordCompleteTitleText = document.getElementById("speakingWordCompleteTitleText");
    elements.speakingWordCompleteMetaText = document.getElementById("speakingWordCompleteMetaText");
    elements.conversationWeekText = document.getElementById("conversationWeekText");
    elements.conversationProgressText = document.getElementById("conversationProgressText");
    elements.conversationSpeakerText = document.getElementById("conversationSpeakerText");
    elements.conversationEnglishText = document.getElementById("conversationEnglishText");
    elements.conversationJapaneseBlock = document.getElementById("conversationJapaneseBlock");
    elements.conversationJapaneseText = document.getElementById("conversationJapaneseText");
    elements.conversationStatusText = document.getElementById("conversationStatusText");
    elements.speakingHintBtn = document.getElementById("speakingHintBtn");
    elements.speakingHintBlock = document.getElementById("speakingHintBlock");
    elements.speakingHintTitleText = document.getElementById("speakingHintTitleText");
    elements.speakingHintText = document.getElementById("speakingHintText");
    elements.speakingRecognitionDebugText = document.getElementById("speakingRecognitionDebugText");
    elements.closeSpeakingHintBtn = document.getElementById("closeSpeakingHintBtn");
    elements.toggleJapaneseBtn = document.getElementById("toggleJapaneseBtn");
    elements.replayConversationAudioBtn = document.getElementById("replayConversationAudioBtn");
    elements.conversationMicBtn = document.getElementById("conversationMicBtn");
    elements.nextConversationLineBtn = document.getElementById("nextConversationLineBtn");
    elements.conversationBackToABtn = document.getElementById("conversationBackToABtn");
    elements.conversationCompleteMetaText = document.getElementById("conversationCompleteMetaText");
    elements.conversationLevel1ResultBlock = document.getElementById("conversationLevel1ResultBlock");
    elements.conversationLevel1CompletedText = document.getElementById("conversationLevel1CompletedText");
    elements.conversationLevel1CorrectText = document.getElementById("conversationLevel1CorrectText");
    elements.conversationLevel1TimeText = document.getElementById("conversationLevel1TimeText");
    elements.nextConversationBtn = document.getElementById("nextConversationBtn");
    elements.speechSupportNotice = document.getElementById("speechSupportNotice");
    elements.studyDayText = document.getElementById("studyDayText");
    elements.studyProgressText = document.getElementById("studyProgressText");
    elements.studyTypeText = document.getElementById("studyTypeText");
    elements.studyPromptText = document.getElementById("studyPromptText");
    elements.speechControls = document.getElementById("speechControls");
    elements.speechActionBtn = document.getElementById("speechActionBtn");
    elements.typingControls = document.getElementById("typingControls");
    elements.typingAnswerInput = document.getElementById("typingAnswerInput");
    elements.typingSubmitBtn = document.getElementById("typingSubmitBtn");
    elements.feedbackBlock = document.getElementById("feedbackBlock");
    elements.feedbackMessage = document.getElementById("feedbackMessage");
    elements.recognizedBlock = document.getElementById("recognizedBlock");
    elements.recognizedLabelText = document.getElementById("recognizedLabelText");
    elements.recognizedText = document.getElementById("recognizedText");
    elements.answerBlock = document.getElementById("answerBlock");
    elements.answerText = document.getElementById("answerText");
    elements.studyActionArea = document.getElementById("studyActionArea");
    elements.resultSummaryText = document.getElementById("resultSummaryText");
    elements.resultFirstTryText = document.getElementById("resultFirstTryText");
    elements.resultSecondTryText = document.getElementById("resultSecondTryText");
    elements.resultFailedText = document.getElementById("resultFailedText");
    elements.micTestStatusText = document.getElementById("micTestStatusText");
    elements.mobileVersionText = document.getElementById("mobileVersionText");
    elements.showMobileUpdateHistoryBtn = document.getElementById("showMobileUpdateHistoryBtn");
    elements.mobileUpdateHistoryGate = document.getElementById("mobileUpdateHistoryGate");
    elements.mobileUpdateHistoryPasswordInput = document.getElementById("mobileUpdateHistoryPasswordInput");
    elements.mobileUpdateHistoryUnlockBtn = document.getElementById("mobileUpdateHistoryUnlockBtn");
    elements.mobileUpdateHistoryStatusText = document.getElementById("mobileUpdateHistoryStatusText");
    elements.mobileUpdateHistoryPanel = document.getElementById("mobileUpdateHistoryPanel");
    elements.openMobileAdminFromUpdateBtn = document.getElementById("openMobileAdminFromUpdateBtn");
    elements.mobileUpdateHistoryBackBtn = document.getElementById("mobileUpdateHistoryBackBtn");
    elements.mobileAdminLearningHistoryScreen = document.getElementById("mobileAdminLearningHistoryScreen");
    elements.mobileAdminLearningHistoryBackBtn = document.getElementById("mobileAdminLearningHistoryBackBtn");
    elements.mobileAdminLearningHistoryPinInput = document.getElementById("mobileAdminLearningHistoryPinInput");
    elements.mobileAdminLearningHistoryUnlockBtn = document.getElementById("mobileAdminLearningHistoryUnlockBtn");
    elements.mobileAdminLearningHistoryStatusText = document.getElementById("mobileAdminLearningHistoryStatusText");
    elements.mobileAdminLearningHistoryPanel = document.getElementById("mobileAdminLearningHistoryPanel");
    elements.wordOrderRangePanel = document.getElementById("wordOrderRangePanel");
    elements.wordOrderDayRangeButtons = [...document.querySelectorAll(".word-order-range-btn")];
    elements.wordOrderStartBtn = document.getElementById("wordOrderStartBtn");
    elements.wordOrderQuestionPanel = document.getElementById("wordOrderQuestionPanel");
    elements.wordOrderCompletePanel = document.getElementById("wordOrderCompletePanel");
    elements.wordOrderDayText = document.getElementById("wordOrderDayText");
    elements.wordOrderProgressText = document.getElementById("wordOrderProgressText");
    elements.wordOrderJapaneseText = document.getElementById("wordOrderJapaneseText");
    elements.wordOrderAnswerArea = document.getElementById("wordOrderAnswerArea");
    elements.wordOrderCardLabelText = document.getElementById("wordOrderCardLabelText");
    elements.wordOrderCardPool = document.getElementById("wordOrderCardPool");
    elements.wordOrderFeedbackText = document.getElementById("wordOrderFeedbackText");
    elements.wordOrderCorrectAnswerText = document.getElementById("wordOrderCorrectAnswerText");
    elements.wordOrderResultTagText = document.getElementById("wordOrderResultTagText");
    elements.wordOrderUndoBtn = document.getElementById("wordOrderUndoBtn");
    elements.wordOrderResetBtn = document.getElementById("wordOrderResetBtn");
    elements.wordOrderSubmitBtn = document.getElementById("wordOrderSubmitBtn");
    elements.wordOrderCompleteSummaryText = document.getElementById("wordOrderCompleteSummaryText");
    elements.wordOrderRestartBtn = document.getElementById("wordOrderRestartBtn");
    elements.wordOrderHomeBtn = document.getElementById("wordOrderHomeBtn");
    elements.translationTrainingBackBtn = document.getElementById("translationTrainingBackBtn");
    elements.translationTrainingQuestionIndexText = document.getElementById("translationTrainingQuestionIndexText");
    elements.translationTrainingLevelText = document.getElementById("translationTrainingLevelText");
    elements.translationTrainingEnglishText = document.getElementById("translationTrainingEnglishText");
    elements.translationTrainingOptionList = document.getElementById("translationTrainingOptionList");
    elements.translationTrainingFeedbackText = document.getElementById("translationTrainingFeedbackText");
    elements.translationTrainingStatusText = document.getElementById("translationTrainingStatusText");
    elements.translationTrainingRetryBtn = document.getElementById("translationTrainingRetryBtn");
    elements.translationTrainingNextBtn = document.getElementById("translationTrainingNextBtn");
    elements.translationTrainingQuestionPanel = document.getElementById("translationTrainingQuestionPanel");
    elements.translationTrainingCompletePanel = document.getElementById("translationTrainingCompletePanel");
    elements.translationTrainingEnglishReadText = document.getElementById("translationTrainingEnglishReadText");
    elements.translationTrainingJapaneseText = document.getElementById("translationTrainingJapaneseText");
    elements.translationTrainingNextQuestionBtn = document.getElementById("translationTrainingNextQuestionBtn");
    elements.confirmModal = document.getElementById("confirmModal");
    elements.confirmMessage = document.getElementById("confirmMessage");
    elements.confirmCancelBtn = document.getElementById("confirmCancelBtn");
    elements.confirmOkBtn = document.getElementById("confirmOkBtn");
  }

  function bindEvents() {
    const speakingHomeBtn = document.getElementById("openSpeakingFeatureBtn");
    if (speakingHomeBtn) {
      speakingHomeBtn.addEventListener("click", renderSpeakingHome);
    }

    const wordOrderHomeBtn = document.getElementById("openWordOrderTrainingBtn");
    if (wordOrderHomeBtn) {
      wordOrderHomeBtn.addEventListener("click", renderWordOrderRangeSelectScreen);
    }

    const translationTrainingHomeBtn = document.getElementById("openTranslationTrainingBtn");
    if (translationTrainingHomeBtn) {
      const runTranslationTraining = (event) => {
        startTranslationTraining(event);
      };
      translationTrainingHomeBtn.onclick = runTranslationTraining;
      translationTrainingHomeBtn.onmousedown = null;
      translationTrainingHomeBtn.ontouchstart = null;
      translationTrainingHomeBtn.onpointerdown = null;
      translationTrainingHomeBtn.removeEventListener("click", runTranslationTraining);
      translationTrainingHomeBtn.addEventListener("click", runTranslationTraining);
    }

    const startTypingBtn = document.getElementById("startTypingBtn");
    if (startTypingBtn) {
      startTypingBtn.addEventListener("click", () => startStudy("typing"));
    }
    document.getElementById("refreshCacheBtn").addEventListener("click", refreshMobileCache);
    document.getElementById("openAcquiredPointsScreenBtn").addEventListener("click", async () => {
      mobilePointHistoryVisibleCount = MOBILE_POINT_HISTORY_PAGE_SIZE;
      renderMobilePointSummaryScreen();
      showScreen("acquiredPointsScreen");
      await initializeMobilePointSyncForCurrentUser().catch(() => false);
      renderMobilePointSummaryScreen();
    });
    document.getElementById("openMobileLearningHistoryBtn").addEventListener("click", renderMobileAdminLearningHistoryScreen);
    document.getElementById("acquiredPointsHomeBtn").addEventListener("click", renderHome);
    document.getElementById("mobilePointsHistoryMoreBtn").addEventListener("click", () => {
      mobilePointHistoryVisibleCount += MOBILE_POINT_HISTORY_PAGE_SIZE;
      renderMobilePointSummaryScreen();
    });
    document.getElementById("openSettingsBtn").addEventListener("click", () => showScreen("settingsScreen"));
    document.getElementById("speakingHomeBackBtn").addEventListener("click", renderHome);
    const homeConversationSelectBtn = document.getElementById("openConversationSelectFromHomeBtn");
    if (homeConversationSelectBtn) {
      homeConversationSelectBtn.addEventListener("click", renderConversationSelectScreen);
    }
    document.getElementById("openConversationSelectBtn").addEventListener("click", renderConversationSelectScreen);
    document.getElementById("openSpeakingReviewTopBtn").addEventListener("click", renderSpeakingReviewTopScreen);
    document.getElementById("speakingReviewTopBackBtn").addEventListener("click", renderSpeakingHome);
    elements.startTodayReviewBtn.addEventListener("click", startTodaySpeakingReview);
    elements.returnSpeakingReviewCompleteBtn.addEventListener("click", renderSpeakingReviewTopScreen);
    elements.pointRewardOkBtn.addEventListener("click", closePointRewardScreen);
    document.getElementById("openSpeakingVocabBtn").addEventListener("click", renderSpeakingVocabScreen);
    document.getElementById("openVocabularySampleBtn").addEventListener("click", startVocabularySample);
    const openVocabularyPastHistoryBtn = document.getElementById("openVocabularyPastHistoryBtn");
    if (openVocabularyPastHistoryBtn) {
      openVocabularyPastHistoryBtn.addEventListener("click", openVocabularyPastHistoryScreen);
    }
    const vocabularyPracticeHistoryBtn = document.getElementById("vocabularyPracticeHistoryBtn");
    if (vocabularyPracticeHistoryBtn) {
      vocabularyPracticeHistoryBtn.addEventListener("click", openVocabularyTodayHistoryScreen);
    }
    document.querySelectorAll(".vocabulary-progress-stat-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const status = String(button.dataset.vocabularyStatus || "learning");
        openVocabularyProgressList("status", status);
      });
    });
    const vocabularyProgressListBackBtn = document.getElementById("vocabularyProgressListBackBtn");
    if (vocabularyProgressListBackBtn) {
      vocabularyProgressListBackBtn.addEventListener("click", renderSpeakingHome);
    }
    elements.vocabularySampleBackBtn.addEventListener("click", () => {
      stopVocabularySampleTimer();
      if (state.vocabularySample && !state.vocabularySample.historyFinalized) {
        finalizeVocabularySampleHistorySession("interrupted");
      }
      state.vocabularySample = null;
      renderSpeakingHome();
    });
    elements.vocabularySamplePronunciationBtn.addEventListener("click", handleVocabularySamplePronunciationCheck);
    elements.vocabularySamplePronunciationOkBtn.addEventListener("click", () => handleVocabularySampleChoice("pronunciation", "ok"));
    elements.vocabularySamplePronunciationNgBtn.addEventListener("click", () => handleVocabularySampleChoice("pronunciation", "ng"));
    elements.vocabularySampleMeaningBtn.addEventListener("click", handleVocabularySampleMeaningReveal);
    elements.vocabularySampleMeaningOkBtn.addEventListener("click", () => handleVocabularySampleChoice("meaning", "ok"));
    elements.vocabularySampleMeaningNgBtn.addEventListener("click", () => handleVocabularySampleChoice("meaning", "ng"));
    if (typeof openVocabularyTodayHistoryScreen === "function") {
      elements.vocabularySampleHistoryBtn.addEventListener("click", openVocabularyTodayHistoryScreen);
    } else if (typeof window.openVocabularyTodayHistoryScreen === "function") {
      elements.vocabularySampleHistoryBtn.addEventListener("click", window.openVocabularyTodayHistoryScreen);
    } else {
      elements.vocabularySampleHistoryBtn.addEventListener("click", () => {
        if (typeof window.openVocabularyTodayHistoryScreen === "function") {
          window.openVocabularyTodayHistoryScreen();
        }
      });
    }
    if (elements.vocabularySamplePastHistoryBtn) {
      elements.vocabularySamplePastHistoryBtn.addEventListener("click", openVocabularyPastHistoryScreen);
    }
    if (elements.vocabularyPastHistoryBackBtn) {
      elements.vocabularyPastHistoryBackBtn.addEventListener("click", () => {
        if (state.vocabularySample) {
          renderVocabularySampleScreen();
          return;
        }
        renderSpeakingHome();
      });
    }
    if (document.getElementById("vocabularyTeacherCheckPastHistoryBtn")) {
      document.getElementById("vocabularyTeacherCheckPastHistoryBtn").addEventListener("click", openVocabularyTeacherCheckScreen);
    }
    elements.vocabularyTodayHistoryBackBtn.addEventListener("click", () => {
      if (state.vocabularySample) {
        resumeVocabularySampleTimer();
        renderVocabularySampleScreen();
        return;
      }
      renderSpeakingHome();
    });
    if (elements.vocabularyPastHistoryFilters) {
      elements.vocabularyPastHistoryFilters.querySelectorAll(".vocabulary-history-filter-btn").forEach((button) => {
        button.addEventListener("click", () => {
          const filterValue = String(button.dataset.filter || "all");
          state.vocabularyPastHistoryFilter = ["all", "learning", "pending", "checked"].includes(filterValue) ? filterValue : "all";
          renderVocabularyPastHistoryScreen();
        });
      });
    }
    if (elements.vocabularyTeacherCheckBtn) {
      elements.vocabularyTeacherCheckBtn.addEventListener("click", openVocabularyTeacherCheckScreen);
    }
    if (elements.vocabularyTeacherCheckBackBtn) {
      elements.vocabularyTeacherCheckBackBtn.addEventListener("click", openVocabularyPastHistoryScreen);
    }
    if (elements.vocabularyTeacherCheckPrevBtn) {
      elements.vocabularyTeacherCheckPrevBtn.addEventListener("click", () => {
        if (!state.teacherCheckSession) return;
        const session = state.teacherCheckSession;
        const pageInfo = getVocabularyTeacherCheckPageInfo(session);
        if (pageInfo.pageIndex <= 0) return;
        session.pageIndex = pageInfo.pageIndex - 1;
        renderVocabularyTeacherCheckScreen();
      });
    }
    if (elements.vocabularyTeacherCheckNextBtn) {
      elements.vocabularyTeacherCheckNextBtn.addEventListener("click", () => {
        if (!state.teacherCheckSession) return;
        const session = state.teacherCheckSession;
        const pageInfo = getVocabularyTeacherCheckPageInfo(session);
        const pageCandidates = pageInfo.pageCandidates;
        const hasUnfinished = pageCandidates.some((candidate) => {
          const decision = session.decisions?.[candidate.id] || { pronunciation: "none", meaning: "none" };
          return String(decision.pronunciation || "none").trim() === "none" || String(decision.meaning || "none").trim() === "none";
        });
        if (hasUnfinished) {
          const metaEl = elements.vocabularyTeacherCheckMeta;
          if (metaEl) metaEl.textContent = "未判定が残っています";
          window.alert("現在の10問に未判定があります。発音と意味の両方を判定してください。");
          return;
        }
        if (pageInfo.pageIndex >= pageInfo.pageCount - 1) return;
        session.pageIndex = pageInfo.pageIndex + 1;
        renderVocabularyTeacherCheckScreen();
      });
    }
    if (elements.vocabularyTeacherCheckCompleteBtn) {
      elements.vocabularyTeacherCheckCompleteBtn.addEventListener("click", () => {
        if (!state.teacherCheckSession) return;
        const session = state.teacherCheckSession;
        const candidates = Array.isArray(session.candidates) ? session.candidates : [];
        const unmatched = candidates.filter((candidate) => {
          const decision = session.decisions?.[candidate.id] || { pronunciation: "none", meaning: "none" };
          return decision.pronunciation === "none" || decision.meaning === "none";
        });

        if (unmatched.length) {
          const first = unmatched[0];
          const metaEl = elements.vocabularyTeacherCheckMeta;
          if (metaEl) {
            metaEl.textContent = `未判定: ${first.word}`;
          }
          window.alert("未判定の単語があります。発音と意味の両方を判定してください。")
          return;
        }

        const now = Date.now();
        Object.entries(session.decisions || {}).forEach(([wordId, decision]) => {
          if (!decision || typeof decision !== "object") return;
          const targetEntry = getVocabularyStudyEntryById(String(wordId || "").trim()) || null;
          if (!targetEntry) return;

          const pronunciationSkill = targetEntry.pronunciation || null;
          const meaningSkill = targetEntry.meaningState || null;

          if (decision.pronunciation && decision.pronunciation !== "none" && pronunciationSkill) {
            applyTeacherCheckState(pronunciationSkill, "pronunciation", decision.pronunciation, { entry: targetEntry, now });
          }
          if (decision.meaning && decision.meaning !== "none" && meaningSkill) {
            applyTeacherCheckState(meaningSkill, "meaning", decision.meaning, { entry: targetEntry, now });
          }
          if (decision.pronunciation === "none" && pronunciationSkill) {
            applyTeacherCheckState(pronunciationSkill, "pronunciation", "none", { entry: targetEntry, now });
          }
          if (decision.meaning === "none" && meaningSkill) {
            applyTeacherCheckState(meaningSkill, "meaning", "none", { entry: targetEntry, now });
          }
        });

        state.vocabularyStudy = mergeVocabularyStudyStateWithCurrentBank(state.vocabularyStudy || buildVocabularyRealStudyState(), getVocabularyRealWordBank());
        saveState();
        saveMobileVocabularyStateForSync(state.vocabularyStudy, getMobileVocabularySyncUid());
        scheduleMobileVocabularySync();
        state.teacherCheckSession = null;
        renderVocabularyPastHistoryScreen();
      });
    }
    elements.vocabularySampleNextBtn.addEventListener("click", continueVocabularySample);
    elements.vocabularySampleCompleteBackBtn.addEventListener("click", () => {
      stopVocabularySampleTimer();
      if (state.vocabularySample && !state.vocabularySample.historyFinalized) {
        finalizeVocabularySampleHistorySession("completed");
      }
      state.vocabularySample = null;
      renderSpeakingHome();
    });
    document.getElementById("conversationSelectBackBtn").addEventListener("click", renderSpeakingHome);
    document.getElementById("conversationDaySelectBackBtn").addEventListener("click", renderConversationSelectScreen);
    document.getElementById("speakingVocabBackBtn").addEventListener("click", renderSpeakingHome);
    document.getElementById("speakingWordWeekSelectBackBtn").addEventListener("click", renderSpeakingVocabScreen);
    document.getElementById("speakingWordDaySelectBackBtn").addEventListener("click", handleSpeakingWordDaySelectBack);
    document.getElementById("speakingWordPracticeBackBtn").addEventListener("click", leaveSpeakingWordPracticeToDaySelect);
    document.getElementById("speakingWordCompleteBackBtn").addEventListener("click", leaveSpeakingWordPracticeToDaySelect);
    document.getElementById("startVocabularyBtn").addEventListener("click", startVocabularyPracticeFromConversationSelector);
    document.getElementById("startConversationBtn").addEventListener("click", startConversationPracticeFromSelector);
    elements.startSelectedConversationDaysBtn.addEventListener("click", startConversationPracticeFromSelectedDays);
    document.getElementById("startSpeakingWordPracticeBtn").addEventListener("click", startSpeakingVocabularyPractice);
    elements.speakingWordPlayBtn.addEventListener("click", playSpeakingWordAudio);
    elements.speakingWordMeaningToggleBtn.addEventListener("click", toggleSpeakingWordMeaning);
    elements.speakingWordExamplePlayBtn.addEventListener("click", playSpeakingWordExampleAudio);
    elements.speakingWordExampleJapaneseToggleBtn.addEventListener("click", toggleSpeakingWordExampleJapanese);
    elements.speakingWordMicBtn.addEventListener("click", beginSpeakingWordExampleRecognition);
    elements.speakingWordNextBtn.addEventListener("click", moveToNextSpeakingWordItem);
    document.getElementById("conversationBackBtn").addEventListener("click", leaveSpeakingPractice);
    elements.conversationBackToABtn.addEventListener("click", returnToSpeakingLevel1QuestionLine);
    document.getElementById("conversationCompleteBackBtn").addEventListener("click", leaveSpeakingPractice);
    document.getElementById("returnConversationSelectBtn").addEventListener("click", renderConversationSelectScreen);
    elements.speakingHintBtn.addEventListener("click", showNextSpeakingHint);
    elements.closeSpeakingHintBtn.addEventListener("click", closeSpeakingHint);
    elements.toggleJapaneseBtn.addEventListener("click", toggleSpeakingJapanese);
    elements.replayConversationAudioBtn.addEventListener("click", playCurrentSpeakingLine);
    elements.conversationMicBtn.addEventListener("click", beginConversationLevel1Recognition);
    elements.nextConversationLineBtn.addEventListener("click", moveToNextSpeakingLine);
    elements.nextConversationBtn.addEventListener("click", moveToNextSpeakingConversation);
    document.getElementById("settingsBackBtn").addEventListener("click", renderHome);
    document.getElementById("wordOrderBackBtn").addEventListener("click", leaveWordOrderTrainingToHome);
    elements.wordOrderDayRangeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setWordOrderDayRangeValue(button.dataset.rangeValue || "");
      });
    });
    elements.wordOrderStartBtn.addEventListener("click", startWordOrderTraining);
    elements.wordOrderUndoBtn.addEventListener("click", undoWordOrderSelection);
    elements.wordOrderResetBtn.addEventListener("click", resetWordOrderSelection);
    elements.wordOrderSubmitBtn.addEventListener("click", submitWordOrderAnswer);
    elements.wordOrderRestartBtn.addEventListener("click", startWordOrderTraining);
    elements.wordOrderHomeBtn.addEventListener("click", leaveWordOrderTrainingToHome);
    elements.translationTrainingBackBtn.addEventListener("click", () => {
      recordMobileLearningActivity();
      const earnedPoints = Math.max(0, Number(state.translationTraining?.historyEarnedPoints) || 0);
      if (state.translationTraining && state.learningHistorySession) {
        finalizeMobileLearningHistorySession({
          completedReason: "interrupted",
          mode: "和訳トレーニング",
          dayNumber: "",
          summary: buildTranslationLearningHistorySummary(state.translationTraining)
        });
      }
      clearTranslationTrainingSpeechTimer();
      state.translationTraining = null;
      state.translationTrainingCurrentPartIndex = 0;
      state.translationTrainingPartCompleted = false;
      state.translationTrainingSpeechDetected = false;
      if (earnedPoints > 0) {
        openPointRewardScreen("translation", earnedPoints, { onClose: renderHome });
        return;
      }
      renderHome();
    });
    elements.translationTrainingRetryBtn.addEventListener("click", () => {
      retreatTranslationTrainingPart();
    });
    elements.translationTrainingNextBtn.addEventListener("click", advanceTranslationTrainingPart);
    if (elements.translationTrainingNextQuestionBtn) {
      elements.translationTrainingNextQuestionBtn.addEventListener("click", advanceTranslationTrainingQuestion);
    }
    document.getElementById("comingSoonBackBtn").addEventListener("click", renderHome);
    document.getElementById("studyBackBtn").addEventListener("click", confirmLeaveStudy);
    document.getElementById("retrySessionBtn").addEventListener("click", () => startStudy(state.lastSessionMode || "speaking"));
    document.getElementById("returnHomeBtn").addEventListener("click", renderHome);
    document.getElementById("runMicTestBtn").addEventListener("click", runMicTest);
    document.getElementById("resetMobileDataBtn").addEventListener("click", resetMobileData);
    elements.showMobileUpdateHistoryBtn.addEventListener("click", () => {
      showScreen("mobileUpdateHistoryScreen");
      elements.mobileUpdateHistoryGate.classList.remove("hidden");
      hideMobileUpdateHistory();
      elements.mobileUpdateHistoryPasswordInput.value = "";
      elements.mobileUpdateHistoryPasswordInput.focus();
    });
    elements.mobileUpdateHistoryUnlockBtn.addEventListener("click", unlockMobileUpdateHistory);
    elements.mobileUpdateHistoryPasswordInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      unlockMobileUpdateHistory();
    });
    elements.openMobileAdminFromUpdateBtn.addEventListener("click", renderMobileAdminLearningHistoryScreen);
    elements.mobileUpdateHistoryBackBtn.addEventListener("click", () => showScreen("settingsScreen"));
    elements.mobileAdminLearningHistoryBackBtn.addEventListener("click", renderHome);
    if (elements.mobileAdminLearningHistoryUnlockBtn) {
      elements.mobileAdminLearningHistoryUnlockBtn.addEventListener("click", unlockMobileAdminLearningHistory);
    }
    if (elements.mobileAdminLearningHistoryPinInput) {
      elements.mobileAdminLearningHistoryPinInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        unlockMobileAdminLearningHistory();
      });
    }
    document.getElementById("confirmCancelBtn").addEventListener("click", hideConfirm);
    elements.confirmOkBtn.addEventListener("click", () => {
      const action = state.confirmAction;
      hideConfirm();
      if (typeof action === "function") {
        action();
      }
    });
    elements.speechActionBtn.addEventListener("click", beginSpeechRecognition);
    elements.typingSubmitBtn.addEventListener("click", submitTypingAnswer);
    elements.typingAnswerInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      submitTypingAnswer();
    });

    [...document.querySelectorAll('input[name="speechRateMode"]')].forEach((radio) => {
      radio.addEventListener("change", () => updateSpeechRateMode(radio.value));
    });
    [...document.querySelectorAll('input[name="speakingWordRangeMode"]')].forEach((radio) => {
      radio.addEventListener("change", () => updateSpeakingVocabularyRangeMode(radio.value));
    });
    if (elements.startDaySelect && elements.endDaySelect) {
      elements.startDaySelect.addEventListener("change", () => updateDayRange(elements.startDaySelect.value, elements.endDaySelect.value));
      elements.endDaySelect.addEventListener("change", () => updateDayRange(elements.startDaySelect.value, elements.endDaySelect.value));
    }
    elements.conversationWeekSelect.addEventListener("change", () => updateConversationWeekSelection(elements.conversationWeekSelect.value));
    elements.speakingWordStartDaySelect.addEventListener("change", () => updateSpeakingVocabularyDayRange(elements.speakingWordStartDaySelect.value, elements.speakingWordEndDaySelect.value));
    elements.speakingWordEndDaySelect.addEventListener("change", () => updateSpeakingVocabularyDayRange(elements.speakingWordStartDaySelect.value, elements.speakingWordEndDaySelect.value));
    document.addEventListener("visibilitychange", handlePageVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", () => {
      setMobileReloadNavigationGuard();
    });
    window.addEventListener("online", () => {
      flushMobilePendingLearningHistoryEntries().catch(() => 0);
      scheduleMobilePointStateSync();
      scheduleWordOrderStatsSync(loadWordOrderStatsMap());
    });
  }

  function initialize() {
    window.startTranslationTraining = startTranslationTraining;
    window.startVocabularySample = startVocabularySample;
    loadState();
    mobilePendingLearningHistoryEntries = loadMobilePendingLearningHistoryEntries();
    loadSpeakingProgress();
    loadSpeakingReviewStats();
    loadSpeakingWordDayCompletionMap();
    loadSpeakingReviewSession();
    loadRecentSpeakingProgress();
    loadVocabularyTodayHistoryMap();
    bindElements();
    renderMobileVersionInfo();
    syncFormFromState();
    bindEvents();
    bindMobileAuthState();
    flushMobilePendingLearningHistoryEntries().catch(() => 0);
    if (isMobileReloadNavigation() && !getVocabularyTeacherCheckRouteScreen()) {
      showScreen("homeScreen");
      renderHome();
    } else if (getVocabularyTeacherCheckRouteScreen()) {
      openVocabularyTeacherCheckScreen();
    }
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();