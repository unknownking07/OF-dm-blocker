(function (root) {
  root.__ofblock = root.__ofblock || {};

  const SYNC_DEFAULTS = {
    enabled: true,
    threshold: 3,
    keywords: null,
    allowlist: [],
    blocklist: [],
    revealMode: "session",
    hideMode: "blur",
  };

  const STATS_DEFAULT = { hiddenToday: 0, hiddenTotal: 0, dayKey: "" };

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  async function getSettings() {
    return await chrome.storage.sync.get(SYNC_DEFAULTS);
  }

  async function setSettings(patch) {
    return await chrome.storage.sync.set(patch);
  }

  async function getStats() {
    const r = await chrome.storage.local.get({ stats: { ...STATS_DEFAULT } });
    const stats = r.stats || { ...STATS_DEFAULT };
    const today = todayKey();
    if (stats.dayKey !== today) {
      stats.dayKey = today;
      stats.hiddenToday = 0;
      await chrome.storage.local.set({ stats });
    }
    return stats;
  }

  async function bumpStats(by) {
    by = by || 1;
    const stats = await getStats();
    stats.hiddenToday += by;
    stats.hiddenTotal += by;
    await chrome.storage.local.set({ stats });
    return stats;
  }

  async function resetStats() {
    await chrome.storage.local.set({
      stats: { hiddenToday: 0, hiddenTotal: 0, dayKey: todayKey() },
    });
  }

  function onSyncChanged(callback) {
    const listener = (changes, area) => {
      if (area === "sync") callback(changes);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  root.__ofblock.storage = {
    SYNC_DEFAULTS,
    getSettings,
    setSettings,
    getStats,
    bumpStats,
    resetStats,
    onSyncChanged,
    todayKey,
  };
})(typeof globalThis !== "undefined" ? globalThis : self);
