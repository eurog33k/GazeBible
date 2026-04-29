# GazeBible
God's Word for the world.

A Bible reader for the Even G2 smart glasses — 65 translations across 30 languages, all confirmed free for non-commercial use.

---

## How to use the app

### Controls

| Action | What it does |
|---|---|
| R1 wheel | Scroll through the list or reading screen |
| Single click | Select the highlighted item; on the reading screen: next chapter |
| Double click | Go back to the previous screen |
| Tilt head left | Previous page (reading screen) — ear toward left shoulder |
| Tilt head right | Next page (reading screen) — ear toward right shoulder |

### First launch

Every launch starts with the **splash screen** showing the GazeBible logo, version number, and — once a Bible has been selected — a verse of the day. Click to continue.

The first time you open the app you will then be asked to pick a **display language** — this is the language used for menus and book names. Scroll to your language and click to confirm. This choice is saved and remembered on future launches.

### Navigation flow

```
Splash → App language → Bible language → Bible translation → OT / NT / Bookmarks / License → Book → Chapter → Reading
```

Each step is a scrollable list. Scroll with the R1 wheel, click to confirm, double-click to go back.

### Long lists

When a list has more items than fit on one screen, a `(more...)` entry appears at the bottom. Click it to see the next page. On page 2 and beyond, a `(back...)` entry appears at the top to return to the previous page.

### Reading a chapter

Once in a chapter, scroll up and down with the R1 wheel to page through the text. Single-click to advance to the next chapter. At the end of the last chapter of a book the app moves to the first chapter of the next book; at the end of the Old Testament it continues into the New Testament. Double-click to go back to the chapter picker.

### Testament screen options

The OT / NT selection screen has four options:

| Option | What it does |
|---|---|
| Old Testament | Browse and read OT books |
| New Testament | Browse and read NT books |
| Bookmarks | View, add, and navigate saved bookmarks |
| License | Shows the copyright and description for the selected Bible translation |

### Bookmarks

On the Bookmarks screen you can:
- **Save** your current reading position (top item, shown as `+ BookName Chapter`) — up to 9 bookmarks are kept, newest first.
- **Jump** to any saved bookmark by clicking it.
- **Clear all** bookmarks with the last item.

Double-click to go back to the testament screen.

### Saved preferences

Your app language, last-used Bible translation, and last-read chapter are all saved automatically. The next time you launch, click through the splash screen and the app reopens directly on the last chapter you were reading.

To switch to a different Bible or language, double-click your way back to the relevant screen. Double-clicking on the app language screen returns to the splash screen.

### Performance

- **Prefetch**: when you open a chapter, the next and previous chapters are silently fetched in the background. Advancing to the next chapter loads instantly without a loading screen.
- **Reduced flicker**: page turns within the same chapter use a lightweight content-only update instead of rebuilding the entire display layout.

---

## Known issue: open from phone first

Due to a bug in the Even Hub SDK, apps that are launched **directly from the glasses** (without opening the companion app first) may stop responding after about 50 seconds — scrolling freezes, clicks no longer register.

GazeBible includes an **IMU keep-alive workaround** (low-rate motion sensor polling) that mitigates this in most cases. However, for the most reliable experience:

1. Open the Even app on your phone.
2. Navigate to the Even Hub tab and open GazeBible from there.
3. Wait for the splash screen to appear.
4. Now put your phone in your pocket — the app will keep working normally.

---

## Development & hosting

See [HOSTING.md](HOSTING.md) for instructions on running the backend and frontend locally or in production.
