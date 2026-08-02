const { test } = require('node:test');
const assert = require('node:assert/strict');
const roadmap = require('../../docs/data/roadmap.json');
const capabilities = require('../../docs/data/capabilities.json');

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

const weeklyRoutine = require('../../docs/data/weeklyRoutine.json');
const maturity = require('../../docs/data/maturity.json');

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
