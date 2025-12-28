# NutriPlanIT - AI Agent Guide

## PROGETTO
**Tipo:** App mobile nativa (greenfield)
**Nome:** NutriPlanIT
**Stack:** Expo SDK 54+, Turso, Supabase Auth, Hono/Cloudflare

> [!IMPORTANT]
> Per regole tecniche dettagliate (librerie, Zod, build, Fabric):
> **[expo-best.practices.md](expo-best.practices.md)**

---

## 1. OPERATIONAL MODES

### Default Mode
- **Execute Immediately:** Segui le istruzioni senza deviare.
- **Zero Fluff:** Niente lezioni filosofiche. Codice e soluzioni.
- **Rationale:** 1-2 frasi sul *perché*, poi il codice.

### "ULTRATHINK" Protocol
Quando l'utente scrive **"ULTRATHINK"**:
- **Override Brevity:** Sospendi "Zero Fluff".
- **Multi-Dimensional Analysis:**
  - *Technical:* Performance rendering, costi re-render, complessità stato.
  - *UX/Accessibility:* Carico cognitivo, accessibilità mobile.
  - *Architectural:* Scalabilità, manutenibilità, modularità.
- **Edge Case Analysis:** Documenta cosa potrebbe andare storto.
- **Prohibition:** MAI ragionamenti superficiali.

---

## 2. UI LIBRARY DISCIPLINE (CRITICAL)

> [!WARNING]
> **NO Shadcn, NO Radix, NO MUI.** Sono web-only.

| Funzionalità | Componente React Native |
|--------------|------------------------|
| Bottoni | `Pressable` + NativeWind |
| Input | `TextInput` + NativeWind |
| Card | `View` + shadow |
| Modal/Dialog | `Modal` nativo RN |
| Liste | `FlashList` con `estimatedItemSize` |
| Bottom Sheet | `Modal` nativo (Fabric-safe) |
| Immagini | `expo-image` + Cloudinary URL |

---

## 3. STACK TECNICO

| Layer | Tecnologia |
|-------|------------|
| **Mobile** | Expo SDK 54+, React 19, NativeWind 4.x |
| **State** | Zustand + TanStack Query |
| **Forms** | react-hook-form + Zod |
| **DB** | Turso (libSQL) + Drizzle ORM |
| **Auth** | Supabase Auth |
| **API** | Hono su Cloudflare Workers |
| **Images** | Cloudinary CDN |
| **Content Tool** | Python FastAPI + Streamlit |

---

## 4. DOMAIN RULES (Nutrizione)

### TDEE Calculation
```
BMR (Mifflin-St Jeor):
  Male:   10×peso(kg) + 6.25×altezza(cm) - 5×età + 5
  Female: 10×peso(kg) + 6.25×altezza(cm) - 5×età - 161

TDEE = BMR × Activity Multiplier
  Sedentary:     1.2
  Light:         1.375
  Moderate:      1.55
  Active:        1.725
  Very Active:   1.9
```

### Portion Scaling
- Ogni ricetta ha valori per **100g**
- Scaling = `(target_kcal / recipe_kcal_per_100g) × 100`
- Fornire sempre **peso crudo** e **peso cotto** (fattore conversione)

### Meal Plan Logic
- Target = **settimanale**, non giornaliero (flessibilità)
- Evita ripetizioni: stessa ricetta max 1 volta ogni 3 giorni
- Snack opzionali (solo per bulk)

---

## 5. RESPONSE FORMAT

**IF NORMAL:**
1. **Rationale:** (1 frase)
2. **The Code.**

**IF "ULTRATHINK":**
1. **Deep Reasoning Chain**
2. **Edge Case Analysis**
3. **The Code** (production-ready)

---

## 6. FILE CHIAVE

| File | Scopo |
|------|-------|
| **`docs/task.md`** | ⚠️ **LEGGI SEMPRE ALL'INIZIO** - Task tracker |
| `docs/PRD.md` | Product Requirements Document |
| `docs/data-models.md` | Schema DB completo |
| `docs/screen-flow.md` | Wireframe e navigazione |
| `docs/expo-best.practices.md` | Regole tecniche Expo/RN |

> [!CAUTION]
> **STARTUP PROTOCOL:**
> 1. **LEGGI** `docs/task.md` all'inizio di ogni sessione
> 2. **AGGIORNA** i task completati con `[x]`
> 3. **MARCA** il task corrente con `[/]`
> 4. **SALVA** prima di concludere la sessione

---

## 7. VALIDATION CHECKLIST

Prima di ogni commit:
```bash
pnpm exec tsc --noEmit        # Type check
pnpm exec biome check ./      # Lint
```

Prima di ogni PR:
- [ ] Zod schema per dati esterni?
- [ ] FlashList con `estimatedItemSize`?
- [ ] `expo-image` per immagini (no `<Image>` RN)?
- [ ] Form con react-hook-form (no `useState`)?
- [ ] Task aggiornato in `docs/task.md`?
