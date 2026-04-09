# Even Hub G2 — Quickstart & Samenvatting

> Bronnen: officiële NPM packages, Discord dev-chat (jan–mrt 2026), EVENHUB_GUIDE.md

---

## Wat is het?

Even Hub is het app-platform voor de G2 smart glasses. Apps zijn **gewone webapps** (TypeScript + Vite) die draaien in een WebView in de Even-app op je telefoon. De SDK stuurt via Bluetooth layout-commando's naar de bril.

- **Scherm**: monochroom, 576×288 px
- **Stack**: TypeScript + Vite
- **Beta app**: jij hebt **2.1.0** — update naar **2.1.1** via TestFlight (link onderaan)

---

## De drie packages

| Package | Versie | Doel |
|---|---|---|
| `@evenrealities/even_hub_sdk` | 0.0.9 | Core SDK — bridge tussen app en bril |
| `@evenrealities/evenhub-cli` | 0.1.11 | CLI: QR codes genereren, packagen, inloggen |
| `@evenrealities/evenhub-simulator` | 0.6.2 | Desktop simulator — test zonder hardware |

---

## Hello World — wat er al klaarstaat

Het project `even-hello/` is al aangemaakt en volledig geconfigureerd:

```
even-hello/
├── index.html
├── package.json
└── src/
    └── main.ts
```

De `main.ts` toont "Hello World!" op de bril via `createStartUpPageContainer`.

---

## Stap-voor-stap: POC draaien

### Stap 1 — Installeer de CLI-tool globaal (eenmalig)

```bash
sudo npm install -g @evenrealities/evenhub-cli
sudo npm install -g @evenrealities/evenhub-simulator
```

### Stap 2 — Start de dev server

```bash
cd ~/Documents/evenrealities/even-hello
npm install          # eerste keer
npm run dev
```

De server draait op `http://localhost:5173`.

### Stap 3 — Test in de desktop simulator

Open een **tweede terminal**:

```bash
evenhub-simulator http://localhost:5173
```

Je ziet een venster dat de brillendisplay simuleert met "Hello World!" erop.

### Stap 4 — Test op de echte bril (vereist Even Hub tab in de app)

```bash
evenhub qr --port 5173
```

Ga in de Even-app naar:
**Even Hub tab → rechtsboven (profiel) → Developer Hub → Prototype Mode**

Scan de QR code. Bril en telefoon moeten op **hetzelfde wifi-netwerk** zitten.

> **Let op**: je hebt versie **2.1.1** nodig voor de QR-scan functie.
> Upgrade via: https://testflight.apple.com/join/vR32By4f

---

## SDK — kernconcepten

### Lifecycle (volgorde is verplicht)

```
waitForEvenAppBridge()
  └── onLaunchSource()                    ← eenmalig bij laden
       └── createStartUpPageContainer()  ← EENMALIG aanroepen
            └── rebuildPageContainer()   ← voor alle volgende updates
                └── textContainerUpgrade() ← goedkoop: alleen tekst
```

### Container types

| Type | Gebruik |
|---|---|
| `textObject` | Tekst (max 8 per pagina) |
| `listObject` | Scrollbare lijst |
| `imageObject` | Afbeelding (max 288×144 px, grijs 8-bit) |

### Regels

- `createStartUpPageContainer` maar **één keer** aanroepen
- Daarna altijd `rebuildPageContainer` gebruiken voor updates
- Precies **één** container heeft `isEventCapture: 1`
- Max 12 containers per pagina

---

## Valkuilen (uit Discord dev-chat)

| Probleem | Oplossing |
|---|---|
| `eventType` is `undefined` bij klik | Normaal — gewone klik heeft geen eventType |
| Double-click werkt niet | Komt via `sysEvent`, niet `listEvent` |
| `InvalidSize` fout bij afbeeldingen op hardware | Max 200×100 px op firmware < 2.1.1.6; met 0.0.9 en 2.1.1 is het 288×144 |
| QR-scan niet zichtbaar in app | Je hebt versie 2.1.1 nodig (TestFlight) |
| CLI niet herkend | Installeer globaal: `sudo npm install -g @evenrealities/evenhub-cli` |
| `onLaunchSource` niet gefired in simulator | Direct `renderApp()` aanroepen als fallback (al zo in even-hello) |
| App disconnecteert als scherm uit gaat | Even-app moet in de voorgrond blijven |
| Index 0 in lijst triggert geen event | Voeg lege string toe op index 0 als workaround |

---

## Publiceren (later)

```bash
vite build
evenhub login
evenhub pack app.json ./dist   # maakt een .ehpk bestand
# Upload naar https://preview.evenhub.evenrealities.com
```

---

## Handige community links

| Resource | Link |
|---|---|
| TestFlight 2.1.1 | https://testflight.apple.com/join/vR32By4f |
| Developer portal | https://preview.evenhub.evenrealities.com |
| even-toolkit (55+ componenten) | https://github.com/fabioglimb/even-toolkit |
| even-better-sdk | https://www.npmjs.com/package/@jappyjan/even-better-sdk |
| PowerSlides (werkend voorbeeld) | https://github.com/jappyjan/powerslides |
| BLE protocol (reverse-engineered) | https://github.com/i-soxi/even-g2-protocol |
