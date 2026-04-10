# Bible data

Source: https://www.biblesupersearch.com/bible-downloads/

The combined database is **not included** in this repository because it exceeds GitHub's file size limits. Download the source files from the link above and run `merge_bibles.py` to build it.

---

## Supported languages

65 translations across 30 languages. Languages are only excluded when the Even G2 display cannot render the script, or the content is too sparse to be useful.

| Language | Translation | License |
|----------|-------------|---------|
| Afrikaans | Afrikaans 1953 | Non-commercial |
| Albanian | Albanian | Public domain |
| Chinese | Union — Simplified | Public domain |
| Chinese | Union — Simplified w Strong's | Public domain |
| Chinese | Union — Traditional | Public domain |
| Chinese | Union — Traditional w Strong's | Public domain |
| Chinese | KJV Simplified (Shang-Di) | CC BY-SA 3.0 |
| Chinese | KJV Traditional (Shang-Di) | CC BY-SA 3.0 |
| Czech | Bible Kralická | Public domain |
| German | Elberfelder 1871 | Public domain |
| German | Elberfelder 1905 | Public domain |
| German | Luther 1545 | Public domain |
| German | Luther 1912 | Public domain |
| German | Schlachter | Non-commercial |
| English | ASV | Public domain |
| English | ASV w Strong's | Public domain |
| English | Bishops | Public domain |
| English | Coverdale | Public domain |
| English | Geneva | Public domain |
| English | KJV | Public domain |
| English | KJV w Strong's | Public domain |
| English | NET | Non-commercial |
| English | Tyndale | Public domain |
| English | WEB | Public domain |
| Spanish | Reina Valera 1858 NT | Public domain |
| Spanish | Reina Valera 1909 | Public domain |
| Spanish | RV 1909 w Strong's | Public domain |
| Spanish | Reina Valera Gómez 2004 | Non-commercial |
| Spanish | Reina Valera Gómez 2010 | Non-commercial |
| Spanish | Sagradas Escrituras | Public domain |
| Finnish | Finnish 1776 | Public domain |
| French | La Bible de l'Épée | Public domain |
| French | Martin 1744 | Public domain |
| French | Ostervald | Public domain |
| French | Segond 1910 | Public domain |
| Haitian Creole | Haitian Creole Version | Public domain |
| Hausa | Contemporary Bible | CC BY-SA 4.0 |
| Hausa | Litafi Mai-tsarki | CC BY-SA 4.0 |
| Hungarian | Károli | Public domain |
| Indonesian | Terjemahan Baru | Non-commercial |
| Indonesian | Terjemahan Lama | Public domain |
| Italian | Diodati | Public domain |
| Japanese | Bungo-yaku | Public domain |
| Japanese | Kougo-yaku | Public domain |
| Korean | Korean Bible | Public domain |
| Latvian | Glück 8th Edition | Public domain |
| Lithuanian | Tikinčiųjų Paveldo Vertimas | CC BY-SA 4.0 |
| Māori | Maori Bible | Public domain |
| Dutch | Staten Vertaling | Public domain |
| Polish | Nowa Biblia Gdańska | Free (no rights reserved) |
| Polish | Uwspółcześniona Biblia Gdańska | Non-commercial |
| Polish | Polska Biblia Gdańska | Public domain |
| Portuguese | Almeida Revista e Atualizada | Public domain |
| Portuguese | Almeida Revista e Corrigida | Public domain |
| Portuguese | Bíblia Livre | CC BY 3.0 BR |
| Romanian | Cornilescu | Public domain |
| Romanian | Fidela | Free (attribution) |
| Russian | Synodal | Public domain |
| Somali | Kitaabka Quduuska Ah | Non-commercial |
| Swahili | Swahili NT | Public domain |
| Tagalog | Ang Biblia | Public domain |
| Turkish | Turkish Bible | Public domain |
| Vietnamese | Vietnamese Cadman | Public domain |
| Wolof | Kàddug Yàlla gi | Non-commercial |
| Wolof | Téereb Injiil | Non-commercial |

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
