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

    const ps = await chrome.storage.local.get({ pageStatus: null });
    const statusDot = document.getElementById("statusDot");
    const statusText = document.getElementById("statusText");
    const statusDetail = document.getElementById("statusDetail");
    const status = ps.pageStatus;
    if (!status || Date.now() - status.lastScan > 60_000) {
      statusDot.dataset.state = "idle";
      statusText.textContent = "Not active — open x.com/messages/requests";
      statusDetail.textContent = "";
    } else if (!status.active) {
      statusDot.dataset.state = "idle";
      statusText.textContent = "Inactive on " + status.url;
      statusDetail.textContent = "";
    } else if (status.rowsFound === 0) {
      statusDot.dataset.state = "warn";
      statusText.textContent = "Active but found 0 rows";
      statusDetail.textContent = "X may have changed DOM. Check DevTools console for [ofblock] logs.";
    } else {
      statusDot.dataset.state = "ok";
      statusText.textContent = "Active on " + status.url;
      statusDetail.textContent = `${status.rowsFound} rows scanned · ${status.rowsFiltered} filtered · via ${status.strategy}`;
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
