/**
 * export-each-page.js
 *
 * Export every page of the currently open Affinity Publisher document
 * as a separate PDF on the user's Desktop.
 *
 * Output filename: `{bookname}-page-{1-based-index}.pdf`
 *   - {bookname} = active doc filename without extension, slugified.
 *   - index is 1-based and matches the Pages panel order.
 *
 * Run via the Affinity MCP `execute_script` tool. Do NOT run this against
 * a document with unsaved work you care about without saving first — this
 * script does not modify the document, but a crash mid-export could leave
 * Publisher in a weird state.
 *
 * IMPORTANT: I have not read the Affinity SDK preamble in this session.
 * Anything marked `TODO(sdk)` is my best guess at the API shape and
 * should be confirmed against the SDK docs before the first real run.
 */

(function main() {
  // ---------- config ----------
  const DEST_DIR = `${getHomeDir()}/Desktop`;
  const OVERWRITE = true; // set false to skip pages whose PDF already exists
  const PDF_PRESET = "PDF (for print)"; // TODO(sdk): confirm preset name; "PDF (digital - high quality)" is another common one

  // ---------- resolve active document ----------
  // TODO(sdk): exact accessor. Common shapes seen in Affinity-style SDKs:
  //   app.activeDocument
  //   app.documents.active
  //   app.documents[app.documents.activeIndex]
  const doc =
    (typeof app !== "undefined" && (app.activeDocument || (app.documents && app.documents.active))) ||
    null;

  if (!doc) {
    throw new Error(
      "No active Publisher document. Open the book in Affinity Publisher and try again."
    );
  }

  const bookname = slugify(deriveBookname(doc));
  const pageCount = getPageCount(doc);

  if (!pageCount || pageCount < 1) {
    throw new Error(`Active document reports ${pageCount} pages — nothing to export.`);
  }

  log(`Exporting ${pageCount} pages of "${bookname}" to ${DEST_DIR}`);

  // ---------- iterate ----------
  const results = { ok: [], failed: [], skipped: [] };
  let abortReason = null;

  for (let i = 0; i < pageCount; i++) {
    if (abortReason) break;

    const oneBased = i + 1;
    const filename = `${bookname}-page-${oneBased}.pdf`;
    const fullPath = `${DEST_DIR}/${filename}`;

    if (!OVERWRITE && fileExists(fullPath)) {
      results.skipped.push({ page: oneBased, path: fullPath, reason: "exists" });
      log(`  page ${oneBased}: skipped (exists)`);
      continue;
    }

    try {
      exportSinglePagePdf(doc, i, fullPath, PDF_PRESET);
      results.ok.push({ page: oneBased, path: fullPath });
      log(`  page ${oneBased}: ok`);
    } catch (err) {
      const msg = errorMessage(err);
      results.failed.push({ page: oneBased, path: fullPath, error: msg });
      log(`  page ${oneBased}: FAILED — ${msg}`);

      // permissions failures are global, not per-page — bail early.
      if (looksLikePermissionError(msg) && oneBased === 1) {
        abortReason =
          "Could not write to " +
          DEST_DIR +
          ". Grant Affinity Publisher access to the Desktop folder in " +
          "System Settings → Privacy & Security → Files and Folders, then re-run.";
      }
    }
  }

  // ---------- summary ----------
  log("");
  log(`Done. ok=${results.ok.length}  failed=${results.failed.length}  skipped=${results.skipped.length}`);
  if (results.failed.length) {
    log("Failures:");
    for (const f of results.failed) log(`  - page ${f.page}: ${f.error}`);
  }
  if (abortReason) {
    log("");
    log("ABORTED: " + abortReason);
    throw new Error(abortReason);
  }

  return results;

  // =====================================================================
  // helpers
  // =====================================================================

  /**
   * Export a single page (0-based index) of `doc` to `outPath` as PDF.
   * Tries the most likely SDK shape first, falls back to a second shape
   * if the first throws TypeError / "unknown option".
   */
  function exportSinglePagePdf(doc, pageIndex, outPath, preset) {
    // --- Shape A: explicit per-page export call. ---
    // TODO(sdk): confirm method name and option keys.
    try {
      if (typeof doc.exportPDF === "function") {
        return doc.exportPDF(outPath, { pages: [pageIndex], preset: preset });
      }
      if (typeof doc.export === "function") {
        return doc.export({
          format: "pdf",
          path: outPath,
          pages: [pageIndex],
          preset: preset,
        });
      }
    } catch (err) {
      if (!isLikelyApiMismatch(err)) throw err;
      // fall through to Shape B
    }

    // --- Shape B: configure a PDF export options object, then export. ---
    // TODO(sdk): confirm constructor and property names.
    if (typeof PdfExportOptions === "function") {
      const opts = new PdfExportOptions();
      opts.preset = preset;
      // Affinity's UI-side page range is 1-based and string-y, e.g. "3-3".
      opts.pageRange = `${pageIndex + 1}-${pageIndex + 1}`;
      return doc.exportTo(outPath, opts);
    }

    throw new Error(
      "Could not find a per-page PDF export entry point on the document. " +
        "Check the SDK docs and update exportSinglePagePdf()."
    );
  }

  function deriveBookname(doc) {
    // Prefer the on-disk filename if available.
    // TODO(sdk): confirm property names.
    const candidates = [doc.fileName, doc.filename, doc.file && doc.file.name, doc.name];
    for (const c of candidates) {
      if (typeof c === "string" && c.length) return stripExt(basename(c));
    }
    return "untitled";
  }

  function getPageCount(doc) {
    // TODO(sdk): confirm. Could be doc.pages.length, doc.pageCount, doc.spreads.flatMap(...).length.
    if (typeof doc.pageCount === "number") return doc.pageCount;
    if (doc.pages && typeof doc.pages.length === "number") return doc.pages.length;
    if (typeof doc.getPageCount === "function") return doc.getPageCount();
    throw new Error("Cannot determine page count on the active document.");
  }

  function getHomeDir() {
    // TODO(sdk): confirm. Possible shapes:
    //   app.system.homeDir / app.env.HOME / process.env.HOME
    if (typeof app !== "undefined") {
      if (app.system && app.system.homeDir) return app.system.homeDir;
      if (app.env && app.env.HOME) return app.env.HOME;
    }
    if (typeof process !== "undefined" && process.env && process.env.HOME) {
      return process.env.HOME;
    }
    // Last resort: hardcode. The caller can override DEST_DIR at the top of the file.
    return "/Users/alexandraszenti";
  }

  function fileExists(path) {
    // TODO(sdk): confirm. If the SDK doesn't expose fs, this returns false
    // and we just always overwrite — which is the default anyway.
    try {
      if (typeof app !== "undefined" && app.fs && typeof app.fs.exists === "function") {
        return !!app.fs.exists(path);
      }
    } catch (_) {}
    return false;
  }

  function slugify(s) {
    return String(s)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "untitled";
  }

  function basename(p) {
    const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
    return i >= 0 ? p.slice(i + 1) : p;
  }

  function stripExt(name) {
    const i = name.lastIndexOf(".");
    return i > 0 ? name.slice(0, i) : name;
  }

  function errorMessage(err) {
    if (!err) return "unknown error";
    if (typeof err === "string") return err;
    return err.message || String(err);
  }

  function looksLikePermissionError(msg) {
    return /permission|denied|eacces|not permitted|cannot open .* for writing/i.test(
      msg || ""
    );
  }

  function isLikelyApiMismatch(err) {
    const m = errorMessage(err);
    return /is not a function|unknown option|undefined is not|no such method/i.test(m);
  }

  function log(line) {
    // TODO(sdk): if the MCP captures stdout, console.log is fine.
    // Otherwise the SDK may expose app.log() — swap in here.
    if (typeof console !== "undefined" && console.log) console.log(line);
  }
})();
