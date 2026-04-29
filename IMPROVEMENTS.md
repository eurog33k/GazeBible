# GazeBible — Improvement Checklist

Prioritised list of improvements based on SDK docs, Discord research, and even-toolkit findings.
Check off items as they are completed.

---

## Priority 1 — Quick wins

- [x] **Pixel-accurate text wrapping** — replace character-count `wrapLines(53)` with `measureTextWrap` from `@evenrealities/pretext`. Fills each line to the true 546px inner width instead of leaving ~30px unused. *(done 2026-04-28)*
- [x] **Persist last-read position** — saves `{ testament, book, chapter, readingPage }` to `reading-pos` on every chapter open. On launch, if position + prefs exist, splash "Start" jumps straight back to the reading screen. *(done 2026-04-28)*
- [x] **Debounce click handler** — ignores a second click within 300ms of the first. Scrolls and double-clicks are unaffected. *(done 2026-04-28)*
- [x] **"Open from phone first" documentation** — added "Tip: open from phone first" to the splash screen bottom and a full explanation to README. *(done 2026-04-28)*

---

## Priority 2 — User experience

- [x] **Bookmarks** — save current position (book + chapter + reading page) to local storage. "Bookmarks" option on the testament screen. Max 9 bookmarks, with clear-all and navigation. *(done 2026-04-28)*
- [x] **Next / previous chapter navigation** — single click on the reading screen advances to the next chapter; at the last chapter it returns to the chapter picker. Double-click still goes back to chapter picker for any chapter. (No long-press in SDK, so prev-chapter via gesture is not possible.) *(done 2026-04-28)*
- [x] **Chapter count > 14 pagination** — chapter list uses the same `pagedItems` / `chapterPage` pagination as books and languages. Psalms (150 chapters) produces 12 pages of 13 with `(more...)` / `(back...)`. *(already in place)*
- [x] **Verse of the day** — deterministic by day-of-year from the user's selected Bible. Shown in a 2-line area on the splash screen (reference + truncated text). Cached in localStorage so only one API call per day. *(done 2026-04-28)*
---

## Priority 3 — Input methods

- [x] **Head gesture support** — tilt head left for previous page, tilt right for next page. Uses IMU data at 5 Hz (P200) with a state-machine detector and hysteresis to prevent false triggers. IMU reports in g-force units; at rest x ≈ 0.1–0.3, z ≈ 1.0. Threshold set to 0.4g (~23° tilt). Events arrive via `jsonData` fallback (SDK does not route IMU to `sysEvent`). *(done 2026-04-28)*
---

## Priority 4 — Performance & robustness

- [x] **Prefetch adjacent chapters** — when a chapter is opened, the next and previous chapters are silently fetched into a `Map` cache. On chapter advance, the prefetch is used instantly (no loading screen). Cache is cleared when Bible or language changes. *(done 2026-04-28)*
- [x] **IMU keep-alive workaround** — `imuControl(true, ImuReportPace.P1000)` at startup keeps the JS event loop alive at 1 Hz. Works around background-state throttling when launched from glasses. *(done 2026-04-28)*
- [x] **`textContainerUpgrade` for content updates** — when paging within the same chapter (or license), uses the cheaper `textContainerUpgrade` on the content container instead of `rebuildPageContainer`. Falls back to full rebuild if the SDK call fails. Reduces flicker. *(done 2026-04-28)*

---

## Priority 5 — Content & publishing

- [x] **Bible translations** — 65 translations across 30 languages are already in `bibles_combined.sqlite`, including KJV, ASV, WEB, and NET. No action needed. *(verified 2026-04-28)*
- [x] **app.json for Even Hub publishing** — manifest created at `gazebible/app.json`. `evenhub pack app.json ./dist` produces `out.ehpk` (85KB). *(done 2026-04-28)*
- [x] **App icon** — `gazebible/marketplace-icon.png`, 288×144px 8-bit greyscale, reused from splash screen icon. *(done 2026-04-28)*
- [ ] **Cross-reference navigation** — show related verses as a sub-list when the user long-presses a verse.

---

## Priority 6 — Launch awareness

- [x] **Launch source detection** — `bridge.onLaunchSource` captures `appMenu` vs `glassesMenu`. When launched directly from the glasses, the splash tip line changes from "Tip: open from phone first" to "WARNING: launched from glasses — may freeze!". If `onLaunchSource` fires after `start()` has already run, the splash is rebuilt in-place while the user is still on it. *(done 2026-04-28)*

---

## Known bugs to watch (external, not our code)

- [ ] **Background degradation at ~50s** — Even Realities aware, fix pending. IMU keep-alive workaround is in place (see Priority 4). Track SDK release notes for a proper fix.

- [ ] **SDK event routing via `jsonData`** — events arrive as `event.jsonData` (lowercase keys) instead of the documented `event.listEvent`. Watch SDK updates; may be normalised in a future release.
