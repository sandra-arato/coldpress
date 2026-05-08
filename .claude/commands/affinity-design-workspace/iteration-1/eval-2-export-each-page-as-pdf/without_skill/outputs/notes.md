# Notes — honest uncertainty + assumptions

I produced this without reading the Affinity SDK preamble or any project skill files (per the user's instructions). That means parts of `script.js` are best-effort guesses against a plausible Affinity-style JS API. Calling these out so they're not surprises.

## Things I'm confident about

- The high-level shape of the task: get active doc → loop pages → call a PDF export per page → name files `{bookname}-page-{i}.pdf`.
- The error-handling philosophy: catch per-page, abort on global filesystem failure, slugify the bookname, summarise at the end.
- The macOS permissions model: Publisher needs explicit Desktop access via System Settings → Privacy & Security → Files and Folders, and the user-visible symptom is a write/IO failure on the very first export.
- File naming is unambiguous from the brief: 1-based, kebab-cased, `.pdf`.

## Things I'm guessing at (every `TODO(sdk)` in the script)

| Guess | Where | Risk if wrong |
|---|---|---|
| Active document accessor is `app.activeDocument` (fallback `app.documents.active`) | top of `main()` | Script can't start. Easy fix once the preamble is read. |
| Page-count accessor is `doc.pageCount` / `doc.pages.length` | `getPageCount` | Script can't start. |
| Per-page PDF export call is `doc.exportPDF(path, { pages, preset })` (Shape A) or `doc.exportTo(path, PdfExportOptions)` (Shape B) | `exportSinglePagePdf` | This is the highest-risk guess. If both shapes are wrong, every page fails. |
| Preset name is `"PDF (for print)"` | constants | Export throws. Swap to whatever the preset dropdown shows. |
| Document filename property is `doc.fileName` / `doc.file.name` / `doc.name` | `deriveBookname` | Bookname falls back to `untitled`. Cosmetic but noticeable. |
| Home-dir is reachable via `app.system.homeDir` / `process.env.HOME` | `getHomeDir` | Falls back to a hardcoded `/Users/alexandraszenti` (taken from this environment's working path). User can override `DEST_DIR` at the top of the script. |
| `app.fs.exists` is available for the `OVERWRITE = false` branch | `fileExists` | Silently always returns false → `OVERWRITE = false` becomes a no-op. Acceptable since `OVERWRITE = true` is the default. |
| `console.log` is captured by the MCP runner | `log` | If not, no logs visible — swap in `app.log` once confirmed. |

If I'd been allowed to read the SDK preamble first, all of these would collapse to known answers and the script could be much terser.

## Behaviour decisions worth flagging to the user

- **Spreads.** The script exports **single pages**, one PDF per page index. If the book uses facing-page spreads and the user actually wants one PDF per spread, this needs to change (loop spreads instead of pages, and rename to `{bookname}-spread-{i}.pdf` or similar). Worth a one-line confirmation before running.
- **Slugify does NOT fold accents.** `Magyarország` becomes `magyarorsz-g` (the `á` is replaced with `-`), which is ugly. If the user wants accent folding, swap the slugifier for one that calls `.normalize("NFKD").replace(/[̀-ͯ]/g, "")` first. I left this out because Affinity's JS runtime may or may not implement `String.prototype.normalize` — easy to add once confirmed.
- **Overwrite is on by default.** Re-running clobbers prior PDFs with the same name. Set `OVERWRITE = false` at the top to skip existing files instead.
- **Hard abort on first-page permission error.** If page 1 fails with a permission-flavoured error, the script stops instead of attempting all N pages and producing N copies of the same error. Page 2+ permission errors are treated as per-page (which is unrealistic — real permission failures would hit every page — but the conservative behaviour is to keep going and report).
- **No retries.** Per-page failures are not retried. If retries become useful (transient SDK hiccups), wrap the `exportSinglePagePdf` call in a small retry loop.
- **No cleanup on abort.** Whatever PDFs were written before the abort stay on disk. That's intentional — partial output is more useful than nothing — but the user should be aware they may need to delete them before re-running.

## What I'd do differently if running for real

1. Read the SDK preamble. Resolve all `TODO(sdk)` markers. Delete the Shape-B fallback once Shape A is confirmed (less code = less to maintain).
2. Run the smoke test from `verification.md` (page 1 only) before exporting all pages.
3. If the book is `hungary-2026` (likely, given project context), pre-create a target subfolder like `~/Desktop/hungary-2026-pages/` instead of dumping ~38 PDFs onto the Desktop. The user asked for Desktop directly, so this script does that — but it's worth flagging.
