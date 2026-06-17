from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "static" / "og.png"

W, H = 1200, 630
BG = (34, 34, 34)
INK = (243, 241, 251)
MUTED = (154, 158, 174)
PINK = (247, 90, 182)

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)

font_candidates = [
    "/System/Library/Fonts/Supplemental/Arial Black.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial.ttf",
]
def load_font(size, bold=False):
    for p in font_candidates:
        try:
            return ImageFont.truetype(p, size)
        except Exception:
            continue
    return ImageFont.load_default()

font_title = load_font(140, bold=True)
font_tag = load_font(40)
font_footer = load_font(28)

mark_size = 180
mark_x = 90
mark_y = 130
radius = 38
draw.rounded_rectangle(
    [mark_x, mark_y, mark_x + mark_size, mark_y + mark_size],
    radius=radius,
    fill=PINK,
)
notch = 36
draw.polygon(
    [
        (mark_x + 38, mark_y),
        (mark_x + 38 + notch * 2, mark_y),
        (mark_x + 38 + notch, mark_y + notch + 4),
    ],
    fill=BG,
)
draw.polygon(
    [
        (mark_x + mark_size - 38 - notch * 2, mark_y + mark_size),
        (mark_x + mark_size - 38, mark_y + mark_size),
        (mark_x + mark_size - 38 - notch, mark_y + mark_size - notch - 4),
    ],
    fill=BG,
)

title = "goodplaylist"
title_x = mark_x + mark_size + 40
title_y = mark_y - 10
good_text = "good"
playlist_text = "playlist"
good_w = draw.textlength(good_text, font=font_title)
draw.text((title_x, title_y), good_text, fill=PINK, font=font_title)
draw.text((title_x + good_w, title_y), playlist_text, fill=INK, font=font_title)

underline_y = title_y + 160
draw.rectangle([title_x, underline_y, title_x + good_w - 6, underline_y + 8], fill=PINK)

tag = "make a youtube playlist from one song"
draw.text((mark_x, mark_y + mark_size + 90), tag, fill=MUTED, font=font_tag)

footer = "goodplaylist.lumenrot.com"
fw = draw.textlength(footer, font=font_footer)
draw.text((W - fw - 90, H - 70), footer, fill=MUTED, font=font_footer)

OUT.parent.mkdir(parents=True, exist_ok=True)
img.save(OUT, "PNG", optimize=True)
print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")
