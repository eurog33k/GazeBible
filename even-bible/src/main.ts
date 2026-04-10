import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer, RebuildPageContainer,
  TextContainerProperty, ListContainerProperty, ListItemContainerProperty,
  StartUpPageCreateResult,
} from '@evenrealities/even_hub_sdk';
import { UI, APP_LANG_NAMES, APP_LANG_ENGLISH_NAMES, APP_LANGS, type AppLang } from './i18n';
import pkg from '../package.json';

const APP_VERSION: string = (pkg as { version: string }).version;

// Splash screen — title + version
const _v = `v ${APP_VERSION}`;
const SPLASH_LINES: string[] = [
  '-----------',
  'GazeBible',
  _v,
  '-----------',
  '',
  'click to start',
];

// For non-Latin scripts sort by English name, otherwise by native name.
function langSortKey(lang: AppLang): string {
  const native = APP_LANG_NAMES[lang];
  return /[^\u0000-\u024F]/.test(native) ? APP_LANG_ENGLISH_NAMES[lang] : native;
}

// Display as "Native (English)" — omit suffix when the two names are identical.
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

// ── SDK bridge (resolved before any other code runs) ─────────────────────────

const bridge = await waitForEvenAppBridge();
let sdkReady = false;

// Signal that the bridge resolved — visible in backend terminal via /api/log
fetch('/api/log', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ level: 'log', msg: '[start] bridge ready' }),
}).catch(() => {});

// ── API ───────────────────────────────────────────────────────────────────────

// In dev: Vite middleware plugin proxies /api → localhost:3001.
// In prod: set VITE_API_URL to the full backend URL, e.g. http://192.168.1.42:3001
const API = import.meta.env.DEV
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined) ?? '');

function dbg(msg: string, level: 'log' | 'warn' | 'error' = 'log') {
  console[level](msg);
  fetch(`${API}/api/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ level, msg }),
  }).catch(() => {});
}

async function apiFetch<T>(path: string, attempt = 0): Promise<T> {
  const url = `${API}${path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000); // 10 s timeout
  const t0 = Date.now();
  dbg(`[fetch] → ${url}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`);
  try {
    const res = await fetch(url, { signal: controller.signal });
    const ms = Date.now() - t0;
    dbg(`[fetch] ← ${res.status} ${url} (${ms}ms)`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as T;
    dbg(`[fetch] parsed ${Array.isArray(data) ? (data as unknown[]).length + ' items' : typeof data} from ${path}`);
    return data;
  } catch (e) {
    const ms = Date.now() - t0;
    dbg(`[fetch] ✗ ${url} (${ms}ms) — ${e}`, 'error');
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

// ── Persistence — uses bridge storage (survives app restarts) ─────────────────

interface Prefs { lang: Language; bible: Bible }

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

// ── Render primitives ─────────────────────────────────────────────────────────


function makeListSpec(
  titleName: string, title: string, listName: string,
  items: string[], selectable: boolean, padding: number,
): CreateStartUpPageContainer {
  return new CreateStartUpPageContainer({
    containerTotalNum: 2,
    textObject: [new TextContainerProperty({
      containerID: 1, containerName: titleName,
      xPosition: 0, yPosition: 2, width: 576, height: 32,
      content: title, isEventCapture: 0,
    })],
    listObject: [new ListContainerProperty({
      containerID: 2, containerName: listName,
      xPosition: 0, yPosition: 36, width: 576, height: 242,
      borderWidth: 0, paddingLength: padding, isEventCapture: 1,
      itemContainer: new ListItemContainerProperty({
        itemCount: items.length, itemWidth: 570,
        isItemSelectBorderEn: selectable ? 1 : 0, itemName: items,
      }),
    })],
  });
}

async function doRebuild(spec: CreateStartUpPageContainer) {
  const n = spec.listObject?.[0]?.itemContainer?.itemCount ?? 0;
  dbg(`[render] rebuildPageContainer items=${n}`);
  const ok = await bridge.rebuildPageContainer(new RebuildPageContainer({
    containerTotalNum: spec.containerTotalNum,
    textObject: spec.textObject,
    listObject: spec.listObject,
  }));
  dbg(`[render] rebuildPageContainer ok=${ok}`);
  if (!ok) dbg(`[render] rebuildPageContainer failed (${n} items)`, 'warn');
}

async function renderContainer(spec: CreateStartUpPageContainer) {
  if (!sdkReady) {
    dbg('[render] createStartUpPageContainer');
    const result = await bridge.createStartUpPageContainer(spec);
    dbg(`[render] createStartUpPageContainer result=${result} (0=ok,1=already-exists,2=oversize,3=oom)`);
    if (result === StartUpPageCreateResult.success) {
      sdkReady = true;
    } else if (result === StartUpPageCreateResult.invalid) {
      // Container still alive from previous session — go straight to rebuild
      dbg('[render] container exists from previous session, using rebuildPageContainer', 'warn');
      sdkReady = true;
      await doRebuild(spec);
    } else {
      throw new Error(`createStartUpPageContainer failed: ${result}`);
    }
  } else {
    await doRebuild(spec);
  }
}

async function showList(title: string, items: string[]) {
  await renderContainer(makeListSpec('ttl', title, 'lst', items, true, 2));
}

async function showReading(title: string, items: string[]) {
  await renderContainer(makeListSpec('rtl', title, 'rlst', items, false, 1));
}

// Loading shows text in list body (not just title) so screen is never blank
async function showLoading(msg?: string) {
  const text = msg ?? s().loading;
  await showList(text, [text]);
}

// Error shows in list body; double-click goes back
async function showError(msg: string) {
  // Trim to avoid any SDK length issues
  await showList('!', [msg.slice(0, 48), '', '< double-click to go back']);
}

// ── App language ──────────────────────────────────────────────────────────────

let appLang: AppLang = 'en';
function s() { return UI[appLang]; }
function bookName(num: number) { return s().books[num] ?? `Book ${num}`; }

// ── State ─────────────────────────────────────────────────────────────────────

type Screen = 'splash' | 'appLang' | 'lang' | 'bible' | 'testament' | 'book' | 'chapter' | 'reading' | 'license';
let screen: Screen = 'splash';
let splashContinue: (() => Promise<void>) | null = null;

const PAGE_SIZE = 15;

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
let cachedLines:   string[] | null = null;
let cachedLicense: string[] | null = null;

let lastAppLangIdx = -1;
let lastLangIdx    = -1;
let lastBibleIdx   = -1;
let lastBookIdx    = -1;
let lastChapterIdx = -1;

let cachedLangs:  Language[] | null = null;
let cachedBibles: Bible[]    | null = null;
let cachedBooks:  BookInfo[] | null = null;

// ── Marker helper ─────────────────────────────────────────────────────────────

function withMarker(items: string[], idx: number): string[] {
  return items.map((l, i) => i === idx ? `> ${l}` : `  ${l}`);
}
function plain(items: string[]): string[] {
  return items;
}

// ── Navigation ────────────────────────────────────────────────────────────────

async function goSplash() {
  screen = 'splash';
  await showReading('', SPLASH_LINES);
}

async function goAppLang(isBack = false) {
  screen = 'appLang';
  if (isBack && lastAppLangIdx >= 0) appLangPage = Math.floor(lastAppLangIdx / PAGE_SIZE);
  const pageStart  = appLangPage * PAGE_SIZE;
  const pageEnd    = Math.min(pageStart + PAGE_SIZE, SORTED_APP_LANGS.length);
  const pagelangs  = SORTED_APP_LANGS.slice(pageStart, pageEnd);
  const hasMore    = pageEnd < SORTED_APP_LANGS.length;
  const hasPrev    = appLangPage > 0;
  const offset     = hasPrev ? 1 : 0;
  const labels     = pagelangs.map(c => langDisplayLabel(c));
  if (hasPrev) labels.unshift('(back...)');
  if (hasMore) labels.push('(more...)');
  let items: string[];
  if (isBack && lastAppLangIdx >= 0) {
    const localIdx = lastAppLangIdx - pageStart + offset;
    items = localIdx >= 0 && localIdx < pagelangs.length + offset ? withMarker(labels, localIdx) : plain(labels);
  } else {
    items = plain(labels);
  }
  await showList('Language', items);
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
    const hasMore   = pageEnd < cachedLangs.length;
    const hasPrev   = langPage > 0;
    const offset    = hasPrev ? 1 : 0;
    const labels    = pageLangs.map(l => {
      const code = l.code.toLowerCase() as AppLang;
      return APP_LANG_NAMES[code] ? langDisplayLabel(code) : l.name;
    });
    if (hasPrev) labels.unshift('(back...)');
    if (hasMore) labels.push('(more...)');
    let items: string[];
    if (isBack && lastLangIdx >= 0) {
      const localIdx = lastLangIdx - pageStart + offset;
      items = localIdx >= 0 && localIdx < pageLangs.length + offset ? withMarker(labels, localIdx) : plain(labels);
    } else {
      items = plain(labels);
    }
    await showList(s().bibleLanguage, items);
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
    const labels = cachedBibles.map(b => b.year ? `${b.name}  (${b.year})` : b.name);
    const items  = isBack && lastBibleIdx >= 0 ? withMarker(labels, lastBibleIdx) : plain(labels);
    await showList(selLang.name, items);
  } catch (e) {
    cachedBibles = null;
    await showError(`${e}`);
  }
}

async function goTestament(isBack = false) {
  screen = 'testament';
  if (!selBible) return goBible();
  const opts = [s().oldTestament, s().newTestament, s().license];
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
    }
    const pageStart = licensePage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, cachedLicense.length);
    const hasMore   = pageEnd < cachedLicense.length;
    const hasPrev   = licensePage > 0;
    const pageLines = cachedLicense.slice(pageStart, pageEnd);
    if (hasPrev) pageLines.unshift('(back...)');
    if (hasMore) pageLines.push('(more...)');
    await showReading(s().license, pageLines);
  } catch (e) {
    cachedLicense = null;
    await showError(`${e}`);
  }
}

async function goBook(isBack = false) {
  screen = 'book';
  if (!selLang || !selBible) return goTestament();
  try {
    if (!cachedBooks) {
      dbg('[goBook] showing loading');
      await showLoading();
      dbg('[goBook] fetching books');
      cachedBooks = await apiFetch<BookInfo[]>(`/api/books/${selLang.dir}/${selBible.file}`);
      dbg(`[goBook] got ${cachedBooks.length} books`);
    }
    const filtered = cachedBooks.filter(b => b.testament === selTestament);

    // Restore the correct page when going back
    if (isBack && lastBookIdx >= 0) bookPage = Math.floor(lastBookIdx / PAGE_SIZE);

    const pageStart = bookPage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, filtered.length);
    const pageBooks = filtered.slice(pageStart, pageEnd);
    const hasMore   = pageEnd < filtered.length;

    const hasPrev  = bookPage > 0;
    const offset   = hasPrev ? 1 : 0;
    const labels = pageBooks.map(b => bookName(b.book));
    if (hasPrev) labels.unshift('(back...)');
    if (hasMore) labels.push('(more...)');

    let items: string[];
    if (isBack && lastBookIdx >= 0) {
      const localIdx = lastBookIdx - pageStart + offset;
      items = localIdx >= 0 && localIdx < pageBooks.length + offset ? withMarker(labels, localIdx) : plain(labels);
    } else {
      items = plain(labels);
    }

    dbg(`[goBook] page=${bookPage} showing=${pageBooks.length}${hasMore ? '+more' : ''} items=${items.length}`);
    await showList(selTestament === 'OT' ? s().oldTestament : s().newTestament, items);
    dbg('[goBook] showList done');
  } catch (e) {
    dbg(`[goBook] ERROR: ${e}`, 'error');
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
  const hasMore   = pageEnd < total;
  const hasPrev   = chapterPage > 0;
  const offset    = hasPrev ? 1 : 0;
  const pageCount = pageEnd - pageStart;
  const labels    = Array.from({ length: pageCount }, (_, i) => String(pageStart + i + 1));
  if (hasPrev) labels.unshift('(back...)');
  if (hasMore) labels.push('(more...)');
  let items: string[];
  if (isBack && lastChapterIdx >= 0) {
    const localIdx = lastChapterIdx - pageStart + offset;
    items = localIdx >= 0 && localIdx < pageCount + offset ? withMarker(labels, localIdx) : plain(labels);
  } else {
    items = plain(labels);
  }
  await showList(bookName(selBook.book), items);
}

async function goReading() {
  screen = 'reading';
  if (!selLang || !selBible || !selBook) return goChapter();
  const title = `${bookName(selBook.book)} ${selChapter}`;
  try {
    if (!cachedLines) {
      await showLoading(title);
      const verses = await apiFetch<Verse[]>(
        `/api/verses/${selLang.dir}/${selBible.file}/${selBook.book}/${selChapter}`
      );
      cachedLines = verses.flatMap(v => wrapLines(`${v.verse} ${v.text}`));
    }
    const allLines  = cachedLines.length ? cachedLines : ['(no verses)'];
    const pageStart = readingPage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, allLines.length);
    const hasMore   = pageEnd < allLines.length;
    const hasPrev   = readingPage > 0;
    const pageLines = allLines.slice(pageStart, pageEnd);
    if (hasPrev) pageLines.unshift('(back...)');
    if (hasMore) pageLines.push('(more...)');
    await showReading(title, pageLines);
  } catch (e) {
    await showError(`${e}`);
  }
}

// ── Text wrapping ─────────────────────────────────────────────────────────────

function wrapLines(text: string, maxLen = 53): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) { cur = w; continue; }
    if ((cur + ' ' + w).length <= maxLen) { cur += ' ' + w; }
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ── Events ────────────────────────────────────────────────────────────────────

bridge.onEvenHubEvent(async (event) => {
  const d: Record<string, unknown> =
    (event.listEvent as Record<string, unknown> | undefined) ??
    (event.jsonData  as Record<string, unknown> | undefined) ?? {};
  if (Object.keys(d).length === 0) return;

  const type: number =
    (d.eventType as number | undefined) ?? (d.eventtype as number | undefined) ?? 0;
  const idx: number =
    (d.currentSelectItemIndex  as number | undefined) ??
    (d.currentselecteditemindex as number | undefined) ?? 0;

  if (type === 3) { // double-click = back
    if (screen === 'appLang')   return goSplash();
    if (screen === 'lang')      return goAppLang(true);
    if (screen === 'bible')     return goLang(true);
    if (screen === 'testament') return goBible(true);
    if (screen === 'book')      return goTestament(true);
    if (screen === 'chapter')   return goBook(true);
    if (screen === 'reading')   return goChapter(true);
    if (screen === 'license')   return goTestament(true);
    return;
  }

  if (type === 1 || type === 2) return; // scroll — handled by list widget natively
  if (type !== 0) return;               // ignore anything else

  if (screen === 'splash') {
    if (splashContinue) return splashContinue();
    return goAppLang();
  }

  if (screen === 'appLang') {
    const pageStart   = appLangPage * PAGE_SIZE;
    const pageEnd     = Math.min(pageStart + PAGE_SIZE, SORTED_APP_LANGS.length);
    const pagelangs   = SORTED_APP_LANGS.slice(pageStart, pageEnd);
    const hasMore     = pageEnd < SORTED_APP_LANGS.length;
    const hasPrev     = appLangPage > 0;
    const offset      = hasPrev ? 1 : 0;
    if (hasPrev && idx === 0) { appLangPage--; return goAppLang(); }
    if (hasMore && idx === pagelangs.length + offset) { appLangPage++; return goAppLang(); }
    const realIdx = idx - offset;
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
    const pageLangs = cachedLangs.slice(pageStart, pageEnd);
    const hasMore   = pageEnd < cachedLangs.length;
    const hasPrev   = langPage > 0;
    const offset    = hasPrev ? 1 : 0;
    if (hasPrev && idx === 0) { langPage--; return goLang(); }
    if (hasMore && idx === pageLangs.length + offset) { langPage++; return goLang(); }
    const realIdx = idx - offset;
    if (realIdx < 0 || realIdx >= pageLangs.length) return;
    lastLangIdx  = pageStart + realIdx;
    selLang      = pageLangs[realIdx];
    cachedBibles = null;
    cachedBooks  = null;
    bookPage     = 0;
    return goBible();
  }

  if (screen === 'bible') {
    if (!cachedBibles || idx >= cachedBibles.length) return;
    lastBibleIdx  = idx;
    selBible      = cachedBibles[idx];
    cachedBooks   = null;
    cachedLicense = null;
    bookPage      = 0;
    licensePage   = 0;
    if (selLang) await savePrefs(selLang, selBible);
    return goTestament();
  }

  if (screen === 'testament') {
    if (idx === 2) return goLicense();
    selTestament = idx === 0 ? 'OT' : 'NT';
    bookPage = 0;
    return goBook();
  }

  if (screen === 'book') {
    if (!cachedBooks) return;
    const filtered  = cachedBooks.filter(b => b.testament === selTestament);
    const pageStart = bookPage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, filtered.length);
    const pageBooks = filtered.slice(pageStart, pageEnd);
    const hasMore   = pageEnd < filtered.length;
    const hasPrev   = bookPage > 0;
    const offset    = hasPrev ? 1 : 0;
    if (hasPrev && idx === 0) { bookPage--; return goBook(); }
    if (hasMore && idx === pageBooks.length + offset) { bookPage++; return goBook(); }
    const realIdx = idx - offset;
    if (realIdx < 0 || realIdx >= pageBooks.length) return;
    lastBookIdx  = pageStart + realIdx;
    selBook      = pageBooks[realIdx];
    chapterPage  = 0;
    return goChapter();
  }

  if (screen === 'chapter') {
    if (!selBook) return;
    const pageStart    = chapterPage * PAGE_SIZE;
    const pageEnd      = Math.min(pageStart + PAGE_SIZE, selBook.chapters);
    const pageCount    = pageEnd - pageStart;
    const hasMore      = pageEnd < selBook.chapters;
    const hasPrev      = chapterPage > 0;
    const offset       = hasPrev ? 1 : 0;
    if (hasPrev && idx === 0) { chapterPage--; return goChapter(); }
    if (hasMore && idx === pageCount + offset) { chapterPage++; return goChapter(); }
    const realIdx = idx - offset;
    if (realIdx < 0 || realIdx >= pageCount) return;
    lastChapterIdx = pageStart + realIdx;
    selChapter     = pageStart + realIdx + 1;
    readingPage    = 0;
    cachedLines    = null;
    return goReading();
  }

  if (screen === 'reading') {
    if (!cachedLines) return;
    const allLines  = cachedLines.length ? cachedLines : ['(no verses)'];
    const pageStart = readingPage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, allLines.length);
    const hasMore   = pageEnd < allLines.length;
    const hasPrev   = readingPage > 0;
    const pageCount = pageEnd - pageStart;
    const offset    = hasPrev ? 1 : 0;
    if (hasPrev && idx === 0) { readingPage--; return goReading(); }
    if (hasMore && idx === pageCount + offset) { readingPage++; return goReading(); }
  }

  if (screen === 'license') {
    if (!cachedLicense) return;
    const pageStart = licensePage * PAGE_SIZE;
    const pageEnd   = Math.min(pageStart + PAGE_SIZE, cachedLicense.length);
    const hasMore   = pageEnd < cachedLicense.length;
    const hasPrev   = licensePage > 0;
    const pageCount = pageEnd - pageStart;
    const offset    = hasPrev ? 1 : 0;
    if (hasPrev && idx === 0) { licensePage--; return goLicense(); }
    if (hasMore && idx === pageCount + offset) { licensePage++; return goLicense(); }
  }
});

// ── Startup ───────────────────────────────────────────────────────────────────

let launched = false;

async function start() {
  if (launched) return;
  launched = true;

  // Load persisted preferences from bridge storage (survives app restarts)
  const [savedLang, savedPrefs] = await Promise.all([loadAppLang(), loadPrefs()]);

  if (savedLang) {
    appLang = savedLang;
    lastAppLangIdx = SORTED_APP_LANGS.indexOf(appLang);
  }

  if (savedPrefs) {
    selLang  = savedPrefs.lang;
    selBible = savedPrefs.bible;
    splashContinue = () => goTestament();
  } else if (savedLang) {
    splashContinue = () => goLang();
  } else {
    splashContinue = () => goAppLang();
  }

  await goSplash();
}

bridge.onLaunchSource(() => start());
start();
