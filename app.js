let words = [];
const UI_STATE_STORAGE_KEY = 'al-kamus-ui-state';
const UI_STATE_VERSION = 1;
const selectedCategories = new Set();
const selectedPartsOfSpeech = new Set();
let expandedWordId = null;
const $ = selector => document.querySelector(selector);

function categoriesFor(word) {
  const categories = word.categories ?? word.category ?? [];
  return (Array.isArray(categories) ? categories : [categories]).filter(Boolean);
}

const PART_OF_SPEECH_LABELS = { verb: 'פועל', noun: 'שם עצם' };
const PART_OF_SPEECH_BADGES = { verb: 'פ׳', noun: 'ש׳' };
const SUPPORTED_PARTS_OF_SPEECH = new Set(Object.keys(PART_OF_SPEECH_LABELS));

function partsOfSpeechFor(word) {
  const parts = word.partsOfSpeech ?? word.partOfSpeech ?? [];
  return (Array.isArray(parts) ? parts : [parts]).filter(part => SUPPORTED_PARTS_OF_SPEECH.has(part));
}

function loadUiState() {
  try {
    const savedState = JSON.parse(localStorage.getItem(UI_STATE_STORAGE_KEY));
    if (!savedState || savedState.version !== UI_STATE_VERSION) return;

    if (Array.isArray(savedState.selectedCategories)) {
      savedState.selectedCategories
        .filter(category => typeof category === 'string')
        .forEach(category => selectedCategories.add(category));
    }
    if (Array.isArray(savedState.selectedPartsOfSpeech)) {
      savedState.selectedPartsOfSpeech
        .filter(part => typeof part === 'string')
        .forEach(part => selectedPartsOfSpeech.add(part));
    }
  } catch {
    // Keep the app usable if storage is unavailable or contains invalid data.
  }
}

function saveUiState() {
  try {
    localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify({
      version: UI_STATE_VERSION,
      selectedCategories: [...selectedCategories],
      selectedPartsOfSpeech: [...selectedPartsOfSpeech]
    }));
  } catch {
    // Keep the app usable if storage is unavailable.
  }
}

loadUiState();

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function renderCategories() {
  const categories = [...new Set(words.flatMap(categoriesFor))];
  $('#chips').innerHTML = categories.map(category => {
    const active = selectedCategories.has(category);
    return `<button class="chip ${active ? 'active' : ''}" type="button" data-category="${escapeHtml(category)}" aria-pressed="${active}">${escapeHtml(category)}</button>`;
  }).join('');

  // Category chips are rebuilt on every render. Limit this handler to the
  // category container so it does not overwrite the part-of-speech handlers.
  document.querySelectorAll('#chips .chip').forEach(button => {
    button.onclick = () => {
      const category = button.dataset.category;
      selectedCategories.has(category) ? selectedCategories.delete(category) : selectedCategories.add(category);
      saveUiState();
      render();
    };
  });

  const count = selectedCategories.size + selectedPartsOfSpeech.size;
  $('#filterCount').textContent = count;
  $('#filterCount').hidden = count === 0;
  $('#filterToggle').classList.toggle('has-filter', count > 0);
}

function renderPartsOfSpeech() {
  const availableParts = ['verb', 'noun'];
  $('#partChips').innerHTML = availableParts.map(part => {
      const active = selectedPartsOfSpeech.has(part);
      return `<button class="chip ${active ? 'active' : ''}" type="button" data-part-of-speech="${escapeHtml(part)}" aria-pressed="${active}">${escapeHtml(PART_OF_SPEECH_LABELS[part] ?? part)}</button>`;
    }).join('');

  document.querySelectorAll('#partChips [data-part-of-speech]').forEach(button => {
    const part = button.dataset.partOfSpeech;
    button.onclick = () => {
      selectedPartsOfSpeech.has(part) ? selectedPartsOfSpeech.delete(part) : selectedPartsOfSpeech.add(part);
      saveUiState();
      render();
    };
  });
}

function wordReference(word) {
  return `[AL-KAMUS word_id=${word.id}] ${word.transcription} | ${word.meaning} | ${word.arabic}`;
}

async function copyWord(button, word) {
  const text = wordReference(word);
  let copied = false;

  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.fontSize = '16px';
    textarea.style.opacity = '0.01';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    copied = document.execCommand('copy');
    textarea.remove();
  }

  const original = button.textContent;
  button.textContent = copied ? '✓' : '!';
  button.classList.toggle('copied', copied);
  button.setAttribute('aria-label', copied ? 'הועתק' : 'ההעתקה נכשלה');
  button.title = copied ? 'הועתק' : 'ההעתקה נכשלה';
  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
    button.setAttribute('aria-label', 'העתקת הפניה למילה');
    button.title = 'העתקת הפניה';
  }, 1200);
}

function render() {
  const q = $('#search').value.trim().toLowerCase();
  const shown = words.filter(word =>
    (selectedCategories.size === 0 || categoriesFor(word).some(category => selectedCategories.has(category))) &&
    (selectedPartsOfSpeech.size === 0 || partsOfSpeechFor(word).some(part => selectedPartsOfSpeech.has(part))) &&
    (!q || Object.values(word).join(' ').toLowerCase().includes(q))
  );

  if (!shown.some(word => word.id === expandedWordId && word.example)) expandedWordId = null;

  $('#status').textContent = `${shown.length} מילים`;
  $('#grid').innerHTML = shown.map(word => {
    const hasDetails = Boolean(word.example);
    const expanded = hasDetails && expandedWordId === word.id;
    const partLabels = partsOfSpeechFor(word).map(part => PART_OF_SPEECH_BADGES[part]);
    return `<article class="card ${expanded ? 'expanded' : ''}" data-word-id="${escapeHtml(word.id)}">
    <div class="word-row ${hasDetails ? 'has-details' : ''}" ${hasDetails ? `role="button" tabindex="0" aria-expanded="${expanded}"` : ''}>
      <div class="trans">${escapeHtml(word.transcription)}</div>
      <div class="meaning">${escapeHtml(word.meaning)}</div>
      <div class="arabic" lang="ar">${escapeHtml(word.arabic)}</div>
      <div class="word-signals">${partLabels.map(label => `<span class="part-label">${escapeHtml(label)}</span>`).join('')}${hasDetails ? `<span class="details-indicator" title="פתיחת דוגמה" aria-hidden="true">⌄</span>` : ''}</div>
    </div>
    <button class="copy-word" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="העתקת הפניה למילה" title="העתקת הפניה">⧉</button>
    ${expanded ? `<div class="word-details"><div class="details-label">דוגמה</div><div class="example">${escapeHtml(word.example)}</div></div>` : ''}
  </article>`;
  }).join('') || '<p class="empty">לא נמצאו מילים.</p>';

  document.querySelectorAll('.word-row.has-details').forEach(row => {
    const toggle = () => {
      const id = row.closest('.card').dataset.wordId;
      expandedWordId = expandedWordId === id ? null : id;
      render();
    };
    row.onclick = toggle;
    row.onkeydown = event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    };
  });

  document.querySelectorAll('.copy-word').forEach(button => {
    button.onclick = () => {
      const word = words.find(item => item.id === button.dataset.wordId);
      if (word) copyWord(button, word);
    };
  });

  renderCategories();
  renderPartsOfSpeech();
}

$('#filterToggle').onclick = () => {
  const panel = $('#categoryPanel');
  const opening = panel.hidden;
  panel.hidden = !opening;
  $('#filterToggle').setAttribute('aria-expanded', String(opening));
  $('#filterToggle').setAttribute('aria-label', opening ? 'סגירת קטגוריות' : 'פתיחת קטגוריות');
};

$('#clearCategories').onclick = () => {
  selectedCategories.clear();
  selectedPartsOfSpeech.clear();
  saveUiState();
  render();
};

$('#search').oninput = render;

fetch('words.json?v=12')
  .then(response => { if (!response.ok) throw new Error('Could not load words'); return response.json(); })
  .then(data => {
    words = data;
    const availableCategories = new Set(words.flatMap(categoriesFor));
    const availableParts = new Set(words.flatMap(partsOfSpeechFor));
    let stateChanged = false;
    selectedCategories.forEach(category => {
      if (!availableCategories.has(category)) {
        selectedCategories.delete(category);
        stateChanged = true;
      }
    });
    selectedPartsOfSpeech.forEach(part => {
      if (!availableParts.has(part)) {
        selectedPartsOfSpeech.delete(part);
        stateChanged = true;
      }
    });
    if (stateChanged) saveUiState();
    render();
  })
  .catch(() => { $('#status').textContent = 'לא הצלחתי לטעון את המילים.'; });
