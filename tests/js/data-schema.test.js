const { test } = require('node:test');
const assert = require('node:assert/strict');
const roadmap = require('../../docs/data/roadmap.json');
const capabilities = require('../../docs/data/capabilities.json');
const weeklyRoutine = require('../../docs/data/weeklyRoutine.json');
const maturity = require('../../docs/data/maturity.json');
const routineCatalog = require('../../docs/data/routineCatalog.json');

test('roadmap.json has exactly 18 items', () => {
  assert.equal(roadmap.length, 18);
});

test('roadmap.json ids are unique', () => {
  const ids = roadmap.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('roadmap.json phase is 1, 2, or 3', () => {
  for (const item of roadmap) {
    assert.ok([1, 2, 3].includes(item.phase), `bad phase for ${item.id}`);
  }
});

test('roadmap.json phase counts are 6/6/6', () => {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const item of roadmap) counts[item.phase]++;
  assert.deepEqual(counts, { 1: 6, 2: 6, 3: 6 });
});

test('capabilities.json has exactly 97 items', () => {
  assert.equal(capabilities.length, 97);
});

test('capabilities.json ids are unique', () => {
  const ids = capabilities.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('capabilities.json categoryId is 1-11', () => {
  for (const item of capabilities) {
    assert.ok(item.categoryId >= 1 && item.categoryId <= 11, `bad categoryId for ${item.id}`);
  }
});

test('capabilities.json category 11 has 33 items, others do not use subgroup', () => {
  const byCategory = {};
  for (const item of capabilities) {
    byCategory[item.categoryId] = (byCategory[item.categoryId] || 0) + 1;
    if (item.categoryId !== 11) {
      assert.equal(item.subgroup, null, `${item.id} should have null subgroup`);
    } else {
      assert.ok(typeof item.subgroup === 'string' && item.subgroup.length > 0, `${item.id} needs a subgroup`);
    }
  }
  assert.equal(byCategory[11], 33);
});

test('weeklyRoutine.json has exactly 7 items, one per day', () => {
  assert.equal(weeklyRoutine.length, 7);
  const days = weeklyRoutine.map((r) => r.day).sort();
  assert.deepEqual(days, ['금', '목', '수', '월', '일', '토', '화'].sort());
});

test('maturity.json has exactly 13 items', () => {
  assert.equal(maturity.length, 13);
});

test('maturity.json ids are unique', () => {
  const ids = maturity.map((m) => m.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('maturity.json group counts are 3/3/2/2/3', () => {
  const counts = {};
  for (const item of maturity) counts[item.group] = (counts[item.group] || 0) + 1;
  assert.deepEqual(counts, {
    '플랫폼': 3, 'AI/Agent': 3, 'Multimodal': 2, 'Production': 2, 'Automate yourself': 3,
  });
});

test('routineCatalog.json has exactly 11 items (7 exercise + 4 medication)', () => {
  assert.equal(routineCatalog.length, 11);
  const bySection = {};
  for (const item of routineCatalog) bySection[item.section] = (bySection[item.section] || 0) + 1;
  assert.deepEqual(bySection, { exercise: 7, medication: 4 });
});

test('routineCatalog.json ids are unique', () => {
  const ids = routineCatalog.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('routineCatalog.json: only 슬로우 조깅 has a metric', () => {
  const withMetric = routineCatalog.filter((r) => r.metric);
  assert.equal(withMetric.length, 1);
  assert.equal(withMetric[0].id, 'ex1');
  assert.deepEqual(withMetric[0].metric, { key: 'km', unit: 'km', min: 0.1, max: 99 });
});

const bizEnglish = require('../../docs/data/bizEnglish.json');

test('bizEnglish.json has exactly 12 weeks', () => {
  assert.equal(bizEnglish.length, 12);
});

test('bizEnglish.json weekNumber is 1-12, each appearing exactly once', () => {
  const weekNumbers = bizEnglish.map((w) => w.weekNumber).sort((a, b) => a - b);
  assert.deepEqual(weekNumbers, Array.from({ length: 12 }, (_, i) => i + 1));
});

test('bizEnglish.json each week has exactly 5 days in 월/화/수/목/금 order', () => {
  for (const week of bizEnglish) {
    assert.equal(week.days.length, 5, `week ${week.weekNumber} should have 5 days`);
    assert.deepEqual(week.days.map((d) => d.day), ['월', '화', '수', '목', '금'], `week ${week.weekNumber} day order`);
  }
});

test('bizEnglish.json ids are unique and match w{weekNumber}-{mon|tue|wed|thu|fri} format', () => {
  const abbrevByDay = { '월': 'mon', '화': 'tue', '수': 'wed', '목': 'thu', '금': 'fri' };
  const ids = [];
  for (const week of bizEnglish) {
    for (const d of week.days) {
      assert.equal(d.id, `w${week.weekNumber}-${abbrevByDay[d.day]}`, `bad id for week ${week.weekNumber} ${d.day}`);
      ids.push(d.id);
    }
  }
  assert.equal(ids.length, 60);
  assert.equal(new Set(ids).size, 60);
});

test('bizEnglish.json activityType is the same fixed template every week', () => {
  const expectedByDay = {
    '월': '핵심 어휘 학습',
    '화': '표현 패턴 연습',
    '수': '리스닝 & 쉐도잉',
    '목': '롤플레이 스크립트 작성',
    '금': '리허설 & 녹음 복습',
  };
  for (const week of bizEnglish) {
    for (const d of week.days) {
      assert.equal(d.activityType, expectedByDay[d.day], `week ${week.weekNumber} ${d.day} activityType`);
    }
  }
});
