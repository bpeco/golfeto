# Swing lab (prototipo descartable)

Responde una pregunta de `docs/research/2026-09-30-analisis-de-swing-iphone.md`: **dado un video de un swing, ¿se puede extraer el movimiento del cuerpo, separar las fases y medir algo útil?** No es código de producción ni parte de la app: corre en Python en una computadora, con el video ya grabado. La app de iPhone haría lo mismo con Vision de Apple (19 puntos) en lugar de MediaPipe (33 puntos).

Qué hace `analyze.py` con un video:

1. Pose por frame con MediaPipe Pose Landmarker (33 puntos, modelo `heavy` por defecto).
2. Detecta las 8 fases del swing (vocabulario de GolfDB) con una heurística sobre la trayectoria de las manos: address, toe-up, mid-backswing, top, mid-downswing, impacto, mid-follow-through, finish.
3. Detecta la vista (de frente, de perfil, o en diagonal) por el ancho proyectado de hombros y caderas.
4. Calcula métricas 2D por vista: tempo, cabeza, caderas (sway/slide o early extension), tronco, brazo adelantado, rodillas, y la calidad del clip.
5. Deja en `out/<video>/`: `pose.csv`, `events.json`, `metrics.json`, `frames/` (8 frames clave con esqueleto), `contact_sheet.jpg`, `hands_speed.png`, `report.md` y, con `--overlay-video`, `overlay.mp4`.

`swingnet.py` corre SwingNet (el modelo de GolfDB, McNally 2019) sobre el mismo video como segunda opinión de las fases; `analyze.py --swingnet` lo integra y compara.

## Correr

```bash
cd prototypes/swing-lab
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt          # mediapipe, opencv, numpy, matplotlib
bash get_models.sh                       # modelos de MediaPipe y pesos de SwingNet
python analyze.py samples/mi_swing.mp4 --overlay-video
open out/mi_swing/report.md              # o contact_sheet.jpg

# segunda opinión de las fases (pesado: baja torch)
pip install torch torchvision
python analyze.py samples/mi_swing.mp4 --swingnet
```

En Linux sin escritorio MediaPipe necesita `libegl1 libgles2 libgl1` (apt). En Mac no hace falta nada más.

Cómo filmar para que sirva: cámara quieta (trípode o apoyada), cuerpo entero en cuadro con margen, 2–4 m del golfista, 120 o 240 fps si el teléfono puede (a 30 fps el downswing son ~8 frames), y la misma vista en todos los swings que se quieran comparar.

## Vistas

- **frente** (face-on): la cámara mira el pecho del golfista. Se miden sway y slide de caderas, inclinación del tronco hacia el objetivo (reverse spine), ángulo del brazo adelantado, giro aparente de hombros y caderas, cabeza.
- **atras** (de perfil, down-the-line): la cámara está detrás de las manos mirando al objetivo. Se miden inclinación del tronco en address, top e impacto (pérdida de postura), caderas hacia la pelota (early extension), manos respecto del plano de address (over the top), línea de hombros en el top.
- **diagonal**: la cámara quedó entre las dos. Se calculan las métricas de frente con un aviso; conviene volver a filmar.

Todo es 2D: los ángulos son proyecciones y dependen de dónde está la cámara. Solo comparar swings de la misma vista.

## Licencias

MediaPipe: Apache 2.0. GolfDB / SwingNet (`golfdb_mobilenetv2.py`, pesos `swingnet_1800.pth.tar`): CC BY-NC 4.0, uso no comercial, solo para este prototipo. El video `samples/golfdb_test_video.mp4` es el `test_video.mp4` del repo de GolfDB (no se commitea: está en `.gitignore`; `get_models.sh` no lo baja, se saca del repo de GolfDB). Los videos propios en `samples/` sí se commitean.
