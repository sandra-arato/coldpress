---
name: canva-design
description: Create, generate, export, organise, and collaborate on Canva designs using the Canva MCP. Use this skill whenever the user wants to generate a design, poster, presentation, social media post, logo, flyer, doc, report, or any visual content in Canva — or when they want to find, export, resize, comment on, or organise existing Canva designs. Trigger on phrases like "create a Canva", "make a presentation", "generate a poster", "export my design", "find my Canva", "upload to Canva", "add to my Canva folder", or any mention of Canva design work.
---

# Canva Design via MCP

All operations use the `mcp__canva__*` tools directly — no scripts needed.

---

## Critical rules (read first)

- **generate-design returns candidates, not saved designs.** Always call `create-design-from-candidate` after the user picks one, or the design won't be in their account.
- **IDs in generated design preview URLs are NOT design IDs.** Never pass them to other tools. Real design IDs start with `D` and are exactly 11 characters (e.g. `DABcde12345`).
- **Short prompts first.** For presentations, default to 1–5 slides. 15 slides takes ~3× longer. Only go longer when explicitly requested.
- **Brand kits before generating.** Always ask if the user wants on-brand output. If yes, call `list-brand-kits` and let them pick before calling `generate-design`.
- **Shortlinks first.** If the user shares a `canva.link/xxx` URL, call `resolve-shortlink` before anything else.
- **`search-designs` is for existing designs only** — not templates. Canva's template search requires a different tool not available in this MCP.

---

## Workflow 1: Generate a new design (most common)

```
1. Ask: "Do you want to use your brand kit?"
   → Yes: list-brand-kits → user picks → note brand_kit_id
   → No: proceed without it

2. Ask: "Do you have any images to include?"
   → Yes: upload-asset-from-url for each → collect asset_ids
   → No: proceed without

3. generate-design
   - query: detailed description (include topic, tone, audience, key content)
   - design_type: pick from the type reference below
   - brand_kit_id: if selected
   - asset_ids: if any (ordered as intended)

4. Show candidates to user, ask which they prefer

5. create-design-from-candidate
   - job_id + candidate_id from the chosen candidate

6. Share the edit URL so they can open and refine in Canva
```

---

## Design type reference

| Type | Use for |
|------|---------|
| `doc` | Memos, articles, newsletters, proposals (text-focused), requirements docs, agendas, announcements — web-first collaborative Canva Doc |
| `presentation` | Slide decks for presenting to an audience |
| `poster` | Large format print for events or decoration |
| `flyer` | Single-page promotional material |
| `infographic` | Data and information visualisation |
| `logo` | Brand identity marks |
| `report` | Visually-designed reports with charts/data |
| `proposal` | Visually-designed business proposals with graphics |
| `document` | Traditional fixed-layout page templates |
| `resume` | Job application documents |
| `instagram_post` | Instagram posts (1080×1350px, 4:5 portrait) |
| `facebook_post` | Facebook feed posts |
| `facebook_cover` | Facebook profile/page banner |
| `twitter_post` | Twitter/X posts |
| `your_story` | Instagram/Facebook Stories (vertical) |
| `youtube_thumbnail` | Video preview images |
| `youtube_banner` | Channel header |
| `pinterest_pin` | Vertical Pinterest images |
| `email` | Email newsletters and marketing campaigns |
| `invitation` | Event/party invitations |
| `card` | Birthday, holiday, thank-you cards |
| `postcard` | Mailable greeting cards |
| `business_card` | Professional contact cards |
| `photo_collage` | Multi-photo compositions |
| `desktop_wallpaper` | Computer screen backgrounds |
| `phone_wallpaper` | Mobile device backgrounds |

**doc vs document vs proposal vs report:**
- Use `doc` for most business writing — web-first, collaborative, text-heavy
- Use `proposal` when you need a visually-rich layout with graphics
- Use `report` when you need charts and data visualisation
- Use `document` only for traditional fixed-layout templates

---

## Workflow 2: Export a design

```
1. Find the design ID (from URL, search-designs, or list-folder-items)
2. get-export-formats → confirm the desired format is available
3. export-design with design_id + format options
4. ALWAYS share the download URL with the user
```

**Format options:**

| Format | Key options |
|--------|------------|
| `pdf` | `size`: a4, a3, letter, legal; `pages`: [1,2,3] |
| `png` | `width`/`height` px; `transparent_background`: true; `as_single_image`: true for multi-page |
| `jpg` | `width`/`height` px; `quality`: 1–100 |
| `pptx` | `pages`: [1,2,3]; `export_quality`: regular/pro |
| `gif` | `width`/`height` px |
| `mp4` | `quality`: e.g. `"horizontal_1080p"` |

---

## Workflow 3: Find an existing design

```
# By keyword
search-designs  query="keyword"  sort_by="relevance"

# Browse a folder
list-folder-items  folder_id="root"   (or specific folder ID)
list-folder-items  folder_id="root"  item_types=["design"]

# From a Canva URL
Extract design_id from: https://www.canva.com/design/{design_id}/...

# From a shortlink
resolve-shortlink  shortlink_id="abc123"  (from canva.link/abc123)
→ extract design_id from the resolved URL
```

---

## Workflow 4: Read design content

```
# Metadata (title, URL, thumbnail, page count)
get-design  design_id="D..."

# Text content (read-only)
get-design-content  design_id="D..."  content_types=["richtexts"]
get-design-content  design_id="D..."  content_types=["richtexts"]  pages=[1,2,3]

# Page thumbnails
get-design-pages  design_id="D..."

# Presenter notes (presentations only)
get-presenter-notes  design_id="D..."
get-presenter-notes  design_id="D..."  pages=[1,3,5]
```

---

## Workflow 5: Import from a URL

Use when the user shares a link to a PDF, PPTX, DOCX, CSV, HTML, Markdown, PSD, AI, Keynote, Pages, or ZIP file.

```
import-design-from-url
  url: "https://example.com/file.pdf"   ← must be public HTTPS
  name: "My imported design"
```

**Cannot import local files** (no `file://`, `/Users/...`, `C:\...` paths). Ask user to upload to a public URL first.

---

## Workflow 6: Upload an asset

Use to get an `asset_id` before calling `generate-design` with user images.

```
upload-asset-from-url
  url: "https://example.com/photo.jpg"
  name: "Product photo"
→ returns asset_id for use in generate-design's asset_ids parameter
```

---

## Workflow 7: Resize a design

```
# To a preset
resize-design  design_id="D..."  design_type={type: "preset", name: "presentation"}
# Preset options: "presentation", "whiteboard" (doc and email not supported)

# To custom dimensions
resize-design  design_id="D..."  design_type={type: "custom", width: 1920, height: 1080}
```

---

## Workflow 8: Organise designs

```
# Search folders by name
search-folders  query="Marketing"

# List folder contents
list-folder-items  folder_id="FolderID123"  sort_by="modified_descending"

# Create a folder
create-folder  name="Q3 Campaigns"  parent_folder_id="root"

# Move item to folder
move-item-to-folder  item_id="D..."  to_folder_id="FolderID123"
```

---

## Workflow 9: Comments and collaboration

```
# Add a comment
comment-on-design  design_id="D..."  message_plaintext="Great work on slide 3!"

# Read comments
list-comments  design_id="D..."

# Read replies to a comment
list-replies  design_id="D..."  comment_id="..."

# Reply to a comment
reply-to-comment  design_id="D..."  comment_id="..."  message_plaintext="Thanks, updated!"
```

Comment max: 1,000 chars. Reply max: 2,048 chars.

---

## Brand kit workflow

Always ask before generating if the user might want brand consistency:

```
1. list-brand-kits   → show available kits with names and thumbnails
2. User selects one  → note brand_kit_id
3. generate-design   → pass brand_kit_id
```

---

## Prompting `generate-design` well

The `query` parameter is the main lever. Be specific:

- **Include**: topic, purpose, audience, tone, key content/text to appear, colour preferences
- **For presentations**: specify the narrative arc or key sections
- **For social posts**: mention platform conventions and call-to-action
- **For docs**: describe the document type and key sections

Good: `"5-slide pitch deck for a B2B SaaS product called Ribbon, targeting HR teams, modern minimal style, include sections: Problem, Solution, Pricing, Case Study, CTA"`

Weak: `"presentation about our product"`

The tool doesn't retain context between calls — always include all relevant details in each `query`.
