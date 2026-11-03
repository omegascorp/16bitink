# Builds options.png: the three style options side by side, ×4 nearest, labelled.
from PIL import Image, ImageDraw, ImageFont
K = 4
rows = [('A  pixen, black outline, 48 colours', 'optA'), ('B  pixen, selective outline, painterly, ~80 colours', 'optB'), ('C  pixflux, single-colour outline, ~30 colours', 'optC')]
W, RH = 8 + (80 + 8 + 96) * K + 8, 80 * K + 56
sheet = Image.new('RGBA', (W, RH * len(rows)), (104, 128, 80, 255))
d = ImageDraw.Draw(sheet)
try: f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 26)
except OSError: f = ImageFont.load_default()
for r, (label, p) in enumerate(rows):
    y = r * RH
    d.rectangle([0, y, W, y + 40], fill=(32, 25, 19, 255)); d.text((12, y + 6), label, font=f, fill=(239, 228, 200, 255))
    kn, gr = Image.open(f'{p}-knight.png').convert('RGBA'), Image.open(f'{p}-griffin.png').convert('RGBA')
    sheet.alpha_composite(kn.resize((80 * K, 80 * K), Image.NEAREST), (8, y + 48))
    sheet.alpha_composite(gr.resize((96 * K, 80 * K), Image.NEAREST), (8 + 88 * K, y + 48))
sheet.save('options.png'); print(sheet.size)
