(function () {
  const NS = (window.__ofblock = window.__ofblock || {});
  const C = NS.constants;
  const D = NS.detector;
  const O = NS.observer;
  const R = NS.renderer;
  const S = NS.storage;

  if (!C || !D || !O || !R) {
    console.error("[ofblock] missing module — check manifest content_scripts order");
    return;
  }

  let routeActive = false;
  const decisionsCache = new Map();
  const revealedSet = new Set();
  const profileResults = new Map();
  const profilePending = new Set();
  const profileChecked = new Set();

  let settings = { ...(S ? S.SYNC_DEFAULTS : { enabled: true, threshold: C.THRESHOLD, keywords: null, allowlist: [], blocklist: [], revealMode: "session" }) };

  function isOnRequests() {
    const p = location.pathname;
    if (/^\/messages\/(requests|additional|spam)/.test(p)) return true;
    // DOM heading fallback — covers cases where the SPA doesn't change the URL
    // for the "Additional messages" sub-tab on /messages/requests.
    const headers = document.querySelectorAll('h1, h2, [role="heading"]');
    for (const h of headers) {
      const t = (h.textContent || "").trim().toLowerCase();
      if (t === "message requests" || t === "additional messages") return true;
    }
    return false;
  }

  function nodeText(el) {
    let result = "";
    if (!el || !el.childNodes) return result;
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "IMG" && node.getAttribute("alt")) {
          result += node.getAttribute("alt");
        } else {
          result += nodeText(node);
        }
      }
    });
    return result;
  }

  function getRowData(rowEl) {
    const link = rowEl.querySelector(C.SELECTORS.rowLink);
    if (!link) return null;
    const href = link.getAttribute("href") || "";
    const segments = href.split("/").filter(Boolean);
    const conversationId = segments[segments.length - 1] || "";
    if (!conversationId) return null;

    let displayName = "";
    let handle = "";

    const spans = link.querySelectorAll("span");
    for (const span of spans) {
      const text = nodeText(span).trim();
      if (!text) continue;
      if (text.startsWith("@")) {
        if (!handle) handle = text;
        continue;
      }
      if (C.DATE_TOKEN_REGEX.test(text)) continue;
      if (text === "·") continue;
      if (/@\w/.test(text)) continue;
      if (text.length > 60) continue;
      if (!displayName) displayName = text;
      if (displayName && handle) break;
    }

    let snippet = "";
    const dirDivs = rowEl.querySelectorAll('div[dir="auto"]');
    for (const div of dirDivs) {
      const text = nodeText(div).trim();
      if (!text) continue;
      if (text === displayName) continue;
      if (text.startsWith("@")) continue;
      if (text.length > snippet.length) snippet = text;
    }
    if (snippet.length > C.MAX_SNIPPET_LEN) snippet = snippet.slice(0, C.MAX_SNIPPET_LEN);
    if (snippet.startsWith("You: ")) return null;

    const rowText = rowEl.textContent || "";
    const hasMutuals = C.MUTUALS_REGEX.test(rowText);

    return { conversationId, displayName, handle, snippet, hasMutuals };
  }

  function processRow(rowEl) {
    const data = getRowData(rowEl);
    if (!data) return;

    if (!settings.enabled) {
      R.clearFilter(rowEl);
      return;
    }

    const prevId = rowEl.dataset.ofblockConversationId;
    if (prevId && prevId !== data.conversationId) {
      R.clearFilter(rowEl);
    }

    if (revealedSet.has(data.conversationId)) {
      R.clearFilter(rowEl);
      return;
    }

    const handleLc = (data.handle || "").toLowerCase().replace(/^@/, "");
    const cachedProfile = handleLc ? profileResults.get(handleLc) : null;

    let decision = decisionsCache.get(data.conversationId);
    if (!decision) {
      decision = D.scoreThread({
        displayName: data.displayName,
        handle: data.handle,
        snippet: data.snippet,
        hasMutuals: data.hasMutuals,
        keywords: (settings.keywords && settings.keywords.length) ? settings.keywords : C.KEYWORDS,
        allowlist: settings.allowlist || [],
        blocklist: settings.blocklist || [],
        profileSignals: cachedProfile || null,
      });
      decisionsCache.set(data.conversationId, decision);
    }

    const wasFiltered = rowEl.dataset.ofblockState === "filtered";
    if (decision.total >= settings.threshold) {
      if (!wasFiltered && S) {
        S.bumpStats().catch(() => {});
      }
      R.applyFilter(rowEl, data.conversationId, decision, data.handle, settings.hideMode || "blur");
    } else {
      R.clearFilter(rowEl);
      const borderlineFloor = Math.max(1, settings.threshold - 3);
      if (
        decision.total >= borderlineFloor &&
        handleLc &&
        !profilePending.has(handleLc) &&
        !profileChecked.has(handleLc)
      ) {
        inspectHandle(data.handle);
      }
    }
  }

  async function inspectHandle(handle) {
    const lc = (handle || "").toLowerCase().replace(/^@/, "");
    if (!lc || profilePending.has(lc) || profileChecked.has(lc)) return;
    const M = NS.messaging;
    if (!M) return;
    profilePending.add(lc);
    try {
      const response = await M.send({ type: "inspectProfile", screenName: lc });
      profilePending.delete(lc);
      if (!response || response.error) {
        return;
      }
      if (response.status === "not-ready") {
        return;
      }
      profileChecked.add(lc);
      if (response.bioMatch || response.ofUrl) {
        profileResults.set(lc, {
          bioMatch: !!response.bioMatch,
          ofUrl: !!response.ofUrl,
        });
        decisionsCache.clear();
        scanAll();
      }
    } catch (e) {
      profilePending.delete(lc);
    }
  }

  let firstRowSeen = false;
  let loggedNoRows = false;

  function findRows() {
    // Strategy 1: stable data-testid (works on /messages/requests)
    const primary = document.querySelectorAll(C.SELECTORS.row);
    if (primary.length > 0) return Array.from(primary);

    // Strategy 2: cellInnerDiv containers that wrap a /messages/<id> link
    // (X uses this on Additional messages and other DM list variants)
    const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
    const cellHits = [];
    for (const cell of cells) {
      const link = cell.querySelector('a[href^="/messages/"]');
      if (!link) continue;
      const href = link.getAttribute("href") || "";
      // Skip nav links like /messages/requests itself
      if (href === "/messages" || href === "/messages/requests" || href === "/messages/requests/additional") continue;
      cellHits.push(cell);
    }
    if (cellHits.length > 0) return cellHits;

    // Strategy 3: walk up from any /messages/<id> link to a list-item parent
    const links = document.querySelectorAll('a[href^="/messages/"]');
    const containers = new Set();
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const tail = href.replace(/^\/messages\//, "");
      if (!tail || tail === "requests" || tail === "requests/additional") continue;
      let el = link.parentElement;
      let depth = 0;
      while (el && depth < 10) {
        const role = el.getAttribute && el.getAttribute("role");
        if (role === "listitem" || role === "button" || el.tagName === "LI" || el.tagName === "ARTICLE") {
          containers.add(el);
          break;
        }
        el = el.parentElement;
        depth++;
      }
    }
    return Array.from(containers);
  }

  function scanAll() {
    if (!isOnRequests()) return;
    const rows = findRows();
    if (rows.length > 0) {
      if (!firstRowSeen) {
        firstRowSeen = true;
        try { chrome.storage.local.set({ selectorWarning: null }); } catch (e) { void 0; }
      }
      loggedNoRows = false;
    } else if (!loggedNoRows) {
      loggedNoRows = true;
      console.warn("[ofblock] no rows found on", location.pathname, "— DOM may have changed; please report at https://github.com/unknownking07/OF-dm-blocker/issues");
    }
    rows.forEach(processRow);
  }

  function handleClick(e) {
    const target = e.target.closest && e.target.closest("[data-ofblock-action]");
    if (!target) return;
    e.stopPropagation();
    e.preventDefault();
    const action = target.dataset.ofblockAction;
    const rowEl = target.closest(C.SELECTORS.row);
    if (!rowEl) return;
    const conversationId = rowEl.dataset.ofblockConversationId;
    const handle = rowEl.dataset.ofblockHandle;
    if (action === "reveal") {
      if (conversationId) revealedSet.add(conversationId);
      R.clearFilter(rowEl);
    } else if (action === "always-show") {
      if (handle && S) {
        S.getSettings().then((s) => {
          const list = Array.isArray(s.allowlist) ? s.allowlist.slice() : [];
          const lc = handle.replace(/^@/, "").toLowerCase();
          if (list.indexOf(lc) === -1) list.push(lc);
          return S.setSettings({ allowlist: list });
        });
      }
      if (conversationId) revealedSet.add(conversationId);
      R.clearFilter(rowEl);
    }
  }

  async function loadSettings() {
    if (!S) return;
    try {
      settings = await S.getSettings();
    } catch (e) {
      console.warn("[ofblock] could not load settings, using defaults", e);
    }
  }

  function activate() {
    if (routeActive) return;
    routeActive = true;
    firstRowSeen = false;
    document.addEventListener("click", handleClick, true);
    O.attach(scanAll);
    console.log("[ofblock] activated on", location.pathname);
    setTimeout(() => {
      if (!firstRowSeen && isOnRequests()) {
        console.warn(
          "[ofblock] selector self-test failed — no conversation rows found after 5s. X may have updated its DOM."
        );
        try {
          chrome.storage.local.set({
            selectorWarning: { at: Date.now(), atUrl: location.href },
          });
        } catch (e) {
          void 0;
        }
      }
    }, 5000);
  }

  function deactivate() {
    if (!routeActive) return;
    routeActive = false;
    document.removeEventListener("click", handleClick, true);
    O.detach();
    decisionsCache.clear();
    document
      .querySelectorAll(".ofblock-filtered, .ofblock-hidden")
      .forEach((row) => R.clearFilter(row));
    console.log("[ofblock] deactivated");
  }

  function checkRoute() {
    if (isOnRequests()) activate();
    else deactivate();
  }

  let lastPath = "";
  function pollUrl() {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      checkRoute();
    }
  }

  if (S) {
    S.onSyncChanged((changes) => {
      let touched = false;
      for (const k of Object.keys(changes)) {
        if (k in settings) {
          settings[k] = changes[k].newValue;
          touched = true;
        }
      }
      if (touched) {
        decisionsCache.clear();
        scanAll();
      }
    });
  }

  if (chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg) => {
      if (!msg || !msg.type) return;
      if (msg.type === "settingsChanged") {
        loadSettings().then(() => {
          decisionsCache.clear();
          if (msg.force) {
            document
              .querySelectorAll(`${C.SELECTORS.row}.ofblock-filtered`)
              .forEach((row) => R.clearFilter(row));
            revealedSet.clear();
          }
          scanAll();
        });
      }
    });
  }

  loadSettings().then(() => {
    pollUrl();
    setInterval(pollUrl, 250);
  });
})();
