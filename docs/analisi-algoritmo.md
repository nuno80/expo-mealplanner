# 🧠 Guida Algoritmo Meal Plan (Dieta Mediterranea)

**Versione:** 2.6 (11 Gennaio 2026)
**Stato:** ✅ IMPLEMENTATO (10/10)

## Panoramica

L'algoritmo di generazione dei piani alimentari è progettato per aderire alle linee guida della **Dieta Mediterranea** e del **Piatto del Mangiar Sano di Harvard**.
Gestisce attivamente la **rotazione delle fonti proteiche**, la **differenziazione tra pranzo e cena**, e garantisce la presenza di **verdure** secondo le linee guida nutrizionali.

---

## 1. Regole Nutrizionali

### A. Quote Proteiche Settimanali

| Fonte Proteica | Min | Max | Note |
| :--- | :--- | :--- | :--- |
| **Legumes** | 3 | 5 | Ceci, fagioli, lenticchie |
| **Fish** | 3 | 4 | Pesce azzurro preferito (Omega-3) |
| **White Meat** | 2 | 3 | Pollo, tacchino |
| **Eggs** | 2 | 4 | Uova |
| **Dairy** | 2 | 3 | Latticini freschi, yogurt |
| **Red Meat** | 0 | 1 | Limitata fortemente |
| **Plant Based** | 0 | 3 | Tofu, seitan, tempeh |

### B. Mod 19: Quota Enforcement (Tutti i Pasti) 🆕

La quota enforcement si applica ora a **TUTTI** i pasti, incluso breakfast:
```
IF proteinTracker[source].current >= max THEN
   exclude recipes with that source from pool
   log: "breakfast: Excluding dairy (quota full)"
```

### C. Distribuzione Calorica

| Profilo | Distribuzione |
|---------|---------------|
| **Standard (3 pasti)** | 20% colazione, 40% pranzo, 40% cena |
| **Con snack (4-5 pasti)** | 20-10-30-10-30 |

---

## 2. Sistema Gap Fill (Side Dishes)

### A. Trigger Condizionali

| Trigger | Condizione | Esempio |
|---------|------------|---------|
| **High Protein + Low Carb** | P > 15g AND C < 10g | Petto di pollo, Salmone |
| **Low Density** | < 150 kcal/100g | Insalate, Tofu, Zuppe |

### B. Caps e Limiti

| Parametro | Valore |
|-----------|--------|
| **MAX_MAIN_GRAMS** | 300g (450g per low-density) |
| **MAX_SIDE_GRAMS** | 200g |
| **SIDE_KCAL_CAP** | 35% target pasto |
| **MIN_SIDE_DENSITY** | 110 kcal/100g |

### C. Mod 16: Complementazione Legumi-Cereali 🫘🌾

```
IF main.proteinSource === "legumes" THEN
   force sides with CHO > 25g (Riso, Pane, Farro)
```

### D. Mod 17: Side2 Bread-Only 🍞

Se gap > 100 kcal dopo side1, aggiunge solo items "bread-like" (kcal ≥ 250, CHO 40-75g).

---

## 3. Harvard Plate (Mod 18) 🥦

### A. Logica

```
IF mealType IN [lunch, dinner] THEN
   IF main.tags NOT INCLUDES "vegetable_heavy" THEN
      ADD vegetable_side (150g, rotazione 2 giorni)
   ELSE
      log: "Main is vegetable_heavy, skipping"
```

### B. Tag Nutrizionali

| Tag | Criterio | Uso |
|-----|----------|-----|
| `vegetable_heavy` | >50% verdure | Skip vegSide |
| `whole_grain` | Cereali integrali | Informativo |
| `legume_based` | Fonte = legumi | Trigger grain sides |
| `starchy` | Patate, riso, pane | Evita in vegSide |

---

## 4. Struttura Pasto Completa

```
┌─────────────────────────────────────────┐
│ MAIN COURSE                             │
│ es. Zuppa di Lenticchie (300g)          │
├─────────────────────────────────────────┤
│ + SIDE 1 (Gap Fill)                     │
│   es. Crostini (87g) [legume→grain]     │
├─────────────────────────────────────────┤
│ + SIDE 2 (Bread, se gap > 100 kcal)     │
│   es. Fette di Pane (50g)               │
├─────────────────────────────────────────┤
│ 🥦 VEG SIDE (se !vegetable_heavy)       │
│   es. Asparagi e Cipollotti (150g)      │
└─────────────────────────────────────────┘
```

---

## 5. Manutenzione

- **Main Course**: Devono essere "puri" (no contorni inclusi)
- **Side Dish**: `side_dish` per amidi/generici, ≥110 kcal/100g
- **Vegetable Side**: `vegetable_side` con tag `vegetable_heavy`
- **Tags**: Assegnare per attivare logica Harvard Plate

---

## 6. Scripts di Verifica e Seeding

> 📄 Documentazione completa: [`scripts/README.md`](../scripts/README.md)

| Script | Scopo |
|--------|-------|
| `seed-veg-sides.ts` | Inserisce 12 ricette `vegetable_side` per Harvard Plate |
| `tag-recipes.ts` | Tagga ricette con `vegetable_heavy` e verifica starchy items |
| `verify-algorithm-e2e.ts` | ⭐ Test E2E completo (Cut/Maintain/Bulk) con report dettagliato |
| `verify-seeding.ts` | Verifica stato dati nel DB (conteggi per categoria, tags) |

```bash
# Esecuzione (richiede VITE_TURSO_URL e VITE_TURSO_TOKEN):
npx tsx scripts/verify-algorithm-e2e.ts   # Report → /tmp/verify-algorithm.txt
npx tsx scripts/verify-seeding.ts         # Report → /tmp/verify-seeding.txt
```

---

## Changelog

| Versione | Data | Modifiche |
|----------|------|-----------|
| 1.0 | Gen 2026 | Rotazione proteica base |
| 2.0 | Gen 2026 | Gap Fill con Side Dishes |
| 2.1 | 2 Gen | + Trigger Low Density, + Cap 300g |
| 2.2 | 4 Gen | + Side2, + MAX_SIDE_GRAMS 200g |
| 2.3 | 6 Gen | + Daily limits, breakfast dairy |
| 2.4 | 6 Gen | + Mod 16: Legume-Grain |
| 2.5 | 11 Gen | + Mod 17-18: Bread-Only, Harvard Plate |
| 2.6 | 11 Gen | + Mod 19: Quota Enforcement per tutti i pasti<br>+ 20 ricette taggate `vegetable_heavy` |
| 2.6.1 | 22 Feb | + Migrazione a Expo<br>+ 22 vegetable_side in DB<br>+ 90 ricette taggate<br>+ Script E2E di verifica |
