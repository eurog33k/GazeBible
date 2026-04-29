# GazeBible — Architecture

## Overview

GazeBible has two components:

- **`gazebible/`** — Even Hub frontend (TypeScript + Vite). Runs on the Even G2 glasses via the Even Hub SDK.
- **`bible-backend/`** — Express API (TypeScript). Serves Bible data from a SQLite database and, in production, also serves the built frontend as static files.

---

## Frontend (`gazebible/`)

A single-file TypeScript app (`src/main.ts`) compiled by Vite. There is no framework — the Even Hub SDK provides the rendering layer.

### How it works

The SDK exposes a bridge object (`waitForEvenAppBridge()`). The app builds its UI by calling SDK primitives that produce LVGL widget trees on the glasses display:

- `CreateStartUpPageContainer` — initial build of a screen
- `RebuildPageContainer` — full screen rebuild (navigation, state changes)
- `TextContainerUpgrade` — lightweight content-only update (used for page turns within the same chapter to reduce flicker)
- `ListContainerProperty`, `TextContainerProperty`, `ImageContainerProperty` — individual widget descriptors

### Screen state machine

The `screen` variable tracks which screen the user is on. Valid values:

```
splash → appLanguage → bibleLanguage → bibleSelect → testament
       → book → chapter → reading / license / appLicense
```

Each screen has a `make*Spec()` function that returns the widget tree for that screen, and a `show*()` function that calls either `doRebuild()` or `doUpgrade()` to push it to the display.

Double-click always goes back one level. Single-click selects or advances. The R1 wheel scrolls lists.

### IMU (head tilt gestures)

The SDK streams IMU data at configurable rates (`ImuReportPace`). Values are in g-force units (at rest: x≈0.1–0.3, z≈1.0 = gravity). Head tilt (ear toward shoulder = roll) is detected on the dominant horizontal axis (x or y, whichever has higher magnitude).

- Threshold: 0.4g (~23° tilt) triggers a page turn
- Return threshold: 0.2g (must return to near-neutral before next trigger)
- Cooldown: 600ms between triggers
- Watchdog: a `setInterval` (2s cadence) restarts the IMU stream if no events arrive for 3s while on the reading screen

IMU events do not arrive via `event.sysEvent` in the current SDK version — they arrive via `event.jsonData` with a nested `imuData` object. The app checks both paths.

### Persistence (localStorage)

| Key | Contents |
|---|---|
| `app-lang` | Selected app display language |
| `bible-lang-dir` | Selected Bible language directory |
| `bible-file` | Selected Bible translation module name |
| `reading-pos` | `{ testament, book, chapter, readingPage }` — last read position |
| `bookmarks` | Array of up to 9 bookmark objects |
| `votd-cache` | `{ date, verse }` — verse of the day cache (one entry per day) |

### Prefetch cache

When a chapter is opened, the adjacent chapters (prev + next) are silently fetched via `apiFetch` and stored in a `Map`. On chapter advance the cached response is used immediately, with no loading screen. The cache is cleared when the Bible or language changes.

### Text layout

Text measurement uses `@evenrealities/pretext` (`measureTextWrap`, `pxTruncate`) to predict exact LVGL line breaks at the G2's 576px display width. The reading content container is 576×243px (9 lines × 27px line height), which is exactly one screenful — each page turn flips one full screen of content.

### API calls

All API calls go through `apiFetch()`, which adds a 10s timeout and retries up to 2 times on failure. In development (Vite dev server) requests are proxied to `localhost:3001`. In production the `VITE_API_URL` env var sets the base URL (or empty string if the backend serves the frontend).

---

## Backend (`bible-backend/`)

A minimal Express server (`src/server.ts`). It opens `bibles_combined.sqlite` read-only at startup and serves all data from it synchronously via `better-sqlite3`.

### API endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/languages` | All Bible languages: `[{ code, name, dir }]` |
| `GET` | `/api/bibles/:langDir` | Translations for a language: `[{ file, name, shortname, year }]` |
| `GET` | `/api/books/:langDir/:bibleFile` | Books in a Bible: `[{ book, name, chapters, testament }]` |
| `GET` | `/api/verses/:langDir/:bibleFile/:book/:chapter` | Verse array: `[{ verse, text }]` |
| `GET` | `/api/votd?bible=` | Verse of the day (deterministic by day-of-year): `{ book, chapter, verse, text }` |
| `GET` | `/api/license/:langDir/:bibleFile` | Copyright + description as pre-wrapped lines: `{ lines }` |
| `POST` | `/api/log` | Receives `{ level, msg }` from the frontend and prints to the server log |

In production the backend also serves the built frontend: `express.static(dist/)` + a catch-all that returns `index.html` for any unmatched path.

### Database

`bibles_combined.sqlite` is a merged SQLite database built by `bible/merge_bibles.py` from source files in `bible/bibles_sqlite_6.0/`. It contains two tables:

- `versions` — one row per Bible translation (metadata: module, name, language, copyright, description)
- `verses` — all verses for all translations, joined to `versions` via `version_id`

The source files are not needed on the server — only `bibles_combined.sqlite`.

### Text cleaning

Verse text from the database can contain markup inherited from the source data. The backend strips it before returning:
- `cleanText()` removes paragraph marks (`¶`), XML tags, footnote markers `{...}`, and lettered section markers `(a)`.
- `cleanDescription()` converts HTML in license descriptions to plain text with basic formatting preserved.
- `wrapText()` wraps license lines at 53 characters for display on the glasses.

---

## How they interact

```
Even G2 glasses
      │
      │  SDK bridge (WebSocket/IPC)
      ▼
gazebible frontend (browser context in Even Hub)
      │
      │  fetch /api/*  (Vite proxy in dev; direct URL in prod)
      ▼
bible-backend Express server  ←→  bibles_combined.sqlite
```

In development, the Vite dev server (`:5173`) proxies `/api/*` to the backend (`:3001`). In production, the backend itself serves the frontend's `dist/` folder, so everything runs on a single port (`:3001`).
