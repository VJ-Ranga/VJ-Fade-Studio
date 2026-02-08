# VJ Fade Studio

VJ Fade Studio is a lightweight, client-side editor to create WooCommerce-style hero images with smooth fades.

I built this for fun because I needed to create many banner and hero visuals for product pages. It helped my workflow, so I am sharing it publicly as a fully open-source project.

## Features

- Custom canvas size with common presets (`1918×666`, `1080×1080`, `1080×1350`, `1080×1920`, `1200×628`, `1920×1080`)
- Multi-image workflow: upload multiple images, select each layer, and edit individually
- Move, resize (corner handles), and scale selected image
- Per-image fade settings:
  - `None`, `Linear`, `Radial`, `Brush`
  - Direction support: left, right, top, bottom, both-x, both-y
  - Transparent fade or Color fade
- Brush fade tools:
  - Brush size, softness, strength
  - Brush shape: round / square
  - Eraser + clear brush
  - `Shift + Drag` while brushing to move image
- Color controls with both picker and HEX inputs
- Canvas rulers (top + left) for position awareness
- Export as PNG or JPG with custom file name
- Built-in keyboard shortcuts popup
- 100% browser-based (no uploads, no server processing)

## Keyboard Shortcuts

- `Delete` / `Backspace` - remove selected image
- `Ctrl/Cmd + D` - duplicate selected image
- `Ctrl/Cmd + ]` - bring forward
- `Ctrl/Cmd + Shift + ]` - bring to front
- `Ctrl/Cmd + [` - send backward
- `Ctrl/Cmd + Shift + [` - send to back
- `Ctrl/Cmd + 0` - fit selected image to canvas
- `Ctrl/Cmd + +` - scale up selected image
- `Ctrl/Cmd + -` - scale down selected image
- `Arrow Keys` - move selected image by 1px
- `Shift + Arrow` - move selected image by 10px
- `E` - toggle brush eraser (when Brush fade is active)
- `[` / `]` - brush size down / up
- `Shift + [` / `Shift + ]` - brush softness down / up
- `?` or `Ctrl/Cmd + /` - open/close shortcuts popup

## Privacy

- Images are processed locally in your browser
- No cloud upload, no server-side storage

## Run Locally

Open `index.html` in your browser.

No build setup is required.

## Project Files

- `index.html` - app layout and UI
- `styles.css` - design system and responsive styling
- `app.js` - canvas engine, layer editing, fades, brush, shortcuts, export
- `vendor/jszip.min.js` - local dependency file bundled for offline use

## Notes

- In Brush fade mode, normal drag paints on the selected image.
- Hold `Shift` while dragging in Brush mode to move the image instead of painting.

## License

MIT License. See `LICENSE` for details.
