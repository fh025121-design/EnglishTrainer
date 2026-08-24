import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdeEZ2uKt3p_KS0kxZpUFICcNP5gzKM08",
  authDomain: "englishtrainer-ef9a9.firebaseapp.com",
  projectId: "englishtrainer-ef9a9",
  storageBucket: "englishtrainer-ef9a9.firebasestorage.app",
  messagingSenderId: "894184934220",
  appId: "1:894184934220:web:c97e2008a771a7271adde9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const MOBILE_POINT_SYNC_DOC_COLLECTION = "mobileSync";
const MOBILE_POINT_SYNC_DOC_ID = "pointStateV1";
const MOBILE_POINT_SYNC_SCHEMA_VERSION = 1;
const MOBILE_WORD_ORDER_SYNC_DOC_COLLECTION = "mobileSync";
const MOBILE_WORD_ORDER_SYNC_DOC_ID = "wordOrderStatsV1";
const MOBILE_WORD_ORDER_SYNC_SCHEMA_VERSION = 1;
const MOBILE_VOCABULARY_SYNC_DOC_COLLECTION = "mobileSync";
const MOBILE_VOCABULARY_SYNC_DOC_ID = "vocabularyStateV1";
const MOBILE_VOCABULARY_SYNC_CHUNK_COLLECTION = "vocabularyStateChunks";
const MOBILE_VOCABULARY_SYNC_CHUNK_SUBCOLLECTION = "chunks";
const MOBILE_VOCABULARY_SYNC_SCHEMA_VERSION = 1;
const MOBILE_VOCABULARY_SYNC_CHUNK_SIZE = 150;
const MOBILE_VOCABULARY_SYNC_CHUNK_PREFIX = "vocabularyStateChunk";
const MOBILE_VOCABULARY_TODAY_HISTORY_SYNC_DOC_COLLECTION = "mobileSync";
const MOBILE_VOCABULARY_TODAY_HISTORY_SYNC_DOC_ID = "vocabularyTodayHistoryV1";
const MOBILE_VOCABULARY_TODAY_HISTORY_SYNC_SCHEMA_VERSION = 1;

window.MobileFirebaseAuthState = {
  status: "pending",
  user: null
};

function setAuthViewState(status) {
  const body = document.body;
  if (!body) return;
  body.classList.remove("auth-pending", "auth-logged-in", "auth-logged-out");
  body.classList.add(status);
  window.MobileFirebaseAuthState.status = status.replace("auth-", "");
}

function dispatchAuthState(user) {
  window.MobileFirebaseAuthState.user = user || null;
  document.dispatchEvent(new CustomEvent("mobile-firebase-auth-state", {
    detail: {
      status: window.MobileFirebaseAuthState.status,
      user: user || null
    }
  }));
}

function setLoginError(message) {
  const errorText = document.getElementById("mobileLoginErrorText");
  if (errorText) {
    errorText.textContent = message || "";
  }
}

function setLoginBusy(isBusy) {
  const submitButton = document.getElementById("mobileLoginSubmitBtn");
  const emailInput = document.getElementById("mobileLoginEmailInput");
  const passwordInput = document.getElementById("mobileLoginPasswordInput");
  if (submitButton) {
    submitButton.disabled = Boolean(isBusy);
    submitButton.textContent = isBusy ? "ログイン中..." : "ログイン";
  }
  if (emailInput) emailInput.disabled = Boolean(isBusy);
  if (passwordInput) passwordInput.disabled = Boolean(isBusy);
}

function setLogoutVisibility(isVisible) {
  const logoutButton = document.getElementById("mobileLogoutBtn");
  if (logoutButton) {
    logoutButton.classList.toggle("hidden", !isVisible);
  }
}

function getFirebaseAuthErrorMessage(error) {
  const code = String(error?.code || "");
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (code === "auth/invalid-email") {
    return "メールアドレスの形式が正しくありません。";
  }
  if (code === "auth/too-many-requests") {
    return "試行回数が多すぎます。時間をおいて再度ログインしてください。";
  }
  if (code === "auth/network-request-failed") {
    return "ネットワーク接続を確認してください。";
  }
  return "ログインに失敗しました。";
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  const emailInput = document.getElementById("mobileLoginEmailInput");
  const passwordInput = document.getElementById("mobileLoginPasswordInput");
  const email = String(emailInput?.value || "").trim();
  const password = String(passwordInput?.value || "");

  setLoginError("");
  if (!email || !password) {
    setLoginError("メールアドレスとパスワードを入力してください。");
    return;
  }

  try {
    setLoginBusy(true);
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    setLoginError(getFirebaseAuthErrorMessage(error));
  } finally {
    setLoginBusy(false);
  }
}

async function handleLogoutClick() {
  try {
    await signOut(auth);
  } catch (_error) {
    setLoginError("ログアウトに失敗しました。");
  }
}

function bindAuthUi() {
  const loginForm = document.getElementById("mobileLoginForm");
  const logoutButton = document.getElementById("mobileLogoutBtn");
  if (loginForm && !loginForm.dataset.authBound) {
    loginForm.addEventListener("submit", handleLoginSubmit);
    loginForm.dataset.authBound = "true";
  }
  if (logoutButton && !logoutButton.dataset.authBound) {
    logoutButton.addEventListener("click", handleLogoutClick);
    logoutButton.dataset.authBound = "true";
  }
}

async function saveMobileLearningHistoryToFirestore(historyEntry) {
  const user = auth.currentUser;
  if (!user || !historyEntry || typeof historyEntry !== "object") {
    return false;
  }

  if (Math.max(0, Number(historyEntry.questionCount) || 0) === 0) {
    return false;
  }

  const normalizedDeviceType = String(historyEntry.deviceType || "").trim().toLowerCase() === "pc" ? "pc" : "mobile";
  const normalizedDeviceId = String(historyEntry.deviceId || "").trim();
  const normalizedDeviceName = String(historyEntry.deviceName || "").trim();
  const normalizedEarnedPoints = (() => {
    const raw = historyEntry.earnedPoints;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return Math.max(0, Math.floor(raw));
    }
    const text = String(raw ?? "").trim();
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
  })();

  const payload = {
    uid: String(user.uid || ""),
    email: String(user.email || ""),
    studyDate: String(historyEntry.learnedAt || historyEntry.endedAtDisplay || ""),
    startedAt: Number(historyEntry.startedAt) || 0,
    endedAt: Number(historyEntry.endedAt) || 0,
    activeStudySeconds: Math.max(0, Number(historyEntry.activeStudySeconds) || 0),
    mode: String(historyEntry.mode || ""),
    dayNumber: String(historyEntry.dayNumber || ""),
    questionCount: Math.max(0, Number(historyEntry.questionCount) || 0),
    correctCount: Math.max(0, Number(historyEntry.correctCount) || 0),
    earnedPoints: normalizedEarnedPoints,
    accuracy: Math.max(0, Math.min(100, Number(historyEntry.accuracy) || 0)),
    completedReason: String(historyEntry.completedReason || "completed"),
    ticketEarned: Math.max(0, Number(historyEntry?.ticket?.earned?.count) || 0),
    ticketUsed: Math.max(0, Number(historyEntry?.ticket?.used?.count) || 0),
    deviceType: normalizedDeviceType,
    deviceId: normalizedDeviceId,
    deviceName: normalizedDeviceName,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(firestore, "users", user.uid, "learningHistory"), payload);
    console.log("Mobile learning history saved to Firestore");
    return true;
  } catch (error) {
    console.error("Failed to save mobile learning history to Firestore", error);
    return false;
  }
}

function getMobilePointJstDateKey(offsetDays = 0) {
  const base = Date.now() + (Number(offsetDays || 0) * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date(base)).map((part) => [part.type, part.value]));
  return `${parts.year || "0000"}-${parts.month || "00"}-${parts.day || "00"}`;
}

function createDefaultMobilePointState() {
  return {
    homeworkSpeakingPointsByDate: {},
    homeworkSpeakingCompletionsByDate: {},
    reviewSpeakingPointsByDate: {},
    reviewSpeakingCountByDate: {},
    wordOrderPointsByDate: {},
    translationTrainingPointsByDate: {},
    dailyEarnedByDate: {},
    dailyEarnedByModeByDate: {},
    todayEarned: 0,
    previousDayEarned: 0,
    totalEarned: 0
  };
}

function sanitizePointNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function sanitizePointDayMap(value) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).map(([dayKey, points]) => [String(dayKey), sanitizePointNumber(points)])
  );
}

function sanitizePointModeMapByDay(value) {
  if (!value || typeof value !== "object") return {};
  const next = {};
  Object.entries(value).forEach(([dayKey, modeMap]) => {
    if (!modeMap || typeof modeMap !== "object") return;
    next[String(dayKey)] = Object.fromEntries(
      Object.entries(modeMap).map(([modeKey, points]) => [String(modeKey), sanitizePointNumber(points)])
    );
  });
  return next;
}

function sanitizeMobilePointState(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    homeworkSpeakingPointsByDate: sanitizePointDayMap(source.homeworkSpeakingPointsByDate),
    homeworkSpeakingCompletionsByDate: sanitizePointDayMap(source.homeworkSpeakingCompletionsByDate),
    reviewSpeakingPointsByDate: sanitizePointDayMap(source.reviewSpeakingPointsByDate),
    reviewSpeakingCountByDate: sanitizePointDayMap(source.reviewSpeakingCountByDate),
    wordOrderPointsByDate: sanitizePointDayMap(source.wordOrderPointsByDate),
    translationTrainingPointsByDate: sanitizePointDayMap(source.translationTrainingPointsByDate),
    dailyEarnedByDate: sanitizePointDayMap(source.dailyEarnedByDate),
    dailyEarnedByModeByDate: sanitizePointModeMapByDay(source.dailyEarnedByModeByDate),
    todayEarned: sanitizePointNumber(source.todayEarned),
    previousDayEarned: sanitizePointNumber(source.previousDayEarned),
    totalEarned: sanitizePointNumber(source.totalEarned)
  };
}

function sumPointMap(mapLike) {
  return Object.values(mapLike || {}).reduce((sum, value) => sum + sanitizePointNumber(value), 0);
}

function hydrateMobilePointState(state) {
  const next = sanitizeMobilePointState(state);
  const todayKey = getMobilePointJstDateKey(0);
  const previousKey = getMobilePointJstDateKey(-1);
  const todayFromDedicated =
    sanitizePointNumber(next.homeworkSpeakingPointsByDate?.[todayKey]) +
    sanitizePointNumber(next.reviewSpeakingPointsByDate?.[todayKey]) +
    sanitizePointNumber(next.wordOrderPointsByDate?.[todayKey]) +
    sanitizePointNumber(next.translationTrainingPointsByDate?.[todayKey]);
  const previousFromDedicated =
    sanitizePointNumber(next.homeworkSpeakingPointsByDate?.[previousKey]) +
    sanitizePointNumber(next.reviewSpeakingPointsByDate?.[previousKey]) +
    sanitizePointNumber(next.wordOrderPointsByDate?.[previousKey]) +
    sanitizePointNumber(next.translationTrainingPointsByDate?.[previousKey]);
  const todayFromLegacy = sanitizePointNumber(next.dailyEarnedByDate?.[todayKey]);
  const previousFromLegacy = sanitizePointNumber(next.dailyEarnedByDate?.[previousKey]);

  const dedicatedTotal =
    sumPointMap(next.homeworkSpeakingPointsByDate) +
    sumPointMap(next.reviewSpeakingPointsByDate) +
    sumPointMap(next.wordOrderPointsByDate) +
    sumPointMap(next.translationTrainingPointsByDate);
  const legacyTotal = sumPointMap(next.dailyEarnedByDate);

  next.todayEarned = Math.max(next.todayEarned, todayFromDedicated, todayFromLegacy);
  next.previousDayEarned = Math.max(next.previousDayEarned, previousFromDedicated, previousFromLegacy);
  next.totalEarned = Math.max(next.totalEarned, dedicatedTotal, legacyTotal);
  return next;
}

function mergePointDayMapByMax(baseMap, incomingMap) {
  const merged = { ...sanitizePointDayMap(baseMap) };
  Object.entries(sanitizePointDayMap(incomingMap)).forEach(([dayKey, value]) => {
    const current = sanitizePointNumber(merged[dayKey]);
    merged[dayKey] = Math.max(current, sanitizePointNumber(value));
  });
  return merged;
}

function mergePointModeMapByDayMax(baseMap, incomingMap) {
  const merged = sanitizePointModeMapByDay(baseMap);
  const nextIncoming = sanitizePointModeMapByDay(incomingMap);
  Object.entries(nextIncoming).forEach(([dayKey, modeMap]) => {
    const currentModeMap = merged[dayKey] && typeof merged[dayKey] === "object" ? merged[dayKey] : {};
    const mergedModeMap = { ...currentModeMap };
    Object.entries(modeMap).forEach(([modeKey, value]) => {
      mergedModeMap[modeKey] = Math.max(sanitizePointNumber(mergedModeMap[modeKey]), sanitizePointNumber(value));
    });
    merged[dayKey] = mergedModeMap;
  });
  return merged;
}

function mergeMobilePointStateByMax(baseState, incomingState) {
  const base = hydrateMobilePointState(baseState);
  const incoming = hydrateMobilePointState(incomingState);
  return hydrateMobilePointState({
    homeworkSpeakingPointsByDate: mergePointDayMapByMax(base.homeworkSpeakingPointsByDate, incoming.homeworkSpeakingPointsByDate),
    homeworkSpeakingCompletionsByDate: mergePointDayMapByMax(base.homeworkSpeakingCompletionsByDate, incoming.homeworkSpeakingCompletionsByDate),
    reviewSpeakingPointsByDate: mergePointDayMapByMax(base.reviewSpeakingPointsByDate, incoming.reviewSpeakingPointsByDate),
    reviewSpeakingCountByDate: mergePointDayMapByMax(base.reviewSpeakingCountByDate, incoming.reviewSpeakingCountByDate),
    wordOrderPointsByDate: mergePointDayMapByMax(base.wordOrderPointsByDate, incoming.wordOrderPointsByDate),
    translationTrainingPointsByDate: mergePointDayMapByMax(base.translationTrainingPointsByDate, incoming.translationTrainingPointsByDate),
    dailyEarnedByDate: mergePointDayMapByMax(base.dailyEarnedByDate, incoming.dailyEarnedByDate),
    dailyEarnedByModeByDate: mergePointModeMapByDayMax(base.dailyEarnedByModeByDate, incoming.dailyEarnedByModeByDate),
    todayEarned: Math.max(base.todayEarned, incoming.todayEarned),
    previousDayEarned: Math.max(base.previousDayEarned, incoming.previousDayEarned),
    totalEarned: Math.max(base.totalEarned, incoming.totalEarned)
  });
}

function getMobilePointDocRef(targetUid = "") {
  const uid = String(targetUid || auth.currentUser?.uid || "").trim();
  if (!uid) return null;
  return doc(firestore, "users", uid, MOBILE_POINT_SYNC_DOC_COLLECTION, MOBILE_POINT_SYNC_DOC_ID);
}

function normalizeMobilePointDoc(docData) {
  const source = docData && typeof docData === "object" ? docData : {};
  const pointState = hydrateMobilePointState(source.pointState);
  return {
    pointState,
    updatedAtMs: sanitizePointNumber(source.updatedAtMs),
    sourceDeviceId: String(source.sourceDeviceId || "").trim(),
    sourceDeviceName: String(source.sourceDeviceName || "").trim(),
    schemaVersion: sanitizePointNumber(source.schemaVersion) || MOBILE_POINT_SYNC_SCHEMA_VERSION
  };
}

async function loadMobilePointStateFromFirestore(options = {}) {
  const currentUid = String(auth.currentUser?.uid || "").trim();
  const targetUid = String(options?.targetUid || currentUid || "").trim();
  const ref = getMobilePointDocRef(targetUid);
  const path = ref ? `users/${targetUid}/mobileSync/pointStateV1` : "users/<unknown>/mobileSync/pointStateV1";
  if (!ref || !targetUid) {
    console.log("[Point DEBUG]\ncurrentUid:", currentUid, "\nuid:", targetUid, "\npath:", path);
    return { ok: false, exists: false, uid: targetUid, pointState: null };
  }

  console.log("[Point DEBUG]\ncurrentUid:", currentUid, "\nuid:", targetUid, "\npath:", path);
  try {
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return { ok: true, exists: false, uid: targetUid, pointState: null };
    }
    const normalized = normalizeMobilePointDoc(snapshot.data());
    return {
      ok: true,
      exists: true,
      uid: targetUid,
      pointState: normalized.pointState,
      updatedAtMs: normalized.updatedAtMs,
      sourceDeviceId: normalized.sourceDeviceId,
      sourceDeviceName: normalized.sourceDeviceName,
      schemaVersion: normalized.schemaVersion
    };
  } catch (error) {
    console.error("[Point ERROR]\ncode:", error?.code || "", "\nmessage:", error?.message || "", "\ncurrentUid:", currentUid, "\nuid:", targetUid, "\npath:", path);
    return { ok: false, exists: false, uid: targetUid, pointState: null, error };
  }
}

async function saveMobilePointStateToFirestore(pointState, options = {}) {
  const user = auth.currentUser;
  const targetUid = String(options?.targetUid || user?.uid || "").trim();
  const ref = getMobilePointDocRef(targetUid);
  if (!ref || !targetUid || !pointState || typeof pointState !== "object") {
    return { ok: false, saved: false, exists: false, uid: targetUid };
  }

  const allowCreate = options?.allowCreate === true;
  const normalizedIncoming = hydrateMobilePointState(pointState);
  const sourceDeviceId = String(options?.sourceDeviceId || "").trim();
  const sourceDeviceName = String(options?.sourceDeviceName || "").trim();

  try {
    const result = await runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const existsBefore = snapshot.exists();
      if (!existsBefore && !allowCreate) {
        return {
          saved: false,
          existsBefore,
          skipped: "missing-remote",
          pointState: null
        };
      }

      const currentState = existsBefore
        ? normalizeMobilePointDoc(snapshot.data()).pointState
        : createDefaultMobilePointState();
      const mergedState = existsBefore
        ? mergeMobilePointStateByMax(currentState, normalizedIncoming)
        : normalizedIncoming;

      transaction.set(ref, {
        uid: targetUid,
        pointState: mergedState,
        totalEarned: sanitizePointNumber(mergedState.totalEarned),
        todayEarned: sanitizePointNumber(mergedState.todayEarned),
        previousDayEarned: sanitizePointNumber(mergedState.previousDayEarned),
        sourceDeviceId,
        sourceDeviceName,
        schemaVersion: MOBILE_POINT_SYNC_SCHEMA_VERSION,
        updatedAtMs: Date.now(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      return {
        saved: true,
        existsBefore,
        pointState: mergedState
      };
    });

    return {
      ok: true,
      saved: Boolean(result?.saved),
      exists: Boolean(result?.existsBefore),
      uid: targetUid,
      skipped: result?.skipped || "",
      pointState: result?.pointState || null
    };
  } catch (error) {
    console.error("Failed to save mobile point state to Firestore", error);
    return { ok: false, saved: false, exists: false, uid: targetUid, error };
  }
}

function subscribeMobilePointStateFromFirestore(onChange, options = {}) {
  if (typeof onChange !== "function") {
    return () => {};
  }
  const targetUid = String(options?.targetUid || auth.currentUser?.uid || "").trim();
  const ref = getMobilePointDocRef(targetUid);
  if (!ref || !targetUid) {
    return () => {};
  }

  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      onChange({ ok: true, exists: false, uid: targetUid, pointState: null });
      return;
    }
    const normalized = normalizeMobilePointDoc(snapshot.data());
    onChange({
      ok: true,
      exists: true,
      uid: targetUid,
      pointState: normalized.pointState,
      updatedAtMs: normalized.updatedAtMs,
      sourceDeviceId: normalized.sourceDeviceId,
      sourceDeviceName: normalized.sourceDeviceName,
      schemaVersion: normalized.schemaVersion
    });
  }, (error) => {
    onChange({ ok: false, exists: false, uid: targetUid, pointState: null, error });
  });
}

function sanitizeWordOrderStatsEntry(value) {
  const attempts = Math.max(0, Math.floor(Number(value?.attempts) || 0));
  const correct = Math.max(0, Math.min(attempts, Math.floor(Number(value?.correct) || 0)));
  return { attempts, correct };
}

function sanitizeWordOrderStatsMap(value) {
  const source = value && typeof value === "object" ? value : {};
  const next = {};
  Object.entries(source).forEach(([questionId, entry]) => {
    const key = String(questionId || "").trim();
    if (!key) return;
    next[key] = sanitizeWordOrderStatsEntry(entry || {});
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

function getMobileWordOrderStatsDocRef(targetUid = "") {
  const uid = String(targetUid || auth.currentUser?.uid || "").trim();
  if (!uid) return null;
  return doc(firestore, "users", uid, MOBILE_WORD_ORDER_SYNC_DOC_COLLECTION, MOBILE_WORD_ORDER_SYNC_DOC_ID);
}

function normalizeMobileWordOrderStatsDoc(docData) {
  const source = docData && typeof docData === "object" ? docData : {};
  return {
    statsMap: sanitizeWordOrderStatsMap(source.statsMap),
    updatedAtMs: sanitizePointNumber(source.updatedAtMs),
    sourceDeviceId: String(source.sourceDeviceId || "").trim(),
    sourceDeviceName: String(source.sourceDeviceName || "").trim(),
    schemaVersion: sanitizePointNumber(source.schemaVersion) || MOBILE_WORD_ORDER_SYNC_SCHEMA_VERSION
  };
}

async function loadMobileWordOrderStatsFromFirestore(options = {}) {
  const targetUid = String(options?.targetUid || auth.currentUser?.uid || "").trim();
  const ref = getMobileWordOrderStatsDocRef(targetUid);
  if (!ref || !targetUid) {
    return { ok: false, exists: false, uid: targetUid, statsMap: null };
  }

  try {
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return { ok: true, exists: false, uid: targetUid, statsMap: null };
    }
    const normalized = normalizeMobileWordOrderStatsDoc(snapshot.data());
    return {
      ok: true,
      exists: true,
      uid: targetUid,
      statsMap: normalized.statsMap,
      updatedAtMs: normalized.updatedAtMs,
      sourceDeviceId: normalized.sourceDeviceId,
      sourceDeviceName: normalized.sourceDeviceName,
      schemaVersion: normalized.schemaVersion
    };
  } catch (error) {
    console.error("Failed to load mobile word order stats from Firestore", error);
    return { ok: false, exists: false, uid: targetUid, statsMap: null, error };
  }
}

async function saveMobileWordOrderStatsToFirestore(statsMap, options = {}) {
  const user = auth.currentUser;
  const targetUid = String(options?.targetUid || user?.uid || "").trim();
  const ref = getMobileWordOrderStatsDocRef(targetUid);
  if (!ref || !targetUid || !statsMap || typeof statsMap !== "object") {
    return { ok: false, saved: false, exists: false, uid: targetUid };
  }

  const allowCreate = options?.allowCreate === true;
  const normalizedIncoming = sanitizeWordOrderStatsMap(statsMap);
  const sourceDeviceId = String(options?.sourceDeviceId || "").trim();
  const sourceDeviceName = String(options?.sourceDeviceName || "").trim();

  try {
    const result = await runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const existsBefore = snapshot.exists();
      if (!existsBefore && !allowCreate) {
        return {
          saved: false,
          existsBefore,
          skipped: "missing-remote",
          statsMap: null
        };
      }

      const currentStatsMap = existsBefore
        ? normalizeMobileWordOrderStatsDoc(snapshot.data()).statsMap
        : {};
      const mergedStatsMap = mergeWordOrderStatsMapByMax(currentStatsMap, normalizedIncoming);

      transaction.set(ref, {
        uid: targetUid,
        statsMap: mergedStatsMap,
        sourceDeviceId,
        sourceDeviceName,
        schemaVersion: MOBILE_WORD_ORDER_SYNC_SCHEMA_VERSION,
        updatedAtMs: Date.now(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      return {
        saved: true,
        existsBefore,
        statsMap: mergedStatsMap
      };
    });

    return {
      ok: true,
      saved: Boolean(result?.saved),
      exists: Boolean(result?.existsBefore),
      uid: targetUid,
      skipped: result?.skipped || "",
      statsMap: result?.statsMap || null
    };
  } catch (error) {
    console.error("Failed to save mobile word order stats to Firestore", error);
    return { ok: false, saved: false, exists: false, uid: targetUid, error };
  }
}

function subscribeMobileWordOrderStatsFromFirestore(onChange, options = {}) {
  if (typeof onChange !== "function") {
    return () => {};
  }
  const targetUid = String(options?.targetUid || auth.currentUser?.uid || "").trim();
  const ref = getMobileWordOrderStatsDocRef(targetUid);
  if (!ref || !targetUid) {
    return () => {};
  }

  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      onChange({ ok: true, exists: false, uid: targetUid, statsMap: null });
      return;
    }
    const normalized = normalizeMobileWordOrderStatsDoc(snapshot.data());
    onChange({
      ok: true,
      exists: true,
      uid: targetUid,
      statsMap: normalized.statsMap,
      updatedAtMs: normalized.updatedAtMs,
      sourceDeviceId: normalized.sourceDeviceId,
      sourceDeviceName: normalized.sourceDeviceName,
      schemaVersion: normalized.schemaVersion
    });
  }, (error) => {
    onChange({ ok: false, exists: false, uid: targetUid, statsMap: null, error });
  });
}

function getMobileVocabularyTodayHistoryStateDocRef(targetUid = "") {
  const uid = String(targetUid || auth.currentUser?.uid || "").trim();
  if (!uid) return null;
  return doc(firestore, "users", uid, MOBILE_VOCABULARY_TODAY_HISTORY_SYNC_DOC_COLLECTION, MOBILE_VOCABULARY_TODAY_HISTORY_SYNC_DOC_ID);
}

function sanitizeVocabularyTodayHistoryMapForSync(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const next = {};
  Object.entries(source).forEach(([dateKey, bucket]) => {
    const normalizedDateKey = String(dateKey || "").trim();
    if (!normalizedDateKey || !bucket || typeof bucket !== "object" || Array.isArray(bucket)) {
      return;
    }
    const safeBucket = {};
    Object.entries(bucket).forEach(([wordKey, entry]) => {
      const normalizedWordKey = String(wordKey || "").trim();
      if (!normalizedWordKey || !entry || typeof entry !== "object") return;
      const word = String(entry.word || "").trim();
      if (!word) return;
      safeBucket[normalizedWordKey] = {
        word,
        partOfSpeech: String(entry.partOfSpeech || "").trim(),
        grade: String(entry.grade || entry.level || entry.sourceLevel || "5").trim() || "5",
        pronunciation: String(entry.pronunciation || "—").trim() || "—",
        pronunciationText: String(entry.pronunciationText || "").trim(),
        meaning: String(entry.meaning || "—").trim() || "—",
        meaningText: String(entry.meaningText || "").trim(),
        pronunciationTeacherCheck: ["none", "◎", "△"].includes(String(entry.pronunciationTeacherCheck || "").trim()) ? String(entry.pronunciationTeacherCheck || "").trim() : "none",
        meaningTeacherCheck: ["none", "◎", "△"].includes(String(entry.meaningTeacherCheck || "").trim()) ? String(entry.meaningTeacherCheck || "").trim() : "none",
        lastJudgedAt: Number(entry.lastJudgedAt) || 0
      };
    });
    if (Object.keys(safeBucket).length || Object.keys(bucket).length === 0) {
      next[normalizedDateKey] = safeBucket;
    }
  });
  return next;
}

function normalizeMobileVocabularyTodayHistoryStateDoc(docData) {
  const source = docData && typeof docData === "object" ? docData : {};
  const historyMap = sanitizeVocabularyTodayHistoryMapForSync(source.historyMap || source.vocabularyTodayHistoryMap || source.map || {});
  return {
    historyMap,
    updatedAtMs: Math.max(0, Number(source.updatedAtMs) || 0),
    sourceDeviceId: String(source.sourceDeviceId || "").trim(),
    sourceDeviceName: String(source.sourceDeviceName || "").trim(),
    schemaVersion: Math.max(0, Number(source.schemaVersion) || MOBILE_VOCABULARY_TODAY_HISTORY_SYNC_SCHEMA_VERSION)
  };
}

async function loadMobileVocabularyTodayHistoryStateFromFirestore(options = {}) {
  const currentUid = String(auth.currentUser?.uid || "").trim();
  const targetUid = String(options?.targetUid || currentUid || "").trim();
  const ref = getMobileVocabularyTodayHistoryStateDocRef(targetUid);
  if (!ref || !targetUid) {
    return { ok: false, exists: false, uid: targetUid, historyMap: null };
  }

  try {
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      return { ok: true, exists: false, uid: targetUid, historyMap: null };
    }
    const normalized = normalizeMobileVocabularyTodayHistoryStateDoc(snapshot.data());
    return {
      ok: true,
      exists: true,
      uid: targetUid,
      historyMap: normalized.historyMap,
      updatedAtMs: normalized.updatedAtMs,
      sourceDeviceId: normalized.sourceDeviceId,
      sourceDeviceName: normalized.sourceDeviceName,
      schemaVersion: normalized.schemaVersion
    };
  } catch (error) {
    console.error("Failed to load mobile vocabulary today history state from Firestore", error);
    return { ok: false, exists: false, uid: targetUid, historyMap: null, error };
  }
}

async function saveMobileVocabularyTodayHistoryStateToFirestore(historyMap, options = {}) {
  const user = auth.currentUser;
  const targetUid = String(options?.targetUid || user?.uid || "").trim();
  const ref = getMobileVocabularyTodayHistoryStateDocRef(targetUid);
  if (!ref || !targetUid || !historyMap || typeof historyMap !== "object") {
    return { ok: false, saved: false, exists: false, uid: targetUid };
  }

  const allowCreate = options?.allowCreate === true;
  const normalizedIncoming = sanitizeVocabularyTodayHistoryMapForSync(historyMap);
  const sourceDeviceId = String(options?.sourceDeviceId || "").trim();
  const sourceDeviceName = String(options?.sourceDeviceName || "").trim();

  try {
    const result = await runTransaction(firestore, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const existsBefore = snapshot.exists();
      if (!existsBefore && !allowCreate) {
        return {
          saved: false,
          existsBefore,
          skipped: "missing-remote",
          historyMap: null
        };
      }

      const currentHistoryMap = existsBefore
        ? normalizeMobileVocabularyTodayHistoryStateDoc(snapshot.data()).historyMap
        : {};
      const mergedHistoryMap = { ...currentHistoryMap };
      Object.entries(normalizedIncoming).forEach(([dateKey, bucket]) => {
        const currentBucket = mergedHistoryMap[dateKey] && typeof mergedHistoryMap[dateKey] === "object" ? mergedHistoryMap[dateKey] : {};
        const mergedBucket = { ...currentBucket };
        Object.entries(bucket).forEach(([wordKey, incomingEntry]) => {
          const currentEntry = mergedBucket[wordKey] || null;
          if (!currentEntry) {
            mergedBucket[wordKey] = incomingEntry;
            return;
          }
          const left = Number(currentEntry.lastJudgedAt) || 0;
          const right = Number(incomingEntry?.lastJudgedAt) || 0;
          mergedBucket[wordKey] = right >= left ? incomingEntry : currentEntry;
        });
        mergedHistoryMap[dateKey] = mergedBucket;
      });

      transaction.set(ref, {
        uid: targetUid,
        historyMap: mergedHistoryMap,
        sourceDeviceId,
        sourceDeviceName,
        schemaVersion: MOBILE_VOCABULARY_TODAY_HISTORY_SYNC_SCHEMA_VERSION,
        updatedAtMs: Date.now(),
        updatedAt: serverTimestamp()
      }, { merge: true });

      return { saved: true, existsBefore, historyMap: mergedHistoryMap };
    });

    return {
      ok: true,
      saved: Boolean(result?.saved),
      exists: Boolean(result?.existsBefore),
      uid: targetUid,
      skipped: result?.skipped || "",
      historyMap: result?.historyMap || null
    };
  } catch (error) {
    console.error("Failed to save mobile vocabulary today history state to Firestore", error);
    return { ok: false, saved: false, exists: false, uid: targetUid, error };
  }
}

function subscribeMobileVocabularyTodayHistoryStateFromFirestore(onChange, options = {}) {
  if (typeof onChange !== "function") {
    return () => {};
  }
  const targetUid = String(options?.targetUid || auth.currentUser?.uid || "").trim();
  const ref = getMobileVocabularyTodayHistoryStateDocRef(targetUid);
  if (!ref || !targetUid) {
    return () => {};
  }

  return onSnapshot(ref, (snapshot) => {
    if (!snapshot.exists()) {
      onChange({ ok: true, exists: false, uid: targetUid, historyMap: null });
      return;
    }
    const normalized = normalizeMobileVocabularyTodayHistoryStateDoc(snapshot.data());
    onChange({
      ok: true,
      exists: true,
      uid: targetUid,
      historyMap: normalized.historyMap,
      updatedAtMs: normalized.updatedAtMs,
      sourceDeviceId: normalized.sourceDeviceId,
      sourceDeviceName: normalized.sourceDeviceName,
      schemaVersion: normalized.schemaVersion
    });
  }, (error) => {
    onChange({ ok: false, exists: false, uid: targetUid, historyMap: null, error });
  });
}

window.loadMobileVocabularyTodayHistoryStateFromFirestore = loadMobileVocabularyTodayHistoryStateFromFirestore;
window.saveMobileVocabularyTodayHistoryStateToFirestore = saveMobileVocabularyTodayHistoryStateToFirestore;
window.subscribeMobileVocabularyTodayHistoryStateFromFirestore = subscribeMobileVocabularyTodayHistoryStateFromFirestore;

function getMobileVocabularyStateDocRef(targetUid = "") {
  const uid = String(targetUid || auth.currentUser?.uid || "").trim();
  if (!uid) return null;
  return doc(firestore, "users", uid, MOBILE_VOCABULARY_SYNC_DOC_COLLECTION, MOBILE_VOCABULARY_SYNC_DOC_ID);
}

function getMobileVocabularyStateChunkCollectionRef(targetUid = "") {
  const uid = String(targetUid || auth.currentUser?.uid || "").trim();
  if (!uid) return null;
  return collection(
    firestore,
    "users",
    uid,
    MOBILE_VOCABULARY_SYNC_DOC_COLLECTION,
    MOBILE_VOCABULARY_SYNC_CHUNK_COLLECTION,
    MOBILE_VOCABULARY_SYNC_CHUNK_SUBCOLLECTION
  );
}

function getMobileVocabularyStateChunkDocRef(targetUid = "", chunkId = "") {
  const uid = String(targetUid || auth.currentUser?.uid || "").trim();
  const safeChunkId = String(chunkId || "").trim();
  if (!uid || !safeChunkId) return null;
  return doc(
    firestore,
    "users",
    uid,
    MOBILE_VOCABULARY_SYNC_DOC_COLLECTION,
    MOBILE_VOCABULARY_SYNC_CHUNK_COLLECTION,
    MOBILE_VOCABULARY_SYNC_CHUNK_SUBCOLLECTION,
    safeChunkId
  );
}

function sanitizeVocabularyStudyStateForSync(value) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value.entries)) {
    return value;
  }
  if (Array.isArray(value.studyState?.entries)) {
    return value.studyState;
  }
  return null;
}

function getVocabularyStateChunkIndexFromChunkId(chunkId = "") {
  const safeChunkId = String(chunkId || "").trim();
  const match = safeChunkId.match(/-(\d+)$/);
  const numeric = match ? Number(match[1]) : 0;
  return Number.isFinite(numeric) ? Math.max(0, numeric) : 0;
}

function buildVocabularyStateChunkIdForIndex(index = 0) {
  const numericIndex = Math.max(0, Number(index) || 0);
  return `${MOBILE_VOCABULARY_SYNC_CHUNK_PREFIX}-${String(Math.floor(numericIndex / MOBILE_VOCABULARY_SYNC_CHUNK_SIZE)).padStart(3, "0")}`;
}

function getVocabularyStateChunkIdForEntryId(studyState, entryId = "") {
  const targetId = String(entryId || "").trim();
  if (!targetId) return "";
  const entries = Array.isArray(studyState?.entries) ? studyState.entries : [];
  const foundIndex = entries.findIndex((entry) => String(entry?.id || entry?.word || "").trim() === targetId);
  if (foundIndex < 0) return "";
  return buildVocabularyStateChunkIdForIndex(foundIndex);
}

function getVocabularyStateChunkIdsForStudyState(studyState) {
  const entries = Array.isArray(studyState?.entries) ? studyState.entries : [];
  const chunks = new Set();
  entries.forEach((entry, index) => {
    const entryId = String(entry?.id || entry?.word || "").trim();
    if (!entryId) return;
    chunks.add(buildVocabularyStateChunkIdForIndex(index));
  });
  return [...chunks].sort((a, b) => getVocabularyStateChunkIndexFromChunkId(a) - getVocabularyStateChunkIndexFromChunkId(b));
}

function getVocabularyStateEntriesForChunk(studyState, chunkId = "") {
  const safeChunkId = String(chunkId || "").trim();
  const entries = Array.isArray(studyState?.entries) ? studyState.entries : [];
  if (!safeChunkId || !entries.length) return [];
  const chunkIndex = getVocabularyStateChunkIndexFromChunkId(safeChunkId);
  const start = chunkIndex * MOBILE_VOCABULARY_SYNC_CHUNK_SIZE;
  const end = start + MOBILE_VOCABULARY_SYNC_CHUNK_SIZE;
  return entries.slice(start, end);
}

function normalizeMobileVocabularyStateChunkDoc(docData) {
  const source = docData && typeof docData === "object" ? docData : {};
  const chunkId = String(source.chunkId || "").trim();
  const entries = Array.isArray(source.entries) ? source.entries : [];
  return {
    chunkId,
    entries,
    updatedAtMs: Math.max(0, Number(source.updatedAtMs) || 0),
    sourceDeviceId: String(source.sourceDeviceId || "").trim(),
    sourceDeviceName: String(source.sourceDeviceName || "").trim(),
    schemaVersion: Math.max(0, Number(source.schemaVersion) || MOBILE_VOCABULARY_SYNC_SCHEMA_VERSION)
  };
}

function normalizeMobileVocabularyStateDoc(docData) {
  const source = docData && typeof docData === "object" ? docData : {};
  const studyState = sanitizeVocabularyStudyStateForSync(source.studyState) || sanitizeVocabularyStudyStateForSync(source.vocabularyStudy) || null;
  return {
    studyState,
    updatedAtMs: Math.max(0, Number(source.updatedAtMs) || 0),
    resetVersion: Math.max(0, Number(source.resetVersion || source.vocabularyResetVersion || 0) || 0),
    resetAtMs: Math.max(0, Number(source.resetAtMs || source.vocabularyResetAtMs || 0) || 0),
    sourceDeviceId: String(source.sourceDeviceId || "").trim(),
    sourceDeviceName: String(source.sourceDeviceName || "").trim(),
    schemaVersion: Math.max(0, Number(source.schemaVersion) || MOBILE_VOCABULARY_SYNC_SCHEMA_VERSION)
  };
}

async function loadMobileVocabularyStateFromFirestore(options = {}) {
  const currentUid = String(auth.currentUser?.uid || "").trim();
  const targetUid = String(options?.targetUid || currentUid || "").trim();
  const collectionRef = getMobileVocabularyStateChunkCollectionRef(targetUid);
  if (!collectionRef || !targetUid) {
    return { ok: false, exists: false, uid: targetUid, studyState: null };
  }

  try {
    const snapshot = await getDocs(collectionRef);
    if (snapshot.empty) {
      return { ok: true, exists: false, uid: targetUid, studyState: null };
    }

    const chunkDocs = snapshot.docs
      .map((docSnap) => normalizeMobileVocabularyStateChunkDoc(docSnap.data()))
      .filter((chunk) => chunk && Array.isArray(chunk.entries) && chunk.entries.length)
      .sort((a, b) => getVocabularyStateChunkIndexFromChunkId(a.chunkId) - getVocabularyStateChunkIndexFromChunkId(b.chunkId));

    const mergedEntries = chunkDocs.flatMap((chunk) => chunk.entries);
    const studyState = mergedEntries.length
      ? { entries: mergedEntries, targetWordCount: mergedEntries.length }
      : null;

    return {
      ok: true,
      exists: Boolean(studyState),
      uid: targetUid,
      studyState,
      updatedAtMs: chunkDocs.reduce((maxValue, chunk) => Math.max(maxValue, Number(chunk.updatedAtMs) || 0), 0),
      resetVersion: 0,
      resetAtMs: 0,
      sourceDeviceId: "",
      sourceDeviceName: "",
      schemaVersion: MOBILE_VOCABULARY_SYNC_SCHEMA_VERSION
    };
  } catch (error) {
    console.error("Failed to load mobile vocabulary state chunks from Firestore", error);
    return { ok: false, exists: false, uid: targetUid, studyState: null, error };
  }
}

async function saveMobileVocabularyStateToFirestore(studyState, options = {}) {
  const user = auth.currentUser;
  const targetUid = String(options?.targetUid || user?.uid || "").trim();
  if (!targetUid || !studyState || typeof studyState !== "object") {
    return { ok: false, saved: false, exists: false, uid: targetUid };
  }

  const sourceDeviceId = String(options?.sourceDeviceId || "").trim();
  const sourceDeviceName = String(options?.sourceDeviceName || "").trim();
  const changedWordId = String(options?.changedWordId || "").trim();
  const safeStudyState = sanitizeVocabularyStudyStateForSync(studyState) || { entries: [] };
  const chunkIds = changedWordId
    ? [getVocabularyStateChunkIdForEntryId(safeStudyState, changedWordId)]
    : getVocabularyStateChunkIdsForStudyState(safeStudyState);
  const validChunkIds = chunkIds.filter(Boolean);

  if (!validChunkIds.length) {
    return { ok: false, saved: false, exists: false, uid: targetUid, skipped: "no-chunk" };
  }

  try {
    const result = await runTransaction(firestore, async (transaction) => {
      for (const chunkId of validChunkIds) {
        const chunkEntries = getVocabularyStateEntriesForChunk(safeStudyState, chunkId);
        const chunkRef = getMobileVocabularyStateChunkDocRef(targetUid, chunkId);
        if (!chunkRef) continue;
        transaction.set(chunkRef, {
          uid: targetUid,
          chunkId,
          entries: chunkEntries,
          sourceDeviceId,
          sourceDeviceName,
          schemaVersion: MOBILE_VOCABULARY_SYNC_SCHEMA_VERSION,
          updatedAtMs: Date.now(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      return {
        saved: true,
        chunkIds: validChunkIds,
        studyState: safeStudyState,
        changedWordId
      };
    });

    return {
      ok: true,
      saved: Boolean(result?.saved),
      exists: true,
      uid: targetUid,
      skipped: "",
      studyState: result?.studyState || safeStudyState,
      changedWordId,
      chunkIds: result?.chunkIds || validChunkIds
    };
  } catch (error) {
    console.error("Failed to save mobile vocabulary state chunks to Firestore", error);
    return { ok: false, saved: false, exists: false, uid: targetUid, error, changedWordId, chunkIds: validChunkIds };
  }
}

function subscribeMobileVocabularyStateFromFirestore(onChange, options = {}) {
  if (typeof onChange !== "function") {
    return () => {};
  }
  const targetUid = String(options?.targetUid || auth.currentUser?.uid || "").trim();
  const collectionRef = getMobileVocabularyStateChunkCollectionRef(targetUid);
  if (!collectionRef || !targetUid) {
    return () => {};
  }

  return onSnapshot(collectionRef, (snapshot) => {
    if (snapshot.empty) {
      onChange({ ok: true, exists: false, uid: targetUid, studyState: null });
      return;
    }

    const mergedDocs = snapshot.docs
      .map((docSnap) => normalizeMobileVocabularyStateChunkDoc(docSnap.data()))
      .filter((chunk) => chunk && Array.isArray(chunk.entries) && chunk.entries.length)
      .sort((a, b) => getVocabularyStateChunkIndexFromChunkId(a.chunkId) - getVocabularyStateChunkIndexFromChunkId(b.chunkId));

    const mergedEntries = mergedDocs.flatMap((chunk) => chunk.entries);
    const studyState = mergedEntries.length ? { entries: mergedEntries, targetWordCount: mergedEntries.length } : null;
    onChange({
      ok: true,
      exists: Boolean(studyState),
      uid: targetUid,
      studyState,
      updatedAtMs: mergedDocs.reduce((maxValue, chunk) => Math.max(maxValue, Number(chunk.updatedAtMs) || 0), 0),
      sourceDeviceId: "",
      sourceDeviceName: "",
      schemaVersion: MOBILE_VOCABULARY_SYNC_SCHEMA_VERSION
    });
  }, (error) => {
    onChange({ ok: false, exists: false, uid: targetUid, studyState: null, error });
  });
}

async function initMobileFirebaseAuthUi() {
  bindAuthUi();
  setLoginBusy(false);
  setLoginError("");
  setLogoutVisibility(false);

  setAuthViewState("auth-pending");

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (_error) {
    // Keep default persistence when explicit local persistence is unavailable.
  }

  onAuthStateChanged(auth, (user) => {
    const emailInput = document.getElementById("mobileLoginEmailInput");
    const passwordInput = document.getElementById("mobileLoginPasswordInput");
    if (user) {
      setLoginError("");
      if (passwordInput) passwordInput.value = "";
      setLogoutVisibility(true);
      setAuthViewState("auth-logged-in");
      dispatchAuthState(user);
      return;
    }

    if (emailInput && !emailInput.value) {
      emailInput.focus();
    }
    if (passwordInput) passwordInput.value = "";
    setLogoutVisibility(false);
    setLoginBusy(false);
    setAuthViewState("auth-logged-out");
    dispatchAuthState(null);
  });
}

window.saveMobileLearningHistoryToFirestore = saveMobileLearningHistoryToFirestore;
window.loadMobilePointStateFromFirestore = loadMobilePointStateFromFirestore;
window.saveMobilePointStateToFirestore = saveMobilePointStateToFirestore;
window.subscribeMobilePointStateFromFirestore = subscribeMobilePointStateFromFirestore;
window.loadMobileWordOrderStatsFromFirestore = loadMobileWordOrderStatsFromFirestore;
window.saveMobileWordOrderStatsToFirestore = saveMobileWordOrderStatsToFirestore;
window.subscribeMobileWordOrderStatsFromFirestore = subscribeMobileWordOrderStatsFromFirestore;
window.loadMobileVocabularyStateFromFirestore = loadMobileVocabularyStateFromFirestore;
window.saveMobileVocabularyStateToFirestore = saveMobileVocabularyStateToFirestore;
window.subscribeMobileVocabularyStateFromFirestore = subscribeMobileVocabularyStateFromFirestore;
window.getMobileFirebaseCurrentUser = () => auth.currentUser || ({ email: "demo@example.com" });
window.MobileFirebase = Object.freeze({ app, auth, firestore });
window.MobileFirebaseReady = initMobileFirebaseAuthUi();
