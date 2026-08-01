(function () {
  let roadmapItems = [];
  let capabilityItems = [];
  let roadmapChecked = new Set();
  let capabilityChecked = new Set();

  const supabaseClient = window.supabase.createClient(
    window.ROUTINE_CONFIG.supabaseUrl,
    window.ROUTINE_CONFIG.publishableKey
  );
  const roadmapQueue = new SupabaseQueue.Queue();
  const capabilityQueue = new SupabaseQueue.Queue();

  async function loadProgress() {
    const [roadmapRows, capabilityRows] = await Promise.all([
      supabaseClient.from('roadmap_progress').select('item_id'),
      supabaseClient.from('capability_progress').select('item_id'),
    ]);
    roadmapChecked = new Set((roadmapRows.data || []).map((r) => r.item_id));
    capabilityChecked = new Set((capabilityRows.data || []).map((r) => r.item_id));
  }

  async function sendRoadmapCheck(op) {
    if (op.checked) {
      const { error } = await supabaseClient.from('roadmap_progress').upsert({ item_id: op.itemId });
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('roadmap_progress').delete().eq('item_id', op.itemId);
      if (error) throw error;
    }
  }

  async function sendCapabilityCheck(op) {
    if (op.checked) {
      const { error } = await supabaseClient.from('capability_progress').upsert({ item_id: op.itemId });
      if (error) throw error;
    } else {
      const { error } = await supabaseClient.from('capability_progress').delete().eq('item_id', op.itemId);
      if (error) throw error;
    }
  }

  async function loadStaticData() {
    const [roadmapRes, capabilitiesRes] = await Promise.all([
      fetch('data/roadmap.json'),
      fetch('data/capabilities.json'),
    ]);
    roadmapItems = await roadmapRes.json();
    capabilityItems = await capabilitiesRes.json();
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
        roadmapQueue.enqueue({ table: 'roadmap_progress', itemId: id, checked });
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
        capabilityQueue.enqueue({ table: 'capability_progress', itemId: id, checked });
        capabilityQueue.flush(sendCapabilityCheck);
        renderCapabilitiesTab(container, capabilityItems, capabilityChecked);
      });
    });
  }

  function renderTab(tabName) {
    const view = document.getElementById('view');
    document.querySelectorAll('.bottom-nav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.tab === tabName);
    });
    if (tabName === 'roadmap') {
      view.innerHTML = '<div id="roadmap-section"></div><h2>역량 체크</h2><div id="capabilities-section"></div>';
      renderRoadmapTab(document.getElementById('roadmap-section'), roadmapItems, roadmapChecked);
      renderCapabilitiesTab(document.getElementById('capabilities-section'), capabilityItems, capabilityChecked);
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
    } catch (e) { /* localStorage 비어있거나 손상 — 빈 Set으로 시작 */ }
    renderTab(currentTabFromHash());
    try {
      await loadProgress();
      localStorage.setItem('gcp-ce-roadmap:roadmapChecked', JSON.stringify([...roadmapChecked]));
      localStorage.setItem('gcp-ce-roadmap:capabilityChecked', JSON.stringify([...capabilityChecked]));
      renderTab(currentTabFromHash());
    } catch (e) {
      console.warn('Supabase 로드 실패 — localStorage 상태로 계속', e);
    }
  })();

  window.App = { renderRoadmapTab, renderCapabilitiesTab, escapeHtml };
})();
