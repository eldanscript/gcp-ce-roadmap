(function () {
  let roadmapItems = [];
  let capabilityItems = [];
  let roadmapChecked = new Set();
  let capabilityChecked = new Set();
  let weeklyRoutineItems = [];
  let weeklyChecked = new Set(); // 키 형식: `${weekNumber}-${day}` 예: "3-월"
  let maturityItems = [];
  let maturityChecked = new Set(); // 키 형식: `${questionId}-${checkpoint}` 예: "m1-1"
  let routineCatalogItems = [];
  let routineChecked = new Set(); // 오늘 체크된 item_id만 (날짜 무관 — 항상 "오늘" 스코프)
  let routineMetrics = {}; // item_id -> 숫자 (예: ex1의 km)
  let customRoutineItems = []; // [{name, section}], localStorage에서 로드 (Task 4)
  let mealNotes = {}; // slot -> text, 오늘 하루치만 (아침/점심/저녁/간식)
  const PROGRAM_START = new Date('2026-08-04T00:00:00');

  const supabaseClient = window.supabase.createClient(
    window.ROUTINE_CONFIG.supabaseUrl,
    window.ROUTINE_CONFIG.publishableKey
  );
  const roadmapQueue = new SupabaseQueue.Queue();
  const capabilityQueue = new SupabaseQueue.Queue();
  const weeklyQueue = new SupabaseQueue.Queue();
  const maturityQueue = new SupabaseQueue.Queue();

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

  let nutritionStats = null;

  async function loadNutritionStats() {
    const { data, error } = await supabaseClient.from('nutrition_stats').select('*').eq('week_id', 'latest').maybeSingle();
    if (error) {
      console.warn('영양 리포트 로드 실패', error);
      return;
    }
    nutritionStats = data;
  }

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

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderRoadmapTab(container, items, checkedIds) {
    // Capture existing open/closed states before rebuilding
    const existingPhases = container.querySelectorAll('.phase-group');
    const phaseOpenStates = Array.from(existingPhases).map(details => details.open);

    const phases = [
      { phase: 1, label: '1-4주: 기반 구축' },
      { phase: 2, label: '5-8주: 설계와 자동화 확장' },
      { phase: 3, label: '9-12주: 실전 적용' },
    ];
    const html = phases.map(({ phase, label }) => {
      const phaseItems = items.filter((i) => i.phase === phase);
      const summary = RoadmapLogic.progressSummary(phaseItems, checkedIds);
      const rows = phaseItems.map((item) => `
        <div class="item-row">
          <input type="checkbox" id="road-${item.id}" data-roadmap-id="${item.id}" ${checkedIds.has(item.id) ? 'checked' : ''}>
          <label for="road-${item.id}">${escapeHtml(item.title)}</label>
        </div>`).join('');
      return `
        <details class="phase-group" open>
          <summary>${escapeHtml(label)} <span class="progress-badge">${summary.done}/${summary.total}</span></summary>
          ${rows}
        </details>`;
    }).join('');
    container.innerHTML = html;

    // Apply previously-captured open states to newly-created elements
    const newPhases = container.querySelectorAll('.phase-group');
    newPhases.forEach((details, index) => {
      if (index < phaseOpenStates.length) {
        details.open = phaseOpenStates[index];
      } else {
        // First render: default to open if no previous state exists
        details.open = true;
      }
    });

    container.querySelectorAll('[data-roadmap-id]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const id = e.target.dataset.roadmapId;
        const checked = e.target.checked;
        if (checked) roadmapChecked.add(id); else roadmapChecked.delete(id);
        localStorage.setItem('gcp-ce-roadmap:roadmapChecked', JSON.stringify([...roadmapChecked]));
        roadmapQueue.enqueue({ itemId: id, checked });
        roadmapQueue.flush(sendRoadmapCheck);
        renderRoadmapTab(container, roadmapItems, roadmapChecked);
      });
    });
  }

  function renderCapabilitiesTab(container, items, checkedIds) {
    // Capture existing open/closed states before rebuilding
    const existingCategories = container.querySelectorAll('.category-group');
    const categoryOpenStates = Array.from(existingCategories).map(details => details.open);

    const categoryIds = [...new Set(items.map((i) => i.categoryId))].sort((a, b) => a - b);
    const html = categoryIds.map((categoryId) => {
      const categoryItems = items.filter((i) => i.categoryId === categoryId);
      const categoryTitle = categoryItems[0].categoryTitle;
      const summary = RoadmapLogic.progressSummary(categoryItems, checkedIds);
      const subgroups = [...new Set(categoryItems.map((i) => i.subgroup))];
      const body = subgroups.map((subgroup) => {
        const groupItems = categoryItems.filter((i) => i.subgroup === subgroup);
        const rows = groupItems.map((item) => `
          <div class="item-row">
            <input type="checkbox" id="cap-${item.id}" data-capability-id="${item.id}" ${checkedIds.has(item.id) ? 'checked' : ''}>
            <label for="cap-${item.id}">${escapeHtml(item.title)}</label>
          </div>`).join('');
        const heading = subgroup ? `<p class="subgroup-title">${escapeHtml(subgroup)}</p>` : '';
        return heading + rows;
      }).join('');
      return `
        <details class="category-group">
          <summary>${escapeHtml(categoryTitle)} <span class="progress-badge">${summary.done}/${summary.total}</span></summary>
          ${body}
        </details>`;
    }).join('');
    container.innerHTML = html;

    // Apply previously-captured open states to newly-created elements
    const newCategories = container.querySelectorAll('.category-group');
    newCategories.forEach((details, index) => {
      if (index < categoryOpenStates.length) {
        details.open = categoryOpenStates[index];
      } else {
        // First render: default to closed if no previous state exists
        details.open = false;
      }
    });

    container.querySelectorAll('[data-capability-id]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const id = e.target.dataset.capabilityId;
        const checked = e.target.checked;
        if (checked) capabilityChecked.add(id); else capabilityChecked.delete(id);
        localStorage.setItem('gcp-ce-roadmap:capabilityChecked', JSON.stringify([...capabilityChecked]));
        capabilityQueue.enqueue({ itemId: id, checked });
        capabilityQueue.flush(sendCapabilityCheck);
        renderCapabilitiesTab(container, capabilityItems, capabilityChecked);
      });
    });
  }

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

  function todayDateString() {
    return new Date().toISOString().slice(0, 10);
  }

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
        const safeId = escapeHtml(item.id);
        const metricInput = item.metric
          ? `<input type="number" step="0.1" min="${item.metric.min}" max="${item.metric.max}" class="metric-input" data-metric-for="${safeId}" value="${metrics[item.id] !== undefined ? metrics[item.id] : ''}" placeholder="${escapeHtml(item.metric.unit)}">`
          : '';
        return `
          <div class="item-row">
            <input type="checkbox" id="routine-${safeId}" data-routine-id="${safeId}" ${checked ? 'checked' : ''}>
            <label for="routine-${safeId}">${escapeHtml(item.title)}</label>
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

  function defaultCheckpoint(week) {
    if (week <= 4) return 1;
    if (week <= 8) return 2;
    return 3;
  }

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
      <h2>주간 영양 리포트</h2>
      <div id="nutrition-report"></div>
      <h2>성숙도 체크리스트</h2>
      <select id="checkpoint-select">${options}</select>
      ${body}
    `;
    renderNutritionReport(document.getElementById('nutrition-report'), nutritionStats);
    container.querySelector('#checkpoint-select').addEventListener('change', (e) => {
      renderReportTab(container, maturityItems, maturityChecked, Number(e.target.value));
    });
    container.querySelectorAll('[data-maturity-key]').forEach((el) => {
      el.addEventListener('change', (e) => {
        const k = e.target.dataset.maturityKey;
        const checked = e.target.checked;
        const dashIndex = k.lastIndexOf('-');
        const questionId = k.slice(0, dashIndex);
        const cp = Number(k.slice(dashIndex + 1));
        if (checked) maturityChecked.add(k); else maturityChecked.delete(k);
        localStorage.setItem('gcp-ce-roadmap:maturityChecked', JSON.stringify([...maturityChecked]));
        maturityQueue.enqueue({ questionId, checkpoint: cp, checked });
        maturityQueue.flush(sendMaturityCheck);
        renderReportTab(container, maturityItems, maturityChecked, checkpoint);
      });
    });
  }

  function renderTab(tabName) {
    const view = document.getElementById('view');
    document.querySelectorAll('.bottom-nav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.tab === tabName);
    });
    if (tabName === 'home') {
      renderHomeTab(view);
    } else if (tabName === 'roadmap') {
      view.innerHTML = '<div id="roadmap-section"></div><h2>역량 체크</h2><div id="capabilities-section"></div>';
      renderRoadmapTab(document.getElementById('roadmap-section'), roadmapItems, roadmapChecked);
      renderCapabilitiesTab(document.getElementById('capabilities-section'), capabilityItems, capabilityChecked);
    } else if (tabName === 'today') {
      renderTodayTab(view, weeklyRoutineItems, weeklyChecked);
    } else if (tabName === 'report') {
      const week = RoadmapLogic.currentWeekNumber(new Date(), PROGRAM_START);
      renderReportTab(view, maturityItems, maturityChecked, defaultCheckpoint(week));
    } else {
      view.innerHTML = `<p>"${escapeHtml(tabName)}" 탭은 다음 계획에서 구현됩니다.</p>`;
    }
  }

  function currentTabFromHash() {
    const hash = location.hash.replace('#/', '') || '';
    if (hash === 'today') return 'today';
    if (hash === 'roadmap') return 'roadmap';
    if (hash === 'report') return 'report';
    return 'home';
  }

  window.addEventListener('hashchange', () => renderTab(currentTabFromHash()));

  (async function init() {
    await loadStaticData();
    customRoutineItems = loadCustomRoutineItems();
    try {
      roadmapChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:roadmapChecked') || '[]'));
      capabilityChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:capabilityChecked') || '[]'));
      weeklyChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:weeklyChecked') || '[]'));
      maturityChecked = new Set(JSON.parse(localStorage.getItem('gcp-ce-roadmap:maturityChecked') || '[]'));
    } catch (e) { /* localStorage 비어있거나 손상 — 빈 Set으로 시작 */ }
    renderTab(currentTabFromHash());
    try {
      await loadProgress();
      await loadNutritionStats();
      localStorage.setItem('gcp-ce-roadmap:roadmapChecked', JSON.stringify([...roadmapChecked]));
      localStorage.setItem('gcp-ce-roadmap:capabilityChecked', JSON.stringify([...capabilityChecked]));
      localStorage.setItem('gcp-ce-roadmap:weeklyChecked', JSON.stringify([...weeklyChecked]));
      localStorage.setItem('gcp-ce-roadmap:maturityChecked', JSON.stringify([...maturityChecked]));
      renderTab(currentTabFromHash());
    } catch (e) {
      console.warn('Supabase 로드 실패 — localStorage 상태로 계속', e);
    }
  })();

  window.App = { renderRoadmapTab, renderCapabilitiesTab, renderHomeTab, renderTodayTab, renderReportTab, escapeHtml };
})();
