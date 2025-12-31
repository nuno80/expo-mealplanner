# Recipe Manager CLI

> CLI tool per gestione contenuti NutriPlanIT - ricette, ingredienti, dati nutrizionali e immagini.

## Quick Start

```bash
cd recipe-manager

# 🤖 Import via LLM (consigliato)
uv run python -m recipe_manager import-llm

# 📂 Import bulk da JSON
uv run python -m recipe_manager import-json ./recipes_data/

# 📤 Upload immagini su Cloudinary
uv run python scripts/upload_images.py

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
| LLM Parser | Google Gemini 1.5 Flash |
| Nutrition API | USDA FoodData Central |
| Images | Cloudinary SDK |
| Validation | Pydantic v2 |

---

## Project Structure

```
recipe-manager/
├── pyproject.toml              # UV config + dependencies
├── uv.lock                     # Lockfile
├── .env                        # Secrets (gitignored)
├── recipes_data/               # 📁 JSON ricette pronti per import
│   ├── porridge_avena.json
│   ├── insalata_greca.json
│   └── ... (18 ricette test)
├── prompts/
│   └── recipe_parser.md        # 📝 System prompt per LLM
├── scripts/
│   └── upload_images.py        # 📤 Batch upload Cloudinary
└── src/recipe_manager/
    ├── __init__.py
    ├── __main__.py             # Entry point
    ├── cli.py                  # Typer commands
    ├── models.py               # Pydantic models
    └── services/
        ├── turso.py            # DB client (CRUD)
        ├── usda.py             # USDA API client
        ├── cloudinary.py       # Image uploads
        ├── parser.py           # Recipe models (ParsedRecipe, etc.)
        ├── llm_parser.py       # 🤖 Gemini LLM parser
        └── scraper.py          # Web scraper (legacy)
```

---

## Environment Setup

```bash
cp .env.example .env
# Edit .env with your credentials
uv sync
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `TURSO_DATABASE_URL` | Turso connection URL |
| `TURSO_AUTH_TOKEN` | Turso auth token |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `USDA_API_KEY` | USDA FoodData Central key (optional) |

---

## CLI Commands

### 🤖 Import via LLM (Recommended)

```bash
uv run python -m recipe_manager import-llm
```

Incolla qualsiasi testo di ricetta, l'AI lo convertirà in dati strutturati:
- Traduzione automatica IT/EN
- Calcolo `cooking_factor` per ogni ingrediente
- Calcolo pesi crudi/cotti per portion scaling
- Rilevamento allergeni e dietary flags
- Preview e conferma prima di salvare

### 📂 Import da JSON

```bash
# Singolo file
uv run python -m recipe_manager import-json path/to/recipe.json

# Intera cartella
uv run python -m recipe_manager import-json ./recipes_data/
```

### 📤 Upload Immagini su Cloudinary

```bash
uv run python scripts/upload_images.py
```

Lo script:
1. Cerca immagini generate in `~/.gemini/antigravity/brain/...`
2. Le carica su Cloudinary in `nutriplanit/recipes/`
3. Aggiorna automaticamente i JSON con `image_url`

### Altri comandi

```bash
# Lista ricette
uv run python -m recipe_manager list
uv run python -m recipe_manager list --category main_course

# Import da testo (parser regex, legacy)
uv run python -m recipe_manager import-text

# Ricerca ingredienti USDA
uv run python -m recipe_manager ingredient search "pollo"
```

---

## 📁 recipes_data/ - Dataset Ricette

Cartella con 18 ricette JSON pronte per import:

| Categoria | Ricette |
|-----------|---------|
| `breakfast` | porridge_avena, uova_avocado, pancake_banana |
| `main_course` (lunch) | insalata_greca, wrap_pollo, buddha_bowl, zuppa_lenticchie, insalata_fagioli |
| `main_course` (dinner) | salmone, pollo_patate, pasta_pesto, tofu_verdure, frittata, hamburger, pollo_yogurt |
| `snack` | yogurt_noci, hummus_verdure, banana_mandorle |

### Copertura dietetica:
- ✅ 5 vegan
- ✅ 6 gluten-free
- ✅ 10 vegetarian

---

## 📝 prompts/recipe_parser.md

System prompt per il parsing LLM. Definisce:

- **Schema JSON output** completo
- **Regole calcolo pesi** (cooking_factor)
- **Lista allergeni** (11 tipologie EU)
- **Dietary flags** (vegan, vegetarian, gluten_free, etc.)
- **Tabella cooking factors** (pasta 2.1, carne 0.8, etc.)

Per modificare il comportamento del parser, edita questo file.

---

## Database Setup

Da project root (una tantum):
```bash
pnpm dotenv -e recipe-manager/.env -- pnpm drizzle-kit push --config=drizzle.config.turso.ts
```

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| "GEMINI_API_KEY not found" | Aggiungi chiave in `.env` |
| "Database error" | Esegui Drizzle push |
| "No module named recipe_manager" | Esegui `uv sync` |
| "Cloudinary upload failed" | Verifica credenziali in `.env` |

---

## Related Files

| File | Purpose |
|------|---------|
| `../docs/data-models.md` | Schema DB aggiornato v1.1 |
| `../drizzle.config.turso.ts` | Turso Drizzle config |
| `../src/db/schema/index.ts` | DB schema TypeScript |
| `prompts/recipe_parser.md` | Prompt LLM per parsing |
