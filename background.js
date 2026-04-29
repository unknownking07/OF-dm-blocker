// Service worker — header capture + UserByScreenName fetch + 7-day cache.

const GRAPHQL_URLS = [
  "https://*.x.com/i/api/graphql/*",
  "https://*.twitter.com/i/api/graphql/*",
];

const PROFILE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const OF_DOMAIN_REGEX = /(onlyfans|fansly|linktr\.ee|beacons\.ai|allmylinks|fanvue)\.com/i;
const BIO_KEYWORDS = [
  "onlyfans",
  "fansly",
  "linktree",
  "linktr.ee",
  "beacons",
  "spicy",
  "exclusive content",
  "18+",
  "free trial",
  "verify your age",
  "nsfw",
  "subscribe to my",
];

let xHeaders = null;
let gqlMeta = null;
const inFlight = new Map();

function checkBio(description) {
  if (!description) return false;
  const lower = description.toLowerCase();
  for (const k of BIO_KEYWORDS) {
    if (lower.indexOf(k) !== -1) return true;
  }
  return false;
}

function checkOfUrl(url) {
  if (!url) return false;
  return OF_DOMAIN_REGEX.test(url);
}

async function loadHeaders() {
  if (xHeaders) return xHeaders;
  try {
    const r = await chrome.storage.session.get({ xHeaders: null });
    if (r.xHeaders) xHeaders = r.xHeaders;
  } catch (e) {
    void 0;
  }
  return xHeaders;
}

async function loadGqlMeta() {
  if (gqlMeta) return gqlMeta;
  try {
    const r = await chrome.storage.local.get({ gqlMeta: null });
    if (r.gqlMeta) gqlMeta = r.gqlMeta;
  } catch (e) {
    void 0;
  }
  return gqlMeta;
}

chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!details.requestHeaders) return;

    let auth = null;
    let csrf = null;
    let txid = null;
    for (const h of details.requestHeaders) {
      const lower = h.name.toLowerCase();
      if (lower === "authorization") auth = h.value;
      else if (lower === "x-csrf-token") csrf = h.value;
      else if (lower === "x-client-transaction-id") txid = h.value;
    }

    if (auth && csrf) {
      xHeaders = {
        authorization: auth,
        xCsrfToken: csrf,
        xClientTransactionId: txid || "",
        capturedAt: Date.now(),
      };
      chrome.storage.session.set({ xHeaders }).catch(() => {});
    }

    try {
      const url = new URL(details.url);
      const segments = url.pathname.split("/").filter(Boolean);
      const gqlIdx = segments.indexOf("graphql");
      if (gqlIdx >= 0 && segments[gqlIdx + 2] === "UserByScreenName") {
        const queryId = segments[gqlIdx + 1];
        const featuresStr = url.searchParams.get("features");
        const variablesStr = url.searchParams.get("variables");
        if (queryId && featuresStr) {
          const features = JSON.parse(featuresStr);
          const variables = variablesStr ? JSON.parse(variablesStr) : {};
          const fieldToggles = url.searchParams.get("fieldToggles");
          gqlMeta = {
            queryId,
            features,
            variablesShape: variables,
            fieldToggles: fieldToggles ? JSON.parse(fieldToggles) : null,
            capturedAt: Date.now(),
          };
          chrome.storage.local.set({ gqlMeta }).catch(() => {});
        }
      }
    } catch (e) {
      void 0;
    }
  },
  { urls: GRAPHQL_URLS },
  ["requestHeaders", "extraHeaders"]
);

async function readCachedProfile(screenNameLower) {
  const r = await chrome.storage.local.get({ profileCache: {} });
  const entry = r.profileCache[screenNameLower];
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > PROFILE_CACHE_TTL_MS) return null;
  return entry;
}

async function writeCachedProfile(screenNameLower, value) {
  const r = await chrome.storage.local.get({ profileCache: {} });
  r.profileCache[screenNameLower] = value;
  await chrome.storage.local.set({ profileCache: r.profileCache });
}

async function fetchProfile(screenNameLower) {
  const headers = await loadHeaders();
  const meta = await loadGqlMeta();
  if (!headers || !meta) {
    return { status: "not-ready" };
  }

  const variables = { ...(meta.variablesShape || {}), screen_name: screenNameLower };
  const url = new URL(`https://x.com/i/api/graphql/${meta.queryId}/UserByScreenName`);
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set("features", JSON.stringify(meta.features || {}));
  if (meta.fieldToggles) {
    url.searchParams.set("fieldToggles", JSON.stringify(meta.fieldToggles));
  }

  let res;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      credentials: "include",
      headers: {
        authorization: headers.authorization,
        "x-csrf-token": headers.xCsrfToken,
        "x-client-transaction-id": headers.xClientTransactionId || "",
        "content-type": "application/json",
      },
    });
  } catch (e) {
    return { status: "network-error", error: e.message };
  }

  if (res.status === 401 || res.status === 403) {
    xHeaders = null;
    chrome.storage.session.remove("xHeaders").catch(() => {});
    return { status: "auth-expired" };
  }
  if (res.status === 400 || res.status === 404) {
    gqlMeta = null;
    chrome.storage.local.remove("gqlMeta").catch(() => {});
    return { status: "schema-rotated", code: res.status };
  }
  if (!res.ok) {
    return { status: "fetch-failed", code: res.status };
  }

  let json;
  try {
    json = await res.json();
  } catch (e) {
    return { status: "parse-error" };
  }

  const result =
    json && json.data && json.data.user && json.data.user.result;
  const legacy = result && result.legacy;
  if (!legacy) {
    return { status: "no-user" };
  }

  const description = legacy.description || "";
  let expandedUrl = "";
  if (
    legacy.entities &&
    legacy.entities.url &&
    Array.isArray(legacy.entities.url.urls) &&
    legacy.entities.url.urls[0]
  ) {
    expandedUrl = legacy.entities.url.urls[0].expanded_url || "";
  }

  const bioMatch = checkBio(description);
  const ofUrl = checkOfUrl(expandedUrl);

  return {
    status: "ok",
    bioMatch,
    ofUrl,
    description: description.slice(0, 280),
    expandedUrl,
    fetchedAt: Date.now(),
  };
}

async function inspectProfile(screenName) {
  if (!screenName) return { status: "no-screen-name" };
  const lc = screenName.toLowerCase().replace(/^@/, "");

  const cached = await readCachedProfile(lc);
  if (cached) return cached;

  if (inFlight.has(lc)) return inFlight.get(lc);

  const promise = (async () => {
    const result = await fetchProfile(lc);
    if (result.status === "ok") {
      await writeCachedProfile(lc, result);
    }
    inFlight.delete(lc);
    return result;
  })();

  inFlight.set(lc, promise);
  return promise;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;
  if (msg.type === "inspectProfile") {
    inspectProfile(msg.screenName).then(sendResponse, (err) =>
      sendResponse({ status: "error", error: err && err.message ? err.message : String(err) })
    );
    return true;
  }
  if (msg.type === "ping") {
    sendResponse({ ok: true, hasHeaders: !!xHeaders, hasMeta: !!gqlMeta });
    return false;
  }
  return false;
});

loadHeaders();
loadGqlMeta();

console.log("[ofblock] service worker booted");
