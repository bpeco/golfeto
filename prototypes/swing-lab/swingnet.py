#!/usr/bin/env python3
"""PROTOTIPO (descartable). Fases del swing con SwingNet (GolfDB, McNally et al.
2019): MobileNetV2 + LSTM bidireccional que etiqueta cada frame con uno de los 8
eventos o "ninguno". Port a CPU del test_video.py original, sin ventana gráfica.

Uso:
    python swingnet.py video.mp4 [--out out/<nombre>]

Pesos: models/swingnet_1800.pth.tar (bash get_models.sh). Código y pesos originales
bajo CC BY-NC 4.0: uso no comercial. Requiere torch (pip install torch torchvision).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
EVENTS = [
    "address", "toe_up", "mid_backswing", "top",
    "mid_downswing", "impact", "mid_follow_through", "finish",
]
INPUT = 160
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)


def build_model():
    import torch
    import torch.nn as nn

    from golfdb_mobilenetv2 import MobileNetV2

    class EventDetector(nn.Module):
        def __init__(self, lstm_hidden: int = 256):
            super().__init__()
            net = MobileNetV2(width_mult=1.0)
            self.cnn = nn.Sequential(*list(net.children())[0][:19])
            self.rnn = nn.LSTM(1280, lstm_hidden, 1, batch_first=True, bidirectional=True)
            self.lin = nn.Linear(2 * lstm_hidden, 9)
            self.lstm_hidden = lstm_hidden

        def forward(self, x):
            b, t, c, h, w = x.size()
            feats = self.cnn(x.view(b * t, c, h, w)).mean(3).mean(2)
            h0 = torch.zeros(2, b, self.lstm_hidden, device=x.device)
            c0 = torch.zeros(2, b, self.lstm_hidden, device=x.device)
            out, _ = self.rnn(feats.view(b, t, -1), (h0, c0))
            return self.lin(out).view(b * t, 9)

    ckpt = HERE / "models" / "swingnet_1800.pth.tar"
    if not ckpt.exists():
        sys.exit(f"Faltan los pesos {ckpt}. Corré: bash get_models.sh")
    model = EventDetector()
    state = torch.load(ckpt, map_location="cpu", weights_only=False)
    model.load_state_dict(state["model_state_dict"])
    model.eval()
    return model


def preprocess(frames_bgr: list[np.ndarray]) -> np.ndarray:
    """Igual que SampleVideo de test_video.py: lado mayor a 160, relleno con la
    media de ImageNet, RGB, normalizado. Devuelve (T, 3, 160, 160) float32."""
    h, w = frames_bgr[0].shape[:2]
    ratio = INPUT / max(h, w)
    nh, nw = int(h * ratio), int(w * ratio)
    dh, dw = INPUT - nh, INPUT - nw
    top, bottom, left, right = dh // 2, dh - dh // 2, dw // 2, dw - dw // 2
    out = np.empty((len(frames_bgr), 3, INPUT, INPUT), dtype=np.float32)
    for i, fr in enumerate(frames_bgr):
        r = cv2.resize(fr, (nw, nh))
        b = cv2.copyMakeBorder(r, top, bottom, left, right, cv2.BORDER_CONSTANT,
                               value=[0.406 * 255, 0.456 * 255, 0.485 * 255])
        rgb = cv2.cvtColor(b, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
        out[i] = ((rgb - MEAN) / STD).transpose(2, 0, 1)
    return out


def predict_events(frames_bgr: list[np.ndarray], seq_length: int = 64) -> tuple[dict[str, int], dict[str, float], np.ndarray]:
    """Devuelve (frame por evento, confianza por evento, probs[T, 9])."""
    import torch
    import torch.nn.functional as F

    model = build_model()
    x = torch.from_numpy(preprocess(frames_bgr)).unsqueeze(0)  # (1, T, 3, 160, 160)
    probs = []
    with torch.no_grad():
        for s in range(0, x.shape[1], seq_length):
            logits = model(x[:, s:s + seq_length])
            probs.append(F.softmax(logits, dim=1).numpy())
    probs = np.concatenate(probs, 0)
    idx = np.argmax(probs, axis=0)[:-1]  # un frame por evento; la clase 8 es "ninguno"
    events = {name: int(idx[i]) for i, name in enumerate(EVENTS)}
    conf = {name: round(float(probs[idx[i], i]), 3) for i, name in enumerate(EVENTS)}
    return events, conf, probs


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--out", default=None)
    args = ap.parse_args()
    video = Path(args.video)
    out = Path(args.out) if args.out else HERE / "out" / video.stem
    out.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frames = []
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        frames.append(fr)
    cap.release()
    print(f"{video.name}: {len(frames)} frames @ {fps:.2f} fps")

    events, conf, probs = predict_events(frames)
    for name in EVENTS:
        print(f"  {name:20s} f{events[name]:4d}  {events[name] / fps:6.2f}s  conf {conf[name]:.3f}")
    np.savetxt(out / "swingnet_probs.csv", probs, delimiter=",", fmt="%.4f",
               header=",".join(EVENTS + ["none"]), comments="")
    (out / "events_swingnet.json").write_text(json.dumps(
        {k: {"frame": events[k], "t_s": round(events[k] / fps, 3), "conf": conf[k]} for k in EVENTS},
        indent=2))
    print("salida en", out)


if __name__ == "__main__":
    main()
