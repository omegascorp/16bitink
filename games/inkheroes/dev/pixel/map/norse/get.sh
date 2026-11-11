#!/bin/bash
# usage: get.sh name job  -> name.png
curl -sf -o "$1.png" "https://api.pixellab.ai/mcp/images/$2/download" && echo ok $1
