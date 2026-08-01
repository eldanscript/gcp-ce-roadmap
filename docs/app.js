(function () {
  let roadmapItems = [];
  let capabilityItems = [];
  let roadmapChecked = new Set();   // Task 7에서 Supabase로 교체
  let capabilityChecked = new Set();

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
        if (e.target.checked) roadmapChecked.add(id); else roadmapChecked.delete(id);
        renderRoadmapTab(container, roadmapItems, roadmapChecked);
      });
    });
  }

  function renderTab(tabName) {
    const view = document.getElementById('view');
    document.querySelectorAll('.bottom-nav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.tab === tabName);
    });
    if (tabName === 'roadmap') {
      renderRoadmapTab(view, roadmapItems, roadmapChecked);
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
    renderTab(currentTabFromHash());
  })();

  window.App = { renderRoadmapTab, escapeHtml };
})();
