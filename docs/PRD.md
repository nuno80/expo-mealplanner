# NutriPlanIT - Product Requirements Document

> **Version:** 1.1 (Final)
> **Last Updated:** 2025-12-28
> **Status:** ✅ Approved

---

## 1. Executive Summary

**NutriPlanIT** è un'app mobile (iOS/Android) sviluppata con Expo SDK 54+ che genera piani alimentari settimanali personalizzati basati sugli obiettivi calorici e macro dell'utente. Supporta profili familiari multipli, permettendo di cucinare lo stesso pasto con porzioni diverse per ogni membro.

### Core Value Proposition
> "Un piano alimentare settimanale per tutta la famiglia, in 3 tap. Stesse ricette, porzioni diverse."

### Target Market
| Segmento | Priorità | Descrizione |
|----------|----------|-------------|
| Weight Loss Beginners | MVP | Chi vuole perdere peso senza complicazioni |
| Fitness Enthusiasts | MVP | Chi traccia i macro per performance/massa |
| Families | MVP | Genitori che pianificano pasti per tutti |
| Special Diets | v2.0 | Vegani, intolleranze, diabetici |

---

## 2. Decisions Summary

| Area | Decisione | Rationale |
|------|-----------|-----------|
| **App Name** | NutriPlanIT | Unico, registrabile, richiama Italia |
| **Meal Plan Engine** | Algoritmo deterministico | Zero costi API, offline, prevedibile |
| **Backend** | Turso + Supabase Auth + Cloudinary | Edge performance, free tier generosi |
| **Recipe DB** | 100 ricette al lancio | Sufficiente per varietà iniziale |
| **Nutrition API** | USDA (gratuito) | Zero costi, dati affidabili |
| **Languages** | IT + EN dal day 1 | Mercato più ampio senza overhead eccessivo |
| **Content Tool** | App separata (Python/Next.js) | Disaccoppiata dall'app mobile |

---

## 3. Feature Specification

### 3.1 Onboarding & Profile Setup
| Feature | Dettagli |
|---------|----------|
| Account creation | Email/password + OAuth (Google, Apple) |
| Personal data | Età, sesso, altezza, peso attuale, livello attività |
| TDEE Calculator | Formula Mifflin-St Jeor + activity multiplier |
| Goal setting | Cut/Bulk/Maintain con target deficit/surplus |
| Macro split | Default 40/30/30 o custom |

### 3.2 Family Profiles
| Feature | Dettagli |
|---------|----------|
| Add family members | Nome, dati fisici, obiettivi individuali |
| Individual TDEE | Calcolo separato per ogni membro |
| **Portion scaling** | Quantità precise per ingrediente (crudo E cotto) |
| Unified meal plan | Stesse ricette, grammi diversi per persona |

> [!IMPORTANT]
> **Esempio Portion Scaling:**
> Pasta al pomodoro per famiglia Rossi (3 persone):
> - Papà (cut -400kcal): 70g pasta cruda → ~150g cotta
> - Mamma (mantenimento): 85g pasta cruda → ~180g cotta
> - Figlio (bulk +500): 120g pasta cruda → ~250g cotta
> - **Totale da cuocere:** 275g pasta cruda

### 3.3 Recipe Database
| Feature | Dettagli |
|---------|----------|
| Curated recipes | 100 ricette verificate al lancio |
| Nutritional data | Calorie, proteine, carboidrati, grassi per 100g |
| **Raw/Cooked weights** | Fattori di conversione per ogni ingrediente |
| Scaling | Ricalcolo automatico per porzione |
| Categories | Colazione, Pranzo, Cena, Snack |
| Prep time | Tempo di preparazione stimato |
| Ingredients | Lista ingredienti con quantità |
| Instructions | Passi di preparazione |
| Languages | IT + EN |

### 3.4 Content Management Tool (Separate App)

```
┌─────────────────────────────────────────────────────────┐
│  NutriPlanIT Recipe Manager (Python/Next.js)            │
├─────────────────────────────────────────────────────────┤
│  1. Admin inserisce nuova ricetta                       │
│  2. Tool chiama USDA API per dati nutrizionali          │
│  3. Admin verifica/corregge valori                      │
│  4. Dati salvati in Turso                               │
│  5. App mobile legge DB aggiornato                      │
└─────────────────────────────────────────────────────────┘
```

**Tech Choice:** Python (FastAPI + simple UI) per rapidità di sviluppo.

### 3.5 Meal Plan Generation

| Feature | Dettagli |
|---------|----------|
| Plan structure | 7 giorni × (Colazione + Pranzo + Cena + 2 Snack opzionali) |
| Target calculation | Basato su TDEE - deficit (o + surplus) |
| Weekly target | Il totale kcal è **settimanale**, non giornaliero |
| Snack toggle | Attivabile per chi è in bulk |
| **Swap meal** | Sostituisci un pasto con alternativa simile |
| **Regenerate meal** | Rigenera un singolo pasto |
| **Regenerate day** | Rigenera tutti i pasti di un giorno |

#### Algorithm Logic (MVP)
```
1. INPUT: user profile (TDEE, goal, macro split, snacks_enabled)
2. CALCULATE: weekly_target = (TDEE + adjustment) × 7
3. FOR each day (1-7):
   a. SELECT breakfast from category="breakfast"
   b. SELECT lunch from category="lunch"
   c. SELECT dinner from category="dinner"
   d. IF snacks_enabled: SELECT 2 snacks
   e. AVOID recipes used in last 3 days (diversity)
4. OPTIMIZE: adjust portions to hit weekly_target ±5%
5. OUTPUT: meal_plan with per-person portions
```

### 3.6 Shopping List
| Feature | Dettagli |
|---------|----------|
| Auto-generation | Genera lista da ricette settimanali |
| Family aggregation | Somma quantità per tutta la famiglia |
| Check off items | Spunta durante la spesa |
| Share list | Condividi via WhatsApp/Link |

### 3.7 Progress Tracking
| Feature | Dettagli |
|---------|----------|
| Weight log | Inserimento peso con data |
| Measurements | Circonferenze (vita, fianchi, braccia) - opzionale |
| Progress chart | Grafico andamento nel tempo |
| Weekly summary | Recap calorie consumate vs target |

### 3.8 Blog (Content Hub)
| Feature | Dettagli |
|---------|----------|
| Article feed | Lista articoli con preview |
| Categories | Esercizi, Salute, Bellezza, Nutrizione |
| Article detail | Contenuto completo con immagini |
| Content source | Scritto dal proprietario |
| Languages | IT + EN |

---

## 4. Monetization Strategy

### Freemium Model

| Tier | Prezzo | Features |
|------|--------|----------|
| **Free** | €0 | 1 profilo, 1 piano/settimana, blog, 5 ricette salvate |
| **Premium** | €4.99/mese | Famiglia illimitata, swap illimitati, lista spesa, tracking completo |
| **Premium Annual** | €39.99/anno | Come Premium, 33% sconto |

---

## 5. Technical Stack

### Mobile App (Expo)
| Area | Tecnologia |
|------|------------|
| Framework | Expo SDK 54+, React Native 0.76+, React 19 |
| State | Zustand + TanStack Query |
| Forms | react-hook-form + Zod |
| Lists | FlashList |
| Storage | expo-sqlite/kv-store |
| Images | **expo-image + Cloudinary CDN** |
| Navigation | Expo Router v5/v6 |
| Styling | NativeWind 4.x |
| Build | EAS Build (Development Build) |

### Backend
| Area | Tecnologia |
|------|------------|
| Database | **Turso** (libSQL edge) + Drizzle ORM |
| API | Hono (type-safe) su Cloudflare Workers |
| Auth | **Supabase Auth** (50K MAU free) |
| Images | **Cloudinary** CDN (25 credits/mo free) |
| Hosting | Cloudflare Workers (100K req/day free) |

### Content Management Tool
| Area | Tecnologia |
|------|------------|
| Framework | Python FastAPI + Streamlit UI |
| Nutrition API | USDA FoodData Central (gratuito) |
| Purpose | Popolare DB ricette offline |

---

## 6. Success Metrics (KPIs)

| Metrica | Target MVP | Target 6 mesi |
|---------|------------|---------------|
| Downloads | 1,000 | 10,000 |
| Premium conversion | 3% | 5% |
| Retention D7 | 30% | 40% |
| Meal plans generated/week | 500 | 5,000 |

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Recipe DB troppo piccolo | Priorità content creation pre-lancio |
| Algoritmo non soddisfa | Feedback loop, tuning continuo |
| Porzioni imprecise (crudo/cotto) | Fattori conversione verificati |
| Competition | Focus su family feature differenziante |

---

## 8. Project Structure

```
nutriplanit/
├── apps/
│   ├── mobile/          # Expo app (NutriPlanIT)
│   └── recipe-manager/  # Python tool per gestione ricette
├── packages/
│   └── shared/          # Tipi condivisi, Zod schemas
└── docs/
    └── PRD.md           # Questo documento
```

---

## 9. Next Steps

1. ✅ PRD approvato
2. [ ] Definire data models dettagliati (User, Family, Recipe, MealPlan)
3. [ ] Setup Turso + Clerk + schema iniziale
4. [ ] Creare Recipe Manager tool (Python)
5. [ ] Inizializzare progetto Expo
6. [ ] Wireframe schermate principali
