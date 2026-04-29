window.__ofblock = window.__ofblock || {};
window.__ofblock.observer = (function () {
  const C = window.__ofblock.constants;

  let observer = null;
  let scrollContainer = null;
  let onChangeCallback = null;
  let debounceTimer = null;
  let retryHandle = null;

  function findScrollContainer() {
    const row = document.querySelector(C.SELECTORS.row);
    if (!row) return null;
    let el = row.parentElement;
    while (el && el !== document.body) {
      const overflow = getComputedStyle(el).overflowY;
      if (overflow === "auto" || overflow === "scroll") return el;
      el = el.parentElement;
    }
    return null;
  }

  function fireDebounced() {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (onChangeCallback) onChangeCallback();
    }, 50);
  }

  function attach(callback) {
    onChangeCallback = callback;

    const tryAttach = () => {
      const container = findScrollContainer();
      const target = container || document.body;
      if (observer && scrollContainer === target) return;
      if (observer) observer.disconnect();
      scrollContainer = target;
      observer = new MutationObserver(fireDebounced);
      observer.observe(target, { childList: true, subtree: true });
      fireDebounced();
    };

    tryAttach();

    let retries = 0;
    retryHandle = setInterval(() => {
      if (scrollContainer && scrollContainer !== document.body) {
        clearInterval(retryHandle);
        retryHandle = null;
        return;
      }
      retries++;
      if (retries > 30) {
        clearInterval(retryHandle);
        retryHandle = null;
        return;
      }
      tryAttach();
    }, 500);
  }

  function detach() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (retryHandle) {
      clearInterval(retryHandle);
      retryHandle = null;
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    scrollContainer = null;
    onChangeCallback = null;
  }

  return { attach, detach, fireDebounced };
})();
