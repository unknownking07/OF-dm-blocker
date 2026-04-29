# OF Block

Hide OnlyFans / cam-promo bot DMs in your X (Twitter) Message Requests folder. All processing stays on your device.

## What it does

Most spam in X Message Requests follows a clean fingerprint: female-presenting display names with decorative emoji, handles ending in long numeric suffixes, recycled accounts whose display name doesn't match the @handle, and templated openers like "are you alone right now?" or "wanna go on a date?" — sometimes even leaking a literal `[Name]` placeholder.

OF Block scores each row in your requests inbox against those signals. If the score crosses a threshold, the thread is blurred and collapsed in place, with a "Show" button to reveal it. Mutuals (anyone "Followed by … you follow") are never filtered.

For borderline rows, the extension uses your own X session (no third-party server) to peek at the sender's bio and link, looking for `onlyfans.com`, `fansly.com`, `linktr.ee`, etc. Results are cached locally for 7 days.

## Install (unpacked)

1. Download or clone this folder.
2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** on (top right).
4. Click **Load unpacked** and select the `OF block` folder.
5. Pin the extension. Open `https://x.com/messages/requests`.

After any code change: click the reload icon on the extension's card in `chrome://extensions`, then refresh the X tab.

## Configure

Click the toolbar icon for:
- Master on/off toggle
- Today / total hidden count
- Sensitivity slider (1 = strict, 10 = lenient — default 3)
- Re-check current tab

Open **Settings…** for:
- Allowlist / blocklist (one handle per line, no `@`)
- Editable keyword list (one phrase per line)
- Reveal mode (re-blur on reload, or stay revealed)
- Reset profile cache / reset stats

## Privacy

- All scoring happens locally in the extension.
- The only network calls go to `x.com` GraphQL — the same calls the X web client makes — using your own session cookies. No third-party servers are contacted.
- `chrome.storage.sync` syncs your settings across signed-in Chrome profiles only. Profile cache and stats stay on the device.
- The extension does not log, transmit, or sell any data.

## How filtering scores work

| Signal | Weight |
|---|---|
| Numeric handle suffix (4+ trailing digits) | +2 |
| Display name ↔ handle mismatch | +2 |
| Templated opener keyword in snippet | +2 per match (cap +3) |
| Decorative emoji in display name | +1 per emoji (cap +2, lewd emoji +1) |
| Literal `[name]` / `{name}` placeholder leak | **+5 (instant flag)** |
| Bio matches keywords (fetched) | +2 |
| Bio URL points to OF / fansly / linktr.ee / beacons / fanvue | +3 |
| "Followed by … you follow" mutuals line | **score → 0 (always shown)** |
| Handle in allowlist | score → 0 |
| Handle in blocklist | score → 99 |

A row is filtered when score ≥ threshold (default 3).

## Maintenance

X periodically rotates its GraphQL schema. The extension captures the current `UserByScreenName` query metadata from the user's own traffic at runtime, so most schema changes recover automatically. If profile-bio inspection stops working entirely:

1. Open `chrome://extensions` → click "Service worker" under OF Block to inspect.
2. Visit any user profile on x.com to trigger a fresh GraphQL request.
3. Check `chrome.storage.local` (DevTools → Application → Storage → Local Storage) for an updated `gqlMeta` entry.

If the popup shows a "couldn't detect any DM rows" banner, the row selector (`[data-testid="conversation"]`) likely changed. The fix lives in `content/constants.js` under `SELECTORS.row`.

## File map

- `manifest.json` — MV3 manifest
- `background.js` — service worker: header capture, GraphQL fetch, profile cache
- `content/constants.js` — selectors, regex, keyword list, scoring weights
- `content/detector.js` — pure scoring functions
- `content/dom-observer.js` — MutationObserver wiring
- `content/renderer.js` — blur/collapse + reveal pill
- `content/main.js` — entry point, route gate, decision flow
- `content/style.css` — overlay styling
- `lib/storage.js` — `chrome.storage.*` wrapper (settings, stats)
- `lib/messaging.js` — `chrome.runtime.sendMessage` helpers
- `popup/` — toolbar popup (toggle, stats, threshold)
- `options/` — full settings page

## Out of scope (v0.1)

Main inbox (no `/requests`), open conversation pane, mentions/replies, image/avatar analysis, ML bio classification.
