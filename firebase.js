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
  getFirestore,
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

console.log("Firebase connected");

function setAuthViewState(status) {
  const body = document.body;
  if (!body) return;
  body.classList.remove("auth-pending", "auth-logged-in", "auth-logged-out");
  body.classList.add(status);
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

  const payload = {
    uid: String(user.uid || ""),
    email: String(user.email || ""),
    studyDate: String(historyEntry.learnedAt || historyEntry.endedAtDisplay || ""),
    startedAt: Number(historyEntry.startedAt) || 0,
    endedAt: Number(historyEntry.endedAt) || 0,
    activeStudySeconds: Math.max(0, Number(historyEntry.activeStudySeconds) || 0),
    mode: String(historyEntry.mode || ""),
    dayNumber: Number(historyEntry.dayNumber) || 0,
    questionCount: Math.max(0, Number(historyEntry.questionCount) || 0),
    correctCount: Math.max(0, Number(historyEntry.correctCount) || 0),
    accuracy: Math.max(0, Math.min(100, Number(historyEntry.accuracy) || 0)),
    completedReason: String(historyEntry.completedReason || "completed"),
    ticketEarned: Math.max(0, Number(historyEntry?.ticket?.earnedMinutes) || 0),
    ticketUsed: Math.max(0, Number(historyEntry?.ticket?.usedMinutes) || 0),
    deviceType: "pc",
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
      return;
    }

    if (emailInput && !emailInput.value) {
      emailInput.focus();
    }
    if (passwordInput) passwordInput.value = "";
    setLogoutVisibility(false);
    setLoginBusy(false);
    setAuthViewState("auth-logged-out");
  });
}

window.saveLearningHistoryToFirestore = saveLearningHistoryToFirestore;
window.EnglishTrainerFirebase = Object.freeze({ app, auth, firestore });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFirebaseAuthUi, { once: true });
} else {
  initFirebaseAuthUi();
}
