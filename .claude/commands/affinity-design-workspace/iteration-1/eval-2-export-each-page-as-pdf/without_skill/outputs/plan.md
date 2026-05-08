# Plan — Export every page of the active Publisher book as separate PDFs

## Goal
For the document currently open in Affinity Publisher, write one PDF per page to the user's Desktop, named:

```
{bookname}-page-{1}.pdf
{bookname}-page-{2}.pdf
...
{bookname}-page-{N}.pdf
```

`{bookname}` = the document's filename without extension (fallback: `untitled` if the doc is unsaved).
Indexing is **1-based** and matches the Pages panel order shown in the UI.

## Constraints / context
- Target host: Affinity Publisher via the "Affinity MCP" JS scripting SDK (the same JS surface used by `mcp__affinity__execute_script`). Designer/Photo are not relevant here — Publisher is the only one of the three that has multi-page documents.
- Deliverable is a script + docs only. Nothing executes against the MCP in this turn.
- I have not read the SDK preamble or the SDK docs in this turn (the user explicitly told me not to read project skill files / call MCP tools). So I am working from general knowledge of the Affinity scripting surface and standard ECMAScript. I flag every spot below where I'm guessing.

## Approach

1. **Resolve the active document.**
   Get the active Publisher document handle. In most Affinity scripting surfaces this is something like `app.activeDocument` or `app.documents.active` — exact accessor noted as TODO in the script.
2. **Derive `{bookname}`.**
   Use the document's file name (strip directory + extension). If the document has never been saved, fall back to `app.activeDocument.name` (likely `"Untitled"` or similar) and lowercase/slug it.
3. **Resolve the Desktop path.**
   `${HOME}/Desktop`. The SDK is expected to expose either an env-style accessor or a path constant; if not, the script accepts an override via a `DEST_DIR` constant near the top.
4. **Iterate pages.**
   Loop `i = 0 .. pageCount-1`. For each page:
   - Build the output filename: `${bookname}-page-${i+1}.pdf`.
   - Call the SDK's "export this page as PDF" function, passing the destination file path and a PDF preset.
   - On failure, catch, log, and continue (so one bad page doesn't kill the whole run).
5. **Summary.**
   At the end, print: total pages, succeeded count, failed count, and the list of failures with their reasons.

## Page-export strategy (key uncertainty)

The Affinity scripting SDK is known to expose document export, but I'm not 100% sure on the exact API shape for **single-page** PDF export. Two plausible shapes:

- **Shape A — explicit per-page export call.** Something like
  `doc.exportPDF(filePath, { pages: [i], preset: "PDF (for print)" })` or
  `doc.export({ format: "pdf", path, pageRange: [i, i] })`.
- **Shape B — set page range on a PDF export options object, then export.** Construct a PDF export options object, set `pageRange = i+1..i+1` (1-based string), call `doc.export(...)`.

The script picks **Shape A** as the primary path and falls back to **Shape B** if Shape A throws "not a function" / "unknown option". Both branches are clearly marked `TODO` so the user can confirm against the SDK preamble before running.

## Error handling strategy

The script must keep going on per-page failures and surface a clean report. Specific cases handled:

| Class | How it's caught | What we do |
|---|---|---|
| No active document | `app.activeDocument` is null/undefined | Throw early with a clear message; nothing exported |
| Desktop dir missing / not writable (permissions denied) | First-page export throws `EACCES` / "permission denied" / "could not open file for writing" | Abort whole run with a single clear message — retrying every page would just produce N identical failures |
| Single-page export failure (e.g. corrupted page, font issue, transient SDK error) | Per-page `try/catch` | Log `{ page: i+1, error: msg }`, continue with next page |
| File already exists | Overwrite by default. Optional `OVERWRITE = false` flag would skip + log "skipped (exists)". |
| Filename collision from weird chars in `{bookname}` | Slugify before use: lowercase, replace anything outside `[a-z0-9-_]` with `-`, collapse repeats |
| Unsaved document | `bookname` falls back to `untitled`; warn in the log |
| SDK API mismatch (Shape A not present) | Try/catch around the export call; on `TypeError`, fall back to Shape B; if that also fails, abort with the original error |

The "permissions denied" case specifically: macOS will reject writes to `~/Desktop` if Publisher hasn't been granted Files-and-Folders / Full Disk Access for the Desktop folder. The SDK error for this typically surfaces as a write/IO error rather than a structured error code, so the script string-matches on `permission`, `denied`, `EACCES`, `not permitted` (case-insensitive) and prints a remediation hint:

> "Could not write to ~/Desktop. Grant Affinity Publisher access to the Desktop folder in System Settings → Privacy & Security → Files and Folders, then re-run."

## Out of scope
- Rasterised / PNG export. Spec says PDF.
- Spreads vs single pages. Default is single pages, matching the 1-based UI page index. Noted in `notes.md` as a thing to confirm with the user if their book uses facing-page spreads.
- Recombining the per-page PDFs.
- Running the script. The user explicitly said do not execute via the MCP.
