# Biz English 12-Week Curriculum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 6th and final tracking layer — a 12-week Biz English curriculum (60 leaf items: 5 weekdays × 12 weeks) — to the gcp-ce-roadmap PWA, following the exact patterns already established by Plans 1-3.

**Architecture:** Same as every prior layer in this app: a static `docs/data/bizEnglish.json` content file, a simple `item_id`-primary-key Supabase table (`biz_english_progress`, matching `roadmap_progress`/`capability_progress`'s pattern — not the composite-key pattern used by `weekly_checkins`), and UI wiring into the existing Today/Home/Report tabs in `docs/app.js`. Unlike Plan 3 (which split local-state and Supabase-integration into separate tasks and only added localStorage caching as a late fix), this plan builds localStorage caching and Supabase queue-and-flush together in the same task from the start.

**Tech Stack:** Vanilla JS (no build tooling), Supabase JS client (already loaded via CDN in `docs/index.html`), `node --test` for JS unit tests.

## Global Constraints

- Program start date: `2026-08-04` (Monday) = week 1, using the existing `PROGRAM_START` constant and `RoadmapLogic.currentWeekNumber`/`RoadmapLogic.koreanDayName` — do not redefine these, reuse them exactly as Plan 1/2 already wired them.
- Content is 12 weeks × 5 weekdays (월/화/수/목/금 only — **no weekend items**) = exactly 60 leaf items.
- Leaf item `id` format: `w{weekNumber}-{mon|tue|wed|thu|fri}` (English weekday abbreviation), e.g. `w1-mon`. The `day` field itself stays Korean (`월`~`금`) — only the `id` uses the English abbreviation.
- Weekday activity template is **fixed and identical across all 12 weeks**: 월=핵심 어휘 학습, 화=표현 패턴 연습, 수=리스닝 & 쉐도잉, 목=롤플레이 스크립트 작성, 금=리허설 & 녹음 복습.
- The 12 weekly themes are fixed, CE-workflow-ordered, and already approved by the user (see Task 1's exact JSON content — do not alter theme text).
- Supabase table: `biz_english_progress(item_id text primary key, checked_at timestamptz not null default now())` — the **simple** pattern (like `roadmap_progress`/`capability_progress`), not the composite-key pattern (`weekly_checkins` uses `week_number`+`day` as a composite key because CE weekly routine has only 7 rows total across all 12 weeks reused per-week; Biz English has one distinct row per week+day, so a flat `item_id` primary key is correct and simpler).
- **No custom-item support for Biz English** — spec explicitly excludes it (Out of scope section: "CE 로드맵/역량/Biz English 항목에 커스텀 추가" — 운동 루틴만 예외).
- **No batch pipeline, no cron, no Telegram/email automation for Biz English** — spec explicitly excludes it (decision 7, Out of scope section).
- Every new piece of checkable state in this plan must follow the established offline-resilience pattern from the very first task that introduces it: write to `localStorage` synchronously in the same handler that enqueues the Supabase write, and restore from `localStorage` in `init()` before `loadProgress()` runs. (This was a Plan 3 final-review finding fixed after the fact — do it correctly from the start this time.)
- All user-visible text interpolated into HTML must go through the existing `escapeHtml()` helper in `docs/app.js` — no exceptions, even for content that is currently hardcoded/trusted (matches the rest of the file's discipline).
- `docs/app.js` is a single large growing file. Multiple tasks below **replace whole existing functions** (`loadStaticData`, `loadProgress`, `renderTodayTab`, `renderHomeTab`). Before each such replacement, the implementer must read the actual current function in `docs/app.js` and diff it against this plan's code — if the real file differs from what's shown here (because a task landed between when this plan was written and when it's executed), preserve the real file's logic and merge in only this task's new lines, do not blindly overwrite. This exact caution has already caught two real bugs in this project (see Plan 3's task 3 self-review catch and Plan 3's Task 5 careful-diff dispatch) — treat it as mandatory process, not boilerplate.

---

### Task 1: `bizEnglish.json` content + `RoadmapLogic.flattenBizEnglish` + consistency tests

**Files:**
- Create: `docs/data/bizEnglish.json`
- Modify: `docs/js/roadmap-logic.js`
- Test: `tests/js/data-schema.test.js`
- Test: `tests/js/roadmap-logic.test.js`

**Interfaces:**
- Produces: `docs/data/bizEnglish.json` — array of 12 `{weekNumber, theme, days: [{day, activityType, id}]}` objects, `days` always length 5 in 월/화/수/목/금 order.
- Produces: `RoadmapLogic.flattenBizEnglish(weeks)` — pure function, takes the array shape above, returns a flat array of 60 `{id, weekNumber, theme, day, activityType}` objects (one per leaf item). Tasks 3, 4, and 5 all consume this flattened shape (it has `.id`, so it plugs directly into the existing `RoadmapLogic.progressSummary`/`RoadmapLogic.sortRemaining` functions unchanged).

- [ ] **Step 1: Write the failing tests**

Append to the end of `tests/js/data-schema.test.js` (after the existing `routineCatalog.json` tests, at the bottom of the file):

```js
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
```

Append to the end of `tests/js/roadmap-logic.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/*.test.js`
Expected: `data-schema.test.js` fails immediately with `Cannot find module '../../docs/data/bizEnglish.json'` (file doesn't exist yet). `roadmap-logic.test.js`'s new test fails with `RoadmapLogic.flattenBizEnglish is not a function`.

- [ ] **Step 3: Create `docs/data/bizEnglish.json`**

Write this exact content (validated: 12 weeks, 60 unique ids, all day-orders and activityTypes correct — do not alter any theme text, these were already approved by the user):

```json
[
  {
    "weekNumber": 1,
    "theme": "Introductions & Small Talk — 첫 미팅 인사·자기소개·스몰토크",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w1-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w1-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w1-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w1-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w1-fri" }
    ]
  },
  {
    "weekNumber": 2,
    "theme": "Discovery Call — 고객 요구사항 파악 미팅",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w2-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w2-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w2-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w2-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w2-fri" }
    ]
  },
  {
    "weekNumber": 3,
    "theme": "Technical Deep-Dive Meeting — 기술 심화 설명 미팅",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w3-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w3-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w3-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w3-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w3-fri" }
    ]
  },
  {
    "weekNumber": 4,
    "theme": "Whiteboarding Session — 실시간 화이트보드 설계 논의",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w4-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w4-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w4-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w4-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w4-fri" }
    ]
  },
  {
    "weekNumber": 5,
    "theme": "Demo Presentation — 데모 발표",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w5-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w5-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w5-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w5-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w5-fri" }
    ]
  },
  {
    "weekNumber": 6,
    "theme": "Handling Objections & Q&A — 반론 대응 및 질의응답",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w6-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w6-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w6-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w6-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w6-fri" }
    ]
  },
  {
    "weekNumber": 7,
    "theme": "Proposal Walkthrough — 제안서 설명",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w7-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w7-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w7-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w7-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w7-fri" }
    ]
  },
  {
    "weekNumber": 8,
    "theme": "Architecture Review Meeting — 아키텍처 리뷰 미팅",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w8-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w8-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w8-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w8-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w8-fri" }
    ]
  },
  {
    "weekNumber": 9,
    "theme": "Executive Briefing — 경영진 대상 브리핑",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w9-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w9-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w9-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w9-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w9-fri" }
    ]
  },
  {
    "weekNumber": 10,
    "theme": "Negotiation & Pricing Discussion — 협상 및 가격 논의",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w10-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w10-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w10-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w10-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w10-fri" }
    ]
  },
  {
    "weekNumber": 11,
    "theme": "Workshop Facilitation — 워크숍 진행",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w11-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w11-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w11-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w11-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w11-fri" }
    ]
  },
  {
    "weekNumber": 12,
    "theme": "QBR & Wrap-up — 분기 리뷰 및 다음 단계 논의",
    "days": [
      { "day": "월", "activityType": "핵심 어휘 학습", "id": "w12-mon" },
      { "day": "화", "activityType": "표현 패턴 연습", "id": "w12-tue" },
      { "day": "수", "activityType": "리스닝 & 쉐도잉", "id": "w12-wed" },
      { "day": "목", "activityType": "롤플레이 스크립트 작성", "id": "w12-thu" },
      { "day": "금", "activityType": "리허설 & 녹음 복습", "id": "w12-fri" }
    ]
  }
]
```

- [ ] **Step 4: Add `flattenBizEnglish` to `docs/js/roadmap-logic.js`**

Read the current file first — it's short (under 35 lines). Add the new function and add it to the exported `RoadmapLogic` object. The full current file is:

```js
(function (root) {
  function currentWeekNumber(today, programStart) {
    const msPerDay = 86400000;
    const days = Math.floor((today.getTime() - programStart.getTime()) / msPerDay);
    const week = Math.floor(days / 7) + 1;
    return Math.min(12, Math.max(1, week));
  }

  function progressSummary(items, checkedIds) {
    const total = items.length;
    let done = 0;
    for (const item of items) {
      if (checkedIds.has(item.id)) done++;
    }
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, percent };
  }

  function sortRemaining(items, checkedIds, priorityFn) {
    const remaining = items.filter((item) => !checkedIds.has(item.id));
    if (!priorityFn) return remaining;
    return remaining.slice().sort((a, b) => priorityFn(a) - priorityFn(b));
  }

  function koreanDayName(date) {
    const names = ['일', '월', '화', '수', '목', '금', '토'];
    return names[date.getDay()];
  }

  const RoadmapLogic = { currentWeekNumber, progressSummary, sortRemaining, koreanDayName };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoadmapLogic;
  } else {
    root.RoadmapLogic = RoadmapLogic;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

Replace it with (adds `flattenBizEnglish` and includes it in the exported object — everything else unchanged):

```js
(function (root) {
  function currentWeekNumber(today, programStart) {
    const msPerDay = 86400000;
    const days = Math.floor((today.getTime() - programStart.getTime()) / msPerDay);
    const week = Math.floor(days / 7) + 1;
    return Math.min(12, Math.max(1, week));
  }

  function progressSummary(items, checkedIds) {
    const total = items.length;
    let done = 0;
    for (const item of items) {
      if (checkedIds.has(item.id)) done++;
    }
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { done, total, percent };
  }

  function sortRemaining(items, checkedIds, priorityFn) {
    const remaining = items.filter((item) => !checkedIds.has(item.id));
    if (!priorityFn) return remaining;
    return remaining.slice().sort((a, b) => priorityFn(a) - priorityFn(b));
  }

  function koreanDayName(date) {
    const names = ['일', '월', '화', '수', '목', '금', '토'];
    return names[date.getDay()];
  }

  function flattenBizEnglish(weeks) {
    const flat = [];
    for (const week of weeks) {
      for (const d of week.days) {
        flat.push({ id: d.id, weekNumber: week.weekNumber, theme: week.theme, day: d.day, activityType: d.activityType });
      }
    }
    return flat;
  }

  const RoadmapLogic = { currentWeekNumber, progressSummary, sortRemaining, koreanDayName, flattenBizEnglish };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoadmapLogic;
  } else {
    root.RoadmapLogic = RoadmapLogic;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/*.test.js`
Expected: all tests pass — 34 total (28 existing as of this plan's start + 5 new `data-schema.test.js` tests + 1 new `roadmap-logic.test.js` test), `# fail 0`.

- [ ] **Step 6: Commit**

```bash
git add docs/data/bizEnglish.json docs/js/roadmap-logic.js tests/js/data-schema.test.js tests/js/roadmap-logic.test.js
git commit -m "feat: add Biz English 12-week curriculum data and flattening helper"
```

---

### Task 2: Supabase schema — `biz_english_progress`

**Files:**
- Modify: `supabase/schema.sql`

**Interfaces:**
- Produces: `biz_english_progress` table, consumed by Task 3's `loadProgress()`/`sendBizEnglishCheck`.

- [ ] **Step 1: Append to `supabase/schema.sql`**

Append this to the end of the file (after the existing `nutrition_stats` policy line):

```sql

create table biz_english_progress (
  item_id text primary key,
  checked_at timestamptz not null default now()
);

alter table biz_english_progress enable row level security;

create policy "anon full access" on biz_english_progress for all using (true) with check (true);
```

- [ ] **Step 2: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add biz_english_progress table to Supabase schema"
```

> **Note for the orchestrator (not the implementer):** after this task's commit, the exact SQL above must be run by the user against the live Supabase project's SQL editor before Task 3's Supabase integration can be verified end-to-end — this is a human-only action per this project's established rules, same as Plan 3's Task 2.

---

### Task 3: "오늘" 탭 — Biz English 오늘 항목 (Supabase 연동 + localStorage 캐시 포함)

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `RoadmapLogic.flattenBizEnglish` (Task 1), `makeSendCheck` (existing, `docs/app.js`), `SupabaseQueue.Queue` (existing), `PROGRAM_START`/`RoadmapLogic.currentWeekNumber`/`RoadmapLogic.koreanDayName` (existing), `biz_english_progress` table (Task 2).
- Produces: `bizEnglishWeeks` (raw `docs/data/bizEnglish.json` content, module-level), `bizEnglishFlatItems` (flattened, module-level — consumed by Tasks 4 and 5), `bizEnglishChecked` (Set of checked item ids, module-level — consumed by Tasks 4 and 5).

> **Before starting this task:** read the actual current `/home/rainny/dev-run/gcp-ce-roadmap/docs/app.js` in full for the regions this task touches (module-level state declarations near the top, `loadProgress()`, `loadStaticData()`, `renderTodayTab()`, and the `init()` IIFE at the bottom). The code blocks below reflect the file's state as of Plan 3's merge (commit `44aa366`). If the real file has drifted (e.g. a line number shifted, or new state was added by work landed after this plan was written), treat the **real file as ground truth** — preserve everything already there and merge in only this task's new lines. Do not silently drop existing logic; if you are not confident the merge is correct, report BLOCKED with specifics rather than guessing.

- [ ] **Step 1: Add module-level state variables**

Find this line near the top of `docs/app.js`:

```js
  let mealNotes = {}; // slot -> text, 오늘 하루치만 (아침/점심/저녁/간식)
  const PROGRAM_START = new Date('2026-08-04T00:00:00');
```

Insert three new lines between them:

```js
  let mealNotes = {}; // slot -> text, 오늘 하루치만 (아침/점심/저녁/간식)
  let bizEnglishWeeks = []; // docs/data/bizEnglish.json 원본 (12주)
  let bizEnglishFlatItems = []; // RoadmapLogic.flattenBizEnglish(bizEnglishWeeks) 결과 (60개)
  let bizEnglishChecked = new Set(); // 체크된 item_id (w1-mon 등), 12주 범위 전체
  const PROGRAM_START = new Date('2026-08-04T00:00:00');
```

- [ ] **Step 2: Add a new `SupabaseQueue.Queue` instance**

Find this line:

```js
  const customItemQueue = new SupabaseQueue.Queue();
```

Add a new line directly below it:

```js
  const customItemQueue = new SupabaseQueue.Queue();
  const bizEnglishQueue = new SupabaseQueue.Queue();
```

- [ ] **Step 3: Add the send function**

Find this line (the last of the four `makeSendCheck(...)`-based constants):

```js
  const sendMaturityCheck = makeSendCheck('maturity_checkins', (op) => ({ question_id: op.questionId, checkpoint: op.checkpoint }));
```

Add a new line directly below it:

```js
  const sendMaturityCheck = makeSendCheck('maturity_checkins', (op) => ({ question_id: op.questionId, checkpoint: op.checkpoint }));
  const sendBizEnglishCheck = makeSendCheck('biz_english_progress', (op) => ({ item_id: op.itemId }));
```

- [ ] **Step 4: Extend `loadStaticData()`**

Verify the current function still matches this (if it doesn't, merge per the warning above instead of blind-replacing):

```js
  async function loadStaticData() {
    const [roadmapRes, capabilitiesRes, weeklyRoutineRes, maturityRes, routineCatalogRes] = await Promise.all([
      fetch('data/roadmap.json'),
      fetch('data/capabilities.json'),
      fetch('data/weeklyRoutine.json'),
      fetch('data/maturity.json'),
      fetch('data/routineCatalog.json'),
    ]);
    roadmapItems = await roadmapRes.json();
    capabilityItems = await capabilitiesRes.json();
    weeklyRoutineItems = await weeklyRoutineRes.json();
    maturityItems = await maturityRes.json();
    routineCatalogItems = await routineCatalogRes.json();
  }
```

Replace with:

```js
  async function loadStaticData() {
    const [roadmapRes, capabilitiesRes, weeklyRoutineRes, maturityRes, routineCatalogRes, bizEnglishRes] = await Promise.all([
      fetch('data/roadmap.json'),
      fetch('data/capabilities.json'),
      fetch('data/weeklyRoutine.json'),
      fetch('data/maturity.json'),
      fetch('data/routineCatalog.json'),
      fetch('data/bizEnglish.json'),
    ]);
    roadmapItems = await roadmapRes.json();
    capabilityItems = await capabilitiesRes.json();
    weeklyRoutineItems = await weeklyRoutineRes.json();
    maturityItems = await maturityRes.json();
    routineCatalogItems = await routineCatalogRes.json();
    bizEnglishWeeks = await bizEnglishRes.json();
    bizEnglishFlatItems = RoadmapLogic.flattenBizEnglish(bizEnglishWeeks);
  }
```

- [ ] **Step 5: Extend `loadProgress()`**

Verify the current function still matches this:

```js
  async function loadProgress() {
    const today = todayDateString();
    const [roadmapRows, capabilityRows, weeklyRows, maturityRows, routineRows, customRows] = await Promise.all([
      supabaseClient.from('roadmap_progress').select('item_id'),
      supabaseClient.from('capability_progress').select('item_id'),
      supabaseClient.from('weekly_checkins').select('week_number, day'),
      supabaseClient.from('maturity_checkins').select('question_id, checkpoint'),
      supabaseClient.from('routine_checkins').select('item_id, payload').eq('date', today),
      supabaseClient.from('routine_custom_items').select('name, section'),
    ]);
    if (roadmapRows.error || capabilityRows.error || weeklyRows.error || maturityRows.error || routineRows.error || customRows.error) {
      throw roadmapRows.error || capabilityRows.error || weeklyRows.error || maturityRows.error || routineRows.error || customRows.error;
    }
    roadmapChecked = new Set((roadmapRows.data || []).map((r) => r.item_id));
    capabilityChecked = new Set((capabilityRows.data || []).map((r) => r.item_id));
    weeklyChecked = new Set((weeklyRows.data || []).map((r) => `${r.week_number}-${r.day}`));
    maturityChecked = new Set((maturityRows.data || []).map((r) => `${r.question_id}-${r.checkpoint}`));
    routineChecked = new Set((routineRows.data || []).map((r) => r.item_id));
    routineMetrics = {};
    for (const r of routineRows.data || []) {
      if (r.payload && r.payload.km !== undefined) routineMetrics[r.item_id] = r.payload.km;
    }
    customRoutineItems = (customRows.data || []).map((r) => ({ name: r.name, section: r.section }));
  }
```

Replace with:

```js
  async function loadProgress() {
    const today = todayDateString();
    const [roadmapRows, capabilityRows, weeklyRows, maturityRows, routineRows, customRows, bizEnglishRows] = await Promise.all([
      supabaseClient.from('roadmap_progress').select('item_id'),
      supabaseClient.from('capability_progress').select('item_id'),
      supabaseClient.from('weekly_checkins').select('week_number, day'),
      supabaseClient.from('maturity_checkins').select('question_id, checkpoint'),
      supabaseClient.from('routine_checkins').select('item_id, payload').eq('date', today),
      supabaseClient.from('routine_custom_items').select('name, section'),
      supabaseClient.from('biz_english_progress').select('item_id'),
    ]);
    if (roadmapRows.error || capabilityRows.error || weeklyRows.error || maturityRows.error || routineRows.error || customRows.error || bizEnglishRows.error) {
      throw roadmapRows.error || capabilityRows.error || weeklyRows.error || maturityRows.error || routineRows.error || customRows.error || bizEnglishRows.error;
    }
    roadmapChecked = new Set((roadmapRows.data || []).map((r) => r.item_id));
    capabilityChecked = new Set((capabilityRows.data || []).map((r) => r.item_id));
    weeklyChecked = new Set((weeklyRows.data || []).map((r) => `${r.week_number}-${r.day}`));
    maturityChecked = new Set((maturityRows.data || []).map((r) => `${r.question_id}-${r.checkpoint}`));
    routineChecked = new Set((routineRows.data || []).map((r) => r.item_id));
    routineMetrics = {};
    for (const r of routineRows.data || []) {
      if (r.payload && r.payload.km !== undefined) routineMetrics[r.item_id] = r.payload.km;
    }
    customRoutineItems = (customRows.data || []).map((r) => ({ name: r.name, section: r.section }));
    bizEnglishChecked = new Set((bizEnglishRows.data || []).map((r) => r.item_id));
  }
```

- [ ] **Step 6: Extend `renderTodayTab()`**

Verify the current function still matches this:

```js
  function renderTodayTab(container, routineItems, checkedIds) {
    const today = new Date();
    const week = RoadmapLogic.currentWeekNumber(today, PROGRAM_START);
    const dayName = RoadmapLogic.koreanDayName(today);
    const routineItem = routineItems.find((r) => r.day === dayName);
    const key = `${week}-${dayName}`;
    const checked = checkedIds.has(key);
    const routineHtml = routineItem ? `
      <div class="item-row">
        <input type="checkbox" id="today-routine" data-weekly-key="${key}" ${checked ? 'checked' : ''}>
        <label for="today-routine">[${escapeHtml(dayName)}요일] ${escapeHtml(routineItem.theme)}</label>
      </div>` : '<p>이번 요일에 해당하는 루틴이 없습니다.</p>';
    container.innerHTML = `
      <p>${week}주차 · ${escapeHtml(dayName)}요일</p>
      <h2>CE 주간 루틴</h2>
      ${routineHtml}
      <h2>오늘의 운동·약</h2>
      <div id="routine-checklist"></div>
      <div id="custom-item-form"></div>
      <div id="meal-form"></div>
    `;
    const checkbox = container.querySelector('[data-weekly-key]');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        const k = e.target.dataset.weeklyKey;
        const checked = e.target.checked;
        const [weekNumber, day] = k.split('-');
        if (checked) weeklyChecked.add(k); else weeklyChecked.delete(k);
        localStorage.setItem('gcp-ce-roadmap:weeklyChecked', JSON.stringify([...weeklyChecked]));
        weeklyQueue.enqueue({ weekNumber: Number(weekNumber), day, checked });
        weeklyQueue.flush(sendWeeklyRoutineCheck);
        renderTodayTab(container, weeklyRoutineItems, weeklyChecked);
      });
    }
    renderRoutineChecklist(document.getElementById('routine-checklist'), routineCatalogItems, customRoutineItems, routineChecked, routineMetrics);
    renderCustomItemForm(document.getElementById('custom-item-form'));
    renderMealForm(document.getElementById('meal-form'));
  }
```

Replace with (adds a "Biz English" section between the CE weekly routine section and the exercise/medication section — the checkbox handler pattern mirrors the CE weekly routine checkbox directly above it, including the localStorage-cache-then-Supabase-queue order):

```js
  function renderTodayTab(container, routineItems, checkedIds) {
    const today = new Date();
    const week = RoadmapLogic.currentWeekNumber(today, PROGRAM_START);
    const dayName = RoadmapLogic.koreanDayName(today);
    const routineItem = routineItems.find((r) => r.day === dayName);
    const key = `${week}-${dayName}`;
    const checked = checkedIds.has(key);
    const routineHtml = routineItem ? `
      <div class="item-row">
        <input type="checkbox" id="today-routine" data-weekly-key="${key}" ${checked ? 'checked' : ''}>
        <label for="today-routine">[${escapeHtml(dayName)}요일] ${escapeHtml(routineItem.theme)}</label>
      </div>` : '<p>이번 요일에 해당하는 루틴이 없습니다.</p>';
    const bizWeekData = bizEnglishWeeks.find((w) => w.weekNumber === week);
    const bizDay = bizWeekData ? bizWeekData.days.find((d) => d.day === dayName) : undefined;
    const bizChecked = bizDay ? bizEnglishChecked.has(bizDay.id) : false;
    const bizEnglishHtml = bizDay ? `
      <div class="item-row">
        <input type="checkbox" id="today-biz-english" data-biz-english-id="${bizDay.id}" ${bizChecked ? 'checked' : ''}>
        <label for="today-biz-english">[${week}주차 ${escapeHtml(dayName)}] ${escapeHtml(bizWeekData.theme)} — ${escapeHtml(bizDay.activityType)}</label>
      </div>` : '<p>오늘은 Biz English 학습이 없는 요일입니다 (평일만).</p>';
    container.innerHTML = `
      <p>${week}주차 · ${escapeHtml(dayName)}요일</p>
      <h2>CE 주간 루틴</h2>
      ${routineHtml}
      <h2>Biz English</h2>
      ${bizEnglishHtml}
      <h2>오늘의 운동·약</h2>
      <div id="routine-checklist"></div>
      <div id="custom-item-form"></div>
      <div id="meal-form"></div>
    `;
    const checkbox = container.querySelector('[data-weekly-key]');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        const k = e.target.dataset.weeklyKey;
        const checked = e.target.checked;
        const [weekNumber, day] = k.split('-');
        if (checked) weeklyChecked.add(k); else weeklyChecked.delete(k);
        localStorage.setItem('gcp-ce-roadmap:weeklyChecked', JSON.stringify([...weeklyChecked]));
        weeklyQueue.enqueue({ weekNumber: Number(weekNumber), day, checked });
        weeklyQueue.flush(sendWeeklyRoutineCheck);
        renderTodayTab(container, weeklyRoutineItems, weeklyChecked);
      });
    }
    const bizCheckbox = container.querySelector('[data-biz-english-id]');
    if (bizCheckbox) {
      bizCheckbox.addEventListener('change', (e) => {
        const itemId = e.target.dataset.bizEnglishId;
        const checked = e.target.checked;
        if (checked) bizEnglishChecked.add(itemId); else bizEnglishChecked.delete(itemId);
        localStorage.setItem('gcp-ce-roadmap:bizEnglishChecked', JSON.stringify([...bizEnglishChecked]));
        bizEnglishQueue.enqueue({ itemId, checked });
        bizEnglishQueue.flush(sendBizEnglishCheck);
        renderTodayTab(container, weeklyRoutineItems, weeklyChecked);
      });
    }
    renderRoutineChecklist(document.getElementById('routine-checklist'), routineCatalogItems, customRoutineItems, routineChecked, routineMetrics);
    renderCustomItemForm(document.getElementById('custom-item-form'));
    renderMealForm(document.getElementById('meal-form'));
  }
```

- [ ] **Step 7: Extend `init()`'s localStorage restore and writeback**

Verify the current `init()` IIFE still matches this:

```js
  (async function init() {
    await loadStaticData();
    customRoutineItems = loadCustomRoutineItems();
    try {
      roadmapChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:roadmapChecked') || '[]'));
      capabilityChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:capabilityChecked') || '[]'));
      weeklyChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:weeklyChecked') || '[]'));
      maturityChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:maturityChecked') || '[]'));
      const today = todayDateString();
      routineChecked = new Set(JSON.parse(localStorage.getItem(`gcp-ce-roadmap:routineChecked:${today}`) || '[]'));
      routineMetrics = JSON.parse(localStorage.getItem(`gcp-ce-roadmap:routineMetrics:${today}`) || '{}');
      mealNotes = JSON.parse(localStorage.getItem(`gcp-ce-roadmap:mealNotes:${today}`) || '{}');
    } catch (e) { /* localStorage 비어있거나 손상 — 빈 Set으로 시작 */ }
    renderTab(currentTabFromHash());
    try {
      await loadProgress();
      await loadNutritionStats();
      localStorage.setItem('gcp-ce-roadmap:roadmapChecked', JSON.stringify([...roadmapChecked]));
      localStorage.setItem('gcp-ce-roadmap:capabilityChecked', JSON.stringify([...capabilityChecked]));
      localStorage.setItem('gcp-ce-roadmap:weeklyChecked', JSON.stringify([...weeklyChecked]));
      localStorage.setItem('gcp-ce-roadmap:maturityChecked', JSON.stringify([...maturityChecked]));
      localStorage.setItem(`gcp-ce-roadmap:routineChecked:${todayDateString()}`, JSON.stringify([...routineChecked]));
      localStorage.setItem(`gcp-ce-roadmap:routineMetrics:${todayDateString()}`, JSON.stringify(routineMetrics));
      renderTab(currentTabFromHash());
    } catch (e) {
      console.warn('Supabase 로드 실패 — localStorage 상태로 계속', e);
    }
  })();
```

Replace with (adds `bizEnglishChecked` to both the restore block and the post-load writeback block, in the same style as `maturityChecked` since Biz English is also 12-week-bounded, not daily-scoped):

```js
  (async function init() {
    await loadStaticData();
    customRoutineItems = loadCustomRoutineItems();
    try {
      roadmapChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:roadmapChecked') || '[]'));
      capabilityChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:capabilityChecked') || '[]'));
      weeklyChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:weeklyChecked') || '[]'));
      maturityChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:maturityChecked') || '[]'));
      bizEnglishChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:bizEnglishChecked') || '[]'));
      const today = todayDateString();
      routineChecked = new Set(JSON.parse(localStorage.getItem(`gcp-ce-roadmap:routineChecked:${today}`) || '[]'));
      routineMetrics = JSON.parse(localStorage.getItem(`gcp-ce-roadmap:routineMetrics:${today}`) || '{}');
      mealNotes = JSON.parse(localStorage.getItem(`gcp-ce-roadmap:mealNotes:${today}`) || '{}');
    } catch (e) { /* localStorage 비어있거나 손상 — 빈 Set으로 시작 */ }
    renderTab(currentTabFromHash());
    try {
      await loadProgress();
      await loadNutritionStats();
      localStorage.setItem('gcp-ce-roadmap:roadmapChecked', JSON.stringify([...roadmapChecked]));
      localStorage.setItem('gcp-ce-roadmap:capabilityChecked', JSON.stringify([...capabilityChecked]));
      localStorage.setItem('gcp-ce-roadmap:weeklyChecked', JSON.stringify([...weeklyChecked]));
      localStorage.setItem('gcp-ce-roadmap:maturityChecked', JSON.stringify([...maturityChecked]));
      localStorage.setItem('gcp-ce-roadmap:bizEnglishChecked', JSON.stringify([...bizEnglishChecked]));
      localStorage.setItem(`gcp-ce-roadmap:routineChecked:${todayDateString()}`, JSON.stringify([...routineChecked]));
      localStorage.setItem(`gcp-ce-roadmap:routineMetrics:${todayDateString()}`, JSON.stringify(routineMetrics));
      renderTab(currentTabFromHash());
    } catch (e) {
      console.warn('Supabase 로드 실패 — localStorage 상태로 계속', e);
    }
  })();
```

- [ ] **Step 8: Static verification (no browser in this environment — accepted limitation)**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --check docs/app.js`
Expected: no output (syntax valid).

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/*.test.js`
Expected: `# fail 0` (this task doesn't add new automated tests of its own — `app.js` has no direct unit-test harness in this project, an established pre-existing condition — but must not regress the existing suite).

If a browser is available, also do: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`, then at `#/today` confirm the "Biz English" section shows the correct week/day/theme/activityType and the checkbox toggles. If unavailable, note this honestly in the report as a deferred manual check (matches the pattern from Plans 1-3).

- [ ] **Step 9: Commit**

```bash
git add docs/app.js
git commit -m "feat: add Biz English today-item display and Supabase-backed checking"
```

---

### Task 4: "홈" 탭 — Biz English 진척률 요약

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `bizEnglishFlatItems`, `bizEnglishChecked` (Task 3).

- [ ] **Step 1: Extend `renderHomeTab()`**

Verify the current function still matches this:

```js
  function renderHomeTab(container) {
    const roadmapSummary = RoadmapLogic.progressSummary(roadmapItems, roadmapChecked);
    const capabilitySummary = RoadmapLogic.progressSummary(capabilityItems, capabilityChecked);
    const week = RoadmapLogic.currentWeekNumber(new Date(), PROGRAM_START);
    const weekDayItems = weeklyRoutineItems.map((r) => ({ id: `${week}-${r.day}` }));
    const weeklySummary = RoadmapLogic.progressSummary(weekDayItems, weeklyChecked);
    const checkpoint = defaultCheckpoint(week);
    const checkpointItems = maturityItems.map((m) => ({ id: `${m.id}-${checkpoint}` }));
    const maturitySummary = RoadmapLogic.progressSummary(checkpointItems, maturityChecked);
    const routineSummary = RoadmapLogic.progressSummary(routineCatalogItems, routineChecked);
    container.innerHTML = `
      <p>현재 ${week}주차 (2026-08-04 시작)</p>
      <div class="item-row"><label>로드맵 진척률</label><span>${roadmapSummary.done}/${roadmapSummary.total} (${roadmapSummary.percent}%)</span></div>
      <div class="item-row"><label>역량 체크 진척률</label><span>${capabilitySummary.done}/${capabilitySummary.total} (${capabilitySummary.percent}%)</span></div>
      <div class="item-row"><label>이번 주 루틴</label><span>${weeklySummary.done}/${weeklySummary.total} (${weeklySummary.percent}%)</span></div>
      <div class="item-row"><label>성숙도 체크포인트 ${checkpoint}</label><span>${maturitySummary.done}/${maturitySummary.total} (${maturitySummary.percent}%)</span></div>
      <div class="item-row"><label>오늘 운동·약</label><span>${routineSummary.done}/${routineSummary.total} (${routineSummary.percent}%)</span></div>
    `;
  }
```

Replace with:

```js
  function renderHomeTab(container) {
    const roadmapSummary = RoadmapLogic.progressSummary(roadmapItems, roadmapChecked);
    const capabilitySummary = RoadmapLogic.progressSummary(capabilityItems, capabilityChecked);
    const week = RoadmapLogic.currentWeekNumber(new Date(), PROGRAM_START);
    const weekDayItems = weeklyRoutineItems.map((r) => ({ id: `${week}-${r.day}` }));
    const weeklySummary = RoadmapLogic.progressSummary(weekDayItems, weeklyChecked);
    const checkpoint = defaultCheckpoint(week);
    const checkpointItems = maturityItems.map((m) => ({ id: `${m.id}-${checkpoint}` }));
    const maturitySummary = RoadmapLogic.progressSummary(checkpointItems, maturityChecked);
    const routineSummary = RoadmapLogic.progressSummary(routineCatalogItems, routineChecked);
    const bizEnglishSummary = RoadmapLogic.progressSummary(bizEnglishFlatItems, bizEnglishChecked);
    container.innerHTML = `
      <p>현재 ${week}주차 (2026-08-04 시작)</p>
      <div class="item-row"><label>로드맵 진척률</label><span>${roadmapSummary.done}/${roadmapSummary.total} (${roadmapSummary.percent}%)</span></div>
      <div class="item-row"><label>역량 체크 진척률</label><span>${capabilitySummary.done}/${capabilitySummary.total} (${capabilitySummary.percent}%)</span></div>
      <div class="item-row"><label>이번 주 루틴</label><span>${weeklySummary.done}/${weeklySummary.total} (${weeklySummary.percent}%)</span></div>
      <div class="item-row"><label>성숙도 체크포인트 ${checkpoint}</label><span>${maturitySummary.done}/${maturitySummary.total} (${maturitySummary.percent}%)</span></div>
      <div class="item-row"><label>오늘 운동·약</label><span>${routineSummary.done}/${routineSummary.total} (${routineSummary.percent}%)</span></div>
      <div class="item-row"><label>Biz English</label><span>${bizEnglishSummary.done}/${bizEnglishSummary.total} (${bizEnglishSummary.percent}%)</span></div>
    `;
  }
```

- [ ] **Step 2: Static verification**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --check docs/app.js`
Expected: no output.

If a browser is available: confirm `#/` shows a "Biz English" row with the correct x/60 count. If unavailable, note as deferred (same accepted pattern as before).

- [ ] **Step 3: Commit**

```bash
git add docs/app.js
git commit -m "feat: add Biz English progress summary to home tab"
```

---

### Task 5: "리포트" 탭 — 통합 미완료 목록에 Biz English 추가

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `bizEnglishFlatItems`, `bizEnglishChecked` (Task 3), `RoadmapLogic.sortRemaining` (existing).

- [ ] **Step 1: Extend the remaining-items block inside `renderReportTab()`**

Find this exact block inside `renderReportTab` (it's the `remainingRoadmap`/`remainingCapabilities`/`remainingHtml` section, roughly in the middle of the function, right before the `container.innerHTML = ...` assignment):

```js
    const remainingRoadmap = RoadmapLogic.sortRemaining(roadmapItems, roadmapChecked, (i) => i.phase);
    const remainingCapabilities = RoadmapLogic.sortRemaining(capabilityItems, capabilityChecked, (i) => i.categoryId);
    const remainingHtml = `
      <h2>아직 안 한 것</h2>
      <h3>로드맵 (${remainingRoadmap.length}개 남음)</h3>
      ${remainingRoadmap.length === 0 ? '<p>모두 완료했습니다.</p>' : remainingRoadmap.map((i) => `<div class="item-row"><label>${escapeHtml(i.title)}</label></div>`).join('')}
      <h3>역량 체크 (${remainingCapabilities.length}개 남음)</h3>
      ${remainingCapabilities.length === 0 ? '<p>모두 완료했습니다.</p>' : remainingCapabilities.map((i) => `<div class="item-row"><label>${escapeHtml(i.title)}</label></div>`).join('')}
    `;
```

Replace with (adds a Biz English section, sorted by week number, showing week/day/theme/activityType since Biz English items don't have a `.title` field like roadmap/capability items do):

```js
    const remainingRoadmap = RoadmapLogic.sortRemaining(roadmapItems, roadmapChecked, (i) => i.phase);
    const remainingCapabilities = RoadmapLogic.sortRemaining(capabilityItems, capabilityChecked, (i) => i.categoryId);
    const remainingBizEnglish = RoadmapLogic.sortRemaining(bizEnglishFlatItems, bizEnglishChecked, (i) => i.weekNumber);
    const remainingHtml = `
      <h2>아직 안 한 것</h2>
      <h3>로드맵 (${remainingRoadmap.length}개 남음)</h3>
      ${remainingRoadmap.length === 0 ? '<p>모두 완료했습니다.</p>' : remainingRoadmap.map((i) => `<div class="item-row"><label>${escapeHtml(i.title)}</label></div>`).join('')}
      <h3>역량 체크 (${remainingCapabilities.length}개 남음)</h3>
      ${remainingCapabilities.length === 0 ? '<p>모두 완료했습니다.</p>' : remainingCapabilities.map((i) => `<div class="item-row"><label>${escapeHtml(i.title)}</label></div>`).join('')}
      <h3>Biz English (${remainingBizEnglish.length}개 남음)</h3>
      ${remainingBizEnglish.length === 0 ? '<p>모두 완료했습니다.</p>' : remainingBizEnglish.map((i) => `<div class="item-row"><label>[${i.weekNumber}주차 ${escapeHtml(i.day)}] ${escapeHtml(i.theme)} — ${escapeHtml(i.activityType)}</label></div>`).join('')}
    `;
```

(The rest of `renderReportTab` — the maturity checklist section below this block — is untouched by this task.)

- [ ] **Step 2: Static verification**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --check docs/app.js`
Expected: no output.

If a browser is available: confirm `#/report` shows a "Biz English" remaining-items section. If unavailable, note as deferred.

- [ ] **Step 3: Commit**

```bash
git add docs/app.js
git commit -m "feat: add Biz English to report tab's combined remaining-items list"
```

---

### Task 6: 전체 테스트 + 배포 확인

**Files:** 없음(검증만)

- [ ] **Step 1: JS 유닛테스트 전체 실행**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/*.test.js`
Expected: all pass, `# fail 0`.

- [ ] **Step 2: Python 유닛테스트 전체 실행 (회귀 확인용 — 이 plan은 Python 파일을 건드리지 않음)**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && python3 -m pytest -q`
Expected: all pass, same count as before this plan (26).

- [ ] **Step 3 (PR/merge 후, 사용자 수행): 실기기 확인**

`https://eldanscript.github.io/gcp-ce-roadmap/`에서 "오늘" 탭에 오늘 요일에 맞는 Biz English 항목(평일만)이 뜨는지, 체크가 새로고침 후에도 유지되는지, "홈" 탭에 Biz English x/60 진척률이 보이는지, "리포트" 탭 통합 미완료 목록에 Biz English 항목이 보이는지 확인.

---
