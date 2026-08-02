# CE 주간 반복 루틴 + 성숙도 체크리스트 (Plan 2/4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plan 1이 만든 PWA 셸의 "오늘"/"리포트" 플레이스홀더 탭을 실제 기능으로 채운다 — CE
12주 프로그램의 월~일 주간 반복 루틴(7개, 12주 한정)과 월간 성숙도 자가진단(13문항, 3개
체크포인트)을 체크·저장하고, "아직 안 한 것" 통합 목록을 리포트 탭에서 확인한다.

**Architecture:** Plan 1과 동일한 패턴(정적 JSON 콘텐츠 + Supabase 영속화 + 오프라인 큐)을
같은 `docs/app.js`/`docs/js/roadmap-logic.js`에 이어붙인다. 이번 계획에서 Supabase 쓰기
함수가 4종(로드맵/역량/주간루틴/성숙도)으로 늘어나므로, `sendRoadmapCheck`/
`sendCapabilityCheck`의 중복을 공용 팩토리 함수로 리팩토링한다 — Plan 1 최종 리뷰가 "3번째
consumer가 생기면 그때 추상화하라"고 명시적으로 권고한 지점이 지금이다.

**Tech Stack:** Plan 1과 동일 — Vanilla JS, Supabase JS client, `node --test`.

## Global Constraints

- 작업 대상 저장소: `/home/rainny/dev-run/gcp-ce-roadmap` (Plan 1이 이미 main에 merge·배포됨)
- `docs/config.js`는 **커밋한다** (gitignore하지 않는다) — Plan 1에서 실수로 gitignore했다가
  배포가 깨졌던 사고를 반복하지 않는다. publishable 키는 클라이언트 노출을 전제로 설계된
  키이고 실제 접근 통제는 Supabase RLS가 한다.
- 콘텐츠(주간루틴 7개, 성숙도 13개)는
  `docs/superpowers/specs/2026-08-02-gcp-ce-roadmap-design.md`의 "전체 콘텐츠" 절이 원본 —
  텍스트를 임의로 바꾸지 않는다.
- `weekly_checkins`(CE 주간루틴)은 **12주 프로그램 범위 내 각 주차가 별개 인스턴스**다 —
  `week_number`(1~12)+`day`로 식별한다. routine-jammy 스타일의 무기한 반복이 아니다(그건
  Plan 3의 운동 루틴에서 쓰는 모델이며 이 계획과 다르다).
- `PROGRAM_START`는 기존 `docs/app.js`에 이미 모듈 상수로 존재한다(`new
  Date('2026-08-04T00:00:00')`) — 새로 만들지 않고 재사용한다.
- **설계 단순화(이 계획에서 확정)**: 원 spec 문서의 `maturity_checkins` 테이블 초안에는
  `checked boolean` 컬럼이 있었으나, 이는 불필요하다 — 체크포인트별 row 존재 여부만으로
  "체크됨"을 표현할 수 있어 `roadmap_progress`/`capability_progress`/`weekly_checkins`와
  동일한 패턴(row 존재=체크됨, 삭제=체크 해제)으로 통일한다. 아래 Task 2의 스키마가
  최종본이다.

---

## Task 1: 정적 콘텐츠 JSON + 일관성 테스트

**Files:**
- Create: `docs/data/weeklyRoutine.json`
- Create: `docs/data/maturity.json`
- Modify: `tests/js/data-schema.test.js`

**Interfaces:**
- Produces: `weeklyRoutine.json`은 `{day: "월"|"화"|"수"|"목"|"금"|"토"|"일", theme: string}[]`
  (7개, 요일당 정확히 1개). `maturity.json`은
  `{id: string, group: string, question: string}[]` (13개).

- [ ] **Step 1: `docs/data/weeklyRoutine.json` 작성**

```json
[
  {"day": "월", "theme": "학습 목표 설정, 고객 시나리오 1개 선택"},
  {"day": "화", "theme": "GCP 서비스/아키텍처 학습"},
  {"day": "수", "theme": "Agentic AI 또는 RAG 실습"},
  {"day": "목", "theme": "Multimodal LLM 실습과 문서화"},
  {"day": "금", "theme": "발표자료 또는 고객 설명자료 작성"},
  {"day": "토", "theme": "3시간 집중 블록으로 데모/문서/코드 산출물 완성"},
  {"day": "일", "theme": "회고, 노트 정리, 다음 주 task 생성"}
]
```

- [ ] **Step 2: `docs/data/maturity.json` 작성**

```json
[
  {"id": "m1", "group": "플랫폼", "question": "GCP 핵심 서비스 간 관계를 설명할 수 있는가"},
  {"id": "m2", "group": "플랫폼", "question": "AWS 경험을 GCP로 자연스럽게 매핑할 수 있는가"},
  {"id": "m3", "group": "플랫폼", "question": "고객 워크로드에 맞는 서비스 선택 이유를 말할 수 있는가"},
  {"id": "m4", "group": "AI/Agent", "question": "Prompt, RAG, fine-tuning의 선택 기준을 설명할 수 있는가"},
  {"id": "m5", "group": "AI/Agent", "question": "ADK, MCP, A2A의 역할을 설명할 수 있는가"},
  {"id": "m6", "group": "AI/Agent", "question": "Agent와 chatbot의 차이를 실무 시나리오로 말할 수 있는가"},
  {"id": "m7", "group": "Multimodal", "question": "이미지, 다이어그램, 스크린샷을 보고 기술적 판단을 내릴 수 있는가"},
  {"id": "m8", "group": "Multimodal", "question": "비디오/문서/오디오 use case를 GCP 아키텍처로 변환할 수 있는가"},
  {"id": "m9", "group": "Production", "question": "비용, 보안, 운영성, 모니터링까지 포함한 설계를 설명할 수 있는가"},
  {"id": "m10", "group": "Production", "question": "프로덕션 전환 장벽을 기술 외 요소까지 포함해 설명할 수 있는가"},
  {"id": "m11", "group": "Automate yourself", "question": "메일, 검색, 문서화, 발표자료 작성 중 2개 이상을 AI로 자동화했는가"},
  {"id": "m12", "group": "Automate yourself", "question": "개인 지식베이스와 일정 관리가 AI 기반으로 연결되어 있는가"},
  {"id": "m13", "group": "Automate yourself", "question": "반복 학습 루틴이 템플릿과 agent로 재사용 가능하게 구성되어 있는가"}
]
```

- [ ] **Step 3: `tests/js/data-schema.test.js`에 테스트 추가** (파일 맨 끝에 이어붙임)

```js
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
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/data-schema.test.js`
Expected: 이전 8개 + 신규 4개 = 12개 모두 pass

- [ ] **Step 5: Commit**

```bash
git add docs/data/weeklyRoutine.json docs/data/maturity.json tests/js/data-schema.test.js
git commit -m "feat: add weekly routine and maturity checklist content (7+13 items) with schema tests"
```

---

## Task 2: Supabase 스키마 추가 (weekly_checkins, maturity_checkins)

**Files:**
- Modify: `supabase/schema.sql`

**Interfaces:**
- Produces: `weekly_checkins(week_number, day)` 복합키, `maturity_checkins(question_id,
  checkpoint)` 복합키 — 둘 다 "row 존재 = 체크됨" 패턴(Plan 1의 두 테이블과 동일).

- [ ] **Step 1: `supabase/schema.sql` 끝에 추가**

```sql

create table weekly_checkins (
  week_number int not null check (week_number between 1 and 12),
  day text not null check (day in ('월','화','수','목','금','토','일')),
  checked_at timestamptz not null default now(),
  primary key (week_number, day)
);

create table maturity_checkins (
  question_id text not null,
  checkpoint int not null check (checkpoint in (1, 2, 3)),
  checked_at timestamptz not null default now(),
  primary key (question_id, checkpoint)
);

alter table weekly_checkins enable row level security;
alter table maturity_checkins enable row level security;

create policy "anon full access" on weekly_checkins for all using (true) with check (true);
create policy "anon full access" on maturity_checkins for all using (true) with check (true);
```

- [ ] **Step 2 (사용자 수행): 기존 Supabase 프로젝트의 SQL Editor에서 위 추가분만 실행**

Plan 1에서 이미 만든 프로젝트(`wpbzuppgltomillfkfqd`)의 SQL Editor에 Step 1의 SQL(위
4개 statement + 2개 policy)을 붙여넣고 Run. 새 프로젝트를 만들 필요 없음 — 기존
`roadmap_progress`/`capability_progress` 테이블은 그대로 둔다.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add weekly_checkins and maturity_checkins Supabase schema"
```

---

## Task 3: 순수 함수 — 요일 이름 계산

**Files:**
- Modify: `docs/js/roadmap-logic.js`
- Modify: `tests/js/roadmap-logic.test.js`

**Interfaces:**
- Produces: `RoadmapLogic.koreanDayName(date)` → `"월"|"화"|"수"|"목"|"금"|"토"|"일"`. Task
  4/5가 "오늘이 무슨 요일인지"를 계산할 때 이 함수를 쓴다.

- [ ] **Step 1: 실패하는 테스트를 `tests/js/roadmap-logic.test.js` 끝에 추가**

```js
test('koreanDayName: maps JS getDay() to Korean weekday names', () => {
  assert.equal(RoadmapLogic.koreanDayName(new Date('2026-08-03T12:00:00')), '월'); // Mon
  assert.equal(RoadmapLogic.koreanDayName(new Date('2026-08-04T12:00:00')), '화'); // Tue
  assert.equal(RoadmapLogic.koreanDayName(new Date('2026-08-08T12:00:00')), '토'); // Sat
  assert.equal(RoadmapLogic.koreanDayName(new Date('2026-08-09T12:00:00')), '일'); // Sun
});
```

- [ ] **Step 2: 테스트 실행해 실패 확인**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/roadmap-logic.test.js`
Expected: FAIL — `RoadmapLogic.koreanDayName is not a function`

- [ ] **Step 3: `docs/js/roadmap-logic.js`에 함수 추가** (`sortRemaining` 함수 바로 아래,
  `const RoadmapLogic = {...}` 선언 바로 위에 삽입)

```js
  function koreanDayName(date) {
    const names = ['일', '월', '화', '수', '목', '금', '토'];
    return names[date.getDay()];
  }
```

그리고 export 객체에 추가:

```js
  const RoadmapLogic = { currentWeekNumber, progressSummary, sortRemaining, koreanDayName };
```

- [ ] **Step 4: 테스트 실행해 통과 확인**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/roadmap-logic.test.js`
Expected: 이전 8개 + 신규 1개(assert 4개 포함) = 9개 모두 pass

- [ ] **Step 5: Commit**

```bash
git add docs/js/roadmap-logic.js tests/js/roadmap-logic.test.js
git commit -m "feat: add koreanDayName pure function"
```

---

## Task 4: "오늘" 탭 — CE 주간루틴 오늘 항목 (로컬 상태만)

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `weeklyRoutine.json`(Task 1), `RoadmapLogic.currentWeekNumber`/`koreanDayName`
  (Task 3), 기존 `PROGRAM_START` 모듈 상수.
- Produces: `renderTodayTab(container, routineItems, weeklyChecked)` — Task 6이 Supabase
  연동 시 이 함수를 그대로 재사용.

- [ ] **Step 1: 모듈 최상단 상태 변수에 추가** (`let capabilityChecked = new Set();` 바로
  아래에 삽입)

```js
  let weeklyRoutineItems = [];
  let weeklyChecked = new Set(); // 키 형식: `${weekNumber}-${day}` 예: "3-월"
```

- [ ] **Step 2: `loadStaticData()`에 weeklyRoutine.json 로드 추가** (기존 `Promise.all`을
  교체)

```js
  async function loadStaticData() {
    const [roadmapRes, capabilitiesRes, weeklyRoutineRes] = await Promise.all([
      fetch('data/roadmap.json'),
      fetch('data/capabilities.json'),
      fetch('data/weeklyRoutine.json'),
    ]);
    roadmapItems = await roadmapRes.json();
    capabilityItems = await capabilitiesRes.json();
    weeklyRoutineItems = await weeklyRoutineRes.json();
  }
```

- [ ] **Step 3: `renderTodayTab` 함수 추가** (`renderHomeTab` 함수 바로 아래에 삽입)

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
      <p class="muted">운동/Biz English는 다음 계획에서 추가됩니다.</p>
    `;
    const checkbox = container.querySelector('[data-weekly-key]');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        const k = e.target.dataset.weeklyKey;
        if (e.target.checked) weeklyChecked.add(k); else weeklyChecked.delete(k);
        renderTodayTab(container, weeklyRoutineItems, weeklyChecked);
      });
    }
  }
```

- [ ] **Step 4: `renderTab`에 `today` 분기 추가** (기존 `else { view.innerHTML = ... }`
  fallback 앞에 삽입)

```js
    } else if (tabName === 'today') {
      renderTodayTab(view, weeklyRoutineItems, weeklyChecked);
    } else {
```

- [ ] **Step 5: `window.App` export에 `renderTodayTab` 추가**

```js
  window.App = { renderRoadmapTab, renderCapabilitiesTab, renderHomeTab, renderTodayTab, escapeHtml };
```

- [ ] **Step 6: 수동 스모크 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`http://localhost:8765/#/today`에서 현재 주차·요일과 오늘의 CE 루틴 테마가 보이는지,
체크박스를 누르면 상태가 바뀌는지 확인. 서버 종료.

- [ ] **Step 7: Commit**

```bash
git add docs/app.js
git commit -m "feat: render today tab with CE weekly routine item (local state only)"
```

---

## Task 5: "리포트" 탭 — 성숙도 체크리스트 (로컬 상태만)

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `maturity.json`(Task 1), `RoadmapLogic.currentWeekNumber`(Task 2, 기존).
- Produces: `renderReportTab(container, maturityItems, maturityChecked, checkpoint)` — Task
  6이 Supabase 연동, Task 7이 "남은 것" 목록을 이 함수에 이어붙인다.

- [ ] **Step 1: 모듈 최상단 상태 변수에 추가** (Task 4의 `weeklyChecked` 선언 바로 아래)

```js
  let maturityItems = [];
  let maturityChecked = new Set(); // 키 형식: `${questionId}-${checkpoint}` 예: "m1-1"
```

- [ ] **Step 2: `loadStaticData()`에 maturity.json 로드 추가** (Task 4 Step 2에서 만든
  `Promise.all`을 다시 교체)

```js
  async function loadStaticData() {
    const [roadmapRes, capabilitiesRes, weeklyRoutineRes, maturityRes] = await Promise.all([
      fetch('data/roadmap.json'),
      fetch('data/capabilities.json'),
      fetch('data/weeklyRoutine.json'),
      fetch('data/maturity.json'),
    ]);
    roadmapItems = await roadmapRes.json();
    capabilityItems = await capabilitiesRes.json();
    weeklyRoutineItems = await weeklyRoutineRes.json();
    maturityItems = await maturityRes.json();
  }
```

- [ ] **Step 3: 체크포인트 계산 헬퍼 + `renderReportTab` 추가** (`renderTodayTab` 함수
  바로 아래에 삽입)

```js
  function defaultCheckpoint(week) {
    if (week <= 4) return 1;
    if (week <= 8) return 2;
    return 3;
  }

  function renderReportTab(container, items, checkedIds, checkpoint) {
    const checkpointLabels = { 1: '1 (4주차)', 2: '2 (8주차)', 3: '3 (12주차)' };
    const groups = [...new Set(items.map((i) => i.group))];
    const body = groups.map((group) => {
      const groupItems = items.filter((i) => i.group === group);
      const rows = groupItems.map((item) => {
        const key = `${item.id}-${checkpoint}`;
        const checked = checkedIds.has(key);
        return `
          <div class="item-row">
            <input type="checkbox" id="mat-${key}" data-maturity-key="${key}" ${checked ? 'checked' : ''}>
            <label for="mat-${key}">${escapeHtml(item.question)}</label>
          </div>`;
      }).join('');
      return `<h3>${escapeHtml(group)}</h3>${rows}`;
    }).join('');
    const options = [1, 2, 3].map((cp) =>
      `<option value="${cp}" ${cp === checkpoint ? 'selected' : ''}>체크포인트 ${checkpointLabels[cp]}</option>`
    ).join('');
    container.innerHTML = `
      <h2>성숙도 체크리스트</h2>
      <select id="checkpoint-select">${options}</select>
      ${body}
    `;
    container.querySelector('#checkpoint-select').addEventListener('change', (e) => {
      renderReportTab(container, maturityItems, maturityChecked, Number(e.target.value));
    });
    container.querySelectorAll('[data-maturity-key]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const k = e.target.dataset.maturityKey;
        if (e.target.checked) maturityChecked.add(k); else maturityChecked.delete(k);
        renderReportTab(container, maturityItems, maturityChecked, checkpoint);
      });
    });
  }
```

- [ ] **Step 4: `renderTab`에 `report` 분기 추가** (Task 4 Step 4에서 추가한 `today` 분기
  바로 아래, fallback `else` 앞에 삽입)

```js
    } else if (tabName === 'report') {
      const week = RoadmapLogic.currentWeekNumber(new Date(), PROGRAM_START);
      renderReportTab(view, maturityItems, maturityChecked, defaultCheckpoint(week));
    } else {
```

- [ ] **Step 5: `window.App` export에 `renderReportTab` 추가**

```js
  window.App = { renderRoadmapTab, renderCapabilitiesTab, renderHomeTab, renderTodayTab, renderReportTab, escapeHtml };
```

- [ ] **Step 6: 수동 스모크 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`http://localhost:8765/#/report`에서 체크포인트 select(현재 주차 기준 기본값 확인 — 예:
1주차면 "체크포인트 1"), 5개 그룹, 13개 문항이 보이는지, select를 바꾸면 체크 상태가
체크포인트별로 따로 유지되는지 확인. 서버 종료.

- [ ] **Step 7: Commit**

```bash
git add docs/app.js
git commit -m "feat: render report tab with maturity checklist (local state only)"
```

---

## Task 6: Supabase 연동 — 공용 저장 헬퍼로 리팩토링 + 4개 테이블 연결

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `SupabaseQueue.Queue`(Plan 1, 재사용), Task 2의 `weekly_checkins`/
  `maturity_checkins` 테이블.
- Produces: `makeSendCheck(table, buildKey)` — 이후 다른 레이어(Plan 3의 운동, Plan 4의
  Biz English)도 이 팩토리를 재사용한다.

이 태스크는 기존 `sendRoadmapCheck`/`sendCapabilityCheck`와 새 `sendWeeklyRoutineCheck`/
`sendMaturityCheck`를 하나의 팩토리로 통합하고, `loadProgress()`를 4개 테이블 모두 읽도록
확장한다. **기존 동작을 바꾸지 않는 리팩토링**이므로, 로드맵/역량 체크박스의 기존 동작이
똑같이 유지되는지가 핵심 검증 포인트다.

- [ ] **Step 1: `sendRoadmapCheck`/`sendCapabilityCheck`를 `makeSendCheck` 팩토리로 교체**
  (기존 두 함수 정의를 통째로 삭제하고 아래로 교체)

```js
  function makeSendCheck(table, buildKey) {
    return async function sendCheck(op) {
      const key = buildKey(op);
      if (op.checked) {
        const { error } = await supabaseClient.from(table).upsert(key);
        if (error) throw error;
      } else {
        const { error } = await supabaseClient.from(table).delete().match(key);
        if (error) throw error;
      }
    };
  }

  const sendRoadmapCheck = makeSendCheck('roadmap_progress', (op) => ({ item_id: op.itemId }));
  const sendCapabilityCheck = makeSendCheck('capability_progress', (op) => ({ item_id: op.itemId }));
  const sendWeeklyRoutineCheck = makeSendCheck('weekly_checkins', (op) => ({ week_number: op.weekNumber, day: op.day }));
  const sendMaturityCheck = makeSendCheck('maturity_checkins', (op) => ({ question_id: op.questionId, checkpoint: op.checkpoint }));
```

- [ ] **Step 2: `loadProgress()`를 4개 테이블 모두 읽도록 확장** (기존 함수 전체 교체)

```js
  async function loadProgress() {
    const [roadmapRows, capabilityRows, weeklyRows, maturityRows] = await Promise.all([
      supabaseClient.from('roadmap_progress').select('item_id'),
      supabaseClient.from('capability_progress').select('item_id'),
      supabaseClient.from('weekly_checkins').select('week_number, day'),
      supabaseClient.from('maturity_checkins').select('question_id, checkpoint'),
    ]);
    if (roadmapRows.error || capabilityRows.error || weeklyRows.error || maturityRows.error) {
      throw roadmapRows.error || capabilityRows.error || weeklyRows.error || maturityRows.error;
    }
    roadmapChecked = new Set((roadmapRows.data || []).map((r) => r.item_id));
    capabilityChecked = new Set((capabilityRows.data || []).map((r) => r.item_id));
    weeklyChecked = new Set((weeklyRows.data || []).map((r) => `${r.week_number}-${r.day}`));
    maturityChecked = new Set((maturityRows.data || []).map((r) => `${r.question_id}-${r.checkpoint}`));
  }
```

- [ ] **Step 3: `init()`의 localStorage 저장/복원 키를 4개로 확장** (기존 함수 전체 교체)

```js
  (async function init() {
    await loadStaticData();
    try {
      roadmapChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:roadmapChecked') || '[]'));
      capabilityChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:capabilityChecked') || '[]'));
      weeklyChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:weeklyChecked') || '[]'));
      maturityChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:maturityChecked') || '[]'));
    } catch (e) { /* localStorage 비어있거나 손상 — 빈 Set으로 시작 */ }
    renderTab(currentTabFromHash());
    try {
      await loadProgress();
      localStorage.setItem('gcp-ce-roadmap:roadmapChecked', JSON.stringify([...roadmapChecked]));
      localStorage.setItem('gcp-ce-roadmap:capabilityChecked', JSON.stringify([...capabilityChecked]));
      localStorage.setItem('gcp-ce-roadmap:weeklyChecked', JSON.stringify([...weeklyChecked]));
      localStorage.setItem('gcp-ce-roadmap:maturityChecked', JSON.stringify([...maturityChecked]));
      renderTab(currentTabFromHash());
    } catch (e) {
      console.warn('Supabase 로드 실패 — localStorage 상태로 계속', e);
    }
  })();
```

- [ ] **Step 4: 큐 인스턴스 선언 추가** (기존 `const roadmapQueue = new
  SupabaseQueue.Queue();` / `const capabilityQueue = new SupabaseQueue.Queue();` 바로
  아래에 추가 — Step 5/6에서 참조할 모듈 스코프 변수이므로 사용하는 코드보다 먼저 넣는다)

```js
  const weeklyQueue = new SupabaseQueue.Queue();
  const maturityQueue = new SupabaseQueue.Queue();
```

- [ ] **Step 5: 오늘 탭 체크박스 핸들러에 큐잉 추가** (`renderTodayTab`의 change 핸들러
  전체를 교체)

```js
    const checkbox = container.querySelector('[data-weekly-key]');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        const k = e.target.dataset.weeklyKey;
        const checked = e.target.checked;
        const [weekNumber, day] = k.split('-');
        if (checked) weeklyChecked.add(k); else weeklyChecked.delete(k);
        localStorage.setItem('gcp-ce-roadmap:weeklyChecked', JSON.stringify([...weeklyChecked]));
        weeklyQueue.enqueue({ table: 'weekly_checkins', weekNumber: Number(weekNumber), day, checked });
        weeklyQueue.flush(sendWeeklyRoutineCheck);
        renderTodayTab(container, weeklyRoutineItems, weeklyChecked);
      });
    }
```

`weeklyQueue`는 Step 4에서 선언한 모듈 스코프 변수를 그대로 참조한다 — 이 함수 안에서
새로 선언하지 않는다.

- [ ] **Step 6: 리포트 탭 체크박스 핸들러에 큐잉 추가** (`renderReportTab`의 마지막
  `querySelectorAll('[data-maturity-key]')` 핸들러 블록을 교체)

```js
    container.querySelectorAll('[data-maturity-key]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const k = e.target.dataset.maturityKey;
        const checked = e.target.checked;
        const dashIndex = k.lastIndexOf('-');
        const questionId = k.slice(0, dashIndex);
        const cp = Number(k.slice(dashIndex + 1));
        if (checked) maturityChecked.add(k); else maturityChecked.delete(k);
        localStorage.setItem('gcp-ce-roadmap:maturityChecked', JSON.stringify([...maturityChecked]));
        maturityQueue.enqueue({ table: 'maturity_checkins', questionId, checkpoint: cp, checked });
        maturityQueue.flush(sendMaturityCheck);
        renderReportTab(container, maturityItems, maturityChecked, checkpoint);
      });
    });
```

> `questionId`가 `m1`처럼 하이픈이 없는 형식이라 `k.split('-')`로는 `["m1", "1"]`처럼
> 안전하게 나뉘지만, 만약 향후 `questionId` 자체에 하이픈이 들어가는 id로 바뀌면
> `split('-')`가 깨진다 — 그래서 `lastIndexOf('-')` 기준으로 마지막 구분자만 기준 삼아
> 안전하게 분리한다. 오늘 탭의 `weekNumber-day` 키(Step 4)는 `weekNumber`가 항상 숫자라
> 하이픈이 없으므로 `split('-')`로 충분하다.

- [ ] **Step 7: 수동 통합 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`http://localhost:8765/#/today`와 `#/report`에서 각각 체크 → 새로고침 → 상태 유지 확인
(Supabase 저장 확인). `#/roadmap`에서도 기존 로드맵/역량 체크가 여전히 정상 동작하는지
(리팩토링으로 깨지지 않았는지) 함께 확인. Supabase 대시보드 Table Editor에서
`weekly_checkins`/`maturity_checkins`에 row가 생겼는지 확인. 서버 종료.

- [ ] **Step 8: Commit**

```bash
git add docs/app.js
git commit -m "feat: persist weekly routine and maturity checks; refactor Supabase writes into shared factory"
```

---

## Task 7: "리포트" 탭 — "아직 안 한 것" 통합 목록

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `RoadmapLogic.sortRemaining`(Plan 1, 재사용), `roadmapItems`/`capabilityItems`/
  `roadmapChecked`/`capabilityChecked`(기존 모듈 상태).
- Produces: `renderReportTab`에 이어붙는 섹션 — Plan 4가 Biz English 미완료 항목을 여기
  추가할 때 이 자리에 이어붙인다.

- [ ] **Step 1: `renderReportTab` 함수 끝부분 수정** — `container.innerHTML = ...` 대입문을
  아래로 교체 (성숙도 체크리스트 앞에 "남은 것" 섹션을 추가)

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
    container.innerHTML = `
      ${remainingHtml}
      <h2>성숙도 체크리스트</h2>
      <select id="checkpoint-select">${options}</select>
      ${body}
    `;
```

- [ ] **Step 2: 수동 스모크 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`http://localhost:8765/#/report`에서 "아직 안 한 것" 섹션이 로드맵/역량 미완료 항목
개수와 함께 보이는지, 로드맵 탭에서 항목을 체크하고 리포트로 돌아오면 목록에서 빠지는지
확인. 서버 종료.

- [ ] **Step 3: Commit**

```bash
git add docs/app.js
git commit -m "feat: add remaining-items summary to report tab"
```

---

## Task 8: 홈 탭 — 신규 레이어 진척률 추가

**Files:**
- Modify: `docs/app.js`

**Interfaces:**
- Consumes: `RoadmapLogic.progressSummary`(재사용), `weeklyRoutineItems`/`weeklyChecked`,
  `maturityItems`/`maturityChecked`.

- [ ] **Step 1: `renderHomeTab` 함수 전체 교체**

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
    container.innerHTML = `
      <p>현재 ${week}주차 (2026-08-04 시작)</p>
      <div class="item-row"><label>로드맵 진척률</label><span>${roadmapSummary.done}/${roadmapSummary.total} (${roadmapSummary.percent}%)</span></div>
      <div class="item-row"><label>역량 체크 진척률</label><span>${capabilitySummary.done}/${capabilitySummary.total} (${capabilitySummary.percent}%)</span></div>
      <div class="item-row"><label>이번 주 루틴</label><span>${weeklySummary.done}/${weeklySummary.total} (${weeklySummary.percent}%)</span></div>
      <div class="item-row"><label>성숙도 체크포인트 ${checkpoint}</label><span>${maturitySummary.done}/${maturitySummary.total} (${maturitySummary.percent}%)</span></div>
    `;
  }
```

- [ ] **Step 2: 수동 스모크 테스트**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap/docs && python3 -m http.server 8765`

`http://localhost:8765/#/`에서 4개 진척률 줄이 모두 보이는지, "오늘"/"리포트" 탭에서 체크
후 홈으로 돌아오면 숫자가 갱신되는지 확인. 서버 종료.

- [ ] **Step 3: Commit**

```bash
git add docs/app.js
git commit -m "feat: add weekly routine and maturity progress to home tab"
```

---

## Task 9: 전체 테스트 + 배포 확인

**Files:** 없음(검증 + 배포만)

- [ ] **Step 1: 전체 유닛테스트 실행**

Run: `cd /home/rainny/dev-run/gcp-ce-roadmap && node --test tests/js/*.test.js`
Expected: Plan 1의 20개 + Task 1의 4개 + Task 3의 1개(assert 4개 포함) = 25개 모두 pass

- [ ] **Step 2 (PR/merge 후, 사용자 수행): 실기기 확인**

`https://eldanscript.github.io/gcp-ce-roadmap/`에서 "오늘"/"리포트" 탭이 실제로 동작하는지
확인(체크·새로고침 후 상태 유지). **Plan 1에서 `docs/config.js`를 gitignore했다가 배포가
깨졌던 사고가 있었으므로, 이번에도 반드시 `git status`로 `docs/config.js`가 커밋됐는지
확인한 뒤 배포 확인할 것.**
