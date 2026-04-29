(async function () {
  const S = globalThis.__ofblock.storage;
  const C = globalThis.__ofblock.constants;
  const M = globalThis.__ofblock.messaging;

  const thresholdEl = document.getElementById("threshold");
  const thresholdValueEl = document.getElementById("thresholdValue");
  const revealModeEl = document.getElementById("revealMode");
  const allowlistEl = document.getElementById("allowlist");
  const blocklistEl = document.getElementById("blocklist");
  const keywordsEl = document.getElementById("keywords");
  const resetKeywordsBtn = document.getElementById("resetKeywords");
  const resetCacheBtn = document.getElementById("resetCache");
  const resetStatsBtn = document.getElementById("resetStats");
  const toastEl = document.getElementById("toast");

  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg || "Saved";
    toastEl.hidden = false;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.hidden = true;
    }, 1400);
  }

  function parseList(text) {
    return text
      .split(/\r?\n/)
      .map((s) => s.trim().replace(/^@/, "").toLowerCase())
      .filter(Boolean);
  }

  function parseKeywords(text) {
    const list = text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length ? list : null;
  }

  async function load() {
    const s = await S.getSettings();
    thresholdEl.value = s.threshold;
    thresholdValueEl.textContent = String(s.threshold);
    revealModeEl.value = s.revealMode || "session";
    allowlistEl.value = (s.allowlist || []).join("\n");
    blocklistEl.value = (s.blocklist || []).join("\n");
    keywordsEl.value = (s.keywords && s.keywords.length ? s.keywords : C.KEYWORDS).join("\n");
  }

  function notifyContentScripts() {
    if (M && M.broadcastToTabs) {
      M.broadcastToTabs({ type: "settingsChanged" });
    }
  }

  thresholdEl.addEventListener("input", (e) => {
    thresholdValueEl.textContent = e.target.value;
  });
  thresholdEl.addEventListener("change", async (e) => {
    await S.setSettings({ threshold: parseInt(e.target.value, 10) });
    toast();
    notifyContentScripts();
  });

  revealModeEl.addEventListener("change", async (e) => {
    await S.setSettings({ revealMode: e.target.value });
    toast();
    notifyContentScripts();
  });

  allowlistEl.addEventListener("blur", async () => {
    await S.setSettings({ allowlist: parseList(allowlistEl.value) });
    toast();
    notifyContentScripts();
  });

  blocklistEl.addEventListener("blur", async () => {
    await S.setSettings({ blocklist: parseList(blocklistEl.value) });
    toast();
    notifyContentScripts();
  });

  keywordsEl.addEventListener("blur", async () => {
    await S.setSettings({ keywords: parseKeywords(keywordsEl.value) });
    toast();
    notifyContentScripts();
  });

  resetKeywordsBtn.addEventListener("click", async () => {
    keywordsEl.value = C.KEYWORDS.join("\n");
    await S.setSettings({ keywords: null });
    toast("Keywords reset");
    notifyContentScripts();
  });

  resetCacheBtn.addEventListener("click", async () => {
    await chrome.storage.local.remove(["profileCache", "decisions"]);
    toast("Cache cleared");
    notifyContentScripts();
  });

  resetStatsBtn.addEventListener("click", async () => {
    await S.resetStats();
    toast("Stats reset");
  });

  await load();
})();
