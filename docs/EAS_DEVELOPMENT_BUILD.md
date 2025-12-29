# EAS Development Build - Guida Android

## Cos'è una Development Build?

Una **Development Build** è un APK/AAB personalizzato che include:
- Il tuo codice nativo (a differenza di Expo Go che usa moduli precompilati)
- Tutte le librerie native che richiedono compilazione (reanimated 4.x, bottom-sheet, ecc.)
- Dev tools per debugging e hot reload

### Expo Go vs Development Build

| Aspetto | Expo Go | Development Build |
|---------|---------|-------------------|
| Setup | Zero (scarichi app) | ~10-15 min (EAS build) |
| Librerie native | Solo preinstallate | Qualsiasi |
| Hot Reload | ✅ | ✅ |
| Produzione | ❌ | ✅ Base per release |

---

## Comandi Utili

### Build Development
```bash
# Android
eas build --profile development --platform android

# iOS (richiede Apple Developer account)
eas build --profile development --platform ios

# Entrambi
eas build --profile development --platform all
```

### Download APK
```bash
# Scarica l'ultimo build
eas build:download --latest --platform android

# Oppure vai su https://expo.dev e scarica manualmente
```

### Installazione APK
```bash
# Via ADB (se hai Android SDK)
adb install path/to/fantavega-mobile.apk

# Oppure trasferisci file su telefono e installa manualmente
```

---

## Workflow di Sviluppo

### 1. Prima volta (o dopo cambio librerie native)
```bash
# Build necessario
eas build --profile development --platform android
```

### 2. Sviluppo quotidiano
```bash
# Avvia dev server (l'app si connette automaticamente)
pnpm exec expo start --tunnel

# Oppure senza tunnel (stessa rete WiFi)
pnpm exec expo start
```

### 3. Aggiornamenti JS (senza rebuild)
- Modifche a file `.tsx`, `.ts`, `.js` → Hot reload automatico
- Modifiche a `app.json` → Riavvia server
- Nuove librerie JS-only → `pnpm install` + riavvia

### 4. Rebuild necessario quando:
- Aggiungi libreria con codice nativo
- Modifichi `app.json` (plugins, splash, icon)
- Aggiorni versione Expo SDK
- Cambi configurazione EAS

---

## Configurazione EAS

### eas.json
```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

### Profili:
- **development**: Per sviluppo con dev tools
- **preview**: Per testing interno (senza dev tools)
- **production**: Per Play Store

---

## Troubleshooting

### Build fallisce durante Prebuild
```
Error: ENOENT: no such file or directory, open './assets/...'
```
**Soluzione**: Verifica che tutti i file in `app.json` esistano (icon, splash, notification-icon).

### App non si connette al dev server
1. Verifica che telefono e PC siano sulla stessa rete
2. Usa `--tunnel` se hai problemi di rete
3. Controlla firewall (porta 8081)

### "Development build is not installed"
L'APK Development Build non è installato. Scaricalo da Expo Dashboard.

---

## Link Utili

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Expo Dashboard](https://expo.dev)
