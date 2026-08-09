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
window.getMobileFirebaseCurrentUser = () => auth.currentUser;
window.MobileFirebase = Object.freeze({ app, auth, firestore });
window.MobileFirebaseReady = initMobileFirebaseAuthUi();
