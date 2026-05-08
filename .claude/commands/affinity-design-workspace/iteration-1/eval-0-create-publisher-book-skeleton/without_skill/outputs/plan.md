# Plan — Affinity Publisher Skeleton for `hungary-2026`

## Goal

Create an empty but correctly-configured Affinity Publisher document that serves as the skeleton for the `hungary-2026` children's activity book, then save it to the user's Desktop.

## Target document properties

| Property | Value |
|---|---|
| File | `~/Desktop/hungary-2026.afpub` |
| App | Affinity Publisher 2 |
| Page size | A4 (210 mm × 297 mm) |
| Orientation | Portrait |
| Page count | 38 |
| Bleed | 3 mm on all four sides (top, bottom, left, right) |
| Facing pages | **Off** — each page is a single page, not part of a spread. This is the key requirement so PDF export produces 38 individual PDF pages rather than 19 facing-page spreads. |
| Units | Millimetres (matches A4 / bleed spec) |
| Document colour space | CMYK (print target) — assumption; flagged in `notes.md` |

## Approach

1. **Confirm the Affinity MCP is connected.** Before running anything, the operator (or the calling agent) should verify `mcp__affinity__*` tools respond. If they don't, stop — this script is useless without the bridge.

2. **Read the SDK preamble.** The Affinity MCP server's instructions explicitly say "You MUST read the 'preamble' documentation before using the SDK." Before executing any script for real, the calling agent should pull the preamble via `mcp__affinity__read_sdk_documentation_topic` (topic name typically `preamble` or similar) to confirm the exact API names for document creation, bleed configuration, and the facing-pages flag. The script in `script.js` is written from general knowledge of the Affinity JS SDK and may need small naming adjustments after reading the preamble.

3. **Create the document via script.** Use the Affinity Publisher JavaScript API to:
   - Construct an A4 portrait document with 38 pages.
   - Set facing-pages off.
   - Set 3 mm bleed on all four sides.
   - Set units to millimetres.
   - Save as `.afpub` to `~/Desktop/hungary-2026.afpub`.

4. **Do not lay anything out.** No master pages, no text frames, no picture frames, no styles. The user asked for a skeleton; downstream agents (Designer sub-agent, Canva-equivalent producer) will populate it.

5. **Verify.** Open the saved file (or query the document state via the MCP) and confirm the page count, page size, bleed values, and facing-pages flag match. See `verification.md`.

## What I'm deliberately not doing

- Not generating cover spreads, master pages, or section markers — out of scope for "skeleton".
- Not setting up colour swatches, paragraph styles, or grids — out of scope.
- Not exporting to PDF — the user only asked for the `.afpub` skeleton. PDF export is mentioned only as the *future* requirement that drives the facing-pages-off decision.
- Not executing the script — explicitly out of scope per the task.

## Open questions (see `notes.md`)

- Exact SDK method names for setting bleed and facing-pages — best-effort from general knowledge; should be confirmed against the Affinity MCP preamble before running.
- Document colour space (CMYK vs RGB) — assumed CMYK for print. Should be confirmed with the user.
- Whether the user wants margins set now (e.g. 12 mm) or left at 0 for the Designer sub-agent to define per-page.
