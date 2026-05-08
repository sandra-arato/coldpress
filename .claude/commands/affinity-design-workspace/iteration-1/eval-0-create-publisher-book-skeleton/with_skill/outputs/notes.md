# Notes — uncertainties, fallbacks, things to confirm

## SDK names I'm not 100% sure of (would confirm via discovery before running)

The cookbook gives a tested recipe shape, but a few exact identifiers vary by SDK version. Before execution I'd resolve these via `search_sdk_hints` first, then `read_sdk_documentation_topic` if hints are silent.

| Symbol used in script | Confidence | What I'd confirm | Topic to read if hints don't cover it |
|---|---|---|---|
| `NewDocumentOptions.createDefault()` | High — straight from cookbook §1 | That `createDefault` is the current factory (vs. `new NewDocumentOptions()` or a `Document.NewDocumentOptions` namespace). | `documentproperties.js` |
| `opts.bleed = { left, top, right, bottom }` | Medium | Shape of the bleed property — could be `UnitValue` instances or a different field set (`bleedTop`, `bleedLeft`, …). | `documentproperties.js` |
| `opts.isMultiPage`, `opts.isFacing`, `opts.pageCount` | Medium-high | Exact spelling/case. SDK may use `multiPage`/`facing`/`pages`. | `documentproperties.js` |
| `opts.createMaster`, `opts.createArtboard`, `opts.marginsEnabled` | Medium | These are convenience flags; if absent the doc just gets defaults — not load-bearing for the skeleton. Drop them rather than guess if discovery shows different names. | `documentproperties.js` |
| `RasterFormat.RGBA8` | High | From `rasterobject.js` per topic-index. | `rasterobject.js` |
| `UnitType.Millimetre` | High | British spelling matches the cookbook; UK-English Affinity convention. | `units.js` |
| `Document.create(opts)` | High | Listed under `document.js` in the topic index. | `document.js` |
| `doc.saveAs(path)` | Medium | Method may be `saveAs(path, format)` or take an options object; cookbook §1 uses single-arg form. | `document.js` |
| `app.getUserDesktopPath` | High — explicit in SKILL.md | Skill says it's a property; double-check it isn't a method (`getUserDesktopPath()`). | `application.js` |
| `doc.sessionUuid` | Low-medium | SKILL.md says "confirm the exact accessor by reading `document.js`". I log it but render calls can fall back to whatever ID `Document.current` exposes. | `document.js` |

If any of these blow up at runtime, the failure mode is informative — log the error, read the relevant topic, fix, re-run.

## Permissions I'd confirm with the user before running

The script needs **filesystem scripting permission** in Affinity → Preferences → Scripting. If it's off, `doc.saveAs(...)` returns `NOT_ALLOWED`. The skill rule is to surface this as a permission ask, not silently retry. I'd mention it once before sending the script, so the user can flip it pre-emptively.

It does **not** need AI or networking permissions for this task.

## Things I'd confirm with Sandra before running

1. **Filename.** She said `hungary-2026.afpub` — I'm using exactly that. If something on her Desktop already has that name, `saveAs` will silently overwrite it. Worth one sentence of "okay to overwrite if it already exists?" given how cheap the question is.
2. **Bleed colour / paper colour.** Skeleton only, so I'm not setting either. Default Affinity paper colour is white. If she wants the cream/light editorial baseline (per P8 quality bar §8), that's a follow-up step on the master page, not part of this skeleton.
3. **Master page deferred.** I deliberately set `createMaster: false` because P8's editorial plan is locked separately and master decisions should follow the layout spec, not precede it. If she wanted a master at creation time, easy to flip.

## Open questions / fallbacks

- **If `isFacing: false` is rejected** (e.g. the SDK currently couples `isMultiPage` and `isFacing`) the fallback is to create the doc facing, then loop and call a `DocumentCommand.createSplitFacingPages` (or equivalent) per spread — but this is a known cookbook recipe and I'd be surprised. Hint search would catch this first.
- **If `bleed` field shape is wrong**, fallback is to read `documentproperties.js`, build whatever shape it wants, and re-run. The doc creation is cheap and undoable.
- **No save_script_to_library / add_sdk_hint until verification passes.** The SKILL.md rule is "save once it works and the user is happy" — those calls would come *after* the render checks, not as part of this run.

## What I would not do

- Not pre-place text frames, picture frames, or guides. Spec said skeleton.
- Not export to PDF as part of this step. Export is a separate downstream task.
- Not call `mcp__affinity__execute_script` in this eval — per the task instructions, the script is produced as a file only.
