const fs = require('fs');
const path = require('path');

const projectPath = path.join(__dirname, '..');
const phrases = JSON.parse(fs.readFileSync(path.join(projectPath, 'phrases.json'), 'utf8'));
const { families } = JSON.parse(fs.readFileSync(path.join(projectPath, 'phrase-families.json'), 'utf8'));
const phrasesById = new Map(phrases.map(phrase => [phrase.id, phrase]));
const familyIds = new Set();
const errors = [];

if (!Array.isArray(families)) errors.push('families must be an array.');

for (const family of families || []) {
  if (!family.id || !family.label || !family.meaning) {
    errors.push(`${family.id || '(missing id)'}: missing an id, label, or meaning.`);
  }
  if (familyIds.has(family.id)) errors.push(`${family.id}: duplicate family id.`);
  familyIds.add(family.id);

  if (!Array.isArray(family.matches) || family.matches.length === 0) {
    errors.push(`${family.id}: matches must be a nonempty array.`);
    continue;
  }

  const matchedPhraseIds = new Set();
  for (const match of family.matches) {
    const phrase = phrasesById.get(match.phraseId);
    if (!phrase) {
      errors.push(`${family.id}: unknown phrase ${match.phraseId}.`);
      continue;
    }
    if (matchedPhraseIds.has(match.phraseId)) {
      errors.push(`${family.id}: duplicate phrase ${match.phraseId}.`);
    }
    matchedPhraseIds.add(match.phraseId);

    if (!Array.isArray(match.words) || match.words.length === 0) {
      errors.push(`${family.id}/${match.phraseId}: words must be a nonempty array.`);
      continue;
    }

    for (const word of match.words) {
      if (typeof word !== 'string' || !word || !phrase.transcription.includes(word)) {
        errors.push(`${family.id}/${match.phraseId}: word "${word}" does not appear in the transcription.`);
      }
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Phrase families validation passed: ${families.length} families, ${families.reduce((count, family) => count + family.matches.length, 0)} phrase links.`);
