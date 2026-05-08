# Plan — Create `hungary-2026.afpub` skeleton

## Goal
A4 portrait Affinity Publisher document, 38 pages, 3 mm bleed all sides, **each page exporting as its own PDF page** (i.e. non-facing), saved to `~/Desktop/hungary-2026.afpub`.

## Skill sections consulted
- `SKILL.md` — Critical rules (preamble first, hint search, `executeCommand` discipline, `NOT_ALLOWED` semantics, `isFacing:false` for one-page-per-spread, mm→px conversion `mm * dpi / 25.4`, Desktop-only filesystem via `app.getUserDesktopPath`).
- `references/cookbook.md` §1 "Create a multi-page Publisher book where each page exports independently" — direct match for this task.
- `references/topic-index.md` — `document.js`, `documentproperties.js`, `units.js`, `rasterobject.js`, `application.js`.

## Discovery / MCP calls before executing the script
Mandatory and in order:

1. `mcp__affinity__read_sdk_documentation_topic({ topic: "preamble" })` — required first call of the session. Picks up environment rules and any saved hints that may already cover this exact recipe.
2. `mcp__affinity__search_sdk_hints({ query: "create A4 multi-page Publisher document with bleed isFacing false saveAs Desktop" })` — chances are high a prior session already nailed this; a hint may correct exact field names (`isMultiPage`, `isFacing`, `pageCount`, `bleed` shape) for the live SDK version.
3. If the hint pool is silent on any of those property names, narrowly read:
   - `mcp__affinity__read_sdk_documentation_topic({ topic: "documentproperties.js" })` — confirm `NewDocumentOptions` field names, the `bleed` shape (object vs `UnitValue`), and that `Document.create(opts)` is current.
   - `mcp__affinity__read_sdk_documentation_topic({ topic: "document.js" })` — confirm `Document.create` and `doc.saveAs(path)` signatures.
4. `mcp__affinity__list_sdk_documentation` only if step 3 leaves an unknown.

## Order of operations
1. Run discovery (above).
2. Send `script.js` to `mcp__affinity__execute_script`. The script:
   - builds `NewDocumentOptions` from the cookbook recipe with the user's spec (210×297 mm, 38 pp, 3 mm bleed, `isFacing:false`);
   - calls `Document.create(opts)`;
   - calls `doc.saveAs(<Desktop>/hungary-2026.afpub)`;
   - logs `pageCount`, `spreadCount`, file path, and `sessionUuid` so verification can call `render_spread` against the right document.
3. Capture the logged `sessionUuid` from the script output.
4. Run verification renders (see `verification.md`).
5. If geometry is right, finish. If reusable, call `save_script_to_library` and `add_sdk_hint` per skill rules.

## Why this design
- **`isFacing:false`** is the load-bearing decision: it makes `pageCount === spreadCount`, which is what "each page exports as its own PDF page" requires. Cookbook §1 calls this out explicitly.
- **mm→px conversion** is the second load-bearing decision: `NewDocumentOptions.width/height` are in pixels even when `units = Millimetre`. Skipping this conversion produces a tiny ~210 px × 297 px doc.
- **No master, no margins, no artboard**: the user asked for a skeleton, nothing more. We avoid editorialising; downstream agents will add masters and margins when the editorial plan calls for them.
- **Single command, no `CompoundCommandBuilder`**: this is one mutation (`Document.create` + `saveAs`), not multi-step state changes inside an existing doc.
