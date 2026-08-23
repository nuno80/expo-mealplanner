---
description: Workflow di sviluppo per Recipe Manager (Python/UV/CLI)
---

# /recipe_manager - Sviluppo Recipe Manager

Utilizza questo workflow per pianificare e implementare feature nel tool Python.

> [!IMPORTANT]
> Tutte le operazioni Python devono essere eseguite nella directory `recipe-manager/`.
> In WSL, l'eseguibile `uv` si trova solitamente in `/home/nuno/.local/bin/uv`.

## Stack di Riferimento

- **Pkg Manager**: UV (`uv run`, `uv add`)
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
| `docs/data-models.md` | **Schema DB** - Fonte di verità |

---

## Struttura Progetto

Il codice si trova in `recipe-manager/`:

### Core Logic
- Services: `recipe-manager/src/recipe_manager/services/`
- Models: `recipe-manager/src/recipe_manager/models.py`

### CLI & UI
- Entry Point: `recipe-manager/src/recipe_manager/__main__.py`
- Comandi Typer: `recipe-manager/src/recipe_manager/cli.py`
- Interfaccia Rich: `recipe-manager/src/recipe_manager/cli.py`

---

## Implementazione Protocol

1. **Working Dir**: `cd recipe-manager`
2. **Lock First**: Se aggiungi dipendenze, `uv add package_name` (genera/aggiorna `uv.lock`)
3. **Type Safety**: Usa Type Hints per tutto.
4. **Schema First**: I Pydantic models DEVONO rispecchiare `docs/data-models.md`.

---

## Checklist Esecuzione (da Workspace Root)

- [ ] Sync: `wsl -d Debian -e bash -c "cd recipe-manager && /home/nuno/.local/bin/uv run python -m recipe_manager sync"`
- [ ] List: `wsl -d Debian -e bash -c "cd recipe-manager && /home/nuno/.local/bin/uv run python -m recipe_manager list"`
- [ ] Pydantic valida correttamente i dati?
- [ ] Nessun segreto hardcodato (usa `recipe-manager/.env`)?
- [ ] Task aggiornato in `docs/task-recipe-manager.md`?

---

## Output

Genera il piano e aggiorna `docs/task-recipe-manager.md`.
