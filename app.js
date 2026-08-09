let words = [];
const UI_STATE_STORAGE_KEY = 'al-kamus-ui-state';
const UI_STATE_VERSION = 2;
const selectedTopics = new Set();
const selectedPartsOfSpeech = new Set();
const SORT_OPTIONS = {
  transcription: { label: 'תעתיק', locale: 'he', field: 'transcription' },
  meaning: { label: 'עברית', locale: 'he', field: 'meaning' },
  arabic: { label: 'ערבית', locale: 'ar', field: 'arabic' }
};
let sortMode = 'transcription';
let expandedWordId = null;
const $ = selector => document.querySelector(selector);

function topicsFor(word) {
  const topics = word.topics ?? word.topic ?? word.categories ?? word.category ?? [];
  return (Array.isArray(topics) ? topics : [topics]).filter(Boolean);
}

const PART_OF_SPEECH_LABELS = {
  verb: 'פועל',
  noun: 'שם עצם',
  question_word: 'מילת שאלה',
  preposition: 'מילת יחס',
  conjunction: 'מילת קישור',
  adverb: 'תואר הפועל',
  affirmation_word: 'מילת אישור',
  possessive_word: 'מילת שייכות',
  relative_pronoun: 'כינוי זיקה',
  quantifier: 'מילת כמות'
};
const SUPPORTED_PARTS_OF_SPEECH = new Set(Object.keys(PART_OF_SPEECH_LABELS));

function partsOfSpeechFor(word) {
  const parts = word.partsOfSpeech ?? word.partOfSpeech ?? [];
  return (Array.isArray(parts) ? parts : [parts]).filter(part => SUPPORTED_PARTS_OF_SPEECH.has(part));
}

function loadUiState() {
  try {
    const savedState = JSON.parse(localStorage.getItem(UI_STATE_STORAGE_KEY));
    if (!savedState || savedState.version !== UI_STATE_VERSION) return;

    if (Array.isArray(savedState.selectedTopics)) {
      savedState.selectedTopics
        .filter(topic => typeof topic === 'string')
        .forEach(topic => selectedTopics.add(topic));
    }
    if (Array.isArray(savedState.selectedPartsOfSpeech)) {
      savedState.selectedPartsOfSpeech
        .filter(part => typeof part === 'string')
        .forEach(part => selectedPartsOfSpeech.add(part));
    }
    if (typeof savedState.sortMode === 'string' && SORT_OPTIONS[savedState.sortMode]) {
      sortMode = savedState.sortMode;
    }
  } catch {
    // Keep the app usable if storage is unavailable or contains invalid data.
  }
}

function saveUiState() {
  try {
    localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify({
      version: UI_STATE_VERSION,
      selectedTopics: [...selectedTopics],
      selectedPartsOfSpeech: [...selectedPartsOfSpeech],
      sortMode
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

function renderTopics() {
  const topics = [...new Set(words.flatMap(topicsFor))];
  $('#topicChips').innerHTML = topics.map(topic => {
    const active = selectedTopics.has(topic);
    return `<button class="chip ${active ? 'active' : ''}" type="button" data-topic="${escapeHtml(topic)}" aria-pressed="${active}">${escapeHtml(topic)}</button>`;
  }).join('');

  // Topic chips are rebuilt on every render. Limit this handler to the topic
  // container so it does not overwrite the part-of-speech handlers.
  document.querySelectorAll('#topicChips .chip').forEach(button => {
    button.onclick = () => {
      const topic = button.dataset.topic;
      selectedTopics.has(topic) ? selectedTopics.delete(topic) : selectedTopics.add(topic);
      saveUiState();
      render();
    };
  });

  const count = selectedTopics.size + selectedPartsOfSpeech.size;
  $('#filterCount').textContent = count;
  $('#filterCount').hidden = count === 0;
  $('#filterToggle').classList.toggle('has-filter', count > 0);
}

function renderPartsOfSpeech() {
  const availableParts = Object.keys(PART_OF_SPEECH_LABELS)
    .filter(part => words.some(word => partsOfSpeechFor(word).includes(part)));
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

function renderSortOptions() {
  $('#sortChips').innerHTML = Object.entries(SORT_OPTIONS).map(([mode, option]) => {
    const active = sortMode === mode;
    return `<button class="chip ${active ? 'active' : ''}" type="button" data-sort-mode="${mode}" aria-pressed="${active}">${option.label}</button>`;
  }).join('');

  document.querySelectorAll('#sortChips [data-sort-mode]').forEach(button => {
    button.onclick = () => {
      sortMode = button.dataset.sortMode;
      saveUiState();
      render();
    };
  });
}

function sortWords(items) {
  const option = SORT_OPTIONS[sortMode];
  const collator = new Intl.Collator(option.locale, { sensitivity: 'base', numeric: true });
  return [...items].sort((a, b) =>
    collator.compare(a[option.field] ?? '', b[option.field] ?? '') ||
    String(a.id).localeCompare(String(b.id))
  );
}

function wordReference(word) {
  return `[AL-KAMUS word_id=${word.id}] ${word.transcription} | ${word.meaning} | ${word.arabic}`;
}

const CONJUGATION_PERSONS = [
  ['i', 'אני'], ['you_m', 'אתה'], ['you_f', 'את'], ['he', 'הוא'],
  ['she', 'היא'], ['we', 'אנחנו'], ['you_pl', 'אתם'], ['they', 'הם']
];
const CONJUGATION_TENSES = [
  ['past', 'עבר'], ['present', 'הווה'], ['future', 'עתיד'], ['imperative', 'ציווי']
];

function renderDictionaryForm(word) {
  if (!word.dictionaryForm) return '';
  const { transcription = '', arabic = '' } = word.dictionaryForm;
  return `<section class="detail-section dictionary-form">
    <div class="details-label">צורת מילון (הוא בעבר)</div>
    <div><strong>${escapeHtml(transcription)}</strong>${arabic ? ` <span class="dictionary-form-arabic" lang="ar">${escapeHtml(arabic)}</span>` : ''}</div>
  </section>`;
}

const PARTICIPLE_FORMS = [
  ['masculine', 'זכר'], ['feminine', 'נקבה'], ['plural', 'רבים']
];

function renderParticiples(word) {
  if (!word.participles) return '';
  const forms = PARTICIPLE_FORMS.map(([key, label]) => {
    const { transcription = '', arabic = '' } = word.participles[key] ?? {};
    if (!transcription && !arabic) return '';
    return `<div class="participle-form">
      <span class="participle-label">${label}</span>
      <strong>${escapeHtml(transcription)}</strong>
      ${arabic ? `<span class="dictionary-form-arabic" lang="ar">${escapeHtml(arabic)}</span>` : ''}
    </div>`;
  }).join('');
  if (!forms) return '';
  return `<section class="detail-section participle-section">
    <div class="details-label">צורות בינוני</div>
    <div class="participle-forms">${forms}</div>
  </section>`;
}

function renderConjugations(word) {
  if (!word.conjugations) return '';
  const header = CONJUGATION_TENSES.map(([, label]) => `<th scope="col">${label}</th>`).join('');
  const rows = CONJUGATION_PERSONS.map(([person, label]) => {
    const cells = CONJUGATION_TENSES.map(([tense]) =>
      `<td>${escapeHtml(word.conjugations[tense]?.[person] ?? '')}</td>`
    ).join('');
    return `<tr><th scope="row">${label}</th>${cells}</tr>`;
  }).join('');
  return `<section class="detail-section conjugation-section">
    <div class="details-label">הטיות</div>
    <div class="conjugation-scroll"><table class="conjugation-table"><thead><tr><th scope="col">גוף</th>${header}</tr></thead><tbody>${rows}</tbody></table></div>
  </section>`;
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
  const shown = sortWords(words.filter(word =>
    (selectedTopics.size === 0 || topicsFor(word).some(topic => selectedTopics.has(topic))) &&
    (selectedPartsOfSpeech.size === 0 || partsOfSpeechFor(word).some(part => selectedPartsOfSpeech.has(part))) &&
    (!q || Object.values(word).join(' ').toLowerCase().includes(q))
  ));

  if (!shown.some(word => word.id === expandedWordId && (word.example || word.dictionaryForm || word.participles || word.conjugations))) expandedWordId = null;

  $('#status').textContent = `${shown.length} מילים`;
  $('#grid').innerHTML = shown.map(word => {
    const hasDetails = Boolean(word.example || word.dictionaryForm || word.participles || word.conjugations);
    const expanded = hasDetails && expandedWordId === word.id;
    const partLabels = partsOfSpeechFor(word).map(part => PART_OF_SPEECH_LABELS[part]);
    const topicLabels = topicsFor(word);
    return `<article class="card ${expanded ? 'expanded' : ''}" data-word-id="${escapeHtml(word.id)}">
    <div class="word-row ${hasDetails ? 'has-details' : ''}" ${hasDetails ? `role="button" tabindex="0" aria-expanded="${expanded}"` : ''}>
      <div class="trans">${escapeHtml(word.transcription)}</div>
      <div class="meaning">${escapeHtml(word.meaning)}</div>
      <div class="arabic" lang="ar">${escapeHtml(word.arabic)}</div>
      <div class="word-signals">${hasDetails ? `<span class="details-indicator" title="פתיחת דוגמה" aria-hidden="true">⌄</span>` : ''}</div>
    </div>
    <div class="word-meta">${partLabels.map(label => `<span class="part-label">${escapeHtml(label)}</span>`).join('')}${topicLabels.map(label => `<span class="topic-label">${escapeHtml(label)}</span>`).join('')}</div>
    <button class="copy-word" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="העתקת הפניה למילה" title="העתקת הפניה">⧉</button>
    ${expanded ? `<div class="word-details">
      ${word.example ? `<section class="detail-section"><div class="details-label">דוגמה</div><div class="example">${escapeHtml(word.example)}</div></section>` : ''}
      ${renderDictionaryForm(word)}
      ${renderParticiples(word)}
      ${renderConjugations(word)}
    </div>` : ''}
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

  renderTopics();
  renderPartsOfSpeech();
  renderSortOptions();
}

$('#filterToggle').onclick = () => {
  const panel = $('#filterPanel');
  const opening = panel.hidden;
  panel.hidden = !opening;
  $('#filterToggle').setAttribute('aria-expanded', String(opening));
  $('#filterToggle').setAttribute('aria-label', opening ? 'סגירת סינון ומיון' : 'פתיחת סינון ומיון');
};

$('#clearFilters').onclick = () => {
  selectedTopics.clear();
  selectedPartsOfSpeech.clear();
  saveUiState();
  render();
};

$('#search').oninput = render;

fetch('words.json?v=16')
  .then(response => { if (!response.ok) throw new Error('Could not load words'); return response.json(); })
  .then(data => {
    words = data;
    const availableTopics = new Set(words.flatMap(topicsFor));
    const availableParts = new Set(words.flatMap(partsOfSpeechFor));
    let stateChanged = false;
    selectedTopics.forEach(topic => {
      if (!availableTopics.has(topic)) {
        selectedTopics.delete(topic);
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
