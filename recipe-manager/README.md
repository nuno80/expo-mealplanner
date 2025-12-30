# Recipe Manager CLI

> CLI tool per gestione contenuti NutriPlanIT - ricette, ingredienti e dati nutrizionali.

## Quick Start

```bash
cd recipe-manager

# 🚀 Auto-import da testo (consigliato)
uv run python -m recipe_manager import-text

# Auto-import da URL
uv run python -m recipe_manager import-url "https://..."

# Wizard manuale
uv run python -m recipe_manager add

# Lista ricette
uv run python -m recipe_manager list
```

---

## Stack

| Component | Technology |
|-----------|------------|
| Package Manager | UV |
| Python | 3.11+ |
| CLI | Typer + Rich |
| Database | Turso (libSQL Cloud) |
| Nutrition API | USDA FoodData Central |
| Images | Cloudinary SDK |
| Validation | Pydantic v2 |
| Web Scraping | httpx + BeautifulSoup4 |

---

## Project Structure

```
recipe-manager/
├── pyproject.toml          # UV config + dependencies
├── uv.lock                 # Lockfile
├── .env                    # Secrets (gitignored)
└── src/recipe_manager/
    ├── __init__.py
    ├── __main__.py         # Entry point
    ├── cli.py              # Typer commands
    ├── models.py           # Pydantic models
    ├── config/
    │   └── settings.py     # Env config
    └── services/
        ├── turso.py        # DB client (CRUD)
        ├── usda.py         # USDA API client
        ├── cloudinary.py   # Image uploads
        ├── parser.py       # 🆕 Recipe text parser
        └── scraper.py      # 🆕 Web scraper
```

---

## Environment Setup

```bash
cp .env.example .env
# Edit .env with your credentials
uv sync
```

Required env vars:
- `TURSO_DATABASE_URL` - Turso connection URL
- `TURSO_AUTH_TOKEN` - Turso auth token
- `USDA_API_KEY` - USDA FoodData Central key

---

## Database Setup

From project root (once):
```bash
pnpm dotenv -e recipe-manager/.env -- pnpm drizzle-kit push --config=drizzle.config.turso.ts
```

---

## CLI Commands

### 🚀 Import from Text (Recommended)

```bash
uv run python -m recipe_manager import-text
```

Incolla ricetta da SOSCuisine/GialloZafferano, premi INVIO 2x:
- Auto-estrae: nome, ingredienti, step, nutrienti
- Calcola automaticamente kcal/100g da dati per porzione
- Mostra preview e conferma prima di salvare

### Import from URL

```bash
uv run python -m recipe_manager import-url "https://www.soscuisine.com/recipe/..."
```

⚠️ Alcuni siti richiedono login - usa `import-text` se fallisce.

### 🤖 Import via LLM (Gemini) - Recommended

```bash
uv run python -m recipe_manager import-llm
```

Incolla qualsiasi testo di ricetta, l'AI lo convertirà in dati strutturati perfetti (con traduzione IT/EN).
Richiede `GEMINI_API_KEY` in `.env`.

### 📂 Import via JSON

```bash
# Singolo file
uv run python -m recipe_manager import-json path/to/recipe.json

# Intera cartella
uv run python -m recipe_manager import-json ./recipes_data/
```

Carica file JSON generati dall'LLM. Utile per backup o generazione bulk.

### Manual Wizard

```bash
uv run python -m recipe_manager add
```

### List Recipes

```bash
uv run python -m recipe_manager list
uv run python -m recipe_manager list --category main_course
```

### Ingredient Search

```bash
uv run python -m recipe_manager ingredient search "pollo"
```

---

## Supported Formats

### SOSCuisine
```
Quantità : 4 porzioni
Preparazione : 30 min Cottura : 4 h
610 calorie/porzione
Tabella nutrizionale per porzione (460g)
Calorie  610 | Proteine  37 g | Carboidrati  69 g | Grassi  21 g
```

### GialloZafferano
```
Dosi per: 4 persone
Tempo di preparazione: 15 minuti
Tempo di cottura: 10 minuti
Energia: 558,7 Kcal
Proteine: 22,8 g | Carboidrati: 61,2 g | Grassi: 23,9 g | Fibre: 2,7 g
```

---

## Nutrient Calculation

Per ricette importate:
```python
# Input: dati per porzione (460g → 610 kcal)
# Output: kcal_per_100g = 610 * (100/460) = 132
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "Database error (table may not exist)" | Run Drizzle push (see Database Setup) |
| "Could not parse recipe from URL" | Use `import-text` with copy-paste |
| "No module named recipe_manager" | Run `uv sync` |

---

## Related Files

| File | Purpose |
|------|---------|
| `../drizzle.config.turso.ts` | Turso Drizzle config |
| `../src/db/schema/index.ts` | DB schema source |
| `../docs/PRD-recipe-manager.md` | Requirements doc |
