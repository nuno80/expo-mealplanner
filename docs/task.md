# NutriPlanIT - Task Tracker

> **Last Updated:** 2025-12-28
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

- [ ] ProgressScreen (peso/misure)
- [ ] AddWeightModal
- [ ] ProfileScreen
- [ ] AddFamilyMemberModal
- [ ] Gestione membri famiglia

---

## Phase 6: Content Tool (Python)

> 📖 **Docs:** `data-models.md` (Recipe, Ingredient, RecipeIngredient)

- [ ] Setup FastAPI + Streamlit
- [ ] Integrazione USDA API
- [ ] CRUD Ricette
- [ ] CRUD Ingredienti
- [ ] Upload immagini Cloudinary

---

## Phase 7: Polish & Launch

- [ ] Testing E2E
- [ ] Ottimizzazione performance
- [ ] EAS Build (iOS + Android)
- [ ] App Store submission

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
