import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT ?? 3001);

// Path to the bibles directory — override with BIBLES_DIR env var
const BIBLES_DIR =
  process.env.BIBLES_DIR ??
  path.join(__dirname, '../../bible/bibles_sqlite_6.0');

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

// ── DB cache ──────────────────────────────────────────────────────────────────

const dbCache = new Map<string, Database.Database>();

function getDb(langDir: string, bibleFile: string): Database.Database {
  const key = `${langDir}/${bibleFile}`;
  if (!dbCache.has(key)) {
    const filePath = path.join(BIBLES_DIR, langDir, `${bibleFile}.sqlite`);
    if (!fs.existsSync(filePath)) throw new Error(`Bible not found: ${filePath}`);
    dbCache.set(key, new Database(filePath, { readonly: true }));
  }
  return dbCache.get(key)!;
}

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

// ── Text cleaner ──────────────────────────────────────────────────────────────

function cleanText(text: string): string {
  return text
    .replace(/¶\s*/g, '')              // paragraph marks
    .replace(/[‹›«»]/g, '')            // decorative angle quotes
    .replace(/\{[^}]*\}/g, '')         // Strong's numbers: {H1234} {(H8804)}
    .replace(/\([a-zA-Z]\)/g, '')      // editorial markers: (b) (a)
    .replace(/<[^>]+>/g, '')           // HTML tags
    .replace(/\s{2,}/g, ' ')           // extra whitespace
    .trim();
}

// ── /api/log (frontend debug) ─────────────────────────────────────────────────

app.post('/api/log', (req, res) => {
  const { level = 'log', msg } = req.body as { level?: string; msg?: string };
  console.log(`[front] ${level.toUpperCase()} ${msg}`);
  res.json({ ok: true });
});

// ── /api/languages ────────────────────────────────────────────────────────────

app.get('/api/languages', (_req, res) => {
  const dirs = fs.readdirSync(BIBLES_DIR).filter(d => {
    const full = path.join(BIBLES_DIR, d);
    return fs.statSync(full).isDirectory() && d !== 'readme.txt';
  });

  const languages = dirs.map(dir => {
    const [code, ...nameParts] = dir.split('-');
    return {
      code,
      name: nameParts.join('-').replace(/_/g, ', '),
      dir,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  res.json(languages);
});

// ── /api/bibles/:langDir ──────────────────────────────────────────────────────

app.get('/api/bibles/:langDir', (req, res) => {
  const { langDir } = req.params;
  const langPath = path.join(BIBLES_DIR, langDir);

  if (!fs.existsSync(langPath)) return void res.status(404).json({ error: 'Language not found' });

  const files = fs.readdirSync(langPath).filter(f => f.endsWith('.sqlite'));
  const bibles = files.map(file => {
    const bibleFile = file.replace('.sqlite', '');
    try {
      const db = getDb(langDir, bibleFile);
      const meta = db.prepare('SELECT field, value FROM meta WHERE field IN (\'name\',\'shortname\',\'year\')').all() as { field: string; value: string }[];
      const m: Record<string, string> = {};
      for (const row of meta) m[row.field] = row.value;
      return { file: bibleFile, name: m.name ?? bibleFile, shortname: m.shortname ?? bibleFile.toUpperCase(), year: m.year ?? '' };
    } catch {
      return { file: bibleFile, name: bibleFile, shortname: bibleFile.toUpperCase(), year: '' };
    }
  }).sort((a, b) => a.name.localeCompare(b.name));

  res.json(bibles);
});

// ── /api/books/:langDir/:bibleFile ────────────────────────────────────────────

app.get('/api/books/:langDir/:bibleFile', (req, res) => {
  const { langDir, bibleFile } = req.params;
  try {
    const db = getDb(langDir, bibleFile);
    const rows = db.prepare(
      'SELECT book, MAX(chapter) as chapters FROM verses GROUP BY book ORDER BY book'
    ).all() as { book: number; chapters: number }[];

    const books = rows.map(r => ({
      book: r.book,
      name: BOOK_NAMES[r.book] ?? `Book ${r.book}`,
      chapters: r.chapters,
      testament: r.book <= 39 ? 'OT' : 'NT',
    }));

    res.json(books);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── /api/verses/:langDir/:bibleFile/:book/:chapter ────────────────────────────

app.get('/api/verses/:langDir/:bibleFile/:book/:chapter', (req, res) => {
  const { langDir, bibleFile } = req.params;
  const book = Number(req.params.book);
  const chapter = Number(req.params.chapter);

  if (isNaN(book) || isNaN(chapter)) return void res.status(400).json({ error: 'Invalid book/chapter' });

  try {
    const db = getDb(langDir, bibleFile);
    const rows = db.prepare(
      'SELECT verse, text FROM verses WHERE book = ? AND chapter = ? ORDER BY verse'
    ).all(book, chapter) as { verse: number; text: string }[];

    res.json(rows.map(r => ({ verse: r.verse, text: cleanText(r.text) })));
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ── start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Bible API running on http://localhost:${PORT}`);
  console.log(`Bibles directory: ${BIBLES_DIR}`);
});
