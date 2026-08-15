const STORAGE_KEY = "english-trainer-state-v1";
const LEARNING_HISTORY_STORAGE_KEY = "english-trainer-learning-history-v1";
const LEARNING_HISTORY_MAX_ENTRIES = 1000;
const LEARNING_ACTIVE_TIMEOUT_MS = 3 * 60 * 1000;
const PC_BROWSER_DEVICE_ID_STORAGE_KEY = "english-trainer-pc-device-id-v1";
const PC_BROWSER_DEVICE_NAME_STORAGE_KEY = "english-trainer-pc-device-name-v1";
const PC_BROWSER_DEVICE_NAME_MAP_STORAGE_KEY = "english-trainer-pc-device-name-map-v1";
const PC_BROWSER_DEVICE_NAME_FALLBACK = "端末未設定";
const LEARNING_HISTORY_FAMILY_ID = "inoue";
const LEARNING_HISTORY_SON_UID_CACHE_KEY = "english-trainer-history-son-uid-v1";
const ADMIN_HISTORY_ALL_DEVICE_FILTER_KEY = "all";
const ADMIN_HISTORY_LEGACY_DEVICE_FILTER_KEY = "legacy:unidentified";
const ADMIN_HISTORY_NAMED_DEVICE_FILTER_PREFIX = "name:";
const ADMIN_HISTORY_LEGACY_DEVICE_FILTER_LABEL = "端末未識別";
const ADMIN_HISTORY_SON_PC_FILTER_KEY = "son:pc";
const ADMIN_HISTORY_SON_MOBILE_FILTER_KEY = "son:mobile";
const ADMIN_HISTORY_SON_OTHER_FILTER_KEY = "son:other";
const HOME_ACCOUNT_PARENT_EMAIL_PREFIX = "fh025";
const HOME_ACCOUNT_PARENT_ALIAS = "fh025121";
const HOME_ACCOUNT_SON_ALIAS = "RRR";
const ADMIN_LEARNING_HISTORY_PIN = "12345";
const SETTINGS_INFO = window.ENGLISH_TRAINER_RELEASE_INFO || Object.freeze({
  adminPassword: "12345",
  releaseHistory: []
});
const APP_VERSION = SETTINGS_INFO.releaseHistory[0]?.version || "0/0000/0000";
const interruptedLearningHistorySessions = new WeakSet();
const TYPING_CONFIG_DEFAULTS = Object.freeze({
  audioRepeatCount: 2,
  audioPlaybackRate: 1.0,
  questionToAudioDelaySec: 0.2,
  repeatGapDelaySec: 0.3,
  audioToInputDelaySec: 0.3,
  judgementToNextDelaySec: 0.3
});
const TYPING_AUDIO_REPEAT_OPTIONS = [1, 2, 3];
const TYPING_AUDIO_RATE_OPTIONS = [0.8, 1.0, 1.2];
const TRAINING_CORRECT_CHIME_DEFAULT_PRESET = "correct-05-1";
const TRAINING_CORRECT_CHIME_PRESETS = Object.freeze([
  Object.freeze({
    id: "correct-05-1",
    label: "05-1",
    audioFile: "correct-05-1.mp3"
  }),
  Object.freeze({
    id: "correct-05-2",
    label: "05-2",
    audioFile: "correct-05-2.mp3"
  }),
  Object.freeze({
    id: "correct-05-3",
    label: "05-3",
    audioFile: "correct-05-3.mp3"
  })
]);
let currentAudio = null;
let irregularVerbSelectedMode = "training";
let isResettingLearningData = false;
const CHALLENGE_PROMO_SCREEN_ID = "challengePromoScreen";
const CHALLENGE_PROMO_LIMIT_DAY_KEY = "2026-08-12";
const CHALLENGE_PROMO_MAX_SHOWS_PER_UID = 2;
const CHALLENGE_PROMO_COUNTER_STORAGE_KEY = "english-trainer-pc-challenge-promo-counter-v1";
let challengePromoTimerId = null;
let pendingChallengePromoOptions = null;
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
const TRAINING_MENU_ITEMS = Object.freeze([
  { id: "trainingIdiomBtn", mode: "phrase-spiral", isReady: true },
  { id: "trainingChallengeBtn", mode: "challenge", isReady: true },
  { id: "trainingPrepositionBtn", mode: "preposition-training", isReady: true },
  { id: "trainingResponseBtn", mode: "response-training", isReady: true },
  { id: "trainingIrregularVerbBtn", mode: "irregular-verb-training", isReady: true },
  { id: "trainingInstantCompositionBtn", mode: null, isReady: false }
]);

function getTrainingMenuCardsForUi() {
  const menuConfig = typeof window !== "undefined" ? window.TrainingMenuConfig : null;
  const pointSummaryMap = getTrainingMenuPointSummaryMap();
  if (menuConfig && typeof menuConfig.getTrainingMenuCards === "function") {
    return menuConfig.getTrainingMenuCards(POINT_SYSTEM_CONFIG, pointSummaryMap);
  }
  return TRAINING_MENU_ITEMS.map((item) => ({
    ...item,
    title: item.id === "trainingIdiomBtn" ? "熟語特訓" : item.id === "trainingChallengeBtn" ? "過去の間違いに挑戦" : item.id === "trainingPrepositionBtn" ? "前置詞特訓" : item.id === "trainingResponseBtn" ? "応答文特訓" : item.id === "trainingIrregularVerbBtn" ? "不規則動詞特訓" : "瞬間英作文",
    icon: item.id === "trainingIdiomBtn" ? "📖" : item.id === "trainingChallengeBtn" ? "🎯" : item.id === "trainingPrepositionBtn" ? "🧭" : item.id === "trainingResponseBtn" ? "🗣️" : item.id === "trainingIrregularVerbBtn" ? "🔄" : "⚡",
    mode: item.mode,
    isReady: item.isReady,
    pointLabel: item.isReady ? "ポイントなし" : "準備中"
  }));
}

function shouldAwardTrainingPointForAnswerAttempt(options = {}) {
  return Boolean(options.isFirstAttempt && options.isCorrect && !options.isReviewSession);
}

function getTrainingMenuPointSummaryMap() {
  const pointState = getPointState();
  const todayKey = getPointTodayKey();
  const modeRow = pointState?.dailyEarnedByModeByDate?.[todayKey] && typeof pointState.dailyEarnedByModeByDate[todayKey] === "object"
    ? pointState.dailyEarnedByModeByDate[todayKey]
    : {};
  return {
    todayTotal: Math.max(0, Number(pointState?.dailyEarnedByDate?.[todayKey]) || 0),
    preposition: {
      earned: Math.max(0, Number(modeRow.preposition) || 0),
      cap: Math.max(0, Number(POINT_SYSTEM_CONFIG.dailyCapByTrainingMode.preposition) || 0)
    },
    response: {
      earned: Math.max(0, Number(modeRow.response) || 0),
      cap: Math.max(0, Number(POINT_SYSTEM_CONFIG.dailyCapByTrainingMode.response) || 0)
    },
    challenge: {
      earned: Math.max(0, Number(modeRow.challenge) || 0),
      cap: Math.max(0, Number(POINT_SYSTEM_CONFIG.dailyCapByTrainingMode.challenge) || 0)
    },
    "irregular-verb": {
      earned: Math.max(0, Number(modeRow["irregular-verb"]) || 0),
      cap: Math.max(0, Number(POINT_SYSTEM_CONFIG.dailyCapByTrainingMode["irregular-verb"]) || 0)
    },
    idiom: {
      earned: Math.max(0, Number(modeRow.idiom) || 0),
      cap: Math.max(0, Number(POINT_SYSTEM_CONFIG.dailyCapByTrainingMode.idiom) || 0)
    }
  };
}

function bindTrainingMenuCardHandlers() {
  const cards = getTrainingMenuCardsForUi();
  cards.forEach((item) => {
    const button = document.getElementById(item.id);
    if (!button) return;
    button.onclick = null;
    button.addEventListener("click", () => {
      if (item.isReady && item.mode) {
        if (item.mode === "preposition-training") {
          openPrepositionTrainingSelector();
          return;
        }
        if (item.mode === "response-training") {
          startResponseTraining("all");
          return;
        }
        if (item.mode === "irregular-verb-training") {
          openIrregularVerbTrainingSelector();
          return;
        }
        if (item.mode === "grammar") {
          openGrammarMenuScreen();
          return;
        }
        prepareSession(item.mode);
        return;
      }
      showTrainingComingSoonNotice();
    });
  });
}

function renderTrainingMenuCards() {
  const container = document.getElementById("trainingMenuCards");
  if (!container) return;
  const cards = getTrainingMenuCardsForUi();
  container.innerHTML = cards.map((item) => {
    const isReady = item.isReady !== false;
    return `<button id="${item.id}" class="secondary-btn training-menu-card-btn${isReady ? "" : " is-disabled"}" type="button" data-training-mode="${item.mode || ""}">
      <span class="training-menu-card-top">
        <span class="training-menu-card-title"><span class="training-menu-card-icon">${escapeHtml(item.icon || "✦")}</span>${escapeHtml(item.title || "特訓")}</span>
        <span class="training-menu-card-chevron">›</span>
      </span>
      <span class="training-menu-card-point">${escapeHtml(item.pointLabel || "ポイントなし")}</span>
      ${item.pointDetail ? `<span class="training-menu-card-detail">${escapeHtml(item.pointDetail)}</span>` : ""}
    </button>`;
  }).join("");
  bindTrainingMenuCardHandlers();
}

function openTrainingMenuScreen() {
  renderTrainingMenuCards();
  showScreen("trainingMenuScreen");
}

function getGrammarDataApi() {
  return typeof window !== "undefined" ? (window.EnglishTrainerGrammarData || null) : null;
}

function getGrammarUnitCatalog() {
  const api = getGrammarDataApi();
  if (!api || typeof api.getGrammarUnitCatalog !== "function") return [];
  return api.getGrammarUnitCatalog();
}

function getGrammarLessonByUnitId(unitId) {
  const api = getGrammarDataApi();
  if (!api || typeof api.getGrammarLessonByUnitId !== "function") return null;
  return api.getGrammarLessonByUnitId(unitId);
}

function renderGrammarUnitList() {
  const container = document.getElementById("grammarUnitList");
  if (!container) return;
  const units = getGrammarUnitCatalog();
  container.innerHTML = units.map((unit) => {
    const disabled = !unit.enabled;
    return `
      <button id="grammarUnitBtn-${unit.id}" class="secondary-btn training-menu-card-btn${disabled ? " is-disabled" : ""}" type="button" data-grammar-unit-id="${unit.id}" ${disabled ? "disabled" : ""}>
        <span class="training-menu-card-top">
          <span class="training-menu-card-title"><span class="training-menu-card-icon">${escapeHtml(unit.icon || "✦")}</span>${escapeHtml(unit.label || "Unit")}</span>
          <span class="training-menu-card-chevron">›</span>
        </span>
        <span class="training-menu-card-point">${escapeHtml(unit.title || "準備中")}</span>
        <span class="training-menu-card-detail">${escapeHtml(unit.description || "今後追加予定")}</span>
      </button>
    `;
  }).join("");

  container.querySelectorAll("[data-grammar-unit-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const unitId = Number(button.getAttribute("data-grammar-unit-id") || "0");
      if (!unitId || !getGrammarUnitCatalog().find((unit) => Number(unit.id) === unitId && unit.enabled)) return;
      startGrammarUnit(unitId);
    });
  });
}

function openGrammarMenuScreen() {
  renderGrammarUnitList();
  showScreen("grammarMenuScreen");
}

function getGrammarPhaseSteps() {
  return ["point", "point-summary", "basic", "word-order", "sentence"];
}

function getGrammarVisibleIndex(session) {
  if (!session) return 0;
  return Math.max(0, Number(session.phaseIndex || 0));
}

function getGrammarCurrentPhase(session) {
  const steps = getGrammarPhaseSteps();
  const index = getGrammarVisibleIndex(session);
  return steps[index] || "point";
}

function setGrammarFeedback(message, isSuccess, extraLines = []) {
  const box = document.getElementById("grammarFeedbackBox");
  if (!box) return;
  const renderedLines = [];
  if (message) renderedLines.push({ type: "message", text: message });
  if (Array.isArray(extraLines) && extraLines.length) {
    renderedLines.push(...extraLines.map((line) => ({ type: line === "POINT" ? "point-label" : "point-text", text: line })));
  }
  box.innerHTML = renderedLines.map((line) => {
    const className = line.type === "point-label" ? "feedback-point-label" : line.type === "point-text" ? "feedback-point-text" : "feedback-message";
    return `<div class="${className}">${escapeHtml(line.text)}</div>`;
  }).join("");
  box.classList.remove("success", "error", "hidden");
  box.classList.toggle("success", Boolean(isSuccess));
  box.classList.toggle("error", !isSuccess);
}

function hideGrammarFeedback() {
  const box = document.getElementById("grammarFeedbackBox");
  if (!box) return;
  box.classList.add("hidden");
  box.classList.remove("success", "error");
}

function getGrammarCurrentStepQuestion(session) {
  const phase = getGrammarCurrentPhase(session);
  const lesson = session.lesson;
  if (phase === "point") {
    const questions = lesson?.pointQuestions || [];
    return questions[Math.min(Number(session.currentQuestionIndex || 0), questions.length - 1)] || null;
  }
  if (phase === "basic") {
    const questions = lesson?.basicQuestions || [];
    return questions[Math.min(Number(session.currentQuestionIndex || 0), questions.length - 1)] || null;
  }
  if (phase === "word-order") {
    const questions = lesson?.wordOrderQuestions || [];
    return questions[Math.min(Number(session.currentQuestionIndex || 0), questions.length - 1)] || null;
  }
  if (phase === "sentence") {
    const questions = lesson?.sentenceQuestions || [];
    return questions[Math.min(Number(session.currentQuestionIndex || 0), questions.length - 1)] || null;
  }
  return null;
}

function isGrammarAnswerAccepted(expected, actual) {
  const normalize = (value) => String(value || "").trim().replace(/[ 　]+/g, "").toLowerCase();
  const expectedValues = String(expected || "").split(/[／/]/).map(normalize).filter(Boolean);
  const actualValue = normalize(actual);
  return expectedValues.includes(actualValue) || expectedValues.some((option) => actualValue.includes(option));
}

function updateGrammarPracticeUi() {
  const session = grammarTrainingSession;
  const phaseText = document.getElementById("grammarPracticePhaseText");
  const counter = document.getElementById("grammarPracticeCounterText");
  const prompt = document.getElementById("grammarPracticePrompt");
  const choiceList = document.getElementById("grammarChoiceList");
  const wordOrderWrap = document.getElementById("grammarWordOrderWrap");
  const answerForm = document.getElementById("grammarAnswerForm");
  const answerInput = document.getElementById("grammarAnswerInput");
  const nextBtn = document.getElementById("grammarNextBtn");
  const practiceTitle = document.getElementById("grammarPracticeTitle");
  const practiceCard = document.getElementById("grammarPracticeCard");

  if (!session) return;
  const unit = getGrammarUnitCatalog().find((entry) => Number(entry.id) === Number(session.unitId));
  const phase = getGrammarCurrentPhase(session);
  if (practiceCard) {
    practiceCard.setAttribute("data-grammar-phase", phase);
  }
  if (practiceTitle) {
    practiceTitle.textContent = `${unit?.label || "Unit 1"} ${unit?.title || "be動詞"}`;
  }
  const phaseLabelMap = { point: "POINTチェック", "point-summary": "POINTまとめ", basic: "基本問題", "word-order": "語順", sentence: "短文作成" };
  if (phaseText) phaseText.textContent = phaseLabelMap[phase] || "POINT";

  const pointTotal = Math.max(1, (session.lesson?.pointQuestions || []).length);
  const stepTotal = phase === "point" ? pointTotal : phase === "point-summary" ? 1 : phase === "basic" ? Math.max(1, (session.lesson?.basicQuestions || []).length) : phase === "word-order" ? Math.max(1, (session.lesson?.wordOrderQuestions || []).length) : Math.max(1, (session.lesson?.sentenceQuestions || []).length);
  const currentNumber = phase === "point" ? Math.min(Number(session.currentQuestionIndex || 0) + 1, pointTotal) : phase === "point-summary" ? 1 : Math.min(Number(session.currentQuestionIndex || 0) + 1, stepTotal);
  if (counter) counter.textContent = `${currentNumber} / ${stepTotal}`;

  if (prompt) {
    if (phase === "point") {
      const question = getGrammarCurrentStepQuestion(session);
      prompt.textContent = question?.prompt || "問題を読みましょう。";
    } else if (phase === "point-summary") {
      prompt.textContent = session.lesson?.pointText || "be動詞の基本を覚えましょう。";
    } else {
      const question = getGrammarCurrentStepQuestion(session);
      prompt.textContent = question?.prompt || "問題を読みましょう。";
    }
  }

  if (choiceList) {
    choiceList.innerHTML = "";
    choiceList.classList.add("hidden");
  }
  if (wordOrderWrap) {
    wordOrderWrap.innerHTML = "";
    wordOrderWrap.classList.add("hidden");
  }
  if (answerForm) answerForm.classList.add("hidden");
  if (nextBtn) nextBtn.classList.add("hidden");
  hideGrammarFeedback();

  if (phase === "point") {
    if (answerForm) answerForm.classList.remove("hidden");
    if (answerInput) {
      const question = getGrammarCurrentStepQuestion(session);
      const isJapaneseInput = /ひらがなで入力/.test(question?.prompt || "");
      answerInput.value = "";
      answerInput.placeholder = isJapaneseInput ? "ひらがな" : "英語を入力";
      answerInput.setAttribute("data-input-kind", isJapaneseInput ? "japanese" : "english");
      answerInput.style.width = "";
      answerInput.style.maxWidth = "";
      answerInput.style.minWidth = "";
      answerInput.style.height = "";
      answerInput.style.minHeight = "";
      answerInput.style.lineHeight = "";
      answerInput.style.padding = "";
      answerInput.style.textAlign = "";
      answerInput.style.verticalAlign = "";
      answerInput.style.boxSizing = "";
      answerInput.focus();
    }
    return;
  }

  if (phase === "point-summary") {
    if (nextBtn) nextBtn.classList.remove("hidden");
    return;
  }

  if (phase === "basic") {
    const question = getGrammarCurrentStepQuestion(session);
    if (!question || !choiceList) return;
    choiceList.classList.remove("hidden");
    choiceList.innerHTML = question.choices.map((choice) => `
      <button type="button" class="secondary-btn grammar-choice-btn" data-grammar-choice="${escapeHtml(choice)}">${escapeHtml(choice)}</button>
    `).join("");
    choiceList.querySelectorAll("[data-grammar-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        const value = String(button.getAttribute("data-grammar-choice") || "");
        choiceList.querySelectorAll(".grammar-choice-btn").forEach((option) => option.classList.remove("is-selected"));
        button.classList.add("is-selected");
        const isCorrect = value === question.answer;
        setGrammarFeedback(isCorrect ? "正解！" : `不正解。正解は ${question.answer} です。`, isCorrect);
        if (nextBtn) nextBtn.classList.remove("hidden");
      });
    });
    return;
  }

  if (phase === "word-order") {
    const question = getGrammarCurrentStepQuestion(session);
    if (!question || !wordOrderWrap) return;
    wordOrderWrap.classList.remove("hidden");
    const selected = Array.isArray(session.selectedWords) ? session.selectedWords : [];
    const buttonMarkup = question.words.map((word, index) => {
      const chosen = selected.includes(word) && selected.indexOf(word) >= 0;
      return `<button type="button" class="secondary-btn grammar-order-word${chosen ? " is-selected" : ""}" data-grammar-word="${escapeHtml(word)}" ${chosen ? "disabled" : ""}>${escapeHtml(word)}</button>`;
    }).join("");
    wordOrderWrap.innerHTML = `
      <div class="grammar-order-selected">${selected.length ? selected.map((word) => `<span class="grammar-order-pill">${escapeHtml(word)}</span>`).join("") : "<span class=\"grammar-order-placeholder\">語を選んで並べましょう</span>"}</div>
      <div class="grammar-order-list">${buttonMarkup}</div>
    `;
    wordOrderWrap.querySelectorAll("[data-grammar-word]").forEach((button) => {
      button.addEventListener("click", () => {
        const word = String(button.getAttribute("data-grammar-word") || "");
        if (!word) return;
        const words = Array.isArray(session.selectedWords) ? session.selectedWords.slice() : [];
        if (words.includes(word)) return;
        words.push(word);
        session.selectedWords = words;
        updateGrammarPracticeUi();
      });
    });
    const selectedWords = Array.isArray(session.selectedWords) ? session.selectedWords : [];
    if (nextBtn) {
      nextBtn.classList.remove("hidden");
      nextBtn.textContent = selectedWords.length === question.words.length ? "次へ" : "並べ終えて確認";
    }
    return;
  }

  if (phase === "sentence") {
    if (answerForm) answerForm.classList.remove("hidden");
    if (answerInput) {
      answerInput.value = "";
      answerInput.focus();
    }
    if (nextBtn) nextBtn.classList.add("hidden");
  }
}

function startGrammarUnit(unitId) {
  const unit = getGrammarUnitCatalog().find((entry) => Number(entry.id) === Number(unitId));
  if (!unit || !unit.enabled) return;
  const lesson = getGrammarLessonByUnitId(unit.id);
  if (!lesson) return;
  grammarTrainingSession = {
    unitId: unit.id,
    lesson,
    phaseIndex: 0,
    currentQuestionIndex: 0,
    selectedWords: [],
    completed: false
  };
  showScreen("grammarPracticeScreen");
  updateGrammarPracticeUi();
}

function moveToNextGrammarStep() {
  if (!grammarTrainingSession) return;
  const phase = getGrammarCurrentPhase(grammarTrainingSession);
  const lesson = grammarTrainingSession.lesson;

  if (phase === "point") {
    const total = (lesson?.pointQuestions || []).length;
    const nextIndex = Number(grammarTrainingSession.currentQuestionIndex || 0) + 1;
    if (nextIndex < total) {
      grammarTrainingSession.currentQuestionIndex = nextIndex;
      updateGrammarPracticeUi();
      return;
    }
    grammarTrainingSession.phaseIndex = 1;
    grammarTrainingSession.currentQuestionIndex = 0;
    grammarTrainingSession.selectedWords = [];
    updateGrammarPracticeUi();
    return;
  }

  if (phase === "point-summary") {
    grammarTrainingSession.phaseIndex = 2;
    grammarTrainingSession.currentQuestionIndex = 0;
    grammarTrainingSession.selectedWords = [];
    updateGrammarPracticeUi();
    return;
  }

  if (phase === "basic") {
    const total = (lesson?.basicQuestions || []).length;
    grammarTrainingSession.currentQuestionIndex = Math.min(Number(grammarTrainingSession.currentQuestionIndex || 0) + 1, total - 1);
    if (Number(grammarTrainingSession.currentQuestionIndex) >= total - 1) {
      grammarTrainingSession.phaseIndex = 3;
      grammarTrainingSession.currentQuestionIndex = 0;
      grammarTrainingSession.selectedWords = [];
      updateGrammarPracticeUi();
      return;
    }
    updateGrammarPracticeUi();
    return;
  }
  if (phase === "word-order") {
    const total = (lesson?.wordOrderQuestions || []).length;
    grammarTrainingSession.currentQuestionIndex = Math.min(Number(grammarTrainingSession.currentQuestionIndex || 0) + 1, total - 1);
    if (Number(grammarTrainingSession.currentQuestionIndex) >= total - 1) {
      grammarTrainingSession.phaseIndex = 4;
      grammarTrainingSession.currentQuestionIndex = 0;
      grammarTrainingSession.selectedWords = [];
      updateGrammarPracticeUi();
      return;
    }
    updateGrammarPracticeUi();
    return;
  }
  if (phase === "sentence") {
    const total = (lesson?.sentenceQuestions || []).length;
    grammarTrainingSession.currentQuestionIndex = Math.min(Number(grammarTrainingSession.currentQuestionIndex || 0) + 1, total - 1);
    if (Number(grammarTrainingSession.currentQuestionIndex) >= total - 1) {
      grammarTrainingSession.completed = true;
      showScreen("homeScreen", { recordHistory: false });
      return;
    }
    updateGrammarPracticeUi();
  }
}

function submitGrammarAnswer() {
  if (!grammarTrainingSession) return;
  const phase = getGrammarCurrentPhase(grammarTrainingSession);
  const question = getGrammarCurrentStepQuestion(grammarTrainingSession);
  if (!question) return;

  if (phase === "point") {
    const input = document.getElementById("grammarAnswerInput");
    const answer = (input?.value || "").trim();
    const isCorrect = isGrammarAnswerAccepted(question.answer, answer);
    if (isCorrect) {
      setGrammarFeedback("正解！", true);
    } else {
      const summaryText = question?.pointText || grammarTrainingSession?.lesson?.pointText || "";
      const pointLines = summaryText ? ["POINT", summaryText] : [];
      setGrammarFeedback(`不正解。正解は「${question.answer}」です。`, false, pointLines);
    }
    const nextBtn = document.getElementById("grammarNextBtn");
    if (nextBtn) nextBtn.classList.remove("hidden");
    return;
  }

  if (phase === "basic") {
    const selected = document.querySelector(".grammar-choice-btn.is-selected");
    const choice = selected ? selected.getAttribute("data-grammar-choice") : null;
    const isCorrect = Boolean(choice) && choice === question.answer;
    setGrammarFeedback(isCorrect ? "正解！" : `不正解。正解は ${question.answer} です。`, isCorrect);
    const nextBtn = document.getElementById("grammarNextBtn");
    if (nextBtn) nextBtn.classList.remove("hidden");
    return;
  }

  if (phase === "word-order") {
    const words = Array.isArray(grammarTrainingSession.selectedWords) ? grammarTrainingSession.selectedWords : [];
    const english = words.join(" ");
    const isCorrect = english === question.answer || english === question.answer.replace(/\.$/, "");
    setGrammarFeedback(isCorrect ? "正解！" : `不正解。正解は ${question.answer} です。`, isCorrect);
    const nextBtn = document.getElementById("grammarNextBtn");
    if (nextBtn) nextBtn.classList.remove("hidden");
    return;
  }

  if (phase === "sentence") {
    const input = document.getElementById("grammarAnswerInput");
    const answer = (input?.value || "").trim();
    const isCorrect = answer.toLowerCase() === String(question.answer).trim().toLowerCase();
    setGrammarFeedback(isCorrect ? "正解！" : `不正解。正解は ${question.answer} です。`, isCorrect);
    const nextBtn = document.getElementById("grammarNextBtn");
    if (nextBtn) nextBtn.classList.remove("hidden");
  }
}

const TRAINING_MODE_KIND_MAP = Object.freeze({
  "phrase-spiral": "idiom",
  "preposition-training": "preposition",
  "response-training": "response",
  "irregular-verb-training": "irregular-verb"
});
const PREPOSITION_TRAINING_QUESTION_LIMIT = 10;
const RESPONSE_TRAINING_QUESTION_LIMIT = 10;
const RESPONSE_TRAINING_CATEGORY_META = Object.freeze([
  { key: "be", label: "be動詞" },
  { key: "general", label: "一般動詞" },
  { key: "modal", label: "助動詞" },
  { key: "wh", label: "疑問詞" },
  { key: "present", label: "現在形" },
  { key: "past", label: "過去形" },
  { key: "future", label: "未来" },
  { key: "progressive", label: "現在進行形" },
  { key: "comparison", label: "比較" },
  { key: "other", label: "その他" }
]);
const LEVEL_FOUR_FAILURES_TO_DOWN = 3;
const LEVEL_FOCUS_BATCH_SIZE = 5;
const NORMAL_WEAK_FOCUS_BATCH_SIZE = 5;
const NORMAL_WEAK_FOCUS_MAX_ROUNDS = 10;
const DAY_PROGRESS_TARGET_QUESTION_COUNT = 10;
const EXTRA_TRAINING_DAILY_LIMIT = 10;
const GAME_TICKET_CONFIG = {
  debugRandomChanceOverride: null,
  eligibleTrainingThreshold: 3,
  firstBonusWeakFocusTarget: 3,
  firstBonusTicketMinutes: 5,
  rescueTriggerDays: 3,
  rescueGrantTrainingCount: 2,
  dailyMaxEarned: 2,
  earlyTrainingChance: 0.12,
  lateTrainingChance: 0.03,
  afterFirstWinChance: 0.02,
  ticketOptions: [
    { minutes: 5, weight: 60 },
    { minutes: 10, weight: 20 },
    { minutes: 15, weight: 15 },
    { minutes: 60, weight: 5 }
  ],
  streakBonusMilestones: [
    { days: 20, minutes: 30 },
    { days: 50, minutes: 30 },
    { days: 75, minutes: 30 },
    { days: 100, minutes: 60 }
  ],
  streakBonusRepeatStart: 130,
  streakBonusRepeatInterval: 30,
  streakBonusRepeatMinutes: 30
};

function createDefaultGameTicketRuleConfig() {
  return [
    { id: "rule-five-90", name: "5分券", targetTraining: "challenge", threshold: 90, minutes: 5, chance: 0.5, enabled: true, dailyCap: 1 },
    { id: "rule-five-120", name: "5分券", targetTraining: "challenge", threshold: 120, minutes: 5, chance: 0.5, enabled: true, dailyCap: 1 },
    { id: "rule-five-153", name: "5分券", targetTraining: "challenge", threshold: 153, minutes: 5, chance: 0.5, enabled: true, dailyCap: 1 },
    { id: "rule-five-180", name: "5分券", targetTraining: "challenge", threshold: 180, minutes: 5, chance: 1.0, enabled: true, dailyCap: 1 },
    { id: "rule-fifteen-84", name: "15分券A", targetTraining: "challenge", threshold: 84, minutes: 15, chance: 0.5, enabled: true, dailyCap: 1 },
    { id: "rule-fifteen-132", name: "15分券A", targetTraining: "challenge", threshold: 132, minutes: 15, chance: 0.5, enabled: true, dailyCap: 1 },
    { id: "rule-fifteen-183", name: "15分券A", targetTraining: "challenge", threshold: 183, minutes: 15, chance: 0.5, enabled: true, dailyCap: 1 },
    { id: "rule-fifteen-210", name: "15分券A", targetTraining: "challenge", threshold: 210, minutes: 15, chance: 1.0, enabled: true, dailyCap: 1 }
  ];
}

function createDefaultGameTicketEventConfig() {
  return [
    {
      id: "event-a-special",
      name: "＜A＞特別抽選",
      targetTraining: "challenge",
      threshold: 141,
      enabled: true,
      outcomes: [
        { minutes: 30, chance: 0.3 },
        { minutes: 60, chance: 0.1 },
        { minutes: 0, chance: 0.6 }
      ]
    },
    {
      id: "event-b-rescue",
      name: "＜B＞救済イベント",
      targetTraining: "challenge",
      threshold: 261,
      enabled: true,
      outcomes: [
        { minutes: 60, chance: 1.0 }
      ]
    }
  ];
}

function normalizeStoredImageReference(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  if (text.startsWith("data:image/") || text.startsWith("blob:") || /^https?:\/\//i.test(text) || text.startsWith("//")) {
    return text;
  }
  if (/^[a-zA-Z]:[\\/]/.test(text) || text.startsWith("file://") || text.startsWith("/") || text.startsWith("\\")) {
    return "";
  }
  const lowerText = text.toLowerCase();
  if (lowerText.startsWith("javascript:") || lowerText.startsWith("vbscript:") || lowerText.startsWith("data:") && !text.startsWith("data:image/")) {
    return "";
  }
  if (/^(?:\.\.?[\\/]|(?:[A-Za-z0-9_.-]+[\\/])|[A-Za-z0-9_.-]+)(?:[A-Za-z0-9_.\-/]+)?(?:\.[A-Za-z0-9]+)?$/i.test(text)) {
    return text;
  }
  return "";
}

function readImageFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file || typeof file === "string") {
      resolve("");
      return;
    }
    if (typeof FileReader === "undefined") {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      resolve(normalizeStoredImageReference(String(reader.result || "")));
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function createDefaultGameTicketConfig() {
  return {
    normalRules: createDefaultGameTicketRuleConfig(),
    events: createDefaultGameTicketEventConfig(),
    dailyCap: 2,
    dailyGrantCapByMinutes: {
      5: 20,
      15: 20,
      30: 10,
      60: 10
    },
    ticketImages: {
      30: "",
      60: ""
    },
    challengeAnnouncementImage: "",
    eventStartImages: {},
    modeLabels: {
      challenge: "過去の間違い",
      weakFocus: "苦手特訓",
      other: "その他の特訓"
    }
  };
}

function sanitizeGameTicketConfigRule(value) {
  if (!value || typeof value !== "object") return null;
  const threshold = Math.max(0, Number(value.threshold) || 0);
  const minutes = Math.max(0, Number(value.minutes) || 0);
  const chance = clampProbability(Number(value.chance) || 0);
  if (!Number.isFinite(threshold) || threshold <= 0 || !Number.isFinite(minutes) || minutes <= 0) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: typeof value.name === "string" && value.name ? value.name : "チケット",
    targetTraining: typeof value.targetTraining === "string" && value.targetTraining ? value.targetTraining : "challenge",
    threshold,
    minutes,
    chance,
    enabled: Boolean(value.enabled),
    dailyCap: Math.max(1, Math.round(Number(value.dailyCap) || 1))
  };
}

function sanitizeGameTicketConfigEvent(value) {
  if (!value || typeof value !== "object") return null;
  const threshold = Math.max(0, Number(value.threshold) || 0);
  const eventType = typeof value.type === "string" && value.type ? value.type : "draw";
  const outcomes = Array.isArray(value.outcomes) ? value.outcomes.map((outcome) => {
    const minutes = Math.max(0, Number(outcome?.minutes) || 0);
    const chance = clampProbability(Number(outcome?.chance) || 0);
    if (!Number.isFinite(minutes) || minutes < 0 || !Number.isFinite(chance) || chance <= 0) return null;
    return { minutes, chance };
  }).filter(Boolean) : [];
  const maxQuestions = Math.max(1, Math.round(Number(value.maxQuestions) || 1));
  const rewardMinutes = Math.max(0, Math.round(Number(value.rewardMinutes) || 5));
  if (!Number.isFinite(threshold) || threshold <= 0) return null;
  if (eventType === "consecutiveCorrect" && maxQuestions < 1) return null;
  if (eventType === "draw" && !outcomes.length) return null;
  const finalOutcomes = outcomes.map((outcome) => ({ minutes: Math.round(outcome.minutes), chance: clampProbability(outcome.chance) }));
  const totalChance = finalOutcomes.reduce((sum, outcome) => sum + (Number(outcome.chance) || 0), 0);
  if (eventType === "draw" && totalChance <= 0) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: typeof value.name === "string" && value.name ? value.name : "イベント",
    type: eventType,
    targetTraining: typeof value.targetTraining === "string" && value.targetTraining ? value.targetTraining : "challenge",
    threshold,
    enabled: Boolean(value.enabled),
    startImage: typeof value.startImage === "string" ? value.startImage : "",
    maxQuestions,
    rewardMinutes,
    outcomes: finalOutcomes
  };
}

function sanitizeGameTicketConfig(value) {
  const source = value && typeof value === "object" ? value : createDefaultGameTicketConfig();
  const normalRules = Array.isArray(source.normalRules)
    ? source.normalRules.map(sanitizeGameTicketConfigRule).filter(Boolean)
    : createDefaultGameTicketRuleConfig();
  const events = Array.isArray(source.events)
    ? source.events.map(sanitizeGameTicketConfigEvent).filter(Boolean)
    : createDefaultGameTicketEventConfig();
  const defaultTicketImages = createDefaultGameTicketConfig().ticketImages;
  const ticketImages = source.ticketImages && typeof source.ticketImages === "object"
    ? {
      30: normalizeStoredImageReference(source.ticketImages[30]) || defaultTicketImages[30],
      60: normalizeStoredImageReference(source.ticketImages[60]) || defaultTicketImages[60]
    }
    : { ...defaultTicketImages };
  const dailyGrantCapByMinutes = source.dailyGrantCapByMinutes && typeof source.dailyGrantCapByMinutes === "object"
    ? {
      5: Math.max(0, Number(source.dailyGrantCapByMinutes[5]) || 20),
      15: Math.max(0, Number(source.dailyGrantCapByMinutes[15]) || 20),
      30: Math.max(0, Number(source.dailyGrantCapByMinutes[30]) || 10),
      60: Math.max(0, Number(source.dailyGrantCapByMinutes[60]) || 10)
    }
    : { ...createDefaultGameTicketConfig().dailyGrantCapByMinutes };
  const eventStartImages = source.eventStartImages && typeof source.eventStartImages === "object"
    ? Object.fromEntries(Object.entries(source.eventStartImages)
      .map(([key, value]) => [String(key), normalizeStoredImageReference(value)])
      .filter(([, imageValue]) => Boolean(imageValue)))
    : {};
  const eventConfigWithFallbacks = events.map((event) => {
    const safeEventId = String(event.id || "");
    const fallbackImage = safeEventId && eventStartImages[safeEventId] ? eventStartImages[safeEventId] : "";
    return {
      ...event,
      startImage: normalizeStoredImageReference(event.startImage || fallbackImage) || ""
    };
  });
  return {
    normalRules,
    events: eventConfigWithFallbacks,
    dailyCap: Math.max(1, Math.round(Number(source.dailyCap) || 2)),
    dailyGrantCapByMinutes,
    ticketImages,
    challengeAnnouncementImage: normalizeStoredImageReference(source.challengeAnnouncementImage) || "",
    eventStartImages,
    modeLabels: source.modeLabels && typeof source.modeLabels === "object"
      ? {
        challenge: typeof source.modeLabels.challenge === "string" ? source.modeLabels.challenge : "過去の間違い",
        weakFocus: typeof source.modeLabels.weakFocus === "string" ? source.modeLabels.weakFocus : "苦手特訓",
        other: typeof source.modeLabels.other === "string" ? source.modeLabels.other : "その他の特訓"
      }
      : createDefaultGameTicketConfig().modeLabels,
    lastUpdatedAt: Number.isFinite(Number(source.lastUpdatedAt)) ? Number(source.lastUpdatedAt) : Date.now()
  };
}

function getUiGameTicketConfig() {
  const stateCandidate = typeof globalThis !== "undefined" ? globalThis.state : undefined;
  const sourceState = stateCandidate && stateCandidate.settings && stateCandidate.settings.gameTicketConfig ? stateCandidate : state;
  const sourceConfig = sourceState?.settings?.gameTicketConfig || state.settings?.gameTicketConfig || createDefaultGameTicketConfig();
  return sanitizeGameTicketConfig(sourceConfig);
}

function getGameTicketConfig() {
  state.settings = state.settings || {};
  state.settings.gameTicketConfig = sanitizeGameTicketConfig(state.settings?.gameTicketConfig || createDefaultGameTicketConfig());
  return state.settings.gameTicketConfig;
}

function resolveConfiguredEventDrawResult(eventConfig, dayKey) {
  const options = Array.isArray(eventConfig?.outcomes) ? eventConfig.outcomes : [];
  if (!options.length) return { outcome: "miss", minutes: 0 };
  const roll = Math.random();
  let cursor = 0;
  for (const outcome of options) {
    cursor += clampProbability(Number(outcome?.chance) || 0);
    if (roll <= cursor) {
      return { outcome: outcome.minutes > 0 ? String(outcome.minutes) : "miss", minutes: Math.max(0, Number(outcome.minutes) || 0), shouldShowChanceScreen: true };
    }
  }
  return { outcome: "miss", minutes: 0, shouldShowChanceScreen: true };
}

function getEnabledGameTicketRulesForMode(targetTrainingMode) {
  const mode = String(targetTrainingMode || "challenge");
  const config = getGameTicketConfig();
  return (config.normalRules || []).filter((rule) => rule.enabled && String(rule.targetTraining || "challenge") === mode);
}

function getEnabledGameTicketEventsForMode(targetTrainingMode) {
  const mode = String(targetTrainingMode || "challenge");
  const config = getGameTicketConfig();
  return (config.events || []).filter((event) => event.enabled && String(event.targetTraining || "challenge") === mode);
}

function getModeKeyFromLabel(label) {
  const normalized = String(label || "").trim();
  if (normalized.includes("苦手")) return "weakFocus";
  if (normalized.includes("その他")) return "other";
  return "challenge";
}

function normalizeGameTicketTargetTraining(value) {
  return ["challenge", "weakFocus", "other"].includes(String(value || "")) ? String(value) : "challenge";
}

function chanceToPercent(chanceValue) {
  return Math.round(clampProbability(Number(chanceValue) || 0) * 100);
}

function percentToChance(percentValue) {
  const value = Number(percentValue);
  if (!Number.isFinite(value)) return 0;
  return clampProbability(value / 100);
}

function buildDefaultGameTicketRuleEntry() {
  return {
    id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "チケット",
    targetTraining: "challenge",
    threshold: 90,
    minutes: 5,
    chance: 0.5,
    enabled: true,
    dailyCap: 1
  };
}

function buildDefaultGameTicketEventEntry() {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "＜新規イベント＞",
    type: "draw",
    targetTraining: "challenge",
    threshold: 141,
    enabled: true,
    startImage: "",
    maxQuestions: 5,
    rewardMinutes: 5,
    outcomes: [
      { minutes: 30, chance: 0.3 },
      { minutes: 60, chance: 0.1 }
    ]
  };
}

function buildGameTicketRuleSelectOptions(modeLabels) {
  const labels = modeLabels && typeof modeLabels === "object" ? modeLabels : createDefaultGameTicketConfig().modeLabels;
  return [
    { value: "challenge", label: labels.challenge || "過去の間違い" },
    { value: "weakFocus", label: labels.weakFocus || "苦手特訓" }
  ];
}

function parseGameTicketSettingsFromUi() {
  const config = getGameTicketConfig();
  const ruleRows = [...document.querySelectorAll("[data-game-ticket-rule-row]")];
  const eventCards = [...document.querySelectorAll("[data-game-ticket-event-card]")];
  const challengeAnnouncementValue = document.getElementById("gameTicketAnnouncementImageValue");
  const thirtyImageValue = document.getElementById("gameTicketThirtyImageValue");
  const sixtyImageValue = document.getElementById("gameTicketSixtyImageValue");
  const challengeAnnouncementImage = normalizeStoredImageReference(challengeAnnouncementValue?.value || "");
  const eventStartImages = {};
  eventCards.forEach((card) => {
    const eventId = String(card.dataset.eventId || "").trim();
    const hiddenInput = card.querySelector('[data-field="startImage"]');
    const imageValue = normalizeStoredImageReference(hiddenInput?.value || "");
    if (eventId && imageValue) {
      eventStartImages[eventId] = imageValue;
    }
  });

  const normalRules = ruleRows.map((row) => {
    const thresholdInput = row.querySelector('[data-field="threshold"]');
    const chanceInput = row.querySelector('[data-field="chancePercent"]');
    const minuteSelect = row.querySelector('[data-field="minutes"]');
    const targetSelect = row.querySelector('[data-field="targetTraining"]');
    const enabledInput = row.querySelector('[data-field="enabled"]');

    const threshold = Number(thresholdInput?.value ?? 0);
    const chancePercent = Number(chanceInput?.value ?? 0);
    const minutes = Number(minuteSelect?.value ?? 5);
    const targetTraining = targetSelect?.value || "challenge";
    const enabled = Boolean(enabledInput?.checked);

    return sanitizeGameTicketConfigRule({
      id: row.dataset.ruleId || undefined,
      name: row.dataset.ruleName || "チケット",
      targetTraining,
      threshold,
      minutes,
      chance: percentToChance(chancePercent),
      enabled,
      dailyCap: 1
    });
  }).filter(Boolean);

  const events = eventCards.map((card) => {
    const typeSelect = card.querySelector('[data-field="eventType"]');
    const eventType = typeSelect?.value || "draw";
    const nameInput = card.querySelector('[data-field="name"]');
    const targetSelect = card.querySelector('[data-field="targetTraining"]');
    const thresholdInput = card.querySelector('[data-field="threshold"]');
    const enabledInput = card.querySelector('[data-field="enabled"]');
    const maxQuestionsInput = card.querySelector('[data-field="maxQuestions"]');
    const rewardMinutesSelect = card.querySelector('[data-field="rewardMinutes"]');
    const startImageInput = card.querySelector('[data-field="startImage"]');

    let outcomes = [];
    if (eventType === "draw") {
      const outcomeInputs = [...card.querySelectorAll('[data-field="outcomePercent"]')];
      outcomes = outcomeInputs.map((input) => {
        const minutes = Number(input.dataset.outcomeMinutes || 0);
        const chancePercent = Number(input.value || 0);
        return { minutes, chance: percentToChance(chancePercent) };
      }).filter((entry) => Number.isFinite(entry.minutes) && entry.minutes >= 0);

      const totalPercent = outcomes.reduce((sum, outcome) => sum + Math.max(0, Number(outcome.chance) || 0) * 100, 0);
      if (totalPercent > 100) {
        throw new Error(`イベントの当選確率合計が100%を超えています: ${card.dataset.eventName || "イベント"}`);
      }
    }

    const eventConfig = sanitizeGameTicketConfigEvent({
      id: card.dataset.eventId || undefined,
      name: nameInput?.value || "イベント",
      type: eventType,
      targetTraining: targetSelect?.value || "challenge",
      threshold: Number(thresholdInput?.value ?? 0),
      enabled: Boolean(enabledInput?.checked),
      startImage: startImageInput?.value || "",
      maxQuestions: Number(maxQuestionsInput?.value ?? 5),
      rewardMinutes: Number(rewardMinutesSelect?.value ?? 5),
      outcomes
    });
    return eventConfig;
  }).filter(Boolean);

  const merged = sanitizeGameTicketConfig({
    ...config,
    normalRules,
    events,
    ticketImages: {
      30: normalizeStoredImageReference(thirtyImageValue?.value || "") || "",
      60: normalizeStoredImageReference(sixtyImageValue?.value || "") || ""
    },
    dailyGrantCapByMinutes: {
      5: Math.max(0, Number(document.getElementById("gameTicketDailyCap5Input")?.value ?? config.dailyGrantCapByMinutes?.[5] ?? 20) || 0),
      15: Math.max(0, Number(document.getElementById("gameTicketDailyCap15Input")?.value ?? config.dailyGrantCapByMinutes?.[15] ?? 20) || 0),
      30: Math.max(0, Number(document.getElementById("gameTicketDailyCap30Input")?.value ?? config.dailyGrantCapByMinutes?.[30] ?? 10) || 0),
      60: Math.max(0, Number(document.getElementById("gameTicketDailyCap60Input")?.value ?? config.dailyGrantCapByMinutes?.[60] ?? 10) || 0)
    },
    challengeAnnouncementImage,
    eventStartImages,
    dailyCap: Math.max(1, Number(config.dailyCap) || 2)
  });
  if (!merged.normalRules.length && !merged.events.length) {
    return sanitizeGameTicketConfig(createDefaultGameTicketConfig());
  }
  return merged;
}

function renderGameTicketSettingsUi() {
  const config = getUiGameTicketConfig();
  const rulesTableBody = document.getElementById("gameTicketRuleTableBody");
  const eventList = document.getElementById("gameTicketEventList");
  const announcementImageInput = document.getElementById("gameTicketAnnouncementImageInput");
  const announcementImageValue = document.getElementById("gameTicketAnnouncementImageValue");
  const thirtyImageInput = document.getElementById("gameTicketThirtyImageInput");
  const thirtyImageValue = document.getElementById("gameTicketThirtyImageValue");
  const sixtyImageInput = document.getElementById("gameTicketSixtyImageInput");
  const sixtyImageValue = document.getElementById("gameTicketSixtyImageValue");
  const cap5Input = document.getElementById("gameTicketDailyCap5Input");
  const cap15Input = document.getElementById("gameTicketDailyCap15Input");
  const cap30Input = document.getElementById("gameTicketDailyCap30Input");
  const cap60Input = document.getElementById("gameTicketDailyCap60Input");
  if (!rulesTableBody || !eventList) return;

  const options = buildGameTicketRuleSelectOptions(config.modeLabels);
  const targetTrainingHtml = options.map((option) => `<option value="${option.value}">${option.label}</option>`).join("");
  const minutesOptions = [5, 15, 30, 60].map((minutes) => `<option value="${minutes}">${minutes}分</option>`).join("");
  const rewardMinutesOptions = [5, 15, 30, 60].map((minutes) => `<option value="${minutes}">${minutes}分券</option>`).join("");

  const imageSlotMarkup = (labelText, value, fileInputId, valueInputId) => `
    <div class="settings-image-picker" data-image-slot>
      <input id="${fileInputId}" type="file" accept="image/*" data-image-file-input aria-label="${escapeHtml(labelText)}" />
      <div class="settings-image-actions">
        <button type="button" class="secondary-btn compact-btn" data-action="change-image">画像を変更</button>
        <button type="button" class="ghost-btn compact-btn" data-action="clear-image">画像を削除</button>
      </div>
      <img class="settings-image-preview${value ? "" : " hidden"}" src="${escapeHtml(value || "")}" alt="${escapeHtml(labelText)}" data-image-preview />
      <input id="${valueInputId}" type="hidden" data-image-value value="${escapeHtml(value || "")}" />
    </div>
  `;

  if (announcementImageInput) {
    announcementImageInput.outerHTML = imageSlotMarkup("特訓開始時イベント告知画像", String(config.challengeAnnouncementImage || ""), "gameTicketAnnouncementImageInput", "gameTicketAnnouncementImageValue");
  }
  if (thirtyImageInput) {
    thirtyImageInput.outerHTML = imageSlotMarkup("30分券画像", String(config.ticketImages?.[30] || ""), "gameTicketThirtyImageInput", "gameTicketThirtyImageValue");
  }
  if (sixtyImageInput) {
    sixtyImageInput.outerHTML = imageSlotMarkup("60分券画像", String(config.ticketImages?.[60] || ""), "gameTicketSixtyImageInput", "gameTicketSixtyImageValue");
  }

  if (announcementImageValue) announcementImageValue.value = String(config.challengeAnnouncementImage || "");
  if (thirtyImageValue) thirtyImageValue.value = String(config.ticketImages?.[30] || "");
  if (sixtyImageValue) sixtyImageValue.value = String(config.ticketImages?.[60] || "");
  if (cap5Input) cap5Input.value = String(config.dailyGrantCapByMinutes?.[5] ?? 20);
  if (cap15Input) cap15Input.value = String(config.dailyGrantCapByMinutes?.[15] ?? 20);
  if (cap30Input) cap30Input.value = String(config.dailyGrantCapByMinutes?.[30] ?? 10);
  if (cap60Input) cap60Input.value = String(config.dailyGrantCapByMinutes?.[60] ?? 10);

  const pointsDefinitionText = "＊当日特訓P：その日の対象特訓だけで獲得した累計ポイントです。他の学習モードのポイントや総保有ポイントは含みません。日付が変わると0から再計算されます。";
  const thresholdNoteText = "＊設定Pと完全一致しなくても、そのPを通過した時点で判定されます。";
  rulesTableBody.innerHTML = `
    <tr class="settings-game-ticket-definition-row">
      <td colspan="6">
        <div class="settings-game-ticket-definition-block">
          <p class="settings-game-ticket-definition-text">${pointsDefinitionText}</p>
          <p class="settings-game-ticket-definition-text settings-game-ticket-definition-note">${thresholdNoteText}</p>
        </div>
      </td>
    </tr>
    ${(config.normalRules || []).map((rule) => `
      <tr data-game-ticket-rule-row data-rule-id="${rule.id || ""}" data-rule-name="${escapeHtml(String(rule.name || "チケット"))}">
        <td>
          <select data-field="targetTraining">${targetTrainingHtml}</select>
        </td>
        <td><input type="number" data-field="threshold" value="${Number(rule.threshold) || 0}" min="0" step="1" /></td>
        <td><input type="number" data-field="chancePercent" value="${chanceToPercent(rule.chance)}" min="0" max="100" step="1" />%</td>
        <td>
          <select data-field="minutes">${minutesOptions}</select>
        </td>
        <td><input type="checkbox" data-field="enabled" ${rule.enabled ? "checked" : ""} /></td>
        <td><button type="button" class="ghost-btn compact-btn" data-action="remove-rule">削除</button></td>
      </tr>
    `).join("")}
  `;

  rulesTableBody.querySelectorAll("[data-game-ticket-rule-row]").forEach((row) => {
    const rule = (config.normalRules || []).find((entry) => String(entry.id || "") === String(row.dataset.ruleId || "")) || {};
    row.querySelector('[data-field="targetTraining"]').value = normalizeGameTicketTargetTraining(rule.targetTraining || "challenge");
    row.querySelector('[data-field="minutes"]').value = String(rule.minutes || 5);
    row.querySelector('[data-field="enabled"]').checked = Boolean(rule.enabled !== false);
  });

  const noteRows = rulesTableBody.querySelectorAll(".settings-game-ticket-definition-row");
  noteRows.forEach((row) => {
    const labelCell = row.querySelector("td");
    if (!labelCell) return;
    labelCell.colSpan = 6;
  });

  eventList.innerHTML = (config.events || []).map((event) => {
    const total = (event.outcomes || []).reduce((sum, outcome) => sum + (Number(outcome?.chance) || 0), 0);
    const missPercent = Math.max(0, Math.round((1 - total) * 100));
    const isConsecutiveChallenge = String(event.type || "draw") === "consecutiveCorrect";
    const drawOutcomeMarkup = isConsecutiveChallenge ? "" : `
      <div class="settings-game-ticket-outcome-list">
        <p class="settings-game-ticket-outcome-title">当選内容</p>
        ${(event.outcomes || []).map((outcome) => `
          <label class="settings-game-ticket-outcome-row">
            <span>${Number(outcome?.minutes) || 0}分券</span>
            <div class="settings-game-ticket-inline-input">
              <input type="number" data-field="outcomePercent" data-outcome-minutes="${Number(outcome?.minutes) || 0}" value="${chanceToPercent(outcome?.chance)}" min="0" max="100" step="1" />
              <span>%</span>
            </div>
          </label>
        `).join("") || "<p class='settings-game-ticket-empty'>当選内容がありません。</p>"}
        <div class="settings-game-ticket-outcome-row settings-game-ticket-miss-row">
          <span>ハズレ</span>
          <strong data-field="missPercent">${missPercent}%</strong>
        </div>
      </div>
    `;
    const consecutiveFieldsMarkup = isConsecutiveChallenge ? `
      <div class="settings-game-ticket-consecutive-fields" data-consecutive-fields>
        <label>
          <span>最大連続正解数</span>
          <input type="number" data-field="maxQuestions" value="${Number(event.maxQuestions) || 5}" min="1" step="1" />
        </label>
        <label>
          <span>1問正解ごとの報酬</span>
          <select data-field="rewardMinutes">${rewardMinutesOptions}</select>
        </label>
      </div>
    ` : "";
    return `
      <div class="settings-game-ticket-event-card${isConsecutiveChallenge ? " is-consecutive-challenge" : ""}" data-game-ticket-event-card data-event-id="${event.id || ""}" data-event-name="${escapeHtml(String(event.name || "イベント"))}">
        <div class="settings-game-ticket-event-header">
          <input type="text" data-field="name" value="${escapeHtml(String(event.name || "イベント"))}" />
          <button type="button" class="ghost-btn compact-btn" data-action="remove-event">削除</button>
        </div>
        <div class="settings-game-ticket-event-fields">
          <label>
            <span>イベント種別</span>
            <select data-field="eventType">
              <option value="draw" ${String(event.type || "draw") === "draw" ? "selected" : ""}>特別抽選</option>
              <option value="consecutiveCorrect" ${isConsecutiveChallenge ? "selected" : ""}>連続正解チャレンジ</option>
            </select>
          </label>
          <label>
            <span>対象特訓</span>
            <select data-field="targetTraining">${targetTrainingHtml}</select>
          </label>
          <label>
            <span>当日特訓P</span>
            <div class="settings-game-ticket-inline-input">
              <input type="number" data-field="threshold" value="${Number(event.threshold) || 0}" min="0" step="1" />
              <span>P</span>
            </div>
          </label>
          <label class="settings-game-ticket-checkbox-row">
            <span>有効</span>
            <input type="checkbox" data-field="enabled" ${event.enabled ? "checked" : ""} />
          </label>
          <label class="settings-game-ticket-image-field">
            <span>開始前画像</span>
            <div class="settings-image-picker" data-image-slot>
              <input type="file" accept="image/*" data-field="startImageFile" data-image-file-input aria-label="開始前画像" />
              <div class="settings-image-actions">
                <button type="button" class="secondary-btn compact-btn" data-action="change-image">画像を変更</button>
                <button type="button" class="ghost-btn compact-btn" data-action="clear-image">画像を削除</button>
              </div>
              <img class="settings-image-preview${event.startImage ? "" : " hidden"}" src="${escapeHtml(String(event.startImage || ""))}" alt="開始前画像" data-image-preview />
              <input type="hidden" data-field="startImage" data-image-value value="${escapeHtml(String(event.startImage || ""))}" />
            </div>
          </label>
          ${consecutiveFieldsMarkup}
        </div>
        ${drawOutcomeMarkup}
      </div>
    `;
  }).join("");

  const bindSingleImageSelector = (container, onValueChange) => {
    if (!container) return;
    const fileInput = container.querySelector('[data-image-file-input]');
    const preview = container.querySelector('[data-image-preview]');
    const valueInput = container.querySelector('[data-image-value]');
    const clearBtn = container.querySelector('[data-action="clear-image"]');
    const changeBtn = container.querySelector('[data-action="change-image"]');
    const applyValue = (nextValue) => {
      const safeValue = normalizeStoredImageReference(nextValue || "") || "";
      if (valueInput) valueInput.value = safeValue;
      if (preview) {
        preview.src = safeValue || "";
        preview.classList.toggle("hidden", !safeValue);
      }
      if (typeof onValueChange === "function") onValueChange(safeValue);
    };
    if (fileInput) {
      fileInput.addEventListener("change", async (event) => {
        const file = event.target?.files?.[0];
        const nextValue = await readImageFileAsDataUrl(file);
        applyValue(nextValue);
      });
    }
    if (changeBtn && fileInput) {
      changeBtn.addEventListener("click", () => fileInput.click());
    }
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (fileInput) fileInput.value = "";
        applyValue("");
      });
    }
    const currentValue = normalizeStoredImageReference(valueInput?.value || "") || "";
    if (preview) {
      preview.src = currentValue;
      preview.classList.toggle("hidden", !currentValue);
    }
  };

  document.querySelectorAll("[data-image-slot]").forEach((slot) => bindSingleImageSelector(slot));

  eventList.querySelectorAll("[data-game-ticket-event-card]").forEach((card) => {
    const event = (config.events || []).find((entry) => String(entry.id || "") === String(card.dataset.eventId || "")) || {};
    const eventTypeSelect = card.querySelector('[data-field="eventType"]');
    if (eventTypeSelect) eventTypeSelect.value = String(event.type || "draw");
    const rewardMinutesSelect = card.querySelector('[data-field="rewardMinutes"]');
    if (rewardMinutesSelect) rewardMinutesSelect.value = String(event.rewardMinutes || 5);
    const maxQuestionsInput = card.querySelector('[data-field="maxQuestions"]');
    if (maxQuestionsInput) maxQuestionsInput.value = String(Number(event.maxQuestions) || 5);
    const startImageInput = card.querySelector('[data-field="startImage"]');
    if (startImageInput) startImageInput.value = String(event.startImage || "");
    const startImageSlot = card.querySelector('[data-image-slot]');
    if (startImageSlot) bindSingleImageSelector(startImageSlot);
    card.querySelector('[data-field="targetTraining"]').value = normalizeGameTicketTargetTraining(event.targetTraining || "challenge");
    card.querySelector('[data-field="enabled"]').checked = Boolean(event.enabled !== false);
    const missValue = card.querySelector('[data-field="missPercent"]');
    if (missValue) {
      const total = (event.outcomes || []).reduce((sum, outcome) => sum + (Number(outcome?.chance) || 0), 0);
      missValue.textContent = `${Math.max(0, Math.round((1 - total) * 100))}%`;
    }
  });

  rulesTableBody.querySelectorAll("[data-action='remove-rule']").forEach((button) => {
    button.addEventListener("click", () => {
      const row = button.closest("[data-game-ticket-rule-row]");
      if (!row) return;
      const id = String(row.dataset.ruleId || "");
      const existing = getGameTicketConfig().normalRules || [];
      const nextRules = existing.filter((rule) => String(rule.id || "") !== id);
      state.settings.gameTicketConfig = sanitizeGameTicketConfig({ ...getGameTicketConfig(), normalRules: nextRules });
      renderGameTicketSettingsUi();
    });
  });

  eventList.querySelectorAll("[data-action='remove-event']").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest("[data-game-ticket-event-card]");
      if (!card) return;
      const id = String(card.dataset.eventId || "");
      const existing = getGameTicketConfig().events || [];
      const nextEvents = existing.filter((event) => String(event.id || "") !== id);
      state.settings.gameTicketConfig = sanitizeGameTicketConfig({ ...getGameTicketConfig(), events: nextEvents });
      renderGameTicketSettingsUi();
    });
  });

  const syncOutcomeRowDisplay = (card) => {
    const totalPercent = [...card.querySelectorAll('[data-field="outcomePercent"]')].reduce((sum, input) => sum + Math.max(0, Number(input.value || 0)), 0);
    const missText = card.querySelector('[data-field="missPercent"]');
    if (missText) {
      missText.textContent = `${Math.max(0, 100 - totalPercent)}%`;
    }
  };

  const syncEventTypeVisibility = (card) => {
    const eventTypeSelect = card.querySelector('[data-field="eventType"]');
    const isConsecutive = String(eventTypeSelect?.value || "draw") === "consecutiveCorrect";
    const outcomeList = card.querySelector('.settings-game-ticket-outcome-list');
    const consecutiveFields = card.querySelector('[data-consecutive-fields]');
    if (outcomeList) {
      outcomeList.classList.toggle("hidden", isConsecutive);
    }
    if (consecutiveFields) {
      consecutiveFields.toggleAttribute("hidden", !isConsecutive);
      consecutiveFields.hidden = !isConsecutive;
    }
  };

  eventList.querySelectorAll('[data-field="eventType"]').forEach((select) => {
    const card = select.closest("[data-game-ticket-event-card]");
    if (card) {
      syncEventTypeVisibility(card);
    }
    select.addEventListener("change", () => {
      const currentCard = select.closest("[data-game-ticket-event-card]");
      if (currentCard) {
        syncEventTypeVisibility(currentCard);
      }
    });
  });

  eventList.querySelectorAll('[data-field="outcomePercent"]').forEach((input) => {
    input.addEventListener("input", (event) => {
      const card = event.target.closest("[data-game-ticket-event-card]");
      if (card) {
        syncOutcomeRowDisplay(card);
      }
    });
  });
}

function saveGameTicketSettingsFromUi() {
  const config = parseGameTicketSettingsFromUi();
  state.settings.gameTicketConfig = config;
  saveState();
  renderGameTicketSettingsUi();
  return config;
}
const GAME_TICKET_DAY_MS = 24 * 60 * 60 * 1000;
const POINT_SYSTEM_STORAGE_KEY = "english-trainer-pc-points-v1";
const POINT_SYSTEM_CONFIG = Object.freeze({
  dayAdvanceCompletionBonusPoints: 50,
  dayUnstudiedClearBonusPoints: 25,
  dailyLimitModes: Object.freeze({
    normal: 300,
    event: 300
  }),
  defaultDailyLimitMode: "normal",
  rewardByTrainingMode: Object.freeze({
    challenge: 3,
    preposition: 1,
    response: 1,
    "irregular-verb": 2,
    idiom: 1
  }),
  dailyCapByTrainingMode: Object.freeze({
    preposition: 30,
    response: 40,
    challenge: 300,
    "irregular-verb": 100,
    idiom: 30
  }),
  reservedBonuses: Object.freeze({
    weaknessClear: 0,
    levelUp: 0
  }),
  rewardCardAutoCloseMs: 1400,
  exchangeItems: Object.freeze([
    Object.freeze({ id: "snack", name: "おかし（5回）", cost: 100, maxRedemptions: 5 }),
    Object.freeze({ id: "juice", name: "ジュース（3回）", cost: 200, maxRedemptions: 3 }),
    Object.freeze({ id: "mac", name: "マック（1回）", cost: 1000, maxRedemptions: 1 }),
    Object.freeze({ id: "glove", name: "グローブ", cost: 10000 }),
    Object.freeze({ id: "bat", name: "バット（1回）", cost: 20000, maxRedemptions: 1 }),
    Object.freeze({ id: "other", name: "その他（未定）", cost: 0, available: false })
  ])
});
const STUDY_CORE_SYNC_SCHEMA_VERSION = 1;
const STUDY_CORE_SYNC_LOCAL_META_KEY = "english-trainer-pc-study-core-sync-v1";
const STUDY_CORE_SYNC_DEBUG_KEY = "english-trainer-pc-study-core-sync-debug-v1";
const STUDY_CORE_SYNC_DEBOUNCE_MS = 250;
const STUDY_CORE_SYNC_SKIP_ONCE_SESSION_KEY = "english-trainer-pc-study-core-sync-skip-once";
const STUDY_CORE_BACKUP_RETENTION_DAYS = 3;
const STUDY_CORE_DANGEROUS_METRICS = Object.freeze([
  "unlockedDayMax",
  "itemCount",
  "learnedCount",
  "attempts",
  "correct",
  "reviewRecordCount"
]);
function getCurrentPcFirebaseUid() {
  return String(getCurrentPcFirebaseUser()?.uid || "").trim();
}

function getScopedLocalStorageKey(baseKey, uid = getCurrentPcFirebaseUid()) {
  const safeUid = String(uid || "").trim();
  return safeUid ? `${baseKey}-${safeUid}` : "";
}

function extractUidFromScopedStorageKey(storageKey, baseKey) {
  const rawKey = String(storageKey || "").trim();
  const rawBaseKey = String(baseKey || "").trim();
  if (!rawKey || !rawBaseKey) return "";
  const prefix = `${rawBaseKey}-`;
  return rawKey.startsWith(prefix) ? rawKey.slice(prefix.length).trim() : "";
}

function buildPcBrowserDeviceId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (_error) {
    // Fallback below.
  }
  const randomPart = Math.random().toString(36).slice(2, 10);
  return `pc-${Date.now().toString(36)}-${randomPart}`;
}

function sanitizePcBrowserDeviceName(value) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  if (!text) return "";
  return text.slice(0, 40);
}

function isReservedUserLabelForDeviceName(value) {
  const normalized = sanitizePcBrowserDeviceName(value);
  return normalized === "私" || normalized === "長男";
}

function normalizeDeviceNameForHistory(value) {
  const normalized = sanitizePcBrowserDeviceName(value);
  if (!normalized) return "";
  if (normalized === PC_BROWSER_DEVICE_NAME_FALLBACK) return "";
  if (isReservedUserLabelForDeviceName(normalized)) return "";
  return normalized;
}

function readPcBrowserDeviceNameMap() {
  try {
    const raw = localStorage.getItem(PC_BROWSER_DEVICE_NAME_MAP_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const normalizedEntries = Object.entries(parsed)
      .map(([deviceId, name]) => [String(deviceId || "").trim(), normalizeDeviceNameForHistory(name)])
      .filter(([deviceId, name]) => deviceId && name);
    return Object.fromEntries(normalizedEntries);
  } catch (_error) {
    return {};
  }
}

function writePcBrowserDeviceNameMap(mapLike) {
  const safeObject = mapLike && typeof mapLike === "object" && !Array.isArray(mapLike) ? mapLike : {};
  const normalizedEntries = Object.entries(safeObject)
    .map(([deviceId, name]) => [String(deviceId || "").trim(), normalizeDeviceNameForHistory(name)])
    .filter(([deviceId, name]) => deviceId && name);
  try {
    localStorage.setItem(PC_BROWSER_DEVICE_NAME_MAP_STORAGE_KEY, JSON.stringify(Object.fromEntries(normalizedEntries)));
  } catch (_error) {
    // Keep runtime values even if persistence fails.
  }
}

function getPcBrowserDeviceId() {
  try {
    const stored = String(localStorage.getItem(PC_BROWSER_DEVICE_ID_STORAGE_KEY) || "").trim();
    if (stored) return stored;
    const created = buildPcBrowserDeviceId();
    localStorage.setItem(PC_BROWSER_DEVICE_ID_STORAGE_KEY, created);
    return created;
  } catch (_error) {
    return buildPcBrowserDeviceId();
  }
}

function getPcBrowserDeviceNameRaw() {
  const deviceId = getPcBrowserDeviceId();
  try {
    const map = readPcBrowserDeviceNameMap();
    const mapped = normalizeDeviceNameForHistory(map[deviceId]);
    if (mapped) return mapped;
    const legacy = normalizeDeviceNameForHistory(localStorage.getItem(PC_BROWSER_DEVICE_NAME_STORAGE_KEY));
    if (!legacy) return "";
    map[deviceId] = legacy;
    writePcBrowserDeviceNameMap(map);
    return legacy;
  } catch (_error) {
    return "";
  }
}

function getPcBrowserDeviceName() {
  return getPcBrowserDeviceNameRaw() || PC_BROWSER_DEVICE_NAME_FALLBACK;
}

function readLearningHistoryCachedSonUid() {
  try {
    return String(localStorage.getItem(LEARNING_HISTORY_SON_UID_CACHE_KEY) || "").trim();
  } catch (_error) {
    return "";
  }
}

function writeLearningHistoryCachedSonUid(value) {
  const normalized = String(value || "").trim();
  learningHistoryCachedSonUid = normalized;
  try {
    if (normalized) {
      localStorage.setItem(LEARNING_HISTORY_SON_UID_CACHE_KEY, normalized);
    } else {
      localStorage.removeItem(LEARNING_HISTORY_SON_UID_CACHE_KEY);
    }
  } catch (_error) {
    // Ignore persistence failures.
  }
}

function stopLearningHistoryFamilyWatch() {
  if (typeof learningHistoryFamilyUnsubscribe === "function") {
    learningHistoryFamilyUnsubscribe();
  }
  learningHistoryFamilyUnsubscribe = null;
}

function startLearningHistoryFamilyWatch() {
  const watchFn = window.watchFamilyDocument;
  const currentUid = String(getCurrentPcFirebaseUser()?.uid || "").trim();
  stopLearningHistoryFamilyWatch();
  if (!currentUid || typeof watchFn !== "function") {
    return;
  }
  learningHistoryFamilyUnsubscribe = watchFn(LEARNING_HISTORY_FAMILY_ID, {
    onUpdate: (family) => {
      const sonUid = String(family?.children?.son?.uid || "").trim();
      writeLearningHistoryCachedSonUid(sonUid);
      renderHomeAccountAliasBadge();
    },
    onError: () => {
      // Keep existing cache when watch fails.
    }
  });
}

function resolveHomeAccountAliasForPcUser(user) {
  const email = String(user?.email || "").trim().toLowerCase();
  if (email.startsWith(HOME_ACCOUNT_PARENT_EMAIL_PREFIX)) {
    return HOME_ACCOUNT_PARENT_ALIAS;
  }
  if (isCurrentSonLoginForLearningHistory()) {
    return HOME_ACCOUNT_SON_ALIAS;
  }
  return "";
}

function renderHomeAccountAliasBadge() {
  const aliasNode = document.getElementById("pcHomeAccountAlias");
  if (!aliasNode) return;
  const alias = resolveHomeAccountAliasForPcUser(getCurrentPcFirebaseUser());
  const shouldShow = currentScreenId === "homeScreen" && Boolean(alias);
  aliasNode.textContent = shouldShow ? alias : "";
  aliasNode.classList.toggle("hidden", !shouldShow);
}

function bindLearningHistoryFamilyWatchAuthStateListener() {
  if (document.body?.dataset.learningHistoryFamilyWatchBound === "true") return;
  document.addEventListener("pc-firebase-auth-state", () => {
    startLearningHistoryFamilyWatch();
  });
  if (document.body) {
    document.body.dataset.learningHistoryFamilyWatchBound = "true";
  }
}

function isCurrentSonLoginForLearningHistory() {
  const currentUid = String(getCurrentPcFirebaseUser()?.uid || "").trim();
  if (!currentUid) return false;
  if (!learningHistoryCachedSonUid) {
    learningHistoryCachedSonUid = readLearningHistoryCachedSonUid();
  }
  return Boolean(learningHistoryCachedSonUid && currentUid === learningHistoryCachedSonUid);
}

function getPcLearningHistoryDeviceName() {
  if (isCurrentSonLoginForLearningHistory()) {
    return "長男PC";
  }
  const normalized = normalizeDeviceNameForHistory(getPcBrowserDeviceNameRaw());
  if (normalized && normalized !== "スマホPC版") {
    return normalized;
  }
  return "その他";
}

function buildPcLearningHistoryDeviceInfo() {
  return {
    deviceType: "pc",
    deviceId: String(getPcBrowserDeviceId() || "").trim(),
    deviceName: sanitizePcBrowserDeviceName(getPcLearningHistoryDeviceName())
  };
}

function setPcBrowserDeviceName(value) {
  const normalized = normalizeDeviceNameForHistory(value);
  const deviceId = getPcBrowserDeviceId();
  const nextMap = readPcBrowserDeviceNameMap();
  if (normalized) {
    nextMap[deviceId] = normalized;
  } else {
    delete nextMap[deviceId];
  }
  writePcBrowserDeviceNameMap(nextMap);
  try {
    if (normalized) {
      localStorage.setItem(PC_BROWSER_DEVICE_NAME_STORAGE_KEY, normalized);
    } else {
      localStorage.removeItem(PC_BROWSER_DEVICE_NAME_STORAGE_KEY);
    }
  } catch (_error) {
    // Keep runtime value even if persistence fails.
  }
  return normalized || PC_BROWSER_DEVICE_NAME_FALLBACK;
}

function ensurePcBrowserDeviceIdentity() {
  const deviceId = getPcBrowserDeviceId();
  try {
    const map = readPcBrowserDeviceNameMap();
    const mapped = normalizeDeviceNameForHistory(map[deviceId]);
    const legacy = normalizeDeviceNameForHistory(localStorage.getItem(PC_BROWSER_DEVICE_NAME_STORAGE_KEY));
    if (mapped) {
      localStorage.setItem(PC_BROWSER_DEVICE_NAME_STORAGE_KEY, mapped);
      return;
    }
    if (legacy) {
      map[deviceId] = legacy;
      writePcBrowserDeviceNameMap(map);
      localStorage.setItem(PC_BROWSER_DEVICE_NAME_STORAGE_KEY, legacy);
      return;
    }
    localStorage.removeItem(PC_BROWSER_DEVICE_NAME_STORAGE_KEY);
  } catch (_error) {
    // No-op.
  }
}

function normalizeAdminLearningHistoryDeviceFilterKey(deviceId) {
  const normalized = String(deviceId || "").trim();
  return normalized || ADMIN_HISTORY_LEGACY_DEVICE_FILTER_KEY;
}

function isAdminLearningHistorySonSelected() {
  return adminLearningHistoryCanSelectFamily && String(adminLearningHistorySelectedChildKey || "") === "son";
}

function resolveAdminLearningHistorySonDeviceFilterKey(entry) {
  const deviceType = String(entry?.deviceType || "").trim().toLowerCase();
  const deviceName = normalizeDeviceNameForHistory(entry?.deviceName);
  if (deviceType === "pc" && deviceName === "長男PC") {
    return ADMIN_HISTORY_SON_PC_FILTER_KEY;
  }
  if (deviceType === "mobile" && deviceName === "長男モバイル") {
    return ADMIN_HISTORY_SON_MOBILE_FILTER_KEY;
  }
  return ADMIN_HISTORY_SON_OTHER_FILTER_KEY;
}

function buildAdminLearningHistoryDeviceNameMap(entries = adminLearningHistorySourceEntries) {
  const map = new Map();
  const source = Array.isArray(entries) ? entries : [];
  source.forEach((entry) => {
    const key = normalizeAdminLearningHistoryDeviceFilterKey(entry?.deviceId);
    if (key === ADMIN_HISTORY_LEGACY_DEVICE_FILTER_KEY || map.has(key)) return;
    const normalizedName = normalizeDeviceNameForHistory(entry?.deviceName);
    if (normalizedName) {
      map.set(key, normalizedName);
    }
  });

  const localDeviceNameMap = readPcBrowserDeviceNameMap();
  Object.entries(localDeviceNameMap).forEach(([deviceId, deviceName]) => {
    const key = normalizeAdminLearningHistoryDeviceFilterKey(deviceId);
    if (key === ADMIN_HISTORY_LEGACY_DEVICE_FILTER_KEY || map.has(key)) return;
    const normalizedName = normalizeDeviceNameForHistory(deviceName);
    if (normalizedName) {
      map.set(key, normalizedName);
    }
  });

  const currentDeviceId = String(getPcBrowserDeviceId() || "").trim();
  const currentDeviceName = normalizeDeviceNameForHistory(getPcBrowserDeviceNameRaw());
  if (currentDeviceId && currentDeviceName) {
    map.set(currentDeviceId, currentDeviceName);
  }
  return map;
}

function getAdminLearningHistoryDeviceFilterLabel(entry, fallbackKey = "", deviceNameMap = null) {
  const explicitName = normalizeDeviceNameForHistory(entry?.deviceName);
  if (explicitName) return explicitName;
  const deviceType = String(entry?.deviceType || "").trim().toLowerCase();
  const resolvedKey = normalizeAdminLearningHistoryDeviceFilterKey(entry?.deviceId || fallbackKey);
  if (resolvedKey === ADMIN_HISTORY_LEGACY_DEVICE_FILTER_KEY) {
    return ADMIN_HISTORY_LEGACY_DEVICE_FILTER_LABEL;
  }
  const mappedName = normalizeDeviceNameForHistory(deviceNameMap?.get(resolvedKey));
  if (mappedName) {
    return mappedName;
  }
  if (deviceType === "mobile") {
    return "端末未設定";
  }
  return PC_BROWSER_DEVICE_NAME_FALLBACK;
}

function buildAdminLearningHistoryNamedDeviceFilterKey(label) {
  return `${ADMIN_HISTORY_NAMED_DEVICE_FILTER_PREFIX}${String(label || "").trim()}`;
}

function getAdminLearningHistoryEntryDeviceFilterKey(entry, deviceNameMap = null) {
  const resolvedKey = normalizeAdminLearningHistoryDeviceFilterKey(entry?.deviceId);
  if (resolvedKey === ADMIN_HISTORY_LEGACY_DEVICE_FILTER_KEY) {
    return ADMIN_HISTORY_LEGACY_DEVICE_FILTER_KEY;
  }
  const label = getAdminLearningHistoryDeviceFilterLabel(entry, resolvedKey, deviceNameMap);
  return buildAdminLearningHistoryNamedDeviceFilterKey(label);
}

function renderPcDeviceIdentitySettings() {
  const deviceIdText = document.getElementById("pcDeviceIdText");
  const deviceNameInput = document.getElementById("pcDeviceNameInput");
  const savedText = document.getElementById("pcDeviceNameSavedText");
  const deviceId = getPcBrowserDeviceId();
  const deviceName = getPcBrowserDeviceName();
  if (deviceIdText) {
    deviceIdText.textContent = deviceId;
  }
  if (deviceNameInput) {
    deviceNameInput.value = deviceName;
  }
  if (savedText) {
    savedText.textContent = `現在の端末名: ${deviceName}`;
  }
}

function resetUserScopedStorageCaches() {
  studyCoreSyncMetaCache = null;
  gameTicketSyncMetaCache = null;
  gameTicketSyncPromise = null;
  gameTicketSyncDirty = false;
  if (gameTicketSyncFlushTimer) {
    clearTimeout(gameTicketSyncFlushTimer);
    gameTicketSyncFlushTimer = null;
  }
  pointStateCache = null;
  pointStateBootstrapPromise = null;
  pointStateSyncMetaCache = null;
  pointStateSyncPromise = null;
  studyCoreSyncRuntime.initializedUid = "";
  studyCoreSyncRuntime.remoteData = null;
  window.StudyCoreSyncDebugInfo = {};
}

const studyCoreSyncRuntime = {
  pendingItemIds: new Set(),
  pendingReviewRecordIds: new Set(),
  pendingUnlockedDayMax: false,
  flushTimer: null,
  isFlushing: false,
  initializedUid: "",
  remoteData: null,
  isApplying: false
};
window.StudyCoreSyncDebugInfo = window.StudyCoreSyncDebugInfo || {};
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
let prepositionTrainingSession = null;
let responseTrainingSession = null;
let grammarTrainingSession = null;
let currentScreenId = "homeScreen";
let pendingTrainingCompleteContext = null;
let deferGameTicketRewardModal = false;
let adminLearningHistorySelectedDayKey = "";
let adminLearningHistoryFirestoreUnsubscribe = null;
let adminLearningHistoryFirestoreLoadToken = 0;
let adminLearningHistoryFamilyUnsubscribe = null;
let adminLearningHistoryFamilyLoadToken = 0;
let adminLearningHistoryFamilyChildren = [];
let adminLearningHistorySelectedChildKey = "parent";
let adminLearningHistorySelectedChildUid = "";
let adminLearningHistoryCanSelectFamily = false;
let adminLearningHistorySelectedDeviceType = ADMIN_HISTORY_ALL_DEVICE_FILTER_KEY;
let adminLearningHistorySourceEntries = [];
let homeHistoryFirestoreUnsubscribe = null;
let homeHistoryFirestoreEntries = [];
let homeHistoryFirestoreLoaded = false;
let homeHistoryFirestoreLoading = false;
let learningHistoryFamilyUnsubscribe = null;
let learningHistoryCachedSonUid = "";
window.AdminLearningHistoryAccessState = window.AdminLearningHistoryAccessState || {
  canSelectFamily: false,
  currentUid: ""
};
const DESKTOP_FIT_REFERENCE = Object.freeze({
  width: 1366,
  height: 920,
  minScale: 0.34
});
const screenHistory = [];
const levelTrendTracker = {
  date: "",
  lastL1: null,
  lastL4: null,
  l1Reduced: 0,
  l4Increased: 0
};
const keyboardNavState = {
  context: "",
  buttons: [],
  selectedIndex: -1,
  lockEnterUntilKeyup: false,
  isExecuting: false,
  lastExecuteAt: 0
};

function createDefaultStudyCoreSyncMeta() {
  return {
    schemaVersion: STUDY_CORE_SYNC_SCHEMA_VERSION,
    uid: "",
    initialized: false,
    lastLocalChangeAt: 0,
    unlockedDayMaxUpdatedAt: 0,
    items: {},
    reviewRecords: {},
    lastResolution: null
  };
}

let studyCoreSyncMetaCache = null;

function sanitizeStudyCoreSyncMeta(value) {
  const source = value && typeof value === "object" ? value : {};
  const items = source.items && typeof source.items === "object" ? source.items : {};
  const reviewRecords = source.reviewRecords && typeof source.reviewRecords === "object" ? source.reviewRecords : {};
  const sanitizeUpdatedAtMap = (map) => Object.fromEntries(
    Object.entries(map)
      .map(([key, row]) => {
        const updatedAt = Math.max(0, Number(row?.updatedAt) || 0);
        return key ? [String(key), { updatedAt }] : null;
      })
      .filter(Boolean)
  );
  return {
    schemaVersion: STUDY_CORE_SYNC_SCHEMA_VERSION,
    uid: typeof source.uid === "string" ? source.uid : "",
    initialized: Boolean(source.initialized),
    lastLocalChangeAt: Math.max(0, Number(source.lastLocalChangeAt) || 0),
    unlockedDayMaxUpdatedAt: Math.max(0, Number(source.unlockedDayMaxUpdatedAt) || 0),
    items: sanitizeUpdatedAtMap(items),
    reviewRecords: sanitizeUpdatedAtMap(reviewRecords),
    lastResolution: source.lastResolution && typeof source.lastResolution === "object"
      ? {
        uid: typeof source.lastResolution.uid === "string" ? source.lastResolution.uid : "",
        adopted: typeof source.lastResolution.adopted === "string" ? source.lastResolution.adopted : "",
        remoteUpdatedAt: Math.max(0, Number(source.lastResolution.remoteUpdatedAt) || 0),
        localUpdatedAt: Math.max(0, Number(source.lastResolution.localUpdatedAt) || 0),
        localInfoSource: typeof source.lastResolution.localInfoSource === "string" ? source.lastResolution.localInfoSource : "",
        happenedAt: Math.max(0, Number(source.lastResolution.happenedAt) || 0)
      }
      : null
  };
}

function loadStudyCoreSyncMeta() {
  if (studyCoreSyncMetaCache) return studyCoreSyncMetaCache;
  try {
    const storageKey = getScopedLocalStorageKey(STUDY_CORE_SYNC_LOCAL_META_KEY);
    if (!storageKey) {
      studyCoreSyncMetaCache = createDefaultStudyCoreSyncMeta();
      return studyCoreSyncMetaCache;
    }
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      studyCoreSyncMetaCache = createDefaultStudyCoreSyncMeta();
      return studyCoreSyncMetaCache;
    }
    studyCoreSyncMetaCache = sanitizeStudyCoreSyncMeta(JSON.parse(raw));
    return studyCoreSyncMetaCache;
  } catch (_error) {
    studyCoreSyncMetaCache = createDefaultStudyCoreSyncMeta();
    return studyCoreSyncMetaCache;
  }
}

function saveStudyCoreSyncMeta(nextMeta) {
  studyCoreSyncMetaCache = sanitizeStudyCoreSyncMeta(nextMeta);
  const storageKey = getScopedLocalStorageKey(STUDY_CORE_SYNC_LOCAL_META_KEY);
  if (!storageKey) return studyCoreSyncMetaCache;
  localStorage.setItem(storageKey, JSON.stringify(studyCoreSyncMetaCache));
  return studyCoreSyncMetaCache;
}

function updateStudyCoreSyncDebugInfo(payload) {
  window.StudyCoreSyncDebugInfo = {
    ...(window.StudyCoreSyncDebugInfo || {}),
    ...(payload && typeof payload === "object" ? payload : {})
  };
  try {
    const storageKey = getScopedLocalStorageKey(STUDY_CORE_SYNC_DEBUG_KEY);
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(window.StudyCoreSyncDebugInfo));
  } catch (_error) {
    // Ignore debug cache failures.
  }
}

function parseStudyCoreDateKeyToTimestamp(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return 0;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || !month || !day) return 0;
  return Date.UTC(year, month - 1, day, 14, 59, 59, 999);
}

function getStudyCoreCurrentUid() {
  return String(getCurrentPcFirebaseUser()?.uid || "").trim();
}

function markSkipStudyCoreSyncOnce() {
  try {
    sessionStorage.setItem(STUDY_CORE_SYNC_SKIP_ONCE_SESSION_KEY, "1");
  } catch (_error) {
    // Ignore storage failures.
  }
}

function consumeSkipStudyCoreSyncOnce() {
  try {
    const shouldSkip = sessionStorage.getItem(STUDY_CORE_SYNC_SKIP_ONCE_SESSION_KEY) === "1";
    if (shouldSkip) {
      sessionStorage.removeItem(STUDY_CORE_SYNC_SKIP_ONCE_SESSION_KEY);
      return true;
    }
  } catch (_error) {
    // Ignore storage failures.
  }
  return false;
}

function createEmptyStudyCoreSummary() {
  return {
    unlockedDayMax: 1,
    itemCount: 0,
    learnedCount: 0,
    attempts: 0,
    correct: 0,
    reviewRecordCount: 0,
    updatedAt: 0
  };
}

function summarizeStudyCoreItemsLike(itemEntries, reviewRecords, options = {}) {
  const summary = createEmptyStudyCoreSummary();
  summary.unlockedDayMax = Math.max(1, Number(options.unlockedDayMax) || 1);
  summary.updatedAt = Math.max(0, Number(options.updatedAt) || 0);

  Object.values(itemEntries || {}).forEach((entry) => {
    const levelData = sanitizeLevelData(entry?.levelData);
    const learningStats = sanitizeLearningStats(entry?.learningStats);
    const isMeaningful = Boolean(
      entry?.hasBeenStudied ||
      levelData.level > 1 ||
      levelData.successCount > 0 ||
      levelData.lv4FailureCount > 0 ||
      levelData.lv4Celebrated ||
      learningStats.attempts > 0 ||
      learningStats.correct > 0 ||
      learningStats.lastStudiedDate ||
      learningStats.lastCorrectDate ||
      entry?.reviewDue
    );
    if (isMeaningful) {
      summary.itemCount += 1;
      summary.learnedCount += 1;
    }
    summary.attempts += Math.max(0, Number(learningStats.attempts) || 0);
    summary.correct += Math.max(0, Number(learningStats.correct) || 0);
    summary.updatedAt = Math.max(summary.updatedAt, Math.max(0, Number(entry?.updatedAt) || 0));
  });

  Object.values(reviewRecords || {}).forEach((entry) => {
    summary.reviewRecordCount += 1;
    summary.updatedAt = Math.max(summary.updatedAt, Math.max(0, Number(entry?.updatedAt) || 0));
  });

  return summary;
}

function buildStudyCoreSummaryFromRemoteData(remoteData) {
  if (!remoteData || typeof remoteData !== "object") {
    return createEmptyStudyCoreSummary();
  }
  return summarizeStudyCoreItemsLike(remoteData.items || {}, remoteData.reviewRecords || {}, {
    unlockedDayMax: remoteData.unlockedDayMax,
    updatedAt: Math.max(0, Number(remoteData.updatedAt) || 0)
  });
}

function buildStudyCoreSummaryFromCurrentState() {
  const itemEntries = Object.fromEntries(state.items.map((item) => [String(item.id), item]));
  const summary = summarizeStudyCoreItemsLike(itemEntries, state.review.records || {}, {
    unlockedDayMax: Math.max(1, Number(state.stats?.unlockedDayMax) || 1),
    updatedAt: Math.max(0, Number(getStudyCoreLocalUpdateInfo().updatedAt) || 0)
  });
  summary.learnedCount = getLearnedItemCount();
  summary.itemCount = collectStudyCoreTrackedItemIds().length;
  return summary;
}

function isMeaningfulStudyCoreSummary(summary) {
  const safe = summary && typeof summary === "object" ? summary : createEmptyStudyCoreSummary();
  return Boolean(
    safe.unlockedDayMax > 1 ||
    safe.itemCount > 0 ||
    safe.learnedCount > 0 ||
    safe.attempts > 0 ||
    safe.correct > 0 ||
    safe.reviewRecordCount > 0
  );
}

function isClearlyInitialStudyCoreSummary(summary) {
  return !isMeaningfulStudyCoreSummary(summary);
}

function getStudyCoreRegressionReasons(candidateSummary, baselineSummary) {
  const candidate = candidateSummary && typeof candidateSummary === "object" ? candidateSummary : createEmptyStudyCoreSummary();
  const baseline = baselineSummary && typeof baselineSummary === "object" ? baselineSummary : createEmptyStudyCoreSummary();
  const reasons = [];

  STUDY_CORE_DANGEROUS_METRICS.forEach((metricKey) => {
    const candidateValue = Math.max(0, Number(candidate[metricKey]) || 0);
    const baselineValue = Math.max(0, Number(baseline[metricKey]) || 0);
    if (candidateValue < baselineValue) {
      reasons.push(`${metricKey}: ${candidateValue} < ${baselineValue}`);
    }
  });

  return reasons;
}

function queueStudyCoreSyncChange(options = {}) {
  markStudyCoreLocalChange(options);
  scheduleStudyCoreSync();
}

function chooseStudyCoreSyncAdoption(localInfo, localSummary, remoteResult) {
  const remoteExists = Boolean(remoteResult?.exists && remoteResult?.data && typeof remoteResult.data === "object");
  const remoteSummary = buildStudyCoreSummaryFromRemoteData(remoteResult?.data || null);
  const remoteUpdatedAt = Math.max(0, Number(remoteResult?.data?.updatedAt) || 0);
  const localUpdatedAt = Math.max(0, Number(localInfo?.updatedAt) || 0);

  if (!remoteExists || !isMeaningfulStudyCoreSummary(remoteSummary)) {
    if (!isMeaningfulStudyCoreSummary(localSummary)) {
      return { adopted: "none", remoteSummary, remoteUpdatedAt, reason: "both-empty" };
    }
    return {
      adopted: "local-initial-upload",
      remoteSummary,
      remoteUpdatedAt,
      reason: remoteExists ? "remote-not-meaningful" : "remote-missing"
    };
  }

  if (isClearlyInitialStudyCoreSummary(localSummary)) {
    return { adopted: "firestore", remoteSummary, remoteUpdatedAt, reason: "local-initial" };
  }

  const regressionReasons = getStudyCoreRegressionReasons(localSummary, remoteSummary);
  if (regressionReasons.length) {
    return {
      adopted: "firestore",
      remoteSummary,
      remoteUpdatedAt,
      reason: `local-regression:${regressionReasons.join(", ")}`
    };
  }

  if (remoteUpdatedAt > localUpdatedAt) {
    return { adopted: "firestore", remoteSummary, remoteUpdatedAt, reason: "remote-newer" };
  }

  if (localUpdatedAt > remoteUpdatedAt) {
    return { adopted: "local", remoteSummary, remoteUpdatedAt, reason: "local-newer" };
  }

  return { adopted: "firestore", remoteSummary, remoteUpdatedAt, reason: "timestamps-equal" };
}

function buildStudyCoreBackupPayload(uid, options = {}) {
  const safeUid = String(uid || "").trim();
  const studyCoreData = options.studyCoreData && typeof options.studyCoreData === "object"
    ? structuredClone(options.studyCoreData)
    : buildStudyCoreFullPayload(safeUid);
  return {
    schemaVersion: STUDY_CORE_SYNC_SCHEMA_VERSION,
    uid: safeUid,
    dayKey: String(options.dayKey || getLearningHistoryDayKey(Date.now())),
    backupUpdatedAt: Math.max(0, Number(options.backupUpdatedAt) || Date.now()),
    appVersion: APP_VERSION,
    summary: buildStudyCoreSummaryFromRemoteData(studyCoreData),
    studyCoreData
  };
}

function formatStudyCoreBackupDayLabel(dayKey) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dayKey || ""));
  if (!match) return String(dayKey || "-");
  return `${match[1]}/${match[2]}/${match[3]}`;
}

async function pruneStudyCoreBackupRetention(currentUid) {
  if (typeof window.loadStudyCoreBackupsFromFirestore !== "function" || typeof window.deleteStudyCoreBackupFromFirestore !== "function") {
    return;
  }
  const backups = await window.loadStudyCoreBackupsFromFirestore(currentUid);
  const overflow = (Array.isArray(backups) ? backups : []).slice(STUDY_CORE_BACKUP_RETENTION_DAYS);
  for (const backup of overflow) {
    const dayKey = String(backup?.dayKey || backup?.id || "").trim();
    if (!dayKey) continue;
    await window.deleteStudyCoreBackupFromFirestore(dayKey, { targetUid: currentUid });
  }
}

async function saveStudyCoreDailyBackup(options = {}) {
  const currentUid = String(options?.targetUid || getStudyCoreCurrentUid() || "").trim();
  if (!currentUid || typeof window.saveStudyCoreBackupToFirestore !== "function") {
    return false;
  }

  const payload = buildStudyCoreBackupPayload(currentUid, options);
  if (!options.force) {
    if (!isMeaningfulStudyCoreSummary(payload.summary)) {
      console.warn("[StudyCoreBackup] skipped empty backup", { uid: currentUid, summary: payload.summary });
      return false;
    }
    const remoteSummary = buildStudyCoreSummaryFromRemoteData(studyCoreSyncRuntime.remoteData || null);
    const regressionReasons = getStudyCoreRegressionReasons(payload.summary, remoteSummary);
    if (isMeaningfulStudyCoreSummary(remoteSummary) && regressionReasons.length) {
      console.warn("[StudyCoreBackup] skipped dangerous backup update", {
        uid: currentUid,
        summary: payload.summary,
        remoteSummary,
        regressionReasons
      });
      return false;
    }
  }

  const saved = await window.saveStudyCoreBackupToFirestore(payload.dayKey, payload, { targetUid: currentUid });
  if (!saved) {
    return false;
  }
  await pruneStudyCoreBackupRetention(currentUid);
  return true;
}

function renderStudyCoreBackupList(backups, options = {}) {
  const container = document.getElementById("studyCoreBackupList");
  if (!container) return;
  const safeBackups = Array.isArray(backups) ? backups : [];
  if (options.message) {
    container.innerHTML = `<p class="settings-studycore-note">${escapeHtml(options.message)}</p>`;
    return;
  }
  if (!safeBackups.length) {
    container.innerHTML = '<p class="settings-studycore-note">バックアップはまだありません。</p>';
    return;
  }

  container.innerHTML = safeBackups.map((backup) => {
    const summary = backup?.summary && typeof backup.summary === "object" ? backup.summary : createEmptyStudyCoreSummary();
    const dayKey = String(backup?.dayKey || backup?.id || "");
    return `
      <div class="studycore-backup-item">
        <div class="studycore-backup-meta">
          <p class="studycore-backup-day">${escapeHtml(formatStudyCoreBackupDayLabel(dayKey))}</p>
          <p class="studycore-backup-summary">Day${Math.max(1, Number(summary.unlockedDayMax) || 1)} / 学習済み ${Math.max(0, Number(summary.learnedCount) || 0)}語 / 復習記録 ${Math.max(0, Number(summary.reviewRecordCount) || 0)}件</p>
        </div>
        <button class="secondary-btn settings-backup-btn studycore-backup-restore-btn" type="button" data-studycore-backup-day-key="${escapeHtml(dayKey)}">この状態に戻す</button>
      </div>
    `;
  }).join("");

  container.querySelectorAll("[data-studycore-backup-day-key]").forEach((button) => {
    button.addEventListener("click", async () => {
      const dayKey = String(button.getAttribute("data-studycore-backup-day-key") || "").trim();
      if (!dayKey) return;
      await restoreStudyCoreBackupFromSettings(dayKey);
    });
  });
}

async function loadStudyCoreBackupsForSettings() {
  const currentUid = getStudyCoreCurrentUid();
  const container = document.getElementById("studyCoreBackupList");
  if (!container) return;
  if (!currentUid) {
    renderStudyCoreBackupList([], { message: "ログインすると直近3日分のバックアップを確認できます。" });
    return;
  }
  if (typeof window.loadStudyCoreBackupsFromFirestore !== "function") {
    renderStudyCoreBackupList([], { message: "バックアップを読み込めません。" });
    return;
  }

  renderStudyCoreBackupList([], { message: "読み込み中..." });
  try {
    const backups = await window.loadStudyCoreBackupsFromFirestore(currentUid);
    renderStudyCoreBackupList(backups);
  } catch (error) {
    console.error("Failed to load study core backups", error);
    renderStudyCoreBackupList([], { message: "バックアップの読み込みに失敗しました。" });
  }
}

async function restoreStudyCoreBackupFromSettings(dayKey) {
  const currentUid = getStudyCoreCurrentUid();
  if (!currentUid) {
    alert("先にPC版へログインしてください。");
    return;
  }
  if (typeof window.loadStudyCoreBackupsFromFirestore !== "function" || typeof window.saveStudyCoreToFirestore !== "function") {
    alert("バックアップ復元機能を利用できません。");
    return;
  }

  const backups = await window.loadStudyCoreBackupsFromFirestore(currentUid);
  const targetBackup = (Array.isArray(backups) ? backups : []).find((entry) => String(entry?.dayKey || entry?.id || "") === String(dayKey || ""));
  if (!targetBackup?.studyCoreData || typeof targetBackup.studyCoreData !== "object") {
    alert("指定したバックアップが見つかりませんでした。");
    return;
  }

  const confirmed = await openBackupRestoreConfirmModal({
    title: "学習データの自動バックアップ",
    message: `${formatStudyCoreBackupDayLabel(dayKey)} の学習状態に戻します。\n現在の学習進捗は上書きされます。`,
    confirmText: "この状態に戻す"
  });
  if (!confirmed) return;

  try {
    await saveStudyCoreDailyBackup({ force: true, dayKey: getLearningHistoryDayKey(Date.now()) });
    applyStudyCoreFromFirestore(targetBackup.studyCoreData, { replaceAll: true });
    reconcileReviewDueFromReviewRecords();
    syncDerivedStats();
    saveState();
    studyCoreSyncRuntime.remoteData = structuredClone(targetBackup.studyCoreData);
    await window.saveStudyCoreToFirestore(targetBackup.studyCoreData, { targetUid: currentUid, merge: false });
    await saveStudyCoreDailyBackup({ force: true, studyCoreData: targetBackup.studyCoreData, dayKey: getLearningHistoryDayKey(Date.now()) });
    refreshStudyCoreSyncScreens();
    recordStudyCoreSyncResolution({
      uid: currentUid,
      adopted: "backup-restore",
      remoteUpdatedAt: Math.max(0, Number(targetBackup.studyCoreData.updatedAt) || 0),
      localUpdatedAt: Math.max(0, Number(targetBackup.studyCoreData.updatedAt) || 0),
      localInfoSource: "manual"
    });
    await loadStudyCoreBackupsForSettings();
    alert("バックアップを復元しました。");
  } catch (error) {
    console.error("Failed to restore study core backup", error);
    alert("バックアップの復元に失敗しました。時間をおいて再度お試しください。");
  }
}

function getStudyCoreItemDerivedUpdatedAt(item, record) {
  const stats = sanitizeLearningStats(item?.learningStats);
  return Math.max(
    parseStudyCoreDateKeyToTimestamp(stats.lastStudiedDate),
    parseStudyCoreDateKeyToTimestamp(stats.lastCorrectDate),
    getStudyCoreReviewRecordDerivedUpdatedAt(record)
  );
}

function getStudyCoreReviewRecordDerivedUpdatedAt(record) {
  if (!record || typeof record !== "object") return 0;
  return Math.max(
    parseStudyCoreDateKeyToTimestamp(record.lastReviewedDate),
    parseStudyCoreDateKeyToTimestamp(record.nextReviewDate)
  );
}

function getStudyCoreLocalUpdateInfo() {
  const meta = loadStudyCoreSyncMeta();
  if (meta.lastLocalChangeAt > 0) {
    return {
      updatedAt: meta.lastLocalChangeAt,
      source: "meta",
      label: formatTimestampToJstDisplay(meta.lastLocalChangeAt)
    };
  }

  let derivedUpdatedAt = Math.max(0, Number(meta.unlockedDayMaxUpdatedAt) || 0);
  Object.values(state.review.records || {}).forEach((record) => {
    derivedUpdatedAt = Math.max(derivedUpdatedAt, getStudyCoreReviewRecordDerivedUpdatedAt(record));
  });
  state.items.forEach((item) => {
    derivedUpdatedAt = Math.max(
      derivedUpdatedAt,
      getStudyCoreItemDerivedUpdatedAt(item, state.review.records?.[item.id])
    );
  });

  return {
    updatedAt: derivedUpdatedAt,
    source: "derived",
    label: derivedUpdatedAt ? formatTimestampToJstDisplay(derivedUpdatedAt) : ""
  };
}

function getStudyCoreItemLocalUpdatedAt(questionId) {
  const meta = loadStudyCoreSyncMeta();
  const stored = Math.max(0, Number(meta.items?.[questionId]?.updatedAt) || 0);
  if (stored > 0) return stored;
  return getStudyCoreItemDerivedUpdatedAt(getQuestionById(questionId), state.review.records?.[questionId]);
}

function getStudyCoreReviewRecordLocalUpdatedAt(questionId) {
  const meta = loadStudyCoreSyncMeta();
  const stored = Math.max(0, Number(meta.reviewRecords?.[questionId]?.updatedAt) || 0);
  if (stored > 0) return stored;
  return getStudyCoreReviewRecordDerivedUpdatedAt(state.review.records?.[questionId]);
}

function hasStudyCoreMeaningfulItemState(item, record) {
  if (!item) return false;
  const levelData = sanitizeLevelData(item.levelData);
  const learningStats = sanitizeLearningStats(item.learningStats);
  return Boolean(
    item.hasBeenStudied ||
    levelData.level > 1 ||
    levelData.successCount > 0 ||
    levelData.lv4FailureCount > 0 ||
    levelData.lv4Celebrated ||
    learningStats.attempts > 0 ||
    learningStats.correct > 0 ||
    learningStats.lastStudiedDate ||
    learningStats.lastCorrectDate ||
    item.reviewDue ||
    record
  );
}

function collectStudyCoreTrackedItemIds() {
  const ids = new Set();
  state.items.forEach((item) => {
    if (hasStudyCoreMeaningfulItemState(item, state.review.records?.[item.id])) {
      ids.add(String(item.id));
    }
  });
  Object.keys(state.review.records || {}).forEach((questionId) => {
    if (questionId) ids.add(String(questionId));
  });
  return [...ids];
}

function buildStudyCoreSource() {
  return {
    deviceType: "pc",
    appVersion: APP_VERSION
  };
}

function buildStudyCoreItemSyncEntry(questionId, updatedAt = 0) {
  const item = getQuestionById(questionId);
  if (!item) return null;
  return {
    levelData: sanitizeLevelData(item.levelData),
    learningStats: sanitizeLearningStats(item.learningStats),
    hasBeenStudied: Boolean(item.hasBeenStudied),
    reviewDue: Boolean(item.reviewDue),
    updatedAt: Math.max(0, Number(updatedAt) || 0)
  };
}

function buildStudyCoreReviewRecordSyncEntry(questionId, updatedAt = 0) {
  const record = state.review.records?.[questionId];
  if (!record) return null;
  return {
    ...sanitizeReviewRecord(questionId, record),
    updatedAt: Math.max(0, Number(updatedAt) || 0)
  };
}

function ensureStudyCoreLocalMetaBaseline(uid, options = {}) {
  const now = Math.max(0, Number(options.now) || Date.now());
  const meta = loadStudyCoreSyncMeta();
  meta.uid = String(uid || meta.uid || "");
  meta.lastLocalChangeAt = Math.max(meta.lastLocalChangeAt, now);
  meta.unlockedDayMaxUpdatedAt = Math.max(meta.unlockedDayMaxUpdatedAt, now);
  collectStudyCoreTrackedItemIds().forEach((questionId) => {
    meta.items[questionId] = {
      updatedAt: Math.max(0, Number(meta.items?.[questionId]?.updatedAt) || now)
    };
  });
  Object.keys(state.review.records || {}).forEach((questionId) => {
    meta.reviewRecords[questionId] = {
      updatedAt: Math.max(0, Number(meta.reviewRecords?.[questionId]?.updatedAt) || now)
    };
  });
  return saveStudyCoreSyncMeta(meta);
}

function markStudyCoreLocalChange(options = {}) {
  if (studyCoreSyncRuntime.isApplying) return;
  const now = Date.now();
  const meta = loadStudyCoreSyncMeta();
  meta.lastLocalChangeAt = Math.max(meta.lastLocalChangeAt, now);
  if (options.unlockedDayMax) {
    meta.unlockedDayMaxUpdatedAt = now;
    studyCoreSyncRuntime.pendingUnlockedDayMax = true;
  }
  (Array.isArray(options.itemIds) ? options.itemIds : []).forEach((questionId) => {
    const key = String(questionId || "").trim();
    if (!key) return;
    meta.items[key] = { updatedAt: now };
    studyCoreSyncRuntime.pendingItemIds.add(key);
  });
  (Array.isArray(options.reviewRecordIds) ? options.reviewRecordIds : []).forEach((questionId) => {
    const key = String(questionId || "").trim();
    if (!key) return;
    meta.reviewRecords[key] = { updatedAt: now };
    studyCoreSyncRuntime.pendingReviewRecordIds.add(key);
  });
  saveStudyCoreSyncMeta(meta);
}

function canSyncStudyCoreToFirestore() {
  return Boolean(getStudyCoreCurrentUid() && typeof window.loadStudyCoreFromFirestore === "function" && typeof window.saveStudyCoreToFirestore === "function");
}

function buildStudyCoreFullPayload(uid) {
  const meta = ensureStudyCoreLocalMetaBaseline(uid);
  const payload = {
    schemaVersion: STUDY_CORE_SYNC_SCHEMA_VERSION,
    updatedAt: Math.max(meta.lastLocalChangeAt, Date.now()),
    source: buildStudyCoreSource(),
    unlockedDayMax: Math.max(1, Number(state.stats?.unlockedDayMax) || 1),
    unlockedDayMaxUpdatedAt: Math.max(0, Number(meta.unlockedDayMaxUpdatedAt) || 0),
    items: {},
    reviewRecords: {}
  };

  collectStudyCoreTrackedItemIds().forEach((questionId) => {
    const entry = buildStudyCoreItemSyncEntry(questionId, meta.items?.[questionId]?.updatedAt || meta.lastLocalChangeAt);
    if (entry) {
      payload.items[questionId] = entry;
    }
  });

  Object.keys(state.review.records || {}).forEach((questionId) => {
    const entry = buildStudyCoreReviewRecordSyncEntry(questionId, meta.reviewRecords?.[questionId]?.updatedAt || meta.lastLocalChangeAt);
    if (entry) {
      payload.reviewRecords[questionId] = entry;
    }
  });

  return payload;
}

function buildStudyCoreDeltaPayload(itemIds, reviewRecordIds, includeUnlockedDayMax) {
  const meta = loadStudyCoreSyncMeta();
  const payload = {
    schemaVersion: STUDY_CORE_SYNC_SCHEMA_VERSION,
    updatedAt: Math.max(meta.lastLocalChangeAt, Date.now()),
    source: buildStudyCoreSource()
  };

  if (includeUnlockedDayMax) {
    payload.unlockedDayMax = Math.max(1, Number(state.stats?.unlockedDayMax) || 1);
    payload.unlockedDayMaxUpdatedAt = Math.max(0, Number(meta.unlockedDayMaxUpdatedAt) || 0);
  }

  const itemEntries = {};
  (Array.isArray(itemIds) ? itemIds : []).forEach((questionId) => {
    const entry = buildStudyCoreItemSyncEntry(questionId, meta.items?.[questionId]?.updatedAt || meta.lastLocalChangeAt);
    if (entry) {
      itemEntries[String(questionId)] = entry;
    }
  });
  if (Object.keys(itemEntries).length > 0) {
    payload.items = itemEntries;
  }

  const reviewEntries = {};
  (Array.isArray(reviewRecordIds) ? reviewRecordIds : []).forEach((questionId) => {
    const entry = buildStudyCoreReviewRecordSyncEntry(questionId, meta.reviewRecords?.[questionId]?.updatedAt || meta.lastLocalChangeAt);
    if (entry) {
      reviewEntries[String(questionId)] = entry;
    }
  });
  if (Object.keys(reviewEntries).length > 0) {
    payload.reviewRecords = reviewEntries;
  }

  return payload;
}

function resolveStudyCoreDeltaAgainstRemote(remoteData, delta) {
  const payload = {
    schemaVersion: STUDY_CORE_SYNC_SCHEMA_VERSION,
    updatedAt: Math.max(0, Number(delta?.updatedAt) || Date.now()),
    source: buildStudyCoreSource()
  };
  let hasAnyChange = false;

  if (Object.prototype.hasOwnProperty.call(delta || {}, "unlockedDayMax")) {
    const currentValue = Math.max(1, Number(remoteData?.unlockedDayMax) || 1);
    const incomingValue = Math.max(1, Number(delta?.unlockedDayMax) || 1);
    const currentUpdatedAt = Math.max(0, Number(remoteData?.unlockedDayMaxUpdatedAt) || 0);
    const incomingUpdatedAt = Math.max(0, Number(delta?.unlockedDayMaxUpdatedAt) || 0);
    if (incomingValue > currentValue || (incomingValue === currentValue && incomingUpdatedAt >= currentUpdatedAt)) {
      payload.unlockedDayMax = Math.max(currentValue, incomingValue);
      payload.unlockedDayMaxUpdatedAt = Math.max(currentUpdatedAt, incomingUpdatedAt, payload.updatedAt);
      hasAnyChange = true;
    }
  }

  const itemEntries = {};
  Object.entries(delta?.items || {}).forEach(([questionId, entry]) => {
    const currentEntry = remoteData?.items?.[questionId];
    const currentUpdatedAt = Math.max(0, Number(currentEntry?.updatedAt) || 0);
    const incomingUpdatedAt = Math.max(0, Number(entry?.updatedAt) || 0);
    if (!currentEntry || incomingUpdatedAt >= currentUpdatedAt) {
      itemEntries[questionId] = {
        levelData: sanitizeLevelData(entry.levelData),
        learningStats: sanitizeLearningStats(entry.learningStats),
        reviewDue: Boolean(entry.reviewDue),
        updatedAt: incomingUpdatedAt
      };
      hasAnyChange = true;
    }
  });
  if (Object.keys(itemEntries).length > 0) {
    payload.items = itemEntries;
  }

  const reviewEntries = {};
  Object.entries(delta?.reviewRecords || {}).forEach(([questionId, entry]) => {
    const currentEntry = remoteData?.reviewRecords?.[questionId];
    const currentUpdatedAt = Math.max(0, Number(currentEntry?.updatedAt) || 0);
    const incomingUpdatedAt = Math.max(0, Number(entry?.updatedAt) || 0);
    if (!currentEntry || incomingUpdatedAt >= currentUpdatedAt) {
      reviewEntries[questionId] = {
        ...sanitizeReviewRecord(questionId, entry),
        updatedAt: incomingUpdatedAt
      };
      hasAnyChange = true;
    }
  });
  if (Object.keys(reviewEntries).length > 0) {
    payload.reviewRecords = reviewEntries;
  }

  return hasAnyChange ? payload : null;
}

function mergeStudyCoreData(baseData, patchData) {
  const nextData = {
    ...(baseData && typeof baseData === "object" ? baseData : {}),
    ...(patchData && typeof patchData === "object" ? patchData : {})
  };
  if (patchData?.items) {
    nextData.items = {
      ...(baseData?.items && typeof baseData.items === "object" ? baseData.items : {}),
      ...patchData.items
    };
  }
  if (patchData?.reviewRecords) {
    nextData.reviewRecords = {
      ...(baseData?.reviewRecords && typeof baseData.reviewRecords === "object" ? baseData.reviewRecords : {}),
      ...patchData.reviewRecords
    };
  }
  return nextData;
}

function clearStudyCoreSynchronizedState() {
  state.stats.unlockedDayMax = 1;
  state.review.records = {};
  state.items.forEach((item) => {
    item.levelData = createDefaultLevelData();
    item.learningStats = sanitizeLearningStats();
    item.reviewDue = false;
    item.hasBeenStudied = false;
    item.mastered = false;
    item.lastAnswerWasCorrect = false;
    item.consecutiveCorrect = 0;
    item.reviewTodayCount = 0;
    syncLegacyItemFields(item);
  });
}

function applyStudyCoreFromFirestore(remoteData, options = {}) {
  if (!remoteData || typeof remoteData !== "object") return;
  const replaceAll = Boolean(options.replaceAll);
  const meta = loadStudyCoreSyncMeta();
  if (replaceAll) {
    studyCoreSyncRuntime.isApplying = true;
    clearStudyCoreSynchronizedState();
    meta.items = {};
    meta.reviewRecords = {};
  }

  const remoteUnlockedDayMax = Math.max(1, Number(remoteData.unlockedDayMax) || 1);
  const remoteUnlockedUpdatedAt = Math.max(0, Number(remoteData.unlockedDayMaxUpdatedAt) || Number(remoteData.updatedAt) || 0);
  if (remoteUnlockedDayMax > Math.max(1, Number(state.stats?.unlockedDayMax) || 1) || replaceAll) {
    state.stats.unlockedDayMax = Math.max(Math.max(1, Number(state.stats?.unlockedDayMax) || 1), remoteUnlockedDayMax);
  }
  meta.unlockedDayMaxUpdatedAt = Math.max(meta.unlockedDayMaxUpdatedAt, remoteUnlockedUpdatedAt);

  Object.entries(remoteData.items || {}).forEach(([questionId, entry]) => {
    const item = getQuestionById(questionId);
    if (!item) return;
    const remoteUpdatedAt = Math.max(0, Number(entry?.updatedAt) || 0);
    const localUpdatedAt = getStudyCoreItemLocalUpdatedAt(questionId);
    if (!replaceAll && remoteUpdatedAt < localUpdatedAt) return;
    item.levelData = sanitizeLevelData(entry.levelData);
    item.learningStats = sanitizeLearningStats(entry.learningStats);
    item.hasBeenStudied = Boolean(entry?.hasBeenStudied);
    item.reviewDue = Boolean(entry.reviewDue);
    syncLegacyItemFields(item);
    meta.items[questionId] = { updatedAt: remoteUpdatedAt };
  });

  Object.entries(remoteData.reviewRecords || {}).forEach(([questionId, entry]) => {
    const remoteUpdatedAt = Math.max(0, Number(entry?.updatedAt) || 0);
    const localUpdatedAt = getStudyCoreReviewRecordLocalUpdatedAt(questionId);
    if (!replaceAll && remoteUpdatedAt < localUpdatedAt) return;
    state.review.records[questionId] = sanitizeReviewRecord(questionId, entry);
    meta.reviewRecords[questionId] = { updatedAt: remoteUpdatedAt };
  });

  meta.uid = String(getStudyCoreCurrentUid() || meta.uid || "");
  meta.initialized = true;
  meta.lastLocalChangeAt = Math.max(meta.lastLocalChangeAt, Math.max(0, Number(remoteData.updatedAt) || 0));
  saveStudyCoreSyncMeta(meta);
  studyCoreSyncRuntime.isApplying = false;
}

function reconcileReviewDueFromReviewRecords() {
  const previousApplying = studyCoreSyncRuntime.isApplying;
  studyCoreSyncRuntime.isApplying = true;
  state.items.forEach((item) => {
    item.reviewDue = false;
  });
  activateDueReviewItems();
  Object.values(state.review.records || {}).forEach((record) => {
    if (record?.questionId && record.isVisibleInReviewList) {
      setItemReviewDue(record.questionId, true);
    }
  });
  studyCoreSyncRuntime.isApplying = previousApplying;
}

function refreshStudyCoreSyncScreens() {
  syncDaySelectOptions();
  renderDayCatalog();
  renderHome();
  renderProgress();
}

function recordStudyCoreSyncResolution(payload) {
  const meta = loadStudyCoreSyncMeta();
  meta.lastResolution = {
    uid: String(payload?.uid || meta.uid || ""),
    adopted: typeof payload?.adopted === "string" ? payload.adopted : "",
    remoteUpdatedAt: Math.max(0, Number(payload?.remoteUpdatedAt) || 0),
    localUpdatedAt: Math.max(0, Number(payload?.localUpdatedAt) || 0),
    localInfoSource: typeof payload?.localInfoSource === "string" ? payload.localInfoSource : "",
    happenedAt: Date.now()
  };
  saveStudyCoreSyncMeta(meta);
  updateStudyCoreSyncDebugInfo({
    lastResolution: meta.lastResolution,
    currentUid: meta.uid,
    remoteUpdatedAtLabel: meta.lastResolution.remoteUpdatedAt ? formatTimestampToJstDisplay(meta.lastResolution.remoteUpdatedAt) : "",
    localUpdatedAtLabel: meta.lastResolution.localUpdatedAt ? formatTimestampToJstDisplay(meta.lastResolution.localUpdatedAt) : ""
  });
}

async function flushPendingStudyCoreSync() {
  if (studyCoreSyncRuntime.isFlushing || studyCoreSyncRuntime.isApplying) return false;
  if (!canSyncStudyCoreToFirestore()) return false;

  const itemIds = [...studyCoreSyncRuntime.pendingItemIds];
  const reviewRecordIds = [...studyCoreSyncRuntime.pendingReviewRecordIds];
  const includeUnlockedDayMax = studyCoreSyncRuntime.pendingUnlockedDayMax;
  if (!itemIds.length && !reviewRecordIds.length && !includeUnlockedDayMax) {
    return false;
  }

  studyCoreSyncRuntime.isFlushing = true;
  studyCoreSyncRuntime.pendingItemIds.clear();
  studyCoreSyncRuntime.pendingReviewRecordIds.clear();
  studyCoreSyncRuntime.pendingUnlockedDayMax = false;

  try {
    const currentUid = getStudyCoreCurrentUid();
    const remoteResult = await window.loadStudyCoreFromFirestore(currentUid);
    const delta = buildStudyCoreDeltaPayload(itemIds, reviewRecordIds, includeUnlockedDayMax);
    const payload = resolveStudyCoreDeltaAgainstRemote(remoteResult?.data || {}, delta);
    if (!payload) {
      return false;
    }
    const saved = await window.saveStudyCoreToFirestore(payload, { targetUid: currentUid, merge: true });
    if (!saved) {
      throw new Error("studyCore save failed");
    }
    studyCoreSyncRuntime.remoteData = mergeStudyCoreData(remoteResult?.data || {}, payload);
    await saveStudyCoreDailyBackup({ studyCoreData: studyCoreSyncRuntime.remoteData });
    updateStudyCoreSyncDebugInfo({ lastDeltaSaveAt: Date.now(), lastDeltaPayload: payload });
    return true;
  } catch (error) {
    itemIds.forEach((questionId) => studyCoreSyncRuntime.pendingItemIds.add(questionId));
    reviewRecordIds.forEach((questionId) => studyCoreSyncRuntime.pendingReviewRecordIds.add(questionId));
    if (includeUnlockedDayMax) {
      studyCoreSyncRuntime.pendingUnlockedDayMax = true;
    }
    console.error("Failed to flush study core sync", error);
    return false;
  } finally {
    studyCoreSyncRuntime.isFlushing = false;
  }
}

function scheduleStudyCoreSync() {
  if (studyCoreSyncRuntime.isApplying) return;
  if (studyCoreSyncRuntime.flushTimer) {
    clearTimeout(studyCoreSyncRuntime.flushTimer);
  }
  studyCoreSyncRuntime.flushTimer = setTimeout(() => {
    studyCoreSyncRuntime.flushTimer = null;
    flushPendingStudyCoreSync();
  }, STUDY_CORE_SYNC_DEBOUNCE_MS);
}

async function saveCurrentPcStudyCoreToFirestoreFromSettings() {
  const currentUid = getStudyCoreCurrentUid();
  if (!currentUid) {
    alert("先にPC版へログインしてください。");
    return;
  }
  if (typeof window.saveStudyCoreToFirestore !== "function") {
    alert("Firestore保存機能を利用できません。");
    return;
  }

  const confirmed = await openBackupRestoreConfirmModal({
    title: "Firestoreへ保存",
    message: "このPCの学習データを基準としてFirestoreへ保存します。実行してよいですか？",
    confirmText: "保存する"
  });
  if (!confirmed) return;

  try {
    ensureStudyCoreLocalMetaBaseline(currentUid, { now: Date.now() });
    const payload = buildStudyCoreFullPayload(currentUid);
    const saved = await window.saveStudyCoreToFirestore(payload, {
      targetUid: currentUid,
      merge: false
    });
    if (!saved) {
      throw new Error("Study core save returned false");
    }
    studyCoreSyncRuntime.remoteData = payload;
    await saveStudyCoreDailyBackup({ force: true, studyCoreData: payload });
    recordStudyCoreSyncResolution({
      uid: currentUid,
      adopted: "local-manual-save",
      remoteUpdatedAt: Math.max(0, Number(payload.updatedAt) || 0),
      localUpdatedAt: Math.max(0, Number(payload.updatedAt) || 0),
      localInfoSource: "manual"
    });
    alert("このPCの学習データをFirestoreへ保存しました。");
  } catch (error) {
    console.error("Failed to save study core from settings", error);
    alert("Firestoreへの保存に失敗しました。時間をおいて再度お試しください。");
  }
}

async function inspectStudyCoreFromFirestoreInSettings() {
  const resultEl = document.getElementById("studyCoreInspectResult");
  const showResult = (text) => {
    if (!resultEl) return;
    resultEl.textContent = text;
    resultEl.classList.remove("hidden");
  };

  const currentUid = getStudyCoreCurrentUid();
  if (!currentUid) {
    showResult("Firestoreの学習データ\n\n先にPC版へログインしてください。");
    return;
  }
  if (typeof window.loadStudyCoreFromFirestore !== "function") {
    showResult("Firestoreの学習データ\n\nFirestore読取機能を利用できません。");
    return;
  }

  showResult("Firestoreの学習データ\n\n読み取り中...");

  try {
    const remoteResult = await window.loadStudyCoreFromFirestore(currentUid);
    if (!remoteResult?.exists || !remoteResult?.data || typeof remoteResult.data !== "object") {
      showResult("Firestoreの学習データ\n\nstudyCoreが見つかりませんでした。");
      return;
    }

    const data = remoteResult.data;
    const unlockedDayMax = Math.max(1, Number(data.unlockedDayMax) || 1);
    const itemsMap = data.items && typeof data.items === "object" ? data.items : {};
    const itemIds = Object.keys(itemsMap);

    let levelDataCount = 0;
    let learningStatsCount = 0;
    let reviewDueCount = 0;

    itemIds.forEach((questionId) => {
      const entry = itemsMap[questionId];
      if (!entry || typeof entry !== "object") return;
      if (entry.levelData && typeof entry.levelData === "object") {
        levelDataCount += 1;
      }
      if (entry.learningStats && typeof entry.learningStats === "object") {
        learningStatsCount += 1;
      }
      if (Object.prototype.hasOwnProperty.call(entry, "reviewDue")) {
        reviewDueCount += 1;
      }
    });

    let reviewRecordsMap = {};
    if (data.reviewRecords && typeof data.reviewRecords === "object") {
      reviewRecordsMap = data.reviewRecords;
    } else if (data.review && typeof data.review === "object" && data.review.records && typeof data.review.records === "object") {
      reviewRecordsMap = data.review.records;
    }
    const reviewRecordsCount = Object.keys(reviewRecordsMap).length;

    const updatedAt = Math.max(0, Number(data.updatedAt) || 0);
    const updatedAtLabel = updatedAt > 0 ? formatTimestampToJstDisplay(updatedAt) : "-";

    showResult([
      "Firestoreの学習データ",
      "",
      `Day進捗：${unlockedDayMax}`,
      `問題データ：${itemIds.length}件`,
      `レベルデータ：${levelDataCount}件`,
      `学習回数データ：${learningStatsCount}件`,
      `復習記録：${reviewRecordsCount}件`,
      `復習対象データ：${reviewDueCount}件`,
      `更新日時：${updatedAtLabel}`
    ].join("\n"));
  } catch (error) {
    console.error("Failed to inspect studyCore from Firestore", error);
    showResult("Firestoreの学習データ\n\n読取に失敗しました。時間をおいて再度お試しください。");
  }
}

async function applyStudyCoreFromFirestoreFromSettings() {
  const currentUid = getStudyCoreCurrentUid();
  if (!currentUid) {
    alert("先にPC版へログインしてください。");
    return;
  }
  if (typeof window.loadStudyCoreFromFirestore !== "function") {
    alert("Firestore読取機能を利用できません。");
    return;
  }

  const confirmed = await openBackupRestoreConfirmModal({
    title: "Firestoreの学習データを反映します",
    message: "現在のPCの学習状況は上書きされます。\nよろしいですか？",
    confirmText: "はい"
  });
  if (!confirmed) return;

  try {
    const remoteResult = await window.loadStudyCoreFromFirestore(currentUid);
    if (!remoteResult?.exists || !remoteResult?.data || typeof remoteResult.data !== "object") {
      alert("Firestoreの学習データが見つかりませんでした。");
      return;
    }

    applyStudyCoreFromFirestore(remoteResult.data, { replaceAll: true });
    reconcileReviewDueFromReviewRecords();
    syncDerivedStats();
    saveState();
    studyCoreSyncRuntime.remoteData = structuredClone(remoteResult.data);
    refreshStudyCoreSyncScreens();
    await saveStudyCoreDailyBackup({ force: true, studyCoreData: remoteResult.data });

    const remoteUpdatedAt = Math.max(0, Number(remoteResult.data.updatedAt) || 0);
    recordStudyCoreSyncResolution({
      uid: currentUid,
      adopted: "firestore-manual-apply",
      remoteUpdatedAt,
      localUpdatedAt: remoteUpdatedAt,
      localInfoSource: "manual"
    });

    alert("反映が完了しました。");
  } catch (error) {
    console.error("Failed to apply study core from Firestore", error);
    alert("Firestoreの学習データ反映に失敗しました。時間をおいて再度お試しください。");
  }
}

async function syncStudyCoreAfterLogin() {
  const currentUid = getStudyCoreCurrentUid();
  if (!currentUid || typeof window.loadStudyCoreFromFirestore !== "function" || typeof window.saveStudyCoreToFirestore !== "function") {
    return;
  }

  if (consumeSkipStudyCoreSyncOnce()) {
    studyCoreSyncRuntime.initializedUid = currentUid;
    recordStudyCoreSyncResolution({
      uid: currentUid,
      adopted: "restore-local-only-skip-sync",
      remoteUpdatedAt: 0,
      localUpdatedAt: Math.max(0, Number(getStudyCoreLocalUpdateInfo().updatedAt) || 0),
      localInfoSource: "manual"
    });
    return;
  }

  const localInfo = getStudyCoreLocalUpdateInfo();
  const localSummary = buildStudyCoreSummaryFromCurrentState();
  const remoteResult = await window.loadStudyCoreFromFirestore(currentUid);
  const remoteData = remoteResult?.data || null;
  const adoption = chooseStudyCoreSyncAdoption(localInfo, localSummary, remoteResult);
  const remoteUpdatedAt = Math.max(0, Number(adoption.remoteUpdatedAt) || 0);
  let adopted = adoption.adopted;

  if (adoption.adopted === "firestore") {
    applyStudyCoreFromFirestore(remoteData, { replaceAll: true });
    studyCoreSyncRuntime.remoteData = remoteData;
  } else if (adoption.adopted === "local" || adoption.adopted === "local-initial-upload") {
    const fullPayload = buildStudyCoreFullPayload(currentUid);
    await window.saveStudyCoreToFirestore(fullPayload, { targetUid: currentUid, merge: false });
    studyCoreSyncRuntime.remoteData = fullPayload;
    await saveStudyCoreDailyBackup({ force: true, studyCoreData: fullPayload });
  } else {
    studyCoreSyncRuntime.remoteData = remoteData;
  }

  reconcileReviewDueFromReviewRecords();
  syncDerivedStats();
  saveState();
  refreshStudyCoreSyncScreens();
  studyCoreSyncRuntime.initializedUid = currentUid;
  await saveStudyCoreDailyBackup({ studyCoreData: studyCoreSyncRuntime.remoteData, dayKey: getLearningHistoryDayKey(Date.now()) });
  recordStudyCoreSyncResolution({
    uid: currentUid,
    adopted: adoption.reason ? `${adopted}:${adoption.reason}` : adopted,
    remoteUpdatedAt,
    localUpdatedAt: localInfo.updatedAt,
    localInfoSource: localInfo.source
  });
}

function bindStudyCoreAuthStateListener() {
  if (document.body?.dataset.studyCoreAuthBound === "true") return;
  document.addEventListener("pc-firebase-auth-state", (event) => {
    const user = event?.detail?.user || null;
    if (!user) {
      studyCoreSyncRuntime.initializedUid = "";
      studyCoreSyncRuntime.remoteData = null;
      return;
    }
    syncStudyCoreAfterLogin().catch((error) => {
      console.error("Failed to synchronize study core after login", error);
    });
  });
  if (document.body) {
    document.body.dataset.studyCoreAuthBound = "true";
  }
}

function bindStudyCoreBackupAuthStateListener() {
  if (document.body?.dataset.studyCoreBackupAuthBound === "true") return;
  document.addEventListener("pc-firebase-auth-state", () => {
    loadStudyCoreBackupsForSettings().catch((error) => {
      console.error("Failed to refresh study core backups after auth change", error);
    });
  });
  if (document.body) {
    document.body.dataset.studyCoreBackupAuthBound = "true";
  }
}

function createDefaultGameTicketStats() {
  return {
    inventory: [],
    dailyTrainingCount: 0,
    dailyEarnedCount: 0,
    normalWeakFocusCompletedCount: 0,
    normalWeakFocusFirstBonusGranted: false,
    unsuccessfulEligibleDays: 0,
    lastProcessedDate: "",
    streakBonusAwardedDays: [],
    earnedHistory: [],
    usageHistory: [],
    pendingRewards: [],
    shownRewardIds: [],
    dailyGrantByMinutes: {},
    challengeTicketStateByDate: {}
  };
}

function createChallengeTicketThresholdState(thresholds) {
  const state = { awarded: false };
  (Array.isArray(thresholds) ? thresholds : []).forEach((threshold) => {
    state[String(threshold)] = false;
  });
  return state;
}

function createDefaultChallengeTicketDailyState() {
  return {
    fiveMinute: createChallengeTicketThresholdState([90, 120, 153, 180]),
    fifteenA: createChallengeTicketThresholdState([84, 132, 183, 210]),
    fifteenB: createChallengeTicketThresholdState([150, 192, 240]),
    thirty: createChallengeTicketThresholdState([126, 201, 249]),
    rescue: { processed: false, awarded: false },
    special: {
      p141: { processed: false, queued: false, result: "miss", awardedMinutes: 0 },
      p221: { processed: false, queued: false, result: "miss", awardedMinutes: 0 },
      p261: { processed: false, queued: false, result: "miss", awardedMinutes: 0 }
    },
    fixedRule: {
      90: false,
      147: false,
      193: false,
      199: false,
      240: false
    },
    events: {}
  };
}

function sanitizeChallengeTicketThresholdState(value, thresholds) {
  const source = value && typeof value === "object" ? value : {};
  const state = { awarded: Boolean(source.awarded) };
  (Array.isArray(thresholds) ? thresholds : []).forEach((threshold) => {
    state[String(threshold)] = Boolean(source[String(threshold)]);
  });
  return state;
}

function sanitizeChallengeTicketSpecialState(value) {
  const source = value && typeof value === "object" ? value : {};
  const result = String(source.result || "miss").trim().toLowerCase();
  return {
    processed: Boolean(source.processed),
    queued: Boolean(source.queued),
    result: result === "30" ? "30" : result === "60" ? "60" : "miss",
    awardedMinutes: Math.max(0, Math.round(Number(source.awardedMinutes) || 0))
  };
}

function sanitizeChallengeTicketDailyState(value) {
  const source = value && typeof value === "object" ? value : {};
  const specialSource = source.special && typeof source.special === "object" ? source.special : {};
  const eventsSource = source.events && typeof source.events === "object" ? source.events : {};
  const fixedRuleSource = source.fixedRule && typeof source.fixedRule === "object" ? source.fixedRule : {};
  const events = {};
  Object.entries(eventsSource).forEach(([eventId, rawEvent]) => {
    const entry = rawEvent && typeof rawEvent === "object" ? rawEvent : {};
    events[String(eventId)] = {
      processed: Boolean(entry.processed),
      queued: Boolean(entry.queued),
      started: Boolean(entry.started),
      completed: Boolean(entry.completed),
      rewardKeys: Array.isArray(entry.rewardKeys) ? entry.rewardKeys.map((key) => String(key)).filter(Boolean).slice(0, 250) : [],
      maxQuestions: Math.max(1, Math.round(Number(entry.maxQuestions) || 1)),
      rewardMinutes: Math.max(0, Math.round(Number(entry.rewardMinutes) || 0)),
      questionCount: Math.max(0, Math.round(Number(entry.questionCount) || 0)),
      currentQuestionKey: typeof entry.currentQuestionKey === "string" ? entry.currentQuestionKey : "",
      status: typeof entry.status === "string" && entry.status ? entry.status : "pending"
    };
  });
  const fixedRule = {
    90: Boolean(fixedRuleSource[90]),
    147: Boolean(fixedRuleSource[147]),
    193: Boolean(fixedRuleSource[193]),
    199: Boolean(fixedRuleSource[199]),
    240: Boolean(fixedRuleSource[240])
  };
  return {
    fiveMinute: sanitizeChallengeTicketThresholdState(source.fiveMinute, [90, 120, 153, 180]),
    fifteenA: sanitizeChallengeTicketThresholdState(source.fifteenA, [84, 132, 183, 210]),
    fifteenB: sanitizeChallengeTicketThresholdState(source.fifteenB, [150, 192, 240]),
    thirty: sanitizeChallengeTicketThresholdState(source.thirty, [126, 201, 249]),
    rescue: {
      processed: Boolean(source.rescue?.processed),
      awarded: Boolean(source.rescue?.awarded)
    },
    special: {
      p141: sanitizeChallengeTicketSpecialState(specialSource.p141),
      p221: sanitizeChallengeTicketSpecialState(specialSource.p221),
      p261: sanitizeChallengeTicketSpecialState(specialSource.p261)
    },
    fixedRule,
    events
  };
}

function getChallengeTicketFixedRuleThresholds() {
  return [90, 147, 193, 199, 240];
}

function getChallengeTicketFixedRuleState(store, dayKey) {
  const dailyState = getChallengeTicketDailyState(store, dayKey, { create: true });
  if (!dailyState.fixedRule || typeof dailyState.fixedRule !== "object") {
    dailyState.fixedRule = {};
  }
  const thresholds = getChallengeTicketFixedRuleThresholds();
  thresholds.forEach((threshold) => {
    const key = String(threshold);
    if (typeof dailyState.fixedRule[key] !== "boolean") {
      dailyState.fixedRule[key] = false;
    }
  });
  return dailyState.fixedRule;
}

function getChallengeTicketDailyState(store, dayKey, options = {}) {
  if (!store) return createDefaultChallengeTicketDailyState();
  const key = String(dayKey || todayKey());
  store.challengeTicketStateByDate = store.challengeTicketStateByDate && typeof store.challengeTicketStateByDate === "object"
    ? store.challengeTicketStateByDate
    : {};
  const existing = store.challengeTicketStateByDate[key];
  if (existing) {
    const sanitized = sanitizeChallengeTicketDailyState(existing);
    store.challengeTicketStateByDate[key] = sanitized;
    return sanitized;
  }
  if (!options.create) return createDefaultChallengeTicketDailyState();
  const created = createDefaultChallengeTicketDailyState();
  store.challengeTicketStateByDate[key] = created;
  return created;
}

function getChallengeEventRuntimeState(store, dayKey, eventId) {
  const safeStore = sanitizeGameTicketStats(store || ensureGameTicketState());
  const safeDayKey = String(dayKey || getPointTodayKey() || todayKey());
  const dailyState = getChallengeTicketDailyState(safeStore, safeDayKey, { create: true });
  const safeEventId = String(eventId || "");
  dailyState.events = dailyState.events && typeof dailyState.events === "object" ? dailyState.events : {};
  if (!dailyState.events[safeEventId]) {
    dailyState.events[safeEventId] = {
      processed: false,
      queued: false,
      started: false,
      completed: false,
      rewardKeys: [],
      maxQuestions: 1,
      rewardMinutes: 0,
      questionCount: 0,
      currentQuestionKey: "",
      status: "pending"
    };
  }
  return dailyState.events[safeEventId];
}

function buildChallengeEventRewardKey(eventId, questionId) {
  return `${String(eventId || "event")}:${String(questionId || "")}`;
}

function hasChallengeEventRewardBeenGranted(store, dayKey, eventId, questionId) {
  const rewardKey = buildChallengeEventRewardKey(eventId, questionId);
  const runtime = getChallengeEventRuntimeState(store, dayKey, eventId);
  return (runtime.rewardKeys || []).includes(rewardKey);
}

function markChallengeEventRewardGranted(store, dayKey, eventId, questionId) {
  const rewardKey = buildChallengeEventRewardKey(eventId, questionId);
  const runtime = getChallengeEventRuntimeState(store, dayKey, eventId);
  const nextKeys = new Set((runtime.rewardKeys || []).map((entry) => String(entry)));
  nextKeys.add(rewardKey);
  runtime.rewardKeys = [...nextKeys];
  runtime.currentQuestionKey = rewardKey;
  runtime.questionCount = Math.max(0, Number(runtime.questionCount) || 0) + 1;
  return rewardKey;
}

function createDefaultNormalDayProgressEntry() {
  return {
    answeredQuestionIds: [],
    wrongQuestionIds: [],
    completedAtDayKey: ""
  };
}

function sanitizeNormalDayProgressByDay(value) {
  const source = value && typeof value === "object" ? value : {};
  const result = {};
  Object.entries(source).forEach(([dayKey, raw]) => {
    const day = Number(dayKey);
    if (!Number.isFinite(day) || day < 1) return;
    const row = raw && typeof raw === "object" ? raw : {};
    const answeredQuestionIds = Array.isArray(row.answeredQuestionIds)
      ? [...new Set(row.answeredQuestionIds.map((id) => String(id || "").trim()).filter(Boolean))].slice(0, DAY_PROGRESS_TARGET_QUESTION_COUNT)
      : [];
    const wrongQuestionIds = Array.isArray(row.wrongQuestionIds)
      ? [...new Set(row.wrongQuestionIds.map((id) => String(id || "").trim()).filter(Boolean))]
      : [];
    result[String(Math.floor(day))] = {
      answeredQuestionIds,
      wrongQuestionIds,
      completedAtDayKey: typeof row.completedAtDayKey === "string" ? row.completedAtDayKey : ""
    };
  });
  return result;
}

function createDefaultExtraTrainingDailyCounter() {
  return {
    dayKey: "",
    count: 0
  };
}

function sanitizeExtraTrainingDailyCounter(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    dayKey: typeof source.dayKey === "string" ? source.dayKey : "",
    count: Math.max(0, Math.floor(Number(source.count) || 0))
  };
}

function ensureExtraTrainingDailyCounter() {
  const today = todayKey();
  const counter = sanitizeExtraTrainingDailyCounter(state.stats?.extraTrainingDailyCounter);
  if (counter.dayKey !== today) {
    const reset = { dayKey: today, count: 0 };
    state.stats.extraTrainingDailyCounter = reset;
    return reset;
  }
  state.stats.extraTrainingDailyCounter = counter;
  return counter;
}

function getExtraTrainingDailyRemainingCount() {
  const counter = ensureExtraTrainingDailyCounter();
  return Math.max(0, EXTRA_TRAINING_DAILY_LIMIT - Math.max(0, Number(counter.count) || 0));
}

function incrementExtraTrainingDailyCounter() {
  const counter = ensureExtraTrainingDailyCounter();
  counter.count = Math.max(0, Math.min(EXTRA_TRAINING_DAILY_LIMIT, Number(counter.count) + 1));
  state.stats.extraTrainingDailyCounter = counter;
  return counter;
}

function getNormalDayProgressEntry(dayNumber, options = {}) {
  const day = Math.max(1, Math.floor(Number(dayNumber) || 0));
  const byDay = sanitizeNormalDayProgressByDay(state.stats?.normalDayProgressByDay);
  state.stats.normalDayProgressByDay = byDay;
  const key = String(day);
  if (!byDay[key] && options.create) {
    byDay[key] = createDefaultNormalDayProgressEntry();
  }
  return byDay[key] || null;
}

function getNormalDayAnsweredCount(dayNumber) {
  return Math.max(0, Number(getNormalDayProgressEntry(dayNumber)?.answeredQuestionIds?.length) || 0);
}

function getRemainingNormalDayQuestions(dayNumber) {
  const day = Math.max(1, Math.floor(Number(dayNumber) || 0));
  const allDayQuestions = state.items.filter((item) => Number(item.day) === day);
  const answeredSet = new Set((getNormalDayProgressEntry(day)?.answeredQuestionIds || []).map((id) => String(id)));
  const remainingCount = Math.max(0, DAY_PROGRESS_TARGET_QUESTION_COUNT - answeredSet.size);
  if (!remainingCount) return [];
  const pool = allDayQuestions.filter((item) => !answeredSet.has(String(item.id)));
  return weightedSampleWithoutReplacement(pool, Math.min(remainingCount, pool.length));
}

function getPendingNormalDayReviewQuestionIds(dayNumber) {
  const day = Math.max(1, Math.floor(Number(dayNumber) || 0));
  const progress = getNormalDayProgressEntry(day);
  if (!progress) return [];
  const answeredSet = new Set((progress.answeredQuestionIds || []).map((id) => String(id)));
  const availableSet = new Set(state.items.filter((item) => Number(item.day) === day).map((item) => String(item.id)));
  return (progress.wrongQuestionIds || []).filter((id) => answeredSet.has(String(id)) && availableSet.has(String(id)));
}

function getPendingNormalDayReviewQuestions(dayNumber) {
  return collectQuestionsById(getPendingNormalDayReviewQuestionIds(dayNumber));
}

function clearNormalDayReviewQuestionIds(dayNumber) {
  const progress = getNormalDayProgressEntry(dayNumber, { create: true });
  if (!progress) return;
  progress.wrongQuestionIds = [];
  state.stats.normalDayProgressByDay[String(Math.max(1, Math.floor(Number(dayNumber) || 0)))] = progress;
}

function getLegacyTouchedDayQuestionIds(dayNumber) {
  const day = Math.max(1, Math.floor(Number(dayNumber) || 0));
  return state.items
    .filter((item) => Number(item.day) === day)
    .filter((item) => {
      const learningStats = sanitizeLearningStats(item?.learningStats);
      const levelData = sanitizeLevelData(item?.levelData);
      return Boolean(
        learningStats.attempts > 0 ||
        learningStats.correct > 0 ||
        learningStats.lastStudiedDate ||
        learningStats.lastCorrectDate ||
        levelData.level > 1 ||
        levelData.successCount > 0 ||
        levelData.lv4FailureCount > 0 ||
        levelData.lv4Celebrated ||
        item?.hasBeenStudied ||
        item?.reviewDue
      );
    })
    .map((item) => String(item.id));
}

function hasLegacyCompletedNormalDay(dayNumber) {
  if (getPendingNormalDayReviewQuestionIds(dayNumber).length > 0) {
    return false;
  }
  const answeredCount = getNormalDayAnsweredCount(dayNumber);
  if (answeredCount >= DAY_PROGRESS_TARGET_QUESTION_COUNT) {
    return true;
  }
  if (getNormalDayProgressEntry(dayNumber)) {
    return false;
  }
  return getLegacyTouchedDayQuestionIds(dayNumber).length >= DAY_PROGRESS_TARGET_QUESTION_COUNT;
}

function ensureUnlockedDayProgressConsistency() {
  if (state.session) return null;
  const availableDays = getAvailableDays();
  if (!availableDays.length) return null;

  const maxDay = availableDays[availableDays.length - 1];
  const unlockedDayMax = getUnlockedDayMax();
  if (unlockedDayMax >= maxDay) return null;
  if (!hasLegacyCompletedNormalDay(unlockedDayMax)) return null;

  const nextUnlockedDay = Math.min(maxDay, unlockedDayMax + 1);
  if (nextUnlockedDay <= unlockedDayMax) return null;

  state.stats.unlockedDayMax = nextUnlockedDay;
  markStudyCoreLocalChange({ unlockedDayMax: true });
  scheduleStudyCoreSync();
  saveState();

  return {
    previousDay: unlockedDayMax,
    unlockedDay: nextUnlockedDay
  };
}

function recordNormalDayProgressFromSession(sessionLike) {
  if (!sessionLike || sessionLike.mode !== "normal") {
    return { updated: false, day: 0, beforeCount: 0, afterCount: 0 };
  }
  if (sessionLike.isDayStudySession || sessionLike.isExtraTrainingSession || !sessionLike.isProgressiveDaySession || sessionLike.isProgressiveDayReviewSession) {
    return { updated: false, day: 0, beforeCount: 0, afterCount: 0 };
  }

  const day = Math.max(1, Math.floor(Number(sessionLike.dayProgressDay || sessionLike.studyRangeStart) || 0));
  if (!day) return { updated: false, day: 0, beforeCount: 0, afterCount: 0 };

  const progress = getNormalDayProgressEntry(day, { create: true }) || createDefaultNormalDayProgressEntry();
  const answeredSet = new Set((progress.answeredQuestionIds || []).map((id) => String(id)));
  const wrongSet = new Set((progress.wrongQuestionIds || []).map((id) => String(id)));
  const beforeCount = answeredSet.size;

  const answerHistory = Array.isArray(sessionLike.answerHistory) ? sessionLike.answerHistory : [];
  answerHistory.forEach((entry) => {
    if (entry?.phase !== "phase1") return;
    const questionId = String(entry?.questionId || "").trim();
    if (!questionId) return;
    const question = resolveLearningHistoryQuestionByIdForSession(sessionLike, questionId);
    if (!question || Number(question.day) !== day) return;
    answeredSet.add(questionId);
    if (!entry?.isCorrect) {
      wrongSet.add(questionId);
    }
  });

  progress.answeredQuestionIds = [...answeredSet].slice(0, DAY_PROGRESS_TARGET_QUESTION_COUNT);
  progress.wrongQuestionIds = [...wrongSet].filter((id) => answeredSet.has(String(id)));
  if (progress.answeredQuestionIds.length >= DAY_PROGRESS_TARGET_QUESTION_COUNT && !progress.completedAtDayKey) {
    progress.completedAtDayKey = todayKey();
  }
  state.stats.normalDayProgressByDay[String(day)] = progress;

  return {
    updated: true,
    day,
    beforeCount,
    afterCount: progress.answeredQuestionIds.length
  };
}

function sanitizeGameTicketInventoryEntry(value) {
  if (!value || typeof value !== "object") return null;
  const id = typeof value.id === "string" && value.id ? value.id : `ticket-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const minutes = Number(value.minutes);
  const earnedAt = Number(value.earnedAt);
  const expiresAt = Number(value.expiresAt);
  const usedAt = value.usedAt == null ? null : Number(value.usedAt);
  const source = value.source === "streakBonus"
    ? "streakBonus"
    : value.source === "firstBonus"
      ? "firstBonus"
      : "random";
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  if (!Number.isFinite(earnedAt) || !Number.isFinite(expiresAt)) return null;
  return {
    id,
    minutes: Math.round(minutes),
    earnedAt,
    expiresAt,
    usedAt: Number.isFinite(usedAt) ? usedAt : null,
    source
  };
}

function sanitizeGameTicketEarnedHistoryEntry(value) {
  if (!value || typeof value !== "object") return null;
  const earnedAt = Number(value.earnedAt);
  const minutes = Number(value.minutes);
  if (!Number.isFinite(earnedAt) || !Number.isFinite(minutes) || minutes <= 0) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : `earned-${earnedAt}-${Math.random().toString(36).slice(2, 8)}`,
    label: typeof value.label === "string" ? value.label : "",
    minutes: Math.round(minutes),
    earnedAt,
    type: value.type === "streakBonus" ? "streakBonus" : value.type === "firstBonus" ? "firstBonus" : "random"
  };
}

function sanitizeGameTicketUsageEntry(value) {
  if (!value || typeof value !== "object") return null;
  const minutes = Number(value.minutes);
  const usedAt = Number(value.usedAt);
  if (!Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(usedAt)) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : `used-${usedAt}-${Math.random().toString(36).slice(2, 8)}`,
    minutes: Math.round(minutes),
    usedAt
  };
}

function sanitizeGameTicketRewardEntry(value) {
  if (!value || typeof value !== "object") return null;
  const minutes = Number(value.minutes);
  const queuedAt = Number(value.queuedAt);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  return {
    id: typeof value.id === "string" && value.id ? value.id : `reward-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: value.type === "streakBonus" ? "streakBonus" : value.type === "firstBonus" ? "firstBonus" : "random",
    minutes: Math.round(minutes),
    streakDays: Number.isFinite(Number(value.streakDays)) ? Math.max(0, Math.round(Number(value.streakDays))) : null,
    queuedAt: Number.isFinite(queuedAt) ? queuedAt : Date.now()
  };
}

function sanitizeLearningHistoryTicketSnapshot(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    legacyTickets: Math.max(0, Number(source.legacyTickets) || 0),
    gameEarnedCount: Math.max(0, Number(source.gameEarnedCount) || 0),
    gameEarnedMinutes: Math.max(0, Number(source.gameEarnedMinutes) || 0),
    gameUsedCount: Math.max(0, Number(source.gameUsedCount) || 0),
    gameUsedMinutes: Math.max(0, Number(source.gameUsedMinutes) || 0)
  };
}

function sumTicketMinutes(list) {
  if (!Array.isArray(list)) return 0;
  return list.reduce((sum, entry) => sum + Math.max(0, Number(entry?.minutes) || 0), 0);
}

function captureLearningHistoryTicketSnapshot() {
  const gameTicketStore = sanitizeGameTicketStats(state?.stats?.gameTickets);
  return {
    legacyTickets: Math.max(0, Number(state?.stats?.tickets) || 0),
    gameEarnedCount: Array.isArray(gameTicketStore.earnedHistory) ? gameTicketStore.earnedHistory.length : 0,
    gameEarnedMinutes: sumTicketMinutes(gameTicketStore.earnedHistory),
    gameUsedCount: Array.isArray(gameTicketStore.usageHistory) ? gameTicketStore.usageHistory.length : 0,
    gameUsedMinutes: sumTicketMinutes(gameTicketStore.usageHistory)
  };
}

function computeLearningHistoryTicketDelta(before, after) {
  const safeBefore = sanitizeLearningHistoryTicketSnapshot(before);
  const safeAfter = sanitizeLearningHistoryTicketSnapshot(after);
  return {
    earned: {
      legacyTickets: Math.max(0, safeAfter.legacyTickets - safeBefore.legacyTickets),
      gameTicketsCount: Math.max(0, safeAfter.gameEarnedCount - safeBefore.gameEarnedCount),
      gameTicketsMinutes: Math.max(0, safeAfter.gameEarnedMinutes - safeBefore.gameEarnedMinutes)
    },
    used: {
      gameTicketsCount: Math.max(0, safeAfter.gameUsedCount - safeBefore.gameUsedCount),
      gameTicketsMinutes: Math.max(0, safeAfter.gameUsedMinutes - safeBefore.gameUsedMinutes)
    }
  };
}

const LEARNING_MODE = Object.freeze({
  DAY: "Day",
  EXTRA_TRAINING: "extraTraining",
  REVIEW: "過去の間違い",
  PREPOSITION: "前置詞特訓",
  RESPONSE: "応答文特訓",
  IRREGULAR_VERB: "不規則動詞特訓"
});

const VALID_LEARNING_MODE_SET = new Set(Object.values(LEARNING_MODE));

function normalizeLearningMode(mode) {
  const rawMode = String(mode || "").trim();
  const lowerMode = rawMode.toLowerCase();
  let normalizedMode = "";

  if (rawMode === "normal" || rawMode === "Day" || rawMode === "Day学習") {
    normalizedMode = LEARNING_MODE.DAY;
  } else if (rawMode === LEARNING_MODE.EXTRA_TRAINING || lowerMode === "extratraining" || lowerMode === "extra-training" || rawMode === "追加特訓") {
    normalizedMode = LEARNING_MODE.EXTRA_TRAINING;
  } else if (rawMode === "challenge" || rawMode === "review" || rawMode === LEARNING_MODE.REVIEW) {
    normalizedMode = LEARNING_MODE.REVIEW;
  } else if (rawMode === "preposition" || rawMode === "preposition-training" || rawMode === LEARNING_MODE.PREPOSITION) {
    normalizedMode = LEARNING_MODE.PREPOSITION;
  } else if (rawMode === "response" || rawMode === "response-training" || rawMode === LEARNING_MODE.RESPONSE) {
    normalizedMode = LEARNING_MODE.RESPONSE;
  } else if (rawMode === "irregular-verb" || rawMode === "irregular-verb-training" || rawMode === LEARNING_MODE.IRREGULAR_VERB) {
    normalizedMode = LEARNING_MODE.IRREGULAR_VERB;
  }

  if (!VALID_LEARNING_MODE_SET.has(normalizedMode)) {
    console.warn("Unexpected learning mode for history", { mode: rawMode });
  }

  return normalizedMode;
}

function isExtraTrainingSession(sessionLike) {
  return Boolean(sessionLike?.isExtraTrainingSession);
}

function resolveLearningHistoryModeForSession(sessionLike) {
  const historySegmentMode = String(sessionLike?.historySegmentMode || "").trim();
  if (historySegmentMode) {
    return historySegmentMode;
  }
  if (String(sessionLike?.mode || "") === "normal" && isExtraTrainingSession(sessionLike)) {
    return LEARNING_MODE.EXTRA_TRAINING;
  }
  return String(sessionLike?.mode || "");
}

function resolveSessionDayNumber(sessionLike) {
  if (isExtraTrainingSession(sessionLike)) return "";
  const mode = String(sessionLike?.mode || "");
  if (mode === "normal") {
    const start = Number(sessionLike?.studyRangeStart);
    const end = Number(sessionLike?.studyRangeEnd);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      if (start === end) return String(start);
      return `${start}-${end}`;
    }
  }
  const days = [...new Set((sessionLike?.questions || []).map((question) => Number(question?.day)).filter((value) => Number.isFinite(value)))].sort((a, b) => a - b);
  if (!days.length) return "";
  if (days.length === 1) return String(days[0]);
  return `${days[0]}-${days[days.length - 1]}`;
}

function resolveCurrentSessionDayNumberForHistorySegment(sessionLike) {
  if (isExtraTrainingSession(sessionLike)) return "";
  const mode = String(sessionLike?.mode || "");
  if (mode === "normal") {
    const start = Number(sessionLike?.studyRangeStart);
    const end = Number(sessionLike?.studyRangeEnd);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      if (start === end) return String(start);
      return `${start}-${end}`;
    }
    const currentIndex = Number(sessionLike?.currentIndex);
    if (Array.isArray(sessionLike?.questions) && Number.isInteger(currentIndex) && currentIndex >= 0 && currentIndex < sessionLike.questions.length) {
      const currentDay = Number(sessionLike.questions[currentIndex]?.day);
      if (Number.isFinite(currentDay) && currentDay >= 1) {
        return String(Math.floor(currentDay));
      }
    }
  }
  return resolveSessionDayNumber(sessionLike);
}

function resolveLearningHistoryQuestionByIdForSession(sessionLike, questionId) {
  const key = String(questionId || "");
  if (!key) return null;
  const sessionQuestion = Array.isArray(sessionLike?.questions)
    ? sessionLike.questions.find((question) => String(question?.id || "") === key)
    : null;
  if (sessionQuestion) return sessionQuestion;
  return getQuestionById(key);
}

function resolveLearningHistorySegmentDayNumber(sessionLike) {
  if (isExtraTrainingSession(sessionLike)) return "";
  const explicit = String(sessionLike?.historySegmentDayNumber || "").trim();
  if (explicit) return explicit;

  if (String(sessionLike?.mode || "") !== "normal") {
    return resolveSessionDayNumber(sessionLike);
  }

  const startIndex = Math.max(0, Math.floor(Number(sessionLike?.historySegmentAnswerHistoryStartIndex) || 0));
  const answerHistory = Array.isArray(sessionLike?.answerHistory) ? sessionLike.answerHistory : [];
  const daySet = new Set();
  answerHistory.slice(startIndex).forEach((entry) => {
    const question = resolveLearningHistoryQuestionByIdForSession(sessionLike, entry?.questionId);
    const day = Number(question?.day);
    if (Number.isFinite(day) && day >= 1) {
      daySet.add(Math.floor(day));
    }
  });

  const days = [...daySet].sort((left, right) => left - right);
  if (days.length === 1) return String(days[0]);
  if (days.length > 1) return `${days[0]}-${days[days.length - 1]}`;
  return resolveCurrentSessionDayNumberForHistorySegment(sessionLike);
}

function initializeNormalSessionHistorySegment(sessionLike, options = {}) {
  if (!sessionLike || String(sessionLike.mode || "") !== "normal") return;
  const fallbackStartedAt = Number(sessionLike.startedAt);
  const defaultStartedAt = Number.isFinite(fallbackStartedAt) && fallbackStartedAt > 0 ? fallbackStartedAt : Date.now();
  const answerCount = Math.max(0, Number(sessionLike.answerCount) || 0);
  const answerHistoryLength = Array.isArray(sessionLike.answerHistory) ? sessionLike.answerHistory.length : 0;
  const currentPointBalance = Math.max(0, Math.floor(Number(getPointState().balance) || 0));

  const startedAt = Number(options.startedAt);
  const answerStartCount = Number(options.answerStartCount);
  const answerHistoryStartIndex = Number(options.answerHistoryStartIndex);
  const pointBalanceBefore = Number(options.pointBalanceBefore);
  const correctStartCount = Number(options.correctStartCount);

  sessionLike.historySegmentStartedAt = Number.isFinite(startedAt) && startedAt > 0 ? startedAt : defaultStartedAt;
  sessionLike.historySegmentAnswerStartCount = Number.isFinite(answerStartCount)
    ? Math.max(0, Math.floor(answerStartCount))
    : answerCount;
  sessionLike.historySegmentAnswerHistoryStartIndex = Number.isFinite(answerHistoryStartIndex)
    ? Math.max(0, Math.floor(answerHistoryStartIndex))
    : answerHistoryLength;
  sessionLike.historySegmentCorrectStartCount = Number.isFinite(correctStartCount)
    ? Math.max(0, Math.floor(correctStartCount))
    : answerHistory.slice(0, sessionLike.historySegmentAnswerHistoryStartIndex).filter((entry) => entry?.isCorrect).length;
  sessionLike.historySegmentPointBalanceBefore = Number.isFinite(pointBalanceBefore)
    ? Math.max(0, Math.floor(pointBalanceBefore))
    : currentPointBalance;
  sessionLike.historySegmentMode = String(options.mode || "").trim();

  const dayNumber = String(options.dayNumber || "").trim();
  sessionLike.historySegmentDayNumber = dayNumber || resolveCurrentSessionDayNumberForHistorySegment(sessionLike);
}

function appendLearningHistoryEntryForCurrentSegment(sessionLike, reason = "completed") {
  if (!sessionLike || String(sessionLike.mode || "") !== "normal") return false;
  const answerStats = resolveLearningHistoryAnswerStats(sessionLike, null, {
    answerStartCount: sessionLike.historySegmentAnswerStartCount,
    answerHistoryStartIndex: sessionLike.historySegmentAnswerHistoryStartIndex,
    correctStartCount: sessionLike.historySegmentCorrectStartCount
  });
  if (answerStats.questionCount <= 0) return false;
  appendLearningHistoryEntry(buildLearningHistoryEntryFromSession(sessionLike, buildResultSummary(sessionLike), reason));
  return true;
}

function computeSessionActiveStudySeconds(sessionLike, endedAt, options = {}) {
  const explicitStart = Number(options?.startAt);
  const start = Number.isFinite(explicitStart) && explicitStart > 0
    ? explicitStart
    : Number(sessionLike?.startedAt);
  const end = Number(endedAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const answerHistory = Array.isArray(sessionLike?.answerHistory) ? sessionLike.answerHistory : [];
  const explicitStartIndex = Number(options?.answerHistoryStartIndex);
  const startIndex = Number.isFinite(explicitStartIndex) && explicitStartIndex >= 0
    ? Math.floor(explicitStartIndex)
    : 0;
  const interactionTimestamps = answerHistory
    .slice(startIndex)
    .map((entry) => Number(entry?.at))
    .filter((value) => Number.isFinite(value) && value >= start && value <= end);
  const points = [start, ...interactionTimestamps.sort((a, b) => a - b), end];
  let activeMs = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const delta = current - previous;
    if (delta > 0 && delta <= LEARNING_ACTIVE_TIMEOUT_MS) {
      activeMs += delta;
    }
  }
  return Math.max(0, Math.round(activeMs / 1000));
}

function sanitizeLearningHistoryAnswerDetails(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    const source = entry && typeof entry === "object" ? entry : {};
    const questionId = String(source.questionId || "").trim();
    const day = Number(source.day);
    const indexValue = Number(source.index);
    const answeredAt = Number(source.answeredAt ?? source.at);
    return {
      questionId,
      day: Number.isFinite(day) && day >= 1 ? Math.floor(day) : 0,
      isCorrect: Boolean(source.isCorrect),
      answer: String(source.answer || ""),
      phase: String(source.phase || ""),
      index: Number.isFinite(indexValue) ? Math.max(0, Math.floor(indexValue)) : index,
      answeredAt: Number.isFinite(answeredAt) && answeredAt > 0 ? Math.floor(answeredAt) : 0
    };
  }).filter((entry) => entry.questionId);
}

function parseLearningHistoryEarnedPoints(value) {
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

function buildLearningHistoryAnswerDetails(sessionLike, options = {}) {
  const answerHistory = Array.isArray(sessionLike?.answerHistory) ? sessionLike.answerHistory : [];
  const startIndexRaw = Number(options?.answerHistoryStartIndex);
  const startIndex = Number.isFinite(startIndexRaw) ? Math.max(0, Math.floor(startIndexRaw)) : 0;
  return sanitizeLearningHistoryAnswerDetails(
    answerHistory.slice(startIndex).map((entry, offset) => {
      const questionId = String(entry?.questionId || "").trim();
      const question = resolveLearningHistoryQuestionByIdForSession(sessionLike, questionId);
      return {
        questionId,
        day: Number(question?.day) || 0,
        isCorrect: Boolean(entry?.isCorrect),
        answer: String(entry?.answer || ""),
        phase: String(entry?.phase || ""),
        index: Math.max(0, startIndex + offset),
        answeredAt: Number(entry?.at) || 0
      };
    })
  );
}

function sanitizeLearningHistoryEntry(entry) {
  console.log("[LearningHistoryDebug] sanitizeLearningHistoryEntry before", {
    entry,
    mode: String(entry?.mode || ""),
    questionCount: Number(entry?.questionCount),
    activeStudySeconds: Number(entry?.activeStudySeconds),
    startedAt: Number(entry?.startedAt),
    endedAt: Number(entry?.endedAt),
    createdAt: entry?.createdAt ?? null
  });
  if (!entry || typeof entry !== "object") return null;
  const endedAt = Number(entry.endedAt);
  const startedAt = Number(entry.startedAt);
  const rawDayNumber = entry.dayNumber;
  const normalizedDayNumber = rawDayNumber == null ? "" : String(rawDayNumber).trim();
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) {
    const reason = !Number.isFinite(startedAt) && !Number.isFinite(endedAt)
      ? "startedAtが不正 / endedAtが不正"
      : !Number.isFinite(startedAt)
        ? "startedAtが不正"
        : "endedAtが不正";
    console.log("[LearningHistoryDebug] sanitizeLearningHistoryEntry stopped", {
      reason,
      entry,
      mode: String(entry?.mode || ""),
      questionCount: Number(entry?.questionCount),
      activeStudySeconds: Number(entry?.activeStudySeconds),
      startedAt: Number(entry?.startedAt),
      endedAt: Number(entry?.endedAt),
      createdAt: entry?.createdAt ?? null
    });
    return null;
  }
  const sanitized = {
    learnedAt: typeof entry.learnedAt === "string" && entry.learnedAt ? entry.learnedAt : formatTimestampToJstDisplay(endedAt),
    startedAt,
    endedAt,
    startedAtDisplay: typeof entry.startedAtDisplay === "string" && entry.startedAtDisplay ? entry.startedAtDisplay : formatTimestampToJstDisplay(startedAt),
    endedAtDisplay: typeof entry.endedAtDisplay === "string" && entry.endedAtDisplay ? entry.endedAtDisplay : formatTimestampToJstDisplay(endedAt),
    activeStudySeconds: Math.max(0, Number(entry.activeStudySeconds) || 0),
    mode: typeof entry.mode === "string" ? entry.mode : "",
    dayNumber: normalizedDayNumber,
    questionCount: Math.max(0, Number(entry.questionCount) || 0),
    correctCount: Math.max(0, Number(entry.correctCount) || 0),
    earnedPoints: parseLearningHistoryEarnedPoints(entry.earnedPoints),
    accuracy: Math.max(0, Math.min(100, Number(entry.accuracy) || 0)),
    completedReason: typeof entry.completedReason === "string" ? entry.completedReason : "completed",
    deviceType: typeof entry.deviceType === "string" && entry.deviceType.trim().toLowerCase() === "mobile" ? "mobile" : "pc",
    deviceId: String(entry.deviceId || "").trim(),
    deviceName: sanitizePcBrowserDeviceName(entry.deviceName),
    answerDetails: sanitizeLearningHistoryAnswerDetails(entry.answerDetails),
    ticket: {
      earned: {
        legacyTickets: Math.max(0, Number(entry.ticket?.earned?.legacyTickets) || 0),
        gameTicketsCount: Math.max(0, Number(entry.ticket?.earned?.gameTicketsCount) || 0),
        gameTicketsMinutes: Math.max(0, Number(entry.ticket?.earned?.gameTicketsMinutes) || 0)
      },
      used: {
        gameTicketsCount: Math.max(0, Number(entry.ticket?.used?.gameTicketsCount) || 0),
        gameTicketsMinutes: Math.max(0, Number(entry.ticket?.used?.gameTicketsMinutes) || 0)
      }
    }
  };
  console.log("[LearningHistoryDebug] sanitizeLearningHistoryEntry after", {
    entry: sanitized,
    mode: String(sanitized?.mode || ""),
    questionCount: Number(sanitized?.questionCount),
    activeStudySeconds: Number(sanitized?.activeStudySeconds),
    startedAt: Number(sanitized?.startedAt),
    endedAt: Number(sanitized?.endedAt),
    createdAt: sanitized?.createdAt ?? null
  });
  return sanitized;
}

function loadLearningHistoryEntries() {
  try {
    const storageKey = getScopedLocalStorageKey(LEARNING_HISTORY_STORAGE_KEY);
    if (!storageKey) return [];
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(sanitizeLearningHistoryEntry)
      .filter((entry) => Boolean(entry) && Math.max(0, Number(entry?.questionCount) || 0) > 0);
  } catch (error) {
    console.error("Could not read learning history", error);
    return [];
  }
}

function formatLearningHistoryDuration(seconds) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remainSeconds = safeSeconds % 60;
  if (minutes > 0 && remainSeconds > 0) return `${minutes}分${remainSeconds}秒`;
  if (minutes > 0) return `${minutes}分`;
  return `${remainSeconds}秒`;
}

function buildLearningHistoryTicketText(ticket) {
  const earnedLegacy = Math.max(0, Number(ticket?.earned?.legacyTickets) || 0);
  const earnedGameCount = Math.max(0, Number(ticket?.earned?.gameTicketsCount) || 0);
  const earnedGameMinutes = Math.max(0, Number(ticket?.earned?.gameTicketsMinutes) || 0);
  const usedGameCount = Math.max(0, Number(ticket?.used?.gameTicketsCount) || 0);
  const usedGameMinutes = Math.max(0, Number(ticket?.used?.gameTicketsMinutes) || 0);
  return {
    earned: `通常${earnedLegacy} / ゲーム${earnedGameCount}枚（${earnedGameMinutes}分）`,
    used: `ゲーム${usedGameCount}枚（${usedGameMinutes}分）`
  };
}

function getLearningHistoryJstParts(timestamp) {
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

function getLearningHistoryDayKey(timestamp) {
  const parts = getLearningHistoryJstParts(timestamp);
  return `${parts.year || "0000"}-${parts.month || "00"}-${parts.day || "00"}`;
}

function formatLearningHistoryDateLabel(dayKey) {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(dayKey || ""));
  if (!match) return String(dayKey || "");
  return `${Number(match[2])}/${Number(match[3])}`;
}

function formatLearningHistoryDateTimeRange(startedAt, endedAt) {
  const startValue = Number(startedAt);
  const endValue = Number(endedAt);
  const normalizedStart = Number.isFinite(startValue) && Number.isFinite(endValue)
    ? Math.min(startValue, endValue)
    : startedAt;
  const normalizedEnd = Number.isFinite(startValue) && Number.isFinite(endValue)
    ? Math.max(startValue, endValue)
    : endedAt;
  const startParts = getLearningHistoryJstParts(normalizedStart);
  const endParts = getLearningHistoryJstParts(normalizedEnd);
  const startClock = `${startParts.hour || "00"}:${startParts.minute || "00"}`;
  const endClock = `${endParts.hour || "00"}:${endParts.minute || "00"}`;
  const startClockRank = Number((startParts.hour || "00") + (startParts.minute || "00"));
  const endClockRank = Number((endParts.hour || "00") + (endParts.minute || "00"));
  if (Number.isFinite(startClockRank) && Number.isFinite(endClockRank) && startClockRank > endClockRank) {
    return `${endClock}〜${startClock}`;
  }
  return `${startClock}〜${endClock}`;
}

function formatLearningHistoryStartClock(startedAt) {
  const parts = getLearningHistoryJstParts(startedAt);
  return `${parts.hour || "00"}:${parts.minute || "00"}`;
}

function formatLearningHistoryFullDateLabel(dayKey) {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(dayKey || ""));
  if (!match) return String(dayKey || "");
  return `${match[1]}/${match[2]}/${match[3]}`;
}

function shiftLearningHistoryDayKey(dayKey, deltaDays) {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(String(dayKey || ""));
  if (!match) return String(dayKey || "");
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  date.setUTCDate(date.getUTCDate() + Number(deltaDays || 0));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getLearningHistoryEntryDayKey(entry) {
  const endedAt = Number(entry?.endedAt);
  if (Number.isFinite(endedAt) && endedAt > 0) {
    return getLearningHistoryDayKey(endedAt);
  }
  const startedAt = Number(entry?.startedAt);
  if (Number.isFinite(startedAt) && startedAt > 0) {
    return getLearningHistoryDayKey(startedAt);
  }
  const dateText = String(entry?.studyDate || entry?.learnedAt || "").trim();
  const match = dateText.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function collectUniqueLearningHistoryDayKeys(entries) {
  return [...new Set(
    (Array.isArray(entries) ? entries : [])
      .map((entry) => getLearningHistoryEntryDayKey(entry))
      .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
  )].sort((a, b) => b.localeCompare(a));
}

function computeDisplayStreakInfo(dayKeys, referenceDayKey = getLearningHistoryDayKey(Date.now())) {
  const validKeys = Array.isArray(dayKeys)
    ? dayKeys.filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(String(key || "")))
    : [];
  const keySet = new Set(validKeys);
  const todayDayKey = /^\d{4}-\d{2}-\d{2}$/.test(String(referenceDayKey || ""))
    ? String(referenceDayKey)
    : getLearningHistoryDayKey(Date.now());
  const yesterdayDayKey = shiftLearningHistoryDayKey(todayDayKey, -1);
  const hasToday = keySet.has(todayDayKey);
  const hasYesterday = keySet.has(yesterdayDayKey);

  let anchorDayKey = "";
  if (hasToday) {
    anchorDayKey = todayDayKey;
  } else if (hasYesterday) {
    anchorDayKey = yesterdayDayKey;
  } else {
    return {
      streak: 0,
      isGrace: false,
      hasToday: false,
      hasYesterday: false,
      nextStreak: 1
    };
  }

  let streak = 0;
  let expectedDayKey = anchorDayKey;
  while (keySet.has(expectedDayKey)) {
    streak += 1;
    expectedDayKey = shiftLearningHistoryDayKey(expectedDayKey, -1);
  }

  return {
    streak,
    isGrace: !hasToday && hasYesterday,
    hasToday,
    hasYesterday,
    nextStreak: streak + 1
  };
}

function createEmptyLearningHistoryDaySummary(dayKey) {
  return finalizeLearningHistoryDaySummary({
    dayKey,
    label: formatLearningHistoryDateLabel(dayKey),
    activeStudySeconds: 0,
    questionCount: 0,
    correctCount: 0,
    earnedPoints: 0,
    modeTotals: createLearningHistoryModeTotals(),
    entries: []
  });
}

function finalizeLearningHistoryDaySummary(summary) {
  const nextSummary = finalizeLearningHistoryTotals(summary);
  nextSummary.label = formatLearningHistoryDateLabel(nextSummary.dayKey || nextSummary.label || "");
  Object.values(nextSummary.modeTotals || {}).forEach((modeEntry) => {
    modeEntry.accuracy = modeEntry.questionCount ? Math.round((modeEntry.correctCount / modeEntry.questionCount) * 100) : 0;
    modeEntry.activeStudyMinutes = Math.max(0, Math.round(modeEntry.activeStudySeconds / 60));
  });
  return nextSummary;
}

function getLearningHistoryDaySummary(model, dayKey) {
  if (model?.dayMap?.has(dayKey)) {
    return finalizeLearningHistoryDaySummary({ ...model.dayMap.get(dayKey), dayKey });
  }
  return createEmptyLearningHistoryDaySummary(dayKey);
}

function getLearningHistorySelectedDayTitle(dayKey, todayDayKey) {
  const label = formatLearningHistoryFullDateLabel(dayKey);
  return dayKey === todayDayKey ? `今日（${label}）` : label;
}

function resolveLearningHistoryDayNumberForDisplay(entryLike) {
  return window.LearningHistoryDisplayShared?.resolveDayNumberForDisplay(entryLike) || 0;
}

function isLikelyPhraseLearningHistoryEntry(entryLike) {
  return window.LearningHistoryDisplayShared?.isLikelyPhraseLearningHistoryEntry(entryLike) || false;
}

function stripPcLearningHistoryWeekDayPrefix(modeLike) {
  return window.LearningHistoryDisplayShared?.stripPcWeekDayPrefix(modeLike) || String(modeLike || "").trim();
}

function resolvePcLearningHistoryCategory(modeLike, entryLike = null) {
  return window.LearningHistoryDisplayShared?.resolvePcCategory(modeLike, entryLike) || "不明";
}

function resolvePcLearningHistoryModeLabel(entryLike, options = {}) {
  return window.LearningHistoryDisplayShared?.resolvePcModeLabel(entryLike, options) || "不明";
}

function resolvePcLearningHistoryDaySummaryLabel(dayEntries) {
  return window.LearningHistoryDisplayShared?.resolvePcDaySummaryLabel(dayEntries) || "Day学習";
}

function getPcLearningHistorySummaryRowLabel(entry, options = {}) {
  const source = entry && typeof entry === "object" ? entry : {};
  const rawLabel = String(source.label || "").trim() || "不明";
  if (rawLabel === "-") return "不明";
  if (rawLabel === "Day学習" && options?.dayLabel) return String(options.dayLabel);
  return rawLabel;
}

function getLearningHistoryModeBucket(modeOrEntry) {
  const sharedBucket = window.LearningHistoryDisplayShared?.getPcModeBucket(modeOrEntry);
  if (sharedBucket && typeof sharedBucket === "object" && sharedBucket.key) {
    return sharedBucket;
  }

  const entryLike = modeOrEntry && typeof modeOrEntry === "object" ? modeOrEntry : null;
  const mode = entryLike ? entryLike.mode : modeOrEntry;
  const rawMode = String(mode || "").trim();
  const lowered = rawMode.toLowerCase();

  if (!rawMode) {
    return { key: "mode:不明", label: "不明" };
  }
  if (rawMode === "Day" || rawMode === "Day学習" || rawMode === "normal" || lowered === "normal") {
    return { key: "day", label: "Day学習" };
  }
  if (rawMode === "追加特訓" || rawMode === "extraTraining" || lowered === "extratraining" || lowered === "extra-training") {
    return { key: "extra", label: "追加特訓" };
  }
  if (rawMode === "過去の間違い" || rawMode === "challenge" || rawMode === "review" || lowered === "review") {
    return { key: "review", label: "過去の間違い" };
  }
  if (rawMode === "前置詞特訓" || rawMode === "preposition" || rawMode === "preposition-training" || lowered === "preposition-training") {
    return { key: "preposition", label: "前置詞特訓" };
  }
  if (rawMode === "応答文特訓" || rawMode === "response" || rawMode === "response-training" || lowered === "response-training") {
    return { key: "response", label: "応答文特訓" };
  }
  if (rawMode === "不規則動詞特訓" || rawMode === "irregular-verb" || rawMode === "irregular-verb-training" || lowered === "irregular-verb-training") {
    return { key: "irregularVerb", label: "不規則動詞特訓" };
  }
  if (rawMode.includes("熟語") || lowered.includes("phrase") || lowered.includes("idiom")) {
    return { key: "phrase", label: "熟語特訓" };
  }
  if (rawMode.includes("単語") || lowered.includes("word")) {
    return { key: "word", label: "単語特訓" };
  }
  return { key: `mode:${rawMode}`, label: rawMode };
}

function getLearningHistoryModeGroup(mode) {
  const bucket = getLearningHistoryModeBucket(mode);
  if (bucket.key === "day" || bucket.key === "extra" || bucket.key === "word" || bucket.key === "phrase" || bucket.key === "irregularVerb" || bucket.key === "review") {
    return bucket.key;
  }
  return "other";
}

function getLearningHistoryModeSummaryOrder() {
  return window.LearningHistoryDisplayShared?.getPcModeSummaryOrder() || ["day", "extra", "phrase", "irregularVerb", "review", "word"];
}

function getLearningHistoryModeSummaryEntries(summary) {
  return window.LearningHistoryDisplayShared?.getPcModeSummaryEntries(summary) || [];
}

function ensureLearningHistoryModeTotal(modeTotals, bucketInfo) {
  if (!modeTotals || !bucketInfo?.key) return null;
  const existing = modeTotals[bucketInfo.key];
  if (existing && typeof existing === "object") {
    if (!String(existing.label || "").trim()) {
      existing.label = bucketInfo.label;
    }
    return existing;
  }
  const created = {
    label: bucketInfo.label,
    activeStudySeconds: 0,
    questionCount: 0,
    correctCount: 0,
    earnedPoints: 0
  };
  modeTotals[bucketInfo.key] = created;
  return created;
}

function renderLearningHistoryModeSummaryContent(summary, options = {}) {
  const entries = getLearningHistoryModeSummaryEntries(summary);
  const dayLabel = Array.isArray(options.dayEntries)
    ? resolvePcLearningHistoryDaySummaryLabel(options.dayEntries)
    : "";
  const hasAnyEntries = typeof options.hasEntries === "boolean"
    ? options.hasEntries
    : (Math.max(0, Number(summary?.questionCount) || 0) > 0 || Math.max(0, Number(summary?.activeStudySeconds) || 0) > 0);
  if (!entries.length) {
    if (hasAnyEntries) {
      return "";
    }
    return `<p class="empty-state">${escapeHtml(options.emptyMessage || "この期間の学習記録がありません")}</p>`;
  }

  const totalSeconds = Math.max(0, Number(summary?.activeStudySeconds) || 0);
  const totalQuestions = Math.max(0, Number(summary?.questionCount) || 0);
  const totalEarnedPoints = Math.max(0, Number(summary?.earnedPoints) || 0);
  const totalAccuracy = Math.max(0, Number(summary?.accuracy) || 0);
  const modeRows = entries.map((entry) => {
    const rowLabel = getPcLearningHistorySummaryRowLabel(entry, { dayLabel });
    const questionCount = Math.max(0, Number(entry.questionCount) || 0);
    const activeStudySeconds = Math.max(0, Number(entry.activeStudySeconds) || 0);
    if (options.layout === "today") {
      return `
        <div class="admin-history-mode-summary-row">
          <span>${escapeHtml(rowLabel)}</span>
          <span>${questionCount}問</span>
          <span>+${parseLearningHistoryEarnedPoints(entry.earnedPoints)}P</span>
          <span>${escapeHtml(formatLearningHistoryDuration(activeStudySeconds))}</span>
        </div>
      `;
    }

    return `
      <div class="admin-history-mode-summary-row">
        <span>${escapeHtml(rowLabel)}</span>
        <span>${escapeHtml(formatLearningHistoryDuration(activeStudySeconds))}</span>
        <span>${questionCount}問</span>
        <span>+${parseLearningHistoryEarnedPoints(entry.earnedPoints)}P</span>
        <span>${Math.max(0, Number(entry.accuracy) || 0)}%</span>
      </div>
    `;
  }).join("");

  const totalRow = options.layout === "today"
    ? `
      <div class="admin-history-total-stats">
        <span>合計 ${escapeHtml(formatLearningHistoryDuration(totalSeconds))}</span>
        <span>${totalQuestions}問</span>
        <span>+${totalEarnedPoints}P</span>
      </div>
    `
    : `
      <div class="admin-history-total-stats">
        <span>合計 ${escapeHtml(formatLearningHistoryDuration(totalSeconds))}</span>
        <span>${totalQuestions}問</span>
        <span>+${totalEarnedPoints}P</span>
        <span>${totalAccuracy}%</span>
      </div>
    `;

  return `${modeRows}${totalRow}`;
}

function createLearningHistoryModeTotals() {
  return {
    day: { label: "Day学習", activeStudySeconds: 0, questionCount: 0, correctCount: 0, earnedPoints: 0 },
    extra: { label: "追加特訓", activeStudySeconds: 0, questionCount: 0, correctCount: 0, earnedPoints: 0 },
    word: { label: "単語特訓", activeStudySeconds: 0, questionCount: 0, correctCount: 0, earnedPoints: 0 },
    phrase: { label: "熟語特訓", activeStudySeconds: 0, questionCount: 0, correctCount: 0, earnedPoints: 0 },
    irregularVerb: { label: "不規則動詞特訓", activeStudySeconds: 0, questionCount: 0, correctCount: 0, earnedPoints: 0 },
    review: { label: "過去の間違い", activeStudySeconds: 0, questionCount: 0, correctCount: 0, earnedPoints: 0 }
  };
}

function getLearningHistoryEntryEarnedPoints(entry) {
  return parseLearningHistoryEarnedPoints(entry?.earnedPoints);
}

function accumulateLearningHistoryTotals(target, entry) {
  if (!target || !entry) return;
  target.activeStudySeconds += Math.max(0, Number(entry.activeStudySeconds) || 0);
  target.questionCount += Math.max(0, Number(entry.questionCount) || 0);
  target.correctCount += Math.max(0, Number(entry.correctCount) || 0);
  target.earnedPoints = Math.max(0, Number(target.earnedPoints) || 0) + getLearningHistoryEntryEarnedPoints(entry);
}

function finalizeLearningHistoryTotals(entry) {
  const questionCount = Math.max(0, Number(entry.questionCount) || 0);
  const correctCount = Math.max(0, Number(entry.correctCount) || 0);
  const earnedPoints = parseLearningHistoryEarnedPoints(entry.earnedPoints);
  return {
    ...entry,
    accuracy: questionCount ? Math.round((correctCount / questionCount) * 100) : 0,
    earnedPoints,
    activeStudyMinutes: Math.max(0, Math.round(Math.max(0, Number(entry.activeStudySeconds) || 0) / 60))
  };
}

function buildLearningHistoryInsights(entries) {
  const source = Array.isArray(entries) ? entries.slice().sort((a, b) => Number(b.endedAt || 0) - Number(a.endedAt || 0)) : [];
  const todayDayKey = getLearningHistoryDayKey(Date.now());
  const monthParts = getLearningHistoryJstParts(Date.now());
  const currentMonthKey = `${monthParts.year || "0000"}-${monthParts.month || "00"}`;
  const nowDate = new Date(Date.now());
  const todayUtcKey = Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate());

  const dayMap = new Map();
  source.forEach((entry) => {
    const dayKey = getLearningHistoryDayKey(entry.endedAt);
    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        dayKey,
        entries: [],
        activeStudySeconds: 0,
        questionCount: 0,
        correctCount: 0,
        earnedPoints: 0,
        modeTotals: createLearningHistoryModeTotals()
      });
    }
    const bucket = dayMap.get(dayKey);
    bucket.entries.push(entry);
    accumulateLearningHistoryTotals(bucket, entry);
    const modeBucket = getLearningHistoryModeBucket(entry);
    accumulateLearningHistoryTotals(ensureLearningHistoryModeTotal(bucket.modeTotals, modeBucket), entry);
  });

  const daySummaries = [...dayMap.values()].map((bucket) => finalizeLearningHistoryTotals(bucket));
  daySummaries.forEach((summary) => {
    Object.values(summary.modeTotals).forEach((modeEntry) => {
      modeEntry.accuracy = modeEntry.questionCount ? Math.round((modeEntry.correctCount / modeEntry.questionCount) * 100) : 0;
      modeEntry.activeStudyMinutes = Math.max(0, Math.round(modeEntry.activeStudySeconds / 60));
    });
  });

  const recentDaySummaries = daySummaries
    .filter((summary) => {
      const summaryDate = Date.UTC(Number(summary.dayKey.slice(0, 4)), Number(summary.dayKey.slice(5, 7)) - 1, Number(summary.dayKey.slice(8, 10)));
      const diffDays = Math.floor((todayUtcKey - summaryDate) / 86400000);
      return diffDays >= 0 && diffDays < 30;
    })
    .sort((left, right) => right.dayKey.localeCompare(left.dayKey))
    .slice(0, 7);

  const todayEntries = source.filter((entry) => getLearningHistoryDayKey(entry.endedAt) === todayDayKey);
  const todaySummary = finalizeLearningHistoryTotals({
    activeStudySeconds: 0,
    questionCount: 0,
    correctCount: 0,
    earnedPoints: 0,
    modeTotals: createLearningHistoryModeTotals()
  });
  todayEntries.forEach((entry) => {
    accumulateLearningHistoryTotals(todaySummary, entry);
    const modeBucket = getLearningHistoryModeBucket(entry);
    accumulateLearningHistoryTotals(ensureLearningHistoryModeTotal(todaySummary.modeTotals, modeBucket), entry);
  });
  Object.values(todaySummary.modeTotals).forEach((modeEntry) => {
    modeEntry.accuracy = modeEntry.questionCount ? Math.round((modeEntry.correctCount / modeEntry.questionCount) * 100) : 0;
    modeEntry.activeStudyMinutes = Math.max(0, Math.round(modeEntry.activeStudySeconds / 60));
  });
  todaySummary.dayKey = todayDayKey;
  todaySummary.label = formatLearningHistoryDateLabel(todayDayKey);
  todaySummary.accuracy = todaySummary.questionCount ? Math.round((todaySummary.correctCount / todaySummary.questionCount) * 100) : 0;
  todaySummary.activeStudyMinutes = Math.max(0, Math.round(todaySummary.activeStudySeconds / 60));

  const withinWeekEntries = source.filter((entry) => {
    const dayKey = getLearningHistoryDayKey(entry.endedAt);
    const summaryDate = Date.UTC(Number(dayKey.slice(0, 4)), Number(dayKey.slice(5, 7)) - 1, Number(dayKey.slice(8, 10)));
    const diffDays = Math.floor((todayUtcKey - summaryDate) / 86400000);
    return diffDays >= 0 && diffDays < 7;
  });
  const withinMonthEntries = source.filter((entry) => {
    const dayKey = getLearningHistoryDayKey(entry.endedAt);
    return dayKey.slice(0, 7) === currentMonthKey;
  });

  const buildPeriodTotals = (periodEntries) => {
    const periodSummary = finalizeLearningHistoryTotals({ activeStudySeconds: 0, questionCount: 0, correctCount: 0 });
    periodEntries.forEach((entry) => accumulateLearningHistoryTotals(periodSummary, entry));
    periodSummary.accuracy = periodSummary.questionCount ? Math.round((periodSummary.correctCount / periodSummary.questionCount) * 100) : 0;
    periodSummary.activeStudyMinutes = Math.max(0, Math.round(periodSummary.activeStudySeconds / 60));
    return periodSummary;
  };

  const weekSummary = buildPeriodTotals(withinWeekEntries);
  const monthSummary = buildPeriodTotals(withinMonthEntries);
  const uniqueSortedDayKeys = [...new Set(source.map((entry) => getLearningHistoryDayKey(entry.endedAt)).filter(Boolean))].sort((left, right) => right.localeCompare(left));
  let streak = 0;
  let expectedDayKey = todayDayKey;
  uniqueSortedDayKeys.forEach((dayKey) => {
    if (dayKey !== expectedDayKey) return;
    streak += 1;
    expectedDayKey = shiftLearningHistoryDayKey(expectedDayKey, -1);
  });

  return {
    todaySummary,
    recentDaySummaries,
    weekSummary,
    weekEntryCount: withinWeekEntries.length,
    monthSummary,
    monthEntryCount: withinMonthEntries.length,
    streak,
    dayMap,
    source
  };
}

function buildLearningHistoryDetailEntries(dayEntries) {
  return (Array.isArray(dayEntries) ? dayEntries : [])
    .slice()
    .sort((left, right) => Number(left.startedAt || left.endedAt || 0) - Number(right.startedAt || right.endedAt || 0));
}

function buildAdminLearningHistoryFamilyOptions(family) {
  const familyChildren = Array.isArray(family?.children) ? family.children : [];
  const sonEntry = familyChildren.find((child) => child?.key === "son" && child?.uid);
  const options = [];
  if (String(family?.parentUid || "").trim()) {
    options.push({ key: "parent", name: "私", uid: String(family.parentUid || "").trim() });
  }
  if (sonEntry?.uid) {
    options.push({ key: "son", name: "長男", uid: String(sonEntry.uid || "").trim() });
  }
  return options;
}

function getAdminLearningHistoryDeviceOptions() {
  if (isAdminLearningHistorySonSelected()) {
    return [
      { key: ADMIN_HISTORY_ALL_DEVICE_FILTER_KEY, label: "すべて" },
      { key: ADMIN_HISTORY_SON_PC_FILTER_KEY, label: "長男PC" },
      { key: ADMIN_HISTORY_SON_MOBILE_FILTER_KEY, label: "長男モバイル" },
      { key: ADMIN_HISTORY_SON_OTHER_FILTER_KEY, label: "その他" }
    ];
  }

  const source = Array.isArray(adminLearningHistorySourceEntries) ? adminLearningHistorySourceEntries : [];
  const options = [{ key: ADMIN_HISTORY_ALL_DEVICE_FILTER_KEY, label: "すべて" }];
  const deviceNameMap = buildAdminLearningHistoryDeviceNameMap(source);
  const byKey = new Map();
  source.forEach((entry) => {
    if (Math.max(0, Number(entry?.questionCount) || 0) <= 0) return;
    const key = getAdminLearningHistoryEntryDeviceFilterKey(entry, deviceNameMap);
    if (byKey.has(key)) return;
    byKey.set(key, {
      key,
      label: key === ADMIN_HISTORY_LEGACY_DEVICE_FILTER_KEY
        ? ADMIN_HISTORY_LEGACY_DEVICE_FILTER_LABEL
        : String(key).slice(ADMIN_HISTORY_NAMED_DEVICE_FILTER_PREFIX.length)
    });
  });
  const dynamicOptions = [...byKey.values()].sort((left, right) => {
    if (left.key === ADMIN_HISTORY_LEGACY_DEVICE_FILTER_KEY) return 1;
    if (right.key === ADMIN_HISTORY_LEGACY_DEVICE_FILTER_KEY) return -1;
    return String(left.label || "").localeCompare(String(right.label || ""), "ja");
  });
  return [...options, ...dynamicOptions];
}

function normalizeAdminLearningHistoryDeviceType(deviceType) {
  const normalized = String(deviceType || "").trim();
  if (!normalized) return ADMIN_HISTORY_ALL_DEVICE_FILTER_KEY;
  if (normalized === ADMIN_HISTORY_ALL_DEVICE_FILTER_KEY) return normalized;
  if (normalized === ADMIN_HISTORY_SON_PC_FILTER_KEY) return normalized;
  if (normalized === ADMIN_HISTORY_SON_MOBILE_FILTER_KEY) return normalized;
  if (normalized === ADMIN_HISTORY_SON_OTHER_FILTER_KEY) return normalized;
  if (normalized === ADMIN_HISTORY_LEGACY_DEVICE_FILTER_KEY) return normalized;
  if (normalized.startsWith(ADMIN_HISTORY_NAMED_DEVICE_FILTER_PREFIX)) return normalized;
  return normalizeAdminLearningHistoryDeviceFilterKey(normalized);
}

function getAdminLearningHistoryFilteredEntries(entries) {
  const source = Array.isArray(entries) ? entries : [];
  const deviceNameMap = buildAdminLearningHistoryDeviceNameMap(source);
  const sonSelected = isAdminLearningHistorySonSelected();
  return source.filter((entry) => {
    const selectedFilterKey = normalizeAdminLearningHistoryDeviceType(adminLearningHistorySelectedDeviceType);
    if (sonSelected) {
      const sonFilterKey = resolveAdminLearningHistorySonDeviceFilterKey(entry);
      if (selectedFilterKey !== ADMIN_HISTORY_ALL_DEVICE_FILTER_KEY && selectedFilterKey !== sonFilterKey) {
        return false;
      }
    } else {
      const deviceType = String(entry?.deviceType || "").trim().toLowerCase();
      // Default PC history view should not mix mobile sessions.
      if (selectedFilterKey === ADMIN_HISTORY_ALL_DEVICE_FILTER_KEY && deviceType === "mobile") {
        return false;
      }
      if (selectedFilterKey !== ADMIN_HISTORY_ALL_DEVICE_FILTER_KEY) {
        const entryFilterKey = getAdminLearningHistoryEntryDeviceFilterKey(entry, deviceNameMap);
        if (entryFilterKey !== selectedFilterKey) {
          return false;
        }
      }
    }
    if (Math.max(0, Number(entry?.questionCount) || 0) <= 0) {
      return false;
    }
    return true;
  });
}

function renderAdminLearningHistoryControls() {
  const userControls = adminLearningHistoryCanSelectFamily
    ? (() => {
      const userButtons = adminLearningHistoryFamilyChildren.length
        ? adminLearningHistoryFamilyChildren.map((child) => {
          const isSelected = child.key === adminLearningHistorySelectedChildKey;
          return `<button class="admin-history-toggle-btn${isSelected ? " is-active" : ""}" type="button" data-admin-history-user-key="${escapeHtml(child.key)}" aria-pressed="${isSelected ? "true" : "false"}">${escapeHtml(child.name || child.key)}</button>`;
        }).join("")
        : '<p class="empty-state">表示できるユーザーがありません</p>';
      return `
        <div class="admin-learning-history-user-row">
          <label class="subtext">ユーザー</label>
          <div class="admin-history-toggle-group" role="group" aria-label="表示するユーザー">${userButtons}</div>
        </div>
      `;
    })()
    : "";
  const deviceButtons = getAdminLearningHistoryDeviceOptions().map((device) => {
    const isSelected = device.key === adminLearningHistorySelectedDeviceType;
    return `<button class="admin-history-toggle-btn${isSelected ? " is-active" : ""}" type="button" data-admin-history-device-key="${escapeHtml(device.key)}" aria-pressed="${isSelected ? "true" : "false"}">${escapeHtml(device.label)}</button>`;
  }).join("");
  return `
    <div class="admin-learning-history-controls">
      ${userControls}
      <div class="admin-learning-history-device-row">
        <label class="subtext">端末</label>
        <div class="admin-history-toggle-group" role="group" aria-label="表示する端末">${deviceButtons}</div>
      </div>
    </div>
  `;
}

function bindAdminLearningHistoryControls() {
  const content = document.getElementById("adminLearningHistoryContent");
  if (!content) return;

  content.querySelectorAll("[data-admin-history-user-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextKey = String(button.getAttribute("data-admin-history-user-key") || "");
      const selectedChild = adminLearningHistoryFamilyChildren.find((child) => child.key === nextKey) || null;
      if (!selectedChild || selectedChild.key === adminLearningHistorySelectedChildKey) return;
      adminLearningHistorySelectedChildKey = selectedChild.key;
      adminLearningHistorySelectedChildUid = selectedChild.uid;
      adminLearningHistorySelectedDayKey = "";
      adminLearningHistorySourceEntries = [];
      renderAdminLearningHistoryHistoryWatch(selectedChild.uid, { allowOtherUser: adminLearningHistoryCanSelectFamily });
    });
  });

  content.querySelectorAll("[data-admin-history-device-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextKey = String(button.getAttribute("data-admin-history-device-key") || "");
      if (!nextKey || nextKey === adminLearningHistorySelectedDeviceType) return;
      adminLearningHistorySelectedDeviceType = normalizeAdminLearningHistoryDeviceType(nextKey);
      adminLearningHistorySelectedDayKey = "";
      renderAdminLearningHistoryEntries(adminLearningHistorySourceEntries);
    });
  });
}

function stopAdminLearningHistoryFirestoreListener() {
  stopAdminLearningHistoryHistoryListener();
  stopAdminLearningHistoryFamilyListener();
}

function resetAdminLearningHistorySelectionState() {
  adminLearningHistoryFamilyChildren = [];
  adminLearningHistorySelectedChildKey = "";
  adminLearningHistorySelectedChildUid = "";
  adminLearningHistoryCanSelectFamily = false;
  adminLearningHistorySelectedDeviceType = ADMIN_HISTORY_ALL_DEVICE_FILTER_KEY;
  adminLearningHistorySelectedDayKey = "";
  adminLearningHistorySourceEntries = [];
  setAdminLearningHistoryAccessState("", false);
}

function clearAdminLearningHistoryView() {
  const content = document.getElementById("adminLearningHistoryContent");
  const countText = document.getElementById("adminLearningHistoryCountText");
  if (content) {
    content.innerHTML = "";
  }
  if (countText) {
    countText.textContent = "";
  }
}

function resetAdminLearningHistoryAuthScope() {
  stopAdminLearningHistoryFirestoreListener();
  resetAdminLearningHistorySelectionState();
  clearAdminLearningHistoryView();
  if (currentScreenId === "adminLearningHistoryScreen") {
    openAdminLearningHistoryScreen();
  }
}

function getCurrentPcFirebaseUser() {
  if (typeof window.getFirebaseCurrentUser === "function") {
    const current = window.getFirebaseCurrentUser();
    if (current) return current;
  }
  if (window.PcFirebaseAuthState?.user) {
    return window.PcFirebaseAuthState.user;
  }
  return window.EnglishTrainerFirebase?.auth?.currentUser || null;
}

function shouldUseFirestoreForHomeMetrics() {
  return Boolean(String(getCurrentPcFirebaseUser()?.uid || "").trim());
}

function isFirestoreHomeHistoryEntryEligible(entry) {
  const deviceType = String(entry?.deviceType || "").trim().toLowerCase();
  return deviceType !== "mobile";
}

function stopHomeHistoryFirestoreSync() {
  if (typeof homeHistoryFirestoreUnsubscribe === "function") {
    homeHistoryFirestoreUnsubscribe();
  }
  homeHistoryFirestoreUnsubscribe = null;
  homeHistoryFirestoreEntries = [];
  homeHistoryFirestoreLoaded = false;
  homeHistoryFirestoreLoading = false;
}

function startHomeHistoryFirestoreSync() {
  const currentUid = String(getCurrentPcFirebaseUser()?.uid || "").trim();
  const watchFn = window.watchLearningHistoryEntriesFromFirestore;

  stopHomeHistoryFirestoreSync();
  if (!currentUid) {
    renderHomeMessage();
    return;
  }

  if (typeof watchFn !== "function") {
    homeHistoryFirestoreLoaded = true;
    homeHistoryFirestoreLoading = false;
    renderHomeMessage();
    return;
  }

  homeHistoryFirestoreLoading = true;
  homeHistoryFirestoreLoaded = false;
  renderHomeMessage();

  homeHistoryFirestoreUnsubscribe = watchFn(currentUid, {
    onUpdate: (entries) => {
      homeHistoryFirestoreEntries = (Array.isArray(entries) ? entries : []).filter(isFirestoreHomeHistoryEntryEligible);
      homeHistoryFirestoreLoaded = true;
      homeHistoryFirestoreLoading = false;
      renderHomeMessage();
    },
    onError: () => {
      homeHistoryFirestoreEntries = [];
      homeHistoryFirestoreLoaded = true;
      homeHistoryFirestoreLoading = false;
      renderHomeMessage();
    }
  }, {
    allowOtherUser: false
  });
}

function setAdminLearningHistoryAccessState(currentUid, canSelectFamily) {
  window.AdminLearningHistoryAccessState = {
    currentUid: String(currentUid || "").trim(),
    canSelectFamily: Boolean(canSelectFamily)
  };
}

function stopAdminLearningHistoryHistoryListener() {
  if (typeof adminLearningHistoryFirestoreUnsubscribe === "function") {
    adminLearningHistoryFirestoreUnsubscribe();
  }
  adminLearningHistoryFirestoreUnsubscribe = null;
}

function stopAdminLearningHistoryFamilyListener() {
  if (typeof adminLearningHistoryFamilyUnsubscribe === "function") {
    adminLearningHistoryFamilyUnsubscribe();
  }
  adminLearningHistoryFamilyUnsubscribe = null;
}

function renderAdminLearningHistoryState(message, options = {}) {
  const content = document.getElementById("adminLearningHistoryContent");
  if (!content) return;
  const countText = document.getElementById("adminLearningHistoryCountText");
  if (countText) {
    countText.textContent = options.countText || "";
  }
  content.innerHTML = `
    <div class="admin-learning-history-view">
      ${renderAdminLearningHistoryControls()}
      <p class="empty-state">${escapeHtml(message)}</p>
    </div>
  `;
  bindAdminLearningHistoryControls();
}

function renderAdminLearningHistoryHistoryWatch(targetUid, options = {}) {
  const watchFn = window.watchLearningHistoryEntriesFromFirestore;
  if (typeof watchFn !== "function") {
    renderAdminLearningHistoryState("履歴の取得に失敗しました", { countText: "履歴の取得に失敗しました" });
    return;
  }

  stopAdminLearningHistoryHistoryListener();
  adminLearningHistorySourceEntries = [];
  const loadToken = ++adminLearningHistoryFirestoreLoadToken;
  renderAdminLearningHistoryState("読み込み中...", { countText: "読み込み中..." });

  console.log("[AdminLearningHistory] watchLearningHistoryEntriesFromFirestore targetUid", targetUid);

  adminLearningHistoryFirestoreUnsubscribe = watchFn(targetUid, {
    onUpdate: (entries) => {
      if (loadToken !== adminLearningHistoryFirestoreLoadToken) return;
      adminLearningHistorySourceEntries = Array.isArray(entries) ? entries.slice() : [];
      console.log("[AdminLearningHistory] loaded entries count", adminLearningHistorySourceEntries.length);
      console.log(
        "[AdminLearningHistory] loaded entry owners and modes",
        adminLearningHistorySourceEntries.slice(0, 5).map((entry) => ({
          ownerUid: String(entry?.uid || entry?.ownerUid || entry?.userUid || ""),
          mode: String(entry?.mode || "")
        }))
      );
      renderAdminLearningHistoryEntries(entries);
    },
    onError: () => {
      if (loadToken !== adminLearningHistoryFirestoreLoadToken) return;
      adminLearningHistorySourceEntries = [];
      renderAdminLearningHistoryState("履歴の取得に失敗しました", { countText: "履歴の取得に失敗しました" });
    }
  }, options);
}

function renderAdminLearningHistoryFamilyWatch() {
  const watchFn = window.watchFamilyDocument;
  const currentUser = getCurrentPcFirebaseUser();
  const currentUid = String(currentUser?.uid || "").trim();
  if (!currentUid) {
    renderAdminLearningHistoryState("ログイン情報を確認してください", { countText: "ログイン情報を確認してください" });
    return;
  }
  if (typeof watchFn !== "function") {
    renderAdminLearningHistoryState("履歴の取得に失敗しました", { countText: "履歴の取得に失敗しました" });
    return;
  }

  stopAdminLearningHistoryFamilyListener();
  stopAdminLearningHistoryHistoryListener();
  const loadToken = ++adminLearningHistoryFamilyLoadToken;
  renderAdminLearningHistoryState("読み込み中...", { countText: "読み込み中..." });
  setAdminLearningHistoryAccessState(currentUid, false);

  console.log("[AdminLearningHistory] auth.currentUser.uid", currentUid);

  adminLearningHistoryFamilyUnsubscribe = watchFn("inoue", {
    onUpdate: (family) => {
      if (loadToken !== adminLearningHistoryFamilyLoadToken) return;
      const parentUid = String(family?.parentUid || "").trim();
      const isParentLogin = Boolean(parentUid && currentUid && parentUid === currentUid);
      const sonUid = String(family?.children?.son?.uid || "").trim();
      const isChildLogin = Boolean(sonUid && currentUid && sonUid === currentUid);

      console.log("[AdminLearningHistory] family.parentUid", parentUid);
      console.log("[AdminLearningHistory] family.children.son.uid", sonUid);
      console.log("[AdminLearningHistory] isParent", isParentLogin);
      console.log("[AdminLearningHistory] isChild", isChildLogin);

      if (isParentLogin) {
        const children = buildAdminLearningHistoryFamilyOptions(family);
        adminLearningHistoryCanSelectFamily = true;
        adminLearningHistoryFamilyChildren = children;
        setAdminLearningHistoryAccessState(currentUid, true);
        if (!children.length) {
          renderAdminLearningHistoryState("履歴の取得に失敗しました", { countText: "履歴の取得に失敗しました" });
          return;
        }
        const selectedChild = children.find((child) => child.key === adminLearningHistorySelectedChildKey)
          || children.find((child) => child.key === "son")
          || children.find((child) => child.key === "parent")
          || children[0];
        adminLearningHistorySelectedChildKey = selectedChild.key;
        adminLearningHistorySelectedChildUid = selectedChild.uid;
        console.log("[AdminLearningHistory] adminLearningHistorySelectedChildUid", adminLearningHistorySelectedChildUid);
        renderAdminLearningHistoryHistoryWatch(selectedChild.uid, { allowOtherUser: true });
        return;
      }

      adminLearningHistoryCanSelectFamily = false;
      setAdminLearningHistoryAccessState(currentUid, false);
      const selfEntry = { key: "self", name: "私", uid: currentUid };
      adminLearningHistoryFamilyChildren = [selfEntry];
      adminLearningHistorySelectedChildKey = selfEntry.key;
      adminLearningHistorySelectedChildUid = currentUid;
      console.log("[AdminLearningHistory] adminLearningHistorySelectedChildUid", adminLearningHistorySelectedChildUid);
      renderAdminLearningHistoryHistoryWatch(currentUid, { allowOtherUser: false });
    },
    onError: () => {
      if (loadToken !== adminLearningHistoryFamilyLoadToken) return;
      renderAdminLearningHistoryState("履歴の取得に失敗しました", { countText: "履歴の取得に失敗しました" });
    }
  });
}

function renderAdminLearningHistoryEntries(entries) {
  const content = document.getElementById("adminLearningHistoryContent");
  if (!content) return;
  const countText = document.getElementById("adminLearningHistoryCountText");
  const todayDayKey = getLearningHistoryDayKey(Date.now());
  const availableDeviceFilterKeys = new Set(getAdminLearningHistoryDeviceOptions().map((option) => String(option.key || "")));
  if (!availableDeviceFilterKeys.has(String(adminLearningHistorySelectedDeviceType || ""))) {
    adminLearningHistorySelectedDeviceType = ADMIN_HISTORY_ALL_DEVICE_FILTER_KEY;
  }

  const normalizedEntries = getAdminLearningHistoryFilteredEntries((Array.isArray(entries) ? entries : [])
    .slice()
    .sort((a, b) => Number(b.createdAt || b.endedAt || 0) - Number(a.createdAt || a.endedAt || 0)));

  if (countText) {
    countText.textContent = `${normalizedEntries.length}件`;
  }
  if (!normalizedEntries.length) {
    content.innerHTML = `
      <div class="admin-learning-history-view">
        ${renderAdminLearningHistoryControls()}
        <p class="empty-state">選択中のユーザーと端末の履歴はまだありません</p>
      </div>
    `;
    bindAdminLearningHistoryControls();
    return;
  }

  const model = buildLearningHistoryInsights(normalizedEntries);
  if (!adminLearningHistorySelectedDayKey || !/^\d{4}-\d{2}-\d{2}$/.test(adminLearningHistorySelectedDayKey) || adminLearningHistorySelectedDayKey > todayDayKey) {
    adminLearningHistorySelectedDayKey = todayDayKey;
  }

  const selectedDayKey = adminLearningHistorySelectedDayKey <= todayDayKey ? adminLearningHistorySelectedDayKey : todayDayKey;
  adminLearningHistorySelectedDayKey = selectedDayKey;
  const selectedDaySummary = getLearningHistoryDaySummary(model, selectedDayKey);
  const selectedDayEntries = buildLearningHistoryDetailEntries(selectedDaySummary?.entries || []);
  const nextDayKey = shiftLearningHistoryDayKey(selectedDayKey, 1);
  const canMoveNext = nextDayKey <= todayDayKey;
  const selectedDayHasEntries = selectedDayEntries.length > 0;

  content.innerHTML = `
    <div class="admin-learning-history-view">
      ${renderAdminLearningHistoryControls()}
      <section class="admin-history-overview">
        <div class="admin-history-streak-row">🔥連続${model.streak || 0}日</div>
        <div class="admin-history-period-grid">
          <div class="admin-history-period-block">
            <p class="admin-history-period-label">今週</p>
            <p class="admin-history-period-value">${formatLearningHistoryDuration(model.weekSummary.activeStudySeconds)}</p>
            <p class="admin-history-period-meta">${model.weekSummary.questionCount}問 ${model.weekSummary.accuracy}%</p>
            <div class="admin-history-mode-summary-list">
              ${renderLearningHistoryModeSummaryContent(model.weekSummary, {
                emptyMessage: "今週の学習記録がありません",
                hasEntries: Number(model.weekEntryCount) > 0
              })}
            </div>
          </div>
          <div class="admin-history-period-block">
            <p class="admin-history-period-label">今月</p>
            <p class="admin-history-period-value">${formatLearningHistoryDuration(model.monthSummary.activeStudySeconds)}</p>
            <p class="admin-history-period-meta">${model.monthSummary.questionCount}問 ${model.monthSummary.accuracy}%</p>
            <div class="admin-history-mode-summary-list">
              ${renderLearningHistoryModeSummaryContent(model.monthSummary, {
                emptyMessage: "今月の学習記録がありません",
                hasEntries: Number(model.monthEntryCount) > 0
              })}
            </div>
          </div>
        </div>
      </section>

      <section class="admin-history-today-section">
        <div class="admin-history-section-header">
          <h3>今日</h3>
        </div>
        <div class="admin-history-selected-summary">
          <div class="admin-history-mode-summary-list">
            ${renderLearningHistoryModeSummaryContent(model.todaySummary, {
              layout: "today",
              emptyMessage: "今日の学習記録がありません",
              dayEntries: model.todaySummary?.entries || []
            })}
          </div>
        </div>
      </section>

      <section class="admin-history-today-section">
        <div class="admin-history-date-switch">
          <div class="admin-history-date-title-wrap">
            <h3>📅 ${getLearningHistorySelectedDayTitle(selectedDayKey, todayDayKey)}</h3>
          </div>
          <div class="admin-history-date-nav">
            <button class="admin-history-date-nav-btn" type="button" data-day-shift="prev">◀ 前日</button>
            <button class="admin-history-date-nav-btn" type="button" data-day-shift="next"${canMoveNext ? "" : " disabled"}>▶ 次の日</button>
          </div>
        </div>
        <div class="admin-history-selected-summary">
          ${selectedDayHasEntries ? `
            <div class="admin-history-total-stats">
              <span>${formatLearningHistoryDuration(selectedDaySummary.activeStudySeconds)}</span>
              <span>${selectedDaySummary.questionCount}問</span>
              <span>+${Math.max(0, Number(selectedDaySummary.earnedPoints) || 0)}P</span>
              <span>${selectedDaySummary.accuracy}%</span>
            </div>
            <div class="admin-history-mode-summary-list">
              ${renderLearningHistoryModeSummaryContent(selectedDaySummary, {
                hasEntries: selectedDayHasEntries,
                dayEntries: selectedDaySummary?.entries || []
              })}
            </div>
          ` : '<p class="empty-state">この日は学習記録がありません</p>'}
        </div>
      </section>

      <section class="admin-history-detail-section">
        <div class="admin-history-section-header">
          <h3>日別詳細</h3>
          <p class="admin-history-detail-date">${formatLearningHistoryDateLabel(selectedDaySummary?.dayKey || selectedDayKey)}</p>
        </div>
        <article class="admin-history-card">
          <div class="admin-history-detail-list">
            ${selectedDayHasEntries ? (() => {
              const dayDetailFallbackCandidates = [...new Set(
                selectedDayEntries
                  .filter((row) => resolvePcLearningHistoryCategory(row?.mode, row) === "Day学習")
                  .map((row) => resolveLearningHistoryDayNumberForDisplay(row))
                  .filter((value) => value >= 1)
              )];
              const dayDetailFallbackDayNumber = dayDetailFallbackCandidates.length === 1
                ? dayDetailFallbackCandidates[0]
                : 0;
              return selectedDayEntries.map((entry) => {
              const completedLabel = entry.completedReason === "interrupted" ? "中断" : "完了";
              const activeStudySeconds = Math.max(0, Number(entry.activeStudySeconds) || 0);
              const modeLabel = resolvePcLearningHistoryModeLabel(entry, {
                withDayNumber: true,
                fallbackDayNumber: dayDetailFallbackDayNumber
              });
              const questionCount = Math.max(0, Number(entry.questionCount) || 0);
              const correctCount = Math.max(0, Math.min(questionCount, Number(entry.correctCount) || 0));
              const accuracyPercent = questionCount > 0
                ? Math.round((correctCount / questionCount) * 100)
                : Math.max(0, Number(entry.accuracy) || 0);
              const earnedPoints = parseLearningHistoryEarnedPoints(entry.earnedPoints);
              const startClock = formatLearningHistoryStartClock(entry.startedAt);
              return `
                <div class="admin-history-detail-item">
                  <p class="admin-history-detail-row admin-history-detail-row-main">
                    <span class="admin-history-detail-time">${startClock}〜</span>
                    <span class="admin-history-detail-mode">${escapeHtml(modeLabel)}</span>
                    <span class="admin-history-detail-meta">実学習${formatLearningHistoryDuration(activeStudySeconds)}</span>
                  </p>
                  <p class="admin-history-detail-row admin-history-detail-row-sub">
                    <span class="admin-history-detail-meta">${correctCount}/${questionCount}正解（${accuracyPercent}%）</span>
                    <span class="admin-history-detail-meta">+${earnedPoints}P</span>
                    <span class="admin-history-detail-meta">${completedLabel}</span>
                  </p>
                </div>
              `;
              }).join("<div class=\"admin-history-detail-separator\"></div>");
            })() : '<p class="empty-state">この日は学習記録がありません</p>'}
          </div>
        </article>
      </section>
    </div>
  `;

  bindAdminLearningHistoryControls();

  const moveAdminLearningHistoryDay = (deltaDays) => {
    const todayKey = getLearningHistoryDayKey(Date.now());
    const currentDayKey = /^\d{4}-\d{2}-\d{2}$/.test(String(adminLearningHistorySelectedDayKey || ""))
      ? String(adminLearningHistorySelectedDayKey)
      : todayKey;
    const shiftedDayKey = shiftLearningHistoryDayKey(currentDayKey, deltaDays);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(shiftedDayKey || ""))) return;
    adminLearningHistorySelectedDayKey = shiftedDayKey > todayKey ? todayKey : shiftedDayKey;
    renderAdminLearningHistoryEntries(adminLearningHistorySourceEntries);
  };

  content.querySelectorAll("[data-day-shift]").forEach((button) => {
    button.addEventListener("click", () => {
      const shift = button.getAttribute("data-day-shift");
      if (shift === "prev") {
        moveAdminLearningHistoryDay(-1);
      } else if (shift === "next" && canMoveNext) {
        moveAdminLearningHistoryDay(1);
      }
    });
  });
}

function renderAdminLearningHistoryList() {
  resetAdminLearningHistorySelectionState();
  renderAdminLearningHistoryFamilyWatch();
}

function openAdminLearningHistoryScreen() {
  showScreen("adminLearningHistoryScreen");
  renderAdminLearningHistoryList();
}

function bindAdminLearningHistoryAuthStateListener() {
  if (document.body?.dataset.adminLearningHistoryAuthBound === "true") return;
  document.addEventListener("pc-firebase-auth-state", () => {
    resetAdminLearningHistoryAuthScope();
  });
  if (document.body) {
    document.body.dataset.adminLearningHistoryAuthBound = "true";
  }
}

function bindHomeHistoryAuthStateListener() {
  if (document.body?.dataset.homeHistoryAuthBound === "true") return;
  document.addEventListener("pc-firebase-auth-state", () => {
    if (shouldUseFirestoreForHomeMetrics()) {
      startHomeHistoryFirestoreSync();
      ensurePointStateFromFirestoreIfMissing().then((didBootstrap) => {
        if (didBootstrap) {
          renderPointExchangeScreen();
        }
      });
      return;
    }
    stopHomeHistoryFirestoreSync();
    renderHomeMessage();
  });
  if (document.body) {
    document.body.dataset.homeHistoryAuthBound = "true";
  }
}

function appendLearningHistoryEntry(entry) {
  console.log("[LearningHistoryDebug] appendLearningHistoryEntry before sanitize", {
    entry,
    mode: String(entry?.mode || ""),
    questionCount: Number(entry?.questionCount),
    activeStudySeconds: Number(entry?.activeStudySeconds),
    startedAt: Number(entry?.startedAt),
    endedAt: Number(entry?.endedAt),
    createdAt: entry?.createdAt ?? null
  });
  const sanitized = sanitizeLearningHistoryEntry(entry);
  console.log("[LearningHistoryDebug] appendLearningHistoryEntry after sanitize", {
    entry: sanitized,
    mode: String(sanitized?.mode || ""),
    questionCount: Number(sanitized?.questionCount),
    activeStudySeconds: Number(sanitized?.activeStudySeconds),
    startedAt: Number(sanitized?.startedAt),
    endedAt: Number(sanitized?.endedAt),
    createdAt: sanitized?.createdAt ?? null
  });
  if (!sanitized) {
    return;
  }
  const deviceInfo = buildPcLearningHistoryDeviceInfo();
  const normalizedEntry = {
    ...sanitized,
    mode: normalizeLearningMode(sanitized.mode),
    deviceType: deviceInfo.deviceType,
    deviceId: String(deviceInfo.deviceId || "").trim(),
    deviceName: sanitizePcBrowserDeviceName(deviceInfo.deviceName)
  };
  if (Math.max(0, Number(sanitized.questionCount) || 0) === 0 || Math.max(0, Number(sanitized.activeStudySeconds) || 0) === 0) {
    console.log("[LearningHistoryDebug] appendLearningHistoryEntry stopped", {
      reason: Math.max(0, Number(sanitized.questionCount) || 0) === 0
        ? "questionCount === 0"
        : Math.max(0, Number(sanitized.activeStudySeconds) || 0) === 0
          ? "activeStudySeconds === 0"
          : "その他",
      entry: normalizedEntry,
      mode: String(normalizedEntry?.mode || ""),
      questionCount: Number(normalizedEntry?.questionCount),
      activeStudySeconds: Number(normalizedEntry?.activeStudySeconds),
      startedAt: Number(normalizedEntry?.startedAt),
      endedAt: Number(normalizedEntry?.endedAt),
      createdAt: normalizedEntry?.createdAt ?? null
    });
    return;
  }
  const history = loadLearningHistoryEntries();
  history.push(normalizedEntry);
  const storageKey = getScopedLocalStorageKey(LEARNING_HISTORY_STORAGE_KEY);
  if (storageKey) {
    localStorage.setItem(
      storageKey,
      JSON.stringify(history.slice(-LEARNING_HISTORY_MAX_ENTRIES))
    );
  }

  const saveToFirestore = window.saveLearningHistoryToFirestore;
  if (typeof saveToFirestore === "function") {
    console.log("[LearningHistoryDebug] saveLearningHistoryToFirestore before", {
      entry: normalizedEntry,
      mode: String(normalizedEntry?.mode || ""),
      questionCount: Number(normalizedEntry?.questionCount),
      activeStudySeconds: Number(normalizedEntry?.activeStudySeconds),
      startedAt: Number(normalizedEntry?.startedAt),
      endedAt: Number(normalizedEntry?.endedAt),
      createdAt: normalizedEntry?.createdAt ?? null
    });
    Promise.resolve(saveToFirestore(normalizedEntry))
      .then((result) => {
        console.log("[LearningHistoryDebug] saveLearningHistoryToFirestore success", {
          result,
          entry: normalizedEntry,
          mode: String(normalizedEntry?.mode || ""),
          questionCount: Number(normalizedEntry?.questionCount),
          activeStudySeconds: Number(normalizedEntry?.activeStudySeconds),
          startedAt: Number(normalizedEntry?.startedAt),
          endedAt: Number(normalizedEntry?.endedAt),
          createdAt: normalizedEntry?.createdAt ?? null
        });
      })
      .catch((error) => {
        console.log("[LearningHistoryDebug] saveLearningHistoryToFirestore failed", {
          error,
          entry: normalizedEntry,
          mode: String(normalizedEntry?.mode || ""),
          questionCount: Number(normalizedEntry?.questionCount),
          activeStudySeconds: Number(normalizedEntry?.activeStudySeconds),
          startedAt: Number(normalizedEntry?.startedAt),
          endedAt: Number(normalizedEntry?.endedAt),
          createdAt: normalizedEntry?.createdAt ?? null
        });
        console.error("Failed to save learning history to Firestore", error);
      });
  }
}

function recordInterruptedLearningHistory(sessionLike, summary) {
  if (!sessionLike || sessionLike.mode !== "normal") return;
  if (interruptedLearningHistorySessions.has(sessionLike)) return;
  interruptedLearningHistorySessions.add(sessionLike);
  appendLearningHistoryEntry(buildLearningHistoryEntryFromSession(sessionLike, summary || buildSuspendedSummary(sessionLike), "interrupted"));
}

function buildPrepositionLearningHistoryEntry(sessionLike, reason) {
  const endedAt = Date.now();
  const startedAt = Number(sessionLike?.startedAt) || endedAt;
  const answerCount = Math.max(0, Number(sessionLike?.answerCount) || 0);
  const correctCount = Math.max(0, Number(sessionLike?.correctCount) || 0);
  const accuracy = answerCount ? Math.round((correctCount / answerCount) * 100) : 0;
  const pointSummary = computeSessionEarnedPoints(sessionLike);
  return {
    learnedAt: formatTimestampToJstDisplay(endedAt),
    startedAt,
    endedAt,
    startedAtDisplay: formatTimestampToJstDisplay(startedAt),
    endedAtDisplay: formatTimestampToJstDisplay(endedAt),
    activeStudySeconds: computeSessionActiveStudySeconds(sessionLike, endedAt),
    mode: "preposition-training",
    dayNumber: "",
    questionCount: answerCount,
    correctCount,
    earnedPoints: pointSummary.earnedPoints,
    accuracy,
    completedReason: String(reason || "completed"),
    deviceType: "pc",
    deviceId: getPcBrowserDeviceId(),
    deviceName: getPcBrowserDeviceNameRaw(),
    ticket: computeLearningHistoryTicketDelta(
      sanitizeLearningHistoryTicketSnapshot(sessionLike?.ticketSnapshot),
      captureLearningHistoryTicketSnapshot()
    )
  };
}

function recordPrepositionLearningHistory(sessionLike, reason) {
  if (!sessionLike || typeof sessionLike !== "object") return;
  appendLearningHistoryEntry(buildPrepositionLearningHistoryEntry(sessionLike, reason));
}

function recordResponseLearningHistory(sessionLike, reason) {
  if (!sessionLike || typeof sessionLike !== "object") return;
  const answerCount = Math.max(0, Number(sessionLike?.answerCount) || 0);
  if (answerCount <= 0) return;
  const correctCount = Math.max(0, Number(sessionLike?.correctCount) || 0);
  const summary = {
    answerCount,
    correctCount,
    accuracy: answerCount ? Math.round((correctCount / answerCount) * 100) : 0
  };
  appendLearningHistoryEntry(buildLearningHistoryEntryFromSession(sessionLike, summary, reason));
}

function computeSessionEarnedPointsForLearningHistory(sessionLike) {
  const beforeRaw = String(sessionLike?.mode || "") === "normal"
    ? sessionLike?.historySegmentPointBalanceBefore
    : sessionLike?.pointBalanceBefore;
  const beforeBalance = Math.max(0, Math.floor(Number(beforeRaw) || 0));
  const currentBalance = Math.max(0, Math.floor(Number(getPointState().balance) || 0));
  return {
    earnedPoints: Math.max(0, currentBalance - beforeBalance),
    pointBalance: currentBalance
  };
}

function resolveLearningHistoryAnswerStats(sessionLike, summary, options = {}) {
  if (String(sessionLike?.mode || "") !== "normal") {
    const answerCount = Math.max(0, Number(summary?.answerCount) || 0);
    const correctCount = Math.max(0, Number(summary?.correctCount) || 0);
    return {
      questionCount: answerCount,
      correctCount,
      accuracy: answerCount ? Math.round((correctCount / answerCount) * 100) : 0
    };
  }

  const totalAnswerCount = Math.max(0, Number(sessionLike?.answerCount) || 0);
  const answerStartCount = Math.max(0, Number(options?.answerStartCount) || 0);
  const answerCount = Math.max(0, totalAnswerCount - answerStartCount);

  const answerHistory = Array.isArray(sessionLike?.answerHistory) ? sessionLike.answerHistory : [];
  const historyStartIndexRaw = Number(options?.answerHistoryStartIndex);
  const historyStartIndex = Number.isFinite(historyStartIndexRaw)
    ? Math.max(0, Math.floor(historyStartIndexRaw))
    : Math.max(0, answerStartCount);
  const correctCountFromHistory = answerHistory
    .slice(historyStartIndex)
    .filter((entry) => entry?.isCorrect)
    .length;
  const totalCorrectCount = answerHistory.filter((entry) => entry?.isCorrect).length;
  const correctStartCount = Math.max(0, Number(options?.correctStartCount) || 0);
  const correctCount = answerHistory.length
    ? Math.max(0, correctCountFromHistory)
    : Math.max(0, totalCorrectCount - correctStartCount);

  return {
    questionCount: answerCount,
    correctCount,
    accuracy: answerCount ? Math.round((correctCount / answerCount) * 100) : 0
  };
}

function completeResponseTrainingSession(reason) {
  const session = responseTrainingSession;
  if (!session) {
    if (reason === "completed") {
      openResponseTrainingSelector();
    }
    return;
  }
  if (!session.responseHistoryRecorded) {
    session.responseHistoryRecorded = true;
    recordResponseLearningHistory(session, reason);
  }
  const pointSummary = computeSessionEarnedPoints(session);
  responseTrainingSession = null;
  openTrainingCompleteScreen({
    mode: "response",
    earnedPoints: pointSummary.earnedPoints,
    pointBalance: pointSummary.pointBalance,
    interrupted: reason === "interrupted",
    showTicketAfter: true
  });
}

function buildLearningHistoryEntryFromSession(sessionLike, summary, reason) {
  const endedAt = Date.now();
  const learningHistoryMode = normalizeLearningMode(resolveLearningHistoryModeForSession(sessionLike));
  const segmentStartedAt = Number(sessionLike?.historySegmentStartedAt);
  const startedAt = Number.isFinite(segmentStartedAt) && segmentStartedAt > 0
    ? segmentStartedAt
    : Number(sessionLike?.startedAt) || endedAt;
  const answerStartCount = Math.max(0, Number(sessionLike?.historySegmentAnswerStartCount) || 0);
  const answerHistoryStartIndex = Math.max(0, Number(sessionLike?.historySegmentAnswerHistoryStartIndex) || 0);
  const correctStartCount = Math.max(0, Number(sessionLike?.historySegmentCorrectStartCount) || 0);
  const ticketBefore = sanitizeLearningHistoryTicketSnapshot(sessionLike?.ticketSnapshot);
  const ticketAfter = captureLearningHistoryTicketSnapshot();
  const pointSummary = computeSessionEarnedPointsForLearningHistory(sessionLike);
  const answerStats = resolveLearningHistoryAnswerStats(sessionLike, summary, {
    answerStartCount,
    answerHistoryStartIndex,
    correctStartCount
  });
  const answerDetails = buildLearningHistoryAnswerDetails(sessionLike, {
    answerHistoryStartIndex
  });
  return {
    learnedAt: formatTimestampToJstDisplay(endedAt),
    startedAt,
    endedAt,
    startedAtDisplay: formatTimestampToJstDisplay(startedAt),
    endedAtDisplay: formatTimestampToJstDisplay(endedAt),
    activeStudySeconds: computeSessionActiveStudySeconds(sessionLike, endedAt, {
      startAt: startedAt,
      answerHistoryStartIndex
    }),
    mode: learningHistoryMode,
    dayNumber: learningHistoryMode === LEARNING_MODE.DAY ? resolveLearningHistorySegmentDayNumber(sessionLike) : "",
    questionCount: answerStats.questionCount,
    correctCount: answerStats.correctCount,
    earnedPoints: pointSummary.earnedPoints,
    accuracy: Math.max(0, Math.min(100, Number(answerStats.accuracy) || 0)),
    completedReason: String(reason || "completed"),
    deviceType: "pc",
    deviceId: getPcBrowserDeviceId(),
    deviceName: getPcBrowserDeviceNameRaw(),
    answerDetails,
    ticket: computeLearningHistoryTicketDelta(ticketBefore, ticketAfter)
  };
}

function sanitizeGameTicketStats(value) {
  const source = value && typeof value === "object" ? value : {};
  const dailyGrantByMinutes = source.dailyGrantByMinutes && typeof source.dailyGrantByMinutes === "object"
    ? Object.fromEntries(Object.entries(source.dailyGrantByMinutes).map(([dayKey, dayCounts]) => {
      const normalized = dayCounts && typeof dayCounts === "object" ? dayCounts : {};
      const scopedTargetEntries = normalized.__scoped && typeof normalized.__scoped === "object"
        ? Object.fromEntries(Object.entries(normalized.__scoped).map(([targetKey, nested]) => {
          const scopedEntry = nested && typeof nested === "object" ? nested : {};
          const targetP = scopedEntry.targetP && typeof scopedEntry.targetP === "object" ? scopedEntry.targetP : {};
          return [String(targetKey), {
            targetP: {
              5: Math.max(0, Number(targetP[5]) || 0),
              15: Math.max(0, Number(targetP[15]) || 0),
              30: Math.max(0, Number(targetP[30]) || 0),
              60: Math.max(0, Number(targetP[60]) || 0)
            }
          }];
        }))
        : {};
      return [String(dayKey), {
        5: Math.max(0, Number(normalized[5]) || 0),
        15: Math.max(0, Number(normalized[15]) || 0),
        30: Math.max(0, Number(normalized[30]) || 0),
        60: Math.max(0, Number(normalized[60]) || 0),
        __scoped: Object.keys(scopedTargetEntries).length ? scopedTargetEntries : {}
      }];
    }))
    : {};
  return {
    inventory: Array.isArray(source.inventory)
      ? source.inventory.map(sanitizeGameTicketInventoryEntry).filter(Boolean)
      : [],
    dailyTrainingCount: Math.max(0, Number(source.dailyTrainingCount) || 0),
    dailyEarnedCount: Math.max(0, Number(source.dailyEarnedCount) || 0),
    normalWeakFocusCompletedCount: Math.max(0, Number(source.normalWeakFocusCompletedCount) || 0),
    normalWeakFocusFirstBonusGranted: Boolean(source.normalWeakFocusFirstBonusGranted),
    unsuccessfulEligibleDays: Math.max(0, Number(source.unsuccessfulEligibleDays) || 0),
    lastProcessedDate: typeof source.lastProcessedDate === "string" ? source.lastProcessedDate : "",
    streakBonusAwardedDays: Array.isArray(source.streakBonusAwardedDays)
      ? source.streakBonusAwardedDays.filter((entry) => typeof entry === "string" && entry)
      : [],
    earnedHistory: Array.isArray(source.earnedHistory)
      ? source.earnedHistory.map(sanitizeGameTicketEarnedHistoryEntry).filter(Boolean)
      : [],
    usageHistory: Array.isArray(source.usageHistory)
      ? source.usageHistory.map(sanitizeGameTicketUsageEntry).filter(Boolean)
      : [],
    pendingRewards: Array.isArray(source.pendingRewards)
      ? source.pendingRewards.map(sanitizeGameTicketRewardEntry).filter(Boolean)
      : [],
    shownRewardIds: Array.isArray(source.shownRewardIds)
      ? [...new Set(source.shownRewardIds.map((id) => String(id)).filter((id) => id))].slice(-200)
      : [],
    dailyGrantByMinutes,
    challengeTicketStateByDate: source.challengeTicketStateByDate && typeof source.challengeTicketStateByDate === "object"
      ? Object.fromEntries(
        Object.entries(source.challengeTicketStateByDate).map(([dayKey, dayState]) => [String(dayKey), sanitizeChallengeTicketDailyState(dayState)])
      )
      : {}
  };
}

function sanitizeUnlockedDayMax(value, items) {
  const dayValues = Array.isArray(items)
    ? items.map((item) => Number(item?.day)).filter((day) => Number.isFinite(day))
    : [];
  const minDay = dayValues.length ? Math.min(...dayValues) : 1;
  const maxDay = dayValues.length ? Math.max(...dayValues) : 1;
  const raw = Number(value);
  if (!Number.isFinite(raw)) return minDay;
  return Math.max(minDay, Math.min(maxDay, Math.round(raw)));
}

function toTenthsClamped(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, Math.round(numeric * 10) / 10));
}

function sanitizeTypingConfig(value) {
  const source = value && typeof value === "object" ? value : {};
  const repeatCount = Number(source.audioRepeatCount);
  const playbackRate = Number(source.audioPlaybackRate);
  return {
    audioRepeatCount: TYPING_AUDIO_REPEAT_OPTIONS.includes(repeatCount) ? repeatCount : TYPING_CONFIG_DEFAULTS.audioRepeatCount,
    audioPlaybackRate: TYPING_AUDIO_RATE_OPTIONS.includes(playbackRate) ? playbackRate : TYPING_CONFIG_DEFAULTS.audioPlaybackRate,
    questionToAudioDelaySec: toTenthsClamped(source.questionToAudioDelaySec, TYPING_CONFIG_DEFAULTS.questionToAudioDelaySec),
    repeatGapDelaySec: toTenthsClamped(source.repeatGapDelaySec, TYPING_CONFIG_DEFAULTS.repeatGapDelaySec),
    audioToInputDelaySec: toTenthsClamped(source.audioToInputDelaySec, TYPING_CONFIG_DEFAULTS.audioToInputDelaySec),
    judgementToNextDelaySec: toTenthsClamped(source.judgementToNextDelaySec, TYPING_CONFIG_DEFAULTS.judgementToNextDelaySec)
  };
}

function getTypingConfig() {
  state.settings.typingConfig = sanitizeTypingConfig(state.settings?.typingConfig);
  return state.settings.typingConfig;
}

function sanitizeTrainingCorrectChimePreset(value) {
  const candidate = String(value || "").trim();
  if (TRAINING_CORRECT_CHIME_PRESETS.some((preset) => preset.id === candidate)) {
    return candidate;
  }
  return TRAINING_CORRECT_CHIME_DEFAULT_PRESET;
}

function getTrainingCorrectChimePreset() {
  state.settings.trainingCorrectChimePreset = sanitizeTrainingCorrectChimePreset(state.settings?.trainingCorrectChimePreset);
  return state.settings.trainingCorrectChimePreset;
}

function getTrainingCorrectChimePresetById(id) {
  const safeId = sanitizeTrainingCorrectChimePreset(id);
  return TRAINING_CORRECT_CHIME_PRESETS.find((preset) => preset.id === safeId) || TRAINING_CORRECT_CHIME_PRESETS[0];
}

function playTrainingCorrectChime(sampleId = "") {
  const preset = getTrainingCorrectChimePresetById(sampleId || getTrainingCorrectChimePreset());
  const audioFile = String(preset.audioFile || "").trim();
  if (!audioFile || typeof Audio !== "function") return false;

  const audio = new Audio(`assets/sounds/${audioFile}`);
  audio.preload = "auto";
  audio.play().catch(() => {
    // Intentionally do nothing. This stage uses the raw MP3 only.
  });
  return true;
}

function applyTrainingCorrectChimePreset(presetId, options = {}) {
  const safePreset = sanitizeTrainingCorrectChimePreset(presetId);
  state.settings.trainingCorrectChimePreset = safePreset;
  saveState();

  const selectElement = options.selectElement || document.getElementById("trainingCorrectChimeSelect");
  if (selectElement) {
    selectElement.value = safePreset;
  }

  if (options.playSample !== false) {
    playTrainingCorrectChime(safePreset);
  }

  return safePreset;
}

function shouldPlayTrainingCorrectChimeForSession(sessionLike) {
  const mode = String(sessionLike?.mode || "").trim().toLowerCase();
  if (!mode) return false;
  if (mode === "normal" && sessionLike?.isDayStudySession) return true;
  if (mode === "review") return false;
  if (mode === "challenge") return true;
  return Boolean(getTrainingKindByMode(mode));
}

function typingDelaySecToMs(value) {
  return Math.round(toTenthsClamped(value, 0) * 1000);
}

function getTrainingKindByMode(mode) {
  const normalizedMode = String(mode || "").trim().toLowerCase();
  if (!normalizedMode) return "";
  return TRAINING_MODE_KIND_MAP[normalizedMode] || "";
}

function getPracticeCategoryByMode(mode) {
  return getTrainingKindByMode(mode) ? "training" : "day";
}

function toSafeDailyStatCount(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function createDefaultDailyStatsEntry() {
  return {
    totalAnswered: 0,
    dayAnswered: 0,
    trainingAnswered: 0,
    totalTyping: 0,
    dayTyping: 0,
    trainingTyping: 0,
    studySeconds: 0,
    dayStudySeconds: 0,
    trainingStudySeconds: 0,
    unknownLegacyAnswered: 0,
    unknownLegacyStudySeconds: 0,
    trainingByType: {}
  };
}

function sanitizeDailyStatsByDate(value) {
  const source = value && typeof value === "object" ? value : {};
  const result = {};

  Object.entries(source).forEach(([dayKey, entry]) => {
    if (!dayKey || !entry || typeof entry !== "object") return;
    const base = createDefaultDailyStatsEntry();
    base.totalAnswered = toSafeDailyStatCount(entry.totalAnswered);
    base.dayAnswered = toSafeDailyStatCount(entry.dayAnswered);
    base.trainingAnswered = toSafeDailyStatCount(entry.trainingAnswered);
    base.totalTyping = toSafeDailyStatCount(entry.totalTyping);
    base.dayTyping = toSafeDailyStatCount(entry.dayTyping);
    base.trainingTyping = toSafeDailyStatCount(entry.trainingTyping);
    base.studySeconds = toSafeDailyStatCount(entry.studySeconds);
    base.dayStudySeconds = toSafeDailyStatCount(entry.dayStudySeconds);
    base.trainingStudySeconds = toSafeDailyStatCount(entry.trainingStudySeconds);
    base.unknownLegacyAnswered = toSafeDailyStatCount(entry.unknownLegacyAnswered);
    base.unknownLegacyStudySeconds = toSafeDailyStatCount(entry.unknownLegacyStudySeconds);

    const trainingByType = entry.trainingByType && typeof entry.trainingByType === "object"
      ? entry.trainingByType
      : {};
    const normalizedTrainingByType = {};
    Object.entries(trainingByType).forEach(([kind, row]) => {
      if (!kind || !row || typeof row !== "object") return;
      normalizedTrainingByType[String(kind)] = {
        answered: toSafeDailyStatCount(row.answered),
        typing: toSafeDailyStatCount(row.typing),
        studySeconds: toSafeDailyStatCount(row.studySeconds)
      };
    });
    base.trainingByType = normalizedTrainingByType;

    if (!base.totalAnswered) {
      base.totalAnswered = Math.max(0, base.dayAnswered + base.trainingAnswered);
    }
    if (!base.totalTyping) {
      base.totalTyping = Math.max(0, base.dayTyping + base.trainingTyping);
    }
    if (!base.studySeconds) {
      base.studySeconds = Math.max(0, base.dayStudySeconds + base.trainingStudySeconds);
    }

    result[dayKey] = base;
  });

  return result;
}

function ensureDailyStatsEntry(dayKey) {
  state.stats.dailyStatsByDate = sanitizeDailyStatsByDate(state.stats.dailyStatsByDate);
  const legacyQuestionCount = Math.max(0, Number(state.stats?.dailyPerformanceByDate?.[dayKey]?.questionCount) || 0);
  const legacyStudySeconds = Math.max(0, Math.round((Number(state.stats?.studyTimeByDate?.[dayKey]) || 0) / 1000));
  if (!state.stats.dailyStatsByDate[dayKey]) {
    state.stats.dailyStatsByDate[dayKey] = {
      ...createDefaultDailyStatsEntry(),
      unknownLegacyAnswered: legacyQuestionCount,
      unknownLegacyStudySeconds: legacyStudySeconds
    };
  }
  const entry = state.stats.dailyStatsByDate[dayKey];
  const explicitAnswered = Math.max(0, Number(entry.dayAnswered) || 0) + Math.max(0, Number(entry.trainingAnswered) || 0);
  const explicitStudySeconds = Math.max(0, Number(entry.dayStudySeconds) || 0) + Math.max(0, Number(entry.trainingStudySeconds) || 0);
  const requiredUnknownAnswered = Math.max(0, legacyQuestionCount - explicitAnswered);
  const requiredUnknownStudySeconds = Math.max(0, legacyStudySeconds - explicitStudySeconds);
  if ((Number(entry.unknownLegacyAnswered) || 0) < requiredUnknownAnswered) {
    entry.unknownLegacyAnswered = requiredUnknownAnswered;
  }
  if ((Number(entry.unknownLegacyStudySeconds) || 0) < requiredUnknownStudySeconds) {
    entry.unknownLegacyStudySeconds = requiredUnknownStudySeconds;
  }
  return entry;
}

function recordCommonAnswerEvent(options = {}) {
  const dayKey = typeof options.dayKey === "string" && options.dayKey ? options.dayKey : todayKey();
  const category = options.category === "training" ? "training" : "day";
  const trainingKind = typeof options.trainingKind === "string" && options.trainingKind ? options.trainingKind : "";
  const typingCount = Math.max(0, Math.round(Number(options.typingCount) || 1));
  const entry = ensureDailyStatsEntry(dayKey);

  entry.totalAnswered += 1;
  entry.totalTyping += typingCount;
  if (category === "training") {
    entry.trainingAnswered += 1;
    entry.trainingTyping += typingCount;
    if (trainingKind) {
      entry.trainingByType[trainingKind] = entry.trainingByType[trainingKind] || {
        answered: 0,
        typing: 0,
        studySeconds: 0
      };
      entry.trainingByType[trainingKind].answered += 1;
      entry.trainingByType[trainingKind].typing += typingCount;
      entry[`${trainingKind}TrainingAnswered`] = (toSafeDailyStatCount(entry[`${trainingKind}TrainingAnswered`]) + 1);
    }
  } else {
    entry.dayAnswered += 1;
    entry.dayTyping += typingCount;
  }

  state.stats.totalSolvedQuestions = Math.max(0, Number(state.stats.totalSolvedQuestions) || 0) + 1;
  state.stats.totalAnsweredCount = Math.max(0, Number(state.stats.totalAnsweredCount) || 0) + 1;
  state.stats.totalTypingCount = Math.max(0, Number(state.stats.totalTypingCount) || 0) + typingCount;
  state.stats.solvedByDay[dayKey] = (state.stats.solvedByDay[dayKey] || 0) + 1;
}

function recordCommonStudySeconds(dayKey, seconds, options = {}) {
  const safeDayKey = typeof dayKey === "string" && dayKey ? dayKey : todayKey();
  const safeSeconds = Math.max(0, Math.round(Number(seconds) || 0));
  if (!safeSeconds) return;
  const category = options.category === "training" ? "training" : "day";
  const trainingKind = typeof options.trainingKind === "string" && options.trainingKind ? options.trainingKind : "";
  const entry = ensureDailyStatsEntry(safeDayKey);

  entry.studySeconds += safeSeconds;
  if (category === "training") {
    entry.trainingStudySeconds += safeSeconds;
    if (trainingKind) {
      entry.trainingByType[trainingKind] = entry.trainingByType[trainingKind] || {
        answered: 0,
        typing: 0,
        studySeconds: 0
      };
      entry.trainingByType[trainingKind].studySeconds += safeSeconds;
      entry[`${trainingKind}TrainingStudySeconds`] = toSafeDailyStatCount(entry[`${trainingKind}TrainingStudySeconds`]) + safeSeconds;
    }
  } else {
    entry.dayStudySeconds += safeSeconds;
  }
}

function showTrainingComingSoonNotice() {
  alert("準備中です");
}

function createDefaultTrainingProfiles() {
  return {};
}

function sanitizeTrainingProfiles(value) {
  const source = value && typeof value === "object" ? value : {};
  const result = {};

  Object.entries(source).forEach(([trainingKind, profile]) => {
    if (!trainingKind || !profile || typeof profile !== "object") return;
    const questions = profile.questions && typeof profile.questions === "object" ? profile.questions : {};
    const normalizedQuestions = {};
    Object.entries(questions).forEach(([questionId, row]) => {
      if (!questionId || !row || typeof row !== "object") return;
      const attempts = Math.max(0, Number(row.attempts) || 0);
      const correct = Math.max(0, Number(row.correct) || 0);
      const wrong = Math.max(0, Number(row.wrong) || 0);
      normalizedQuestions[String(questionId)] = {
        attempts,
        correct: Math.min(attempts, correct),
        wrong: Math.min(attempts, wrong),
        lastStudiedAt: Math.max(0, Number(row.lastStudiedAt) || 0)
      };
    });

    result[String(trainingKind)] = {
      attempts: Math.max(0, Number(profile.attempts) || 0),
      correct: Math.max(0, Number(profile.correct) || 0),
      wrong: Math.max(0, Number(profile.wrong) || 0),
      lastStudiedAt: Math.max(0, Number(profile.lastStudiedAt) || 0),
      byCategory: profile.byCategory && typeof profile.byCategory === "object" ? profile.byCategory : {},
      questions: normalizedQuestions
    };
  });

  return result;
}

function ensureTrainingProfile(trainingKind) {
  const safeTrainingKind = String(trainingKind || "").trim();
  if (!safeTrainingKind) return null;
  state.stats.trainingProfiles = sanitizeTrainingProfiles(state.stats.trainingProfiles);
  if (!state.stats.trainingProfiles[safeTrainingKind]) {
    state.stats.trainingProfiles[safeTrainingKind] = {
      attempts: 0,
      correct: 0,
      wrong: 0,
      lastStudiedAt: 0,
      byCategory: {},
      questions: {}
    };
  }
  return state.stats.trainingProfiles[safeTrainingKind];
}

function recordTrainingProfileAttempt(trainingKind, options = {}) {
  const profile = ensureTrainingProfile(trainingKind);
  if (!profile) return;
  const questionId = String(options.questionId || "").trim();
  const category = String(options.category || "").trim();
  const isCorrect = Boolean(options.isCorrect);
  const now = Date.now();

  profile.attempts += 1;
  if (isCorrect) {
    profile.correct += 1;
  } else {
    profile.wrong += 1;
  }
  profile.lastStudiedAt = now;

  if (category) {
    profile.byCategory[category] = profile.byCategory[category] || {
      attempts: 0,
      correct: 0,
      wrong: 0
    };
    profile.byCategory[category].attempts += 1;
    if (isCorrect) {
      profile.byCategory[category].correct += 1;
    } else {
      profile.byCategory[category].wrong += 1;
    }
  }

  if (questionId) {
    profile.questions[questionId] = profile.questions[questionId] || {
      attempts: 0,
      correct: 0,
      wrong: 0,
      lastStudiedAt: 0
    };
    profile.questions[questionId].attempts += 1;
    if (isCorrect) {
      profile.questions[questionId].correct += 1;
    } else {
      profile.questions[questionId].wrong += 1;
    }
    profile.questions[questionId].lastStudiedAt = now;
  }
}

function createDefaultPrepositionTrainingStats() {
  return {
    attempts: 0,
    correct: 0,
    wrong: 0,
    lastStudiedAt: 0,
    byPreposition: {},
    byQuestion: {}
  };
}

function sanitizePrepositionTrainingStats(value) {
  const source = value && typeof value === "object" ? value : {};
  const byPreposition = source.byPreposition && typeof source.byPreposition === "object" ? source.byPreposition : {};
  const byQuestion = source.byQuestion && typeof source.byQuestion === "object" ? source.byQuestion : {};
  const normalizedByPreposition = {};
  const normalizedByQuestion = {};

  Object.entries(byPreposition).forEach(([key, row]) => {
    if (!key || !row || typeof row !== "object") return;
    normalizedByPreposition[String(key).toLowerCase()] = {
      attempts: Math.max(0, Number(row.attempts) || 0),
      correct: Math.max(0, Number(row.correct) || 0),
      wrong: Math.max(0, Number(row.wrong) || 0)
    };
  });

  Object.entries(byQuestion).forEach(([key, row]) => {
    if (!key || !row || typeof row !== "object") return;
    normalizedByQuestion[String(key)] = {
      correct: Math.max(0, Number(row.correct) || 0),
      wrong: Math.max(0, Number(row.wrong) || 0),
      lastStudiedAt: Math.max(0, Number(row.lastStudiedAt) || 0)
    };
  });

  return {
    attempts: Math.max(0, Number(source.attempts) || 0),
    correct: Math.max(0, Number(source.correct) || 0),
    wrong: Math.max(0, Number(source.wrong) || 0),
    lastStudiedAt: Math.max(0, Number(source.lastStudiedAt) || 0),
    byPreposition: normalizedByPreposition,
    byQuestion: normalizedByQuestion
  };
}

function ensurePrepositionTrainingStats() {
  if (!state.stats) state.stats = {};
  state.stats.prepositionTraining = sanitizePrepositionTrainingStats(state.stats.prepositionTraining);
  return state.stats.prepositionTraining;
}

function getPrepositionMetaMap() {
  const source = window.prepositionTrainingMeta && typeof window.prepositionTrainingMeta === "object"
    ? window.prepositionTrainingMeta
    : {};
  const fallback = {
    icon: "●",
    coreImage: "位置関係",
    representative: []
  };
  const out = {};
  Object.entries(source).forEach(([key, value]) => {
    if (!key || !value || typeof value !== "object") return;
    out[String(key).toLowerCase()] = {
      icon: typeof value.icon === "string" && value.icon ? value.icon : fallback.icon,
      coreImage: typeof value.coreImage === "string" && value.coreImage ? value.coreImage : fallback.coreImage,
      representative: Array.isArray(value.representative)
        ? value.representative.filter((entry) => typeof entry === "string" && entry).slice(0, 3)
        : []
    };
  });
  return out;
}

function getPrepositionQuestionBank() {
  const source = Array.isArray(window.prepositionTrainingBank) ? window.prepositionTrainingBank : [];
  return source
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const preposition = String(row.preposition || "").trim().toLowerCase();
      const answer = String(row.answer || "").trim().toLowerCase();
      const sentence = String(row.sentence || "").trim();
      const question = String(row.question || "").trim();
      if (!preposition || !answer || !sentence || !question) return null;
      return {
        id: String(row.id || ""),
        preposition,
        sentence,
        question,
        answer,
        translation: String(row.translation || "").trim(),
        contextImage: String(row.contextImage || "").trim(),
        sourceDay: Number.isFinite(Number(row.sourceDay)) ? Number(row.sourceDay) : null,
        category: row.category === "fixedPhrase" ? "fixedPhrase" : "core",
        audioFile: typeof row.audioFile === "string" ? row.audioFile : ""
      };
    })
    .filter(Boolean);
}

function getResponseTrainingCategoryLabel(category) {
  return String(category || "").trim() || "その他";
}

function normalizeResponseInput(raw) {
  return String(raw || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+/g, " ");
}

function normalizeResponseWhLeadingCase(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  const tokens = value.split(" ").filter(Boolean);
  if (!tokens.length) return "";
  const head = tokens[0].toLowerCase();
  const canonicalMap = {
    what: "What",
    when: "When",
    where: "Where",
    who: "Who",
    why: "Why",
    how: "How"
  };
  if (canonicalMap[head]) {
    tokens[0] = canonicalMap[head];
  }
  return tokens.join(" ");
}

function dedupeStringList(values) {
  const out = [];
  const seen = new Set();
  values.forEach((value) => {
    const key = String(value || "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  });
  return out;
}

function normalizeResponseBlankMarkers(text) {
  return String(text || "").replace(/\(\s*[　 ]*\)/g, "(      )");
}

function countResponseBlanks(text) {
  const normalized = normalizeResponseBlankMarkers(text);
  return (normalized.match(/\(\s{6}\)/g) || []).length;
}

function buildRepeatedBlankTokens(count) {
  return Array.from({ length: Math.max(1, count) }, () => "(      )").join("");
}

function deriveResponseAnswerSpec(rawAnswers, questionText, responseText) {
  const rawList = dedupeStringList((Array.isArray(rawAnswers) ? rawAnswers : []).map((value) => String(value || "").trim()));
  const normalizedList = dedupeStringList(rawList.map((value) => normalizeResponseWhLeadingCase(normalizeResponseInput(value))).filter(Boolean));
  if (!normalizedList.length) {
    return {
      canonicalAnswer: "",
      acceptedAnswers: [],
      canonicalTokens: [],
      questionPrompt: normalizeResponseBlankMarkers(questionText),
      responsePrompt: normalizeResponseBlankMarkers(responseText)
    };
  }

  const questionPromptBase = normalizeResponseBlankMarkers(questionText);
  const responsePromptBase = normalizeResponseBlankMarkers(responseText);
  const questionBlankCount = countResponseBlanks(questionPromptBase);
  const responseBlankCount = countResponseBlanks(responsePromptBase);
  const totalBlankCount = questionBlankCount + responseBlankCount;

  const normalizedRawTokens = rawList.map((value) => normalizeResponseWhLeadingCase(normalizeResponseInput(value))).filter(Boolean);
  const allSingleTokenInputs = rawList.length > 1 && rawList.every((value) => !/\s/.test(value));
  const isTokenSequence = allSingleTokenInputs && (
    (totalBlankCount >= 2 && rawList.length === totalBlankCount) ||
    (totalBlankCount === 1)
  );
  const canonicalAnswer = isTokenSequence
    ? normalizedRawTokens.join(" ")
    : normalizedList[0];
  const canonicalTokens = canonicalAnswer.split(" ").filter(Boolean);
  const acceptedAnswers = isTokenSequence ? [canonicalAnswer] : normalizedList;

  let responsePrompt = responsePromptBase;
  if (questionBlankCount === 0 && responseBlankCount === 1 && canonicalTokens.length > 1) {
    responsePrompt = responsePromptBase.replace(/\(\s{6}\)/, buildRepeatedBlankTokens(canonicalTokens.length));
  }

  return {
    canonicalAnswer,
    acceptedAnswers,
    canonicalTokens,
    questionPrompt: questionPromptBase,
    responsePrompt
  };
}

function getResponseTopicBadgeLabel(question) {
  const topic = String(question.topic || question.title || getResponseTrainingCategoryLabel(question.category));
  if (topic.startsWith("be動詞")) return `🟦 ${topic}`;
  if (topic.startsWith("一般動詞")) return `🟩 ${topic}`;
  if (topic.startsWith("助動詞")) return `🟪 ${topic}`;
  if (topic.startsWith("現在進行形")) return `🟨 ${topic}`;
  if (topic.startsWith("比較")) return `🟧 ${topic}`;
  if (String(question.category || "").startsWith("疑問詞")) return `🟥 ${topic}`;
  return `⬜ ${topic}`;
}

function getResponseTopicToneClass(question) {
  const topic = String(question.topic || "");
  const category = String(question.category || "");
  if (topic.startsWith("be動詞")) return "response-topic-be";
  if (topic.startsWith("一般動詞")) return "response-topic-general";
  if (topic.startsWith("助動詞")) return "response-topic-modal";
  if (category.startsWith("疑問詞")) return "response-topic-wh";
  if (topic.startsWith("現在進行形")) return "response-topic-progressive";
  if (topic.startsWith("比較")) return "response-topic-comparison";
  return "response-topic-other";
}

function getResponseQuestionBank() {
  const source = Array.isArray(window.responseTrainingBank) ? window.responseTrainingBank : [];
  const seenIds = new Set();
  return source
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const id = String(row.id || "").trim();
      if (!id || seenIds.has(id)) return null;
      seenIds.add(id);
      const category = String(row.category || "").trim();
      const topic = String(row.topic || row.title || "").trim();
      const question = String(row.question || "").trim();
      const response = String(row.response || "").trim();
      const completedResponse = String(row.completedResponse || "").trim();
      const translationQuestion = String(row.translationQuestion || "").trim();
      const translationAnswer = String(row.translationAnswer || "").trim();
      const point = String(row.point || "").trim();
      const answerList = Array.isArray(row.answer)
        ? row.answer.map((value) => String(value || "").trim()).filter(Boolean)
        : [];
      const answerSpec = deriveResponseAnswerSpec(answerList, question, response);
      if (
        !id ||
        !category ||
        !topic ||
        !question ||
        !response ||
        !completedResponse ||
        !translationQuestion ||
        !translationAnswer ||
        !point ||
        !answerSpec.canonicalAnswer ||
        !answerSpec.acceptedAnswers.length
      ) return null;
      return {
        id,
        category,
        topic,
        question,
        response,
        completedResponse,
        answerSpec,
        translationQuestion,
        translationAnswer,
        point
      };
    })
    .filter(Boolean);
}

function openResponseTrainingSelector() {
  startResponseTraining("all");
}

function openIrregularVerbTrainingSelector() {
  irregularVerbSelectedMode = "training";
  showScreen("irregularVerbSelectScreen");
}

function buildIrregularVerbReviewQuestions(bank, reviewQuestionIds, stats) {
  const reviewPool = Array.isArray(reviewQuestionIds)
    ? reviewQuestionIds.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  if (!reviewPool.length) return [];
  const filteredBank = bank.filter((question) => reviewPool.includes(String(question.id)));
  const targetCount = Math.min(filteredBank.length, 10);
  const weightedCandidates = weightedSampleWithoutReplacementByWeight(
    filteredBank,
    targetCount,
    (question) => getTrainingQuestionWeight("irregular-verb", question?.id)
  );
  return irregularVerbs.buildIrregularVerbQuestionSet(weightedCandidates, targetCount, {
    stats,
    preferredQuestionIds: reviewPool
  });
}

function getIrregularVerbQuestionBank() {
  const source = Array.isArray(window.irregularVerbTrainingBank) ? window.irregularVerbTrainingBank : [];
  const seenIds = new Set();
  return source
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const id = String(row.id || row.base || "").trim();
      if (!id || seenIds.has(id)) return null;
      seenIds.add(id);
      const base = String(row.base || "").trim();
      const past = Array.isArray(row.past) ? row.past.map((value) => String(value || "").trim()).filter(Boolean) : String(row.past || "").trim();
      const pastParticiple = Array.isArray(row.pastParticiple) ? row.pastParticiple.map((value) => String(value || "").trim()).filter(Boolean) : String(row.pastParticiple || "").trim();
      const japanese = String(row.japanese || row.meaning || "").trim();
      if (!base || !past || !pastParticiple || !japanese) return null;
      return {
        id,
        base,
        past,
        pastParticiple,
        japanese
      };
    })
    .filter(Boolean);
}

function startIrregularVerbTraining(form = "past", mode = irregularVerbSelectedMode || "training") {
  const bank = getIrregularVerbQuestionBank();
  const plan = irregularVerbs.getIrregularVerbSessionPlan(mode, form);
  const stats = state?.stats?.trainingProfiles?.["irregular-verb"]?.questions || {};
  const weightedCandidates = weightedSampleWithoutReplacementByWeight(
    bank,
    Math.min(plan.questionCount, bank.length),
    (question) => getTrainingQuestionWeight("irregular-verb", question?.id)
  );
  const questions = irregularVerbs.buildIrregularVerbQuestionSet(weightedCandidates, plan.questionCount, {
    stats
  });
  if (!questions.length) {
    alert("出題可能な不規則動詞問題がありません。");
    return;
  }
  const startedAt = Date.now();
  irregularVerbTrainingSession = {
    mode: plan.mode,
    form: plan.form,
    planLabel: plan.label,
    questionCount: plan.questionCount,
    startedAt,
    answerHistory: [],
    answerCount: 0,
    correctCount: 0,
    questions,
    currentIndex: 0,
    answered: false,
    awaitingCorrectionRetry: false,
    wrongQuestionIds: [],
    reviewMode: false,
    reviewQuestionIds: [],
    ticketSnapshot: captureLearningHistoryTicketSnapshot(),
    pointBalanceBefore: Math.max(0, Math.floor(Number(getPointState().balance) || 0))
  };
  renderIrregularVerbQuestion();
  showScreen("irregularVerbPracticeScreen");
}

function speakIrregularVerbText(text, options = {}) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) return false;
  try {
    if (options.cancelPrevious !== false) {
      window.speechSynthesis.cancel();
    }
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    if (typeof options.onEnd === "function") {
      utterance.onend = () => options.onEnd();
      utterance.onerror = () => options.onEnd();
    }
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (error) {
    console.warn("Irregular verb speech failed", error);
    return false;
  }
}

function speakIrregularVerbTextSequence(texts, options = {}) {
  const queue = (Array.isArray(texts) ? texts : []).map((text) => String(text || "").trim()).filter(Boolean);
  if (!queue.length) return false;
  const gapMs = Math.max(0, Number(options.gapMs) || 0);

  let index = 0;
  const speakNext = () => {
    if (index >= queue.length) {
      if (typeof options.onEnd === "function") {
        options.onEnd();
      }
      return;
    }

    const currentText = queue[index];
    index += 1;
    const isFirst = index === 1;
    const triggerNext = () => {
      if (gapMs > 0 && index < queue.length) {
        setTimeout(speakNext, gapMs);
        return;
      }
      speakNext();
    };
    const spoke = speakIrregularVerbText(currentText, {
      cancelPrevious: isFirst,
      onEnd: triggerNext
    });
    if (!spoke) {
      triggerNext();
    }
  };

  speakNext();
  return true;
}

function speakIrregularVerbQuestionSequence(question) {
  const base = String(question?.base || "").trim();
  if (!base) return;
  speakIrregularVerbText(base);
}

function speakIrregularVerbAnswerSequence(question, pastText, participleText, options = {}) {
  const base = String(question?.base || "").trim();
  const past = String(pastText || "").trim();
  const participle = String(participleText || "").trim();
  const normalizeSpeechText = (text) => String(text || "").replace(/\s*\/\s*/g, " or ").replace(/\s+/g, " ").trim();
  const sequence = [normalizeSpeechText(base), normalizeSpeechText(past), normalizeSpeechText(participle)].filter(Boolean);
  if (!sequence.length) return false;
  return speakIrregularVerbTextSequence(sequence, {
    ...options,
    gapMs: 5
  });
}

function renderIrregularVerbQuestion() {
  const session = irregularVerbTrainingSession;
  if (!session) {
    showScreen("irregularVerbSelectScreen");
    return;
  }
  if (session.currentIndex >= session.questions.length) {
    showIrregularVerbTrainingResult();
    return;
  }

  const title = document.getElementById("irregularVerbPracticeTitle");
  const promptText = document.getElementById("irregularVerbPromptText");
  const counterText = document.getElementById("irregularVerbCounterText");
  const questionText = document.getElementById("irregularVerbQuestionText");
  const hintText = document.getElementById("irregularVerbHintText");
  const answerInput = document.getElementById("irregularVerbAnswerInput");
  const answerBtn = document.getElementById("irregularVerbAnswerBtn");
  const feedbackBox = document.getElementById("irregularVerbFeedbackBox");
  const nextBtn = document.getElementById("irregularVerbNextBtn");
  if (!title || !promptText || !counterText || !questionText || !hintText || !answerInput || !answerBtn || !feedbackBox || !nextBtn) return;

  const currentQuestion = session.questions[session.currentIndex];
  const modeLabel = session.reviewMode ? "復習" : session.mode === "test" ? "テスト" : "特訓";
  title.textContent = `不規則動詞特訓 ${modeLabel}`;
  promptText.textContent = `不規則動詞特訓 ${modeLabel}`;
  counterText.textContent = `${session.currentIndex + 1} / ${session.questions.length}`;
  questionText.textContent = `${currentQuestion.japanese}（${currentQuestion.base}）`;
  hintText.textContent = "過去形と過去分詞を半角スペースで入力";
  answerInput.value = "";
  answerInput.placeholder = "例: went gone";
  answerInput.disabled = false;
  answerBtn.disabled = false;
  feedbackBox.className = "feedback-box hidden";
  feedbackBox.innerHTML = "";
  nextBtn.disabled = false;
  nextBtn.classList.add("hidden");
  session.answered = false;
  session.awaitingCorrectionRetry = false;
  session.questionStartedAt = Date.now();
  window.setTimeout(() => {
    answerInput.focus();
    speakIrregularVerbQuestionSequence(currentQuestion);
  }, 120);
}

function submitIrregularVerbAnswer() {
  const session = irregularVerbTrainingSession;
  if (!session || session.answered) return;
  const currentQuestion = session.questions[session.currentIndex];
  if (!currentQuestion) return;
  const isCorrectionRetryAttempt = Boolean(session.awaitingCorrectionRetry);

  const answerInput = document.getElementById("irregularVerbAnswerInput");
  const answerBtn = document.getElementById("irregularVerbAnswerBtn");
  const feedbackBox = document.getElementById("irregularVerbFeedbackBox");
  const nextBtn = document.getElementById("irregularVerbNextBtn");
  if (!answerInput || !answerBtn || !feedbackBox || !nextBtn) return;

  const raw = String(answerInput.value || "");
  const trimmed = raw.trim();
  if (!trimmed) {
    feedbackBox.className = "feedback-box error";
    feedbackBox.innerHTML = "<strong>入力してください</strong><span class=\"hint\">英語で入力してください</span>";
    answerInput.focus();
    return;
  }

  recordCommonAnswerEvent({
    dayKey: todayKey(),
    category: "training",
    trainingKind: "irregular-verb",
    typingCount: 1
  });

  const startedAt = Number(session.questionStartedAt);
  if (Number.isFinite(startedAt) && Date.now() > startedAt) {
    const elapsedMs = Date.now() - startedAt;
    const elapsedSeconds = elapsedMs > 0 ? Math.max(1, Math.ceil(elapsedMs / 1000)) : 0;
    recordCommonStudySeconds(todayKey(), elapsedSeconds, {
      category: "training",
      trainingKind: "irregular-verb"
    });
  }

  const isCorrect = irregularVerbs.evaluateIrregularVerbAnswer(currentQuestion, "combined", trimmed);
  const answeredAt = Date.now();
  session.answerHistory.push({ at: answeredAt, isCorrect, questionId: currentQuestion.id });
  session.answerCount += 1;
  session.answered = true;
  if (isCorrect) {
    session.correctCount += 1;
    if (!session.reviewMode) {
      awardPointsForTrainingMode("irregular-verb");
    }
    if (!isCorrectionRetryAttempt) {
      playTrainingCorrectChime();
    }
  } else {
    session.wrongQuestionIds.push(String(currentQuestion.id));
  }

  recordTrainingProfileAttempt("irregular-verb", {
    questionId: currentQuestion.id,
    category: session.form,
    isCorrect
  });
  saveState();

  const correctPastValues = Array.isArray(currentQuestion?.past) ? currentQuestion.past : [currentQuestion?.past];
  const correctParticipleValues = Array.isArray(currentQuestion?.pastParticiple) ? currentQuestion.pastParticiple : [currentQuestion?.pastParticiple];
  const correctPastText = correctPastValues.filter(Boolean).map((value) => String(value || "").trim()).filter(Boolean).join(" / ");
  const correctParticipleText = correctParticipleValues.filter(Boolean).map((value) => String(value || "").trim()).filter(Boolean).join(" / ");
  const expectedAnswerText = `${correctPastText || ""} ${correctParticipleText || ""}`.trim();
  const userAnswerDiffMarkup = `<div class="answer-line">あなたの答え：${buildAnswerDiffMarkup(trimmed, expectedAnswerText)}</div>`;
  const alternateFormHint = correctPastText && correctParticipleText && (correctPastText.includes(" / ") || correctParticipleText.includes(" / "))
    ? `<div class="hint">もう1つの形：${escapeHtml(`${currentQuestion.base} → ${correctPastText} → ${correctParticipleText}`)}</div>`
    : "";

  if (session.awaitingCorrectionRetry) {
    if (!isCorrect) {
      session.answered = false;
      feedbackBox.className = "feedback-box error";
      feedbackBox.innerHTML = `<strong>❌ もう一度入力してください</strong>${userAnswerDiffMarkup}<div class="answer-line">正解：${escapeHtml(expectedAnswerText)}</div><div class="hint">正しい形を入力すると音声が流れて次の問題へ進みます</div>`;
      answerInput.focus();
      answerInput.select();
      return;
    }

    session.awaitingCorrectionRetry = false;
    session.answered = true;
    feedbackBox.className = "feedback-box success";
    feedbackBox.innerHTML = `<strong>✅ 入力できました</strong><div class="answer-line">${escapeHtml(`${currentQuestion.base} → ${correctPastText} → ${correctParticipleText}`)}</div>${alternateFormHint}`;
    answerInput.disabled = true;
    answerBtn.disabled = true;
    nextBtn.classList.add("hidden");

    const typingConfig = getTypingConfig();
    const fallbackDelayMs = Math.max(typingDelaySecToMs(typingConfig.judgementToNextDelaySec), 900);
    let advanced = false;
    const advanceOnce = () => {
      if (advanced) return;
      advanced = true;
      moveToNextIrregularVerbQuestion();
    };

    const spoke = speakIrregularVerbAnswerSequence(currentQuestion, correctPastText, correctParticipleText, {
      onEnd: advanceOnce
    });
    if (!spoke) {
      setTimeout(advanceOnce, fallbackDelayMs);
    }
    return;
  }

  feedbackBox.className = `feedback-box ${isCorrect ? "success" : "error"}`;
  feedbackBox.innerHTML = isCorrect
    ? `<strong>✅ 正解</strong><div class="answer-line">${escapeHtml(`${currentQuestion.base} → ${correctPastText} → ${correctParticipleText}`)}</div>${alternateFormHint}`
    : `<strong>❌ 不正解</strong>${userAnswerDiffMarkup}<div class="answer-line">正解：${escapeHtml(expectedAnswerText)}</div>`;
  if (isCorrect) {
    speakIrregularVerbAnswerSequence(currentQuestion, correctPastText, correctParticipleText);
  } else {
    session.awaitingCorrectionRetry = true;
    session.answered = false;
    answerInput.value = "";
    answerInput.disabled = false;
    answerBtn.disabled = false;
    feedbackBox.innerHTML = `<strong>❌ 不正解</strong>${userAnswerDiffMarkup}<div class="answer-line">正解：${escapeHtml(expectedAnswerText)}</div><div class="hint">正しい形を入力すると音声が流れて次の問題へ進みます</div>`;
    answerInput.focus();
    nextBtn.classList.add("hidden");
    saveState();
    return;
  }
  nextBtn.classList.remove("hidden");
  nextBtn.disabled = false;
  answerInput.disabled = true;
  answerBtn.disabled = true;
  nextBtn.focus();
}

function moveToNextIrregularVerbQuestion() {
  if (!irregularVerbTrainingSession) return;
  const nextBtn = document.getElementById("irregularVerbNextBtn");
  if (nextBtn) nextBtn.disabled = true;
  const typingConfig = getTypingConfig();
  setTimeout(() => {
    if (!irregularVerbTrainingSession) return;
    irregularVerbTrainingSession.currentIndex += 1;
    if (irregularVerbTrainingSession.currentIndex >= irregularVerbTrainingSession.questions.length) {
      showIrregularVerbTrainingResult();
      return;
    }
    renderIrregularVerbQuestion();
  }, typingDelaySecToMs(typingConfig.judgementToNextDelaySec));
}

function buildIrregularVerbLearningHistoryEntry(sessionLike, reason) {
  const endedAt = Date.now();
  const startedAt = Number(sessionLike?.startedAt) || endedAt;
  const answerCount = Math.max(0, Number(sessionLike?.answerCount) || 0);
  const correctCount = Math.max(0, Number(sessionLike?.correctCount) || 0);
  const accuracy = answerCount ? Math.round((correctCount / answerCount) * 100) : 0;
  const pointSummary = computeSessionEarnedPoints(sessionLike);
  return {
    learnedAt: formatTimestampToJstDisplay(endedAt),
    startedAt,
    endedAt,
    startedAtDisplay: formatTimestampToJstDisplay(startedAt),
    endedAtDisplay: formatTimestampToJstDisplay(endedAt),
    activeStudySeconds: computeSessionActiveStudySeconds(sessionLike, endedAt),
    mode: "irregular-verb-training",
    dayNumber: "",
    questionCount: answerCount,
    correctCount,
    earnedPoints: pointSummary.earnedPoints,
    accuracy,
    completedReason: String(reason || "completed"),
    deviceType: "pc",
    deviceId: getPcBrowserDeviceId(),
    deviceName: getPcBrowserDeviceNameRaw(),
    ticket: computeLearningHistoryTicketDelta(
      sanitizeLearningHistoryTicketSnapshot(sessionLike?.ticketSnapshot),
      captureLearningHistoryTicketSnapshot()
    )
  };
}

function recordIrregularVerbLearningHistory(sessionLike, reason) {
  if (!sessionLike || typeof sessionLike !== "object") return;
  appendLearningHistoryEntry(buildIrregularVerbLearningHistoryEntry(sessionLike, reason));
}

function renderIrregularVerbResultScreen(session, pointSummary) {
  const title = document.getElementById("irregularVerbResultTitle");
  const scoreText = document.getElementById("irregularVerbResultScore");
  const accuracyText = document.getElementById("irregularVerbResultAccuracy");
  const wrongSummaryWrap = document.getElementById("irregularVerbWrongSummaryWrap");
  const wrongSummaryList = document.getElementById("irregularVerbWrongSummaryList");
  const continueBtn = document.getElementById("irregularVerbContinueBtn");
  if (!title || !scoreText || !accuracyText) return;

  const accuracy = session?.answerCount ? Math.round(((session?.correctCount || 0) / session.answerCount) * 100) : 0;
  const wrongIds = Array.from(new Set((Array.isArray(session?.wrongQuestionIds) ? session.wrongQuestionIds : []).map((value) => String(value || "").trim()).filter(Boolean)));
  title.textContent = `${session?.mode === "test" ? "テスト" : "特訓"} 結果`;
  scoreText.textContent = `${session?.correctCount || 0} / ${session?.answerCount || 0}問 正解`;
  accuracyText.textContent = `${accuracy}%`;
  if (wrongSummaryWrap && wrongSummaryList) {
    if (wrongIds.length) {
      wrongSummaryWrap.classList.remove("hidden");
      wrongSummaryList.innerHTML = wrongIds.map((id) => `<li>${escapeHtml(id)}</li>`).join("");
    } else {
      wrongSummaryWrap.classList.add("hidden");
      wrongSummaryList.innerHTML = "";
    }
  }
  if (continueBtn) {
    const shouldShowContinue = session?.mode === "training" && !session?.reviewMode && wrongIds.length > 0;
    continueBtn.classList.toggle("hidden", !shouldShowContinue);
  }
  if (pointSummary) {
    const pointSummaryText = document.getElementById("irregularVerbPointSummaryText");
    if (pointSummaryText) {
      pointSummaryText.textContent = `獲得ポイント：${pointSummary.earnedPoints}P / 残高：${pointSummary.pointBalance}P`;
    }
  }
  showScreen("irregularVerbResultScreen");
}

function continueIrregularVerbTrainingReview() {
  const session = irregularVerbTrainingSession;
  if (!session || !session.mode || session.mode !== "training" || session.reviewMode) return;
  const stats = state?.stats?.trainingProfiles?.["irregular-verb"]?.questions || {};
  const reviewQuestionIds = Array.from(new Set((Array.isArray(session.wrongQuestionIds) ? session.wrongQuestionIds : []).map((value) => String(value || "").trim()).filter(Boolean)));
  const reviewQuestions = buildIrregularVerbReviewQuestions(getIrregularVerbQuestionBank(), reviewQuestionIds, stats);
  if (!reviewQuestions.length) {
    renderIrregularVerbResultScreen(session, computeSessionEarnedPoints(session));
    return;
  }
  session.reviewMode = true;
  session.reviewQuestionIds = reviewQuestionIds;
  session.questions = reviewQuestions;
  session.currentIndex = 0;
  session.answered = false;
  session.questionStartedAt = Date.now();
  renderIrregularVerbQuestion();
  showScreen("irregularVerbPracticeScreen");
}

function showIrregularVerbTrainingResult() {
  const session = irregularVerbTrainingSession;
  if (!session) {
    showScreen("irregularVerbSelectScreen");
    return;
  }
  if (session.mode === "training" && !session.reviewMode && session.wrongQuestionIds.length > 0) {
    const stats = state?.stats?.trainingProfiles?.["irregular-verb"]?.questions || {};
    const reviewQuestionIds = Array.from(new Set(session.wrongQuestionIds.map((value) => String(value || "").trim()).filter(Boolean)));
    const reviewQuestions = buildIrregularVerbReviewQuestions(getIrregularVerbQuestionBank(), reviewQuestionIds, stats);
    if (reviewQuestions.length) {
      session.reviewMode = true;
      session.reviewQuestionIds = reviewQuestionIds;
      session.questions = reviewQuestions;
      session.currentIndex = 0;
      session.answered = false;
      session.questionStartedAt = Date.now();
      renderIrregularVerbQuestion();
      showScreen("irregularVerbPracticeScreen");
      return;
    }
  }
  recordIrregularVerbLearningHistory(session, "completed");
  const pointSummary = computeSessionEarnedPoints(session);
  renderIrregularVerbResultScreen(session, pointSummary);
}

function orderResponseQuestionsForVariety(questions) {
  const pool = [...questions];
  const ordered = [];
  while (pool.length) {
    const last = ordered[ordered.length - 1] || null;
    let pickIndex = pool.findIndex((question) => {
      if (!last) return true;
      return question.category !== last.category && question.topic !== last.topic;
    });
    if (pickIndex < 0) {
      pickIndex = pool.findIndex((question) => {
        if (!last) return true;
        return question.category !== last.category || question.topic !== last.topic;
      });
    }
    if (pickIndex < 0) pickIndex = 0;
    ordered.push(pool.splice(pickIndex, 1)[0]);
  }
  return ordered;
}

function buildResponseQuestionSet() {
  const bank = getResponseQuestionBank();
  const pool = bank;
  if (!pool.length) return [];
  const uniquePool = [];
  const seen = new Set();
  pool.forEach((question) => {
    const key = String(question.id);
    if (seen.has(key)) return;
    seen.add(key);
    uniquePool.push(question);
  });
  const selected = weightedSampleWithoutReplacementByWeight(
    uniquePool,
    uniquePool.length,
    (question) => getTrainingQuestionWeight("response", question?.id)
  );
  return orderResponseQuestionsForVariety(selected);
}

function startResponseTraining(scope = "all") {
  const questions = buildResponseQuestionSet();
  if (!questions.length) {
    alert("出題可能な応答文問題がありません。");
    return;
  }
  const startedAt = Date.now();
  responseTrainingSession = {
    mode: "response-training",
    scope: "all",
    scopeLabel: "すべて",
    questions,
    currentIndex: 0,
    answered: false,
    startedAt,
    correctCount: 0,
    answerCount: 0,
    answerHistory: [],
    wrongCategoryCounts: {},
    ticketSnapshot: captureLearningHistoryTicketSnapshot(),
    pointBalanceBefore: Math.max(0, Math.floor(Number(getPointState().balance) || 0))
  };
  renderResponseTrainingQuestion();
  showScreen("responsePracticeScreen");
}

function fillResponseTemplate(responseTemplate, value) {
  const safeTemplate = String(responseTemplate || "");
  if (!safeTemplate) return value;
  if (safeTemplate.includes("(      )")) {
    return safeTemplate.replace("(      )", value);
  }
  return safeTemplate.replace(/\(\s*\)/, value);
}

function buildResponseFeedbackMarkup(question, isCorrect, userAnswerText, statusNotice = "") {
  const canonicalAnswer = question.answerSpec.canonicalAnswer || "";
  const statusNoticeHtml = statusNotice ? ` <span class="response-feedback-status-notice">${statusNotice}</span>` : "";
  const statusLabel = isCorrect ? "✅ 正解" : `❌ 不正解${statusNoticeHtml}`;
  const safeUserAnswer = escapeHtml(userAnswerText || "-");
  const safeCanonicalAnswer = escapeHtml(canonicalAnswer || "");
  const userRow = isCorrect
    ? `<div class="answer-line">あなたの答え：${safeUserAnswer}</div>`
    : `<div class="answer-line">あなたの答え：${buildAnswerDiffMarkup(userAnswerText || "", canonicalAnswer)}</div><div class="answer-line">正解：${safeCanonicalAnswer}</div>`;
  const answerTokens = String(canonicalAnswer || userAnswerText || "").split(/\s+/).filter(Boolean);
  let tokenIndex = 0;
  const fillByTokens = (template) => String(template || "").replace(/\(\s*\)/g, () => answerTokens[tokenIndex++] || "");
  const filledQuestion = fillByTokens(question.question);
  const completedResponse = fillByTokens(question.response);
  return [
    `<strong>${statusLabel}</strong>`,
    userRow,
    `<p class="response-feedback-line">${filledQuestion}</p>`,
    question.translationQuestion ? `<p class="response-feedback-translation">${question.translationQuestion}</p>` : "",
    `<p class="response-feedback-line">${completedResponse}</p>`,
    question.translationAnswer ? `<p class="response-feedback-translation">${question.translationAnswer}</p>` : "",
    `<div class="response-feedback-divider"></div>`,
    `<p class="response-feedback-point-title">ポイント</p>`,
    question.point ? `<p class="response-feedback-point">${question.point}</p>` : ""
  ].join("");
}

function getResponseWhCaseStatusNotice(question, userAnswerText) {
  if (!question) return "";
  const categoryText = String(question.category || "");
  const topicText = String(question.topic || question.title || "");
  if (!categoryText.includes("5W1H") && !topicText.includes("5W1H")) return "";

  const canonical = String(question.answerSpec?.canonicalAnswer || "").trim();
  const user = normalizeResponseInput(userAnswerText);
  if (!canonical || !user || user === canonical) return "";
  if (user.toLowerCase() !== canonical.toLowerCase()) return "";

  const canonicalTokens = canonical.split(" ").filter(Boolean);
  const userTokens = user.split(" ").filter(Boolean);
  if (!canonicalTokens.length || canonicalTokens.length !== userTokens.length) return "";

  const headCanonical = canonicalTokens[0];
  const headUser = userTokens[0];
  const whHeads = new Set(["What", "When", "Where", "Who", "Why", "How"]);
  if (!whHeads.has(headCanonical)) return "";
  if (headUser !== headCanonical.toLowerCase()) return "";

  const remainMatches = canonicalTokens.slice(1).every((token, idx) => token === userTokens[idx + 1]);
  if (!remainMatches) return "";

  return "大文字にすること！";
}

function shouldShowResponsePreAnswerHint(question) {
  if (!question) return false;
  const idNumber = parseResponseIdNumber(question.id);
  if (!Number.isFinite(idNumber) || idNumber < 132 || idNumber > 231) return false;

  const categoryText = String(question.category || "");
  const topicText = String(question.topic || question.title || "");
  if (!categoryText.includes("5W1H") && !topicText.includes("5W1H")) return false;

  const responseText = String(question.answerSpec?.responsePrompt || question.response || "");
  if (!/\(\s*\)/.test(responseText) && !responseText.includes("(      )")) return false;

  return Boolean(String(question.translationAnswer || "").trim());
}

function renderResponseTrainingQuestion() {
  const session = responseTrainingSession;
  if (!session) {
    openResponseTrainingSelector();
    return;
  }
  if (session.currentIndex >= session.questions.length) {
    showResponseTrainingResult();
    return;
  }

  const title = document.getElementById("responsePracticeTitle");
  const scopeText = document.getElementById("responseScopeText");
  const counterText = document.getElementById("responseCounterText");
  const questionText = document.getElementById("responseQuestionText");
  const questionLabel = document.getElementById("responseQuestionLabel");
  const templateText = document.getElementById("responseTemplateText");
  const questionTranslationText = document.getElementById("responseQuestionTranslationText");
  const answerLabel = document.getElementById("responseAnswerLabel");
  const answerTranslationText = document.getElementById("responseAnswerTranslationText");
  const responseQuestionCard = document.getElementById("responseQuestionCard");
  const answerInput = document.getElementById("responseAnswerInput");
  const answerBtn = document.getElementById("responseAnswerBtn");
  const answerPanel = document.getElementById("responseAnswerPanel");
  const feedbackBox = document.getElementById("responseFeedbackBox");
  const nextBtn = document.getElementById("responseNextBtn");
  if (!title || !scopeText || !counterText || !questionText || !questionLabel || !templateText || !questionTranslationText || !answerLabel || !answerTranslationText || !answerInput || !answerBtn || !feedbackBox || !nextBtn) return;

  const currentQuestion = session.questions[session.currentIndex];
  title.textContent = "応答文特訓";
  scopeText.textContent = "応答文特訓";
  counterText.textContent = `${session.currentIndex + 1} / ${session.questions.length}`;
  questionLabel.textContent = "Question";
  questionText.textContent = currentQuestion.answerSpec.questionPrompt || currentQuestion.question;
  questionTranslationText.textContent = currentQuestion.translationQuestion || "";
  answerLabel.textContent = "Answer";
  templateText.textContent = currentQuestion.answerSpec.responsePrompt || currentQuestion.response;
  const preAnswerHintText = shouldShowResponsePreAnswerHint(currentQuestion) ? String(currentQuestion.translationAnswer || "") : "";
  answerTranslationText.textContent = preAnswerHintText;
  answerTranslationText.classList.toggle("hidden", !preAnswerHintText);
  answerInput.placeholder = "";

  answerInput.value = "";
  answerInput.disabled = false;
  answerBtn.disabled = false;
  if (responseQuestionCard) {
    responseQuestionCard.classList.remove("response-answered");
  }
  if (answerPanel) {
    answerPanel.classList.remove("hidden");
  }
  feedbackBox.className = "feedback-box hidden";
  feedbackBox.innerHTML = "";
  nextBtn.disabled = false;
  nextBtn.classList.add("hidden");
  session.answered = false;
  session.questionStartedAt = Date.now();
  window.setTimeout(() => answerInput.focus(), 30);
}

function submitResponseTrainingAnswer() {
  const session = responseTrainingSession;
  if (!session || session.answered) return;
  const currentQuestion = session.questions[session.currentIndex];
  if (!currentQuestion) return;

  const answerInput = document.getElementById("responseAnswerInput");
  const answerBtn = document.getElementById("responseAnswerBtn");
  const answerPanel = document.getElementById("responseAnswerPanel");
  const responseQuestionCard = document.getElementById("responseQuestionCard");
  const feedbackBox = document.getElementById("responseFeedbackBox");
  const nextBtn = document.getElementById("responseNextBtn");
  if (!answerInput || !answerBtn || !feedbackBox || !nextBtn) return;

  const primaryRaw = String(answerInput.value || "");
  if (!primaryRaw.trim()) {
    feedbackBox.className = "feedback-box error";
    feedbackBox.innerHTML = "<strong>入力してください</strong><span class=\"hint\">英字で入力してください</span>";
    answerInput.focus();
    return;
  }
  const primaryPattern = /^[a-zA-Z' ]+$/;
  if (!primaryPattern.test(primaryRaw.trim())) {
    feedbackBox.className = "feedback-box error";
    feedbackBox.innerHTML = "<strong>英字・スペース・' のみ入力できます</strong>";
    answerInput.focus();
    return;
  }

  recordCommonAnswerEvent({
    dayKey: todayKey(),
    category: "training",
    trainingKind: "response",
    typingCount: 1
  });

  const startedAt = Number(session.questionStartedAt);
  if (Number.isFinite(startedAt) && Date.now() > startedAt) {
    const elapsedMs = Date.now() - startedAt;
    const elapsedSeconds = elapsedMs > 0 ? Math.max(1, Math.ceil(elapsedMs / 1000)) : 0;
    recordCommonStudySeconds(todayKey(), elapsedSeconds, {
      category: "training",
      trainingKind: "response"
    });
  }

  const normalizedPrimary = normalizeResponseInput(primaryRaw);
  const normalized = normalizedPrimary;
  const isCorrect = currentQuestion.answerSpec.acceptedAnswers.some((answer) => answer === normalized);
  const answeredAt = Date.now();

  session.answered = true;
  session.answerCount += 1;
  session.answerHistory.push({ at: answeredAt, isCorrect });
  if (isCorrect) {
    session.correctCount += 1;
    if (!session.reviewMode) {
      awardPointsForTrainingMode("response");
    }
    playTrainingCorrectChime();
  } else {
    const categoryKey = String(currentQuestion.category || "other");
    session.wrongCategoryCounts[categoryKey] = (session.wrongCategoryCounts[categoryKey] || 0) + 1;
  }

  recordTrainingProfileAttempt("response", {
    questionId: currentQuestion.id,
    category: currentQuestion.category,
    isCorrect
  });
  saveState();

  feedbackBox.className = `feedback-box ${isCorrect ? "success" : "error"}`;
  const userAnswerText = primaryRaw.trim();
  const statusNotice = isCorrect ? "" : getResponseWhCaseStatusNotice(currentQuestion, userAnswerText);
  feedbackBox.innerHTML = buildResponseFeedbackMarkup(currentQuestion, isCorrect, userAnswerText, statusNotice);
  nextBtn.classList.remove("hidden");
  nextBtn.disabled = false;
  answerInput.disabled = true;
  answerBtn.disabled = true;
  if (responseQuestionCard) {
    responseQuestionCard.classList.add("response-answered");
  }
  if (answerPanel) {
    answerPanel.classList.add("hidden");
  }
  nextBtn.focus();
}

function moveToNextResponseTrainingQuestion() {
  if (!responseTrainingSession) return;
  const nextBtn = document.getElementById("responseNextBtn");
  if (nextBtn) nextBtn.disabled = true;
  const typingConfig = getTypingConfig();
  setTimeout(() => {
    if (!responseTrainingSession) return;
    responseTrainingSession.currentIndex += 1;
    if (responseTrainingSession.currentIndex >= responseTrainingSession.questions.length) {
      showResponseTrainingResult();
      return;
    }
    renderResponseTrainingQuestion();
  }, typingDelaySecToMs(typingConfig.judgementToNextDelaySec));
}

function showResponseTrainingResult() {
  completeResponseTrainingSession("completed");
}

function isDesktopGameTicketEnabled() {
  const hasWideViewport = typeof window !== "undefined" ? Number(window.innerWidth) > 860 : true;
  if (typeof shouldUseDesktopAutoAudioFlow === "function") {
    if (shouldUseDesktopAutoAudioFlow()) return true;
    return hasWideViewport;
  }
  return hasWideViewport;
}

function ensureGameTicketState() {
  if (!state || typeof state !== "object") {
    return createDefaultGameTicketStats();
  }
  if (!state.stats || typeof state.stats !== "object") {
    state.stats = {};
  }
  if (!state.stats.gameTickets || typeof state.stats.gameTickets !== "object") {
    state.stats.gameTickets = createDefaultGameTicketStats();
  }
  const current = state.stats.gameTickets;
  const safeStore = sanitizeGameTicketStats(current);
  Object.keys(current).forEach((key) => delete current[key]);
  Object.assign(current, safeStore);
  state.stats.gameTickets = current;
  return current;
}

function resolveGameTicketGrantDayKey(store, dayKey) {
  const sourceStore = store || ensureGameTicketState();
  const explicitKey = typeof dayKey === "string" ? dayKey.trim() : "";
  if (explicitKey) return explicitKey;
  const availableDayKeys = Object.keys(sourceStore.dailyGrantByMinutes || {}).filter((key) => typeof key === "string" && key);
  if (availableDayKeys.length) {
    availableDayKeys.sort();
    return availableDayKeys[availableDayKeys.length - 1];
  }
  return String(todayKey());
}

function getGameTicketDailyGrantCounters(store, dayKey, options = {}) {
  const sourceStore = store || ensureGameTicketState();
  const grantDayKey = resolveGameTicketGrantDayKey(sourceStore, dayKey);
  const dayCounts = sourceStore.dailyGrantByMinutes?.[grantDayKey] && typeof sourceStore.dailyGrantByMinutes[grantDayKey] === "object"
    ? sourceStore.dailyGrantByMinutes[grantDayKey]
    : {};
  const scope = options && typeof options === "object" ? options : {};
  const targetTraining = typeof scope.targetTraining === "string" && scope.targetTraining ? scope.targetTraining : null;
  const derivedFromTargetTrainingPoints = Boolean(scope.derivedFromTargetTrainingPoints);
  const scopedTargetCounts = targetTraining && derivedFromTargetTrainingPoints && dayCounts.__scoped && dayCounts.__scoped[targetTraining]
    ? (dayCounts.__scoped[targetTraining].targetP || {})
    : {};
  const countsSource = targetTraining && derivedFromTargetTrainingPoints ? scopedTargetCounts : dayCounts;
  return {
    dateKey: grantDayKey,
    counts: {
      5: Math.max(0, Number(countsSource[5]) || 0),
      15: Math.max(0, Number(countsSource[15]) || 0),
      30: Math.max(0, Number(countsSource[30]) || 0),
      60: Math.max(0, Number(countsSource[60]) || 0)
    }
  };
}

function canGrantNewGameTicketForDay(store, minutes, dayKey, options = {}) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  if (!Number.isFinite(safeMinutes) || safeMinutes <= 0) return false;
  const config = getGameTicketConfig();
  const cap = Math.max(0, Number(config.dailyGrantCapByMinutes?.[safeMinutes]) || 0);
  if (cap <= 0) return false;
  const sourceStore = store || ensureGameTicketState();
  const grantDayKey = resolveGameTicketGrantDayKey(sourceStore, dayKey);
  const dayCounts = sourceStore.dailyGrantByMinutes?.[grantDayKey] && typeof sourceStore.dailyGrantByMinutes[grantDayKey] === "object"
    ? sourceStore.dailyGrantByMinutes[grantDayKey]
    : {};
  const scope = options && typeof options === "object" ? options : {};
  const targetTraining = typeof scope.targetTraining === "string" && scope.targetTraining ? scope.targetTraining : null;
  const derivedFromTargetTrainingPoints = Boolean(scope.derivedFromTargetTrainingPoints);
  const counts = targetTraining && derivedFromTargetTrainingPoints && dayCounts.__scoped && dayCounts.__scoped[targetTraining]
    ? (dayCounts.__scoped[targetTraining].targetP || {})
    : dayCounts;
  return (Math.max(0, Number(counts[safeMinutes]) || 0)) < cap;
}

function registerGameTicketDailyGrant(store, minutes, dayKey, options = {}) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  if (!Number.isFinite(safeMinutes) || safeMinutes <= 0) return false;
  const liveStore = store || ensureGameTicketState();
  const grantDayKey = resolveGameTicketGrantDayKey(liveStore, dayKey);
  const scope = options && typeof options === "object" ? options : {};
  const targetTraining = typeof scope.targetTraining === "string" && scope.targetTraining ? scope.targetTraining : null;
  const derivedFromTargetTrainingPoints = Boolean(scope.derivedFromTargetTrainingPoints);
  liveStore.dailyGrantByMinutes = liveStore.dailyGrantByMinutes && typeof liveStore.dailyGrantByMinutes === "object" ? liveStore.dailyGrantByMinutes : {};
  liveStore.dailyGrantByMinutes[grantDayKey] = liveStore.dailyGrantByMinutes[grantDayKey] && typeof liveStore.dailyGrantByMinutes[grantDayKey] === "object"
    ? liveStore.dailyGrantByMinutes[grantDayKey]
    : {};
  const dayCounts = liveStore.dailyGrantByMinutes[grantDayKey];
  dayCounts[safeMinutes] = Math.max(0, Number(dayCounts[safeMinutes]) || 0) + 1;
  if (targetTraining && derivedFromTargetTrainingPoints) {
    dayCounts.__scoped = dayCounts.__scoped && typeof dayCounts.__scoped === "object" ? dayCounts.__scoped : {};
    dayCounts.__scoped[targetTraining] = dayCounts.__scoped[targetTraining] && typeof dayCounts.__scoped[targetTraining] === "object"
      ? dayCounts.__scoped[targetTraining]
      : {};
    dayCounts.__scoped[targetTraining].targetP = dayCounts.__scoped[targetTraining].targetP && typeof dayCounts.__scoped[targetTraining].targetP === "object"
      ? dayCounts.__scoped[targetTraining].targetP
      : {};
    dayCounts.__scoped[targetTraining].targetP[safeMinutes] = Math.max(0, Number(dayCounts.__scoped[targetTraining].targetP[safeMinutes]) || 0) + 1;
  }
  return true;
}

function clampProbability(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function computeGameTicketExpiry(earnedAt) {
  const baseDate = new Date(Number(earnedAt) || Date.now());
  const targetYear = baseDate.getMonth() === 11 ? baseDate.getFullYear() + 1 : baseDate.getFullYear();
  const targetMonth = (baseDate.getMonth() + 1) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(baseDate.getDate(), lastDayOfTargetMonth);
  return new Date(
    targetYear,
    targetMonth,
    targetDay,
    baseDate.getHours(),
    baseDate.getMinutes(),
    baseDate.getSeconds(),
    baseDate.getMilliseconds()
  ).getTime();
}

function createGameTicketInventoryEntry(minutes, source) {
  const earnedAt = Date.now();
  return {
    id: `ticket-${earnedAt}-${Math.random().toString(36).slice(2, 10)}`,
    minutes: Math.round(minutes),
    earnedAt,
    expiresAt: computeGameTicketExpiry(earnedAt),
    usedAt: null,
    source: source === "streakBonus" ? "streakBonus" : source === "firstBonus" ? "firstBonus" : "random"
  };
}

function awardChallengeGameTicket(store, minutes, meta = {}) {
  if (!store) return null;
  const grantMeta = {
    ...meta,
    targetTraining: typeof meta.targetTraining === "string" && meta.targetTraining ? meta.targetTraining : "challenge",
    derivedFromTargetTrainingPoints: meta.derivedFromTargetTrainingPoints !== false
  };
  return awardGameTicket(store, minutes, "random", grantMeta, { countAsDailyEarned: false });
}

function pruneExpiredGameTickets(store) {
  if (!store) return;
  const now = Date.now();
  store.inventory = (store.inventory || []).filter((ticket) => ticket.usedAt || ticket.expiresAt > now);
}

function pruneGameTicketUsageHistory(store) {
  if (!store) return;
  const cutoff = Date.now() - (3 * GAME_TICKET_DAY_MS);
  store.usageHistory = (store.usageHistory || []).filter((entry) => entry.usedAt >= cutoff);
}

function syncGameTicketState() {
  const store = ensureGameTicketState();
  let mutated = false;
  const beforeInventoryCount = Array.isArray(store.inventory) ? store.inventory.length : 0;
  const beforeUsageCount = Array.isArray(store.usageHistory) ? store.usageHistory.length : 0;
  pruneExpiredGameTickets(store);
  pruneGameTicketUsageHistory(store);
  if (store.inventory.length !== beforeInventoryCount || store.usageHistory.length !== beforeUsageCount) {
    mutated = true;
  }
  if (!isDesktopGameTicketEnabled()) {
    if (mutated) {
      persistGameTicketState();
    }
    return store;
  }

  const currentDate = todayKey();
  if (!store.lastProcessedDate) {
    store.lastProcessedDate = currentDate;
    mutated = true;
    if (mutated) {
      persistGameTicketState();
    }
    return store;
  }
  if (store.lastProcessedDate === currentDate) {
    if (mutated) {
      persistGameTicketState();
    }
    return store;
  }

  if (store.dailyTrainingCount >= GAME_TICKET_CONFIG.eligibleTrainingThreshold) {
    if (store.dailyEarnedCount === 0) {
      store.unsuccessfulEligibleDays += 1;
    } else {
      store.unsuccessfulEligibleDays = 0;
    }
  }

  store.dailyTrainingCount = 0;
  store.dailyEarnedCount = 0;
  store.lastProcessedDate = currentDate;
  mutated = true;
  if (mutated) {
    persistGameTicketState();
  }
  return store;
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

function queueGameTicketReward(store, ticket, meta = {}) {
  if (!store || !ticket) return;
  if (Array.isArray(store.pendingRewards)) {
    store.pendingRewards = [];
    markGameTicketSyncDirty();
  }
}

function awardGameTicket(store, minutes, source, meta = {}, options = {}) {
  if (!store) return null;
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  const allowedMinutes = [5, 15, 30, 60];
  const config = getGameTicketConfig();
  const targetTraining = typeof meta.targetTraining === "string" && meta.targetTraining ? meta.targetTraining : null;
  const derivedFromTargetTrainingPoints = Boolean(meta.derivedFromTargetTrainingPoints);
  const isTargetTrainingGrant = Boolean(targetTraining) && derivedFromTargetTrainingPoints === true;
  if (allowedMinutes.includes(safeMinutes) && isTargetTrainingGrant) {
    const dayKey = todayKey();
    if (!canGrantNewGameTicketForDay(store, safeMinutes, dayKey, {
      targetTraining,
      derivedFromTargetTrainingPoints: true
    })) {
      return null;
    }
  }
  const ticket = createGameTicketInventoryEntry(safeMinutes, source);
  store.inventory.push(ticket);
  if (allowedMinutes.includes(safeMinutes)) {
    registerGameTicketDailyGrant(store, safeMinutes, todayKey(), {
      targetTraining,
      derivedFromTargetTrainingPoints: isTargetTrainingGrant
    });
  }
  markGameTicketSyncDirty();
  if (source === "random" && options.countAsDailyEarned !== false) {
    store.dailyEarnedCount += 1;
  }
  if (meta.historyLabel) {
    const historyEntry = sanitizeGameTicketEarnedHistoryEntry({
      id: ticket.id,
      label: meta.historyLabel,
      minutes: ticket.minutes,
      earnedAt: ticket.earnedAt,
      type: meta.type || ticket.source
    });
    if (historyEntry) {
      store.earnedHistory = Array.isArray(store.earnedHistory) ? store.earnedHistory : [];
      store.earnedHistory.unshift(historyEntry);
      store.earnedHistory = store.earnedHistory.slice(0, 240);
    }
  }
  if (typeof document !== "undefined") {
    showGameTicketModal(ticket, store);
  }
  return ticket;
}

function getRandomTicketChanceForTraining(store) {
  if (!store) return 0;
  if (store.dailyEarnedCount >= GAME_TICKET_CONFIG.dailyMaxEarned) return 0;
  if (store.dailyTrainingCount < GAME_TICKET_CONFIG.eligibleTrainingThreshold) return 0;
  if (store.dailyEarnedCount >= 1) return GAME_TICKET_CONFIG.afterFirstWinChance;
  if (store.dailyTrainingCount <= 5) return GAME_TICKET_CONFIG.earlyTrainingChance;
  return GAME_TICKET_CONFIG.lateTrainingChance;
}

function shouldAwardRandomGameTicket(chance) {
  const override = GAME_TICKET_CONFIG.debugRandomChanceOverride;
  const safeChance = Number.isFinite(override) ? clampProbability(override) : clampProbability(chance);
  return Math.random() < safeChance;
}

var pendingChallengeTicketChanceQueue = [];
var shownGameTicketRewardIds = new Set();

if (typeof globalThis !== "undefined") {
  globalThis.shownGameTicketRewardIds = shownGameTicketRewardIds;
}
if (typeof window !== "undefined" && window !== globalThis) {
  window.shownGameTicketRewardIds = shownGameTicketRewardIds;
}

function getShownGameTicketRewardIdSet(store = ensureGameTicketState()) {
  const stateStore = store || ensureGameTicketState();
  const merged = new Set(Array.isArray(stateStore?.shownRewardIds)
    ? stateStore.shownRewardIds.map((id) => String(id)).filter(Boolean)
    : []);
  const seedSet = (value) => {
    if (!value) return;
    if (value instanceof Set) {
      for (const id of value) merged.add(String(id));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((id) => merged.add(String(id)));
    }
  };
  seedSet(shownGameTicketRewardIds);
  if (typeof globalThis !== "undefined") seedSet(globalThis.shownGameTicketRewardIds);
  shownGameTicketRewardIds = merged;
  if (typeof globalThis !== "undefined") {
    globalThis.shownGameTicketRewardIds = merged;
  }
  if (typeof window !== "undefined" && window !== globalThis) {
    window.shownGameTicketRewardIds = merged;
  }
  return merged;
}

function isGameTicketRewardAlreadyShown(ticket, store = ensureGameTicketState()) {
  if (!ticket || !ticket.id) return false;
  return getShownGameTicketRewardIdSet(store).has(String(ticket.id));
}

function markGameTicketRewardShown(ticket, store = ensureGameTicketState()) {
  if (ticket && ticket.id) {
    const set = getShownGameTicketRewardIdSet(store);
    set.add(String(ticket.id));
    shownGameTicketRewardIds = set;
    if (typeof globalThis !== "undefined") {
      globalThis.shownGameTicketRewardIds = set;
    }
    if (typeof window !== "undefined") {
      window.shownGameTicketRewardIds = set;
    }
    if (store) {
      store.shownRewardIds = Array.from(set).slice(-200);
      if (Array.isArray(store.pendingRewards)) {
        store.pendingRewards = store.pendingRewards.filter((reward) => !(reward && reward.id && String(reward.id) === String(ticket.id)));
      }
    }
  }
}

function removeShownPendingGameTicketRewards(store = ensureGameTicketState()) {
  if (!store || !Array.isArray(store.pendingRewards)) return;
  const set = getShownGameTicketRewardIdSet(store);
  const beforeLength = store.pendingRewards.length;
  const filtered = store.pendingRewards.filter((reward) => {
    if (!reward || !reward.id) return true;
    return !set.has(String(reward.id));
  });
  if (beforeLength !== filtered.length) {
    store.pendingRewards = filtered;
    markGameTicketSyncDirty();
  }
}

function isChallengeSpecialDrawEnabled() {
  return false;
}

function showChallengeTicketChanceScreen() {
  if (!isChallengeSpecialDrawEnabled()) return false;
  const modal = document.getElementById("challengeTicketChanceModal");
  const startBtn = document.getElementById("challengeTicketChanceStartBtn");
  if (!modal) return false;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  if (startBtn) {
    startBtn.classList.remove("hidden");
    startBtn.disabled = false;
  }
  return true;
}

function hideChallengeTicketChanceScreen() {
  const modal = document.getElementById("challengeTicketChanceModal");
  const startBtn = document.getElementById("challengeTicketChanceStartBtn");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }
  if (startBtn) {
    startBtn.classList.add("hidden");
    startBtn.disabled = true;
  }
}

function queueChallengeTicketChance(drawAction) {
  if (!isChallengeSpecialDrawEnabled()) return false;
  if (typeof drawAction !== "function") return false;
  pendingChallengeTicketChanceQueue.push({ action: drawAction });
  showChallengeTicketChanceScreen();
  return true;
}

function executePendingChallengeTicketChance() {
  const next = pendingChallengeTicketChanceQueue.shift();
  if (!next || typeof next.action !== "function") {
    hideChallengeTicketChanceScreen();
    return false;
  }
  hideChallengeTicketChanceScreen();
  next.action();
  return true;
}

function resolveChallengeSpecialDrawResult(dayKey, threshold) {
  if (!isChallengeSpecialDrawEnabled()) {
    return { outcome: "miss", minutes: 0, shouldShowChanceScreen: false };
  }
  const dateKey = String(dayKey || todayKey());
  const config = getGameTicketConfig();
  const matchingEvent = (config.events || []).find((event) => {
    if (!event.enabled || String(event.targetTraining || "challenge") !== "challenge") return false;
    return Number(event.threshold) === Number(threshold);
  });
  if (matchingEvent) {
    const eventResult = resolveConfiguredEventDrawResult(matchingEvent, dateKey);
    return { ...eventResult, shouldShowChanceScreen: true };
  }

  const roll = Math.random();
  if (roll < 0.30) return { outcome: "30", minutes: 30, shouldShowChanceScreen: true };
  if (roll < 0.40) return { outcome: "60", minutes: 60, shouldShowChanceScreen: true };
  return { outcome: "miss", minutes: 0, shouldShowChanceScreen: true };
}

function queueChallengeSpecialDrawForThresholdCrossing(dayKey, previousChallengePoints, nextChallengePoints, store = ensureGameTicketState()) {
  if (!isChallengeSpecialDrawEnabled()) return [];
  const safeStore = store || ensureGameTicketState();
  const resolvedDayKey = String(dayKey || getPointTodayKey() || todayKey());
  const dailyState = getChallengeTicketDailyState(safeStore, resolvedDayKey, { create: true });
  const specialState = dailyState.special && typeof dailyState.special === "object" ? dailyState.special : {};
  const previousPoints = Number.isFinite(Number(previousChallengePoints)) ? Math.max(0, Number(previousChallengePoints)) : 0;
  const nextPoints = Number.isFinite(Number(nextChallengePoints)) ? Math.max(0, Number(nextChallengePoints)) : previousPoints;
  const queuedKeys = [];
  const specialThresholds = [
    { key: "p141", threshold: 141 },
    { key: "p221", threshold: 221 },
    { key: "p261", threshold: 261 }
  ];

  specialThresholds.forEach(({ key, threshold }) => {
    const entry = specialState[key] && typeof specialState[key] === "object"
      ? sanitizeChallengeTicketSpecialState(specialState[key])
      : sanitizeChallengeTicketSpecialState({ processed: false, queued: false, result: "miss", awardedMinutes: 0 });
    if (entry.processed || entry.queued) return;
    if (previousPoints >= threshold || nextPoints < threshold) return;

    entry.queued = true;
    specialState[key] = entry;
    queuedKeys.push(key);

    if (typeof queueChallengeTicketChance === "function") {
      queueChallengeTicketChance(() => {
        const result = resolveChallengeSpecialDrawResult(resolvedDayKey, threshold);
        const finalEntry = specialState[key] && typeof specialState[key] === "object"
          ? sanitizeChallengeTicketSpecialState(specialState[key])
          : sanitizeChallengeTicketSpecialState({ processed: false, queued: true, result: "miss", awardedMinutes: 0 });
        finalEntry.processed = true;
        finalEntry.queued = false;
        finalEntry.result = String(result?.outcome || "miss").toLowerCase() === "30" || String(result?.outcome || "miss").toLowerCase() === "60"
          ? String(result.outcome)
          : "miss";
        finalEntry.awardedMinutes = Math.max(0, Number(result?.minutes) || 0);
        specialState[key] = finalEntry;
        const shouldAwardLegacyChallengeTicket = Number(finalEntry.awardedMinutes) > 0 && Number(finalEntry.awardedMinutes) < 5;
        if (finalEntry.awardedMinutes > 0 && !shouldAwardLegacyChallengeTicket) {
          finalEntry.awardedMinutes = 0;
        }
        if (shouldAwardLegacyChallengeTicket) {
          finalEntry.awardedMinutes = 0;
        }
        persistGameTicketState();
      });
    }
  });

  dailyState.special = specialState;
  return queuedKeys;
}

function processChallengeGameTicketAwards(store = ensureGameTicketState(), dayKey = getPointTodayKey(), previousChallengePoints = null, nextChallengePoints = null) {
  if (!isDesktopGameTicketEnabled()) return [];
  const safeStore = store || ensureGameTicketState();
  const resolvedDayKey = String(dayKey || getPointTodayKey());
  const pointState = getPointState();
  hydratePointDaySnapshots(pointState);
  const currentChallengePoints = Math.max(0, Number(pointState.dailyEarnedByModeByDate?.[resolvedDayKey]?.challenge) || 0);
  const previousPoints = Number.isFinite(Number(previousChallengePoints))
    ? Math.max(0, Number(previousChallengePoints))
    : 0;
  const nextPoints = Number.isFinite(Number(nextChallengePoints))
    ? Math.max(0, Number(nextChallengePoints))
    : currentChallengePoints;
  const fixedRuleState = getChallengeTicketFixedRuleState(safeStore, resolvedDayKey);
  const earnedTickets = [];
  let mutated = false;

  const thresholds = getChallengeTicketFixedRuleThresholds();
  thresholds.forEach((threshold) => {
    const thresholdKey = String(threshold);
    if (fixedRuleState[thresholdKey]) return;
    if (previousPoints >= threshold || nextPoints < threshold) return;
    fixedRuleState[thresholdKey] = true;
    mutated = true;
    const createdTicket = awardChallengeGameTicket(safeStore, 5, {
      type: "random",
      historyLabel: "過去の間違い 5分券"
    });
    if (createdTicket) {
      earnedTickets.push(createdTicket);
    }
  });

  if (mutated) {
    persistGameTicketState();
  }

  return earnedTickets;
}

function processChallengeEventThresholdCrossings(dayKey, previousChallengePoints, nextChallengePoints, store = ensureGameTicketState()) {
  return [];
}

function processCompletedTicketTraining(options = {}) {
  if (!isDesktopGameTicketEnabled()) return [];
  if (String(options.trainingType || "") === "challenge") {
    return [];
  }
  const store = syncGameTicketState();
  store.dailyTrainingCount += 1;
  markGameTicketSyncDirty();
  const earnedTickets = [];

  if (options.trainingType === "normal-weak-focus") {
    store.normalWeakFocusCompletedCount += 1;
    markGameTicketSyncDirty();
    const reachedFirstBonus =
      !store.normalWeakFocusFirstBonusGranted &&
      store.normalWeakFocusCompletedCount >= GAME_TICKET_CONFIG.firstBonusWeakFocusTarget;
    if (reachedFirstBonus) {
      const firstBonusTicket = awardGameTicket(
        store,
        GAME_TICKET_CONFIG.firstBonusTicketMinutes,
        "firstBonus",
        {
          type: "firstBonus",
          historyLabel: "追加特訓3回達成ボーナス　5分券"
        }
      );
      if (firstBonusTicket) {
        store.normalWeakFocusFirstBonusGranted = true;
        earnedTickets.push(firstBonusTicket);
      }
    }
  }

  const rescueReady =
    store.unsuccessfulEligibleDays >= GAME_TICKET_CONFIG.rescueTriggerDays &&
    store.dailyTrainingCount === GAME_TICKET_CONFIG.rescueGrantTrainingCount &&
    store.dailyEarnedCount < GAME_TICKET_CONFIG.dailyMaxEarned;

  if (rescueReady) {
    const rescueTicket = awardGameTicket(store, pickGameTicketMinutes(), "random");
    if (rescueTicket) {
      store.unsuccessfulEligibleDays = 0;
      markGameTicketSyncDirty();
      earnedTickets.push(rescueTicket);
    }
  }

  const chance = getRandomTicketChanceForTraining(store);
  if (chance > 0 && shouldAwardRandomGameTicket(chance)) {
    const randomTicket = awardGameTicket(store, pickGameTicketMinutes(), "random");
    if (randomTicket) {
      earnedTickets.push(randomTicket);
    }
  }

  return earnedTickets;
}

function getStreakBonusMinutes(streakDays) {
  const directMatch = GAME_TICKET_CONFIG.streakBonusMilestones.find((entry) => entry.days === streakDays);
  if (directMatch) return directMatch.minutes;
  if (streakDays >= GAME_TICKET_CONFIG.streakBonusRepeatStart) {
    const offset = streakDays - GAME_TICKET_CONFIG.streakBonusRepeatStart;
    if (offset % GAME_TICKET_CONFIG.streakBonusRepeatInterval === 0) {
      return GAME_TICKET_CONFIG.streakBonusRepeatMinutes;
    }
  }
  return 0;
}

function processStreakBonusTicket(reason) {
  if (reason !== "completed" || !isDesktopGameTicketEnabled()) return null;
  const store = syncGameTicketState();
  const streakDays = Math.max(0, Number(state.stats.streak) || 0);
  const minutes = getStreakBonusMinutes(streakDays);
  if (!minutes) return null;

  const awardKey = `${todayKey()}:${streakDays}`;
  if (store.streakBonusAwardedDays.includes(awardKey)) return null;

  const streakTicket = awardGameTicket(store, minutes, "streakBonus", { streakDays });
  if (!streakTicket) return null;
  store.streakBonusAwardedDays = [...store.streakBonusAwardedDays, awardKey].slice(-180);
  markGameTicketSyncDirty();
  return streakTicket;
}

function getActiveGameTickets(store = ensureGameTicketState()) {
  const now = Date.now();
  return (store.inventory || []).filter((ticket) => !ticket.usedAt && ticket.expiresAt > now);
}

function normalizeIdentityText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function buildQuestionSignature(item) {
  return `${item.day}|${item.type}|${normalizeIdentityText(item.answer || item.english)}`;
}

function buildLevelFocusGroupKey(itemLike) {
  const answer = normalizeIdentityText(itemLike?.answer || itemLike?.english || "");
  const japanese = String(itemLike?.japanese || "").trim();
  const type = normalizeIdentityText(itemLike?.type || "");
  return `${answer}|||${japanese}|||${type}`;
}

function buildLevelFocusGroups(items) {
  const groups = new Map();
  (Array.isArray(items) ? items : []).forEach((item) => {
    if (!item) return;
    const id = String(item.id || "").trim();
    if (!id) return;
    const key = buildLevelFocusGroupKey(item);
    if (!key) return;
    const current = groups.get(key);
    if (!current) {
      groups.set(key, {
        key,
        representative: item,
        itemIds: new Set([id]),
        items: [item]
      });
      return;
    }
    if (current.itemIds.has(id)) return;
    current.itemIds.add(id);
    current.items.push(item);
  });
  return [...groups.values()];
}

function getLevelFocusGroupItemsByQuestion(questionLike) {
  const key = buildLevelFocusGroupKey(questionLike);
  if (!key) return [];
  const byId = new Map();
  state.items.forEach((item) => {
    if (!item) return;
    if (buildLevelFocusGroupKey(item) !== key) return;
    const id = String(item.id || "").trim();
    if (!id || byId.has(id)) return;
    byId.set(id, item);
  });
  return [...byId.values()];
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
      lastStudiedDate: "",
      lastCorrectDate: ""
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
    lastStudiedDate: typeof source.lastStudiedDate === "string" ? source.lastStudiedDate : "",
    lastCorrectDate: typeof source.lastCorrectDate === "string" ? source.lastCorrectDate : ""
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
  item.hasBeenStudied = true;
  stats.attempts += 1;
  const today = todayKey();
  if (isCorrect) {
    stats.correct += 1;
    stats.lastCorrectDate = today;
  }
  stats.lastStudiedDate = today;
  queueStudyCoreSyncChange({ itemIds: [item.id] });
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

function computeTrainingQuestionWeightByAttemptsAndCorrect(attempts, correct) {
  const safeAttempts = Math.max(0, Math.floor(Number(attempts) || 0));
  const safeCorrect = Math.max(0, Math.min(safeAttempts, Math.floor(Number(correct) || 0)));
  if (safeAttempts < 3) return 1.0;

  const accuracy = safeAttempts > 0 ? (safeCorrect / safeAttempts) * 100 : 0;
  if (accuracy <= 49) return 1.8;
  if (accuracy <= 69) return 1.4;
  if (accuracy <= 89) return 1.0;
  return 0.8;
}

function getTrainingQuestionWeight(trainingKind, questionId) {
  const kind = String(trainingKind || "").trim();
  const key = String(questionId || "").trim();
  if (!kind || !key) return 1.0;

  const profile = state?.stats?.trainingProfiles?.[kind];
  const stats = profile?.questions?.[key];
  const attempts = Math.max(0, Number(stats?.attempts) || 0);
  const correct = Math.max(0, Number(stats?.correct) || 0);
  return computeTrainingQuestionWeightByAttemptsAndCorrect(attempts, correct);
}

function weightedSampleWithoutReplacementByWeight(pool, count, resolveWeight) {
  const available = Array.isArray(pool) ? pool.slice() : [];
  const picked = [];
  const targetCount = Math.max(0, Math.min(Number(count) || 0, available.length));

  while (picked.length < targetCount && available.length) {
    const totalWeight = available.reduce((sum, item) => {
      const resolved = typeof resolveWeight === "function" ? Number(resolveWeight(item)) : 1;
      const safeWeight = Number.isFinite(resolved) && resolved > 0 ? resolved : 1;
      return sum + safeWeight;
    }, 0);

    let cursor = Math.random() * totalWeight;
    let selectedIndex = available.length - 1;

    for (let index = 0; index < available.length; index += 1) {
      const resolved = typeof resolveWeight === "function" ? Number(resolveWeight(available[index])) : 1;
      const safeWeight = Number.isFinite(resolved) && resolved > 0 ? resolved : 1;
      cursor -= safeWeight;
      if (cursor <= 0) {
        selectedIndex = index;
        break;
      }
    }

    picked.push(available.splice(selectedIndex, 1)[0]);
  }

  return picked;
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

function showChallengeEventAnnouncementImage(eventConfig, onContinue) {
  const imageUrl = String(eventConfig?.startImage || getGameTicketConfig().challengeAnnouncementImage || "").trim();
  if (!imageUrl) {
    if (typeof onContinue === "function") onContinue();
    return;
  }
  const modal = document.getElementById("gameTicketModal");
  const titleText = document.getElementById("gameTicketTitle");
  const minutesText = document.getElementById("gameTicketMinutesText");
  const bodyText = document.getElementById("gameTicketBodyText");
  const introText = document.getElementById("gameTicketIntroText");
  const okBtn = document.getElementById("gameTicketRewardOkBtn");
  if (!modal || !titleText || !minutesText || !bodyText || !introText || !okBtn) {
    if (typeof onContinue === "function") onContinue();
    return;
  }
  titleText.textContent = "イベント開始";
  minutesText.textContent = "イベントを開始します";
  bodyText.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="イベント開始" style="max-width:100%; max-height:220px; border-radius:12px; object-fit:cover; display:block; margin:0 auto;" />`;
  introText.textContent = "開始前画像です。OKでイベントを開始します。";
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  okBtn.onclick = () => {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    if (typeof onContinue === "function") onContinue();
  };
}

function showGameTicketModal(ticket, store = ensureGameTicketState()) {
  if (!ticket || (ticket.id && isGameTicketRewardAlreadyShown(ticket, store))) return;
  if (ticket && ticket.id) {
    markGameTicketRewardShown(ticket, store);
    removeShownPendingGameTicketRewards(store);
  }
  if (!isDesktopGameTicketEnabled()) return;
  const modal = document.getElementById("gameTicketModal");
  const titleText = document.getElementById("gameTicketTitle");
  const minutesText = document.getElementById("gameTicketMinutesText");
  const bodyText = document.getElementById("gameTicketBodyText");
  const introText = document.getElementById("gameTicketIntroText");
  const thirtyPoster = document.getElementById("gameTicketThirtyPoster");
  const posterValue = document.getElementById("gameTicketPosterValue");
  const posterTicketValue = document.getElementById("gameTicketPosterTicketValue");
  const posterCaption = document.getElementById("gameTicketPosterCaption");
  if (!modal || !titleText || !minutesText || !bodyText || !introText || !thirtyPoster) return;
  const minutes = Math.max(0, Math.floor(Number(ticket?.minutes) || 0));
  const isThirtyMinuteTicket = minutes === 30;
  const isSixtyMinuteTicket = minutes === 60;
  const isMissTicket = ticket && ticket.type === "miss" || minutes === 0;
  const shouldUsePoster = isThirtyMinuteTicket || isSixtyMinuteTicket;
  const config = getGameTicketConfig();
  modal.classList.toggle("ticket-reward-card-30", shouldUsePoster);
  thirtyPoster.classList.toggle("hidden", !shouldUsePoster);
  thirtyPoster.setAttribute("aria-hidden", shouldUsePoster ? "false" : "true");
  titleText.classList.toggle("hidden", shouldUsePoster || isMissTicket);
  minutesText.classList.toggle("ticket-reward-30-minutes", shouldUsePoster);
  bodyText.classList.toggle("ticket-reward-30-get", shouldUsePoster);
  introText.classList.toggle("hidden", shouldUsePoster || isMissTicket);
  if (posterValue) posterValue.textContent = String(minutes);
  if (posterTicketValue) posterTicketValue.textContent = String(minutes);
  if (posterCaption) posterCaption.textContent = `${minutes}分券を獲得しました！`;
  if (ticket.type === "streakBonus") {
    titleText.textContent = "🔥 連続学習ボーナス";
    minutesText.textContent = `${minutes}分券を獲得しました！`;
    bodyText.textContent = `${ticket.streakDays}日連続達成、おめでとう！`;
  } else if (ticket.type === "firstBonus") {
    titleText.textContent = "🎉 初回ボーナス！ 追加特訓を3回達成しました";
    minutesText.textContent = "ゲームチケット 5分券を獲得！";
    bodyText.textContent = "";
  } else if (isMissTicket) {
    titleText.textContent = "😵 はずれ";
    minutesText.textContent = "今回ははずれました";
    bodyText.textContent = "また挑戦して、次はラッキーを狙いましょう。";
    introText.textContent = "";
  } else if (shouldUsePoster) {
    titleText.textContent = "";
    minutesText.textContent = "";
    const imageUrl = String(config.ticketImages?.[minutes] || "").trim();
    if (imageUrl) {
      bodyText.innerHTML = `<img src="${escapeHtml(imageUrl)}" alt="${minutes}分券" style="max-width:100%; max-height:220px; border-radius:12px; object-fit:cover; display:block; margin:0 auto;" />`;
    } else {
      bodyText.textContent = "";
    }
  } else if (isSixtyMinuteTicket) {
    titleText.textContent = "🏆 60分券・超レア";
    minutesText.textContent = "60分券を獲得しました！";
    bodyText.textContent = "特別抽選を突破しました。";
  } else {
    titleText.textContent = "🎫 ゲームチケット";
    minutesText.textContent = `${minutes}分券を獲得しました！`;
    bodyText.textContent = "追加特訓、よく頑張りました。";
  }
  introText.textContent = shouldUsePoster || isMissTicket ? "" : "📷 スクリーンショットを撮って、保護者に見せましょう。";
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  if (shouldUsePoster) {
    playGameTicketThirtyFanfare();
  }
}

function playGameTicketThirtyFanfare() {
  const AudioCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtor) return;
  let audioContext = window.gameTicketFanfareAudioContext;
  try {
    if (!audioContext) {
      audioContext = new AudioCtor();
      window.gameTicketFanfareAudioContext = audioContext;
    }
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    const master = audioContext.createGain();
    master.gain.value = 0.0001;
    master.connect(audioContext.destination);

    const compressor = audioContext.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 16;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.18;
    master.disconnect();
    master.connect(compressor);
    compressor.connect(audioContext.destination);

    const notes = [
      { freq: 220, start: 0.00, duration: 0.20, type: "sine", gain: 0.22 },
      { freq: 440, start: 0.02, duration: 0.18, type: "triangle", gain: 0.18 },
      { freq: 659.25, start: 0.10, duration: 0.22, type: "square", gain: 0.12 },
      { freq: 880, start: 0.16, duration: 0.24, type: "triangle", gain: 0.16 },
      { freq: 1046.5, start: 0.24, duration: 0.28, type: "sine", gain: 0.14 },
      { freq: 1318.5, start: 0.32, duration: 0.34, type: "sawtooth", gain: 0.10 }
    ];

    const now = audioContext.currentTime + 0.02;
    notes.forEach((note) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.freq, now + note.start);
      oscillator.frequency.exponentialRampToValueAtTime(note.freq * 1.015, now + note.start + note.duration);
      gainNode.gain.setValueAtTime(0.0001, now + note.start);
      gainNode.gain.exponentialRampToValueAtTime(note.gain, now + note.start + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);
      oscillator.connect(gainNode);
      gainNode.connect(master);
      oscillator.start(now + note.start);
      oscillator.stop(now + note.start + note.duration + 0.04);
    });

    const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.25, audioContext.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseData.length; index += 1) {
      noiseData[index] = (Math.random() * 2 - 1) * (1 - index / noiseData.length);
    }
    const noiseSource = audioContext.createBufferSource();
    const noiseGain = audioContext.createGain();
    noiseSource.buffer = noiseBuffer;
    noiseGain.gain.setValueAtTime(0.0001, now + 0.03);
    noiseGain.gain.exponentialRampToValueAtTime(0.12, now + 0.07);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    noiseSource.connect(noiseGain);
    noiseGain.connect(master);
    noiseSource.start(now + 0.03);
    noiseSource.stop(now + 0.28);
  } catch (error) {
    console.warn("Failed to play 30-minute ticket fanfare", error);
  }
}

function showImmediateGameTicketReward(ticket) {
  if (!ticket) return;
  const modal = document.getElementById("gameTicketModal");
  if (!modal || !modal.classList.contains("hidden")) return;
  showGameTicketModal(ticket);
}

function canAutoShowGameTicketRewardFromCurrentFlow() {
  const pendingContext = pendingTrainingCompleteContext;
  if (pendingContext) {
    return Number(pendingContext?.earnedPoints || 0) > 0;
  }
  const summary = state?.stats?.lastResultSummary;
  if (summary) {
    return Number(summary?.earnedPoints || 0) > 0;
  }
  return true;
}

function showPendingGameTicketModalIfAny() {
  const store = ensureGameTicketState();
  if (store && Array.isArray(store.pendingRewards)) {
    store.pendingRewards = [];
    markGameTicketSyncDirty();
  }
  return false;
}

function getTrainingCompletionModeLabel(mode) {
  const normalizedMode = String(mode || "").trim();
  if (normalizedMode === "normal") return "Day学習";
  if (normalizedMode === LEARNING_MODE.EXTRA_TRAINING || normalizedMode === "extraTraining") return "追加特訓";
  if (normalizedMode === "level-focus") return "単語特訓";
  if (normalizedMode === "phrase-spiral") return "熟語特訓";
  if (normalizedMode === "challenge" || normalizedMode === "review") return "過去の間違い";
  if (normalizedMode === "preposition") return "前置詞特訓";
  if (normalizedMode === "response") return "応答文特訓";
  if (normalizedMode === "irregular-verb") return "不規則動詞特訓";
  if (normalizedMode === "vocabulary") return "Vocabulary";
  if (normalizedMode === "speaking") return "Speaking";
  return "特訓";
}

function createDefaultPointDayModeRow() {
  return {
    "day-study": 0,
    "unstudied-clear": 0,
    idiom: 0,
    preposition: 0,
    response: 0,
    "irregular-verb": 0,
    challenge: 0
  };
}

function getTrainingDailyPointModeRow(pointState, todayKey) {
  const sourceRow = pointState.dailyEarnedByModeByDate?.[todayKey] && typeof pointState.dailyEarnedByModeByDate[todayKey] === "object"
    ? pointState.dailyEarnedByModeByDate[todayKey]
    : {};
  const defaultRow = createDefaultPointDayModeRow();
  return {
    ...defaultRow,
    "day-study": Math.max(0, Number(sourceRow["day-study"]) || 0),
    "unstudied-clear": Math.max(0, Number(sourceRow["unstudied-clear"]) || 0),
    idiom: Math.max(0, Number(sourceRow.idiom) || 0),
    preposition: Math.max(0, Number(sourceRow.preposition) || 0),
    response: Math.max(0, Number(sourceRow.response) || 0),
    "irregular-verb": Math.max(0, Number(sourceRow["irregular-verb"]) || 0),
    challenge: Math.max(0, Number(sourceRow.challenge) || 0)
  };
}

function getTrainingDailyPointBreakdownEntries(todayModeRow) {
  return [
    ["Day学習", todayModeRow["day-study"]],
    ["未学習なし", todayModeRow["unstudied-clear"]],
    ["熟語", todayModeRow.idiom],
    ["前置詞", todayModeRow.preposition],
    ["応答文", todayModeRow.response],
    ["不規則動詞", todayModeRow["irregular-verb"]],
    ["過去の間違い", todayModeRow.challenge]
  ];
}

function formatTrainingDailyPointSummary(todayTotal, todayModeRow) {
  const breakdown = getTrainingDailyPointBreakdownEntries(todayModeRow)
    .map(([label, value]) => `${label}${formatPointValue(value)}`)
    .join("　");
  return `本日の累計${formatPointValue(todayTotal)}（${breakdown}）`;
}

function formatTrainingDailyPointBreakdown(todayModeRow) {
  return getTrainingDailyPointBreakdownEntries(todayModeRow)
    .map(([label, value]) => `${label}${formatPointValue(value)}`)
    .join("　");
}

function openTrainingCompleteScreen(options = {}) {
  const titleText = document.getElementById("trainingCompleteTitleText");
  const unlockText = document.getElementById("trainingCompleteUnlockText");
  const earnedText = document.getElementById("trainingCompleteEarnedText");
  const dailySummaryText = document.getElementById("trainingCompleteDailySummaryText");
  const lifetimeSummaryText = document.getElementById("trainingCompleteLifetimeSummaryText");
  const balanceText = document.getElementById("trainingCompleteBalanceText");
  const homeBtn = document.getElementById("trainingCompleteHomeBtn");
  const continueBtn = document.getElementById("trainingCompleteContinueBtn");
  if (!titleText || !earnedText || !balanceText || !dailySummaryText || !lifetimeSummaryText) {
    renderHome();
    showScreen("homeScreen", { recordHistory: false });
    return;
  }

  const modeLabel = getTrainingCompletionModeLabel(options.mode);
  const earnedPoints = Math.max(0, Math.floor(Number(options.earnedPoints) || 0));
  const pointBalance = Math.max(0, Math.floor(Number(options.pointBalance) || 0));
  const interrupted = Boolean(options.interrupted);

  titleText.textContent = interrupted
    ? `⚠️ ${modeLabel} 途中で終了しました`
    : `🎉 ${modeLabel} おつかれさまでした！`;

  const shouldShowChallengeContinue = !interrupted && String(options.mode || "") === "challenge";
  if (homeBtn) {
    homeBtn.textContent = shouldShowChallengeContinue ? "終わり" : "ホームへ戻る";
    homeBtn.classList.toggle("primary-btn", shouldShowChallengeContinue);
    homeBtn.classList.toggle("secondary-btn", !shouldShowChallengeContinue);
  }
  if (continueBtn) {
    continueBtn.classList.toggle("hidden", !shouldShowChallengeContinue);
  }

  if (unlockText) {
    const unlockedDay = Math.max(0, Number(options.unlockedDayNotice?.day) || 0);
    if (!interrupted && unlockedDay > 0) {
      const message = String(options.unlockedDayNotice?.message || `Day${unlockedDay}がオープンしました！`).trim();
      unlockText.textContent = message;
      unlockText.classList.remove("hidden");
    } else {
      unlockText.textContent = "";
      unlockText.classList.add("hidden");
    }
  }

  earnedText.textContent = `＋${earnedPoints}P`;

  const pointState = getPointState();
  hydratePointDaySnapshots(pointState);
  const todayKey = getPointTodayKey();
  const todayTotal = Math.max(0, Number(pointState.dailyEarnedByDate?.[todayKey]) || 0);
  const todayModeRow = getTrainingDailyPointModeRow(pointState, todayKey);
  const dayStudyEarned = Math.max(0, Number(todayModeRow["day-study"]) || 0);
  const unstudiedClearEarned = Math.max(0, Number(todayModeRow["unstudied-clear"]) || 0);
  const prepositionEarned = Math.max(0, Number(todayModeRow.preposition) || 0);
  const responseEarned = Math.max(0, Number(todayModeRow.response) || 0);
  const challengeEarned = Math.max(0, Number(todayModeRow.challenge) || 0);
  const irregularVerbEarned = Math.max(0, Number(todayModeRow["irregular-verb"]) || 0);
  const idiomEarned = Math.max(0, Number(todayModeRow.idiom) || 0);
  const totalEarned = Math.max(0, Number(pointState.totalEarned) || 0);

  dailySummaryText.textContent = formatTrainingDailyPointSummary(todayTotal, {
    "day-study": dayStudyEarned,
    "unstudied-clear": unstudiedClearEarned,
    preposition: prepositionEarned,
    response: responseEarned,
    idiom: idiomEarned,
    challenge: challengeEarned,
    "irregular-verb": irregularVerbEarned
  });
  lifetimeSummaryText.textContent = `通算累計${formatPointValue(totalEarned)}`;
  const hasEarnedPointsNow = earnedPoints > 0;
  dailySummaryText.classList.toggle("hidden", !hasEarnedPointsNow);
  lifetimeSummaryText.classList.toggle("hidden", !hasEarnedPointsNow);

  balanceText.textContent = formatPointValue(pointBalance);

  const shouldAutoShowTicketAfter = options.showTicketAfter !== false && Number(options.earnedPoints || 0) > 0;
  pendingTrainingCompleteContext = {
    showTicketAfter: shouldAutoShowTicketAfter,
    earnedPoints: Number(options.earnedPoints) || 0,
    onAfterHome: typeof options.onAfterHome === "function" ? options.onAfterHome : null
  };
  deferGameTicketRewardModal = true;
  showScreen("trainingCompleteScreen", { recordHistory: false });
}

function closeTrainingCompleteScreenToHome() {
  const context = pendingTrainingCompleteContext;
  pendingTrainingCompleteContext = null;
  deferGameTicketRewardModal = false;
  renderHome();
  showScreen("homeScreen", { recordHistory: false });
  if (typeof context?.onAfterHome === "function") {
    context.onAfterHome();
  }
}

function dismissCurrentGameTicketReward() {
  const store = ensureGameTicketState();
  if (store && Array.isArray(store.pendingRewards)) {
    store.pendingRewards = [];
    markGameTicketSyncDirty();
  }
  const modal = document.getElementById("gameTicketModal");
  if (modal) {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
  }
  persistGameTicketState();
  if (state?.session && state.session.mode === "challenge") {
    const currentChallengeSession = state.session;
    if (currentChallengeSession && currentChallengeSession.isSessionCompleted === false && !currentChallengeSession.isFinishingSession) {
      currentChallengeSession.awaitingChallengeTicketResume = false;
    }
  }
}

let gameTicketSyncMetaCache = null;
let gameTicketSyncPromise = null;
let gameTicketSyncFlushTimer = null;
let gameTicketSyncDirty = false;
let gameTicketSyncSkipBootstrap = false;
const GAME_TICKET_SYNC_META_KEY = "english-trainer-pc-game-ticket-sync-v1";
const GAME_TICKET_SYNC_SCHEMA_VERSION = 1;
const GAME_TICKET_SYNC_DEBOUNCE_MS = 250;

function createDefaultGameTicketSyncMeta() {
  return {
    uid: "",
    updatedAt: 0,
    lastAppliedRemoteUpdatedAt: 0,
    lastAdoptedSource: ""
  };
}

function sanitizeGameTicketSyncMeta(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    uid: String(source.uid || "").trim(),
    updatedAt: Math.max(0, Number(source.updatedAt) || 0),
    lastAppliedRemoteUpdatedAt: Math.max(0, Number(source.lastAppliedRemoteUpdatedAt) || 0),
    lastAdoptedSource: typeof source.lastAdoptedSource === "string" ? source.lastAdoptedSource : ""
  };
}

function loadGameTicketSyncMeta() {
  if (gameTicketSyncMetaCache) return gameTicketSyncMetaCache;
  try {
    const storageKey = getScopedLocalStorageKey(GAME_TICKET_SYNC_META_KEY);
    if (!storageKey) {
      gameTicketSyncMetaCache = createDefaultGameTicketSyncMeta();
      return gameTicketSyncMetaCache;
    }
    const raw = localStorage.getItem(storageKey);
    gameTicketSyncMetaCache = sanitizeGameTicketSyncMeta(raw ? JSON.parse(raw) : null);
    return gameTicketSyncMetaCache;
  } catch (_error) {
    gameTicketSyncMetaCache = createDefaultGameTicketSyncMeta();
    return gameTicketSyncMetaCache;
  }
}

function saveGameTicketSyncMeta(metaLike) {
  gameTicketSyncMetaCache = sanitizeGameTicketSyncMeta(metaLike);
  const storageKey = getScopedLocalStorageKey(GAME_TICKET_SYNC_META_KEY, gameTicketSyncMetaCache.uid || getCurrentPcFirebaseUid());
  if (!storageKey) return gameTicketSyncMetaCache;
  try {
    localStorage.setItem(storageKey, JSON.stringify(gameTicketSyncMetaCache));
  } catch (_error) {
    // Keep runtime values even if persistence fails.
  }
  return gameTicketSyncMetaCache;
}

function markGameTicketSyncDirty() {
  gameTicketSyncDirty = true;
}

function clearGameTicketSyncDirty() {
  gameTicketSyncDirty = false;
}

function markSkipGameTicketSyncOnce() {
  gameTicketSyncSkipBootstrap = true;
}

function consumeSkipGameTicketSyncOnce() {
  if (!gameTicketSyncSkipBootstrap) return false;
  gameTicketSyncSkipBootstrap = false;
  return true;
}

function persistGameTicketState() {
  markGameTicketSyncDirty();
  saveState();
}

function createGameTicketSyncSummary(storeLike, options = {}) {
  const store = sanitizeGameTicketStats(storeLike);
  const activeInventory = (store.inventory || []).filter((ticket) => !ticket.usedAt && ticket.expiresAt > Date.now());
  return {
    updatedAt: Math.max(0, Number(options.updatedAt) || 0),
    inventoryCount: store.inventory.length,
    activeInventoryCount: activeInventory.length,
    earnedHistoryCount: store.earnedHistory.length,
    usageHistoryCount: store.usageHistory.length,
    pendingRewardsCount: store.pendingRewards.length,
    challengeDayCount: Object.keys(store.challengeTicketStateByDate || {}).length,
    dailyEarnedCount: Math.max(0, Number(store.dailyEarnedCount) || 0),
    dailyTrainingCount: Math.max(0, Number(store.dailyTrainingCount) || 0),
    unsuccessfulEligibleDays: Math.max(0, Number(store.unsuccessfulEligibleDays) || 0),
    normalWeakFocusCompletedCount: Math.max(0, Number(store.normalWeakFocusCompletedCount) || 0),
    normalWeakFocusFirstBonusGranted: Boolean(store.normalWeakFocusFirstBonusGranted),
    streakBonusCount: Array.isArray(store.streakBonusAwardedDays) ? store.streakBonusAwardedDays.length : 0,
    lastProcessedDate: typeof store.lastProcessedDate === "string" ? store.lastProcessedDate : ""
  };
}

function isMeaningfulGameTicketSyncSummary(summary) {
  const safe = summary && typeof summary === "object" ? summary : createGameTicketSyncSummary(createDefaultGameTicketStats());
  return safe.inventoryCount > 0 ||
    safe.earnedHistoryCount > 0 ||
    safe.usageHistoryCount > 0 ||
    safe.pendingRewardsCount > 0 ||
    safe.challengeDayCount > 0 ||
    safe.dailyEarnedCount > 0 ||
    safe.dailyTrainingCount > 0 ||
    safe.unsuccessfulEligibleDays > 0 ||
    safe.normalWeakFocusCompletedCount > 0 ||
    safe.normalWeakFocusFirstBonusGranted ||
    safe.streakBonusCount > 0 ||
    Boolean(safe.lastProcessedDate);
}

function buildGameTicketPayload(storeLike = ensureGameTicketState()) {
  const payload = {
    schemaVersion: GAME_TICKET_SYNC_SCHEMA_VERSION,
    source: "pc",
    updatedAt: Date.now(),
    gameTickets: sanitizeGameTicketStats(storeLike)
  };
  const meta = loadGameTicketSyncMeta();
  meta.uid = String(getCurrentPcFirebaseUid() || meta.uid || "");
  meta.updatedAt = Math.max(meta.updatedAt, payload.updatedAt);
  saveGameTicketSyncMeta(meta);
  return payload;
}

function mergeUniqueEntriesById(primaryList, secondaryList, mergeEntry) {
  const mergedMap = new Map();
  (Array.isArray(primaryList) ? primaryList : []).forEach((entry) => {
    if (!entry?.id || mergedMap.has(entry.id)) return;
    mergedMap.set(entry.id, entry);
  });
  (Array.isArray(secondaryList) ? secondaryList : []).forEach((entry) => {
    if (!entry?.id) return;
    if (!mergedMap.has(entry.id)) {
      mergedMap.set(entry.id, entry);
      return;
    }
    if (typeof mergeEntry === "function") {
      mergedMap.set(entry.id, mergeEntry(mergedMap.get(entry.id), entry));
    }
  });
  return [...mergedMap.values()];
}

function mergeGameTicketInventoryEntry(primaryEntry, secondaryEntry) {
  const primary = sanitizeGameTicketInventoryEntry(primaryEntry);
  const secondary = sanitizeGameTicketInventoryEntry(secondaryEntry);
  if (!primary) return secondary;
  if (!secondary) return primary;
  const usedAtCandidates = [primary.usedAt, secondary.usedAt].filter((value) => Number.isFinite(Number(value)));
  return sanitizeGameTicketInventoryEntry({
    id: primary.id || secondary.id,
    minutes: primary.minutes || secondary.minutes,
    earnedAt: Number.isFinite(Number(primary.earnedAt)) ? primary.earnedAt : secondary.earnedAt,
    expiresAt: Number.isFinite(Number(primary.expiresAt)) ? primary.expiresAt : secondary.expiresAt,
    usedAt: usedAtCandidates.length ? Math.max(...usedAtCandidates) : null,
    source: primary.source === "random" && secondary.source !== "random" ? secondary.source : primary.source
  });
}

function mergeChallengeTicketDailyState(primaryValue, secondaryValue) {
  const primary = sanitizeChallengeTicketDailyState(primaryValue);
  const secondary = sanitizeChallengeTicketDailyState(secondaryValue);
  const mergeThresholdState = (key, thresholds) => {
    const next = { awarded: Boolean(primary[key]?.awarded || secondary[key]?.awarded) };
    thresholds.forEach((threshold) => {
      next[String(threshold)] = Boolean(primary[key]?.[String(threshold)] || secondary[key]?.[String(threshold)]);
    });
    return next;
  };
  return {
    fiveMinute: mergeThresholdState("fiveMinute", [90, 120, 153, 180]),
    fifteenA: mergeThresholdState("fifteenA", [84, 132, 183, 210]),
    fifteenB: mergeThresholdState("fifteenB", [150, 192, 240]),
    thirty: mergeThresholdState("thirty", [126, 201, 249]),
    rescue: {
      processed: Boolean(primary.rescue?.processed || secondary.rescue?.processed),
      awarded: Boolean(primary.rescue?.awarded || secondary.rescue?.awarded)
    }
  };
}

function mergeChallengeTicketStateByDate(primaryState, secondaryState) {
  const dayKeys = new Set([
    ...Object.keys(primaryState && typeof primaryState === "object" ? primaryState : {}),
    ...Object.keys(secondaryState && typeof secondaryState === "object" ? secondaryState : {})
  ]);
  return Object.fromEntries([...dayKeys].map((dayKey) => {
    return [String(dayKey), mergeChallengeTicketDailyState(primaryState?.[dayKey], secondaryState?.[dayKey])];
  }));
}

function mergeGameTicketStates(primaryState, secondaryState) {
  const primary = sanitizeGameTicketStats(primaryState);
  const secondary = sanitizeGameTicketStats(secondaryState);
  const primaryDayIsNewer = String(primary.lastProcessedDate || "") >= String(secondary.lastProcessedDate || "");
  const dayCounterSource = primary.lastProcessedDate === secondary.lastProcessedDate
    ? null
    : (primaryDayIsNewer ? primary : secondary);
  return sanitizeGameTicketStats({
    inventory: mergeUniqueEntriesById(primary.inventory, secondary.inventory, mergeGameTicketInventoryEntry),
    dailyTrainingCount: dayCounterSource ? dayCounterSource.dailyTrainingCount : Math.max(primary.dailyTrainingCount, secondary.dailyTrainingCount),
    dailyEarnedCount: dayCounterSource ? dayCounterSource.dailyEarnedCount : Math.max(primary.dailyEarnedCount, secondary.dailyEarnedCount),
    normalWeakFocusCompletedCount: Math.max(primary.normalWeakFocusCompletedCount, secondary.normalWeakFocusCompletedCount),
    normalWeakFocusFirstBonusGranted: Boolean(primary.normalWeakFocusFirstBonusGranted || secondary.normalWeakFocusFirstBonusGranted),
    unsuccessfulEligibleDays: dayCounterSource ? dayCounterSource.unsuccessfulEligibleDays : Math.max(primary.unsuccessfulEligibleDays, secondary.unsuccessfulEligibleDays),
    lastProcessedDate: String(primary.lastProcessedDate || "") >= String(secondary.lastProcessedDate || "") ? primary.lastProcessedDate : secondary.lastProcessedDate,
    streakBonusAwardedDays: [...new Set([...(primary.streakBonusAwardedDays || []), ...(secondary.streakBonusAwardedDays || [])])],
    earnedHistory: mergeUniqueEntriesById(primary.earnedHistory, secondary.earnedHistory).sort((left, right) => Number(right?.earnedAt || 0) - Number(left?.earnedAt || 0)),
    usageHistory: mergeUniqueEntriesById(primary.usageHistory, secondary.usageHistory).sort((left, right) => Number(right?.usedAt || 0) - Number(left?.usedAt || 0)),
    pendingRewards: mergeUniqueEntriesById(primary.pendingRewards, secondary.pendingRewards).sort((left, right) => Number(left?.queuedAt || 0) - Number(right?.queuedAt || 0)),
    challengeTicketStateByDate: mergeChallengeTicketStateByDate(primary.challengeTicketStateByDate, secondary.challengeTicketStateByDate)
  });
}

function chooseGameTicketSyncAdoption(localStore, remoteResult) {
  const localMeta = loadGameTicketSyncMeta();
  const localSummary = createGameTicketSyncSummary(localStore, { updatedAt: localMeta.updatedAt });
  const remoteSummary = createGameTicketSyncSummary(remoteResult?.data?.gameTickets, {
    updatedAt: Math.max(0, Number(remoteResult?.data?.updatedAt) || 0)
  });
  const remoteExists = Boolean(remoteResult?.exists && remoteResult?.data && typeof remoteResult.data === "object");
  if (!remoteExists) {
    if (isMeaningfulGameTicketSyncSummary(localSummary)) {
      return { adopted: "local-first-upload", localSummary, remoteSummary, reason: "remote-missing" };
    }
    return { adopted: "none", localSummary, remoteSummary, reason: "both-empty" };
  }
  if (!isMeaningfulGameTicketSyncSummary(localSummary)) {
    return { adopted: "firestore", localSummary, remoteSummary, reason: "local-empty" };
  }
  if (localSummary.updatedAt > remoteSummary.updatedAt) {
    return { adopted: "local", localSummary, remoteSummary, reason: "local-newer" };
  }
  return { adopted: "firestore", localSummary, remoteSummary, reason: remoteSummary.updatedAt > localSummary.updatedAt ? "remote-newer" : "timestamps-equal" };
}

function applyGameTicketStateFromFirestore(remoteData) {
  if (!remoteData || typeof remoteData !== "object") return false;
  state.stats.gameTickets = sanitizeGameTicketStats(remoteData.gameTickets);
  clearGameTicketSyncDirty();
  saveState();
  const meta = loadGameTicketSyncMeta();
  meta.uid = String(getCurrentPcFirebaseUid() || meta.uid || "");
  meta.updatedAt = Math.max(meta.updatedAt, Math.max(0, Number(remoteData.updatedAt) || 0));
  meta.lastAppliedRemoteUpdatedAt = Math.max(0, Number(remoteData.updatedAt) || 0);
  meta.lastAdoptedSource = "firestore";
  saveGameTicketSyncMeta(meta);
  return true;
}

async function flushGameTicketSync() {
  if (gameTicketSyncPromise) return gameTicketSyncPromise;
  const currentUid = getCurrentPcFirebaseUid();
  if (!currentUid || typeof window.loadGameTicketsFromFirestore !== "function" || typeof window.saveGameTicketsToFirestore !== "function") {
    return false;
  }

  gameTicketSyncPromise = (async () => {
    const localStore = ensureGameTicketState();
    const remoteResult = await window.loadGameTicketsFromFirestore(currentUid);
    const adoption = chooseGameTicketSyncAdoption(localStore, remoteResult);

    if (adoption.adopted === "none") {
      clearGameTicketSyncDirty();
      return false;
    }

    if (adoption.adopted === "firestore") {
      applyGameTicketStateFromFirestore(remoteResult.data);
      return false;
    }

    const mergedStore = adoption.adopted === "local" && remoteResult?.exists
      ? mergeGameTicketStates(localStore, remoteResult.data?.gameTickets)
      : sanitizeGameTicketStats(localStore);
    const payload = buildGameTicketPayload(mergedStore);
    const saved = await window.saveGameTicketsToFirestore(payload, { targetUid: currentUid });
    if (!saved) {
      return false;
    }
    state.stats.gameTickets = sanitizeGameTicketStats(mergedStore);
    clearGameTicketSyncDirty();
    saveState();
    const meta = loadGameTicketSyncMeta();
    meta.uid = currentUid;
    meta.updatedAt = Math.max(meta.updatedAt, payload.updatedAt);
    meta.lastAppliedRemoteUpdatedAt = Math.max(meta.lastAppliedRemoteUpdatedAt, payload.updatedAt);
    meta.lastAdoptedSource = adoption.adopted === "local-first-upload" ? "local-first-upload" : "local";
    saveGameTicketSyncMeta(meta);
    return true;
  })().finally(() => {
    gameTicketSyncPromise = null;
  });

  return gameTicketSyncPromise;
}

function scheduleGameTicketSync() {
  if (gameTicketSyncFlushTimer) {
    clearTimeout(gameTicketSyncFlushTimer);
  }
  gameTicketSyncFlushTimer = setTimeout(() => {
    gameTicketSyncFlushTimer = null;
    flushGameTicketSync().catch((error) => {
      console.error("Failed to synchronize game tickets", error);
    });
  }, GAME_TICKET_SYNC_DEBOUNCE_MS);
}

async function syncGameTicketAfterLogin() {
  const currentUid = getCurrentPcFirebaseUid();
  if (!currentUid || typeof window.loadGameTicketsFromFirestore !== "function" || typeof window.saveGameTicketsToFirestore !== "function") {
    return;
  }
  if (consumeSkipGameTicketSyncOnce()) {
    const meta = loadGameTicketSyncMeta();
    meta.uid = currentUid;
    meta.lastAdoptedSource = "restore-local-only-skip-sync";
    saveGameTicketSyncMeta(meta);
    return;
  }

  const localStore = ensureGameTicketState();
  const remoteResult = await window.loadGameTicketsFromFirestore(currentUid);
  const adoption = chooseGameTicketSyncAdoption(localStore, remoteResult);

  if (adoption.adopted === "firestore") {
    applyGameTicketStateFromFirestore(remoteResult.data);
    return;
  }

  if (adoption.adopted === "local" || adoption.adopted === "local-first-upload") {
    await flushGameTicketSync();
  }
}

function bindGameTicketAuthStateListener() {
  if (document.body?.dataset.gameTicketAuthBound === "true") return;
  document.addEventListener("pc-firebase-auth-state", (event) => {
    const user = event?.detail?.user || null;
    if (!user) {
      clearGameTicketSyncDirty();
      return;
    }
    syncGameTicketAfterLogin().catch((error) => {
      console.error("Failed to synchronize game tickets after login", error);
    });
  });
  if (document.body) {
    document.body.dataset.gameTicketAuthBound = "true";
  }
}

let pointStateCache = null;
let pointRewardQueue = [];
let pointRewardTimerId = null;
let pendingPointExchangeItemId = "";
let pointStateBootstrapPromise = null;
let pointStateSyncMetaCache = null;
let pointStateSyncPromise = null;
let pointStateSyncFlushTimer = null;
let pointStateSyncSkipBootstrap = false;
const POINT_STATE_SYNC_META_KEY = "english-trainer-pc-point-sync-v1";
const POINT_STATE_SYNC_DEBOUNCE_MS = 250;

function formatPointValue(value) {
  return `${new Intl.NumberFormat("ja-JP").format(Math.max(0, Math.floor(Number(value) || 0)))}P`;
}

function createDefaultPointState() {
  return {
    balance: 0,
    dailyEarnedByDate: {},
    dailyEarnedByModeByDate: {},
    dayAdvanceBonusAwardedByDay: {},
    dayUnstudiedClearBonusAwardedByDay: {},
    todayEarned: 0,
    previousDayEarned: 0,
    totalEarned: 0,
    dailyLimitMode: POINT_SYSTEM_CONFIG.defaultDailyLimitMode,
    targetItemId: "",
    redeemedItemCounts: {},
    redeemedItemIds: []
  };
}

function getPointLegacyLocalDateKeyWithOffset(offsetDays) {
  const base = new Date();
  base.setDate(base.getDate() + Number(offsetDays || 0));
  return formatDateKey(base);
}

function getPointDateKeyWithOffset(offsetDays) {
  const safeOffsetDays = Number(offsetDays || 0);
  const targetTimestamp = Date.now() + (safeOffsetDays * 86400000);
  return getLearningHistoryDayKey(targetTimestamp);
}

function migratePointDayKeyRow(pointState, jstDayKey, offsetDays) {
  const legacyLocalKey = getPointLegacyLocalDateKeyWithOffset(offsetDays);
  if (!legacyLocalKey || legacyLocalKey === jstDayKey) return;

  const legacyDaily = Math.max(0, Number(pointState.dailyEarnedByDate?.[legacyLocalKey]) || 0);
  if (legacyDaily > 0) {
    pointState.dailyEarnedByDate = pointState.dailyEarnedByDate && typeof pointState.dailyEarnedByDate === "object"
      ? pointState.dailyEarnedByDate
      : {};
    pointState.dailyEarnedByDate[jstDayKey] = Math.max(0, Number(pointState.dailyEarnedByDate?.[jstDayKey]) || 0) + legacyDaily;
    delete pointState.dailyEarnedByDate[legacyLocalKey];
  }

  const legacyModeRow = pointState.dailyEarnedByModeByDate?.[legacyLocalKey];
  if (legacyModeRow && typeof legacyModeRow === "object") {
    const targetModeRow = pointState.dailyEarnedByModeByDate?.[jstDayKey] && typeof pointState.dailyEarnedByModeByDate[jstDayKey] === "object"
      ? pointState.dailyEarnedByModeByDate[jstDayKey]
      : createDefaultPointDayModeRow();
    targetModeRow["day-study"] = Math.max(0, Number(targetModeRow["day-study"]) || 0) + Math.max(0, Number(legacyModeRow["day-study"]) || 0);
    targetModeRow["unstudied-clear"] = Math.max(0, Number(targetModeRow["unstudied-clear"]) || 0) + Math.max(0, Number(legacyModeRow["unstudied-clear"]) || 0);
    targetModeRow.preposition = Math.max(0, Number(targetModeRow.preposition) || 0) + Math.max(0, Number(legacyModeRow.preposition) || 0);
    targetModeRow.response = Math.max(0, Number(targetModeRow.response) || 0) + Math.max(0, Number(legacyModeRow.response) || 0);
    targetModeRow.challenge = Math.max(0, Number(targetModeRow.challenge) || 0) + Math.max(0, Number(legacyModeRow.challenge) || 0);
    targetModeRow["irregular-verb"] = Math.max(0, Number(targetModeRow["irregular-verb"]) || 0) + Math.max(0, Number(legacyModeRow["irregular-verb"]) || 0);
    targetModeRow.idiom = Math.max(0, Number(targetModeRow.idiom) || 0) + Math.max(0, Number(legacyModeRow.idiom) || 0);

    pointState.dailyEarnedByModeByDate = pointState.dailyEarnedByModeByDate && typeof pointState.dailyEarnedByModeByDate === "object"
      ? pointState.dailyEarnedByModeByDate
      : {};
    pointState.dailyEarnedByModeByDate[jstDayKey] = targetModeRow;
    delete pointState.dailyEarnedByModeByDate[legacyLocalKey];
  }
}

function hydratePointDaySnapshots(pointState) {
  const todayKey = getPointDateKeyWithOffset(0);
  const previousKey = getPointDateKeyWithOffset(-1);
  migratePointDayKeyRow(pointState, todayKey, 0);
  migratePointDayKeyRow(pointState, previousKey, -1);
  pointState.todayEarned = Math.max(0, Number(pointState.dailyEarnedByDate?.[todayKey]) || 0);
  pointState.previousDayEarned = Math.max(0, Number(pointState.dailyEarnedByDate?.[previousKey]) || 0);
  if (!Number.isFinite(Number(pointState.totalEarned)) || Number(pointState.totalEarned) < pointState.balance) {
    pointState.totalEarned = Math.max(pointState.balance, 0);
  }
  return pointState;
}

function sanitizePointState(value) {
  const source = value && typeof value === "object" ? value : {};
  const dailyEarnedByDate = source.dailyEarnedByDate && typeof source.dailyEarnedByDate === "object"
    ? Object.fromEntries(
      Object.entries(source.dailyEarnedByDate).map(([dayKey, earned]) => [String(dayKey), Math.max(0, Math.floor(Number(earned) || 0))])
    )
    : {};
  const dailyEarnedByModeByDate = source.dailyEarnedByModeByDate && typeof source.dailyEarnedByModeByDate === "object"
    ? Object.fromEntries(
      Object.entries(source.dailyEarnedByModeByDate).map(([dayKey, modeRow]) => {
        const safeRow = modeRow && typeof modeRow === "object" ? modeRow : {};
        return [String(dayKey), {
          "day-study": Math.max(0, Math.floor(Number(safeRow["day-study"]) || 0)),
          "unstudied-clear": Math.max(0, Math.floor(Number(safeRow["unstudied-clear"]) || 0)),
          preposition: Math.max(0, Math.floor(Number(safeRow.preposition) || 0)),
          response: Math.max(0, Math.floor(Number(safeRow.response) || 0)),
          challenge: Math.max(0, Math.floor(Number(safeRow.challenge) || 0)),
          "irregular-verb": Math.max(0, Math.floor(Number(safeRow["irregular-verb"]) || 0)),
          idiom: Math.max(0, Math.floor(Number(safeRow.idiom) || 0))
        }];
      })
    )
    : {};
  const dayAdvanceBonusAwardedByDay = source.dayAdvanceBonusAwardedByDay && typeof source.dayAdvanceBonusAwardedByDay === "object"
    ? Object.fromEntries(
      Object.entries(source.dayAdvanceBonusAwardedByDay)
        .filter(([dayKey, awarded]) => Number.isFinite(Number(dayKey)) && Number(dayKey) >= 1 && Boolean(awarded))
        .map(([dayKey]) => [String(Math.floor(Number(dayKey))), true])
    )
    : {};
  const dayUnstudiedClearBonusAwardedByDay = source.dayUnstudiedClearBonusAwardedByDay && typeof source.dayUnstudiedClearBonusAwardedByDay === "object"
    ? Object.fromEntries(
      Object.entries(source.dayUnstudiedClearBonusAwardedByDay)
        .filter(([dayKey, awarded]) => Number.isFinite(Number(dayKey)) && Number(dayKey) >= 1 && Boolean(awarded))
        .map(([dayKey]) => [String(Math.floor(Number(dayKey))), true])
    )
    : {};
  const redeemedItemIds = Array.isArray(source.redeemedItemIds)
    ? [...new Set(source.redeemedItemIds.map((id) => String(id)).filter(Boolean))]
    : [];
  const redeemedItemCounts = source.redeemedItemCounts && typeof source.redeemedItemCounts === "object"
    ? Object.fromEntries(
      Object.entries(source.redeemedItemCounts).map(([itemId, count]) => [String(itemId), Math.max(0, Math.floor(Number(count) || 0))])
    )
    : {};
  redeemedItemIds.forEach((itemId) => {
    redeemedItemCounts[itemId] = Math.max(1, Number(redeemedItemCounts[itemId]) || 0);
  });
  const dailyLimitMode = Object.prototype.hasOwnProperty.call(POINT_SYSTEM_CONFIG.dailyLimitModes, source.dailyLimitMode)
    ? source.dailyLimitMode
    : POINT_SYSTEM_CONFIG.defaultDailyLimitMode;
  return {
    balance: Math.max(0, Math.floor(Number(source.balance) || 0)),
    dailyEarnedByDate,
    dailyEarnedByModeByDate,
    dayAdvanceBonusAwardedByDay,
    dayUnstudiedClearBonusAwardedByDay,
    todayEarned: Math.max(0, Math.floor(Number(source.todayEarned) || 0)),
    previousDayEarned: Math.max(0, Math.floor(Number(source.previousDayEarned) || 0)),
    totalEarned: Math.max(0, Math.floor(Number(source.totalEarned) || 0)),
    dailyLimitMode,
    targetItemId: typeof source.targetItemId === "string" ? source.targetItemId : "",
    redeemedItemCounts,
    redeemedItemIds
  };
}

function createDefaultPointStateSyncMeta() {
  return {
    uid: "",
    updatedAt: 0,
    lastAppliedRemoteUpdatedAt: 0,
    lastAdoptedSource: ""
  };
}

function sanitizePointStateSyncMeta(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    uid: typeof source.uid === "string" ? source.uid : "",
    updatedAt: Math.max(0, Number(source.updatedAt) || 0),
    lastAppliedRemoteUpdatedAt: Math.max(0, Number(source.lastAppliedRemoteUpdatedAt) || 0),
    lastAdoptedSource: typeof source.lastAdoptedSource === "string" ? source.lastAdoptedSource : ""
  };
}

function loadPointStateSyncMeta() {
  if (pointStateSyncMetaCache) return pointStateSyncMetaCache;
  try {
    const storageKey = getScopedLocalStorageKey(POINT_STATE_SYNC_META_KEY);
    if (!storageKey) {
      pointStateSyncMetaCache = createDefaultPointStateSyncMeta();
      return pointStateSyncMetaCache;
    }
    const raw = localStorage.getItem(storageKey);
    pointStateSyncMetaCache = raw
      ? sanitizePointStateSyncMeta(JSON.parse(raw))
      : createDefaultPointStateSyncMeta();
    return pointStateSyncMetaCache;
  } catch (_error) {
    pointStateSyncMetaCache = createDefaultPointStateSyncMeta();
    return pointStateSyncMetaCache;
  }
}

function savePointStateSyncMeta(nextMeta) {
  pointStateSyncMetaCache = sanitizePointStateSyncMeta(nextMeta);
  const storageKey = getScopedLocalStorageKey(POINT_STATE_SYNC_META_KEY);
  if (!storageKey) return pointStateSyncMetaCache;
  localStorage.setItem(storageKey, JSON.stringify(pointStateSyncMetaCache));
  return pointStateSyncMetaCache;
}

function createPointStateSummary(pointState, options = {}) {
  const safe = sanitizePointState(pointState);
  return {
    balance: Math.max(0, Number(safe.balance) || 0),
    totalEarned: Math.max(0, Number(safe.totalEarned) || 0),
    dayAdvanceBonusCount: Object.keys(safe.dayAdvanceBonusAwardedByDay || {}).length,
    redeemedItemCount: Object.keys(safe.redeemedItemCounts || {}).reduce((sum, key) => sum + Math.max(0, Number(safe.redeemedItemCounts[key]) || 0), 0),
    redeemedItemIdCount: Array.isArray(safe.redeemedItemIds) ? safe.redeemedItemIds.length : 0,
    updatedAt: Math.max(0, Number(options.updatedAt) || 0)
  };
}

function buildPointStatePayload(pointState = getPointState(), options = {}) {
  const meta = loadPointStateSyncMeta();
  const updatedAt = Math.max(0, Number(options.updatedAt) || Date.now());
  const payload = {
    schemaVersion: 1,
    updatedAt,
    source: {
      deviceType: "pc",
      appVersion: APP_VERSION
    },
    pointState: sanitizePointState(pointState)
  };
  meta.uid = String(getCurrentPcFirebaseUid() || meta.uid || "");
  meta.updatedAt = Math.max(meta.updatedAt, updatedAt);
  savePointStateSyncMeta(meta);
  return payload;
}

function applyPointStateFromFirestore(remoteData) {
  if (!remoteData || typeof remoteData !== "object") return false;
  const nextPointState = sanitizePointState(remoteData.pointState);
  savePointState(nextPointState);
  const meta = loadPointStateSyncMeta();
  meta.uid = String(getCurrentPcFirebaseUid() || meta.uid || "");
  meta.updatedAt = Math.max(meta.updatedAt, Math.max(0, Number(remoteData.updatedAt) || 0));
  meta.lastAppliedRemoteUpdatedAt = Math.max(0, Number(remoteData.updatedAt) || 0);
  meta.lastAdoptedSource = "firestore";
  savePointStateSyncMeta(meta);
  pointStateSyncSkipBootstrap = true;
  return true;
}

function getPointStateRegressionReasons(candidateSummary, baselineSummary) {
  const reasons = [];
  const candidate = candidateSummary && typeof candidateSummary === "object" ? candidateSummary : createPointStateSummary(createDefaultPointState());
  const baseline = baselineSummary && typeof baselineSummary === "object" ? baselineSummary : createPointStateSummary(createDefaultPointState());
  if (candidate.totalEarned < baseline.totalEarned) {
    reasons.push(`totalEarned: ${candidate.totalEarned} < ${baseline.totalEarned}`);
  }
  if (candidate.dayAdvanceBonusCount < baseline.dayAdvanceBonusCount) {
    reasons.push(`dayAdvanceBonusCount: ${candidate.dayAdvanceBonusCount} < ${baseline.dayAdvanceBonusCount}`);
  }
  if (candidate.redeemedItemCount < baseline.redeemedItemCount) {
    reasons.push(`redeemedItemCount: ${candidate.redeemedItemCount} < ${baseline.redeemedItemCount}`);
  }
  if (candidate.redeemedItemIdCount < baseline.redeemedItemIdCount) {
    reasons.push(`redeemedItemIdCount: ${candidate.redeemedItemIdCount} < ${baseline.redeemedItemIdCount}`);
  }
  return reasons;
}

function shouldBootstrapPointStateFromFirestoreSummary(remotePayload) {
  if (!remotePayload?.exists || !remotePayload?.data || typeof remotePayload.data !== "object") {
    return false;
  }
  const remoteSummary = createPointStateSummary(remotePayload.data.pointState, {
    updatedAt: Math.max(0, Number(remotePayload.data.updatedAt) || 0)
  });
  return remoteSummary.totalEarned > 0 || remoteSummary.balance > 0 || remoteSummary.dayAdvanceBonusCount > 0 || remoteSummary.redeemedItemCount > 0;
}

function choosePointStateAdoption(localPointState, remoteResult) {
  const localMeta = loadPointStateSyncMeta();
  const localSummary = createPointStateSummary(localPointState, { updatedAt: localMeta.updatedAt });
  const remoteSummary = createPointStateSummary(remoteResult?.data?.pointState, {
    updatedAt: Math.max(0, Number(remoteResult?.data?.updatedAt) || 0)
  });
  const remoteExists = Boolean(remoteResult?.exists && remoteResult?.data && typeof remoteResult.data === "object");

  if (!remoteExists) {
    if (localSummary.totalEarned > 0 || localSummary.balance > 0 || localSummary.dayAdvanceBonusCount > 0 || localSummary.redeemedItemCount > 0) {
      return { adopted: "local-first-upload", remoteSummary, localSummary, reason: "remote-missing" };
    }
    return { adopted: "none", remoteSummary, localSummary, reason: "both-empty" };
  }

  const regressionReasons = getPointStateRegressionReasons(localSummary, remoteSummary);
  if (regressionReasons.length) {
    return { adopted: "firestore", remoteSummary, localSummary, reason: `local-regression:${regressionReasons.join(', ')}` };
  }

  if (remoteSummary.updatedAt > localSummary.updatedAt) {
    return { adopted: "firestore", remoteSummary, localSummary, reason: "remote-newer" };
  }
  if (localSummary.updatedAt > remoteSummary.updatedAt) {
    return { adopted: "local", remoteSummary, localSummary, reason: "local-newer" };
  }

  return { adopted: "firestore", remoteSummary, localSummary, reason: "timestamps-equal" };
}

async function flushPointStateSync() {
  if (pointStateSyncPromise) return pointStateSyncPromise;
  const currentUid = getCurrentPcFirebaseUid();
  if (!currentUid || typeof window.savePointStateToFirestore !== "function") return false;

  const payload = buildPointStatePayload(getPointState());
  pointStateSyncPromise = (async () => {
    const remoteResult = typeof window.loadPointStateFromFirestore === "function"
      ? await window.loadPointStateFromFirestore(currentUid)
      : { exists: false, data: null };
    const remoteSummary = createPointStateSummary(remoteResult?.data?.pointState, {
      updatedAt: Math.max(0, Number(remoteResult?.data?.updatedAt) || 0)
    });
    const localSummary = createPointStateSummary(payload.pointState, { updatedAt: payload.updatedAt });
    const regressionReasons = getPointStateRegressionReasons(localSummary, remoteSummary);
    if (remoteResult?.exists && regressionReasons.length) {
      console.warn("[PointSync] skipped dangerous overwrite", {
        uid: currentUid,
        localSummary,
        remoteSummary,
        regressionReasons
      });
      return false;
    }

    const saved = await window.savePointStateToFirestore(payload, { targetUid: currentUid });
    if (!saved) {
      return false;
    }
    const meta = loadPointStateSyncMeta();
    meta.uid = currentUid;
    meta.updatedAt = Math.max(meta.updatedAt, payload.updatedAt);
    meta.lastAdoptedSource = "local";
    savePointStateSyncMeta(meta);
    return true;
  })().finally(() => {
    pointStateSyncPromise = null;
  });

  return pointStateSyncPromise;
}

function schedulePointStateSync() {
  if (pointStateSyncFlushTimer) {
    clearTimeout(pointStateSyncFlushTimer);
  }
  pointStateSyncFlushTimer = setTimeout(() => {
    pointStateSyncFlushTimer = null;
    flushPointStateSync().catch((error) => {
      console.error("Failed to synchronize point state", error);
    });
  }, POINT_STATE_SYNC_DEBOUNCE_MS);
}

async function syncPointStateAfterLogin() {
  const currentUid = getCurrentPcFirebaseUid();
  if (!currentUid || typeof window.loadPointStateFromFirestore !== "function" || typeof window.savePointStateToFirestore !== "function") {
    return;
  }

  const localPointState = getPointState();
  const remoteResult = await window.loadPointStateFromFirestore(currentUid);
  const adoption = choosePointStateAdoption(localPointState, remoteResult);

  if (adoption.adopted === "firestore") {
    applyPointStateFromFirestore(remoteResult.data);
    renderPointExchangeScreen();
    return;
  }

  if (adoption.adopted === "local" || adoption.adopted === "local-first-upload") {
    await flushPointStateSync();
    return;
  }
}

function bindPointStateAuthStateListener() {
  if (document.body?.dataset.pointStateAuthBound === "true") return;
  document.addEventListener("pc-firebase-auth-state", (event) => {
    const user = event?.detail?.user || null;
    if (!user) return;
    pointStateSyncSkipBootstrap = false;
    syncPointStateAfterLogin().catch((error) => {
      console.error("Failed to synchronize point state after login", error);
    });
  });
  if (document.body) {
    document.body.dataset.pointStateAuthBound = "true";
  }
}

function loadPointState() {
  try {
    const storageKey = getScopedLocalStorageKey(POINT_SYSTEM_STORAGE_KEY);
    if (!storageKey) return createDefaultPointState();
    const raw = localStorage.getItem(storageKey);
    if (!raw) return createDefaultPointState();
    return sanitizePointState(JSON.parse(raw));
  } catch (_error) {
    return createDefaultPointState();
  }
}

function savePointState(nextState) {
  pointStateCache = hydratePointDaySnapshots(sanitizePointState(nextState));
  const storageKey = getScopedLocalStorageKey(POINT_SYSTEM_STORAGE_KEY);
  if (storageKey) {
    localStorage.setItem(storageKey, JSON.stringify(pointStateCache));
  }
  const meta = loadPointStateSyncMeta();
  meta.uid = String(getCurrentPcFirebaseUid() || meta.uid || "");
  meta.updatedAt = Date.now();
  savePointStateSyncMeta(meta);
  if (getCurrentPcFirebaseUid()) {
    schedulePointStateSync();
  }
  return pointStateCache;
}

function getPointState() {
  if (!pointStateCache) {
    pointStateCache = hydratePointDaySnapshots(loadPointState());
  }
  return pointStateCache;
}

function getPointDailyLimit(mode = getPointState().dailyLimitMode) {
  return Math.max(0, Number(POINT_SYSTEM_CONFIG.dailyLimitModes[mode] || POINT_SYSTEM_CONFIG.dailyLimitModes.normal || 0) || 0);
}

function getPointTodayKey() {
  return getPointDateKeyWithOffset(0);
}

function inferPointModeFromLearningHistoryEntry(mode) {
  const normalized = String(mode || "").trim();
  if (!normalized) return "";
  const lowerMode = normalized.toLowerCase();
  if (normalized === "preposition" || normalized === "preposition-training" || normalized === "前置詞特訓") {
    return "preposition";
  }
  if (normalized === "response" || normalized === "response-training" || normalized === "応答文特訓") {
    return "response";
  }
  if (normalized === "irregular-verb" || normalized === "irregular-verb-training" || normalized === "不規則動詞特訓") {
    return "irregular-verb";
  }
  if (normalized === "challenge" || normalized === "review" || normalized === "過去の間違い") {
    return "challenge";
  }
  if (lowerMode.includes("phrase") || lowerMode.includes("idiom") || normalized.includes("熟語")) {
    return "idiom";
  }
  return "";
}

function getLearningHistoryEntryDayKeyForPoints(entry) {
  const endedAt = Number(entry?.endedAt);
  if (Number.isFinite(endedAt) && endedAt > 0) {
    return getLearningHistoryDayKey(endedAt);
  }
  const startedAt = Number(entry?.startedAt);
  if (Number.isFinite(startedAt) && startedAt > 0) {
    return getLearningHistoryDayKey(startedAt);
  }
  const dateText = String(entry?.studyDate || entry?.learnedAt || "").trim();
  const match = dateText.match(/(\d{4})[\/-](\d{2})[\/-](\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
}

function shouldBootstrapPointStateFromFirestore() {
  const currentUid = getCurrentPcFirebaseUid();
  if (!currentUid) return false;

  const storageKey = getScopedLocalStorageKey(POINT_SYSTEM_STORAGE_KEY, currentUid);
  if (!storageKey) return false;

  const raw = localStorage.getItem(storageKey);
  if (!raw) return true;

  try {
    const existing = sanitizePointState(JSON.parse(raw));
    if ((existing.totalEarned || 0) > 0) return false;
    if ((existing.balance || 0) > 0) return false;
    if (Object.keys(existing.dailyEarnedByDate || {}).length > 0) return false;
    return true;
  } catch (_error) {
    return true;
  }
}

async function ensurePointStateFromFirestoreIfMissing() {
  if (pointStateSyncSkipBootstrap) return false;
  if (typeof window.loadPointStateFromFirestore === "function") {
    const remoteResult = await window.loadPointStateFromFirestore(getCurrentPcFirebaseUid());
    if (shouldBootstrapPointStateFromFirestoreSummary(remoteResult)) {
      applyPointStateFromFirestore(remoteResult.data);
      return true;
    }
  }
  if (!shouldBootstrapPointStateFromFirestore()) return false;
  if (pointStateBootstrapPromise) return pointStateBootstrapPromise;

  const currentUid = getCurrentPcFirebaseUid();
  const watchFn = window.watchLearningHistoryEntriesFromFirestore;
  if (!currentUid || typeof watchFn !== "function") return false;

  pointStateBootstrapPromise = new Promise((resolve) => {
    let finished = false;
    const bootstrapUid = currentUid;
    const finish = (didBootstrap) => {
      if (finished) return;
      finished = true;
      resolve(Boolean(didBootstrap));
    };

    const unsubscribe = watchFn(currentUid, {
      onUpdate: (entries) => {
        if (getCurrentPcFirebaseUid() !== bootstrapUid) {
          try {
            unsubscribe?.();
          } catch (_error) {
            // no-op
          }
          finish(false);
          return;
        }

        if (!shouldBootstrapPointStateFromFirestore()) {
          try {
            unsubscribe?.();
          } catch (_error) {
            // no-op
          }
          finish(false);
          return;
        }

        const source = (Array.isArray(entries) ? entries : []).filter((entry) => isFirestoreHomeHistoryEntryEligible(entry));
        if (!source.length) {
          try {
            unsubscribe?.();
          } catch (_error) {
            // no-op
          }
          finish(false);
          return;
        }

        const restored = createDefaultPointState();
        const sortedEntries = [...source].sort((left, right) => {
          const leftTs = Number(left?.endedAt || left?.startedAt || 0);
          const rightTs = Number(right?.endedAt || right?.startedAt || 0);
          return leftTs - rightTs;
        });

        sortedEntries.forEach((entry) => {
          const pointMode = inferPointModeFromLearningHistoryEntry(entry?.mode);
          if (!pointMode) return;
          const dayKey = getLearningHistoryEntryDayKeyForPoints(entry);
          if (!dayKey) return;

          const dayTotal = Math.max(0, Number(restored.dailyEarnedByDate?.[dayKey]) || 0);
          const dayModeRow = restored.dailyEarnedByModeByDate?.[dayKey] && typeof restored.dailyEarnedByModeByDate[dayKey] === "object"
            ? restored.dailyEarnedByModeByDate[dayKey]
            : createDefaultPointDayModeRow();
          const modeEarned = Math.max(0, Number(dayModeRow[pointMode]) || 0);

          const modeCap = Math.max(0, Number(POINT_SYSTEM_CONFIG.dailyCapByTrainingMode[pointMode]) || 0);
          if (modeEarned >= modeCap) return;

          dayModeRow[pointMode] = modeEarned + 1;
          restored.dailyEarnedByModeByDate[dayKey] = dayModeRow;
          restored.dailyEarnedByDate[dayKey] = dayTotal + 1;
          restored.totalEarned += 1;
          restored.balance += 1;
        });

        savePointState(restored);
        try {
          unsubscribe?.();
        } catch (_error) {
          // no-op
        }
        finish(true);
      },
      onError: () => {
        try {
          unsubscribe?.();
        } catch (_error) {
          // no-op
        }
        finish(false);
      }
    }, {
      allowOtherUser: false
    });

    setTimeout(() => {
      try {
        unsubscribe?.();
      } catch (_error) {
        // no-op
      }
      finish(false);
    }, 4000);
  }).finally(() => {
    pointStateBootstrapPromise = null;
  });

  return pointStateBootstrapPromise;
}

function getPointItemById(itemId) {
  return POINT_SYSTEM_CONFIG.exchangeItems.find((item) => item.id === itemId) || null;
}

function getPointRedeemedCount(pointState, itemId) {
  const fromCounts = Math.max(0, Number(pointState.redeemedItemCounts?.[itemId]) || 0);
  if (fromCounts > 0) return fromCounts;
  return (pointState.redeemedItemIds || []).includes(itemId) ? 1 : 0;
}

function getPointItemRemainingRedemptions(pointState, item) {
  const max = Number(item?.maxRedemptions);
  if (!Number.isFinite(max) || max <= 0) return null;
  return Math.max(0, Math.floor(max) - getPointRedeemedCount(pointState, item.id));
}

function isPointItemRedeemable(pointState, item) {
  if (!item || item.available === false) return false;
  const remaining = getPointItemRemainingRedemptions(pointState, item);
  return remaining === null || remaining > 0;
}

function getAvailablePointItems(pointState = getPointState()) {
  return POINT_SYSTEM_CONFIG.exchangeItems.filter((item) => {
    if (item.available === false) return true;
    const remaining = getPointItemRemainingRedemptions(pointState, item);
    return remaining === null || remaining > 0;
  });
}

function awardPointsForTrainingMode(mode) {
  const modeKey = String(mode || "").trim();
  const rewardBase = Math.max(0, Number(POINT_SYSTEM_CONFIG.rewardByTrainingMode[modeKey]) || 0);
  if (!rewardBase) return 0;

  if (modeKey === "review") {
    return 0;
  }

  const pointState = getPointState();
  const todayKey = getPointTodayKey();
  migratePointDayKeyRow(pointState, todayKey, 0);
  const todayEarned = Math.max(0, Number(pointState.dailyEarnedByDate[todayKey]) || 0);
  const modeDailyCap = Math.max(0, Number(POINT_SYSTEM_CONFIG.dailyCapByTrainingMode[modeKey]) || 0);
  const modeDailyEarned = Math.max(0, Number(pointState.dailyEarnedByModeByDate?.[todayKey]?.[modeKey]) || 0);
  const remainingMode = Math.max(0, modeDailyCap - modeDailyEarned);
  const earned = Math.max(0, Math.min(rewardBase, remainingMode));
  if (!earned) return 0;

  const previousChallengePoints = modeKey === "challenge"
    ? Math.max(0, Number(pointState.dailyEarnedByModeByDate?.[todayKey]?.challenge) || 0)
    : 0;

  pointState.balance += earned;
  pointState.totalEarned = Math.max(0, Number(pointState.totalEarned) || 0) + earned;
  pointState.dailyEarnedByDate[todayKey] = todayEarned + earned;
  const todayModeRow = pointState.dailyEarnedByModeByDate?.[todayKey] && typeof pointState.dailyEarnedByModeByDate[todayKey] === "object"
    ? pointState.dailyEarnedByModeByDate[todayKey]
    : createDefaultPointDayModeRow();
  todayModeRow[modeKey] = modeDailyEarned + earned;
  pointState.dailyEarnedByModeByDate = pointState.dailyEarnedByModeByDate && typeof pointState.dailyEarnedByModeByDate === "object"
    ? pointState.dailyEarnedByModeByDate
    : {};
  pointState.dailyEarnedByModeByDate[todayKey] = todayModeRow;
  savePointState(pointState);
  if (modeKey === "challenge") {
    const nextChallengePoints = previousChallengePoints + earned;
    const challengeTickets = processChallengeGameTicketAwards(ensureGameTicketState(), todayKey, previousChallengePoints, nextChallengePoints);
    if (Array.isArray(challengeTickets) && challengeTickets.length) {
      showImmediateGameTicketReward(challengeTickets[0]);
    }
    queueChallengeSpecialDrawForThresholdCrossing(todayKey, previousChallengePoints, nextChallengePoints, ensureGameTicketState());
    processChallengeEventThresholdCrossings(todayKey, previousChallengePoints, nextChallengePoints, ensureGameTicketState());
  }
  const exchangeScreen = document.getElementById("exchangeTicketScreen");
  if (exchangeScreen && exchangeScreen.classList.contains("active")) {
    renderPointExchangeScreen();
  }
  return earned;
}

function awardDayAdvanceCompletionBonus(session, reason) {
  if (!session || reason !== "completed") return 0;
  if (session.mode !== "normal") return 0;
  if (session.isDayStudySession) return 0;

  const completedDay = Number(session.studyRangeEnd);
  if (!Number.isFinite(completedDay) || completedDay < 1) return 0;
  if (completedDay !== getUnlockedDayMax()) return 0;

  const dayKey = String(Math.floor(completedDay));
  const pointState = getPointState();
  const awardedByDay = pointState.dayAdvanceBonusAwardedByDay && typeof pointState.dayAdvanceBonusAwardedByDay === "object"
    ? pointState.dayAdvanceBonusAwardedByDay
    : {};
  if (awardedByDay[dayKey]) return 0;

  const bonus = Math.max(0, Math.floor(Number(POINT_SYSTEM_CONFIG.dayAdvanceCompletionBonusPoints) || 0));
  if (!bonus) return 0;

  awardedByDay[dayKey] = true;
  pointState.dayAdvanceBonusAwardedByDay = awardedByDay;
  pointState.balance = Math.max(0, Number(pointState.balance) || 0) + bonus;
  pointState.totalEarned = Math.max(0, Number(pointState.totalEarned) || 0) + bonus;

  const todayKey = getPointTodayKey();
  migratePointDayKeyRow(pointState, todayKey, 0);
  const todayEarned = Math.max(0, Number(pointState.dailyEarnedByDate?.[todayKey]) || 0);
  pointState.dailyEarnedByDate[todayKey] = todayEarned + bonus;
  const todayModeRow = pointState.dailyEarnedByModeByDate?.[todayKey] && typeof pointState.dailyEarnedByModeByDate[todayKey] === "object"
    ? pointState.dailyEarnedByModeByDate[todayKey]
    : createDefaultPointDayModeRow();
  todayModeRow["day-study"] = Math.max(0, Number(todayModeRow["day-study"]) || 0) + bonus;
  pointState.dailyEarnedByModeByDate = pointState.dailyEarnedByModeByDate && typeof pointState.dailyEarnedByModeByDate === "object"
    ? pointState.dailyEarnedByModeByDate
    : {};
  pointState.dailyEarnedByModeByDate[todayKey] = todayModeRow;

  savePointState(pointState);
  const exchangeScreen = document.getElementById("exchangeTicketScreen");
  if (exchangeScreen && exchangeScreen.classList.contains("active")) {
    renderPointExchangeScreen();
  }
  return bonus;
}

function awardDayUnstudiedClearBonus(dayNumber) {
  const day = Math.max(1, Math.floor(Number(dayNumber) || 0));
  if (!Number.isFinite(day)) return 0;
  if (getDayUnstudiedCount(day) > 0) return 0;

  const pointState = getPointState();
  const awardedByDay = pointState.dayUnstudiedClearBonusAwardedByDay && typeof pointState.dayUnstudiedClearBonusAwardedByDay === "object"
    ? pointState.dayUnstudiedClearBonusAwardedByDay
    : {};
  const dayKey = String(day);
  if (awardedByDay[dayKey]) return 0;

  const bonus = Math.max(0, Math.floor(Number(POINT_SYSTEM_CONFIG.dayUnstudiedClearBonusPoints) || 0));
  if (!bonus) return 0;

  awardedByDay[dayKey] = true;
  pointState.dayUnstudiedClearBonusAwardedByDay = awardedByDay;
  pointState.balance = Math.max(0, Number(pointState.balance) || 0) + bonus;
  pointState.totalEarned = Math.max(0, Number(pointState.totalEarned) || 0) + bonus;

  const todayKey = getPointTodayKey();
  migratePointDayKeyRow(pointState, todayKey, 0);
  const todayEarned = Math.max(0, Number(pointState.dailyEarnedByDate?.[todayKey]) || 0);
  pointState.dailyEarnedByDate[todayKey] = todayEarned + bonus;
  const todayModeRow = pointState.dailyEarnedByModeByDate?.[todayKey] && typeof pointState.dailyEarnedByModeByDate[todayKey] === "object"
    ? pointState.dailyEarnedByModeByDate[todayKey]
    : createDefaultPointDayModeRow();
  todayModeRow["unstudied-clear"] = Math.max(0, Number(todayModeRow["unstudied-clear"]) || 0) + bonus;
  pointState.dailyEarnedByModeByDate = pointState.dailyEarnedByModeByDate && typeof pointState.dailyEarnedByModeByDate === "object"
    ? pointState.dailyEarnedByModeByDate
    : {};
  pointState.dailyEarnedByModeByDate[todayKey] = todayModeRow;

  savePointState(pointState);

  const exchangeScreen = document.getElementById("exchangeTicketScreen");
  if (exchangeScreen && exchangeScreen.classList.contains("active")) {
    renderPointExchangeScreen();
  }

  openPointRewardModal(bonus);
  return bonus;
}

function openPointRewardModal(points) {
  const modal = document.getElementById("pointRewardModal");
  const amountText = document.getElementById("pointRewardAmountText");
  if (!modal || !amountText) return;
  amountText.textContent = `＋${Math.max(0, Math.floor(Number(points) || 0))}P GET！`;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
  if (pointRewardTimerId) {
    clearTimeout(pointRewardTimerId);
  }
  pointRewardTimerId = setTimeout(() => {
    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
    pointRewardTimerId = null;
    if (pointRewardQueue.length) {
      const next = pointRewardQueue.shift();
      openPointRewardModal(next);
    }
  }, POINT_SYSTEM_CONFIG.rewardCardAutoCloseMs);
}

function enqueuePointReward(points) {
  const safePoints = Math.max(0, Math.floor(Number(points) || 0));
  if (!safePoints) return;
  const modal = document.getElementById("pointRewardModal");
  if (modal && !modal.classList.contains("hidden")) {
    pointRewardQueue.push(safePoints);
    return;
  }
  openPointRewardModal(safePoints);
}

function closePointExchangeConfirmModal() {
  const modal = document.getElementById("pointExchangeConfirmModal");
  if (!modal) return;
  pendingPointExchangeItemId = "";
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function openPointExchangeConfirmModal(item) {
  const modal = document.getElementById("pointExchangeConfirmModal");
  const message = document.getElementById("pointExchangeConfirmMessageText");
  if (!modal || !message || !item) return;
  pendingPointExchangeItemId = item.id;
  message.textContent = `${item.name}を${formatPointValue(item.cost)}で交換しますか？`;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function setPointExchangeTarget(itemId) {
  const pointState = getPointState();
  const item = getPointItemById(itemId);
  if (!item) return;
  if (!isPointItemRedeemable(pointState, item)) return;
  pointState.targetItemId = item.id;
  savePointState(pointState);
  renderPointExchangeScreen();
}

function confirmPointExchange() {
  const pointState = getPointState();
  const item = getPointItemById(pendingPointExchangeItemId);
  if (!item) {
    closePointExchangeConfirmModal();
    return;
  }
  if (!isPointItemRedeemable(pointState, item)) {
    closePointExchangeConfirmModal();
    renderPointExchangeScreen();
    return;
  }
  if (pointState.balance < item.cost) {
    closePointExchangeConfirmModal();
    renderPointExchangeScreen();
    return;
  }

  pointState.balance = Math.max(0, pointState.balance - item.cost);
  pointState.redeemedItemCounts = pointState.redeemedItemCounts && typeof pointState.redeemedItemCounts === "object"
    ? pointState.redeemedItemCounts
    : {};
  const prevCount = Math.max(0, Number(pointState.redeemedItemCounts[item.id]) || 0);
  pointState.redeemedItemCounts[item.id] = prevCount + 1;
  pointState.redeemedItemIds = [...new Set([...(pointState.redeemedItemIds || []), item.id])];
  if (pointState.targetItemId === item.id && !isPointItemRedeemable(pointState, item)) {
    pointState.targetItemId = "";
  }
  savePointState(pointState);
  closePointExchangeConfirmModal();
  renderPointExchangeScreen();
}

function renderPointExchangeGoal(pointState) {
  const goalNameText = document.getElementById("pointExchangeGoalNameText");
  const goalRemainText = document.getElementById("pointExchangeGoalRemainText");
  const goalProgressText = document.getElementById("pointExchangeGoalProgressText");
  const goalProgressBar = document.getElementById("pointExchangeGoalProgressBar");
  const goalProgressFill = document.getElementById("pointExchangeGoalProgressFill");
  if (!goalNameText || !goalRemainText || !goalProgressText || !goalProgressBar || !goalProgressFill) return;

  const targetItem = getPointItemById(pointState.targetItemId);
  const targetUnavailable = targetItem && !isPointItemRedeemable(pointState, targetItem);
  if (!targetItem || targetUnavailable) {
    if (targetUnavailable) {
      pointState.targetItemId = "";
      savePointState(pointState);
    }
    goalNameText.textContent = "🎯 目標：未設定";
    goalRemainText.textContent = "景品一覧から目標を選んでください";
    goalProgressText.classList.add("hidden");
    goalProgressBar.classList.add("hidden");
    goalProgressFill.style.width = "0%";
    return;
  }

  const remain = Math.max(0, targetItem.cost - pointState.balance);
  const progressRate = targetItem.cost > 0
    ? Math.max(0, Math.min(100, Math.round((pointState.balance / targetItem.cost) * 100)))
    : 0;

  goalNameText.textContent = `🎯 目標：${targetItem.name}`;
  goalRemainText.textContent = remain > 0 ? `あと${formatPointValue(remain)}` : "目標達成！";
  goalProgressText.textContent = `${new Intl.NumberFormat("ja-JP").format(pointState.balance)} / ${new Intl.NumberFormat("ja-JP").format(targetItem.cost)}P`;
  goalProgressText.classList.remove("hidden");
  goalProgressBar.classList.remove("hidden");
  goalProgressFill.style.width = `${progressRate}%`;
}

function renderPointExchangeScreen() {
  const balanceText = document.getElementById("pointExchangeBalanceText");
  const todayEarnedText = document.getElementById("pointExchangeTodayEarnedText");
  const todayBreakdownText = document.getElementById("pointExchangeTodayBreakdownText");
  const previousEarnedText = document.getElementById("pointExchangePreviousEarnedText");
  const totalEarnedText = document.getElementById("pointExchangeTotalEarnedText");
  const itemList = document.getElementById("pointExchangeItemList");
  if (!balanceText || !todayEarnedText || !todayBreakdownText || !previousEarnedText || !totalEarnedText || !itemList) return;

  ensurePointStateFromFirestoreIfMissing().then((didBootstrap) => {
    if (didBootstrap) {
      renderPointExchangeScreen();
    }
  });

  const pointState = getPointState();
  hydratePointDaySnapshots(pointState);
  const todayKey = getPointTodayKey();
  const todayModeRow = getTrainingDailyPointModeRow(pointState, todayKey);
  balanceText.textContent = formatPointValue(pointState.balance);
  todayEarnedText.textContent = formatPointValue(pointState.todayEarned);
  todayBreakdownText.textContent = formatTrainingDailyPointBreakdown(todayModeRow);
  previousEarnedText.textContent = formatPointValue(pointState.previousDayEarned);
  totalEarnedText.textContent = formatPointValue(pointState.totalEarned);
  renderPointExchangeGoal(pointState);

  const rows = getAvailablePointItems(pointState)
    .map((item) => {
      const remaining = getPointItemRemainingRedemptions(pointState, item);
      const isRedeemable = isPointItemRedeemable(pointState, item);
      const canExchange = isRedeemable && pointState.balance >= item.cost;
      const canSetGoal = isRedeemable;
      const disabledAttr = canExchange ? "" : " disabled";
      const goalDisabledAttr = canSetGoal ? "" : " disabled";
      const remainingText = remaining == null ? "" : `（残り${Math.max(0, remaining)}回）`;
      const costText = item.available === false ? "未定" : formatPointValue(item.cost);
      const exchangeLabel = item.available === false ? "準備中" : "交換する";
      return `
        <li class="point-exchange-item">
          <div class="point-exchange-item-main">
            <p class="point-exchange-item-name">${escapeHtml(item.name)}</p>
            <p class="point-exchange-item-cost">${escapeHtml(costText)}${escapeHtml(remainingText)}</p>
          </div>
          <div class="point-exchange-actions">
            <button class="ghost-btn" type="button" data-point-goal-id="${escapeHtml(item.id)}"${goalDisabledAttr}>目標に設定</button>
            <button class="primary-btn" type="button" data-point-exchange-id="${escapeHtml(item.id)}"${disabledAttr}>${escapeHtml(exchangeLabel)}</button>
          </div>
        </li>
      `;
    })
    .join("");

  itemList.innerHTML = rows || '<li class="empty-state">交換できる景品はありません</li>';
}

function formatMonthDayFromTimestamp(timestamp) {
  const value = new Date(Number(timestamp) || Date.now());
  return `${value.getMonth() + 1}/${value.getDate()}`;
}

function getRemainingTicketDays(expiresAt) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(Number(expiresAt) || Date.now());
  expiry.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / GAME_TICKET_DAY_MS));
}

function renderGameTicketHomePanel() {
  const button = document.getElementById("openGameTicketHubBtn");
  const exchangeButton = document.getElementById("openExchangeTicketScreenBtn");
  const inventoryList = document.getElementById("gameTicketInventoryList");
  const totalText = document.getElementById("gameTicketTotalText");
  const usageList = document.getElementById("gameTicketUsageHistoryList");
  if (!button || !exchangeButton || !inventoryList || !totalText || !usageList) return;

  if (!isDesktopGameTicketEnabled()) {
    button.classList.add("hidden");
    exchangeButton.classList.add("hidden");
    return;
  }

  exchangeButton.classList.remove("hidden");

  const store = syncGameTicketState();
  const activeTickets = getActiveGameTickets(store);
  const ticketKinds = [5, 10, 15, 30, 60];
  const grouped = new Map();
  ticketKinds.forEach((minutes) => {
    grouped.set(String(minutes), { minutes, count: 0, earliestExpiry: Number.MAX_SAFE_INTEGER });
  });
  activeTickets.forEach((ticket) => {
    const key = String(ticket.minutes);
    const current = grouped.get(key) || { minutes: ticket.minutes, count: 0, earliestExpiry: ticket.expiresAt };
    current.count += 1;
    current.earliestExpiry = Math.min(current.earliestExpiry, ticket.expiresAt);
    grouped.set(key, current);
  });

  const groupedRows = [...grouped.values()].sort((a, b) => b.minutes - a.minutes);
  const totalMinutes = activeTickets.reduce((sum, ticket) => sum + ticket.minutes, 0);
  totalText.textContent = `合計 ${totalMinutes}分`;
  inventoryList.innerHTML = groupedRows.map((entry) => `
      <li>
        <button class="game-ticket-entry-btn" type="button" data-ticket-minutes="${entry.minutes}">
          <span class="game-ticket-entry-main">${entry.minutes}分券 × ${entry.count}枚</span>
          <span class="game-ticket-entry-meta">${entry.count > 0 ? `あと${getRemainingTicketDays(entry.earliestExpiry)}日` : "0枚"}</span>
        </button>
      </li>
    `).join("");

  const usageMap = new Map();
  (store.usageHistory || [])
    .slice()
    .sort((a, b) => b.usedAt - a.usedAt)
    .forEach((entry) => {
      const key = `${formatDateKey(new Date(entry.usedAt))}:${entry.minutes}`;
      const current = usageMap.get(key) || { usedAt: entry.usedAt, minutes: entry.minutes, count: 0 };
      current.count += 1;
      usageMap.set(key, current);
    });

  const usageRows = [...usageMap.values()].sort((a, b) => b.usedAt - a.usedAt);
  usageList.innerHTML = usageRows.length
    ? usageRows.map((entry) => `<li class="game-ticket-history-item"><span>${formatMonthDayFromTimestamp(entry.usedAt)} ${entry.minutes}分券</span><span>× ${entry.count}</span></li>`).join("")
    : '<li class="empty-state">まだ使用履歴はありません</li>';

  button.classList.remove("hidden");
}

function openGameTicketHubModal() {
  if (!isDesktopGameTicketEnabled()) return;
  renderGameTicketHomePanel();
  const modal = document.getElementById("gameTicketHubModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function openGameTicketUseModal(minutes) {
  if (!isDesktopGameTicketEnabled()) return;
  const modal = document.getElementById("gameTicketUseModal");
  const title = document.getElementById("gameTicketUseMinutesText");
  const button = document.getElementById("confirmGameTicketUseBtn");
  const store = syncGameTicketState();
  const activeTickets = getActiveGameTickets(store).filter((ticket) => Number(ticket.minutes) === Number(minutes));
  if (!modal || !title || !button || !activeTickets.length) return;
  title.textContent = `${Number(minutes)}分券を使用しますか？`;
  button.dataset.ticketMinutes = String(minutes);
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function useGameTicketByMinutes(minutes) {
  const store = syncGameTicketState();
  const candidates = getActiveGameTickets(store)
    .filter((ticket) => Number(ticket.minutes) === Number(minutes))
    .sort((a, b) => a.expiresAt - b.expiresAt || a.earnedAt - b.earnedAt);
  const nextTicket = candidates[0];
  if (!nextTicket) return false;

  nextTicket.usedAt = Date.now();
  store.usageHistory.unshift({
    id: `used-${nextTicket.id}`,
    minutes: nextTicket.minutes,
    usedAt: nextTicket.usedAt
  });
  pruneGameTicketUsageHistory(store);
  persistGameTicketState();
  renderHome();
  return true;
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
  queueStudyCoreSyncChange({ itemIds: [item.id] });
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
  const target = buildLevelFocusGroups(buckets[level] || []).map((group) => group.representative);
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
  const learningStats = sanitizeLearningStats(item.learningStats);
  const levelData = ensureLevelData(item);
  return Boolean(
    learningStats.attempts > 0 ||
    learningStats.correct > 0 ||
    learningStats.lastStudiedDate ||
    learningStats.lastCorrectDate ||
    item.mastered ||
    item.reviewDue ||
    item.lastAnswerWasCorrect ||
    (item.consecutiveCorrect || 0) > 0 ||
    (item.reviewTodayCount || 0) > 0 ||
    levelData.level > 1 ||
    levelData.successCount > 0 ||
    levelData.lv4FailureCount > 0 ||
    levelData.lv4Celebrated
  );
}

function getDayUnstudiedCount(dayNumber) {
  const day = Math.max(1, Math.floor(Number(dayNumber) || 0));
  const dayItems = state.items.filter((item) => Number(item.day) === day);
  if (!dayItems.length) return 0;
  return dayItems.reduce((count, item) => count + (hasItemBeenStudied(item) ? 0 : 1), 0);
}

function getDayUnstudiedLabel(dayNumber) {
  const unstudiedCount = getDayUnstudiedCount(dayNumber);
  return unstudiedCount > 0 ? `未学習 ${unstudiedCount}問` : "未学習なし";
}

function getMasteryPercentFromLevel(level) {
  const safeLevel = Math.max(1, Math.min(4, Math.floor(Number(level) || 1)));
  if (safeLevel <= 1) return 0;
  if (safeLevel === 2) return 33;
  if (safeLevel === 3) return 67;
  return 100;
}

function getDayMasteryPercent(dayNumber) {
  const day = Math.max(1, Math.floor(Number(dayNumber) || 0));
  const dayItems = state.items.filter((item) => Number(item.day) === day);
  if (!dayItems.length) return 0;

  const total = dayItems.reduce((sum, item) => {
    if (!hasItemBeenStudied(item)) return sum;
    const level = ensureLevelData(item).level;
    return sum + getMasteryPercentFromLevel(level);
  }, 0);

  return Math.max(0, Math.min(100, Math.round(total / dayItems.length)));
}

function scoreCompactPracticeCandidate(item, options = {}) {
  const { preferWeak = true } = options;
  const level = Math.max(1, Math.min(4, Math.floor(getEffectiveLevelForItem(item) || 1)));
  const levelData = ensureLevelData(item);
  const stats = getItemLearningStats(item);
  const attempts = Math.max(0, Number(stats.attempts) || 0);
  const correct = Math.max(0, Number(stats.correct) || 0);
  const misses = Math.max(0, attempts - correct);
  const accuracy = attempts > 0 ? correct / attempts : 0.5;
  const isUnstudied = !hasItemBeenStudied(item);
  const isWeak = level <= 2;
  const isReviewDue = Boolean(item.reviewDue || (Number(item.reviewTodayCount) || 0) > 0);
  const levelWeight = level === 1 ? 4.2 : level === 2 ? 2.8 : level === 3 ? 1.2 : 0.2;
  const missWeight = misses * 1.4;
  const accuracyWeight = preferWeak ? (1 - accuracy) * 3.2 : accuracy * 0.8;
  const weakWeight = preferWeak && isWeak ? 2.2 : 0;
  const unstudiedWeight = isUnstudied ? 3.4 : 0;
  const reviewWeight = isReviewDue ? 1.1 : 0;
  const stabilityWeight = Number.isFinite(levelData.successCount) ? levelData.successCount * 0.05 : 0;
  const recencyWeight = stats.lastStudiedDate === todayKey() ? -0.4 : 0;
  return unstudiedWeight + weakWeight + reviewWeight + levelWeight + missWeight + accuracyWeight + stabilityWeight + recencyWeight;
}

function scoreWeakFocusCandidate(item, sessionLike = {}) {
  const questionId = String(item?.id || "");
  const level = Math.max(1, Math.min(4, Math.floor(getEffectiveLevelForItem(item) || 1)));
  const isLevelOne = level === 1;
  const isUnstudied = !hasItemBeenStudied(item);
  const isWeak = level <= 2;
  const askedQuestionIds = new Set((sessionLike?.weakFocusAskedQuestionIds || []).map((id) => String(id)));
  const lastRoundCorrectIds = new Set((sessionLike?.weakFocusLastRoundCorrectIds || []).map((id) => String(id)));
  const lastRoundWrongIds = new Set((sessionLike?.weakFocusLastRoundWrongIds || []).map((id) => String(id)));
  const wasAskedInThisSession = askedQuestionIds.has(questionId);
  const wasCorrectInLastRound = lastRoundCorrectIds.has(questionId);
  const wasWrongInLastRound = lastRoundWrongIds.has(questionId);
  const accuracy = getItemAccuracyPercent(item);
  const accuracyScore = Number.isFinite(accuracy) ? Math.max(0, 100 - accuracy) / 100 : 0.5;
  const levelScore = isLevelOne ? 2.4 : 0.6;
  const weakScore = isWeak ? 1.4 : 0.2;
  const unstudiedScore = isUnstudied ? 1.8 : 0;
  const wrongScore = wasWrongInLastRound ? 2.2 : 0;
  const askedPenalty = wasAskedInThisSession ? -3.2 : 0;
  const correctPenalty = wasCorrectInLastRound ? -1.6 : 0;
  return levelScore + weakScore + unstudiedScore + wrongScore + accuracyScore + askedPenalty + correctPenalty;
}

function pickCompactPracticeSet(sourceItems, options = {}) {
  const source = Array.isArray(sourceItems) ? sourceItems.filter(Boolean) : [];
  const limit = Math.max(1, Math.floor(Number(options.limit) || source.length || 10));
  if (!source.length) return [];

  const scorer = typeof options.scorer === "function"
    ? options.scorer
    : (item) => scoreCompactPracticeCandidate(item, { preferWeak: options.preferWeak !== false });

  const scored = source.map((item) => ({
    item,
    priority: scorer(item, options)
  }));

  const ranked = scored.sort((left, right) => {
    if (right.priority !== left.priority) return right.priority - left.priority;
    return String(left.item.id).localeCompare(String(right.item.id));
  });

  const selected = [];
  const seenIds = new Set();
  for (const entry of ranked) {
    const key = String(entry.item?.id || "");
    if (!key || seenIds.has(key)) continue;
    seenIds.add(key);
    selected.push(entry.item);
    if (selected.length >= limit) break;
  }

  return selected;
}

function getDayStudyPriorityPool(items) {
  const source = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!source.length) return [];

  const unstudied = [];
  const weak = [];
  const other = [];

  source.forEach((item) => {
    if (!hasItemBeenStudied(item)) {
      unstudied.push(item);
      return;
    }
    if (getEffectiveLevelForItem(item) <= 2) {
      weak.push(item);
      return;
    }
    other.push(item);
  });

  return [
    ...pickCompactPracticeSet(unstudied, { limit: unstudied.length, preferWeak: true }),
    ...pickCompactPracticeSet(weak, { limit: weak.length, preferWeak: true }),
    ...pickCompactPracticeSet(other, { limit: other.length, preferWeak: false })
  ];
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
  const todayDayKey = getLearningHistoryDayKey(Date.now());
  const rows = [];
  for (let offset = 2; offset >= 0; offset -= 1) {
    const key = shiftLearningHistoryDayKey(todayDayKey, -offset);
    rows.push({ key, label: formatMonthDayLabel(key) });
  }
  return rows;
}

function createDefaultDailyPerformanceEntry() {
  return {
    questionCount: 0,
    correctCount: 0
  };
}

function sanitizeDailyPerformanceByDate(value) {
  const source = value && typeof value === "object" ? value : {};
  const result = {};
  Object.entries(source).forEach(([key, entry]) => {
    if (!key || !entry || typeof entry !== "object") return;
    const questionCount = Math.max(0, Math.round(Number(entry.questionCount) || 0));
    const correctCount = Math.max(0, Math.min(questionCount, Math.round(Number(entry.correctCount) || 0)));
    if (!questionCount && !correctCount) return;
    result[key] = { questionCount, correctCount };
  });
  return result;
}

function sanitizeStudyTimeByDate(value) {
  const source = value && typeof value === "object" ? value : {};
  const result = {};
  Object.entries(source).forEach(([key, entry]) => {
    const milliseconds = Math.max(0, Math.round(Number(entry) || 0));
    if (!key || !milliseconds) return;
    result[key] = milliseconds;
  });
  return result;
}

function buildLegacyDailyPerformanceByDate(sessions) {
  const result = {};
  (sessions || []).forEach((entry) => {
    if (!entry?.dayKey) return;
    const questionCount = Math.max(0, Math.round(Number(entry.questionCount) || 0));
    if (!questionCount) return;
    const derivedCorrectCount = Number.isFinite(Number(entry.correctCount))
      ? Math.max(0, Math.min(questionCount, Math.round(Number(entry.correctCount))))
      : Math.max(0, Math.min(questionCount, Math.round(questionCount * ((Number(entry.accuracy) || 0) / 100))));
    const current = result[entry.dayKey] || createDefaultDailyPerformanceEntry();
    current.questionCount += questionCount;
    current.correctCount += derivedCorrectCount;
    result[entry.dayKey] = current;
  });
  return result;
}

function ensureDailyPerformanceEntry(dayKey) {
  state.stats.dailyPerformanceByDate = sanitizeDailyPerformanceByDate(state.stats.dailyPerformanceByDate);
  if (!state.stats.dailyPerformanceByDate[dayKey]) {
    state.stats.dailyPerformanceByDate[dayKey] = createDefaultDailyPerformanceEntry();
  }
  return state.stats.dailyPerformanceByDate[dayKey];
}

function ensureStudyTimeEntry(dayKey) {
  state.stats.studyTimeByDate = sanitizeStudyTimeByDate(state.stats.studyTimeByDate);
  if (!state.stats.studyTimeByDate[dayKey]) {
    state.stats.studyTimeByDate[dayKey] = 0;
  }
  return state.stats.studyTimeByDate;
}

function recordDailyPerformance(isCorrect, dayKey = todayKey()) {
  const entry = ensureDailyPerformanceEntry(dayKey);
  entry.questionCount += 1;
  if (isCorrect) {
    entry.correctCount = Math.min(entry.questionCount, entry.correctCount + 1);
  }
}

function recordStudyTimeBetween(startMs, endMs, options = {}) {
  const safeStart = Number(startMs);
  const safeEnd = Number(endMs);
  if (!Number.isFinite(safeStart) || !Number.isFinite(safeEnd) || safeEnd <= safeStart) return;

  const category = options.category === "training" ? "training" : "day";
  const trainingKind = typeof options.trainingKind === "string" && options.trainingKind ? options.trainingKind : "";

  let cursor = safeStart;
  while (cursor < safeEnd) {
    const cursorDate = new Date(cursor);
    const nextBoundary = new Date(cursorDate.getFullYear(), cursorDate.getMonth(), cursorDate.getDate() + 1).getTime();
    const segmentEnd = Math.min(safeEnd, nextBoundary);
    const dayKey = formatDateKey(cursorDate);
    const store = ensureStudyTimeEntry(dayKey);
    const segmentMs = Math.max(0, segmentEnd - cursor);
    store[dayKey] += segmentMs;
    const seconds = segmentMs > 0 ? Math.max(1, Math.ceil(segmentMs / 1000)) : 0;
    recordCommonStudySeconds(dayKey, seconds, { category, trainingKind });
    cursor = segmentEnd;
  }
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
  if (shouldUseFirestoreForHomeMetrics()) {
    const parseFirestoreEntryDayKey = (entry) => {
      const endedAt = Number(entry?.endedAt);
      if (Number.isFinite(endedAt) && endedAt > 0) {
        return getLearningHistoryDayKey(endedAt);
      }
      const startedAt = Number(entry?.startedAt);
      if (Number.isFinite(startedAt) && startedAt > 0) {
        return getLearningHistoryDayKey(startedAt);
      }
      const dateText = String(entry?.studyDate || entry?.learnedAt || "").trim();
      const match = dateText.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
      return match ? `${match[1]}-${match[2]}-${match[3]}` : "";
    };

    const dailyMap = {};
    const source = Array.isArray(homeHistoryFirestoreEntries) ? homeHistoryFirestoreEntries : [];
    source.forEach((entry) => {
      const key = parseFirestoreEntryDayKey(entry);
      if (!key) return;
      const questionCount = Math.max(0, Number(entry?.questionCount) || 0);
      const activeStudySeconds = Math.max(0, Number(entry?.activeStudySeconds) || 0);
      if (!questionCount && !activeStudySeconds) return;

      const modeGroup = getLearningHistoryModeGroup(entry?.mode);
      const current = dailyMap[key] || {
        count: 0,
        activeStudySeconds: 0,
        questionCount: 0,
        dayQuestionCount: 0,
        trainingQuestionCount: 0,
        correctCount: 0
      };
      current.count += 1;
      current.activeStudySeconds += activeStudySeconds;
      current.questionCount += questionCount;
      if (modeGroup === "day") {
        current.dayQuestionCount += questionCount;
        current.correctCount += Math.max(0, Number(entry?.correctCount) || 0);
      } else {
        current.trainingQuestionCount += questionCount;
      }
      dailyMap[key] = current;
    });

    const row = dailyMap[dayKey] || {
      count: 0,
      activeStudySeconds: 0,
      questionCount: 0,
      dayQuestionCount: 0,
      trainingQuestionCount: 0,
      correctCount: 0
    };
    const durationMinutes = Math.max(0, Math.round(row.activeStudySeconds / 60));
    const averageAccuracy = row.dayQuestionCount > 0
      ? Math.max(0, Math.min(100, Math.round((row.correctCount / row.dayQuestionCount) * 100)))
      : null;

    return {
      count: row.count,
      durationMinutes,
      questionCount: row.questionCount,
      dayQuestionCount: row.dayQuestionCount,
      trainingQuestionCount: row.trainingQuestionCount,
      correctCount: row.correctCount,
      averageAccuracy
    };
  }

  const dailyPerformanceByDate = sanitizeDailyPerformanceByDate(state.stats.dailyPerformanceByDate);
  state.stats.dailyPerformanceByDate = dailyPerformanceByDate;
  const studyTimeByDate = sanitizeStudyTimeByDate(state.stats.studyTimeByDate);
  state.stats.studyTimeByDate = studyTimeByDate;
  const dailyStatsByDate = sanitizeDailyStatsByDate(state.stats.dailyStatsByDate);
  state.stats.dailyStatsByDate = dailyStatsByDate;
  const sessions = Array.isArray(state.stats.completedSessions) ? state.stats.completedSessions : [];
  const targetSessions = sessions.filter((entry) => entry.dayKey === dayKey);
  const legacyQuestionCount = Math.max(0, Number(dailyPerformanceByDate[dayKey]?.questionCount) || 0);
  const legacyStudyMs = Math.max(0, Number(studyTimeByDate[dayKey]) || 0);
  const hasSplitEntry = Boolean(dailyStatsByDate[dayKey]);
  const hasLegacy = legacyQuestionCount > 0 || legacyStudyMs > 0;
  const breakdown = hasSplitEntry || hasLegacy
    ? ensureDailyStatsEntry(dayKey)
    : createDefaultDailyStatsEntry();
  const explicitAnswered = Math.max(0, Number(breakdown.dayAnswered) || 0) + Math.max(0, Number(breakdown.trainingAnswered) || 0);
  const totalQuestionCount = Math.max(legacyQuestionCount, Math.max(0, Number(breakdown.unknownLegacyAnswered) || 0) + explicitAnswered);
  const explicitStudySeconds = Math.max(0, Number(breakdown.dayStudySeconds) || 0) + Math.max(0, Number(breakdown.trainingStudySeconds) || 0);
  const totalDurationMinutes = Math.max(
    Math.max(0, Math.round(legacyStudyMs / 60000)),
    Math.max(0, Math.round((Math.max(0, Number(breakdown.unknownLegacyStudySeconds) || 0) + explicitStudySeconds) / 60))
  );

  const totals = targetSessions.reduce((acc, entry) => {
    acc.count += 1;
    return acc;
  }, {
    count: 0,
    durationMinutes: totalDurationMinutes,
    questionCount: totalQuestionCount,
    dayQuestionCount: Math.max(0, Number(breakdown.dayAnswered) || 0),
    trainingQuestionCount: Math.max(0, Number(breakdown.trainingAnswered) || 0),
    correctCount: Math.max(0, Number(dailyPerformanceByDate[dayKey]?.correctCount) || 0)
  });

  const activeSession = state.session;
  if (activeSession) {
    const activeDurationMinutes = Math.max(0, Math.round(getSessionElapsedMsWithinDay(activeSession, dayKey) / 60000));
    if (totals.questionCount > 0 || activeDurationMinutes > 0) {
      totals.count += 1;
      totals.durationMinutes += activeDurationMinutes;
    }
  }

  const averageAccuracy = totals.dayQuestionCount > 0
    ? Math.max(0, Math.min(100, Math.round((totals.correctCount / totals.dayQuestionCount) * 100)))
    : null;

  return {
    count: totals.count,
    durationMinutes: totals.durationMinutes,
    questionCount: totals.questionCount,
    dayQuestionCount: totals.dayQuestionCount,
    trainingQuestionCount: totals.trainingQuestionCount,
    correctCount: totals.correctCount,
    averageAccuracy
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
  syncKeyboardNavigationUI(true);
}

function hidePhaseIntro() {
  const introCard = document.getElementById("phaseIntroCard");
  if (introCard) introCard.classList.add("hidden");
}

function startCurrentPhaseQuestions() {
  const session = state.session;
  if (!session) return;
  session.awaitingPhaseStart = false;
  hideWeakFocusDecisionPanel();
  hidePhaseIntro();
  if (session.mode === "review") {
    renderReviewSession();
  } else {
    renderQuestionSession();
  }
  showScreen("testScreen");
  scheduleKeyboardNavigationSync();
}

function buildWeakFocusPriorityBuckets(sessionLike) {
  const buckets = buildLevelBuckets();
  const baseQuestionIds = new Set((sessionLike?.baseQuestionIds || []).map((id) => String(id)));
  const askedQuestionIds = new Set((sessionLike?.weakFocusAskedQuestionIds || []).map((id) => String(id)));
  const lastRoundCorrectIds = new Set((sessionLike?.weakFocusLastRoundCorrectIds || []).map((id) => String(id)));
  const lastRoundWrongIds = new Set((sessionLike?.weakFocusLastRoundWrongIds || []).map((id) => String(id)));
  const candidates = [...(buckets[1] || []), ...(buckets[2] || [])].filter((item) => !baseQuestionIds.has(String(item.id)));

  const priorityBuckets = {
    A: [],
    B: [],
    C: [],
    D: [],
    E: [],
    F: []
  };

  candidates.forEach((item) => {
    const questionId = String(item.id);
    const level = getEffectiveLevelForItem(item);
    const isLevelOne = level === 1;
    const wasAskedInThisSession = askedQuestionIds.has(questionId);
    const wasCorrectInLastRound = lastRoundCorrectIds.has(questionId);
    const wasWrongInLastRound = lastRoundWrongIds.has(questionId);

    if (isLevelOne && !wasAskedInThisSession) {
      priorityBuckets.A.push(item);
      return;
    }
    if (isLevelOne && wasWrongInLastRound) {
      priorityBuckets.B.push(item);
      return;
    }
    if (!isLevelOne && !wasAskedInThisSession) {
      priorityBuckets.C.push(item);
      return;
    }
    if (!isLevelOne && wasWrongInLastRound) {
      priorityBuckets.D.push(item);
      return;
    }
    if (wasCorrectInLastRound) {
      priorityBuckets.E.push(item);
      return;
    }
    priorityBuckets.F.push(item);
  });

  return Object.fromEntries(
    Object.entries(priorityBuckets).map(([key, bucket]) => [key, pickCompactPracticeSet(bucket, {
      limit: bucket.length,
      preferWeak: true,
      scorer: (entry) => scoreWeakFocusCandidate(entry, sessionLike)
    })])
  );
}

function pickWeakFocusCandidate(bucket, avoidQuestionId = "") {
  if (!Array.isArray(bucket) || !bucket.length) return null;
  if (!avoidQuestionId) return bucket.shift() || null;
  const candidateIndex = bucket.findIndex((item) => String(item.id) !== String(avoidQuestionId));
  if (candidateIndex === -1) return null;
  const [candidate] = bucket.splice(candidateIndex, 1);
  return candidate || null;
}

function getWeakPhasePool(sessionLike, limit = 10) {
  const priorityBuckets = buildWeakFocusPriorityBuckets(sessionLike);
  const orderedKeys = ["A", "B", "C", "D", "E", "F"];
  const selected = [];
  const usedIds = new Set();
  let avoidFirstQuestionId = String(sessionLike?.weakFocusLastQuestionId || "");
  let emptyPassCount = 0;
  let orderedIndex = 0;

  while (selected.length < limit) {
    const key = orderedKeys[orderedIndex % orderedKeys.length];
    orderedIndex += 1;
    const bucket = priorityBuckets[key];
    const candidate = pickWeakFocusCandidate(bucket, selected.length === 0 ? avoidFirstQuestionId : "");

    if (!candidate) {
      emptyPassCount += 1;
      if (selected.length === 0 && avoidFirstQuestionId && emptyPassCount >= orderedKeys.length) {
        avoidFirstQuestionId = "";
        emptyPassCount = 0;
        continue;
      }
      if (emptyPassCount >= orderedKeys.length) {
        break;
      }
      continue;
    }

    const questionId = String(candidate.id);
    if (usedIds.has(questionId)) {
      continue;
    }

    usedIds.add(questionId);
    selected.push(candidate);
    emptyPassCount = 0;
  }

  return selected;
}

function hideWeakFocusDecisionPanel() {
  const decisionCard = document.getElementById("weakFocusDecisionCard");
  if (decisionCard) decisionCard.classList.add("hidden");
  const keyboardHint = document.getElementById("weakFocusKeyboardHint");
  if (keyboardHint) keyboardHint.classList.add("hidden");
  scheduleKeyboardNavigationSync();
}

function renderWeakFocusDecisionPanel(sessionLike = state.session) {
  if (!sessionLike || sessionLike.mode !== "normal") return;
  const decisionCard = document.getElementById("weakFocusDecisionCard");
  const decisionText = document.getElementById("weakFocusDecisionText");
  const continueBtn = document.getElementById("weakFocusContinueBtn");
  const finishBtn = document.getElementById("weakFocusFinishBtn");
  const questionCard = document.getElementById("questionCard");
  const reviewCard = document.getElementById("reviewCard");
  const introCard = document.getElementById("phaseIntroCard");
  if (!decisionCard || !decisionText || !continueBtn || !finishBtn) return;

  const completedRounds = Math.max(0, Number(sessionLike.weakFocusRoundCount) || 0);
  const remainingRounds = Math.max(0, NORMAL_WEAK_FOCUS_MAX_ROUNDS - completedRounds);
  decisionText.textContent = remainingRounds > 0
    ? `苦手克服を5問完了しました。あと最大${remainingRounds}回、5問ずつ挑戦できます。`
    : "苦手克服を5問完了しました。";

  continueBtn.classList.toggle("hidden", remainingRounds <= 0);
  continueBtn.textContent = "＋ あと5問";
  finishBtn.textContent = "✓ 特訓を終了";

  if (questionCard) questionCard.classList.add("hidden");
  if (reviewCard) reviewCard.classList.add("hidden");
  if (introCard) introCard.classList.add("hidden");
  decisionCard.classList.remove("hidden");
  showScreen("testScreen");
  syncKeyboardNavigationUI(true);
}

function beginSessionPhase(sessionLike, phase, questions, options = {}) {
  if (!sessionLike || !Array.isArray(questions) || !questions.length) return false;
  hideWeakFocusDecisionPanel();
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
  sessionLike.awaitingWeakFocusDecision = false;
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
  const streakHintFooterText = document.getElementById("streakHintFooterText");
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
  const todayAggregate = getDailySessionAggregate(todayKey());
  const dayLabelCells = [recentDayLabel1, recentDayLabel2, recentDayLabel3];
  const solvedCells = [recentSolved1, recentSolved2, recentSolved3];
  const accuracyCells = [recentAccuracy1, recentAccuracy2, recentAccuracy3];

  learnedCountText.textContent = `📚 ${learnedCount} / 1000語 学習済み`;
  if (shouldUseFirestoreForHomeMetrics()) {
    if (homeHistoryFirestoreLoading && !homeHistoryFirestoreLoaded) {
      streakFooterText.textContent = "🔥 読み込み中...";
      if (streakHintFooterText) {
        streakHintFooterText.textContent = "";
      }
    } else {
      const dayKeys = collectUniqueLearningHistoryDayKeys(homeHistoryFirestoreEntries);
      const streakInfo = computeDisplayStreakInfo(dayKeys);
      streakFooterText.textContent = `🔥 ${streakInfo.streak}日連続継続中`;
      if (streakHintFooterText) {
        streakHintFooterText.textContent = streakInfo.isGrace && streakInfo.streak > 0
          ? `今日も学習すると${streakInfo.nextStreak}日になります`
          : "";
      }
    }
  } else {
    const dayKeys = collectUniqueLearningHistoryDayKeys(loadLearningHistoryEntries());
    const streakInfo = computeDisplayStreakInfo(dayKeys);
    streakFooterText.textContent = `🔥 ${streakInfo.streak}日連続継続中`;
    if (streakHintFooterText) {
      streakHintFooterText.textContent = streakInfo.isGrace && streakInfo.streak > 0
        ? `今日も学習すると${streakInfo.nextStreak}日になります`
        : "";
    }
  }
  studyRangeFooterText.textContent = `学習中：Day${state.settings.studyRange.start}～${state.settings.studyRange.end}`;
  remainFooterText.textContent = `🎯 1000語まであと${Math.max(0, 1000 - learnedCount)}語`;
  todaySessionCountText.textContent = `📘 学習回数 ${todayAggregate.count}回`;
  todayStudyTimeText.textContent = `⏱ 学習時間 ${todayAggregate.durationMinutes}分`;
  todayQuestionCountText.innerHTML = [
    "<span class=\"today-question-label\">📚 今日</span>",
    `<span class=\"today-question-total\">${todayAggregate.questionCount}問</span>`,
    `<span class=\"today-question-breakdown\"><span>Day ${todayAggregate.dayQuestionCount}問</span><span>特訓 ${todayAggregate.trainingQuestionCount}問</span></span>`
  ].join("");
  const dayOnlyAccuracy = todayAggregate.dayQuestionCount > 0
    ? Math.max(0, Math.min(100, Math.round((todayAggregate.correctCount / todayAggregate.dayQuestionCount) * 100)))
    : null;
  todayAverageAccuracyText.textContent = `📈 平均正答率 ${Number.isFinite(dayOnlyAccuracy) ? `${dayOnlyAccuracy}%` : "-"}`;

  recentRows.forEach((row, index) => {
    const aggregate = getDailySessionAggregate(row.key);
    const solvedText = Number.isFinite(aggregate.questionCount) && aggregate.questionCount > 0 ? String(aggregate.questionCount) : "-";
    dayLabelCells[index].textContent = row.label || "-";
    solvedCells[index].textContent = solvedText;
    accuracyCells[index].innerHTML = buildAccuracyEvaluationMarkup(aggregate.averageAccuracy);
  });
}

function renderDayCatalog() {
  const dayStudyStartDaySelect = document.getElementById("dayStudyStartDaySelect");
  const dayStudyEndDaySelect = document.getElementById("dayStudyEndDaySelect");
  const dayStudyTypeSelect = document.getElementById("dayStudyTypeSelect");
  const dayCatalogGrid = document.getElementById("dayCatalogGrid");
  if (!dayCatalogGrid || !dayStudyStartDaySelect || !dayStudyEndDaySelect || !dayStudyTypeSelect) return;

  const allDays = getAvailableDays();
  if (!allDays.length) {
    dayCatalogGrid.innerHTML = "";
    dayStudyStartDaySelect.innerHTML = "";
    dayStudyEndDaySelect.innerHTML = "";
    return;
  }
  const unlockedDayMax = getUnlockedDayMax();
  const unlockedDays = allDays.filter((day) => day <= unlockedDayMax);
  const selectableDays = unlockedDays.length ? unlockedDays : [allDays[0]];
  const buildDayOptions = (days) => days.map((day) => `<option value="${day}">Day${day}</option>`).join("");

  dayStudyStartDaySelect.innerHTML = buildDayOptions(selectableDays);

  const minSelectableDay = selectableDays[0];
  const maxSelectableDay = selectableDays[selectableDays.length - 1];
  const storedStart = Number(state.settings.dayStudy?.start ?? state.settings.dayStudy?.day ?? state.settings.studyRange?.start ?? minSelectableDay);
  const storedEnd = Number(state.settings.dayStudy?.end ?? state.settings.dayStudy?.day ?? state.settings.studyRange?.end ?? maxSelectableDay);
  const safeStart = Number.isFinite(storedStart)
    ? Math.max(minSelectableDay, Math.min(maxSelectableDay, storedStart))
    : minSelectableDay;
  const safeEnd = Number.isFinite(storedEnd)
    ? Math.max(safeStart, Math.min(maxSelectableDay, storedEnd))
    : maxSelectableDay;
  const storedType = state.settings.dayStudy?.type;
  const safeType = storedType === "word" || storedType === "phrase" || storedType === "all" ? storedType : "all";

  dayStudyStartDaySelect.value = String(safeStart);

  const syncEndDayOptions = (preferredEnd) => {
    const selectedStart = Number(dayStudyStartDaySelect.value) || minSelectableDay;
    const selectableEndDays = selectableDays.filter((day) => day >= selectedStart);
    dayStudyEndDaySelect.innerHTML = buildDayOptions(selectableEndDays);
    const normalizedPreferred = Number.isFinite(Number(preferredEnd)) ? Number(preferredEnd) : safeEnd;
    const fallbackEnd = selectableEndDays[selectableEndDays.length - 1];
    const nextEnd = selectableEndDays.includes(normalizedPreferred) ? normalizedPreferred : fallbackEnd;
    dayStudyEndDaySelect.value = String(nextEnd);
  };

  syncEndDayOptions(safeEnd);
  dayStudyTypeSelect.value = safeType;

  dayCatalogGrid.innerHTML = allDays.map((day) => {
    const masteryPercent = getDayMasteryPercent(day);
    const stars = getStarTextFromAccuracy(masteryPercent);
    const unstudiedLabel = getDayUnstudiedLabel(day);
    const perfectClass = masteryPercent === 100 ? "is-perfect" : "";
    const isLocked = day > unlockedDayMax;
    const lockClass = isLocked ? "is-locked" : "";
    const scoreMarkup = isLocked
      ? '<span class="day-card-lock">🔒 未解放</span>'
      : `<span class="day-card-percent">${Math.round(masteryPercent)}%</span><span class="day-card-unstudied">${unstudiedLabel}</span>`;
    return `<button type="button" class="day-card ${perfectClass} ${lockClass}" data-day="${day}" ${isLocked ? "disabled" : ""}><span class="day-card-title">Day${day}</span><span class="day-card-stars">${isLocked ? "-" : stars}</span>${scoreMarkup}</button>`;
  }).join("");

  dayStudyStartDaySelect.onchange = () => {
    syncEndDayOptions(dayStudyEndDaySelect.value);
  };

  dayCatalogGrid.querySelectorAll(".day-card").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;
      const day = Number(button.dataset.day);
      const nextDay = Math.max(minSelectableDay, Math.min(maxSelectableDay, day));
      dayStudyStartDaySelect.value = String(nextDay);
      syncEndDayOptions(nextDay);
    });
  });
}

function getPrepositionScopeLabel(scope) {
  return scope === "all" ? "すべて" : scope;
}

function getPrepositionScopeBuckets() {
  const bucketMap = new Map();
  getPrepositionQuestionBank().forEach((question) => {
    if (!bucketMap.has(question.preposition)) {
      bucketMap.set(question.preposition, []);
    }
    bucketMap.get(question.preposition).push(question);
  });
  return [...bucketMap.entries()]
    .map(([preposition, questions]) => ({ preposition, questions }))
    .sort((a, b) => a.preposition.localeCompare(b.preposition));
}

function renderPrepositionScopeSelector() {
  const allBtn = document.getElementById("prepositionScopeAllBtn");
  const scopeButtons = document.getElementById("prepositionScopeButtons");
  if (!allBtn || !scopeButtons) return;

  const buckets = getPrepositionScopeBuckets();
  const allCount = buckets.reduce((sum, bucket) => sum + bucket.questions.length, 0);
  allBtn.textContent = `すべて ${allCount}問`;
  scopeButtons.innerHTML = buckets
    .filter((bucket) => bucket.questions.length > 0)
    .map((bucket) => `<button type="button" class="secondary-btn preposition-scope-btn" data-preposition-scope="${bucket.preposition}">${bucket.preposition} ${bucket.questions.length}問</button>`)
    .join("");

  allBtn.onclick = () => {
    startPrepositionTraining("all");
  };

  scopeButtons.querySelectorAll("[data-preposition-scope]").forEach((button) => {
    button.addEventListener("click", () => {
      const scope = String(button.getAttribute("data-preposition-scope") || "").trim().toLowerCase();
      if (!scope) return;
      startPrepositionTraining(scope);
    });
  });
}

function openPrepositionTrainingSelector() {
  renderPrepositionScopeSelector();
  showScreen("prepositionSelectScreen");
}

function buildPrepositionQuestionSet(scope, options = {}) {
  const bank = getPrepositionQuestionBank();
  const reviewIdSet = options.reviewQuestionIdSet instanceof Set ? options.reviewQuestionIdSet : null;
  let pool = scope === "all"
    ? bank
    : bank.filter((question) => question.preposition === scope);

  if (reviewIdSet) {
    pool = pool.filter((question) => reviewIdSet.has(String(question.id)));
  }

  if (!pool.length) return [];

  const uniquePool = [];
  const seen = new Set();
  pool.forEach((question) => {
    const key = String(question.id);
    if (seen.has(key)) return;
    seen.add(key);
    uniquePool.push(question);
  });

  const targetCount = Math.min(PREPOSITION_TRAINING_QUESTION_LIMIT, uniquePool.length);
  return weightedSampleWithoutReplacementByWeight(
    uniquePool,
    targetCount,
    (question) => getTrainingQuestionWeight("preposition", question?.id)
  );
}

function startPrepositionTraining(scope, options = {}) {
  const safeScope = typeof scope === "string" && scope ? scope.toLowerCase() : "all";
  const reviewQuestionIdSet = Array.isArray(options.reviewQuestionIds)
    ? new Set(options.reviewQuestionIds.map((id) => String(id)))
    : null;
  const questions = buildPrepositionQuestionSet(safeScope, { reviewQuestionIdSet });
  if (!questions.length) {
    alert("出題可能な前置詞問題がありません。");
    return;
  }

  prepositionTrainingSession = {
    scope: safeScope,
    scopeLabel: getPrepositionScopeLabel(safeScope),
    startedAt: Date.now(),
    answerHistory: [],
    answerCount: 0,
    questions,
    currentIndex: 0,
    answered: false,
    correctCount: 0,
    wrongQuestionIds: [],
    wrongPrepositionCounts: {},
    reviewOnly: Boolean(reviewQuestionIdSet),
    pointBalanceBefore: Math.max(0, Math.floor(Number(getPointState().balance) || 0))
  };
  renderPrepositionQuestion();
  showScreen("prepositionPracticeScreen");
}

function recordPrepositionTrainingAttempt(question, isCorrect) {
  const stats = ensurePrepositionTrainingStats();
  const prepositionKey = String(question.preposition || "").toLowerCase();
  const questionKey = String(question.id || "");

  recordTrainingProfileAttempt("preposition", {
    questionId: questionKey,
    category: prepositionKey,
    isCorrect
  });

  stats.attempts += 1;
  if (isCorrect) {
    stats.correct += 1;
  } else {
    stats.wrong += 1;
  }
  stats.lastStudiedAt = Date.now();

  if (!stats.byPreposition[prepositionKey]) {
    stats.byPreposition[prepositionKey] = { attempts: 0, correct: 0, wrong: 0 };
  }
  stats.byPreposition[prepositionKey].attempts += 1;
  if (isCorrect) {
    stats.byPreposition[prepositionKey].correct += 1;
  } else {
    stats.byPreposition[prepositionKey].wrong += 1;
  }

  if (!stats.byQuestion[questionKey]) {
    stats.byQuestion[questionKey] = { correct: 0, wrong: 0, lastStudiedAt: 0 };
  }
  if (isCorrect) {
    stats.byQuestion[questionKey].correct += 1;
  } else {
    stats.byQuestion[questionKey].wrong += 1;
  }
  stats.byQuestion[questionKey].lastStudiedAt = Date.now();
  saveState();
}

function buildPrepositionFeedbackMarkup(question, isCorrect, userAnswer) {
  const meta = getPrepositionMetaMap()[question.preposition] || { icon: "●", coreImage: "位置関係", representative: [] };
  const representative = (meta.representative || []).slice(0, 2);
  const translation = question.translation || "";
  const usageText = question.contextImage || "文脈での位置関係";
  const safeAnswer = escapeHtml(String(question.answer || "").toLowerCase());
  const rawSentence = String(question.sentence || question.question || "").trim();
  const rawAnswer = String(question.answer || "").trim();
  const escapedAnswerForRegex = rawAnswer.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const answerPattern = escapedAnswerForRegex ? new RegExp(`\\b${escapedAnswerForRegex}\\b`, "i") : null;
  let sentenceWithAnswer = escapeHtml(rawSentence);
  if (rawSentence && answerPattern) {
    const match = rawSentence.match(answerPattern);
    if (match && Number.isInteger(match.index)) {
      const start = match.index;
      const end = start + match[0].length;
      sentenceWithAnswer = `${escapeHtml(rawSentence.slice(0, start))}(<span class="preposition-correct-answer-value">${safeAnswer}</span>)${escapeHtml(rawSentence.slice(end))}`;
    } else {
      sentenceWithAnswer = `${escapeHtml(rawSentence)}（<span class="preposition-correct-answer-value">${safeAnswer}</span>）`;
    }
  }
  const correctSentenceMarkup = `<div class="answer-line preposition-correct-sentence">正しい文章：${sentenceWithAnswer || `（<span class="preposition-correct-answer-value">${safeAnswer}</span>）`}</div>`;
  const safeUserAnswer = escapeHtml(userAnswer || "-");
  const answerStatus = isCorrect
    ? `<span class="preposition-answer-status is-correct">〇 正解</span>`
    : `<span class="preposition-answer-status is-wrong">× 不正解</span>`;
  const answerInlineText = isCorrect
    ? `<span class="preposition-answer-inline">${safeUserAnswer}</span>`
    : `<span class="preposition-answer-inline">${safeUserAnswer} ではなく<span class="preposition-correct-answer-value">${safeAnswer}</span></span>`;
  const usageInline = `<span class="preposition-answer-usage-inline">今回の使い方「${escapeHtml(usageText)}」</span>`;
  const answerRow = `<div class="answer-line preposition-result-inline">${answerStatus}${answerInlineText}${usageInline}</div>`;
  const translationMarkup = translation ? `<div class="answer-line preposition-translation-after">${buildPrepositionTranslationWithFocus(question)}</div>` : "";
  const representativeMarkup = representative.length
    ? `<div class="preposition-representative-wrap"><p class="preposition-info-label">代表例</p><ul>${representative.map((entry) => `<li>${entry}</li>`).join("")}</ul></div>`
    : "";
  return [
    correctSentenceMarkup,
    translationMarkup,
    answerRow,
    `<div class="preposition-core-block">`,
    `<div class="preposition-head-row"><div class="preposition-icon">${meta.icon}</div><div class="preposition-main-answer">${question.answer}</div></div>`,
    `<p class="preposition-info-label">基本イメージ</p>`,
    `<p class="preposition-core-image">「${meta.coreImage}」</p>`,
    representativeMarkup,
    `</div>`
  ].join("");
}

function buildPrepositionTranslationWithFocus(question) {
  const rawTranslation = String(question?.translation || "");
  if (!rawTranslation) return "";

  const preposition = String(question?.answer || question?.preposition || "").toLowerCase().trim();
  const focusPatternMap = {
    at: /(で|に)/,
    in: /(中に|で|に)/,
    on: /(どおりに|に)/,
    to: /(へ|に)/,
    from: /(から)/,
    for: /(について|を|に|ために)/,
    with: /(と)/,
    by: /(で)/,
    about: /(について)/,
    after: /(あとで|後で|後に|放課後に)/,
    before: /(前に)/,
    near: /(近くに)/,
    during: /(中に)/,
    without: /(なしで)/,
    of: /(の)/,
    around: /(世界中を|中を|周囲を)/
  };

  const pattern = focusPatternMap[preposition];
  if (!pattern) return escapeHtml(rawTranslation);

  const match = rawTranslation.match(pattern);
  if (!match || !Number.isInteger(match.index)) {
    return escapeHtml(rawTranslation);
  }

  const start = match.index;
  const end = start + match[0].length;
  const before = escapeHtml(rawTranslation.slice(0, start));
  const focus = escapeHtml(rawTranslation.slice(start, end));
  const after = escapeHtml(rawTranslation.slice(end));
  return `${before}<span class="preposition-translation-focus">${focus}</span>${after}`;
}

function renderPrepositionQuestion() {
  const session = prepositionTrainingSession;
  if (!session) {
    openPrepositionTrainingSelector();
    return;
  }

  if (session.currentIndex >= session.questions.length) {
    showPrepositionTrainingResult();
    return;
  }

  const title = document.getElementById("prepositionPracticeTitle");
  const scopeText = document.getElementById("prepositionScopeText");
  const counterText = document.getElementById("prepositionCounterText");
  const questionText = document.getElementById("prepositionQuestionText");
  const translationText = document.getElementById("prepositionTranslationText");
  const answerPanel = document.getElementById("prepositionAnswerPanel");
  const answerInput = document.getElementById("prepositionAnswerInput");
  const answerBtn = document.getElementById("prepositionAnswerBtn");
  const feedbackBox = document.getElementById("prepositionFeedbackBox");
  const nextBtn = document.getElementById("prepositionNextBtn");
  if (!title || !scopeText || !counterText || !questionText || !translationText || !answerInput || !answerBtn || !feedbackBox || !nextBtn || !answerPanel) return;

  const currentQuestion = session.questions[session.currentIndex];
  title.textContent = `前置詞特訓 ${session.scopeLabel}`;
  scopeText.textContent = `前置詞特訓 ${session.scopeLabel}`;
  counterText.textContent = `${session.currentIndex + 1} / ${session.questions.length}`;
  questionText.classList.remove("hidden");
  translationText.classList.remove("hidden");
  answerPanel.classList.remove("hidden");
  questionText.textContent = currentQuestion.question;
  translationText.textContent = currentQuestion.translation || "";

  answerInput.value = "";
  answerInput.disabled = false;
  answerBtn.disabled = false;
  feedbackBox.className = "feedback-box hidden";
  feedbackBox.innerHTML = "";
  nextBtn.disabled = false;
  nextBtn.classList.add("hidden");
  session.answered = false;
  session.questionStartedAt = Date.now();
  window.setTimeout(() => answerInput.focus(), 30);
}

function submitPrepositionAnswer() {
  const session = prepositionTrainingSession;
  if (!session || session.answered) return;
  const currentQuestion = session.questions[session.currentIndex];
  if (!currentQuestion) return;

  const answerInput = document.getElementById("prepositionAnswerInput");
  const answerBtn = document.getElementById("prepositionAnswerBtn");
  const feedbackBox = document.getElementById("prepositionFeedbackBox");
  const nextBtn = document.getElementById("prepositionNextBtn");
  const questionText = document.getElementById("prepositionQuestionText");
  const translationText = document.getElementById("prepositionTranslationText");
  const answerPanel = document.getElementById("prepositionAnswerPanel");
  if (!answerInput || !answerBtn || !feedbackBox || !nextBtn) return;

  const raw = String(answerInput.value || "");
  const trimmed = raw.trim();
  if (!trimmed) {
    feedbackBox.className = "feedback-box error";
    feedbackBox.innerHTML = "<strong>入力してください</strong><span class=\"hint\">英字で入力してください</span>";
    answerInput.focus();
    return;
  }
  if (!/^[a-zA-Z]+$/.test(trimmed)) {
    feedbackBox.className = "feedback-box error";
    feedbackBox.innerHTML = "<strong>英字のみ入力できます</strong>";
    answerInput.focus();
    return;
  }

  recordCommonAnswerEvent({
    dayKey: todayKey(),
    category: "training",
    trainingKind: "preposition",
    typingCount: 1
  });

  const startedAt = Number(session.questionStartedAt);
  if (Number.isFinite(startedAt) && Date.now() > startedAt) {
    const elapsedMs = Date.now() - startedAt;
    const elapsedSeconds = elapsedMs > 0 ? Math.max(1, Math.ceil(elapsedMs / 1000)) : 0;
    recordCommonStudySeconds(todayKey(), elapsedSeconds, {
      category: "training",
      trainingKind: "preposition"
    });
  }

  const normalized = trimmed.toLowerCase();
  const isCorrect = normalized === String(currentQuestion.answer || "").toLowerCase();
  const answeredAt = Date.now();
  session.answerHistory.push({ at: answeredAt, isCorrect });
  session.answerCount += 1;
  session.answered = true;
  if (isCorrect) {
    session.correctCount += 1;
    if (!session.reviewMode) {
      awardPointsForTrainingMode("preposition");
    }
    playTrainingCorrectChime();
  } else {
    session.wrongQuestionIds.push(String(currentQuestion.id));
    session.wrongPrepositionCounts[currentQuestion.preposition] = (session.wrongPrepositionCounts[currentQuestion.preposition] || 0) + 1;
  }

  recordPrepositionTrainingAttempt(currentQuestion, isCorrect);

  feedbackBox.className = `feedback-box ${isCorrect ? "success" : "error"}`;
  feedbackBox.innerHTML = buildPrepositionFeedbackMarkup(currentQuestion, isCorrect, normalized);
  if (questionText) questionText.classList.add("hidden");
  if (translationText) translationText.classList.add("hidden");
  if (answerPanel) answerPanel.classList.add("hidden");
  nextBtn.classList.add("hidden");
  answerInput.disabled = true;
  answerBtn.disabled = true;

  const typingConfig = getTypingConfig();
  const showNextButton = () => {
    nextBtn.classList.remove("hidden");
    nextBtn.disabled = false;
    nextBtn.focus();
  };

  if (!shouldUseDesktopAutoAudioFlow() || !String(currentQuestion.audioFile || "").trim()) {
    showNextButton();
    return;
  }

  playQuestionAudioSequence(currentQuestion, {
    repeatCount: typingConfig.audioRepeatCount,
    initialDelayMs: typingDelaySecToMs(typingConfig.questionToAudioDelaySec),
    repeatGapMs: typingDelaySecToMs(typingConfig.repeatGapDelaySec),
    playbackRate: typingConfig.audioPlaybackRate,
    onComplete: () => {
      setTimeout(showNextButton, typingDelaySecToMs(typingConfig.audioToInputDelaySec));
    },
    onError: () => {
      setTimeout(showNextButton, typingDelaySecToMs(typingConfig.audioToInputDelaySec));
    }
  });
}

function moveToNextPrepositionQuestion() {
  if (!prepositionTrainingSession) return;
  const nextBtn = document.getElementById("prepositionNextBtn");
  if (nextBtn) nextBtn.disabled = true;
  const typingConfig = getTypingConfig();
  setTimeout(() => {
    if (!prepositionTrainingSession) return;
    prepositionTrainingSession.currentIndex += 1;
    if (prepositionTrainingSession.currentIndex >= prepositionTrainingSession.questions.length) {
      showPrepositionTrainingResult();
      return;
    }
    renderPrepositionQuestion();
  }, typingDelaySecToMs(typingConfig.judgementToNextDelaySec));
}

function showPrepositionTrainingResult() {
  const session = prepositionTrainingSession;
  if (!session) {
    openPrepositionTrainingSelector();
    return;
  }
  recordPrepositionLearningHistory(session, "completed");
  const pointSummary = computeSessionEarnedPoints(session);
  prepositionTrainingSession = null;
  openTrainingCompleteScreen({
    mode: "preposition",
    earnedPoints: pointSummary.earnedPoints,
    pointBalance: pointSummary.pointBalance,
    interrupted: false,
    showTicketAfter: true
  });
}

const defaultState = {
  settings: {
    studyRange: { start: 1, end: 1 },
    type: "all",
    typingConfig: sanitizeTypingConfig(),
    trainingCorrectChimePreset: TRAINING_CORRECT_CHIME_DEFAULT_PRESET,
    gameTicketConfig: createDefaultGameTicketConfig(),
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
    totalAnsweredCount: 0,
    totalTypingCount: 0,
    solvedByDay: {},
    dailyPerformanceByDate: {},
    studyTimeByDate: {},
    dailyStatsByDate: {},
    dayBestAccuracy: {},
    previousSessionWeakQuestionIds: [],
    lastResultSummary: null,
    completedSessions: [],
    pendingSessionNotice: "",
    unlockedDayMax: 1,
    gameTickets: createDefaultGameTicketStats(),
    trainingProfiles: createDefaultTrainingProfiles(),
    prepositionTraining: createDefaultPrepositionTrainingStats(),
    savedNormalSession: null,
    normalDayProgressByDay: {},
    extraTrainingDailyCounter: createDefaultExtraTrainingDailyCounter()
  },
  items: buildVocabularyItems(),
  session: null
};

function resolveAvailableStateStorageKeys() {
  const storageKeys = [];
  const directScopedKey = getScopedLocalStorageKey(STORAGE_KEY);
  if (directScopedKey) {
    storageKeys.push(directScopedKey);
  }
  try {
    if (typeof localStorage !== "undefined" && typeof localStorage.length === "number" && typeof localStorage.key === "function") {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (typeof key === "string" && key.startsWith(`${STORAGE_KEY}-`) && !storageKeys.includes(key)) {
          storageKeys.push(key);
        }
      }
    }
  } catch (_error) {
    // localStorage enumeration may be unavailable in some browser contexts.
  }
  if (!storageKeys.includes(STORAGE_KEY)) {
    storageKeys.push(STORAGE_KEY);
  }
  return [...new Set(storageKeys)];
}

function loadState() {
  const freshState = structuredClone(defaultState);
  try {
    const storageKeyCandidates = resolveAvailableStateStorageKeys();
    let raw = null;
    for (const storageKey of storageKeyCandidates) {
      raw = localStorage.getItem(storageKey);
      if (raw) break;
    }
    if (!raw) return freshState;

    const parsed = JSON.parse(raw);
    const mergedState = structuredClone(defaultState);
    mergedState.settings = {
      ...mergedState.settings,
      ...(parsed.settings || {})
    };
    const savedGameTicketConfig = parsed.settings?.gameTicketConfig && typeof parsed.settings.gameTicketConfig === "object"
      ? parsed.settings.gameTicketConfig
      : mergedState.settings.gameTicketConfig || createDefaultGameTicketConfig();
    mergedState.settings.gameTicketConfig = sanitizeGameTicketConfig(savedGameTicketConfig);
    mergedState.settings.typingConfig = sanitizeTypingConfig(mergedState.settings.typingConfig);
    mergedState.settings.trainingCorrectChimePreset = sanitizeTrainingCorrectChimePreset(mergedState.settings.trainingCorrectChimePreset);
    mergedState.stats = {
      ...mergedState.stats,
      ...(parsed.stats || {})
    };
    mergedState.stats.completedSessions = Array.isArray(parsed.stats?.completedSessions)
      ? parsed.stats.completedSessions.map(sanitizeCompletedSessionEntry).filter(Boolean)
      : [];
    mergedState.stats.dailyPerformanceByDate = Object.keys(parsed.stats?.dailyPerformanceByDate || {}).length
      ? sanitizeDailyPerformanceByDate(parsed.stats?.dailyPerformanceByDate)
      : buildLegacyDailyPerformanceByDate(mergedState.stats.completedSessions);
    mergedState.stats.studyTimeByDate = sanitizeStudyTimeByDate(parsed.stats?.studyTimeByDate);
    mergedState.stats.dailyStatsByDate = sanitizeDailyStatsByDate(parsed.stats?.dailyStatsByDate);
    mergedState.stats.totalAnsweredCount = Math.max(0, Number(parsed.stats?.totalAnsweredCount) || Number(parsed.stats?.totalSolvedQuestions) || 0);
    mergedState.stats.totalTypingCount = Math.max(0, Number(parsed.stats?.totalTypingCount) || 0);
    mergedState.stats.trainingProfiles = sanitizeTrainingProfiles(parsed.stats?.trainingProfiles);
    mergedState.stats.previousSessionWeakQuestionIds = Array.isArray(parsed.stats?.previousSessionWeakQuestionIds)
      ? parsed.stats.previousSessionWeakQuestionIds.map((id) => String(id))
      : [];
    mergedState.stats.pendingSessionNotice = typeof parsed.stats?.pendingSessionNotice === "string"
      ? parsed.stats.pendingSessionNotice
      : "";
    mergedState.stats.unlockedDayMax = sanitizeUnlockedDayMax(
      parsed.stats?.unlockedDayMax ?? parsed.settings?.studyRange?.end ?? 1,
      mergedState.items
    );
    mergedState.stats.gameTickets = sanitizeGameTicketStats(parsed.stats?.gameTickets);
    mergedState.stats.prepositionTraining = sanitizePrepositionTrainingStats(parsed.stats?.prepositionTraining);
    mergedState.stats.normalDayProgressByDay = sanitizeNormalDayProgressByDay(parsed.stats?.normalDayProgressByDay);
    mergedState.stats.extraTrainingDailyCounter = sanitizeExtraTrainingDailyCounter(parsed.stats?.extraTrainingDailyCounter);
    delete mergedState.stats.gameTicket;
    delete mergedState.stats.pendingGameTicket;
    mergedState.stats.savedNormalSession = null;
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
    mergedState.session = null;
    return mergedState;
  } catch (error) {
    console.error("Could not read saved state", error);
    return freshState;
  }
}

function buildPersistedStateSnapshot() {
  const snapshot = structuredClone(state);
  snapshot.settings.gameTicketConfig = sanitizeGameTicketConfig(snapshot.settings?.gameTicketConfig || createDefaultGameTicketConfig());
  snapshot.stats.savedNormalSession = null;
  snapshot.stats.normalDayProgressByDay = sanitizeNormalDayProgressByDay(snapshot.stats?.normalDayProgressByDay);
  snapshot.stats.extraTrainingDailyCounter = sanitizeExtraTrainingDailyCounter(snapshot.stats?.extraTrainingDailyCounter);
  snapshot.session = null;
  return snapshot;
}

function saveState() {
  const storageKey = getScopedLocalStorageKey(STORAGE_KEY) || STORAGE_KEY;
  localStorage.setItem(storageKey, JSON.stringify(buildPersistedStateSnapshot()));
  if (gameTicketSyncDirty && getCurrentPcFirebaseUid()) {
    const meta = loadGameTicketSyncMeta();
    meta.uid = String(getCurrentPcFirebaseUid() || meta.uid || "");
    meta.updatedAt = Date.now();
    saveGameTicketSyncMeta(meta);
    scheduleGameTicketSync();
  }
}

function createLearningBackupPayload() {
  return {
    formatVersion: 1,
    backupCreatedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    storageKey: getScopedLocalStorageKey(STORAGE_KEY) || STORAGE_KEY,
    state: structuredClone(state)
  };
}

function getBackupFileName() {
  return `EnglishTrainer_Backup_${todayKey()}.json`;
}

function downloadLearningBackupFile(payload) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = getBackupFileName();
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function parseLearningBackupPayload(rawText) {
  const parsed = JSON.parse(rawText);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Backup root is invalid");
  }

  const stateCandidate = parsed.state;
  const hasStateShape =
    stateCandidate &&
    typeof stateCandidate === "object" &&
    typeof stateCandidate.settings === "object" &&
    typeof stateCandidate.stats === "object" &&
    Array.isArray(stateCandidate.items);

  if (!hasStateShape) {
    throw new Error("Backup state is invalid");
  }

  return {
    formatVersion: Number.isFinite(Number(parsed.formatVersion)) ? Number(parsed.formatVersion) : 1,
    backupCreatedAt: typeof parsed.backupCreatedAt === "string" ? parsed.backupCreatedAt : "",
    appVersion: typeof parsed.appVersion === "string" ? parsed.appVersion : "",
    storageKey: typeof parsed.storageKey === "string" ? parsed.storageKey : "",
    state: stateCandidate
  };
}

function parseAppVersionTimestamp(version) {
  return parseVersionValueToTimestamp(version);
}

function isOlderBackupVersion(backupVersion, currentVersion) {
  const backupTimestamp = parseAppVersionTimestamp(backupVersion);
  const currentTimestamp = parseAppVersionTimestamp(currentVersion);
  if (!Number.isFinite(backupTimestamp) || !Number.isFinite(currentTimestamp)) {
    return false;
  }
  return backupTimestamp < currentTimestamp;
}

function openBackupRestoreConfirmModal(options) {
  const modal = document.getElementById("backupRestoreConfirmModal");
  const titleEl = document.getElementById("backupRestoreConfirmTitle");
  const messageEl = document.getElementById("backupRestoreConfirmMessage");
  const confirmBtn = document.getElementById("backupRestoreConfirmActionBtn");
  const cancelBtn = document.getElementById("backupRestoreConfirmCancelBtn");
  const closeBtn = document.getElementById("backupRestoreConfirmCloseBtn");
  const backdrop = document.getElementById("backupRestoreConfirmBackdrop");
  if (!modal || !titleEl || !messageEl || !confirmBtn || !cancelBtn || !closeBtn || !backdrop) {
    return Promise.resolve(window.confirm(String(options?.message || "確認しますか？")));
  }

  titleEl.textContent = String(options?.title || "確認");
  messageEl.textContent = String(options?.message || "確認しますか？");
  confirmBtn.textContent = String(options?.confirmText || "実行する");

  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      confirmBtn.removeEventListener("click", onConfirm);
      cancelBtn.removeEventListener("click", onCancel);
      closeBtn.removeEventListener("click", onCancel);
      backdrop.removeEventListener("click", onCancel);
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    };

    const finalize = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const onConfirm = () => finalize(true);
    const onCancel = () => finalize(false);

    confirmBtn.addEventListener("click", onConfirm);
    cancelBtn.addEventListener("click", onCancel);
    closeBtn.addEventListener("click", onCancel);
    backdrop.addEventListener("click", onCancel);
  });
}

async function tryRestoreLearningDataFromFile(file) {
  const genericErrorMessage = "バックアップファイルを読み込めませんでした。";
  try {
    const rawText = await file.text();
    const backup = parseLearningBackupPayload(rawText);

    const currentUid = getCurrentPcFirebaseUid();
    const storageKey = getScopedLocalStorageKey(STORAGE_KEY, currentUid);
    if (!storageKey) {
      alert("ログイン状態を確認できないため復元できません");
      return;
    }

    const overwriteConfirmed = await openBackupRestoreConfirmModal({
      title: "復元の確認",
      message: "現在の学習記録を上書きします。\n元に戻すことはできません。",
      confirmText: "復元する"
    });
    if (!overwriteConfirmed) return;

    if (isOlderBackupVersion(backup.appVersion, APP_VERSION)) {
      const legacyConfirmed = await openBackupRestoreConfirmModal({
        title: "古いバックアップの警告",
        message: "このバックアップは古いバージョンで作成されています。\n一部のデータが復元できない可能性があります。\n復元しますか？",
        confirmText: "復元する"
      });
      if (!legacyConfirmed) return;
    }

    const backupUid = extractUidFromScopedStorageKey(backup.storageKey, STORAGE_KEY);
    if (backupUid && currentUid && backupUid !== currentUid) {
      backup.state.stats = backup.state.stats && typeof backup.state.stats === "object"
        ? {
          ...backup.state.stats,
          gameTickets: createDefaultGameTicketStats()
        }
        : {
          gameTickets: createDefaultGameTicketStats()
        };
      markSkipGameTicketSyncOnce();
    }

    const serializedState = JSON.stringify(backup.state);
    localStorage.setItem(storageKey, serializedState);
    const persistedStateRaw = localStorage.getItem(storageKey);
    if (!persistedStateRaw) {
      throw new Error("Backup restore verification failed: localStorage key is empty");
    }

    markSkipStudyCoreSyncOnce();
    isResettingLearningData = true;

    alert("学習データを復元しました。\n\nアプリを再読み込みします。");
    location.reload();
  } catch (error) {
    console.error("Could not restore backup file", error);
    alert(genericErrorMessage);
  }
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
  const historySegmentStartedAt = Number(sessionLike.historySegmentStartedAt);
  const historySegmentAnswerStartCount = Number(sessionLike.historySegmentAnswerStartCount);
  const historySegmentAnswerHistoryStartIndex = Number(sessionLike.historySegmentAnswerHistoryStartIndex);
  const historySegmentCorrectStartCount = Number(sessionLike.historySegmentCorrectStartCount);
  const historySegmentPointBalanceBefore = Number(sessionLike.historySegmentPointBalanceBefore);
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
    weakFocusRoundCount: Math.max(0, Number(sessionLike.weakFocusRoundCount) || 0),
    weakFocusAskedQuestionIds: Array.isArray(sessionLike.weakFocusAskedQuestionIds)
      ? sessionLike.weakFocusAskedQuestionIds.map((id) => String(id))
      : [],
    weakFocusLastRoundCorrectIds: Array.isArray(sessionLike.weakFocusLastRoundCorrectIds)
      ? sessionLike.weakFocusLastRoundCorrectIds.map((id) => String(id))
      : [],
    weakFocusLastRoundWrongIds: Array.isArray(sessionLike.weakFocusLastRoundWrongIds)
      ? sessionLike.weakFocusLastRoundWrongIds.map((id) => String(id))
      : [],
    weakFocusCurrentRoundCorrectIds: Array.isArray(sessionLike.weakFocusCurrentRoundCorrectIds)
      ? sessionLike.weakFocusCurrentRoundCorrectIds.map((id) => String(id))
      : [],
    weakFocusCurrentRoundWrongIds: Array.isArray(sessionLike.weakFocusCurrentRoundWrongIds)
      ? sessionLike.weakFocusCurrentRoundWrongIds.map((id) => String(id))
      : [],
    weakFocusLastQuestionId: typeof sessionLike.weakFocusLastQuestionId === "string" ? sessionLike.weakFocusLastQuestionId : "",
    awaitingWeakFocusDecision: Boolean(sessionLike.awaitingWeakFocusDecision),
    isFinishingSession: false,
    isSessionCompleted: false,
    ticketSnapshot: sanitizeLearningHistoryTicketSnapshot(sessionLike.ticketSnapshot),
    isExtraTrainingSession: Boolean(sessionLike.isExtraTrainingSession),
    historySegmentStartedAt: Number.isFinite(historySegmentStartedAt) && historySegmentStartedAt > 0
      ? historySegmentStartedAt
      : (Number.isFinite(startedAt) && startedAt > 0 ? startedAt : Date.now()),
    historySegmentAnswerStartCount: Number.isFinite(historySegmentAnswerStartCount)
      ? Math.max(0, Math.floor(historySegmentAnswerStartCount))
      : 0,
    historySegmentAnswerHistoryStartIndex: Number.isFinite(historySegmentAnswerHistoryStartIndex)
      ? Math.max(0, Math.floor(historySegmentAnswerHistoryStartIndex))
      : 0,
    historySegmentCorrectStartCount: Number.isFinite(historySegmentCorrectStartCount)
      ? Math.max(0, Math.floor(historySegmentCorrectStartCount))
      : 0,
    historySegmentPointBalanceBefore: Number.isFinite(historySegmentPointBalanceBefore)
      ? Math.max(0, Math.floor(historySegmentPointBalanceBefore))
      : Math.max(0, Math.floor(Number(sessionLike.pointBalanceBefore) || 0)),
    historySegmentDayNumber: typeof sessionLike.historySegmentDayNumber === "string" ? sessionLike.historySegmentDayNumber : ""
  };
}

function sanitizeCompletedSessionEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const accuracy = Number(entry.accuracy);
  const questionCount = Number(entry.questionCount);
  const correctCount = Number(entry.correctCount);
  const durationMinutes = Number(entry.durationMinutes);
  return {
    dayKey: typeof entry.dayKey === "string" ? entry.dayKey : todayKey(),
    completedAt: Number.isFinite(Number(entry.completedAt)) ? Number(entry.completedAt) : Date.now(),
    mode: typeof entry.mode === "string" ? entry.mode : "normal",
    title: typeof entry.title === "string" ? entry.title : "学習結果",
    accuracy: Number.isFinite(accuracy) ? Math.max(0, Math.min(100, Math.round(accuracy))) : 0,
    questionCount: Number.isFinite(questionCount) ? Math.max(0, Math.round(questionCount)) : 0,
    correctCount: Number.isFinite(correctCount) ? Math.max(0, Math.round(correctCount)) : null,
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

function getSessionElapsedMsWithinDay(sessionLike, dayKey) {
  const lastResumedAt = Number(sessionLike?.lastResumedAt);
  if (!Number.isFinite(lastResumedAt) || !lastResumedAt || !dayKey) {
    return 0;
  }
  const [year, month, day] = String(dayKey).split("-").map(Number);
  if (!year || !month || !day) return 0;
  const start = new Date(year, month - 1, day).getTime();
  const end = new Date(year, month - 1, day + 1).getTime();
  const now = Date.now();
  const overlapStart = Math.max(lastResumedAt, start);
  const overlapEnd = Math.min(now, end);
  return Math.max(0, overlapEnd - overlapStart);
}

function checkpointSessionClock(sessionLike, options = {}) {
  if (!sessionLike) return;
  const lastResumedAt = Number(sessionLike.lastResumedAt);
  const now = Date.now();
  if (Number.isFinite(lastResumedAt) && lastResumedAt && now > lastResumedAt) {
    const delta = now - lastResumedAt;
    const trainingKind = getTrainingKindByMode(sessionLike.mode);
    recordStudyTimeBetween(lastResumedAt, now, {
      category: trainingKind ? "training" : "day",
      trainingKind
    });
    sessionLike.accumulatedMs = Math.max(0, Number(sessionLike.accumulatedMs) || 0) + delta;
  }
  sessionLike.lastResumedAt = options.pause ? null : now;
}

function pauseSessionClock(sessionLike) {
  checkpointSessionClock(sessionLike, { pause: true });
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
  queueStudyCoreSyncChange({ itemIds: [key], reviewRecordIds: [key] });
}

function setItemReviewDue(questionId, visible) {
  const target = getQuestionById(questionId);
  if (target) {
    target.reviewDue = visible;
    queueStudyCoreSyncChange({ itemIds: [questionId] });
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

function getPhraseWordGuideCount(question) {
  if (!question) return 0;
  const rawAnswer = String(question.answer || question.english || "").trim();
  if (!rawAnswer) return 0;
  return rawAnswer.split(/\s+/).filter(Boolean).length;
}

function getPhraseSequenceMarkers(count) {
  const circledDigits = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬", "⑭", "⑮", "⑯", "⑰", "⑱", "⑲", "⑳"];
  const safeCount = Math.max(0, Number(count) || 0);
  return Array.from({ length: safeCount }, (_, index) => circledDigits[index] || String(index + 1));
}

function renderPhraseInputGuide(question) {
  if (!question || question.type !== "phrase") return "";
  const count = getPhraseWordGuideCount(question);
  if (!count) return "";
  const blanks = Array.from({ length: count }, () => '<span class="phrase-guide-blank"></span>');
  return `<span class="phrase-guide-wrap">${blanks.join(" ")}</span>`;
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
  return formatJapaneseQuestionText(question);
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

function playQuestionAudio(question, onComplete, onError, options = {}) {
  const questionId = String(question?.id || "").trim();
  const rawAudioFile = String(question?.audioFile || "").trim();

  if (!questionId && !rawAudioFile) {
    if (typeof onComplete === "function") onComplete();
    return false;
  }

  stopCurrentAudio();

  const normalizedAudioFile = rawAudioFile.replace(/\\/g, "/").split("?", 1)[0].split("#", 1)[0];
  const candidates = [];

  if (normalizedAudioFile) {
    candidates.push(normalizedAudioFile.startsWith("audio/") ? normalizedAudioFile : `audio/${normalizedAudioFile}`);
  }

  if (questionId) {
    candidates.push(`audio/${encodeURIComponent(questionId)}.mp3`);
  }

  const uniqueCandidates = [...new Set(candidates.filter((path) => Boolean(path)))];
  if (!uniqueCandidates.length) {
    if (typeof onComplete === "function") onComplete();
    return false;
  }

  console.log("audio question id:", question?.id);
  console.log("audio candidates:", uniqueCandidates);

  let completed = false;

  const finishOnce = () => {
    if (completed) return;
    completed = true;

    stopCurrentAudio();

    if (typeof onComplete === "function") {
      onComplete();
    }
  };

  const tryPlayAt = (index) => {
    if (completed) return;

    const audioPath = uniqueCandidates[index];
    if (!audioPath) {
      console.error("音声再生候補がすべて失敗:", uniqueCandidates);
      if (typeof onError === "function") {
        onError();
      }
      finishOnce();
      return;
    }

    const audio = new Audio(audioPath);
    currentAudio = audio;
    audio.preload = "auto";
    audio.volume = 1;
    const requestedRate = Number(options.playbackRate);
    audio.playbackRate = Number.isFinite(requestedRate)
      ? Math.max(0.5, Math.min(2, requestedRate))
      : getTypingConfig().audioPlaybackRate;

    const handleFailure = (error) => {
      console.error("音声再生失敗:", audio.src, error);
      if (currentAudio === audio) {
        currentAudio = null;
      }
      tryPlayAt(index + 1);
    };

    audio.addEventListener("ended", finishOnce, { once: true });
    audio.addEventListener(
      "error",
      () => {
        handleFailure(new Error("audio load error"));
      },
      { once: true }
    );

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch((error) => {
        handleFailure(error);
      });
    }
  };

  tryPlayAt(0);

  return true;
}

function playQuestionAudioSequence(question, options = {}) {
  const repeatCount = Math.max(1, Math.min(3, Number(options.repeatCount) || 1));
  const initialDelayMs = Math.max(0, Number(options.initialDelayMs) || 0);
  const repeatGapMs = Math.max(0, Number(options.repeatGapMs) || 0);
  const playbackRate = Number(options.playbackRate);
  const onComplete = typeof options.onComplete === "function" ? options.onComplete : () => {};
  const onError = typeof options.onError === "function" ? options.onError : () => {};

  let remaining = repeatCount;
  let isFinished = false;

  const finish = () => {
    if (isFinished) return;
    isFinished = true;
    onComplete();
  };

  const fail = () => {
    if (isFinished) return;
    onError();
    finish();
  };

  const playNext = () => {
    if (isFinished) return;
    playQuestionAudio(
      question,
      () => {
        remaining -= 1;
        if (remaining <= 0) {
          finish();
          return;
        }
        setTimeout(playNext, repeatGapMs);
      },
      fail,
      { playbackRate }
    );
  };

  setTimeout(playNext, initialDelayMs);
  return true;
}

function shouldUseDesktopAutoAudioFlow() {
  const hasTouchDevice =
    (typeof window !== "undefined" && "ontouchstart" in window) ||
    (typeof navigator !== "undefined" && Number(navigator.maxTouchPoints) > 0) ||
    (typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches);

  return !hasTouchDevice;
}

function isDesktopAutoAudioFlow(session, question) {
  if (!session || !question) return false;
  return shouldUseDesktopAutoAudioFlow();
}

function startDesktopDoubleAudioAndAutoAdvance(session, question, feedbackBox) {
  if (!session || !question) return false;
  const typingConfig = getTypingConfig();

  // 回答後は Enter を不要にし、2回再生後に自動遷移する。
  session.awaitingEnter = false;
  session.answered = true;
  session.answerLocked = true;
  session.enterConsumed = true;
  session.enterLocked = true;
  session.enterLockUntil = null;

  let advanced = false;
  const advanceAfterDelay = () => {
    if (advanced) return;
    advanced = true;
    if (state.session !== session) return;
    setTimeout(() => {
      if (state.session !== session) return;
      advanceToNextQuestion();
    }, typingDelaySecToMs(typingConfig.judgementToNextDelaySec));
  };

  const handleError = () => {
    if (feedbackBox) {
      showAudioPlaybackError(feedbackBox);
    }
    advanceAfterDelay();
  };

  playQuestionAudioSequence(question, {
    repeatCount: typingConfig.audioRepeatCount,
    initialDelayMs: typingDelaySecToMs(typingConfig.questionToAudioDelaySec),
    repeatGapMs: typingDelaySecToMs(typingConfig.repeatGapDelaySec),
    playbackRate: typingConfig.audioPlaybackRate,
    onComplete: advanceAfterDelay,
    onError: handleError
  });

  return true;
}

function startSecondAudioAndAutoAdvance(question) {
  const session = state.session;
  const typingConfig = getTypingConfig();
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

  playQuestionAudioSequence(targetQuestion, {
    repeatCount: typingConfig.audioRepeatCount,
    initialDelayMs: 0,
    repeatGapMs: typingDelaySecToMs(typingConfig.repeatGapDelaySec),
    playbackRate: typingConfig.audioPlaybackRate,
    onComplete: () => {
      setTimeout(() => {
        if (state.session !== session) return;
        advanceToNextQuestion();
      }, typingDelaySecToMs(typingConfig.judgementToNextDelaySec));
    }
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
  state.stats.unlockedDayMax = sanitizeUnlockedDayMax(state.stats.unlockedDayMax, state.items);
  syncGameTicketState();
}

function getAvailableDays() {
  return [...new Set(state.items.map((item) => item.day))].sort((a, b) => a - b);
}

function getMaxAvailableDay() {
  const availableDays = getAvailableDays();
  return availableDays.length ? availableDays[availableDays.length - 1] : 1;
}

function ensureItemsSyncedWithVocabularyBank() {
  const latestItems = buildVocabularyItems();
  if (!latestItems.length) return false;

  const currentItems = Array.isArray(state.items) ? state.items : [];
  const latestIds = latestItems.map((item) => String(item.id));
  const currentById = new Map(currentItems.map((item) => [String(item.id), item]));
  const hasVocabularyDrift = latestItems.some((latest) => {
    const existing = currentById.get(String(latest.id));
    if (!existing) return true;
    const latestHint = String(latest.hint || "").trim();
    const existingHint = String(existing.hint || "").trim();
    return (
      Number(existing.day) !== Number(latest.day) ||
      String(existing.type || "") !== String(latest.type || "") ||
      String(existing.japanese || "") !== String(latest.japanese || "") ||
      String(existing.answer || existing.english || "") !== String(latest.answer || latest.english || "") ||
      existingHint !== latestHint
    );
  });
  const needsSync =
    currentItems.length !== latestItems.length ||
    latestIds.some((id) => !currentById.has(id)) ||
    hasVocabularyDrift;

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
  stopAdminLearningHistoryFirestoreListener();
  syncDerivedStats();
  ensureUnlockedDayProgressConsistency();
  const advanceDayText = document.getElementById("advanceDayText");
  const advanceBtn = document.getElementById("advanceBtn");
  const todayExtraTrainingBtn = document.getElementById("todayExtraTrainingBtn");
  const progressMasterCount = document.getElementById("progressMasterCount");
  const daySelectWordBtn = document.getElementById("daySelectWordBtn");
  const daySelectPhraseBtn = document.getElementById("daySelectPhraseBtn");
  const challengeBtn = document.getElementById("challengeBtn");
  const nextDay = getNextAdvanceDay();

  if (advanceDayText) advanceDayText.textContent = `Day${nextDay}`;
  if (progressMasterCount) progressMasterCount.textContent = state.stats.masterCount;
  if (advanceBtn) advanceBtn.disabled = false;
  if (todayExtraTrainingBtn) todayExtraTrainingBtn.disabled = false;
  if (daySelectWordBtn) daySelectWordBtn.disabled = false;
  if (daySelectPhraseBtn) daySelectPhraseBtn.disabled = false;
  if (challengeBtn) challengeBtn.disabled = false;
  renderGameTicketHomePanel();
  renderLevelCollection();
  renderRecentProgressTop5();
  renderHomeMessage();
  refreshResumeSessionButton();
  renderHomeAccountAliasBadge();
}

function hasCompletedTodayNormalDaySession() {
  const today = todayKey();
  const sessions = Array.isArray(state.stats?.completedSessions) ? state.stats.completedSessions : [];
  return sessions.some((entry) => {
    const row = sanitizeCompletedSessionEntry(entry);
    if (!row) return false;
    return row.dayKey === today && row.mode === "normal" && !row.interrupted;
  });
}

function formatExtraTrainingButtonLabel(remainingCount) {
  return `▶ 追加特訓（5問 / あと${Math.max(0, remainingCount)}回）`;
}

function updateTodayExtraTrainingButtonVisibility() {
  const todayExtraTrainingBtn = document.getElementById("todayExtraTrainingBtn");
  if (!todayExtraTrainingBtn) return;
  const remainingCount = getExtraTrainingDailyRemainingCount();
  todayExtraTrainingBtn.textContent = formatExtraTrainingButtonLabel(remainingCount);
  todayExtraTrainingBtn.disabled = remainingCount <= 0;
  const shouldShow = hasCompletedTodayNormalDaySession();
  todayExtraTrainingBtn.classList.toggle("hidden", !shouldShow);
}

function startTodayExtraTrainingFromHome() {
  const remainingCount = getExtraTrainingDailyRemainingCount();
  if (remainingCount <= 0) {
    alert("本日の追加特訓は上限10回に達しました。明日また挑戦してください.");
    return;
  }
  const virtualWeakFocusSession = {
    baseQuestionIds: [],
    weakFocusAskedQuestionIds: [],
    weakFocusLastRoundCorrectIds: [],
    weakFocusLastRoundWrongIds: [],
    weakFocusLastQuestionId: ""
  };
  const questions = getWeakPhasePool(virtualWeakFocusSession, NORMAL_WEAK_FOCUS_BATCH_SIZE);
  if (!questions.length) {
    alert("追加特訓で出題できる問題がありません。通常学習を進めてください。");
    return;
  }
  prepareSession("normal", {
    customPool: questions,
    forceNewSession: true,
    startWeakFocusOnly: true,
    extraTraining: true
  });
}

function renderExtraTrainingScreen() {
  const title = document.getElementById("extraTrainingScreenTitle");
  const description = document.getElementById("extraTrainingScreenDescription");
  const count = document.getElementById("extraTrainingScreenCount");
  const remaining = document.getElementById("extraTrainingScreenRemaining");
  const startBtn = document.getElementById("extraTrainingStartBtn");
  if (!title || !description || !count || !remaining || !startBtn) return;

  const remainingCount = getExtraTrainingDailyRemainingCount();
  title.textContent = "追加特訓";
  description.textContent = "未学習・弱点・その他を優先して、今日の追加特訓を始めます。";
  count.textContent = "5問";
  remaining.textContent = remainingCount > 0 ? `あと${remainingCount}回挑戦できます` : "本日の上限に達しました";
  startBtn.disabled = remainingCount <= 0;
  startBtn.textContent = remainingCount > 0 ? "▶ 追加特訓を始める" : "本日の上限です";
}

function openExtraTrainingScreen() {
  renderExtraTrainingScreen();
  showScreen("extraTrainingScreen");
}

function loadChallengePromoCounterByDate() {
  const storageKey = getScopedLocalStorageKey(CHALLENGE_PROMO_COUNTER_STORAGE_KEY);
  if (!storageKey) return {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([dayKey, count]) => [
        String(dayKey),
        Math.max(0, Math.floor(Number(count) || 0))
      ])
    );
  } catch (_error) {
    return {};
  }
}

function saveChallengePromoCounterByDate(counterByDate) {
  const storageKey = getScopedLocalStorageKey(CHALLENGE_PROMO_COUNTER_STORAGE_KEY);
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(counterByDate && typeof counterByDate === "object" ? counterByDate : {}));
  } catch (_error) {
    // no-op
  }
}

function getChallengePromoShownCount(dayKey = getPointTodayKey()) {
  const counterByDate = loadChallengePromoCounterByDate();
  return Math.max(0, Math.floor(Number(counterByDate[String(dayKey)] || 0)));
}

function markChallengePromoShown(dayKey = getPointTodayKey()) {
  const safeDayKey = String(dayKey || "").trim();
  if (!safeDayKey) return;
  const counterByDate = loadChallengePromoCounterByDate();
  counterByDate[safeDayKey] = Math.max(0, Math.floor(Number(counterByDate[safeDayKey] || 0))) + 1;
  saveChallengePromoCounterByDate(counterByDate);
}

function shouldShowChallengePromo() {
  const today = getPointTodayKey();
  if (today !== CHALLENGE_PROMO_LIMIT_DAY_KEY) return false;
  return getChallengePromoShownCount(today) < CHALLENGE_PROMO_MAX_SHOWS_PER_UID;
}

function clearChallengePromoTimer() {
  if (challengePromoTimerId) {
    window.clearTimeout(challengePromoTimerId);
    challengePromoTimerId = null;
  }
}

function playChallengePromoEffectOnce() {
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const startAt = context.currentTime + 0.02;
    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(0.0001, startAt);
    gainNode.gain.exponentialRampToValueAtTime(0.08, startAt + 0.08);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + 1.15);
    gainNode.connect(context.destination);

    const createTone = (frequency, offset, duration, type = "sawtooth") => {
      const oscillator = context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startAt + offset);
      oscillator.connect(gainNode);
      oscillator.start(startAt + offset);
      oscillator.stop(startAt + offset + duration);
    };

    createTone(132, 0.0, 0.92, "sawtooth");
    createTone(196, 0.12, 0.85, "triangle");
    createTone(294, 0.26, 0.6, "square");

    window.setTimeout(() => {
      context.close().catch(() => {
        // no-op
      });
    }, 1400);
  } catch (_error) {
    // no-op
  }
}

function beginChallengeSessionAfterPromo() {
  clearChallengePromoTimer();
  const pendingOptions = pendingChallengePromoOptions && typeof pendingChallengePromoOptions === "object"
    ? pendingChallengePromoOptions
    : {};
  pendingChallengePromoOptions = null;
  prepareSession("challenge", {
    ...pendingOptions,
    skipChallengePromo: true
  });
}

function openChallengePromoScreen(options = {}) {
  clearChallengePromoTimer();
  pendingChallengePromoOptions = options && typeof options === "object" ? { ...options } : {};
  markChallengePromoShown();
  showScreen(CHALLENGE_PROMO_SCREEN_ID);

  const promoScreen = document.getElementById(CHALLENGE_PROMO_SCREEN_ID);
  if (promoScreen) {
    promoScreen.classList.remove("is-animating");
    void promoScreen.offsetWidth;
    promoScreen.classList.add("is-animating");
  }

  playChallengePromoEffectOnce();
}

function renderHomeUpdateHistory() {
  const list = document.getElementById("homeUpdateHistoryList");
  if (!list) return;
  list.innerHTML = buildReleaseHistoryDisplayEntries(SETTINGS_INFO.releaseHistory)
    .map((entry) => `<li><span class="home-update-version">${formatVersionForJstDisplay(entry.version)}</span><span>${entry.note}</span></li>`)
    .join("");
}

function hasSavedNormalSession() {
  return false;
}

function hasResumableNormalSession() {
  return hasSavedNormalSession();
}

function refreshResumeSessionButton() {
  const button = document.getElementById("resumeSessionBtn");
  const advanceBtn = document.getElementById("advanceBtn");
  const todayExtraTrainingBtn = document.getElementById("todayExtraTrainingBtn");
  if (!button) return;
  button.classList.add("hidden");
  if (advanceBtn) {
    advanceBtn.classList.remove("hidden");
  }
  updateTodayExtraTrainingButtonVisibility();
  if (todayExtraTrainingBtn) {
    todayExtraTrainingBtn.classList.toggle("hidden", !hasCompletedTodayNormalDaySession());
  }
}

function stashNormalSessionIfNeeded(sessionLike) {
  state.stats.savedNormalSession = null;
}

function restoreSavedNormalSession() {
  return false;
}

function clearSavedNormalSession() {
  state.stats.savedNormalSession = null;
  saveState();
  refreshResumeSessionButton();
}

function persistSessionProgress(sessionLike = state.session) {
  saveState();
}

function showScreen(screenId, options = {}) {
  if (screenId !== CHALLENGE_PROMO_SCREEN_ID) {
    clearChallengePromoTimer();
    pendingChallengePromoOptions = null;
  }
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
  const appShell = document.querySelector(".app-shell");
  if (appShell) {
    appShell.classList.toggle("non-home-screen", currentScreenId !== "homeScreen");
  }
  renderHomeAccountAliasBadge();
  applyDesktopResponsiveScale();
  scheduleKeyboardNavigationSync();
}

function applyDesktopResponsiveScale() {
  const doc = typeof document !== "undefined" ? document.documentElement : null;
  if (!doc) return;
  // Responsive scaling is handled by CSS media queries.
  doc.style.removeProperty("--pc-ui-scale");
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
  ensureUnlockedDayProgressConsistency();
  const nextDay = getNextAdvanceDay();
  state.settings.studyRange = { start: nextDay, end: nextDay };
  saveState();
  prepareSession("normal", {
    forceNewSession: true,
    progressiveDay: true
  });
}

function getNextAdvanceDay() {
  const availableDays = getAvailableDays();
  if (!availableDays.length) return 1;
  const minDay = availableDays[0];
  const maxDay = availableDays[availableDays.length - 1];
  const unlockedDay = getUnlockedDayMax();
  return Math.max(minDay, Math.min(maxDay, unlockedDay));
}

function getUnlockedDayMax() {
  const availableDays = getAvailableDays();
  if (!availableDays.length) return 1;
  const minDay = availableDays[0];
  const maxDay = availableDays[availableDays.length - 1];
  const raw = Number(state.stats?.unlockedDayMax);
  if (!Number.isFinite(raw)) return minDay;
  return Math.max(minDay, Math.min(maxDay, Math.round(raw)));
}

function getDayStudyPool(day, type) {
  const startDay = Number(day?.startDay);
  const endDay = Number(day?.endDay);
  const maxDay = getMaxAvailableDay();
  const safeStart = Number.isFinite(startDay) ? Math.max(1, Math.min(maxDay, startDay)) : 1;
  const safeEnd = Number.isFinite(endDay) ? Math.max(safeStart, Math.min(maxDay, endDay)) : safeStart;
  const normalizedType = type === "word" || type === "phrase" || type === "all" ? type : "all";
  const dayItems = state.items.filter((item) => Number(item.day) >= safeStart && Number(item.day) <= safeEnd);
  const typedItems = normalizedType === "all" ? dayItems : dayItems.filter((item) => item.type === normalizedType);
  const prioritizedItems = getDayStudyPriorityPool(typedItems);
  if (normalizedType === "phrase") {
    return prioritizedItems;
  }
  return prioritizedItems.slice(0, Math.min(10, prioritizedItems.length));
}

function startDayStudySession(startDay, endDay, type) {
  const maxDay = getMaxAvailableDay();
  const unlockedDayMax = getUnlockedDayMax();
  const safeStart = Math.max(1, Math.min(maxDay, Number(startDay) || 1));
  const safeEnd = Math.max(safeStart, Math.min(maxDay, Number(endDay) || safeStart));
  const normalizedType = type === "word" || type === "phrase" || type === "all" ? type : "all";

  if (safeStart > unlockedDayMax || safeEnd > unlockedDayMax) {
    alert("未解放のDayです。通常学習で解放してください。");
    return;
  }

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

function parseDateKeyToTime(dayKey) {
  if (typeof dayKey !== "string") return null;
  const match = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const value = new Date(Number(year), Number(month) - 1, Number(day)).getTime();
  return Number.isFinite(value) ? value : null;
}

function getDaysSinceDateKey(dayKey) {
  const dateTime = parseDateKeyToTime(dayKey);
  if (!Number.isFinite(dateTime)) return Number.POSITIVE_INFINITY;
  const todayTime = parseDateKeyToTime(todayKey());
  if (!Number.isFinite(todayTime)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((todayTime - dateTime) / GAME_TICKET_DAY_MS));
}

function scorePastCorrectCandidate(item) {
  const stats = getItemLearningStats(item);
  const daysSinceAsked = getDaysSinceDateKey(stats.lastStudiedDate);
  const daysSinceCorrect = getDaysSinceDateKey(stats.lastCorrectDate);
  const askedRecencyPenalty = daysSinceAsked <= 2 ? 1000 : 0;
  const askedScore = Number.isFinite(daysSinceAsked) ? daysSinceAsked * 2 : 365;
  const correctScore = Number.isFinite(daysSinceCorrect) ? daysSinceCorrect * 3 : 365;
  const jitter = Math.random();
  return askedScore + correctScore - askedRecencyPenalty + jitter;
}

function isActiveMistakeReviewTarget(item) {
  if (!item) return false;
  if (item.reviewDue || (Number(item.reviewTodayCount) || 0) > 0) return true;
  const reviewRecord = getReviewRecord(item.id);
  if (!reviewRecord) return false;
  if (reviewRecord.isVisibleInReviewList) return true;
  if (typeof reviewRecord.nextReviewDate === "string" && reviewRecord.nextReviewDate && reviewRecord.nextReviewDate <= todayKey()) {
    return true;
  }
  return false;
}

function isEligiblePastCorrectSpiralCandidate(item, currentDay) {
  if (!item) return false;
  if (Number(item.day) >= currentDay) return false;

  const stats = getItemLearningStats(item);
  if (Number(stats.correct) <= 0) return false;
  if (!item.lastAnswerWasCorrect) return false;

  if (getEffectiveLevelForItem(item) <= 2) return false;
  if (isActiveMistakeReviewTarget(item)) return false;

  return true;
}

function pickPastCorrectReviewItems(currentDay, count) {
  const targetCount = Math.max(0, count);
  if (targetCount <= 0) return [];
  const candidates = state.items.filter((item) => isEligiblePastCorrectSpiralCandidate(item, currentDay));
  if (!candidates.length) return [];
  return candidates
    .map((item) => ({ item, score: scorePastCorrectCandidate(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, targetCount)
    .map((entry) => entry.item);
}

function buildNormalSpiralMainQuestions() {
  const availableDays = getAvailableDays();
  if (!availableDays.length) return [];
  const maxDay = availableDays[availableDays.length - 1];
  const currentDayRaw = Number(state.settings.studyRange?.start);
  const currentDay = Number.isFinite(currentDayRaw)
    ? Math.max(availableDays[0], Math.min(maxDay, currentDayRaw))
    : availableDays[0];

  const currentDayItems = state.items.filter((item) => Number(item.day) === currentDay);
  if (!currentDayItems.length) return [];

  if (currentDay <= availableDays[0]) {
    return weightedSampleWithoutReplacement(currentDayItems, Math.min(10, currentDayItems.length));
  }

  const currentDayCore = weightedSampleWithoutReplacement(currentDayItems, Math.min(8, currentDayItems.length));
  const pastCorrect = pickPastCorrectReviewItems(currentDay, 2);
  const selectedIds = new Set([...currentDayCore, ...pastCorrect].map((item) => String(item.id)));

  const needed = Math.max(0, Math.min(10, currentDayItems.length + pastCorrect.length) - (currentDayCore.length + pastCorrect.length));
  const currentDayFallback = weightedSampleWithoutReplacement(
    currentDayItems.filter((item) => !selectedIds.has(String(item.id))),
    needed
  );

  return shuffle([...currentDayCore, ...pastCorrect, ...currentDayFallback]).slice(0, 10);
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
      const available = (buckets[level] || []).filter((item) => !selectedIds.has(String(item.id)));
      const takeCount = Math.min(needed, available.length);
      const pickedItems = weightedSampleWithoutReplacementByWeight(
        available,
        takeCount,
        (item) => getTrainingQuestionWeight("idiom", item?.id)
      );
      for (let index = 0; index < pickedItems.length; index += 1) {
        const picked = pickedItems[index];
        selected.push(picked);
        selectedIds.add(String(picked.id));
      }
      needed -= pickedItems.length;
    }
  };

  [1, 2, 3, 4].forEach((level) => {
    takeFromPriority(level, PHRASE_SPIRAL_LEVEL_TARGETS[level] || 0);
  });

  if (selected.length < targetCount) {
    const fallback = phraseItems.filter((item) => !selectedIds.has(String(item.id)));
    const remaining = targetCount - selected.length;
    selected.push(...weightedSampleWithoutReplacementByWeight(
      fallback,
      remaining,
      (item) => getTrainingQuestionWeight("idiom", item?.id)
    ));
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
    title: session.mode === "normal" ? "📊 本日の学習" : "⏸ ここまでの学習結果",
    accuracy,
    answerCount: answered,
    correctCount: correct,
    durationMinutes,
    learnedCount: getLearnedItemCount(),
    streak: state.stats.streak || 0,
    currentPhase: getPhaseMeta(session).title,
    currentProgress: `${current} / ${session?.questions?.length || 0}`,
    canAdvanceDay: false,
    canResume: session.mode === "normal",
    interrupted: true,
    levelChanges: LEVEL_DEFINITIONS.map((entry) => ({ ...entry, delta: 0, count: getLevelBucketCounts()[entry.level] || 0 })),
    recommendation: {
      level: getPrimaryRecommendedLevel().level,
      label: `${getPrimaryRecommendedLevel().icon} ${getPrimaryRecommendedLevel().label}`,
      count: getLevelBucketCounts()[getPrimaryRecommendedLevel().level] || 0
    }
  };
}

function computeSessionEarnedPoints(sessionLike) {
  const beforeBalance = Math.max(0, Math.floor(Number(sessionLike?.pointBalanceBefore) || 0));
  const currentBalance = Math.max(0, Math.floor(Number(getPointState().balance) || 0));
  return {
    earnedPoints: Math.max(0, currentBalance - beforeBalance),
    pointBalance: currentBalance
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
    correctCount: summary.correctCount,
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
  const dayProgressUpdate = recordNormalDayProgressFromSession(session);
  if (reason === "completed" && session.mode === "normal" && session.isExtraTrainingSession) {
    incrementExtraTrainingDailyCounter();
  }
  if (reason === "completed" && session.mode === "challenge") {
    processCompletedTicketTraining({ trainingType: "challenge" });
  }
  processStreakBonusTicket(reason);
  awardDayAdvanceCompletionBonus(session, reason);
  updateBestAccuracyFromSession(session);
  const unlockedDayNotice = updateUnlockedDayByNormalCompletion(session, reason, dayProgressUpdate);
  const summary = buildResultSummary(session);
  const pointSummary = computeSessionEarnedPoints(session);
  summary.earnedPoints = pointSummary.earnedPoints;
  state.stats.lastResultSummary = summary;
  if (session.mode === "normal") {
    const weakIds = extractWeakQuestionIdsFromSession(session);
    state.stats.previousSessionWeakQuestionIds = weakIds;
    state.stats.savedNormalSession = null;
  }
  appendLearningHistoryEntry(buildLearningHistoryEntryFromSession(session, summary, reason));
  appendCompletedSession(summary);
  session.isSessionCompleted = true;
  state.session = null;
  setTestScreenActive(false);
  saveState();
  flushPendingStudyCoreSync().catch((error) => {
    console.error("Failed to flush study core sync after completing session", error);
  });
  renderHome();
  if (options.showResult !== false) {
    openTrainingCompleteScreen({
      mode: session.mode,
      earnedPoints: pointSummary.earnedPoints,
      pointBalance: pointSummary.pointBalance,
      interrupted: reason !== "completed",
      unlockedDayNotice,
      showTicketAfter: true
    });
  }
}

function updateUnlockedDayByNormalCompletion(session, reason, dayProgressUpdate = null) {
  if (!session || reason !== "completed") return null;
  if (session.mode !== "normal") return null;
  if (session.isDayStudySession) return null;
  if (!session.isProgressiveDaySession) return null;

  const availableDays = getAvailableDays();
  if (!availableDays.length) return null;
  const maxDay = availableDays[availableDays.length - 1];
  const unlockedDayMax = getUnlockedDayMax();
  const completedDay = Math.max(1, Math.floor(Number(dayProgressUpdate?.day || session.dayProgressDay || session.studyRangeStart) || 0));
  if (!Number.isFinite(completedDay)) return null;
  if (completedDay !== unlockedDayMax) return null;

  const answeredCount = getNormalDayAnsweredCount(completedDay);
  if (answeredCount < DAY_PROGRESS_TARGET_QUESTION_COUNT) return null;

  const nextUnlockedDay = Math.min(maxDay, unlockedDayMax + 1);
  if (nextUnlockedDay <= unlockedDayMax) return null;

  state.stats.unlockedDayMax = nextUnlockedDay;
  markStudyCoreLocalChange({ unlockedDayMax: true });
  scheduleStudyCoreSync();

  return {
    day: nextUnlockedDay,
    message: `Day${nextUnlockedDay}がオープンしました！`
  };
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
  return false;
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
  completeCurrentSession("interrupted", { showResult: true });
}

function returnHomeFromInterruptedResult() {
  showScreen("homeScreen", { recordHistory: false });
  renderHome();
}

function resumeActiveSession() {
  const session = state.session;
  if (!session) return false;
  if (autoCompleteStaleSessionIfNeeded()) return false;
  if (session.mode === "normal" && session.answered) {
    const nextIndex = Number(session.currentIndex) + 1;
    if (Number.isInteger(nextIndex) && nextIndex < session.questions.length) {
      session.currentIndex = nextIndex;
    } else if (Number.isInteger(nextIndex) && nextIndex >= session.questions.length) {
      session.answered = false;
      session.awaitingEnter = false;
      session.enterLocked = false;
      session.answerLocked = false;
      session.enterConsumed = false;
      session.enterLockUntil = null;
      finishSession();
      return false;
    }
  }
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
  if (session.awaitingWeakFocusDecision) {
    renderWeakFocusDecisionPanel(session);
  } else if (session.awaitingPhaseStart) {
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

function startProgressiveDayReviewPhase(session) {
  if (!session || !session.isProgressiveDaySession || session.isProgressiveDayReviewSession) return false;
  const day = Math.max(1, Math.floor(Number(session.dayProgressDay || session.studyRangeStart) || 0));
  if (!day) return false;

  const reviewQuestionIds = getPendingNormalDayReviewQuestionIds(day);
  if (!reviewQuestionIds.length) return false;

  session.wrongQuestionIds = reviewQuestionIds.slice();
  appendLearningHistoryEntryForCurrentSegment(session, "completed");
  initializeNormalSessionHistorySegment(session, {
    startedAt: Date.now(),
    answerStartCount: session.answerCount,
    answerHistoryStartIndex: Array.isArray(session.answerHistory) ? session.answerHistory.length : 0,
    correctStartCount: Array.isArray(session.answerHistory) ? session.answerHistory.filter((entry) => entry?.isCorrect).length : 0,
    pointBalanceBefore: Math.max(0, Math.floor(Number(getPointState().balance) || 0)),
    dayNumber: "",
    mode: "review"
  });
  session.isProgressiveDayReviewSession = true;
  session.phase2Skipped = false;
  session.phase3Skipped = true;
  session.phase3Completed = false;
  return startNormalAutoReviewRound(session, 1);
}

function startNormalMainRound(session) {
  if (!session || session.mode !== "normal") return false;
  const ids = Array.isArray(session.mainQuestionIds) ? session.mainQuestionIds : [];
  const questions = collectQuestionsById(ids);
  if (!questions.length) return false;
  return beginSessionPhase(session, "phase1", questions, { showIntro: true });
}

function startNormalWeakFocusRound(session, options = {}) {
  if (!session || session.mode !== "normal") return false;
  const completedRounds = Math.max(0, Number(session.weakFocusRoundCount) || 0);
  if (completedRounds >= NORMAL_WEAK_FOCUS_MAX_ROUNDS) return false;

  const askedIds = Array.isArray(session.weakFocusAskedQuestionIds)
    ? session.weakFocusAskedQuestionIds.map((id) => String(id))
    : [];
  const questions = getWeakPhasePool(session, NORMAL_WEAK_FOCUS_BATCH_SIZE);
  if (!questions.length) return false;

  const askedSet = new Set(askedIds);
  questions.forEach((question) => askedSet.add(String(question.id)));
  session.weakFocusAskedQuestionIds = [...askedSet];
  session.weakFocusCurrentRoundCorrectIds = [];
  session.weakFocusCurrentRoundWrongIds = [];
  session.weakFocusRoundCount = completedRounds + 1;
  session.phase3Skipped = false;

  return beginSessionPhase(session, "phase3", questions, { showIntro: Boolean(options.showIntro) });
}

function continueNormalWeakFocusRound() {
  const session = state.session;
  if (!session || session.mode !== "normal" || !session.awaitingWeakFocusDecision) return;

  if (startNormalWeakFocusRound(session, { showIntro: false })) {
    return;
  }

  session.awaitingWeakFocusDecision = false;
  session.phase3Completed = true;
  completeCurrentSession("completed", { showResult: true });
}

function finishNormalWeakFocusToday() {
  const session = state.session;
  if (!session || session.mode !== "normal" || !session.awaitingWeakFocusDecision) return;

  session.awaitingWeakFocusDecision = false;
  session.phase3Completed = true;
  completeCurrentSession("completed", { showResult: true });
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
  return buildLevelFocusGroups((buckets[focusLevel] || []).slice()).map((group) => group.representative);
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
  prepareSession("level-focus", { level: focusLevel, customPool: batch, skipPhaseIntro: true });
}

function prepareSession(mode, options = {}) {
  if (options.resumeExisting && state.session) {
    resumeActiveSession();
    return;
  }

  if (state.session) {
    const switchingToDifferentMode = state.session.mode !== mode;
    if (switchingToDifferentMode) {
      completeCurrentSession("interrupted", { showResult: false });
    } else if (mode !== "normal" && !options.forceNewSession) {
      resumeActiveSession();
      return;
    }
  }

  if (mode === "challenge" && !options.skipChallengePromo) {
    if (shouldShowChallengePromo()) {
      openChallengePromoScreen(options);
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
  const startWeakFocusOnly = mode === "normal" && Boolean(options.startWeakFocusOnly);
  const isProgressiveDaySession = mode === "normal" && Boolean(options.progressiveDay);
  let isProgressiveDayReviewSession = false;

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
    if (startWeakFocusOnly) {
      questions = shuffle(pool).slice(0, Math.min(NORMAL_WEAK_FOCUS_BATCH_SIZE, pool.length));
      mainQuestions = [];
      previousReviewQuestions = [];
    } else if (isProgressiveDaySession) {
      const day = Number(state.settings.studyRange?.start) || 1;
      const answeredCount = getNormalDayAnsweredCount(day);
      const pendingReviewQuestions = getPendingNormalDayReviewQuestions(day);
      if (answeredCount >= DAY_PROGRESS_TARGET_QUESTION_COUNT && pendingReviewQuestions.length) {
        isProgressiveDayReviewSession = true;
        mainQuestions = [];
        previousReviewQuestions = pendingReviewQuestions;
        questions = pendingReviewQuestions;
      } else {
        mainQuestions = getRemainingNormalDayQuestions(day);
        previousReviewQuestions = [];
        questions = mainQuestions;
      }
    } else {
      mainQuestions = hasCustomPool
        ? shuffle(pool).slice(0, Math.min(10, pool.length))
        : buildNormalSpiralMainQuestions();
      previousReviewQuestions = hasCustomPool ? [] : getPreviousSessionReviewPool();
      questions = previousReviewQuestions.length ? previousReviewQuestions : mainQuestions;
    }
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
    challengeEvent: null,
    phase: mode === "normal"
      ? (startWeakFocusOnly ? "phase3" : (isProgressiveDayReviewSession ? "phase2" : "phase1"))
      : mode === "review"
        ? "phase2"
        : mode === "phrase-spiral"
          ? "phase1"
          : "phase3",
    focusLevel: Number(options.level) || null,
    questions,
    baseQuestions: (mode === "normal" || mode === "phrase-spiral" ? mainQuestions : questions).slice(),
    baseQuestionIds: (mode === "normal" || mode === "phrase-spiral" ? mainQuestions : questions).map((question) => String(question.id)),
    mainQuestionIds: (mode === "normal" || mode === "phrase-spiral" ? mainQuestions : questions).map((question) => String(question.id)),
    previousReviewQuestionIds: previousReviewQuestions.map((question) => String(question.id)),
    questionIds: questions.map((question) => String(question.id)),
    wrongQuestionIds: isProgressiveDayReviewSession ? previousReviewQuestions.map((question) => String(question.id)) : [],
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
    phase0Completed: startWeakFocusOnly,
    phase0Skipped: true,
    phase1Completed: startWeakFocusOnly,
    phase2Completed: false,
    phase2Skipped: true,
    phase3Completed: false,
    phase3Skipped: mode === "normal" ? !startWeakFocusOnly : mode === "phrase-spiral",
    weakFocusRoundCount: startWeakFocusOnly ? 1 : 0,
    weakFocusAskedQuestionIds: startWeakFocusOnly ? questions.map((question) => String(question.id)) : [],
    weakFocusLastRoundCorrectIds: [],
    weakFocusLastRoundWrongIds: [],
    weakFocusCurrentRoundCorrectIds: [],
    weakFocusCurrentRoundWrongIds: [],
    weakFocusLastQuestionId: "",
    awaitingWeakFocusDecision: false,
    isFinishingSession: false,
    isSessionCompleted: false,
    ticketSnapshot: captureLearningHistoryTicketSnapshot(),
    pointBalanceBefore: Math.max(0, Math.floor(Number(getPointState().balance) || 0)),
    isDayStudySession: Boolean(options.dayStudy),
    isExtraTrainingSession: mode === "normal" && Boolean(options.extraTraining),
    isProgressiveDaySession,
    isProgressiveDayReviewSession,
    dayProgressDay: isProgressiveDaySession ? (Number(state.settings.studyRange?.start) || 1) : 0,
    studyRangeStart: Number(state.settings.studyRange?.start) || 1,
    studyRangeEnd: Number(state.settings.studyRange?.end) || 1,
    historySegmentStartedAt: Date.now(),
    historySegmentAnswerStartCount: 0,
    historySegmentAnswerHistoryStartIndex: 0,
    historySegmentCorrectStartCount: 0,
    historySegmentPointBalanceBefore: Math.max(0, Math.floor(Number(getPointState().balance) || 0)),
    historySegmentMode: isProgressiveDayReviewSession ? "review" : "",
    historySegmentDayNumber: ""
  };

  initializeNormalSessionHistorySegment(state.session, {
    startedAt: Number(state.session.startedAt) || Date.now(),
    answerStartCount: 0,
    answerHistoryStartIndex: 0,
    correctStartCount: 0,
    pointBalanceBefore: Math.max(0, Math.floor(Number(getPointState().balance) || 0)),
    dayNumber: state.session.isExtraTrainingSession || isProgressiveDayReviewSession ? "" : resolveCurrentSessionDayNumberForHistorySegment(state.session),
    mode: isProgressiveDayReviewSession ? "review" : ""
  });

  setTestScreenActive(true);
  if (mode === "challenge") {
    const announcementImage = String(getGameTicketConfig().challengeAnnouncementImage || "").trim();
    if (announcementImage) {
      const continueChallengeStart = () => {
        beginSessionPhase(state.session, "phase3", questions, { showIntro: !options.skipPhaseIntro });
      };
      showChallengeEventAnnouncementImage({ startImage: announcementImage }, continueChallengeStart);
      saveState();
      return;
    }
  }
  if (mode === "review") {
    beginSessionPhase(state.session, "phase2", questions, { showIntro: true });
  } else if (mode === "phrase-spiral") {
    beginSessionPhase(state.session, "phase1", questions, { showIntro: false });
  } else if (mode === "challenge") {
    beginSessionPhase(state.session, "phase3", questions, { showIntro: !options.skipPhaseIntro });
  } else if (mode === "level-focus") {
    beginSessionPhase(state.session, "phase3", questions, { showIntro: !options.skipPhaseIntro });
  } else {
    if (startWeakFocusOnly) {
      beginSessionPhase(state.session, "phase3", questions, { showIntro: true });
    } else if (isProgressiveDayReviewSession) {
      beginSessionPhase(state.session, "phase2", previousReviewQuestions, { showIntro: true });
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
  hideWeakFocusDecisionPanel();

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
  const questionPhraseGuide = document.getElementById("questionPhraseInputGuide");
  const questionMeaningGuide = document.getElementById("questionMeaningGuide");
  const questionInputWrap = questionCard.querySelector(".answer-input-wrap");
  const meaningText = document.getElementById("meaningText");
  const questionHintText = document.getElementById("questionHintText");
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
  const updatePhraseGuideVisibility = () => {
    const shouldShowGuide = question.type === "phrase" && String(input.value || "").trim().length === 0;
    if (questionPhraseGuide) {
      const phraseGuideHtml = renderPhraseInputGuide(question);
      questionPhraseGuide.innerHTML = phraseGuideHtml || "";
      questionPhraseGuide.classList.toggle("hidden", !shouldShowGuide || !phraseGuideHtml);
    }
    if (questionMeaningGuide) {
      const phraseGuideHtml = renderPhraseInputGuide(question);
      const count = getPhraseWordGuideCount(question);
      if (phraseGuideHtml && count) {
        const markers = getPhraseSequenceMarkers(count).join(" ");
        questionMeaningGuide.innerHTML = `<span class="phrase-guide-wrap">（ ${markers} ）</span>`;
      } else {
        questionMeaningGuide.innerHTML = "";
      }
      questionMeaningGuide.classList.toggle("hidden", !shouldShowGuide || !phraseGuideHtml);
    }
    if (questionInputWrap) {
      questionInputWrap.classList.toggle("has-phrase-guide", shouldShowGuide);
    }
  };
  updatePhraseGuideVisibility();
  meaningText.textContent = getQuestionPromptText(question);
  const hintText = String(question.hint || "").trim();
  if (questionHintText) {
    questionHintText.classList.toggle("hidden", !hintText);
    questionHintText.textContent = hintText ? `（${hintText}）` : "";
  }
  similarHints.classList.toggle("hidden", !(question.similar || []).length);
  similarHints.innerHTML = (question.similar || []).length
    ? `<strong>類義語ヒント</strong><ul>${(question.similar || []).map((item) => `<li>${item.answer} = ${item.reason}</li>`).join("")}</ul>`
    : "";
  feedbackBox.className = "feedback-box hidden";
  feedbackBox.innerHTML = "";
  nextQuestionBtn.classList.add("hidden");
  input.value = "";
  input.disabled = false;
  input.placeholder = "空欄の英語だけ入力";
  updatePhraseGuideVisibility();
  input.oninput = () => {
    updatePhraseGuideVisibility();
  };
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
  persistSessionProgress(session);
  scheduleKeyboardNavigationSync();
}

function renderReviewSession() {
  const session = state.session;
  if (!session) return;
  hideWeakFocusDecisionPanel();

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
  const reviewPhraseGuide = document.getElementById("reviewPhraseInputGuide");
  const reviewMeaningGuide = document.getElementById("reviewMeaningGuide");
  const reviewInputWrap = reviewCard.querySelector(".answer-input-wrap");
  const reviewMeaningText = document.getElementById("reviewMeaningText");
  const reviewHintText = document.getElementById("reviewHintText");
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
  const updateReviewPhraseGuideVisibility = () => {
    const shouldShowGuide = question.type === "phrase" && String(input.value || "").trim().length === 0;
    if (reviewPhraseGuide) {
      const phraseGuideHtml = renderPhraseInputGuide(question);
      reviewPhraseGuide.innerHTML = phraseGuideHtml || "";
      reviewPhraseGuide.classList.toggle("hidden", !shouldShowGuide || !phraseGuideHtml);
    }
    if (reviewMeaningGuide) {
      const phraseGuideHtml = renderPhraseInputGuide(question);
      const count = getPhraseWordGuideCount(question);
      if (phraseGuideHtml && count) {
        const markers = getPhraseSequenceMarkers(count).join(" ");
        reviewMeaningGuide.innerHTML = `<span class="phrase-guide-wrap">（ ${markers} ）</span>`;
      } else {
        reviewMeaningGuide.innerHTML = "";
      }
      reviewMeaningGuide.classList.toggle("hidden", !shouldShowGuide || !phraseGuideHtml);
    }
    if (reviewInputWrap) {
      reviewInputWrap.classList.toggle("has-phrase-guide", shouldShowGuide);
    }
  };
  updateReviewPhraseGuideVisibility();
  reviewMeaningText.textContent = getQuestionPromptText(question);
  const reviewHintTextValue = String(question.hint || "").trim();
  if (reviewHintText) {
    reviewHintText.classList.toggle("hidden", !reviewHintTextValue);
    reviewHintText.textContent = reviewHintTextValue ? `（${reviewHintTextValue}）` : "";
  }
  reviewSimilarHints.classList.toggle("hidden", !(question.similar || []).length);
  reviewSimilarHints.innerHTML = (question.similar || []).length
    ? `<strong>類義語ヒント</strong><ul>${(question.similar || []).map((item) => `<li>${item.answer} = ${item.reason}</li>`).join("")}</ul>`
    : "";
  reviewFeedbackBox.className = "feedback-box hidden";
  reviewFeedbackBox.innerHTML = "";
  reviewNextBtn.classList.add("hidden");
  input.value = "";
  input.disabled = false;
  input.placeholder = "空欄の英語だけ入力";
  updateReviewPhraseGuideVisibility();
  input.oninput = () => {
    updateReviewPhraseGuideVisibility();
  };
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
  scheduleKeyboardNavigationSync();
}

function handleEnterAdvanceKey(event) {
  if (event.key !== "Enter") return false;
  const session = state.session;
  if (!session || !session.answered || !session.awaitingEnter || session.enterLocked) {
    return false;
  }
  if (session.enterLockUntil && Date.now() < session.enterLockUntil) {
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  startSecondAudioAndAutoAdvance(session.currentQuestion);
  return true;
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
  persistSessionProgress(session);
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
    resultNextDayBtn.textContent = summary.canResume ? "▶ 通常学習を再開" : "▶ 次のDayへ";
    resultHomeBtn.textContent = "🏠 ホームへ戻る";
    updateResultActionSelection(null);
  }
  showScreen("resultScreen");
  syncKeyboardNavigationUI(true);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getTypingCanonicalAnswer(question) {
  const phraseSpec = buildPhraseTypingSpec(question);
  if (phraseSpec?.canonicalAnswer) return phraseSpec.canonicalAnswer;
  return String(question?.answer || question?.english || "");
}

function buildAnswerDiffMarkup(userAnswer, canonicalAnswer) {
  const userText = String(userAnswer || "");
  if (!userText) return "-";

  const expectedText = String(canonicalAnswer || "");
  const parts = [];
  for (let index = 0; index < userText.length; index += 1) {
    const userChar = userText[index];
    const expectedChar = expectedText[index] || "";
    const isMismatch = !expectedChar || userChar.toLowerCase() !== expectedChar.toLowerCase();
    const displayChar = userChar === " " ? "&nbsp;" : escapeHtml(userChar);
    parts.push(`<span class="answer-diff-char${isMismatch ? " is-wrong" : ""}">${displayChar}</span>`);
  }
  return `<span class="answer-diff">${parts.join("")}</span>`;
}

function buildFeedbackMarkup(question, isCorrect, answer, prompt, userAnswer = "") {
  const symbol = isCorrect ? "〇 正解！" : "× 不正解";
  const canonicalAnswer = getTypingCanonicalAnswer(question) || answer;
  const answerMarkup = isCorrect
    ? `<div class="answer-line">${escapeHtml(answer)}</div>`
    : `<div class="answer-line">あなたの答え：${buildAnswerDiffMarkup(userAnswer, canonicalAnswer)}</div><div class="answer-line">正解：${escapeHtml(canonicalAnswer)}</div>`;
  return `<strong>${symbol}</strong>${answerMarkup}<span class="hint">${escapeHtml(prompt)}</span>`;
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

  const trainingKind = getTrainingKindByMode(session.mode);
  const isTrainingSession = Boolean(trainingKind);
  const isReviewSession = Boolean(session?.mode === "review" || session?.reviewMode);
  const practiceCategory = isTrainingSession ? "training" : "day";

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

  recordCommonAnswerEvent({
    dayKey: todayKey(),
    category: practiceCategory,
    trainingKind,
    typingCount: 1
  });

  session.answerCount = (session.answerCount || 0) + 1;

  const item = state.items.find((entry) => entry.id === question.id);
  const levelFocusGroupItems = session.mode === "level-focus"
    ? getLevelFocusGroupItemsByQuestion(question)
    : [];
  const affectedItems = session.mode === "level-focus" && levelFocusGroupItems.length
    ? levelFocusGroupItems
    : (item ? [item] : []);
  const affectedQuestionIds = [...new Set(affectedItems.map((entry) => String(entry?.id || "")).filter(Boolean))];
  const questionId = getQuestionId(question);
  const normalizedAnswer = normalizeAnswer(trimmedAnswer);
  const isCorrect = isCorrectAnswerForQuestion(question, normalizedAnswer);
  if (trainingKind) {
    recordTrainingProfileAttempt(trainingKind, {
      questionId: question.id,
      category: question.type || "",
      isCorrect
    });
  }
  const input = card.querySelector(".answer-input");
  const answerBtn = card.querySelector(".mobile-answer-btn");
  const isMainNormalRun = session.mode === "normal" && session.phase === "phase1";
  const isPhraseSpiralMainRun = session.mode === "phrase-spiral" && session.phase === "phase1";
  const isScoredNormalRun = session.mode === "normal" && (session.phase === "phase0" || session.phase === "phase1");
  const isNormalWeakFocusRun = session.mode === "normal" && session.phase === "phase3";
  const isFirstAttempt = !session.currentQuestionAttempted;
  session.answerHistory.push({
    questionId: String(question.id),
    isCorrect,
    answer: trimmedAnswer,
    phase: session.phase,
    index: session.currentIndex,
    at: Date.now()
  });

  if (isFirstAttempt) {
    session.currentQuestionAttempted = true;
    if (!isTrainingSession) {
      affectedItems.forEach((targetItem) => {
        const hadBeenStudiedBefore = hasItemBeenStudied(targetItem);
        targetItem.hasBeenStudied = true;
        recordItemStudyAttempt(targetItem, isCorrect);
        if (!hadBeenStudiedBefore) {
          awardDayUnstudiedClearBonus(targetItem.day);
        }
      });
    }
    if (isScoredNormalRun || session.mode !== "normal") {
      session.attemptedFirstCount += 1;
    }
    session.answered = false;
    session.answerLocked = false;
    session.awaitingEnter = false;
    session.enterLocked = false;
    session.enterConsumed = false;
    session.enterLockUntil = null;

    if (session.mode === "challenge" && session.challengeEvent && typeof session.challengeEvent === "object") {
      const eventConfig = (getGameTicketConfig().events || []).find((event) => String(event.id || "") === String(session.challengeEvent.eventId || ""));
      const rewardMinutes = Math.max(0, Number(session.challengeEvent.rewardMinutes) || 0);
      const rewardKey = buildChallengeEventRewardKey(session.challengeEvent.eventId, question.id);
      const alreadyGranted = (session.challengeEvent.rewardKeys || []).includes(rewardKey);
      const doneCount = Math.max(0, Number(session.challengeEvent.questionCount) || 0);
      if (isCorrect) {
        if (!alreadyGranted && rewardMinutes > 0) {
          const store = ensureGameTicketState();
          const dailyState = getChallengeTicketDailyState(store, getPointTodayKey(), { create: true });
          const eventRuntime = getChallengeEventRuntimeState(store, getPointTodayKey(), session.challengeEvent.eventId);
          const ticket = awardGameTicket(store, rewardMinutes, "random", {
            type: "random",
            historyLabel: `${eventConfig?.name || "連続正解チャレンジ"} ${rewardMinutes}分券`
          });
          if (ticket) {
            eventRuntime.rewardKeys = Array.isArray(eventRuntime.rewardKeys) ? eventRuntime.rewardKeys : [];
            if (!eventRuntime.rewardKeys.includes(rewardKey)) {
              eventRuntime.rewardKeys.push(rewardKey);
            }
            dailyState.events[String(session.challengeEvent.eventId)] = eventRuntime;
            persistGameTicketState();
          }
        }
        session.challengeEvent.questionCount = doneCount + 1;
        session.challengeEvent.rewardKeys = Array.isArray(session.challengeEvent.rewardKeys) ? Array.from(new Set(session.challengeEvent.rewardKeys.concat(rewardKey))) : [rewardKey];
        if (session.challengeEvent.questionCount >= Math.max(1, Number(session.challengeEvent.maxQuestions) || 1)) {
          session.challengeEvent.status = "completed";
          setTimeout(() => finishSession(), 0);
        } else {
          setTimeout(() => advanceToNextQuestion(), 120);
        }
        persistSessionProgress(session);
        return;
      }
      session.challengeEvent.status = "failed";
      finishSession();
      return;
    }

    if (isCorrect) {
      if (!isTrainingSession) {
        recordDailyPerformance(true);
      }
      if (shouldAwardTrainingPointForAnswerAttempt({ isFirstAttempt, isCorrect, isReviewSession })) {
        if (isTrainingSession) {
          const trainingModeKey = trainingKind === "phrase-spiral" ? "idiom" : trainingKind;
          if (trainingModeKey) {
            awardPointsForTrainingMode(trainingModeKey);
          }
        }
        if (session.mode === "challenge") {
          awardPointsForTrainingMode("challenge");
        }
      }
      if (shouldPlayTrainingCorrectChimeForSession(session)) {
        playTrainingCorrectChime();
      }
      if (isNormalWeakFocusRun) {
        const weakFocusCorrectIds = new Set((session.weakFocusCurrentRoundCorrectIds || []).map((id) => String(id)));
        weakFocusCorrectIds.add(questionId);
        session.weakFocusCurrentRoundCorrectIds = [...weakFocusCorrectIds];
      }
      const levelChanges = isTrainingSession
        ? []
        : affectedItems.map((targetItem) => ({
          item: targetItem,
          result: updateItemLevelProgress(targetItem, true)
        }));
      if (isScoredNormalRun || session.mode !== "normal") {
        session.correctFirstAttempt += 1;
      }
      if (!isTrainingSession && (isScoredNormalRun || session.mode !== "normal") && session.perDayAttemptStats[String(question.day)]) {
        session.perDayAttemptStats[String(question.day)].correct += 1;
      }
      if (!isTrainingSession && session.mode === "review") {
        advanceReviewSchedule(questionId);
      }
      if (!isTrainingSession) {
        affectedItems.forEach((targetItem) => {
          targetItem.reviewDue = false;
          targetItem.lastAnswerWasCorrect = true;
        });
        state.stats.tickets += 1;
        updateStreak();
      }
      session.currentQuestionState = "correct";
      feedbackBox.className = "feedback-box success";
      feedbackBox.innerHTML = buildFeedbackMarkup(question, true, question.answer || question.english, "Enterまたは答えるで2回目音声を再生");
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
        answerBtn.textContent = "音声再生中";
      }

      if (isDesktopAutoAudioFlow(session, question)) {
        feedbackBox.innerHTML = buildFeedbackMarkup(question, true, question.answer || question.english, "音声を2回再生後、自動で次へ進みます");
        startDesktopDoubleAudioAndAutoAdvance(session, question, feedbackBox);
      } else {
        const typingConfig = getTypingConfig();
        playQuestionAudioSequence(question, {
          repeatCount: typingConfig.audioRepeatCount,
          initialDelayMs: typingDelaySecToMs(typingConfig.questionToAudioDelaySec),
          repeatGapMs: typingDelaySecToMs(typingConfig.repeatGapDelaySec),
          playbackRate: typingConfig.audioPlaybackRate,
          onComplete: () => {
            setTimeout(() => {
              enableSecondAudioTrigger(state.session === session ? session : null, input, answerBtn);
            }, typingDelaySecToMs(typingConfig.audioToInputDelaySec));
          },
          onError: () => {
            showAudioPlaybackError(feedbackBox);
          }
        });
      }

      persistSessionProgress(session);
      renderHome();
      renderProgress();
      const leveledUpEntry = levelChanges.find((entry) => entry?.result?.leveledUpToFour && entry.item);
      if (leveledUpEntry?.item) {
        showLevelUpModal(leveledUpEntry.item);
      }
      return;
    }

    if (isMainNormalRun || isPhraseSpiralMainRun) {
      const questionIdKey = String(question.id);
      if (!session.wrongQuestionIds.includes(questionIdKey)) {
        session.wrongQuestionIds.push(questionIdKey);
      }
    }
    if (!isTrainingSession) {
      recordDailyPerformance(false);
    }
    if (isNormalWeakFocusRun) {
      const weakFocusWrongIds = new Set((session.weakFocusCurrentRoundWrongIds || []).map((id) => String(id)));
      weakFocusWrongIds.add(questionId);
      session.weakFocusCurrentRoundWrongIds = [...weakFocusWrongIds];
    }
    if (!isTrainingSession) {
      affectedItems.forEach((targetItem) => {
        updateItemLevelProgress(targetItem, false);
      });
      affectedQuestionIds.forEach((targetQuestionId) => {
        resetReviewSchedule(targetQuestionId);
      });
      affectedItems.forEach((targetItem) => {
        targetItem.reviewDue = true;
        targetItem.reviewTodayCount += 1;
        targetItem.lastAnswerWasCorrect = false;
      });
      updateStreak();
    }
    session.currentQuestionState = "retrying";
    feedbackBox.className = "feedback-box error";
    feedbackBox.innerHTML = buildFeedbackMarkup(question, false, question.answer || question.english, "正しい英語をもう一度入力", trimmedAnswer);
    nextButton.classList.add("hidden");
    input.value = "";
    input.disabled = false;
    input.focus();
    persistSessionProgress(session);
    renderHome();
    renderProgress();
    return;
  }

  if (!isCorrect) {
    input.value = "";
    input.disabled = false;
    input.focus();
    feedbackBox.className = "feedback-box error";
    feedbackBox.innerHTML = buildFeedbackMarkup(question, false, question.answer || question.english, "正しい英語をもう一度入力", trimmedAnswer);
    return;
  }

  const levelChanges = isTrainingSession
    ? []
    : affectedItems.map((targetItem) => ({
      item: targetItem,
      result: updateItemLevelProgress(targetItem, true)
    }));
  const isCorrectionRetryInTrainingSession = isTrainingSession || session.mode === "challenge";
  if (shouldPlayTrainingCorrectChimeForSession(session) && !isCorrectionRetryInTrainingSession) {
    playTrainingCorrectChime();
  }
  if (!isTrainingSession) {
    affectedItems.forEach((targetItem) => {
      targetItem.lastAnswerWasCorrect = true;
    });
  }
  session.answered = false;
  session.answerLocked = false;
  session.awaitingEnter = false;
  session.enterLocked = false;
  session.enterConsumed = false;
  session.enterLockUntil = null;
  session.currentQuestionState = "correct";

  feedbackBox.className = "feedback-box success";
  feedbackBox.innerHTML = buildFeedbackMarkup(question, true, question.answer || question.english, "Enterまたは答えるで2回目音声を再生");
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
    answerBtn.textContent = "音声再生中";
  }

  if (isDesktopAutoAudioFlow(session, question)) {
    feedbackBox.innerHTML = buildFeedbackMarkup(question, true, question.answer || question.english, "音声を2回再生後、自動で次へ進みます");
    startDesktopDoubleAudioAndAutoAdvance(session, question, feedbackBox);
  } else {
    const typingConfig = getTypingConfig();
    playQuestionAudioSequence(question, {
      repeatCount: typingConfig.audioRepeatCount,
      initialDelayMs: typingDelaySecToMs(typingConfig.questionToAudioDelaySec),
      repeatGapMs: typingDelaySecToMs(typingConfig.repeatGapDelaySec),
      playbackRate: typingConfig.audioPlaybackRate,
      onComplete: () => {
        setTimeout(() => {
          enableSecondAudioTrigger(state.session === session ? session : null, input, answerBtn);
        }, typingDelaySecToMs(typingConfig.audioToInputDelaySec));
      },
      onError: () => {
        showAudioPlaybackError(feedbackBox);
      }
    });
  }

  persistSessionProgress(session);
  renderHome();
  renderProgress();
  const leveledUpEntry = levelChanges.find((entry) => entry?.result?.leveledUpToFour && entry.item);
  if (leveledUpEntry?.item) {
    showLevelUpModal(leveledUpEntry.item);
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
      if (session.isProgressiveDaySession) {
        recordNormalDayProgressFromSession(session);
        if (startProgressiveDayReviewPhase(session)) {
          return;
        }
        clearNormalDayReviewQuestionIds(session.dayProgressDay || session.studyRangeStart);
        session.phase2Skipped = true;
        session.phase2Completed = false;
        session.phase3Skipped = true;
        session.phase3Completed = false;
        completeCurrentSession("completed", { showResult: true });
        return;
      }
      if (wrongCount > 0) {
        session.phase2Skipped = false;
        if (startNormalAutoReviewRound(session, 1)) return;
      } else {
        session.phase2Skipped = true;
        session.phase2Completed = false;
      }
      if (startNormalWeakFocusRound(session, { showIntro: true })) {
        session.phase3Skipped = false;
        return;
      }
      session.phase3Skipped = true;
      session.phase3Completed = false;
    }

    if (session.phase === "phase2") {
      session.phase2Completed = true;
      if (session.isProgressiveDaySession) {
        clearNormalDayReviewQuestionIds(session.dayProgressDay || session.studyRangeStart);
        session.phase3Skipped = true;
        session.phase3Completed = false;
        completeCurrentSession("completed", { showResult: true });
        return;
      }
      if (startNormalWeakFocusRound(session, { showIntro: true })) {
        session.phase3Skipped = false;
        return;
      }
      session.phase3Skipped = true;
      session.phase3Completed = false;
    }

    if (session.phase === "phase3") {
      session.weakFocusLastRoundCorrectIds = Array.isArray(session.weakFocusCurrentRoundCorrectIds)
        ? session.weakFocusCurrentRoundCorrectIds.map((id) => String(id))
        : [];
      session.weakFocusLastRoundWrongIds = Array.isArray(session.weakFocusCurrentRoundWrongIds)
        ? session.weakFocusCurrentRoundWrongIds.map((id) => String(id))
        : [];
      session.weakFocusLastQuestionId = String(session.questions?.[session.questions.length - 1]?.id || "");
      processCompletedTicketTraining({ trainingType: "normal-weak-focus" });
      const completedRounds = Math.max(0, Number(session.weakFocusRoundCount) || 0);
      const hasRemainingRounds = completedRounds < NORMAL_WEAK_FOCUS_MAX_ROUNDS;
      const nextWeakQuestions = hasRemainingRounds
        ? getWeakPhasePool(session, NORMAL_WEAK_FOCUS_BATCH_SIZE)
        : [];
      if (nextWeakQuestions.length && hasRemainingRounds) {
        session.awaitingWeakFocusDecision = true;
        renderWeakFocusDecisionPanel(session);
        saveState();
        return;
      }
      session.awaitingWeakFocusDecision = false;
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

function isDesktopKeyboardMode() {
  return typeof window !== "undefined" && Number(window.innerWidth) > 860;
}

function isTypingFieldFocused() {
  const active = document.activeElement;
  if (!active) return false;
  const tag = String(active.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  return Boolean(active.isContentEditable);
}

function isButtonVisibleAndEnabled(button) {
  if (!button || button.disabled) return false;
  if (button.classList.contains("hidden")) return false;
  const rect = button.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function clearKeyboardSelectionClasses() {
  keyboardNavState.buttons.forEach((button) => button?.classList?.remove("kbd-selected"));
}

function setKeyboardSelection(index) {
  clearKeyboardSelectionClasses();
  if (!keyboardNavState.buttons.length) {
    keyboardNavState.selectedIndex = -1;
    return;
  }
  const safeIndex = Math.max(0, Math.min(keyboardNavState.buttons.length - 1, index));
  keyboardNavState.selectedIndex = safeIndex;
  const target = keyboardNavState.buttons[safeIndex];
  if (target) target.classList.add("kbd-selected");
}

function findDefaultButtonIndex(buttons) {
  if (!buttons.length) return -1;
  const idPriority = ["weakFocusContinueBtn", "resultNextDayBtn", "resultRecommendationBtn", "phaseIntroStartBtn", "nextQuestionBtn", "reviewNextBtn", "resultHomeBtn", "weakFocusFinishBtn"];
  for (const id of idPriority) {
    const index = buttons.findIndex((button) => button.id === id);
    if (index >= 0) return index;
  }
  return 0;
}

function collectProgressButtonsForKeyboard() {
  if (currentScreenId === "testScreen") {
    const weakFocusCard = document.getElementById("weakFocusDecisionCard");
    if (weakFocusCard && !weakFocusCard.classList.contains("hidden")) {
      const buttons = [document.getElementById("weakFocusContinueBtn"), document.getElementById("weakFocusFinishBtn")].filter(isButtonVisibleAndEnabled);
      return { context: "weak-focus", buttons };
    }

    const introButton = document.getElementById("phaseIntroStartBtn");
    const introCard = document.getElementById("phaseIntroCard");
    if (introCard && !introCard.classList.contains("hidden") && isButtonVisibleAndEnabled(introButton)) {
      return { context: "phase-intro", buttons: [introButton] };
    }

    const nextQuestionBtn = document.getElementById("nextQuestionBtn");
    if (isButtonVisibleAndEnabled(nextQuestionBtn)) {
      return { context: "question-next", buttons: [nextQuestionBtn] };
    }

    const reviewNextBtn = document.getElementById("reviewNextBtn");
    if (isButtonVisibleAndEnabled(reviewNextBtn)) {
      return { context: "review-next", buttons: [reviewNextBtn] };
    }
  }

  if (currentScreenId === "resultScreen") {
    const buttons = [
      document.getElementById("resultRecommendationBtn"),
      document.getElementById("resultNextDayBtn"),
      document.getElementById("resultHomeBtn")
    ].filter(isButtonVisibleAndEnabled);
    return { context: "result", buttons };
  }

  return { context: "", buttons: [] };
}

function updateKeyboardHintByContext(context, buttonCount) {
  const hint = document.getElementById("weakFocusKeyboardHint");
  if (!hint) return;
  const showWeakFocusHint = context === "weak-focus" && buttonCount >= 2;
  hint.classList.toggle("hidden", !showWeakFocusHint);
}

function syncKeyboardNavigationUI(lockEnter = false) {
  if (lockEnter) {
    keyboardNavState.lockEnterUntilKeyup = true;
  }

  if (!isDesktopKeyboardMode()) {
    clearKeyboardSelectionClasses();
    keyboardNavState.context = "";
    keyboardNavState.buttons = [];
    keyboardNavState.selectedIndex = -1;
    updateKeyboardHintByContext("", 0);
    return;
  }

  const { context, buttons } = collectProgressButtonsForKeyboard();
  const contextChanged = keyboardNavState.context !== context;
  const idsChanged = buttons.map((button) => button.id).join("|") !== keyboardNavState.buttons.map((button) => button.id).join("|");

  keyboardNavState.context = context;
  keyboardNavState.buttons = buttons;
  updateKeyboardHintByContext(context, buttons.length);

  if (!buttons.length) {
    clearKeyboardSelectionClasses();
    keyboardNavState.selectedIndex = -1;
    return;
  }

  if (contextChanged || idsChanged || keyboardNavState.selectedIndex < 0 || keyboardNavState.selectedIndex >= buttons.length) {
    setKeyboardSelection(findDefaultButtonIndex(buttons));
    return;
  }

  setKeyboardSelection(keyboardNavState.selectedIndex);
}

function scheduleKeyboardNavigationSync(lockEnter = false) {
  if (lockEnter) {
    keyboardNavState.lockEnterUntilKeyup = true;
  }
  if (typeof window === "undefined") return;
  window.requestAnimationFrame(() => {
    syncKeyboardNavigationUI();
  });
}

function moveKeyboardSelectionByDirection(directionKey) {
  const buttons = keyboardNavState.buttons;
  if (buttons.length < 2) return;

  const currentIndex = keyboardNavState.selectedIndex >= 0 ? keyboardNavState.selectedIndex : findDefaultButtonIndex(buttons);
  const currentRect = buttons[currentIndex].getBoundingClientRect();
  const currentCenterX = currentRect.left + currentRect.width / 2;
  const currentCenterY = currentRect.top + currentRect.height / 2;

  let bestIndex = currentIndex;
  let bestScore = Number.POSITIVE_INFINITY;

  buttons.forEach((button, index) => {
    if (index === currentIndex) return;
    const rect = button.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = centerX - currentCenterX;
    const dy = centerY - currentCenterY;

    if (directionKey === "ArrowLeft" && dx >= -2) return;
    if (directionKey === "ArrowRight" && dx <= 2) return;
    if (directionKey === "ArrowUp" && dy >= -2) return;
    if (directionKey === "ArrowDown" && dy <= 2) return;

    const primary = directionKey === "ArrowLeft" || directionKey === "ArrowRight" ? Math.abs(dx) : Math.abs(dy);
    const secondary = directionKey === "ArrowLeft" || directionKey === "ArrowRight" ? Math.abs(dy) : Math.abs(dx);
    const score = primary + secondary * 1.6;
    if (score < bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  if (bestIndex !== currentIndex) {
    setKeyboardSelection(bestIndex);
  }
}

function executeKeyboardSelectedButton() {
  const target = keyboardNavState.buttons[keyboardNavState.selectedIndex];
  if (!target) return false;
  if (keyboardNavState.isExecuting) return true;
  const now = Date.now();
  if (now - keyboardNavState.lastExecuteAt < 220) return true;

  keyboardNavState.isExecuting = true;
  keyboardNavState.lastExecuteAt = now;
  target.click();
  window.setTimeout(() => {
    keyboardNavState.isExecuting = false;
  }, 220);
  return true;
}

function handleKeyboardNavigationKeydown(event) {
  if (!isDesktopKeyboardMode()) return false;

  syncKeyboardNavigationUI();

  if (!keyboardNavState.buttons.length) return false;

  const isTyping = isTypingFieldFocused();
  const key = event.key;

  if (key === "Escape" && keyboardNavState.context === "weak-focus") {
    const finishBtn = document.getElementById("weakFocusFinishBtn");
    if (isButtonVisibleAndEnabled(finishBtn)) {
      event.preventDefault();
      event.stopPropagation();
      if (keyboardNavState.lockEnterUntilKeyup) return true;
      finishBtn.click();
      return true;
    }
  }

  if (!isTyping && (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown")) {
    if (keyboardNavState.buttons.length > 1) {
      event.preventDefault();
      event.stopPropagation();
      moveKeyboardSelectionByDirection(key);
      return true;
    }
    return false;
  }

  if (key === "Enter") {
    if (event.repeat) {
      event.preventDefault();
      return true;
    }
    if (keyboardNavState.lockEnterUntilKeyup) {
      event.preventDefault();
      event.stopPropagation();
      return true;
    }
    if (isTyping) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    return executeKeyboardSelectedButton();
  }

  return false;
}

function handleKeyboardNavigationKeyup(event) {
  if (event.key === "Enter") {
    keyboardNavState.lockEnterUntilKeyup = false;
  }
}

function handleEnterKey(event) {
  if (handleEnterAdvanceKey(event)) return;
  handleKeyboardNavigationKeydown(event);
}

function bindEvents() {
  bindUserScopedStorageAuthStateListener();
  bindGameTicketAuthStateListener();
  bindStudyCoreAuthStateListener();
  bindStudyCoreBackupAuthStateListener();
  bindPointStateAuthStateListener();
  bindAdminLearningHistoryAuthStateListener();
  bindHomeHistoryAuthStateListener();
  const typingAudioRepeatSelect = document.getElementById("typingAudioRepeatSelect");
  const typingAudioRateSelect = document.getElementById("typingAudioRateSelect");
  const typingDelayQuestionToAudioSelect = document.getElementById("typingDelayQuestionToAudioSelect");
  const typingDelayRepeatGapSelect = document.getElementById("typingDelayRepeatGapSelect");
  const typingDelayAudioToInputSelect = document.getElementById("typingDelayAudioToInputSelect");
  const typingDelayJudgeToNextSelect = document.getElementById("typingDelayJudgeToNextSelect");
  const trainingCorrectChimeSelect = document.getElementById("trainingCorrectChimeSelect");
  const openTrainingChimePickerBtn = document.getElementById("openTrainingChimePickerBtn");
  const trainingCorrectChimeTestBtn1 = document.getElementById("trainingCorrectChimeTestBtn1");
  const trainingCorrectChimeTestBtn2 = document.getElementById("trainingCorrectChimeTestBtn2");
  const trainingCorrectChimeTestBtn3 = document.getElementById("trainingCorrectChimeTestBtn3");
  const trainingChimePickerModal = document.getElementById("trainingChimePickerModal");
  const trainingChimePickerCurrentText = document.getElementById("trainingChimePickerCurrentText");
  const trainingChimePresetButtons = [...document.querySelectorAll("[data-training-chime-preset]")];
  const addGameTicketRuleBtn = document.getElementById("addGameTicketRuleBtn");
  const addGameTicketEventBtn = document.getElementById("addGameTicketEventBtn");
  const openGameTicketSettingsScreenBtn = document.getElementById("openGameTicketSettingsScreenBtn");
  const gameTicketSettingsSaveBtn = document.getElementById("gameTicketSettingsSaveBtn");
  const typingControls = [
    typingAudioRepeatSelect,
    typingAudioRateSelect,
    typingDelayQuestionToAudioSelect,
    typingDelayRepeatGapSelect,
    typingDelayAudioToInputSelect,
    typingDelayJudgeToNextSelect
  ];

  if (openGameTicketSettingsScreenBtn) {
    openGameTicketSettingsScreenBtn.addEventListener("click", () => {
      showScreen("gameTicketSettingsScreen");
    });
  }

  if (addGameTicketRuleBtn) {
    addGameTicketRuleBtn.addEventListener("click", () => {
      const config = getGameTicketConfig();
      const nextRules = [...(config.normalRules || []), buildDefaultGameTicketRuleEntry()];
      state.settings.gameTicketConfig = sanitizeGameTicketConfig({ ...config, normalRules: nextRules });
      renderGameTicketSettingsUi();
    });
  }

  if (addGameTicketEventBtn) {
    addGameTicketEventBtn.addEventListener("click", () => {
      const config = getGameTicketConfig();
      const nextEvents = [...(config.events || []), buildDefaultGameTicketEventEntry()];
      state.settings.gameTicketConfig = sanitizeGameTicketConfig({ ...config, events: nextEvents });
      renderGameTicketSettingsUi();
    });
  }

  if (gameTicketSettingsSaveBtn) {
    gameTicketSettingsSaveBtn.addEventListener("click", () => {
      try {
        saveGameTicketSettingsFromUi();
      } catch (error) {
        alert(error?.message || "ゲームチケット設定に不正な値が含まれています。");
      }
    });
  }

  renderGameTicketSettingsUi();

  if (typingControls.every((control) => Boolean(control))) {
    const delayValues = Array.from({ length: 11 }, (_, index) => (index / 10).toFixed(1));
    typingAudioRepeatSelect.innerHTML = TYPING_AUDIO_REPEAT_OPTIONS.map((value) => `<option value="${value}">${value}回</option>`).join("");
    typingAudioRateSelect.innerHTML = [
      { value: 0.8, label: "ゆっくり (0.8)" },
      { value: 1.0, label: "標準 (1.0)" },
      { value: 1.2, label: "少し速い (1.2)" }
    ].map((entry) => `<option value="${entry.value}">${entry.label}</option>`).join("");
    const delayMarkup = delayValues.map((value) => `<option value="${value}">${value}秒</option>`).join("");
    typingDelayQuestionToAudioSelect.innerHTML = delayMarkup;
    typingDelayRepeatGapSelect.innerHTML = delayMarkup;
    typingDelayAudioToInputSelect.innerHTML = delayMarkup;
    typingDelayJudgeToNextSelect.innerHTML = delayMarkup;

    const applyTypingConfigToControls = () => {
      const typingConfig = getTypingConfig();
      typingAudioRepeatSelect.value = String(typingConfig.audioRepeatCount);
      typingAudioRateSelect.value = typingConfig.audioPlaybackRate.toFixed(1);
      typingDelayQuestionToAudioSelect.value = typingConfig.questionToAudioDelaySec.toFixed(1);
      typingDelayRepeatGapSelect.value = typingConfig.repeatGapDelaySec.toFixed(1);
      typingDelayAudioToInputSelect.value = typingConfig.audioToInputDelaySec.toFixed(1);
      typingDelayJudgeToNextSelect.value = typingConfig.judgementToNextDelaySec.toFixed(1);
    };

    const syncTypingConfigFromControls = () => {
      state.settings.typingConfig = sanitizeTypingConfig({
        audioRepeatCount: Number(typingAudioRepeatSelect.value),
        audioPlaybackRate: Number(typingAudioRateSelect.value),
        questionToAudioDelaySec: Number(typingDelayQuestionToAudioSelect.value),
        repeatGapDelaySec: Number(typingDelayRepeatGapSelect.value),
        audioToInputDelaySec: Number(typingDelayAudioToInputSelect.value),
        judgementToNextDelaySec: Number(typingDelayJudgeToNextSelect.value)
      });
      saveState();
      applyTypingConfigToControls();
    };

    applyTypingConfigToControls();
    typingControls.forEach((control) => {
      control.addEventListener("change", syncTypingConfigFromControls);
    });

    const playTrainingCorrectChimeTest = (presetId) => {
      playTrainingCorrectChime(presetId);
    };

    if (trainingCorrectChimeTestBtn1) {
      trainingCorrectChimeTestBtn1.addEventListener("click", () => {
        playTrainingCorrectChimeTest("correct-05-1");
      });
    }

    if (trainingCorrectChimeTestBtn2) {
      trainingCorrectChimeTestBtn2.addEventListener("click", () => {
        playTrainingCorrectChimeTest("correct-05-2");
      });
    }

    if (trainingCorrectChimeTestBtn3) {
      trainingCorrectChimeTestBtn3.addEventListener("click", () => {
        playTrainingCorrectChimeTest("correct-05-3");
      });
    }

    if (trainingCorrectChimeSelect) {
      trainingCorrectChimeSelect.innerHTML = TRAINING_CORRECT_CHIME_PRESETS
        .map((preset) => `<option value="${preset.id}">${preset.label}</option>`)
        .join("");
      const syncTrainingChimePickerUi = () => {
        const currentPresetId = getTrainingCorrectChimePreset();
        trainingCorrectChimeSelect.value = currentPresetId;
        const currentPreset = getTrainingCorrectChimePresetById(currentPresetId);
        if (trainingChimePickerCurrentText) {
          trainingChimePickerCurrentText.textContent = `現在: ${currentPreset.label}`;
        }
        trainingChimePresetButtons.forEach((button) => {
          const buttonPreset = String(button.getAttribute("data-training-chime-preset") || "");
          button.classList.toggle("is-selected", buttonPreset === currentPresetId);
        });
      };

      syncTrainingChimePickerUi();
      trainingCorrectChimeSelect.addEventListener("change", () => {
        applyTrainingCorrectChimePreset(trainingCorrectChimeSelect.value, {
          selectElement: trainingCorrectChimeSelect,
          playSample: true
        });
        syncTrainingChimePickerUi();
      });

      if (openTrainingChimePickerBtn && trainingChimePickerModal) {
        openTrainingChimePickerBtn.addEventListener("click", () => {
          syncTrainingChimePickerUi();
          trainingChimePickerModal.classList.remove("hidden");
          trainingChimePickerModal.setAttribute("aria-hidden", "false");
        });
      }

      trainingChimePresetButtons.forEach((button) => {
        button.addEventListener("click", () => {
          const presetId = String(button.getAttribute("data-training-chime-preset") || "");
          applyTrainingCorrectChimePreset(presetId, {
            selectElement: trainingCorrectChimeSelect,
            playSample: true
          });
          syncTrainingChimePickerUi();
          if (trainingChimePickerModal) {
            trainingChimePickerModal.classList.add("hidden");
            trainingChimePickerModal.setAttribute("aria-hidden", "true");
          }
        });
      });
    }
  }

  const pcDeviceNameInput = document.getElementById("pcDeviceNameInput");
  const pcDeviceNameSaveBtn = document.getElementById("pcDeviceNameSaveBtn");
  if (pcDeviceNameInput && pcDeviceNameSaveBtn) {
    const saveDeviceName = () => {
      const savedName = setPcBrowserDeviceName(pcDeviceNameInput.value);
      pcDeviceNameInput.value = savedName;
      renderPcDeviceIdentitySettings();
      alert(`端末名を保存しました: ${savedName}`);
    };
    pcDeviceNameSaveBtn.addEventListener("click", saveDeviceName);
    pcDeviceNameInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      saveDeviceName();
    });
  }

  document.addEventListener("keydown", handleEnterKey);
  document.addEventListener("keyup", handleKeyboardNavigationKeyup);
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

  const challengeTicketChanceStartBtn = document.getElementById("challengeTicketChanceStartBtn");
  if (challengeTicketChanceStartBtn) {
    challengeTicketChanceStartBtn.addEventListener("click", () => {
      executePendingChallengeTicketChance();
    });
  }

  const gameTicketRewardOkBtn = document.getElementById("gameTicketRewardOkBtn");
  if (gameTicketRewardOkBtn) {
    gameTicketRewardOkBtn.addEventListener("click", () => {
      dismissCurrentGameTicketReward();
    });
  }

  const gameTicketInventoryList = document.getElementById("gameTicketInventoryList");
  if (gameTicketInventoryList) {
    gameTicketInventoryList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-ticket-minutes]");
      if (!button) return;
      const minutes = Number(button.getAttribute("data-ticket-minutes"));
      if (!Number.isFinite(minutes)) return;
      openGameTicketUseModal(minutes);
    });
  }

  const confirmGameTicketUseBtn = document.getElementById("confirmGameTicketUseBtn");
  if (confirmGameTicketUseBtn) {
    confirmGameTicketUseBtn.addEventListener("click", () => {
      const minutes = Number(confirmGameTicketUseBtn.dataset.ticketMinutes);
      if (!Number.isFinite(minutes)) return;
      if (!useGameTicketByMinutes(minutes)) return;
      const modal = document.getElementById("gameTicketUseModal");
      if (!modal) return;
      modal.classList.add("hidden");
      modal.setAttribute("aria-hidden", "true");
    });
  }

  const openGameTicketHubBtn = document.getElementById("openGameTicketHubBtn");
  if (openGameTicketHubBtn) {
    openGameTicketHubBtn.addEventListener("click", () => {
      openGameTicketHubModal();
    });
  }

  const openExchangeTicketScreenBtn = document.getElementById("openExchangeTicketScreenBtn");
  if (openExchangeTicketScreenBtn) {
    openExchangeTicketScreenBtn.addEventListener("click", () => {
      renderPointExchangeScreen();
      showScreen("exchangeTicketScreen");
    });
  }

  const pointExchangeItemList = document.getElementById("pointExchangeItemList");
  if (pointExchangeItemList) {
    pointExchangeItemList.addEventListener("click", (event) => {
      const goalButton = event.target.closest("[data-point-goal-id]");
      if (goalButton) {
        const itemId = String(goalButton.getAttribute("data-point-goal-id") || "");
        if (itemId) {
          setPointExchangeTarget(itemId);
        }
        return;
      }
      const exchangeButton = event.target.closest("[data-point-exchange-id]");
      if (!exchangeButton) return;
      if (exchangeButton.hasAttribute("disabled")) return;
      const itemId = String(exchangeButton.getAttribute("data-point-exchange-id") || "");
      const item = getPointItemById(itemId);
      if (!item) return;
      openPointExchangeConfirmModal(item);
    });
  }

  const confirmPointExchangeBtn = document.getElementById("confirmPointExchangeBtn");
  if (confirmPointExchangeBtn) {
    confirmPointExchangeBtn.addEventListener("click", confirmPointExchange);
  }

  const cancelPointExchangeBtn = document.getElementById("cancelPointExchangeBtn");
  if (cancelPointExchangeBtn) {
    cancelPointExchangeBtn.addEventListener("click", closePointExchangeConfirmModal);
  }

  const openResetLearningDataModalBtn = document.getElementById("openResetLearningDataModalBtn");
  if (openResetLearningDataModalBtn) {
    openResetLearningDataModalBtn.addEventListener("click", () => {
      const modal = document.getElementById("resetLearningDataModal");
      if (!modal) return;
      modal.classList.remove("hidden");
      modal.setAttribute("aria-hidden", "false");
    });
  }

  const confirmResetLearningDataBtn = document.getElementById("confirmResetLearningDataBtn");
  if (confirmResetLearningDataBtn) {
    confirmResetLearningDataBtn.addEventListener("click", () => {
      try {
        isResettingLearningData = true;
        const storageKey = getScopedLocalStorageKey(STORAGE_KEY);
        if (storageKey) {
          localStorage.removeItem(storageKey);
        }
        location.reload();
      } catch (error) {
        isResettingLearningData = false;
        console.error("Could not reset learning data", error);
        alert("学習記録の初期化に失敗しました。もう一度お試しください。");
      }
    });
  }

  const backupLearningDataBtn = document.getElementById("backupLearningDataBtn");
  if (backupLearningDataBtn) {
    backupLearningDataBtn.addEventListener("click", () => {
      if (!isDesktopGameTicketEnabled()) return;
      try {
        const payload = createLearningBackupPayload();
        downloadLearningBackupFile(payload);
      } catch (error) {
        console.error("Could not create learning backup", error);
        alert("バックアップファイルを作成できませんでした。");
      }
    });
  }

  const restoreLearningDataBtn = document.getElementById("restoreLearningDataBtn");
  const backupRestoreFileInput = document.getElementById("backupRestoreFileInput");
  if (restoreLearningDataBtn && backupRestoreFileInput) {
    restoreLearningDataBtn.addEventListener("click", () => {
      if (!isDesktopGameTicketEnabled()) return;
      backupRestoreFileInput.value = "";
      backupRestoreFileInput.click();
    });

    backupRestoreFileInput.addEventListener("change", async () => {
      const file = backupRestoreFileInput.files && backupRestoreFileInput.files[0];
      if (!file) return;
      await tryRestoreLearningDataFromFile(file);
      backupRestoreFileInput.value = "";
    });
  }

  const saveStudyCoreToFirestoreBtn = document.getElementById("saveStudyCoreToFirestoreBtn");
  if (saveStudyCoreToFirestoreBtn) {
    saveStudyCoreToFirestoreBtn.addEventListener("click", async () => {
      await saveCurrentPcStudyCoreToFirestoreFromSettings();
    });
  }

  const inspectStudyCoreFromFirestoreBtn = document.getElementById("inspectStudyCoreFromFirestoreBtn");
  if (inspectStudyCoreFromFirestoreBtn) {
    inspectStudyCoreFromFirestoreBtn.addEventListener("click", async () => {
      await inspectStudyCoreFromFirestoreInSettings();
    });
  }

  const applyStudyCoreFromFirestoreBtn = document.getElementById("applyStudyCoreFromFirestoreBtn");
  if (applyStudyCoreFromFirestoreBtn) {
    applyStudyCoreFromFirestoreBtn.addEventListener("click", async () => {
      await applyStudyCoreFromFirestoreFromSettings();
    });
  }

  const advanceBtn = document.getElementById("advanceBtn");
  if (advanceBtn) {
    advanceBtn.addEventListener("click", () => {
      startNextDaySession();
    });
  }

  const resumeSessionBtn = document.getElementById("resumeSessionBtn");
  if (resumeSessionBtn) {
    resumeSessionBtn.addEventListener("click", () => {
      if (state.session?.mode === "normal") {
        resumeActiveSession();
        return;
      }
      if (restoreSavedNormalSession()) {
        resumeActiveSession();
      }
    });
  }

  const todayExtraTrainingBtn = document.getElementById("todayExtraTrainingBtn");
  if (todayExtraTrainingBtn) {
    todayExtraTrainingBtn.addEventListener("click", () => {
      openExtraTrainingScreen();
    });
  }

  const extraTrainingStartBtn = document.getElementById("extraTrainingStartBtn");
  if (extraTrainingStartBtn) {
    extraTrainingStartBtn.addEventListener("click", () => {
      startTodayExtraTrainingFromHome();
    });
  }

  const phaseIntroStartBtn = document.getElementById("phaseIntroStartBtn");
  if (phaseIntroStartBtn) {
    phaseIntroStartBtn.addEventListener("click", () => {
      startCurrentPhaseQuestions();
    });
  }

  const weakFocusContinueBtn = document.getElementById("weakFocusContinueBtn");
  if (weakFocusContinueBtn) {
    weakFocusContinueBtn.addEventListener("click", () => {
      continueNormalWeakFocusRound();
    });
  }

  const weakFocusFinishBtn = document.getElementById("weakFocusFinishBtn");
  if (weakFocusFinishBtn) {
    weakFocusFinishBtn.addEventListener("click", () => {
      finishNormalWeakFocusToday();
    });
  }

  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", () => {
      loadStudyCoreBackupsForSettings().catch((error) => {
        console.error("Failed to load study core backups from settings", error);
      });
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

    const historyMarkup = buildReleaseHistoryDisplayEntries(SETTINGS_INFO.releaseHistory)
      .map((entry) => `<li><span class="settings-history-version">${formatVersionForJstDisplay(entry.version)}</span><span>${entry.note}</span></li>`)
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
      clearSavedNormalSession();
      renderDayCatalog();
      showScreen("dayCatalogScreen");
    });
  }

  const daySelectPhraseBtn = document.getElementById("daySelectPhraseBtn");
  if (daySelectPhraseBtn) {
    daySelectPhraseBtn.addEventListener("click", () => {
      openTrainingMenuScreen();
    });
  }

  const grammarAnswerForm = document.getElementById("grammarAnswerForm");
  if (grammarAnswerForm) {
    grammarAnswerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitGrammarAnswer();
    });
  }

  const grammarNextBtn = document.getElementById("grammarNextBtn");
  if (grammarNextBtn) {
    grammarNextBtn.addEventListener("click", () => {
      if (!grammarTrainingSession) return;
      const phase = getGrammarCurrentPhase(grammarTrainingSession);
      if (phase === "point" || phase === "point-summary" || phase === "basic" || phase === "word-order" || phase === "sentence") {
        moveToNextGrammarStep();
      }
    });
  }

  const openAdminLearningHistoryBtn = document.getElementById("openAdminLearningHistoryBtn");
  if (openAdminLearningHistoryBtn) {
    openAdminLearningHistoryBtn.addEventListener("click", () => {
      openAdminLearningHistoryScreen();
    });
  }

  renderTrainingMenuCards();

  const prepositionAnswerForm = document.getElementById("prepositionAnswerForm");
  if (prepositionAnswerForm) {
    prepositionAnswerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitPrepositionAnswer();
    });
  }

  const prepositionNextBtn = document.getElementById("prepositionNextBtn");
  if (prepositionNextBtn) {
    prepositionNextBtn.addEventListener("click", () => {
      moveToNextPrepositionQuestion();
    });
  }

  const prepositionRetryBtn = document.getElementById("prepositionRetryBtn");
  if (prepositionRetryBtn) {
    prepositionRetryBtn.addEventListener("click", () => {
      if (!prepositionTrainingSession) {
        openPrepositionTrainingSelector();
        return;
      }
      startPrepositionTraining(prepositionTrainingSession.scope);
    });
  }

  const prepositionReviewWrongBtn = document.getElementById("prepositionReviewWrongBtn");
  if (prepositionReviewWrongBtn) {
    prepositionReviewWrongBtn.addEventListener("click", () => {
      if (!prepositionTrainingSession || !prepositionTrainingSession.wrongQuestionIds.length) return;
      startPrepositionTraining(prepositionTrainingSession.scope, {
        reviewQuestionIds: prepositionTrainingSession.wrongQuestionIds
      });
    });
  }

  const prepositionChooseScopeBtn = document.getElementById("prepositionChooseScopeBtn");
  if (prepositionChooseScopeBtn) {
    prepositionChooseScopeBtn.addEventListener("click", () => {
      openPrepositionTrainingSelector();
    });
  }

  const prepositionBackToMenuBtn = document.getElementById("prepositionBackToMenuBtn");
  if (prepositionBackToMenuBtn) {
    prepositionBackToMenuBtn.addEventListener("click", () => {
      openTrainingMenuScreen();
    });
  }

  const responseAnswerForm = document.getElementById("responseAnswerForm");
  if (responseAnswerForm) {
    responseAnswerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitResponseTrainingAnswer();
    });
  }

  const irregularVerbAnswerForm = document.getElementById("irregularVerbAnswerForm");
  if (irregularVerbAnswerForm) {
    irregularVerbAnswerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      submitIrregularVerbAnswer();
    });
  }

  const irregularVerbNextBtn = document.getElementById("irregularVerbNextBtn");
  if (irregularVerbNextBtn) {
    irregularVerbNextBtn.addEventListener("click", () => {
      moveToNextIrregularVerbQuestion();
    });
  }

  const irregularVerbRetryBtn = document.getElementById("irregularVerbRetryBtn");
  if (irregularVerbRetryBtn) {
    irregularVerbRetryBtn.addEventListener("click", () => {
      startIrregularVerbTraining(irregularVerbTrainingSession?.form || "past", irregularVerbTrainingSession?.mode || irregularVerbSelectedMode || "training");
    });
  }

  const irregularVerbContinueBtn = document.getElementById("irregularVerbContinueBtn");
  if (irregularVerbContinueBtn) {
    irregularVerbContinueBtn.addEventListener("click", () => {
      continueIrregularVerbTrainingReview();
    });
  }

  const irregularVerbBackToMenuBtn = document.getElementById("irregularVerbBackToMenuBtn");
  if (irregularVerbBackToMenuBtn) {
    irregularVerbBackToMenuBtn.addEventListener("click", () => {
      openTrainingMenuScreen();
    });
  }

  const irregularVerbModeTrainingBtn = document.getElementById("irregularVerbModeTrainingBtn");
  if (irregularVerbModeTrainingBtn) {
    irregularVerbModeTrainingBtn.addEventListener("click", () => {
      irregularVerbSelectedMode = "training";
      startIrregularVerbTraining("past", "training");
    });
  }

  const irregularVerbModeTestBtn = document.getElementById("irregularVerbModeTestBtn");
  if (irregularVerbModeTestBtn) {
    irregularVerbModeTestBtn.addEventListener("click", () => {
      irregularVerbSelectedMode = "test";
      startIrregularVerbTraining("past", "test");
    });
  }

  const irregularVerbFormBaseBtn = document.getElementById("irregularVerbFormBaseBtn");
  if (irregularVerbFormBaseBtn) {
    irregularVerbFormBaseBtn.addEventListener("click", () => {
      startIrregularVerbTraining("base", irregularVerbSelectedMode || "training");
    });
  }

  const irregularVerbFormPastBtn = document.getElementById("irregularVerbFormPastBtn");
  if (irregularVerbFormPastBtn) {
    irregularVerbFormPastBtn.addEventListener("click", () => {
      startIrregularVerbTraining("past", irregularVerbSelectedMode || "training");
    });
  }

  const irregularVerbFormPastParticipleBtn = document.getElementById("irregularVerbFormPastParticipleBtn");
  if (irregularVerbFormPastParticipleBtn) {
    irregularVerbFormPastParticipleBtn.addEventListener("click", () => {
      startIrregularVerbTraining("pastparticiple", irregularVerbSelectedMode || "training");
    });
  }

  const responseNextBtn = document.getElementById("responseNextBtn");
  if (responseNextBtn) {
    responseNextBtn.addEventListener("click", () => {
      moveToNextResponseTrainingQuestion();
    });
  }

  const responseRetryBtn = document.getElementById("responseRetryBtn");
  if (responseRetryBtn) {
    responseRetryBtn.addEventListener("click", () => {
      startResponseTraining("all");
    });
  }

  const responseBackToMenuBtn = document.getElementById("responseBackToMenuBtn");
  if (responseBackToMenuBtn) {
    responseBackToMenuBtn.addEventListener("click", () => {
      openTrainingMenuScreen();
    });
  }

  const trainingCompleteHomeBtn = document.getElementById("trainingCompleteHomeBtn");
  if (trainingCompleteHomeBtn) {
    trainingCompleteHomeBtn.addEventListener("click", () => {
      closeTrainingCompleteScreenToHome();
    });
  }

  const trainingCompleteContinueBtn = document.getElementById("trainingCompleteContinueBtn");
  if (trainingCompleteContinueBtn) {
    trainingCompleteContinueBtn.addEventListener("click", () => {
      pendingTrainingCompleteContext = null;
      deferGameTicketRewardModal = false;
      prepareSession("challenge", { forceNewSession: true, skipChallengePromo: true, skipPhaseIntro: true });
    });
  }

  const challengePromoNextBtn = document.getElementById("challengePromoNextBtn");
  if (challengePromoNextBtn) {
    challengePromoNextBtn.addEventListener("click", () => {
      beginChallengeSessionAfterPromo();
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
      const maxDay = getMaxAvailableDay();
      const safeStart = Number.isFinite(startDayRaw) ? Math.max(1, Math.min(maxDay, startDayRaw)) : 1;
      const safeEnd = Number.isFinite(endDayRaw) ? Math.max(safeStart, Math.min(maxDay, endDayRaw)) : safeStart;
      const safeType = typeRaw === "word" || typeRaw === "phrase" || typeRaw === "all" ? typeRaw : "all";
      startDayStudySession(safeStart, safeEnd, safeType);
    });
  }

  document.querySelectorAll(".back-nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      if (currentScreenId === "testScreen" && state.session) {
        suspendCurrentSession();
        return;
      }
      if (currentScreenId === "prepositionPracticeScreen" && prepositionTrainingSession) {
        recordPrepositionLearningHistory(prepositionTrainingSession, "interrupted");
        const pointSummary = computeSessionEarnedPoints(prepositionTrainingSession);
        prepositionTrainingSession = null;
        openTrainingCompleteScreen({
          mode: "preposition",
          earnedPoints: pointSummary.earnedPoints,
          pointBalance: pointSummary.pointBalance,
          interrupted: true,
          showTicketAfter: true
        });
        return;
      }
      if (currentScreenId === "responsePracticeScreen" && responseTrainingSession) {
        completeResponseTrainingSession("interrupted");
        return;
      }
      if (currentScreenId === "irregularVerbPracticeScreen" && irregularVerbTrainingSession) {
        recordIrregularVerbLearningHistory(irregularVerbTrainingSession, "interrupted");
        const pointSummary = computeSessionEarnedPoints(irregularVerbTrainingSession);
        irregularVerbTrainingSession = null;
        openTrainingCompleteScreen({
          mode: "irregular-verb",
          earnedPoints: pointSummary.earnedPoints,
          pointBalance: pointSummary.pointBalance,
          interrupted: true,
          showTicketAfter: true
        });
        return;
      }
      if (currentScreenId === "resultScreen") {
        returnHomeFromInterruptedResult();
        return;
      }
      if (currentScreenId === "trainingCompleteScreen") {
        closeTrainingCompleteScreenToHome();
        return;
      }
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
      if (summary?.canResume) {
        if (restoreSavedNormalSession()) {
          resumeActiveSession();
        }
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

  window.addEventListener("beforeunload", () => {
    if (isResettingLearningData) {
      return;
    }
    flushPendingStudyCoreSync().catch(() => false);
    flushPointStateSync().catch(() => false);
    if (state.session) {
      completeCurrentSession("interrupted", { showResult: false });
      return;
    }
    saveState();
  });

  window.addEventListener("resize", () => {
    applyDesktopResponsiveScale();
  });
}

function bindUserScopedStorageAuthStateListener() {
  if (document.body?.dataset.userScopedStorageAuthBound === "true") return;
  document.addEventListener("pc-firebase-auth-state", (event) => {
    const user = event?.detail?.user || null;
    resetUserScopedStorageCaches();
    prepositionTrainingSession = null;
    responseTrainingSession = null;
    pendingTrainingCompleteContext = null;
    state = loadState();
    if (user) {
      syncDerivedStats();
    }
    renderPcDeviceIdentitySettings();
    renderHome();
    renderProgress();
    showScreen("homeScreen", { recordHistory: false });
  });
  if (document.body) {
    document.body.dataset.userScopedStorageAuthBound = "true";
  }
}

var state = loadState();

if (typeof globalThis !== "undefined") {
  globalThis.state = state;
}
if (typeof window !== "undefined" && window !== globalThis) {
  window.state = state;
}

function init() {
  ensurePcBrowserDeviceIdentity();
  learningHistoryCachedSonUid = readLearningHistoryCachedSonUid();
  bindLearningHistoryFamilyWatchAuthStateListener();
  startLearningHistoryFamilyWatch();
  applyDesktopResponsiveScale();
  const settingsVersionText = document.getElementById("settingsVersionText");
  if (settingsVersionText) {
    settingsVersionText.textContent = `Ver ${formatVersionForJstDisplay(APP_VERSION)}`;
  }
  const itemsSynced = ensureItemsSyncedWithVocabularyBank();
  clampStudyRangeToAvailableDays();
  autoCompleteStaleSessionIfNeeded();
  activateDueReviewItems();
  initializeRecentDayProgress();
  syncDaySelectOptions();
  bindEvents();
  if (shouldUseFirestoreForHomeMetrics()) {
    startHomeHistoryFirestoreSync();
    ensurePointStateFromFirestoreIfMissing();
    loadStudyCoreBackupsForSettings().catch((error) => {
      console.error("Failed to load study core backups during init", error);
    });
  }
  renderDayCatalog();
  renderPrepositionScopeSelector();
  renderPcDeviceIdentitySettings();
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

window.getPcBrowserDeviceId = getPcBrowserDeviceId;
window.getPcBrowserDeviceName = getPcBrowserDeviceName;
