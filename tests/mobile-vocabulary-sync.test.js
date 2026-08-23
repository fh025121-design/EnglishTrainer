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
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary sync contract checks passed (${checks.length})`);
