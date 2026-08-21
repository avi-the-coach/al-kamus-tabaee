# AGENTS.md

## Project

This repository contains Avi's personal Palestinian Arabic dictionary, deployed with GitHub Pages from the `main` branch.

## Publishing workflow

- Do not leave an explicitly requested change only as a proposal. Implement it and verify that the public GitHub Pages site contains the requested result before reporting completion.
- Ask again only when the requested target is ambiguous or the action is destructive, security-sensitive, or outside this repository.
- When frontend assets change, bump their cache-busting query string in `index.html`.
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

- The phrases view is a separate sub-application, not part of the dictionary or `words.json`.
- Store its records in `phrases.json`, with stable `p-NNN` IDs and the fields `transcription`, `literal`, and `meaning`.
- Display exactly three right-to-left columns: pointed Hebrew transcription, literal Hebrew translation, and natural Hebrew translation. Do not display Arabic-script text in this view.
- Keep a compact copy button at the left edge of each phrase row; copy the transcription, literal translation, and natural translation in that order.
- Keep the dictionary and phrases views independently searchable, and remember the selected view in the shared UI state.
