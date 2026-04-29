#!/bin/sh
# Bundle the unpacked extension into site/downloads/of-block.zip for distribution.
set -eu

cd "$(dirname "$0")"

VERSION=$(awk -F'"' '/"version"/ {print $4; exit}' manifest.json)
mkdir -p site/downloads

OUT="site/downloads/of-block.zip"
VERSIONED="site/downloads/of-block-v${VERSION}.zip"

rm -f "$OUT" "$VERSIONED"

zip -qr "$OUT" \
  manifest.json \
  background.js \
  content \
  lib \
  popup \
  options \
  README.md \
  -x "*.DS_Store" "*/.DS_Store"

cp "$OUT" "$VERSIONED"

SIZE=$(wc -c < "$OUT" | awk '{printf "%.1f KB", $1/1024}')
echo "Built $OUT ($SIZE)"
echo "Also at $VERSIONED"
