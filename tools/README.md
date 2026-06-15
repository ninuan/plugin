# Quantumult X icon converter

Put source images in `mini/inbox/`, then run:

```sh
node tools/convert-quanx-icons.mjs
```

The converter writes Quantumult X-friendly PNG files to `mini/Alpha/` and updates
`mini/icon.json`.

Generated icons are:

- color-preserving foreground extracted from edge-connected background
- trimmed, then centered on a transparent canvas
- 144 x 144
- sRGB RGBA PNG
- PNG interlaced
- stripped of extra metadata
- JSON URLs escaped as `https:\/\/...\/mini\/Alpha\/icon.png`

Useful options:

```sh
node tools/convert-quanx-icons.mjs mini/inbox --no-bg
node tools/convert-quanx-icons.mjs mini/inbox --drop-white
node tools/convert-quanx-icons.mjs mini/inbox --no-trim
node tools/convert-quanx-icons.mjs mini/inbox --no-json
node tools/convert-quanx-icons.mjs mini/inbox --fuzz 25
node tools/convert-quanx-icons.mjs mini/inbox --size 108
node tools/convert-quanx-icons.mjs mini/inbox --base-url https://raw.githubusercontent.com/ninuan/plugin/main/mini/Alpha
```

Use the default mode for icons like `pangguai.png`, where inner white details
should stay visible. Use `--drop-white` only when the source image has a white
app-tile background that should be removed too.

If the source has a gradient or dark app-tile background, keep the default
`--fuzz 38`. Lower it if the foreground itself starts getting removed.
