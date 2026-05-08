# SDK topic index — "I want to do X, read which topic?"

The Affinity SDK is documented through the MCP itself: `list_sdk_documentation` returns ~80 topic files; `read_sdk_documentation_topic(<filename>)` reads one. Files are JS source — the public API is what's `module.exports.*`-ed at the bottom.

Some topics are very large (`document.js` ≈ 88 KB, `nodes.js` ≈ 176 KB, `commands.js` ≈ 93 KB). Read selectively. If you only need one factory, search hints first; only fall back to reading the full topic when hints don't answer.

Always start a session by reading `preamble`. It carries environment rules and accumulated hints.

---

## Required first

| Filename | Why read it |
|---|---|
| `preamble` | Mandatory. Environment rules + saved hints. |

## Documents, pages, spreads

| Filename | Read for |
|---|---|
| `document.js` | `Document.current/all/load/create`, document-level properties (dpi, units, widthPixels, pageCount, spreadCount, currentSpreadIndex), `executeCommand`, `saveAs`, `export*`. Large file — scan for the property/method you need. |
| `documentproperties.js` | Document-level state structure: format, units, dpi, bleed. Often referenced from `Document` accessors. |
| `documentsnapshot` (under tests/) | Useful as a usage example, not a reference. |
| `pageboxinterface.js` | Page-box geometry: trim, bleed, margins per page. |
| `marginsinterface.js` | Margin definitions and edits. |
| `physicalrootinterface.js`, `physicalrootpropertiesinterface.js` | Spread / physical-root level properties. |
| `artboardinterface.js`, `artboardproperties.js` | Designer artboards (alternative to Publisher pages). |

## Mutating the document

| Filename | Read for |
|---|---|
| `commands.js` | All `DocumentCommand.create*` factories. This is the main file you'll grep when figuring out *how* to add/move/style a node. Large — search for the verb (e.g. `createAdd`, `createSet`, `createTransform`). |
| `compoundoperationinterface.js` | Lower-level compound-operation API; usually you'll use `CompoundCommandBuilder` from `commands.js`. |

## Nodes (everything visible on a page)

| Filename | Read for |
|---|---|
| `nodes.js` | Node tree, `ContainerNode`, traversal, common node properties. Largest file — read selectively. |
| `shapes.js`, `shapeinterface.js` | Shape primitives (rectangle, ellipse, etc.). |
| `pictureframeinterface.js` | Picture frames — placing images into shaped frames. |
| `imageresourceinterface.js` | Loading and referencing image resources. |
| `vectorbrush.js`, `rasterbrush.js` | Brush systems, mostly relevant to Designer. |
| `rasterinterface.js`, `rasterobject.js`, `rasterselection.js`, `pixelaccessor.js` | Raster (Photo) operations. `rasterobject.js` also defines `RasterFormat`. |
| `taginterface.js` | Tags / metadata on nodes. |
| `transparencyinterface.js`, `blendmodeinterface.js`, `layereffects.js`, `layereffectsinterface.js` | Opacity, blend modes, layer effects. |
| `editabilityinterface.js`, `visibilityinterface.js` | Locking and visibility toggles. |
| `transforminterface.js` | Per-node transform reads/writes. |

## Geometry & maths

| Filename | Read for |
|---|---|
| `geometry.js` | `Rect`, `Point`, `Transform`, `unionRects`, `CurveBuilder`, `PolyCurve`. |
| `units.js` | `UnitType`, `UnitValue`, `UnitValueConverter`. |
| `drawingscale.js` | Drawing-scale conversions. |

## Text & stories

| Filename | Read for |
|---|---|
| `story.js`, `storyinterface.js`, `storybuilder.js`, `storydelta.js` | Text content as "stories" (chains of frames). Use `StoryBuilder` to compose; commit via commands. |
| `glyphs.js`, `glyphatts.js`, `paragraphatts.js` | Character + paragraph attribute structures. |
| `fonts.js` | Font enumeration and lookup. |

## Colour & paint

| Filename | Read for |
|---|---|
| `colours.js` | `Colour`, `Gradient`, `ColourProfile`, `SVG11` (named-colour shortcuts), `RGB8`/`CMYK8`/`LAB16` factories. |
| `fills.js` | Fill primitives applied to nodes. |
| `linestyle.js`, `linestyleinterface.js` | Strokes / line styles. |
| `brushfillinterface.js` | Brush-based fills. |

## Selection

| Filename | Read for |
|---|---|
| `selections.js`, `selectable.js` | `Selection.create`, selection traversal, `doc.selection`. |
| `handleobject.js` | Base class behind most SDK objects (handles wrapping the native side). |

## Curves & paths

| Filename | Read for |
|---|---|
| `curvesinterface.js` | Curve-node interface methods. |

## Adjustments / filters

| Filename | Read for |
|---|---|
| `adjustment_ranges`, `filter_ranges` | Adjustment and filter ranges (Photo workflows). |
| `hatch.js` | Hatch fills. |

## Export

| Filename | Read for |
|---|---|
| `exportconfig.js` | `ExportConfig`, `ExportFormat`, `ExportSize`, `ExportScale`, `ExportScalePreset`. |
| `exportableinterface.js` | What's exportable and how. |

## Application & UI

| Filename | Read for |
|---|---|
| `application.js` | `app.alert/confirm/prompt`, `getUserDesktopPath`, version info, `chooseFile`. |
| `dialog.js` | `Dialog` builder for in-app modal UIs (rows, columns, switches, combo boxes, unit-value editors). |
| `timers.js` | Timer / async helpers. |
| `descriptioninterface.js` | Object descriptions / metadata. |
| `network.js`, `fs.js` | Networking + filesystem (gated by Affinity Scripting permissions). |
| `buffer.js` | Binary buffer manipulation. |
| `collection.js` | `Collection` helpers (e.g. `Collection.range`). |

## Examples (read these for working patterns)

The `examples/` topics are short, complete, idiomatic scripts. Read them when unsure of a pattern; they're cheaper to digest than the full reference file.

| Filename | Demonstrates |
|---|---|
| `examples/setDocumentFormat.js` | Dialog + `Document.format` setter; using `RasterFormat`. |
| `examples/addPoints.js` | Curve manipulation; `CompoundCommandBuilder`; `DocumentCommand.createSetPolyCurveNodeCurves`. |
| `examples/addGuides.js` | Building a multi-control Dialog; `DocumentCommand.createAddGuide`. |
| `examples/alignToPage.js` | `GroupTransformData`, `GroupTransformAnchor`, `doc.applyGroupTransform`. |
| `examples/adjustPageItems.js` | Iterating spreads + pages; per-page node selection; `DocumentCommand.createTransform`. |

## Tests as a discovery tool

The `tests/` topics are the SDK's own test suite. They're verbose but exhaustive — when you can't find an API in the reference files, grep the tests for usage. Particularly useful:

| Filename | Useful for finding |
|---|---|
| `tests/documenttests.js` | Document-level operations end to end. |
| `tests/documentCommandTests.js` | The full `DocumentCommand` surface, in usage form. |
| `tests/storyTests.js`, `tests/storyInterfaceTests.js` | Text/story operations. |
| `tests/pictureFrameInterfaceTests.js` | Picture frame placement and image loading. |
| `tests/artboardInterfaceTests.js` | Artboard operations. |
| `tests/useCases.js` | High-level scripted scenarios — often the closest thing to a "tutorial". |

---

## When in doubt, search the hint pool

Many of the answers you'd otherwise dig out of the reference files have been recorded as hints from earlier sessions. Try:

```
search_sdk_hints("place a rectangle text frame on a specific spread")
search_sdk_hints("export every page as separate PDF")
search_sdk_hints("apply CMYK fill to selection")
```

before reading the large reference topics. If the hint pool didn't have it but you figure it out, leave one with `add_sdk_hint`.
