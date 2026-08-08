let words = [];
const selectedCategories = new Set();
const $ = selector => document.querySelector(selector);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function renderCategories() {
  const categories = [...new Set(words.map(word => word.category).filter(Boolean))];
  $('#chips').innerHTML = categories.map(category => {
    const active = selectedCategories.has(category);
    return `<button class="chip ${active ? 'active' : ''}" type="button" data-category="${escapeHtml(category)}" aria-pressed="${active}">${escapeHtml(category)}</button>`;
  }).join('');

  document.querySelectorAll('.chip').forEach(button => {
    button.onclick = () => {
      const category = button.dataset.category;
      selectedCategories.has(category) ? selectedCategories.delete(category) : selectedCategories.add(category);
      render();
    };
  });

  const count = selectedCategories.size;
  $('#filterCount').textContent = count;
  $('#filterCount').hidden = count === 0;
  $('#filterToggle').classList.toggle('has-filter', count > 0);
}

function wordReference(word) {
  return `[AL-KAMUS word_id=${word.id}] ${word.transcription} | ${word.meaning} | ${word.arabic}`;
}

async function copyWord(button, word) {
  const text = wordReference(word);
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }

  const original = button.textContent;
  button.textContent = '✓';
  button.classList.add('copied');
  button.setAttribute('aria-label', 'הועתק');
  window.setTimeout(() => {
    button.textContent = original;
    button.classList.remove('copied');
    button.setAttribute('aria-label', 'העתקת הפניה למילה');
  }, 1200);
}

function render() {
  const q = $('#search').value.trim().toLowerCase();
  const shown = words.filter(word =>
    (selectedCategories.size === 0 || selectedCategories.has(word.category)) &&
    (!q || Object.values(word).join(' ').toLowerCase().includes(q))
  );

  $('#status').textContent = `${shown.length} מילים`;
  $('#grid').innerHTML = shown.map(word => `<article class="card">
    <div class="trans">${escapeHtml(word.transcription)}</div>
    <div class="meaning">${escapeHtml(word.meaning)}</div>
    <div class="arabic" lang="ar">${escapeHtml(word.arabic)}</div>
    <button class="copy-word" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="העתקת הפניה למילה" title="העתקת הפניה">⧉</button>
    ${word.example ? `<div class="example">${escapeHtml(word.example)}</div>` : ''}
  </article>`).join('') || '<p class="empty">לא נמצאו מילים.</p>';

  document.querySelectorAll('.copy-word').forEach(button => {
    button.onclick = () => {
      const word = words.find(item => item.id === button.dataset.wordId);
      if (word) copyWord(button, word);
    };
  });

  renderCategories();
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
  render();
};

$('#search').oninput = render;

fetch('words.json')
  .then(response => { if (!response.ok) throw new Error('Could not load words'); return response.json(); })
  .then(data => { words = data; render(); })
  .catch(() => { $('#status').textContent = 'לא הצלחתי לטעון את המילים.'; });
