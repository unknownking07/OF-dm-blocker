// Demo DM rows — pulled directly from the kinds of bot patterns observed in real X Message Requests.
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
    avatar: "H",
    color: "linear-gradient(135deg, #5b8def, #2a6df5)",
    name: "Hridoy",
    handle: "@Web3Hridoy",
    time: "Apr 20",
    snippet: "Can I be mutual with you",
    bot: false,
    mutuals: "Followed by adah, Maisha, and 16 others you follow",
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

function renderRows() {
  const list = document.getElementById("demoList");
  if (!list) return;
  list.innerHTML = "";
  for (const row of DEMO_ROWS) {
    const el = document.createElement("div");
    el.className = "dm-row";
    el.dataset.bot = row.bot ? "1" : "0";

    const meta = `
      <span class="dm-name">${escapeHtml(row.name)}</span>
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

function init() {
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
