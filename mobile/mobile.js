(function () {
  const MOBILE_LEARNING_HISTORY_STORAGE_KEY = "english-trainer-mobile-learning-history-v1";
  const MOBILE_LEARNING_HISTORY_MAX_ENTRIES = 1000;
  const MOBILE_LEARNING_HISTORY_ACTIVE_TIMEOUT_MS = 3 * 60 * 1000;
  const MOBILE_ADMIN_LEARNING_HISTORY_PIN = "12345";
  const MOBILE_STORAGE_KEY = "englishTrainerMobile_state_v1";
  const SPEAKING_PROGRESS_KEY = "englishTrainerSpeakingProgress";
  const SPEAKING_RECENT_PROGRESS_KEY = "englishTrainerSpeakingRecentProgress_v1";
  const SPEAKING_REVIEW_STATS_KEY = "englishTrainerSpeakingReviewStats_v1";
  const SPEAKING_REVIEW_SESSION_KEY = "englishTrainerSpeakingReviewSession_v1";
  const SPEAKING_TODAY_REVIEW_TARGET_COUNT = 12;
  const SETTINGS_INFO = window.ENGLISH_TRAINER_RELEASE_INFO || Object.freeze({
    adminPassword: "12345",
    releaseHistory: []
  });
  const APP_VERSION = SETTINGS_INFO.releaseHistory[0]?.version || "0/0000/0000";
  const MOBILE_DAY_MIN = 1;
  const MOBILE_DAY_MAX = 40;
  const SPEAKING_WEEK_MIN = 1;
  const SPEAKING_WEEK_MAX = 20;
  const ENABLE_SPEAKING_KEYWORD_DEBUG = true;
  const SESSION_QUESTION_COUNT = 10;
  const MOBILE_SPEECH_RATES = {
    slow: 0.82,
    normal: 0.92
  };
  const WEEKDAY_LABELS_JA = ["日", "月", "火", "水", "木", "金", "土"];

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let mobileAdminLearningHistorySelectedDayKey = "";

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
      endDay: MOBILE_DAY_MAX
    },
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
    learningHistorySession: null,
    currentScreen: "homeScreen",
    confirmAction: null,
    micTestRecognition: null
  };

  const elements = {};

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
      const questionTypes = Array.isArray(session?.questions)
        ? [...new Set(session.questions.map((item) => String(item?.type || "").trim()).filter(Boolean))]
        : [];
      if (questionTypes.length === 1) {
        if (questionTypes[0] === "word") return "単語学習";
        if (questionTypes[0] === "phrase") return "熟語学習";
      }
      return "単語・熟語学習";
    }
    if (normalizedMode === "conversation") return "会話練習";
    if (normalizedMode === "review") return "過去の間違い";
    return "その他";
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
      mode: typeof raw.mode === "string" ? raw.mode : "その他",
      dayNumber: typeof raw.dayNumber === "string" ? raw.dayNumber : "",
      questionCount: Math.max(0, Number(raw.questionCount) || 0),
      correctCount: Math.max(0, Number(raw.correctCount) || 0),
      accuracy: Math.max(0, Math.min(100, Number(raw.accuracy) || 0)),
      completedReason: raw.completedReason === "interrupted" ? "interrupted" : "completed",
      deviceType: raw.deviceType === "mobile" ? "mobile" : "mobile",
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

  function formatMobileLearningHistoryDateLabel(dayKey) {
    const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(dayKey || ""));
    if (!match) return String(dayKey || "");
    return `${Number(match[2])}/${Number(match[3])}`;
  }

  function formatMobileLearningHistoryClockRange(startedAt, endedAt) {
    const startParts = getMobileLearningHistoryJstParts(startedAt);
    const endParts = getMobileLearningHistoryJstParts(endedAt);
    return `${startParts.hour || "00"}:${startParts.minute || "00"}〜${endParts.hour || "00"}:${endParts.minute || "00"}`;
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

  function classifyMobileLearningHistoryMode(mode) {
    const normalized = String(mode || "").trim();
    if (!normalized) return "other";
    if (normalized.includes("Day") || normalized === "Day学習" || normalized === "day") return "day";
    if (normalized.includes("熟語")) return "phrase";
    if (normalized.includes("単語")) return "word";
    if (normalized.includes("過去") || normalized === "review") return "review";
    return "other";
  }

  function createMobileLearningHistoryModeTotals() {
    return {
      day: { label: "Day学習", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      word: { label: "単語", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      phrase: { label: "熟語", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      review: { label: "過去の間違い", activeStudySeconds: 0, questionCount: 0, correctCount: 0 },
      other: { label: "その他", activeStudySeconds: 0, questionCount: 0, correctCount: 0 }
    };
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
      const modeGroup = classifyMobileLearningHistoryMode(entry.mode);
      addMobileLearningHistoryTotals(bucket.modeTotals[modeGroup] || bucket.modeTotals.other, entry);
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
      const modeGroup = classifyMobileLearningHistoryMode(entry.mode);
      addMobileLearningHistoryTotals(todaySummary.modeTotals[modeGroup] || todaySummary.modeTotals.other, entry);
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

  function appendMobileLearningHistoryEntry(entry) {
    const current = loadMobileLearningHistoryEntries();
    current.push(entry);
    saveMobileLearningHistoryEntries(current);
  }

  function startMobileLearningHistorySession(meta = {}) {
    state.learningHistorySession = {
      source: String(meta.source || "other"),
      mode: String(meta.mode || "other"),
      dayNumber: String(meta.dayNumber || ""),
      startedAt: Number(meta.startedAt) || Date.now(),
      lastActivityAt: Number(meta.startedAt) || Date.now(),
      activeStudyMs: 0,
      ticketSnapshot: getMobileLearningTicketSnapshot(),
      meta: { ...meta }
    };
  }

  function recordMobileLearningActivity() {
    const session = state.learningHistorySession;
    if (!session) return;
    const now = Date.now();
    const lastActivityAt = Number(session.lastActivityAt) || session.startedAt || now;
    const delta = now - lastActivityAt;
    if (delta > 0 && delta <= MOBILE_LEARNING_HISTORY_ACTIVE_TIMEOUT_MS) {
      session.activeStudyMs += delta;
    }
    session.lastActivityAt = now;
  }

  function finalizeMobileLearningHistorySession(options = {}) {
    const session = state.learningHistorySession;
    if (!session) return;
    const now = Number(options.endedAt) || Date.now();
    const lastActivityAt = Number(session.lastActivityAt) || session.startedAt || now;
    const delta = now - lastActivityAt;
    if (delta > 0 && delta <= MOBILE_LEARNING_HISTORY_ACTIVE_TIMEOUT_MS) {
      session.activeStudyMs += delta;
    }

    const summary = options.summary || {};
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
      accuracy: Math.max(0, Math.min(100, Number(summary.accuracy) || 0)),
      completedReason: options.completedReason === "interrupted" ? "interrupted" : "completed",
      deviceType: "mobile",
      ticket: {
        earned: { count: 0 },
        used: { count: 0 }
      }
    });
    if (entry) {
      appendMobileLearningHistoryEntry(entry);
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
        questionCount: reviewQueue.length,
        correctCount: completed,
        accuracy: reviewQueue.length ? Math.round((completed / reviewQueue.length) * 100) : 0
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
    const entries = loadMobileLearningHistoryEntries().slice().sort((left, right) => Number(right.endedAt) - Number(left.endedAt));
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
    const canMoveNext = shiftMobileLearningHistoryDayKey(selectedDayKey, 1) <= todayDayKey;
    const selectedDayHasEntries = selectedDayEntries.length > 0;

    elements.mobileAdminLearningHistoryPanel.innerHTML = `
      <div class="mobile-admin-history-view">
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
                <span>${selectedDaySummary.accuracy}%</span>
              </div>
              <div class="mobile-admin-history-mode-summary-list">
                ${Object.values(selectedDaySummary.modeTotals).filter((entry) => entry.questionCount > 0 || entry.activeStudySeconds > 0).map((entry) => `
                  <div class="mobile-admin-history-mode-summary-row">
                    <span>${escapeHtml(entry.label)}</span>
                    <span>${escapeHtml(formatMobileLearningDuration(entry.activeStudySeconds))}</span>
                    <span>${entry.questionCount}問</span>
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
                const ticketText = `${Math.max(0, Number(entry.ticket?.earned?.count) || 0)} / ${Math.max(0, Number(entry.ticket?.used?.count) || 0)}`;
                return `
                  <div class="mobile-admin-history-detail-item">
                    <p class="mobile-admin-history-detail-time">${formatMobileLearningHistoryClockRange(entry.startedAt, entry.endedAt)}</p>
                    <p class="mobile-admin-history-detail-mode">${escapeHtml(entry.mode || "-")}</p>
                    <p class="mobile-admin-history-detail-meta">${escapeHtml(entry.dayNumber || "-")}</p>
                    <p class="mobile-admin-history-detail-meta">${formatMobileLearningDuration(entry.activeStudySeconds)}</p>
                    <p class="mobile-admin-history-detail-meta">${Math.max(0, Number(entry.questionCount) || 0)}問</p>
                    <p class="mobile-admin-history-detail-meta">${Math.max(0, Number(entry.accuracy) || 0)}%</p>
                    <p class="mobile-admin-history-detail-meta">${completionLabel}</p>
                    <p class="mobile-admin-history-detail-ticket">チケット ${ticketText}</p>
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
        if (shift === "prev") {
          mobileAdminLearningHistorySelectedDayKey = shiftMobileLearningHistoryDayKey(selectedDayKey, -1);
        } else if (shift === "next" && canMoveNext) {
          mobileAdminLearningHistorySelectedDayKey = shiftMobileLearningHistoryDayKey(selectedDayKey, 1);
        }
        if (mobileAdminLearningHistorySelectedDayKey > todayDayKey) {
          mobileAdminLearningHistorySelectedDayKey = todayDayKey;
        }
        renderMobileAdminLearningHistoryList();
      });
    });
    elements.mobileAdminLearningHistoryPanel.classList.remove("hidden");
  }

  function unlockMobileAdminLearningHistory() {
    if (!elements.mobileAdminLearningHistoryPinInput || !elements.mobileAdminLearningHistoryPanel) return;
    if (elements.mobileAdminLearningHistoryPinInput.value !== MOBILE_ADMIN_LEARNING_HISTORY_PIN) {
      hideMobileAdminLearningHistory();
      if (elements.mobileAdminLearningHistoryStatusText) {
        elements.mobileAdminLearningHistoryStatusText.textContent = "PIN が違います。";
        elements.mobileAdminLearningHistoryStatusText.classList.remove("hidden");
      }
      return;
    }

    renderMobileAdminLearningHistoryList();
    if (elements.mobileAdminLearningHistoryStatusText) {
      elements.mobileAdminLearningHistoryStatusText.textContent = "";
      elements.mobileAdminLearningHistoryStatusText.classList.add("hidden");
    }
  }

  function renderMobileAdminLearningHistoryScreen() {
    hideMobileAdminLearningHistory();
    if (elements.mobileAdminLearningHistoryPinInput) {
      elements.mobileAdminLearningHistoryPinInput.value = "";
    }
    showScreen("mobileAdminLearningHistoryScreen");
    if (elements.mobileAdminLearningHistoryPinInput) {
      elements.mobileAdminLearningHistoryPinInput.focus();
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
      }
    };
  }

  function createDefaultSpeakingUiState() {
    return {
      selectedConversationWeekId: "",
      selectedConversationDayKeys: [],
      activeConversationDayKeys: [],
      vocabularyRangeMode: "auto",
      startDay: MOBILE_DAY_MIN,
      endDay: MOBILE_DAY_MAX
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
      }
    };
  }

  function loadState() {
    const raw = window.localStorage.getItem(MOBILE_STORAGE_KEY);
    if (!raw) {
      Object.assign(state, createDefaultMobileState());
      return;
    }
    try {
      Object.assign(state, sanitizeMobileState(JSON.parse(raw)));
    } catch (_error) {
      Object.assign(state, createDefaultMobileState());
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
        return;
      }
      entries.sort((a, b) => (Number(b.updatedAt) || 0) - (Number(a.updatedAt) || 0));
      state.speakingProgress = { ...entries[0] };
      setActiveSpeakingDayQueue([state.speakingProgress.dayKey], state.speakingProgress.dayKey);
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
      state.speakingDayProgressMap[storageId] = sanitizeSpeakingProgress(state.speakingProgress);
    }
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

  function saveState() {
    const snapshot = {
      settings: state.settings,
      stats: state.stats
    };
    window.localStorage.setItem(MOBILE_STORAGE_KEY, JSON.stringify(snapshot));
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

  function buildTodayReviewQueue() {
    const allRefs = getAllSpeakingConversationRefs();
    const queuedIds = new Set();
    const queue = [];

    const appendUnique = (conversationRef) => {
      if (!conversationRef) return;
      if (!conversationRef.weekId || !conversationRef.dayKey || !conversationRef.conversationId) return;
      if (queuedIds.has(conversationRef.conversationId)) return;
      queuedIds.add(conversationRef.conversationId);
      queue.push(conversationRef);
    };

    const unfinished = [];
    const others = [];
    allRefs.forEach((conversationRef) => {
      const spokenCount = countSpeakingConversationSpokenTotal(conversationRef);
      if (spokenCount < 3) {
        unfinished.push(conversationRef);
      } else {
        others.push(conversationRef);
      }
    });

    unfinished.forEach((conversationRef) => appendUnique(conversationRef));
    others.forEach((conversationRef) => appendUnique(conversationRef));

    return queue.slice(0, SPEAKING_TODAY_REVIEW_TARGET_COUNT);
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
    const plannedQueue = getTodayReviewPlannedQueue();
    state.speakingReviewPlannedQueue = plannedQueue;
    elements.todayReviewPlannedCountText.textContent = `${plannedQueue.length}会話`;
    elements.startTodayReviewBtn.textContent = "▶ 今日の復習を始める";
    elements.startTodayReviewBtn.disabled = plannedQueue.length <= 0;
    showScreen("speakingReviewTopScreen");
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
    return weekNumber >= 1 && weekNumber <= 5;
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
    const availableWeeks = getSpeakingWeeks().filter((week) => week.shortConversations.length > 0);
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

  function showScreen(screenId) {
    ["homeScreen", "speakingHomeScreen", "speakingReviewTopScreen", "conversationSelectScreen", "conversationDaySelectScreen", "speakingVocabScreen", "conversationPracticeScreen", "conversationCompleteScreen", "studyScreen", "resultScreen", "settingsScreen", "mobileAdminLearningHistoryScreen", "comingSoonScreen"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.toggle("active", id === screenId);
      }
    });
    state.currentScreen = screenId;
  }

  function renderHome() {
    hideMobileAdminLearningHistory();
    showScreen("homeScreen");
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

  function resumeRecentSpeakingProgress(weekId) {
    const entry = state.recentSpeakingProgress.find((item) => item.weekId === weekId);
    const progress = sanitizeSpeakingProgress(entry);
    const week = getSpeakingWeek(progress?.weekId);
    if (!entry || !progress || !week) {
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

  function getDayProgressSummaryText(week, dayKey) {
    const progress = getStoredSpeakingDayProgress(week.weekId, dayKey);
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

  function renderSpeakingHome() {
    showScreen("speakingHomeScreen");
  }

  function renderConversationSelectScreen() {
    const availableWeeks = getAvailableConversationWeeks();
    if (availableWeeks.length && !availableWeeks.some((week) => week.weekId === state.speakingUi.selectedConversationWeekId)) {
      state.speakingUi.selectedConversationWeekId = availableWeeks[0].weekId;
    }
    elements.conversationWeekSelect.value = String(state.speakingUi.selectedConversationWeekId || "");
    renderSpeakingRecentProgressList();

    showScreen("conversationSelectScreen");
  }

  function renderSpeakingVocabScreen() {
    const dayMode = state.speakingUi.vocabularyRangeMode === "day";
    elements.speakingWordDayRangeFields.classList.toggle("hidden", !dayMode);
    [...document.querySelectorAll('input[name="speakingWordRangeMode"]')].forEach((radio) => {
      radio.checked = radio.value === state.speakingUi.vocabularyRangeMode;
    });
    elements.speakingWordStartDaySelect.value = String(state.speakingUi.startDay);
    elements.speakingWordEndDaySelect.value = String(state.speakingUi.endDay);

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
    renderConversationSelectScreen();
  }

  function updateSpeakingVocabularyRangeMode(value) {
    state.speakingUi.vocabularyRangeMode = value === "day" ? "day" : "auto";
    renderSpeakingVocabScreen();
  }

  function updateSpeakingVocabularyDayRange(startDay, endDay) {
    const start = clampDay(startDay);
    const end = clampDay(endDay);
    state.speakingUi.startDay = Math.min(start, end);
    state.speakingUi.endDay = Math.max(start, end);
    renderSpeakingVocabScreen();
  }

  function showConfirm(message, okLabel, onConfirm) {
    state.confirmAction = onConfirm;
    elements.confirmMessage.textContent = message;
    elements.confirmOkBtn.textContent = okLabel || "OK";
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

      recordSpeakingReviewConversationSpoken(item.conversationId);

      if (session.currentIndex < session.reviewQueue.length - 1) {
        session.currentIndex += 1;
        session.lineIndex = 0;
        state.speakingTranslationVisible = false;
        resetSpeakingHintState();
        state.speakingLineStatus = "awaitingStart";
        saveSpeakingReviewSession();
        renderConversationPracticeWithAutoPlay();
        return;
      }

      clearSpeakingReviewSession();
      resetSpeakingHintState();
      state.speakingTranslationVisible = false;
      state.speakingLineStatus = "awaitingStart";
      renderSpeakingReviewTopScreen();
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
    if (conversationId && !progress.completedConversationIds.includes(conversationId)) {
      progress.completedConversationIds.push(conversationId);
    }
    progress.conversationSetCount = Math.max(0, Number(progress.conversationSetCount) || 0) + 1;

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
      }, 1000);
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

      recordSpeakingReviewConversationSpoken(item.conversationId);

      if (session.currentIndex < session.reviewQueue.length - 1) {
        session.currentIndex += 1;
        session.lineIndex = 0;
        resetSpeakingHintState();
        state.speakingTranslationVisible = false;
        saveSpeakingReviewSession();
        renderConversationPractice();
        playCurrentSpeakingLine();
        return;
      }

      clearSpeakingReviewSession();
      resetSpeakingHintState();
      state.speakingTranslationVisible = false;
      state.speakingLineStatus = "awaitingStart";
      renderSpeakingReviewTopScreen();
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
    if (conversationId && !progress.completedConversationIds.includes(conversationId)) {
      progress.completedConversationIds.push(conversationId);
    }
    progress.conversationSetCount = Math.max(0, Number(progress.conversationSetCount) || 0) + 1;

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
    const completed = reviewActive
      ? false
      : Boolean(progress) && getSpeakingCompletedRounds(progress) >= getSpeakingTargetRounds(progress);
    if (state.learningHistorySession) {
      finalizeMobileLearningHistorySession({
        completedReason: completed ? "completed" : "interrupted",
        mode: reviewActive ? "review" : (isSpeakingLevel1Week(getSpeakingProgressWeek()) ? "speaking" : "conversation"),
        summary: getCurrentMobileLearningHistorySummary() || {}
      });
    }

    if (isReviewSpeakingModeActive()) {
      saveSpeakingReviewSession();
      renderSpeakingReviewTopScreen();
      return;
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
      renderConversationDaySelectScreen();
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
  }

  function handlePageVisibilityChange() {
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

  function handlePageHide() {
    stopSpeakingAudio();
  }

  function handlePageShow() {
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
  }

  function bindElements() {
    elements.dayRangeFields = document.getElementById("dayRangeFields");
    elements.startDaySelect = document.getElementById("startDaySelect");
    elements.endDaySelect = document.getElementById("endDaySelect");
    elements.conversationWeekSelect = document.getElementById("conversationWeekSelect");
    elements.todayReviewPlannedCountText = document.getElementById("todayReviewPlannedCountText");
    elements.startTodayReviewBtn = document.getElementById("startTodayReviewBtn");
    elements.conversationContinuePanel = document.getElementById("conversationContinuePanel");
    elements.recentProgressList = document.getElementById("recentProgressList");
    elements.conversationDaySelectWeekText = document.getElementById("conversationDaySelectWeekText");
    elements.conversationDayChecklist = document.getElementById("conversationDayChecklist");
    elements.startSelectedConversationDaysBtn = document.getElementById("startSelectedConversationDaysBtn");
    elements.speakingWordDayRangeFields = document.getElementById("speakingWordDayRangeFields");
    elements.speakingWordStartDaySelect = document.getElementById("speakingWordStartDaySelect");
    elements.speakingWordEndDaySelect = document.getElementById("speakingWordEndDaySelect");
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
    elements.openMobileAdminHistoryBtn = document.getElementById("openMobileAdminHistoryBtn");
    elements.mobileAdminLearningHistoryScreen = document.getElementById("mobileAdminLearningHistoryScreen");
    elements.mobileAdminLearningHistoryBackBtn = document.getElementById("mobileAdminLearningHistoryBackBtn");
    elements.mobileAdminLearningHistoryPinInput = document.getElementById("mobileAdminLearningHistoryPinInput");
    elements.mobileAdminLearningHistoryUnlockBtn = document.getElementById("mobileAdminLearningHistoryUnlockBtn");
    elements.mobileAdminLearningHistoryStatusText = document.getElementById("mobileAdminLearningHistoryStatusText");
    elements.mobileAdminLearningHistoryPanel = document.getElementById("mobileAdminLearningHistoryPanel");
    elements.confirmModal = document.getElementById("confirmModal");
    elements.confirmMessage = document.getElementById("confirmMessage");
    elements.confirmOkBtn = document.getElementById("confirmOkBtn");
  }

  function bindEvents() {
    document.getElementById("openSpeakingFeatureBtn").addEventListener("click", renderSpeakingHome);
    document.getElementById("startTypingBtn").addEventListener("click", () => startStudy("typing"));
    document.getElementById("refreshCacheBtn").addEventListener("click", refreshMobileCache);
    document.getElementById("openSettingsBtn").addEventListener("click", () => showScreen("settingsScreen"));
    elements.openMobileAdminHistoryBtn.addEventListener("click", renderMobileAdminLearningHistoryScreen);
    document.getElementById("speakingHomeBackBtn").addEventListener("click", renderHome);
    document.getElementById("openConversationSelectBtn").addEventListener("click", renderConversationSelectScreen);
    document.getElementById("openSpeakingReviewTopBtn").addEventListener("click", renderSpeakingReviewTopScreen);
    document.getElementById("speakingReviewTopBackBtn").addEventListener("click", renderSpeakingHome);
    elements.startTodayReviewBtn.addEventListener("click", startTodaySpeakingReview);
    document.getElementById("openSpeakingVocabBtn").addEventListener("click", renderSpeakingVocabScreen);
    document.getElementById("conversationSelectBackBtn").addEventListener("click", renderSpeakingHome);
    document.getElementById("conversationDaySelectBackBtn").addEventListener("click", renderConversationSelectScreen);
    document.getElementById("speakingVocabBackBtn").addEventListener("click", renderSpeakingHome);
    document.getElementById("startConversationBtn").addEventListener("click", startConversationPracticeFromSelector);
    elements.startSelectedConversationDaysBtn.addEventListener("click", startConversationPracticeFromSelectedDays);
    document.getElementById("startSpeakingWordPracticeBtn").addEventListener("click", startSpeakingVocabularyPractice);
    document.getElementById("conversationBackBtn").addEventListener("click", leaveSpeakingPractice);
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
    elements.mobileAdminLearningHistoryBackBtn.addEventListener("click", renderHome);
    document.getElementById("comingSoonBackBtn").addEventListener("click", renderHome);
    document.getElementById("studyBackBtn").addEventListener("click", confirmLeaveStudy);
    document.getElementById("retrySessionBtn").addEventListener("click", () => startStudy(state.lastSessionMode || "speaking"));
    document.getElementById("returnHomeBtn").addEventListener("click", renderHome);
    document.getElementById("runMicTestBtn").addEventListener("click", runMicTest);
    document.getElementById("resetMobileDataBtn").addEventListener("click", resetMobileData);
    elements.showMobileUpdateHistoryBtn.addEventListener("click", () => {
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
    elements.mobileAdminLearningHistoryUnlockBtn.addEventListener("click", unlockMobileAdminLearningHistory);
    elements.mobileAdminLearningHistoryPinInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      unlockMobileAdminLearningHistory();
    });
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
  }

  function initialize() {
    loadState();
    loadSpeakingProgress();
    loadSpeakingReviewStats();
    loadSpeakingReviewSession();
    loadRecentSpeakingProgress();
    bindElements();
    renderMobileVersionInfo();
    syncFormFromState();
    bindEvents();
    renderHome();
  }

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", initialize);
  } else {
    initialize();
  }
})();