# Bible data

Source: https://www.biblesupersearch.com/bible-downloads/

The combined database is **not included** in this repository because it exceeds GitHub's file size limits. Download the source files from the link above and run `merge_bibles.py` to build it.

---

## Supported languages

65 translations across 30 languages. Only languages with at least one confirmed free-use translation are included as app UI languages.

| Language | Translations |
|----------|-------------|
| Afrikaans | Afrikaans 1953 |
| Albanian | Albanian |
| Chinese | Union — Simplified, Union — Simplified w Strong's, Union — Traditional, Union — Traditional w Strong's, KJV Simplified (Shang-Di), KJV Traditional (Shang-Di) |
| Czech | Bible Kralická |
| German | Elberfelder 1871, Elberfelder 1905, Luther 1545, Luther 1912, Schlachter |
| English | ASV, ASV w Strong's, Bishops, Coverdale, Geneva, KJV, KJV w Strong's, NET, Tyndale, WEB |
| Spanish | Reina Valera 1858 NT, Reina Valera 1909, RV 1909 w Strong's, Reina Valera Gómez 2004, Reina Valera Gómez 2010, Sagradas Escrituras |
| Finnish | Finnish 1776 |
| French | La Bible de l'Épée, Martin 1744, Ostervald, Segond 1910 |
| Haitian Creole | Haitian Creole Version |
| Hausa | Contemporary Bible, Litafi Mai-tsarki |
| Hungarian | Károli |
| Indonesian | Terjemahan Baru, Terjemahan Lama |
| Italian | Diodati |
| Japanese | Bungo-yaku, Kougo-yaku |
| Korean | Korean Bible |
| Latvian | Glück 8th Edition |
| Lithuanian | Tikinčiųjų Paveldo Vertimas |
| Māori | Maori Bible |
| Dutch | Staten Vertaling |
| Polish | Nowa Biblia Gdańska, Uwspółcześniona Biblia Gdańska, Polska Biblia Gdańska |
| Portuguese | Almeida Revista e Atualizada, Almeida Revista e Corrigida, Bíblia Livre |
| Romanian | Cornilescu, Fidela |
| Russian | Synodal |
| Somali | Kitaabka Quduuska Ah |
| Swahili | Swahili NT |
| Tagalog | Ang Biblia |
| Turkish | Turkish Bible |
| Vietnamese | Vietnamese Cadman |
| Wolof | Kàddug Yàlla gi, Téereb Injiil |

---

## Building the combined database

```bash
cd bible
python3 merge_bibles.py
```

Delete `bibles_combined.sqlite` first if it already exists (the script will refuse to overwrite it).

This produces `bibles_combined.sqlite` with the schema:

```
versions (id, module, name, shortname, lang, lang_short, year, copyright, description, copyright_statement)
verses   (id, version_id, book, chapter, verse, text)
```

---

## Pointing the backend at the data

The backend reads from the per-language source folders by default:

```
bible-backend/src/server.ts  →  BIBLES_DIR defaults to ../../bible/bibles_sqlite_6.0
```

Override with the `BIBLES_DIR` environment variable if needed.
