# Bible App — Hosting Guide

## Project layout

```
evenrealities/
├── bible-backend/      Express API (reads the combined SQLite)
├── even-bible/         Even Hub frontend (Vite + TypeScript)
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
cd ~/Documents/evenrealities/even-bible
npm install
npm run dev          # Vite on http://localhost:5173
```

**Terminal 3 — Simulator (optional)**
```bash
evenhub-simulator http://localhost:5173
```

**Test on glasses (QR code)**
```bash
cd ~/Documents/evenrealities/even-bible
evenhub qr --port 5173
```
Then: Even app → Even Hub tab → top-right → Developer Hub → Prototype Mode → scan QR.
Glasses and phone must be on the same Wi-Fi network.

---

## Production — same machine

The simplest setup: run the backend and serve the built frontend from it.

**Step 1 — Build the frontend**
```bash
cd ~/Documents/evenrealities/even-bible
VITE_API_URL=http://<YOUR-IP>:3001 npm run build
```
Replace `<YOUR-IP>` with your machine's local IP (e.g. `192.168.1.42`).
Find it with: `ipconfig getifaddr en0`

**Step 2 — Serve frontend from the backend**

Add this to `bible-backend/src/server.ts` before `app.listen` (already commented out):

```typescript
import { fileURLToPath } from 'url';
const DIST = path.join(__dirname, '../../even-bible/dist');
app.use(express.static(DIST));
app.get('*', (_req, res) => res.sendFile(path.join(DIST, 'index.html')));
```

Or just start the backend and point the Even app to:
`http://<YOUR-IP>:3001`

**Step 3 — Keep it running**

Install `pm2`:
```bash
npm install -g pm2
cd ~/Documents/evenrealities/bible-backend
pm2 start "npm run dev" --name bible-api
pm2 save
pm2 startup    # auto-start on reboot
```

---

## Production — cloud (e.g. a cheap VPS)

1. Copy the `bible-backend/` folder and `bible/bibles_combined.sqlite` to the server.
   (`bibles_sqlite_6.0/` is **not** needed on the server.)
2. Set the env var `BIBLE_DB` to the absolute path of `bibles_combined.sqlite` on the server.
3. Build the frontend with `VITE_API_URL=https://your-domain.com npm run build`.
4. Serve with nginx + pm2, or use a single Express app that serves the static files.

Example nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://localhost:3001;
    }

    location / {
        root /var/www/bible/dist;
        try_files $uri /index.html;
    }
}
```

---

## Changing the app language

Every launch starts with the **splash screen**. Click through it and the app goes to:
- The OT/NT screen directly, if a Bible was previously selected.
- The language picker, if no Bible has been selected yet.

To change the language or Bible from inside the app: double-click your way back to the relevant screen. Double-clicking on the app language screen returns to the splash screen.

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend port |
| `BIBLE_DB` | `../bible/bibles_combined.sqlite` | Path to the combined SQLite database |
| `VITE_API_URL` | `''` (proxy) | Backend URL for prod builds |
