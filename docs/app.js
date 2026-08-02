(function () {
  let roadmapItems = [];
  let capabilityItems = [];
  let roadmapChecked = new Set();
  let capabilityChecked = new Set();
  let weeklyRoutineItems = [];
  let weeklyChecked = new Set(); // 키 형식: `${weekNumber}-${day}` 예: "3-월"
  let maturityItems = [];
  let maturityChecked = new Set(); // 키 형식: `${questionId}-${checkpoint}` 예: "m1-1"
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
    container.innerHTML = `
      <p>현재 ${week}주차 (2026-08-04 시작)</p>
      <div class="item-row"><label>로드맵 진척률</label><span>${roadmapSummary.done}/${roadmapSummary.total} (${roadmapSummary.percent}%)</span></div>
      <div class="item-row"><label>역량 체크 진척률</label><span>${capabilitySummary.done}/${capabilitySummary.total} (${capabilitySummary.percent}%)</span></div>
      <div class="item-row"><label>이번 주 루틴</label><span>${weeklySummary.done}/${weeklySummary.total} (${weeklySummary.percent}%)</span></div>
      <div class="item-row"><label>성숙도 체크포인트 ${checkpoint}</label><span>${maturitySummary.done}/${maturitySummary.total} (${maturitySummary.percent}%)</span></div>
    `;
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
      <p class="muted">운동/Biz English는 다음 계획에서 추가됩니다.</p>
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
  }

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

  window.App = { renderRoadmapTab, renderCapabilitiesTab, renderHomeTab, renderTodayTab, renderReportTab, escapeHtml };
})();
