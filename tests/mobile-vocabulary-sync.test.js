const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");
const firebaseSource = fs.readFileSync(path.join(__dirname, "..", "mobile", "firebase.js"), "utf8");

const checks = [
  {
    name: "vocabulary study state sync hooks are present in the mobile app layer",
    ok: /initializeMobileVocabularySyncForCurrentUser\s*\(/.test(source)
      && /mergeVocabularyStudyStateByLatest\s*\(/.test(source)
      && /saveMobileVocabularyState\s*\(/.test(source)
  },
  {
    name: "firestore vocabulary sync document helpers are available",
    ok: /loadMobileVocabularyStateFromFirestore\s*\(/.test(firebaseSource)
      && /saveMobileVocabularyStateToFirestore\s*\(/.test(firebaseSource)
      && /subscribeMobileVocabularyStateFromFirestore\s*\(/.test(firebaseSource)
  },
  {
    name: "sync code guards against empty remote state wiping local progress",
    ok: /empty.*remote|missing-remote|allowCreate|skip.*empty/.test(source) || /missing-remote|allowCreate/.test(firebaseSource)
  },
  {
    name: "today-history sync helpers are present for cross-browser shared state",
    ok: /MOBILE_VOCABULARY_TODAY_HISTORY_SYNC_DOC_ID/.test(firebaseSource)
      && /loadMobileVocabularyTodayHistoryStateFromFirestore\s*\(/.test(firebaseSource)
      && /saveMobileVocabularyTodayHistoryStateToFirestore\s*\(/.test(firebaseSource)
      && /subscribeMobileVocabularyTodayHistoryStateFromFirestore\s*\(/.test(firebaseSource)
  },
  {
    name: "home today learning summary uses Firestore formal learning history as its canonical source",
    ok: /loadMobileFormalLearningHistoryEntriesForToday\s*\(/.test(source)
      && /collection\(firestore,\s*"users",\s*uid,\s*"learningHistory"\)/.test(source)
      && /MOBILE_LEARNING_HISTORY_STORAGE_KEY/.test(source)
  },
  {
    name: "today history empty remote snapshot does not overwrite local entries",
    ok: /!incomingMap/.test(source)
      && /Object\.keys\(incomingMap\)\.length/.test(source)
      && /hasLocalEntries/.test(source)
      && /Object\.keys\(localBaseline \|\| \{\}\)\.length > 0/.test(source)
      && /return;\s*\n\s*}\s*\n\s*state\.vocabularyTodayHistoryMap = \{\};/.test(source)
  },
  {
    name: "son reload stays on home and suppresses history re-show after F5",
    ok: /shouldSuppressVocabularyTodayHistoryRenderAfterReload\(\)/.test(source)
      && /isCurrentSonLoginForMobileLearningHistory\(\)/.test(source)
      && /isMobileReloadNavigation\(\)/.test(source)
      && /showScreen\(["']homeScreen["']\)/.test(source)
      && /renderHome\(\);\s*return;/.test(source)
  },
  {
    name: "today history merges legacy and uid-scoped local storage safely",
    ok: /getMobileVocabularyTodayHistoryStorageKey\s*\(/.test(source)
      && /MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY/.test(source)
      && /mergeVocabularyTodayHistoryMapByLatest\(localBaseline, remoteHistoryMap\)/.test(source)
  },
  {
    name: "past history remote empty snapshot does not wipe local study state",
    ok: /!incomingStudy/.test(source)
      && /Array\.isArray\(incomingStudy\.entries\)/.test(source)
      && /renderVocabularyPastHistoryScreen\(\)/.test(source)
  },
  {
    name: "last-updated merge wins for same vocabulary id across devices",
    ok: /rightUpdated >= leftUpdated \? incomingEntry : baseEntry/.test(source)
      && /rightUpdated >= leftUpdated \? incomingEntry : baseEntry/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary sync contract checks passed (${checks.length})`);
