# Plan — Place centred cover title "Magyarország ABC"

## Goal

On spread 0 (cover) of the currently-open Publisher document, place a single text
frame containing the title **"Magyarország ABC"**, set in a Hungarian-friendly
sans-serif at ~72 pt, horizontally centred, positioned near the top of the page.
After placing it, render the spread and visually verify the result matches intent.

## Approach

Follow the affinity-design skill's core loop: **Discover → Plan → Execute → Verify**.
Do not skip the verification step — `execute_script` swallows return values, and a
script can succeed silently while producing the wrong layout.

### Discovery calls (in order)

These are the MCP calls I'd issue **before** writing the final script. Each one
narrows the API surface so the script can use exact factory names rather than
guessed ones.

1. **`read_sdk_documentation_topic("preamble")`** — mandatory once per session.
   Carries environment rules (filesystem/AI gating, current-spread semantics,
   coordinate-unit gotchas) and accumulated hints from prior sessions. Some of
   these are decisive: e.g. the warning that `getSpreadExtents()` is in
   spread-internal units, not document pixels.

2. **`search_sdk_hints("place centred text frame on spread with font and point size")`** —
   the hint pool is shared across sessions; someone has almost certainly already
   solved "add a text frame, set its font, set its size" and the hint will name
   the exact `DocumentCommand.create*` factories. This is cheaper than reading
   `commands.js` (~93 KB) cold.

3. **`search_sdk_hints("Hungarian diacritics font Affinity")`** — confirms which
   bundled fonts on macOS reliably render é, á, ó, ű, ő. Probably no hit, but
   worth one shot.

4. **`list_sdk_documentation`** — to confirm topic filenames before reading them.

5. **`read_sdk_documentation_topic("commands.js")`** — grep for `createAddTextFrame`,
   `createSetFont`, `createSetTextRange*`, character-attribute setters. The
   cookbook's recipe 3 names `DocumentCommand.createAddTextFrame(rect, "...")`
   as a likely candidate but flags it as needing confirmation.

6. **`read_sdk_documentation_topic("storybuilder.js")`** + **`story.js`** — text in
   Affinity lives in "stories"; setting font/size after frame creation usually
   means addressing a text range inside the story, not the frame node directly.
   `StoryBuilder` is the composition primitive.

7. **`read_sdk_documentation_topic("fonts.js")`** — how to look up a font by
   PostScript or family name (e.g. `Fonts.find("Helvetica Neue")` or similar).
   Needed so the script asks for a font that actually exists on the user's
   machine.

8. **`read_sdk_documentation_topic("paragraphatts.js")`** + **`glyphatts.js`** —
   structures for paragraph alignment (centre) and character attributes
   (font family, size). I expect to set:
   - `ParagraphAtts.alignment = Centre`
   - `GlyphAtts.fontSize = 72`
   - `GlyphAtts.fontFamily = "<chosen Hungarian-friendly sans>"`

9. **`read_sdk_documentation_topic("geometry.js")`** — confirm `Rect.createXYWH`
   signature and unit expectations (document pixels). Already used in the
   cookbook; just sanity-check.

10. (Fallback) **`read_sdk_documentation_topic("tests/storyTests.js")`** if the
    reference files leave the "set font on a text frame I just created" pattern
    ambiguous. The test suite usually shows the canonical idiom.

### Position & size decisions

- **Document assumption:** Publisher A4 portrait (210 × 297 mm) at 300 dpi, per
  the locked P8 `hungary-2026` spec. Spread 0 is the cover (single page,
  `isFacing: false`).
- **Page width in document px:** `210 * 300 / 25.4 ≈ 2480 px`.
- **Page height in document px:** `297 * 300 / 25.4 ≈ 3508 px`.
- **Frame width:** 170 mm = `170 * 300 / 25.4 ≈ 2008 px`. Generous enough that
  "Magyarország ABC" at 72 pt fits comfortably on one line with the long
  diacritical title-case word, with breathing room on both sides.
- **Frame height:** 30 mm ≈ 354 px. 72 pt cap height plus comfortable leading.
- **x (left edge):** `(pageWidth - frameWidth) / 2 = (2480 - 2008) / 2 ≈ 236 px`.
  Horizontally centred.
- **y (top edge):** 30 mm from the page top = `30 * 300 / 25.4 ≈ 354 px`.
  This is "near the top": below the 3 mm bleed and a comfortable optical margin,
  but not jammed against the trim. It leaves the upper third of the page for
  the title block and the rest of the cover for illustration.
- **Paragraph alignment:** centre (so the text is centred *inside* the frame
  too, not just the frame on the page).

### Font choice

- **Primary:** **Helvetica Neue** (macOS system font; complete Latin Extended-A
  coverage, including é á í ó ú ö ü ő ű). Sans-serif, neutral, well-suited
  to a children's-book title.
- **Fallback if not present:** **Arial** (also ships with macOS, also covers
  Hungarian glyphs).
- The script attempts Helvetica Neue first via `Fonts.find(...)` (or whatever
  the topic file confirms), falls back to Arial, and logs which one was used so
  verification can confirm.

### Why these specific decisions

| Decision | Reason |
|---|---|
| `currentSpreadIndex` only set if not already 0 | Setting clears the selection (skill Critical Rules). The user said spread 0 is already current, so we read first, only assign if needed. |
| All edits inside one `CompoundCommandBuilder` | Frame creation + font set + size set + alignment set should undo as a single user action. |
| Compute in document pixels via `mm * dpi / 25.4` | Skill rule: never use `getSpreadExtents()` for absolute placement — it's in spread-internal units (~11.81× off). Use `doc.widthPixels` / `heightPixels` and mm conversions. |
| Vision QA via `render_spread` | Skill rule: a script may "succeed" while producing the wrong layout. The JPEG is ground truth. |
| Log session UUID + frame rect from inside the script | `execute_script` swallows return values; we need explicit `console.log` for anything we want to inspect, including the `document_session_uuid` we'll feed to `render_spread`. |

## Steps to execute

1. Run discovery calls 1–9 above. Lock the exact factory names.
2. Write `script.js` (this folder).
3. Send `script.js` to `mcp__affinity__execute_script`.
4. Read the logged `document_session_uuid` from the script's console output.
5. Call `mcp__affinity__render_spread({ document_session_uuid, spread_index: 0 })`.
6. Inspect the JPEG against the verification checklist in `verification.md`.
7. If any check fails, refine the script and re-run. Do not declare success
   without a passing render.
8. Once correct, optionally `add_sdk_hint` recording the exact factory names
   used (e.g. "To add a text frame and set its font + size in one undoable
   step, use DocumentCommand.createAddTextFrame + createSetCharacterAttributes
   inside a CompoundCommandBuilder").

## Out of scope

- Saving the document.
- Exporting.
- Adding any other cover content (illustration, subtitle, decorative elements).
- Calling `mcp__affinity__*` tools — per task instructions, this run is
  files-only.
