# Notes — honest uncertainty

This eval was run **without the affinity-design skill** and without calling any MCP tools, so the script is built on general knowledge of DTP scripting SDKs (InDesign ExtendScript, Scribus, Sketch, Figma plugin API, Canva SDK) plus the public framing of "Affinity exposes a JS scripting SDK over Publisher/Designer/Photo." That means the *shape* of the script is plausible but specific names are guesses.

## What I'm confident about
- The geometric plan: 80%-wide frame, centred, top at ~12% of page height, 72 pt sans-serif.
- The font shortlist for Hungarian: Inter, Source Sans 3/Pro, Helvetica Neue, Arial all cover Latin Extended-A including `ő` and `ű`. (The current title only uses `á` and `ó`, which any sans-serif will have.)
- The verification approach: programmatic readback first, then a rendered visual check, then negative checks.
- The general structure of "resolve doc → resolve spread → compute geometry → create frame → set text + style → return summary".

## What I'm guessing at and shouldn't pretend otherwise
The following are all **best-guess SDK surface**, isolated in helpers so they're easy to swap once the real Affinity SDK reference is consulted (preamble + sdk_documentation):

- `app.activeDocument` — likely but unverified.
- `doc.spreads` vs `doc.getSpreads()` — script tries both.
- `spread.pages[0]` — likely; Affinity Publisher is page-based with spreads grouping pages.
- `page.bounds` with `width`/`height`/`left`/`top` — guessed shape.
- `page.addTextFrame(rect)` / `createTextFrame(rect)` — pure guess. Could equally be `app.create("TextFrame", {...})` or a builder pattern.
- `frame.text = ...`, `frame.font = ...`, `frame.fontSize = ...`, `frame.paragraphAlignment = "center"` — plausible but unverified property names.
- Font probing via `app.fonts.list()` / `app.getInstalledFonts()` — guessed; the SDK may not expose font enumeration at all, in which case the script just trusts the first candidate.
- Whether the SDK takes type sizes as a number (assumed pt) or as a typed value like `{ value: 72, unit: "pt" }`. Assumed plain number.
- Whether mutations need to be wrapped in a transaction / undo group. Most DTP SDKs require this; the script does **not** wrap, which is a known gap. If Affinity requires `app.beginTransaction(...)` / `commit()`, wrap the whole IIFE body.

## Things I deliberately did *not* do
- I did not consult `mcp__affinity__read_sdk_documentation_topic` or the preamble (user instruction).
- I did not read `affinity-design-skill` SKILL.md (user instruction).
- I did not execute the script (user instruction).
- I did not search the web for Affinity SDK docs — sticking to general knowledge as instructed.

## What this means for the user
- Treat `script.js` as a **structural draft**. Before running it, swap the guessed SDK calls (clearly labelled in code and listed above) for the real ones from the Affinity SDK preamble. The geometry, font logic, verification plan, and overall shape should survive that swap intact.
- The verification plan in `verification.md` is independent of those SDK guesses — it should hold regardless.

## Risk I'd flag to Sandra
If this script ran as-is via the Affinity MCP, the most likely failure modes are, in order:
1. **Method-name mismatch** — script throws on `addTextFrame` or similar. Loud, easy to fix.
2. **Silent serif fallback** — none of the candidate fonts installed and SDK doesn't expose font enumeration, so script trusts `Inter` and the renderer falls back to a serif default. Caught by visual verification.
3. **Coordinates in wrong unit** — if the doc is in mm and the SDK interprets `rect` numbers as the doc's current unit, the 0.80*pageW stays correct (it's a ratio) but the `frameH = 120` literal will be 120 mm, which is gigantic. **Fix:** read the current unit and convert, or pass an explicit unit object. This is the subtlest bug to watch for.
