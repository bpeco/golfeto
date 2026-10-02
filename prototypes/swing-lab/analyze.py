#!/usr/bin/env python3
"""PROTOTIPO (descartable). Dado un video de un swing, extrae la pose por frame,
detecta las 8 fases del swing (vocabulario GolfDB), calcula métricas por vista y
deja todo en una carpeta: pose.csv, events.json, metrics.json, frames clave con
el esqueleto, un mosaico, el gráfico de velocidad de las manos y report.md.

Uso:
    python analyze.py video.mp4 [--view auto|frente|atras] [--model lite|full|heavy]
                                [--out out/<nombre>] [--overlay-video]

No es código de producción: sin tests, sin manejo de errores más allá de lo que
hace falta para que corra. Ver README.md.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent

# --- Puntos de MediaPipe Pose (33) ------------------------------------------
NOSE = 0
L_EAR, R_EAR = 7, 8
L_SHO, R_SHO = 11, 12
L_ELB, R_ELB = 13, 14
L_WRI, R_WRI = 15, 16
L_HIP, R_HIP = 23, 24
L_KNE, R_KNE = 25, 26
L_ANK, R_ANK = 27, 28
CORE = [L_SHO, R_SHO, L_ELB, R_ELB, L_WRI, R_WRI, L_HIP, R_HIP, L_KNE, R_KNE, L_ANK, R_ANK]
CONNECTIONS = [
    (11, 12), (11, 13), (13, 15), (12, 14), (14, 16), (11, 23), (12, 24), (23, 24),
    (23, 25), (25, 27), (24, 26), (26, 28), (27, 29), (29, 31), (27, 31), (28, 30),
    (30, 32), (28, 32), (15, 17), (15, 19), (15, 21), (17, 19), (16, 18), (16, 20),
    (16, 22), (18, 20), (0, 1), (1, 2), (2, 3), (3, 7), (0, 4), (4, 5), (5, 6),
    (6, 8), (9, 10),
]

EVENTS = [
    "address", "toe_up", "mid_backswing", "top",
    "mid_downswing", "impact", "mid_follow_through", "finish",
]
EVENT_LABEL = {
    "address": "Address", "toe_up": "Toe-up", "mid_backswing": "Mid-backswing",
    "top": "Top", "mid_downswing": "Mid-downswing", "impact": "Impacto",
    "mid_follow_through": "Mid-follow-through", "finish": "Finish",
}


# --- Lectura del video y pose -------------------------------------------------
@dataclass
class Clip:
    path: Path
    fps: float
    width: int
    height: int
    frames: list[np.ndarray]  # BGR


def read_clip(path: Path, max_side: int | None) -> Clip:
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        sys.exit(f"No pude abrir el video: {path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frames = []
    while True:
        ok, fr = cap.read()
        if not ok:
            break
        if max_side and max(fr.shape[:2]) > max_side:
            s = max_side / max(fr.shape[:2])
            fr = cv2.resize(fr, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        frames.append(fr)
    cap.release()
    if not frames:
        sys.exit("El video no tiene frames legibles")
    h, w = frames[0].shape[:2]
    return Clip(path, fps, w, h, frames)


def run_pose(clip: Clip, model: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Devuelve (xy_px[N,33,2], vis[N,33], detected[N]). Sin pose: NaN."""
    import mediapipe as mp
    from mediapipe.tasks.python import BaseOptions
    from mediapipe.tasks.python import vision

    model_path = HERE / "models" / f"pose_landmarker_{model}.task"
    if not model_path.exists():
        sys.exit(f"Falta el modelo {model_path}. Corré: bash get_models.sh")
    opts = vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(model_path)),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    n = len(clip.frames)
    xy = np.full((n, 33, 2), np.nan, dtype=np.float64)
    vis = np.zeros((n, 33), dtype=np.float64)
    det = np.zeros(n, dtype=bool)
    with vision.PoseLandmarker.create_from_options(opts) as lm:
        for i, fr in enumerate(clip.frames):
            rgb = cv2.cvtColor(fr, cv2.COLOR_BGR2RGB)
            img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            res = lm.detect_for_video(img, int(round(i * 1000.0 / clip.fps)))
            if res.pose_landmarks:
                pts = res.pose_landmarks[0]
                for j, p in enumerate(pts):
                    xy[i, j] = (p.x * clip.width, p.y * clip.height)
                    vis[i, j] = p.visibility if p.visibility is not None else 1.0
                det[i] = True
    return xy, vis, det


def fill_gaps(xy: np.ndarray, det: np.ndarray) -> np.ndarray:
    """Interpola linealmente los frames sin pose (si hay alguno con pose)."""
    out = xy.copy()
    idx = np.arange(len(det))
    if det.sum() == 0:
        return out
    for j in range(33):
        for k in range(2):
            out[~det, j, k] = np.interp(idx[~det], idx[det], xy[det, j, k])
    return out


def smooth(a: np.ndarray, win: int) -> np.ndarray:
    """Media móvil centrada a lo largo del eje 0 (ventana impar)."""
    if win <= 1:
        return a
    pad = win // 2
    padded = np.concatenate([np.repeat(a[:1], pad, 0), a, np.repeat(a[-1:], pad, 0)])
    kernel = np.ones(win) / win
    flat = padded.reshape(len(padded), -1)
    sm = np.stack([np.convolve(flat[:, c], kernel, mode="valid") for c in range(flat.shape[1])], 1)
    return sm.reshape(a.shape)


# --- Geometría ---------------------------------------------------------------
def mid(xy: np.ndarray, a: int, b: int) -> np.ndarray:
    return (xy[:, a] + xy[:, b]) / 2.0


def angle_deg(a: np.ndarray, b: np.ndarray, c: np.ndarray) -> float:
    """Ángulo en B entre BA y BC, en grados."""
    v1, v2 = a - b, c - b
    cosang = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-9)
    return float(math.degrees(math.acos(max(-1.0, min(1.0, cosang)))))


def tilt_from_vertical_deg(bottom: np.ndarray, top: np.ndarray) -> float:
    """Inclinación de la línea bottom→top respecto de la vertical de la imagen.
    Positivo si el extremo superior está hacia +x (derecha de la imagen)."""
    dx, dy = top[0] - bottom[0], bottom[1] - top[1]  # dy positivo hacia arriba
    return float(math.degrees(math.atan2(dx, dy)))


# --- Fases del swing (heurística cinemática sobre las manos) ----------------------
def detect_events(xy: np.ndarray, fps: float) -> tuple[dict[str, int], dict[str, np.ndarray]]:
    n = len(xy)
    hands = mid(xy, L_WRI, R_WRI)
    hips = mid(xy, L_HIP, R_HIP)
    shoulders = mid(xy, L_SHO, R_SHO)
    torso = np.nanmedian(np.linalg.norm(shoulders - hips, axis=1))
    # velocidad de las manos en largos de torso por segundo (diferencia central)
    vel = np.zeros(n)
    vel[1:-1] = np.linalg.norm(hands[2:] - hands[:-2], axis=1) / 2.0
    vel[0], vel[-1] = vel[1], vel[-2]
    speed = smooth(vel[:, None], 3)[:, 0] / torso * fps

    quiet = 0.6  # torsos/s: manos quietas
    k = max(2, int(round(3 * fps / 30)))
    hip_y = hips[:, 1]

    # impacto: el pico de velocidad de las manos es el downswing; el impacto es el
    # punto más bajo de las manos en los ~0,4 s que siguen al pico
    peak = int(np.nanargmax(speed))
    w_after = max(4, int(round(0.4 * fps)))
    lo, hi = peak, min(n, peak + w_after + 1)
    impact = lo + int(np.nanargmax(hands[lo:hi, 1]))

    # top: manos en su punto más alto en los ~1,5 s anteriores al impacto
    w_before = max(10, int(round(1.5 * fps)))
    lo = max(0, impact - w_before)
    top = lo + int(np.nanargmin(hands[lo:impact, 1])) if impact > lo else lo
    # si hay pausa en el top, el top es el último frame quieto antes del downswing
    while top + 1 < impact and speed[top + 1] < quiet:
        top += 1

    # address: hacia atrás desde el top, primero salteamos todo lo que tenga las
    # manos por encima de la cadera (la pausa en el top no es el address); después
    # buscamos k frames quietos seguidos y nos quedamos con el último quieto antes
    # del takeaway
    i = top
    while i > 0 and hands[i, 1] < hip_y[i]:
        i -= 1
    address = 0
    while i - k >= 0:
        if np.all(speed[i - k:i] < quiet):
            address = i - 1
            break
        i -= 1
    j = address
    while j + 1 < top and speed[j + 1] < quiet and hands[j + 1, 1] >= hip_y[j + 1] - 0.1 * torso:
        j += 1
    address = j

    # finish: desde el impacto, k2 frames quietos seguidos (o el final)
    k2 = max(3, int(round(5 * fps / 30)))
    finish = n - 1
    for i in range(impact + 1, n - k2):
        if np.all(speed[i:i + k2] < quiet):
            finish = i
            break

    # fases intermedias por altura (y crece hacia abajo en la imagen)
    sho_y = shoulders[:, 1]
    hands_y = hands[:, 1]

    def first_cross(a: int, b: int, cond) -> int:
        for i in range(a, b + 1):
            if cond(i):
                return i
        return (a + b) // 2

    toe_up = first_cross(address, top, lambda i: hands_y[i] <= hip_y[i])
    mid_back = first_cross(toe_up, top, lambda i: hands_y[i] <= sho_y[i])
    mid_down = first_cross(top, impact, lambda i: hands_y[i] >= sho_y[i])
    mid_follow = first_cross(impact, finish, lambda i: hands_y[i] <= hip_y[i])

    events = {
        "address": address, "toe_up": toe_up, "mid_backswing": mid_back, "top": top,
        "mid_downswing": mid_down, "impact": impact, "mid_follow_through": mid_follow,
        "finish": finish,
    }
    series = {"hands_speed": speed, "hands_y": hands_y, "torso_px": np.array([torso])}
    return events, series


# --- Vista y métricas ---------------------------------------------------------
def detect_view(xy: np.ndarray, address: int) -> tuple[str, float]:
    a = xy[address]
    torso = np.linalg.norm((a[L_SHO] + a[R_SHO]) / 2 - (a[L_HIP] + a[R_HIP]) / 2)
    sho_w = abs(a[L_SHO, 0] - a[R_SHO, 0]) / (torso + 1e-9)
    hip_w = abs(a[L_HIP, 0] - a[R_HIP, 0]) / (torso + 1e-9)
    ratio = (sho_w + hip_w) / 2
    # de frente los hombros se ven anchos (~0,6-0,8 torsos); desde atrás (perfil)
    # se superponen (~0,1-0,25); en el medio la cámara está en diagonal
    if ratio >= 0.45:
        return "frente", float(ratio)
    if ratio <= 0.25:
        return "atras", float(ratio)
    return "diagonal", float(ratio)


def compute_metrics(xy: np.ndarray, vis: np.ndarray, det: np.ndarray, ev: dict[str, int],
                    fps: float, view: str, width: int, height: int) -> dict:
    A, T, I, F = ev["address"], ev["top"], ev["impact"], ev["finish"]
    MD, MF = ev["mid_downswing"], ev["mid_follow_through"]
    hips = mid(xy, L_HIP, R_HIP)
    sho = mid(xy, L_SHO, R_SHO)
    hands = mid(xy, L_WRI, R_WRI)
    ankles = mid(xy, L_ANK, R_ANK)
    torso = float(np.linalg.norm(sho[A] - hips[A]))
    stance = float(abs(xy[A, L_ANK, 0] - xy[A, R_ANK, 0]))

    m: dict = {
        "vista": view,
        "fps": fps,
        "tempo": {
            "backswing_s": round((T - A) / fps, 3),
            "downswing_s": round((I - T) / fps, 3),
            "ratio_backswing_downswing": round((T - A) / max(1, (I - T)), 2),
            "total_address_a_finish_s": round((F - A) / fps, 3),
            "frames_backswing": int(T - A),
            "frames_downswing": int(I - T),
        },
        "escala": {"torso_px": round(torso, 1), "stance_px": round(stance, 1)},
        "cabeza": {},
        "caderas": {},
        "tronco": {},
        "brazo_adelantado": {},
        "rodillas": {},
        "calidad": {},
    }

    # --- cabeza (en largos de torso; x positivo = derecha de la imagen)
    for name, f in (("top", T), ("impacto", I)):
        d = (xy[f, NOSE] - xy[A, NOSE]) / torso
        m["cabeza"][f"desplazamiento_{name}_x_torsos"] = round(float(d[0]), 3)
        m["cabeza"][f"desplazamiento_{name}_y_torsos"] = round(float(d[1]), 3)

    # --- inclinación del tronco (cadera→hombros) respecto de la vertical
    for name, f in (("address", A), ("top", T), ("impacto", I)):
        m["tronco"][f"inclinacion_{name}_deg"] = round(tilt_from_vertical_deg(hips[f], sho[f]), 1)

    # --- rodillas
    for name, f in (("address", A), ("top", T), ("impacto", I)):
        m["rodillas"][f"flexion_izq_{name}_deg"] = round(angle_deg(xy[f, L_HIP], xy[f, L_KNE], xy[f, L_ANK]), 1)
        m["rodillas"][f"flexion_der_{name}_deg"] = round(angle_deg(xy[f, R_HIP], xy[f, R_KNE], xy[f, R_ANK]), 1)

    if view != "atras":
        # frente o diagonal: métricas de frente (en diagonal, con advertencia)
        # dirección del objetivo: hacia donde van las manos del address al finish
        target_sign = 1.0 if (hands[F, 0] - hands[A, 0]) >= 0 else -1.0
        m["objetivo"] = "derecha de la imagen" if target_sign > 0 else "izquierda de la imagen"
        # brazo adelantado = el hombro más cercano al objetivo
        lead_is_left = (xy[A, L_SHO, 0] - xy[A, R_SHO, 0]) * target_sign > 0
        S, E, W = (L_SHO, L_ELB, L_WRI) if lead_is_left else (R_SHO, R_ELB, R_WRI)
        m["brazo_adelantado"]["cual"] = "izquierdo" if lead_is_left else "derecho"
        for name, f in (("top", T), ("impacto", I), ("mid_follow_through", MF)):
            m["brazo_adelantado"][f"angulo_codo_{name}_deg"] = round(angle_deg(xy[f, S], xy[f, E], xy[f, W]), 1)
        m["brazo_adelantado"]["nota"] = "180 = brazo recto; los pros tienen ~150-165 en el top"

        if view == "diagonal":
            m["brazo_adelantado"]["confianza"] = "baja: en diagonal el brazo adelantado se confunde"
        # sway (caderas se alejan del objetivo en la subida) y slide (hacia el objetivo en la bajada)
        sway = -(hips[T, 0] - hips[A, 0]) * target_sign
        slide = (hips[I, 0] - hips[A, 0]) * target_sign
        m["caderas"]["sway_top_torsos"] = round(float(sway / torso), 3)
        m["caderas"]["slide_impacto_torsos"] = round(float(slide / torso), 3)
        # normalizadas por el ancho de stance solo si los tobillos se ven separados
        if stance >= 0.3 * torso:
            m["caderas"]["sway_top_stance"] = round(float(sway / stance), 3)
            m["caderas"]["slide_impacto_stance"] = round(float(slide / stance), 3)
            # hanging back: cadera respecto del centro de los tobillos en el impacto
            m["caderas"]["cadera_vs_tobillos_impacto_stance"] = round(
                float((hips[I, 0] - ankles[I, 0]) * target_sign / stance), 3)
        else:
            m["caderas"]["nota"] = "tobillos casi superpuestos: no hay stance de referencia (vista diagonal o de atrás)"
        # cabeza hacia/desde el objetivo
        for name, f in (("top", T), ("impacto", I)):
            m["cabeza"][f"hacia_objetivo_{name}_torsos"] = round(
                float((xy[f, NOSE, 0] - xy[A, NOSE, 0]) * target_sign / torso), 3)
        # reverse spine: inclinación del tronco hacia el objetivo en el top (positivo = hacia el objetivo)
        m["tronco"]["inclinacion_top_hacia_objetivo_deg"] = round(
            tilt_from_vertical_deg(hips[T], sho[T]) * target_sign, 1)
        # giro aparente: ancho proyectado de hombros y caderas en el top vs address (1 = sin giro)
        sw = lambda f: abs(xy[f, L_SHO, 0] - xy[f, R_SHO, 0])
        hw = lambda f: abs(xy[f, L_HIP, 0] - xy[f, R_HIP, 0])
        m["giro_aparente"] = {
            "hombros_top_sobre_address": round(float(sw(T) / (sw(A) + 1e-9)), 3),
            "caderas_top_sobre_address": round(float(hw(T) / (hw(A) + 1e-9)), 3),
            "nota": "ancho proyectado; menor = más giro. Es 2D: no son grados"
                    + ("; en diagonal no sirve" if view == "diagonal" else ""),
        }
    else:
        # desde atrás: dirección "hacia la pelota" = de la cadera a las manos en address
        ball_sign = 1.0 if (hands[A, 0] - hips[A, 0]) >= 0 else -1.0
        m["pelota"] = "derecha de la imagen" if ball_sign > 0 else "izquierda de la imagen"
        for name, f in (("mid_downswing", MD), ("impacto", I)):
            m["caderas"][f"hacia_pelota_{name}_torsos"] = round(
                float((hips[f, 0] - hips[A, 0]) * ball_sign / torso), 3)
        m["caderas"]["nota"] = "positivo = la cadera se acerca a la pelota (early extension)"
        m["tronco"]["cambio_inclinacion_impacto_vs_address_deg"] = round(
            m["tronco"]["inclinacion_impacto_deg"] - m["tronco"]["inclinacion_address_deg"], 1)
        # plano de hombros en el top: inclinación de la línea de hombros respecto de la horizontal
        d = xy[T, L_SHO] - xy[T, R_SHO]
        m["tronco"]["linea_hombros_top_deg"] = round(float(abs(math.degrees(math.atan2(d[1], d[0])))) % 180, 1)
        # manos en mid-downswing respecto de la línea hombros→manos de address (over the top)
        p0, p1 = sho[A], hands[A]
        v = p1 - p0
        nrm = np.array([-v[1], v[0]]) / (np.linalg.norm(v) + 1e-9)
        off = float(np.dot(hands[MD] - p0, nrm)) * ball_sign / torso
        m["manos"] = {
            "mid_downswing_fuera_del_plano_address_torsos": round(off, 3),
            "nota": "positivo = manos del lado de la pelota respecto de la línea hombros-manos de address",
        }

    # --- calidad del clip
    core_vis = vis[:, CORE]
    inside = np.all((xy[:, CORE, 0] >= 0) & (xy[:, CORE, 0] <= width) &
                    (xy[:, CORE, 1] >= 0) & (xy[:, CORE, 1] <= height), axis=1)
    ank_std = float(np.nanstd(ankles[A:F + 1], axis=0).mean() / torso) if F > A else 0.0
    m["calidad"] = {
        "frames_total": int(len(det)),
        "frames_con_pose": int(det.sum()),
        "tasa_deteccion": round(float(det.mean()), 3),
        "visibilidad_media_core": round(float(np.nanmean(core_vis[det])), 3) if det.any() else 0.0,
        "visibilidad_min_core_en_fases": round(float(min(
            np.nanmin(core_vis[f]) for f in ev.values())), 3),
        "cuerpo_entero_en_cuadro_tasa": round(float(inside.mean()), 3),
        "movimiento_tobillos_torsos": round(ank_std, 3),
        "nota": "movimiento_tobillos alto = cámara movida o pies que se mueven",
    }
    return m


# --- Salidas ---------------------------------------------------------------------
def draw_skeleton(img: np.ndarray, pts: np.ndarray, vis: np.ndarray, label: str | None = None) -> np.ndarray:
    out = img.copy()
    for a, b in CONNECTIONS:
        if np.isnan(pts[a]).any() or np.isnan(pts[b]).any():
            continue
        c = (0, 200, 255) if min(vis[a], vis[b]) > 0.5 else (0, 90, 255)
        cv2.line(out, tuple(pts[a].astype(int)), tuple(pts[b].astype(int)), c, 2, cv2.LINE_AA)
    for j in range(33):
        if np.isnan(pts[j]).any():
            continue
        cv2.circle(out, tuple(pts[j].astype(int)), 3, (255, 255, 255), -1, cv2.LINE_AA)
    if label:
        cv2.rectangle(out, (0, 0), (min(out.shape[1], 12 + 11 * len(label)), 26), (0, 0, 0), -1)
        cv2.putText(out, label, (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
    return out


def write_outputs(out: Path, clip: Clip, xy: np.ndarray, xy_raw: np.ndarray, vis: np.ndarray,
                  det: np.ndarray, ev: dict[str, int], series: dict, metrics: dict,
                  overlay_video: bool) -> None:
    out.mkdir(parents=True, exist_ok=True)
    (out / "frames").mkdir(exist_ok=True)

    # pose.csv: una fila por frame, x/y en píxeles (crudo, sin interpolar) y visibilidad
    with open(out / "pose.csv", "w", newline="") as f:
        wr = csv.writer(f)
        header = ["frame", "t_s", "detected"]
        for j in range(33):
            header += [f"x{j}", f"y{j}", f"v{j}"]
        wr.writerow(header)
        for i in range(len(xy_raw)):
            row = [i, round(i / clip.fps, 4), int(det[i])]
            for j in range(33):
                row += [round(float(xy_raw[i, j, 0]), 1), round(float(xy_raw[i, j, 1]), 1), round(float(vis[i, j]), 3)]
            wr.writerow(row)

    events_out = {k: {"frame": int(v), "t_s": round(v / clip.fps, 3)} for k, v in ev.items()}
    (out / "events.json").write_text(json.dumps(events_out, indent=2, ensure_ascii=False))
    (out / "metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False))
    np.savetxt(out / "hands_speed.csv", np.column_stack([np.arange(len(series["hands_speed"])),
               series["hands_speed"]]), delimiter=",", header="frame,torsos_por_s", comments="", fmt="%.4f")

    # frames clave con esqueleto + mosaico 4×2
    tiles = []
    for k, name in enumerate(EVENTS, 1):
        i = ev[name]
        label = f"{k}. {EVENT_LABEL[name]}  f{i}  {i / clip.fps:.2f}s"
        img = draw_skeleton(clip.frames[i], xy[i], vis[i], label)
        cv2.imwrite(str(out / "frames" / f"{k:02d}_{name}.jpg"), img, [cv2.IMWRITE_JPEG_QUALITY, 90])
        tile_h = 480
        s = tile_h / img.shape[0]
        tiles.append(cv2.resize(img, (int(img.shape[1] * s), tile_h), interpolation=cv2.INTER_AREA))
    tw = max(t.shape[1] for t in tiles)
    tiles = [cv2.copyMakeBorder(t, 0, 0, 0, tw - t.shape[1], cv2.BORDER_CONSTANT, value=(0, 0, 0)) for t in tiles]
    sheet = np.vstack([np.hstack(tiles[:4]), np.hstack(tiles[4:])])
    cv2.imwrite(str(out / "contact_sheet.jpg"), sheet, [cv2.IMWRITE_JPEG_QUALITY, 85])

    # gráfico de velocidad de las manos con las fases
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        sp = series["hands_speed"]
        t = np.arange(len(sp)) / clip.fps
        fig, ax = plt.subplots(figsize=(10, 3.6), dpi=120)
        ax.plot(t, sp, color="#1f6f3f", lw=1.6)
        ax.set_xlabel("segundos")
        ax.set_ylabel("velocidad de las manos (torsos/s)")
        ax.set_title(f"{clip.path.name}: velocidad de las manos y fases detectadas")
        ymax = float(np.nanmax(sp)) * 1.05
        for k, name in enumerate(EVENTS, 1):
            x = ev[name] / clip.fps
            ax.axvline(x, color="#999", lw=0.8, ls="--")
            ax.text(x, ymax * (0.98 - 0.1 * (k % 2)), f"{k}", ha="center", va="top", fontsize=8, color="#333")
        ax.set_ylim(0, ymax * 1.05)
        ax.grid(alpha=0.25)
        fig.tight_layout()
        fig.savefig(out / "hands_speed.png")
        plt.close(fig)
    except Exception as e:  # matplotlib es opcional
        print("Sin gráfico:", e)

    if overlay_video:
        vw = cv2.VideoWriter(str(out / "overlay.mp4"), cv2.VideoWriter_fourcc(*"mp4v"),
                             clip.fps, (clip.width, clip.height))
        inv = {v: k for k, v in ev.items()}
        for i, fr in enumerate(clip.frames):
            label = f"f{i}" + (f"  {EVENT_LABEL[inv[i]]}" if i in inv else "")
            vw.write(draw_skeleton(fr, xy[i], vis[i], label))
        vw.release()

    # report.md
    q = metrics["calidad"]
    tp = metrics["tempo"]
    lines = [
        f"# Swing lab: {clip.path.name}",
        "",
        f"Vista: **{metrics['vista']}** · {clip.width}×{clip.height} · {clip.fps:.2f} fps · {len(clip.frames)} frames",
        "",
        "## Fases detectadas",
        "",
        "| # | Fase | Frame | Segundo |",
        "|---|---|---|---|",
    ]
    for k, name in enumerate(EVENTS, 1):
        lines.append(f"| {k} | {EVENT_LABEL[name]} | {ev[name]} | {ev[name] / clip.fps:.2f} |")
    if "fases_vs_swingnet" in metrics:
        lines += ["", "### Comparación con SwingNet (GolfDB)", "",
                  "| Fase | Pose (heurística) | SwingNet | Confianza | Diferencia (frames) |",
                  "|---|---|---|---|---|"]
        for name in EVENTS:
            c = metrics["fases_vs_swingnet"][name]
            lines.append(f"| {EVENT_LABEL[name]} | {c['pose']} | {c['swingnet']} | {c['swingnet_conf']} | {c['diff_frames']:+d} |")
    lines += [
        "",
        "## Tempo",
        "",
        f"- Backswing (address → top): {tp['backswing_s']} s ({tp['frames_backswing']} frames)",
        f"- Downswing (top → impacto): {tp['downswing_s']} s ({tp['frames_downswing']} frames)",
        f"- Relación backswing:downswing: **{tp['ratio_backswing_downswing']}:1** (pros en GolfDB: mediana 3,4:1)",
        "",
        "## Calidad del clip",
        "",
        f"- Pose detectada en {q['frames_con_pose']}/{q['frames_total']} frames ({q['tasa_deteccion']:.0%})",
        f"- Visibilidad media de hombros/codos/muñecas/caderas/rodillas/tobillos: {q['visibilidad_media_core']}",
        f"- Visibilidad mínima en las fases: {q['visibilidad_min_core_en_fases']}",
        f"- Cuerpo entero en cuadro: {q['cuerpo_entero_en_cuadro_tasa']:.0%} de los frames",
        f"- Movimiento de los tobillos (cámara/pies): {q['movimiento_tobillos_torsos']} torsos",
        "",
        "## Métricas (ver metrics.json)",
        "",
        "```json",
        json.dumps({k: v for k, v in metrics.items() if k not in ("calidad", "fps", "tempo", "vista")},
                   indent=2, ensure_ascii=False),
        "```",
        "",
        "Advertencia: todo es 2D y depende de la posición de la cámara. Comparar solo swings de la misma vista.",
    ]
    (out / "report.md").write_text("\n".join(lines))


# --- main -----------------------------------------------------------------------
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("video")
    ap.add_argument("--view", choices=["auto", "frente", "atras"], default="auto")
    ap.add_argument("--model", choices=["lite", "full", "heavy"], default="heavy")
    ap.add_argument("--out", default=None, help="carpeta de salida (default: out/<nombre del video>)")
    ap.add_argument("--max-side", type=int, default=1280, help="reescala si el lado mayor supera esto")
    ap.add_argument("--overlay-video", action="store_true", help="también escribe overlay.mp4")
    ap.add_argument("--swingnet", action="store_true",
                    help="también corre SwingNet (GolfDB) y compara las fases; necesita torch")
    args = ap.parse_args()

    video = Path(args.video)
    out = Path(args.out) if args.out else HERE / "out" / video.stem
    clip = read_clip(video, args.max_side)
    print(f"{video.name}: {clip.width}x{clip.height} @ {clip.fps:.2f} fps, {len(clip.frames)} frames")

    xy_raw, vis, det = run_pose(clip, args.model)
    print(f"pose: {det.sum()}/{len(det)} frames con detección (modelo {args.model})")
    if det.sum() < 10:
        sys.exit("Muy pocos frames con pose; revisá el encuadre")
    xy = smooth(fill_gaps(xy_raw, det), 3)

    ev, series = detect_events(xy, clip.fps)
    view, ratio = detect_view(xy, ev["address"])
    if args.view != "auto":
        view = args.view
    print(f"vista: {view} (ancho hombros+caderas / torso = {ratio:.2f})")
    if view == "diagonal":
        print("AVISO: la cámara está en diagonal; las métricas de frente salen con menos confianza")
    print("fases:", {k: v for k, v in ev.items()})

    metrics = compute_metrics(xy, vis, det, ev, clip.fps, view, clip.width, clip.height)
    metrics["vista_detectada"] = {"vista": detect_view(xy, ev["address"])[0], "ratio": round(ratio, 3)}

    if args.swingnet:
        from swingnet import predict_events

        sn_ev, sn_conf, _ = predict_events(clip.frames)
        comp = {}
        for name in EVENTS:
            comp[name] = {"pose": int(ev[name]), "swingnet": int(sn_ev[name]),
                          "swingnet_conf": sn_conf[name], "diff_frames": int(ev[name] - sn_ev[name])}
        metrics["fases_vs_swingnet"] = comp
        metrics["tempo"]["swingnet_ratio_backswing_downswing"] = round(
            (sn_ev["top"] - sn_ev["address"]) / max(1, sn_ev["impact"] - sn_ev["top"]), 2)
        print("swingnet:", {k: v for k, v in sn_ev.items()})

    write_outputs(out, clip, xy, xy_raw, vis, det, ev, series, metrics, args.overlay_video)
    print(f"tempo {metrics['tempo']['ratio_backswing_downswing']}:1 · salida en {out}")


if __name__ == "__main__":
    main()
