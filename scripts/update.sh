#!/usr/bin/env bash
# Refresh the engine, the web demo and the media from the app repo.
# Usage: ./scripts/update.sh /path/to/Network-Order-of-Battle
set -euo pipefail
APP=${1:?path to the Network-Order-of-Battle checkout}
SITE=$(cd "$(dirname "$0")/.." && pwd)

(cd "$APP" && npm run build >/dev/null)
cp "$APP/apple/Bearings/Resources/engine.js" "$SITE/js/engine.js"
rm -rf "$SITE/demo" && mkdir -p "$SITE/demo" && cp -r "$APP/www/." "$SITE/demo/"

TMP=$(mktemp -d)
git -C "$APP" fetch -q origin site-media
git -C "$APP" archive origin/site-media | tar -x -C "$TMP"

mkdir -p "$SITE/media/clips" "$SITE/media/shots"
for f in "$TMP"/clips/*.mp4; do
  n=$(basename "$f" .mp4)
  # web copy: 600px wide, small enough to autoplay on a phone connection
  ffmpeg -y -loglevel error -i "$f" -vf "scale=600:-2:flags=lanczos" -c:v libx264 -crf 24 -preset slow \
    -pix_fmt yuv420p -movflags +faststart -an "$SITE/media/clips/$n.mp4"
  ffmpeg -y -loglevel error -ss 0.6 -i "$f" -frames:v 1 -vf "scale=600:-2:flags=lanczos" -q:v 4 "$SITE/media/clips/$n.jpg"
done
for f in "$TMP"/shots/*.png; do
  n=$(basename "$f" .png)
  python3 - "$f" "$SITE/media/shots/$n.jpg" <<'EOF'
import sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
w = 1400 if ('pad' in sys.argv[1] or im.width > im.height) else 720
im.resize((w, round(im.height * w / im.width)), Image.LANCZOS).save(sys.argv[2], quality=84, optimize=True, progressive=True)
EOF
done
rm -rf "$TMP"
echo "Updated. Check the page, then commit."
