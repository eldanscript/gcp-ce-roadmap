# 운동 루틴 + 영양분석 배치 (Plan 3/4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** jammy-routine의 구조(운동+약+간식/식사 기록, 무기한 반복)를 rainny 전용 종목으로
이식하고, routine-jammy의 영양분석 파이프라인(`nutrition_lookup.py`)을 포팅해 주간 배치로
식단 영양 리포트를 계산한다. Plan 1/2와 달리 이 레이어는 **12주 프로그램과 무관하게
날짜(date) 기준으로 무기한 반복**되고, 커스텀 항목 추가를 지원하며, 이 프로젝트 최초의
Python 컴포넌트(영양분석 배치)를 포함한다.

**Architecture:** 프런트엔드는 기존 정적 PWA + Supabase 패턴 그대로. 새 레이어는
`(date, item_id)` 복합키로 "오늘"만 조회하는 방식(다른 4개 테이블처럼 전체를 다 불러오지
않음 — 이 테이블은 매일 커진다). 영양분석은 별도 Python 배치(`src/gcp-ce-roadmap/
weekly_nutrition_refresh.py`)가 Supabase REST API를 `requests`로 직접 호출해 `routine_meals`를
읽고 `nutrition_stats`에 쓴다 — Telegram/알림 없음, 순수 계산. crontab으로 주 1회 실행.

**Tech Stack:** Vanilla JS(기존), Supabase JS client(기존), **Python 3 + `requests` +
`pytest`(신규)**, `node --test`(JS 유닛테스트).

## Global Constraints

- 저장소: `/home/rainny/dev-run/gcp-ce-roadmap` (Plan 1/2 이미 main에 merge·배포됨).
- 콘텐츠(운동 7종+약 4종)는 `docs/superpowers/specs/2026-08-02-gcp-ce-roadmap-design.md`의
  "운동 루틴 카탈로그" 절이 원본.
- `docs/config.js`는 **커밋한다**(Plan 1의 gitignore 실수를 반복하지 않음 — 이미 커밋된
  상태이므로 이 계획에서 새로 만들 필요 없음, 기존 파일 그대로 재사용).
- **설계 단순화 1 (이 계획에서 확정)**: km 입력은 원래 논의됐던 "text+inputmode=decimal+콤마
  치환 파싱" 방식 대신 **`<input type="number" step="0.1">` 네이티브 검증**으로 단순화한다 —
  이 앱은 jammy 대상이 아니라 rainny 본인이 쓰는 도구라 한글 키패드 콤마 이슈를 방어할
  필요가 없다.
- **설계 단순화 2**: `nutrition_stats`는 히스토리를 쌓지 않고 **`week_id = 'latest'`
  고정 단일 row**를 매주 upsert한다 — "최근 영양 리포트" 한 장만 필요하고 과거 주차 조회
  기능은 범위 밖이므로, 스펙 문서의 `week_id` 동적 키 설계보다 단순화.
- **설계 단순화 3**: `routine_checkins`는 **오늘 날짜만 조회**한다(`?date=eq.<오늘>`) —
  다른 4개 테이블(로드맵/역량/주간루틴/성숙도)은 전체를 다 불러와도 데이터 양이
  유한하지만, 이 테이블은 매일 row가 쌓여 무한히 커지므로 전체 로드는 하지 않는다.
- 커스텀 항목(운동/약)은 **Supabase가 아니라 localStorage**에 저장한다(routine-jammy와
  동일 패턴) — 카탈로그 자체를 바꾸지 않고 클라이언트에만 존재.
- CE 로드맵/역량/Biz English와 달리 이 레이어만 **커스텀 추가를 지원**한다(spec의 Out of
  scope 절 참고).
- Python 컴포넌트는 `venv` 없이 시스템/사용자 pip 환경을 가정한다(routine-jammy의 실제
  crontab 패턴과 동일 — venv 명시 관리는 범위 밖).

---

## Task 1: 운동+약 카탈로그 JSON + 일관성 테스트

**Files:**
- Create: `docs/data/routineCatalog.json`
- Modify: `tests/js/data-schema.test.js`

**Interfaces:**
- Produces: `{id, section("exercise"|"medication"), title, metric?({key,unit,min,max})}[]`
  (11개) — Task 3이 이 필드 이름을 그대로 쓴다.

- [ ] **Step 1: `docs/data/routineCatalog.json` 작성**

```json
[
  {"id": "ex1", "section": "exercise", "title": "슬로우 조깅", "metric": {"key": "km", "unit": "km", "min": 0.1, "max": 99}},
  {"id": "ex2", "section": "exercise", "title": "러닝 머신"},
  {"id": "ex3", "section": "exercise", "title": "실내 사이클링"},
  {"id": "ex4", "section": "exercise", "title": "근력 강화"},
  {"id": "ex5", "section": "exercise", "title": "허리 강화 스트레칭"},
  {"id": "ex6", "section": "exercise", "title": "스쿼트"},
  {"id": "ex7", "section": "exercise", "title": "푸쉬업"},
  {"id": "med1", "section": "medication", "title": "고지혈증약"},
  {"id": "med2", "section": "medication", "title": "코큐텐"},
  {"id": "med3", "section": "medication", "title": "비타민C/D"},
  {"id": "med4", "section": "medication", "title": "마그네슘"}
]
```

- [ ] **Step 2: `tests/js/data-schema.test.js` 끝에 테스트 추가**

```js
const routineCatalog = require('../../docs/data/routineCatalog.json');

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
```

- [ ] **Step 3: 테스트 실행해 통과 확인**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/data-schema.test.js`
Expected: 이전 12개 + 신규 3개 = 15개 모두 pass

- [ ] **Step 4: Commit**

```bash
git add docs/data/routineCatalog.json tests/js/data-schema.test.js
git commit -m "feat: add exercise/medication catalog content (11 items) with schema tests"
```

---

## Task 2: Supabase 스키마 추가 (운동/약/커스텀/식사/영양)

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: `supabase/schema.sql` 끝에 추가**

```sql

create table routine_checkins (
  date date not null,
  item_id text not null,
  payload jsonb,
  checked_at timestamptz not null default now(),
  primary key (date, item_id)
);

create table routine_custom_items (
  name text primary key,
  section text not null check (section in ('exercise', 'medication')),
  created_at timestamptz not null default now()
);

create table routine_meals (
  date date not null,
  slot text not null check (slot in ('아침', '점심', '저녁', '간식')),
  note text,
  primary key (date, slot)
);

create table nutrition_stats (
  week_id text primary key,
  weekly_average jsonb,
  recommendations jsonb,
  unmatched_food_items jsonb,
  updated_at timestamptz not null default now()
);

alter table routine_checkins enable row level security;
alter table routine_custom_items enable row level security;
alter table routine_meals enable row level security;
alter table nutrition_stats enable row level security;

create policy "anon full access" on routine_checkins for all using (true) with check (true);
create policy "anon full access" on routine_custom_items for all using (true) with check (true);
create policy "anon full access" on routine_meals for all using (true) with check (true);
create policy "anon full access" on nutrition_stats for all using (true) with check (true);
```

- [ ] **Step 2 (사용자 수행): 기존 Supabase 프로젝트 SQL Editor에서 위 추가분 실행**

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add routine_checkins/routine_custom_items/routine_meals/nutrition_stats schema"
```

---

## Task 3: "오늘" 탭 — 운동+약 체크리스트 (로컬 상태만)

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `routineCatalog.json`(Task 1).
- Produces: `renderRoutineChecklist(container, catalogItems, customItems, checkedIds,
  metrics)` — Task 4가 커스텀 추가 UI를 이 함수 호출부 옆에 이어붙이고, Task 5가 Supabase
  연동 시 이 함수를 그대로 재사용.

- [ ] **Step 1: 모듈 최상단 상태 변수 추가** (Task 5(Plan2)의 `maturityChecked` 선언 바로
  아래 — 현재 `docs/app.js`에서 정확한 위치를 확인할 것)

```js
  let routineCatalogItems = [];
  let routineChecked = new Set(); // 오늘 체크된 item_id만 (날짜 무관 — 항상 "오늘" 스코프)
  let routineMetrics = {}; // item_id -> 숫자 (예: ex1의 km)
  let customRoutineItems = []; // [{name, section}], localStorage에서 로드 (Task 4)
```

- [ ] **Step 2: `loadStaticData()`에 routineCatalog.json 로드 추가** (기존 `Promise.all`
  교체 — 현재 4개 fetch에 1개 추가)

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

- [ ] **Step 3: `todayDateString()` 헬퍼 + `renderRoutineChecklist` 추가** (`renderTodayTab`
  함수 바로 위에 삽입)

```js
  function todayDateString() {
    return new Date().toISOString().slice(0, 10);
  }

  function renderRoutineChecklist(container, catalogItems, customItems, checkedIds, metrics) {
    const sections = [
      { key: 'exercise', label: '운동' },
      { key: 'medication', label: '약/영양제' },
    ];
    const html = sections.map(({ key, label }) => {
      const catalogRows = catalogItems.filter((i) => i.section === key);
      const customRows = customItems.filter((c) => c.section === key).map((c) => ({ id: c.name, section: key, title: c.name }));
      const rows = [...catalogRows, ...customRows].map((item) => {
        const checked = checkedIds.has(item.id);
        const metricInput = item.metric
          ? `<input type="number" step="0.1" min="${item.metric.min}" max="${item.metric.max}" class="metric-input" data-metric-for="${item.id}" value="${metrics[item.id] !== undefined ? metrics[item.id] : ''}" placeholder="${escapeHtml(item.metric.unit)}">`
          : '';
        return `
          <div class="item-row">
            <input type="checkbox" id="routine-${item.id}" data-routine-id="${item.id}" ${checked ? 'checked' : ''}>
            <label for="routine-${item.id}">${escapeHtml(item.title)}</label>
            ${metricInput}
          </div>`;
      }).join('');
      return `<h3>${escapeHtml(label)}</h3>${rows}`;
    }).join('');
    container.innerHTML = html;
    container.querySelectorAll('[data-routine-id]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const id = e.target.dataset.routineId;
        if (e.target.checked) routineChecked.add(id); else routineChecked.delete(id);
        renderRoutineChecklist(container, routineCatalogItems, customRoutineItems, routineChecked, routineMetrics);
      });
    });
    container.querySelectorAll('[data-metric-for]').forEach((el) => {
      el.addEventListener('blur', (e) => {
        const id = e.target.dataset.metricFor;
        const value = e.target.value === '' ? undefined : Number(e.target.value);
        if (value === undefined) delete routineMetrics[id]; else routineMetrics[id] = value;
      });
    });
  }
```

- [ ] **Step 4: `renderTodayTab`에 운동+약 섹션 추가** (기존 CE 루틴 렌더링 뒤에 이어붙임 —
  `container.innerHTML = ...` 대입 이후에 실행되도록 별도 sub-container 추가)

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
  }
```

> **주의 — Plan 2 기능 유지 필수**: 이 Step은 `renderTodayTab` 함수 전체를 교체한다. 위
> 코드의 체크박스 핸들러(`localStorage.setItem`/`weeklyQueue.enqueue`/`weeklyQueue.flush`
> 포함 전체)는 **Plan 2가 이미 구현한 것과 완전히 동일해야 한다** — 절대 빠뜨리지 말 것.
> 이 Step 전에 실제 `docs/app.js`의 현재 `renderTodayTab`을 먼저 읽어서, 위 코드가 그
> 함수의 체크박스 핸들러 부분과 한 글자도 다르지 않은지 반드시 대조 확인한 뒤 진행한다.
> 다르다면(이 브리프 작성 시점 이후 Plan 2 코드가 변경됐다면) 실제 파일 쪽을 기준으로
> 삼고, 거기에 `<h2>오늘의 운동·약</h2><div id="routine-checklist"></div>`와 마지막의
> `renderRoutineChecklist(...)` 호출만 추가한다 — 체크박스 핸들러 로직 자체를 이 브리프의
> 텍스트로 덮어쓰지 않는다.

- [ ] **Step 5: `docs/style.css`에 metric-input 스타일 추가**

```css
.metric-input { width: 60px; padding: 4px; border: 1px solid var(--border); border-radius: 4px; }
```

- [ ] **Step 6: 수동 스모크 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`http://localhost:8765/#/today`에서 CE 루틴 아래 "오늘의 운동·약" 제목과 운동 7종·약 4종이
보이는지, 슬로우 조깅 옆에만 km 입력 칸이 있는지, 체크박스를 누르면 상태가 바뀌는지 확인.
서버 종료.

- [ ] **Step 7: Commit**

```bash
git add docs/app.js docs/style.css
git commit -m "feat: render exercise/medication checklist in today tab (local state only)"
```

---

## Task 4: "오늘" 탭 — 커스텀 항목 추가 + 간식/식사 기록 (로컬 상태만)

**Files:**
- Modify: `docs/app.js`
- Modify: `docs/style.css`

**Interfaces:**
- Produces: `renderCustomItemForm(container)`, `renderMealForm(container)` — Task 5가
  Supabase 연동 시 이 두 함수의 이벤트 핸들러만 확장한다.

- [ ] **Step 1: 모듈 최상단 상태 변수 추가** (Task 3의 `customRoutineItems` 선언 바로 아래)

```js
  let mealNotes = {}; // slot -> text, 오늘 하루치만 (아침/점심/저녁/간식)
```

- [ ] **Step 2: localStorage 커스텀 항목 로드/저장 헬퍼 추가** (`renderRoutineChecklist`
  함수 바로 위에 삽입)

```js
  function loadCustomRoutineItems() {
    try {
      return JSON.parse(localStorage.getItem('gcp-ce-roadmap:customRoutineItems') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveCustomRoutineItems(items) {
    localStorage.setItem('gcp-ce-roadmap:customRoutineItems', JSON.stringify(items));
  }
```

- [ ] **Step 3: `renderCustomItemForm` 추가** (`renderRoutineChecklist` 함수 바로 아래에
  삽입)

```js
  function renderCustomItemForm(container) {
    container.innerHTML = `
      <h3>내 항목 추가</h3>
      <select id="custom-item-section">
        <option value="exercise">운동</option>
        <option value="medication">약/영양제</option>
      </select>
      <input type="text" id="custom-item-name" maxlength="30" placeholder="이름">
      <button id="custom-item-add">추가</button>
      <ul id="custom-item-list">
        ${customRoutineItems.map((c) => `<li>${escapeHtml(c.name)} (${c.section === 'exercise' ? '운동' : '약/영양제'}) <button data-remove-custom="${escapeHtml(c.name)}">삭제</button></li>`).join('')}
      </ul>
    `;
    container.querySelector('#custom-item-add').addEventListener('click', () => {
      const section = container.querySelector('#custom-item-section').value;
      const nameInput = container.querySelector('#custom-item-name');
      const name = nameInput.value.trim();
      if (!name) return;
      const exists = customRoutineItems.some((c) => c.name === name) || routineCatalogItems.some((i) => i.title === name);
      if (exists) {
        alert('이미 있는 항목이에요');
        return;
      }
      customRoutineItems.push({ name, section });
      saveCustomRoutineItems(customRoutineItems);
      nameInput.value = '';
      renderCustomItemForm(container);
      renderRoutineChecklist(document.getElementById('routine-checklist'), routineCatalogItems, customRoutineItems, routineChecked, routineMetrics);
    });
    container.querySelectorAll('[data-remove-custom]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const name = e.target.dataset.removeCustom;
        customRoutineItems = customRoutineItems.filter((c) => c.name !== name);
        saveCustomRoutineItems(customRoutineItems);
        renderCustomItemForm(container);
        renderRoutineChecklist(document.getElementById('routine-checklist'), routineCatalogItems, customRoutineItems, routineChecked, routineMetrics);
      });
    });
  }
```

- [ ] **Step 4: `renderMealForm` 추가** (`renderCustomItemForm` 함수 바로 아래에 삽입)

```js
  function renderMealForm(container) {
    const slots = ['아침', '점심', '저녁', '간식'];
    container.innerHTML = `
      <h3>오늘 식사/간식 기록</h3>
      ${slots.map((slot) => `
        <div class="item-row">
          <label for="meal-${slot}">${escapeHtml(slot)}</label>
          <input type="text" id="meal-${slot}" data-meal-slot="${slot}" value="${escapeHtml(mealNotes[slot] || '')}" placeholder="예: 닭가슴살 100g + 밥 한공기">
        </div>`).join('')}
    `;
    container.querySelectorAll('[data-meal-slot]').forEach((el) => {
      el.addEventListener('blur', (e) => {
        const slot = e.target.dataset.mealSlot;
        mealNotes[slot] = e.target.value;
      });
    });
  }
```

- [ ] **Step 5: `renderTodayTab`에 두 폼 컨테이너 추가** (Task 3에서 만든
  `container.innerHTML` 템플릿 끝에 이어붙임, 함수 끝의 호출부에도 추가)

```js
    container.innerHTML = `
      <p>${week}주차 · ${escapeHtml(dayName)}요일</p>
      <h2>CE 주간 루틴</h2>
      ${routineHtml}
      <h2>오늘의 운동·약</h2>
      <div id="routine-checklist"></div>
      <div id="custom-item-form"></div>
      <div id="meal-form"></div>
    `;
```

그리고 함수 마지막(기존 `renderRoutineChecklist(...)` 호출 다음 줄)에 추가:

```js
    renderCustomItemForm(document.getElementById('custom-item-form'));
    renderMealForm(document.getElementById('meal-form'));
```

- [ ] **Step 6: localStorage에서 커스텀 항목을 초기 로드하도록 `init()` 앞부분에 추가**
  (기존 `init()` IIFE의 `await loadStaticData();` 바로 다음 줄에 삽입)

```js
    customRoutineItems = loadCustomRoutineItems();
```

- [ ] **Step 7: 수동 스모크 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`http://localhost:8765/#/today`에서 "내 항목 추가"로 운동 하나 추가 → 체크리스트에
즉시 나타나는지, 새로고침 후에도 남아있는지(localStorage) 확인. 식사 기록 입력 후 blur →
값이 유지되는지(로컬 상태만, 아직 저장 안 됨) 확인. 서버 종료.

- [ ] **Step 8: Commit**

```bash
git add docs/app.js docs/style.css
git commit -m "feat: add custom item form and meal log form to today tab (local state only)"
```

---

## Task 5: Supabase 연동 — 운동/약/커스텀/식사 기록 영속화

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `makeSendCheck`(Plan 2, 재사용), `SupabaseQueue.Queue`(Plan 1, 재사용).
- Produces: `routine_checkins`/`routine_custom_items`/`routine_meals` 테이블 연동.

- [ ] **Step 1: 큐 인스턴스 추가** (기존 `maturityQueue` 선언 바로 아래)

```js
  const routineQueue = new SupabaseQueue.Queue();
  const mealQueue = new SupabaseQueue.Queue();
```

- [ ] **Step 2: send 함수 추가** (`makeSendCheck` 정의 바로 아래, 기존
  `sendMaturityCheck` 선언 다음 줄에 추가)

```js
  async function sendRoutineCheck(op) {
    if (op.checked) {
      const record = { date: op.date, item_id: op.itemId };
      if (op.km !== undefined) record.payload = { km: op.km };
      const { error } = await supabaseClient.from('routine_checkins').upsert(record);
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('routine_checkins').delete().match({ date: op.date, item_id: op.itemId });
      if (error) throw error;
    }
  }

  async function sendMealNote(op) {
    const { error } = await supabaseClient.from('routine_meals').upsert({ date: op.date, slot: op.slot, note: op.note });
    if (error) throw error;
  }

  async function sendCustomItemAdd(name, section) {
    const { error } = await supabaseClient.from('routine_custom_items').upsert({ name, section });
    if (error) throw error;
  }

  async function sendCustomItemRemove(name) {
    const { error } = await supabaseClient.from('routine_custom_items').delete().match({ name });
    if (error) throw error;
  }
```

- [ ] **Step 3: `loadProgress()`에 오늘의 운동/약 체크 + 커스텀 항목 목록 로드 추가**
  (기존 함수를 확장 — 4개 쿼리였던 `Promise.all`에 2개 추가해 6개로)

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

> 주의: `loadProgress()`가 Supabase의 `routine_custom_items`로 `customRoutineItems`를
> **덮어쓴다** — Task 4에서 localStorage로 초기화했던 값은 Supabase 연동 후에는 Supabase가
> 진실의 원천이 된다(오프라인 시작 시에만 localStorage 값을 임시로 쓰고, 온라인 연결되면
> Supabase 값으로 교체 — 다른 모든 레이어와 동일한 패턴).

- [ ] **Step 4: 운동/약 체크박스 핸들러에 큐잉 추가** (Task 3의 `renderRoutineChecklist`
  안 체크박스 change 핸들러를 교체)

```js
    container.querySelectorAll('[data-routine-id]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const id = e.target.dataset.routineId;
        const checked = e.target.checked;
        if (checked) routineChecked.add(id); else routineChecked.delete(id);
        const km = metrics[id];
        routineQueue.enqueue({ date: todayDateString(), itemId: id, checked, km: checked ? km : undefined });
        routineQueue.flush(sendRoutineCheck);
        renderRoutineChecklist(container, routineCatalogItems, customRoutineItems, routineChecked, routineMetrics);
      });
    });
```

- [ ] **Step 5: km 입력 blur 핸들러에 재저장 로직 추가** (Task 3의 metric-input blur
  핸들러를 교체 — 이미 체크된 상태에서 km을 바꾸면 다시 저장)

```js
    container.querySelectorAll('[data-metric-for]').forEach((el) => {
      el.addEventListener('blur', (e) => {
        const id = e.target.dataset.metricFor;
        const value = e.target.value === '' ? undefined : Number(e.target.value);
        if (value === undefined) delete routineMetrics[id]; else routineMetrics[id] = value;
        if (routineChecked.has(id)) {
          routineQueue.enqueue({ date: todayDateString(), itemId: id, checked: true, km: routineMetrics[id] });
          routineQueue.flush(sendRoutineCheck);
        }
      });
    });
```

- [ ] **Step 6: 커스텀 항목 추가/삭제 핸들러에 Supabase 호출 추가** (Task 4의
  `renderCustomItemForm` 안 두 핸들러를 교체)

```js
    container.querySelector('#custom-item-add').addEventListener('click', () => {
      const section = container.querySelector('#custom-item-section').value;
      const nameInput = container.querySelector('#custom-item-name');
      const name = nameInput.value.trim();
      if (!name) return;
      const exists = customRoutineItems.some((c) => c.name === name) || routineCatalogItems.some((i) => i.title === name);
      if (exists) {
        alert('이미 있는 항목이에요');
        return;
      }
      customRoutineItems.push({ name, section });
      saveCustomRoutineItems(customRoutineItems);
      sendCustomItemAdd(name, section).catch((err) => console.warn('커스텀 항목 저장 실패', err));
      nameInput.value = '';
      renderCustomItemForm(container);
      renderRoutineChecklist(document.getElementById('routine-checklist'), routineCatalogItems, customRoutineItems, routineChecked, routineMetrics);
    });
    container.querySelectorAll('[data-remove-custom]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const name = e.target.dataset.removeCustom;
        customRoutineItems = customRoutineItems.filter((c) => c.name !== name);
        saveCustomRoutineItems(customRoutineItems);
        sendCustomItemRemove(name).catch((err) => console.warn('커스텀 항목 삭제 실패', err));
        renderCustomItemForm(container);
        renderRoutineChecklist(document.getElementById('routine-checklist'), routineCatalogItems, customRoutineItems, routineChecked, routineMetrics);
      });
    });
```

- [ ] **Step 7: 식사 기록 blur 핸들러에 큐잉 추가** (Task 4의 `renderMealForm` 안 blur
  핸들러를 교체)

```js
    container.querySelectorAll('[data-meal-slot]').forEach((el) => {
      el.addEventListener('blur', (e) => {
        const slot = e.target.dataset.mealSlot;
        mealNotes[slot] = e.target.value;
        mealQueue.enqueue({ date: todayDateString(), slot, note: e.target.value });
        mealQueue.flush(sendMealNote);
      });
    });
```

- [ ] **Step 8: 수동 통합 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`#/today`에서 운동 하나 체크(슬로우 조깅은 km도 입력) → 새로고침 → 체크·km 상태 유지
확인. 커스텀 항목 추가 → 새로고침 → 유지 확인. 식사 기록 입력 → 새로고침 → 유지 확인.
Supabase Table Editor에서 `routine_checkins`(payload에 km 포함)/`routine_custom_items`/
`routine_meals`에 row가 생겼는지 확인. 서버 종료.

- [ ] **Step 9: Commit**

```bash
git add docs/app.js
git commit -m "feat: persist exercise/medication/custom-items/meals to Supabase"
```

---

## Task 6: `nutrition_lookup.py` 이식

**Files:**
- Create: `src/gcp-ce-roadmap/nutrition_lookup.py` (routine-jammy에서 그대로 복사)
- Create: `tests/test_nutrition_lookup.py` (routine-jammy에서 그대로 복사)
- Create: `tests/conftest.py`
- Create: `pytest.ini`
- Modify: `requirements.txt`

**Interfaces:**
- Produces: `estimate_meal_nutrition(meal_text)`, `weekly_macro_recommendations
  (weekly_average)`, `NUTRITION_DISCLAIMER` — Task 7이 그대로 import해 쓴다.

- [ ] **Step 1: 소스 파일을 그대로 복사** (routine-jammy의 검증된 코드를 재입력 없이 이식
  — 내용은 이미 존재하는 파일과 100% 동일해야 한다)

```bash
cd /home/rainny/dev-run/gcp-ce-roadmap
mkdir -p src/gcp-ce-roadmap
cp /home/rainny/dev-out/routine-jammy/src/routine-jammy/nutrition_lookup.py src/gcp-ce-roadmap/nutrition_lookup.py
cp /home/rainny/dev-out/routine-jammy/tests/test_nutrition_lookup.py tests/test_nutrition_lookup.py
```

- [ ] **Step 2: `tests/conftest.py` 작성** (pytest가 `src/gcp-ce-roadmap`을 import 경로에
  추가하도록)

```python
import sys
from pathlib import Path

SRC_DIR = Path(__file__).resolve().parent.parent / "src" / "gcp-ce-roadmap"
sys.path.insert(0, str(SRC_DIR))
```

- [ ] **Step 3: `pytest.ini` 작성** (프로젝트 루트)

```ini
[pytest]
markers =
    network: 실제 외부 API에 요청한다. 기본 실행에서 제외되며 -m network 로만 돈다.
addopts = -m "not network"
```

- [ ] **Step 4: `requirements.txt` 작성**

```
requests>=2.32
pytest>=8.0
```

- [ ] **Step 5: 의존성 설치 후 테스트 실행**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && pip install -q -r requirements.txt && python3 -m pytest tests/test_nutrition_lookup.py -v`
Expected: 복사된 테스트가 routine-jammy에서와 동일하게 전부 pass(네트워크 호출 없이
`monkeypatch`로 모킹된 테스트들이므로 이식 후에도 그대로 통과해야 정상). 하나라도
실패하면 원본 파일과 diff해 이식 과정에서 손상되지 않았는지 확인할 것.

- [ ] **Step 6: Commit**

```bash
git add src/gcp-ce-roadmap/nutrition_lookup.py tests/test_nutrition_lookup.py tests/conftest.py pytest.ini requirements.txt
git commit -m "feat: port nutrition_lookup.py from routine-jammy (public 식약처 DB API)"
```

---

## Task 7: 주간 영양분석 배치 + crontab 등록

**Files:**
- Create: `src/gcp-ce-roadmap/weekly_nutrition_refresh.py`
- Create: `tests/test_weekly_nutrition_refresh.py`
- Create: `.env.example`

**Interfaces:**
- Consumes: `nutrition_lookup.estimate_meal_nutrition`/`weekly_macro_recommendations`
  (Task 6).
- Produces: `compute_weekly_nutrition(meal_rows, estimate_fn)` — 순수 함수, 테스트 대상.
  `main()` — crontab이 호출하는 진입점.

- [ ] **Step 1: 실패하는 테스트 작성 — `tests/test_weekly_nutrition_refresh.py`**

```python
import weekly_nutrition_refresh as wnr


def _fake_estimate(note):
    return {"kcal": 100.0, "protein": 5.0, "fat": 3.0, "carb": 10.0, "matchedItems": [], "unmatchedItems": []}


def test_compute_weekly_nutrition_averages_across_days_with_data():
    rows = [
        {"date": "2026-08-01", "slot": "아침", "note": "밥 한공기"},
        {"date": "2026-08-01", "slot": "점심", "note": "된장찌개"},
        {"date": "2026-08-02", "slot": "아침", "note": "빵"},
    ]
    result = wnr.compute_weekly_nutrition(rows, estimate_fn=_fake_estimate)
    assert result["weeklyAverage"] == {"kcal": 150.0, "protein": 7.5, "fat": 4.5, "carb": 15.0}
    assert result["unmatchedFoodItems"] == []


def test_compute_weekly_nutrition_ignores_empty_notes():
    rows = [
        {"date": "2026-08-01", "slot": "아침", "note": ""},
        {"date": "2026-08-01", "slot": "점심", "note": "   "},
    ]
    result = wnr.compute_weekly_nutrition(rows, estimate_fn=_fake_estimate)
    assert result["weeklyAverage"] == {"kcal": 0.0, "protein": 0.0, "fat": 0.0, "carb": 0.0}


def test_compute_weekly_nutrition_collects_unmatched_items():
    def estimate_with_unmatched(note):
        return {"kcal": 0.0, "protein": 0.0, "fat": 0.0, "carb": 0.0, "matchedItems": [], "unmatchedItems": ["희귀채소"]}
    rows = [{"date": "2026-08-01", "slot": "아침", "note": "희귀채소 100g"}]
    result = wnr.compute_weekly_nutrition(rows, estimate_fn=estimate_with_unmatched)
    assert result["unmatchedFoodItems"] == ["희귀채소"]


def test_compute_weekly_nutrition_no_data_returns_zeros():
    result = wnr.compute_weekly_nutrition([], estimate_fn=_fake_estimate)
    assert result["weeklyAverage"] == {"kcal": 0.0, "protein": 0.0, "fat": 0.0, "carb": 0.0}
    assert result["unmatchedFoodItems"] == []
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && python3 -m pytest tests/test_weekly_nutrition_refresh.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'weekly_nutrition_refresh'`

- [ ] **Step 3: `src/gcp-ce-roadmap/weekly_nutrition_refresh.py` 작성**

```python
"""Weekly nutrition batch: reads the last 7 days of routine_meals from Supabase,
estimates macros via nutrition_lookup, and upserts the result into nutrition_stats
(single row, week_id='latest'). Invoked by a plain OS crontab entry (Sunday 18:00
Asia/Seoul) -- no Telegram/alerts, pure computation; the PWA reads nutrition_stats
directly via the Supabase JS client."""

import os
from collections import defaultdict
from datetime import date, timedelta

import requests

from nutrition_lookup import estimate_meal_nutrition, weekly_macro_recommendations

_MACROS = ["kcal", "protein", "fat", "carb"]


def _supabase_headers():
    key = os.environ["SUPABASE_ANON_KEY"]
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def fetch_recent_meals(supabase_url, start_date, end_date, headers=None, session=requests):
    """GET routine_meals rows with date in [start_date, end_date] (inclusive date
    objects). Returns a list of {"date": str, "slot": str, "note": str}."""
    headers = headers or _supabase_headers()
    response = session.get(
        f"{supabase_url}/rest/v1/routine_meals",
        params={
            "select": "date,slot,note",
            "date": f"gte.{start_date.isoformat()}",
            "and": f"(date.lte.{end_date.isoformat()})",
        },
        headers=headers,
        timeout=15,
    )
    response.raise_for_status()
    return response.json()


def compute_weekly_nutrition(meal_rows, estimate_fn=estimate_meal_nutrition):
    """Group meal_rows by date, estimate each non-empty note's macros, average
    across days that have at least one non-empty note. Returns
    {"weeklyAverage": {...}, "unmatchedFoodItems": [...]}."""
    by_date = defaultdict(list)
    for row in meal_rows:
        note = (row.get("note") or "").strip()
        if note:
            by_date[row["date"]].append(note)

    daily_totals = {}
    unmatched = []
    for day, notes in by_date.items():
        totals = {macro: 0.0 for macro in _MACROS}
        for note in notes:
            estimate = estimate_fn(note)
            for macro in _MACROS:
                totals[macro] += estimate[macro]
            unmatched.extend(estimate["unmatchedItems"])
        daily_totals[day] = totals

    days_with_data = len(daily_totals)
    if days_with_data == 0:
        weekly_average = {macro: 0.0 for macro in _MACROS}
    else:
        weekly_average = {
            macro: sum(t[macro] for t in daily_totals.values()) / days_with_data
            for macro in _MACROS
        }
    return {"weeklyAverage": weekly_average, "unmatchedFoodItems": sorted(set(unmatched))}


def upsert_nutrition_stats(supabase_url, weekly_average, unmatched_food_items, headers=None, session=requests):
    headers = dict(headers or _supabase_headers())
    headers["Prefer"] = "resolution=merge-duplicates"
    recommendations = weekly_macro_recommendations(weekly_average)
    body = {
        "week_id": "latest",
        "weekly_average": weekly_average,
        "recommendations": recommendations,
        "unmatched_food_items": unmatched_food_items,
    }
    response = session.post(
        f"{supabase_url}/rest/v1/nutrition_stats",
        json=body,
        headers=headers,
        timeout=15,
    )
    response.raise_for_status()
    return body


def main():
    supabase_url = os.environ["SUPABASE_URL"]
    today = date.today()
    start = today - timedelta(days=6)
    meal_rows = fetch_recent_meals(supabase_url, start, today)
    result = compute_weekly_nutrition(meal_rows)
    upsert_nutrition_stats(supabase_url, result["weeklyAverage"], result["unmatchedFoodItems"])
    print(f"nutrition_stats updated: {result['weeklyAverage']}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && python3 -m pytest tests/test_weekly_nutrition_refresh.py -v`
Expected: 4개 모두 PASS

- [ ] **Step 5: `.env.example` 작성** (실제 `.env`는 커밋하지 않음 — Task 6에서 만든
  `.gitignore`에 이미 `.env`/`.env.*` 패턴이 없다면 확인해서 추가할 것)

```bash
ROUTINE_NUTRITION_API_ENDPOINT=https://apis.data.go.kr/...
ROUTINE_NUTRITION_API_KEY=<발급받은 키>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon-public-key>
```

`.gitignore`에 `.env`/`.env.*` 패턴이 없으면 추가:

```bash
grep -q '^\.env$' .gitignore || printf '.env\n.env.*\n' >> .gitignore
```

- [ ] **Step 6: Commit**

```bash
git add src/gcp-ce-roadmap/weekly_nutrition_refresh.py tests/test_weekly_nutrition_refresh.py .env.example .gitignore
git commit -m "feat: add weekly nutrition batch entrypoint with pure compute function tested"
```

- [ ] **Step 7 (사용자 수행): 실제 `.env` 생성 + crontab 등록**

```bash
cd /home/rainny/dev-run/gcp-ce-roadmap
cp .env.example .env
# .env를 열어 실제 값 채우기:
#   ROUTINE_NUTRITION_API_ENDPOINT / ROUTINE_NUTRITION_API_KEY 는
#   routine-jammy의 .env에서 값만 복사(원본 이동 아님)
#   SUPABASE_URL / SUPABASE_ANON_KEY 는 docs/config.js의 값과 동일

pip install -r requirements.txt   # 또는 python3 -m pip install --user -r requirements.txt

crontab -l > /tmp/current-cron.txt 2>/dev/null || true
cat >> /tmp/current-cron.txt <<'CRON'
# gcp-ce-roadmap — 영양분석 주간 배치 (일요일 18:00 KST)
0 18 * * 0 cd /home/rainny/dev-run/gcp-ce-roadmap && /usr/bin/env bash -lc 'set -a; source .env 2>/dev/null; set +a; python3 src/gcp-ce-roadmap/weekly_nutrition_refresh.py' >> logs/weekly-nutrition.log 2>&1
CRON
crontab /tmp/current-cron.txt
mkdir -p logs
```

- [ ] **Step 8 (사용자 수행, 선택): 수동 1회 실행으로 즉시 검증**

```bash
cd /home/rainny/dev-run/gcp-ce-roadmap
set -a; source .env; set +a
python3 src/gcp-ce-roadmap/weekly_nutrition_refresh.py
```

`routine_meals`에 데이터가 있으면 `nutrition_stats` 테이블에 `week_id='latest'` row가
생기는지 Supabase Table Editor에서 확인.

---

## Task 8: "리포트" 탭 — 영양 리포트 섹션

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `nutrition_stats` 테이블(Task 2/7).
- Produces: `renderNutritionReport(container, stats)` — Task 4(Plan 4)와 무관, 이 태스크가
  전부.

- [ ] **Step 1: 영양 리포트 로드 함수 추가** (`loadProgress()` 함수 바로 아래에 삽입 —
  이 데이터는 체크 상태가 아니라 리포트 전용이라 별도 함수로 분리)

```js
  let nutritionStats = null;

  async function loadNutritionStats() {
    const { data, error } = await supabaseClient.from('nutrition_stats').select('*').eq('week_id', 'latest').maybeSingle();
    if (error) {
      console.warn('영양 리포트 로드 실패', error);
      return;
    }
    nutritionStats = data;
  }
```

- [ ] **Step 2: `renderNutritionReport` 추가** (`renderReportTab` 함수 바로 위에 삽입)

```js
  function renderNutritionReport(container, stats) {
    if (!stats || !stats.weekly_average) {
      container.innerHTML = '<p class="muted">아직 영양 리포트가 없습니다 (매주 일요일 자동 계산).</p>';
      return;
    }
    const avg = stats.weekly_average;
    const recs = stats.recommendations || [];
    const unmatched = stats.unmatched_food_items || [];
    container.innerHTML = `
      <p>평균: ${Math.round(avg.kcal)}kcal · 탄 ${Math.round(avg.carb)}g · 지 ${Math.round(avg.fat)}g · 단 ${Math.round(avg.protein)}g</p>
      ${recs.length ? `<ul>${recs.map((r) => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` : ''}
      ${unmatched.length ? `<p class="muted">매칭 안 된 항목: ${unmatched.map(escapeHtml).join(', ')}</p>` : ''}
      <p class="muted">⚠️ 영양 수치는 식약처 공공 데이터베이스 자동 매칭 기반의 대략적 추정치입니다.</p>
    `;
  }
```

- [ ] **Step 3: `renderReportTab`에 영양 리포트 섹션 추가** (기존 함수의
  `container.innerHTML = ...` 대입문 앞부분에 "주간 영양 리포트" 섹션을 끼워 넣음)

```js
    container.innerHTML = `
      ${remainingHtml}
      <h2>주간 영양 리포트</h2>
      <div id="nutrition-report"></div>
      <h2>성숙도 체크리스트</h2>
      <select id="checkpoint-select">${options}</select>
      ${body}
    `;
```

그리고 이 대입문 바로 다음 줄(기존 이벤트 리스너 등록 코드보다 위)에 추가:

```js
    renderNutritionReport(document.getElementById('nutrition-report'), nutritionStats);
```

- [ ] **Step 4: `init()`에서 영양 리포트도 함께 로드하도록 수정** (기존 `try { await
  loadProgress(); ... }` 블록의 `loadProgress()` 호출 다음 줄에 추가)

```js
      await loadNutritionStats();
```

- [ ] **Step 5: 수동 스모크 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`#/report`에서 "주간 영양 리포트" 섹션이 보이는지 확인(데이터 없으면 안내 문구, Task 7의
Step 8을 수행했다면 실제 수치). 서버 종료.

- [ ] **Step 6: Commit**

```bash
git add docs/app.js
git commit -m "feat: display weekly nutrition report in report tab"
```

---

## Task 9: 홈 탭 — 운동 루틴 진척률 추가

**Files:**
- Modify: `docs/app.js`

- [ ] **Step 1: `renderHomeTab` 함수에 운동 진척률 줄 추가** (기존 함수의
  `container.innerHTML = ...` 템플릿 안, 마지막 `</div>` 앞에 한 줄 추가하고, 그 위에
  계산 코드 삽입)

```js
    const routineSummary = RoadmapLogic.progressSummary(routineCatalogItems, routineChecked);
```

(이 줄은 기존 `renderHomeTab` 함수 안, `checkpointItems`/`maturitySummary` 계산 코드
바로 다음 줄에 삽입)

그리고 `container.innerHTML` 템플릿 문자열 끝(마지막 `<div class="item-row">...</div>`
다음)에 추가:

```html
      <div class="item-row"><label>오늘 운동·약</label><span>${routineSummary.done}/${routineSummary.total} (${routineSummary.percent}%)</span></div>
```

- [ ] **Step 2: 수동 스모크 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`#/`에서 "오늘 운동·약" 줄이 보이는지, 오늘 탭에서 체크 후 홈으로 돌아오면 숫자가
바뀌는지 확인. 서버 종료.

- [ ] **Step 3: Commit**

```bash
git add docs/app.js
git commit -m "feat: add today's exercise/medication progress to home tab"
```

---

## Task 10: 전체 테스트 + 배포 확인

**Files:** 없음(검증 + 배포만)

- [ ] **Step 1: JS 유닛테스트 전체 실행**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/*.test.js`
Expected: Plan 1/2의 25개 + Task 1의 3개 = 28개 모두 pass

- [ ] **Step 2: Python 유닛테스트 전체 실행**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && python3 -m pytest -v`
Expected: `nutrition_lookup` 이식 테스트 전부 + `weekly_nutrition_refresh` 4개 모두 pass

- [ ] **Step 3 (PR/merge 후, 사용자 수행): 실기기 확인**

`https://eldanscript.github.io/gcp-ce-roadmap/`에서 "오늘" 탭의 운동·약 체크, 커스텀 항목
추가, 식사 기록이 실제로 동작하는지, "리포트" 탭에 영양 리포트가 보이는지 확인. `git
status`로 `docs/config.js`가 커밋됐는지도 재확인(Plan 1의 사고 재발 방지).
