# Verification Plan

After running `script.js`, the skeleton must satisfy six things. Verify them in this order — earlier failures invalidate later checks.

## 1. File exists at the right path

- Check `~/Desktop/hungary-2026.afpub` is present.
- Bash: `ls -la ~/Desktop/hungary-2026.afpub`.
- Expected: file exists, non-zero size (typically a few hundred KB for an empty 38-page Publisher doc).

## 2. File opens cleanly in Affinity Publisher

- Re-open it via the Affinity MCP (`mcp__affinity__execute_script` with a script that calls `app.openDocument(path)` and reports the active document properties), **or** open by hand in Publisher.
- Expected: opens with no migration / repair dialog, no missing-resource warnings.

## 3. Document properties match spec

Run a verification script via the MCP that introspects the open document and prints:

| Property | Expected |
|---|---|
| `doc.pageCount` (or `doc.pages.length`) | `38` |
| Page width  | `210 mm` |
| Page height | `297 mm` |
| Orientation | portrait |
| `doc.facingPages` (or `doc.spreadSetup.facingPages`) | `false` |
| Bleed top / bottom / left / right | `3 mm` each |
| Units | mm |

Any mismatch → stop and re-run with corrected API names from the SDK preamble.

## 4. Visual sanity check in the Publisher UI

Open the Pages panel. Confirm:

- Pages are rendered as a **single column of single pages**, not as facing-page spreads with a spine in the middle.
- Page thumbnails count to 38.
- File → Document Setup → Bleed shows `3 mm` on all four edges.
- File → Document Setup → "Facing Pages" checkbox is **unchecked**.

This UI check is the load-bearing one for the user's actual requirement (each page exporting as its own PDF page).

## 5. PDF-export smoke test (optional but recommended)

The user's stated reason for facing-pages-off is "each page must export as its own PDF page". Worth a one-shot proof:

- Export to PDF (any preset) via `File → Export` or `mcp__affinity__execute_script` calling the export API.
- Open the exported PDF.
- Expected: **38 PDF pages**, each 216 × 303 mm (A4 + 3 mm bleed all sides) or 210 × 297 mm if the export preset trims bleed.
- If you see 19 spreads (each ~420 × 297 mm), facing-pages is still on — the script didn't take.

## 6. Round-trip safety

- Close the file.
- Re-open it.
- Re-check property #3.
- Expected: properties survive the save/close/reopen cycle. Catches the case where a property was set on the in-memory document but not persisted by `saveAs`.

## What "pass" looks like

All six checks pass → ship the skeleton to the Designer sub-agent.
Any check fails → return to `script.js`, fix the offending API call after consulting the Affinity MCP SDK preamble (`mcp__affinity__read_sdk_documentation_topic` with topic `preamble`, then targeted topics like `document`, `bleed`, `pages`).
