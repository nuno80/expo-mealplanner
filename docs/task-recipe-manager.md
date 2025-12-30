# Recipe Manager - Task Tracker

> **Last Updated:** 2025-12-28
> ⚠️ **LEGGI QUESTO FILE ALL'INIZIO DI OGNI SESSIONE SUL RECIPE MANAGER**

---

## 📚 Documentazione di Riferimento

| Documento | Scopo |
|-----------|-------|
| [`docs/PRD-recipe-manager.md`](PRD-recipe-manager.md) | **Master Guide** - Stack, comandi e features |
| [`docs/data-models.md`](data-models.md) | **Schema DB** - Fonte di verità per le tabelle |

---

## Phase 1: Environment & Setup 🛠️

- [x] Inizializzazione progetto con UV (`uv init`)
- [x] Configurazione `pyproject.toml` e dipendenze
- [x] Setup `src/recipe_manager` structure
- [x] Configurazione variabili d'ambiente (`.env`)
- [x] Test connessione Turso Cloud (raw SQL)
- [x] Test connessione USDA API

## Phase 2: Core Services (Backend Logic) 🧠

- [x] Implementazione `services/turso.py` (Client & Query wrapper)
- [x] Implementazione `services/usda.py` (Search & Detail fetch)
- [x] Implementazione `services/cloudinary.py` (Image upload)
- [x] Modelli Pydantic (`models.py`) allineati a `data-models.md`

## Phase 3: CLI Commands (MVP) 💻

- [x] Setup Typer app skeleton (`cli.py`)
- [x] Comando `ingredient search` (USDA integration)
- [x] Comando `ingredient add` (Save to DB)
- [x] Comando `recipe add` (Wizard interattivo)
- [x] Comando `recipe list` (Visualizzazione tabellare Rich)

## Phase 4: Data Management & Polish ✨

- [ ] Comando `recipe export` (CSV)
- [ ] Comando `recipe import` (Bulk CSV)
- [ ] Supporto upload immagini nel Wizard
- [x] Refactoring e Error Handling robusto

---

## 🔄 Protocollo Sessione

**All'inizio:**
1. Apri questo file
2. Aggiorna stato task: `[ ]` → `[/]`

**Alla fine:**
1. Marca completati: `[x]`
2. `uv lock` se hai aggiunto dipendenze
3. Committa tutto
