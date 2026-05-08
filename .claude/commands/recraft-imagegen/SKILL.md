---
name: recraft-imagegen
description: Generate, edit, and process images using the Recraft AI API. Use this skill whenever the user wants to create images from text prompts, edit existing images (inpaint, img2img, replace background), vectorize images, remove backgrounds, upscale photos, create custom brand styles, or explore visual variations. Trigger on phrases like "generate an image", "make an illustration", "vectorize this", "remove the background", "upscale this", "create a logo", "recraft", or any request involving AI image generation or editing — even when Recraft isn't explicitly mentioned.
---

# Recraft Image Generation

Full-suite image generation and editing via Recraft AI. Scripts live in the `scripts/` directory alongside this SKILL.md.

## Setup (run once)

```bash
pip install requests python-dotenv
```

Ensure `RECRAFT_API_KEY` is in your `.env` file:
```
RECRAFT_API_KEY=your_key_here
```

Get a key at https://app.recraft.ai/profile/api

To find the scripts directory and check your credits:
```bash
SKILL_DIR=$(dirname $(find ~/.claude -name "recraft_generate.py" 2>/dev/null | head -1))
python $SKILL_DIR/recraft_account.py
```

---

## Models

| Model | Credits | Best for |
|-------|---------|----------|
| `recraftv4` | 40 | Default — fast, everyday use |
| `recraftv4_pro` | 250 | Print-ready, 4MP output |
| `recraftv4_vector` | 80 | Vector/SVG illustrations |
| `recraftv4_pro_vector` | 300 | Pro vector output |
| `recraftv3` | 40 | Editing ops + stylized output |
| `recraftv3_vector` | 80 | Vector + editing |

Editing operations (img2img, inpaint, etc.) only support `recraftv3` / `recraftv3_vector`.

---

## Sizes

**V4** — aspect ratios: `1:1` `16:9` `9:16` `3:2` `2:3` `4:3` `3:4` `5:4` `4:5` `2:1` `1:2`

Pixel dimensions also accepted: `1024x1024`, `1344x768`, `768x1344`, etc.

**V4 Pro** doubles the resolution of V4.

---

## Predefined Styles (V3 models only, use `--style`)

**Photorealistic**: `Photorealism` `Natural light` `Studio photo` `HDR` `Hard flash` `Black & white` `Product photo` `Evening light` `Urban Drama` `Faded Nostalgia`

**Illustration**: `Illustration` `Hand-drawn` `Grain` `Bold Sketch` `Pencil sketch` `Retro Pop` `Clay` `Risograph` `Pixel art` `Child book` `Expressionism` `Crosshatch` `Pop art` `Street art` `Antiquarian`

**Emblem**: `Prestige Emblem` `Pop Graphic` `Stamp` `Punk Graphic` `Vintage Emblem`

**Vector (V3 vector)**: `Vector art` `Line art` `Linocut` `Color blobs` `Engraving` `Bold stroke` `Mosaic` `Thin` `Cartoon` `Flat 2.0`

---

## Operations

### 1. Generate — text-to-image

```bash
# Basic
python $SKILL_DIR/recraft_generate.py "prompt" output.png

# Pro quality
python $SKILL_DIR/recraft_generate.py "prompt" output.png --model recraftv4_pro --size 16:9

# Vector SVG
python $SKILL_DIR/recraft_generate.py "prompt" output.svg --model recraftv4_vector

# Stylized (V3)
python $SKILL_DIR/recraft_generate.py "prompt" output.png --model recraftv3 --style "Hand-drawn"

# Multiple variants
python $SKILL_DIR/recraft_generate.py "prompt" output.png --n 4

# With custom style UUID
python $SKILL_DIR/recraft_generate.py "prompt" output.png --style-id <uuid>

# With negative prompt (V3 only)
python $SKILL_DIR/recraft_generate.py "prompt" output.png --model recraftv3 --negative-prompt "text, watermark"
```

### 2. Edit — transform existing images (V3 only)

Mask convention: **white pixels = region to modify, black = keep intact**.

```bash
# Transform image with prompt
python $SKILL_DIR/recraft_edit.py --operation img2img input.png out.png \
  --prompt "winter landscape" --strength 0.5

# Regenerate masked region
python $SKILL_DIR/recraft_edit.py --operation inpaint input.png out.png \
  --mask mask.png --prompt "a glowing moon"

# Replace background
python $SKILL_DIR/recraft_edit.py --operation replace-bg input.png out.png \
  --prompt "dense forest at dusk"

# Generate background in masked area (subject on transparent bg → add scene)
python $SKILL_DIR/recraft_edit.py --operation generate-bg input.png out.png \
  --mask mask.png --prompt "city skyline at night"

# Erase a region
python $SKILL_DIR/recraft_edit.py --operation erase input.png out.png --mask mask.png

# Remix / variate
python $SKILL_DIR/recraft_edit.py --operation variate input.png out.png --size 1024x1024
```

### 3. Process — non-generative transforms

```bash
# Vectorize to SVG (10 credits)
python $SKILL_DIR/recraft_process.py --operation vectorize input.png output.svg

# Remove background (10 credits, returns PNG with transparency)
python $SKILL_DIR/recraft_process.py --operation remove-bg input.png output.png

# Crisp upscale — sharpness-focused (4 credits)
python $SKILL_DIR/recraft_process.py --operation crisp-upscale input.png output.png

# Creative upscale — detail refinement, faces (250 credits — costs same as V4 Pro gen)
python $SKILL_DIR/recraft_process.py --operation creative-upscale input.png output.png
```

### 4. Custom Style — brand consistency

```bash
# Create style from 1–5 reference images (40 credits)
python $SKILL_DIR/recraft_style.py --base digital_illustration ref1.png ref2.png --save-id style_id.txt

# Use that style for generation
python $SKILL_DIR/recraft_generate.py "coffee shop interior" logo.png --style-id $(cat style_id.txt)
```

Base style options: `digital_illustration` `realistic_image` `vector_illustration` `icon`

### 5. Explore — divergent discovery

```bash
# Generate diverse explorations (prints image IDs for follow-up)
python $SKILL_DIR/recraft_explore.py explore "abstract geometric landscape" out.png --n 4

# Generate variations from an explore result (similarity 1=loose, 5=close)
python $SKILL_DIR/recraft_explore.py similar <image_id> variation.png --similarity 3
```

Note: `similar` requires an image ID from a prior `explore` call — not from a regular generation.

---

## Pricing Quick Reference

| Operation | Credits | USD |
|-----------|---------|-----|
| Generate V4 | 40 | $0.04 |
| Generate V4 Pro | 250 | $0.25 |
| Generate V4 Vector | 80 | $0.08 |
| Edit V3 | 40 | $0.04 |
| Custom style | 40 | $0.04 |
| Vectorize | 10 | $0.01 |
| Remove background | 10 | $0.01 |
| Erase region | 2 | $0.002 |
| Crisp upscale | 4 | $0.004 |
| Creative upscale | 250 | $0.25 |
| Variate | 40 | $0.04 |

1,000 API units = $1.00 USD. Check balance: `python $SKILL_DIR/recraft_account.py`

---

## Prompting Guide

V4 accepts up to 10,000 chars. V3 max 1,000 chars — be concise; let `--style` carry the aesthetic.

### Two modes

**Short prompts (exploratory)** — let V4 make design decisions. Good for discovery.
> `"Fashion couple portrait, close up."`

**Structured prompts (art direction)** — define the full visual system for precision and repeatability.
> Describe each layer explicitly: concept → background → subject → lighting → camera → mood

### Prompt structure (global → local)

1. Core concept — subject and scene
2. Background and environment
3. Subject framing and pose
4. Physical attributes / identity details
5. Secondary subjects and spatial relationships
6. Lighting direction and behaviour
7. Camera, depth, contrast
8. Mood and compositional resolution

### Style-specific patterns

**Vector & Logo**
Define structural logic, not textures:
> `"minimal logo mark, geometric circle with negative space leaf, strict two-tone palette black and white, consistent stroke weight, no gradients, no shadows, scalable"`

**Poster & Typography**
Layer structure first, then describe interactions:
> Format → background → graphic layer → typographic hierarchy → text placement logic → contrast → composition
Place required text in quotes for precise rendering: `'"Morning Bloom" wordmark, serif, centred'`

**Illustration**
Use drawing logic, not camera logic:
> Drawing style → character/pose → line behaviour (clean/bold/irregular) → colour logic → surface treatment (flat/grain/watercolour) → depth → emotional tone

**3D & Product**
Define the physical system, not just the object:
> Render type → form/proportion → material (matte, gloss, plastic, fabric) → environment → lighting → camera angle → colour system
> `"designer toy render, rounded bear figurine, glossy white plastic with soft shadows, floating on clean white surface, top-down 30-degree angle, studio lighting, pastel accent colour"`

**Product photos**
> `"studio-lit product photo on white marble, three-point softbox lighting, sharp focus, 45-degree angle, commercial photography"`

### Key techniques

- **Clarity over length** — explicitness matters, not word count
- **Constraint definition** — state exclusions: `"no gradients, no shadows, no texture"`
- **Spatial relationships** — describe how layers interact, not just each element in isolation
- **Colour blocking** — `"flat colours only"` or `"strict two-tone palette"` for graphic work
- **Hierarchy declaration** — identify the visually dominant element explicitly

### Inpaint masks
Pure white (255,255,255) = region to modify; pure black (0,0,0) = keep intact. Soft edges work too.

---

## Rate Limits

- 100 images/minute per account
- 5 requests/second
- Generated image URLs expire in ~24h — download promptly if you need to keep them
