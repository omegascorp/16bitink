#!/bin/sh
# fetchall.sh: downloads every job in jobs.txt not yet in iso/ (a job id may be listed again after a re-roll: the last wins)
cd "$(dirname "$0")"
while read n j; do
  [ -f "iso/$n.png" ] && [ -z "$FORCE" ] && continue
  code=$(curl -s -o "iso/$n.png.tmp" -w '%{http_code}' "https://api.pixellab.ai/mcp/images/$j/download")
  if [ "$code" = 200 ]; then mv "iso/$n.png.tmp" "iso/$n.png"; echo ok $n; else rm -f "iso/$n.png.tmp"; echo wait $n; fi
done < jobs.txt
