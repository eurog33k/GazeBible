import { measureTextWrap, pxTruncate } from '@evenrealities/pretext';
import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer, RebuildPageContainer,
  TextContainerProperty, ListContainerProperty, ListItemContainerProperty,
  ImageContainerProperty, ImageRawDataUpdate,
  TextContainerUpgrade,
  StartUpPageCreateResult, OsEventTypeList, ImuReportPace,
  LAUNCH_SOURCE_GLASSES_MENU, type LaunchSource,
} from '@evenrealities/even_hub_sdk';
import { UI, APP_LANG_NAMES, APP_LANG_ENGLISH_NAMES, APP_LANGS, type AppLang } from './i18n';
import pkg from '../package.json';
import licenseText from '../../LICENSE?raw';
import splashImgUrl from './splash.png';

const APP_VERSION: string = (pkg as { version: string }).version;
const _v = `v ${APP_VERSION}`;
const GITHUB_URL = 'github.com/eurog33k/GazeBible';

// Attribution required by the splash icon license (CC BY 4.0).
const ICON_ATTRIBUTION_LINES = [
  '',
  '── Splash icon ──────────────────────────',
  '"Open" icon by IconScout',
  'License: Creative Commons Attribution 4.0',
  'creativecommons.org/licenses/by/4.0',
  'iconscout.com/free-icon/',
  'free-open-icon_444878',
];

function langSortKey(lang: AppLang): string {
  const native = APP_LANG_NAMES[lang];
  return /[^\u0000-\u024F]/.test(native) ? APP_LANG_ENGLISH_NAMES[lang] : native;
}

function langDisplayLabel(lang: AppLang): string {
  const native  = APP_LANG_NAMES[lang];
  const english = APP_LANG_ENGLISH_NAMES[lang];
  return native === english ? native : `${native} (${english})`;
}

const SORTED_APP_LANGS = [
  'en' as AppLang,
  ...APP_LANGS.filter(c => c !== 'en').sort((a, b) =>
    langSortKey(a).localeCompare(langSortKey(b))),
];

// ── SDK bridge ────────────────────────────────────────────────────────────────

const bridge = await waitForEvenAppBridge();
let sdkReady = false;

const _statusEl = document.getElementById('status');
if (_statusEl) _statusEl.textContent = 'Running on your glasses';

// ── API ───────────────────────────────────────────────────────────────────────

const API = import.meta.env.DEV
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? '');

async function apiFetch<T>(path: string, attempt = 0): Promise<T> {
  const url = `${API}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json() as T;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Server timeout');
    if (attempt < 2) {
      clearTimeout(timer);
      await new Promise(r => setTimeout(r, 500));
      return apiFetch<T>(path, attempt + 1);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Language  { code: string; name: string; dir: string }
interface Bible     { file: string; name: string; shortname: string; year: string }
interface BookInfo  { book: number; name: string; chapters: number; testament: 'OT' | 'NT' }
interface Verse     { verse: number; text: string }

// ── Persistence ───────────────────────────────────────────────────────────────

interface Prefs    { lang: Language; bible: Bible }
interface Position { testament: 'OT' | 'NT'; book: BookInfo; chapter: number; readingPage: number }
interface Bookmark { id: number; label: string; testament: 'OT' | 'NT'; book: BookInfo; chapter: number; readingPage: number }

const MAX_BOOKMARKS = 9;

async function saveAppLang(code: AppLang) {
  try { await bridge.setLocalStorage('app-lang', code); } catch {}
}

async function loadAppLang(): Promise<AppLang | null> {
  try {
    const v = await bridge.getLocalStorage('app-lang');
    return v && APP_LANGS.includes(v as AppLang) ? (v as AppLang) : null;
  } catch { return null; }
}

async function savePrefs(lang: Language, bible: Bible) {
  try { await bridge.setLocalStorage('bible-prefs', JSON.stringify({ lang, bible })); } catch {}
}

async function loadPrefs(): Promise<Prefs | null> {
  try {
    const v = await bridge.getLocalStorage('bible-prefs');
    return v ? JSON.parse(v) as Prefs : null;
  } catch { return null; }
}

async function loadBookmarks(): Promise<Bookmark[]> {
  try {
    const v = await bridge.getLocalStorage('bookmarks');
    return v ? JSON.parse(v) as Bookmark[] : [];
  } catch { return []; }
}

async function saveBookmarks(bm: Bookmark[]) {
  try { await bridge.setLocalStorage('bookmarks', JSON.stringify(bm)); } catch {}
}

async function savePosition() {
  if (!selBook) return;
  const pos: Position = { testament: selTestament, book: selBook, chapter: selChapter, readingPage };
  try { await bridge.setLocalStorage('reading-pos', JSON.stringify(pos)); } catch {}
}

async function loadPosition(): Promise<Position | null> {
  try {
    const v = await bridge.getLocalStorage('reading-pos');
    return v ? JSON.parse(v) as Position : null;
  } catch { return null; }
}

// ── Render primitives ─────────────────────────────────────────────────────────

// List-based screen (navigation): title text + selectable list container.
function makeListSpec(
  titleName: string, title: string, listName: string,
  items: string[], selectable: boolean, padding: number,
): CreateStartUpPageContainer {
  const safeTitle = sanitizeLabel(title);
  const safeItems = items.map(sanitizeLabel);
  return new CreateStartUpPageContainer({
    containerTotalNum: 2,
    textObject: [new TextContainerProperty({
      containerID: 1, containerName: titleName,
      xPosition: 0, yPosition: 2, width: 576, height: 32,
      content: safeTitle, isEventCapture: 0,
    })],
    listObject: [new ListContainerProperty({
      containerID: 2, containerName: listName,
      xPosition: 0, yPosition: 36, width: 576, height: 242,
      borderWidth: 0, paddingLength: padding, isEventCapture: 1,
      itemContainer: new ListItemContainerProperty({
        itemCount: safeItems.length, itemWidth: 570,
        isItemSelectBorderEn: selectable ? 1 : 0, itemName: safeItems,
      }),
    })],
  });
}

// Text-based reading screen: two TextContainerProperty containers.
// isEventCapture: 1 on the content container enables textEvent scroll events
// whenever the content overflows the container height (242 px).
function makeTextReadSpec(title: string, content: string): CreateStartUpPageContainer {
  return new CreateStartUpPageContainer({
    containerTotalNum: 2,
    textObject: [
      new TextContainerProperty({
        containerID: 1, containerName: 'rtl',
        xPosition: 0, yPosition: 2, width: 576, height: 30,
        content: sanitizeLabel(title), isEventCapture: 0,
      }),
      new TextContainerProperty({
        containerID: 2, containerName: 'rcnt',
        xPosition: 0, yPosition: 36, width: 576, height: 243,
        content: sanitizeLabel(content), isEventCapture: 1,
      }),
    ],
  });
}

async function doRebuild(spec: CreateStartUpPageContainer) {
  await bridge.rebuildPageContainer(new RebuildPageContainer({
    containerTotalNum: spec.containerTotalNum,
    textObject:  spec.textObject,
    listObject:  spec.listObject,
    imageObject: spec.imageObject,
  }));
}

async function renderContainer(spec: CreateStartUpPageContainer) {
  if (!sdkReady) {
    const result = await bridge.createStartUpPageContainer(spec);
    if (result === StartUpPageCreateResult.success) {
      sdkReady = true;
    } else if (result === StartUpPageCreateResult.invalid) {
      sdkReady = true;
      await doRebuild(spec);
    } else {
      throw new Error(`createStartUpPageContainer failed: ${result}`);
    }
  } else {
    await doRebuild(spec);
  }
}

let _lastTextReadTitle: string | null = null;

async function showList(title: string, items: string[]) {
  _lastTextReadTitle = null;
  await renderContainer(makeListSpec('ttl', title, 'lst', items, true, 2));
  imuSync();
}

async function showTextReading(title: string, content: string) {
  const safeTitle   = sanitizeLabel(title);
  const safeContent = sanitizeLabel(content);

  // Cheap path: if the same text-read layout is already on screen with the
  // same title, only update the content container (avoids full-page flicker).
  if (_lastTextReadTitle === safeTitle && sdkReady) {
    const ok = await bridge.textContainerUpgrade(new TextContainerUpgrade({
      containerID: 2, containerName: 'rcnt', content: safeContent,
    }));
    if (ok) { imuSync(); return; }
  }

  _lastTextReadTitle = safeTitle;
  await renderContainer(makeTextReadSpec(title, content));
  imuSync();
}

async function showLoading(msg?: string) {
  const text = msg ?? s().loading;
  await showList(text, [text]);
}

async function showError(msg: string) {
  await showList('!', [msg.slice(0, 48), '', '< double-click to go back']);
}

// ── App language ──────────────────────────────────────────────────────────────

let appLang: AppLang = 'en';
function s() { return UI[appLang]; }
function bookName(num: number) { return s().books[num] ?? `Book ${num}`; }

// ── State ─────────────────────────────────────────────────────────────────────

type Screen = 'splash' | 'appLang' | 'lang' | 'bible' | 'testament' | 'book' | 'chapter' | 'reading' | 'license' | 'appLicense' | 'bookmarks';
let screen: Screen = 'splash';
let splashContinue: (() => Promise<void>) | null = null;

const PAGE_SIZE = 13; // effective items per nav page (leaves room for back/more items)

let selLang:      Language | null = null;
let selBible:     Bible    | null = null;
let selTestament: 'OT' | 'NT'    = 'OT';
let selBook:      BookInfo | null = null;
let selChapter:   number         = 1;
let appLangPage:  number         = 0;
let langPage:     number         = 0;
let bookPage:     number         = 0;
let chapterPage:  number         = 0;
let readingPage:  number         = 0;
let licensePage:  number         = 0;
let appLicensePage: number       = 0;

// Actual start-line index for each text-reading page (lazily computed, reset on cache clear).
let readingPageStarts:    number[] = [];
let licensePageStarts:    number[] = [];
let appLicensePageStarts: number[] = [];

let cachedLines:      string[] | null = null;
let cachedLicense:    string[] | null = null;
let cachedAppLicense: string[] | null = null;

let lastAppLangIdx = -1;
let lastLangIdx    = -1;
let lastBibleIdx   = -1;
let lastBookIdx    = -1;
let lastChapterIdx = -1;

let cachedLangs:      Language[] | null = null;
let cachedBibles:     Bible[]    | null = null;
let cachedBooks:      BookInfo[] | null = null;
let cachedBookmarks:  Bookmark[]        = [];
let bookmarkHasAdd    = false;  // whether "Save current" is item 0 on bookmarks screen
let votdContent       = '';                    // "BookName Ch:V\nVerse text…" or '' while loading
let batteryText       = '';                    // e.g. "Battery: 85%" or '' if unknown
let _launchSource: LaunchSource | null = null; // null until onLaunchSource fires

// ── Prefetch cache for adjacent chapters ─────────────────────────────────────
const _prefetch = new Map<string, string[]>(); // "book/chapter" → wrapped lines
function pfKey(book: number, ch: number) { return `${book}/${ch}`; }

function prefetchChapter(book: number, ch: number) {
  if (!selLang || !selBible) return;
  const key = pfKey(book, ch);
  if (_prefetch.has(key)) return;
  apiFetch<Verse[]>(`/api/verses/${selLang.dir}/${selBible.file}/${book}/${ch}`)
    .then(vv => {
      _prefetch.set(key, vv.flatMap(v => wrapLines(`${v.verse} ${v.text}`)));
    })
    .catch(() => {}); // silently ignore
}

let _splashImg: number[] | null = null;
async function loadSplashImg(): Promise<number[]> {
  if (!_splashImg) {
    // Send as number[] — recommended by SDK for Dart List<int> compatibility.
    const resp = await fetch(splashImgUrl as string);
    _splashImg = Array.from(new Uint8Array(await resp.arrayBuffer()));
  }
  return _splashImg;
}

// ── Text-page pagination (for text containers) ────────────────────────────────

// Each page holds exactly one screenful: 9 lines × 27px = 243px (content container height).
// No LVGL internal scrolling — tilt and R1 wheel both flip exactly one page at a time.
const TEXT_PAGE_BYTES    = 2000; // generous byte budget (safety only, lines cap takes effect first)
const TEXT_PAGE_MAX_LINES = 9;   // 9 × 27px = 243px = content container height

const _enc = new TextEncoder();
function utf8Bytes(s: string): number { return _enc.encode(s).length; }

function computeTextPageEnd(lines: string[], start: number): number {
  let end = start, bytes = 0;
  while (end < lines.length && end - start < TEXT_PAGE_MAX_LINES) {
    const b = utf8Bytes(lines[end]) + 1; // +1 for the joining '\n'
    if (bytes + b > TEXT_PAGE_BYTES && end > start) break;
    bytes += b;
    end++;
  }
  return end;
}

// Lazily build the page-start index table for a given content array.
// Mutates the `starts` array (passed by reference) — caller owns it.
function ensurePageStart(starts: number[], page: number, lines: string[]): number {
  if (starts.length === 0) starts.push(0);
  while (starts.length <= page) {
    starts.push(computeTextPageEnd(lines, starts[starts.length - 1]));
  }
  return starts[page];
}

function buildTextPage(starts: number[], page: number, lines: string[]): string {
  const start = ensurePageStart(starts, page, lines);
  const end   = computeTextPageEnd(lines, start);
  return lines.slice(start, end).join('\n') || '(no content)';
}

function textPageHasNext(starts: number[], page: number, lines: string[]): boolean {
  return ensurePageStart(starts, page + 1, lines) < lines.length;
}

// ── Display sanitizer ─────────────────────────────────────────────────────────
// The Even G2 font covers Basic Latin, Latin-1 Supplement, Latin Extended-A,
// Cyrillic, and CJK. Latin Extended-B / IPA Extensions are NOT in the font —
// those code points produce blank glyphs (LVGL warning U+199, U+257, etc.).
// This function maps known problematic chars to ASCII equivalents, then uses
// NFD decomposition + combining-mark removal to handle the rest (Vietnamese, etc.).

const GLYPH_APPROX: Record<string, string> = {
  // Latin Extended-B stand-alone letters (no NFD decomposition)
  'ƀ':'b','Ƀ':'B','ƃ':'b','Ƃ':'B','ɓ':'b','Ɓ':'B',
  'ƌ':'d','Ƌ':'D','ɗ':'d','Ɗ':'D',
  'ɛ':'e','Ɛ':'E',
  'ƒ':'f','Ƒ':'F',
  'ɠ':'g','Ɠ':'G',
  'ɦ':'h',
  'ƕ':'hv',
  'ɩ':'i','ɪ':'i',
  'ƙ':'k','Ƙ':'K',
  'ɬ':'l','ɭ':'l',
  'ɱ':'m',
  'ɲ':'n','ɳ':'n','ƞ':'n','Ƞ':'N',
  'ɔ':'o','Ɔ':'O','ɵ':'o','Ɵ':'O',
  'ʀ':'r',
  'ƨ':'s','ʃ':'s',
  'ƫ':'t','ʈ':'t',
  'ʉ':'u','ʊ':'u',
  'ʋ':'v','ʌ':'v',
  'ƿ':'w','Ƿ':'W',
  'ʒ':'z',
  // Symbols that add no readable meaning on the display
  '™':'','®':'','©':'',
};

function sanitizeLabel(text: string): string {
  // 1. Replace known stand-alone glyphs that can't render
  let s = text;
  for (const [from, to] of Object.entries(GLYPH_APPROX)) {
    if (s.includes(from)) s = s.split(from).join(to);
  }
  // 2. NFD + strip combining marks for accented Latin only.
  //    Do NOT touch CJK/Korean — NFD decomposes Hangul syllables into individual
  //    Jamo (U+1100-U+11FF) which the display font can't render as syllables.
  return Array.from(s).map(ch => {
    const cp = ch.codePointAt(0)!;
    if ((cp >= 0x00C0 && cp <= 0x024F) || (cp >= 0x1E00 && cp <= 0x1EFF)) {
      return ch.normalize('NFD').replace(/\p{Mn}/gu, '');
    }
    return ch;
  }).join('');
}

// ── Text wrapping & label helpers ─────────────────────────────────────────────

function truncateLabel(s: string, maxVisual = 50): string {
  let w = 0;
  for (let i = 0; i < s.length; ) {
    const cp = s.codePointAt(i)!;
    w += cp > 0x2E7F ? 2 : 1;
    if (w > maxVisual) return s.slice(0, i) + '…';
    i += cp > 0xFFFF ? 2 : 1;
  }
  return s;
}

// List item inner width: itemWidth(570) - 2 * LVGL_list_item_padding(12) = 546px
const LIST_INNER_W = 546;

function wrapLines(text: string): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    const candidate = cur + ' ' + w;
    if (measureTextWrap(candidate, LIST_INNER_W).lineCount === 1) {
      cur = candidate;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ── Marker helper ─────────────────────────────────────────────────────────────

function withMarker(items: string[], idx: number): string[] {
  return items.map((l, i) => i === idx ? `> ${l}` : `  ${l}`);
}
function plain(items: string[]): string[] { return items; }

// ── Navigation helper: build list items with optional back/more pagination ────

function pagedItems(
  labels: string[], hasPrev: boolean, hasMore: boolean,
  markerLocalIdx = -1,
): string[] {
  const marked = markerLocalIdx >= 0 ? withMarker(labels, markerLocalIdx) : plain(labels);
  return [
    ...(hasPrev ? [s().back]  : []),
    ...marked,
    ...(hasMore ? [s().more]  : []),
  ];
}

// ── Navigation ────────────────────────────────────────────────────────────────

async function fetchVotd() {
  if (!selBible) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const cached = await bridge.getLocalStorage('votd-cache');
    if (cached) {
      const c = JSON.parse(cached) as { date: string; content: string };
      if (c.date === today) { votdContent = c.content; return; }
    }
  } catch {}
  try {
    const data = await apiFetch<{ book: number; chapter: number; verse: number; text: string }>(
      `/api/votd?bible=${encodeURIComponent(selBible.file)}`
    );
    const ref  = `${bookName(data.book)} ${data.chapter}:${data.verse}`;
    const line2 = pxTruncate(data.text, 576);
    votdContent = `${ref}\n${line2}`;
    await bridge.setLocalStorage('votd-cache', JSON.stringify({ date: today, content: votdContent }));
  } catch {
    votdContent = '';
  }
}

function makeSplashSpec(): CreateStartUpPageContainer {
  return new CreateStartUpPageContainer({
    containerTotalNum: 5,
    imageObject: [new ImageContainerProperty({
      containerID: 1, containerName: 'spl-img',
      xPosition: 86, yPosition: 18, width: 100, height: 100,
    })],
    textObject: [
      new TextContainerProperty({
        containerID: 2, containerName: 'spl-ttl',
        xPosition: 282, yPosition: 40, width: 288, height: 52,
        content: `GazeBible\n${_v}`, isEventCapture: 0,
      }),
      new TextContainerProperty({
        containerID: 4, containerName: 'spl-tip',
        xPosition: 0, yPosition: 256, width: 576, height: 27,
        content: (() => {
          const warn = _launchSource === LAUNCH_SOURCE_GLASSES_MENU
            ? 'WARNING: launched from glasses — may freeze!'
            : 'Tip: open from phone first';
          return batteryText ? `${warn}   ${batteryText}` : warn;
        })(),
        isEventCapture: 0,
      }),
      new TextContainerProperty({
        containerID: 5, containerName: 'spl-votd',
        xPosition: 0, yPosition: 194, width: 576, height: 54,
        content: votdContent, isEventCapture: 0,
      }),
    ],
    listObject: [new ListContainerProperty({
      containerID: 3, containerName: 'spl-lst',
      xPosition: 282, yPosition: 100, width: 288, height: 90,
      borderWidth: 0, paddingLength: 2, isEventCapture: 1,
      itemContainer: new ListItemContainerProperty({
        itemCount: 2, itemWidth: 282,
        isItemSelectBorderEn: 1, itemName: ['Start', 'Read license'],
      }),
    })],
  });
}

async function goSplash() {
  screen = 'splash';
  appLicensePage = 0;
  appLicensePageStarts = [];

  await renderContainer(makeSplashSpec());

  const imgData = await loadSplashImg();
  await bridge.updateImageRawData(new ImageRawDataUpdate({
    containerID: 1, containerName: 'spl-img', imageData: imgData,
  }));

  async function splashRebuild() {
    await doRebuild(makeSplashSpec());
    if (_splashImg) {
      await bridge.updateImageRawData(new ImageRawDataUpdate({
        containerID: 1, containerName: 'spl-img', imageData: _splashImg,
      }));
    }
  }

  // Fetch votd and battery in background; rebuild splash when either arrives
  const needsRebuild = { votd: false, battery: false };

  if (!votdContent) {
    fetchVotd().then(async () => {
      needsRebuild.votd = !!votdContent;
      if (screen === 'splash' && (needsRebuild.votd || needsRebuild.battery)) await splashRebuild();
    });
  }

  if (!batteryText) {
    bridge.getDeviceInfo().then(async (info) => {
      const level = info?.status?.batteryLevel;
      if (level != null) {
        batteryText = `Battery: ${level}%`;
        needsRebuild.battery = true;
        if (screen === 'splash') await splashRebuild();
      }
    }).catch(() => {});
  }
}

async function goAppLicense() {
  screen = 'appLicense';
  if (!cachedAppLicense) {
    const paras = licenseText.trim().split(/\n\n+/);
    const lines: string[] = [GITHUB_URL, ''];
    for (let i = 0; i < paras.length; i++) {
      const text = paras[i].replace(/\n/g, ' ').trim();
      lines.push(...wrapLines(text));
      if (i < paras.length - 1) lines.push('');
    }
    lines.push(...ICON_ATTRIBUTION_LINES);
    cachedAppLicense = lines;
    appLicensePageStarts = [];
  }
  const content = buildTextPage(appLicensePageStarts, appLicensePage, cachedAppLicense);
  await showTextReading('License', content);
}

async function goAppLang(isBack = false) {
  screen = 'appLang';
  if (isBack && lastAppLangIdx >= 0) appLangPage = Math.floor(lastAppLangIdx / PAGE_SIZE);
  const pageStart = appLangPage * PAGE_SIZE;
  const pageEnd   = Math.min(pageStart + PAGE_SIZE, SORTED_APP_LANGS.length);
  const pagelangs = SORTED_APP_LANGS.slice(pageStart, pageEnd);
  const hasPrev   = appLangPage > 0;
  const hasMore   = pageEnd < SORTED_APP_LANGS.length;
  const labels    = pagelangs.map(c => langDisplayLabel(c));
  let markerLocal = -1;
  if (isBack && lastAppLangIdx >= 0) {
    markerLocal = lastAppLangIdx - pageStart;
    if (markerLocal < 0 || markerLocal >= pagelangs.length) markerLocal = -1;
  }
  await showList('Language', pagedItems(labels, hasPrev, hasMore, markerLocal));
}

async function goLang(isBack = false) {
  screen = 'lang';
  try {
    if (!cachedLangs) {
      await showLoading();
      const raw = await apiFetch<Language[]>('/api/languages');
      const match = appLang.toUpperCase();
      cachedLangs = [
        ...raw.filter(l => l.code === match),
        ...raw.filter(l => l.code !== match).sort((a, b) => a.name.localeCompare(b.name)),
      ];
    }
    if (isBack && lastLangIdx >= 0) langPage = Math.floor(lastLangIdx / PAGE_SIZE);
    const pageStart = langPage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, cachedLangs.length);
    const pageLangs = cachedLangs.slice(pageStart, pageEnd);
    const hasPrev   = langPage > 0;
    const hasMore   = pageEnd < cachedLangs.length;
    const labels    = pageLangs.map(l => {
      const code = l.code.toLowerCase() as AppLang;
      return APP_LANG_NAMES[code] ? langDisplayLabel(code) : l.name;
    });
    let markerLocal = -1;
    if (isBack && lastLangIdx >= 0) {
      markerLocal = lastLangIdx - pageStart;
      if (markerLocal < 0 || markerLocal >= pageLangs.length) markerLocal = -1;
    }
    await showList(s().bibleLanguage, pagedItems(labels, hasPrev, hasMore, markerLocal));
  } catch (e) {
    cachedLangs = null;
    await showError(`${e}`);
  }
}

async function goBible(isBack = false) {
  screen = 'bible';
  if (!selLang) return goLang();
  try {
    if (!cachedBibles) {
      await showLoading();
      cachedBibles = await apiFetch<Bible[]>(`/api/bibles/${selLang.dir}`);
    }
    const labels = cachedBibles.map(b => {
      const raw = b.year ? `${b.name}  (${b.year})` : b.name;
      return truncateLabel(raw);
    });
    const items = isBack && lastBibleIdx >= 0 ? withMarker(labels, lastBibleIdx) : plain(labels);
    await showList(selLang.name, items);
  } catch (e) {
    cachedBibles = null;
    await showError(`${e}`);
  }
}

async function goTestament(isBack = false) {
  screen = 'testament';
  if (!selBible) return goBible();
  const opts = [s().oldTestament, s().newTestament, s().bookmarks, s().license];
  const items = isBack
    ? withMarker(opts, selTestament === 'OT' ? 0 : 1)
    : plain(opts);
  await showList(selBible.shortname, items);
}

async function goLicense() {
  screen = 'license';
  if (!selLang || !selBible) return goTestament();
  try {
    if (!cachedLicense) {
      await showLoading();
      const data = await apiFetch<{ lines: string[] }>(`/api/license/${selLang.dir}/${selBible.file}`);
      cachedLicense = data.lines.length ? data.lines : ['(no license information)'];
      licensePageStarts = [];
    }
    const content = buildTextPage(licensePageStarts, licensePage, cachedLicense);
    await showTextReading(s().license, content);
  } catch (e) {
    cachedLicense = null;
    await showError(`${e}`);
  }
}

async function goBookmarks() {
  screen = 'bookmarks';
  cachedBookmarks = await loadBookmarks();
  const alreadyBookmarked = !!selBook && cachedBookmarks.some(
    b => b.book.book === selBook!.book && b.chapter === selChapter
  );
  bookmarkHasAdd = !!selBook && !alreadyBookmarked;
  const items: string[] = [];
  if (bookmarkHasAdd) {
    items.push(`+ ${bookName(selBook!.book)} ${selChapter}`);
  }
  items.push(...cachedBookmarks.map(b => b.label));
  if (cachedBookmarks.length > 0) items.push(s().clearBookmarks);
  if (items.length === 0) items.push(s().noBookmarks);
  await showList(s().bookmarks, items);
}

async function goBook(isBack = false) {
  screen = 'book';
  if (!selLang || !selBible) return goTestament();
  try {
    if (!cachedBooks) {
      await showLoading();
      cachedBooks = await apiFetch<BookInfo[]>(`/api/books/${selLang.dir}/${selBible.file}`);
    }
    const filtered = cachedBooks.filter(b => b.testament === selTestament);
    if (filtered.length === 0) {
      const name = selTestament === 'OT' ? s().oldTestament : s().newTestament;
      await showError(`${name}: no books`);
      return;
    }
    if (isBack && lastBookIdx >= 0) bookPage = Math.floor(lastBookIdx / PAGE_SIZE);
    const pageStart = bookPage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, filtered.length);
    const pageBooks = filtered.slice(pageStart, pageEnd);
    const hasPrev   = bookPage > 0;
    const hasMore   = pageEnd < filtered.length;
    const labels    = pageBooks.map(b => bookName(b.book));
    let markerLocal = -1;
    if (isBack && lastBookIdx >= 0) {
      markerLocal = lastBookIdx - pageStart;
      if (markerLocal < 0 || markerLocal >= pageBooks.length) markerLocal = -1;
    }
    await showList(
      selTestament === 'OT' ? s().oldTestament : s().newTestament,
      pagedItems(labels, hasPrev, hasMore, markerLocal),
    );
  } catch (e) {
    cachedBooks = null;
    await showError(`${e}`);
  }
}

async function goChapter(isBack = false) {
  screen = 'chapter';
  if (!selBook) return goBook();
  if (isBack && lastChapterIdx >= 0) chapterPage = Math.floor(lastChapterIdx / PAGE_SIZE);
  const total     = selBook.chapters;
  const pageStart = chapterPage * PAGE_SIZE;
  const pageEnd   = Math.min(pageStart + PAGE_SIZE, total);
  const pageCount = pageEnd - pageStart;
  const hasPrev   = chapterPage > 0;
  const hasMore   = pageEnd < total;
  const labels    = Array.from({ length: pageCount }, (_, i) => String(pageStart + i + 1));
  let markerLocal = -1;
  if (isBack && lastChapterIdx >= 0) {
    markerLocal = lastChapterIdx - pageStart;
    if (markerLocal < 0 || markerLocal >= pageCount) markerLocal = -1;
  }
  await showList(bookName(selBook.book), pagedItems(labels, hasPrev, hasMore, markerLocal));
}

async function goReading() {
  screen = 'reading';
  if (!selLang || !selBible || !selBook) return goChapter();
  _imuRate = null; // force fresh imuControl call on every chapter navigation
  const title = `${bookName(selBook.book)} ${selChapter}`;
  try {
    if (!cachedLines) {
      // Try the prefetch cache before hitting the network
      const key = pfKey(selBook.book, selChapter);
      if (_prefetch.has(key)) {
        cachedLines = _prefetch.get(key)!;
        _prefetch.delete(key);
      } else {
        await showLoading(title);
        const verses = await apiFetch<Verse[]>(
          `/api/verses/${selLang.dir}/${selBible.file}/${selBook.book}/${selChapter}`
        );
        cachedLines = verses.flatMap(v => wrapLines(`${v.verse} ${v.text}`));
      }
      readingPageStarts = [];
    }
    const allLines = cachedLines.length ? cachedLines : ['(no verses)'];
    const content  = buildTextPage(readingPageStarts, readingPage, allLines);
    await showTextReading(title, content);
    await savePosition();

    // Silently prefetch adjacent chapters
    if (selChapter > 1)                  prefetchChapter(selBook.book, selChapter - 1);
    if (selChapter < selBook.chapters)   prefetchChapter(selBook.book, selChapter + 1);
  } catch (e) {
    await showError(`${e}`);
  }
}

// ── IMU power management ──────────────────────────────────────────────────────
// P200 (5 Hz) on reading screens for responsive head-tilt; P1000 (1 Hz)
// elsewhere just for keep-alive. Disabled entirely when glasses are off.

let _imuRate: ImuReportPace | null = null;  // null = IMU off
let _imuWearing = true;                     // assume wearing until told otherwise
let _imuForeground = true;                  // assume foreground until told otherwise

function imuDesiredRate(): ImuReportPace {
  return (screen === 'reading' || screen === 'license' || screen === 'appLicense')
    ? ImuReportPace.P200
    : ImuReportPace.P1000;
}

async function imuSync() {
  const shouldRun = _imuWearing && _imuForeground;
  const desired   = shouldRun ? imuDesiredRate() : null;
  if (desired === _imuRate) return;

  if (desired === null) {
    bridge.imuControl(false).catch(() => {});
    _imuRate = null;
  } else {
    bridge.imuControl(true, desired).catch(() => {});
    _imuRate = desired;
  }
}

// ── Page navigation helpers (shared by scroll events + head tilt) ─────────────

async function pagePrev() {
  if (screen === 'reading'    && readingPage > 0)     { readingPage--;    return goReading(); }
  if (screen === 'license'    && licensePage > 0)     { licensePage--;    return goLicense(); }
  if (screen === 'appLicense' && appLicensePage > 0)  { appLicensePage--; return goAppLicense(); }
}

async function pageNext() {
  if (screen === 'reading' && cachedLines) {
    const allLines = cachedLines.length ? cachedLines : ['(no verses)'];
    if (textPageHasNext(readingPageStarts, readingPage, allLines)) { readingPage++; return goReading(); }
  }
  if (screen === 'license' && cachedLicense) {
    if (textPageHasNext(licensePageStarts, licensePage, cachedLicense)) { licensePage++; return goLicense(); }
  }
  if (screen === 'appLicense' && cachedAppLicense) {
    if (textPageHasNext(appLicensePageStarts, appLicensePage, cachedAppLicense)) { appLicensePage++; return goAppLicense(); }
  }
}

// ── Head-tilt gesture detection (IMU) ─────────────────────────────────────────

const TILT_THRESHOLD   = 0.4;  // tilt axis threshold to trigger (~23° head tilt in g-force)
const TILT_RETURN      = 0.2;  // axis must drop below this to reset (hysteresis)
const TILT_COOLDOWN_MS = 600;  // minimum time between tilt triggers

let _tiltState: 'neutral' | 'left' | 'right' = 'neutral';
let _lastTiltAt = 0;
let _lastImuReceived = Date.now(); // updated on every event; watchdog uses this

// Watchdog: if on a reading screen and no IMU events arrive for 3s, restart the IMU.
// Also resets _imuWearing to true — spurious "not wearing" events from the SDK
// can stop the IMU and prevent the watchdog itself from restarting it.
setInterval(() => {
  const needsImu = screen === 'reading' || screen === 'license' || screen === 'appLicense';
  if (needsImu && _imuForeground && Date.now() - _lastImuReceived > 3000) {
    _imuWearing = true;
    _imuRate = null;
    imuSync();
  }
}, 2000);

function handleImu(x: number, y: number, z: number) {
  _lastImuReceived = Date.now();
  const now = Date.now();

  // Use the axis with the largest absolute value as the tilt signal.
  // This avoids needing to know the exact IMU orientation on the hardware.
  const ax = Math.abs(x), ay = Math.abs(y);
  const tiltVal = ax >= ay ? x : y;

  if (_tiltState === 'neutral') {
    if (now - _lastTiltAt < TILT_COOLDOWN_MS) return;

    if (tiltVal > TILT_THRESHOLD) {
      _tiltState = 'right';
      _lastTiltAt = now;
      pageNext();
    } else if (tiltVal < -TILT_THRESHOLD) {
      _tiltState = 'left';
      _lastTiltAt = now;
      pagePrev();
    }
  } else {
    // Return to neutral when head straightens (hysteresis band)
    if (Math.abs(tiltVal) < TILT_RETURN) {
      _tiltState = 'neutral';
    }
  }
}

// ── Events ────────────────────────────────────────────────────────────────────

let _lastClickAt = 0;
const CLICK_DEBOUNCE_MS = 300;

bridge.onEvenHubEvent(async (event) => {
  // ── Foreground/background lifecycle ──────────────────────────────────────
  // Check both sysEvent and jsonData — same routing issue as IMU events.
  {
    const sysEt = event.sysEvent?.eventType
      ?? OsEventTypeList.fromJson(event.jsonData?.['eventType'] ?? event.jsonData?.['Event_Type']);
    if (sysEt === OsEventTypeList.FOREGROUND_EXIT_EVENT) {
      _imuForeground = false;
      imuSync();
      await savePosition();
      return;
    }
    if (sysEt === OsEventTypeList.FOREGROUND_ENTER_EVENT) {
      _imuForeground = true;
      _imuRate = null; // force fresh imuControl call
      imuSync();
      return;
    }
  }

  // ── IMU data → head-tilt gesture ────────────────────────────────────────────
  // Path 1: SDK normalised the event into sysEvent
  if (event.sysEvent?.eventType === OsEventTypeList.IMU_DATA_REPORT) {
    const imu = event.sysEvent.imuData;
    if (imu) handleImu(imu.x ?? 0, imu.y ?? 0, imu.z ?? 0);
    return;
  }
  // Path 2: event arrived via jsonData without being routed to sysEvent
  {
    const jd = event.jsonData;
    if (jd) {
      const et = jd['eventType'] ?? jd['Event_Type'] ?? jd['event_type'];
      const isImu = et === 8 || et === OsEventTypeList.IMU_DATA_REPORT
        || et === 'IMU_DATA_REPORT' || et === 'imuDataReport';
      if (isImu) {
        const imuRaw = jd['imuData'] ?? jd['IMU_Data'] ?? jd['imu_data'];
        if (imuRaw && typeof imuRaw === 'object') {
          const r = imuRaw as Record<string, unknown>;
          handleImu(Number(r['x'] ?? 0), Number(r['y'] ?? 0), Number(r['z'] ?? 0));
        }
        return;
      }
    }
  }

  // ── Swipes → textEvent (fires for TextContainerProperty with isEventCapture:1) ──
  if (event.textEvent) {
    const et = event.textEvent.eventType;

    if (et === OsEventTypeList.SCROLL_TOP_EVENT)    return pagePrev();
    if (et === OsEventTypeList.SCROLL_BOTTOM_EVENT) return pageNext();
    return;
  }

  // ── Double-tap → sysEvent type 3 ─────────────────────────────────────────
  if (event.sysEvent?.eventType === OsEventTypeList.DOUBLE_CLICK_EVENT) {
    if (screen === 'splash')     { bridge.shutDownPageContainer(1); return; }
    if (screen === 'appLang')    return goSplash();
    if (screen === 'lang')       return goAppLang(true);
    if (screen === 'bible')      return goLang(true);
    if (screen === 'testament')  return goBible(true);
    if (screen === 'book')       return goTestament(true);
    if (screen === 'chapter')    return goBook(true);
    if (screen === 'reading')    return goChapter(true);
    if (screen === 'license')    return goTestament(true);
    if (screen === 'bookmarks')  return goTestament(true);
    if (screen === 'appLicense') return goSplash();
    return;
  }

  // ── Single tap: list item index from listEvent, tap signal from sysEvent ──
  // CLICK_EVENT = 0 is the protobuf default and arrives as undefined on the wire.
  const listEt = event.listEvent?.eventType;
  const sysEt  = event.sysEvent?.eventType;
  const isClick = (t: OsEventTypeList | undefined) =>
    t === undefined || t === OsEventTypeList.CLICK_EVENT;

  if (!event.listEvent && !event.sysEvent) return;
  if (!isClick(listEt) && !isClick(sysEt))  return;

  const now = Date.now();
  if (now - _lastClickAt < CLICK_DEBOUNCE_MS) return;
  _lastClickAt = now;

  const idx = event.listEvent?.currentSelectItemIndex ?? 0;

  if (screen === 'splash') {
    if (idx === 1) return goAppLicense();
    if (splashContinue) return splashContinue();
    return goAppLang();
  }

  // ── Navigation screens — (back...) / (more...) handled by offset math ────

  if (screen === 'appLang') {
    const pageStart = appLangPage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, SORTED_APP_LANGS.length);
    const hasPrev   = appLangPage > 0;
    const hasMore   = pageEnd < SORTED_APP_LANGS.length;
    const offset    = hasPrev ? 1 : 0;
    if (hasPrev && idx === 0)                                { appLangPage--; return goAppLang(); }
    if (hasMore && idx === offset + (pageEnd - pageStart))   { appLangPage++; return goAppLang(); }
    const realIdx   = idx - offset;
    const pagelangs = SORTED_APP_LANGS.slice(pageStart, pageEnd);
    if (realIdx < 0 || realIdx >= pagelangs.length) return;
    lastAppLangIdx = pageStart + realIdx;
    appLang        = pagelangs[realIdx];
    await saveAppLang(appLang);
    cachedLangs = null;
    langPage    = 0;
    lastLangIdx = -1;
    return goLang();
  }

  if (screen === 'lang') {
    if (!cachedLangs) return;
    const pageStart = langPage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, cachedLangs.length);
    const hasPrev   = langPage > 0;
    const hasMore   = pageEnd < cachedLangs.length;
    const offset    = hasPrev ? 1 : 0;
    if (hasPrev && idx === 0)                               { langPage--; return goLang(); }
    if (hasMore && idx === offset + (pageEnd - pageStart))  { langPage++; return goLang(); }
    const realIdx   = idx - offset;
    const pageLangs = cachedLangs.slice(pageStart, pageEnd);
    if (realIdx < 0 || realIdx >= pageLangs.length) return;
    lastLangIdx  = pageStart + realIdx;
    selLang      = pageLangs[realIdx];
    cachedBibles = null;
    cachedBooks  = null;
    _prefetch.clear();
    bookPage     = 0;
    return goBible();
  }

  if (screen === 'bible') {
    if (!cachedBibles || idx >= cachedBibles.length) return;
    lastBibleIdx  = idx;
    selBible      = cachedBibles[idx];
    cachedBooks   = null;
    cachedLicense = null;
    _prefetch.clear();
    bookPage      = 0;
    licensePage   = 0;
    licensePageStarts = [];
    if (selLang) await savePrefs(selLang, selBible);
    return goTestament();
  }

  if (screen === 'testament') {
    if (idx === 2) return goBookmarks();
    if (idx === 3) return goLicense();
    selTestament = idx === 0 ? 'OT' : 'NT';
    bookPage = 0;
    return goBook();
  }

  if (screen === 'book') {
    if (!cachedBooks) return;
    const filtered  = cachedBooks.filter(b => b.testament === selTestament);
    const pageStart = bookPage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, filtered.length);
    const hasPrev   = bookPage > 0;
    const hasMore   = pageEnd < filtered.length;
    const offset    = hasPrev ? 1 : 0;
    if (hasPrev && idx === 0)                               { bookPage--; return goBook(); }
    if (hasMore && idx === offset + (pageEnd - pageStart))  { bookPage++; return goBook(); }
    const realIdx   = idx - offset;
    const pageBooks = filtered.slice(pageStart, pageEnd);
    if (realIdx < 0 || realIdx >= pageBooks.length) return;
    lastBookIdx  = pageStart + realIdx;
    selBook      = pageBooks[realIdx];
    chapterPage  = 0;
    return goChapter();
  }

  if (screen === 'chapter') {
    if (!selBook) return;
    const pageStart = chapterPage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, selBook.chapters);
    const pageCount = pageEnd - pageStart;
    const hasPrev   = chapterPage > 0;
    const hasMore   = pageEnd < selBook.chapters;
    const offset    = hasPrev ? 1 : 0;
    if (hasPrev && idx === 0)                          { chapterPage--; return goChapter(); }
    if (hasMore && idx === offset + pageCount)          { chapterPage++; return goChapter(); }
    const realIdx  = idx - offset;
    if (realIdx < 0 || realIdx >= pageCount) return;
    lastChapterIdx = pageStart + realIdx;
    selChapter     = pageStart + realIdx + 1;
    readingPage    = 0;
    cachedLines    = null;
    readingPageStarts = [];
    return goReading();
  }
  if (screen === 'bookmarks') {
    // Item layout: ["+add"?] [...bookmarks] ["clear"?] | ["no bookmarks"]
    const offset = bookmarkHasAdd ? 1 : 0;

    if (bookmarkHasAdd && idx === 0) {
      const label = `${bookName(selBook!.book)} ${selChapter}`;
      const bm: Bookmark = {
        id: Date.now(), label,
        testament: selTestament, book: selBook!,
        chapter: selChapter, readingPage,
      };
      cachedBookmarks = [bm, ...cachedBookmarks].slice(0, MAX_BOOKMARKS);
      await saveBookmarks(cachedBookmarks);
      bookmarkHasAdd = false;
      return goBookmarks();
    }

    const rel = idx - offset;

    // "Clear all" sits after the bookmark entries
    if (cachedBookmarks.length > 0 && rel === cachedBookmarks.length) {
      cachedBookmarks = [];
      await saveBookmarks([]);
      return goBookmarks();
    }

    // Navigate to a saved bookmark
    if (rel >= 0 && rel < cachedBookmarks.length) {
      const bm = cachedBookmarks[rel];
      selTestament = bm.testament;
      selBook      = bm.book;
      selChapter   = bm.chapter;
      readingPage  = bm.readingPage;
      lastChapterIdx    = selChapter - 1;
      chapterPage       = Math.floor(lastChapterIdx / PAGE_SIZE);
      cachedLines       = null;
      readingPageStarts = [];
      return goReading();
    }
    return;
  }

  if (screen === 'reading' && selBook) {
    if (selChapter < selBook.chapters) {
      selChapter++;
      readingPage = 0;
      cachedLines = null;
      readingPageStarts = [];
      lastChapterIdx = selChapter - 1;
      return goReading();
    }
    // Last chapter of book — advance to first chapter of next book
    if (cachedBooks) {
      const filtered = cachedBooks.filter(b => b.testament === selTestament);
      const curIdx = filtered.findIndex(b => b.book === selBook!.book);
      if (curIdx >= 0 && curIdx < filtered.length - 1) {
        selBook        = filtered[curIdx + 1];
        selChapter     = 1;
        readingPage    = 0;
        cachedLines    = null;
        readingPageStarts = [];
        lastChapterIdx = 0;
        chapterPage    = 0;
        return goReading();
      }
      // Last book of OT — cross into NT
      if (selTestament === 'OT') {
        const ntBooks = cachedBooks.filter(b => b.testament === 'NT');
        if (ntBooks.length > 0) {
          selTestament   = 'NT';
          selBook        = ntBooks[0];
          selChapter     = 1;
          readingPage    = 0;
          cachedLines    = null;
          readingPageStarts = [];
          lastChapterIdx = 0;
          chapterPage    = 0;
          bookPage       = 0;
          return goReading();
        }
      }
    }
    return goChapter(true);
  }

  // license / appLicense: text containers, pagination via textEvent swipes only
});

// ── Startup ───────────────────────────────────────────────────────────────────

let launched = false;

async function start() {
  if (launched) return;
  launched = true;

  // Render splash immediately so the WebView is never blank during startup.
  await renderContainer(makeSplashSpec());

  const [savedLang, savedPrefs, savedPos] = await Promise.all([
    loadAppLang(), loadPrefs(), loadPosition(),
  ]);

  if (savedLang) {
    appLang = savedLang;
    lastAppLangIdx = SORTED_APP_LANGS.indexOf(appLang);
  }

  if (savedPrefs) {
    selLang  = savedPrefs.lang;
    selBible = savedPrefs.bible;

    if (savedPos) {
      selTestament   = savedPos.testament;
      selBook        = savedPos.book;
      selChapter     = savedPos.chapter;
      readingPage    = savedPos.readingPage;
      // Restore chapter-page so back-navigation lands on the right page
      lastChapterIdx = selChapter - 1;
      chapterPage    = Math.floor(lastChapterIdx / PAGE_SIZE);
      splashContinue = () => goReading();
    } else {
      splashContinue = () => goTestament();
    }
  } else if (savedLang) {
    splashContinue = () => goLang();
  } else {
    splashContinue = () => goAppLang();
  }

  // Start IMU (rate depends on current screen) and listen for wearing changes.
  imuSync();

  bridge.onDeviceStatusChanged((status) => {
    const wasWearing = _imuWearing;
    _imuWearing = status.isWearing !== false;  // default to true if unknown
    if (wasWearing !== _imuWearing) imuSync();
  });

  await goSplash();
}

bridge.onLaunchSource((src) => {
  _launchSource = src;
  if (!launched) {
    start();
  } else if (screen === 'splash') {
    // start() already ran — rebuild the tip line with the now-known source
    doRebuild(makeSplashSpec());
  }
});
start();
