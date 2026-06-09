# Quantumult X icon converter

Put source images in `mini/inbox/`, then run:

```sh
node tools/convert-quanx-icons.mjs
```

The converter writes Quantumult X-friendly PNG files to `mini/Alpha/` and updates
`mini/icon.json`.

Generated icons are:

- 144 x 144
- sRGB RGBA PNG
- PNG interlaced
- centered on a transparent canvas
- stripped of extra metadata

Useful options:

```sh
node tools/convert-quanx-icons.mjs mini/inbox --no-bg
node tools/convert-quanx-icons.mjs mini/inbox --no-json
node tools/convert-quanx-icons.mjs mini/inbox --size 108
node tools/convert-quanx-icons.mjs mini/inbox --base-url https://raw.githubusercontent.com/ninuan/plugin/main/mini/Alpha
```
