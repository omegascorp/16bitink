#!/bin/sh
# Builds voice.mp3 from the picked takes: edge silence trimmed, x1.05 tempo, 1.5 s between blocks.
set -e
cd "$(dirname "$0")"
PICKS="b1b b2c b3a b4a b5a b6a b7b b8a"
GAP=1.5
TMP=$(mktemp -d)
LIST="$TMP/list.txt"
ffmpeg -hide_banner -loglevel error -f lavfi -i anullsrc=r=44100:cl=mono -t $GAP -c:a pcm_s16le "$TMP/gap.wav"
first=1
for p in $PICKS; do
  ffmpeg -hide_banner -loglevel error -i "takes/$p.mp3" -ac 1 -ar 44100 \
    -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,atempo=1.05" \
    -c:a pcm_s16le "$TMP/$p.wav"
  [ $first = 1 ] || echo "file '$TMP/gap.wav'" >> "$LIST"
  echo "file '$TMP/$p.wav'" >> "$LIST"
  first=0
done
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$LIST" -c:a libmp3lame -b:a 192k voice.mp3
for p in $PICKS; do printf "%s %s\n" "$p" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/$p.wav")"; done > takes/durations.txt
rm -rf "$TMP"
