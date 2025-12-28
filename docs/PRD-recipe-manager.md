# NutriPlanIT Recipe Manager - PRD

> **Version:** 1.1
> **Last Updated:** 2025-12-28
> **Tipo:** CLI tool per gestione contenuti

---

## 1. Executive Summary

**Recipe Manager** è un CLI tool Python per gestire il database ricette di NutriPlanIT. Permette di:
- Creare/modificare ricette con dati nutrizionali
- Cercare ingredienti su USDA FoodData Central
- Caricare immagini su Cloudinary
- Sincronizzare con Turso DB

---

## 2. Stack Tecnico

| Layer | Tecnologia |
|-------|------------|
| Package Manager | **UV** (moderno, 10-100x più veloce di pip) |
| Python | 3.11+ |
| CLI Framework | Typer + Rich |
| Database | Turso via `libsql-client` |
| Nutrition API | USDA FoodData Central (gratuito) |
| Images | Cloudinary SDK |
| Validation | Pydantic |

---

## 3. Struttura Progetto

```
recipe-manager/
├── pyproject.toml          # UV config + deps
├── uv.lock                 # Lockfile (auto-generated)
├── .env                    # Secrets
├── .env.example            # Template
└── src/
    └── recipe_manager/
        ├── __init__.py
        ├── cli.py          # Typer commands
        ├── models.py       # Pydantic models
        └── services/
            ├── usda.py     # USDA API client
            ├── turso.py    # DB client
            └── cloudinary.py
```

---

## 4. Setup & Comandi

### Setup iniziale
```bash
# Crea progetto
uv init recipe-manager
cd recipe-manager

# Aggiungi dipendenze
uv add httpx              # HTTP client (USDA)
uv add libsql-client      # Turso
uv add cloudinary         # Images
uv add typer              # CLI framework
uv add rich               # Pretty terminal
uv add pydantic           # Validation

# Copia .env.example in .env e compila
```

### Comandi CLI
```bash
# Ricette
uv run python -m recipe_manager add          # Wizard interattivo
uv run python -m recipe_manager list         # Lista ricette
uv run python -m recipe_manager edit <id>    # Modifica ricetta
uv run python -m recipe_manager delete <id>  # Elimina

# Ingredienti
uv run python -m recipe_manager ingredient search "pasta"
uv run python -m recipe_manager ingredient add

# Import/Export
uv run python -m recipe_manager import recipes.csv
uv run python -m recipe_manager export
```

---

## 5. CLI Wizard Example

```
$ uv run python -m recipe_manager add

📝 Nome ricetta (IT): Pasta al pomodoro
📝 Nome ricetta (EN): Tomato pasta
📂 Categoria [breakfast/lunch/dinner/snack]: lunch
⏱️  Tempo preparazione (min): 15
⏱️  Tempo cottura (min): 10
👨‍🍳 Difficoltà [easy/medium/hard]: easy

🥕 Aggiungi ingredienti (invio vuoto per terminare):
> pasta
  🔍 Risultati USDA:
    1. Pasta, dry, enriched (350 kcal/100g)
    2. Pasta, cooked (131 kcal/100g)
  Seleziona [1-2]: 1
  Quantità (g): 100

> pomodori pelati
  🔍 Risultati USDA:
    1. Tomatoes, canned (18 kcal/100g)
  Seleziona [1]: 1
  Quantità (g): 200

> [invio]

📊 Nutrienti calcolati:
   Kcal/100g: 285
   Proteine: 10.2g
   Carboidrati: 58g
   Grassi: 2.1g

✅ Ricetta salvata con ID: abc123
```

---

## 6. Features

### 6.1 Gestione Ricette
- [ ] Lista ricette (filtro per categoria)
- [ ] Crea nuova ricetta (wizard)
- [ ] Modifica ricetta esistente
- [ ] Elimina ricetta
- [ ] Duplica ricetta

### 6.2 Ricerca Ingredienti USDA
- [ ] Cerca ingrediente per nome
- [ ] Visualizza dati nutrizionali
- [ ] Salva ingrediente nel DB
- [ ] Fattore conversione crudo/cotto

### 6.3 Composizione Ricetta
- [ ] Aggiungi ingredienti
- [ ] Calcolo automatico nutrienti
- [ ] Calcolo per 100g e per porzione

### 6.4 Gestione Immagini
- [ ] Upload immagine ricetta
- [ ] URL Cloudinary ottimizzato

### 6.5 Import/Export
- [ ] Export ricette in CSV
- [ ] Import bulk da CSV

---

## 7. Schema DB (riferimento)

Vedi `docs/data-models.md` per dettagli completi:

| Tabella | Campi principali |
|---------|-----------------|
| `Recipe` | name_it, name_en, category, kcal_per_100g, ... |
| `Ingredient` | usda_fdc_id, name_it, name_en, kcal_per_100g, ... |
| `RecipeIngredient` | recipe_id, ingredient_id, quantity, unit |
| `RecipeStep` | recipe_id, step_number, instruction_it, instruction_en |

---

## 8. API USDA

**Base URL:** `https://api.nal.usda.gov/fdc/v1/`

**Endpoints:**
- `foods/search?query={term}` - Cerca ingredienti
- `food/{fdcId}` - Dettaglio ingrediente

**API Key:** Gratuita → [fdc.nal.usda.gov/api-key-signup](https://fdc.nal.usda.gov/api-key-signup.html)

---

## 9. Environment Variables

```env
# Turso
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# USDA
USDA_API_KEY=your-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
```

---

## 10. Task List

### Setup
- [ ] `uv init` progetto
- [ ] Aggiungi dipendenze
- [ ] Configura .env
- [ ] Test connessione Turso

### Core
- [ ] Servizio USDA (search, get)
- [ ] Servizio Turso (CRUD)
- [ ] CLI `add` command
- [ ] CLI `list` command
- [ ] Calcolo nutrienti

### Polish
- [ ] CLI `import` command
- [ ] CLI `export` command
- [ ] Upload immagini Cloudinary
