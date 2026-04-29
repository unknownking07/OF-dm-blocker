window.__ofblock = window.__ofblock || {};
window.__ofblock.detector = (function () {
  const C = window.__ofblock.constants;

  function scoreDisplayNameEmoji(displayName) {
    if (!displayName) return 0;
    const matches = displayName.match(C.ANY_EMOJI_REGEX);
    if (!matches || matches.length === 0) return 0;
    let score = Math.min(matches.length * C.WEIGHTS.EMOJI_PER, C.WEIGHTS.EMOJI_CAP);
    if (C.LEWD_EMOJI_REGEX.test(displayName)) score += C.WEIGHTS.LEWD_EMOJI_BONUS;
    return Math.min(score, C.WEIGHTS.EMOJI_CAP + C.WEIGHTS.LEWD_EMOJI_BONUS);
  }

  function scoreHandleDigits(handle) {
    if (!handle) return 0;
    const clean = handle.replace(/^@/, "");
    return C.HANDLE_DIGIT_SUFFIX.test(clean) ? C.WEIGHTS.HANDLE_DIGITS : 0;
  }

  function firstNameToken(displayName) {
    if (!displayName) return "";
    const stripped = displayName.replace(C.ANY_EMOJI_REGEX, " ").trim();
    const tokens = stripped.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return "";
    return tokens[0].toLowerCase().replace(/[^a-z]/g, "");
  }

  function scoreNameHandleMismatch(displayName, handle) {
    if (!displayName || !handle) return 0;
    const name = firstNameToken(displayName);
    if (name.length < 3) return 0;
    const cleanHandle = handle.toLowerCase().replace(/^@/, "").replace(/[^a-z]/g, "");
    if (cleanHandle.length === 0) return 0;
    return cleanHandle.includes(name) ? 0 : C.WEIGHTS.NAME_HANDLE_MISMATCH;
  }

  function scoreKeywords(snippet, keywords) {
    if (!snippet) return 0;
    const lower = snippet.toLowerCase();
    let hits = 0;
    const list = keywords && keywords.length ? keywords : C.KEYWORDS;
    for (const kw of list) {
      if (!kw) continue;
      if (lower.indexOf(kw.toLowerCase()) !== -1) hits++;
    }
    return Math.min(hits * C.WEIGHTS.KEYWORD_PER, C.WEIGHTS.KEYWORD_CAP);
  }

  function scorePlaceholderLeak(snippet) {
    if (!snippet) return 0;
    return C.PLACEHOLDER_LEAK.test(snippet) ? C.WEIGHTS.PLACEHOLDER_LEAK : 0;
  }

  function scoreProfile(profileSignals) {
    if (!profileSignals) return 0;
    let s = 0;
    if (profileSignals.ofUrl) s += C.WEIGHTS.OF_URL;
    if (profileSignals.bioMatch) s += C.WEIGHTS.BIO_KEYWORD;
    return s;
  }

  function scoreThread(input) {
    const {
      displayName,
      handle,
      snippet,
      hasMutuals,
      allowlist,
      blocklist,
      keywords,
      profileSignals,
    } = input;

    const handleLc = (handle || "").toLowerCase().replace(/^@/, "");

    if (allowlist && allowlist.indexOf(handleLc) !== -1) {
      return { total: 0, signals: { allowlisted: true } };
    }
    if (blocklist && blocklist.indexOf(handleLc) !== -1) {
      return { total: 99, signals: { blocklisted: true } };
    }
    if (hasMutuals) {
      return { total: 0, signals: { mutuals: true } };
    }

    const signals = {};
    let total = 0;

    const e = scoreDisplayNameEmoji(displayName);
    if (e > 0) {
      signals.emoji = e;
      total += e;
    }

    const d = scoreHandleDigits(handle);
    if (d > 0) {
      signals.handleDigits = d;
      total += d;
    }

    const m = scoreNameHandleMismatch(displayName, handle);
    if (m > 0) {
      signals.nameHandleMismatch = m;
      total += m;
    }

    const k = scoreKeywords(snippet, keywords);
    if (k > 0) {
      signals.keywords = k;
      total += k;
    }

    const p = scorePlaceholderLeak(snippet);
    if (p > 0) {
      signals.placeholderLeak = p;
      total += p;
    }

    const pr = scoreProfile(profileSignals);
    if (pr > 0) {
      if (profileSignals.ofUrl) signals.ofUrl = true;
      if (profileSignals.bioMatch) signals.bioMatch = true;
      total += pr;
    }

    return { total, signals };
  }

  return {
    scoreDisplayNameEmoji,
    scoreHandleDigits,
    scoreNameHandleMismatch,
    scoreKeywords,
    scorePlaceholderLeak,
    scoreProfile,
    scoreThread,
    firstNameToken,
  };
})();
