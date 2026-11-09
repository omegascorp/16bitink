#!/bin/bash
# usage: fetchall.sh jobsfile  -> fetches every job in the file whose strip is missing
cd "$(dirname "$0")"
while read a b c d; do
  [ -f anim/$b-$c.png ] && continue
  uv run -q --with pillow python -I -W ignore fetch.py $a $b $c $d --skip-first 2>&1 | grep -v "^  feet\|Deprec\|semi =" || echo "not ready $b $c"
done < $1
