# Even Hub G2 Developer Guide

Samengesteld op basis van de officiële NPM packages en de Discord dev-chat (jan–mrt 2026).

---

## Wat is Even Hub?

Even Hub is het officiële app-platform voor de G2 smart glasses van Even Realities. Apps zijn **gewone webapps** (TypeScript + Vite) die draaien in een WebView in de Even app op je telefoon. De SDK brug stuurt layout-commando's via Bluetooth naar de bril.

- **Scherm**: monochroom, 576×288 px canvas
- **Taal**: TypeScript/JavaScript
- **Build tool**: Vite
- **Simulator**: desktop app die de brillendisplay simuleert
- **Beta app versie**: 2.1.0/2.1.1 (jij hebt 2.1.0 geïnstalleerd — update naar 2.1.1 via TestFlight als dat beschikbaar is)

---

## Packages

| Package | Versie | Doel |
|---|---|---|
| `@evenrealities/even_hub_sdk` | 0.0.9 | Core SDK bridge |
| `@evenrealities/evenhub-cli` | 0.1.11 | CLI: QR codes, packagen, inloggen |
| `@evenrealities/evenhub-simulator` | 0.6.2 | Desktop simulator |

---

## Hello World: stap voor stap

### 1. Installeer de tools globaal

```bash
sudo npm install -g @evenrealities/evenhub-cli
sudo npm install -g @evenrealities/evenhub-simulator
sudo npm install -g vite@latest
```

### 2. Maak een nieuw project aan

```bash
mkdir even-hello && cd even-hello
npm init -y
npm install @evenrealities/even_hub_sdk
npm install --save-dev typescript vite
```

### 3. Maak de bestandsstructuur

**`index.html`** (verplicht in de root):
```html
<!DOCTYPE html>
<html>
  <head><meta charset="UTF-8" /></head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**`src/main.ts`**:
```typescript
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';

const bridge = await waitForEvenAppBridge();

bridge.onLaunchSource(async (source) => {
  console.log('Gelanceerd vanuit:', source);

  const result = await bridge.createStartUpPageContainer({
    containerTotalNum: 1,
    textObject: [{
      xPosition: 100,
      yPosition: 100,
      width: 350,
      height: 60,
      containerID: 1,
      containerName: 'hello',
      content: 'Hello World!',
      isEventCapture: 1,
    }],
  });

  console.log('Container result:', result); // 0 = succes
});

bridge.onEvenHubEvent((event) => {
  if (event.sysEvent) {
    console.log('Event:', event.sysEvent.eventType);
  }
});
```

**`package.json`** scripts sectie:
```json
{
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port 5173",
    "build": "vite build"
  }
}
```

### 4. Start de dev server

```bash
npm run dev
```

### 5. Test in de simulator

Open een tweede terminal:
```bash
evenhub-simulator http://localhost:5173
```

Je ziet de brillendisplay met "Hello World!" in een desktopvenster.

### 6. Test op de echte bril

```bash
evenhub qr --port 5173
```

Scan de QR code met de Even app op je telefoon. De bril toont je app live.

> **Let op**: je telefoon en computer moeten op hetzelfde wifi-netwerk zitten.

---

## De SDK in het kort

### Lifecycle

```
waitForEvenAppBridge()
  └── onLaunchSource()           ← wordt EENMALIG gefired bij laden
       └── createStartUpPageContainer()   ← EENMALIG aanroepen
            └── rebuildPageContainer()    ← voor alle latere updates
                └── textContainerUpgrade()  ← goedkoop, alleen tekst updaten
```

### Container types

| Type | Gebruik |
|---|---|
| `textObject` | Tekst weergeven (max 8 per pagina) |
| `listObject` | Scrollbare lijst met items |
| `imageObject` | Afbeelding (max 288×144 px, grijs8-bit) |

### Regels

- `createStartUpPageContainer` mag maar **één keer** worden aangeroepen
- Daarna altijd `rebuildPageContainer` gebruiken
- Precies **één** container moet `isEventCapture: 1` hebben
- Max 12 containers totaal per pagina

### Events

```typescript
bridge.onEvenHubEvent((event) => {
  if (event.listEvent) {
    // scroll of klik in lijst
    // OPGELET: eventType is undefined bij gewone klik
    const index = event.listEvent.currentSelectItemIndex;
  }
  if (event.sysEvent) {
    // 3 = double click
    const type = event.sysEvent.eventType;
  }
});
```

---

## Gekende valkuilen

| Probleem | Oplossing |
|---|---|
| `eventType` is `undefined` bij klik | Dat is normaal — gewone klik heeft geen eventType |
| Double-click komt via `sysEvent`, niet `listEvent` | Altijd beide handlers implementeren |
| Simulator toont anders dan echte bril | Altijd ook op hardware testen |
| `borderRdaius` typo in SDK < 0.0.8 | Gebruik SDK 0.0.9, typo is gefixed |
| Afbeeldingen max 200×100 op hardware (pre-0.0.8) | Met SDK 0.0.9 is dat 288×144 |
| App disconnecteert als scherm uit gaat | Even app moet in de voorgrond blijven |
| Index 0 in lijst triggert geen event bij eerste laden | Voeg een lege string toe op index 0 als workaround |

---

## App publiceren

1. `vite build` — bouw je app
2. `evenhub login` — log in met je Even Realities account
3. `evenhub pack app.json ./dist` — maakt een `.ehpk` bestand
4. Upload naar https://preview.evenhub.evenrealities.com

---

## Community resources

| Resource | Link |
|---|---|
| even-toolkit (55+ componenten) | https://github.com/fabioglimb/even-toolkit |
| even-better-sdk (hogere DX) | https://www.npmjs.com/package/@jappyjan/even-better-sdk |
| PowerSlides (werkend voorbeeld) | https://github.com/jappyjan/powerslides |
| BLE protocol (reverse-engineered) | https://github.com/i-soxi/even-g2-protocol |
| even-dev multi-app simulator | https://github.com/BxNxM/even-dev |
| Developer portal | https://preview.evenhub.evenrealities.com |
| iOS TestFlight (v2.1.1) | https://testflight.apple.com/join/vR32By4f |
