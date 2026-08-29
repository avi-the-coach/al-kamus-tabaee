# AGENTS.md

## Project

This repository contains Avi's personal Palestinian Arabic dictionary, deployed with GitHub Pages from the `main` branch.

## Feature specifications

- Keep evolving design documents and implementation plans in `specs/`, not in the published application.
- `_config.yml` excludes `specs/` from the GitHub Pages build. This exclusion does not make files in a public GitHub repository private.
- Before designing or implementing fork/upstream synchronization, layered personal data, or related migrations, read and update `specs/forkable-personal-dictionary.md`.
- Treat open design questions in that specification as unresolved; do not implement speculative answers without Avi's direction.

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
- Every conjugating verb must include `root`, `verbForm`, and `weakClass`. `verbForm` contains the Arabic form number and its readable Hebrew pattern (for example `{ "number": 5, "pattern": "תַפַעַּל" }`). `weakClass` contains a stable filter ID and a Hebrew label. Show these three fields together before the dictionary form and conjugation table.
- Classify forms and weak-root classes according to Arabic morphology, not by forcing a one-to-one mapping to Hebrew binyanim. A compound weak class may be used when more than one feature materially affects conjugation.
- Keep the building and weak-class filters composable: selections within one dimension are OR; choosing both dimensions is AND.
- Conjugation tables display pointed Hebrew transcription only. Imperative cells must remain empty except for `you_m`, `you_f`, and `you_pl`.

### Preferred spoken-Arabic reference: Madrasa Dictionary

- Use Madrasa's Hebrew-to-spoken-Arabic dictionary as a preferred reference when adding, correcting, or explaining dictionary words, phrase vocabulary, grammatical constructions, or Hebrew transcription: `https://milon.madrasafree.com/`.
- Search directly with `https://milon.madrasafree.com/default.asp?searchString=<URL-encoded search term>`. Search terms may be Hebrew, pointed or unpointed Hebrew transcription, or Arabic; URL-encode UTF-8 query values.
- Example: `https://milon.madrasafree.com/default.asp?searchString=%D7%91%D7%9C%D7%90%D7%A9` searches for `בלאש` and returns both exact matches and similar-sounding related entries.
- Open the rendered search page in a real browser when a basic web reader fails to load the query URL or exposes only the empty homepage. Inspect the visible results and open the individual `/word.asp?id=<id>` entry when more detail is needed.
- Verify the Arabic spelling, pointed Hebrew transcription, Hebrew meanings, grammatical type, gender/number, verb pattern, present/future notes, usage notes, and relevant expressions whenever the source supplies them. Compare exact matches with similar-sounding results instead of assuming that near-identical Hebrew spellings represent the same word.
- Interpret each word in context: Madrasa distinguishes `بلاش` / `בַּלַאש` meaning "אין צורך ש, אין טעם ש, שלא" before a verb from its separate "חינם" sense, and from `بَلَّش` / `בַּלַּש`, the verb "התחיל". For `בַּלַאש תְוַגַּע רַאסַכּ`, a context-faithful literal translation is "אין צורך שתכאיב לראש שלך", not simply "בלי שתכאיב לראש שלך".
- Madrasa is a strong reference for spoken Arabic and Hebrew learners, not an infallible source or permission to invent missing forms. Cross-check dialect, context, and forms it does not provide; preserve the project's Palestinian/Jerusalem spoken conventions and Avi's instructions when sources differ.

### New-entry checklist

Before adding a word:

1. Search Madrasa Dictionary when relevant and confirm the Palestinian-Jerusalem spoken form, contextual meaning, pointed Hebrew transcription, and grammatical type. Do not infer a form from Modern Standard Arabic when a spoken form is available.
2. Allocate the next unused stable `w-NNN` ID and add a natural everyday example.
3. If the entry is a conjugating verb, use `w-041` (`حسّ`) as the canonical complete-data reference and include all of the following:
   - `root`, `verbForm` (number and readable pattern), and `weakClass` (stable ID and label).
   - `dictionaryForm`: third-person masculine singular past, in Arabic and pointed Hebrew transcription.
   - `participles`: `masculine`, `feminine`, and `plural`, each in Arabic and pointed Hebrew transcription.
   - `conjugations.past`, `.present`, and `.future`: all eight person keys.
   - `conjugations.imperative`: exactly `you_m`, `you_f`, and `you_pl`; the UI leaves every other imperative cell empty.
4. If the entry is not a conjugating verb (for example `لازم` or `بدّي`), do not manufacture a dictionary form, participles, tense table, or imperative. Classify and explain it according to its real grammatical behavior.
5. Run `node scripts/validate-dictionary.js` before publishing. It validates the complete JSON file, unique IDs, required base fields, and the full schema of every conjugating verb.

## UI state

- Persist user interface choices in `localStorage` so refreshes preserve continuity.
- Keep persisted UI state in the versioned `al-kamus-ui-state` object so more preferences can be added safely later.
- Keep the three primary application views separate: `words` shows non-verbs, `verbs` shows entries classified as verbs, and `phrases` shows sentence practice. Search queries and relevant filter choices must persist independently for each view.
- The words control panel contains word topics, non-verb parts of speech, and word sorting. The verbs control panel contains verb topics, building, weak-root class, and verb sorting. Do not expose verb-only controls in the words view.
- Persist phrase order as the `phraseOrder` array of stable phrase IDs in that same UI-state object. When loading, keep surviving saved IDs in their stored order, ignore deleted IDs, and append previously unseen phrases sorted by ID.

## Thinking-in-Arabic practice

- Terminology is strict: **words / מילים** means non-verb vocabulary, **verbs / פעלים** means verb entries with their grammatical details, and **phrases / משפטים** means the separate sentence-practice sub-application. All entries remain stored together in `words.json`, but the UI views and controls are separate.
- The phrases view is a separate sub-application, not part of the dictionary or `words.json`.
- Store its records in `phrases.json`, with stable `p-NNN` IDs and the fields `transcription`, `literal`, and `meaning`.
- Display exactly three right-to-left columns: pointed Hebrew transcription, literal Hebrew translation, and natural Hebrew translation. Do not display Arabic-script text in this view.
- The `literal` field intentionally preserves the Arabic construction and word order as closely as understandable Hebrew permits; `meaning` is the idiomatic, natural Hebrew equivalent.
- Keep a compact copy button at the left edge of each phrase row. Copy `[AL-KAMUS phrase_id=p-NNN]` followed by the transcription, literal translation, and natural translation, in that order; dictionary copy buttons already use `[AL-KAMUS word_id=w-NNN]`.
- Keep the dictionary and phrases views independently searchable, and remember the selected view in the shared UI state.
- Keep the phrases control panel's `סדר` section: `Shuffle` randomly reorders all phrases and persists their IDs; `Reset` restores and persists ascending phrase-ID order. Search and family filters must preserve whichever phrase order is active.
- Store manually curated word-family mappings in `phrase-families.json`, separate from the phrases and dictionary data.
- Each family has a stable `id`, pointed Hebrew `label`, Hebrew `meaning`, and `matches` containing a stable `phraseId` plus the exact pointed Hebrew `words` occurring in that phrase.
- A phrase can belong to multiple families. Render mapped words as clickable links and combine selected families with AND filtering.
- Family membership is editorial and static, not automatically inferred from spelling, an Arabic root, or a dictionary entry. Include related inflections according to their meaning and actual use in each phrase.
- Selected families appear as removable chips in the phrases control panel; clicking an active linked word or its chip removes that filter, and `נקה הכול` clears every selected family.
- Run `node scripts/validate-phrase-families.js` after changing phrase records or family mappings.

### Adding or editing practice phrases

1. Edit `phrases.json`, never `words.json`, and allocate the next unused stable `p-NNN` ID. Never renumber or reuse an existing phrase ID.
2. Supply exactly the three learning values: pointed Palestinian-Arabic Hebrew `transcription`, structure-preserving Hebrew `literal`, and natural Hebrew `meaning`. Use Madrasa Dictionary to verify unfamiliar vocabulary and context-dependent constructions when relevant.
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
