---
name: affinity-design
description: Create, edit, lay out, and export designs in Affinity Designer/Publisher/Photo (the Canva-owned desktop apps) by writing JavaScript scripts and running them through the Affinity MCP. Use this skill whenever the user wants to build, modify, place content in, or export an Affinity document — including multi-page Publisher books, single-spread Designer posters, page layouts, picture frames, text frames, master pages, exports to PDF/PNG/etc., or any task involving the `mcp__affinity__*` tools or `.afdesign` / `.afpub` / `.afphoto` files. Trigger on phrases like "in Affinity", "Affinity Publisher", "Affinity Designer", "make a book in Affinity", "place this in Affinity", "export the Affinity doc", or whenever the workflow used to be "do this in Canva" but the user has switched to Affinity. Prefer this skill over the canva-design skill once a project has moved to Affinity.
---

# Affinity Design via MCP

The Affinity MCP exposes a JavaScript SDK that runs inside a live Affinity application (Designer / Publisher / Photo). You write a script, the MCP executes it against the user's open document, and you visually verify the result.

There is no separate web doc site for this SDK — the MCP itself is the documentation. Use `list_sdk_documentation` and `read_sdk_documentation_topic` to read the canonical reference, and `search_sdk_hints` to consult prior solutions.

---

## Critical rules (read first)

- **Read the preamble before your first script.** Every fresh session: call `read_sdk_documentation_topic("preamble")`. It contains environment-specific rules (filesystem permissions, AI gating, current-spread semantics) plus saved hints from prior sessions that often answer the exact problem you're about to hit.
- **Search hints before experimenting.** Before guessing at API shapes, call `search_sdk_hints` with a sentence describing what you're trying to do. The hint pool is shared across millions of sessions — someone has usually already solved your problem.
- **`execute_script` swallows return values.** The script's return value is not surfaced. Use `console.log(...)` for anything you need to inspect. Plan scripts to log their outputs explicitly.
- **Mutations go through `Document.executeCommand`, not direct mutation.** Use `DocumentCommand.create*` factories from `/commands` and `doc.executeCommand(cmd)`. For multi-step changes wrap in `CompoundCommandBuilder` so they undo as one user action.
- **Set the current spread *only if it isn't already current*.** Setting it clears the selection. Read `doc.currentSpreadIndex` (or the equivalent the SDK exposes) before assigning.
- **Always visually verify with `render_spread` or `render_selection`.** The script may "succeed" while producing the wrong layout. Render after every meaningful change and inspect the JPEG.
- **`NOT_ALLOWED` means a settings restriction, not a bug.** The user has disabled AI, filesystem, or networking in Affinity → Preferences → Scripting. Tell them which capability you need and ask them to enable it. Do not silently retry.
- **Filesystem access is Desktop-only.** Use `app.getUserDesktopPath` (from `/application`) as the base. Never try to read or write outside the user's Desktop.
- **Save useful scripts.** Once a script works and the user is happy, call `save_script_to_library` so it shows up in their Scripts panel for re-use.
- **Record what you learned.** After solving a problem by experimentation, call `add_sdk_hint` with the lesson in plain language. This is how the hint pool gets better — including for your next session.

---

## The core loop

Every task follows the same shape. Don't skip steps; the verification step in particular is what makes this reliable.

```
1. Discover
   - read_sdk_documentation_topic("preamble")  ← once per session
   - search_sdk_hints("…what you're trying to do…")
   - list_sdk_documentation  → pick relevant topics
   - read_sdk_documentation_topic(<topic>)     ← only what you need

2. Plan
   - sketch the script: which require()s, which commands, which final state

3. Execute
   - execute_script(<script>)
   - script writes module.exports.main = main
   - log everything you might need to inspect

4. Verify
   - render_spread or render_selection
   - inspect the JPEG; check what you actually got vs what you intended

5. Iterate or commit
   - if wrong: refine and re-execute
   - if right and reusable: save_script_to_library + add_sdk_hint
```

---

## Script anatomy

Affinity scripts are CommonJS modules with a `main` export. The MCP runs `main()`.

```javascript
'use strict';

const { Document } = require('/document');
const { DocumentCommand, CompoundCommandBuilder } = require('/commands');
// require everything else you need from the SDK topic list

function main() {
  const doc = Document.current;
  if (!doc) {
    alert("This script requires an open document");
    return;
  }

  // 1. Build commands
  const cmd = DocumentCommand.createSomething(/* args */);

  // 2. Apply (single command)
  doc.executeCommand(cmd);

  // OR for many: wrap in CompoundCommandBuilder so undo treats them as one
  const builder = CompoundCommandBuilder.create();
  builder.addCommand(cmd);
  builder.addCommand(otherCmd);
  doc.executeCommand(builder.createCommand());

  // 3. Log what you need to inspect (return values are not surfaced)
  console.log("done — pages:", doc.pageCount);
}

module.exports.main = main;
```

Key entry points:

- `Document.current` — the active document, or `null` if nothing is open.
- `Document.all` — array of all open documents.
- `Document.create(opts)` — new document from `NewDocumentOptions` (see Publisher recipe in `references/cookbook.md`).
- `Document.load(path)` — open from disk (filesystem permission required).
- `app` from `/application` — alerts, prompts, version info, `getUserDesktopPath`.

Common modules: `/document`, `/commands`, `/geometry`, `/units`, `/colours`, `/nodes`, `/shapes`, `/fills`, `/fonts`, `/selections`, `/exportconfig`, `/dialog`. Full list via `list_sdk_documentation`. See `references/topic-index.md` for "I want to do X — read which file?" guidance.

---

## Coordinate system gotchas

These bite every new session. They are also documented in the preamble hints — re-read those first.

- **`getSpreadExtents()` is in spread-internal units, not document pixels.** The factor is roughly 11.81× larger than `doc.widthPixels` for a 300dpi mm-based doc (because 300 / 25.4 ≈ 11.81 px/mm in the spread's internal scale). For absolute placement always compute from `doc.widthPixels`, `doc.heightPixels`, and `mm * doc.dpi / 25.4`.
- **Bleed deltas, on the other hand, are in document pixels.** The difference between `spread.getExtentsWithBleed()` and `spread.getExtents()` reads in normal doc px — e.g. 35.43 = 3 mm @ 300 dpi.
- **`isFacing: true` pairs pages into spreads.** For a book where each page must export as its own PDF page, use `isFacing: false` so `pageCount === spreadCount`. See the Publisher book recipe in `references/cookbook.md`.

---

## Visual verification

After any script that changes geometry, content, or styling:

```
render_spread({ document_session_uuid: <uuid>, spread_index: <0-based> })
  → base64 JPEG, max 1024px, possibly downscaled
```

Or `render_selection` to inspect a single node in isolation.

Get the `document_session_uuid` from the SDK (e.g. `Document.current.sessionUuid` — confirm the exact accessor by reading `document.js`). When in doubt, log it from inside the script.

Treat the rendered JPEG as the ground truth. If it doesn't match what your script claimed it would do, the script is wrong — not the rendering.

---

## Permissions & error patterns

| Symptom | Likely cause | Fix |
|---|---|---|
| `NOT_ALLOWED` from a filesystem call | User disabled filesystem access | Ask them to enable it in Affinity → Preferences → Scripting |
| `NOT_ALLOWED` from an AI call | User disabled AI | Same place |
| `NOT_ALLOWED` from `fetch` / network | User disabled networking | Same place |
| Script "ran" but nothing visible | Forgot `executeCommand`, or mutated a node directly | Wrap changes in `DocumentCommand.create*` and pass through `executeCommand` |
| Selection cleared between steps | You set the current spread when it was already current | Read current spread index first; only set if different |
| Coordinates look ~12× off | Mixed spread-extents units with document pixels | Convert via `mm * doc.dpi / 25.4` and use `doc.widthPixels`/`heightPixels` |
| Empty `module.exports` error | Forgot `module.exports.main = main` | Add it; the MCP runs `main()` |

---

## When to save vs. add a hint vs. report an issue

- **`save_script_to_library`** — the script does something the user will want to re-run. Give it a clear `title` and one-line `description`. Saved scripts appear in the user's Scripts panel.
- **`add_sdk_hint`** — you learned something non-obvious about the SDK that would help any future session. Phrase as a *fact* or *recipe*, not a story. Good: "To create a multi-page Publisher document where each page is independent, set `isFacing: false`." Bad: "I tried X and it didn't work."
- **`report_sdk_issue`** — you've confirmed something is genuinely broken (not a misuse of the API). Include a minimal repro script in `code` and a clear `description`. Be sure first; don't report flakes.

---

## Project context: P8 activity-book

This skill exists because the P8 children's-scrapbook pipeline switched from Canva to Affinity Publisher. The Designer / Producer agents now build the book here.

Typical jobs in this project:

- **Producer** — create a multi-page Publisher document at the locked spec (size, bleed, page count), place text frames per the layout spec, place picture frames pointing at locked illustrations on the Desktop, export per-page or full-book PDFs.
- **Designer** — prototype layouts, place style swatches/guides, iterate on typography and grid.

Start a new book with the Publisher book recipe in `references/cookbook.md`. It encodes the unit conversions and `isFacing: false` decision so each page exports as one PDF page.

---

## Bundled references

Read these on demand — don't load them all up front.

- `references/cookbook.md` — copy-pasteable recipes: create a Publisher book, place a text frame, place a picture frame from a Desktop image, apply colour, export PDFs.
- `references/topic-index.md` — annotated map of SDK doc topics → which one to read for which task.
