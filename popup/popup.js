(async function () {
  const S = globalThis.__ofblock.storage;
  const M = globalThis.__ofblock.messaging;

  const enabledEl = document.getElementById("enabled");
  const thresholdEl = document.getElementById("threshold");
  const thresholdValueEl = document.getElementById("thresholdValue");
  const hiddenTodayEl = document.getElementById("hiddenToday");
  const hiddenTotalEl = document.getElementById("hiddenTotal");
  const openOptionsBtn = document.getElementById("openOptions");
  const recheckLink = document.getElementById("recheck");
  const selectorWarningEl = document.getElementById("selectorWarning");

  async function loadInitial() {
    const settings = await S.getSettings();
    enabledEl.checked = !!settings.enabled;
    thresholdEl.value = settings.threshold;
    thresholdValueEl.textContent = String(settings.threshold);

    const stats = await S.getStats();
    hiddenTodayEl.textContent = String(stats.hiddenToday);
    hiddenTotalEl.textContent = String(stats.hiddenTotal);

    const r = await chrome.storage.local.get({ selectorWarning: null });
    if (r.selectorWarning) {
      selectorWarningEl.hidden = false;
    }
  }

  enabledEl.addEventListener("change", async (e) => {
    await S.setSettings({ enabled: e.target.checked });
    M.broadcastToTabs({ type: "settingsChanged" });
  });

  thresholdEl.addEventListener("input", (e) => {
    thresholdValueEl.textContent = e.target.value;
  });
  thresholdEl.addEventListener("change", async (e) => {
    await S.setSettings({ threshold: parseInt(e.target.value, 10) });
    M.broadcastToTabs({ type: "settingsChanged" });
  });

  openOptionsBtn.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  recheckLink.addEventListener("click", (e) => {
    e.preventDefault();
    M.broadcastToTabs({ type: "settingsChanged", force: true });
  });

  await loadInitial();
})();
