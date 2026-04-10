# Bible data

The bible data is **not included** in this repository because the combined database exceeds GitHub's file size limits.
You can find the source files at https://www.biblesupersearch.com/bible-downloads/ — rebuild with `merge_bibles.py` to apply the filters below.

## Source data

The raw data lives in `bibles_sqlite_6.0/` — 52 language folders, each containing one or more `.sqlite` files. Each file has two tables:

```
meta   (field TEXT, value TEXT)   — name, shortname, lang, lang_short, year, …
verses (book INT, chapter INT, verse INT, text TEXT)
```

The folder names follow the pattern `<LANG_CODE>-<Language>`, e.g. `EN-English`, `NL-Dutch`.

## Filters applied by the build script

### 1 — Script display filter (language folders)

The Even G2 display can only render Latin and Cyrillic. The following language folders are skipped entirely:

| Code | Language | Reason |
|------|----------|--------|
| AM | Amharic | Ethiopic script |
| AR | Arabic | Arabic script |
| BN | Bengali | Bengali script |
| BO | Tibetan | Tibetan script |
| FA | Persian | Arabic script |
| GU | Gujarati | Gujarati script |
| HE | Hebrew | Hebrew script |
| HI | Hindi | Devanagari |
| KN | Kannada | Kannada script |
| MR | Marathi | Devanagari |
| MY | Burmese | Myanmar script |
| NE | Nepali | Devanagari |
| PA | Punjabi | Gurmukhi script |
| TA | Tamil | Tamil script |
| TE | Telugu | Telugu script |
| TH | Thai | Thai script |
| UG | Uighur | Perso-Arabic script |
| UR | Urdu | Arabic script |
| GRC | Ancient Greek | Academic only; no modern readers |
| JV | Javanese | NT only, partial (7,753 verses) |
| TG | Tajik | Very incomplete (4,344 verses) |

### 2 — License filter (language folders)

These language folders are skipped because every translation they contain either has an unclear or missing license statement, or carries an active copyright with no confirmed free-use grant:

| Code | Language | Reason |
|------|----------|--------|
| HT | Haitian Creole | HCV — no license statement |
| HU | Hungarian | Károli — no license statement |
| KO | Korean | Translation unspecified, no license statement |
| LV | Latvian | Glück 8th ed. — no license statement |
| MI | Māori | No license statement |
| SQ | Albanian | No license statement |
| TR | Turkish | Translation unspecified, no license statement |
| ZH | Chinese | All CUV/CKJV entries have no license statement |

### 3 — License filter (individual modules)

These translations are skipped within otherwise-included language folders:

| Module | Language | Reason |
|--------|----------|--------|
| elberfelder_1905 | German | Copyright R. Bockhaus Verlages — no free-use grant |
| luther_1912 | German | 1912 revision — no license statement |
| almeida_ra | Portuguese | No explicit license statement |
| almeida_rc | Portuguese | No explicit license statement |
| cornilescu | Romanian | Known UBS copyright; description silent |
| epee | French | 2005 edition — no license statement |
| indo_tm | Indonesian | No license statement |
| oster | French | 1996 revision — no license statement |

See `LICENSES.md` for the full per-translation license audit.

## Building the combined database

```bash
cd bible
python3 merge_bibles.py
```

Delete `bibles_combined.sqlite` first if it already exists (the script will refuse to overwrite it).

This produces `bibles_combined.sqlite` — **44 translations** across 22 languages — with the schema:

```
versions (id, module, name, shortname, lang, lang_short, year, copyright, description)
verses   (id, version_id, book, chapter, verse, text)
```

## Pointing the backend at the data

The backend (`bible-backend`) reads from the per-language folder by default:

```
bible-backend/src/server.ts  →  BIBLES_DIR defaults to ../../bible/bibles_sqlite_6.0
```

Override with the `BIBLES_DIR` environment variable if needed.
The backend also enforces the same module-level exclusion list independently of the file system.
