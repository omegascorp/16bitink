#!/bin/bash
# usage: dl2.sh job out.png [index]
curl -s -o "$2" "https://api.pixellab.ai/mcp/images/$1/download${3:+?index=$3}"
