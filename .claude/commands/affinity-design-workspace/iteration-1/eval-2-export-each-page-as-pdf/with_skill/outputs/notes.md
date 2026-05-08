# Notes — uncertainties and error handling

## Error: `NOT_ALLOWED`

Per the skill SKILL.md ("Permissions & error patterns" table), `NOT_ALLOWED` from a filesystem call means **the user has disabled Filesystem access** in Affinity → Preferences → Scripting. This is not a script bug.

Handling in this script:

1. The per-page export is wrapped in `try/catch`. If the first page errors, the loop still attempts the rest — but realistically, if filesystem access is disabled, *every* page will fail with the same error, so the run will surface a long list of identical `NOT_ALLOWED` failures.
2. The summary block detects this case (`/NOT[_ ]ALLOWED/i.test(...)`) and prints a clear hint telling the operator to enable Filesystem in Preferences → Scripting and re-run.
3. The script does **not** silently retry. The skill explicitly says "Do not silently retry" for `NOT_ALLOWED`.

Operator action when `NOT_ALLOWED` shows up:
- Open Affinity → Preferences → Scripting → enable Filesystem.
- Re-run the same script. No code change required.
- If the user has already enabled it but is still seeing the error, sanity-check that `app.getUserDesktopPath` is the actual destination — writes outside `~/Desktop` are blocked even with the permission on (per SKILL.md: "Filesystem access is Desktop-only").

## Other failure modes covered

- **No open document** → `Document.current` is null → `alert(...)` and return cleanly.
- **Single-page failure** (e.g. one corrupted spread) → caught, logged, loop continues. The other N−1 PDFs still land on Desktop.
- **Bookname collisions** from `doc.name` containing slashes / special chars → `sanitiseBookName` strips path-hostile characters before composing the output path.
- **Facing-pages document** (`isFacing: true`) → logged as a warning. Each spread will export as a 2-page PDF rather than 1-page; the operator decides whether to switch the doc to non-facing first.

## Honest uncertainty — confirm before running

These are the things I could not nail down from the skill alone. The cookbook (recipe 6, "Export the document as a PDF") explicitly flags them as TBC.

| Topic | What I assumed | Where to confirm |
|---|---|---|
| Document export method name | `doc.exportAs(path, config)` (cookbook §6 uses this name as a placeholder; falls back to `doc.export` / `doc.exportTo`) | `read_sdk_documentation_topic("document.js")` — search for `export` |
| `ExportConfig` factory for PDF | `ExportConfig.createForFormat(ExportFormat.PDF)` (with `createDefault()` fallback) | `read_sdk_documentation_topic("exportconfig.js")` |
| PDF preset name (e.g. "PDF (for print)" vs "PDF (digital — high quality)") | leave at SDK default | `read_sdk_documentation_topic("exportconfig.js")` |
| Per-page scoping field on `ExportConfig` | sets `pageIndex` / `spreadIndex` / `pageRange` whichever exists | `read_sdk_documentation_topic("exportconfig.js")` |
| `doc.name` vs `doc.fileName` vs `doc.title` for the bookname | `doc.name` (matches cookbook §6 usage) | `read_sdk_documentation_topic("document.js")` |
| Whether `Document` is the right exporter, or if there's an `Exportable` interface | tried `Document` methods first | `read_sdk_documentation_topic("exportableinterface.js")` |

I'd also run `search_sdk_hints("export each page as separate PDF")` and `search_sdk_hints("ExportConfig PDF preset")` first — per the skill, the hint pool usually has the exact recipe.

## What I would *not* do

- Bake exact API names into the script without confirming. The cookbook explicitly warns that `commands.js` (and by extension other large topics) change between SDK versions.
- Skip the verification step. Even after the script logs all-OK, the JPEG/PDF on disk is the ground truth.
- Try to write outside `~/Desktop`. The skill says Desktop-only; attempting elsewhere returns `NOT_ALLOWED`.
- Call `add_sdk_hint` or `save_script_to_library` until the script has actually run successfully against a live document — recording an unverified hint pollutes the pool.
