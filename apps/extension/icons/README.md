# BrainForge Extension Icons

This directory should contain PNG icons for the extension.

Required sizes:
- icon-16.png (16x16 pixels) - Browser toolbar
- icon-48.png (48x48 pixels) - Extension management page
- icon-128.png (128x128 pixels) - Chrome Web Store

## Creating Icons

You can create simple icons using:

1. **GIMP or Photoshop** - Create a design and export to PNG
2. **Online tools** - Use Figma, Canva, or icon.kitchen
3. **Simple approach** - Use Python/ImageMagick to generate:

```bash
# Using ImageMagick (if installed):
convert -size 16x16 xc:white -pointsize 12 -fill "#667eea" -gravity center -annotate 0 "🧠" icon-16.png
convert -size 48x48 xc:white -pointsize 36 -fill "#667eea" -gravity center -annotate 0 "🧠" icon-48.png
convert -size 128x128 xc:white -pointsize 96 -fill "#667eea" -gravity center -annotate 0 "🧠" icon-128.png
```

Or use emoji as a quick placeholder.

For now, you can use emoji icons during development.
