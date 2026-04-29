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
    // Match any /messages/* path. Specific conversation pages have no list
    // rows so the observer is a cheap no-op there. The main inbox and
    // requests/additional/spam tabs all get filtering.
    return location.pathname.startsWith("/messages");
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

    // Search across the WHOLE row, not just inside the link — X often puts
    // name/handle/snippet as siblings of the link rather than children.
    const spans = rowEl.querySelectorAll("span");
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

    // Fallback: aria-label often contains "Name @handle" or similar
    if (!displayName || !handle) {
      const aria = rowEl.getAttribute("aria-label") || link.getAttribute("aria-label") || "";
      if (aria) {
        const handleMatch = aria.match(/@\w+/);
        if (!handle && handleMatch) handle = handleMatch[0];
        if (!displayName) {
          // Take text before the @handle, before any "·", trim
          const namePart = aria.split(/[·,@]/)[0].trim();
          if (namePart && namePart.length < 60) displayName = namePart;
        }
      }
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
    // Snippet fallback: last span with text longer than display name
    if (!snippet) {
      for (const span of spans) {
        const text = nodeText(span).trim();
        if (!text || text === displayName || text === handle) continue;
        if (text.startsWith("@") || /^[A-Z][a-z]{2}\s\d{1,2}$/.test(text)) continue;
        if (text.length > 20 && text.length > snippet.length) snippet = text;
      }
    }
    if (snippet.length > C.MAX_SNIPPET_LEN) snippet = snippet.slice(0, C.MAX_SNIPPET_LEN);
    if (snippet.startsWith("You: ")) return null;

    const rowText = rowEl.textContent || "";
    const hasMutuals = C.MUTUALS_REGEX.test(rowText);

    if (!loggedSampleRow) {
      loggedSampleRow = true;
      console.log("[ofblock] sample row data:", { conversationId, displayName, handle, snippet, hasMutuals });
    }

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
  let loggedScanCount = false;
  let loggedSampleRow = false;

  function findRowContainer(link) {
    let el = link;
    for (let i = 0; i < 10; i++) {
      el = el.parentElement;
      if (!el) return null;
      const testid = el.getAttribute && el.getAttribute("data-testid");
      const role = el.getAttribute && el.getAttribute("role");
      if (testid === "conversation" || testid === "cellInnerDiv") return el;
      if (role === "listitem" || role === "button") return el;
      if (el.tagName === "LI" || el.tagName === "ARTICLE") return el;
      // Heuristic: if parent has 3+ children, el is likely a row in a list
      const parent = el.parentElement;
      if (parent && parent.children.length >= 3) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 200 && rect.height > 30 && rect.height < 220) {
          return el;
        }
      }
    }
    return null;
  }

  function findRows() {
    // Strategy 1: stable data-testid (works on /messages/requests)
    const primary = document.querySelectorAll(C.SELECTORS.row);
    if (primary.length > 0) return Array.from(primary);

    // Strategy 2: cellInnerDiv containers that wrap a /messages/<id> link
    const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
    const cellHits = [];
    for (const cell of cells) {
      const link = cell.querySelector('a[href^="/messages/"]');
      if (!link) continue;
      const href = link.getAttribute("href") || "";
      const tail = href.replace(/^\/messages\//, "");
      if (!tail || tail === "requests" || tail === "additional" || tail === "spam" || tail === "requests/additional") continue;
      cellHits.push(cell);
    }
    if (cellHits.length > 0) return cellHits;

    // Strategy 3: walk up from /messages/<id> links using a smart heuristic
    const links = document.querySelectorAll('a[href^="/messages/"]');
    const containers = new Set();
    for (const link of links) {
      const href = link.getAttribute("href") || "";
      const tail = href.replace(/^\/messages\//, "");
      if (!tail || tail === "requests" || tail === "additional" || tail === "spam" || tail === "requests/additional") continue;
      const el = findRowContainer(link);
      if (el) containers.add(el);
    }
    return Array.from(containers);
  }

  function writePageStatus(active, rowsFound, rowsFiltered, strategy) {
    try {
      chrome.storage.local.set({
        pageStatus: {
          url: location.pathname,
          active,
          rowsFound,
          rowsFiltered,
          strategy,
          lastScan: Date.now(),
        },
      });
    } catch (e) { void 0; }
  }

  function scanAll() {
    if (!isOnRequests()) {
      writePageStatus(false, 0, 0, "not-on-filter-page");
      return;
    }
    const rows = findRows();
    let strategy = "none";
    if (rows.length > 0) {
      // Identify which strategy matched
      const first = rows[0];
      const tid = first.getAttribute && first.getAttribute("data-testid");
      strategy = tid === "conversation" ? "testid-conversation" : tid === "cellInnerDiv" ? "testid-cellInnerDiv" : "walk-up-heuristic";
      if (!firstRowSeen) {
        firstRowSeen = true;
        try { chrome.storage.local.set({ selectorWarning: null }); } catch (e) { void 0; }
      }
      loggedNoRows = false;
      if (!loggedScanCount) {
        loggedScanCount = true;
        console.log("[ofblock] scanning", rows.length, "rows on", location.pathname, "via", strategy);
      }
    } else if (!loggedNoRows) {
      loggedNoRows = true;
      console.warn("[ofblock] no rows found on", location.pathname, "— DOM may have changed");
      console.log("[ofblock] diagnostic:", {
        testid_conversation: document.querySelectorAll('[data-testid="conversation"]').length,
        testid_cellInnerDiv: document.querySelectorAll('[data-testid="cellInnerDiv"]').length,
        message_links: document.querySelectorAll('a[href^="/messages/"]').length,
        sample_link_hrefs: Array.from(document.querySelectorAll('a[href^="/messages/"]')).slice(0, 5).map((a) => a.getAttribute("href")),
      });
    }
    rows.forEach(processRow);
    const filteredCount = document.querySelectorAll(".ofblock-filtered, .ofblock-hidden").length;
    writePageStatus(true, rows.length, filteredCount, strategy);
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

  // Belt-and-suspenders: also listen to history events for SPA navigation
  // in case the 250ms poll misses a quick back-and-forth.
  window.addEventListener("popstate", () => setTimeout(pollUrl, 50));

  let lastPath = "";
  function pollUrl() {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      // SPA navigation: tear down + rebuild so the observer attaches to the
      // new page's scroll container. Without this, navigating from /requests
      // to /requests/additional leaves the observer stuck on a detached node.
      deactivate();
      if (isOnRequests()) activate();
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
