# AGENTS.md

## Project

This repository contains Avi's personal Palestinian Arabic dictionary, deployed with GitHub Pages from the `main` branch.

## Standing authorization and workflow

- Avi has given standing authorization to apply requested dictionary and app changes directly to `main`.
- Do not leave an explicitly requested change only as a proposal. Implement it, verify it reached `main`, and report the commit.
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

## UI state

- Persist user interface choices in `localStorage` so refreshes preserve continuity.
- Keep persisted UI state in the versioned `al-kamus-ui-state` object so more preferences can be added safely later.
