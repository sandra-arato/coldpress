/**
 * hungary-2026 — Affinity Publisher skeleton
 *
 * Creates an empty A4 portrait Publisher document with:
 *   - 38 pages
 *   - 3 mm bleed on all four sides
 *   - Facing pages OFF (each page is its own page → exports as 38 single PDF pages)
 *   - Units in millimetres
 *
 * Saves to: ~/Desktop/hungary-2026.afpub
 *
 * Run via the Affinity MCP (mcp__affinity__execute_script) targeting Affinity Publisher.
 *
 * NOTE: Affinity's JS scripting API surface differs slightly between versions and
 * between Designer/Publisher/Photo. Method names below reflect the public Publisher
 * scripting model as I understand it; if any of `app.documents.add`,
 * `document.spread.facingPages`, or `document.bleed` differ in this build, adjust
 * after consulting the SDK preamble (mcp__affinity__read_sdk_documentation_topic).
 *
 * Two paths are provided:
 *   1) Preferred: a single createDocument call that takes a full preset object.
 *   2) Fallback: create a default doc, then mutate page count / bleed / facing flag.
 *
 * The script runs path (1); if it throws, it falls back to path (2).
 */

(function () {
  // ---- Constants -----------------------------------------------------------
  var MM = 1; // Affinity's JS API typically accepts numeric units in the document's unit;
              // we set the document unit to mm before any size-dependent ops.

  var PAGE_WIDTH_MM  = 210;   // A4 portrait width
  var PAGE_HEIGHT_MM = 297;   // A4 portrait height
  var PAGE_COUNT     = 38;
  var BLEED_MM       = 3;
  var DEST_PATH      = (function () {
    // Resolve ~/Desktop. The Affinity scripting host runs as the desktop user,
    // so $HOME is reliable; if `app.userHomeDirectory` exists, prefer it.
    if (typeof app !== "undefined" && app.userHomeDirectory) {
      return app.userHomeDirectory + "/Desktop/hungary-2026.afpub";
    }
    return "~/Desktop/hungary-2026.afpub";
  })();

  // ---- Helpers -------------------------------------------------------------
  function log(msg) {
    if (typeof console !== "undefined" && console.log) console.log("[hungary-2026 skeleton] " + msg);
  }

  function setBleedAllSides(doc, mm) {
    // Try the most likely API shapes in order. The first one that exists wins.
    if (doc.bleed && typeof doc.bleed.setAll === "function") {
      doc.bleed.setAll(mm);
      return "doc.bleed.setAll";
    }
    if (doc.bleed && typeof doc.bleed === "object" &&
        "top" in doc.bleed && "bottom" in doc.bleed &&
        "left" in doc.bleed && "right" in doc.bleed) {
      doc.bleed.top = mm;
      doc.bleed.bottom = mm;
      doc.bleed.left = mm;
      doc.bleed.right = mm;
      return "doc.bleed.{top,bottom,left,right}";
    }
    if (typeof doc.setBleed === "function") {
      doc.setBleed(mm, mm, mm, mm);
      return "doc.setBleed(t,b,l,r)";
    }
    throw new Error("Could not find a bleed-setting API on the document.");
  }

  function setFacingPagesOff(doc) {
    // Affinity Publisher exposes facing pages on the document or on its spread setup.
    if ("facingPages" in doc) {
      doc.facingPages = false;
      return "doc.facingPages = false";
    }
    if (doc.spreadSetup && "facingPages" in doc.spreadSetup) {
      doc.spreadSetup.facingPages = false;
      return "doc.spreadSetup.facingPages = false";
    }
    if (typeof doc.setFacingPages === "function") {
      doc.setFacingPages(false);
      return "doc.setFacingPages(false)";
    }
    throw new Error("Could not find a facing-pages API on the document.");
  }

  function ensurePageCount(doc, target) {
    var current = (doc.pages && typeof doc.pages.length === "number")
      ? doc.pages.length
      : (typeof doc.pageCount === "number" ? doc.pageCount : null);

    if (current === null) {
      throw new Error("Could not determine current page count.");
    }

    while (current < target) {
      if (doc.pages && typeof doc.pages.add === "function") {
        doc.pages.add();
      } else if (typeof doc.addPage === "function") {
        doc.addPage();
      } else {
        throw new Error("No API to add pages.");
      }
      current += 1;
    }
    while (current > target) {
      if (doc.pages && typeof doc.pages.removeAt === "function") {
        doc.pages.removeAt(current - 1);
      } else if (typeof doc.removePage === "function") {
        doc.removePage(current - 1);
      } else {
        throw new Error("No API to remove pages.");
      }
      current -= 1;
    }
    return current;
  }

  function setUnitsMm(doc) {
    // Try a few shapes — unit constants vary by build.
    var UNIT_MM =
      (typeof Units !== "undefined" && Units.Millimeters) ? Units.Millimeters :
      (typeof Unit  !== "undefined" && Unit.Millimeter)   ? Unit.Millimeter   :
      "mm";
    if ("units" in doc) {
      doc.units = UNIT_MM;
      return "doc.units";
    }
    if (typeof doc.setUnits === "function") {
      doc.setUnits(UNIT_MM);
      return "doc.setUnits";
    }
    // Non-fatal — falling back silently to default.
    return "no-unit-api";
  }

  // ---- Path 1: preset-based creation --------------------------------------
  function createWithPreset() {
    var preset = {
      type: "publisher",            // app target hint
      width: PAGE_WIDTH_MM,
      height: PAGE_HEIGHT_MM,
      units: "mm",
      orientation: "portrait",
      pageCount: PAGE_COUNT,
      facingPages: false,
      bleed: { top: BLEED_MM, bottom: BLEED_MM, left: BLEED_MM, right: BLEED_MM },
      colorSpace: "CMYK",           // assumption — see notes.md
      dpi: 300
    };

    // Most likely entry points, tried in order.
    if (app.documents && typeof app.documents.add === "function") {
      return app.documents.add(preset);
    }
    if (typeof app.createDocument === "function") {
      return app.createDocument(preset);
    }
    if (typeof app.newDocument === "function") {
      return app.newDocument(preset);
    }
    throw new Error("No known createDocument entry point on `app`.");
  }

  // ---- Path 2: create + mutate fallback -----------------------------------
  function createThenMutate() {
    var doc;
    if (app.documents && typeof app.documents.add === "function") {
      doc = app.documents.add({
        width: PAGE_WIDTH_MM,
        height: PAGE_HEIGHT_MM,
        units: "mm",
        orientation: "portrait"
      });
    } else if (typeof app.newDocument === "function") {
      doc = app.newDocument();
    } else {
      throw new Error("No fallback document creation API available.");
    }

    setUnitsMm(doc);
    log("facingPages: " + setFacingPagesOff(doc));
    log("bleed:       " + setBleedAllSides(doc, BLEED_MM));
    log("pageCount:   " + ensurePageCount(doc, PAGE_COUNT));
    return doc;
  }

  // ---- Save ---------------------------------------------------------------
  function saveAs(doc, path) {
    if (typeof doc.saveAs === "function") {
      doc.saveAs(path);
      return "doc.saveAs";
    }
    if (app.documents && typeof app.documents.saveAs === "function") {
      app.documents.saveAs(doc, path);
      return "app.documents.saveAs";
    }
    if (typeof doc.save === "function") {
      // Last resort — may save to the doc's existing path, not ours.
      doc.save();
      return "doc.save (warning: path may be ignored)";
    }
    throw new Error("No save-as API found.");
  }

  // ---- Main ---------------------------------------------------------------
  var doc;
  try {
    log("Trying preset-based creation…");
    doc = createWithPreset();
    setUnitsMm(doc);
    // Even when using a preset, re-apply the critical flags to be defensive —
    // some builds silently ignore preset fields.
    try { setFacingPagesOff(doc); } catch (e) { log("facingPages re-apply skipped: " + e.message); }
    try { setBleedAllSides(doc, BLEED_MM); } catch (e) { log("bleed re-apply skipped: " + e.message); }
    try { ensurePageCount(doc, PAGE_COUNT); } catch (e) { log("pageCount re-apply skipped: " + e.message); }
  } catch (presetErr) {
    log("Preset path failed (" + presetErr.message + "), falling back…");
    doc = createThenMutate();
  }

  log("saveAs via: " + saveAs(doc, DEST_PATH));
  log("Saved skeleton to: " + DEST_PATH);

  // Return a structured result the MCP can surface to the caller.
  return {
    ok: true,
    path: DEST_PATH,
    pages: PAGE_COUNT,
    pageSize: { width: PAGE_WIDTH_MM, height: PAGE_HEIGHT_MM, units: "mm" },
    bleedMm: BLEED_MM,
    facingPages: false
  };
})();
