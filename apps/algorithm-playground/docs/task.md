# Algorithm Improvements - Task Tracker

## Overview
Miglioramenti all'algoritmo di meal planning identificati dall'analisi del 04/01/2026.

**Target:** 1876 kcal/day (Armando, cut)
**Problema principale:** Monotonia e porzioni irrealistiche

---

## Modifiche da Implementare

### 1. Anti-Repetition Window
- [x] Implementare cooldown di 3 giorni per le ricette
- [x] Tracciare `recipeLastUsedDay: Map<string, number>` (recipeId → ultimo giorno usato)
- [x] Filtrare ricette usate negli ultimi 3 giorni

**File:** `mealPlanPlayground.ts` ✅

---

### 2. Side Dish Rotation
- [x] Tracciare ultimo side dish usato (`lastSideId`)
- [x] Evitare stesso side dish in pasti consecutivi
- [x] Se solo 1 side disponibile, fallback a quello

**File:** `mealPlan.logic.ts` → `calculateMealComposition()` ✅

---

### 3. GapFill Portion Balancing
- [x] Limitare side dish a max 35% delle kcal del pasto (`MAX_SIDE_RATIO = 0.35`)
- [x] Log quando gap eccede il cap

**File:** `mealPlan.logic.ts` → `calculateMealComposition()` ✅

---

### 4. Fallback Migliorato (Day 6 Problem)
- [x] `todayRecipeIds: Set<string>` per tracciare ricette usate oggi
- [x] Per dinner, escludere ricette già usate nello stesso giorno
- [x] Log chiaro quando si usa fallback

**File:** `mealPlanPlayground.ts` ✅

---

### 5. Dynamic Density Threshold
- [x] Threshold dinamico: `(mealTargetKcal / 350) * 100`
- [x] Cap a 150 (`MAX_DYNAMIC_THRESHOLD`)
- [x] Log mostra threshold calcolato nel debug

**File:** `mealPlan.logic.ts` ✅

---

### 6. Hybrid Bulk Strategy (NEW)
- [x] **Adaptive Threshold:** `MAX_DYNAMIC_THRESHOLD` scala con calorie giornaliere (150 -> 180 -> 220)
- [x] **Dynamic Portion Cap:** `MAX_MAIN_GRAMS` scala con calorie pasto (300g -> 400g+)
- [x] **Bulk Priority:** In bulk, prioritizzare ricette > 150 kcal/100g

**Files:** `mealPlan.logic.ts`, `mealPlanPlayground.ts` ✅

---

### 7. Smart Meal Distribution (NEW)
- [x] **Mandatory Snacks:** Override preferenza snack se target calorico elevato (>2200 -> 4 pasti, >2800 -> 5 pasti)
- [x] **Bulk Ratios:** Nuova distribuzione per target > 2800 kcal (20-15-25-15-25) per bilanciare meglio il carico

**Files:** `mealPlan.logic.ts`, `mealPlanPlayground.ts` ✅

---

### 8. Expanded Snack Pool (Hybrid Bulk)
- [x] **Pool Expansion:** Se Bulk > 2800, includere `breakfast` nel pool degli snack
- [x] **Smart Filter:** Filtrare le `breakfast` idonee (es. Alta Densità > 120 kcal/100g, High Protein)

**File:** `mealPlanPlayground.ts` ✅

> [!IMPORTANT]
> **REMINDER TEST:** Verificare manualmente che le "colazioni" scelte come snack abbiano senso (es. Pancake OK, Porridge OK). Valutare tag "snackable" in futuro.

---

### 9. Kitchen Tab Integration (Portion Tests)
- [x] **Data Fetching:** Modificare query in `mealPlanPlayground.ts` per recuperare ingredienti e `cooked_weight_factor`.
- [x] **Logic Porting:** Adattare `portion-calculator.ts` in `kitchen.logic.ts` nel playground.
- [x] **Output:** Stampare nel log le porzioni personalizzate (Crudo vs Cotto) per ogni membro della famiglia.

**Files:** `mealPlanPlayground.ts`, `kitchen.logic.ts` ✅

---

### 10. Recipe Expansion (High Density Sides)
- [x] **New JSONs:** Creati 8 nuovi contorni densi (Riso, Pane, Polenta, Couscous, Patate Dolci, Quinoa, Farro, Purè)
- [x] **DB Sync:** Sincronizzati su Turso tramite script `recipe-manager`
- [x] **Goal:** Risolvere la monotonia del "GapFill" in Bulk offrendo più alternative ad alta densità.

**Files:** `recipe-manager/recipes_data/*.json` ✅

---

### 11. Double Side Dish Feature (Precision GapFill)
- [x] **Logic:** Aggiunta logica per includere un secondo contorno (Pane) se il primo raggiunge il cap di 350g.
- [x] **Precision:** Mantiene l'accuratezza calorica ~100% senza servire porzioni irrealistiche.
- [x] **UI Display:** Aggiornata la `MealPlanTable.tsx` per visualizzare entrambi i contorni e sommare correttamente le kcal.

**Files:** `mealPlan.logic.ts`, `MealPlanTable.tsx` ✅

---

### 12. Density-Aware Main Dish Cap
- [x] **Logic:** Aumento del cap per i piatti principali leggeri (< 140 kcal/100g) da 300g a 450g.
- [x] **Goal:** Ridurre la necessità di contorni ridondanti (es. patate + riso) permettendo al piatto principale di raggiungere un volume più naturale e saziante.

**Files:** `mealPlan.logic.ts` ✅

---

### 13. Composition Balancing (Carb Safeguard & Protein Limit)
- [x] **Carb Safeguard:** Se main è Low Carb (<12%), forza side dish ad alta densità (Pane/Patate) invece di verdure.
- [x] **Protein Limit:** Limite Hard di 2 utilizzi giornalieri per ogni fonte proteica (evita "giorno delle uova").
- [x] **Soft Preference:** Evita di ripetere la fonte proteica della colazione a pranzo, se possibile.

**Files:** `mealPlan.logic.ts`, `mealPlanPlayground.ts` ✅

---

## Test Checklist
- [x] Generare piano 7 giorni
- [x] Verificare nessuna ricetta ripetuta entro 3 giorni
- [x] Verificare side dish diversi in giorni consecutivi (VARIETA' OK: Riso, Purè, Farro, Quinoa, Couscous, Patate)
- [x] Verificare porzioni side max 35% kcal pasto
- [x] Verificare Day 6 non ha stessa ricetta pranzo/cena
- [x] Verificare accuracy kcal ancora ~99%

---

## Log Modifiche

| Data | Modifica | Stato |
|------|----------|-------|
| 04/01/2026 | Creato task tracker | ✅ |
| | Implementare mod 1-5 | ✅ |
| | Implementare Hybrid Bulk Strategy | ✅ |
| | Test nel playground | ✅ |
