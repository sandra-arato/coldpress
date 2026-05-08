# Verification

## After running `execute_script`

Inspect the captured `console.log` stream first — `execute_script` swallows return values, so logs are the only in-script signal.

Expected log shape on success (for an N-page doc):

```
OK   page 1 → /Users/<you>/Desktop/<bookname>-page-1.pdf
OK   page 2 → /Users/<you>/Desktop/<bookname>-page-2.pdf
...
OK   page N → /Users/<you>/Desktop/<bookname>-page-N.pdf
---
Export summary: N succeeded, 0 failed of N pages
Bookname used  : <bookname>
Desktop path   : /Users/<you>/Desktop
```

## Filesystem checks (do these on the host, not via the MCP)

1. `ls ~/Desktop | grep -E '<bookname>-page-[0-9]+\.pdf$' | wc -l` should equal `doc.spreadCount` (and equal `pageCount` when `isFacing:false`).
2. The numeric range is contiguous from 1 to N — no gaps, no zero-pad mismatch.
3. Each PDF file size is non-trivial (> ~10 KB for a real page; an empty/locked export tends to be ≈1 KB or absent).
4. Spot-open `<bookname>-page-1.pdf` and `<bookname>-page-N.pdf` in Preview. Each should be exactly **1 PDF page** (unless the doc was facing, in which case page-1 may be a 2-up spread and the warning was logged).
5. Visual content matches the source — e.g. for `hungary-2026`, page 1 should show the cover, page 38 the colophon.

## In-Affinity sanity check (no MCP — manual)

- File → Export… on a single page using the same PDF preset and confirm visual parity with the script's page-N PDF.
- Confirm the user's Affinity → Preferences → Scripting still shows "Filesystem access: enabled" after the run (some configs gate per-domain).

## Definition of success

- Exit summary log reads `N succeeded, 0 failed of N pages`.
- The Desktop contains exactly N files matching `<bookname>-page-{1..N}.pdf`.
- Each file opens, has the correct page count (1), and visually matches the corresponding spread in the source `.afpub`.

## Definition of partial success (still useful)

- Some pages exported, some failed — failures are listed in the summary log with their error strings, and the operator can re-run for just those pages by tweaking the loop bounds. Existing successful PDFs are not overwritten unless re-run.

## Definition of failure (must investigate before declaring done)

- Empty Desktop / zero files written despite "OK" logs → the export method silently no-op'd; re-check `doc.exportAs` choice in `document.js`.
- All pages logged `NOT_ALLOWED` → user has Filesystem scripting disabled (see notes.md).
- File count > N or duplicate suffixes → bookname sanitisation produced collisions; inspect `sanitiseBookName` output.
