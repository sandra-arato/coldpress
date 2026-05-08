'use strict';

// Create a 38-page A4 portrait Affinity Publisher document with 3 mm bleed
// on all sides, where each page is its own spread (so each page exports as
// its own PDF page), and save it to the user's Desktop as
// `hungary-2026.afpub`.
//
// Source: ./references/cookbook.md §1 (P8 activity-book skill).
// Verify after running with mcp__affinity__render_spread on spread 0 and 37.

const { Document, NewDocumentOptions } = require('/document');
const { UnitType } = require('/units');
const { RasterFormat } = require('/rasterobject');
const { app } = require('/application');

function mmToPx(mm, dpi) {
  return mm * dpi / 25.4;
}

function main() {
  // --- spec ---------------------------------------------------------------
  const dpi       = 300;
  const widthMm   = 210;   // A4 portrait
  const heightMm  = 297;
  const pageCount = 38;
  const bleedMm   = 3;
  const fileName  = 'hungary-2026.afpub';
  // -----------------------------------------------------------------------

  const opts = NewDocumentOptions.createDefault();

  // Units & resolution
  opts.units   = UnitType.Millimetre;
  opts.dpi     = dpi;
  opts.viewDpi = dpi;

  // Page size — width/height are in PIXELS even though units = mm.
  // Skipping mmToPx here yields a 210 px × 297 px doc, not A4.
  opts.width       = mmToPx(widthMm, dpi);
  opts.height      = mmToPx(heightMm, dpi);
  opts.isLandscape = false;

  // Multi-page, one page per spread (so pageCount === spreadCount and
  // each page exports as its own PDF page).
  opts.isMultiPage = true;
  opts.isFacing    = false;
  opts.pageCount   = pageCount;

  // 3 mm bleed on all sides; bleed is in document units (mm).
  opts.bleed = { left: bleedMm, top: bleedMm, right: bleedMm, bottom: bleedMm };

  // Skeleton only — no master pages, no margins, no Designer artboard.
  opts.rasterFormat    = RasterFormat.RGBA8;
  opts.marginsEnabled  = false;
  opts.createMaster    = false;
  opts.createArtboard  = false;

  const doc = Document.create(opts);
  if (!doc) {
    alert('Failed to create document. Check Affinity scripting permissions.');
    return;
  }

  // Filesystem access is Desktop-only via app.getUserDesktopPath.
  // If the user has filesystem scripting disabled this will throw NOT_ALLOWED.
  const path = app.getUserDesktopPath + '/' + fileName;
  doc.saveAs(path);

  // execute_script swallows return values; log everything we'll need to
  // verify, including the session UUID so render_spread can target this doc.
  console.log('created Publisher doc');
  console.log('  path:         ', path);
  console.log('  pageCount:    ', doc.pageCount);
  console.log('  spreadCount:  ', doc.spreadCount);
  console.log('  widthPixels:  ', doc.widthPixels);
  console.log('  heightPixels: ', doc.heightPixels);
  console.log('  dpi:          ', doc.dpi);
  console.log('  sessionUuid:  ', doc.sessionUuid);
}

module.exports.main = main;
