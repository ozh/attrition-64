#!/usr/bin/env python3
"""Regenerate the favicons and the social share image from one source picture.

    python3 tools/gen-icons.py [source.jpg]

Source is a square screenshot of level one. Everything else is derived, so the
committed PNGs are reproducible rather than one-off exports nobody can redo.

Two deliberate choices:

* The full frame is kept rather than cropping to the lungs. At 16px the lungs
  are mush either way, but the cigarette survives as a coloured bar, and the
  paddle-versus-target pairing is the whole idea.
* Downscaling uses LANCZOS, not NEAREST. Nearest is right for *upscaling* pixel
  art, but downscaling a fine grid with it drops whole rows of blocks and the
  silhouette falls apart. Averaging keeps the shape legible.
* PNGs are palette-quantised with FASTOCTREE. The JPEG source carries ~11,000
  distinct colours, almost all of it compression noise, which defeats PNG
  compression: the share image is 231 KB as RGB and 35 KB quantised. FASTOCTREE
  specifically, because MEDIANCUT allocates its palette by frequency and so
  discards the handful of red explosive cores and blue powerup blocks entirely
  — the two things in the picture that are not white or black.
"""

import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Pictures/attrition64.jpg'
ICONS = ROOT / 'assets/icons'

# Matches the level background, so the image has no visible edge on dark pages.
BACKGROUND = (17, 15, 0)
PALETTE_COLOURS = 256

FAVICON_SIZES = [16, 32, 48]
PNG_ICONS = {'icon-192.png': 192, 'icon-512.png': 512, 'apple-touch-icon.png': 180}
OG_SIZE = (1200, 630)


def main() -> None:
    if not SOURCE.exists():
        sys.exit(f'source image not found: {SOURCE}')

    art = Image.open(SOURCE).convert('RGB')
    if art.width != art.height:
        print(f'warning: source is {art.width}x{art.height}, not square', file=sys.stderr)

    ICONS.mkdir(parents=True, exist_ok=True)

    # A multi-size .ico so browsers pick the resolution they want. Pillow builds
    # every size from the image it is handed, so hand it the largest.
    ico = ICONS / 'favicon.ico'
    art.resize((256, 256), Image.LANCZOS).save(
        ico, format='ICO', sizes=[(s, s) for s in FAVICON_SIZES])
    report(ico)

    for name, size in PNG_ICONS.items():
        path = ICONS / name
        write_png(art.resize((size, size), Image.LANCZOS), path)
        report(path)

    # Social card: 1200x630 is what Facebook and Twitter's large-image card use.
    # The artwork is square, so it sits centred on the level's own background
    # rather than being cropped to fit a shape it was never drawn for.
    card = Image.new('RGB', OG_SIZE, BACKGROUND)
    side = int(OG_SIZE[1] * 0.94)
    card.paste(art.resize((side, side), Image.LANCZOS),
               ((OG_SIZE[0] - side) // 2, (OG_SIZE[1] - side) // 2))
    og = ICONS / 'og-image.png'
    write_png(card, og)
    report(og)


def write_png(image: Image.Image, path: Path) -> None:
    """Quantise then save. See the module docstring for why FASTOCTREE."""
    quantised = image.quantize(colors=PALETTE_COLOURS, method=Image.FASTOCTREE)
    quantised.save(path, format='PNG', optimize=True)


def report(path: Path) -> None:
    print(f'{path.relative_to(ROOT)!s:34} {path.stat().st_size / 1024:6.1f} KB')


if __name__ == '__main__':
    main()
