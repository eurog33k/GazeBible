# GazeBible — Hosting Guide

## Project layout

```
evenrealities/
├── bible-backend/      Express API + static file server (reads the combined SQLite)
├── gazebible/          Even Hub frontend (Vite + TypeScript)
└── bible/
    ├── bibles_combined.sqlite   Single database — all metadata + verses
    ├── bibles_sqlite_6.0/       Source files (local dev/rebuild only)
    └── merge_bibles.py          Merges source files into bibles_combined.sqlite
```

---

## Development (local machine)

Open **two terminals**:

**Terminal 1 — Backend**
```bash
cd ~/Documents/evenrealities/bible-backend
npm install
npm run dev          # API on http://localhost:3001
```

**Terminal 2 — Frontend**
```bash
cd ~/Documents/evenrealities/gazebible
npm install
npm run dev          # Vite on http://localhost:5173 (proxies /api/ → :3001)
```

**Terminal 3 — Simulator (optional)**
```bash
evenhub-simulator http://localhost:5173
```

**Test on glasses (QR code)**
```bash
cd ~/Documents/evenrealities/gazebible
evenhub qr --port 5173
```
Then: Even app → Even Hub tab → top-right → Developer Hub → Prototype Mode → scan QR.
Glasses and phone must be on the same Wi-Fi network.

---

## Deploying to production

The server layout under `/opt/gazebible/`:
```
/opt/gazebible/
├── backend/               Express API
├── bibles_combined.sqlite Database
├── dist/                  Built Even Hub app (served by backend on port 3001)
└── html/                  Static user manual (uploaded by deployfe.sh)
```

### One-time deploy script setup

The repo includes three deploy script templates. Copy them and fill in your server IP — the personalised copies are gitignored so your IP never gets committed:

```bash
cp deployfrontend.sh deployfe.sh
cp deploybackend.sh  deploybe.sh
cp deploydatabase.sh deploydb.sh
# Edit each file — replace YOUR_SERVER_IP with the actual IP
```

### Deploy the database (first time, and when translations change)

The combined SQLite database is **not in the repo** (it's 370 MB). It must be built on your workstation first, then uploaded to the server.

**Step 1 — Build on your workstation:**
```bash
cd bible
python3 merge_bibles.py
```
This reads all the individual `.sqlite` files from `bibles_sqlite_6.0/` and produces `bibles_combined.sqlite`. Delete the file first if it already exists (the script refuses to overwrite).

**Step 2 — Upload to the server:**
```bash
./deploydb.sh
```
Rsyncs `bible/bibles_combined.sqlite` to `/opt/gazebible/bibles_combined.sqlite`. Takes a while at ~370 MB. Only needs to be run again if you add new translations.

### Deploy frontend changes

```bash
./deployfe.sh
```

Builds the frontend, uploads `dist/` and `html/` to the server, and restarts pm2.

### Deploy backend changes

```bash
./deploybe.sh
```

Rsyncs `bible-backend/` to `/opt/gazebible/backend/` (excluding `node_modules/` and `dist/`), runs `npm install` on the server, and restarts pm2.

### First-time server setup

Install Node.js, npm, and pm2 on the server (only needed once):

```bash
# Install Node.js + npm (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt-get install -y nodejs

# Install pm2 globally
npm install -g pm2
```

Then run `./deploybe.sh` — it uploads the backend, starts the service, saves the process list, and registers the systemd unit for auto-start on reboot.

The app is then available at `http://<your-server-ip>:3001`.

---

## Cloud / VPS deployment

Full deployment order for a new server:

1. Install Node.js, npm, and pm2 (see First-time server setup above).
2. Build the database on your workstation and run `./deploydb.sh`.
3. Run `./deploybe.sh` — uploads the backend, starts the service, configures reboot persistence.
4. Run `./deployfe.sh` — builds and uploads the frontend.

The `BIBLE_DB` environment variable overrides the default database path if your server layout differs from `/opt/gazebible/`.

### nginx + HTTPS setup

A ready-made nginx config is included at `gazebible.nieuwehoop.church.nginx`. To install it:

```bash
# 1. Point the domain's DNS A record to your server IP first.

# 2. Copy the config to nginx sites-available (on the server):
scp gazebible.nieuwehoop.church.nginx root@<server-ip>:/etc/nginx/sites-available/gazebible

# 3. Enable it:
ssh root@<server-ip>
ln -s /etc/nginx/sites-available/gazebible /etc/nginx/sites-enabled/
nginx -t && nginx -s reload

# 4. Install the certbot nginx plugin (if not already installed):
apt-get install -y python3-certbot-nginx

# 5. Obtain a Let's Encrypt certificate:
#    certbot modifies the config to add the SSL server block and HTTP→HTTPS redirect.
certbot --nginx -d gazebible.nieuwehoop.church
```

The config sets up:
- HTTP → HTTPS redirect
- `/api/` → proxied to the backend on `localhost:3001`
- `/` → static user manual from `/opt/gazebible/html/`

---

## Publishing to Even Hub marketplace

### Prerequisites

- **Even Hub CLI** installed globally: `sudo npm install -g @evenrealities/evenhub-cli`
- **Even Hub developer account** at https://hub.evenrealities.com/hub
- **Even app** version 2.1.1 or later on your phone

### Files already prepared

| File | Purpose |
|---|---|
| `gazebible/app.json` | Manifest (package ID, version, permissions, supported languages) |
| `gazebible/marketplace-icon.png` | Marketplace icon (288×144px, 8-bit greyscale) |

### Step-by-step

**1. Bump the version** (if publishing an update)

Update the `version` field in both files — they should match:
- `gazebible/app.json` → `"version": "1.1.0"`
- `gazebible/package.json` → `"version": "1.1.0"`

**2. Build the frontend**

```bash
cd ~/Documents/evenrealities/gazebible
npm run build
```

**3. Log in to Even Hub** (first time only, or when token expires)

```bash
evenhub login
```

Follow the prompts to authenticate with your developer account.

**4. Pack the app**

```bash
evenhub pack app.json ./dist
```

This produces `out.ehpk` (~85KB) in the current directory.

**5. Upload to the developer portal**

1. Go to https://hub.evenrealities.com/hub
2. Log in with your developer account
3. Create a new app (first time) or update the existing one
4. Upload `out.ehpk`
5. Upload `marketplace-icon.png` as the app icon
6. Fill in the app description, screenshots, and category
7. Submit for review

### Manifest reference (`app.json`)

```json
{
  "package_id": "com.eurog33k.gazebible",
  "edition": "202601",
  "name": "GazeBible",
  "version": "1.0.0",
  "min_app_version": "2.1.1",
  "min_sdk_version": "0.0.9",
  "entrypoint": "index.html",
  "permissions": [
    {
      "name": "network",
      "desc": "Fetches Bible verses, book lists, and verse of the day from the backend API."
    }
  ],
  "supported_languages": ["en", "de", "fr", "es", "it", "zh", "ja", "ko"]
}
```

Key rules:
- **package_id**: lowercase, no hyphens, at least two segments
- **name**: max 20 characters
- **edition**: must be `"202601"`
- **permissions**: array of objects (not a key-value map)

---

## Changing the app language

Every launch starts with the **splash screen**. Click through it and the app goes to:
- The last-read chapter directly, if a Bible and position were previously saved.
- The OT/NT screen, if a Bible was previously selected but no position is saved.
- The language picker, if no Bible has been selected yet.

To change the language or Bible from inside the app: double-click your way back to the relevant screen. Double-clicking on the app language screen returns to the splash screen.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend port |
| `BIBLE_DB` | `../bible/bibles_combined.sqlite` | Path to the combined SQLite database |
| `VITE_API_URL` | `''` (proxy) | Backend URL for prod builds |

