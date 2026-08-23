# 🧰 Scripts — NutriPlanIT

Script di utilità per gestione dati, debug e verifica dell'algoritmo.
Tutti parlano direttamente con **Turso Cloud** via HTTP.

## Prerequisiti

```bash
# Le variabili Turso devono essere disponibili (uno dei due metodi):
# 1. File recipe-manager/.env → TURSO_DATABASE_URL + TURSO_AUTH_TOKEN
# 2. File apps/algorithm-playground/.env.local → VITE_TURSO_URL + VITE_TURSO_TOKEN
# 3. Variabili d'ambiente inline

# Esecuzione:
npx tsx scripts/<nome-script>.ts
```

---

## 📦 Seeding (Popolamento Dati)

### `seed-sides.ts`
Inserisce 5 `side_dish` base (Pane Integrale, Riso Basmati, Patate al Forno, Insalata Mista, Verdure Grigliate). Skip automatico se già esistono.

```bash
npx tsx scripts/seed-sides.ts
```

### `seed-veg-sides.ts`
Inserisce 12 ricette `vegetable_side` per la logica Harvard Plate (v2.6): Zucchine, Broccoli, Spinaci, Cavolfiore, Fagiolini, Peperoni, Melanzane, Carote, Finocchi, Cime di Rapa, Bietola, Asparagi. Skip automatico se già esistono.

```bash
npx tsx scripts/seed-veg-sides.ts
```

### `tag-recipes.ts`
Tagga automaticamente le ricette esistenti con tag nutrizionali per Harvard Plate:
- Cerca keyword vegetali nei nomi (`verdur`, `insalata`, `spinaci`, `broccol`, ecc.)
- Imposta `tags = '["vegetable_heavy"]'` sulle ricette trovate
- Verifica anche che gli starchy side (pane, riso, patate) abbiano valori kcal/CHO corretti per la logica side2

```bash
npx tsx scripts/tag-recipes.ts
```

---

## 🧪 Verifica Algoritmo

### `verify-algorithm-e2e.ts` ⭐
**Script principale di verifica E2E.** Esegue il test completo dell'algoritmo v2.6:

1. Crea utente e family member temporanei (Cut 1800 kcal, Maintain 2200 kcal, Bulk 3200 kcal)
2. Importa `calculateMealComposition` dal codice reale (`mealPlan.logic.ts`)
3. Genera piani completi per ciascun profilo
4. Valida: Harvard Plate, quote proteiche, deviazione calorica
5. Pulisce i dati temporanei

```bash
npx tsx scripts/verify-algorithm-e2e.ts
# Output dettagliato: /tmp/verify-algorithm.txt
```

**Risultati attesi:**
- Harvard Plate: PASS (0 pasti principali senza verdure)
- Deviazione calorica: <5% settimanale
- Quote proteiche: entro i limiti per i pasti principali

### `verify-algorithm.ts`
Versione "leggera" — crea solo i member temporanei e analizza piani esistenti (non genera). Utile per ri-analizzare piani già generati dall'app.

```bash
npx tsx scripts/verify-algorithm.ts
# Output: /tmp/verify-algorithm.txt
```

### `verify-seeding.ts`
Verifica rapida dello stato dei dati nel DB:
- Conta `vegetable_side` pubblicati
- Conta ricette con `tags` non nulli
- Elenca tutte le ricette taggate per categoria
- Conta ricette per categoria
- Verifica starchy items (pane/riso/patate)

```bash
npx tsx scripts/verify-seeding.ts
# Output: /tmp/verify-seeding.txt
```

---

## 🐛 Debug

### `check-recipe-logic.ts`
Testa la logica di composizione pasto su ricette specifiche.

### `debug-ingredients.ts`
Debug degli ingredienti di una ricetta e dei loro valori nutrizionali.

### `debug-sides.ts`
Debug della selezione side dish per un pasto specifico.

### `test-gapfill.ts`
Testa la logica di Gap Fill (side dish selection) in isolamento.

---

## 🔧 Utility

### `validate_env.js`
Valida che le variabili d'ambiente necessarie siano presenti.

```bash
node scripts/validate_env.js
```
