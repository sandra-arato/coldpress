// place-cover-title.js
// Affinity Publisher SDK script.
// Goal: on spread 0 of the active document, add a centred text frame near the
// top containing "Magyarország ABC" in a Hungarian-friendly sans-serif at ~72pt.
//
// IMPORTANT: SDK method names below are best-guess. They are isolated in helpers
// so they can be swapped quickly once the Affinity SDK reference is consulted.
// See notes.md for the list of guesses.

(function placeCoverTitle() {
    var TITLE = "Magyarország ABC"; // UTF-8; if SDK requires escapes, use "Magyarország ABC"
    var SIZE_PT = 72;
    var FONT_CANDIDATES = [
        "Inter",
        "Source Sans 3",
        "Source Sans Pro",
        "Helvetica Neue",
        "Arial"
    ];

    // ---------- 1. Resolve doc + spread ----------
    var doc = (typeof app !== "undefined" && app.activeDocument)
        ? app.activeDocument
        : null;
    if (!doc) {
        throw new Error("No active document. Open the cover document first.");
    }

    var spreads = doc.spreads || (doc.getSpreads && doc.getSpreads()) || [];
    if (!spreads || spreads.length === 0) {
        throw new Error("Document has no spreads.");
    }
    var spread = spreads[0];
    if (!spread) {
        throw new Error("Spread 0 not found.");
    }

    // ---------- 2. Page geometry ----------
    // Prefer first page of the spread if available, so we don't straddle a gutter.
    var page = (spread.pages && spread.pages.length > 0) ? spread.pages[0] : spread;
    var bounds = page.bounds || page.pageBounds || page.frame || null;
    if (!bounds) {
        throw new Error("Could not read page bounds on spread 0.");
    }
    var pageW = bounds.width  != null ? bounds.width  : (bounds.right - bounds.left);
    var pageH = bounds.height != null ? bounds.height : (bounds.bottom - bounds.top);
    var pageOriginX = bounds.left != null ? bounds.left : 0;
    var pageOriginY = bounds.top  != null ? bounds.top  : 0;

    // Frame rect: 80% wide, centred horizontally, top at 12% of page height.
    var frameW = pageW * 0.80;
    var frameH = 120; // generous so 72pt caps + descenders aren't clipped
    var frameX = pageOriginX + (pageW - frameW) / 2;
    var frameY = pageOriginY + pageH * 0.12;

    // ---------- 3. Pick a font ----------
    function pickFont(candidates) {
        var installed = null;
        try {
            installed = (app.fonts && app.fonts.list && app.fonts.list()) ||
                        (app.getInstalledFonts && app.getInstalledFonts()) ||
                        null;
        } catch (e) {
            installed = null;
        }
        if (!installed) {
            // Can't probe — return first candidate and let the SDK fall back.
            return { name: candidates[0], probed: false };
        }
        var set = {};
        for (var i = 0; i < installed.length; i++) {
            var n = (typeof installed[i] === "string") ? installed[i] : installed[i].family;
            if (n) set[n.toLowerCase()] = true;
        }
        for (var j = 0; j < candidates.length; j++) {
            if (set[candidates[j].toLowerCase()]) {
                return { name: candidates[j], probed: true };
            }
        }
        return { name: candidates[candidates.length - 1], probed: true, fallback: true };
    }
    var picked = pickFont(FONT_CANDIDATES);

    // ---------- 4. Create text frame ----------
    // Best-guess SDK calls. Replace with real ones after consulting docs.
    function addTextFrame(targetPage, rect) {
        if (targetPage.addTextFrame)   return targetPage.addTextFrame(rect);
        if (targetPage.createTextFrame) return targetPage.createTextFrame(rect);
        if (doc.addTextFrame)          return doc.addTextFrame(targetPage, rect);
        throw new Error("No known addTextFrame method on page/document.");
    }
    var rect = { x: frameX, y: frameY, width: frameW, height: frameH };
    var frame = addTextFrame(page, rect);
    if (!frame) throw new Error("Text frame creation returned null.");

    // ---------- 5. Set text + style ----------
    function setText(f, t)        { if ("text" in f) f.text = t; else if (f.setText) f.setText(t); else throw new Error("No way to set text on frame."); }
    function setFont(f, name)     { if (f.font !== undefined) f.font = name; else if (f.setFont) f.setFont(name); else if (f.style) f.style.font = name; }
    function setSize(f, ptSize)   { if (f.fontSize !== undefined) f.fontSize = ptSize; else if (f.setFontSize) f.setFontSize(ptSize); else if (f.style) f.style.fontSize = ptSize; }
    function setAlignCentre(f)    {
        if (f.paragraphAlignment !== undefined) { f.paragraphAlignment = "center"; return; }
        if (f.alignment !== undefined)          { f.alignment = "center"; return; }
        if (f.setAlignment)                     { f.setAlignment("center"); return; }
        if (f.style)                            { f.style.alignment = "center"; }
    }

    setText(frame, TITLE);
    setFont(frame, picked.name);
    setSize(frame, SIZE_PT);
    setAlignCentre(frame);

    // ---------- 6. Return summary for verification ----------
    var summary = {
        ok: true,
        spreadIndex: 0,
        page: { width: pageW, height: pageH, originX: pageOriginX, originY: pageOriginY },
        frame: {
            id: frame.id || frame.uid || null,
            rect: rect,
            text: TITLE,
            font: picked.name,
            fontProbed: picked.probed,
            fontFallback: !!picked.fallback,
            size: SIZE_PT,
            alignment: "center"
        }
    };
    if (typeof console !== "undefined" && console.log) {
        console.log("placeCoverTitle: " + JSON.stringify(summary));
    }
    return summary;
})();
