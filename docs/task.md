# NutriPlanIT - Task Tracker

> **Last Updated:** 2026-01-01

...

- [x] Integrate Supabase Auth
- [x] Sync command (local JSON -> Turso)
...
- [x] Debug: Meal Gen Logic (main_course category)
- [x] Debug: Recipe Images (verified URL)
> ⚠️ **LEGGI QUESTO FILE ALL'INIZIO DI OGNI SESSIONE**

---

## 📚 Documentazione di Riferimento

Prima di lavorare su qualsiasi task, consulta i documenti pertinenti:

| Documento | Quando usarlo |
|-----------|---------------|
| [PRD.md](PRD.md) | Requisiti prodotto, features, monetizzazione |
| [data-models.md](data-models.md) | Schema DB, tabelle, relazioni |
| [screen-flow.md](screen-flow.md) | Wireframes, navigazione, user flows |
| [expo-best.practices.md](expo-best.practices.md) | **SEMPRE** - Regole Expo/RN obbligatorie |

### Mapping Task → Documenti

| Task | Documenti da consultare |
|------|------------------------|
| Setup progetto | `expo-best.practices.md` |
| Auth/Onboarding | `screen-flow.md` (sezione 1-2), `PRD.md` (sezione 3.1-3.2) |
| Ricette | `data-models.md` (Recipe, Ingredient), `screen-flow.md` (3.2, 4.1) |
| Piano settimanale | `data-models.md` (MealPlan, PlannedMeal), `screen-flow.md` (3.3), `PRD.md` (Sezione 3.5) |
| Shopping list | `data-models.md` (ShoppingList), `screen-flow.md` (4.3-4.4) |
| Tracking peso | `data-models.md` (WeightLog), `screen-flow.md` (3.4, 4.5) |

---

## Phase 1: Progettazione ✅

- [x] PRD (Product Requirements Document)
- [x] Stack tecnologico (Turso + Supabase Auth + Cloudinary)
- [x] Data Models (15 tabelle)
- [x] Screen Flow + Wireframes

---

## Phase 2: Setup Progetto

> 📖 **Docs:** `expo-best.practices.md`

- [x] Inizializzazione Expo SDK 54+
- [x] Setup NativeWind 4.x
- [x] Setup Expo Router
- [x] Configurazione TypeScript + Biome
- [x] Setup Supabase Auth
- [x] Setup Turso + Drizzle ORM
- [x] Struttura cartelle progetto

---

## Phase 3: Auth & Onboarding

> 📖 **Docs:** `screen-flow.md` (sezioni 1-2), `data-models.md` (User, FamilyMember)

- [x] WelcomeScreen
- [x] LoginScreen + SignupScreen
- [x] Integrazione Supabase Auth
- [x] OnboardingGoalScreen
- [x] OnboardingProfileScreen
- [x] OnboardingTDEEScreen (formula in `GEMINI.md`)
- [x] OnboardingFamilyScreen

---

## Phase 4: Core Features ✅

> 📖 **Docs:** `screen-flow.md` (sezioni 3-4), `data-models.md` (Recipe, MealPlan, PlannedMeal)

- [x] HomeScreen (dashboard)
- [x] RecipesScreen + RecipeDetailModal
- [x] PlanScreen (piano settimanale)
- [x] Algoritmo generazione meal plan (logica in `GEMINI.md`)
- [x] MealSwapModal
- [x] ShoppingListModal

---

## Phase 5: Tracking & Profile

> 📖 **Docs:** `screen-flow.md` (sezioni 3.4-3.5, 4.5-4.6), `data-models.md` (WeightLog, SavedRecipe)

- [x] ProgressScreen (peso/misure)
- [x] AddWeightModal
- [x] ProfileScreen
- [x] AddFamilyMemberModal
- [x] Gestione membri famiglia

---

## Phase 6: Content Tool (Python)

> 📖 **Docs:** `data-models.md` (Recipe, Ingredient, RecipeIngredient)

- [x] Setup FastAPI + Streamlit (replaced by CLI/Typer)
- [x] Integrazione USDA API
- [x] CRUD Ricette & Ingredienti (via CLI)
- [x] Upload immagini Cloudinary
- [x] Sync command (local JSON -> Turso)

---

## Phase 7: Polish & Launch

- [x] Smart Portion Scaler (Cooking Mode)
    - [x] Logic: Portion Calculator (Raw/Cooked)
    - [x] UI: CookingModeModal (Selector + Views)
    - [x] Integration: RecipeScreen & PlanScreen
- [x] Family Member Management
    - [x] F1: Modify `goal.tsx` to handle `mode=add-member`
    - [x] F2: Modify `tdee.tsx` for add-member completion
    - [x] F3: Create `member-detail.tsx` modal
    - [x] F4: Add `updateFamilyMember` service
    - [x] F5: Update `profile.tsx` tab (navigate to wizard + detail modal)
    - [x] V1: Test add-member wizard flow
    - [x] V2: Test view/edit member flow
- [x] Password Reset & Auth Improvements
    - [x] F1: Feature: Mostra/Nascondi password (Login/Signup)
    - [x] F2: Feature: Forgot Password Screen (`forgot-password.tsx`)
    - [x] F3: Feature: Reset Password Screen (`reset-password.tsx`)
    - [x] F4: Configurazione Deep Linking & Auth Recovery logic in `_layout.tsx`
- [ ] E2E Testing (Maestro/Puppeteer)
- [x] Ottimizzazione performance
    - [x] F1: Hook `useDebouncedValue` per ricerca
    - [x] F2: FlatList → FlashList in `recipes.tsx`
    - [x] F3: `React.memo` su `RecipeCard`
    - [x] F4: `React.memo` + `cachePolicy` su `MealCard`
    - [x] F5: `useMemo`/`useCallback` in `plan.tsx`
- [x] Fix: User name display on Home Screen (! issue)
- [ ] EAS Build (iOS + Android)
    - [x] Supabase: Configurare Redirect URL (`nutriplanit://auth/callback`)
- [ ] App Store submission
- [/] **Meal Plan Enhancements** (Jan 2026)
    - [x] B1: Schema migration `isSkipped` + `deleteMealPlanForWeek`
    - [x] B2: `getSwapAlternatives` con filtro categoria/kcal
    - [x] B3: `swapMealRandom` per swap casuale
    - [x] B4: `toggleSnackForDay` + ricalcolo porzioni
    - [x] B5: `recalculateDayPortions` helper
    - [x] F1: Nuovi hooks in `useMealPlan.ts`
    - [x] F2: Redesign `meal-swap.tsx` con 2 modalità
    - [x] F3: Bottone "Nuovo Piano" con conferma in `plan.tsx`
    - [x] F4: Toggle snack globale (ActionSheet) in `plan.tsx`
    - [x] F5: Toggle snack per giorno (context menu)
    - [x] F6: Passa params corretti da `MealCard` a modal
    - [x] V1: Test manuale rigenerazione piano
    - [x] V2: Test manuale swap casuale/manuale
    - [ ] V3: Test manuale toggle snack (ActionSheet + Day Option)
    - [x] CLEANUP: (Annullato/Ripristinato log su richiesta utente)

---

## Phase 8: NutriPlanIT 2.0 (Smart Density & Sides) ⏳

> 🧠 **Docs:** `docs/analisi-algoritmo.md` (v2.0 Logic)
> 🎯 **Obiettivo:** Risolvere "Cut Paradox" (proteine insufficienti) e "Giant Steak Paradox" (mancanza carboidrati).

- [ ] **Schema & Data**
    - [x] DB: Migration `planned_meals` (`side_recipe_id`, `side_portion_grams`)
    - [x] DB: Update `recipes` check constraint for category `side`
    - [x] Seed: Inserire contorni base (Pane, Patate, Riso, Insalata)

- [ ] **Logic Layer (Libs)**
    - [x] TDEE: Implement `calculateMacroTargets` (2.1g/kg Cut, 1.7g/kg Bulk)
    - [x] Onboarding: Update `tdee.tsx` UI & Logic to use dynamic grams

- [ ] **Algorithm Engine (Service)**
    - [ ] Service: Implement `getSidesForGap(gapKcal, missingMacro)`
    - [ ] Service: Update `generateMealPlan` loop with "Main + Side" logic
    - [ ] Service: Update `recalculateDayPortions` to handle sides

- [ ] **UI Implementation**
    - [ ] `MealCard`: Show Side Dish info ("+ 50g Pane")
    - [ ] `ShoppingList`: Include side ingredients in aggregation

- [ ] **Verification**
    - [ ] Test V1: User in CUT (High Protein Main check)
    - [ ] Test V2: User in BULK (Large Gap -> Side Dish insertion check)

---

## 🔄 Protocollo Aggiornamento

```
[ ] = Non iniziato
[/] = In corso
[x] = Completato
```

**All'inizio di ogni sessione:**
1. Leggi questo file
2. Identifica il prossimo task `[ ]`
3. Marcalo come `[/]`
4. Consulta i documenti correlati

**Alla fine di ogni sessione:**
1. Marca i task completati con `[x]`
2. Aggiorna "Last Updated" in cima
3. Committa le modifiche
