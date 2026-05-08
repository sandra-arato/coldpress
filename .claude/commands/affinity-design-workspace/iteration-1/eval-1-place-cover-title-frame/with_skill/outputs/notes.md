# Notes — uncertainties and what to confirm

These are the things I'm **not** certain about. None of them are bluffed —
each lists the topic file (or hint search) I would actually open to lock the
answer before running the script for real.

## SDK factory & module names

### 1. `DocumentCommand.createAddTextFrame(rect, string)`
- **Where it came from in my script:** the cookbook's recipe 3 lists this as
  the likely shape, but explicitly flags it as needing confirmation.
- **Confirm via:** `read_sdk_documentation_topic("commands.js")`, grep for
  `TextFrame`. Likely candidates if this exact name is wrong:
  `createAddTextFrame`, `createInsertTextFrame`, `createAddPointTextFrame`
  (point text vs frame text — I want frame text), `createAddArtisticText`
  (Designer-style, probably wrong for Publisher).
- **Cheaper first stop:** `search_sdk_hints("add text frame to spread with string content")`.

### 2. How the just-added frame is addressed by the next command
- **Where it came from:** I used `addCmd.resultId` as the target of
  `createSetCharacterAttributes` / `createSetParagraphAttributes`. The skill
  cookbook doesn't specify how Affinity's command builder exposes the result
  of a previous command — could be `.resultId`, `.resultNode`, `.id`, or
  there may be no result handle at all (in which case the new frame must be
  selected via `Selection` after the add command commits).
- **Confirm via:** `read_sdk_documentation_topic("tests/storyTests.js")` and
  `read_sdk_documentation_topic("tests/documentCommandTests.js")`. The tests
  show the canonical "add a frame, then style its text" pattern.
- **If `resultId` is wrong:** likely fix is to split into two `executeCommand`
  calls — first the add (which leaves the frame selected), then read
  `doc.selection` to get the new node, then a second compound for the
  attribute sets. The "wraps as one undo" property is lost; document that
  trade-off if so.

### 3. `DocumentCommand.createSetCharacterAttributes` / `createSetParagraphAttributes`
- **Confirm via:** `commands.js` (search `createSet`) + `glyphatts.js` /
  `paragraphatts.js`. The `null` range argument I used (whole-story shorthand)
  is also a guess — the real signature may require an explicit range built via
  a `Range` factory in `story.js`.

### 4. `GlyphAtts.createDefault()` and `GlyphAtts.fontFamily` / `.fontSize`
- **Confirm via:** `glyphatts.js`. The shape of `GlyphAtts` is not in the
  cookbook. Possible alternatives: a builder pattern (`GlyphAtts.builder()`),
  a struct literal (`{ fontFamily, fontSize }`), or named setters
  (`atts.setFontFamily("…")`).

### 5. `ParagraphAtts.createDefault()` and `ParagraphAlignment.Centre`
- **Confirm via:** `paragraphatts.js`. The enum could be:
  - `ParagraphAlignment.Centre` (UK spelling — Affinity is a UK product, so
    this is my best guess)
  - `ParagraphAlignment.Center` (US spelling)
  - A numeric constant
  - A string `"centre"` / `"center"`

### 6. `Fonts.find(name)`
- **Confirm via:** `read_sdk_documentation_topic("fonts.js")`. The accessor
  for "look up a font by family/PostScript name" is almost certainly
  documented there. It might be `Fonts.lookup`, `Fonts.byName`, `Fonts.find`,
  or require a more explicit `Fonts.findFamily(name).regular()` chain.
  Worst case: just set `glyph.fontFamily` to the string name and let the SDK
  resolve.

### 7. `doc.sessionUuid`
- **Where it came from:** the skill's "Visual verification" section says
  *"Get the `document_session_uuid` from the SDK (e.g. `Document.current.sessionUuid`
  — confirm the exact accessor by reading `document.js`)"*. So this is
  flagged as needing confirmation upstream too.
- **Confirm via:** `read_sdk_documentation_topic("document.js")`, grep
  `session` / `uuid`. Could also be `doc.uuid`, `doc.id`, or exposed as a
  property on `app` rather than `Document`.

## Layout uncertainties

### 8. "Near the top" — y = 30 mm
- **Choice:** 30 mm below the page's top trim. With a 30 mm-tall frame, the
  visual centre of the title sits at ~45 mm from the top (≈15 % of the page).
  That reads as "near the top" without being jammed against the bleed.
- **Alternatives considered:**
  - 20 mm (tighter to the top — riskier with a 3 mm bleed; only 17 mm of
    safe-area gap above the title).
  - 50 mm (more breathing room, but risks dropping into the upper-third
    sweet-spot rather than reading as "near the top").
- **Override mechanism:** if the user disagrees once they see the render,
  bump `topMm` and re-run.

### 9. Frame width — 170 mm
- **Choice:** 170 mm leaves 20 mm gutter each side on a 210 mm page.
- **Risk:** if the chosen font is wider than Helvetica Neue (e.g. Arial Black
  or a serif fallback), the title might wrap. The verification render is the
  catch — if it wraps, widen to 180 mm or step the size down to 64 pt.

### 10. "Centred" interpretation
- **Choice:** centred *both* on the page (frame x = `(pageW - frameW)/2`)
  *and* inside the frame (paragraph alignment = centre). Both feel
  necessary — the user said "centred text frame", which to me reads as both.
- **If only the frame should be page-centred and the text left-flushed inside:**
  drop the paragraph alignment command. Cheap to revise.

## Hungarian glyphs — am I sure about font coverage?

`Helvetica Neue` and `Arial` (both bundled with macOS for years) ship with
full Latin Extended-A coverage including `á é í ó ö ő ú ü ű`. I'm confident
on this without further confirmation; the verification render will catch any
substitution as boxes or `?` characters anyway. If both somehow fail, the
candidate list in the script falls through to `SF Pro Text` (also Apple-shipped,
also covers Hungarian) and `Inter` (open-source, broad coverage).

## Things I deliberately am NOT doing

- Not reading `nodes.js` (~176 KB) — too expensive and the text-frame add path
  goes through `commands.js`, not direct node manipulation.
- Not preloading `tests/useCases.js` — only fall back to it if the targeted
  topic files don't answer.
- Not writing a font into the document via the filesystem. The user said
  "Hungarian-friendly sans-serif" — I'm trusting the system fonts, not
  embedding a custom one.
- Not saving the document. The task is "place a frame and verify", not "ship".
