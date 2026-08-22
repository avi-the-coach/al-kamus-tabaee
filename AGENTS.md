# AGENTS.md

## Project

This repository contains Avi's personal Palestinian Arabic dictionary, deployed with GitHub Pages from the `main` branch.

## Publishing workflow

- Do not leave an explicitly requested change only as a proposal. Implement it and verify that the public GitHub Pages site contains the requested result before reporting completion.
- Ask again only when the requested target is ambiguous or the action is destructive, security-sensitive, or outside this repository.
- When `words.json`, `phrases.json`, or `phrase-families.json` changes, bump that file's `?v=` query string in its `fetch(...)` call in `app.js`.
- Whenever `app.js` changes, including a JSON cache-version bump, also bump the `app.js?v=` query string in `index.html`. When a stylesheet changes, bump its own query string in `index.html`.
- After updates, verify the relevant files on `main`. GitHub Pages normally refreshes within a few minutes.

## Dictionary data

- Dictionary entries live in `words.json`.
- Word IDs are stable. Never renumber or reuse an existing ID.
- Use Palestinian spoken Arabic, Hebrew transcription with niqqud, a concise Hebrew meaning, and a useful example when available.
- Keep the two classification dimensions separate:
  - `topic` / `topics` is thematic (for example work, health, greetings). A word may have no topic or several topics.
  - `partOfSpeech` / `partsOfSpeech` is grammatical. Every word must have at least one supported word type.
- The UI must continue accepting legacy `category` / `categories` fields as topic aliases, plus both singular and array formats.
- For conjugating verbs, use `dictionaryForm` for the conventional dictionary headword (third-person masculine singular, past tense), with Arabic and a pointed Hebrew transcription.
- Store complete verb paradigms under `conjugations`, using the tense keys `past`, `present`, `future`, and `imperative`, and the person keys `i`, `you_m`, `you_f`, `he`, `she`, `we`, `you_pl`, and `they`.
- Every conjugating verb must also include spoken active-participle forms under `participles`, using the keys `masculine`, `feminine`, and `plural`; each form contains Arabic and a pointed Hebrew transcription. Do not invent participles for non-conjugating pseudo-verbs such as `بدّي`.
- Conjugation tables display pointed Hebrew transcription only. Imperative cells must remain empty except for `you_m`, `you_f`, and `you_pl`.

### New-entry checklist

Before adding a word:

1. Confirm the Palestinian-Jerusalem spoken form, meaning, pointed Hebrew transcription, and grammatical type. Do not infer a form from Modern Standard Arabic when a spoken form is available.
2. Allocate the next unused stable `w-NNN` ID and add a natural everyday example.
3. If the entry is a conjugating verb, use `w-041` (`حسّ`) as the canonical complete-data reference and include all of the following:
   - `dictionaryForm`: third-person masculine singular past, in Arabic and pointed Hebrew transcription.
   - `participles`: `masculine`, `feminine`, and `plural`, each in Arabic and pointed Hebrew transcription.
   - `conjugations.past`, `.present`, and `.future`: all eight person keys.
   - `conjugations.imperative`: exactly `you_m`, `you_f`, and `you_pl`; the UI leaves every other imperative cell empty.
4. If the entry is not a conjugating verb (for example `لازم` or `بدّي`), do not manufacture a dictionary form, participles, tense table, or imperative. Classify and explain it according to its real grammatical behavior.
5. Run `node scripts/validate-dictionary.js` before publishing. It validates the complete JSON file, unique IDs, required base fields, and the full schema of every conjugating verb.

## UI state

- Persist user interface choices in `localStorage` so refreshes preserve continuity.
- Keep persisted UI state in the versioned `al-kamus-ui-state` object so more preferences can be added safely later.

## Thinking-in-Arabic practice

- Terminology is strict: **dictionary / מילון** means the vocabulary list only; **phrases / משפטים** means the separate sentence-practice sub-application. A request to update one must not implicitly change the other.
- The phrases view is a separate sub-application, not part of the dictionary or `words.json`.
- Store its records in `phrases.json`, with stable `p-NNN` IDs and the fields `transcription`, `literal`, and `meaning`.
- Display exactly three right-to-left columns: pointed Hebrew transcription, literal Hebrew translation, and natural Hebrew translation. Do not display Arabic-script text in this view.
- The `literal` field intentionally preserves the Arabic construction and word order as closely as understandable Hebrew permits; `meaning` is the idiomatic, natural Hebrew equivalent.
- Keep a compact copy button at the left edge of each phrase row; copy the transcription, literal translation, and natural translation in that order.
- Keep the dictionary and phrases views independently searchable, and remember the selected view in the shared UI state.
- Store manually curated word-family mappings in `phrase-families.json`, separate from the phrases and dictionary data.
- Each family has a stable `id`, pointed Hebrew `label`, Hebrew `meaning`, and `matches` containing a stable `phraseId` plus the exact pointed Hebrew `words` occurring in that phrase.
- A phrase can belong to multiple families. Render mapped words as clickable links and combine selected families with AND filtering.
- Family membership is editorial and static, not automatically inferred from spelling, an Arabic root, or a dictionary entry. Include related inflections according to their meaning and actual use in each phrase.
- Selected families appear as removable chips in the phrases control panel; clicking an active linked word or its chip removes that filter, and `נקה הכול` clears every selected family.
- Run `node scripts/validate-phrase-families.js` after changing phrase records or family mappings.

### Adding or editing practice phrases

1. Edit `phrases.json`, never `words.json`, and allocate the next unused stable `p-NNN` ID. Never renumber or reuse an existing phrase ID.
2. Supply exactly the three learning values: pointed Palestinian-Arabic Hebrew `transcription`, structure-preserving Hebrew `literal`, and natural Hebrew `meaning`.
3. Check the new or edited transcription against every existing family in `phrase-families.json`. If a related word occurs, add or update its match using the phrase ID and the exact pointed word as it appears in the transcription.
4. Preserve links to every applicable family: a phrase such as `p-012` can belong to both `hal` and `bal` simultaneously.
5. If editing or removing a phrase, repair every affected family match; never leave a stale `phraseId` or an outdated word spelling behind.
6. Bump `phrases.json?v=` in `app.js`; also bump `phrase-families.json?v=` if mappings changed, followed by `app.js?v=` in `index.html`.
7. Run `node scripts/validate-phrase-families.js` and `node scripts/validate-dictionary.js`, then publish and verify the changed files on `main`.

### Adding or maintaining a phrase word family

1. When Avi requests a word, root, or inflection family, inspect all current `phrases.json` transcriptions and determine which occurrences genuinely share the intended meaning.
2. In `phrase-families.json`, reuse the existing family when appropriate; otherwise append a family with a new stable, descriptive Latin-script `id`, a pointed Hebrew `label`, and a concise Hebrew `meaning`.
3. Add one match per relevant phrase: `{ "phraseId": "p-NNN", "words": ["..."] }`. Every `words` value must be an exact, case-preserving and niqqud-preserving substring of that phrase's `transcription`.
4. Put multiple matching forms from one phrase in the same `words` array; do not duplicate that phrase ID within the same family. Membership in other families remains untouched.
5. Existing examples: `hal` groups `חַאלַכּ` / `חַאלִי`; `bal` groups `בַּאלַכּ` / `בַּאלִי`. Their overlap at `p-012` demonstrates AND filtering when both families are selected.
6. Do not add a dictionary word merely because a phrase family was requested, and do not create a phrase family merely because a dictionary word was requested.
7. Bump `phrase-families.json?v=` in `app.js`, then bump `app.js?v=` in `index.html`.
8. Run `node scripts/validate-phrase-families.js` and `node scripts/validate-dictionary.js`, then publish and verify the changed files on `main`.
