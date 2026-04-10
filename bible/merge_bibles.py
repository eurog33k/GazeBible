#!/usr/bin/env python3
"""
Merge all per-language Bible SQLite databases into a single combined database.

Schema:
  versions(id, module, name, shortname, lang, lang_short, year, copyright, description)
  verses(id, version_id, book, chapter, verse, text)

Indexes allow fast filtering by language, version, or version+language.
"""

import sqlite3
import os
import glob
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_DIR = os.path.join(BASE_DIR, "bibles_sqlite_6.0")
OUTPUT_DB = os.path.join(BASE_DIR, "bibles_combined.sqlite")

# Languages excluded from the combined database.
# Reasons: unsupported display script, or insufficient/academic-only content.
# Supported scripts (included): Latin, Cyrillic.
# Chinese/Japanese/Korean were removed due to unclear or missing license statements.
EXCLUDED_LANGS = {
    # Unsupported scripts — Even G2 display cannot render these
    "AM",   # Amharic    — Ethiopic script
    "AR",   # Arabic     — Arabic script
    "BN",   # Bengali    — Bengali script
    "BO",   # Tibetan    — Tibetan script
    "FA",   # Persian    — Arabic script
    "GU",   # Gujarati   — Gujarati script
    "HE",   # Hebrew     — Hebrew script
    "HI",   # Hindi      — Devanagari
    "KN",   # Kannada    — Kannada script
    "MR",   # Marathi    — Devanagari
    "MY",   # Burmese    — Myanmar script
    "NE",   # Nepali     — Devanagari
    "PA",   # Punjabi    — Gurmukhi script
    "TA",   # Tamil      — Tamil script
    "TE",   # Telugu     — Telugu script
    "TH",   # Thai       — Thai script
    "UG",   # Uighur     — Perso-Arabic script
    "UR",   # Urdu       — Arabic script
    # Insufficient or academic-only content
    "GRC",  # Ancient Greek — academic only (no modern readers)
    "JV",   # Javanese      — NT only, partial (7,753 verses)
    "TG",   # Tajik         — very incomplete (4,344 verses)
    # No confirmed free-use license — all translations unclear or restricted
    "HT",   # Haitian Creole — HCV has no license statement
    "HU",   # Hungarian      — Károli has no license statement
    "KO",   # Korean         — translation unspecified, no license statement
    "LV",   # Latvian        — Glück 8th ed. has no license statement
    "MI",   # Māori          — no license statement
    "SQ",   # Albanian       — no license statement
    "TR",   # Turkish        — translation unspecified, no license statement
    "ZH",   # Chinese        — all CUV/CKJV entries have no license statement
}

# Individual translations excluded within otherwise-kept language folders.
# Reasons: active copyright with no free-use grant, or no license statement.
EXCLUDED_MODULES = {
    "elberfelder_1905",  # de — Copyright R. Bockhaus Verlages, no free-use grant
    "luther_1912",       # de — 1912 revision, no license statement
    "almeida_ra",        # pt — no explicit license statement
    "almeida_rc",        # pt — no explicit license statement
    "cornilescu",        # ro — known UBS copyright, description silent
    "epee",              # fr — 2005 edition, no license statement
    "indo_tm",           # id — no license statement
    "oster",             # fr — 1996 revision, no license statement
}


def create_schema(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS versions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            module      TEXT NOT NULL UNIQUE,
            name        TEXT,
            shortname   TEXT,
            lang        TEXT,
            lang_short  TEXT,
            year        TEXT,
            copyright   TEXT,
            description TEXT
        );

        CREATE TABLE IF NOT EXISTS verses (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            version_id  INTEGER NOT NULL REFERENCES versions(id),
            book        INTEGER NOT NULL,
            chapter     INTEGER NOT NULL,
            verse       INTEGER NOT NULL,
            text        TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_verses_version    ON verses(version_id);
        CREATE INDEX IF NOT EXISTS idx_verses_book       ON verses(version_id, book);
        CREATE INDEX IF NOT EXISTS idx_verses_ref        ON verses(version_id, book, chapter, verse);
        CREATE INDEX IF NOT EXISTS idx_versions_lang     ON versions(lang_short);
        CREATE INDEX IF NOT EXISTS idx_versions_module   ON versions(module);
    """)
    conn.commit()


def read_meta(src_conn):
    rows = src_conn.execute("SELECT field, value FROM meta").fetchall()
    return {field: value for field, value in rows}


def import_db(dest_conn, db_path, lang_folder):
    src_conn = sqlite3.connect(db_path)
    try:
        meta = read_meta(src_conn)
    except Exception as e:
        print(f"  SKIP (meta error): {e}")
        src_conn.close()
        return 0

    module = meta.get("module") or os.path.splitext(os.path.basename(db_path))[0]

    # Skip if already imported
    existing = dest_conn.execute(
        "SELECT id FROM versions WHERE module = ?", (module,)
    ).fetchone()
    if existing:
        print(f"  already imported, skipping")
        src_conn.close()
        return 0

    dest_conn.execute(
        """INSERT INTO versions (module, name, shortname, lang, lang_short, year, copyright, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            module,
            meta.get("name"),
            meta.get("shortname"),
            meta.get("lang"),
            meta.get("lang_short"),
            meta.get("year"),
            meta.get("copyright"),
            meta.get("description"),
        ),
    )
    version_id = dest_conn.execute(
        "SELECT id FROM versions WHERE module = ?", (module,)
    ).fetchone()[0]

    verses = src_conn.execute(
        "SELECT book, chapter, verse, text FROM verses"
    ).fetchall()

    dest_conn.executemany(
        "INSERT INTO verses (version_id, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?)",
        [(version_id, b, c, v, t) for b, c, v, t in verses],
    )
    dest_conn.commit()
    src_conn.close()
    return len(verses)


def main():
    if os.path.exists(OUTPUT_DB):
        print(f"Output database already exists: {OUTPUT_DB}")
        print("Delete it first if you want to re-merge.")
        sys.exit(1)

    dest_conn = sqlite3.connect(OUTPUT_DB)
    dest_conn.execute("PRAGMA journal_mode=WAL")
    dest_conn.execute("PRAGMA synchronous=NORMAL")
    create_schema(dest_conn)

    db_files = sorted(glob.glob(os.path.join(SOURCE_DIR, "*", "*.sqlite")))
    total_verses = 0
    total_versions = 0

    for db_path in db_files:
        lang_folder = os.path.basename(os.path.dirname(db_path))
        lang_code   = lang_folder.split("-")[0].upper()
        db_name     = os.path.basename(db_path)
        if lang_code in EXCLUDED_LANGS:
            print(f"[{lang_folder}] {db_name}  — SKIPPED (excluded language)")
            continue
        module_name = os.path.splitext(db_name)[0]
        if module_name in EXCLUDED_MODULES:
            print(f"[{lang_folder}] {db_name}  — SKIPPED (excluded module)")
            continue
        print(f"[{lang_folder}] {db_name}")
        n = import_db(dest_conn, db_path, lang_folder)
        if n > 0:
            total_verses += n
            total_versions += 1
            print(f"  imported {n:,} verses")

    dest_conn.close()
    print(f"\nDone. {total_versions} versions, {total_verses:,} total verses.")
    print(f"Output: {OUTPUT_DB}")
    print()
    print("Example queries:")
    print("  -- All versions in English:")
    print("  SELECT module, name FROM versions WHERE lang_short = 'en';")
    print()
    print("  -- All versions (any language):")
    print("  SELECT module, name, lang FROM versions ORDER BY lang, module;")
    print()
    print("  -- Read Genesis 1:1 in all English versions:")
    print("  SELECT v.module, ve.text FROM verses ve")
    print("  JOIN versions v ON v.id = ve.version_id")
    print("  WHERE v.lang_short = 'en' AND ve.book=1 AND ve.chapter=1 AND ve.verse=1;")
    print()
    print("  -- Read a specific version (KJV):")
    print("  SELECT ve.book, ve.chapter, ve.verse, ve.text FROM verses ve")
    print("  JOIN versions v ON v.id = ve.version_id")
    print("  WHERE v.module = 'kjv';")


if __name__ == "__main__":
    main()
