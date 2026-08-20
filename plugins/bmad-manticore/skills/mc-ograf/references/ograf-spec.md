# OGraf v1 — manifest + Web Component contract

The authoring contract for an [OGraf v1](https://ograf.ebu.io/v1/specification/docs/Specification.html) graphic. The scaffold script emits a correct skeleton; consult this when editing the manifest or the `.mjs` by hand.

## Package = folder

A graphic is a folder whose entrypoint is the manifest; everything else is referenced **relative to the manifest's location**:

```
my-graphic/
  my-graphic.ograf.json   # manifest (filename MUST end .ograf.json)
  my-graphic.mjs          # the manifest's "main"
  preview.html            # local harness (not part of the spec)
  assets/                 # optional: fonts, images (or inline them)
```

There is no `.ograf` zip container in v1 — it's a plain folder. Multiple `*.ograf.json` files in one folder = multiple independent graphics.

## Manifest fields

Required: `$schema`, `id` (unique, **no forward slashes**), `name`, `main` (path to the JS), `supportsRealTime`, `supportsNonRealTime`.

Common: `version`, `description`, `author` ({`name` required, `email`/`url` optional}), `schema`, `actionDurations`, `stepCount` (default 1).

- **`schema`** — JSON Schema describing the data model for `load()` and `updateAction()`. Each property is one operator-editable field; give it a `title` and `default`. This is the config surface a renderer exposes as Inspector controls. Keep it tight.
- **`actionDurations`** — entries key on **`type`** (`playAction` | `updateAction` | `stopAction` | `customAction`), each with a `duration` in ms. (Keying on `id` is wrong and silently breaks timing.) A `customAction` entry also carries `customActionId`.
- Vendor-specific fields use a `v_` prefix.

## Web Component class

The `main` file's default export is a class that `extends HTMLElement`. **Do not call `customElements.define()`** — the renderer registers the class, and a class binds to only one tag name; self-registering makes the renderer's `define()` throw and the graphic fails to load.

```js
class Graphic extends HTMLElement { /* methods below */ }
export default Graphic;   // export only
```

All action methods are `async` and return `Promise<ReturnPayload | undefined>`.

### Required (all graphics)

| Method | Params | Purpose |
| --- | --- | --- |
| `load` | `{ data, renderType, renderCharacteristics }` | Init; resolve when ready for actions. `data` conforms to manifest `schema`. `renderType` is `"realtime"` or non-real-time. |
| `dispose` | `{ ... }` | Cleanup. |
| `playAction` | `{ goto, delta, skipAnimation }` | Advance/play; returns `{ currentStep }`. |
| `stopAction` | `{ skipAnimation }` | End display (play out). |
| `updateAction` | `{ data, skipAnimation }` | Merge new `data`, re-render. |
| `customAction` | `{ id, payload, skipAnimation }` | Invoke a manifest-declared custom action. |

### Required additionally for non-real-time

Declare `supportsNonRealTime: true` and implement:

| Method | Params | Purpose |
| --- | --- | --- |
| `goToTime` | `{ timestamp }` | Render the exact frame at `timestamp` (ms). This is how offline renderers (Resolve) draw every frame. |
| `setActionsSchedule` | `{ schedule }` | Queue timed actions (may be a no-op for a self-contained baked timeline). |

## The determinism rule

Real-time playout drives in/out via `playAction`/`stopAction`; offline render draws each frame via `goToTime`. To satisfy both, derive **all** visual state from a single pure `render(tMs)` and call it from `goToTime`. Use `requestAnimationFrame` only to animate the real-time `playAction`/`stopAction` — never for the core animation, because an offline renderer never runs that loop.

## Transparency & sizing

- No background on the host element or page — paint only the graphic. Alpha is preserved by the renderer.
- The renderer sizes the host to the output canvas. Fill it (`:host{position:absolute;inset:0}`). Never read `clientHeight` and scale by it — it can be `0` offline and collapse the graphic to nothing.

## Asset loading

Inline small assets (logo SVG as markup; font as a bundled file or base64) for a self-contained package. Wrap every external load (`FontFace`, `new URL(..., import.meta.url)`, image fetch) in `try/catch` with a fallback — an unguarded throw during `load()` blanks the graphic.
