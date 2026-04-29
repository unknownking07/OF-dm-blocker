window.__ofblock = window.__ofblock || {};
window.__ofblock.renderer = (function () {
  function formatSignals(signals) {
    if (!signals) return "";
    const parts = [];
    if (signals.placeholderLeak) parts.push("placeholder leak");
    if (signals.handleDigits) parts.push("numeric handle");
    if (signals.nameHandleMismatch) parts.push("name/handle mismatch");
    if (signals.keywords) parts.push("templated opener");
    if (signals.emoji) parts.push("emoji name");
    if (signals.ofUrl) parts.push("OF link in bio");
    if (signals.bioMatch) parts.push("bio keywords");
    if (signals.blocklisted) parts.push("blocklisted");
    return parts.join(" · ");
  }

  function applyFilter(rowEl, conversationId, decision, handle, mode) {
    const targetState = mode === "hide" ? "hidden" : "filtered";
    if (
      rowEl.dataset.ofblockState === targetState &&
      rowEl.dataset.ofblockConversationId === conversationId
    ) {
      return;
    }
    clearFilter(rowEl);
    rowEl.dataset.ofblockState = targetState;
    rowEl.dataset.ofblockConversationId = conversationId || "";
    rowEl.dataset.ofblockHandle = handle || "";

    if (mode === "hide") {
      rowEl.classList.add("ofblock-hidden");
      return;
    }

    rowEl.classList.add("ofblock-filtered");

    const overlay = document.createElement("div");
    overlay.className = "ofblock-overlay";

    const pill = document.createElement("button");
    pill.className = "ofblock-pill";
    pill.dataset.ofblockAction = "reveal";
    pill.type = "button";
    pill.textContent = "Filtered as spam — Show";

    const explain = document.createElement("span");
    explain.className = "ofblock-explain";
    explain.textContent = formatSignals(decision && decision.signals);

    const allow = document.createElement("button");
    allow.className = "ofblock-link";
    allow.dataset.ofblockAction = "always-show";
    allow.type = "button";
    allow.textContent = "Always show";
    allow.title = "Add this sender to your allowlist";

    overlay.appendChild(pill);
    overlay.appendChild(explain);
    overlay.appendChild(allow);
    rowEl.appendChild(overlay);
  }

  function clearFilter(rowEl) {
    rowEl.classList.remove("ofblock-filtered", "ofblock-hidden");
    delete rowEl.dataset.ofblockState;
    delete rowEl.dataset.ofblockConversationId;
    delete rowEl.dataset.ofblockHandle;
    const overlay = rowEl.querySelector(":scope > .ofblock-overlay");
    if (overlay) overlay.remove();
  }

  return { applyFilter, clearFilter, formatSignals };
})();
