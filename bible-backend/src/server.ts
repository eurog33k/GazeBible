import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// Single combined SQLite database — the only data source.
const DB_PATH =
  process.env.BIBLE_DB ??
  path.join(__dirname, '../../bible/bibles_combined.sqlite');

const db = new Database(DB_PATH, { readonly: true });

app.use(cors());
app.use(express.json());

// ── Request logger ────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  const t0 = Date.now();
  console.log(`[api] → ${req.method} ${req.url}`);
  res.on('finish', () => {
    const ms = Date.now() - t0;
    console.log(`[api] ← ${res.statusCode} ${req.url} (${ms}ms)`);
  });
  next();
});

// ── Book name mapping (standard English names, 1-66) ─────────────────────────

const BOOK_NAMES: Record<number, string> = {
  1: 'Genesis', 2: 'Exodus', 3: 'Leviticus', 4: 'Numbers', 5: 'Deuteronomy',
  6: 'Joshua', 7: 'Judges', 8: 'Ruth', 9: '1 Samuel', 10: '2 Samuel',
  11: '1 Kings', 12: '2 Kings', 13: '1 Chronicles', 14: '2 Chronicles',
  15: 'Ezra', 16: 'Nehemiah', 17: 'Esther', 18: 'Job', 19: 'Psalms',
  20: 'Proverbs', 21: 'Ecclesiastes', 22: 'Song of Solomon', 23: 'Isaiah',
  24: 'Jeremiah', 25: 'Lamentations', 26: 'Ezekiel', 27: 'Daniel',
  28: 'Hosea', 29: 'Joel', 30: 'Amos', 31: 'Obadiah', 32: 'Jonah',
  33: 'Micah', 34: 'Nahum', 35: 'Habakkuk', 36: 'Zephaniah',
  37: 'Haggai', 38: 'Zechariah', 39: 'Malachi',
  40: 'Matthew', 41: 'Mark', 42: 'Luke', 43: 'John', 44: 'Acts',
  45: 'Romans', 46: '1 Corinthians', 47: '2 Corinthians', 48: 'Galatians',
  49: 'Ephesians', 50: 'Philippians', 51: 'Colossians',
  52: '1 Thessalonians', 53: '2 Thessalonians', 54: '1 Timothy',
  55: '2 Timothy', 56: 'Titus', 57: 'Philemon', 58: 'Hebrews',
  59: 'James', 60: '1 Peter', 61: '2 Peter', 62: '1 John',
  63: '2 John', 64: '3 John', 65: 'Jude', 66: 'Revelation',
};

// ── Text helpers ──────────────────────────────────────────────────────────────

function wrapText(text: string, maxLen: number): string[] {
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

function cleanDescription(html: string): string[] {
  let text = html.replace(/\r\n?/g, '\n');
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(?:p|div|h[1-6]|li|tr|td|th|blockquote|pre)>/gi, '\n');
  text = text.replace(/<(?:p|div|h[1-6]|blockquote|pre|ul|ol|tr)[^>]*>/gi, '\n');
  text = text.replace(/<li[^>]*>/gi, '\n• ');
  text = text.replace(/<[^>]+>/g, '');
  text = text
    .replace(/&amp;/gi,    '&')
    .replace(/&lt;/gi,     '<')
    .replace(/&gt;/gi,     '>')
    .replace(/&nbsp;/gi,   ' ')
    .replace(/&quot;/gi,   '"')
    .replace(/&apos;/gi,   "'")
    .replace(/&copy;/gi,   '©')
    .replace(/&reg;/gi,    '®')
    .replace(/&trade;/gi,  '™')
    .replace(/&mdash;/gi,  '—')
    .replace(/&ndash;/gi,  '–')
    .replace(/&lsquo;/gi,  '\u2018')
    .replace(/&rsquo;/gi,  '\u2019')
    .replace(/&ldquo;/gi,  '\u201C')
    .replace(/&rdquo;/gi,  '\u201D')
    .replace(/&Oslash;/g,  'Ø')
    .replace(/&oslash;/g,  'ø')
    .replace(/&#(\d+);/g,  (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const rawLines = text.split('\n').map(l => l.trim());
  const collapsed: string[] = [];
  let prevBlank = false;
  for (const line of rawLines) {
    const blank = line === '';
    if (blank && prevBlank) continue;
    collapsed.push(line);
    prevBlank = blank;
  }
  while (collapsed.length > 0 && collapsed[0] === '') collapsed.shift();
  while (collapsed.length > 0 && collapsed[collapsed.length - 1] === '') collapsed.pop();
  const result: string[] = [];
  for (const line of collapsed) {
    if (line === '') { result.push(''); continue; }
    result.push(...wrapText(line, 53));
  }
  return result;
}

function cleanText(text: string): string {
  return text
    .replace(/¶\s*/g, '')
    .replace(/[‹›«»]/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\([a-zA-Z]\)/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Derive a human-readable language name from a lang_dir value such as
// "JA-Japanese" → "Japanese", "HT-Haitian,_Haitian_Creole" → "Haitian, Haitian Creole"
function langNameFromDir(langDir: string): string {
  return langDir.split('-').slice(1).join(' ').replace(/_/g, ' ');
}

// ── /api/log (frontend debug) ─────────────────────────────────────────────────

app.post('/api/log', (req, res) => {
  const { level = 'log', msg } = req.body as { level?: string; msg?: string };
  console.log(`[front] ${level.toUpperCase()} ${msg}`);
  res.json({ ok: true });
});

// ── /api/languages ────────────────────────────────────────────────────────────

app.get('/api/languages', (_req, res) => {
  const rows = db.prepare(
    'SELECT DISTINCT lang_short, lang_dir FROM versions ORDER BY lang_dir'
  ).all() as { lang_short: string; lang_dir: string }[];

  const languages = rows.map(r => ({
    code: r.lang_short.toUpperCase(),
    name: langNameFromDir(r.lang_dir),
    dir:  r.lang_dir,
  }));

  res.json(languages);
});

// ── /api/bibles/:langDir ──────────────────────────────────────────────────────

app.get('/api/bibles/:langDir', (req, res) => {
  const { langDir } = req.params;
  const rows = db.prepare(
    'SELECT module, name, shortname, year FROM versions WHERE lang_dir = ? ORDER BY name'
  ).all(langDir) as { module: string; name: string; shortname: string; year: string }[];

  if (rows.length === 0) return void res.status(404).json({ error: 'Language not found' });

  res.json(rows.map(r => ({
    file:      r.module,
    name:      r.name      ?? r.module,
    shortname: r.shortname ?? r.module.toUpperCase(),
    year:      r.year      ?? '',
  })));
});

// ── /api/books/:langDir/:bibleFile ────────────────────────────────────────────

app.get('/api/books/:langDir/:bibleFile', (req, res) => {
  const { bibleFile } = req.params;
  try {
    const rows = db.prepare(`
      SELECT ve.book, MAX(ve.chapter) AS chapters
      FROM verses ve
      JOIN versions v ON v.id = ve.version_id
      WHERE v.module = ?
      GROUP BY ve.book
      ORDER BY ve.book
    `).all(bibleFile) as { book: number; chapters: number }[];

    if (rows.length === 0) return void res.status(404).json({ error: 'Bible not found' });

    res.json(rows.map(r => ({
      book:      r.book,
      name:      BOOK_NAMES[r.book] ?? `Book ${r.book}`,
      chapters:  r.chapters,
      testament: r.book <= 39 ? 'OT' : 'NT',
    })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── /api/verses/:langDir/:bibleFile/:book/:chapter ────────────────────────────

app.get('/api/verses/:langDir/:bibleFile/:book/:chapter', (req, res) => {
  const { bibleFile } = req.params;
  const book    = Number(req.params.book);
  const chapter = Number(req.params.chapter);

  if (isNaN(book) || isNaN(chapter)) return void res.status(400).json({ error: 'Invalid book/chapter' });

  try {
    const rows = db.prepare(`
      SELECT ve.verse, ve.text
      FROM verses ve
      JOIN versions v ON v.id = ve.version_id
      WHERE v.module = ? AND ve.book = ? AND ve.chapter = ?
      ORDER BY ve.verse
    `).all(bibleFile, book, chapter) as { verse: number; text: string }[];

    res.json(rows.map(r => ({ verse: r.verse, text: cleanText(r.text) })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── /api/license/:langDir/:bibleFile ─────────────────────────────────────────

app.get('/api/license/:langDir/:bibleFile', (req, res) => {
  const { bibleFile } = req.params;
  try {
    const row = db.prepare(
      'SELECT description, copyright_statement FROM versions WHERE module = ?'
    ).get(bibleFile) as { description: string; copyright_statement: string } | undefined;

    if (!row) return void res.json({ lines: ['(no license information)'] });

    const lines: string[] = [];

    if (row.copyright_statement) {
      lines.push(...wrapText(row.copyright_statement.trim(), 53));
    }

    if (row.description) {
      const descLines = cleanDescription(row.description);
      if (descLines.length > 0) {
        if (lines.length > 0) lines.push('');
        lines.push(...descLines);
      }
    }

    if (lines.length === 0) return void res.json({ lines: ['(no license information)'] });
    res.json({ lines });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Bible API running on http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
