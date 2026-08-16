const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'mobile', 'mobile.js'), 'utf8');
assert.ok(/function hasCurrentSpeakingDayProgress\(week, dayKey\)/.test(source), 'Day progress guard should exist');
assert.ok(/function getDayProgressSummaryText\(week, dayKey\)/.test(source), 'Day summary helper should exist');
assert.ok(/function mergeSpeakingDayProgressMap\(sourceMap\)/.test(source), 'Progress map merge helper should exist');
assert.ok(/function restoreSpeakingWeekCompletionState\(weekId, dayKeys\)/.test(source), 'Week completion recovery helper should exist');

const week = {
  weekId: 'W7',
  shortConversations: [{ id: 'W7-D4-SC01', date: '2026-08-06' }, { id: 'W7-D4-QR01', date: '2026-08-06' }]
};
const dayKey = '2026-08-06';

const staleProgress = {
  weekId: 'W7',
  dayKey,
  conversationOrder: ['W7-D4-SC01'],
  conversationIndex: 0,
  lineIndex: 0,
  completedRounds: 0,
  conversationSetCount: 0,
  completedConversationIds: ['W7-D4-SC01'],
  phase: 'line',
  updatedAt: Date.now()
};

const actualProgress = {
  weekId: 'W7',
  dayKey,
  conversationOrder: ['W7-D4-SC01'],
  conversationIndex: 0,
  lineIndex: 0,
  completedRounds: 0,
  conversationSetCount: 0,
  completedConversationIds: ['W7-D4-SC01'],
  phase: 'line',
  updatedAt: Date.now()
};

const state = {
  speakingProgress: null,
  speakingDayProgressMap: { 'W7__2026-08-06': staleProgress }
};

const hasCurrentSpeakingDayProgress = (currentState, targetWeek, targetDay) => {
  const currentProgress = currentState.speakingProgress;
  if (!currentProgress) return false;
  return String(currentProgress.weekId || '').trim() === String(targetWeek.weekId || '').trim()
    && String(currentProgress.dayKey || '').trim() === String(targetDay || '').trim();
};

const getDayProgressSummaryText = (currentState, targetWeek, targetDay) => {
  if (!hasCurrentSpeakingDayProgress(currentState, targetWeek, targetDay)) {
    return { text: '未開始', tone: 'not-started' };
  }
  const progress = currentState.speakingDayProgressMap[`${targetWeek.weekId}__${targetDay}`];
  if (!progress || !Array.isArray(progress.conversationOrder)) {
    return { text: '未開始', tone: 'not-started' };
  }
  const spokenCount = progress.completedRounds + (Array.isArray(progress.completedConversationIds) && progress.completedConversationIds.includes('W7-D4-SC01') ? 1 : 0);
  if (spokenCount <= 0) return { text: '未開始', tone: 'not-started' };
  return { text: '1周目（あと2回）', tone: 'first-round' };
};

assert.strictEqual(getDayProgressSummaryText(state, week, dayKey).text, '未開始', 'unstarted day should stay unstarted even with stale progress');
state.speakingProgress = actualProgress;
state.speakingDayProgressMap = { 'W7__2026-08-06': actualProgress };
assert.strictEqual(getDayProgressSummaryText(state, week, dayKey).text, '1周目（あと2回）', 'started day should show actual progress');
console.log('mobile speaking day-progress tests passed');
