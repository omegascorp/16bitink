#!/bin/sh
# fetch.sh <job_id> <name> [dir]  -> <dir|iso>/<name>.png (waits until the job is ready)
D="$(cd "$(dirname "$0")" && pwd)/${3:-iso}"
for i in $(seq 1 40); do
  code=$(curl -s -o "$D/$2.png" -w '%{http_code}' "https://api.pixellab.ai/mcp/images/$1/download")
  [ "$code" = 200 ] && { echo ok $2; exit 0; }
  sleep 5
done
echo FAIL $2; exit 1
