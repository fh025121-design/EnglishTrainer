const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const makeString = (...codePoints) => String.fromCharCode(...codePoints);
const unitGeneralFull = makeString(0x4e00, 0x822c, 0x52d5, 0x8a5e, 0xff08, 0x4e09, 0x5355, 0x73fe, 0xff09);
const unitGeneralHalf = makeString(0x4e00, 0x822c, 0x52d5, 0x8a5e, 0x0028, 0x4e09, 0x5355, 0x73fe, 0x0029);
const unitGeneralVariantMixedHan = makeString(0x4e00, 0x822c, 0x52d5, 0x8a5e, 0x0028, 0x4e09, 0x5355, 0x73fe, 0x0029).replace(/\u5355/g, "\u5355");
const unitPatternFull = makeString(0x6587, 0x578b, 0xff08, 0x53, 0x56, 0x4f, 0x4f, 0x30fb, 0x53, 0x56, 0x4f, 0x43, 0xff09);
const unitPatternHalf = makeString(0x6587, 0x578b, 0x0028, 0x53, 0x56, 0x4f, 0x4f, 0x30fb, 0x53, 0x56, 0x4f, 0x43, 0x0029);

const sourceCode = fs.readFileSync(path.join(__dirname, "../app.js"), "utf8").replace(/\ninit\(\);\s*$/, "\n");
const context = {
  console,
  Math,
  Date,
  Set,
  Map,
  Array,
  Object,
  Number,
  String,
  Boolean,
  document: {
    addEventListener() {},
    getElementById() { return null; },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    createElement() { return {}; }
  },
  window: {},
  state: {},
  alert() {},
  saveState() {},
  showScreen() {},
  escapeHtml(value) {
    return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
  navigator: { userAgent: "node" }
};
context.window = context;
context.window.document = context.document;
context.window.addEventListener = () => {};
context.window.requestAnimationFrame = () => {};
context.globalThis = context;

vm.createContext(context);
vm.runInContext(sourceCode, context);

const bank = [
  { id: "SV001", unit: unitGeneralHalf, japanese: "今日はいい天気です。", answer: "It is a nice day." },
  { id: "SV002", unit: unitGeneralFull, japanese: "彼は毎日走ります。", answer: "He runs every day." },
  { id: "SV003", unit: unitPatternHalf, japanese: "私は先生にその話をしました。", answer: "I told the teacher about it." },
  { id: "SV004", unit: unitPatternFull, japanese: "彼は私に本を借しました。", answer: "He lent me a book." }
];
context.state = { instantCompositionQuestionBank: bank };

const generalFromFull = context.getInstantCompositionQuestionsByUnit(unitGeneralFull);
const generalFromHalf = context.getInstantCompositionQuestionsByUnit(unitGeneralHalf);
const generalFromVariant = context.getInstantCompositionQuestionsByUnit("一般動詞(三单現)");
const patternFromFull = context.getInstantCompositionQuestionsByUnit(unitPatternFull);
const patternFromHalf = context.getInstantCompositionQuestionsByUnit(unitPatternHalf);

assert.strictEqual(generalFromFull.length, 2, "Full-width unit should resolve to the same canonical grouping");
assert.strictEqual(generalFromHalf.length, 2, "Half-width unit should resolve to the same canonical grouping");
assert.strictEqual(generalFromVariant.length, 2, "Compatibility-variant characters should resolve to the same canonical grouping");
assert.strictEqual(patternFromFull.length, 2, "Full-width pattern unit should resolve to the same canonical grouping");
assert.strictEqual(patternFromHalf.length, 2, "Half-width pattern unit should resolve to the same canonical grouping");
assert.strictEqual(context.resolveInstantCompositionCanonicalUnitName(unitGeneralHalf), "一般動詞（三単現）", "Canonical name should stay stable for the official unit");
assert.strictEqual(context.resolveInstantCompositionCanonicalUnitName(unitPatternHalf), "文型（SVOO・SVOC）", "Canonical pattern name should stay stable for the official unit");
assert.strictEqual(context.getInstantCompositionProgressForUnit("一般動詞（三単現）").totalCount, 2, "Progress should count the canonicalized unit");
assert.strictEqual(context.getInstantCompositionProgressForUnit("文型（SVOO・SVOC）").totalCount, 2, "Pattern progress should count the canonicalized unit");

console.log("instant-composition unit normalization tests passed");
