---
description: Generare immagini professionali per ricette e caricarle su Cloudinary
---

# Workflow: Generazione Immagini Ricette

Questo workflow genera immagini food photography professionali per le ricette senza foto e le carica su Cloudinary.

## Prerequisiti

- Ricette JSON in `recipe-manager/recipes_data/`
- Credenziali Cloudinary configurate in `.env`
- Tool `generate_image` disponibile

## Step 1: Identificare ricette senza immagine

Chiedi a Claude di trovare tutte le ricette senza `image_url`:

```
Leggi tutti i JSON in recipe-manager/recipes_data/ e elenca le ricette
che NON hanno il campo "image_url" o lo hanno vuoto/null.
```

## Step 2: Generare immagini (batch)

Per ogni ricetta senza immagine, Claude usa il tool `generate_image` con questo template di prompt:

### Template Prompt Immagine

```
Professional food photography of [DISH NAME IN ENGLISH].
[BRIEF DESCRIPTION OF THE DISH AND KEY INGREDIENTS].
Overhead view at 45-degree angle, natural daylight from left side.
Rustic wooden table background with subtle linen napkin accent.
Fresh herb garnish visible. Shallow depth of field.
Warm, appetizing color tones. Magazine quality presentation.
No text, no watermarks, no hands, no utensils in frame.
High resolution, photorealistic.
```

### Esempio per "Insalata di pollo e mele":

```
Professional food photography of Chicken and Apple Salad.
Fresh salad with grilled chicken breast slices, Fuji apple slices,
arugula, baby spinach and pomegranate seeds, dressed with mustard vinaigrette.
Overhead view at 45-degree angle, natural daylight from left side.
Rustic wooden table background with subtle linen napkin accent.
Fresh herb garnish visible. Shallow depth of field.
Warm, appetizing color tones. Magazine quality presentation.
No text, no watermarks, no hands, no utensils in frame.
High resolution, photorealistic.
```

### Naming Convention

- **ImageName:** `{slug}` (senza estensione)
- Esempio: `insalata-di-pollo-e-mele`

Le immagini vengono salvate automaticamente in `/home/nuno/.gemini/antigravity/artifacts/`

## Step 3: Copiare immagini nella cartella progetto

Dopo la generazione, copiare le immagini:

```bash
mkdir -p recipe-manager/images
cp /home/nuno/.gemini/antigravity/artifacts/*.webp recipe-manager/images/
```

## Step 4: Upload su Cloudinary

Per ogni immagine, usare il CLI:

```bash
cd recipe-manager
uv run python -c "
from src.recipe_manager.services.cloudinary import CloudinaryClient
client = CloudinaryClient()
url = client.upload_image('images/{slug}.webp', folder='nutriplanit/recipes', public_id='{slug}')
print(url)
"
```

Oppure creare uno script batch:

```python
# recipe-manager/scripts/upload_images.py
import os
from pathlib import Path
from src.recipe_manager.services.cloudinary import CloudinaryClient

client = CloudinaryClient()
images_dir = Path("images")

for img in images_dir.glob("*.webp"):
    slug = img.stem
    url = client.upload_image(str(img), folder="nutriplanit/recipes", public_id=slug)
    print(f"✓ {slug}: {url}")
```

## Step 5: Aggiornare JSON ricette

Per ogni ricetta, aggiungere il campo `image_url`:

```json
{
  "name_it": "Insalata di pollo e mele",
  ...
  "image_url": "https://res.cloudinary.com/dicgdstzz/image/upload/v.../nutriplanit/recipes/{slug}.jpg"
}
```

Claude può fare questo automaticamente leggendo l'URL restituito da Cloudinary.

---

## Prompt Completo per Claude

```
Genera immagini per tutte le ricette senza image_url in recipe-manager/recipes_data/:

1. Leggi ogni JSON e verifica se manca image_url
2. Per ogni ricetta mancante, usa generate_image con:
   - Prompt: food photography professionale del piatto
   - ImageName: lo slug della ricetta
3. Dopo tutte le generazioni, elenca i file creati
4. (Opzionale) Carica su Cloudinary e aggiorna i JSON
```

---

## Stili Alternativi (opzionali)

### Stile Minimal/Moderno
```
Minimalist food photography of [dish].
Clean white marble background, single plate centered.
Soft diffused lighting, no shadows.
Modern plating, negative space around dish.
```

### Stile Rustico/Homemade
```
Rustic homestyle food photography of [dish].
Vintage wooden cutting board, scattered ingredients around.
Warm golden hour lighting, cozy atmosphere.
Farmhouse kitchen aesthetic.
```

### Stile Top-Down Flat Lay
```
Flat lay food photography of [dish].
Directly overhead shot, symmetrical composition.
Matching plates and bowls with ingredients arranged around.
Bright, even lighting with minimal shadows.
```
