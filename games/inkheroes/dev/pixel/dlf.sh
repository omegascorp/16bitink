#!/bin/bash
# usage: dlf.sh job out.png [index] (waits until a real PNG arrives)
for i in $(seq 1 20); do curl -s -o "$2" "https://api.pixellab.ai/mcp/images/$1/download${3:+?index=$3}"; head -c4 "$2" | grep -q PNG && exit 0; sleep 4; done; echo fail $1
