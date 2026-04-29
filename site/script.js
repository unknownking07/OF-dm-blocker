// Demo DM rows — pulled directly from the kinds of bot patterns observed in real X Message Requests.
// The legit row is a tongue-in-cheek Elon Musk mockup to drive home the mutuals override.
const DEMO_ROWS = [
  {
    avatar: "J",
    color: "linear-gradient(135deg, #ff7eb6, #ff6b9d)",
    name: "Julia 🍓 ❤️",
    handle: "@OwenMorris74275",
    time: "Apr 25",
    snippet: "Hi. ever wonder what i'm thinking about…",
    bot: true,
    reasons: "name/handle mismatch · numeric handle",
  },
  {
    avatar: "G",
    color: "linear-gradient(135deg, #ffb86b, #ff8b3d)",
    name: "Gianna 🍑",
    handle: "@cloud649930362",
    time: "Apr 24",
    snippet: "Hey, [Name], wanna go on a date? 😭",
    bot: true,
    reasons: "placeholder leak · numeric handle",
  },
  {
    avatar: "E",
    color: "linear-gradient(135deg, #1d9bf0, #0c63a0)",
    name: "Elon Musk",
    verified: true,
    handle: "@elonmusk",
    time: "Apr 20",
    snippet: "can i be mutual?",
    bot: false,
    mutuals: "Followed by adah, Maisha (KOMA), and 312 others you follow",
  },
  {
    avatar: "A",
    color: "linear-gradient(135deg, #b6e368, #88c93f)",
    name: "Amelia 🥬",
    handle: "@LilaF89955",
    time: "Apr 22",
    snippet: "I'm just looking for a stranger to let loose with…",
    bot: true,
    reasons: "templated opener · numeric handle · emoji name",
  },
  {
    avatar: "C",
    color: "linear-gradient(135deg, #d8a4ef, #b06fe5)",
    name: "Camila 🍺",
    handle: "@uzeqmf81910",
    time: "Apr 23",
    snippet: "I'm lying in bed, bored out of my mind…",
    bot: true,
    reasons: "templated opener · numeric handle",
  },
  {
    avatar: "M",
    color: "linear-gradient(135deg, #ffd16b, #f5a623)",
    name: "MaryThomas",
    handle: "@MaryThomas51754",
    time: "Apr 12",
    snippet: "🪐 💰 Want more personal photos? Co…",
    bot: true,
    reasons: "templated opener · numeric handle",
  },
];

const VERIFIED_SVG =
  '<svg class="dm-verified" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified" role="img"><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.354-.643.366h-.04c-.247 0-.48-.105-.644-.288l-2.498-2.834c-.314-.354-.28-.895.072-1.207.355-.312.895-.282 1.207.072l1.776 2.013 3.74-5.609c.247-.37.749-.476 1.124-.224.376.245.479.748.232 1.123z"/></svg>';

function renderRows() {
  const list = document.getElementById("demoList");
  if (!list) return;
  list.innerHTML = "";
  for (const row of DEMO_ROWS) {
    const el = document.createElement("div");
    el.className = "dm-row";
    el.dataset.bot = row.bot ? "1" : "0";

    const verifiedBit = row.verified ? VERIFIED_SVG : "";
    const meta = `
      <span class="dm-name">${escapeHtml(row.name)}</span>
      ${verifiedBit}
      <span class="dm-handle">${escapeHtml(row.handle)}</span>
      <span class="dm-time">· ${escapeHtml(row.time)}</span>
    `;

    const mutualsLine = row.mutuals
      ? `<div class="dm-snippet" style="color:#71767b;font-size:12px">${escapeHtml(row.mutuals)}</div>`
      : "";

    el.innerHTML = `
      <div class="dm-content">
        <div class="dm-avatar" style="background:${row.color}">${row.avatar}</div>
        <div class="dm-info">
          <div class="dm-meta">${meta}</div>
          <div class="dm-snippet">${escapeHtml(row.snippet)}</div>
          ${mutualsLine}
        </div>
      </div>
      <div class="ofb-overlay">
        <button class="ofb-pill">Filtered as spam — Show</button>
        <span class="ofb-explain">${escapeHtml(row.reasons || "")}</span>
      </div>
    `;
    list.appendChild(el);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function setExtensionState(on) {
  const list = document.getElementById("demoList");
  if (!list) return;
  list.querySelectorAll(".dm-row").forEach((row) => {
    if (on && row.dataset.bot === "1") {
      row.classList.add("filtered");
    } else {
      row.classList.remove("filtered");
    }
  });
  const btn = document.getElementById("toggle");
  if (btn) {
    btn.dataset.state = on ? "on" : "off";
    btn.querySelector(".toggle-label").textContent = on
      ? "OF Block is on"
      : "Turn on OF Block";
  }
}

function initThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "light";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("ofblock-theme", next);
    } catch (e) {}
  });
}

function init() {
  initThemeToggle();
  renderRows();
  // Auto-flip the demo on after a moment so the impact is the first thing visible.
  setTimeout(() => setExtensionState(true), 900);

  const btn = document.getElementById("toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const next = btn.dataset.state !== "on";
      setExtensionState(next);
    });
  }

  // Reveal pill demo
  document.addEventListener("click", (e) => {
    const pill = e.target.closest && e.target.closest(".ofb-pill");
    if (!pill) return;
    e.stopPropagation();
    const row = pill.closest(".dm-row");
    if (row) row.classList.remove("filtered");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
