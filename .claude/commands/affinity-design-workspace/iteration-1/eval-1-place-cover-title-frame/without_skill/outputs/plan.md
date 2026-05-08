# Plan — Place centred cover title "Magyarország ABC"

## Goal
On the currently open Affinity Publisher document, on **spread 0** (the cover), add a **centred text frame near the top** containing the title `Magyarország ABC`, set in a **Hungarian-friendly sans-serif** at approximately **72 pt**. After placement, verify the result matches intent.

## Assumptions (flagged because the MCP cannot be called now)
1. A document is already open and reachable through whatever the Affinity SDK exposes as the active document (likely `app.activeDocument` or equivalent).
2. Spreads are 0-indexed and `spread 0` is the cover — i.e. a single-page cover, not a facing-pages spread that puts the cover on the right-hand page. If the document was set up with facing pages, "spread 0" may actually be a left page (back cover) plus right page (front cover); see Risks.
3. Page units are in points (pt) or convertible. If the doc is in mm, the script must convert. I'll write the script to read the spread bounds and place by ratio rather than hardcoding pixel positions.
4. The Affinity scripting SDK exposes something resembling: `document.spreads`, a way to add a text frame to a spread/page, a way to set the frame's text, font family, font size, and paragraph alignment. Exact method names below are best-guess and clearly marked.
5. The host machine has at least one font that covers the Hungarian extended Latin glyphs (`á`, `é`, `í`, `ó`, `ö`, `ő`, `ú`, `ü`, `ű`). Most modern system sans-serifs do — see font choice below.

## Font choice
Hungarian uses Latin Extended-A. Safe sans-serif candidates (in order of preference):
1. **Inter** — excellent Latin Extended-A coverage, widely installed, neutral, pairs well with editorial children's work. Preferred default.
2. **Source Sans 3** / **Source Sans Pro** — Adobe, ships with Creative Cloud and many systems.
3. **Helvetica Neue** — macOS default, full coverage of `ő` and `ű`.
4. **Arial** — last-resort universal fallback; ugly but always present.

Script will try them in order and pick the first one Affinity reports as installed. If none of the candidates is available, fall back to whatever the document's default sans is and **log a warning** rather than silently using a serif.

## Placement
- **Horizontal:** centred on the spread's horizontal midpoint. Frame width = 80% of page width. Text alignment within frame = centre.
- **Vertical:** "near the top" — top of frame at ~12% of page height down from the top edge. Frame height generously sized (~120 pt) so the 72 pt cap doesn't get clipped by tight auto-sizing.
- **Type size:** 72 pt.
- **Leading:** auto (or 1.1× font size if explicit leading is required).
- **Tracking:** 0.

## Steps in the script
1. Resolve the active document; bail with a clear error if none.
2. Resolve `spread 0`; bail if it doesn't exist.
3. Read spread page bounds (width, height, units).
4. Compute frame rect: `x = pageWidth * 0.10`, `y = pageHeight * 0.12`, `w = pageWidth * 0.80`, `h = ~120 pt` (in current units).
5. Pick a font: probe candidate list against installed fonts; fall back if none match.
6. Create a text frame on spread 0 with the computed rect.
7. Set its text to `Magyarország ABC`.
8. Set font family, size 72 pt, paragraph alignment centre.
9. Return a small JSON-ish summary: `{ frameId, spreadIndex, rect, font, size, text }` for the verification pass.

## Verification approach (post-execution, not run now)
- Re-query the created frame by ID and read back its text, font, size, alignment, and bounding rect.
- Render spread 0 (e.g. `mcp__affinity__render_spread`) and visually confirm:
  - Text reads `Magyarország ABC` exactly (diacritics intact — no `?` or tofu).
  - Frame is horizontally centred (left and right margins on the spread are equal within ~1 pt).
  - Frame sits near the top, not the middle.
  - Type is sans-serif, looks ~72 pt against the page width.
- If anything fails, do not patch silently — surface the diff and ask.

## Risks / known uncertainty
- **SDK method names are guesses.** I have not consulted the Affinity SDK preamble or docs (the user said don't call MCP tools and don't read project skill files). The script names methods like `document.spreads[0].addTextFrame(...)`, `frame.text = ...`, `frame.font = ...`. These are plausible but **almost certainly need adjustment** once the real SDK reference is consulted. The script is structured so those calls are isolated and easy to swap.
- **Spread vs page.** If "spread 0" is a two-page facing spread, placing on the spread's geometric centre would put the frame across the gutter. The script falls back to placing on the **first page of spread 0** if a `pages` collection is exposed.
- **Font availability.** If Inter / Source Sans / Helvetica Neue / Arial are all missing, the script logs and continues with the document default, which may be a serif. Verification will catch this.
- **Units.** If the document is in mm, 72 pt ≈ 25.4 mm. The script keeps size in pt by passing `72` to whatever the size setter accepts, and assumes the SDK treats type size as points regardless of page units (true in every other DTP SDK I know of).
- **Diacritic encoding.** The script uses a UTF-8 source file and a plain string literal. If the SDK's text setter requires escaped Unicode, swap to `"Magyarország ABC"`.
