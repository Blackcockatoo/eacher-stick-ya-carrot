# eacher-stick-ya-carrot

Teacher-facing "Stick Ya Carrot" game (B$S palette). React + Vite + Tailwind + framer-motion + lucide icons. No App.css (StyleInjector/Tailwind only). LocalStorage-safe.

Current prototype shows a grouped checklist with spacious spacing and a
"More" menu that tucks away export and settings actions.

Now includes CSV/HTML export and JSON import with a delete-all confirm.

## Flags

Create a `.env` from `.env.example` and toggle:

- `VITE_FEATURE_STICKYACARROT` — gates the retro mini-game (default `0`).
- `VITE_ENABLE_DEV_TOOLS` — toggles dev shortcuts (default `0`).
