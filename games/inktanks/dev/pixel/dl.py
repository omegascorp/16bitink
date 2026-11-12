import sys,urllib.request
from PIL import Image
# usage: dl.py job out.png
u=f'https://api.pixellab.ai/mcp/images/{sys.argv[1]}/download'
urllib.request.urlretrieve(u,sys.argv[2]);print(Image.open(sys.argv[2]).size)
