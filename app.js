const STORAGE_KEY = "english-trainer-state-v1";
const SETTINGS_INFO = {
  adminPassword: "12345",
  releaseHistory: [
    { version: "2026/07/17 23:38", note: "スマホのキャッシュ対策を追加・CSS・JavaScriptのバージョン管理を追加・更新日時の記載ルールを修正" },
    { version: "26/0717/1900", note: "Day9～Day14を追加" },
    { version: "26/0717/1900", note: "熟語表示を改善" },
    { version: "26/0717/1900", note: "Day学習の画面遷移を修正" },
    { version: "26/0717/1900", note: "熟語モードの出題不具合を修正" },
    { version: "26/0717/1250", note: "バージョン表示を追加" },
    { version: "26/0717/1310", note: "スマホ音声を修正" }
  ]
};
const APP_VERSION = SETTINGS_INFO.releaseHistory[0]?.version || "0/0000/0000";
let currentAudio = null;
const LEVEL_DEFINITIONS = [
  { level: 1, label: "要特訓", icon: "🔥" },
  { level: 2, label: "あと一歩", icon: "⚠️" },
  { level: 3, label: "ほぼ習得", icon: "💪" },
  { level: 4, label: "自信あり", icon: "🏆" }
];
const LEVEL_SUCCESS_TARGETS = {
  1: 2,
  2: 3,
  3: 3,
  4: 0
};
const LEVEL_QUESTION_WEIGHTS = {
  1: 50,
  2: 30,
  3: 15,
  4: 5
};
const PHRASE_SPIRAL_TARGET_COUNT = 10;
const PHRASE_SPIRAL_LEVEL_TARGETS = {
  1: 5,
  2: 3,
  3: 1,
  4: 1
};
const LEVEL_FOUR_FAILURES_TO_DOWN = 3;
const LEVEL_FOCUS_BATCH_SIZE = 5;
const GAME_TICKET_CONFIG = {
  eligibleModes: new Set(["level-focus", "challenge"]),
  baseChance: 0.08,
  repeatBonus: 0.05,
  maxChance: 0.45,
  pityNoWinThreshold: 8,
  introMaxDisplays: 1,
  ticketOptions: [
    { minutes: 5, weight: 55 },
    { minutes: 10, weight: 30 },
    { minutes: 15, weight: 15 }
  ]
};
let resultActionFocusMode = null;
const PHASE_METADATA = {
  phase0: {
    icon: "🔁",
    title: "前回の復習",
    description: () => "前回苦手だった問題を復習します。",
    action: "▶ スタート"
  },
  phase1: {
    icon: "📘",
    title: "新しい単語",
    description: (session) => `${describeSessionDayRange(session)}の新しい単語・熟語を学習します。`,
    action: "▶ スタート"
  },
  phase2: {
    icon: "🔄",
    title: "今回の復習",
    description: () => "今回間違えた問題をもう一度確認します。",
    action: "▶ 続ける"
  },
  phase3: {
    icon: "💪",
    title: "苦手克服",
    description: () => "過去に苦手と判定された問題を復習します。",
    action: "▶ 続ける"
  }
};
let recentDayProgressUpdates = [];
let activeLevelFilter = 1;
let activeItemDetailId = null;
let currentScreenId = "homeScreen";
const screenHistory = [];
const levelTrendTracker = {
  date: "",
  lastL1: null,
  lastL4: null,
  l1Reduced: 0,
  l4Increased: 0
};

function createDefaultGameTicketStats() {
  return {
    eligibleCompletionCount: 0,
    noWinStreak: 0,
    foundCount: 0,
    introShownCount: 0
  };
}

function sanitizeGameTicketStats(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    eligibleCompletionCount: Math.max(0, Number(source.eligibleCompletionCount) || 0),
    noWinStreak: Math.max(0, Number(source.noWinStreak) || 0),
    foundCount: Math.max(0, Number(source.foundCount) || 0),
    introShownCount: Math.max(0, Number(source.introShownCount) || 0)
  };
}

function sanitizePendingGameTicket(value) {
  if (!value || typeof value !== "object") return null;
  const minutes = Number(value.minutes);
  if (!Number.isFinite(minutes) || ![5, 10, 15].includes(minutes)) return null;
  return {
    minutes,
    showIntro: Boolean(value.showIntro),
    foundAt: Number.isFinite(Number(value.foundAt)) ? Number(value.foundAt) : Date.now()
  };
}

function ensureGameTicketState() {
  if (!state?.stats) return createDefaultGameTicketStats();
  state.stats.gameTicket = sanitizeGameTicketStats(state.stats.gameTicket);
  state.stats.pendingGameTicket = sanitizePendingGameTicket(state.stats.pendingGameTicket);
  return state.stats.gameTicket;
}

function pickGameTicketMinutes() {
  const totalWeight = GAME_TICKET_CONFIG.ticketOptions.reduce((sum, entry) => sum + Math.max(0, Number(entry.weight) || 0), 0);
  if (totalWeight <= 0) return 5;
  let cursor = Math.random() * totalWeight;
  for (const entry of GAME_TICKET_CONFIG.ticketOptions) {
    cursor -= Math.max(0, Number(entry.weight) || 0);
    if (cursor <= 0) {
      return entry.minutes;
    }
  }
  return GAME_TICKET_CONFIG.ticketOptions[GAME_TICKET_CONFIG.ticketOptions.length - 1].minutes;
}

function maybeDiscoverGameTicket(sessionLike, reason) {
  if (!sessionLike || reason !== "completed") return null;
  if (!GAME_TICKET_CONFIG.eligibleModes.has(sessionLike.mode)) return null;

  const ticketStats = ensureGameTicketState();
  ticketStats.eligibleCompletionCount += 1;

  const chance = Math.min(
    GAME_TICKET_CONFIG.maxChance,
    GAME_TICKET_CONFIG.baseChance + (ticketStats.noWinStreak * GAME_TICKET_CONFIG.repeatBonus)
  );
  const pityHit = ticketStats.noWinStreak >= GAME_TICKET_CONFIG.pityNoWinThreshold;
  const won = pityHit || Math.random() < chance;

  if (!won) {
    ticketStats.noWinStreak += 1;
    return null;
  }

  ticketStats.noWinStreak = 0;
  ticketStats.foundCount += 1;
  const showIntro = ticketStats.introShownCount < GAME_TICKET_CONFIG.introMaxDisplays;
  if (showIntro) {
    ticketStats.introShownCount += 1;
  }

  const pending = {
    minutes: pickGameTicketMinutes(),
    showIntro,
    foundAt: Date.now()
  };
  state.stats.pendingGameTicket = pending;
  return pending;
}

function normalizeIdentityText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildQuestionSignature(item) {
  return `${item.day}|${item.type}|${normalizeIdentityText(item.answer || item.english)}`;
}

function buildQuestionLookups(items) {
  const byId = new Map();
  const byLegacyNumericId = new Map();
  const bySignature = new Map();

  items.forEach((item, index) => {
    byId.set(String(item.id), item);
    byLegacyNumericId.set(String(index + 1), item);
    bySignature.set(buildQuestionSignature(item), item);
  });

  return { byId, byLegacyNumericId, bySignature };
}

function resolveQuestionIdFromLegacy(record, lookup) {
  const candidateId = String(record?.questionId || record?.id || "").trim();
  if (candidateId && lookup.byId.has(candidateId)) {
    return candidateId;
  }
  if (candidateId && lookup.byLegacyNumericId.has(candidateId)) {
    return String(lookup.byLegacyNumericId.get(candidateId).id);
  }

  const answer = record?.answer || record?.english || "";
  const type = record?.type;
  const day = Number(record?.day);
  if (answer && type && Number.isFinite(day)) {
    const signature = `${day}|${type}|${normalizeIdentityText(answer)}`;
    if (lookup.bySignature.has(signature)) {
      return String(lookup.bySignature.get(signature).id);
    }
  }

  return null;
}

function sanitizeReviewRecord(questionId, record) {
  const stageValue = Number(record?.reviewStage);
  const reviewStage = Number.isFinite(stageValue) && stageValue >= 0 ? Math.floor(stageValue) : 0;
  const nextReviewDate = typeof record?.nextReviewDate === "string" && record.nextReviewDate ? record.nextReviewDate : todayKey();
  const lastReviewedDate = typeof record?.lastReviewedDate === "string" ? record.lastReviewedDate : "";
  return {
    questionId: String(questionId),
    reviewStage,
    nextReviewDate,
    isVisibleInReviewList: Boolean(record?.isVisibleInReviewList),
    lastReviewedDate
  };
}

function mergeReviewRecords(previous, incoming) {
  if (!previous) return incoming;
  return {
    ...previous,
    ...incoming,
    isVisibleInReviewList: previous.isVisibleInReviewList || incoming.isVisibleInReviewList,
    reviewStage: Math.max(previous.reviewStage || 0, incoming.reviewStage || 0),
    lastReviewedDate: [previous.lastReviewedDate || "", incoming.lastReviewedDate || ""].sort().at(-1),
    nextReviewDate: [previous.nextReviewDate || todayKey(), incoming.nextReviewDate || todayKey()].sort()[0]
  };
}

function migrateStoredReviewData(parsedReview, items) {
  const migrated = {};
  const lookup = buildQuestionLookups(items);
  const source = parsedReview || {};

  if (source.records && typeof source.records === "object") {
    Object.values(source.records).forEach((record) => {
      const resolvedId = resolveQuestionIdFromLegacy(record, lookup);
      if (!resolvedId) return;
      const clean = sanitizeReviewRecord(resolvedId, record);
      migrated[resolvedId] = mergeReviewRecords(migrated[resolvedId], clean);
    });
  }

  if (Array.isArray(source.ids)) {
    source.ids.forEach((rawId) => {
      const resolvedId = resolveQuestionIdFromLegacy({ questionId: rawId }, lookup);
      if (!resolvedId) return;
      const clean = sanitizeReviewRecord(resolvedId, {
        questionId: resolvedId,
        reviewStage: 0,
        nextReviewDate: todayKey(),
        isVisibleInReviewList: true,
        lastReviewedDate: todayKey()
      });
      migrated[resolvedId] = mergeReviewRecords(migrated[resolvedId], clean);
    });
  }

  return migrated;
}

function buildVocabularyItems() {
  return (window.vocabularyBank || []).map((item, index) => ({
    ...item,
    id: item.id || String(index + 1),
    meaning: item.meaning || item.hint || item.japanese,
    audioFile: item.audioFile || "",
    levelData: {
      level: 1,
      successCount: 0,
      lv4FailureCount: 0,
      lv4Celebrated: false
    },
    mastered: false,
    consecutiveCorrect: 0,
    reviewDue: false,
    reviewTodayCount: 0,
    lastAnswerWasCorrect: false,
    learningStats: {
      attempts: 0,
      correct: 0,
      lastStudiedDate: ""
    }
  }));
}

function sanitizeLearningStats(value) {
  const source = value && typeof value === "object" ? value : {};
  const attempts = Number(source.attempts);
  const correct = Number(source.correct);
  return {
    attempts: Number.isInteger(attempts) ? Math.max(0, attempts) : 0,
    correct: Number.isInteger(correct) ? Math.max(0, correct) : 0,
    lastStudiedDate: typeof source.lastStudiedDate === "string" ? source.lastStudiedDate : ""
  };
}

function getItemLearningStats(item) {
  if (!item.learningStats) {
    item.learningStats = sanitizeLearningStats();
  } else {
    item.learningStats = sanitizeLearningStats(item.learningStats);
  }
  return item.learningStats;
}

function getItemAccuracyPercent(item) {
  const stats = getItemLearningStats(item);
  if (!stats.attempts) return null;
  return Math.round((stats.correct / stats.attempts) * 100);
}

function recordItemStudyAttempt(item, isCorrect) {
  const stats = getItemLearningStats(item);
  stats.attempts += 1;
  if (isCorrect) {
    stats.correct += 1;
  }
  stats.lastStudiedDate = todayKey();
}

function getLevelDefinition(level) {
  return LEVEL_DEFINITIONS.find((entry) => entry.level === level) || LEVEL_DEFINITIONS[0];
}

function createDefaultLevelData() {
  return {
    level: 1,
    successCount: 0,
    lv4FailureCount: 0,
    lv4Celebrated: false
  };
}

function sanitizeLevelData(value) {
  const fallback = createDefaultLevelData();
  const source = value && typeof value === "object" ? value : {};
  const level = Number(source.level);
  const successCount = Number(source.successCount);
  const lv4FailureCount = Number(source.lv4FailureCount);
  return {
    level: Number.isInteger(level) ? Math.max(1, Math.min(4, level)) : fallback.level,
    successCount: Number.isInteger(successCount) ? Math.max(0, successCount) : fallback.successCount,
    lv4FailureCount: Number.isInteger(lv4FailureCount) ? Math.max(0, lv4FailureCount) : fallback.lv4FailureCount,
    lv4Celebrated: Boolean(source.lv4Celebrated)
  };
}

function ensureLevelData(item) {
  if (!item.levelData) {
    item.levelData = createDefaultLevelData();
  } else {
    item.levelData = sanitizeLevelData(item.levelData);
  }
  return item.levelData;
}

function getEffectiveLevelForItem(item) {
  return ensureLevelData(item).level;
}

function syncLegacyItemFields(item) {
  const levelData = ensureLevelData(item);
  item.mastered = levelData.level === 4;
  item.consecutiveCorrect = levelData.successCount;
}

function levelName(level) {
  return getLevelDefinition(level).label;
}

function levelIcon(level) {
  return getLevelDefinition(level).icon;
}

function getLevelWeight(item) {
  return LEVEL_QUESTION_WEIGHTS[getEffectiveLevelForItem(item)] || 1;
}

function weightedSampleWithoutReplacement(pool, count) {
  const available = pool.slice();
  const picked = [];
  const targetCount = Math.max(0, Math.min(count, available.length));

  while (picked.length < targetCount && available.length) {
    const totalWeight = available.reduce((sum, item) => sum + getLevelWeight(item), 0);
    let cursor = Math.random() * totalWeight;
    let selectedIndex = available.length - 1;

    for (let index = 0; index < available.length; index += 1) {
      cursor -= getLevelWeight(available[index]);
      if (cursor <= 0) {
        selectedIndex = index;
        break;
      }
    }

    picked.push(available.splice(selectedIndex, 1)[0]);
  }

  return picked;
}

function getLevelSuccessTarget(level) {
  return LEVEL_SUCCESS_TARGETS[level] || 0;
}

function showLevelUpModal(item) {
  const modal = document.getElementById("levelUpModal");
  const wordText = document.getElementById("levelUpWordText");
  const levelText = document.getElementById("levelUpLevelText");
  if (!modal || !wordText || !levelText) return;
  wordText.textContent = item.answer || item.english || "";
  levelText.textContent = `${levelIcon(4)} ${levelName(4)}`;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function hideLevelUpModal() {
  const modal = document.getElementById("levelUpModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function showGameTicketModal(ticket) {
  const modal = document.getElementById("gameTicketModal");
  const minutesText = document.getElementById("gameTicketMinutesText");
  const introText = document.getElementById("gameTicketIntroText");
  if (!modal || !minutesText || !introText) return;
  minutesText.textContent = `🎮 ゲームチケット（${ticket.minutes}分）`;
  introText.classList.toggle("hidden", !ticket.showIntro);
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function showPendingGameTicketModalIfAny() {
  const pending = sanitizePendingGameTicket(state?.stats?.pendingGameTicket);
  if (!pending) return;
  showGameTicketModal(pending);
  state.stats.pendingGameTicket = null;
  saveState();
}

function updateItemLevelProgress(item, isCorrect) {
  const levelData = ensureLevelData(item);
  let leveledUpToFour = false;

  if (isCorrect) {
    levelData.lv4FailureCount = 0;
    if (levelData.level < 4) {
      levelData.successCount += 1;
      if (levelData.successCount >= getLevelSuccessTarget(levelData.level)) {
        levelData.level += 1;
        levelData.successCount = 0;
        if (levelData.level === 4 && !levelData.lv4Celebrated) {
          levelData.lv4Celebrated = true;
          leveledUpToFour = true;
        }
      }
    }
  } else if (levelData.level === 4) {
    levelData.lv4FailureCount += 1;
    if (levelData.lv4FailureCount >= LEVEL_FOUR_FAILURES_TO_DOWN) {
      levelData.level = 3;
      levelData.successCount = 0;
      levelData.lv4FailureCount = 0;
    }
  } else {
    levelData.successCount = Math.max(0, levelData.successCount - 1);
  }

  syncLegacyItemFields(item);
  return { leveledUpToFour };
}

function buildLevelBuckets() {
  const buckets = {
    1: [],
    2: [],
    3: [],
    4: []
  };
  state.items.forEach((item) => {
    const level = getEffectiveLevelForItem(item);
    buckets[level].push(item);
  });
  return buckets;
}

function renderLevelWordList(level) {
  const listTitle = document.getElementById("levelDetailTitle");
  const listSubtitle = document.getElementById("levelDetailSubtitle");
  const list = document.getElementById("levelWordList");
  if (!listTitle || !list) return;

  const buckets = buildLevelBuckets();
  const target = buckets[level] || [];
  listTitle.textContent = `Lv${level} ${levelName(level)} 一覧`;
  if (listSubtitle) {
    listSubtitle.textContent = `${target.length}語をアルファベット順で表示しています`;
  }
  list.innerHTML = !target.length
    ? '<li class="empty-state">該当する単語はありません</li>'
    : target
      .slice()
      .sort((a, b) => String(a.answer).localeCompare(String(b.answer)))
      .map((item) => `<li><button type="button" class="level-word-item" data-item-id="${item.id}"><span>${item.answer}</span><span>${item.japanese}</span></button></li>`)
      .join("");

  list.querySelectorAll(".level-word-item").forEach((button) => {
    button.addEventListener("click", () => {
      activeItemDetailId = String(button.dataset.itemId || "");
      renderItemDetailScreen(activeItemDetailId);
      showScreen("itemDetailScreen");
    });
  });
}

function buildLevelCollectionMarkup() {
  const buckets = buildLevelBuckets();
  const total = state.items.length || 1;
  return LEVEL_DEFINITIONS.map((entry) => {
    const count = buckets[entry.level].length;
    const ratio = Math.max(0, Math.min(100, Math.round((count / total) * 100)));
    return `<li><button type="button" class="level-pill" data-level="${entry.level}"><span class="level-pill-top"><span class="level-pill-head"><span class="level-pill-name">${entry.icon} ${entry.label}</span></span><span class="level-pill-arrow" aria-hidden="true">▶</span></span><span class="level-pill-count">${count}語</span><span class="level-pill-progress" aria-hidden="true"><span class="level-pill-fill" style="width:${ratio}%;"></span></span></button></li>`;
  }).join("");
}

function bindLevelCollectionButtons(container) {
  if (!container) return;
  container.querySelectorAll(".level-pill").forEach((button) => {
    button.addEventListener("click", () => {
      activeLevelFilter = Number(button.dataset.level) || 1;
      renderLevelWordList(activeLevelFilter);
      showScreen("levelDetailScreen");
    });
  });
}

function renderLevelCollection() {
  const levelCollectionList = document.getElementById("levelCollectionList");
  const levelCollectionScreenList = document.getElementById("levelCollectionScreenList");
  if (levelCollectionList) {
    levelCollectionList.innerHTML = buildLevelCollectionMarkup();
    bindLevelCollectionButtons(levelCollectionList);
  }
  if (levelCollectionScreenList) {
    levelCollectionScreenList.innerHTML = buildLevelCollectionMarkup();
    bindLevelCollectionButtons(levelCollectionScreenList);
  }
}

function formatFriendlyDate(dateKey) {
  if (!dateKey) return "未学習";
  const [year, month, day] = String(dateKey).split("-").map(Number);
  if (!year || !month || !day) return "未学習";
  return `${year}/${month}/${day}`;
}

function renderItemDetailScreen(itemId) {
  const item = getQuestionById(itemId);
  if (!item) return;

  const word = document.getElementById("itemDetailWord");
  const meaning = document.getElementById("itemDetailMeaning");
  const level = document.getElementById("itemDetailLevel");
  const accuracy = document.getElementById("itemDetailAccuracy");
  const attempts = document.getElementById("itemDetailAttempts");
  const lastStudied = document.getElementById("itemDetailLastStudied");
  if (!word || !meaning || !level || !accuracy || !attempts || !lastStudied) return;

  const itemAccuracy = getItemAccuracyPercent(item);
  const stats = getItemLearningStats(item);
  const currentLevel = getEffectiveLevelForItem(item);

  word.textContent = item.answer || item.english || "";
  meaning.textContent = item.japanese || "";
  level.textContent = `${levelIcon(currentLevel)} Lv${currentLevel} ${levelName(currentLevel)}`;
  accuracy.innerHTML = buildAccuracyEvaluationMarkup(itemAccuracy, "recent-accuracy-value item-detail-accuracy");
  attempts.textContent = `${stats.attempts}回`;
  lastStudied.textContent = formatFriendlyDate(stats.lastStudiedDate);
}

function getStarTextFromAccuracy(percent) {
  const value = Number(percent) || 0;
  if (value >= 100) return "★★★★★";
  if (value >= 80) return "★★★★☆";
  if (value >= 60) return "★★★☆☆";
  if (value >= 40) return "★★☆☆☆";
  return "★☆☆☆☆";
}

function initializeRecentDayProgress() {
  const entries = Object.entries(state.stats.dayBestAccuracy || {});
  recentDayProgressUpdates = entries.map(([day, accuracy], index) => ({
    day: Number(day),
    accuracy: Number(accuracy) || 0,
    at: Date.now() - (entries.length - index) * 1000
  }));
}

function registerDayProgressUpdate(day, accuracy) {
  const safeDay = Number(day);
  const safeAccuracy = Number(accuracy);
  if (!Number.isFinite(safeDay) || !Number.isFinite(safeAccuracy)) return;
  recentDayProgressUpdates.push({
    day: Math.max(1, Math.round(safeDay)),
    accuracy: Math.max(0, Math.min(100, Math.round(safeAccuracy))),
    at: Date.now()
  });
  recentDayProgressUpdates = recentDayProgressUpdates.slice(-240);
}

function formatRecentTime(timestamp) {
  const diffMs = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  return `${days}日前`;
}

function renderRecentProgressTop5() {
  const recentProgressList = document.getElementById("recentProgressList");
  if (!recentProgressList) return;

  const top5 = recentDayProgressUpdates
    .slice()
    .sort((a, b) => b.at - a.at)
    .slice(0, 5);

  const filled = top5.slice();
  while (filled.length < 5) {
    filled.push(null);
  }

  recentProgressList.innerHTML = filled
    .map((entry, index) => {
      if (!entry) {
        return '<li class="recent-progress-placeholder"><span class="recent-progress-head"><span class="recent-progress-day">⭐ Day-</span><span class="recent-progress-score">-%</span></span><span class="recent-progress-bottom"><span class="recent-progress-stars">-----</span><span class="recent-progress-meta"> </span></span></li>';
      }
      return `<li><span class="recent-progress-head"><span class="recent-progress-day">⭐ Day${entry.day}</span><span class="recent-progress-score ${getAccuracyToneClass(entry.accuracy)}">${Math.round(entry.accuracy)}%</span></span><span class="recent-progress-bottom"><span class="recent-progress-stars">${getStarTextFromAccuracy(entry.accuracy)}</span><span class="recent-progress-meta">${index === 0 ? formatRecentTime(entry.at) : ""}</span></span></li>`;
    })
    .join("");
}

function hasItemBeenStudied(item) {
  if (!item) return false;
  if (item.hasBeenStudied) return true;
  const levelData = ensureLevelData(item);
  return Boolean(
    item.mastered ||
    item.reviewDue ||
    item.lastAnswerWasCorrect ||
    (item.consecutiveCorrect || 0) > 0 ||
    (item.reviewTodayCount || 0) > 0 ||
    levelData.level > 1 ||
    levelData.successCount > 0 ||
    levelData.lv4FailureCount > 0
  );
}

function getLearnedItemCount() {
  return state.items.filter((item) => hasItemBeenStudied(item)).length;
}

function updateLevelTrendTracker() {
  const today = todayKey();
  const buckets = buildLevelBuckets();
  const currentL1 = buckets[1].length;
  const currentL4 = buckets[4].length;

  if (levelTrendTracker.date !== today) {
    levelTrendTracker.date = today;
    levelTrendTracker.lastL1 = currentL1;
    levelTrendTracker.lastL4 = currentL4;
    levelTrendTracker.l1Reduced = 0;
    levelTrendTracker.l4Increased = 0;
    return {
      l1Reduced: 0,
      l4Increased: 0
    };
  }

  if (typeof levelTrendTracker.lastL1 === "number" && currentL1 < levelTrendTracker.lastL1) {
    levelTrendTracker.l1Reduced += levelTrendTracker.lastL1 - currentL1;
  }
  if (typeof levelTrendTracker.lastL4 === "number" && currentL4 > levelTrendTracker.lastL4) {
    levelTrendTracker.l4Increased += currentL4 - levelTrendTracker.lastL4;
  }

  levelTrendTracker.lastL1 = currentL1;
  levelTrendTracker.lastL4 = currentL4;

  return {
    l1Reduced: levelTrendTracker.l1Reduced,
    l4Increased: levelTrendTracker.l4Increased
  };
}

function formatMonthDayLabel(dateKey) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  if (!year || !month || !day) return "-";
  return `${month}/${day}`;
}

function buildRecentThreeDayRows() {
  const rows = [];
  for (let offset = 2; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = formatDateKey(date);
    rows.push({ key, label: formatMonthDayLabel(key) });
  }
  return rows;
}

function getRecentAccuracyByDateMap() {
  const byDate = {};
  recentDayProgressUpdates.forEach((entry) => {
    if (!entry || !entry.at) return;
    const key = formatDateKey(new Date(entry.at));
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(Number(entry.accuracy) || 0);
  });

  const result = {};
  Object.entries(byDate).forEach(([key, values]) => {
    if (!values.length) return;
    const total = values.reduce((sum, value) => sum + value, 0);
    result[key] = Math.round(total / values.length);
  });
  return result;
}

function getAccuracyToneClass(accuracy) {
  if (!Number.isFinite(accuracy)) return "";
  if (accuracy >= 90) return "accuracy-high";
  if (accuracy >= 80) return "accuracy-mid";
  return "accuracy-low";
}

function getAccuracyEvaluationText(accuracy) {
  if (!Number.isFinite(accuracy)) return "";
  if (accuracy >= 90) return "🟢 Excellent";
  if (accuracy >= 80) return "🟡 Good";
  return "🔴 Review";
}

function buildAccuracyEvaluationMarkup(accuracy, wrapperClass = "recent-accuracy-value") {
  if (!Number.isFinite(accuracy)) return "-";
  const toneClass = getAccuracyToneClass(accuracy);
  const accuracyText = `${Math.round(accuracy)}%`;
  const evaluationText = getAccuracyEvaluationText(accuracy);
  return `<span class="${wrapperClass} ${toneClass}"><span class="accuracy-value-number">${accuracyText}</span><span class="accuracy-value-label">${evaluationText}</span></span>`;
}

function getDailySessionAggregate(dayKey) {
  const sessions = Array.isArray(state.stats.completedSessions) ? state.stats.completedSessions : [];
  const targetSessions = sessions.filter((entry) => entry.dayKey === dayKey);
  const totals = targetSessions.reduce((acc, entry) => {
    acc.count += 1;
    acc.durationMinutes += Math.max(0, Number(entry.durationMinutes) || 0);
    acc.questionCount += Math.max(0, Number(entry.questionCount) || 0);
    acc.weightedAccuracy += (Number(entry.accuracy) || 0) * Math.max(1, Number(entry.questionCount) || 0);
    acc.weight += Math.max(1, Number(entry.questionCount) || 0);
    return acc;
  }, {
    count: 0,
    durationMinutes: 0,
    questionCount: 0,
    weightedAccuracy: 0,
    weight: 0
  });

  const activeSession = state.session;
  if (activeSession && getSessionStartDayKey(activeSession) === dayKey) {
    const activeAnswerCount = Math.max(0, Number(activeSession.answerCount) || 0);
    const activeCorrectCount = Array.isArray(activeSession.answerHistory)
      ? activeSession.answerHistory.filter((entry) => entry?.isCorrect).length
      : 0;
    const activeDurationMinutes = Math.max(0, Math.round(getSessionElapsedMs(activeSession) / 60000));
    const activeAccuracy = activeAnswerCount > 0
      ? Math.round((activeCorrectCount / activeAnswerCount) * 100)
      : null;

    if (activeAnswerCount > 0 || activeDurationMinutes > 0) {
      totals.count += 1;
      totals.durationMinutes += activeDurationMinutes;
      totals.questionCount += activeAnswerCount;
      if (typeof activeAccuracy === "number") {
        totals.weightedAccuracy += activeAccuracy * Math.max(1, activeAnswerCount);
        totals.weight += Math.max(1, activeAnswerCount);
      }
    }
  }

  return {
    count: totals.count,
    durationMinutes: totals.durationMinutes,
    questionCount: totals.questionCount,
    averageAccuracy: totals.weight ? Math.round(totals.weightedAccuracy / totals.weight) : null
  };
}

function getSessionResumeMetaText(sessionLike) {
  if (!sessionLike) return "再開";
  const currentQuestion = sessionLike.questions?.[sessionLike.currentIndex] || sessionLike.questions?.[0];
  if (sessionLike.mode === "level-focus") {
    return `Lv${sessionLike.focusLevel || activeLevelFilter} 学習途中`;
  }
  if (sessionLike.mode === "review") {
    return `復習 学習途中`;
  }
  if (sessionLike.mode === "phrase-spiral") {
    return "熟語特訓 学習途中";
  }
  if (sessionLike.mode === "challenge") {
    return `挑戦 学習途中`;
  }
  return `Day${currentQuestion?.day || state.settings.studyRange.start} 学習途中`;
}

function describeSessionDayRange(sessionLike) {
  const sourceQuestions = Array.isArray(sessionLike?.baseQuestions) && sessionLike.baseQuestions.length
    ? sessionLike.baseQuestions
    : Array.isArray(sessionLike?.questions) ? sessionLike.questions : [];
  const days = [...new Set(sourceQuestions.map((item) => Number(item.day)).filter(Number.isFinite))].sort((a, b) => a - b);
  if (!days.length) return `Day${state.settings.studyRange.start}`;
  if (days.length === 1) return `Day${days[0]}`;
  return `Day${days[0]}-${days[days.length - 1]}`;
}

function getPhaseMeta(sessionLike) {
  if (!sessionLike) return PHASE_METADATA.phase1;
  if (sessionLike.mode === "phrase-spiral" && sessionLike.phase === "phase1") {
    return {
      icon: "💬",
      title: "熟語特訓",
      description: () => "習熟度に応じた最適な10問を自動で出題します。",
      action: "▶ スタート"
    };
  }
  if (sessionLike.phase === "phase0") return PHASE_METADATA.phase0;
  if (sessionLike.phase === "phase2") return PHASE_METADATA.phase2;
  if (sessionLike.phase === "phase3") return PHASE_METADATA.phase3;
  return PHASE_METADATA.phase1;
}

function formatPhaseProgressText(sessionLike) {
  if (sessionLike?.mode === "phrase-spiral") {
    const currentPhrase = Math.min((sessionLike?.currentIndex || 0) + 1, sessionLike?.questions?.length || 1);
    const totalPhrase = sessionLike?.questions?.length || 0;
    return `💬 熟語特訓 ${currentPhrase} / ${totalPhrase}`;
  }
  const meta = getPhaseMeta(sessionLike);
  const current = Math.min((sessionLike?.currentIndex || 0) + 1, sessionLike?.questions?.length || 1);
  const total = sessionLike?.questions?.length || 0;
  return `${meta.icon} ${meta.title} ${current} / ${total}`;
}

function renderPhaseIntro() {
  const session = state.session;
  if (!session) return;
  const introCard = document.getElementById("phaseIntroCard");
  const title = document.getElementById("phaseIntroTitle");
  const description = document.getElementById("phaseIntroDescription");
  const count = document.getElementById("phaseIntroCount");
  const startBtn = document.getElementById("phaseIntroStartBtn");
  const questionCard = document.getElementById("questionCard");
  const reviewCard = document.getElementById("reviewCard");
  if (!introCard || !title || !description || !count || !startBtn) return;

  const meta = getPhaseMeta(session);
  title.textContent = `${meta.icon} ${meta.title}`;
  description.textContent = meta.description(session);
  count.textContent = `${session.questions.length}問`;
  startBtn.textContent = meta.action;
  session.awaitingPhaseStart = true;

  if (questionCard) questionCard.classList.add("hidden");
  if (reviewCard) reviewCard.classList.add("hidden");
  introCard.classList.remove("hidden");
  showScreen("testScreen");
}

function hidePhaseIntro() {
  const introCard = document.getElementById("phaseIntroCard");
  if (introCard) introCard.classList.add("hidden");
}

function startCurrentPhaseQuestions() {
  const session = state.session;
  if (!session) return;
  session.awaitingPhaseStart = false;
  hidePhaseIntro();
  if (session.mode === "review") {
    renderReviewSession();
  } else {
    renderQuestionSession();
  }
  showScreen("testScreen");
}

function getWeakPhasePool(sessionLike, limit = 10) {
  const buckets = buildLevelBuckets();
  const excludedIds = new Set((sessionLike?.baseQuestionIds || []).map((id) => String(id)));
  const candidates = [...(buckets[1] || []), ...(buckets[2] || [])].filter((item) => !excludedIds.has(String(item.id)));
  return weightedSampleWithoutReplacement(candidates, limit);
}

function beginSessionPhase(sessionLike, phase, questions, options = {}) {
  if (!sessionLike || !Array.isArray(questions) || !questions.length) return false;
  sessionLike.phase = phase;
  sessionLike.questions = questions;
  sessionLike.questionIds = questions.map((question) => String(question.id));
  sessionLike.currentIndex = 0;
  sessionLike.answered = false;
  sessionLike.currentQuestionAttempted = false;
  sessionLike.currentQuestionState = "idle";
  sessionLike.awaitingEnter = false;
  sessionLike.enterLocked = false;
  sessionLike.answerLocked = false;
  sessionLike.enterConsumed = false;
  sessionLike.enterLockUntil = null;
  sessionLike.currentQuestion = null;
  sessionLike.awaitingPhaseStart = Boolean(options.showIntro);
  setTestModeHeader(questions.length);
  saveState();
  if (options.showIntro) {
    renderPhaseIntro();
  } else {
    startCurrentPhaseQuestions();
  }
  return true;
}

function renderHomeMessage() {
  const learnedCountText = document.getElementById("learnedCountText");
  const streakFooterText = document.getElementById("streakFooterText");
  const studyRangeFooterText = document.getElementById("studyRangeFooterText");
  const remainFooterText = document.getElementById("remainFooterText");
  const todaySessionCountText = document.getElementById("todaySessionCountText");
  const todayStudyTimeText = document.getElementById("todayStudyTimeText");
  const todayQuestionCountText = document.getElementById("todayQuestionCountText");
  const todayAverageAccuracyText = document.getElementById("todayAverageAccuracyText");
  const recentDayLabel1 = document.getElementById("recentDayLabel1");
  const recentDayLabel2 = document.getElementById("recentDayLabel2");
  const recentDayLabel3 = document.getElementById("recentDayLabel3");
  const recentSolved1 = document.getElementById("recentSolved1");
  const recentSolved2 = document.getElementById("recentSolved2");
  const recentSolved3 = document.getElementById("recentSolved3");
  const recentAccuracy1 = document.getElementById("recentAccuracy1");
  const recentAccuracy2 = document.getElementById("recentAccuracy2");
  const recentAccuracy3 = document.getElementById("recentAccuracy3");
  if (
    !learnedCountText || !streakFooterText || !studyRangeFooterText || !remainFooterText ||
    !todaySessionCountText || !todayStudyTimeText || !todayQuestionCountText || !todayAverageAccuracyText ||
    !recentDayLabel1 || !recentDayLabel2 || !recentDayLabel3 ||
    !recentSolved1 || !recentSolved2 || !recentSolved3 ||
    !recentAccuracy1 || !recentAccuracy2 || !recentAccuracy3
  ) {
    return;
  }

  const learnedCount = getLearnedItemCount();
  const recentRows = buildRecentThreeDayRows();
  const solvedByDay = state.stats.solvedByDay || {};
  const recentAccuracyByDate = getRecentAccuracyByDateMap();
  const todayAggregate = getDailySessionAggregate(todayKey());
  const dayLabelCells = [recentDayLabel1, recentDayLabel2, recentDayLabel3];
  const solvedCells = [recentSolved1, recentSolved2, recentSolved3];
  const accuracyCells = [recentAccuracy1, recentAccuracy2, recentAccuracy3];

  learnedCountText.textContent = `📚 ${learnedCount} / 1000語 学習済み`;
  streakFooterText.textContent = `🔥 ${state.stats.streak || 0}日連続`;
  studyRangeFooterText.textContent = `学習中：Day${state.settings.studyRange.start}～${state.settings.studyRange.end}`;
  remainFooterText.textContent = `🎯 1000語まであと${Math.max(0, 1000 - learnedCount)}語`;
  todaySessionCountText.textContent = `📘 学習回数 ${todayAggregate.count}回`;
  todayStudyTimeText.textContent = `⏱ 学習時間 ${todayAggregate.durationMinutes}分`;
  todayQuestionCountText.textContent = `📝 問題数 ${todayAggregate.questionCount}問`;
  todayAverageAccuracyText.textContent = `📈 平均正答率 ${Number.isFinite(todayAggregate.averageAccuracy) ? `${todayAggregate.averageAccuracy}%` : "-"}`;

  recentRows.forEach((row, index) => {
    const solved = solvedByDay[row.key];
    const accuracy = recentAccuracyByDate[row.key];
    const solvedText = Number.isFinite(solved) && solved > 0 ? String(solved) : "-";
    dayLabelCells[index].textContent = row.label || "-";
    solvedCells[index].textContent = solvedText;
    accuracyCells[index].innerHTML = buildAccuracyEvaluationMarkup(accuracy);
  });
}

function renderDayCatalog() {
  const dayStudyStartDaySelect = document.getElementById("dayStudyStartDaySelect");
  const dayStudyEndDaySelect = document.getElementById("dayStudyEndDaySelect");
  const dayStudyTypeSelect = document.getElementById("dayStudyTypeSelect");
  const dayCatalogGrid = document.getElementById("dayCatalogGrid");
  if (!dayCatalogGrid || !dayStudyStartDaySelect || !dayStudyEndDaySelect || !dayStudyTypeSelect) return;

  const availableDays = getAvailableDays().filter((day) => day >= 1 && day <= 14);
  const allDays = availableDays.length ? availableDays : Array.from({ length: 14 }, (_, index) => index + 1);
  const buildDayOptions = (days) => days.map((day) => `<option value="${day}">Day${day}</option>`).join("");

  dayStudyStartDaySelect.innerHTML = buildDayOptions(allDays);

  const minDay = allDays[0];
  const maxDay = allDays[allDays.length - 1];
  const storedStart = Number(state.settings.dayStudy?.start ?? state.settings.dayStudy?.day ?? state.settings.studyRange?.start ?? minDay);
  const storedEnd = Number(state.settings.dayStudy?.end ?? state.settings.dayStudy?.day ?? state.settings.studyRange?.end ?? maxDay);
  const safeStart = Number.isFinite(storedStart) ? Math.max(minDay, Math.min(maxDay, storedStart)) : minDay;
  const safeEnd = Number.isFinite(storedEnd) ? Math.max(safeStart, Math.min(maxDay, storedEnd)) : maxDay;
  const storedType = state.settings.dayStudy?.type;
  const safeType = storedType === "word" || storedType === "phrase" || storedType === "all" ? storedType : "all";

  dayStudyStartDaySelect.value = String(safeStart);

  const syncEndDayOptions = (preferredEnd) => {
    const selectedStart = Number(dayStudyStartDaySelect.value) || minDay;
    const selectableEndDays = allDays.filter((day) => day >= selectedStart);
    dayStudyEndDaySelect.innerHTML = buildDayOptions(selectableEndDays);
    const normalizedPreferred = Number.isFinite(Number(preferredEnd)) ? Number(preferredEnd) : safeEnd;
    const fallbackEnd = selectableEndDays[selectableEndDays.length - 1];
    const nextEnd = selectableEndDays.includes(normalizedPreferred) ? normalizedPreferred : fallbackEnd;
    dayStudyEndDaySelect.value = String(nextEnd);
  };

  syncEndDayOptions(safeEnd);
  dayStudyTypeSelect.value = safeType;

  dayCatalogGrid.innerHTML = allDays.map((day) => {
    const accuracy = Math.max(0, Math.min(100, Number(state.stats.dayBestAccuracy?.[String(day)]) || 0));
    const stars = getStarTextFromAccuracy(accuracy);
    const perfectClass = accuracy === 100 ? "is-perfect" : "";
    const unavailableClass = "";
    return `<button type="button" class="day-card ${perfectClass} ${unavailableClass}" data-day="${day}"><span class="day-card-title">Day${day}</span><span class="day-card-stars">${stars}</span><span class="day-card-percent">${Math.round(accuracy)}%</span></button>`;
  }).join("");

  dayStudyStartDaySelect.onchange = () => {
    syncEndDayOptions(dayStudyEndDaySelect.value);
  };

  dayCatalogGrid.querySelectorAll(".day-card").forEach((button) => {
    button.addEventListener("click", () => {
      const day = Number(button.dataset.day);
      const nextDay = Math.max(minDay, Math.min(maxDay, day));
      dayStudyStartDaySelect.value = String(nextDay);
      syncEndDayOptions(nextDay);
    });
  });
}

const defaultState = {
  settings: {
    studyRange: { start: 1, end: 3 },
    type: "all",
    dayStudy: {
      day: 1,
      type: "all"
    }
  },
  review: {
    records: {}
  },
  stats: {
    masterCount: 0,
    tickets: 0,
    streak: 0,
    lastSolvedDate: "",
    totalSolvedQuestions: 0,
    solvedByDay: {},
    dayBestAccuracy: {},
    previousSessionWeakQuestionIds: [],
    lastResultSummary: null,
    completedSessions: [],
    pendingSessionNotice: "",
    gameTicket: createDefaultGameTicketStats(),
    pendingGameTicket: null,
    savedNormalSession: null
  },
  items: buildVocabularyItems(),
  session: null
};

function loadState() {
  const freshState = structuredClone(defaultState);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshState;

    const parsed = JSON.parse(raw);
    const mergedState = structuredClone(defaultState);
    mergedState.settings = {
      ...mergedState.settings,
      ...(parsed.settings || {})
    };
    mergedState.stats = {
      ...mergedState.stats,
      ...(parsed.stats || {})
    };
    mergedState.stats.completedSessions = Array.isArray(parsed.stats?.completedSessions)
      ? parsed.stats.completedSessions.map(sanitizeCompletedSessionEntry).filter(Boolean)
      : [];
    mergedState.stats.previousSessionWeakQuestionIds = Array.isArray(parsed.stats?.previousSessionWeakQuestionIds)
      ? parsed.stats.previousSessionWeakQuestionIds.map((id) => String(id))
      : [];
    mergedState.stats.pendingSessionNotice = typeof parsed.stats?.pendingSessionNotice === "string"
      ? parsed.stats.pendingSessionNotice
      : "";
    mergedState.stats.gameTicket = sanitizeGameTicketStats(parsed.stats?.gameTicket);
    mergedState.stats.pendingGameTicket = sanitizePendingGameTicket(parsed.stats?.pendingGameTicket);
    mergedState.stats.savedNormalSession = sanitizeStoredSession(parsed.stats?.savedNormalSession);
    mergedState.review = {
      ...mergedState.review,
      ...(parsed.review || {})
    };
    const savedItems = Array.isArray(parsed.items) ? parsed.items : [];
    mergedState.items = mergedState.items.map((defaultItem, index) => {
      const savedItem = savedItems[index] || {};
      const { id: _savedId, ...restSavedItem } = savedItem;
      const migratedLevelData = savedItem.levelData
        ? sanitizeLevelData(savedItem.levelData)
        : savedItem.mastered
          ? { level: 4, successCount: 0, lv4FailureCount: 0, lv4Celebrated: true }
          : {
            level: 1,
            successCount: Math.max(0, Math.min(1, Number(savedItem.consecutiveCorrect) || 0)),
            lv4FailureCount: 0,
            lv4Celebrated: false
          };
      return {
        ...defaultItem,
        ...restSavedItem,
        levelData: migratedLevelData,
        learningStats: sanitizeLearningStats(savedItem.learningStats),
        id: defaultItem.id
      };
    });
    mergedState.review.records = migrateStoredReviewData(parsed.review, mergedState.items);
    mergedState.session = sanitizeStoredSession(parsed.session);
    return mergedState;
  } catch (error) {
    console.error("Could not read saved state", error);
    return freshState;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function structuredClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayKey() {
  return formatDateKey(new Date());
}

function yesterdayKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return formatDateKey(date);
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

function getQuestionId(question) {
  return String(question?.id || question?.questionId || "");
}

function getQuestionById(id) {
  return state.items.find((item) => String(item.id) === String(id)) || null;
}

function getSessionQuestionIds(sessionLike) {
  if (Array.isArray(sessionLike?.questionIds) && sessionLike.questionIds.length) {
    return sessionLike.questionIds.map((id) => String(id));
  }
  if (Array.isArray(sessionLike?.questions)) {
    return sessionLike.questions.map((question) => String(question.id)).filter(Boolean);
  }
  return [];
}

function collectQuestionsByIdFromPool(ids, pool) {
  const byId = new Map((pool || []).map((item) => [String(item.id), item]));
  return (ids || [])
    .map((id) => byId.get(String(id)))
    .filter((item) => Boolean(item));
}

function buildStoredPerDayStats(questions, fallbackStats) {
  const baseStats = questions.reduce((acc, question) => {
    const key = String(question.day);
    acc[key] = acc[key] || { total: 0, correct: 0 };
    acc[key].total += 1;
    return acc;
  }, {});

  Object.entries(fallbackStats || {}).forEach(([dayKey, dayStats]) => {
    if (!baseStats[dayKey]) return;
    baseStats[dayKey].correct = Math.max(0, Number(dayStats?.correct) || 0);
  });

  return baseStats;
}

function sanitizeStoredSession(sessionLike) {
  if (!sessionLike || typeof sessionLike !== "object") return null;
  const questionIds = getSessionQuestionIds(sessionLike);
  if (!questionIds.length) return null;
  const vocabularyPool = buildVocabularyItems();
  const questions = collectQuestionsByIdFromPool(questionIds, vocabularyPool);
  if (!questions.length) return null;

  const currentIndex = Number(sessionLike.currentIndex);
  const startedAt = Number(sessionLike.startedAt);
  const accumulatedMs = Number(sessionLike.accumulatedMs);
  return {
    mode: typeof sessionLike.mode === "string" ? sessionLike.mode : "normal",
    phase: typeof sessionLike.phase === "string" ? sessionLike.phase : "phase1",
    focusLevel: Number.isFinite(Number(sessionLike.focusLevel)) ? Number(sessionLike.focusLevel) : null,
    questions,
    baseQuestions: (() => {
      if (!Array.isArray(sessionLike.baseQuestions) || !sessionLike.baseQuestions.length) {
        return questions.slice();
      }
      const restoredBase = collectQuestionsByIdFromPool(
        sessionLike.baseQuestions.map((question) => getQuestionId(question)),
        vocabularyPool
      );
      return restoredBase.length ? restoredBase : questions.slice();
    })(),
    baseQuestionIds: Array.isArray(sessionLike.baseQuestionIds) && sessionLike.baseQuestionIds.length
      ? sessionLike.baseQuestionIds.map((id) => String(id))
      : questionIds.slice(),
    mainQuestionIds: Array.isArray(sessionLike.mainQuestionIds) && sessionLike.mainQuestionIds.length
      ? sessionLike.mainQuestionIds.map((id) => String(id))
      : questionIds.slice(),
    previousReviewQuestionIds: Array.isArray(sessionLike.previousReviewQuestionIds)
      ? sessionLike.previousReviewQuestionIds.map((id) => String(id))
      : [],
    questionIds,
    wrongQuestionIds: Array.isArray(sessionLike.wrongQuestionIds) ? sessionLike.wrongQuestionIds.map((id) => String(id)) : [],
    currentIndex: Number.isInteger(currentIndex) ? Math.max(0, Math.min(questions.length - 1, currentIndex)) : 0,
    answered: Boolean(sessionLike.answered),
    currentQuestionAttempted: Boolean(sessionLike.currentQuestionAttempted),
    currentQuestionState: typeof sessionLike.currentQuestionState === "string" ? sessionLike.currentQuestionState : "idle",
    correctFirstAttempt: Math.max(0, Number(sessionLike.correctFirstAttempt) || 0),
    attemptedFirstCount: Math.max(0, Number(sessionLike.attemptedFirstCount) || 0),
    answerCount: Math.max(0, Number(sessionLike.answerCount) || 0),
    answerHistory: Array.isArray(sessionLike.answerHistory) ? sessionLike.answerHistory : [],
    startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
    accumulatedMs: Number.isFinite(accumulatedMs) ? Math.max(0, accumulatedMs) : 0,
    lastResumedAt: Date.now(),
    levelBucketCountsBefore: sessionLike.levelBucketCountsBefore || { 1: 0, 2: 0, 3: 0, 4: 0 },
    perDayAttemptStats: buildStoredPerDayStats(questions, sessionLike.perDayAttemptStats),
    awaitingEnter: false,
    enterLocked: false,
    answerLocked: false,
    enterConsumed: false,
    enterLockUntil: null,
    currentQuestion: null,
    awaitingPhaseStart: Boolean(sessionLike.awaitingPhaseStart),
    phase0Completed: Boolean(sessionLike.phase0Completed),
    phase0Skipped: Boolean(sessionLike.phase0Skipped),
    phase1Completed: Boolean(sessionLike.phase1Completed),
    phase2Completed: Boolean(sessionLike.phase2Completed),
    phase2Skipped: Boolean(sessionLike.phase2Skipped),
    phase3Completed: Boolean(sessionLike.phase3Completed),
    phase3Skipped: Boolean(sessionLike.phase3Skipped),
    isFinishingSession: false,
    isSessionCompleted: false
  };
}

function sanitizeCompletedSessionEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const accuracy = Number(entry.accuracy);
  const questionCount = Number(entry.questionCount);
  const durationMinutes = Number(entry.durationMinutes);
  return {
    dayKey: typeof entry.dayKey === "string" ? entry.dayKey : todayKey(),
    completedAt: Number.isFinite(Number(entry.completedAt)) ? Number(entry.completedAt) : Date.now(),
    mode: typeof entry.mode === "string" ? entry.mode : "normal",
    title: typeof entry.title === "string" ? entry.title : "学習結果",
    accuracy: Number.isFinite(accuracy) ? Math.max(0, Math.min(100, Math.round(accuracy))) : 0,
    questionCount: Number.isFinite(questionCount) ? Math.max(0, Math.round(questionCount)) : 0,
    durationMinutes: Number.isFinite(durationMinutes) ? Math.max(0, Math.round(durationMinutes)) : 0,
    interrupted: Boolean(entry.interrupted)
  };
}

function getSessionStartDayKey(sessionLike) {
  return formatDateKey(new Date(Number(sessionLike?.startedAt) || Date.now()));
}

function getSessionElapsedMs(sessionLike) {
  const accumulated = Math.max(0, Number(sessionLike?.accumulatedMs) || 0);
  const lastResumedAt = Number(sessionLike?.lastResumedAt);
  if (!Number.isFinite(lastResumedAt) || !lastResumedAt) {
    return accumulated;
  }
  return accumulated + Math.max(0, Date.now() - lastResumedAt);
}

function pauseSessionClock(sessionLike) {
  if (!sessionLike) return;
  sessionLike.accumulatedMs = getSessionElapsedMs(sessionLike);
  sessionLike.lastResumedAt = null;
}

function resumeSessionClock(sessionLike) {
  if (!sessionLike) return;
  sessionLike.lastResumedAt = Date.now();
}

function ensureReviewStore() {
  if (!state.review) state.review = { records: {} };
  if (!state.review.records || typeof state.review.records !== "object") {
    state.review.records = {};
  }
}

function getReviewRecord(questionId) {
  ensureReviewStore();
  return state.review.records[String(questionId)] || null;
}

function upsertReviewRecord(questionId, updates) {
  ensureReviewStore();
  const key = String(questionId);
  const current = state.review.records[key] || {
    questionId: key,
    reviewStage: 0,
    nextReviewDate: todayKey(),
    isVisibleInReviewList: false,
    lastReviewedDate: ""
  };
  state.review.records[key] = {
    ...current,
    ...updates,
    questionId: key
  };
}

function setItemReviewDue(questionId, visible) {
  const target = getQuestionById(questionId);
  if (target) {
    target.reviewDue = visible;
  }
}

function getReviewIntervalDays(stage) {
  if (stage <= 0) return 1;
  if (stage === 1) return 2;
  if (stage === 2) return 3;
  return 7;
}

function resetReviewSchedule(questionId) {
  const today = todayKey();
  upsertReviewRecord(questionId, {
    reviewStage: 0,
    nextReviewDate: today,
    isVisibleInReviewList: true,
    lastReviewedDate: today
  });
  setItemReviewDue(questionId, true);
}

function advanceReviewSchedule(questionId) {
  const today = todayKey();
  const current = getReviewRecord(questionId) || {
    reviewStage: 0
  };
  const currentStage = Number.isInteger(current.reviewStage) ? current.reviewStage : 0;
  const intervalDays = getReviewIntervalDays(currentStage);
  upsertReviewRecord(questionId, {
    reviewStage: currentStage + 1,
    nextReviewDate: addDays(today, intervalDays),
    isVisibleInReviewList: false,
    lastReviewedDate: today
  });
  setItemReviewDue(questionId, false);
}

function activateDueReviewItems() {
  ensureReviewStore();
  const today = todayKey();
  let changed = false;
  Object.values(state.review.records).forEach((record) => {
    if (!record || !record.questionId) return;
    if (!record.nextReviewDate) return;
    if (record.nextReviewDate <= today && !record.isVisibleInReviewList) {
      upsertReviewRecord(record.questionId, { isVisibleInReviewList: true });
      setItemReviewDue(record.questionId, true);
      changed = true;
    }
  });
  return changed;
}

function normalizeAnswer(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const PHRASE_FRAME_TOKENS = new Set(["人", "もの", "場所"]);
const PHRASE_PLACEHOLDER_TOKEN_MAP = new Map([
  ["人", "someone"],
  ["物", "something"],
  ["もの", "something"]
]);
const PHRASE_VISIBLE_PLACEHOLDERS = new Set(["someone", "something"]);

function normalizePhraseToken(token) {
  return String(token || "").trim().replace(/[()]/g, "");
}

function normalizePhrasePlaceholderToken(token) {
  const normalizedToken = normalizePhraseToken(token);
  return PHRASE_PLACEHOLDER_TOKEN_MAP.get(normalizedToken) || normalizedToken;
}

function isPhraseFrameToken(token) {
  const normalized = normalizePhraseToken(token);
  return PHRASE_FRAME_TOKENS.has(normalized);
}

function buildAcceptedPhraseAnswers(tokenMeta) {
  const accepted = new Set();
  const answerTokens = tokenMeta.filter((token) => !token.isFrameToken);
  const omittableIndexes = [];

  const addCandidate = (candidateTokens) => {
    const normalized = normalizeAnswer(candidateTokens.join(" "));
    if (normalized) accepted.add(normalized);
  };

  addCandidate(answerTokens.map((token) => token.normalizedToken).filter(Boolean));

  answerTokens.forEach((token, index) => {
    if (PHRASE_VISIBLE_PLACEHOLDERS.has(token.normalizedToken) || token.isOptional) {
      omittableIndexes.push(index);
    }
  });

  const variantCount = 1 << omittableIndexes.length;
  for (let mask = 1; mask < variantCount; mask += 1) {
    const omittedIndexes = new Set();
    omittableIndexes.forEach((tokenIndex, offset) => {
      if (mask & (1 << offset)) {
        omittedIndexes.add(tokenIndex);
      }
    });
    addCandidate(
      answerTokens
        .filter((_, index) => !omittedIndexes.has(index))
        .map((token) => token.normalizedToken)
        .filter(Boolean)
    );
  }

  return accepted;
}

function buildPhraseTypingSpec(question) {
  if (!question || question.type !== "phrase") return null;
  const rawAnswer = String(question.answer || question.english || "").trim();
  if (!rawAnswer) return null;
  const tokens = rawAnswer.split(/\s+/).filter(Boolean);
  if (!tokens.length) return null;

  const tokenMeta = tokens.map((rawToken, index) => ({
    rawToken,
    normalizedToken: normalizePhrasePlaceholderToken(rawToken),
    isFrameToken: isPhraseFrameToken(rawToken),
    isOptional: /\(.+\)/.test(rawToken),
    index
  }));

  const display = tokenMeta.map((token) => {
    if (PHRASE_VISIBLE_PLACEHOLDERS.has(token.normalizedToken)) {
      return token.normalizedToken;
    }
    return "＿＿";
  }).join(" ");

  const canonicalAnswerTokens = tokenMeta.map((token) => token.normalizedToken).filter(Boolean);
  const fullEnglish = tokenMeta
    .filter((token) => !token.isFrameToken)
    .map((token) => token.normalizedToken)
    .filter(Boolean);
  const acceptedNormalizedInputs = buildAcceptedPhraseAnswers(tokenMeta);

  acceptedNormalizedInputs.add(normalizeAnswer(rawAnswer));
  acceptedNormalizedInputs.add(normalizeAnswer(canonicalAnswerTokens.join(" ")));

  return {
    display,
    canonicalAnswer: canonicalAnswerTokens.join(" "),
    acceptedNormalizedInputs
  };
}

function getPreferredQuestionJapaneseText(question) {
  if (question?.type === "phrase") {
    return String(question?.learningJapanese || question?.japanese || "");
  }
  return String(question?.japanese || "");
}

function formatJapaneseQuestionText(question) {
  const japanese = getPreferredQuestionJapaneseText(question);
  if (!japanese) return "";
  return japanese
    .replace(/something/g, "物")
    .replace(/someone/g, "人");
}

function getQuestionPromptText(question) {
  const phraseSpec = buildPhraseTypingSpec(question);
  if (!phraseSpec) {
    return formatJapaneseQuestionText(question);
  }
  return `${formatJapaneseQuestionText(question)} (${phraseSpec.display})`;
}

function isCorrectAnswerForQuestion(question, normalizedInput) {
  const phraseSpec = buildPhraseTypingSpec(question);
  if (phraseSpec) {
    const normalizedPhraseInput = normalizeAnswer(
      String(normalizedInput || "")
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => normalizePhrasePlaceholderToken(token))
        .join(" ")
    );
    return phraseSpec.acceptedNormalizedInputs.has(normalizedPhraseInput);
  }
  const normalizedCorrect = normalizeAnswer(question.answer || question.english);
  return normalizedInput === normalizedCorrect;
}

function stopCurrentAudio() {
  if (!currentAudio) return;

  try {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  } catch (error) {
    console.error("Audio stop failed:", error);
  }

  currentAudio = null;
}

function playQuestionAudio(question, onComplete, onError) {
  const questionId = String(question?.id || "").trim();

  if (!questionId) {
    if (typeof onComplete === "function") onComplete();
    return false;
  }

  stopCurrentAudio();

  const audioPath = `audio/${encodeURIComponent(questionId)}.mp3`;
  const audio = new Audio(audioPath);
  console.log("audio question id:", question?.id);
  console.log("audio path:", audio.src);
  currentAudio = audio;
  audio.preload = "auto";
  audio.volume = 1;
  audio.playbackRate = 1;

  let completed = false;

  const finishOnce = () => {
    if (completed) return;
    completed = true;

    if (currentAudio === audio) {
      currentAudio = null;
    }

    if (typeof onComplete === "function") {
      onComplete();
    }
  };

  audio.addEventListener("ended", finishOnce, { once: true });
  audio.addEventListener(
    "error",
    () => {
      console.error("音声ファイル読込失敗:", audio.src);
      if (typeof onError === "function") {
        onError();
      }
      finishOnce();
    },
    { once: true }
  );

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.catch === "function") {
    playPromise.catch((error) => {
      console.error("音声再生失敗:", audio.src, error);
      if (typeof onError === "function") {
        onError();
      }
      finishOnce();
    });
  }

  return true;
}

function startSecondAudioAndAutoAdvance(question) {
  const session = state.session;
  if (!session || !session.answered || !session.awaitingEnter || session.enterLocked || session.enterConsumed) {
    return false;
  }

  session.enterLocked = true;
  session.enterConsumed = true;
  session.awaitingEnter = false;
  session.answerLocked = true;

  const targetQuestion = question || session.currentQuestion;
  if (!targetQuestion) {
    advanceToNextQuestion();
    return true;
  }

  playQuestionAudio(targetQuestion, () => {
    advanceToNextQuestion();
  });
  return true;
}

function enableSecondAudioTrigger(session, input, answerBtn) {
  if (!session) return;
  session.awaitingEnter = true;
  session.answered = true;
  session.enterLocked = false;
  session.answerLocked = true;
  session.enterConsumed = false;
  session.enterLockUntil = null;

  if (input) {
    input.disabled = false;
    input.focus();
  }

  if (answerBtn) {
    answerBtn.disabled = false;
    answerBtn.textContent = "2回目音声を再生";
  }
}

function finalizeIfCurrentPhaseCompleted(sessionLike, options = {}) {
  if (!sessionLike) return false;
  const currentIndex = Number.isFinite(Number(sessionLike.currentIndex)) ? Number(sessionLike.currentIndex) : 0;
  const totalQuestions = Array.isArray(sessionLike.questions) ? sessionLike.questions.length : 0;
  const nextIndex = currentIndex + 1;
  const completedCount = nextIndex;
  const isLastQuestion = totalQuestions > 0 && (completedCount >= totalQuestions || nextIndex >= totalQuestions);

  if (!isLastQuestion) return false;
  finishSession();
  return true;
}

function getWeeklySolvedCount() {
  const counts = state.stats.solvedByDay || {};
  let total = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = date.toISOString().slice(0, 10);
    total += counts[key] || 0;
  }
  return total;
}

function getReviewItems() {
  ensureReviewStore();
  const visibleIds = new Set(
    Object.values(state.review.records)
      .filter((record) => record.isVisibleInReviewList)
      .map((record) => String(record.questionId))
  );
  return state.items.filter((item) => visibleIds.has(String(item.id)));
}

function getReviewPool() {
  const reviewItems = getReviewItems();
  return weightedSampleWithoutReplacement(reviewItems, reviewItems.length);
}

function resetDailyReviewCounters() {
  const currentDate = todayKey();
  const lastDate = state.stats.lastSolvedDate || currentDate;
  if (lastDate !== currentDate) {
    state.items.forEach((item) => {
      item.reviewTodayCount = 0;
    });
  }
}

function updateStreak() {
  const current = todayKey();
  if (!state.stats.lastSolvedDate) {
    state.stats.streak = 1;
    state.stats.lastSolvedDate = current;
    return;
  }
  if (state.stats.lastSolvedDate === current) return;
  if (state.stats.lastSolvedDate === yesterdayKey()) {
    state.stats.streak += 1;
  } else {
    state.stats.streak = 1;
  }
  state.stats.lastSolvedDate = current;
}

function syncDerivedStats() {
  activateDueReviewItems();
  state.items.forEach((item) => syncLegacyItemFields(item));
  state.stats.masterCount = state.items.filter((item) => getEffectiveLevelForItem(item) === 4).length;
  state.stats.reviewCount = getReviewItems().length;
  state.stats.tickets = state.stats.tickets || 0;
  state.stats.weeklySolved = getWeeklySolvedCount();
  state.stats.dayBestAccuracy = state.stats.dayBestAccuracy || {};
  ensureGameTicketState();
}

function getAvailableDays() {
  return [...new Set(state.items.map((item) => item.day))].sort((a, b) => a - b);
}

function ensureItemsSyncedWithVocabularyBank() {
  const latestItems = buildVocabularyItems();
  if (!latestItems.length) return false;

  const currentItems = Array.isArray(state.items) ? state.items : [];
  const latestIds = latestItems.map((item) => String(item.id));
  const currentById = new Map(currentItems.map((item) => [String(item.id), item]));
  const needsSync =
    currentItems.length !== latestItems.length ||
    latestIds.some((id) => !currentById.has(id));

  if (!needsSync) return false;

  state.items = latestItems.map((item) => {
    const existing = currentById.get(String(item.id));
    if (!existing) return item;
    return {
      ...item,
      levelData: existing.levelData ? sanitizeLevelData(existing.levelData) : createDefaultLevelData(),
      learningStats: existing.learningStats ? sanitizeLearningStats(existing.learningStats) : sanitizeLearningStats(),
      mastered: Boolean(existing.mastered),
      consecutiveCorrect: Number.isFinite(existing.consecutiveCorrect) ? existing.consecutiveCorrect : 0,
      reviewDue: Boolean(existing.reviewDue),
      reviewTodayCount: Number.isFinite(existing.reviewTodayCount) ? existing.reviewTodayCount : 0,
      lastAnswerWasCorrect: Boolean(existing.lastAnswerWasCorrect)
    };
  });

  const validIdSet = new Set(latestIds);
  ensureReviewStore();
  const nextRecords = {};
  Object.entries(state.review.records).forEach(([id, record]) => {
    if (!validIdSet.has(String(id))) return;
    nextRecords[String(id)] = sanitizeReviewRecord(id, record);
  });
  state.review.records = nextRecords;

  return true;
}

function clampStudyRangeToAvailableDays() {
  const days = getAvailableDays();
  if (!days.length) {
    state.settings.studyRange = { start: 1, end: 1 };
    return;
  }

  const minDay = days[0];
  const maxDay = days[days.length - 1];
  const start = Number(state.settings.studyRange?.start);
  const end = Number(state.settings.studyRange?.end);
  const safeStart = Number.isFinite(start) ? Math.max(minDay, Math.min(maxDay, start)) : minDay;
  const safeEnd = Number.isFinite(end) ? Math.max(minDay, Math.min(maxDay, end)) : maxDay;

  state.settings.studyRange = {
    start: Math.min(safeStart, safeEnd),
    end: Math.max(safeStart, safeEnd)
  };
}

function syncDaySelectOptions() {
  const startSelect = document.getElementById("startDaySelect");
  const endSelect = document.getElementById("endDaySelect");
  if (!startSelect || !endSelect) return;

  const days = getAvailableDays();
  if (!days.length) {
    startSelect.innerHTML = "";
    endSelect.innerHTML = "";
    return;
  }

  const optionsMarkup = days.map((day) => `<option value="${day}">${day}</option>`).join("");
  startSelect.innerHTML = optionsMarkup;
  endSelect.innerHTML = optionsMarkup;

  clampStudyRangeToAvailableDays();
  startSelect.value = String(state.settings.studyRange.start);
  endSelect.value = String(state.settings.studyRange.end);
}

function formatDayAccuracy(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "未学習";
  }
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  return `${normalized}%`;
}

function renderDayProgress() {
  const dayProgressList = document.getElementById("dayProgressList");
  if (!dayProgressList) return;

  const bestByDay = state.stats.dayBestAccuracy || {};
  const rows = getAvailableDays().map((day) => {
    const stored = bestByDay[String(day)];
    const hasRecord = typeof stored === "number" && !Number.isNaN(stored);
    const normalized = hasRecord ? Math.max(0, Math.min(100, Math.round(stored))) : 0;
    return `<li class="day-progress-item"><span class="day-label">Day${day}</span><span class="day-value">${formatDayAccuracy(stored)}</span><div class="day-progress-bar"><div class="day-progress-fill" style="width:${normalized}%;"></div></div></li>`;
  });

  dayProgressList.innerHTML = rows.join("");
}

function renderHome() {
  syncDerivedStats();
  const advanceDayText = document.getElementById("advanceDayText");
  const advanceBtn = document.getElementById("advanceBtn");
  const progressMasterCount = document.getElementById("progressMasterCount");
  const daySelectWordBtn = document.getElementById("daySelectWordBtn");
  const daySelectPhraseBtn = document.getElementById("daySelectPhraseBtn");
  const challengeBtn = document.getElementById("challengeBtn");
  const availableDays = getAvailableDays();
  const nextDay = availableDays.length ? Math.min(availableDays[availableDays.length - 1], state.settings.studyRange.end + 1) : state.settings.studyRange.end;

  if (advanceDayText) advanceDayText.textContent = `Day${nextDay}`;
  if (progressMasterCount) progressMasterCount.textContent = state.stats.masterCount;
  if (advanceBtn) advanceBtn.disabled = false;
  if (daySelectWordBtn) daySelectWordBtn.disabled = false;
  if (daySelectPhraseBtn) daySelectPhraseBtn.disabled = false;
  if (challengeBtn) challengeBtn.disabled = false;
  renderHomeUpdateHistory();
  renderLevelCollection();
  renderRecentProgressTop5();
  renderHomeMessage();
}

function renderHomeUpdateHistory() {
  const list = document.getElementById("homeUpdateHistoryList");
  if (!list) return;
  list.innerHTML = SETTINGS_INFO.releaseHistory
    .map((entry) => `<li><span class="home-update-version">${entry.version}</span><span>${entry.note}</span></li>`)
    .join("");
}

function hasSavedNormalSession() {
  const restored = sanitizeStoredSession(state?.stats?.savedNormalSession);
  return Boolean(restored && restored.mode === "normal");
}

function stashNormalSessionIfNeeded(sessionLike) {
  if (!sessionLike || sessionLike.mode !== "normal") return;
  if (sessionLike.isSessionCompleted || sessionLike.isFinishingSession) return;
  pauseSessionClock(sessionLike);
  state.stats.savedNormalSession = structuredClone(sessionLike);
}

function restoreSavedNormalSession() {
  const restored = sanitizeStoredSession(state?.stats?.savedNormalSession);
  if (!restored || restored.mode !== "normal") return false;
  state.session = restored;
  state.stats.savedNormalSession = null;
  return true;
}

function showScreen(screenId, options = {}) {
  const recordHistory = options.recordHistory !== false;
  if (recordHistory && currentScreenId && currentScreenId !== screenId) {
    screenHistory.push(currentScreenId);
  }
  document.querySelectorAll(".screen").forEach((screen) => screen.classList.remove("active"));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add("active");
    currentScreenId = screenId;
  }
}

function goBackScreen() {
  while (screenHistory.length) {
    const previous = screenHistory.pop();
    if (!previous || previous === currentScreenId) continue;
    showScreen(previous, { recordHistory: false });
    return;
  }
  showScreen("homeScreen", { recordHistory: false });
}

function startNextDaySession() {
  const availableDays = getAvailableDays();
  if (!availableDays.length) return;
  const maxDay = availableDays[availableDays.length - 1];
  const nextDay = Math.min(maxDay, state.settings.studyRange.end + 1);
  state.settings.studyRange = { start: nextDay, end: nextDay };
  saveState();
  prepareSession("normal");
}

function getDayStudyPool(day, type) {
  const startDay = Number(day?.startDay);
  const endDay = Number(day?.endDay);
  const safeStart = Number.isFinite(startDay) ? Math.max(1, Math.min(14, startDay)) : 1;
  const safeEnd = Number.isFinite(endDay) ? Math.max(safeStart, Math.min(14, endDay)) : safeStart;
  const normalizedType = type === "word" || type === "phrase" || type === "all" ? type : "all";
  const dayItems = state.items.filter((item) => Number(item.day) >= safeStart && Number(item.day) <= safeEnd);
  const typedItems = normalizedType === "all" ? dayItems : dayItems.filter((item) => item.type === normalizedType);
  if (normalizedType === "phrase") {
    return shuffle(typedItems);
  }
  if (normalizedType === "all") {
    const targetCount = Math.min(10, typedItems.length);
    const shuffledWords = shuffle(dayItems.filter((item) => item.type === "word"));
    const shuffledPhrases = shuffle(dayItems.filter((item) => item.type === "phrase"));
    if (targetCount <= 0) return [];
    if (!shuffledWords.length || !shuffledPhrases.length) {
      return shuffle(typedItems).slice(0, targetCount);
    }
    const guaranteed = [shuffledWords.shift(), shuffledPhrases.shift()];
    const rest = shuffle([...shuffledWords, ...shuffledPhrases]);
    return [...guaranteed, ...rest].slice(0, targetCount);
  }
  const targetCount = Math.min(10, typedItems.length);
  return shuffle(typedItems).slice(0, targetCount);
}

function startDayStudySession(startDay, endDay, type) {
  const safeStart = Math.max(1, Math.min(14, Number(startDay) || 1));
  const safeEnd = Math.max(safeStart, Math.min(14, Number(endDay) || safeStart));
  const normalizedType = type === "word" || type === "phrase" || type === "all" ? type : "all";
  const customPool = getDayStudyPool({ startDay: safeStart, endDay: safeEnd }, normalizedType);

  state.settings.dayStudy = {
    start: safeStart,
    end: safeEnd,
    type: normalizedType
  };
  state.settings.studyRange = {
    start: safeStart,
    end: safeEnd
  };
  saveState();

  if (!customPool.length) {
    const dayText = safeStart === safeEnd ? `Day${safeStart}` : `Day${safeStart}～Day${safeEnd}`;
    alert(`${dayText} の${normalizedType === "all" ? "単語・熟語" : normalizedType === "word" ? "単語" : "熟語"}に出題可能な問題がありません。`);
    return;
  }

  prepareSession("normal", {
    customPool,
    forceNewSession: true,
    dayStudy: {
      start: safeStart,
      end: safeEnd,
      type: normalizedType
    }
  });
}

function getFilteredPool() {
  const { start, end } = state.settings.studyRange;
  return state.items.filter((item) => {
    const inRange = item.day >= start && item.day <= end;
    const typeMatches = state.settings.type === "all" || item.type === state.settings.type;
    return inRange && typeMatches;
  });
}

function getChallengePool() {
  ensureReviewStore();
  const seen = new Set();
  const candidates = [];
  Object.values(state.review.records || {}).forEach((record) => {
    if (!record?.questionId) return;
    const item = getQuestionById(record.questionId);
    if (!item) return;
    const key = String(item.id);
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(item);
  });
  return weightedSampleWithoutReplacement(candidates, 10);
}

function getPhraseSpiralPool(count = PHRASE_SPIRAL_TARGET_COUNT) {
  const phraseItems = state.items.filter((item) => item.type === "phrase");
  if (!phraseItems.length) return [];

  const buckets = {
    1: phraseItems.filter((item) => getEffectiveLevelForItem(item) === 1),
    2: phraseItems.filter((item) => getEffectiveLevelForItem(item) === 2),
    3: phraseItems.filter((item) => getEffectiveLevelForItem(item) === 3),
    4: phraseItems.filter((item) => getEffectiveLevelForItem(item) === 4)
  };

  const selected = [];
  const selectedIds = new Set();
  const targetCount = Math.max(0, Math.min(count, phraseItems.length));

  const takeFromPriority = (startLevel, requiredCount) => {
    let needed = requiredCount;
    for (let level = startLevel; level <= 4 && needed > 0; level += 1) {
      const available = shuffle((buckets[level] || []).filter((item) => !selectedIds.has(String(item.id))));
      const takeCount = Math.min(needed, available.length);
      for (let index = 0; index < takeCount; index += 1) {
        const picked = available[index];
        selected.push(picked);
        selectedIds.add(String(picked.id));
      }
      needed -= takeCount;
    }
  };

  [1, 2, 3, 4].forEach((level) => {
    takeFromPriority(level, PHRASE_SPIRAL_LEVEL_TARGETS[level] || 0);
  });

  if (selected.length < targetCount) {
    const fallback = shuffle(phraseItems.filter((item) => !selectedIds.has(String(item.id))));
    const remaining = targetCount - selected.length;
    selected.push(...fallback.slice(0, remaining));
  }

  return shuffle(selected).slice(0, targetCount);
}

function getPreviousSessionReviewPool() {
  const ids = Array.isArray(state.stats.previousSessionWeakQuestionIds)
    ? state.stats.previousSessionWeakQuestionIds
    : [];
  const questions = collectQuestionsById(ids);
  if (questions.length < 5) {
    return questions;
  }
  return shuffle(questions).slice(0, 5);
}

function getLevelBucketCounts() {
  const buckets = buildLevelBuckets();
  return {
    1: buckets[1].length,
    2: buckets[2].length,
    3: buckets[3].length,
    4: buckets[4].length
  };
}

function getPrimaryRecommendedLevel() {
  const counts = getLevelBucketCounts();
  return LEVEL_DEFINITIONS.find((entry) => counts[entry.level] > 0) || LEVEL_DEFINITIONS[0];
}

function formatSignedWordCount(count) {
  const value = Number(count) || 0;
  return `${value >= 0 ? "+" : "-"}${Math.abs(value)}語`;
}

function getSessionDisplayTitle(session) {
  if (!session) return "学習完了";
  if (session.mode === "phrase-spiral") {
    return "熟語特訓 完了！";
  }
  if (session.mode === "level-focus") {
    return `${levelIcon(session.focusLevel)} Lv${session.focusLevel} ${levelName(session.focusLevel)} 完了！`;
  }
  const dayKeys = Object.keys(session.perDayAttemptStats || {});
  if (dayKeys.length === 1) {
    return `Day${dayKeys[0]} 完了！`;
  }
  if (dayKeys.length > 1) {
    return `Day${dayKeys[0]}-${dayKeys[dayKeys.length - 1]} 完了！`;
  }
  return `Day${state.settings.studyRange.start} 完了！`;
}

function buildResultSummary(session) {
  const attempted = session.attemptedFirstCount || session.questions.length || 0;
  const accuracy = attempted ? Math.round(((session.correctFirstAttempt || 0) / attempted) * 100) : 0;
  const durationMinutes = Math.max(1, Math.round(getSessionElapsedMs(session) / 60000));
  const before = session.levelBucketCountsBefore || { 1: 0, 2: 0, 3: 0, 4: 0 };
  const after = getLevelBucketCounts();
  const levelChanges = LEVEL_DEFINITIONS.map((entry) => ({
    ...entry,
    delta: (after[entry.level] || 0) - (before[entry.level] || 0),
    count: after[entry.level] || 0
  }));
  const recommended = getPrimaryRecommendedLevel();
  const recommendedCount = after[recommended.level] || 0;
  const current = Math.min((session.currentIndex || 0) + 1, session.questions.length || 1);
  const correctCount = Math.max(0, Number(session.correctFirstAttempt) || 0);

  return {
    mode: session.mode,
    dayKey: getSessionStartDayKey(session),
    title: session.completedReason === "completed" ? `🎉 ${getSessionDisplayTitle(session)}` : "📊 今回の学習結果",
    accuracy,
    answerCount: attempted,
    correctCount,
    durationMinutes,
    learnedCount: getLearnedItemCount(),
    streak: state.stats.streak || 0,
    currentPhase: getPhaseMeta(session).title,
    currentProgress: `${current} / ${session.questions.length || 0}`,
    canResume: false,
    levelChanges,
    recommendation: {
      level: recommended.level,
      label: `${recommended.icon} ${recommended.label}`,
      count: recommendedCount
    },
    canAdvanceDay: session.mode === "normal" && session.completedReason === "completed",
    interrupted: session.completedReason !== "completed"
  };
}

function buildSuspendedSummary(session) {
  const answered = Math.max(0, Number(session?.answerCount) || 0);
  const correct = Array.isArray(session?.answerHistory)
    ? session.answerHistory.filter((entry) => entry?.isCorrect).length
    : 0;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const durationMinutes = Math.max(1, Math.round(getSessionElapsedMs(session) / 60000));
  const current = Math.min((session?.currentIndex || 0) + 1, session?.questions?.length || 1);
  return {
    mode: session.mode,
    dayKey: getSessionStartDayKey(session),
    title: "⏸ ここまでの学習結果",
    accuracy,
    answerCount: answered,
    correctCount: correct,
    durationMinutes,
    learnedCount: getLearnedItemCount(),
    streak: state.stats.streak || 0,
    currentPhase: getPhaseMeta(session).title,
    currentProgress: `${current} / ${session?.questions?.length || 0}`,
    canAdvanceDay: false,
    canResume: false,
    interrupted: true,
    levelChanges: LEVEL_DEFINITIONS.map((entry) => ({ ...entry, delta: 0, count: getLevelBucketCounts()[entry.level] || 0 })),
    recommendation: {
      level: getPrimaryRecommendedLevel().level,
      label: `${getPrimaryRecommendedLevel().icon} ${getPrimaryRecommendedLevel().label}`,
      count: getLevelBucketCounts()[getPrimaryRecommendedLevel().level] || 0
    }
  };
}

function appendCompletedSession(summary) {
  const history = Array.isArray(state.stats.completedSessions) ? state.stats.completedSessions.slice() : [];
  history.push(sanitizeCompletedSessionEntry({
    dayKey: summary.dayKey,
    completedAt: Date.now(),
    mode: summary.mode,
    title: summary.title,
    accuracy: summary.accuracy,
    questionCount: summary.answerCount,
    durationMinutes: summary.durationMinutes,
    interrupted: summary.interrupted
  }));
  state.stats.completedSessions = history.slice(-240);
}

function completeCurrentSession(reason = "completed", options = {}) {
  const session = state.session;
  if (!session) return;
  if (session.isFinishingSession || session.isSessionCompleted) return;
  session.isFinishingSession = true;
  pauseSessionClock(session);
  session.completedReason = reason;
  updateBestAccuracyFromSession(session);
  const summary = buildResultSummary(session);
  state.stats.lastResultSummary = summary;
  maybeDiscoverGameTicket(session, reason);
  if (session.mode === "normal") {
    const weakIds = extractWeakQuestionIdsFromSession(session);
    state.stats.previousSessionWeakQuestionIds = weakIds;
  }
  appendCompletedSession(summary);
  session.isSessionCompleted = true;
  state.session = null;
  setTestScreenActive(false);
  saveState();
  renderHome();
  if (options.showResult !== false) {
    showResultScreen(summary);
  }
}

function extractWeakQuestionIdsFromSession(session) {
  if (!session || !Array.isArray(session.answerHistory)) return [];
  const seen = new Set();
  const weakIds = [];
  session.answerHistory.forEach((entry) => {
    const id = String(entry?.questionId || "");
    if (!id || seen.has(id)) return;
    seen.add(id);
    const item = getQuestionById(id);
    if (!item) return;
    if (getEffectiveLevelForItem(item) <= 2) {
      weakIds.push(id);
    }
  });
  return weakIds;
}

function autoCompleteStaleSessionIfNeeded() {
  const session = state.session;
  if (!session) return false;
  if (getSessionStartDayKey(session) === todayKey()) return false;
  completeCurrentSession("auto-ended", { showResult: false });
  state.stats.pendingSessionNotice = "昨日の学習は途中終了として保存しました。";
  saveState();
  return true;
}

function flushPendingSessionNotice() {
  if (!state.stats.pendingSessionNotice) return;
  const message = state.stats.pendingSessionNotice;
  state.stats.pendingSessionNotice = "";
  saveState();
  alert(message);
}

function suspendCurrentSession() {
  if (!state.session) return;
  pauseSessionClock(state.session);
  const summary = buildSuspendedSummary(state.session);
  state.stats.lastResultSummary = summary;
  saveState();
  setTestScreenActive(false);
  showResultScreen(summary);
}

function returnHomeFromInterruptedResult() {
  showScreen("homeScreen", { recordHistory: false });
  renderHome();
}

function resumeActiveSession() {
  const session = state.session;
  if (!session) return false;
  if (autoCompleteStaleSessionIfNeeded()) return false;
  resumeSessionClock(session);
  session.answered = false;
  session.awaitingEnter = false;
  session.enterLocked = false;
  session.answerLocked = false;
  session.enterConsumed = false;
  session.enterLockUntil = null;
  setTestModeHeader(session.questions.length);
  saveState();
  setTestScreenActive(true);
  if (session.awaitingPhaseStart) {
    renderPhaseIntro();
  } else if (session.mode === "review") {
    renderReviewSession();
  } else {
    renderQuestionSession();
  }
  showScreen("testScreen");
  return true;
}

function setTestModeHeader(questionCount) {
  const modeTitle = document.getElementById("testModeTitle");
  if (!modeTitle) return;
  const safeCount = Number.isFinite(questionCount) && questionCount > 0 ? Math.floor(questionCount) : 10;
  modeTitle.textContent = `${safeCount}問`;
}

function collectQuestionsById(ids) {
  return (ids || [])
    .map((id) => getQuestionById(id))
    .filter((item) => Boolean(item));
}

function startNormalAutoReviewRound(session, round) {
  if (!session) return false;
  const wrongIds = Array.isArray(session.wrongQuestionIds) ? session.wrongQuestionIds : [];
  const questions = collectQuestionsById(wrongIds);
  if (!questions.length) return false;

  const useIntro = session.mode === "normal";
  return beginSessionPhase(session, "phase2", questions, { showIntro: useIntro });
}

function startNormalMainRound(session) {
  if (!session || session.mode !== "normal") return false;
  const ids = Array.isArray(session.mainQuestionIds) ? session.mainQuestionIds : [];
  const questions = collectQuestionsById(ids);
  if (!questions.length) return false;
  return beginSessionPhase(session, "phase1", questions, { showIntro: true });
}

function clearCardForTransition(mode) {
  const isReview = mode === "review";
  const meaningText = document.getElementById(isReview ? "reviewMeaningText" : "meaningText");
  const similarHints = document.getElementById(isReview ? "reviewSimilarHints" : "similarHints");
  const feedbackBox = document.getElementById(isReview ? "reviewFeedbackBox" : "feedbackBox");
  const nextButton = document.getElementById(isReview ? "reviewNextBtn" : "nextQuestionBtn");
  const card = document.getElementById(isReview ? "reviewCard" : "questionCard");
  const input = card ? card.querySelector(".answer-input") : null;

  if (meaningText) meaningText.textContent = "次の問題を待っています";
  if (similarHints) {
    similarHints.classList.add("hidden");
    similarHints.innerHTML = "";
  }
  if (feedbackBox) {
    feedbackBox.className = "feedback-box hidden";
    feedbackBox.innerHTML = "";
  }
  if (nextButton) nextButton.classList.add("hidden");
  if (input) {
    input.value = "";
    input.disabled = true;
    input.blur();
  }
}

function shuffle(array) {
  const copy = [...array];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function setTestScreenActive(active) {
  document.getElementById("testScreen").classList.toggle("test-active", active);
}

function getLevelFocusCandidates(level) {
  const focusLevel = Number(level) || activeLevelFilter || 1;
  const buckets = buildLevelBuckets();
  return (buckets[focusLevel] || []).slice();
}

function getLevelFocusBatch(level, count = LEVEL_FOCUS_BATCH_SIZE) {
  const candidates = getLevelFocusCandidates(level);
  if (!candidates.length) return [];
  return shuffle(candidates).slice(0, Math.min(count, candidates.length));
}

function updateResultActionSelection(mode) {
  resultActionFocusMode = mode || null;
  const resultNextDayBtn = document.getElementById("resultNextDayBtn");
  const resultHomeBtn = document.getElementById("resultHomeBtn");
  if (!resultNextDayBtn || !resultHomeBtn) return;
  const nextSelected = mode === "next";
  const homeSelected = mode === "home";
  resultNextDayBtn.classList.toggle("is-selected", nextSelected);
  resultHomeBtn.classList.toggle("is-selected", homeSelected);
}

function moveResultActionSelection(direction) {
  if (currentScreenId !== "resultScreen") return;
  if (resultActionFocusMode !== "next" && resultActionFocusMode !== "home") return;
  updateResultActionSelection(direction > 0 ? "home" : "next");
}

function startNextLevelFocusBatch(level) {
  const focusLevel = Number(level) || activeLevelFilter || 1;
  const batch = getLevelFocusBatch(focusLevel, LEVEL_FOCUS_BATCH_SIZE);
  if (!batch.length) {
    const summary = state.stats.lastResultSummary || {};
    const clearedSummary = {
      ...summary,
      mode: "level-focus",
      title: "🎉 苦手問題をすべてクリアしました！",
      currentPhase: "苦手特訓",
      currentProgress: "完了",
      levelFocusCleared: true,
      interrupted: false,
      canAdvanceDay: false,
      canResume: false
    };
    state.stats.lastResultSummary = clearedSummary;
    saveState();
    showResultScreen(clearedSummary);
    return;
  }
  prepareSession("level-focus", { level: focusLevel, customPool: batch });
}

function prepareSession(mode, options = {}) {
  if (options.resumeExisting && state.session) {
    resumeActiveSession();
    return;
  }

  if (state.session) {
    const switchingToDifferentMode = state.session.mode !== mode;
    if (switchingToDifferentMode) {
      stashNormalSessionIfNeeded(state.session);
      state.session = null;
    } else if (!options.forceNewSession) {
      resumeActiveSession();
      return;
    }
  }

  if (mode === "normal" && !options.customPool && !options.forceNewSession) {
    if (restoreSavedNormalSession()) {
      saveState();
      resumeActiveSession();
      return;
    }
  }

  const itemsSynced = ensureItemsSyncedWithVocabularyBank();
  if (itemsSynced) {
    clampStudyRangeToAvailableDays();
    syncDaySelectOptions();
  }

  resetDailyReviewCounters();
  let questions = [];
  let mainQuestions = [];
  let previousReviewQuestions = [];
  if (mode === "review") {
    questions = getReviewPool();
  } else if (mode === "challenge") {
    questions = getChallengePool();
  } else if (mode === "phrase-spiral") {
    questions = getPhraseSpiralPool(PHRASE_SPIRAL_TARGET_COUNT);
    mainQuestions = questions.slice();
  } else if (mode === "level-focus") {
    const focusLevel = Number(options.level) || activeLevelFilter || 1;
    const customPool = Array.isArray(options.customPool) ? options.customPool.filter((item) => Boolean(item)) : null;
    questions = customPool && customPool.length
      ? shuffle(customPool).slice(0, Math.min(LEVEL_FOCUS_BATCH_SIZE, customPool.length))
      : getLevelFocusBatch(focusLevel, LEVEL_FOCUS_BATCH_SIZE);
  } else {
    const hasCustomPool = Array.isArray(options.customPool);
    const pool = hasCustomPool ? options.customPool.filter((item) => Boolean(item)) : getFilteredPool();
    mainQuestions = hasCustomPool
      ? shuffle(pool).slice(0, Math.min(10, pool.length))
      : weightedSampleWithoutReplacement(pool, 10);
    previousReviewQuestions = hasCustomPool ? [] : getPreviousSessionReviewPool();
    questions = previousReviewQuestions.length ? previousReviewQuestions : mainQuestions;
  }

  if (!questions.length) {
    if (mode === "normal") {
      const { start, end } = state.settings.studyRange;
      alert(`Day ${start}-${end} の範囲に出題可能な問題がありません。`);
      showScreen("testScreen");
      setTestScreenActive(false);
    } else if (mode === "phrase-spiral") {
      alert("出題可能な熟語がありません。");
      showScreen("homeScreen");
      renderHome();
    } else if (mode === "level-focus") {
      alert("このカテゴリに出題可能な単語・熟語がありません。");
      showScreen("levelDetailScreen");
      renderLevelWordList(activeLevelFilter);
    } else if (mode === "challenge") {
      alert("過去の間違いデータがまだありません。通常テストで学習を進めてください。");
      showScreen("homeScreen");
      renderHome();
    } else {
      showScreen("homeScreen");
      renderHome();
    }
    return;
  }

  state.session = {
    mode,
    phase: mode === "normal" ? (previousReviewQuestions.length ? "phase0" : "phase1") : mode === "review" ? "phase2" : mode === "phrase-spiral" ? "phase1" : "phase3",
    focusLevel: Number(options.level) || null,
    questions,
    baseQuestions: (mode === "normal" || mode === "phrase-spiral" ? mainQuestions : questions).slice(),
    baseQuestionIds: (mode === "normal" || mode === "phrase-spiral" ? mainQuestions : questions).map((question) => String(question.id)),
    mainQuestionIds: (mode === "normal" || mode === "phrase-spiral" ? mainQuestions : questions).map((question) => String(question.id)),
    previousReviewQuestionIds: previousReviewQuestions.map((question) => String(question.id)),
    questionIds: questions.map((question) => String(question.id)),
    wrongQuestionIds: [],
    currentIndex: 0,
    answered: false,
    currentQuestionAttempted: false,
    currentQuestionState: "idle",
    correctFirstAttempt: 0,
    attemptedFirstCount: 0,
    answerCount: 0,
    answerHistory: [],
    startedAt: Date.now(),
    accumulatedMs: 0,
    lastResumedAt: Date.now(),
    levelBucketCountsBefore: getLevelBucketCounts(),
    perDayAttemptStats: (mode === "normal" || mode === "phrase-spiral" ? mainQuestions : questions).reduce((acc, question) => {
      const key = String(question.day);
      acc[key] = acc[key] || { total: 0, correct: 0 };
      acc[key].total += 1;
      return acc;
    }, {}),
    awaitingPhaseStart: false,
    phase0Completed: false,
    phase0Skipped: mode === "normal" ? previousReviewQuestions.length === 0 : true,
    phase1Completed: false,
    phase2Completed: false,
    phase2Skipped: false,
    phase3Completed: false,
    phase3Skipped: mode === "phrase-spiral" ? true : false,
    isFinishingSession: false,
    isSessionCompleted: false
  };

  setTestScreenActive(true);
  if (mode === "review") {
    beginSessionPhase(state.session, "phase2", questions, { showIntro: true });
  } else if (mode === "phrase-spiral") {
    beginSessionPhase(state.session, "phase1", questions, { showIntro: false });
  } else if (mode === "challenge" || mode === "level-focus") {
    beginSessionPhase(state.session, "phase3", questions, { showIntro: true });
  } else {
    if (previousReviewQuestions.length) {
      beginSessionPhase(state.session, "phase0", previousReviewQuestions, { showIntro: true });
    } else {
      beginSessionPhase(state.session, "phase1", mainQuestions, { showIntro: true });
    }
  }
  saveState();
}

function focusActiveInput() {
  const activeCard = document.querySelector("#questionCard:not(.hidden) .answer-input, #reviewCard:not(.hidden) .answer-input");
  if (activeCard) {
    activeCard.focus();
  }
}

function animateQuestionCard(card) {
  if (!card) return;
  card.classList.add("is-transitioning");
  window.setTimeout(() => {
    card.classList.remove("is-transitioning");
  }, 140);
}

function renderQuestionSession() {
  const session = state.session;
  if (!session) return;

  const question = session.questions[session.currentIndex];
  if (!question) {
    finishSession();
    return;
  }

  const questionCard = document.getElementById("questionCard");
  const reviewCard = document.getElementById("reviewCard");
  const questionCounter = document.getElementById("questionCounter");
  const questionPhaseText = document.getElementById("questionPhaseText");
  const questionTypeBadge = document.getElementById("questionTypeBadge");
  const meaningText = document.getElementById("meaningText");
  const similarHints = document.getElementById("similarHints");
  const feedbackBox = document.getElementById("feedbackBox");
  const nextQuestionBtn = document.getElementById("nextQuestionBtn");
  const input = questionCard.querySelector(".answer-input");
  const form = questionCard.querySelector(".answer-form");
  const answerBtn = questionCard.querySelector(".mobile-answer-btn");
  if (answerBtn) answerBtn.textContent = "答える";
  if (answerBtn) answerBtn.disabled = false;

  questionCounter.textContent = `${session.currentIndex + 1} / ${session.questions.length}`;
  if (questionPhaseText) questionPhaseText.textContent = formatPhaseProgressText(session);
  questionTypeBadge.textContent = question.type === "phrase" ? "熟語で答える" : "単語で答える";
  questionTypeBadge.className = `type-badge ${question.type === "phrase" ? "phrase" : "word"}`;
  meaningText.textContent = getQuestionPromptText(question);
  similarHints.classList.toggle("hidden", !(question.similar || []).length);
  similarHints.innerHTML = (question.similar || []).length
    ? `<strong>類義語ヒント</strong><ul>${(question.similar || []).map((item) => `<li>${item.answer} = ${item.reason}</li>`).join("")}</ul>`
    : "";
  feedbackBox.className = "feedback-box hidden";
  feedbackBox.innerHTML = "";
  nextQuestionBtn.classList.add("hidden");
  input.value = "";
  input.disabled = false;
  input.placeholder = question.type === "phrase" ? "空欄の英語だけ入力" : "英語を入力してください";
  const submitCurrentAnswer = () => {
    submitAnswer(question, input.value, feedbackBox, nextQuestionBtn, questionCard);
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    submitCurrentAnswer();
  };
  if (answerBtn) {
    answerBtn.onclick = (event) => {
      event.preventDefault();
      const activeSession = state.session;
      if (activeSession?.answered && activeSession.awaitingEnter) {
        startSecondAudioAndAutoAdvance(activeSession.currentQuestion);
        return;
      }
      submitCurrentAnswer();
    };
  }
  if (reviewCard) reviewCard.classList.add("hidden");
  questionCard.classList.remove("hidden");
  animateQuestionCard(questionCard);
  input.value = "";
  input.disabled = false;
  window.setTimeout(() => input.focus(), 60);
  session.answered = false;
  session.awaitingEnter = false;
  session.enterLocked = false;
  session.answerLocked = false;
  session.currentQuestionAttempted = false;
  session.currentQuestionState = "idle";
  session.currentQuestion = question;
}

function renderReviewSession() {
  const session = state.session;
  if (!session) return;

  const question = session.questions[session.currentIndex];
  if (!question) {
    finishSession();
    return;
  }

  const reviewCard = document.getElementById("reviewCard");
  const questionCard = document.getElementById("questionCard");
  const reviewCounter = document.getElementById("reviewCounter");
  const reviewPhaseText = document.getElementById("reviewPhaseText");
  const reviewTypeBadge = document.getElementById("reviewTypeBadge");
  const reviewMeaningText = document.getElementById("reviewMeaningText");
  const reviewSimilarHints = document.getElementById("reviewSimilarHints");
  const reviewFeedbackBox = document.getElementById("reviewFeedbackBox");
  const reviewNextBtn = document.getElementById("reviewNextBtn");
  const input = reviewCard.querySelector(".answer-input");
  const form = reviewCard.querySelector(".answer-form");
  const answerBtn = reviewCard.querySelector(".mobile-answer-btn");
  if (answerBtn) answerBtn.textContent = "答える";
  if (answerBtn) answerBtn.disabled = false;

  reviewCounter.textContent = `${session.currentIndex + 1} / ${session.questions.length}`;
  if (reviewPhaseText) reviewPhaseText.textContent = formatPhaseProgressText(session);
  reviewTypeBadge.textContent = question.type === "phrase" ? "熟語で答える" : "単語で答える";
  reviewTypeBadge.className = `type-badge ${question.type === "phrase" ? "phrase" : "word"}`;
  reviewMeaningText.textContent = getQuestionPromptText(question);
  reviewSimilarHints.classList.toggle("hidden", !(question.similar || []).length);
  reviewSimilarHints.innerHTML = (question.similar || []).length
    ? `<strong>類義語ヒント</strong><ul>${(question.similar || []).map((item) => `<li>${item.answer} = ${item.reason}</li>`).join("")}</ul>`
    : "";
  reviewFeedbackBox.className = "feedback-box hidden";
  reviewFeedbackBox.innerHTML = "";
  reviewNextBtn.classList.add("hidden");
  input.value = "";
  input.disabled = false;
  input.placeholder = question.type === "phrase" ? "空欄の英語だけ入力" : "英語を入力してください";
  const submitCurrentAnswer = () => {
    submitAnswer(question, input.value, reviewFeedbackBox, reviewNextBtn, reviewCard);
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    submitCurrentAnswer();
  };
  if (answerBtn) {
    answerBtn.onclick = (event) => {
      event.preventDefault();
      const activeSession = state.session;
      if (activeSession?.answered && activeSession.awaitingEnter) {
        startSecondAudioAndAutoAdvance(activeSession.currentQuestion);
        return;
      }
      submitCurrentAnswer();
    };
  }
  if (questionCard) questionCard.classList.add("hidden");
  reviewCard.classList.remove("hidden");
  animateQuestionCard(reviewCard);
  input.value = "";
  input.disabled = false;
  window.setTimeout(() => input.focus(), 60);
  session.answered = false;
  session.awaitingEnter = false;
  session.enterLocked = false;
  session.answerLocked = false;
  session.currentQuestionAttempted = false;
  session.currentQuestionState = "idle";
  session.currentQuestion = question;
}

function handleEnterAdvanceKey(event) {
  if (event.key !== "Enter") return;
  const session = state.session;
  if (!session || !session.answered || !session.awaitingEnter || session.enterLocked) {
    return;
  }
  if (session.enterLockUntil && Date.now() < session.enterLockUntil) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  startSecondAudioAndAutoAdvance(session.currentQuestion);
}

function advanceToNextQuestion() {
  const session = state.session;
  if (!session) return;

  session.enterLocked = false;
  session.enterConsumed = true;
  session.awaitingEnter = false;
  session.answered = false;
  session.answerLocked = false;
  session.enterLockUntil = Date.now() + 120;

  const nextIndex = session.currentIndex + 1;
  const nextQuestion = session.questions?.[nextIndex];
  if (!nextQuestion) {
    finishSession();
    return;
  }

  session.currentIndex = nextIndex;
  if (session.mode === "review") {
    renderReviewSession();
  } else {
    renderQuestionSession();
  }
}

function handleReplayAndAdvance(question) {
  const session = state.session;
  if (!session || !session.answered || !session.awaitingEnter || session.enterLocked || session.enterConsumed) {
    return;
  }
  startSecondAudioAndAutoAdvance(question);
}

function showResultScreen(summary = state.stats.lastResultSummary) {
  if (!summary) return;

  const resultHeaderTitle = document.getElementById("resultHeaderTitle");
  const resultTitle = document.getElementById("resultTitle");
  const resultSummary = document.getElementById("resultSummary");
  const resultAccuracy = document.getElementById("resultAccuracy");
  const resultQuestionCount = document.getElementById("resultQuestionCount");
  const resultCorrectCount = document.getElementById("resultCorrectCount");
  const resultStudyTime = document.getElementById("resultStudyTime");
  const resultLearnedCount = document.getElementById("resultLearnedCount");
  const resultStreak = document.getElementById("resultStreak");
  const resultCurrentPhase = document.getElementById("resultCurrentPhase");
  const resultCurrentProgress = document.getElementById("resultCurrentProgress");
  const resultLevelChanges = document.getElementById("resultLevelChanges");
  const resultRecommendationBtn = document.getElementById("resultRecommendationBtn");
  const resultNextDayBtn = document.getElementById("resultNextDayBtn");
  const resultHomeBtn = document.getElementById("resultHomeBtn");
  if (!resultTitle || !resultSummary || !resultAccuracy || !resultQuestionCount || !resultCorrectCount || !resultStudyTime || !resultLearnedCount || !resultStreak || !resultCurrentPhase || !resultCurrentProgress || !resultLevelChanges || !resultRecommendationBtn || !resultNextDayBtn || !resultHomeBtn) {
    return;
  }

  if (resultHeaderTitle) resultHeaderTitle.textContent = summary.title;
  resultTitle.textContent = summary.title;
  resultSummary.textContent = summary.interrupted ? "中断時点までの学習結果です。" : "今日の学習成果をまとめました。";
  resultAccuracy.innerHTML = buildAccuracyEvaluationMarkup(summary.accuracy, "recent-accuracy-value result-accuracy-value");
  resultQuestionCount.textContent = `${summary.answerCount}問`;
  resultCorrectCount.textContent = `${Math.max(0, Number(summary.correctCount) || 0)}問`;
  resultStudyTime.textContent = `${summary.durationMinutes}分`;
  resultLearnedCount.textContent = `${summary.learnedCount} / 1000語`;
  resultStreak.textContent = `${summary.streak}日`;
  resultCurrentPhase.textContent = summary.currentPhase || "-";
  resultCurrentProgress.textContent = summary.currentProgress || "-";
  resultLevelChanges.innerHTML = summary.levelChanges.map((entry) => `<li><span>${entry.icon} ${entry.label}</span><span>${formatSignedWordCount(entry.delta)}</span></li>`).join("");
  resultRecommendationBtn.textContent = `▶ ${summary.recommendation.label}（${summary.recommendation.count}語）を復習`;
  resultRecommendationBtn.dataset.level = String(summary.recommendation.level);
  if (summary.mode === "level-focus") {
    resultRecommendationBtn.classList.add("hidden");
    if (summary.levelFocusCleared) {
      resultSummary.textContent = "苦手問題をすべてクリアしました！";
      resultNextDayBtn.classList.add("hidden");
      resultHomeBtn.textContent = "🏠 ホームへ戻る";
      updateResultActionSelection("home");
    } else {
      resultSummary.textContent = "続けて苦手問題に取り組めます。";
      resultNextDayBtn.classList.remove("hidden");
      resultNextDayBtn.textContent = "① あと5問";
      resultHomeBtn.textContent = "② 今日はここまで";
      updateResultActionSelection("next");
    }
  } else {
    resultRecommendationBtn.classList.toggle("hidden", Boolean(summary.interrupted));
    resultNextDayBtn.classList.toggle("hidden", !summary.canAdvanceDay && !summary.canResume);
    resultNextDayBtn.textContent = summary.canResume ? "▶ 続きから学習" : "▶ 次のDayへ";
    resultHomeBtn.textContent = "🏠 ホームへ戻る";
    updateResultActionSelection(null);
  }
  showScreen("resultScreen");
  showPendingGameTicketModalIfAny();
}

function buildFeedbackMarkup(isCorrect, answer, prompt) {
  const symbol = isCorrect ? "〇 正解！" : "× 不正解";
  return `<strong>${symbol}</strong><div class="answer-line">${answer}</div><span class="hint">${prompt}</span>`;
}

function showAudioPlaybackError(targetFeedbackBox = null) {
  const feedbackBox = targetFeedbackBox || document.querySelector("#questionCard:not(.hidden) .feedback-box, #reviewCard:not(.hidden) .feedback-box");
  if (!feedbackBox) return;
  feedbackBox.className = "feedback-box error";
  feedbackBox.innerHTML = "<strong>音声を再生できません</strong>";
}

function submitAnswer(question, rawAnswer, feedbackBox, nextButton, card) {
  const session = state.session;
  if (!session || session.answerLocked) return;

  const trimmedAnswer = rawAnswer.trim();
  if (!trimmedAnswer) {
    const input = card.querySelector(".answer-input");
    if (feedbackBox) {
      feedbackBox.className = "feedback-box error";
      feedbackBox.innerHTML = "<strong>入力してください</strong><span class=\"hint\">英語を入力してから回答してください</span>";
    }
    if (input) {
      input.focus();
    }
    return;
  }

  session.answerCount = (session.answerCount || 0) + 1;

  const item = state.items.find((entry) => entry.id === question.id);
  const questionId = getQuestionId(question);
  const normalizedAnswer = normalizeAnswer(trimmedAnswer);
  const isCorrect = isCorrectAnswerForQuestion(question, normalizedAnswer);
  const input = card.querySelector(".answer-input");
  const answerBtn = card.querySelector(".mobile-answer-btn");
  const isMainNormalRun = session.mode === "normal" && session.phase === "phase1";
  const isPhraseSpiralMainRun = session.mode === "phrase-spiral" && session.phase === "phase1";
  const isScoredNormalRun = session.mode === "normal" && (session.phase === "phase0" || session.phase === "phase1");
  session.answerHistory.push({
    questionId: String(question.id),
    isCorrect,
    answer: trimmedAnswer,
    phase: session.phase,
    index: session.currentIndex,
    at: Date.now()
  });

  if (!session.currentQuestionAttempted) {
    session.currentQuestionAttempted = true;
    item.hasBeenStudied = true;
    recordItemStudyAttempt(item, isCorrect);
    if (isScoredNormalRun || session.mode !== "normal") {
      session.attemptedFirstCount += 1;
    }
    session.answered = false;
    session.answerLocked = false;
    session.awaitingEnter = false;
    session.enterLocked = false;
    session.enterConsumed = false;
    session.enterLockUntil = null;

    if (isCorrect) {
      const levelChange = updateItemLevelProgress(item, true);
      if (isScoredNormalRun || session.mode !== "normal") {
        session.correctFirstAttempt += 1;
      }
      if ((isScoredNormalRun || session.mode !== "normal") && session.perDayAttemptStats[String(question.day)]) {
        session.perDayAttemptStats[String(question.day)].correct += 1;
      }
      if (session.mode === "review") {
        advanceReviewSchedule(questionId);
      }
      item.reviewDue = false;
      item.lastAnswerWasCorrect = true;
      state.stats.tickets += 1;
      state.stats.totalSolvedQuestions += 1;
      state.stats.solvedByDay[todayKey()] = (state.stats.solvedByDay[todayKey()] || 0) + 1;
      updateStreak();
      session.currentQuestionState = "correct";
      feedbackBox.className = "feedback-box success";
      feedbackBox.innerHTML = buildFeedbackMarkup(true, question.answer || question.english, "Enterまたは答えるで2回目音声を再生");
      nextButton.classList.add("hidden");
      input.disabled = true;
      input.blur();
      session.awaitingEnter = false;
      session.answered = true;
      session.answerLocked = true;
      session.enterConsumed = false;
      session.enterLocked = true;
      session.enterLockUntil = null;
      if (answerBtn) {
        answerBtn.disabled = true;
        answerBtn.textContent = "2回目音声を待機中";
      }
      playQuestionAudio(question, () => {
        enableSecondAudioTrigger(state.session === session ? session : null, input, answerBtn);
      }, () => {
        showAudioPlaybackError(feedbackBox);
      });
      saveState();
      renderHome();
      renderProgress();
      if (levelChange.leveledUpToFour) {
        showLevelUpModal(item);
      }
      return;
    }

    if (isMainNormalRun || isPhraseSpiralMainRun) {
      const questionIdKey = String(question.id);
      if (!session.wrongQuestionIds.includes(questionIdKey)) {
        session.wrongQuestionIds.push(questionIdKey);
      }
    }
    updateItemLevelProgress(item, false);
    resetReviewSchedule(questionId);
    item.reviewDue = true;
    item.reviewTodayCount += 1;
    item.lastAnswerWasCorrect = false;
    state.stats.totalSolvedQuestions += 1;
    state.stats.solvedByDay[todayKey()] = (state.stats.solvedByDay[todayKey()] || 0) + 1;
    updateStreak();
    session.currentQuestionState = "retrying";
    feedbackBox.className = "feedback-box error";
    feedbackBox.innerHTML = buildFeedbackMarkup(false, question.answer || question.english, "正しい英語をもう一度入力");
    nextButton.classList.add("hidden");
    input.value = "";
    input.disabled = false;
    input.focus();
    saveState();
    renderHome();
    renderProgress();
    return;
  }

  if (!isCorrect) {
    input.value = "";
    input.disabled = false;
    input.focus();
    feedbackBox.className = "feedback-box error";
    feedbackBox.innerHTML = buildFeedbackMarkup(false, question.answer || question.english, "正しい英語をもう一度入力");
    return;
  }

  const levelChange = updateItemLevelProgress(item, true);
  item.lastAnswerWasCorrect = true;
  session.answered = false;
  session.answerLocked = false;
  session.awaitingEnter = false;
  session.enterLocked = false;
  session.enterConsumed = false;
  session.enterLockUntil = null;
  session.currentQuestionState = "correct";

  feedbackBox.className = "feedback-box success";
  feedbackBox.innerHTML = buildFeedbackMarkup(true, question.answer || question.english, "Enterまたは答えるで2回目音声を再生");
  nextButton.classList.add("hidden");
  input.disabled = true;
  input.blur();
  session.awaitingEnter = false;
  session.answered = true;
  session.answerLocked = true;
  session.enterConsumed = false;
  session.enterLocked = true;
  session.enterLockUntil = null;
  if (answerBtn) {
    answerBtn.disabled = true;
    answerBtn.textContent = "2回目音声を待機中";
  }
  playQuestionAudio(question, () => {
    enableSecondAudioTrigger(state.session === session ? session : null, input, answerBtn);
  }, () => {
    showAudioPlaybackError(feedbackBox);
  });
  saveState();
  renderHome();
  renderProgress();
  if (levelChange.leveledUpToFour) {
    showLevelUpModal(item);
  }
}

function updateBestAccuracyFromSession(session) {
  if (!session || session.mode !== "normal") return;
  const statsByDay = session.perDayAttemptStats || {};
  const hasPerDayStats = Object.keys(statsByDay).length > 1;

  if (!state.stats.dayBestAccuracy) {
    state.stats.dayBestAccuracy = {};
  }

  if (!hasPerDayStats) {
    const dayKey = Object.keys(statsByDay)[0];
    if (!dayKey) return;
    const dayStats = statsByDay[dayKey];
    if (!dayStats.total) return;
    const accuracy = Math.round((dayStats.correct / dayStats.total) * 100);
    const previous = state.stats.dayBestAccuracy[dayKey];
    if (typeof previous !== "number" || accuracy > previous) {
      state.stats.dayBestAccuracy[dayKey] = accuracy;
      registerDayProgressUpdate(Number(dayKey), accuracy);
    }
    return;
  }

  Object.entries(statsByDay).forEach(([dayKey, dayStats]) => {
    if (!dayStats.total) return;
    const accuracy = Math.round((dayStats.correct / dayStats.total) * 100);
    const previous = state.stats.dayBestAccuracy[dayKey];
    if (typeof previous !== "number" || accuracy > previous) {
      state.stats.dayBestAccuracy[dayKey] = accuracy;
      registerDayProgressUpdate(Number(dayKey), accuracy);
    }
  });
}

function finishSession() {
  const session = state.session;
  if (!session) return;
  if (session.isFinishingSession || session.isSessionCompleted) return;

  if (session.mode === "phrase-spiral") {
    const wrongCount = Array.isArray(session.wrongQuestionIds) ? session.wrongQuestionIds.length : 0;
    if (session.phase === "phase1") {
      session.phase1Completed = true;
      if (wrongCount > 0) {
        session.phase2Skipped = false;
        if (startNormalAutoReviewRound(session, 1)) return;
      } else {
        session.phase2Skipped = true;
      }
      completeCurrentSession("completed", { showResult: true });
      return;
    }

    if (session.phase === "phase2") {
      session.phase2Completed = true;
      completeCurrentSession("completed", { showResult: true });
      return;
    }

    completeCurrentSession("completed", { showResult: true });
    return;
  }

  if (session.mode === "normal") {
    const wrongCount = Array.isArray(session.wrongQuestionIds) ? session.wrongQuestionIds.length : 0;

    if (session.phase === "phase0") {
      session.phase0Completed = true;
      if (startNormalMainRound(session)) return;
      completeCurrentSession("completed", { showResult: true });
      return;
    }

    if (session.phase === "phase1") {
      session.phase1Completed = true;
      if (wrongCount > 0) {
        session.phase2Skipped = false;
        if (startNormalAutoReviewRound(session, 1)) return;
      } else {
        session.phase2Skipped = true;
        session.phase2Completed = false;
      }
      const weakQuestions = getWeakPhasePool(session, 10);
      if (weakQuestions.length) {
        session.phase3Skipped = false;
        if (beginSessionPhase(session, "phase3", weakQuestions, { showIntro: true })) return;
      } else {
        session.phase3Skipped = true;
        session.phase3Completed = false;
      }
    }

    if (session.phase === "phase2") {
      session.phase2Completed = true;
      const weakQuestions = getWeakPhasePool(session, 10);
      if (weakQuestions.length) {
        session.phase3Skipped = false;
        if (beginSessionPhase(session, "phase3", weakQuestions, { showIntro: true })) return;
      } else {
        session.phase3Skipped = true;
        session.phase3Completed = false;
      }
    }

    if (session.phase === "phase3") {
      session.phase3Completed = true;
    }

    const phase0Done = Boolean(session.phase0Completed || session.phase0Skipped);
    const phase1Done = Boolean(session.phase1Completed);
    const phase2Done = Boolean(session.phase2Completed || session.phase2Skipped);
    const phase3Done = Boolean(session.phase3Completed || session.phase3Skipped);
    if (phase0Done && phase1Done && phase2Done && phase3Done) {
      completeCurrentSession("completed", { showResult: true });
      return;
    }
  }

  completeCurrentSession("completed", { showResult: true });
}

function renderProgress() {
  const reviewList = document.getElementById("reviewList");
  const progressReviewList = document.getElementById("progressReviewList");
  const progressMasterCount = document.getElementById("progressMasterCount");
  const progressWeeklySolved = document.getElementById("progressWeeklySolved");
  const progressTotalSolved = document.getElementById("progressTotalSolved");
  const dueItems = getReviewItems();
  const listMarkup = !dueItems.length
    ? '<li class="empty-state">この範囲に要復習はありません</li>'
    : dueItems.map((item) => `<li><span>${item.answer || item.english} · ${item.japanese}</span><span>${levelIcon(getEffectiveLevelForItem(item))} Lv${getEffectiveLevelForItem(item)}</span></li>`).join("");

  if (reviewList) reviewList.innerHTML = listMarkup;
  if (progressReviewList) progressReviewList.innerHTML = listMarkup;
  if (progressMasterCount) progressMasterCount.textContent = state.stats.masterCount;
  if (progressWeeklySolved) progressWeeklySolved.textContent = state.stats.weeklySolved;
  if (progressTotalSolved) progressTotalSolved.textContent = state.stats.totalSolvedQuestions;
}

function handleEnterKey(event) {
  handleEnterAdvanceKey(event);
}

function bindEvents() {
  document.addEventListener("keydown", handleEnterKey);
  document.addEventListener("keydown", (event) => {
    if (currentScreenId !== "resultScreen") return;
    const summary = state.stats.lastResultSummary;
    if (summary?.mode !== "level-focus" || summary.levelFocusCleared) return;
    if (event.key === "PageDown") {
      event.preventDefault();
      moveResultActionSelection(1);
      return;
    }
    if (event.key === "PageUp") {
      event.preventDefault();
      moveResultActionSelection(-1);
    }
  });

  document.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", () => {
      const targetId = element.getAttribute("data-close-modal");
      const modal = targetId ? document.getElementById(targetId) : null;
      if (!modal) return;
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    });
  });

  const levelInfoBtn = document.getElementById("levelInfoBtn");
  if (levelInfoBtn) {
    levelInfoBtn.addEventListener("click", () => {
      const modal = document.getElementById("levelInfoModal");
      if (!modal) return;
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
    });
  }

  const openLevelCollectionScreenBtn = document.getElementById("openLevelCollectionScreenBtn");
  if (openLevelCollectionScreenBtn) {
    openLevelCollectionScreenBtn.addEventListener("click", () => {
      renderLevelCollection();
      showScreen("levelCollectionScreen");
    });
  }

  const levelUpCloseBtn = document.getElementById("levelUpCloseBtn");
  if (levelUpCloseBtn) {
    levelUpCloseBtn.addEventListener("click", () => {
      hideLevelUpModal();
    });
  }

  const advanceBtn = document.getElementById("advanceBtn");
  if (advanceBtn) {
    advanceBtn.addEventListener("click", () => {
      startNextDaySession();
    });
  }

  const phaseIntroStartBtn = document.getElementById("phaseIntroStartBtn");
  if (phaseIntroStartBtn) {
    phaseIntroStartBtn.addEventListener("click", () => {
      startCurrentPhaseQuestions();
    });
  }

  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      showScreen("settingsScreen");
    });
  }

  const showUpdateHistoryBtn = document.getElementById("showUpdateHistoryBtn");
  const adminHistoryGate = document.getElementById("adminHistoryGate");
  const adminHistoryPasswordInput = document.getElementById("adminHistoryPasswordInput");
  const adminHistoryUnlockBtn = document.getElementById("adminHistoryUnlockBtn");
  const adminHistoryPanel = document.getElementById("adminHistoryPanel");

  const hideAdminHistory = () => {
    if (!adminHistoryPanel) return;
    adminHistoryPanel.classList.add("hidden");
    adminHistoryPanel.innerHTML = "";
  };

  const unlockAdminHistory = () => {
    if (!adminHistoryPasswordInput || !adminHistoryPanel) return;
    if (adminHistoryPasswordInput.value !== SETTINGS_INFO.adminPassword) {
      hideAdminHistory();
      return;
    }

    const historyMarkup = SETTINGS_INFO.releaseHistory
      .map((entry) => `<li><span class="settings-history-version">${entry.version}</span><span>${entry.note}</span></li>`)
      .join("");
    adminHistoryPanel.innerHTML = `<ul class="settings-history-list">${historyMarkup}</ul>`;
    adminHistoryPanel.classList.remove("hidden");
  };

  if (showUpdateHistoryBtn) {
    showUpdateHistoryBtn.addEventListener("click", () => {
      if (adminHistoryGate) {
        adminHistoryGate.classList.remove("hidden");
      }
      hideAdminHistory();
      if (adminHistoryPasswordInput) {
        adminHistoryPasswordInput.value = "";
        adminHistoryPasswordInput.focus();
      }
    });
  }

  if (adminHistoryUnlockBtn) {
    adminHistoryUnlockBtn.addEventListener("click", unlockAdminHistory);
  }

  if (adminHistoryPasswordInput) {
    adminHistoryPasswordInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      unlockAdminHistory();
    });
  }

  const daySelectWordBtn = document.getElementById("daySelectWordBtn");
  if (daySelectWordBtn) {
    daySelectWordBtn.addEventListener("click", () => {
      state.stats.savedNormalSession = null;
      renderDayCatalog();
      showScreen("dayCatalogScreen");
    });
  }

  const daySelectPhraseBtn = document.getElementById("daySelectPhraseBtn");
  if (daySelectPhraseBtn) {
    daySelectPhraseBtn.addEventListener("click", () => {
      prepareSession("phrase-spiral");
    });
  }

  const challengeBtn = document.getElementById("challengeBtn");
  if (challengeBtn) {
    challengeBtn.addEventListener("click", () => {
      prepareSession("challenge");
    });
  }

  const studyLevelOnlyBtn = document.getElementById("studyLevelOnlyBtn");
  if (studyLevelOnlyBtn) {
    studyLevelOnlyBtn.addEventListener("click", () => {
      prepareSession("level-focus", { level: activeLevelFilter });
    });
  }

  const dayRangeForm = document.getElementById("dayRangeForm");
  if (dayRangeForm) {
    dayRangeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const startDayRaw = Number(document.getElementById("dayStudyStartDaySelect")?.value);
      const endDayRaw = Number(document.getElementById("dayStudyEndDaySelect")?.value);
      const typeRaw = String(document.getElementById("dayStudyTypeSelect")?.value || "all");
      const safeStart = Number.isFinite(startDayRaw) ? Math.max(1, Math.min(14, startDayRaw)) : 1;
      const safeEnd = Number.isFinite(endDayRaw) ? Math.max(safeStart, Math.min(14, endDayRaw)) : safeStart;
      const safeType = typeRaw === "word" || typeRaw === "phrase" || typeRaw === "all" ? typeRaw : "all";
      startDayStudySession(safeStart, safeEnd, safeType);
    });
  }

  document.querySelectorAll(".back-nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      goBackScreen();
      if (currentScreenId === "homeScreen") {
        renderHome();
      }
    });
  });

  const testForm = document.getElementById("testForm");
  if (testForm) {
    testForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const availableDays = getAvailableDays();
      if (!availableDays.length) {
        alert("語彙データが読み込まれていません。ページを再読み込みしてください。");
        return;
      }

      const minDay = availableDays[0];
      const maxDay = availableDays[availableDays.length - 1];
      const startRaw = Number(document.getElementById("startDaySelect").value);
      const endRaw = Number(document.getElementById("endDaySelect").value);
      const type = document.getElementById("typeSelect").value;
      const safeStart = Number.isFinite(startRaw) ? Math.max(minDay, Math.min(maxDay, startRaw)) : minDay;
      const safeEnd = Number.isFinite(endRaw) ? Math.max(minDay, Math.min(maxDay, endRaw)) : maxDay;
      state.settings.studyRange = {
        start: Math.min(safeStart, safeEnd),
        end: Math.max(safeStart, safeEnd)
      };
      state.settings.type = type;
      saveState();
      prepareSession("normal");
    });
  }

  const resultHomeBtn = document.getElementById("resultHomeBtn");
  if (resultHomeBtn) {
    resultHomeBtn.addEventListener("click", () => {
      const summary = state.stats.lastResultSummary;
      if (summary?.mode === "level-focus") {
        returnHomeFromInterruptedResult();
        return;
      }
      returnHomeFromInterruptedResult();
    });
  }

  const resultNextDayBtn = document.getElementById("resultNextDayBtn");
  if (resultNextDayBtn) {
    resultNextDayBtn.addEventListener("click", () => {
      const summary = state.stats.lastResultSummary;
      if (summary?.mode === "level-focus") {
        const level = Number(summary.recommendation?.level) || activeLevelFilter || 1;
        startNextLevelFocusBatch(level);
        return;
      }
      startNextDaySession();
    });
  }

  const resultRecommendationBtn = document.getElementById("resultRecommendationBtn");
  if (resultRecommendationBtn) {
    resultRecommendationBtn.addEventListener("click", () => {
      const level = Number(resultRecommendationBtn.dataset.level) || 1;
      activeLevelFilter = level;
      prepareSession("level-focus", { level });
    });
  }

  const nextQuestionBtn = document.getElementById("nextQuestionBtn");
  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener("click", () => {
      const session = state.session;
      if (!session) return;
      session.currentIndex += 1;
      renderQuestionSession();
    });
  }

  const reviewNextBtn = document.getElementById("reviewNextBtn");
  if (reviewNextBtn) {
    reviewNextBtn.addEventListener("click", () => {
      const session = state.session;
      if (!session) return;
      session.currentIndex += 1;
      renderReviewSession();
    });
  }
}

let state = loadState();

function init() {
  const settingsVersionText = document.getElementById("settingsVersionText");
  if (settingsVersionText) {
    settingsVersionText.textContent = `Ver ${APP_VERSION}`;
  }
  const itemsSynced = ensureItemsSyncedWithVocabularyBank();
  clampStudyRangeToAvailableDays();
  autoCompleteStaleSessionIfNeeded();
  activateDueReviewItems();
  initializeRecentDayProgress();
  syncDaySelectOptions();
  bindEvents();
  renderDayCatalog();
  renderHome();
  renderProgress();
  showScreen("homeScreen", { recordHistory: false });
  flushPendingSessionNotice();
  if (itemsSynced) {
    console.info("Vocabulary data synced with latest data.js");
  }
  saveState();
}

init();
