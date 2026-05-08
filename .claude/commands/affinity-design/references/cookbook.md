# Affinity scripting cookbook

Recipes for the most common Affinity-via-MCP tasks. Treat these as starting points — read the SDK topics referenced in each recipe to confirm the exact API for your version before running.

> Always run scripts via `mcp__affinity__execute_script`, then verify with `mcp__affinity__render_spread` (or `render_selection`).

---

## 1. Create a multi-page Publisher book where each page exports independently

**Used for:** the P8 activity-book Producer agent and any "make a book of N pages" job.

**Why these specific options:** `isFacing: false` makes `pageCount === spreadCount === N`, so each page is its own spread and exports as its own PDF page. Width/height must be supplied in **pixels**, computed from millimetres via `mm * dpi / 25.4`. `bleed` is in document units (mm here, because `units = Millimetre`).

**Read alongside:** `document.js`, `documentproperties.js`, `units.js`, `rasterobject.js`.

```javascript
'use strict';

const { Document, NewDocumentOptions } = require('/document');
const { UnitType } = require('/units');
const { RasterFormat } = require('/rasterobject');
const { app } = require('/application');

function mmToPx(mm, dpi) {
  return mm * dpi / 25.4;
}

function main() {
  const dpi = 300;
  const widthMm = 210;   // A4 portrait — change for your spec
  const heightMm = 297;
  const pageCount = 38;  // change for your spec

  const opts = NewDocumentOptions.createDefault();
  opts.units = UnitType.Millimetre;
  opts.dpi = dpi;
  opts.viewDpi = dpi;
  opts.width = mmToPx(widthMm, dpi);
  opts.height = mmToPx(heightMm, dpi);
  opts.isLandscape = false;
  opts.isMultiPage = true;
  opts.isFacing = false;            // each page = its own spread
  opts.pageCount = pageCount;
  opts.bleed = { left: 3, top: 3, right: 3, bottom: 3 }; // mm
  opts.rasterFormat = RasterFormat.RGBA8;
  opts.marginsEnabled = false;
  opts.createMaster = false;
  opts.createArtboard = false;

  const doc = Document.create(opts);

  const path = app.getUserDesktopPath + "/affinity-book.afpub";
  doc.saveAs(path);

  console.log("created doc, pageCount=", doc.pageCount, "spreads=", doc.spreadCount, "at", path);
}

module.exports.main = main;
```

**Verify:** render spread 0 and spread `pageCount - 1`. Confirm bleed is visible (a 3 mm coloured strip at each edge in render).

---

## 2. Switch to a specific spread before editing it

Setting the current spread clears the selection. Skip the assignment if you're already there.

```javascript
function setSpreadIfNeeded(doc, targetIndex) {
  if (doc.currentSpreadIndex !== targetIndex) {
    doc.currentSpreadIndex = targetIndex;
  }
}
```

Confirm the property name against `document.js` for your SDK version — it may be `currentSpread` returning a Spread object instead.

---

## 3. Place a text frame on the current spread

**Read alongside:** `nodes.js`, `shapes.js`, `story.js`, `storybuilder.js`, `storyinterface.js`, `commands.js`, `pictureframeinterface.js` (for picture frames; this one is text).

The exact factory names depend on the SDK version — check `commands.js` and `nodes.js` for `create*TextFrame*` factories. The general pattern is:

```javascript
'use strict';

const { Document } = require('/document');
const { DocumentCommand, CompoundCommandBuilder } = require('/commands');
const { Rect } = require('/geometry');
// + text/story imports — see story.js / storybuilder.js

function main() {
  const doc = Document.current;
  if (!doc) { alert("Open a document first"); return; }

  const dpi = doc.dpi;
  const mm = mmInPx => mmInPx * dpi / 25.4;

  // Frame rect in document pixels, relative to the spread.
  const rect = Rect.createXYWH(mm(20), mm(40), mm(80), mm(60));

  // Build the command via the SDK's text-frame factory.
  // Confirm the exact name with: read_sdk_documentation_topic("commands.js")
  const cmd = DocumentCommand.createAddTextFrame(rect, "Hello, world");

  doc.executeCommand(cmd);
  console.log("placed text frame at", rect.x, rect.y, rect.width, rect.height);
}

module.exports.main = main;
```

If `createAddTextFrame` doesn't exist in `commands.js`, search hints (`search_sdk_hints("add text frame to spread")`) before guessing — there is almost certainly a recorded recipe.

---

## 4. Place a picture frame pointing at a Desktop image

**Read alongside:** `pictureframeinterface.js`, `imageresourceinterface.js`, `nodes.js`, `commands.js`.

```javascript
'use strict';

const { Document } = require('/document');
const { DocumentCommand } = require('/commands');
const { Rect } = require('/geometry');
const { app } = require('/application');

function main() {
  const doc = Document.current;
  if (!doc) { alert("Open a document first"); return; }

  const imagePath = app.getUserDesktopPath + "/illustrations/cover.png";

  // Confirm exact factory name in commands.js / pictureframeinterface.js.
  // Pattern: load image resource → create picture frame referencing it → place via command.
  const cmd = DocumentCommand.createAddPictureFrameFromFile(
    Rect.createXYWH(0, 0, doc.widthPixels, doc.heightPixels), // full page
    imagePath
  );

  doc.executeCommand(cmd);
  console.log("placed picture frame from", imagePath);
}

module.exports.main = main;
```

If filesystem access is disabled you'll see `NOT_ALLOWED`. Ask the user to enable Scripting → Filesystem.

---

## 5. Iterate over every spread (whole-book operation)

```javascript
function main() {
  const doc = Document.current;
  if (!doc) return;

  for (let i = 0; i < doc.spreadCount; i++) {
    if (doc.currentSpreadIndex !== i) {
      doc.currentSpreadIndex = i;
    }
    // ...do work on spread i...
  }
}
```

Wrap mutations across spreads in a single `CompoundCommandBuilder` so the user can undo them as one action.

---

## 6. Export the document as a PDF

**Read alongside:** `exportconfig.js`, `exportableinterface.js`. Exact `Document.export*` method name varies — check `document.js`.

```javascript
'use strict';

const { Document } = require('/document');
const { ExportConfig, ExportFormat /* + presets */ } = require('/exportconfig');
const { app } = require('/application');

function main() {
  const doc = Document.current;
  if (!doc) return;

  // Build an ExportConfig with a PDF format. Use the ExportFormat /
  // ExportSize / ExportScale factories per exportconfig.js to assemble it.
  // (Concrete PDF preset name to be confirmed from the SDK topic.)

  const outPath = app.getUserDesktopPath + "/" + doc.name + ".pdf";

  // Confirm exact method on Document — likely doc.exportAs(outPath, config)
  // or similar. Search hints first.
  doc.exportAs(outPath, /* config */ null);

  console.log("exported to", outPath);
}

module.exports.main = main;
```

---

## 7. Apply a colour swatch / fill to the selection

**Read alongside:** `colours.js`, `fills.js`, `commands.js`.

```javascript
const { Colour, RGB8, SVG11 } = require('/colours');

const ibuszRed = RGB8(196, 30, 58);
// or: SVG11.cornflowerblue
```

Apply via the appropriate `DocumentCommand.createSet*Fill` for the selected nodes — the exact name lives in `commands.js`.

---

## 8. Save a finished script to the user's library

When the script works and the user is satisfied:

```
mcp__affinity__save_script_to_library({
  title: "Create P8 hungary-2026 book skeleton",
  description: "Creates a 38-page A4 portrait Publisher doc with 3mm bleed, isFacing=false. Saves to Desktop as affinity-book.afpub.",
  code: "<the working script source>"
})
```

And record what you learned:

```
mcp__affinity__add_sdk_hint({
  hint: "For a Publisher book where each page exports as one PDF page, use NewDocumentOptions with isFacing:false; pageCount === spreadCount."
})
```

---

## API confirmation pattern

Several of the recipes above say "confirm exact factory name in `commands.js`". That's deliberate — `commands.js` is large (~93 KB) and changes between Affinity versions. Don't bake exact names into your scripts from this cookbook without checking. The reliable workflow:

1. `search_sdk_hints("…what I'm trying to do…")` — usually finds it
2. If not, `read_sdk_documentation_topic("commands.js")` and grep for the verb
3. Try the script; if it errors, log the error message and read the relevant topic file again
