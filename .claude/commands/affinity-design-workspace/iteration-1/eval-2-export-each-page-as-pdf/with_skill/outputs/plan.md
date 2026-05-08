# Plan — Export every page as a separate PDF

## Goal

For the Publisher document currently open in Affinity, export every page as a standalone PDF onto the user's Desktop, named `{bookname}-page-{N}.pdf` (1-based).

The skill is explicit that filesystem writes are Desktop-only via `app.getUserDesktopPath`, so the destination path is bounded by that.

Because the book skeleton recipe creates documents with `isFacing: false`, `pageCount === spreadCount`. So "every page" maps cleanly to "every spread, index 0..spreadCount-1". The script must still cope with `isFacing: true` defensively (where one spread holds two pages) — see notes.md.

## Discovery calls (skill-mandated)

Before writing or running anything, do these in order. Each is a `mcp__affinity__*` call — but per the test rules I am NOT executing them, only listing them.

1. `read_sdk_documentation_topic("preamble")` — once per session. Confirms filesystem permission semantics, current-spread behaviour, and surfaces any saved hints about per-page export.
2. `search_sdk_hints("export each page as separate PDF")` — high chance someone has already solved this. Also try `search_sdk_hints("Document export PDF per spread")` and `search_sdk_hints("ExportConfig PDF preset")`.
3. `list_sdk_documentation` — pick the topics needed for export.
4. `read_sdk_documentation_topic("exportconfig.js")` — confirms the constructor / preset names for PDF (e.g. `ExportFormat.PDF`, any `PdfPreset.*`, page-range fields).
5. `read_sdk_documentation_topic("document.js")` — confirms the exact `Document.export*` method (`exportAs`, `exportTo`, `export`, etc.) and what it accepts (path + config, or path + format object).
6. `read_sdk_documentation_topic("exportableinterface.js")` — fallback if `Document` itself doesn't expose export, the spread/document may implement an `Exportable` interface.
7. Optional: `read_sdk_documentation_topic("application.js")` — confirm `app.getUserDesktopPath` is a property (no `()`), as the cookbook uses it without parentheses.

## Approach

1. Resolve `doc = Document.current`. Bail with `alert` if null.
2. Read `doc.name` (or equivalent — confirm in `document.js`); strip extension and any path; sanitise to a filesystem-safe `bookname` (collapse spaces, drop slashes, keep diacritics if the OS supports them — Desktop on macOS does).
3. Read `doc.spreadCount`. Loop `i = 0..spreadCount-1`.
4. For each iteration:
   - Build a per-page `ExportConfig` for PDF. The config needs to scope the export to a single page/spread — confirm field names in `exportconfig.js` (likely `pageRange`, `pageIndex`, or a `spreadIndex`).
   - Compute `outPath = app.getUserDesktopPath + "/" + bookname + "-page-" + (i+1) + ".pdf"`.
   - Call `doc.<exportMethod>(outPath, config)` — exact method confirmed from `document.js`.
   - Wrap in `try/catch`; capture any error and continue to next page so one bad page doesn't kill the run. Log every result via `console.log` (return values are swallowed).
5. After the loop, log a summary: how many succeeded, how many failed, list of failed pages with their error strings.

## Why this shape

- **Loop over spreads, not via `currentSpreadIndex` switching.** The export config can target a page directly; switching the current spread on every iteration would clear the user's selection and is a wasted side effect (skill warns about this).
- **No `CompoundCommandBuilder`.** Exports aren't document mutations — there is nothing to undo, so we don't need `executeCommand`.
- **One file per call, not a single multi-page export with page splitting.** Splitting is brittle and hides per-page failures. One call per page = clear logs and clean error isolation.
- **Module shape with `module.exports.main = main`.** Required by the MCP runner.

## What I will NOT do (per test instructions)

I will not call `mcp__affinity__execute_script`, `render_spread`, `read_sdk_documentation_topic`, `search_sdk_hints`, or any other `mcp__affinity__*` tool. Deliverables are files only.
