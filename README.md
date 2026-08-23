# NutriPlanIT

> **AI-powered meal planning app for families** — Expo + Turso + Supabase

## Features

- 🍽️ **Personalized Meal Plans**: Weekly plans tailored to each family member's caloric needs
- 👨‍👩‍👧‍👦 **Family Profiles**: Track TDEE, goals (cut/maintain/bulk), and macros for everyone
- 👨‍🍳 **Smart Portion Scaler (Cooking Mode)**: Calculate exact raw ingredients and cooked portions per person
- 📊 **Weight Tracking**: Monitor progress with visual charts
- 🛒 **Shopping Lists**: Auto-generated from meal plans
- 🔄 **Offline-First**: Local SQLite with cloud sync

## Tech Stack

| Layer | Technology |
| ------- | ------------ |
| Mobile | Expo SDK 54+, React 19, NativeWind 4.x |
| State | Zustand + TanStack Query |
| Forms | react-hook-form + Zod |
| DB | Turso (libSQL) + Drizzle ORM |
| Auth | Supabase Auth |
| API | Hono on Cloudflare Workers |
| Images | Cloudinary CDN |

## Getting Started

### Prerequisiti

- Node + pnpm
- Android SDK + `adb` nel PATH
- Telefono in **Developer Mode** collegato via USB **o** Wi-Fi (`adb connect <ip>:5555`)

> ⚠️ **Questo progetto va sviluppato in WSL2 ma il telefono è sulla LAN di Windows.**
> WSL2 è dietro NAT (`172.20.x.x`): quell'IP NON è raggiungibile dal telefono.
> `expo run:android` inietta automaticamente l'IP WSL nel dev client → errore
> `SocketTimeoutException: failed to connect to /172.20.x.x (port 8081)`.

### Installazione (una tantum)

```bash
# 1. Dipendenze
pnpm install
```

### Avvio (comando unico)

```bash
scripts/dev-android.sh
# alias disponibile: dev-android
```

Lo script fa tre cose, nell'ordine giusto:

1. **Tunnel adb reverse** — `adb reverse tcp:8081 tcp:8081`
   - Riscrive `localhost:8081` del telefono verso la porta 8081 di WSL.
   - Aggira il NAT di WSL2: il telefono parla con Metro senza mai conoscere `172.20.x.x`.
2. **Avvia Metro su `0.0.0.0:8081`** — `expo start --host lan`
   - Ascolta su tutte le interfacce (loopback incluso, dove arriva il tunnel).
3. **Compila e installa l'APK** — `expo run:android --device <nome>`
   - Usa il **nome** del device da `adb devices -l` (es. `SM_S911B`), non `IP:porta`
     (quel formato non viene risolto da Expo: `Could not find device with name`).

Dopo l'avvio: **sblocca il telefono** (keyguard attivo blocca l'app in background).

### Sviluppo quotidiano (app già installata) — il caso più comune

```bash
adb reverse tcp:8081 tcp:8081
pnpm exec expo start --host lan
```

Poi apri l'app sul telefono. Le modifiche verranno aggiornate automaticamente con Fast Refresh.

> ⚠️ **Il `adb reverse` si azzera** quando scolleghi/ricolleghi il telefono o riavvii:
> rilanciare `scripts/dev-android.sh`.

### Comandi da NON usare (errori già incontrati)

| Comando | Errore che causa | Alternativa corretta |
| ------- | ---------------- | -------------------- |
| `expo run:android --no-bundler --port 8081` | `--port and --no-bundler are mutually exclusive` | Uno solo dei due (default è già 8081) |
| `expo run:android -d` (senza argomento) | Richiede input interattivo: `Input is required...` | `--device "SM_S911B"` |
| `expo run:android --device "192.168.1.13:5555"` | `Could not find device with name` | Nome da `adb devices -l` (es. `SM_S911B`) |
| `expo start --dev-client --tunnel` | Passa da ngrok; con build locale non serve e rallenta | `expo start --host lan` + `adb reverse` |

## Troubleshooting

### 0. ⚠️ `Network request failed` — Il problema non è il codice, è il progetto Supabase

**`rgwkuejuklbcoxzlsamd.supabase.co` non esiste più nel DNS pubblico**
(risposta `RFC8482` = nessun record). Ogni fetch verso quel dominio fallisce, ovunque:

- Dal telefono → `Network request failed`
- Da WSL → `HTTP 000`
- Con DNS forzato → `HTTP 000`

Il tuo router Telecom **non c'entra** — anche il DNS pubblico di Google (8.8.8.8)
e Cloudflare confermano che il sottodominio è morto. Il progetto Supabase è stato
eliminato o sospeso (inattività).

**Cosa fare (2 opzioni):**

**Opzione 1 — Riattivare il progetto esistente:**

1. Vai su [supabase.com/dashboard](https://supabase.com/dashboard)
2. Trova il progetto con l'anon key di `.env.local` (`eyJhbGciOi...`)
3. Se è **sospeso per inattività** → **Restore/Riattiva**
4. Se è **eliminato** → creane uno nuovo

**Opzione 2 — Nuovo progetto:**

1. Crea un nuovo progetto su supabase.com
2. Aggiorna `.env.local`:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<nuovo-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<nuova anon key>
   ```

3. Riavvii l'app

**Verifica rapida** (da WSL o telefono):

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://rgwkuejuklbcoxzlsamd.supabase.co
# atteso: 200/3xx (progetto vivo) — se 000 il progetto è morto
```

### 1. `SocketTimeoutException: failed to connect to /172.20.80.184 (port 8081)`

**Causa**: WSL2 dietro NAT — il telefono non raggiunge l'IP di WSL.

**Fix**:

```bash
adb reverse tcp:8081 tcp:8081   # prima di avviare Metro
pnpm exec expo start --host lan
```

### 2. Splash screen bloccata / `ClassNotFoundException: expo.modules.splashscreen.SplashScreenManager`

**Causa**: build Android incompleta o interrotta (un `expo run:android` killato a metà
lascia l'APK senza moduli nativi → la splash non riesce a chiudersi).

**Fix**: clean build, fermando prima i daemon Gradle che tengono i lock:

```bash
cd android && ./gradlew --stop && cd ..
rm -rf android/app/build android/build android/.gradle
scripts/dev-android.sh          # ricompila da zero
```

**Verifica** che il modulo sia nel dex prima di reinstallare:

```bash
unzip -l android/app/build/outputs/apk/debug/app-debug.apk | grep -c SplashScreenManager
# atteso: la stringa compare nei classes*.dex (uso: unzip -p ... classes*.dex | grep)
```

### 3. La build sembra non cambiare nulla (`UP-TO-DATE`)

Gradle riusa la cache: dopo errori nativi cancella `android/app/build` (vedi #2).

### 4. `DevLauncherErrorActivity` / schermata d'errore del dev launcher

**Causa**: stato residuo dell'app (URL vecchio col IP WSL memorizzato).

**Fix**:

```bash
adb shell am force-stop com.nutriplanit.app
adb shell pm clear com.nutriplanit.app   # azzera la configurazione del launcher
# poi riapri l'app
```

### 5. L'app va in background appena avviata (home screen)

**Causa**: keyguard attivo (Doze/schermo bloccato) — il sistema blocca l'avvio
via adb (`BAL_BLOCK`, `TOP_SLEEPING` nei log).

**Fix**: sblocca fisicamente il telefono prima di avviare, oppure:

```bash
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
```

### 6. URL del dev client col IP sbagliato

Se il dev client continua a puntare a `172.20.80.184:8081`, forzalo col tunnel:

```bash
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW \
  -d 'exp+nutriplanit://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'
```

> Lo schema è `exp+nutriplanit://` (da `scheme` in app.json), **non** `exp://`
> (`exp://` non risolve: `unable to resolve Intent`).

### Log utili

```bash
adb logcat -d | grep -iE 'DevLauncher|ReactNativeJS|bundle|SplashScreen'  # app
tail -f /tmp/expo-start.log                                              # Metro
curl -s http://127.0.0.1:8081/status    # atteso: packager-status:running
adb shell dumpsys window | grep mCurrentFocus   # che schermata ha il focus
```

## Project Structure

```
├── app/                 # Expo Router pages
├── src/
│   ├── components/      # Reusable UI components
│   ├── db/              # Drizzle schema + client
│   ├── hooks/           # React Query hooks
│   ├── services/        # Business logic
│   ├── stores/          # Zustand stores
│   └── utils/           # Helper functions
├── api/                 # Cloudflare Worker (Hono)
├── recipe-manager/      # Python CLI for recipe management
└── docs/                # Documentation
```

## API Endpoints

- `GET /recipes` — List all recipes with ingredients and steps
- `GET /recipes/:id` — Single recipe details

## Development

```bash
# Type check
pnpm exec tsc --noEmit

# Lint
pnpm exec biome check ./

# Deploy API
cd api && npx wrangler deploy
```

## Documentation

- [Product Requirements](docs/PRD.md)
- [Data Models](docs/data-models.md)
- [Screen Flows](docs/screen-flow.md)
- [Task Tracker](docs/task.md)
