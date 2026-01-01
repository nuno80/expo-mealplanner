# 🧠 Analisi & Guida Algoritmo Meal Plan (Dieta Mediterranea)

## Executive Summary

**Stato: ✅ IMPLEMENTATO** (v1.0 - Gennaio 2026)

L'algoritmo di generazione dei piani alimentari è stato aggiornato per aderire alle linee guida della **Dieta Mediterranea** e del **Piatto del Mangiar Sano**.
Ora non si limita a calcolare le calorie, ma gestisce attivamente la **rotazione delle fonti proteiche** e la **differenziazione tra pranzo e cena**.

---

## 1. Logica dell'Algoritmo (v1.0)

Il cuore del sistema è in `src/services/mealPlan.service.ts` -> `generateMealPlan()`.

### Fasi di Generazione

1.  **Inizializzazione Tracker**: Viene creato un tracker per monitorare quante volte ogni fonte proteica (es. legumi, pesce) è stata usata nella settimana corrente.
2.  **Iterazione Giornaliera**: Per ogni giorno della settimana (1-7):
3.  **Allocazione Pasti**:
    *   **Pranzo**: L'algoritmo cerca di selezionare una ricetta la cui fonte proteica **non ha ancora raggiunto il target MINIMO** settimanale (Priority Pool).
    *   **Cena**: L'algoritmo cerca una ricetta che abbia una fonte proteica **DIVERSA** da quella del pranzo dello stesso giorno (Differentiation Logic), sempre rispettando i massimi settimanali.
4.  **Anti-Ripetizione**:
    *   Le ricette usate negli ultimi 3 giorni (per categoria) vengono escluse.
5.  **Calcolo Porzioni**:
    *   Una volta scelta la ricetta, la porzione viene scalata per raggiungere il target calorico specifico del pasto (es. 30% del TDEE per il pranzo).

---

## 2. Regole Nutrizionali Implementate

### ✅ Rotazione Fonti Proteiche (Quote Settimanali)

Le quote sono definite in `WEEKLY_PROTEIN_TARGETS`:

| Fonte Proteica | Minimo | Massimo | Note |
| :--- | :--- | :--- | :--- |
| **Legumi** | 3 | 5 | Base della dieta |
| **Pesce** | 3 | 4 | Ricco di Omega-3 |
| **Carne Bianca** | 2 | 3 | Pollo/Tacchino |
| **Uova** | 2 | 4 | |
| **Latticini** | 2 | 3 | Yogurt/Formaggi freschi |
| **Carne Rossa** | 0 | 1 | Fortemente limitata |
| **Plant Based** | 0 | 3 | Tofu, Seitan, etc. |

### ✅ Differenziazione Pranzo/Cena

Per evitare la monotonia nutrizionale (es. pasta e ceci sia a pranzo che a cena), l'algoritmo applica un filtro negativo al pool di ricette per la cena:
`Pool_Cena = Pool_Totale - Ricette_con_Fonte_Pranzo`

*Esempio: Se a pranzo ho mangiato Legumi, a cena l'algoritmo privilegerà Pesce, Uova o Carne Bianca.*

### ✅ Gestione Calorie

Le calorie giornaliere sono distribuite secondo percentuali fisse:
- **Colazione**: 20-25%
- **Pranzo**: 30-35%
- **Cena**: 35-40%
- **Snack**: 15% (se abilitati)

---

## 3. Struttura Dati

### Nuovi Campi

Ogni ricetta nel database (`recipes`) ha ora un campo obbligatorio:
`protein_source` (enum):
- `legumes`
- `fish`
- `white_meat`
- `red_meat`
- `eggs`
- `dairy`
- `plant_based`
- `mixed`
- `none`

---

## 4. Prossimi Passi (Roadmap)

Sebbene la logica core sia implementata, ci sono aree di miglioramento futuro:

1.  **Validazione Piatto (50/25/25)**: Attualmente non viene validata la proporzione esatta di verdure/carboidrati nel singolo piatto, ma ci si affida al bilanciamento delle ricette inserite.
2.  **Stagionalità**: Implementare filtri per ingredienti di stagione.
3.  **Preferenze Utente**: Permettere agli utenti di modificare le quote (es. dieta vegetariana = 0 carne).

---

## 5. Stato Conformità

| Criterio | Stato | Note |
| :--- | :--- | :--- |
| **Rotazione Fonti Proteiche** | ✅ IMPLEMENTATO | Quote rigide settimanali |
| **Differenziazione P/C** | ✅ IMPLEMENTATO | Evita stessa fonte nello stesso giorno |
| **Target Calorico** | ✅ IMPLEMENTATO | Scalatura porzioni automatica |
| **Anti-Ripetizione** | ✅ IMPLEMENTATO | Buffer 3 giorni |
| **Cereali Integrali** | ⚠️ PARZIALE | Affidato alla qualità delle ricette |
| **Composizione Piatto** | ⚠️ PARZIALE | Non validato algoritmicamente |


---

## 1. Analisi dell'Algoritmo Attuale

### Cosa fa `generateMealPlan()`

```
Per ogni giorno (1-7):
  Per ogni pasto (breakfast, lunch, dinner, [snack_am, snack_pm]):
    1. Mappa mealType → category (breakfast→breakfast, lunch/dinner→main_course)
    2. Filtra ricette già usate negli ultimi 3 pasti della stessa categoria
    3. SELEZIONE RANDOM dalla pool disponibile
    4. Calcola porzione per raggiungere target kcal del pasto
```

### Distribuzione Calorica

| Pasto | Con Snack | Senza Snack |
|-------|-----------|-------------|
| Breakfast | 20% | 25% |
| Lunch | 30% | 35% |
| Dinner | 35% | 40% |
| Snacks | 15% | 0% |

### Logica Anti-Ripetizione

- Tiene traccia degli ultimi 3 ID recipe per categoria
- Se una ricetta è stata usata di recente, viene esclusa
- Fallback: se non ci sono candidati, usa tutta la pool

---

## 2. Gap Analysis vs Linee Guida

### ❌ GAP 1: Nessuna Rotazione Fonti Proteiche

**Linea guida richiesta:**

| Fonte Proteica | Frequenza Settimanale |
|----------------|----------------------|
| Legumi | 3-5 volte |
| Pesce | 3-4 volte |
| Carne Bianca | 2-3 volte |
| Uova | 2-4 volte |
| Formaggi | 2-3 volte |
| Carne Rossa | 0-1 volta |

**Stato attuale:** Nessun campo `proteinSource` nello schema recipe. L'algoritmo seleziona casualmente senza considerare la fonte proteica.

**Rischio:** Possibile piano con 7 cene a base di pollo o 7 pranzi con formaggio.

---

### ❌ GAP 2: Nessuna Differenziazione Pranzo/Cena

**Linea guida richiesta:**
- **Pranzo:** Carboidrati + Verdure + Proteina A
- **Cena:** Verdure + Pane/Patate + Proteina B (diversa)

**Stato attuale:** Sia `lunch` che `dinner` mappano a `main_course`. Stessa pool di ricette per entrambi.

**Rischio:** Stesso tipo di piatto a pranzo e cena (es. pasta con legumi sia a pranzo che a cena).

---

### ❌ GAP 3: Nessun Controllo Composizione Piatto

**Linea guida richiesta (Piatto Sano):**
- 50% Verdure
- 25% Carboidrati (preferibilmente integrali)
- 25% Proteine

**Stato attuale:** Schema recipe ha `proteinPer100g`, `carbsPer100g`, ma NON usa questi valori per validare la composizione.

---

### ❌ GAP 4: Nessun Tag Dietetico

**Linea guida richiesta:** Privilegiare cereali integrali, pesce azzurro, EVO.

**Stato attuale:**
- Tabella `tags` esiste ma è vuota
- Nessun campo `isWholeGrain`, `fishType`, `cookingFat` nelle ricette

---

### ⚠️ GAP 5: Selezione Random vs Algoritmo Intelligente

**Linea guida richiesta:** Alternanza strutturata per varietà e completezza nutrizionale.

**Stato attuale:** `pool[Math.floor(Math.random() * pool.length)]`

---

### ✅ GAP 6: Anti-Ripetizione (Parzialmente Implementato)

**Linea guida richiesta:** Evitare stessa ricetta entro 3 giorni.

**Stato attuale:** Implementato! `recentlyUsed` tiene traccia degli ultimi 3 ID per categoria.

---

## 3. Schema Mancante

### Campo `proteinSource` (proposta)

```typescript
export const ProteinSourceSchema = z.enum([
  "legumes",      // Legumi
  "fish",         // Pesce
  "white_meat",   // Carne bianca
  "eggs",         // Uova
  "dairy",        // Latticini
  "red_meat",     // Carne rossa
  "plant_based",  // Proteine vegetali (tofu, seitan)
  "mixed",        // Più fonti
]);
```

---

## 4. Proposta di Algoritmo Conforme

### Fase 1: Definire Quote Settimanali

```typescript
const WEEKLY_PROTEIN_TARGETS = {
  legumes: { min: 3, max: 5 },
  fish: { min: 3, max: 4 },
  white_meat: { min: 2, max: 3 },
  eggs: { min: 2, max: 4 },
  dairy: { min: 2, max: 3 },
  red_meat: { min: 0, max: 1 },
};
```

### Fase 2: Algoritmo di Selezione

```
1. Inizializza counter per ogni proteinSource = 0
2. Per ogni giorno (1-7):
   a. Per pranzo:
      - Scegli proteinSource con spazio rimanente (counter < max)
      - Filtra ricette con quella fonte
      - Seleziona ricetta (evitando ripetizioni 3 giorni)
      - Incrementa counter
   b. Per cena:
      - Scegli proteinSource DIVERSO da pranzo
      - Stessa logica di selezione
3. Validazione finale:
   - Ogni fonte ha raggiunto il minimo?
   - Se no, riordina alcuni giorni
```

---

## 5. Roadmap Implementazione

### Fase Immediata (MVP+)

1. **Aggiungere campo `proteinSource`** a schema recipe
2. **Taggare ricette esistenti** con la fonte proteica principale
3. **Implementare quote settimanali** base

### Fase Successiva (v1.1)

4. Differenziare logica pranzo/cena
5. Aggiungere validazione composizione piatto
6. Tag per cereali integrali e pesce azzurro

### Fase Avanzata (v1.2+)

7. Preferenze utente (es. "no carne rossa", "più legumi")
8. Suggerimenti adattivi basati su storico
9. Integrazione allergeni

---

## 6. Conclusione

| Criterio | Conforme? | Priorità Fix |
|----------|-----------|--------------|
| Rotazione fonti proteiche | ❌ | 🔴 ALTA |
| Differenziazione pranzo/cena | ❌ | 🟡 MEDIA |
| Composizione piatto 50/25/25 | ❌ | 🟡 MEDIA |
| Cereali integrali | ❌ | 🟢 BASSA |
| Anti-ripetizione | ✅ | - |
| Target calorico | ✅ | - |

**Raccomandazione:** Prima di procedere con altre feature, implementare almeno il campo `proteinSource` e la logica di rotazione settimanale.
