---
description: Workflow di sviluppo per Recipe Manager (Python/UV/CLI)
---

# /recipe_manager - Sviluppo Recipe Manager

Utilizza questo workflow per pianificare e implementare feature nel tool Python.

## Stack di Riferimento

- **Pkg Manager**: UV (uv init, uv add, uv run)
- **Lang**: Python 3.11+
- **CLI**: Typer + Rich
- **Data**: Pydantic v2
- **DB**: Turso (libsql-client via SQL raw)
- **API**: USDA FoodData Central
- **Images**: Cloudinary SDK

---

## Documentazione da Consultare

| Documento | Contenuto |
|-----------|-----------|
| `docs/task-recipe-manager.md` | **Tracker** - Aggiorna sempre qui |
| `docs/PRD-recipe-manager.md` | **Master Guide** - Comandi e specifiche |
| `docs/data-models.md` | **Schema DB** - Fonte di verità (NON deviare) | src/db/schema/index.ts per le tabelle dell'app android. i tuoi output devono sempre essere compatibili per loro.

---

## Struttura Task List

Dividi il lavoro in:

### Core Tasks (C1, C2...)
- Services (`src/recipe_manager/services/`)
- Models (`src/recipe_manager/models.py`)
- Utilities

### CLI Tasks (T1, T2...)
- Comandi Typer (`src/recipe_manager/cli.py`)
- Interfaccia Rich (tables, prompters)
- Wizard entry logic

---

## Per ogni Task specificare:

1. **Descrizione** - Cosa implementare
2. **Dipendenze** - Es: CLI `add` dipende da Service `create`
3. **Docs** - Riferimento a PRD/Schema
4. **Complessità** - Low/Med/High
5. **File** - Path esatti

---

## Implementazione Protocol

1. **Lock First**: Se aggiungi dipendenze, esegui `uv lock` (automatico con `uv add`)
2. **Type Safety**: Usa Type Hints per tutto (mypy ready)
3. **Schema First**: I Pydantic models DEVONO specchiare `docs/data-models.md`
4. **Remote DB**: Ricorda che `libsql-client` scrive su Turso Cloud

---

## Checklist Commit

- [ ] `uv run python -m recipe_manager ...` funziona?
- [ ] Pydantic valida correttamente i dati?
- [ ] Schema DB rispettato (UUID, tipi, constraints)?
- [ ] Nessun segreto hardcodato (usa `.env`)?
- [ ] Task aggiornato in `docs/task-recipe-manager.md`?

---

## Output

Genera il piano e aggiorna `docs/task-recipe-manager.md`.
