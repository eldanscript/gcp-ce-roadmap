const { test } = require('node:test');
const assert = require('node:assert/strict');
const SupabaseQueue = require('../../docs/js/supabase-queue.js');

test('enqueue adds an operation, flush sends and clears it on success', async () => {
  const queue = new SupabaseQueue.Queue();
  queue.enqueue({ table: 'roadmap_progress', itemId: 'r1', checked: true });
  const sent = [];
  await queue.flush(async (op) => { sent.push(op); return { ok: true }; });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].itemId, 'r1');
  assert.equal(queue.size(), 0);
});

test('flush keeps failed operation in queue and stops (preserve order)', async () => {
  const queue = new SupabaseQueue.Queue();
  queue.enqueue({ table: 'roadmap_progress', itemId: 'r1', checked: true });
  queue.enqueue({ table: 'roadmap_progress', itemId: 'r2', checked: true });
  await queue.flush(async (op) => {
    if (op.itemId === 'r1') throw new Error('network down');
    return { ok: true };
  });
  assert.equal(queue.size(), 2, 'both ops remain — r1 failed, r2 never attempted');
});

test('flush is a no-op when queue is empty', async () => {
  const queue = new SupabaseQueue.Queue();
  let calls = 0;
  await queue.flush(async () => { calls++; });
  assert.equal(calls, 0);
});

test('reentrancy guard: concurrent flush calls do not double-send', async () => {
  const queue = new SupabaseQueue.Queue();
  queue.enqueue({ table: 'roadmap_progress', itemId: 'r1', checked: true });
  let sendCount = 0;
  const slowSend = async (op) => {
    sendCount++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { ok: true };
  };
  await Promise.all([queue.flush(slowSend), queue.flush(slowSend)]);
  assert.equal(sendCount, 1, 'second concurrent flush call should be a no-op while first is in-flight');
});
