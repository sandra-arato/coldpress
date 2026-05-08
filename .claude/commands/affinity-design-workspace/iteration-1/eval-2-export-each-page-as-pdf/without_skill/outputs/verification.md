# Verification plan

How I would confirm the script does what the user asked, before declaring it done. Nothing here was actually executed in this turn — the user told me not to run anything.

## Pre-run checks (read SDK preamble first)

1. Read the Affinity SDK preamble + the `Document` / export reference. Resolve every `TODO(sdk)` in `script.js`:
   - active-document accessor (`app.activeDocument` vs `app.documents.active`)
   - page-count accessor (`doc.pageCount` vs `doc.pages.length`)
   - PDF export entry point (Shape A vs Shape B) + correct preset name
   - filename / path accessor on the document
   - home-dir accessor (or commit to a hardcoded `~/Desktop`)
2. Save the open Publisher document at least once so `{bookname}` resolves to something meaningful instead of `untitled`.

## Smoke test (cheap, catches API mismatches)

Run a stripped-down script that only:
1. Logs `pageCount`.
2. Logs the resolved `bookname`.
3. Exports **page 1 only** to `~/Desktop/{bookname}-page-1.pdf`.

Pass criteria:
- One PDF appears on the Desktop.
- Opening it shows exactly the content of page 1 of the book.
- Filename matches `{bookname}-page-1.pdf` exactly (no spaces, no double-dashes, lowercase).

If smoke passes, run the full script.

## Full-run acceptance criteria

After running `script.js` against the open book:

| # | Check | How |
|---|---|---|
| 1 | Exactly `pageCount` PDFs are produced | `ls ~/Desktop | grep -c "^${bookname}-page-.*\.pdf$"` equals the page count shown in Publisher's Pages panel |
| 2 | Filenames are 1-indexed and contiguous | Sorted numerically, indexes are `1..N` with no gaps |
| 3 | Each PDF has exactly 1 page | Open a sample (first, middle, last) in Preview; check page count = 1 |
| 4 | Page content matches the source page | Spot-check first/middle/last visually against Publisher's Pages panel |
| 5 | No stray files | No `*.pdf.tmp`, no zero-byte PDFs |
| 6 | Script summary matches reality | `ok` count from the script log equals the file count on disk; `failed` is empty |

## Failure-mode tests I'd actually try

1. **Permissions denied on Desktop.** Temporarily revoke Publisher's Desktop access in System Settings → Privacy & Security → Files and Folders, then run. Expected: script aborts on page 1 with the remediation hint, no half-written run, exit error message names the Desktop folder.
2. **Re-run with files already present.** Run twice in a row with `OVERWRITE = true` (default) — second run should just overwrite cleanly. Then flip to `OVERWRITE = false` and re-run — every page should report `skipped (exists)` and no PDFs should be touched.
3. **Unsaved document.** Open a brand-new Publisher doc, don't save, run script. Expected: `{bookname}` is `untitled`, run still completes. (If this matters to the user, we'd want to bail with a clearer warning instead.)
4. **Weird filename characters.** Save the doc as `Magyarország 2026!.afpub`. Expected: `{bookname}` slugifies to something like `magyarorszag-2026` (no spaces, no `!`, accents folded by the slugifier — note: my slugifier does NOT fold accents, see `notes.md`).
5. **Single-page document.** Should produce exactly one file `{bookname}-page-1.pdf`, no off-by-one.
6. **API-shape mismatch.** Manually rename `doc.exportPDF` to something fake to force the fallback path; confirm Shape B is reached. (Only worth doing if the first try works and we want defence-in-depth.)

## What I cannot verify without running

- Whether the chosen PDF preset actually exists in this Publisher install. The script uses `"PDF (for print)"` as a guess — if it's wrong, the SDK will likely throw on export and the fallback won't help. First real run will reveal this.
- Whether `app.fs.exists` is actually exposed. If not, `OVERWRITE = false` silently behaves like `OVERWRITE = true`. Documented in `notes.md`.
- Whether the page range syntax in Shape B is `"3-3"` vs `[3,3]` vs `{from:3,to:3}`. The SDK preamble will say.
