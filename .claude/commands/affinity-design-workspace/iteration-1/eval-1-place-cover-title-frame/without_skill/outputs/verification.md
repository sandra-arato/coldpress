# Verification plan — cover title frame

Run after the script executes. The goal is to confirm the placed frame matches intent, not just that the script returned ok.

## A. Programmatic readback (cheap, do first)

After execution, query the created frame by its returned `id` and assert:

| Check | Expected | How |
|---|---|---|
| Text content | exactly `Magyarország ABC` | read `frame.text` (or equivalent); compare byte-for-byte. Must include `á` and `ó` correctly. |
| Font family | one of the candidate sans-serifs (`Inter`, `Source Sans 3`, `Source Sans Pro`, `Helvetica Neue`, `Arial`) | read `frame.font`; assert `picked.fallback === false` ideally |
| Font size | `72` (pt) | read `frame.fontSize` |
| Paragraph alignment | `center` | read `frame.paragraphAlignment` / `frame.alignment` |
| Frame on spread 0 | yes | read `frame.parent` / spread index |
| Frame width | ≈ `pageWidth * 0.80` ± 0.5 pt | read frame bounds |
| Frame horizontal centre | within ±1 pt of page centre | `(frame.x + frame.width/2) ≈ pageOriginX + pageWidth/2` |
| Frame top | between 8% and 16% of page height down from top | `(frame.y - pageOriginY) / pageHeight ∈ [0.08, 0.16]` |
| No overflow | text fits inside frame | check the frame's overflow / overset flag if exposed |

If any of these fail → stop, do not "fix" silently, report.

## B. Visual readback (catches what programmatic checks miss)

1. Render spread 0 to PNG via `mcp__affinity__render_spread`.
2. Open the PNG and confirm visually:
   - **Glyphs render correctly.** No `?`, no tofu boxes, no missing-glyph squares. The `á` in `Magyarország` and the `Á`-style accent on the capital `M…á…` must be visible. (Even though the title doesn't use `ő` or `ű`, those are the diacritics most likely to be missing in a non-Hungarian font; if `á` and `ó` render fine, basic Latin Extended-A is covered, but I'd still spot-check.)
   - **Visually centred.** Equal left/right whitespace to page edges.
   - **Near the top.** Sits in the top ~quarter, not the middle.
   - **Size feels like 72 pt.** Cap height roughly 1/12–1/10 of page height for a typical A4-ish page; sanity check, not exact.
   - **Sans-serif.** No serifs on `M`, `A`, `B`, `C`.
3. If the document is facing-pages and "spread 0" turned out to be a two-page spread (back+front cover), confirm the title is on the **front cover page**, not straddling the gutter or sitting on the back page.

## C. Negative checks

- Confirm only **one** new text frame was created on spread 0 (no accidental duplicates from re-runs).
- Confirm nothing else on the spread was modified — existing objects' bounds and z-order unchanged.
- Confirm document hasn't been saved/exported (script must not auto-save).

## D. What to do on each failure mode

| Symptom | Likely cause | Action |
|---|---|---|
| Tofu / `?` instead of `á`,`ó` | font lacks Latin Extended-A or string was mis-encoded | switch to Inter or Helvetica Neue explicitly; if encoding, use `"Magyarország ABC"` |
| Text is serif | none of candidate fonts installed; fell back to doc default | install Inter or hardcode Helvetica Neue (macOS) / Arial |
| Frame off-centre | page bounds read with wrong origin (master page offset?) | use `page.bounds` not `spread.bounds`; recompute with page origin |
| Frame straddles gutter | placed on spread-level coords with facing pages | always target `spread.pages[0]` (or `[1]` if cover is right-hand) |
| Text overflows frame | 72 pt too big for narrow page | reduce frame width to 90% or accept smaller size; flag to user, don't auto-shrink type silently |
| Size renders as 72 *units* in mm doc | SDK treated size in current page units | force size with explicit pt unit if SDK supports it; otherwise convert: `72 pt = 25.4 mm` |

## E. Sign-off

Verification passes only if: A all green, B visually clean, C no collateral changes. Otherwise, surface a diff and ask before iterating.
