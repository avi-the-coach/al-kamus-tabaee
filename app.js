const STORAGE_KEY = 'avi-arabic-words';
let words = [];
let active = 'הכול';
const $ = selector => document.querySelector(selector);

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

function render() {
  const q = $('#search').value.trim().toLowerCase();
  const categories = ['הכול', ...new Set(words.map(word => word.category))];
  $('#category').innerHTML = categories.slice(1).map(category => `<option>${category}</option>`).join('');
  $('#chips').innerHTML = categories.map(category => `<button class="chip ${category === active ? 'active' : ''}" data-category="${category}">${category}</button>`).join('');
  document.querySelectorAll('.chip').forEach(button => button.onclick = () => { active = button.dataset.category; render(); });
  const shown = words.map((word, index) => [word, index]).filter(([word]) =>
    (active === 'הכול' || word.category === active) &&
    (!q || Object.values(word).join(' ').toLowerCase().includes(q))
  );
  $('#status').textContent = `${shown.length} מילים`;
  $('#grid').innerHTML = shown.map(([word, index]) => `<article class="card">
    <div class="cat">${word.category}</div>
    <div class="arabic" lang="ar">${word.arabic}</div>
    <div class="trans">${word.transcription}</div>
    <div class="meaning">${word.meaning}</div>
    ${word.example ? `<div class="example">${word.example}</div>` : ''}
    <div class="actions"><button class="edit" onclick="openEdit(${index})">עריכה</button></div>
  </article>`).join('') || '<p>לא נמצאו מילים.</p>';
}

function openEdit(index) {
  const word = words[index];
  $('#idx').value = index;
  $('#formTitle').textContent = 'עריכת מילה';
  $('#category').value = word.category;
  $('#arabic').value = word.arabic;
  $('#trans').value = word.transcription;
  $('#meaning').value = word.meaning;
  $('#example').value = word.example || '';
  $('#dialog').showModal();
}

$('#add').onclick = () => {
  $('#form').reset();
  $('#idx').value = '';
  $('#formTitle').textContent = 'הוספת מילה';
  $('#dialog').showModal();
};

$('#save').onclick = event => {
  event.preventDefault();
  const word = {category: $('#category').value, arabic: $('#arabic').value, transcription: $('#trans').value, meaning: $('#meaning').value, example: $('#example').value};
  if (!word.arabic || !word.transcription || !word.meaning) return;
  const index = $('#idx').value;
  index === '' ? words.push(word) : words[Number(index)] = word;
  persist();
  $('#dialog').close();
  render();
};

$('#search').oninput = render;

fetch('words.json')
  .then(response => { if (!response.ok) throw new Error('Could not load words'); return response.json(); })
  .then(seed => { words = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || seed; render(); })
  .catch(() => { $('#status').textContent = 'לא הצלחתי לטעון את המילים.'; });
