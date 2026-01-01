---
description: Trasformare ricette grezze in JSON strutturati per NutriPlanIT
---

# Workflow: Creazione Ricette Strutturate

Questo workflow trasforma i file JSON grezzi (con solo titolo, ingredienti e step testuali) in JSON completi con nutrizione, traduzioni e cooking factors.

## Prerequisiti

- File grezzi in `recipe-manager/recipes_data/ricette_grezze/`
- Formato input:
```json
{
  "source_url": "https://...",
  "title_raw": "Nome Ricetta",
  "servings_raw": "4",
  "ingredients_raw_list": ["Ingrediente 1", "Ingrediente 2"],
  "steps_raw_list": ["Step 1...", "Step 2..."]
}
```
## Step 0: Verifica Duplicati nel Database

Prima di procedere, è **obbligatorio** verificare quali ricette sono già presenti nel database per evitare doppioni.

1. Esegui il comando per elencare le ricette esistenti:
```bash
cd recipe-manager
uv run python -m recipe_manager list
```
2. Confronta i titoli (o slug) delle ricette presenti nel DB con i file in `ricette_grezze/`.
3. Se trovi ricette con nomi identici o molto simili:
   - **Chiedi esplicitamente all'utente** se desidera procedere ugualmente per quelle specifiche ricette.
   - Procedi solo dopo conferma positiva.

## Step 1: Leggi tutti i file grezzi

Chiedi a Claude di leggere tutti i file JSON nella cartella `ricette_grezze/`:

```
Leggi tutti i file JSON in recipe-manager/recipes_data/ricette_grezze/
```

## Step 2: Genera JSON strutturati

Per ogni file grezzo, Claude deve generare un JSON completo seguendo le regole in `prompts/recipe_parser.md`:

### Campi da generare:
- `name_it`, `name_en`: nomi in italiano e inglese
- `slug`: nome-lowercase-con-trattini
- `description_it`, `description_en`: descrizioni brevi
- `category`: `breakfast` | `main_course` | `snack`
- `preferred_meal`: `lunch` | `dinner` | `both`
- `servings`, `prep_time_min`, `cook_time_min`, `difficulty`

### Nutrizione (stimata basandosi sulla conoscenza degli ingredienti):
- `kcal_per_100g`, `protein_per_100g`, `carbs_per_100g`, `fat_per_100g`, `fiber_per_100g`
- `kcal_per_serving`, `serving_weight_g`
- `total_raw_weight_g`, `total_cooked_weight_g`, `cooking_factor`

### Ingredienti con quantità stimate:
```json
{
  "name_it": "petto di pollo",
  "name_en": "chicken breast",
  "quantity": 400,
  "unit": "g",
  "cooking_factor": 0.80,
  "is_optional": false,
  "notes_it": "tagliato a fette",
  "notes_en": "sliced"
}
```

### Cooking factors di riferimento:
| Ingrediente | Fattore |
|-------------|---------|
| Pasta secca | 2.10 |
| Riso secco | 2.50 |
| Carne cruda | 0.75-0.85 |
| Verdure crude | 0.85-0.95 |
| Legumi secchi | 2.00-2.50 |
| Uova, formaggi, oli | 1.00 |

### Allergens da controllare:
`gluten`, `dairy`, `eggs`, `nuts`, `soy`, `fish`, `shellfish`, `celery`, `mustard`, `sesame`, `sulphites`

## Step 3: Salva i file

I file vanno salvati in `recipe-manager/recipes_data/` con nome `{slug}.json`

## Step 4: Sync al database (opzionale)

```bash
cd recipe-manager
uv run python -m recipe_manager sync
```

## Prompt completo per Claude

```bash
# Sostituisci [ELENCO_TITOLI_DB] con l'output del comando 'list'
# Sostituisci [TITOLI_GREZZI] con i nomi dei file o titoli trovati in ricette_grezze

Verifica se tra le nuove ricette:
[TITOLI_GREZZI]
e quelle già presenti nel database:
[ELENCO_TITOLI_DB]
ci sono dei potenziali duplicati.

In caso di duplicati, chiedimi se voglio procedere comunque.
Per quelle non duplicate, procedi come segue per ognuna:
1. Analizza titolo, ingredienti e step
2. Stima quantità realistiche per gli ingredienti
3. Calcola valori nutrizionali basandoti sulla tua conoscenza
4. Genera traduzioni EN
5. Salva in recipes_data/{slug}.json seguendo il formato in prompts/recipe_parser.md
```
