#!/bin/sh
# heroes/fetchall.sh: downloads each job in heroes/jobs.txt not yet in heroes/ (try images; the last line for a name wins with FORCE=1)
cd "$(dirname "$0")"
while read n j; do
  [ -f "$n.png" ] && [ -z "$FORCE" ] && continue
  code=$(curl -s -o "$n.png.tmp" -w '%{http_code}' "https://api.pixellab.ai/mcp/images/$j/download")
  if [ "$code" = 200 ]; then mv "$n.png.tmp" "$n.png"; echo ok $n; else rm -f "$n.png.tmp"; echo wait $n; fi
done < jobs.txt
