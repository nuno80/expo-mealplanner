---
description: Pianificazione feature per NutriPlanIT (Expo + Turso + Supabase)
---

# /plan_feature - Pianificazione Feature NutriPlanIT

Quando ricevi una richiesta di nuova feature, crea un piano strutturato seguendo questo schema:

## Stack di Riferimento

- **Mobile**: Expo SDK 54+, React Native 0.76+, React 19, NativeWind 4.x
- **State**: Zustand + TanStack Query
- **Forms**: react-hook-form + Zod
- **Database**: Turso (libSQL) + Drizzle ORM
- **Auth**: Supabase Auth
- **API**: Hono su Cloudflare Workers
- **Images**: expo-image + Cloudinary CDN

---

## Documentazione da Consultare

Prima di pianificare, leggi i docs pertinenti:

| Documento | Contenuto |
|-----------|-----------|
| `docs/task.md` | Task tracker e mapping |
| `docs/PRD.md` | Requisiti e features |
| `docs/data-models.md` | Schema DB |
| `docs/screen-flow.md` | Wireframes e navigazione |
| `docs/expo-best.practices.md` | Regole tecniche |

---

## Struttura Task List

Dividi lo sviluppo in task **Backend (B)** e **Frontend (F)**:

### Backend Tasks (B1, B2, B3...)
- Schema Drizzle → `src/db/schema/`
- API Hono endpoints → `api/src/routes/`
- Zod validations → `src/schemas/`
- Services → `src/services/`

### Frontend Tasks (F1, F2, F3...)
- Screens Expo Router → `app/`
- Componenti UI → `src/components/`
- Hooks → `src/hooks/`
- Stores Zustand → `src/stores/`

---

## Per ogni Task specificare:

1. **Descrizione** - Cosa va costruito
2. **Dipendenze** - Quali task devono essere completati prima (es: F1 dipende da B1)
3. **Docs** - Quale documento consultare
4. **Complessità** - Semplice / Media / Complessa
5. **File coinvolti** - Path esatti dei file da creare/modificare

---

## Priorità di Implementazione

1. **Schema DB** - Drizzle migrations
2. **API** - Hono endpoints
3. **Services** - Logica business
4. **Hooks** - Data fetching (TanStack Query)
5. **UI** - Screens e componenti

---

## Checklist Pre-Implementazione

- [ ] Consultato `docs/data-models.md` per schema?
- [ ] Consultato `docs/screen-flow.md` per wireframe?
- [ ] Rispettate regole `docs/expo-best.practices.md`?
- [ ] Zod schema per ogni dato esterno?
- [ ] FlashList per liste (con `estimatedItemSize`)?

---

## Output

Aggiorna `docs/task.md` con i nuovi task nella fase appropriata.
