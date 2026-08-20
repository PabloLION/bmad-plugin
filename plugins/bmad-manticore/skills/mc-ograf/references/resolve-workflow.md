# Using an OGraf graphic in DaVinci Resolve 21 / Fusion

OGraf HTML graphics and Lottie are native in **Resolve 21+** (not 20.x). Resolve drives OGraf in **non-real-time** mode — it renders frame-by-frame via `goToTime`, so the graphic must declare `supportsNonRealTime: true` and implement `goToTime` (the scaffold does). The message *"Resolve and Fusion currently only support non-real time OGraf files"* is informational, not an error.

## Import (Edit/Cut page)

1. Keep the package **folder** intact — `*.ograf.json` + the `.mjs` + any assets together. The manifest loads its `main` and assets relative to itself.
2. Drag the **`*.ograf.json`** into the Media Pool **from inside that folder** (so Resolve resolves the siblings). It appears as a clip with alpha.
3. Drop the clip on a track above your footage. Transparency composites automatically — no matte.
4. Select the clip and edit the schema fields in the **Inspector** (Title, Subtitle, etc. — whatever the manifest `schema` exposes).

## Fusion

Use the **OGrafLoader** node (added in 21) and point it at the manifest to bring the graphic into the node graph.

## Black-screen troubleshooting

A black clip has no error dialog, so check these in order:

1. **Imported only the `.json`?** That orphans it from its `.mjs`/assets. Re-import the `.json` from inside the intact folder.
2. **The `.mjs` calls `customElements.define()`?** Remove it. Resolve registers the class; self-registration throws *"this constructor has already been used with this registry"* → load fails, **no Inspector fields appear** (this is the tell: no fields = didn't load).
3. **No Inspector fields at all?** The graphic didn't load (see #1/#2) or the manifest `schema` is empty/malformed.
4. **Loads but renders blank?** An asset/font load threw (wrap in `try/catch`), or the graphic sized itself to the host's `clientHeight` which was `0` (fill the host instead).
5. **Still the old broken render after a fix?** Resolve **caches** the clip — delete it from the Media Pool (and timeline) and re-import.
6. Confirm Resolve is **21.0+**.

Run `uv run scripts/verify_ograf.py <package-dir>` first — it reproduces #2 and #4 headlessly before you ever open Resolve.

## Previewing locally before Resolve

Serve the folder and open `preview.html` over HTTP — `python3 -m http.server` in the package folder, then open `localhost:<port>/preview.html`. **Never double-click `preview.html` (`file://`)**: the browser blocks its ES-module import and inlined data-URL assets, so the graphic silently fails while the controls/checkerboard still show ("Some content has been disabled"). This is a browser preview limit only; Resolve's renderer is unaffected.
