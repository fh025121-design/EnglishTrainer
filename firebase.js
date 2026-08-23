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
  doc,
  collection,
  deleteDoc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  setDoc,
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

window.PcFirebaseAuthState = {
  status: "pending",
  user: null
};

console.log("Firebase connected");

function setAuthViewState(status) {
  const body = document.body;
  if (!body) return;
  body.classList.remove("auth-pending", "auth-logged-in", "auth-logged-out");
  body.classList.add(status);
  window.PcFirebaseAuthState.status = status.replace("auth-", "");
}

function dispatchPcAuthState(user) {
  window.PcFirebaseAuthState.user = user || null;
  document.dispatchEvent(new CustomEvent("pc-firebase-auth-state", {
    detail: {
      status: window.PcFirebaseAuthState.status,
      user: user || null
    }
  }));
}

function setLoginError(message) {
  const errorText = document.getElementById("loginErrorText");
  if (errorText) {
    errorText.textContent = message || "";
  }
}

function setLoginBusy(isBusy) {
  const submitButton = document.getElementById("loginSubmitBtn");
  const emailInput = document.getElementById("loginEmailInput");
  const passwordInput = document.getElementById("loginPasswordInput");
  if (submitButton) {
    submitButton.disabled = Boolean(isBusy);
    submitButton.textContent = isBusy ? "ログイン中..." : "ログイン";
  }
  if (emailInput) emailInput.disabled = Boolean(isBusy);
  if (passwordInput) passwordInput.disabled = Boolean(isBusy);
}

function setLogoutVisibility(isVisible) {
  const logoutButton = document.getElementById("logoutBtn");
  if (logoutButton) {
    logoutButton.classList.toggle("hidden", !isVisible);
  }
}

function canAccessOtherUserLearningHistory() {
  return Boolean(window.AdminLearningHistoryAccessState?.canSelectFamily === true);
}

function hasValidFirebaseCurrentUser() {
  const user = auth?.currentUser;
  if (!user || typeof user !== "object") return false;
  const uid = String(user.uid || "").trim();
  return Boolean(uid) && typeof user.email !== "undefined" || Boolean(uid) && typeof user.isAnonymous === "boolean";
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
  const emailInput = document.getElementById("loginEmailInput");
  const passwordInput = document.getElementById("loginPasswordInput");
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
    if (typeof window.resetAdminLearningHistoryAuthScope === "function") {
      window.resetAdminLearningHistoryAuthScope();
    }
    await signOut(auth);
  } catch (_error) {
    setLoginError("ログアウトに失敗しました。");
  }
}

function bindAuthUi() {
  const loginForm = document.getElementById("loginForm");
  const logoutButton = document.getElementById("logoutBtn");
  if (loginForm && !loginForm.dataset.authBound) {
    loginForm.addEventListener("submit", handleLoginSubmit);
    loginForm.dataset.authBound = "true";
  }
  if (logoutButton && !logoutButton.dataset.authBound) {
    logoutButton.addEventListener("click", handleLogoutClick);
    logoutButton.dataset.authBound = "true";
  }
}

async function saveLearningHistoryToFirestore(historyEntry) {
  const user = auth.currentUser;
  if (!user || !historyEntry || typeof historyEntry !== "object") {
    return false;
  }

  const rawDayNumber = historyEntry.dayNumber;
  const normalizedDayNumber = rawDayNumber == null ? "" : String(rawDayNumber).trim();

  const payload = {
    uid: String(user.uid || ""),
    email: String(user.email || ""),
    studyDate: String(historyEntry.learnedAt || historyEntry.endedAtDisplay || ""),
    startedAt: Number(historyEntry.startedAt) || 0,
    endedAt: Number(historyEntry.endedAt) || 0,
    activeStudySeconds: Math.max(0, Number(historyEntry.activeStudySeconds) || 0),
    mode: String(historyEntry.mode || ""),
    dayNumber: normalizedDayNumber,
    questionCount: Math.max(0, Number(historyEntry.questionCount) || 0),
    correctCount: Math.max(0, Number(historyEntry.correctCount) || 0),
    earnedPoints: Math.max(0, Number(historyEntry.earnedPoints) || 0),
    accuracy: Math.max(0, Math.min(100, Number(historyEntry.accuracy) || 0)),
    completedReason: String(historyEntry.completedReason || "completed"),
    answerDetails: Array.isArray(historyEntry.answerDetails)
      ? historyEntry.answerDetails.map((entry, index) => ({
        questionId: String(entry?.questionId || "").trim(),
        day: Math.max(0, Number(entry?.day) || 0),
        isCorrect: Boolean(entry?.isCorrect),
        answer: String(entry?.answer || ""),
        phase: String(entry?.phase || ""),
        index: Number.isFinite(Number(entry?.index)) ? Math.max(0, Math.floor(Number(entry.index))) : index,
        answeredAt: Math.max(0, Number(entry?.answeredAt ?? entry?.at) || 0)
      })).filter((entry) => entry.questionId)
      : [],
    ticketEarned: Math.max(0, Number(historyEntry?.ticket?.earned?.gameTicketsMinutes) || Number(historyEntry?.ticket?.earnedMinutes) || 0),
    ticketUsed: Math.max(0, Number(historyEntry?.ticket?.used?.gameTicketsMinutes) || Number(historyEntry?.ticket?.usedMinutes) || 0),
    deviceType: "pc",
    deviceId: String(historyEntry.deviceId || "").trim(),
    deviceName: String(historyEntry.deviceName || "").trim(),
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(firestore, "users", user.uid, "learningHistory"), payload);
    console.log("Learning history saved to Firestore");
    return true;
  } catch (error) {
    console.error("Failed to save learning history to Firestore", error);
    return false;
  }
}

function normalizeLearningHistoryFirestoreEntry(docSnapshot) {
  const data = typeof docSnapshot?.data === "function" ? docSnapshot.data() || {} : {};
  const createdAtMillis = typeof data.createdAt?.toMillis === "function"
    ? Number(data.createdAt.toMillis()) || 0
    : Math.max(0, Number(data.createdAt?.seconds) || 0) * 1000;
  const startedAt = Math.max(0, Number(data.startedAt) || 0);
  const endedAt = Math.max(0, Number(data.endedAt) || 0);
  const normalizedDeviceType = String(data.deviceType || "").trim().toLowerCase() === "mobile" ? "mobile" : (String(data.deviceType || "").trim().toLowerCase() === "pc" ? "pc" : "");
  const normalizedDeviceId = String(data.deviceId || "").trim();
  const normalizedDeviceName = String(data.deviceName || "").trim();
  const rawDayNumber = data.dayNumber;
  const normalizedDayNumber = rawDayNumber == null ? "" : String(rawDayNumber).trim();
  const rawAnswerDetails = Array.isArray(data.answerDetails) ? data.answerDetails : [];
  const rawEarnedPoints = data.earnedPoints;
  const normalizedEarnedPoints = (() => {
    if (typeof rawEarnedPoints === "number" && Number.isFinite(rawEarnedPoints)) {
      return Math.max(0, Math.floor(rawEarnedPoints));
    }
    const text = String(rawEarnedPoints ?? "").trim();
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
  return {
    id: String(docSnapshot?.id || ""),
    uid: String(data.uid || ""),
    email: String(data.email || ""),
    studyDate: String(data.studyDate || ""),
    learnedAt: String(data.studyDate || ""),
    startedAt,
    endedAt,
    startedAtDisplay: String(data.startedAtDisplay || ""),
    endedAtDisplay: String(data.endedAtDisplay || ""),
    activeStudySeconds: Math.max(0, Number(data.activeStudySeconds) || 0),
    mode: String(data.mode || ""),
    dayNumber: normalizedDayNumber,
    questionCount: Math.max(0, Number(data.questionCount) || 0),
    correctCount: Math.max(0, Number(data.correctCount) || 0),
    earnedPoints: normalizedEarnedPoints,
    accuracy: Math.max(0, Math.min(100, Number(data.accuracy) || 0)),
    completedReason: String(data.completedReason || "completed"),
    answerDetails: rawAnswerDetails.map((entry, index) => ({
      questionId: String(entry?.questionId || "").trim(),
      day: Math.max(0, Number(entry?.day) || 0),
      isCorrect: Boolean(entry?.isCorrect),
      answer: String(entry?.answer || ""),
      phase: String(entry?.phase || ""),
      index: Number.isFinite(Number(entry?.index)) ? Math.max(0, Math.floor(Number(entry.index))) : index,
      answeredAt: Math.max(0, Number(entry?.answeredAt ?? entry?.at) || 0)
    })).filter((entry) => entry.questionId),
    ticket: {
      earnedMinutes: Math.max(0, Number(data.ticketEarned) || 0),
      usedMinutes: Math.max(0, Number(data.ticketUsed) || 0)
    },
    deviceType: normalizedDeviceType,
    deviceId: normalizedDeviceId,
    deviceName: normalizedDeviceName,
    createdAt: createdAtMillis
  };
}

function normalizeFirestoreSerializableValue(value) {
  if (value == null) return value;
  if (typeof value?.toMillis === "function") {
    return Number(value.toMillis()) || 0;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeFirestoreSerializableValue(entry));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeFirestoreSerializableValue(entry)])
    );
  }
  return value;
}

async function loadStudyCoreFromFirestore(targetUid = null) {
  const user = auth.currentUser;
  const resolvedUid = String(targetUid || user?.uid || "").trim();
  if (!resolvedUid) {
    return { exists: false, data: null };
  }

  const snapshot = await getDoc(doc(firestore, "users", resolvedUid, "sync", "studyCore"));
  if (!snapshot.exists()) {
    return { exists: false, data: null };
  }

  return {
    exists: true,
    data: normalizeFirestoreSerializableValue(snapshot.data() || {})
  };
}

async function saveStudyCoreToFirestore(payload, options = {}) {
  const user = auth.currentUser;
  const resolvedUid = String(options?.targetUid || user?.uid || "").trim();
  if (!resolvedUid || !payload || typeof payload !== "object") {
    return false;
  }

  try {
    await setDoc(
      doc(firestore, "users", resolvedUid, "sync", "studyCore"),
      payload,
      { merge: options?.merge !== false }
    );
    return true;
  } catch (error) {
    console.error("Failed to save study core to Firestore", error);
    return false;
  }
}

async function loadPointStateFromFirestore(targetUid = null) {
  const user = auth.currentUser;
  const currentUid = String(user?.uid || "").trim();
  const resolvedUid = String(targetUid || currentUid || "").trim();
  const path = resolvedUid ? `users/${resolvedUid}/sync/pointState` : "users/<unknown>/sync/pointState";
  if (!resolvedUid) {
    console.log("[Point DEBUG]\ncurrentUid:", currentUid, "\nuid:", resolvedUid, "\npath:", path);
    return { exists: false, data: null };
  }

  console.log("[Point DEBUG]\ncurrentUid:", currentUid, "\nuid:", resolvedUid, "\npath:", path);
  try {
    const snapshot = await getDoc(doc(firestore, "users", resolvedUid, "sync", "pointState"));
    if (!snapshot.exists()) {
      return { exists: false, data: null };
    }

    return {
      exists: true,
      data: normalizeFirestoreSerializableValue(snapshot.data() || {})
    };
  } catch (error) {
    console.error("[Point ERROR]\ncode:", error?.code || "", "\nmessage:", error?.message || "", "\ncurrentUid:", currentUid, "\nuid:", resolvedUid, "\npath:", path);
    throw error;
  }
}

async function savePointStateToFirestore(payload, options = {}) {
  const user = auth.currentUser;
  const resolvedUid = String(options?.targetUid || user?.uid || "").trim();
  if (!resolvedUid || !payload || typeof payload !== "object") {
    return false;
  }

  try {
    await setDoc(
      doc(firestore, "users", resolvedUid, "sync", "pointState"),
      payload,
      { merge: false }
    );
    return true;
  } catch (error) {
    console.error("Failed to save point state to Firestore", error);
    return false;
  }
}

async function loadGameTicketsFromFirestore(targetUid = null) {
  const user = auth.currentUser;
  const resolvedUid = String(targetUid || user?.uid || "").trim();
  if (!resolvedUid) {
    return { exists: false, data: null };
  }

  const snapshot = await getDoc(doc(firestore, "users", resolvedUid, "sync", "gameTickets"));
  if (!snapshot.exists()) {
    return { exists: false, data: null };
  }

  return {
    exists: true,
    data: normalizeFirestoreSerializableValue(snapshot.data() || {})
  };
}

async function saveGameTicketsToFirestore(payload, options = {}) {
  const user = auth.currentUser;
  const resolvedUid = String(options?.targetUid || user?.uid || "").trim();
  if (!resolvedUid || !payload || typeof payload !== "object") {
    return false;
  }

  try {
    await setDoc(
      doc(firestore, "users", resolvedUid, "sync", "gameTickets"),
      payload,
      { merge: false }
    );
    return true;
  } catch (error) {
    console.error("Failed to save game tickets to Firestore", error);
    return false;
  }
}

async function loadTrainingCoverageFromFirestore(targetUid = null) {
  const user = auth.currentUser;
  const resolvedUid = String(targetUid || user?.uid || "").trim();
  if (!resolvedUid) {
    return { exists: false, data: null };
  }

  const snapshot = await getDoc(doc(firestore, "users", resolvedUid, "sync", "trainingCoverage"));
  if (!snapshot.exists()) {
    return { exists: false, data: null };
  }

  return {
    exists: true,
    data: normalizeFirestoreSerializableValue(snapshot.data() || {})
  };
}

async function saveTrainingCoverageToFirestore(payload, options = {}) {
  const user = auth.currentUser;
  const resolvedUid = String(options?.targetUid || user?.uid || "").trim();
  if (!resolvedUid || !payload || typeof payload !== "object") {
    return false;
  }

  try {
    await setDoc(doc(firestore, "users", resolvedUid, "sync", "trainingCoverage"), normalizeFirestoreSerializableValue(payload), { merge: true });
    return true;
  } catch (error) {
    console.error("Failed to save training coverage to Firestore", error);
    return false;
  }
}

async function loadStudyCoreBackupsFromFirestore(targetUid = null) {
  const user = auth.currentUser;
  const resolvedUid = String(targetUid || user?.uid || "").trim();
  if (!resolvedUid) {
    return [];
  }

  const snapshot = await getDocs(query(
    collection(firestore, "users", resolvedUid, "sync", "studyCore", "backups"),
    orderBy("dayKey", "desc")
  ));

  return snapshot.docs.map((entry) => ({
    id: String(entry.id || ""),
    ...normalizeFirestoreSerializableValue(entry.data() || {})
  }));
}

async function saveStudyCoreBackupToFirestore(dayKey, payload, options = {}) {
  const user = auth.currentUser;
  const resolvedUid = String(options?.targetUid || user?.uid || "").trim();
  const resolvedDayKey = String(dayKey || "").trim();
  if (!resolvedUid || !resolvedDayKey || !payload || typeof payload !== "object") {
    return false;
  }

  try {
    await setDoc(
      doc(firestore, "users", resolvedUid, "sync", "studyCore", "backups", resolvedDayKey),
      payload,
      { merge: false }
    );
    return true;
  } catch (error) {
    console.error("Failed to save study core backup to Firestore", error);
    return false;
  }
}

async function deleteStudyCoreBackupFromFirestore(dayKey, options = {}) {
  const user = auth.currentUser;
  const resolvedUid = String(options?.targetUid || user?.uid || "").trim();
  const resolvedDayKey = String(dayKey || "").trim();
  if (!resolvedUid || !resolvedDayKey) {
    return false;
  }

  try {
    await deleteDoc(doc(firestore, "users", resolvedUid, "sync", "studyCore", "backups", resolvedDayKey));
    return true;
  } catch (error) {
    console.error("Failed to delete study core backup from Firestore", error);
    return false;
  }
}

function normalizeFamilyChildren(familyData) {
  const children = familyData && typeof familyData === "object" && familyData.children && typeof familyData.children === "object"
    ? familyData.children
    : {};
  return Object.entries(children)
    .map(([key, value]) => ({
      key: String(key || ""),
      name: String(value?.name || key || ""),
      uid: String(value?.uid || "")
    }))
    .filter((item) => item.key && item.uid)
    .sort((left, right) => left.key.localeCompare(right.key, "ja"));
}

function normalizeFamilyDocument(docSnapshot) {
  const data = typeof docSnapshot?.data === "function" ? docSnapshot.data() || {} : {};
  return {
    id: String(docSnapshot?.id || ""),
    parentUid: String(data.parentUid || ""),
    children: normalizeFamilyChildren(data)
  };
}

async function loadLearningHistoryEntriesFromFirestore(targetUid = null, options = {}) {
  const user = auth.currentUser;
  const requestedUid = String(targetUid || "").trim();
  const currentUid = String(user?.uid || "").trim();
  const allowOtherUser = Boolean(options && typeof options === "object" && options.allowOtherUser === true && canAccessOtherUserLearningHistory());
  const familyUid = String(options?.familyUid || "").trim();
  const path = requestedUid ? `users/${requestedUid}/learningHistory` : (currentUid ? `users/${currentUid}/learningHistory` : "users/<unknown>/learningHistory");
  console.log("[LearningHistory DEBUG]\ncurrentUid:", currentUid, "\ntargetUid:", requestedUid, "\nfamilyUid:", familyUid, "\npath:", path, "\nauthState:", user ? "logged-in" : "logged-out");
  if (requestedUid && currentUid && requestedUid !== currentUid && !allowOtherUser) {
    console.warn("Blocked cross-user learning history load", { requestedUid, currentUid });
    return [];
  }
  const resolvedUid = String(targetUid || user?.uid || "").trim();
  if (!resolvedUid) {
    return [];
  }
  try {
    const snapshot = await getDocs(query(collection(firestore, "users", resolvedUid, "learningHistory"), orderBy("createdAt", "desc")));
    return snapshot.docs.map(normalizeLearningHistoryFirestoreEntry);
  } catch (error) {
    console.error("[LearningHistory ERROR]\ncode:", error?.code || "", "\nmessage:", error?.message || "", "\ncurrentUid:", currentUid, "\ntargetUid:", resolvedUid, "\npath:", `users/${resolvedUid}/learningHistory`);
    throw error;
  }
}

function watchLearningHistoryEntriesFromFirestore(targetUidOrCallbacks = null, maybeCallbacks = {}, maybeOptions = {}) {
  const user = auth.currentUser;
  const targetUid = typeof targetUidOrCallbacks === "string" ? String(targetUidOrCallbacks || "").trim() : String(user?.uid || "").trim();
  const callbacks = typeof targetUidOrCallbacks === "object" && targetUidOrCallbacks !== null && !Array.isArray(targetUidOrCallbacks)
    ? targetUidOrCallbacks
    : maybeCallbacks;
  const options = typeof targetUidOrCallbacks === "object" && targetUidOrCallbacks !== null && !Array.isArray(targetUidOrCallbacks)
    ? maybeCallbacks
    : maybeOptions;
  const familyUid = String(options?.familyUid || "").trim();
  const onLoading = typeof callbacks.onLoading === "function" ? callbacks.onLoading : null;
  const onUpdate = typeof callbacks.onUpdate === "function" ? callbacks.onUpdate : null;
  const onError = typeof callbacks.onError === "function" ? callbacks.onError : null;
  const currentUid = String(user?.uid || "").trim();
  const allowOtherUser = Boolean(options && typeof options === "object" && options.allowOtherUser === true && canAccessOtherUserLearningHistory());
  if (targetUid && currentUid && targetUid !== currentUid && !allowOtherUser) {
    console.warn("Blocked cross-user learning history watch", { requestedUid: targetUid, currentUid });
    onUpdate?.([]);
    return () => {};
  }
  if (!targetUid) {
    onUpdate?.([]);
    return () => {};
  }

  const path = `users/${targetUid}/learningHistory`;
  console.log("[LearningHistory DEBUG]\ncurrentUid:", currentUid, "\ntargetUid:", targetUid, "\nfamilyUid:", familyUid, "\npath:", path, "\nauthState:", user ? "logged-in" : "logged-out");
  onLoading?.();
  const q = query(collection(firestore, "users", targetUid, "learningHistory"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map(normalizeLearningHistoryFirestoreEntry);
    onUpdate?.(entries);
  }, (error) => {
    console.error("[LearningHistory ERROR]\ncode:", error?.code || "", "\nmessage:", error?.message || "", "\ncurrentUid:", currentUid, "\ntargetUid:", targetUid, "\npath:", path);
    onError?.(error);
  });
}

function watchFamilyDocument(familyId, callbacks = {}) {
  const onLoading = typeof callbacks.onLoading === "function" ? callbacks.onLoading : null;
  const onUpdate = typeof callbacks.onUpdate === "function" ? callbacks.onUpdate : null;
  const onError = typeof callbacks.onError === "function" ? callbacks.onError : null;
  const normalizedFamilyId = String(familyId || "").trim();
  const path = `families/${normalizedFamilyId || "<unknown>"}`;
  if (!normalizedFamilyId) {
    console.error("[Family ERROR]\ncode:", "familyId-required", "\nmessage:", "familyId is required", "\npath:", path);
    onError?.(new Error("familyId is required"));
    return () => {};
  }

  console.log("[Family DEBUG]\npath:", path, "\nfamilyId:", normalizedFamilyId);
  onLoading?.();
  return onSnapshot(doc(firestore, "families", normalizedFamilyId), (snapshot) => {
    const familyData = normalizeFamilyDocument(snapshot);
    const targetUid = String(familyData?.children?.[0]?.uid || familyData?.parentUid || "").trim();
    console.log("[Family DEBUG]\npath:", path, "\nfamilyUid:", targetUid, "\nchildren:", familyData?.children || []);
    onUpdate?.(familyData);
  }, (error) => {
    console.error("[Family ERROR]\ncode:", error?.code || "", "\nmessage:", error?.message || "", "\npath:", path);
    onError?.(error);
  });
}

async function initFirebaseAuthUi() {
  bindAuthUi();
  setLoginBusy(false);
  setLoginError("");
  setAuthViewState("auth-pending");

  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (_error) {
    // Keep default persistence when explicit local persistence is unavailable.
  }

  onAuthStateChanged(auth, (user) => {
    const emailInput = document.getElementById("loginEmailInput");
    const passwordInput = document.getElementById("loginPasswordInput");
    if (user) {
      setLoginError("");
      if (passwordInput) passwordInput.value = "";
      setLogoutVisibility(true);
      setAuthViewState("auth-logged-in");
      dispatchPcAuthState(user);
      return;
    }

    if (emailInput && !emailInput.value) {
      emailInput.focus();
    }
    if (passwordInput) passwordInput.value = "";
    setLogoutVisibility(false);
    setLoginBusy(false);
    setAuthViewState("auth-logged-out");
    dispatchPcAuthState(null);
  });
}

window.saveLearningHistoryToFirestore = saveLearningHistoryToFirestore;
window.loadLearningHistoryEntriesFromFirestore = loadLearningHistoryEntriesFromFirestore;
window.watchLearningHistoryEntriesFromFirestore = watchLearningHistoryEntriesFromFirestore;
window.loadStudyCoreFromFirestore = loadStudyCoreFromFirestore;
window.saveStudyCoreToFirestore = saveStudyCoreToFirestore;
window.loadTrainingCoverageFromFirestore = loadTrainingCoverageFromFirestore;
window.saveTrainingCoverageToFirestore = saveTrainingCoverageToFirestore;
window.loadPointStateFromFirestore = loadPointStateFromFirestore;
window.savePointStateToFirestore = savePointStateToFirestore;
window.loadGameTicketsFromFirestore = loadGameTicketsFromFirestore;
window.saveGameTicketsToFirestore = saveGameTicketsToFirestore;
window.loadStudyCoreBackupsFromFirestore = loadStudyCoreBackupsFromFirestore;
window.saveStudyCoreBackupToFirestore = saveStudyCoreBackupToFirestore;
window.deleteStudyCoreBackupFromFirestore = deleteStudyCoreBackupFromFirestore;
window.watchFamilyDocument = watchFamilyDocument;
window.getFirebaseCurrentUser = () => auth.currentUser;
window.EnglishTrainerFirebase = Object.freeze({ app, auth, firestore });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFirebaseAuthUi, { once: true });
} else {
  initFirebaseAuthUi();
}
