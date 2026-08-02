const { test } = require('node:test');
const assert = require('node:assert/strict');
const RoadmapLogic = require('../../docs/js/roadmap-logic.js');

test('currentWeekNumber: program start day is week 1', () => {
  const start = new Date('2026-08-04T00:00:00');
  assert.equal(RoadmapLogic.currentWeekNumber(new Date('2026-08-04T09:00:00'), start), 1);
});

test('currentWeekNumber: 7 days later is week 2', () => {
  const start = new Date('2026-08-04T00:00:00');
  assert.equal(RoadmapLogic.currentWeekNumber(new Date('2026-08-11T09:00:00'), start), 2);
});

test('currentWeekNumber: before start clamps to 1', () => {
  const start = new Date('2026-08-04T00:00:00');
  assert.equal(RoadmapLogic.currentWeekNumber(new Date('2026-07-20T09:00:00'), start), 1);
});

test('currentWeekNumber: after week 12 clamps to 12', () => {
  const start = new Date('2026-08-04T00:00:00');
  assert.equal(RoadmapLogic.currentWeekNumber(new Date('2027-01-01T09:00:00'), start), 12);
});

test('progressSummary: counts done/total/percent', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
  const result = RoadmapLogic.progressSummary(items, new Set(['a', 'c']));
  assert.deepEqual(result, { done: 2, total: 4, percent: 50 });
});

test('progressSummary: empty items gives 0 percent, not NaN', () => {
  const result = RoadmapLogic.progressSummary([], new Set());
  assert.deepEqual(result, { done: 0, total: 0, percent: 0 });
});

test('sortRemaining: returns only unchecked items, preserves input order by default', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const result = RoadmapLogic.sortRemaining(items, new Set(['b']));
  assert.deepEqual(result.map((i) => i.id), ['a', 'c']);
});

test('sortRemaining: custom priorityFn sorts ascending', () => {
  const items = [{ id: 'a', phase: 3 }, { id: 'b', phase: 1 }, { id: 'c', phase: 2 }];
  const result = RoadmapLogic.sortRemaining(items, new Set(), (item) => item.phase);
  assert.deepEqual(result.map((i) => i.id), ['b', 'c', 'a']);
});

test('koreanDayName: maps JS getDay() to Korean weekday names', () => {
  assert.equal(RoadmapLogic.koreanDayName(new Date('2026-08-03T12:00:00')), '월'); // Mon
  assert.equal(RoadmapLogic.koreanDayName(new Date('2026-08-04T12:00:00')), '화'); // Tue
  assert.equal(RoadmapLogic.koreanDayName(new Date('2026-08-08T12:00:00')), '토'); // Sat
  assert.equal(RoadmapLogic.koreanDayName(new Date('2026-08-09T12:00:00')), '일'); // Sun
});

test('flattenBizEnglish: flattens weeks into leaf items with id/weekNumber/theme/day/activityType', () => {
  const weeks = [
    { weekNumber: 1, theme: 'Theme A', days: [
      { day: '월', activityType: 'Vocab', id: 'w1-mon' },
      { day: '화', activityType: 'Patterns', id: 'w1-tue' },
    ] },
    { weekNumber: 2, theme: 'Theme B', days: [
      { day: '월', activityType: 'Vocab', id: 'w2-mon' },
    ] },
  ];
  const flat = RoadmapLogic.flattenBizEnglish(weeks);
  assert.equal(flat.length, 3);
  assert.deepEqual(flat[0], { id: 'w1-mon', weekNumber: 1, theme: 'Theme A', day: '월', activityType: 'Vocab' });
  assert.deepEqual(flat[1], { id: 'w1-tue', weekNumber: 1, theme: 'Theme A', day: '화', activityType: 'Patterns' });
  assert.deepEqual(flat[2], { id: 'w2-mon', weekNumber: 2, theme: 'Theme B', day: '월', activityType: 'Vocab' });
});
