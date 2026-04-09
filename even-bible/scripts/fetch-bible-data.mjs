/**
 * Fetches all verse text for selected translations from bolls.life
 * and writes src/data/bible.ts with all data bundled statically.
 *
 * Run once: node scripts/fetch-bible-data.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// Translations to bundle. Add/remove as desired.
const TRANSLATIONS = ['DSV', 'HSV17'];

const CONCURRENCY = 8;  // parallel requests at a time
const DELAY_MS = 120;   // ms between batches

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/** Strip HTML tags and Strong's <S>NNNN</S> codes from bolls verse text. */
function cleanText(html) {
  return html
    .replace(/<S>\d+<\/S>/g, '')   // Strong's numbers
    .replace(/<[^>]+>/g, '')        // remaining HTML tags
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchChapter(translation, bookid, chapter) {
  const url = `https://bolls.life/get-text/${translation}/${bookid}/${chapter}/`;
  const verses = await fetchJSON(url);
  return verses.map(v => ({ v: v.verse, t: cleanText(v.text) }));
}

async function runBatch(tasks) {
  return Promise.all(tasks.map(t => t()));
}

async function main() {
  console.log('Fetching book lists...');
  const booksByTrans = {};
  for (const trans of TRANSLATIONS) {
    booksByTrans[trans] = await fetchJSON(`https://bolls.life/get-books/${trans}/`);
    console.log(`  ${trans}: ${booksByTrans[trans].length} books`);
  }

  // Build chapter task list
  const allTasks = [];
  for (const trans of TRANSLATIONS) {
    for (const book of booksByTrans[trans]) {
      for (let ch = 1; ch <= book.chapters; ch++) {
        allTasks.push({ trans, bookid: book.bookid, chapter: ch });
      }
    }
  }

  console.log(`\nFetching ${allTasks.length} chapters (this takes a few minutes)...`);

  // Data storage: data[trans][bookid][chapter] = [{v, t}, ...]
  const data = {};
  for (const trans of TRANSLATIONS) {
    data[trans] = {};
    for (const book of booksByTrans[trans]) {
      data[trans][book.bookid] = {};
    }
  }

  let done = 0;
  for (let i = 0; i < allTasks.length; i += CONCURRENCY) {
    const batch = allTasks.slice(i, i + CONCURRENCY);
    const results = await runBatch(batch.map(task => async () => {
      const verses = await fetchChapter(task.trans, task.bookid, task.chapter);
      return { ...task, verses };
    }));
    for (const r of results) {
      data[r.trans][r.bookid][r.chapter] = r.verses;
    }
    done += batch.length;
    process.stdout.write(`\r  ${done}/${allTasks.length} chapters`);
    await sleep(DELAY_MS);
  }
  console.log('\n\nAll chapters fetched.');

  // Build TypeScript output
  console.log('Writing src/data/bible.ts...');
  mkdirSync(join(ROOT, 'src/data'), { recursive: true });

  const lines = [
    '// AUTO-GENERATED — do not edit by hand.',
    '// Run: node scripts/fetch-bible-data.mjs',
    '',
    'export type Verse = { v: number; t: string };',
    'export type Chapter = Verse[];',
    '',
    '// books[trans] = [{bookid, name, chapters}]',
    'export const BOOKS: Record<string, Array<{bookid:number; name:string; chapters:number}>> = {',
  ];

  for (const trans of TRANSLATIONS) {
    const booksArr = booksByTrans[trans].map(b => `{bookid:${b.bookid},name:${JSON.stringify(b.name)},chapters:${b.chapters}}`);
    lines.push(`  ${JSON.stringify(trans)}: [${booksArr.join(',')}],`);
  }
  lines.push('};', '');

  // Verses: VERSES[trans][bookid][chapter]
  lines.push('// VERSES[trans][bookid][chapter] = [{v,t}, ...]');
  lines.push('export const VERSES: Record<string, Record<number, Record<number, Chapter>>> = {');
  for (const trans of TRANSLATIONS) {
    lines.push(`  ${JSON.stringify(trans)}: {`);
    for (const book of booksByTrans[trans]) {
      lines.push(`    ${book.bookid}: {`);
      for (let ch = 1; ch <= book.chapters; ch++) {
        const verses = data[trans][book.bookid][ch];
        const arr = verses.map(v => `{v:${v.v},t:${JSON.stringify(v.t)}}`).join(',');
        lines.push(`      ${ch}: [${arr}],`);
      }
      lines.push('    },');
    }
    lines.push('  },');
  }
  lines.push('};', '');

  // Languages / translations metadata
  lines.push('export const LANGUAGES = [');
  lines.push('  {');
  lines.push('    language: "Dutch Nederlands",');
  lines.push('    translations: [');
  lines.push('      { short_name: "DSV", full_name: "Statenvertaling (DSV)" },');
  lines.push('      { short_name: "HSV17", full_name: "Herziene Statenvertaling 2017" },');
  lines.push('    ],');
  lines.push('  },');
  lines.push('] as const;');

  writeFileSync(join(ROOT, 'src/data/bible.ts'), lines.join('\n'), 'utf8');

  const stat = require ? null : null;
  const { statSync } = await import('fs');
  const bytes = statSync(join(ROOT, 'src/data/bible.ts')).size;
  console.log(`Done! src/data/bible.ts is ${(bytes / 1024 / 1024).toFixed(1)} MB`);
}

main().catch(err => { console.error(err); process.exit(1); });
