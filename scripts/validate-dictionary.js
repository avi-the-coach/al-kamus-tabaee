const fs = require('fs');
const path = require('path');

const dictionaryPath = path.join(__dirname, '..', 'words.json');
const words = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));
const requiredPersons = ['i', 'you_m', 'you_f', 'he', 'she', 'we', 'you_pl', 'they'];
const imperativePersons = ['you_f', 'you_m', 'you_pl'];
const errors = [];

const ids = words.map(word => word.id);
if (new Set(ids).size !== ids.length) errors.push('Word IDs must be unique.');

for (const word of words) {
  if (!word.id || !word.arabic || !word.transcription || !word.meaning) {
    errors.push(`${word.id || '(missing id)'}: missing a required base field.`);
  }

  if (word.partOfSpeech !== 'verb' || !word.conjugations) continue;

  if (!word.root || !word.verbForm?.number || !word.verbForm?.pattern || !word.weakClass?.id || !word.weakClass?.label) {
    errors.push(`${word.id}: missing root, verbForm, or weakClass metadata.`);
  }

  if (!word.dictionaryForm?.arabic || !word.dictionaryForm?.transcription) {
    errors.push(`${word.id}: missing a complete dictionaryForm.`);
  }

  for (const form of ['masculine', 'feminine', 'plural']) {
    if (!word.participles?.[form]?.arabic || !word.participles?.[form]?.transcription) {
      errors.push(`${word.id}: missing participles.${form}.`);
    }
  }

  for (const tense of ['past', 'present', 'future']) {
    for (const person of requiredPersons) {
      if (!word.conjugations[tense]?.[person]) errors.push(`${word.id}: missing conjugations.${tense}.${person}.`);
    }
  }

  const actualImperativePersons = Object.keys(word.conjugations.imperative || {}).sort();
  if (actualImperativePersons.join(',') !== imperativePersons.join(',')) {
    errors.push(`${word.id}: imperative must contain exactly you_m, you_f, and you_pl.`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Dictionary validation passed: ${words.length} entries.`);
