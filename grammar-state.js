const UI_STATE_STORAGE_KEY = 'al-kamus-ui-state';
const UI_STATE_VERSION = 4;
let grammarScrollSaveTimer = null;

function readUiState() {
  try {
    const state = JSON.parse(localStorage.getItem(UI_STATE_STORAGE_KEY));
    return state && typeof state === 'object' ? state : {};
  } catch {
    return {};
  }
}

function saveGrammarScroll() {
  try {
    const state = readUiState();
    const scrollPositions = state.scrollPositions && typeof state.scrollPositions === 'object'
      ? state.scrollPositions
      : {};
    localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify({
      ...state,
      version: UI_STATE_VERSION,
      scrollPositions: { ...scrollPositions, grammar: window.scrollY }
    }));
  } catch {
    // Keep the page usable if storage is unavailable.
  }
}

const initialState = readUiState();
const grammarScroll = initialState.scrollPositions?.grammar;
window.requestAnimationFrame(() => {
  if (Number.isFinite(grammarScroll) && grammarScroll >= 0) window.scrollTo(0, grammarScroll);
});

window.addEventListener('scroll', () => {
  window.clearTimeout(grammarScrollSaveTimer);
  grammarScrollSaveTimer = window.setTimeout(saveGrammarScroll, 120);
}, { passive: true });

window.addEventListener('pagehide', saveGrammarScroll);
