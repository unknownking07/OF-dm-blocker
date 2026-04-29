window.__ofblock = window.__ofblock || {};
window.__ofblock.constants = (function () {
  const SELECTORS = {
    row: '[data-testid="conversation"]',
    rowLink: 'a[href^="/messages/"]',
    avatar: 'img[src*="profile_images"]',
  };

  const HANDLE_DIGIT_SUFFIX = /\d{4,}$/;
  const PLACEHOLDER_LEAK = /\[name\]|\{name\}/i;
  const MUTUALS_REGEX = /Followed by [^.]+ you follow/i;
  const OF_DOMAIN_REGEX = /(onlyfans|fansly|linktr\.ee|beacons\.ai|allmylinks|fanvue)\.com/i;
  const ANY_EMOJI_REGEX = /\p{Extended_Pictographic}/gu;
  const LEWD_EMOJI_REGEX = /[\u{1F525}\u{1F48B}\u{1F351}\u{1F4A6}\u{1F618}\u{1F445}\u{1F495}\u{1F975}\u{1F352}\u{1F337}\u{1F496}\u{1F498}\u{1F353}\u{1F60D}]/u;
  const DATE_TOKEN_REGEX = /^[A-Z][a-z]{2}\s\d{1,2}$/;

  const KEYWORDS = [
    "are you alone",
    "are you free",
    "wanna go on a date",
    "want more personal photo",
    "video chat",
    "dm me on my",
    "lowkey wanna",
    "do you check ur dms",
    "i'm lying in bed",
    "let loose",
    "i'm ready when you are",
    "you look interesting",
    "ever wonder what i'm thinking",
    "i almost didn't message",
    "barely managed to find you",
    "link in bio",
    "check my profile",
    "check my bio",
    "spicy content",
    "free trial",
    "18+",
    "onlyfans",
    "fansly",
    "linktree",
    "subscribe to my",
    "verify your age",
  ];

  const WEIGHTS = {
    EMOJI_PER: 1,
    EMOJI_CAP: 2,
    LEWD_EMOJI_BONUS: 1,
    HANDLE_DIGITS: 2,
    NAME_HANDLE_MISMATCH: 2,
    KEYWORD_PER: 2,
    KEYWORD_CAP: 3,
    PLACEHOLDER_LEAK: 5,
    BIO_KEYWORD: 2,
    OF_URL: 3,
  };

  const THRESHOLD = 3;
  const MAX_SNIPPET_LEN = 280;

  return {
    SELECTORS,
    HANDLE_DIGIT_SUFFIX,
    PLACEHOLDER_LEAK,
    MUTUALS_REGEX,
    OF_DOMAIN_REGEX,
    ANY_EMOJI_REGEX,
    LEWD_EMOJI_REGEX,
    DATE_TOKEN_REGEX,
    KEYWORDS,
    WEIGHTS,
    THRESHOLD,
    MAX_SNIPPET_LEN,
  };
})();
