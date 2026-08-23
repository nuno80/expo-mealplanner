# Algorithm Playground - AI Agent Guide

## PROGETTO
**Tipo:** Web app (Vite + React) per testing algoritmo
**Scopo:** Testare l'algoritmo di meal planning di NutriPlanIT senza Expo/Android
**DB:** Turso Cloud (stesso dell'app mobile)

---

## 1. ARCHITETTURA

```
algorithm-playground/
├── src/
│   ├── lib/
│   │   ├── db.ts           # Turso HTTP client
│   │   └── tdee.ts         # COPIA da mobile (/src/lib/tdee.ts)
│   ├── services/
│   │   ├── mealPlan.logic.ts   # COPIA da mobile (pure logic)
│   │   └── mealPlanPlayground.ts # Service adattato
│   ├── components/
│   │   └── ...             # UI components
│   └── types/
│       └── index.ts        # Tipi condivisi
```

---

## 2. REGOLE CONDIVISIONE CODICE

### File da COPIARE (identici)
| File | Origine | Note |
|------|---------|------|
| `lib/tdee.ts` | `/src/lib/tdee.ts` | BMR, TDEE, macro calculation |
| `services/mealPlan.logic.ts` | `/src/services/mealPlan.logic.ts` | Gap Fill logic, pure functions |

### File da ADATTARE
| File | Origine | Modifiche |
|------|---------|-----------|
| `mealPlanPlayground.ts` | `mealPlan.service.ts` | UUID: `crypto.randomUUID()` invece di `expo-crypto` |
| | | DB: SQL diretto con `@libsql/client` |
| | | No persistenza: risultati in-memory |

---

## 3. ALGORITHM CORE (v2.1)

### Protein Source Rotation (Mediterranean Diet)
| Fonte | Min | Max | Note |
|-------|-----|-----|------|
| Legumes | 3 | 5 | Ceci, fagioli, lenticchie |
| Fish | 3 | 4 | Preferire azzurro (Omega-3) |
| White Meat | 2 | 3 | Pollo, tacchino |
| Eggs | 2 | 4 | |
| Dairy | 2 | 3 | Freschi, magri |
| Red Meat | 0 | 1 | Limitare fortemente |
| Plant Based | 0 | 3 | Tofu, seitan |

### Gap Fill Logic
```
IF main is High Protein + Low Carb (P>15g AND C<10g)
   OR main is Low Density (<120 kcal/100g)
THEN
   1. Cap main at 70% kcal (60% if low density)
   2. Apply 300g MAX cap
   3. Select side dish ≥150 kcal/100g
```

### Meal Distribution
```
none:  breakfast=20%, lunch=40%, dinner=40%
one:   breakfast=20%, lunch=35%, snack_pm=10%, dinner=35%
two:   breakfast=20%, snack_am=10%, lunch=30%, snack_pm=10%, dinner=30%
```

---

## 4. TDEE CALCULATION

```typescript
// BMR (Mifflin-St Jeor)
Male:   10×weight(kg) + 6.25×height(cm) - 5×age + 5
Female: 10×weight(kg) + 6.25×height(cm) - 5×age - 161

// TDEE = BMR × Activity Multiplier
sedentary: 1.2 | light: 1.375 | moderate: 1.55 | active: 1.725 | very_active: 1.9

// Dynamic Protein (Command-by-Cut)
Cut: 2.1 g/kg | Maintain/Bulk: 1.7 g/kg
```

---

## 5. DATABASE

### Connessione
```typescript
import { createClient } from "@libsql/client/web";
const turso = createClient({
  url: import.meta.env.VITE_TURSO_URL,
  authToken: import.meta.env.VITE_TURSO_TOKEN,
});
```

### Tabelle Principali
- `recipes` - Con `protein_source`, `category`, `kcal_per_100g`
- `family_members` - Profili con TDEE/goal
- `meal_plans` + `planned_meals` - Piano generato

---

## 6. TIPI PRINCIPALI

```typescript
type Sex = "male" | "female";
type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
type Goal = "cut" | "maintain" | "bulk";
type ProteinSource = "legumes" | "fish" | "white_meat" | "eggs" | "dairy" | "red_meat" | "plant_based" | "mixed" | "none";
type RecipeCategory = "breakfast" | "main_course" | "snack" | "side_dish";
type MealType = "breakfast" | "lunch" | "dinner" | "snack_am" | "snack_pm";
```

---

## 7. OPERATIONAL MODE

### Default
- **Execute Immediately** - Non serve review per questo tool
- **Debug-first** - Mostra sempre i log delle decisioni algoritmiche
- **Test-oriented** - Ottimizza per iterazione veloce

### Comandi
```bash
pnpm dev          # Start dev server
pnpm build        # Build (raro, è un tool interno)
```

### DB Scripts (One-off Updates)
Per eseguire script TypeScript che parlano con Turso:
```bash
pnpm exec tsx script-name.ts
```

Esempio script per update:
```typescript
import { createClient } from "@libsql/client/web";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, ".env.local") });

const turso = createClient({
  url: process.env.VITE_TURSO_URL!,
  authToken: process.env.VITE_TURSO_TOKEN!,
});

// Query example
const result = await turso.execute("SELECT * FROM recipes LIMIT 5");
console.log(result.rows);

// Update example
await turso.execute({
  sql: "UPDATE recipes SET protein_source = ? WHERE id = ?",
  args: ["none", "recipe-id-here"],
});
```

---

## 8. REFERIMENTI

| Documento | Path |
|-----------|------|
| PRD principale | `/docs/PRD.md` |
| Analisi algoritmo | `/docs/analisi-algoritmo.md` |
| Data models | `/docs/data-models.md` |
| Mobile TDEE | `/src/lib/tdee.ts` |
| Mobile Logic | `/src/services/mealPlan.logic.ts` |
| Mobile Service | `/src/services/mealPlan.service.ts` |
