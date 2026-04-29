window.__ofblock = window.__ofblock || {};
window.__ofblock.inPageControl = (function () {
  let fabEl = null;
  let panelEl = null;
  let storageListenerOff = null;
  let mounted = false;

  function build() {
    fabEl = document.createElement("div");
    fabEl.id = "ofblock-fab-root";
    fabEl.className = "ofblock-fab-root";
    fabEl.innerHTML = `
      <button type="button" class="ofblock-fab-btn" aria-label="OF Block toggle" title="OF Block">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
          <line x1="6" y1="6" x2="18" y2="18" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
          <line x1="18" y1="6" x2="6" y2="18" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/>
        </svg>
        <span class="ofblock-fab-badge" hidden>0</span>
      </button>
      <div class="ofblock-fab-panel" hidden>
        <div class="ofblock-fab-header">
          <span class="ofblock-fab-title">OF Block</span>
          <label class="ofblock-fab-switch" title="Enable / disable">
            <input type="checkbox" class="ofblock-fab-enabled">
            <span class="ofblock-fab-slider"></span>
          </label>
        </div>
        <div class="ofblock-fab-stats-row">
          <div class="ofblock-fab-stat">
            <span class="ofblock-fab-num ofblock-fab-today">0</span>
            <span class="ofblock-fab-label">today</span>
          </div>
          <div class="ofblock-fab-stat">
            <span class="ofblock-fab-num ofblock-fab-total">0</span>
            <span class="ofblock-fab-label">total</span>
          </div>
        </div>
        <div class="ofblock-fab-thresh-head">
          <span>Sensitivity</span>
          <span class="ofblock-fab-thresh-val">3</span>
        </div>
        <input type="range" class="ofblock-fab-threshold" min="1" max="10" step="1">
        <div class="ofblock-fab-thresh-hint">
          <span>Strict</span>
          <span>Lenient</span>
        </div>
        <div class="ofblock-fab-mode">
          <label>Mode</label>
          <select class="ofblock-fab-hidemode">
            <option value="blur">Blur with Show button</option>
            <option value="hide">Hide entirely</option>
          </select>
        </div>
        <button type="button" class="ofblock-fab-settings">Open full settings →</button>
      </div>
    `;
    document.documentElement.appendChild(fabEl);
    panelEl = fabEl.querySelector(".ofblock-fab-panel");
    bindEvents();
  }

  function bindEvents() {
    const btn = fabEl.querySelector(".ofblock-fab-btn");
    const enabledInput = fabEl.querySelector(".ofblock-fab-enabled");
    const threshInput = fabEl.querySelector(".ofblock-fab-threshold");
    const threshVal = fabEl.querySelector(".ofblock-fab-thresh-val");
    const hideModeSel = fabEl.querySelector(".ofblock-fab-hidemode");
    const settingsBtn = fabEl.querySelector(".ofblock-fab-settings");

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      panelEl.hidden = !panelEl.hidden;
      if (!panelEl.hidden) refreshState();
    });

    document.addEventListener("click", (e) => {
      if (!panelEl.hidden && !fabEl.contains(e.target)) {
        panelEl.hidden = true;
      }
    });

    panelEl.addEventListener("click", (e) => e.stopPropagation());

    enabledInput.addEventListener("change", async (e) => {
      const S = window.__ofblock.storage;
      if (S) await S.setSettings({ enabled: e.target.checked });
      btn.classList.toggle("off", !e.target.checked);
    });

    threshInput.addEventListener("input", (e) => {
      threshVal.textContent = e.target.value;
    });
    threshInput.addEventListener("change", async (e) => {
      const S = window.__ofblock.storage;
      if (S) await S.setSettings({ threshold: parseInt(e.target.value, 10) });
    });

    hideModeSel.addEventListener("change", async (e) => {
      const S = window.__ofblock.storage;
      if (S) await S.setSettings({ hideMode: e.target.value });
    });

    settingsBtn.addEventListener("click", () => {
      try {
        chrome.runtime.sendMessage({ type: "openSettings" }, () => {
          void chrome.runtime.lastError;
        });
      } catch (e) {
        void 0;
      }
    });
  }

  async function refreshState() {
    const S = window.__ofblock.storage;
    if (!S || !fabEl) return;
    try {
      const settings = await S.getSettings();
      const stats = await S.getStats();
      const enabled = !!settings.enabled;
      fabEl.querySelector(".ofblock-fab-enabled").checked = enabled;
      fabEl.querySelector(".ofblock-fab-threshold").value = settings.threshold;
      fabEl.querySelector(".ofblock-fab-thresh-val").textContent = String(settings.threshold);
      fabEl.querySelector(".ofblock-fab-hidemode").value = settings.hideMode || "blur";
      fabEl.querySelector(".ofblock-fab-today").textContent = String(stats.hiddenToday);
      fabEl.querySelector(".ofblock-fab-total").textContent = String(stats.hiddenTotal);
      fabEl.querySelector(".ofblock-fab-btn").classList.toggle("off", !enabled);
      const badge = fabEl.querySelector(".ofblock-fab-badge");
      if (stats.hiddenToday > 0) {
        badge.textContent = String(stats.hiddenToday);
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    } catch (e) {
      void 0;
    }
  }

  function init() {
    if (mounted) return;
    mounted = true;
    build();
    refreshState();
    const S = window.__ofblock.storage;
    if (S && S.onSyncChanged) {
      storageListenerOff = S.onSyncChanged(() => refreshState());
    }
    // Refresh stats periodically while panel might be open
    setInterval(() => {
      if (mounted && panelEl && !panelEl.hidden) refreshState();
    }, 2000);
  }

  function destroy() {
    if (!mounted) return;
    mounted = false;
    if (storageListenerOff) {
      try { storageListenerOff(); } catch (e) { void 0; }
      storageListenerOff = null;
    }
    if (fabEl) {
      fabEl.remove();
      fabEl = null;
      panelEl = null;
    }
  }

  return { init, destroy, refreshState };
})();
