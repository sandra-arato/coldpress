# Verification plan — `hungary-2026.afpub`

The script's success message is not enough; the skill rule is "treat the rendered JPEG as the ground truth". Verification splits in two: log-level sanity and visual confirmation.

## 1. Log-level sanity (read from the `console.log` output of the run)

Expect, in the captured stdout from `execute_script`:

| Field | Expected | Why |
|---|---|---|
| `path` | `/Users/<user>/Desktop/hungary-2026.afpub` | Saved where requested. |
| `pageCount` | `38` | Spec. |
| `spreadCount` | `38` | Equal to pageCount → confirms `isFacing: false` worked. **If spreadCount is 20 (= 1 cover + 18 pairs + 1 back) the script silently created a facing book and must be re-run.** |
| `widthPixels` | `2480` (±1 for rounding) | 210 mm × 300 dpi / 25.4. |
| `heightPixels` | `3508` (±1 for rounding) | 297 mm × 300 dpi / 25.4. |
| `dpi` | `300` | Spec. |
| `sessionUuid` | non-empty string | Needed for the render calls below. |

If `pageCount !== spreadCount`, stop — the file is wrong, do not bother rendering.

## 2. Visual checks via `mcp__affinity__render_spread`

Use the `sessionUuid` from the log. Render four targeted spreads (cheap; each is one JPEG):

```
render_spread({ document_session_uuid: <uuid>, spread_index: 0  })   // first page
render_spread({ document_session_uuid: <uuid>, spread_index: 1  })   // second page (sanity check pages aren't paired)
render_spread({ document_session_uuid: <uuid>, spread_index: 18 })   // mid-book
render_spread({ document_session_uuid: <uuid>, spread_index: 37 })   // last page (38th, 0-indexed)
```

For each rendered JPEG, check:

1. **Single page, not a pair.** The image should show one A4 portrait page, not two side-by-side. A side-by-side render means `isFacing` was not honoured — fail and re-run with `isFacing: false` confirmed against `documentproperties.js`.
2. **Aspect ratio ≈ 0.707 (210/297).** Visibly portrait, not square or landscape.
3. **3 mm bleed visible.** A faint coloured strip outside the trim on all four edges (Affinity's default bleed colour). At 300 dpi, 3 mm is ~35 px in document space — should be unmistakable in the render.
4. **Empty page.** No leftover guides, master content, margin guides, or text. Skeleton only.
5. **Spread index 37 exists and renders.** Confirms the document has 38 spreads, not 37 or 39.

## 3. Optional disk check (only if user later asks)

If the user wants disk-level confirmation, run a tiny follow-up script that calls `console.log(Document.current.fileName, Document.current.fileExists)` (exact accessor name to be confirmed in `document.js`). Not required for this task — `saveAs` succeeded if no exception was thrown and the doc has a path.

## What counts as "wrong" → iterate

- `spreadCount !== 38` → wrong facing setting. Re-check `isFacing` and re-run.
- Page dimensions ≠ ~2480 × 3508 px → mm/px conversion didn't run; check `mmToPx` was applied to both `width` and `height`.
- No bleed visible in render → `opts.bleed` was ignored or wrong shape. Read `documentproperties.js` for the exact `bleed` type (it may need to be `UnitValue` per side rather than a plain number).
- File not on Desktop → `NOT_ALLOWED` from filesystem permission. Ask user to enable Affinity → Preferences → Scripting → Filesystem and re-run.
- Saved as `.afdesign` or untitled → `saveAs` extension/path argument needs adjusting; confirm the exact `Document.saveAs` signature in `document.js`.
