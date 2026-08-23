const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'mobile', 'mobile.js'), 'utf8');

const scenarioNames = [
  '№71-16-1 親→長男: 親のVocabulary stateがchildへ混入しない',
  '№71-16-2 長男に既存データあり: childのFirestore状態を親からmergeしない',
  '№71-16-3 長男→親: 逆方向でも親へ混入しない',
  '№71-16-4 同一UID同期は維持: same-UID merge remains allowed'
];

test(scenarioNames[0], () => {
  assert.match(source, /previousOwner && previousOwner !== nextUid/);
  assert.match(source, /state\.teacherCheckSession = null/);
  assert.match(source, /state\.vocabularyStudy = null/);
  assert.match(source, /state\.vocabularyTodayHistoryMap = \{\}/);
});

test(scenarioNames[1], () => {
  assert.match(source, /vocabularyStateOwnerUid && vocabularyStateOwnerUid !== currentUid/);
  assert.match(source, /state\.vocabularyStudy = null/);
  assert.match(source, /state\.teacherCheckSession = null/);
});

test(scenarioNames[2], () => {
  assert.match(source, /if \(previousOwner && previousOwner !== nextUid\)/);
  assert.match(source, /vocabularyStateOwnerUid = ""/);
  assert.match(source, /vocabularyTodayHistoryOwnerUid = ""/);
});

test(scenarioNames[3], () => {
  assert.match(source, /if \(!targetUid \|\| \(currentUid && targetUid !== currentUid\)\)/);
  assert.match(source, /mergeVocabularyStudyStateByLatest\(currentLocal, incomingStudy\)/);
});

console.log(`UID ownership regression tests added (${scenarioNames.length})`);
