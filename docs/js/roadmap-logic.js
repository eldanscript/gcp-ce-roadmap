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

  const RoadmapLogic = { currentWeekNumber, progressSummary, sortRemaining };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoadmapLogic;
  } else {
    root.RoadmapLogic = RoadmapLogic;
  }
})(typeof window !== 'undefined' ? window : globalThis);
