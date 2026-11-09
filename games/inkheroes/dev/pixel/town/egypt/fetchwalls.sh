#!/bin/sh
# fetchwalls.sh: downloads each edit in walljobs.txt to walls/out-<name>.png, then walls.py unpad crops them into iso/
cd "$(dirname "$0")"
while read n j; do
  code=$(curl -s -o "walls/out-$n.png.tmp" -w '%{http_code}' "https://api.pixellab.ai/mcp/images/$j/download")
  if [ "$code" = 200 ]; then mv "walls/out-$n.png.tmp" "walls/out-$n.png"; echo ok $n; else rm -f "walls/out-$n.png.tmp"; echo wait $n; fi
done < walljobs.txt
python3 walls.py unpad
