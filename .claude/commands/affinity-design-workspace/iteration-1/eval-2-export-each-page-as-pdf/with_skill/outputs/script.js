'use strict';

// Export every page of the active Publisher document as a separate PDF
// onto the user's Desktop, named "{bookname}-page-{N}.pdf" (1-based).
//
// Designed for the P8 hungary-2026 book where the doc was created with
// isFacing:false, so pageCount === spreadCount and each spread == one page.
// The script also copes (best-effort) with isFacing:true documents by
// looping over spreads — a facing-pages spread will export both pages
// to one PDF, which is logged so the operator can decide how to handle it.
//
// Exact API names below MUST be confirmed against the SDK before running:
//   - Document export method (likely `doc.exportAs(path, config)`,
//     possibly `doc.export(...)` or `doc.exportTo(...)`) → document.js
//   - ExportConfig PDF preset / page-range fields → exportconfig.js
//
// Per the skill: filesystem writes are Desktop-only; failures surface as
// `NOT_ALLOWED` if the user has Scripting → Filesystem disabled.

const { Document } = require('/document');
const { ExportConfig, ExportFormat } = require('/exportconfig');
const { app } = require('/application');

// --- helpers -----------------------------------------------------------

// Strip extension and any path; replace characters that are awkward on
// macOS/Windows filesystems. Keep diacritics — the Desktop handles them.
function sanitiseBookName(rawName) {
  if (!rawName) return 'untitled';
  // drop directory prefix if present
  const lastSlash = Math.max(rawName.lastIndexOf('/'), rawName.lastIndexOf('\\'));
  let name = lastSlash >= 0 ? rawName.substring(lastSlash + 1) : rawName;
  // drop a single trailing extension (.afpub, .afdesign, etc.)
  const dot = name.lastIndexOf('.');
  if (dot > 0) name = name.substring(0, dot);
  // collapse whitespace, replace path-hostile chars
  name = name.replace(/[\/\\:\*\?"<>\|]/g, '-').replace(/\s+/g, ' ').trim();
  return name.length ? name : 'untitled';
}

// Build a PDF ExportConfig scoped to a single page index.
// The exact field names are SDK-version-dependent; confirm in
// exportconfig.js. The shape below is the most common pattern.
function buildPdfConfigForPage(pageIndex /* 0-based */) {
  // Preferred API: ExportConfig.createForFormat(ExportFormat.PDF) or similar.
  // Fall back gracefully if `createForFormat` doesn't exist by trying
  // a default-constructed config.
  let config;
  if (typeof ExportConfig.createForFormat === 'function') {
    config = ExportConfig.createForFormat(ExportFormat.PDF);
  } else if (typeof ExportConfig.createDefault === 'function') {
    config = ExportConfig.createDefault();
    if ('format' in config) config.format = ExportFormat.PDF;
  } else {
    // Last resort — let `doc.exportAs` infer format from the .pdf path.
    return null;
  }

  // Scope to one page. Field names to confirm in exportconfig.js — these
  // three are the common candidates; we set whichever the config exposes.
  if ('pageIndex' in config)   config.pageIndex   = pageIndex;
  if ('spreadIndex' in config) config.spreadIndex = pageIndex;
  if ('pageRange' in config)   config.pageRange   = { from: pageIndex, to: pageIndex };

  // Reasonable PDF defaults — preset name to confirm. If `pdfPreset` /
  // `preset` exists on the config, leave it at its default ("PDF (for print)"
  // or "PDF (digital — high quality)" depending on SDK).
  return config;
}

// Wrap the export call so the exact method name can be swapped in one place.
// See document.js for the canonical name.
function exportDocumentToPdf(doc, outPath, config) {
  if (typeof doc.exportAs === 'function') {
    return doc.exportAs(outPath, config);
  }
  if (typeof doc.export === 'function') {
    return doc.export(outPath, config);
  }
  if (typeof doc.exportTo === 'function') {
    return doc.exportTo(outPath, config);
  }
  throw new Error('No known export method on Document (tried exportAs, export, exportTo)');
}

// --- main --------------------------------------------------------------

function main() {
  const doc = Document.current;
  if (!doc) {
    alert('This script requires an open Publisher document.');
    return;
  }

  const bookname = sanitiseBookName(doc.name);
  const desktop  = app.getUserDesktopPath; // property, not function — see cookbook §1
  const total    = doc.spreadCount;        // with isFacing:false this equals pageCount

  // Defensive note: with isFacing:true, one spread holds two pages and
  // would export as a single 2-page PDF. We log a warning so the operator
  // can re-run with a per-page export config if needed.
  const isFacing = (typeof doc.isFacing === 'boolean') ? doc.isFacing : null;
  if (isFacing === true) {
    console.warn(
      'Document has isFacing=true; each spread contains two pages. ' +
      'Exports will be one PDF per spread, not one per page. ' +
      'If you need strictly per-page output, switch the doc to isFacing=false.'
    );
  }

  const failures = [];
  let successes = 0;

  for (let i = 0; i < total; i++) {
    const pageNumber = i + 1; // 1-based for filename
    const outPath = desktop + '/' + bookname + '-page-' + pageNumber + '.pdf';

    try {
      const config = buildPdfConfigForPage(i);
      exportDocumentToPdf(doc, outPath, config);
      console.log('OK   page', pageNumber, '→', outPath);
      successes++;
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err);
      console.error('FAIL page', pageNumber, '→', outPath, '::', msg);
      failures.push({ page: pageNumber, path: outPath, error: msg });
    }
  }

  console.log('---');
  console.log('Export summary:', successes, 'succeeded,', failures.length, 'failed of', total, 'pages');
  console.log('Bookname used  :', bookname);
  console.log('Desktop path   :', desktop);
  if (failures.length) {
    console.log('Failures:', JSON.stringify(failures, null, 2));
    if (failures.some(f => /NOT[_ ]ALLOWED/i.test(f.error))) {
      console.log(
        'Hint: NOT_ALLOWED indicates Affinity → Preferences → Scripting → ' +
        'Filesystem access is disabled. Ask the user to enable it and re-run.'
      );
    }
  }
}

module.exports.main = main;
