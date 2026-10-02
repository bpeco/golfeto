#!/usr/bin/env bash
# Baja los modelos que usa el prototipo a ./models (no se commitean).
#  - MediaPipe Pose Landmarker (Apache 2.0), lite/full/heavy, desde storage.googleapis.com
#  - SwingNet (GolfDB, McNally 2019; código y pesos CC BY-NC 4.0, uso no comercial).
#    El README original los aloja en Google Drive; este espejo es un blob de Git LFS
#    del repo htrnguyen-labs/golf-tech-analysis con el mismo tamaño (63.280.059 bytes)
#    que el archivo del autor. sha256 esperado:
#    6331e303a9e86d0c19f183899f958bf2a71cf5a7070d46899e25e1ac877b23d4
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p models
for m in lite full heavy; do
  f="models/pose_landmarker_$m.task"
  [ -s "$f" ] || curl -sS -L -o "$f" "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_$m/float16/latest/pose_landmarker_$m.task"
  echo "ok $f ($(wc -c < "$f") bytes)"
done
f="models/swingnet_1800.pth.tar"
if [ ! -s "$f" ]; then
  curl -sS -L -o "$f" "https://media.githubusercontent.com/media/htrnguyen-labs/golf-tech-analysis/main/models/swingnet_1800.pth.tar"
fi
echo "ok $f ($(wc -c < "$f") bytes)"
if command -v sha256sum >/dev/null; then sha256sum "$f"; elif command -v shasum >/dev/null; then shasum -a 256 "$f"; fi
