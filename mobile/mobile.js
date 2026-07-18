(function () {
  const MOBILE_STORAGE_KEY = "englishTrainerMobile_state_v1";
  const MOBILE_DAY_MIN = 1;
  const MOBILE_DAY_MAX = 7;
  const SESSION_QUESTION_COUNT = 10;
  const MOBILE_SPEECH_RATES = {
    slow: 0.82,
    normal: 0.92
  };

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;

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
    currentScreen: "homeScreen",
    confirmAction: null,
    micTestRecognition: null
  };

  const elements = {};

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

  function clampDay(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return MOBILE_DAY_MIN;
    return Math.max(MOBILE_DAY_MIN, Math.min(MOBILE_DAY_MAX, Math.round(numeric)));
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
    ["homeScreen", "studyScreen", "resultScreen", "settingsScreen", "comingSoonScreen"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.toggle("active", id === screenId);
      }
    });
    state.currentScreen = screenId;
  }

  function renderHome() {
    const dayMode = state.settings.rangeMode === "day";
    elements.dayRangeFields.classList.toggle("hidden", !dayMode);
    [...document.querySelectorAll('input[name="studyRangeMode"]')].forEach((radio) => {
      radio.checked = radio.value === state.settings.rangeMode;
    });
    elements.startDaySelect.value = String(state.settings.startDay);
    elements.endDaySelect.value = String(state.settings.endDay);
    showScreen("homeScreen");
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
    const question = getCurrentQuestion();
    if (!question || typeof window.speechSynthesis === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(question.speechText);
    utterance.lang = "en-US";
    utterance.rate = MOBILE_SPEECH_RATES[state.settings.speechRateMode] || MOBILE_SPEECH_RATES.slow;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
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
    const session = state.session;
    if (!session) return;
    const typed = String(elements.typingAnswerInput.value || "").trim();
    session.attemptsUsed += 1;
    resolveQuestion(isCorrectRecognition(getCurrentQuestion().answer, [typed]), typed || "聞き取れませんでした", [typed]);
  }

  function goToNextQuestion() {
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
    state.session = session;
    renderStudyScreen();
  }

  function confirmLeaveStudy() {
    showConfirm("学習を中断してホームへ戻りますか？", "ホームへ戻る", () => {
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
        Object.assign(state, createDefaultMobileState(), {
          session: null,
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
    elements.startDaySelect.innerHTML = "";
    elements.endDaySelect.innerHTML = "";
    for (let day = MOBILE_DAY_MIN; day <= MOBILE_DAY_MAX; day += 1) {
      const startOption = document.createElement("option");
      startOption.value = String(day);
      startOption.textContent = `Day${day}`;
      const endOption = startOption.cloneNode(true);
      elements.startDaySelect.appendChild(startOption);
      elements.endDaySelect.appendChild(endOption);
    }
    elements.startDaySelect.value = String(state.settings.startDay);
    elements.endDaySelect.value = String(state.settings.endDay);

    [...document.querySelectorAll('input[name="speechRateMode"]')].forEach((radio) => {
      radio.checked = radio.value === state.settings.speechRateMode;
    });
  }

  function bindElements() {
    elements.dayRangeFields = document.getElementById("dayRangeFields");
    elements.startDaySelect = document.getElementById("startDaySelect");
    elements.endDaySelect = document.getElementById("endDaySelect");
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
    elements.confirmModal = document.getElementById("confirmModal");
    elements.confirmMessage = document.getElementById("confirmMessage");
    elements.confirmOkBtn = document.getElementById("confirmOkBtn");
  }

  function bindEvents() {
    document.getElementById("startSpeakingBtn").addEventListener("click", () => startStudy("speaking"));
    document.getElementById("startTypingBtn").addEventListener("click", () => startStudy("typing"));
    document.getElementById("openSettingsBtn").addEventListener("click", () => showScreen("settingsScreen"));
    document.getElementById("settingsBackBtn").addEventListener("click", renderHome);
    document.getElementById("comingSoonBackBtn").addEventListener("click", renderHome);
    document.getElementById("studyBackBtn").addEventListener("click", confirmLeaveStudy);
    document.getElementById("retrySessionBtn").addEventListener("click", () => startStudy(state.lastSessionMode || "speaking"));
    document.getElementById("returnHomeBtn").addEventListener("click", renderHome);
    document.getElementById("runMicTestBtn").addEventListener("click", runMicTest);
    document.getElementById("resetMobileDataBtn").addEventListener("click", resetMobileData);
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

    [...document.querySelectorAll('input[name="studyRangeMode"]')].forEach((radio) => {
      radio.addEventListener("change", () => updateRangeMode(radio.value));
    });
    [...document.querySelectorAll('input[name="speechRateMode"]')].forEach((radio) => {
      radio.addEventListener("change", () => updateSpeechRateMode(radio.value));
    });
    elements.startDaySelect.addEventListener("change", () => updateDayRange(elements.startDaySelect.value, elements.endDaySelect.value));
    elements.endDaySelect.addEventListener("change", () => updateDayRange(elements.startDaySelect.value, elements.endDaySelect.value));
  }

  function initialize() {
    loadState();
    bindElements();
    syncFormFromState();
    bindEvents();
    renderHome();
  }

  window.addEventListener("DOMContentLoaded", initialize);
})();