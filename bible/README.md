# Bible data

Source: https://www.biblesupersearch.com/bible-downloads/

The combined database is **not included** in this repository because it exceeds GitHub's file size limits. Download the source files from the link above and run `merge_bibles.py` to build it.

---

## Supported languages

44 translations across 22 languages. Only languages with at least one confirmed free-use translation are included as app UI languages.

| Language | Translations |
|----------|-------------|
| Afrikaans | Afrikaans 1953 |
| Czech | Bible Kralická |
| German | Elberfelder 1871, Luther 1545, Schlachter |
| English | ASV, ASV w Strong's, Bishops, Coverdale, Geneva, KJV, KJV w Strong's, NET, Tyndale, WEB |
| Spanish | Reina Valera 1858 NT, Reina Valera 1909, RV 1909 w Strong's, Reina Valera Gómez 2004, Reina Valera Gómez 2010, Sagradas Escrituras |
| Finnish | Finnish 1776 |
| French | Martin 1744, Segond 1910 |
| Hausa | Contemporary Bible, Litafi Mai-tsarki |
| Indonesian | Terjemahan Baru |
| Italian | Diodati |
| Japanese | Bungo-yaku, Kougo-yaku |
| Lithuanian | Tikinčiųjų Paveldo Vertimas |
| Dutch | Staten Vertaling |
| Polish | Nowa Biblia Gdańska, Uwspółcześniona Biblia Gdańska, Polska Biblia Gdańska |
| Portuguese | Bíblia Livre |
| Romanian | Fidela |
| Russian | Synodal |
| Somali | Kitaabka Quduuska Ah |
| Swahili | Swahili NT |
| Tagalog | Ang Biblia |
| Vietnamese | Vietnamese Cadman |
| Wolof | Kàddug Yàlla gi, Téereb Injiil |

---

## Removed translations

The following 21 translations were removed because their license is unclear, missing, or known to be restricted. All others are either public domain or confirmed free for non-commercial use.

| Module | Name | Language | Reason |
|--------|------|----------|--------|
| elberfelder_1905 | Elberfelder (1905) | German | Copyright R. Bockhaus Verlages — no free-use grant |
| luther_1912 | Luther Bible (1912) | German | 1912 revision — no license statement |
| albanian | Albanian | Albanian | No license statement |
| almeida_ra | Almeida Revista e Atualizada | Portuguese | No explicit license statement |
| almeida_rc | Almeida Revista e Corrigida | Portuguese | No explicit license statement |
| chinese_union_simp | Chinese Union — Simplified | Chinese | No license statement |
| chinese_union_simp_s | Chinese Union — Simplified w Strong's | Chinese | No license statement |
| chinese_union_trad | Chinese Union — Traditional | Chinese | No license statement |
| chinese_union_trad_s | Chinese Union — Traditional w Strong's | Chinese | No license statement |
| ckjv_sds | Chinese KJV Simplified (Shang-Di) | Chinese | No license statement |
| ckjv_sdt | Chinese KJV Traditional (Shang-Di) | Chinese | No license statement |
| cornilescu | Cornilescu | Romanian | Known UBS copyright; description silent |
| epee | La Bible de l'Épée | French | 2005 edition — no license statement |
| hcv | Haitian Creole Version | Haitian Creole | No license statement |
| indo_tm | Terjemahan Lama | Indonesian | No license statement |
| karoli | Károli | Hungarian | No license statement |
| korean | Korean Bible | Korean | Translation unspecified, no license statement |
| lv_gluck_8 | Glück 8th Edition | Latvian | No license statement |
| maori | Maori Bible | Māori | No license statement |
| oster | Ostervald | French | 1996 revision — no license statement |
| turkish | Turkish Bible | Turkish | Translation unspecified, no license statement |

For the full per-translation license audit, see `LICENSES.md`.

---

## Building the combined database

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

---

## Pointing the backend at the data

The backend reads from the per-language source folders by default:

```
bible-backend/src/server.ts  →  BIBLES_DIR defaults to ../../bible/bibles_sqlite_6.0
```

Override with the `BIBLES_DIR` environment variable if needed.
