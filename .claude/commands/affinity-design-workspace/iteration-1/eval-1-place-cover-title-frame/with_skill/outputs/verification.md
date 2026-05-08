# Verification plan — cover title frame

The skill is unambiguous: a script can succeed silently while producing the
wrong layout. Treat the rendered JPEG as ground truth, not the script's
console output.

## Renders to run (in order)

### 1. `mcp__affinity__render_spread` — spread 0, full

```
render_spread({
  document_session_uuid: <uuid logged by the script>,
  spread_index: 0
})
```

This is the primary check. The whole cover spread comes back as a JPEG
(max 1024 px). Confirms what the user actually sees.

### 2. `mcp__affinity__render_selection` — only if the title frame can be
re-selected after creation

If the SDK leaves the new frame selected (or the script re-selects it before
exiting), call `render_selection` to get a tight crop of just the text. Useful
for inspecting glyph rendering of `á`, `é`, `ó` at full resolution without
the rest of the page rescaling them down.

If the frame isn't selected at render time, skip this — `render_spread` is
sufficient.

## Visual checklist (read against render #1)

Each item must pass. If any fail, refine the script and re-execute; do not
declare success on partial passes.

### Content
- [ ] Title text is exactly **`Magyarország ABC`** — no quoting, encoding, or
      typo issues.
- [ ] All four diacritics render as Hungarian glyphs, not as `?`, hollow
      boxes, or visibly substituted characters:
      - `á` (a-acute) in *Magy**á**rország*
      - `ó` (o-acute) in *Magyar**ó**rszag*
      - `á` again in *országb…* (no — only the two listed above)
      - Verify both `á` glyphs look identical (same font fell through to the
        same family for both).
- [ ] Capitalisation matches: capital `M`, capital `ABC`, rest lowercase.

### Position
- [ ] Frame is horizontally centred on the page. Eyeball: equal whitespace
      left and right of the frame, within a couple of pixels at render scale.
      Sanity-check against the script's logged x = `(pageWidth - frameWidth)/2`.
- [ ] Frame's top edge sits ~30 mm below the page's top trim — clearly below
      the bleed strip but well above the page's vertical midpoint.
- [ ] No part of the frame is clipped by the trim or pulled into the bleed.
- [ ] The text inside the frame is centred (not left-flushed). Equal whitespace
      to the left and right of the title within the frame.

### Typography
- [ ] Font is a **sans-serif**. No serifs visible on `M`, `g`, `r`. (If the
      glyphs look like Times / Georgia, font fallback failed.)
- [ ] Size is approximately **72 pt**. Cap height should read at roughly
      `72 * 25.4 / 72 ≈ 25.4 mm` ≈ 1 inch — visually large; the title should
      dominate the upper portion of the cover.
- [ ] No line wrap. The title fits on one line at 72 pt within the 170 mm
      frame width. (A4 is 210 mm wide; 170 mm leaves 20 mm margin each side.
      "Magyarország ABC" at 72 pt in Helvetica Neue is ~140 mm wide — should
      fit comfortably. If it wraps, the frame is too narrow or the font fell
      back to something wider; widen frame to 180 mm and re-run.)

### Document state
- [ ] Spread 0 is still the current spread.
- [ ] No other spreads were modified.
- [ ] Only one new node was added (the text frame). Nothing else (stray
      rectangles, duplicate frames) appeared.
- [ ] Undo, if performed, removes the entire title frame in a single step
      (compound command).

## What to inspect in the script's `console.log` output

Captured via the script's own `console.log` calls (since `execute_script`
swallows return values):

- `session:` — the `document_session_uuid` value passed to `render_spread`.
- `page (px):` — sanity-check that `widthPixels`/`heightPixels` correspond to
  A4 at 300 dpi (~2480 × 3508). If they're different, the document is not
  the assumed A4 spec; pause and confirm with the user before continuing.
- `frame rect (px):` — `(x, y, w, h)`. Cross-check:
  - `w` ≈ 2008 px (170 mm)
  - `h` ≈ 354 px (30 mm)
  - `x` ≈ 236 px (centred on a 2480 px page)
  - `y` ≈ 354 px (30 mm from top)
- `font candidate:` — which font the picker resolved.
  - Best: `Helvetica Neue resolved: yes`.
  - Acceptable: `Arial resolved: yes` or any other listed candidate.
  - Bad: all fall through and the SDK lands on a default that doesn't cover
    Hungarian glyphs. If this happens, the render will show `?` boxes for
    the diacritics — re-run with a different candidate list.
- `placed title frame: Magyarország ABC at 72 pt <font name>` — final
  confirmation.

## Failure modes & responses

| Symptom on render | Likely cause | Fix |
|---|---|---|
| Diacritics show as `?` or `□` | Font lacks Latin Extended-A, or fontFamily not applied | Try next candidate in the list; or read `fonts.js` to confirm `Fonts.find` accessor and resubmit |
| Title left-aligned in frame | `ParagraphAlignment.Centre` enum name wrong | Read `paragraphatts.js`; the enum may be `kCentre`, `Centre`, `Center`, or numeric |
| Whole frame in wrong position | Coordinates ~12× too large or too small | Re-confirm: did you use `getSpreadExtents()` accidentally? Use `doc.widthPixels` only |
| Nothing visible after script | Forgot `executeCommand`, or `createAddTextFrame` factory name wrong | Read `commands.js`, grep for `TextFrame`; rerun |
| Selection cleared mid-script and font not applied | Set `currentSpreadIndex` when already 0 | The script guards against this; if it still happens, the createAdd factory may be re-pointing the spread |
| `NOT_ALLOWED` | Affinity Scripting permission missing (unlikely for in-doc edits, but possible if filesystem-related calls slip in) | Confirm with user that scripting is enabled |

## Definition of done

All checklist items pass on render #1. Console logs match expected ranges.
No further action needed beyond optional `add_sdk_hint` recording the exact
factory names that worked.
