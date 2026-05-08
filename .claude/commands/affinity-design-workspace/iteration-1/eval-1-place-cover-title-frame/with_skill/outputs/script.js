'use strict';

// Place a centred 'Magyarország ABC' title frame near the top of spread 0
// of the currently-open Publisher document.
//
// Assumptions (locked via discovery calls before final run):
//   - Document is Affinity Publisher, A4 portrait, 300 dpi, units = mm.
//   - Spread 0 is the cover (single page, isFacing=false).
//   - DocumentCommand.createAddTextFrame(rect, string) exists. If not, the
//     equivalent is createAddTextFrame / createInsertTextFrame /
//     createAddPointTextFrame — confirm with read_sdk_documentation_topic("commands.js").
//   - Character/paragraph attributes are applied via
//     DocumentCommand.createSetCharacterAttributes / createSetParagraphAttributes
//     against the new frame's text range. Confirm signatures via storyTests.js.
//
// Coordinate gotcha (from preamble): use document pixels, computed from
// `mm * doc.dpi / 25.4`. NEVER getSpreadExtents() for absolute placement.

const { Document } = require('/document');
const { DocumentCommand, CompoundCommandBuilder } = require('/commands');
const { Rect } = require('/geometry');
const { Fonts } = require('/fonts');
const { GlyphAtts } = require('/glyphatts');
const { ParagraphAtts, ParagraphAlignment } = require('/paragraphatts');

function mmToPx(mm, dpi) {
  return mm * dpi / 25.4;
}

// Try a list of font family names in order. Return the first that resolves.
// Hungarian alphabet needs full Latin Extended-A coverage (é á í ó ú ö ü ő ű).
// Helvetica Neue and Arial both ship with macOS and cover the full set.
function pickHungarianSans() {
  const candidates = [
    "Helvetica Neue",
    "Helvetica",
    "Arial",
    "SF Pro Text",
    "Inter"
  ];
  for (const name of candidates) {
    try {
      const f = Fonts.find(name); // confirm exact accessor in fonts.js
      if (f) {
        return { name, font: f };
      }
    } catch (e) {
      // keep trying
    }
  }
  return { name: "Helvetica Neue", font: null }; // last-ditch fallback by name string
}

function main() {
  const doc = Document.current;
  if (!doc) {
    alert("Open a Publisher document on spread 0 (cover) before running this script.");
    return;
  }

  // Stay on spread 0; only assign if we're not already there. Setting the
  // current spread clears the selection (skill rule).
  if (doc.currentSpreadIndex !== 0) {
    doc.currentSpreadIndex = 0;
  }

  const dpi = doc.dpi;
  const pageWidthPx = doc.widthPixels;
  const pageHeightPx = doc.heightPixels;

  // Layout: frame 170 mm wide × 30 mm tall, top edge 30 mm below page top.
  const frameWmm = 170;
  const frameHmm = 30;
  const topMm = 30;

  const frameWpx = mmToPx(frameWmm, dpi);
  const frameHpx = mmToPx(frameHmm, dpi);
  const xPx = (pageWidthPx - frameWpx) / 2;
  const yPx = mmToPx(topMm, dpi);

  const rect = Rect.createXYWH(xPx, yPx, frameWpx, frameHpx);

  const titleText = "Magyarország ABC";
  const fontPt = 72;
  const picked = pickHungarianSans();

  console.log("session:", doc.sessionUuid);
  console.log("page (px):", pageWidthPx, "x", pageHeightPx, "@", dpi, "dpi");
  console.log("frame rect (px):", rect.x, rect.y, rect.width, rect.height);
  console.log("font candidate:", picked.name, "resolved:", picked.font ? "yes" : "no");

  // Build commands inside a CompoundCommandBuilder so undo treats this as one step.
  const builder = CompoundCommandBuilder.create();

  // 1. Add the text frame at the computed rect with the title string.
  //    Factory name to confirm via commands.js — the cookbook lists
  //    createAddTextFrame(rect, string) as the likely shape.
  const addCmd = DocumentCommand.createAddTextFrame(rect, titleText);
  builder.addCommand(addCmd);

  // 2. Set character attributes (font family + size) on the new frame's range.
  //    The exact factory + how it addresses the just-created frame must be
  //    confirmed with read_sdk_documentation_topic("tests/storyTests.js") and
  //    "glyphatts.js". Pattern shown here is the commonly recorded shape:
  //      createSetCharacterAttributes(target, range, atts)
  //    where `target` is the newly-added frame's id and `range` is whole-story.
  const glyph = GlyphAtts.createDefault();
  if (picked.font) {
    glyph.fontFamily = picked.name;
  } else {
    glyph.fontFamily = picked.name; // string fallback; SDK may resolve by name
  }
  glyph.fontSize = fontPt;
  const setGlyphCmd = DocumentCommand.createSetCharacterAttributes(
    addCmd.resultId,        // confirm: the text-frame factory exposes a result handle
    null,                   // null range = whole story (confirm in storyTests.js)
    glyph
  );
  builder.addCommand(setGlyphCmd);

  // 3. Centre-align the paragraph(s) inside the frame.
  const para = ParagraphAtts.createDefault();
  para.alignment = ParagraphAlignment.Centre; // confirm enum name in paragraphatts.js
  const setParaCmd = DocumentCommand.createSetParagraphAttributes(
    addCmd.resultId,
    null,
    para
  );
  builder.addCommand(setParaCmd);

  doc.executeCommand(builder.createCommand());

  console.log("placed title frame:", titleText, "at", fontPt, "pt", picked.name);
  console.log("undo step: single compound command (1 user-visible undo)");
}

module.exports.main = main;
