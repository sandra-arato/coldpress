# Notes — uncertainties and questions before running

I wrote `script.js` from general knowledge of the Affinity JavaScript scripting API. The script defends against API-shape variation by trying multiple property/method names, but several things are genuinely uncertain. I'd want answers (or at least a quick read of the SDK preamble) before executing.

## High-uncertainty items

1. **Exact API names.** The Affinity Publisher JS SDK is not as widely documented as, say, Adobe ExtendScript. I'm not 100% confident about:
   - Whether new documents are created via `app.documents.add(preset)`, `app.createDocument(preset)`, or `app.newDocument(preset)`.
   - Whether bleed is `doc.bleed.{top,bottom,left,right}`, `doc.setBleed(...)`, or lives on a `doc.spreadSetup` / `doc.documentSetup` object.
   - Whether the facing-pages flag is `doc.facingPages`, `doc.spreadSetup.facingPages`, or controlled via a different "single page mode" boolean.
   - Whether `saveAs` accepts a string path or requires a `File`-like object.

   The script tries each plausible shape in turn and logs which one worked. Worst case, it fails fast with a readable error rather than producing a silently-wrong document. **Mitigation:** read the Affinity MCP preamble + relevant topics before running for real.

2. **Colour space.** I assumed CMYK because this is destined for print. If the user is doing home printing on an inkjet, sRGB might actually be better. Worth a one-line confirmation.

3. **Resolution / DPI.** I set 300 DPI in the preset. That's the right default for print but not load-bearing for a skeleton — it can be changed later. Flagging only because it's in the script.

4. **Bleed-only, no slug.** I'm assuming the user wants bleed but no slug area. Affinity supports both. If the print shop wants a slug, that's a separate setting.

5. **No margins set.** The user said "skeleton", so I left margins at the Affinity default (usually 12.7 mm or so). The Designer sub-agent will likely override these per-page anyway. If the user wants a specific margin baked into the master page now, this script doesn't do that.

6. **Master pages.** The script does not create or touch master pages. Affinity Publisher gives you a default "A-Master" automatically. That's probably what the user wants from a skeleton, but worth confirming.

7. **`~` expansion in paths.** Some Affinity script hosts expand `~`, some don't. The script prefers `app.userHomeDirectory` if available and falls back to a literal `~/Desktop/...`. If the fallback fires on a host that doesn't expand `~`, the save will land somewhere unexpected (or fail). **Mitigation:** if running on a host without `app.userHomeDirectory`, hardcode the absolute path `/Users/alexandraszenti/Desktop/hungary-2026.afpub` before executing.

## Questions I'd ask the user before executing

1. CMYK or sRGB document colour space?
2. Margins — leave at Affinity default, or set something specific (e.g. 12 mm all sides)?
3. Should the skeleton already have a one-page master applied, or stay at the bare "A-Master" default?
4. If a file already exists at `~/Desktop/hungary-2026.afpub`, overwrite or rename? (The script as written would overwrite — `saveAs` to an existing path typically replaces it without prompting in scripted contexts.)
5. Any chance you want the script to also create the per-section `assets/`, `drafts/layouts/` etc. folders, or is that already handled elsewhere in the P8 pipeline?

## Things I deliberately didn't put in the script

- **No `app.preflight()` / preflight checks.** Skeleton has no content, so preflight would just be noise.
- **No PDF export.** User asked for the `.afpub` skeleton only.
- **No version bumping / git hand-off.** Out of scope.
- **No undo wrapper / transaction.** Affinity scripting usually wraps in an undo step automatically, and we're creating a fresh document anyway — nothing to roll back to.

## How I'd de-risk before running

1. First MCP call: `mcp__affinity__read_sdk_documentation_topic` with topic `preamble`.
2. Second: list available SDK doc topics via `mcp__affinity__list_sdk_documentation` — pull the ones for `document`, `bleed`, `pages`, `save`.
3. Patch `script.js` to use the confirmed exact names rather than the try-each-shape fallbacks.
4. Run on a throwaway path first (e.g. `/tmp/skeleton-test.afpub`), verify with the steps in `verification.md`, then re-run with the real Desktop path.
