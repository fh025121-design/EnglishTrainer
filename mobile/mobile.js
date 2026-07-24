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
  const SPEAKING_WORD_DAY_COMPLETION_KEY = "englishTrainerSpeakingWordDayCompletion_v1";
  const SPEAKING_REVIEW_MAX_GROUPS = 20;
  const SPEAKING_REVIEW_SET_SIZE = 4;
  const SETTINGS_INFO = window.ENGLISH_TRAINER_RELEASE_INFO || Object.freeze({
    adminPassword: "12345",
    releaseHistory: []
  });
  const APP_VERSION = SETTINGS_INFO.releaseHistory[0]?.version || "0/0000/0000";
  const MOBILE_POINT_STORAGE_KEY = "english-trainer-mobile-points-v1";
  const MOBILE_POINT_CONFIG = Object.freeze({
    homeworkSpeakingDailyMax: 30,
    reviewSpeakingDailyMax: 200,
    totalDailyMax: 230,
    homeworkCompletionReward: 10,
    seasonalNote: "summer-2026"
  });
  const MOBILE_POINT_REWARD_SCREEN_CONFIG = Object.freeze({
    homework: Object.freeze({
      title: "🎉 宿題の発話お疲れさま！",
      categoryLabel: "宿題発話"
    }),
    review: Object.freeze({
      title: "🎉 復習お疲れさま！",
      categoryLabel: "復習発話"
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

  function formatPointValue(value) {
    return `${new Intl.NumberFormat("ja-JP").format(Math.max(0, Math.floor(Number(value) || 0)))}P`;
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
    return {
      homeworkSpeakingPointsByDate,
      homeworkSpeakingCompletionsByDate,
      reviewSpeakingPointsByDate,
      reviewSpeakingCountByDate,
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
    const previousHomework = Math.max(0, Number(pointState.homeworkSpeakingPointsByDate?.[previousKey]) || 0);
    const previousReview = Math.max(0, Number(pointState.reviewSpeakingPointsByDate?.[previousKey]) || 0);
    pointState.todayEarned = todayHomework + todayReview;
    pointState.previousDayEarned = previousHomework + previousReview;

    const homeworkTotal = Object.values(pointState.homeworkSpeakingPointsByDate || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const reviewTotal = Object.values(pointState.reviewSpeakingPointsByDate || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
    const computedTotal = Math.floor(Math.max(0, homeworkTotal + reviewTotal));
    pointState.totalEarned = computedTotal;
    return pointState;
  }

  function getMobilePointSummary(pointState = getMobilePointState()) {
    const todayKey = getMobilePointJstDateKey(0);
    const todayHomework = Math.max(0, Number(pointState.homeworkSpeakingPointsByDate?.[todayKey]) || 0);
    const todayReview = Math.max(0, Number(pointState.reviewSpeakingPointsByDate?.[todayKey]) || 0);
    return {
      todayHomework,
      todayReview,
      todayEarned: Math.max(0, Number(pointState.todayEarned) || 0),
      previousDayEarned: Math.max(0, Number(pointState.previousDayEarned) || 0),
      totalEarned: Math.max(0, Number(pointState.totalEarned) || 0)
    };
  }

  function getReviewSpeakingRewardForCount(reviewCount) {
    const safeCount = Math.max(0, Math.floor(Number(reviewCount) || 0));
    if (safeCount <= 0) return 0;
    if (safeCount <= 10) return 5;
    if (safeCount <= 15) return 10;
    if (safeCount <= 20) return 20;
    return 0;
  }

  function calculateReviewSpeakingBatchReward(pointState, pendingCount) {
    const todayKey = getMobilePointJstDateKey(0);
    const currentReviewCount = Math.max(0, Number(pointState.reviewSpeakingCountByDate?.[todayKey]) || 0);
    const currentPoints = Math.max(0, Number(pointState.reviewSpeakingPointsByDate?.[todayKey]) || 0);
    const safePendingCount = Math.max(0, Math.floor(Number(pendingCount) || 0));
    const dailyCap = Math.max(0, Number(MOBILE_POINT_CONFIG.reviewSpeakingDailyMax) || 0);
    let remaining = Math.max(0, dailyCap - currentPoints);
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
    const earned = Math.max(0, Math.min(reward, MOBILE_POINT_CONFIG.homeworkSpeakingDailyMax - currentPoints));
    pointState.homeworkSpeakingPointsByDate[todayKey] = currentPoints + earned;
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
    let nextLine = "本日の復習ポイントは最大200Pです。";

    if (reviewCount < 10) {
      const remaining = 10 - reviewCount;
      nextLine = `あと${remaining}回で＋${remaining * 5}P獲得できます。`;
    } else if (reviewCount < 15) {
      const remaining = 15 - reviewCount;
      nextLine = `あと${remaining}回で＋${remaining * 10}P獲得できます。`;
    } else if (reviewCount < 20) {
      const remaining = 20 - reviewCount;
      nextLine = `あと${remaining}回で＋${remaining * 20}P獲得できます。`;
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

  function loadMobilePointState() {
    try {
      const raw = window.localStorage.getItem(MOBILE_POINT_STORAGE_KEY);
      if (!raw) return createDefaultMobilePointState();
      return sanitizeMobilePointState(JSON.parse(raw));
    } catch (_error) {
      return createDefaultMobilePointState();
    }
  }

  function saveMobilePointState(pointState) {
    mobilePointStateCache = hydrateMobilePointDaySnapshots(sanitizeMobilePointState(pointState));
    window.localStorage.setItem(MOBILE_POINT_STORAGE_KEY, JSON.stringify(mobilePointStateCache));
    return mobilePointStateCache;
  }

  function getMobilePointState() {
    if (!mobilePointStateCache) {
      mobilePointStateCache = hydrateMobilePointDaySnapshots(loadMobilePointState());
      saveMobilePointState(mobilePointStateCache);
    }
    return mobilePointStateCache;
  }

  function renderMobilePointSummaryScreen() {
    const todayText = document.getElementById("mobilePointsTodayText");
    const homeworkText = document.getElementById("mobilePointsHomeworkText");
    const homeworkCapText = document.getElementById("mobilePointsHomeworkCapText");
    const reviewText = document.getElementById("mobilePointsReviewText");
    const reviewCapText = document.getElementById("mobilePointsReviewCapText");
    const totalText = document.getElementById("mobilePointsTotalText");
    if (!todayText || !homeworkText || !homeworkCapText || !reviewText || !reviewCapText || !totalText) return;
    const pointState = getMobilePointState();
    const summary = getMobilePointSummary(pointState);
    todayText.textContent = formatPointValue(summary.todayEarned);
    homeworkText.textContent = formatPointValue(summary.todayHomework);
    reviewText.textContent = formatPointValue(summary.todayReview);
    homeworkCapText.classList.toggle("hidden", summary.todayHomework < MOBILE_POINT_CONFIG.homeworkSpeakingDailyMax);
    reviewCapText.classList.toggle("hidden", summary.todayReview < MOBILE_POINT_CONFIG.reviewSpeakingDailyMax);
    totalText.textContent = formatPointValue(summary.totalEarned);
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
    wordOrderTraining: null,
    learningHistorySession: null,
    currentScreen: "homeScreen",
    confirmAction: null,
    pointRewardScreenState: null,
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

  function getSelectedWordOrderDayRange() {
    const selectedValue = String(elements.wordOrderDayRangeSelect?.value || WORD_ORDER_DAY_RANGES[0].value);
    return WORD_ORDER_DAY_RANGES.find((item) => item.value === selectedValue) || WORD_ORDER_DAY_RANGES[0];
  }

  function getWordOrderQuestionsByDayRange(startDay, endDay) {
    const bank = Array.isArray(window.wordOrderTrainingBank) ? window.wordOrderTrainingBank : [];
    return bank
      .filter((entry) => {
        const day = Number(entry?.day);
        return Number.isFinite(day) && day >= startDay && day <= endDay;
      })
      .map((entry, index) => {
        const english = String(entry?.english || "").trim();
        const japanese = String(entry?.japanese || "").trim();
        const tag = String(entry?.tag || "").trim();
        const day = Math.floor(Number(entry?.day) || 0);
        const tokens = tokenizeWordOrderSentence(english);
        return {
          id: String(entry?.id || `word-order-day1-${index + 1}`),
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

  function renderWordOrderTraining() {
    const training = state.wordOrderTraining;
    if (!training) return;

    const questionPanel = elements.wordOrderQuestionPanel;
    const completePanel = elements.wordOrderCompletePanel;
    if (!questionPanel || !completePanel) return;

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
    const dayRange = getSelectedWordOrderDayRange();
    const questions = getWordOrderQuestionsByDayRange(dayRange.startDay, dayRange.endDay);
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
      renderWordOrderTraining();
      return;
    }
    training.questionIndex += 1;
    setupWordOrderQuestionState(training);
    renderWordOrderTraining();
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
    if (isCorrect) {
      training.correctCount += 1;
      training.feedback = "正解です！";
      training.correctAnswer = "";
    } else {
      training.incorrectCount += 1;
      training.feedback = "不正解です。";
      training.correctAnswer = buildWordOrderAnswerFromTokens(question.tokens);
    }

    training.phase = "judged";
    renderWordOrderTraining();
  }

  function showScreen(screenId) {
    ["homeScreen", "acquiredPointsScreen", "speakingHomeScreen", "speakingReviewTopScreen", "speakingReviewCompleteScreen", "pointRewardScreen", "conversationSelectScreen", "conversationDaySelectScreen", "speakingVocabScreen", "speakingWordWeekSelectScreen", "speakingWordDaySelectScreen", "speakingWordPracticeScreen", "speakingWordCompleteScreen", "conversationPracticeScreen", "conversationCompleteScreen", "studyScreen", "resultScreen", "settingsScreen", "mobileAdminLearningHistoryScreen", "wordOrderTrainingScreen", "comingSoonScreen"].forEach((id) => {
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
      recognitionInProgress: false,
      recognitionStatus: "",
      activeRecognition: null,
      pointAwarded: false
    };
    renderSpeakingWordPracticeScreen({ autoSpeakWord: true });
  }

  function leaveSpeakingWordPracticeToDaySelect() {
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
    if (practice.index >= practice.items.length - 1) {
      renderSpeakingWordCompleteScreen();
      return;
    }

    practice.index += 1;
    practice.showMeaning = false;
    practice.showExampleJapanese = false;
    practice.readCount = 0;
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

      recordSpeakingReviewConversationSpoken(item.conversationId);
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

      recordSpeakingReviewConversationSpoken(item.conversationId);
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
          if (state.learningHistorySession) {
            finalizeMobileLearningHistorySession({
              completedReason: "interrupted",
              mode: "review",
              summary: getCurrentMobileLearningHistorySummary() || {}
            });
          }
          saveSpeakingReviewSession();
          const earnedPoints = applyPendingReviewSpeakingPoints(state.speakingReviewSession, { persistSession: true });
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
          wordOrderTraining: null,
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
    elements.openMobileAdminHistoryBtn = document.getElementById("openMobileAdminHistoryBtn");
    elements.mobileAdminLearningHistoryScreen = document.getElementById("mobileAdminLearningHistoryScreen");
    elements.mobileAdminLearningHistoryBackBtn = document.getElementById("mobileAdminLearningHistoryBackBtn");
    elements.mobileAdminLearningHistoryPinInput = document.getElementById("mobileAdminLearningHistoryPinInput");
    elements.mobileAdminLearningHistoryUnlockBtn = document.getElementById("mobileAdminLearningHistoryUnlockBtn");
    elements.mobileAdminLearningHistoryStatusText = document.getElementById("mobileAdminLearningHistoryStatusText");
    elements.mobileAdminLearningHistoryPanel = document.getElementById("mobileAdminLearningHistoryPanel");
    elements.wordOrderQuestionPanel = document.getElementById("wordOrderQuestionPanel");
    elements.wordOrderCompletePanel = document.getElementById("wordOrderCompletePanel");
    elements.wordOrderDayRangeSelect = document.getElementById("wordOrderDayRangeSelect");
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
    elements.confirmModal = document.getElementById("confirmModal");
    elements.confirmMessage = document.getElementById("confirmMessage");
    elements.confirmCancelBtn = document.getElementById("confirmCancelBtn");
    elements.confirmOkBtn = document.getElementById("confirmOkBtn");
  }

  function bindEvents() {
    document.getElementById("openSpeakingFeatureBtn").addEventListener("click", renderSpeakingHome);
    document.getElementById("openWordOrderTrainingBtn").addEventListener("click", startWordOrderTraining);
    document.getElementById("startTypingBtn").addEventListener("click", () => startStudy("typing"));
    document.getElementById("refreshCacheBtn").addEventListener("click", refreshMobileCache);
    document.getElementById("openAcquiredPointsScreenBtn").addEventListener("click", () => {
      renderMobilePointSummaryScreen();
      showScreen("acquiredPointsScreen");
    });
    document.getElementById("acquiredPointsHomeBtn").addEventListener("click", renderHome);
    document.getElementById("openSettingsBtn").addEventListener("click", () => showScreen("settingsScreen"));
    elements.openMobileAdminHistoryBtn.addEventListener("click", renderMobileAdminLearningHistoryScreen);
    document.getElementById("speakingHomeBackBtn").addEventListener("click", renderHome);
    document.getElementById("openConversationSelectBtn").addEventListener("click", renderConversationSelectScreen);
    document.getElementById("openSpeakingReviewTopBtn").addEventListener("click", renderSpeakingReviewTopScreen);
    document.getElementById("speakingReviewTopBackBtn").addEventListener("click", renderSpeakingHome);
    elements.startTodayReviewBtn.addEventListener("click", startTodaySpeakingReview);
    elements.returnSpeakingReviewCompleteBtn.addEventListener("click", renderSpeakingReviewTopScreen);
    elements.pointRewardOkBtn.addEventListener("click", closePointRewardScreen);
    document.getElementById("openSpeakingVocabBtn").addEventListener("click", () => {});
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
    elements.mobileAdminLearningHistoryBackBtn.addEventListener("click", renderHome);
    document.getElementById("wordOrderBackBtn").addEventListener("click", renderHome);
    elements.wordOrderDayRangeSelect.addEventListener("change", startWordOrderTraining);
    elements.wordOrderUndoBtn.addEventListener("click", undoWordOrderSelection);
    elements.wordOrderResetBtn.addEventListener("click", resetWordOrderSelection);
    elements.wordOrderSubmitBtn.addEventListener("click", submitWordOrderAnswer);
    elements.wordOrderRestartBtn.addEventListener("click", startWordOrderTraining);
    elements.wordOrderHomeBtn.addEventListener("click", renderHome);
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
    loadSpeakingWordDayCompletionMap();
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