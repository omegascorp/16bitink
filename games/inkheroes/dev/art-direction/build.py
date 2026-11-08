# Builds the comparison page: fills template.html placeholders with inline images and pixel.js.
# Usage: python3 build.py out.html
import base64, io, sys
from PIL import Image

PROMO = '../../../../promo/inkheroes-art-styles.png'


def png(path):
    return 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()


def jpeg(path, quality=86):
    buf = io.BytesIO()
    Image.open(path).convert('RGB').save(buf, 'JPEG', quality=quality)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


FILL = {
    'IMG_BATTLE': lambda: jpeg('cur-3.png'),
    'IMG_MENU': lambda: jpeg('cur-0.png'),
    'IMG_SOCIAL': lambda: png(PROMO),
    'IMG_PL16': lambda: png('pixellab/battle-16.png'),
    'IMG_PL32': lambda: png('pixellab/battle-32.png'),
    'IMG_PL64': lambda: png('pixellab/battle-64.png'),
    'IMG_G16': lambda: png('pixellab/s16-griffin.png'),
    'IMG_G32': lambda: png('pixellab/optB-griffin.png'),
    'IMG_G64': lambda: png('pixellab/s64-griffin.png'),
    'IMG_GLM': lambda: png('greek/battle-myth.png'),
    'IMG_GLX': lambda: png('greek/battle-mixed.png'),
    'IMG_LUM': lambda: png('greek/lineup-myth.png'),
    'IMG_LUX': lambda: png('greek/lineup-mixed.png'),
    'PIXEL_JS': lambda: open('pixel.js').read(),
}

html = open('template.html').read()
for key, make in FILL.items():
    html = html.replace('{{' + key + '}}', make())
assert '{{' not in html, html[html.index('{{'):html.index('{{') + 40]
open(sys.argv[1], 'w').write(html)
print(sys.argv[1], len(html))
