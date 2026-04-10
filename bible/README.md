# Bible data

The bible data is **not included** in this repository because the combined database (~607 MB) exceeds GitHub's file size limits.
You can find it at https://www.biblesupersearch.com/bible-downloads/ or rebuild it so it includes only the supported languages

## Source data

The raw data lives in `bibles_sqlite_6.0/` — 52 language folders, each containing one or more `.sqlite` files (90 translations total). Each file has two tables:

```
meta   (field TEXT, value TEXT)   — name, shortname, lang, lang_short, year, …
verses (book INT, chapter INT, verse INT, text TEXT)
```

The folder names follow the pattern `<LANG_CODE>-<Language>`, e.g. `EN-English`, `NL-Dutch`.

## Script display filter

The Even G2 display can only render certain writing systems. The script automatically skips any language folder whose writing system the glasses cannot show:

| Excluded code | Language | Script |
|---|---|---|
| AM | Amharic | Ethiopic |
| AR | Arabic | Arabic |
| BN | Bengali | Bengali |
| BO | Tibetan | Tibetan |
| FA | Persian | Arabic |
| GU | Gujarati | Gujarati |
| HE | Hebrew | Hebrew |
| HI | Hindi | Devanagari |
| KN | Kannada | Kannada |
| MR | Marathi | Devanagari |
| MY | Burmese | Myanmar |
| NE | Nepali | Devanagari |
| PA | Punjabi | Gurmukhi |
| TA | Tamil | Tamil |
| TE | Telugu | Telugu |
| TH | Thai | Thai |
| UG | Uighur | Perso-Arabic |
| UR | Urdu | Arabic |
| GRC | Ancient Greek | academic only (no modern readers) |
| JV | Javanese | NT only, partial (7,753 verses) |
| TG | Tajik | very incomplete (4,344 verses) |

Supported scripts (included): Latin, Cyrillic, Chinese, Japanese, Korean.

## Building the combined database

A script is provided that merges all supported-language files into a single `bibles_combined.sqlite`:

```bash
cd bible
python3 merge_bibles.py
```

Delete `bibles_combined.sqlite` first if it already exists (the script will refuse to overwrite it).

This produces `bibles_combined.sqlite` with the schema:

```
versions (id, module, name, shortname, lang, lang_short, year, copyright, description)
verses   (id, version_id, book, chapter, verse, text)
```

The script is idempotent — if a version is already present it is skipped. Delete `bibles_combined.sqlite` and re-run to rebuild from scratch.

## Pointing the backend at the data

The backend (`bible-backend`) reads from the per-language folder by default:

```
bible-backend/src/server.ts  →  BIBLES_DIR defaults to ../../bible/bibles_sqlite_6.0
```

Override with the `BIBLES_DIR` environment variable if needed.
