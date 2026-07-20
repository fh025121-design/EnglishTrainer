(function () {
  const MOBILE_STORAGE_KEY = "englishTrainerMobile_state_v1";
  const SPEAKING_PROGRESS_KEY = "englishTrainerSpeakingProgress";
  const SETTINGS_INFO = window.ENGLISH_TRAINER_RELEASE_INFO || Object.freeze({
    adminPassword: "12345",
    releaseHistory: []
  });
  const APP_VERSION = SETTINGS_INFO.releaseHistory[0]?.version || "0/0000/0000";
  const MOBILE_DAY_MIN = 1;
  const MOBILE_DAY_MAX = 40;
  const SPEAKING_WEEK_MIN = 1;
  const SPEAKING_WEEK_MAX = 40;
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
    speakingUi: {
      conversationRangeMode: "auto",
      startWeek: SPEAKING_WEEK_MIN,
      endWeek: SPEAKING_WEEK_MAX,
      vocabularyRangeMode: "auto",
      startDay: MOBILE_DAY_MIN,
      endDay: MOBILE_DAY_MAX
    },
    speakingProgress: null,
    speakingTranslationVisible: false,
    speakingAudioPlaying: false,
    speakingAudioWatchdogId: null,
    speakingLineStatus: "idle",
    speakingUtterance: null,
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
      conversationRangeMode: "auto",
      startWeek: SPEAKING_WEEK_MIN,
      endWeek: SPEAKING_WEEK_MAX,
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
    const conversationOrder = Array.isArray(raw.conversationOrder)
      ? raw.conversationOrder.map((value) => String(value || "").trim()).filter(Boolean)
      : [];
    const completedConversationIds = Array.isArray(raw.completedConversationIds)
      ? [...new Set(raw.completedConversationIds.map((value) => String(value || "").trim()).filter(Boolean))]
      : [];
    if (!weekId || !conversationOrder.length) return null;
    return {
      weekId,
      conversationOrder,
      conversationIndex: Math.max(0, Number(raw.conversationIndex) || 0),
      lineIndex: Math.max(0, Number(raw.lineIndex) || 0),
      completedRounds: Math.max(0, Number(raw.completedRounds) || 0),
      completedConversationIds,
      phase: raw.phase === "conversationComplete" ? "conversationComplete" : "line",
      updatedAt: Number(raw.updatedAt) || Date.now()
    };
  }

  function loadSpeakingProgress() {
    const raw = window.localStorage.getItem(SPEAKING_PROGRESS_KEY);
    if (!raw) {
      state.speakingProgress = null;
      return;
    }
    try {
      state.speakingProgress = sanitizeSpeakingProgress(JSON.parse(raw));
    } catch (_error) {
      state.speakingProgress = null;
    }
  }

  function saveSpeakingProgress() {
    if (!state.speakingProgress) {
      window.localStorage.removeItem(SPEAKING_PROGRESS_KEY);
      return;
    }
    state.speakingProgress.updatedAt = Date.now();
    window.localStorage.setItem(SPEAKING_PROGRESS_KEY, JSON.stringify(state.speakingProgress));
  }

  function clearSpeakingProgress() {
    state.speakingProgress = null;
    state.speakingTranslationVisible = false;
    state.speakingAudioPlaying = false;
    state.speakingUtterance = null;
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
                    japanese: String(line?.japanese || "").trim()
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
    const week = getSpeakingProgressWeek();
    const progress = state.speakingProgress;
    if (!week || !progress) return null;
    const conversationId = progress.conversationOrder[progress.conversationIndex] || "";
    return getSpeakingConversationById(week, conversationId);
  }

  function getCurrentSpeakingLine() {
    const conversation = getCurrentSpeakingConversation();
    const lineIndex = Math.max(0, Number(state.speakingProgress?.lineIndex) || 0);
    return conversation?.lines?.[lineIndex] || null;
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

  function createSpeakingProgress(weekId) {
    const week = getSpeakingWeek(weekId);
    if (!week || !week.shortConversations.length) return null;
    return {
      weekId,
      conversationOrder: getSpeakingConversationOrderForRound(week, 1),
      conversationIndex: 0,
      lineIndex: 0,
      completedRounds: 0,
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

  function getSpeakingWeekDisplayName(week) {
    const weekNumber = parseWeekNumber(week?.weekId);
    if (Number.isFinite(weekNumber)) {
      return `Week${weekNumber}`;
    }
    return String(week?.weekId || "Week");
  }

  function getSpeakingWeekDisplayLabel(week) {
    return `${getSpeakingWeekDisplayName(week)}（${String(week?.label || "")}）`;
  }

  function getSpeakingConversationOrderForRound(week, roundNumber) {
    const orderedConversationIds = week.shortConversations.map((conversation) => conversation.id);
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
    const completedRounds = getSpeakingCompletedRounds(progress);
    const currentRound = getSpeakingCurrentRound(progress);
    return completedRounds >= 3 || currentRound >= 4 ? 5 : 3;
  }

  function buildSpeakingContinueLines(progress, week) {
    const completedRounds = getSpeakingCompletedRounds(progress);
    const currentRound = getSpeakingCurrentRound(progress);
    const targetRounds = getSpeakingTargetRounds(progress);

    if (progress.phase === "conversationComplete") {
      if (completedRounds >= 5) {
        return ["5 / 5周 完了", "🌟 Excellent!"];
      }
      if (completedRounds === 3) {
        return ["🎉 3周達成！", "3 / 5周 完了"];
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

  function pickConversationWeekBySelector() {
    const availableWeeks = getSpeakingWeeks().filter((week) => week.shortConversations.length > 0);
    if (!availableWeeks.length) return null;

    if (state.speakingUi.conversationRangeMode === "week") {
      const start = clampWeek(state.speakingUi.startWeek);
      const end = clampWeek(state.speakingUi.endWeek);
      const minWeek = Math.min(start, end);
      const maxWeek = Math.max(start, end);
      const scoped = availableWeeks.filter((week) => {
        const weekNumber = parseWeekNumber(week.weekId);
        return Number.isFinite(weekNumber) && weekNumber >= minWeek && weekNumber <= maxWeek;
      });
      if (!scoped.length) return null;
      return scoped[Math.floor(Math.random() * scoped.length)];
    }

    return availableWeeks[Math.floor(Math.random() * availableWeeks.length)];
  }

  function startConversationPracticeFromSelector() {
    const selectedWeek = pickConversationWeekBySelector();
    if (!selectedWeek) {
      window.alert("選択した範囲に会話データがありません。");
      return;
    }
    startSpeakingWeek(selectedWeek.weekId);
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
    ["homeScreen", "speakingHomeScreen", "conversationSelectScreen", "speakingVocabScreen", "conversationPracticeScreen", "conversationCompleteScreen", "studyScreen", "resultScreen", "settingsScreen", "comingSoonScreen"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.classList.toggle("active", id === screenId);
      }
    });
    state.currentScreen = screenId;
  }

  function renderHome() {
    showScreen("homeScreen");
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

  function renderSpeakingHome() {
    showScreen("speakingHomeScreen");
  }

  function renderConversationSelectScreen() {
    const resumeInfo = getSpeakingResumeInfo();
    const weekMode = state.speakingUi.conversationRangeMode === "week";
    elements.conversationWeekRangeFields.classList.toggle("hidden", !weekMode);
    [...document.querySelectorAll('input[name="conversationRangeMode"]')].forEach((radio) => {
      radio.checked = radio.value === state.speakingUi.conversationRangeMode;
    });
    elements.conversationStartWeekSelect.value = String(state.speakingUi.startWeek);
    elements.conversationEndWeekSelect.value = String(state.speakingUi.endWeek);

    elements.conversationContinuePanel.classList.toggle("hidden", !resumeInfo);
    if (resumeInfo) {
      renderButtonLines(elements.continueConversationBtn, resumeInfo.lines);
      elements.restartConversationWeekBtn.textContent = `${getSpeakingWeekDisplayName(resumeInfo.week)}を最初から`;
    }

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

  function updateConversationRangeMode(value) {
    state.speakingUi.conversationRangeMode = value === "week" ? "week" : "auto";
    renderConversationSelectScreen();
  }

  function updateConversationWeekRange(startWeek, endWeek) {
    const start = clampWeek(startWeek);
    const end = clampWeek(endWeek);
    state.speakingUi.startWeek = Math.min(start, end);
    state.speakingUi.endWeek = Math.max(start, end);
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
    const question = getCurrentQuestion();
    if (!question || typeof window.speechSynthesis === "undefined") return;
    const utterance = new SpeechSynthesisUtterance(question.speechText);
    utterance.lang = "en-US";
    utterance.rate = MOBILE_SPEECH_RATES[state.settings.speechRateMode] || MOBILE_SPEECH_RATES.slow;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function playCurrentSpeakingLine() {
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

  function renderConversationPractice() {
    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    const conversation = getCurrentSpeakingConversation();
    const line = getCurrentSpeakingLine();
    if (!progress || !week || !conversation || !line) {
      renderConversationSelectScreen();
      return;
    }

    elements.conversationWeekText.textContent = getSpeakingWeekDisplayLabel(week);
    elements.conversationProgressText.textContent = `${getSpeakingCurrentRound(progress)}周目  ${progress.conversationIndex + 1} / ${week.shortConversations.length}`;
    elements.conversationSpeakerText.textContent = line.speaker;
    elements.conversationEnglishText.textContent = line.english;
    elements.conversationJapaneseText.textContent = line.japanese;
    elements.conversationJapaneseBlock.classList.toggle("hidden", !state.speakingTranslationVisible || !line.japanese);
    const statusPromptText = line.speaker === "A"
      ? "🎤 質問文をシャドーイングし、続きの文章を\n声に出してみよう。"
      : "🎤 シャドーイングしてください";
    const hasSpeechSynthesis = Boolean(getSpeechSynthesisEngine());
    if (state.speakingLineStatus === "playing") {
      elements.conversationStatusText.textContent = "再生中…";
    } else if (state.speakingLineStatus === "error") {
      elements.conversationStatusText.textContent = "音声を再生できませんでした。";
    } else if (state.speakingLineStatus === "awaitingStart") {
      elements.conversationStatusText.textContent = "▶ 音声を開始してください";
    } else {
      elements.conversationStatusText.textContent = statusPromptText;
    }
    elements.toggleJapaneseBtn.disabled = state.speakingLineStatus === "playing" || !line.japanese;
    elements.replayConversationAudioBtn.textContent = state.speakingLineStatus === "awaitingStart" ? "▶ 音声を開始" : "▶ もう一度聞く";
    elements.replayConversationAudioBtn.disabled = !hasSpeechSynthesis || state.speakingLineStatus === "playing";
    elements.nextConversationLineBtn.disabled = state.speakingLineStatus !== "completed";

    showScreen("conversationPracticeScreen");
  }

  function renderConversationCompleteScreen() {
    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    if (!progress || !week) {
      renderConversationSelectScreen();
      return;
    }
    const completedRounds = getSpeakingCompletedRounds(progress);
    const targetRounds = getSpeakingTargetRounds(progress);
    if (completedRounds >= 5) {
      elements.conversationCompleteMetaText.innerHTML = "5 / 5周 完了<br>🌟 Excellent!";
      elements.nextConversationBtn.textContent = `${getSpeakingWeekDisplayName(week)}を最初から`;
    } else if (completedRounds === 3 && progress.conversationIndex >= week.shortConversations.length - 1) {
      elements.conversationCompleteMetaText.innerHTML = "🎉 3周達成！<br>3 / 5周 完了";
      elements.nextConversationBtn.textContent = "4周目へ進む";
    } else if (progress.conversationIndex >= week.shortConversations.length - 1) {
      elements.conversationCompleteMetaText.textContent = `${completedRounds} / ${targetRounds}周 完了`;
      elements.nextConversationBtn.textContent = `${completedRounds + 1}周目へ進む`;
    } else {
      elements.conversationCompleteMetaText.textContent = `${getSpeakingCurrentRound(progress)}周目  ${Math.min(progress.conversationIndex + 1, week.shortConversations.length)} / ${week.shortConversations.length}`;
      elements.nextConversationBtn.textContent = "次のConversation";
    }
    showScreen("conversationCompleteScreen");
  }

  function startSpeakingWeek(weekId) {
    const progress = createSpeakingProgress(weekId);
    if (!progress) {
      window.alert("このWeekの会話データはまだありません。");
      return;
    }
    stopSpeakingAudio();
    state.speakingProgress = progress;
    state.speakingTranslationVisible = false;
    state.speakingLineStatus = "awaitingStart";
    saveSpeakingProgress();
    renderConversationPractice();
  }

  function resumeSpeakingProgress() {
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
    state.speakingLineStatus = "awaitingStart";
    renderConversationPractice();
  }

  function restartSpeakingWeek() {
    const weekId = state.speakingProgress?.weekId;
    if (!weekId) return;
    startSpeakingWeek(weekId);
  }

  function toggleSpeakingJapanese() {
    if (state.speakingAudioPlaying) return;
    state.speakingTranslationVisible = !state.speakingTranslationVisible;
    renderConversationPractice();
  }

  function moveToNextSpeakingLine() {
    if (state.speakingLineStatus !== "completed") return;
    const progress = state.speakingProgress;
    const conversation = getCurrentSpeakingConversation();
    const week = getSpeakingProgressWeek();
    if (!progress || !conversation || !week) return;

    if (progress.lineIndex < conversation.lines.length - 1) {
      progress.lineIndex += 1;
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
    if (progress.conversationIndex >= week.shortConversations.length - 1) {
      progress.completedRounds += 1;
    }
    progress.phase = "conversationComplete";
    saveSpeakingProgress();
    renderConversationCompleteScreen();
  }

  function moveToNextSpeakingConversation() {
    const progress = state.speakingProgress;
    const week = getSpeakingProgressWeek();
    if (!progress || !week) {
      renderConversationSelectScreen();
      return;
    }

    if (progress.conversationIndex >= week.shortConversations.length - 1) {
      if (progress.completedRounds >= 5) {
        startSpeakingWeek(progress.weekId);
        return;
      }
      const nextRound = progress.completedRounds + 1;
      progress.conversationOrder = getSpeakingConversationOrderForRound(week, nextRound);
      progress.conversationIndex = 0;
      progress.lineIndex = 0;
      progress.completedConversationIds = [];
      progress.phase = "line";
      state.speakingTranslationVisible = false;
      state.speakingLineStatus = "awaitingStart";
      saveSpeakingProgress();
      renderConversationPractice();
      return;
    }

    progress.conversationIndex += 1;
    progress.lineIndex = 0;
    progress.phase = "line";
    state.speakingTranslationVisible = false;
    state.speakingLineStatus = "awaitingStart";
    saveSpeakingProgress();
    renderConversationPractice();
  }

  function leaveSpeakingPractice() {
    stopSpeakingAudio();
    state.speakingLineStatus = "awaitingStart";
    saveSpeakingProgress();
    renderConversationSelectScreen();
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

  function handlePageShow() {
    const speechSynthesis = getSpeechSynthesisEngine();
    if (!speechSynthesis || !speechSynthesis.paused) return;
    try {
      speechSynthesis.resume();
    } catch (_error) {
      // noop
    }
  }

  function handlePageHide() {
    stopSpeakingAudio();
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
        window.localStorage.removeItem(SPEAKING_PROGRESS_KEY);
        Object.assign(state, createDefaultMobileState(), {
          session: null,
          speakingUi: createDefaultSpeakingUiState(),
          speakingProgress: null,
          speakingTranslationVisible: false,
          speakingAudioPlaying: false,
          speakingAudioWatchdogId: null,
          speakingLineStatus: "idle",
          speakingUtterance: null,
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
    elements.conversationStartWeekSelect.innerHTML = "";
    elements.conversationEndWeekSelect.innerHTML = "";
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
    for (let week = SPEAKING_WEEK_MIN; week <= SPEAKING_WEEK_MAX; week += 1) {
      const startOption = document.createElement("option");
      startOption.value = String(week);
      startOption.textContent = `Week${week}`;
      const endOption = startOption.cloneNode(true);
      elements.conversationStartWeekSelect.appendChild(startOption);
      elements.conversationEndWeekSelect.appendChild(endOption);
    }
    if (elements.startDaySelect) {
      elements.startDaySelect.value = String(state.settings.startDay);
    }
    if (elements.endDaySelect) {
      elements.endDaySelect.value = String(state.settings.endDay);
    }
    elements.speakingWordStartDaySelect.value = String(state.speakingUi.startDay);
    elements.speakingWordEndDaySelect.value = String(state.speakingUi.endDay);
    elements.conversationStartWeekSelect.value = String(state.speakingUi.startWeek);
    elements.conversationEndWeekSelect.value = String(state.speakingUi.endWeek);

    [...document.querySelectorAll('input[name="speechRateMode"]')].forEach((radio) => {
      radio.checked = radio.value === state.settings.speechRateMode;
    });
  }

  function bindElements() {
    elements.dayRangeFields = document.getElementById("dayRangeFields");
    elements.startDaySelect = document.getElementById("startDaySelect");
    elements.endDaySelect = document.getElementById("endDaySelect");
    elements.conversationWeekRangeFields = document.getElementById("conversationWeekRangeFields");
    elements.conversationStartWeekSelect = document.getElementById("conversationStartWeekSelect");
    elements.conversationEndWeekSelect = document.getElementById("conversationEndWeekSelect");
    elements.conversationContinuePanel = document.getElementById("conversationContinuePanel");
    elements.continueConversationBtn = document.getElementById("continueConversationBtn");
    elements.restartConversationWeekBtn = document.getElementById("restartConversationWeekBtn");
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
    elements.toggleJapaneseBtn = document.getElementById("toggleJapaneseBtn");
    elements.replayConversationAudioBtn = document.getElementById("replayConversationAudioBtn");
    elements.nextConversationLineBtn = document.getElementById("nextConversationLineBtn");
    elements.conversationCompleteMetaText = document.getElementById("conversationCompleteMetaText");
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
    elements.confirmModal = document.getElementById("confirmModal");
    elements.confirmMessage = document.getElementById("confirmMessage");
    elements.confirmOkBtn = document.getElementById("confirmOkBtn");
  }

  function bindEvents() {
    document.getElementById("openSpeakingFeatureBtn").addEventListener("click", renderSpeakingHome);
    document.getElementById("startTypingBtn").addEventListener("click", () => startStudy("typing"));
    document.getElementById("openSettingsBtn").addEventListener("click", () => showScreen("settingsScreen"));
    document.getElementById("speakingHomeBackBtn").addEventListener("click", renderHome);
    document.getElementById("openConversationSelectBtn").addEventListener("click", renderConversationSelectScreen);
    document.getElementById("openSpeakingVocabBtn").addEventListener("click", renderSpeakingVocabScreen);
    document.getElementById("conversationSelectBackBtn").addEventListener("click", renderSpeakingHome);
    document.getElementById("speakingVocabBackBtn").addEventListener("click", renderSpeakingHome);
    document.getElementById("startConversationBtn").addEventListener("click", startConversationPracticeFromSelector);
    document.getElementById("startSpeakingWordPracticeBtn").addEventListener("click", startSpeakingVocabularyPractice);
    document.getElementById("conversationBackBtn").addEventListener("click", leaveSpeakingPractice);
    document.getElementById("conversationCompleteBackBtn").addEventListener("click", leaveSpeakingPractice);
    document.getElementById("returnConversationSelectBtn").addEventListener("click", renderConversationSelectScreen);
    elements.continueConversationBtn.addEventListener("click", resumeSpeakingProgress);
    elements.restartConversationWeekBtn.addEventListener("click", restartSpeakingWeek);
    elements.toggleJapaneseBtn.addEventListener("click", toggleSpeakingJapanese);
    elements.replayConversationAudioBtn.addEventListener("click", playCurrentSpeakingLine);
    elements.nextConversationLineBtn.addEventListener("click", moveToNextSpeakingLine);
    elements.nextConversationBtn.addEventListener("click", moveToNextSpeakingConversation);
    document.getElementById("settingsBackBtn").addEventListener("click", renderHome);
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
    [...document.querySelectorAll('input[name="conversationRangeMode"]')].forEach((radio) => {
      radio.addEventListener("change", () => updateConversationRangeMode(radio.value));
    });
    [...document.querySelectorAll('input[name="speakingWordRangeMode"]')].forEach((radio) => {
      radio.addEventListener("change", () => updateSpeakingVocabularyRangeMode(radio.value));
    });
    if (elements.startDaySelect && elements.endDaySelect) {
      elements.startDaySelect.addEventListener("change", () => updateDayRange(elements.startDaySelect.value, elements.endDaySelect.value));
      elements.endDaySelect.addEventListener("change", () => updateDayRange(elements.startDaySelect.value, elements.endDaySelect.value));
    }
    elements.conversationStartWeekSelect.addEventListener("change", () => updateConversationWeekRange(elements.conversationStartWeekSelect.value, elements.conversationEndWeekSelect.value));
    elements.conversationEndWeekSelect.addEventListener("change", () => updateConversationWeekRange(elements.conversationStartWeekSelect.value, elements.conversationEndWeekSelect.value));
    elements.speakingWordStartDaySelect.addEventListener("change", () => updateSpeakingVocabularyDayRange(elements.speakingWordStartDaySelect.value, elements.speakingWordEndDaySelect.value));
    elements.speakingWordEndDaySelect.addEventListener("change", () => updateSpeakingVocabularyDayRange(elements.speakingWordStartDaySelect.value, elements.speakingWordEndDaySelect.value));
    document.addEventListener("visibilitychange", handlePageVisibilityChange);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("pagehide", handlePageHide);
  }

  function initialize() {
    loadState();
    loadSpeakingProgress();
    bindElements();
    renderMobileVersionInfo();
    syncFormFromState();
    bindEvents();
    renderHome();
  }

  window.addEventListener("DOMContentLoaded", initialize);
})();