(function (root) {
  class Queue {
    constructor() {
      this._ops = [];
      this._isFlushing = false;
    }

    enqueue(op) {
      this._ops.push(op);
    }

    size() {
      return this._ops.length;
    }

    async flush(sendFn) {
      if (this._isFlushing) return;
      this._isFlushing = true;
      try {
        while (this._ops.length > 0) {
          const op = this._ops[0];
          try {
            await sendFn(op);
            this._ops.shift();
          } catch (err) {
            console.warn('SupabaseQueue: op failed, will retry on next flush', err);
            break; // 네트워크 실패 — 순서 보존을 위해 여기서 멈추고 다음 flush 시도를 기다림
          }
        }
      } finally {
        this._isFlushing = false;
      }
    }
  }

  const SupabaseQueue = { Queue };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseQueue;
  } else {
    root.SupabaseQueue = SupabaseQueue;
  }
})(typeof window !== 'undefined' ? window : globalThis);
