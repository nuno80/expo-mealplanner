# 🧠 Guida Algoritmo Meal Plan (Dieta Mediterranea)

**Versione:** 1.0 (Gennaio 2026)
**Stato:** ✅ IMPLEMENTATO

## Panoramica

L'algoritmo di generazione dei piani alimentari è progettato per aderire alle linee guida della **Dieta Mediterranea** e del **Piatto del Mangiar Sano**.
Non si limita a calcolare le calorie, ma gestisce attivamente la **rotazione delle fonti proteiche** e la **differenziazione tra pranzo e cena** per garantire varietà nutrizionale.

---

## 1. Regole Nutrizionali

### A. Quote Proteiche Settimanali

Per garantire una dieta bilanciata, l'algoritmo distribuisce le fonti proteiche durante la settimana (14 pasti principali: 7 pranzi, 7 cene) seguendo questi target:

| Fonte Proteica | Minimo | Massimo | Note |
| :--- | :--- | :--- | :--- |
| **Legumes** | 3 | 5 | Ceci, fagioli, lenticchie |
| **Fish** | 3 | 4 | Pesce, preferibilmente azzurro o grasso (Omega-3) |
| **White Meat** | 2 | 3 | Pollo, tacchino |
| **Eggs** | 2 | 4 | Uova |
| **Dairy** | 2 | 3 | Latticini freschi, yogurt |
| **Red Meat** | 0 | 1 | Manzo, maiale (limitare fortemente) |
| **Plant Based** | 0 | 3 | Tofu, seitan, tempeh |
| **Mixed / Other** | 0 | 3 | Piatti misti o altre fonti |

### B. Differenziazione Pranzo/Cena

Per evitare la monotonia, l'algoritmo applica la regola della **Diversificazione Giornaliera**:
*   Se a **Pranzo** viene assegnata una ricetta a base di *Legumi*,
*   A **Cena** dello stesso giorno l'algoritmo tenterà attivamente di selezionare una fonte **diversa** (es. *Pesce* o *Uova*).

### C. Gestione Calorie

Le calorie giornaliere (basate sul TDEE dell'utente) sono distribuite secondo percentuali fisse:
- **Colazione**: 20-25%
- **Pranzo**: 30-35%
- **Cena**: 35-40%
- **Snack**: ~15% (se abilitati)

---

## 2. Logica di Funzionamento (`generateMealPlan`)

Il cuore del sistema risiede in `src/services/mealPlan.service.ts`. Ecco come ragiona l'algoritmo, passo dopo passo:

### Fase 1: Inizializzazione
1.  Viene creato un **Protein Tracker** inizializzato a zero per tutte le fonti.
2.  Vengono caricate tutte le ricette pubblicate dal database.

### Fase 2: Iterazione Giornaliera (Giorno 1-7)
Per ogni giorno, vengono generati i pasti in sequenza:

#### A. Generazione Pranzo (`lunch`)
1.  **Analisi Tracker**: Identifica quali fonti proteiche sono sotto la soglia MINIMA (Priority Pool).
2.  **Filtro Pool**:
    *   Filtra le ricette disponibili mantenendo solo quelle appartenenti alle fonti prioritarie.
    *   Se non ci sono opzioni, allarga il filtro includendo tutte le fonti che non hanno ancora raggiunto il MASSIMO.
3.  **Selezione**:
    *   Esclude ricette usate negli ultimi 3 giorni (Anti-Repetition).
    *   Seleziona casualmente una ricetta dal pool filtrato.
4.  **Update**: Aggiorna il tracker incrementando il conteggio per la fonte scelta.

#### B. Generazione Cena (`dinner`)
1.  **Filtro Pool**:
    *   Come per il pranzo, filtra per fonti disponibili (sotto il massimo).
2.  **Differenziazione**:
    *   Applica un filtro negativo: Rimuove dal pool le ricette che hanno la **stessa fonte proteica del pranzo appena generato**.
    *   *Fallback*: Se questo filtro rende il pool vuoto (troppo restrittivo), viene temporaneamente ignorato per garantire che venga comunque generato un pasto.
3.  **Selezione**: Scelta casuale dal pool risultante.

### Fase 3: Calcolo Porzioni
Una volta scelta la ricetta, la porzione viene calcolata dinamicamente:
`Porzione (g) = (Target Kcal Pasto / Kcal per 100g Ricetta) * 100`

---

## 3. Struttura Dati

### Enum `ProteinSource`
Ogni ricetta è classificata con uno dei seguenti tag nel campo `protein_source`:
`legumes`, `fish`, `white_meat`, `red_meat`, `eggs`, `dairy`, `plant_based`, `mixed`, `none`.

### Database
*   **Tabella `recipes`**: Contiene colonna `protein_source`.
*   **Tabella `meal_plans`**: Contiene il piano settimanale.
*   **Tabella `planned_meals`**: Contiene i singoli pasti collegati alle ricette.

---

## 4. NutriPlanIT 2.0: Smart Density & Side Dishes (Gennaio 2026)

Per risolvere i limiti della v1.0 ("Paradosso del Cut" e "Bistecca Gigante"), l'algoritmo è stato evoluto con due nuove logiche fondamentali:

### A. Target Proteici Dinamici (Command-by-Cut)
Invece di percentuali fisse (30%), il fabbisogno proteico è calcolato su base **g/kg** per garantire la preservazione muscolare anche in deficit:
*   **Cut (Dimagrimento)**: Target **2.1 g/kg** (Alta densità richiesta)
*   **Maintain/Bulk**: Target **1.7 g/kg**

### B. Architettura "Main + Gap Fill" (Side Dishes)
L'algoritmo costruisce il pasto in due step per garantire bilanciamento e sazietà:

1.  **Step 1 (The Main Event)**:
    *   Seleziona il piatto principale (es. Salmone, Bistecca, Pasta) basandosi sulla priorità delle fonti proteiche.
    *   Scala la porzione per soddisfare il fabbisogno proteico.
    *   Calcola il "Gap Calorico" rimanente per raggiungere il target del pasto.

2.  **Step 2 (The Filler)**:
    *   Se **Gap < 150 kcal** (Piatto completo/calorico) → Nessun contorno.
    *   Se **Gap > 150 kcal** (Piatto proteico/magro) → **Seleziona Side Dish**.
    *   Pesca dalla categoria `side` (Pane, Patate, Riso, Verdure) e scala la porzione per riempire esattamente il gap.

### Struttura Dati Aggiornata
*   **Tabella `planned_meals`**: Nuovi campi `side_recipe_id`, `side_portion_grams`.
*   **Tabella `recipes`**: Nuova categoria `side` per contorni e accompagnamenti.

---

## 5. Manutenzione

*   **Data Entry**: Le ricette Main Course devono essere "pure" (es. "Salmone", non "Salmone con patate"). I contorni vanno inseriti come ricette atomiche nella categoria `side`.
*   **Nuove Ricette**: Assegnare correttamente `protein_source` e `category`.
