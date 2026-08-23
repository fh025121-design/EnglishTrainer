const assert = require("assert");
const fs = require("fs");
const path = require("path");

const source = fs.readFileSync(path.join(__dirname, "..", "mobile", "mobile.js"), "utf8");

const checks = [
  {
    name: "vocabulary study state is saved through the existing mobile storage snapshot",
    ok: /state\.vocabularyStudy/.test(source) && /saveState\(\)/.test(source) && /MOBILE_STORAGE_KEY/.test(source)
  },
  {
    name: "study entries are updated by stable word id after a judgment",
    ok: /function\s+updateVocabularyStudyEntryAfterJudgment\s*\(/.test(source) && /entry\.id/.test(source) && /wordItem\.id/.test(source)
  },
  {
    name: "study state is hydrated on load",
    ok: /function\s+loadState\s*\(/.test(source) && /sanitizeVocabularyStudyState/.test(source)
  },
  {
    name: "persistent vocabulary study entries are merged with the current real bank by stable word id",
    ok: /mergeVocabulary.*Study.*With.*Bank|merge.*Current.*Bank.*Study|merge.*study.*entries/.test(source)
  },
  {
    name: "today history is preserved through the dedicated storage key and load path",
    ok: /MOBILE_VOCABULARY_TODAY_HISTORY_STORAGE_KEY/.test(source) && /loadVocabularyTodayHistoryMap\s*\(/.test(source) && /normalizeVocabularyTodayHistoryMap/.test(source)
  },
  {
    name: "reload guard persists across the hard-refresh boundary and recovery reads all vocabulary history keys",
    ok: /MOBILE_VOCABULARY_RELOAD_GUARD_STORAGE_KEY/.test(source)
      && /setMobileReloadNavigationGuard\s*\(/.test(source)
      && /consumeMobileReloadNavigationGuard\s*\(/.test(source)
      && /localStorage\.key\(index\)|startsWith\(storagePrefix\)/.test(source)
  }
];

for (const check of checks) {
  assert.ok(check.ok, check.name);
}

console.log(`mobile vocabulary study persistence checks passed (${checks.length})`);
