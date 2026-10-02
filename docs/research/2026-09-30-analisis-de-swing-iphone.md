# Filmarse en cada golpe con el iPhone y recibir recomendaciones reales al terminar los 18 hoyos

Investigación, no implementación. Fecha: 2026-09-30; validación 1 agregada el 2026-10-02 (§11, con un prototipo descartable en `prototypes/swing-lab/`). Rama: `claude/quirky-brown-ultwa1` (separada de producción; no toca la app ni la base). Fuentes consultadas: documentación oficial de Apple, Anthropic, Supabase, Google y USGA/R&A, papers y repos originales, y sitios oficiales de los productos. Cada afirmación lleva su fuente; lo que no se pudo verificar en fuente primaria queda marcado **(sin verificar)**. La lista completa está al final.

Pedido textual del dueño: *"usar mi celular para filmarme en cada golpe, que mire mi swing y haga recomendaciones REALES sobre qué puedo estar haciendo mal al cabo de 100 swings [...] que me diga 'che, en 15 golpes hiciste X con tu brazo izquierdo que hace que XXX'. Para filmar con mi iPhone. Puede ser una app hecha en Swift."*

## 1. Respuesta corta

Se puede, con una app nativa en Swift, y hay piezas oficiales de Apple para casi todo: captura a 240 fps, pose del cuerpo en 2D (19 puntos) y en 3D (17 puntos, iOS 17+), un clasificador de acciones entrenable con Create ML para detectar "hubo un swing", el acelerómetro del Apple Watch a 800 Hz para marcar el impacto, y datasets públicos (GolfDB, CaddieSet) con modelos que separan las 8 fases del swing. Claude no acepta video, pero sí hasta 600 imágenes por request, así que el análisis se hace mandando los frames de cada fase; una partida cuesta alrededor de un dólar por Batches. Las Reglas de Golf permiten grabar durante la vuelta para usarlo después, y prohíben mirarlo mientras se juega.

Dos correcciones al encuadre del pedido, con datos:

- **"100 swings" son en realidad ~40.** De los ~94 golpes de un hándicap 20, entre 33 y 36 son putts, ~3 son penalidades y ~15 son juego corto con swing parcial. Quedan **~40 swings completos por vuelta** (14 salidas y 25–30 hierros). El análisis de fallas aplica a esos 40; los umbrales de este documento están pensados para 40, no para 100 (§2.1).
- **La falla corporal no determina el vuelo de la pelota.** Lo determinan la cara del palo, la trayectoria y el centrado del impacto, y nada de eso se ve en un video de celular. La relación "X hace que Y" es sabiduría de instructor, no evidencia; la app puede decir "en los N golpes con X, M salieron slice" solo si el golfista marcó cómo salió cada pelota (§5.5).

Lo que hace que la recomendación sea **real** no es el modelo de visión sino cuatro condiciones que la app tiene que garantizar:

1. **Misma vista en todos los swings que se comparan.** Un ángulo medido desde atrás no se compara con uno medido de frente. Los ángulos de un video 2D son proyecciones y cambian con la posición de la cámara.
2. **Medición determinística antes que narración.** Los números (tempo, inclinación, desplazamiento de la cabeza, ángulo del brazo adelantado) los calcula la app desde la pose, siempre igual. Claude clasifica fallas visibles a partir de frames y números, con un catálogo cerrado y evidencia obligatoria, y al final solo redacta. Nunca cuenta ni mide.
3. **Suficientes swings evaluables y el resultado de cada golpe.** "En 15 golpes hiciste X" exige que X aparezca en 15 de los ~40 swings de la misma vista con calidad suficiente. "Que hace que Y" exige saber cómo salió cada pelota (slice, hook, tope, gordo), que se captura con un toque después del golpe. Sin eso, lo máximo honesto es "hacés X seguido".
4. **Un set de evaluación etiquetado por un instructor** (150–300 swings del grupo) antes de mostrarle un informe a alguien. Es lo que separa "el modelo dice" de "la app acierta 7 de cada 10 veces cuando dice esto".

Con eso, lo defendible es un catálogo de 7 fallas del vocabulario de TPI medibles en 2D con cámara fija (early extension, sway, slide, pérdida de postura, reverse spine, chicken wing, hanging back) más el tempo, siempre como tendencia relativa al propio golfista y no como grados absolutos de tour. Lo que no hay que prometer: giro de hombros y caderas en grados, muñeca, plano del palo, cara en el impacto, ni "por esto hiciste slice".

El problema más difícil no es el software: es **quién apoya el teléfono en cada golpe** de una partida real. Ningún producto del mercado documenta ese flujo; los que graban video asumen trípode en el range, y los que trabajan en cancha detectan golpes con el reloj o sensores en el grip pero no filman (§6). Por eso el plan propone empezar en el driving range con trípode (100 swings en una hora, cámara fija) y llevarlo a la cancha recién cuando la detección y el informe funcionen.

Una advertencia que sale de la literatura: la evidencia sostiene que el video revisado con criterio mejora a mediano plazo, y hay señal de que el feedback sin guía empeora a corto plazo. **No existe un ensayo que muestre que una app de pose baje el hándicap de un amateur** (§5.6). El informe tiene que ser material para revisar, idealmente con un instructor, no una orden.

## 2. El pedido, desarmado en cinco problemas

| # | Problema | Qué resuelve | Estado de la investigación |
|---|---|---|---|
| a | Filmar cada golpe sin que nadie sostenga el teléfono | Trípode o clip en el carro/bolsa, grabación continua por hoyo, corte automático | Resuelto en el range; en cancha depende del dueño (§3) |
| b | Detectar el swing dentro del video | Action Classifier de Create ML + audio del impacto + Apple Watch a 800 Hz | Piezas oficiales; hay que entrenar (§4.3) |
| c | Medir algo confiable de cada swing | Vision 2D/3D, GolfDB para las 8 fases, métricas por vista | Medible en 2D con límites claros (§4.2, §5) |
| d | Convertir 100 swings en 2 o 3 afirmaciones sostenidas | Agregación estadística en el servidor, umbrales, resultado por golpe | Diseño propuesto, sin validar (§9) |
| e | Contarlo en rioplatense sin inventar | Claude con esquema estricto y validación cruzada contra el agregado | Patrón que Galf ya usa para la foto de la tarjeta (§8, §10) |

### 2.1 Cuántos swings hay de verdad en "100 golpes"

Un hándicap 20 promedia ~94 golpes por vuelta (agregador de 3.788 vueltas, **(terciaria)**). De esos, 33 a 36 son putts (Shot Scope citado por MyGolfSpy y Golf Monthly, **(terciaria)**; las dos cifras se atribuyen a Shot Scope y la discrepancia no se pudo resolver porque el blog está bloqueado), ~3 son penalidades sin swing y, con ~3 greens en regulación ([Shot Scope](https://shotscope.com/blog/practice-green/game-improvement/reduce-your-handicap-20hcp-averages/), **(snippet)**), unos 15 a 18 son golpes de juego corto con swing parcial. Quedan **~40 swings completos por vuelta**: 14 salidas con driver, madera o híbrido y 25 a 30 hierros de aproximación. Cálculo propio sobre esas fuentes.

Consecuencias: el catálogo de fallas aplica a esos ~40 (el juego corto y el putt son otro problema); los umbrales para hablar (§9.3) se dimensionan para 40 y no para 100; y una sola partida puede no alcanzar para una afirmación por vista, así que el informe tiene que poder acumular varias partidas filmadas desde la misma vista.

## 3. Cómo sería en la cancha (flujo propuesto)

Esto es diseño propio, atado a las restricciones que la documentación impone (pantalla encendida, cámara quieta, reglas de golf).

1. **Antes de salir**: se abre la partida en Galf (ya existe) y se elige la vista de la vuelta, **de frente** (*face-on*) o **desde atrás** (*down-the-line*). Una sola por partida, para que los swings sean comparables.
2. **En cada golpe** (salvo putts): el teléfono va en un trípode chico o en un clip del carro, a 2–3 m del golfista, encuadrando el cuerpo entero. La app graba continuo por hoyo con la pantalla encendida (la cámara no funciona en segundo plano, §4.6) y detecta sola cada swing (§4.3); no hay que tocar nada. Si hay Apple Watch, el reloj marca el instante del impacto.
3. **Después del golpe**: al preparar el siguiente, la app pregunta "¿Cómo salió el anterior?" con seis botones grandes: derecho, slice, hook, tope, gordo, otro. Palo opcional. Se puede corregir después.
4. **Durante la vuelta no se mira nada.** Las reglas permiten grabar pero no mirar el video de la propia vuelta para ayudarse a ejecutar un golpe (§7). El informe llega al firmar la tarjeta.
5. **Al firmar**: la app sube por swing los 8 frames de las fases más las métricas (no el video; §10.3), el servidor manda un lote a Claude, agrega, redacta y avisa. Expectativa: "en general en menos de una hora, a más tardar mañana".
6. **El informe**: 2 o 3 hallazgos, cada uno con cuántos swings lo sostienen, la métrica que lo respalda, la relación con el resultado de la pelota si hay datos, y un botón "ver los 15 golpes".

Lo que este flujo le pide al dueño en cancha: apoyar el teléfono antes de cada golpe y tocar un botón después. Con ~40 swings completos y ~15 parciales por vuelta son 50 a 55 apoyadas. Es el costo real del pedido y hay que probarlo en una partida antes de invertir en el resto. El plan B, si resulta insoportable, es filmar solo las 14 salidas (el teléfono se apoya una vez por hoyo, en el tee) y usar el range para el resto.

## 4. Plataforma Apple

### 4.1 Captura a alta velocidad (AVFoundation)

- Los formatos de alta tasa (60 fps o más) solo se acceden fijando `activeFormat` en el `AVCaptureDevice` y después `activeVideoMinFrameDuration` y `activeVideoMaxFrameDuration`; poner un valor que no esté en `videoSupportedFrameRateRanges` del formato activo lanza una excepción, y elegir un preset de sesión resetea la tasa. Fuentes: [activeFormat](https://developer.apple.com/documentation/avfoundation/avcapturedevice/activeformat), [activeVideoMinFrameDuration](https://developer.apple.com/documentation/avfoundation/avcapturedevice/activevideominframeduration), [respuesta de Apple en foros](https://developer.apple.com/forums/thread/21694).
- Los iPhone 16, 17 y 17e graban 1080p a 120 o 240 fps y 4K hasta 60 fps; los 17 Pro llegan a 4K 120 fps. Ninguno ofrece 4K a 240. **(snippet)**: las páginas de specs de apple.com están bloqueadas por el proxy de la sesión; los números vienen de los extractos del buscador.
- Dos salidas de la sesión, y desde iOS 16 pueden convivir: `AVCaptureMovieFileOutput` graba a archivo (HEVC por defecto en la mayoría de los iPhone, fragmentos cada 10 s que hacen legible el archivo aunque la app se cierre) y `AVCaptureVideoDataOutput` entrega frames en vivo para Vision. Fuentes: [WWDC22](https://developer.apple.com/videos/play/wwdc2022/110429/), [movieFragmentInterval](https://developer.apple.com/documentation/avfoundation/avcapturemoviefileoutput/moviefragmentinterval), [Recording movies in alternative formats](https://developer.apple.com/documentation/avfoundation/recording-movies-in-alternative-formats).
- Para los frames en vivo, la nota técnica [TN3121](https://developer.apple.com/documentation/technotes/tn3121-selecting-a-pixel-format-for-an-avcapturevideodataoutput) pide no usar BGRA (2,6 veces más memoria que 420v) y usar un formato bi-planar, lossy si el dispositivo lo soporta.
- **No hay pre-roll nativo** (guardar los N segundos anteriores a un evento). Tres caminos: anillo de frames crudos en memoria (a 240 fps son ~746 MB/s sin comprimir, cálculo propio), segmentos comprimidos de `AVAssetWriter` con [`preferredOutputSegmentInterval`](https://developer.apple.com/documentation/avfoundation/avassetwriter/preferredoutputsegmentinterval) (iOS 14+), o **grabar continuo por hoyo y cortar después** con [`AVAssetReader`](https://developer.apple.com/documentation/avfoundation/avassetreader) por timestamp. La tercera es la más simple y la recomendada.
- Estabilización: con trípode, `preferredVideoStabilizationMode = .off` (la estabilización agrega latencia y recorta el campo visual, [doc](https://developer.apple.com/documentation/avfoundation/avcaptureconnection/preferredvideostabilizationmode)).
- Tamaño de archivo: Apple no publica MB/s de HEVC para modelos actuales. El único dato oficial es de 2015 y en H.264 (1080p30, 130 MB por minuto). **Hay que medirlo en el teléfono del dueño.** Que 1080p240 exija HEVC es una afirmación de un desarrollador no contradicha por Apple **(sin verificar)**; se comprueba en runtime con `availableVideoCodecTypes` por formato ([hilo](https://developer.apple.com/forums/thread/131542)).
- Botones físicos: [`AVCaptureEventInteraction`](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction) (iOS 17.2) responde a los botones de volumen y Camera Control mientras la app captura; el Action button del iPhone y del Watch se conecta con [App Intents](https://developer.apple.com/documentation/appintents). Sirven para "marcar golpe" a mano si la detección automática falla.

### 4.2 Pose del cuerpo (Vision)

| Request | Desde | Puntos | Coordenadas | Notas |
|---|---|---|---|---|
| [`VNDetectHumanBodyPoseRequest`](https://developer.apple.com/documentation/vision/vndetecthumanbodyposerequest) | iOS 14 | 19 ([lista](https://developer.apple.com/documentation/vision/vnhumanbodyposeobservation/jointname): nariz, ojos, orejas, cuello, hombros, codos, muñecas, cadera central, caderas, rodillas, tobillos) | normalizadas, origen abajo a la izquierda, confianza por punto | La sesión WWDC20 habla de 18 puntos; verificar con `supportedJointNames` |
| [`VNDetectHumanBodyPose3DRequest`](https://developer.apple.com/documentation/vision/vndetecthumanbodypose3drequest) | iOS 17 | 17 ([lista](https://developer.apple.com/documentation/vision/vnhumanbodypose3dobservation/jointname): cabeza, hombros, codos, muñecas, columna, cadera, rodillas, tobillos) | **metros**, origen en la cadera, relativas a la cámara | No requiere LiDAR, pero sin profundidad la altura es una referencia de 1,8 m ([WWDC23](https://developer.apple.com/videos/play/wwdc2023/111241/)); una sola persona por frame; A12 o posterior |
| [`VNDetectHumanHandPoseRequest`](https://developer.apple.com/documentation/vision/vndetecthumanhandposerequest) | iOS 14 | 21 por mano | normalizadas | Falla con guantes ([WWDC20](https://developer.apple.com/videos/play/wwdc2020/10653/)); las muñecas ya vienen en el cuerpo |
| [`VNDetectTrajectoriesRequest`](https://developer.apple.com/documentation/vision/vndetecttrajectoriesrequest) | iOS 14 | trayectoria parabólica | ecuación y puntos | Exige trípode y escena quieta; mínimo 5 detecciones; para pelotas chicas pide 1080p ([guía](https://developer.apple.com/documentation/vision/identifying-trajectories-in-video)). Que capte una pelota de golf a velocidad real **(sin verificar)** |

- Desde iOS 18 hay API Swift nueva y asíncrona: [`DetectHumanBodyPoseRequest`](https://developer.apple.com/documentation/vision/detecthumanbodyposerequest) y [`DetectHumanBodyPose3DRequest`](https://developer.apple.com/documentation/vision/detecthumanbodypose3drequest), con `perform(on:orientation:)` sobre `CVPixelBuffer`, `CMSampleBuffer`, `Data` o URL.
- Limitaciones que Apple declara: peor con personas inclinadas, ropa suelta, sujeto cerca del borde ([WWDC20](https://developer.apple.com/videos/play/wwdc2020/10653/)). **Apple no publica fps de inferencia** para ningún request; solo dice que los dispositivos viejos no siguen el ritmo de la cámara. Implicancia: la pose se calcula sobre el clip cortado, no sobre los 240 fps en vivo.
- La postura de address de un golfista (inclinado hacia adelante) es justo uno de los casos que Apple marca como más difíciles. Es un riesgo a medir en el set de evaluación.
- Alternativa: [MediaPipe Pose Landmarker](https://github.com/google-ai-edge/mediapipe) (Google, Apache 2.0): 33 puntos, incluye manos, talón y punta del pie, y "world landmarks" 3D en metros en cualquier iPhone con iOS 15+, vía CocoaPods (`MediaPipeTasksVision`). Latencias oficiales solo para Pixel 3 (20–53 ms según modelo lite/full/heavy); para iPhone **(sin verificar)**. Vale como plan B si hacen falta pies o manos.

### 4.3 Detectar el swing automáticamente

Ninguna API de Apple detecta swings de golf; hay que componerlo. Tres señales, de más gruesa a más fina:

1. **Action Classifier de Create ML** ([`MLActionClassifier`](https://developer.apple.com/documentation/createml/mlactionclassifier)): se entrena en un Mac con videos etiquetados; Create ML extrae la pose con Vision y aprende el patrón temporal. Apple pide **al menos 50 videos por clase**, una clase negativa obligatoria, cámara quieta y cuerpo entero ([guía](https://developer.apple.com/documentation/createml/creating-an-action-classifier-model), [videos de entrenamiento](https://developer.apple.com/documentation/createml/gathering-training-videos-for-an-action-classifier)). La ventana de predicción es fps × duración (Apple usa 30 fps × 2 s = 60 frames). El sample oficial [Detecting Human Actions in a Live Video Feed](https://developer.apple.com/documentation/createml/detecting-human-actions-in-a-live-video-feed) muestra el pipeline completo con ventana deslizante. Propuesta: clases `swing`, `swing de práctica`, `otro`, `quieto`, con ≥50 clips por clase de varios golfistas y las dos vistas. Da "hubo un swing en esta ventana", no el frame del impacto.
2. **Audio del impacto**: [SoundAnalysis](https://developer.apple.com/documentation/soundanalysis/snclassifysoundrequest) trae un clasificador de más de 300 clases, pero la lista solo se obtiene en runtime (`knownClassifications`) y la ventana mínima es de 0,5 s (120 frames a 240 fps): sirve para confirmar el golpe, no para ubicarlo. Para ubicar el frame conviene el audio crudo de `AVCaptureAudioDataOutput` y un umbral de energía sobre el transitorio del impacto, con el mismo reloj de la sesión. Diseño propio.
3. **Apple Watch**: [`CMBatchedSensorManager`](https://developer.apple.com/documentation/coremotion/cmbatchedsensormanager) (watchOS 10) entrega **acelerómetro a 800 Hz y device motion a 200 Hz** en lotes de un segundo, contra 100 Hz del `CMMotionManager` clásico; exige una `HKWorkoutSession` activa (existe [`HKWorkoutActivityType.golf`](https://developer.apple.com/documentation/healthkit/hkworkoutactivitytype/golf)) y Apple lo presentó nombrando al golf entre los deportes de impacto ([WWDC23](https://developer.apple.com/videos/play/wwdc2023/10179/)). Series 8 y Ultra confirmados; modelos posteriores **(sin verificar)**. El timestamp del golpe viaja al iPhone por [WatchConnectivity](https://developer.apple.com/documentation/watchconnectivity/wcsession/transferuserinfo(_:)) (`transferUserInfo`, garantizado, o `sendMessage`, inmediato); latencia no documentada. Como el corte del clip se hace después de la vuelta, un retraso de segundos no importa.

Con las tres, el corte de cada swing es un problema resuelto por redundancia: el Action Classifier propone la ventana, el audio o el reloj fijan el impacto, y `AVAssetReader` corta 2 s antes y 1,5 s después.

### 4.4 Segmentar las fases del swing (Core ML)

- El modelo público SwingNet (§5) es MobileNetV2 + LSTM bidireccional en PyTorch. [coremltools 9.0](https://github.com/apple/coremltools/releases) (PyTorch 2.7) lo convierte por `torch.jit.trace` (la vía estable según la [guía](https://github.com/apple/coremltools/blob/main/docs-guides/source/convert-pytorch-workflow.md)); la op `lstm` de Core ML soporta `bidirectional` ([fuente](https://github.com/apple/coremltools/blob/main/coremltools/converters/mil/mil/ops/defs/iOS15/recurrent.py)) y el frontend maneja `num_layers` y `batch_first`. Qué capas corren en el Neural Engine **(sin verificar)**; medir con el Performance Report de Xcode.
- Alternativa sin modelo: detectar las fases por la velocidad de las muñecas sobre los puntos de Vision (address = quieto, top = velocidad cero tras el backswing, impacto = pico de velocidad hacia abajo, finish = quieto). Más frágil pero sin conversión ni dataset.

### 4.5 Métricas por swing calculables desde la pose 2D

Diseño propio sobre los puntos de §4.2. Todas se calculan igual para todos los swings, con `metrics_version`, y cada una vale en una sola vista:

| Métrica | Vista | Cómo | Qué falla sugiere |
|---|---|---|---|
| Tempo (backswing : downswing) y duración total | ambas | frames entre address, top e impacto | ritmo, apuro en la transición |
| Desplazamiento lateral de la cabeza entre address, top e impacto (fracción del alto del cuerpo) | frente | nariz o punto medio de las orejas | sway / slide |
| Inclinación del tronco en address vs impacto | atrás | ángulo cadera–hombros vs vertical | early extension, pérdida de postura |
| Ángulo del brazo adelantado en el top | frente | hombro–codo–muñeca del brazo izquierdo (diestro) | brazo que se dobla ("chicken wing" es en el impacto) |
| Rotación aparente de hombros y caderas en el top | frente | ancho proyectado hombro–hombro y cadera–cadera respecto a address | poco giro, giro de caderas exagerado |
| Flexión de rodillas en address y en el top | atrás y frente | cadera–rodilla–tobillo | pierna que se estira |
| Calidad del clip | ambas | confianza media de los puntos, cuerpo completo en cuadro, cámara quieta | descarta el swing del agregado |

La rotación real de hombros y caderas necesita 3D; en 2D solo se ve el acortamiento proyectado. Con `VNDetectHumanBodyPose3DRequest` (iOS 17) se puede intentar, sabiendo que sin LiDAR la escala es supuesta y que Apple no publica su precisión angular.

### 4.6 Límites prácticos de iOS

- **La cámara no funciona en segundo plano.** Si la app va al fondo, la sesión se interrumpe con `videoDeviceNotAvailableInBackground` ([doc](https://developer.apple.com/documentation/avfoundation/avcapturesession/interruptionreason)); las excepciones de iOS 16+ son iPad con Stage Manager, apps VoIP o un entitlement específico. En la práctica: la pantalla queda encendida toda la vuelta con el idle timer apagado, y eso pega en la batería.
- **Térmica**: `ProcessInfo.thermalState` ([doc](https://developer.apple.com/documentation/foundation/processinfo/thermalstate-swift.property)) y la interrupción `videoDeviceNotAvailableDueToSystemPressure`. El consejo de Apple ([WWDC22](https://developer.apple.com/videos/play/wwdc2022/110429/)) es bajar fps o resolución. Cuatro horas al sol a 240 fps es un escenario a probar, no a suponer.
- Batería: Apple no publica consumo por modo de captura. Medir.
- Permisos en Info.plist: cámara, micrófono, fototeca si se exporta ([guía](https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media)); HealthKit y modo "Workout processing" en el Watch ([sesiones de entrenamiento](https://developer.apple.com/documentation/healthkit/running-workout-sessions)).
- Rolling shutter: sin documentación oficial de Apple **(sin verificar)**. Afecta la varilla del palo (se ve curvada a alta velocidad), no la pose del cuerpo.

### 4.7 Distribución e integración con Supabase

- [Apple Developer Program](https://developer.apple.com/programs/): USD 99 por año; incluye TestFlight (100 testers internos, 10.000 externos, builds válidas 90 días, la primera build externa pasa por revisión; [doc](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)). Con cuenta gratuita solo se instala en el propio teléfono desde Xcode.
- **Hace falta un Mac.** Xcode corre solo en macOS (Xcode 26.6 pide macOS Tahoe 26.2+, [tabla](https://developer.apple.com/support/xcode/)); Xcode Cloud también se configura desde Xcode ([doc](https://developer.apple.com/xcode-cloud/)). No hay forma oficial de compilar y firmar sin uno.
- [supabase-swift](https://github.com/supabase/supabase-swift) (oficial): Swift Package Manager, iOS 16+, módulos Auth, PostgREST, Storage, Realtime, Functions. Google se hace con el SDK nativo de Google y `signInWithIdToken` ([guía](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/social-login/auth-google.mdx)); es la misma cuenta que usa la PWA, así que el golfista queda vinculado sin trabajo extra. Storage: `upload(path:fileURL:)` con streaming; subida resumible (TUS) no vista en el SDK Swift **(sin verificar)**.
- Límite de tamaño por archivo en Storage: 50 MB en Free, hasta 500 GB en Pro ([doc](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/storage/uploads/file-limits.mdx)). Galf hoy usa Free.

### 4.8 Por qué nativa y no la PWA

Safari soporta `MediaRecorder` desde iOS 14.5 (WebKit, **(snippet)**: webkit.org está bloqueado), pero no hay documentación de Apple sobre 120/240 fps con `getUserMedia` en iOS **(sin verificar)**, y todo lo demás que este proyecto necesita es solo nativo: elegir el formato de 240 fps, correr Vision y Core ML sobre frames nativos, el acelerómetro del Watch, WatchConnectivity, los botones físicos y el control de HEVC y fragmentos. Galf sigue siendo la PWA; la app de swing es un cliente más de la misma base.

## 5. Qué se puede medir y qué no (ciencia del swing)

El proxy de la sesión bloquea arxiv.org, PubMed, mytpi.com y los sitios de los productos; lo que se pudo leer completo está en GitHub (código, licencias y el archivo de anotaciones de GolfDB). Lo demás viene de extractos del buscador que apuntan a la fuente primaria, marcado **(snippet)**, o de un medio cuando la primaria no se pudo abrir, marcado **(terciaria)**.

### 5.1 Segmentar el swing en fases: lo que hay publicado

- **GolfDB / SwingNet** (McNally et al., CVPR Workshops 2019; [paper](https://openaccess.thecvf.com/content_CVPRW_2019/papers/CVSports/McNally_GolfDB_A_Video_Database_for_Golf_Swing_Sequencing_CVPRW_2019_paper.pdf), [repo](https://github.com/wmcnally/golfdb)): 1.400 clips de 580 videos de YouTube de **246 golfistas profesionales** (ningún amateur); 585 desde atrás, 461 de frente, 354 otras vistas; 758 a velocidad real (720p, 30 fps) y 642 en cámara lenta; 68 % con driver (conteos hechos sobre el archivo de anotaciones del repo). Ocho eventos: Address, Toe-up, Mid-backswing, Top, Mid-downswing, Impact, Mid-follow-through, Finish. Modelo: MobileNetV2 + LSTM bidireccional, entrada 160×160, 9 clases. Precisión: 76,1 % de eventos correctos en el paper y 71,5 % con los pesos publicados, con tolerancia de ~1 frame a 30 fps (verificado en `util.py` del repo). Licencia del código **CC BY-NC 4.0**; los videos no se redistribuyen. **Requiere el clip ya recortado a un solo swing**: no detecta el swing dentro de un video largo (eso lo resuelve §4.3).
- Mejoras sobre GolfDB: 78,1 % con un encoder transformer temporal ([CS231n 2025](https://cs231n.stanford.edu/2025/papers/cs231n_final_report__Revised%20-%20Yanming%20Zhu.pdf)); 82,1 % desde el movimiento reconstruido de un reloj ([arXiv 2606.22876](https://arxiv.org/abs/2606.22876)). Ambas **(snippet)**.
- **CaddieSet** (CVPR Workshops 2025, [repo](https://github.com/damilab/CaddieSet), licencia **MIT**): 1.757 tiros de 8 golfistas (924 de frente, 833 desde atrás) filmados junto a un launch monitor; por tiro, los 8 eventos, 17 puntos de pose y 22 métricas interpretables (ángulo de hombros, posición de la cabeza, rotación de caderas, transferencia de peso, ángulo de columna) más los datos de la pelota. Es el dataset más parecido a lo que este proyecto necesita y su licencia permite usarlo.
- **GolfPose** (ICPR 2024, [repo](https://github.com/MingHanLee/GolfPose)): dataset 2D y 3D con puntos del golfista **y del palo**; licencia propia que permite entrenar modelos comerciales pero no redistribuir los datos; se pide por correo.
- **3D desde un solo video**: MotionBERT (37,2 mm de error en Human3.6M, Apache 2.0), VideoPose3D (46,8 mm, CC BY-NC) y WHAM (MIT) existen y son usables. Sportsbox publica que su modelo propio mide giro e inclinación de pecho y pelvis con ~2° de diferencia contra un sistema electromagnético, pero con trípode a ≤1,07 m de altura y a ≤3,7 m del golfista ([help.sportsbox.ai](https://help.sportsbox.ai/sportsbox-ai-accuracy), **(snippet)**). Un modelo genérico sobre video de cancha con blur no tiene esa validación; un estudio de DTU (Ingwersen 2023, 4 golfistas con Qualisys, **(snippet)**) muestra que los modelos genéricos flaquean en movimiento rápido.

### 5.2 Tempo: lo que dicen 758 swings de profesionales

Calculado sobre las anotaciones de GolfDB a 30 fps: de address a top, mediana 26 frames (0,87 s); de top a impacto, mediana **8 frames (0,27 s)**; relación **3,4:1**, igual en cámara lenta. Dos consecuencias: a 30 fps el downswing entero son 8 frames, por eso hay que filmar a 120 o 240 fps; y el 3:1 de Tour Tempo (Novosel) y el 2,8:1 del modelo biomecánico de Grober (Yale, [arXiv physics/0611291](https://arxiv.org/abs/physics/0611291), **(snippet)**) son consistentes con los datos. Que los amateurs estén "entre 1:1 y 2:1" es marketing de Tour Tempo **(sin verificar)**; no hay estudio revisado con el ratio de amateurs.

### 5.3 El vocabulario de fallas: las Big 12 de TPI y qué se ve en cada vista

TPI (Titleist Performance Institute) define 12 características del swing. Son el catálogo natural para la app porque cada una tiene definición, vista y fase. Definiciones de [mytpi.com](https://www.mytpi.com/improve-my-game/swing-characteristics) **(snippet, sitio bloqueado)**; la columna "2D" es evaluación propia.

| Falla | Qué es (TPI) | Vista | Fase | Medible en 2D |
|---|---|---|---|---|
| Early Extension | la pelvis se acerca a la pelota en la bajada; "67 % de más de 90.000 golfistas testeados por TPI la tienen; 99 % de los pros no" | atrás | bajada e impacto | **Sí, la mejor candidata**: desplazamiento de las caderas respecto de una vertical fija en address |
| Sway | movimiento lateral excesivo del tren inferior alejándose del objetivo en la subida | frente | subida y top | **Sí**: desplazamiento del centro de caderas, normalizado por el ancho de stance |
| Slide | movimiento lateral excesivo hacia el objetivo en la bajada | frente | bajada e impacto | Sí, separándolo del desplazamiento normal (~10 cm según TPI) |
| Loss of Posture | alteración de los ángulos de address durante el swing; "causa el block a la derecha y el hook a la izquierda" | atrás | impacto vs address | Sí: cambio del ángulo caderas–hombros respecto de la vertical |
| Reverse Spine Angle | tronco inclinado hacia el objetivo al top; "una de las causas principales de dolor lumbar" | frente | top | Sí: inclinación de la línea caderas–hombros al top |
| Chicken Winging | el codo adelantado se dobla en el impacto | frente | impacto y follow-through | Sí para el codo (hombro–codo–muñeca); no para la muñeca |
| Hanging Back | falta de transferencia de peso; "lo normal es estar unos 10 cm más cerca del objetivo en el impacto que en address" | frente | impacto | Parcial: caderas y cabeza como proxy, sin plataformas de fuerza |
| Flat Shoulder Plane | los hombros giran en un plano más horizontal que la columna | atrás | top | Parcial: la línea de hombros desde atrás queda escorzada |
| Over the Top | el palo baja por fuera del plano; "una de las causas principales del slice" | atrás | transición | Parcial: posición de las manos respecto del plano; mejora con puntos del palo (GolfPose) |
| S-Posture y C-Posture | arco lumbar excesivo, u hombros caídos, en address | atrás | address | Baja: la pose 2D no tiene pelvis anterior/posterior ni columna torácica |
| Casting y Scooping | liberación temprana de las muñecas; muñeca "cupped" en el impacto | ambas | bajada e impacto | Baja sin el palo; media con detección del palo; alta solo con sensor de muñeca |

Las siete primeras son las que un iPhone en trípode mide con confianza alta o media-alta, y entre ellas está la más frecuente (early extension). Otras prevalencias que circulan (50 % pierden postura, 56 % hacen casting) solo aparecen en terceros **(sin verificar)**.

### 5.4 Valores de referencia publicados

| Métrica | Referencia | Fuente y calidad |
|---|---|---|
| Giro de tórax y pelvis al top (pros) | tórax 99 ± 6°, pelvis 46°, X-factor 56 ± 4°; el X-factor correlaciona 0,90 con la velocidad del palo; en amateurs, los factores fuera de 1–2 desvíos de los pros aumentan con el hándicap | Meister et al. 2011, J Appl Biomech, 10 pros y 5 amateurs con cámaras 3D ([PubMed](https://pubmed.ncbi.nlm.nih.gov/21844613/)) **(snippet)** |
| X-factor stretch | lo que distingue nivel no es el X-factor al top sino su aumento al inicio de la bajada; promedio tour ~5°, hasta 15° | Cheetham 2001 citado por [TPI](https://www.mytpi.com/articles/biomechanics/the-difference-between-x-factor-and-x-factor-stretch) **(snippet)** |
| Movimiento lateral de caderas | pros: ~10 cm hacia el objetivo en la subida y ~4 cm más en el impacto; un hándicap 30 tiene 16° menos de inclinación de hombros en el impacto | GolfTEC SwingTRU, 30.000 golfistas, sistema propietario, vía Golf Digest y PGA.com **(terciaria)** |
| Brazo adelantado al top | un jugador de tour dobla ~30° el brazo adelantado al top; los que "se mantienen anchos", 15–20°. Que el brazo esté recto es mito | Sportsbox vía Golf Digest **(terciaria)** |
| Muñeca adelantada | address 15–20° de extensión; impacto entre −10° y +10° | HackMotion **(snippet)**. **No se mide desde video 2D** |
| Flexión de rodilla en address | 18 ± 12° | revisión de la Universidad de Nuevo México **(snippet)** |
| Desplazamiento lateral de la cabeza | sin valores publicados con fuente primaria | **(sin verificar)** |

Cómo usar esta tabla: no para comparar al golfista con el tour (vista, escala y 3D distintos), sino para saber qué es normal y no reportar como falla un movimiento que los pros también hacen. Las caderas sí se mueven; el brazo sí se dobla.

### 5.5 De la falla al vuelo de la pelota

- Lo que determina el vuelo, con evidencia sólida de radar, es la cara del palo (dirección inicial), la trayectoria (la curva, por la diferencia entre cara y trayectoria) y el centrado del impacto ([TrackMan](https://www.trackman.com/blog/face-to-path), **(snippet)**). **Nada de eso se ve en un video de celular** por blur y resolución.
- Las relaciones falla corporal → vuelo son sabiduría de instructor (TPI): over the top → pull o slice; pérdida de postura → block o hook; early extension → pérdida de consistencia y potencia; casting → impacto débil; chicken wing → pérdida de compresión.
- La única evidencia estadística encontrada es CaddieSet: 22 métricas de pose 2D predicen "recto / no recto" con 0,89 de exactitud pero 0,79 de AUC, y el eje de spin con 0,69, sobre 8 golfistas **(snippet)**. La pose explica algo de la dirección, lejos de explicarla toda.
- Gulgin et al. 2014: los golfistas que no pasan el overhead deep squat o el single-leg balance tienen 2 a 3 veces más probabilidad de early extension ([PubMed](https://pubmed.ncbi.nlm.nih.gov/24476744/), **(snippet)**). Muchas fallas son limitación física, no técnica; una recomendación real a veces es "hacé este ejercicio de movilidad", no "cambiá el swing".

Consecuencia para el informe: la forma "en los N golpes con X, M salieron slice" es lo máximo que sostienen los datos, y solo si el golfista marcó el resultado (§3).

### 5.6 Qué evidencia hay de que esto mejore a un amateur

- Video más instructor mejora, con retardo: Guadagnoli, Holcomb y Davis 2002 (30 golfistas, 4 sesiones): en el post-test inmediato los grupos instruidos rindieron peor que el autoguiado; a las dos semanas, mejor, y el de video mejor de todos ([PubMed](https://pubmed.ncbi.nlm.nih.gov/12190281/), **(snippet)**).
- Video autograbado sin guía: una revisión sistemática de 2022 (24 estudios, 895 participantes) cita un descenso de rendimiento en amateurs hábiles que se filmaban solos enfocándose en un aspecto, y "sin impacto real en el aprendizaje" ([ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S1469029222001455), **(snippet)**).
- **No existe un ensayo controlado que muestre que el feedback automático por pose baje el hándicap de amateurs.** Lo que hay son prototipos evaluados por similitud con pros o por calificación de expertos.

Conclusión honesta: la evidencia sostiene "video revisado con criterio mejora a mediano plazo"; no sostiene "una app que te dice tu falla te baja el hándicap", y hay señal de que el feedback sin guía empeora a corto plazo. El informe tiene que ser material para revisar, idealmente con un instructor, no una orden.

## 6. Productos que ya hacen algo de esto

Sitios oficiales bloqueados por el proxy; datos por **(snippet)** de la página oficial, o **(terciaria)** cuando se indica. Precios en dólares al 2026-09-30.

| Producto | Qué hace | Detecta el swing solo | 3D de un video | Precio | En cancha |
|---|---|---|---|---|---|
| [Sportsbox AI 3DGolf](https://help.sportsbox.ai/how-do-i-set-up-my-camera-to-record-a-session) | 3D desde un video de celular; giro, sway, inclinación, X-factor; comparación con el tour | Sí, con guía por voz | Sí (frente y atrás) | 9,16/mes; 5 swings gratis por mes | No lo documenta; trípode a la cintura, ≤3,7 m |
| [OnForm](https://onform.com/blog/onform-launches-fast-reliable-and-accessible-markerless-3d-motion-capture-for-golf/) | 3D sin marcadores con un solo iPhone de frente, 120/240 fps, iOS 18+, offline; publica una "model card" de precisión | Sí, recorta cada swing en su clip | Sí (frente) | 9,99 o 14,99/mes | Práctica |
| [Swing Profile](https://www.swingprofile.com/swing-analysis-software/) | Auto-detección y grabación manos libres, replay en cámara lenta tras cada golpe, recorte a 2 s, detección de sway de cabeza y columna | Sí | No | 7,99/mes | Range, teléfono en soporte |
| [V1 Golf](https://v1sports.com/athletes/buy-v1-golf-app/) | Captura, líneas, comparación lado a lado, envío al coach | Por voz ("V1 Start") | No | 9,99/mes | Práctica |
| [18Birdies AI Coach](https://help.18birdies.com/article/593-ai-swing-analyzer) | Compara posiciones clave con pros, nota 0–10, tempo, estabilidad, impacto | No (grabación manual) | No | 99/año | El swing es de práctica |
| [GolfFix](https://www.golffix.io/en) | Detecta y graba el swing, secuencia de 8 pasos, más de 45 fallas, métricas por evento | Sí | No | ~100/año **(sin verificar)** | Práctica |
| [HackMotion](https://hackmotion.com/products/) | Sensor de muñeca a 800 fps; flexión y extensión; feedback sonoro | Sensor | No es video | 345 a 985 | Práctica; con feedback en competencia viola la 4.3a(6) |
| [deWiz](https://us.dewizgolf.com/pages/driver-club-head-speed-new) | Wearable de muñeca: tempo, transición, largo del backswing; estímulo eléctrico al salir del rango | Sensor | No es video | 699 (2023) | Lo venden para comparar range y cancha |
| [Golfshot](https://golfshot.com/blog/auto-shot-tracking-with-apple-watch-is-here) | GPS, score, **detección automática de golpes con el Apple Watch** por machine learning, sin sensores | Detecta golpes, no video | No | inconsistente entre fuentes **(sin verificar)** | **Sí** |
| [Arccos](https://www.arccosgolf.com/products/smart-sensors) | 14 sensores en el grip más teléfono o Watch; cada golpe, Strokes Gained | Detecta golpes | No | 249,99 más 199,99/año | **Sí** |
| [Shot Scope](https://shotscope.com/us/shop/products/golf-gps-watches/v5/) | Reloj GPS y 16 tags en los grips, sin suscripción | Detecta golpes | No | 249,99 | **Sí** |
| [SwingVision](https://swing.vision/faq) (tenis) | Un solo iPhone, detección de cada golpe en tiempo real, estadísticas por sesión, **Apple Watch para arrancar**, soporte propio | Sí | No | 179,99/año | En el partido real |
| Zepp | Sensor en el guante | | | | **Descontinuado** (Garmin, 2019–2021) **(terciaria)** |
| Uneekor EYE MINI, Foresight GC3 | Launch monitors de cámaras (pelota y palo), no video corporal | | | 2.999 y 6.999 | Indoor y range |

Lo que se aprende del mercado:

- **Nadie documenta "en cancha, cada golpe, en video".** Los productos de video asumen trípode en el range y auto-detección para no tocar el teléfono. Los que trabajan en cancha detectan el golpe con el reloj o con sensores en el grip y no graban. Tampoco se encontró un producto con clip para bolsa o carro documentado oficialmente **(sin verificar)**.
- La detección automática del swing por visión es estándar (Sportsbox, OnForm, Swing Profile, GolfFix): es un problema resuelto por la industria, no investigación.
- Los dos que hacen 3D desde un solo video (Sportsbox, OnForm) lo hacen con modelo propio, encuadre estricto, trípode a altura fija y 120–240 fps, y publican su precisión. Eso marca el techo de lo prometible en 3D y a qué costo.
- El disparador con Apple Watch (SwingVision para arrancar; Golfshot para detectar golpes por machine learning sin sensores) confirma que el camino de §4.3 es el que usa la industria.
- Precio de referencia: 8 a 15 dólares por mes es lo que cobra un análisis de swing por app; el costo de Claude por partida (§8.3) entra cómodo.

## 7. Reglas de golf: grabar sí, mirar después

Reglas de Golf 2023 de USGA y R&A, Regla 4.3 (uso de equipamiento). Los PDF oficiales están bloqueados; texto por **(snippet)** de usga.org, randa.org y la traducción de la AAG.

- **Grabar está permitido explícitamente.** La Regla 4.3a(3), "Information Gathered Before or During Round", permite "Recording (for use after the round) playing or physiological information from the round (such as club distance, playing statistics or heart rate)" y prohíbe "Processing or interpreting playing information from the round" ([R&A, Regla 4](https://www.randa.org/en/rog/the-rules-of-golf/rule-4)). National Club Golfer, citando a la R&A, lo aplica al video del swing **(terciaria)**.
- **Mirar el video durante la vuelta, no.** La Regla 4.3a(4), "Audio and Video", prohíbe "Viewing video showing play of the player or other players during the competition that helps the player in choosing a club, making a stroke, or deciding how to play during the round", y también "Listening to music or other audio to eliminate distractions or to help with swing tempo" ([interpretaciones de la USGA](https://www.usga.org/content/usga/home-page/custom-search-pages/rules/2019-golf-rules-and-interpretations/rule-4-interpretations.html)). El Comité puede además prohibir estos dispositivos por Regla Local.
- **Ayudas de swing, no.** La Regla 4.3a(6) prohíbe cualquier ayuda que dé ventaja "in preparing for or making a stroke (such as help with swing plane, grip, alignment, ball position or posture)". Un sensor de muñeca o de tempo con feedback en la vuelta cae acá.
- **Recomendaciones de palo o línea basadas en la vuelta, no.** La Regla 4.3a(1) permite distancia y dirección pero prohíbe interpretarlas, por ejemplo "club selection based on the location of the player's ball".
- **Penalidad**: primera infracción, penalidad general (dos golpes, o pérdida del hoyo en match play); segunda, descalificación.
- **WHS, Reglas de Hándicap 2.1b**: la tarjeta es aceptable si se jugó por las Reglas de Golf; si hubo descalificación sin ventaja significativa en el score, el resultado sigue siendo aceptable para hándicap; lo decide el Comité ([USGA](https://www.usga.org/handicapping/roh/Content/rules/2%201b%20Played%20by%20the%20Rules%20of%20Golf.htm)). No hay mención específica a dispositivos de swing.

Consecuencias de diseño, ya incorporadas al flujo de §3:

1. Grabar sí, mostrar después: la app no muestra video, métricas, tempo ni consejos hasta que la vuelta termina. Para evitar la discusión de "processing", el corte de clips y la pose pueden calcularse después de firmar, no durante.
2. Nada de metrónomo ni audio de tempo.
3. Si más adelante se agrega GPS, distancias sí, recomendación de palo no.
4. En vueltas sociales sin tarjeta para hándicap nada de esto aplica y se puede mostrar todo. Como el grupo usa las partidas para el WHS, el default es el restrictivo.

## 8. El análisis con Claude

Todo lo de esta sección sale de la documentación oficial de Anthropic (accedida el 2026-09-30) y del código del repo.

### 8.1 Qué acepta la API

- **Video, no.** Los bloques `image` aceptan base64, URL o `file_id`; formatos JPEG, PNG, GIF y WebP ("animations are unsupported, and only the first frame is used"). PDF como `document`. Fuente: [Vision](https://platform.claude.com/docs/en/build-with-claude/vision.md). Conclusión: el video se procesa en el teléfono y a Claude llegan frames, que es además lo que queremos: elegir nosotros qué instantes ve.
- Límites por request: **600 imágenes** en modelos con contexto de 1M (100 en Haiku 4.5); 10 MB por imagen; 32 MB por request; con más de 20 imágenes rige un tope de 2000 px por lado. Claude no recibe metadatos EXIF.
- Costo por imagen: parches de 28×28 px, ⌈ancho/28⌉ × ⌈alto/28⌉ tokens. Un frame de **1024×576 = 777 tokens** y no se redimensiona en ningún tier. Los modelos 4.7 y posteriores tienen tier de alta resolución (lado largo 2576 px, 4784 tokens); los anteriores, 1568 px y 1568 tokens. La fórmula vieja (ancho × alto / 750) ya no aparece en la doc.
- [Files API](https://platform.claude.com/docs/en/build-with-claude/files.md): subir una vez y referenciar por `file_id`; 500 MB por archivo, 1 TB por organización, subir es gratis, expiración configurable (1 h a 90 días). Advertencia que aplica: los `file_id` son visibles en todo el workspace; nunca aceptarlos del cliente.
- [Message Batches](https://platform.claude.com/docs/en/build-with-claude/batch-processing.md): **50 % de descuento**, "most batches completing within 1 hour", tope de 24 h, hasta 100.000 requests o 256 MB por lote, resultados 29 días, soporta visión y salida estructurada ("almost any request"; salida estructurada dentro de un batch **(sin verificar)** con un request real). Caching en batch es best-effort: usar TTL de 1 h.
- [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md): mínimo cacheable 512 tokens en Sonnet 5.5 y Opus 5.5, 1.024 en Sonnet 5, 4.096 en Haiku 4.5. Lectura al 10 % del precio de entrada. El system prompt con el catálogo de fallas y los rangos de referencia va fijo, primero y cacheado.
- [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md): `output_config.format` con JSON Schema garantiza JSON válido. El esquema **no admite `minimum`/`maximum`** ni `minLength`/`maxLength`: la confianza va como enum (baja/media/alta) y los rangos se validan en código. En Sonnet 5.5 y Opus 5.5 el `tool_choice` forzado devuelve 400; para obligar JSON se usa `output_config.format`, que es lo que Galf ya hace en `src/lib/vision/scorecard.ts`.
- Limitaciones que la doc de visión declara y que definen el diseño: "Claude might hallucinate or make mistakes when interpreting low-quality, rotated, or very small images", "coordinate and localization outputs are approximate", "Counting: … might not always be precisely accurate". Medir un ángulo y contar en cuántos de 100 swings pasó algo son exactamente esas dos cosas: no se le piden al modelo.

### 8.2 Modelos y precios (por millón de tokens, [pricing](https://platform.claude.com/docs/en/about-claude/pricing.md))

| Modelo | Input | Output | Batch in/out | Nota |
|---|---|---|---|---|
| Haiku 4.5 | $1 | $5 | $0,50 / $2,50 | tier estándar, 100 imágenes por request, retiro posible "not sooner than October 15, 2026": no construir sobre él |
| Sonnet 5 (Galf hoy) | $2 | $10 | $1 / $5 | marcado **legacy** en la doc; retiro no antes de 2027-06-30 |
| Sonnet 5.5 | $2 | $10 | $1 / $5 | mismo precio que Sonnet 5, vigente |
| Opus 5.5 | $4 | $20 | $2 / $10 | el que el skill `claude-api` recomienda por defecto |
| Fable 5.1 | $10 | $50 | $5 / $25 | el más capaz; exige retención de 30 días |

Recomendación de la investigación: pasar `GALF_VISION_MODEL` a `claude-sonnet-5-5` (mismo costo, no legacy) y decidir entre Sonnet 5.5 y Opus 5.5 para la clasificación por swing con el set de evaluación, no por intuición.

### 8.3 Cuánto cuesta una partida

Supuestos explícitos: 100 swings, 8 frames de 1024×576 por swing (777 tokens cada uno), ~600 tokens de métricas y texto por swing, system prompt de ~3.000 tokens cacheado, ~300 tokens de salida por swing, una síntesis final de ~9.000 tokens de entrada y ~1.500 de salida.

| Modelo | En línea | Por Batches |
|---|---|---|
| Haiku 4.5 | US$ 0,88 | US$ 0,44 |
| Sonnet 5 / 5.5 | **US$ 1,76** | **US$ 0,88** |
| Opus 5.5 | US$ 3,47 | US$ 1,73 |
| Fable 5.1 | US$ 8,59 | US$ 4,30 |

Con 16 frames por swing se duplica. El 77 % del costo son las imágenes; la síntesis final cuesta centavos aunque se haga con Opus 5.5 (≈ US$ 0,07). Un grupo de cinco que juegue una partida por semana gasta **US$ 4 a 8 por mes** con Sonnet y Batches. Un mosaico de 8 miniaturas en una sola imagen de 2048×576 cuesta 1.554 tokens contra 6.216 (4 veces más barato) pero deja cada fase en 512×288: es un experimento para el set de evaluación, no una decisión.

### 8.4 Otros proveedores, para no dejar el hueco

- Gemini acepta video nativo: muestrea a 1 fps, cobra por frame (66 o 258 tokens según resolución) más audio, hasta 1 h por request. **(sin verificar)**: `ai.google.dev` está bloqueado por el proxy; los números son de extractos del buscador. Un clip de 3 s costaría lo que un frame de Claude, pero sin control de qué instantes ve el modelo ni de la fase del swing.
- OpenAI: según el cookbook oficial (bloqueado, **(sin verificar)**), el modelo "doesn't take videos as input directly"; se extraen frames y se mandan como imágenes. Mismo patrón que con Claude.

## 9. De 100 swings a "en 15 golpes hiciste X": la agregación

Diseño propio, fundamentado en las limitaciones que Anthropic declara (§8.1) y en cómo Galf ya trabaja. Lo validaría el set de evaluación de §9.4.

### 9.1 Pipeline

```
teléfono                              servidor (Galf)                          Claude
────────                              ───────────────                          ──────
(a) pose por frame → métricas         (c) 1 request por swing (Batches)   →   clasifica fallas visibles
    determinísticas + fases               system fijo y cacheado:               → JSON cerrado
(b) 8 frames clave (JPEG 1024×576)        catálogo de fallas + referencias      (falla, fase, vista,
    + métricas + vista + calidad          user: frames etiquetados + métricas   confianza, evidencia)
    ↓ subida al firmar                (d) agregación estadística (TS, sin LLM)
                                          sobre ~100 swings + resultado del golpe
                                      (e) 1 request de síntesis (sincrónico) →   redacta en rioplatense
                                          entrada: SOLO el agregado                citando N y métrica
                                      (f) validación cruzada del JSON contra el agregado → pantalla
```

- **(a) y (b)**, en el teléfono: las métricas de §4.5 y ocho frames fijos por fase, siempre los mismos ocho, etiquetados ("Frame 3: top del backswing"), recortados al golfista con margen y en JPEG sin compresión fuerte (la doc avisa que "heavy JPEG compression" degrada el modelo).
- **(c)**, Claude por swing: el system prompt cacheado trae el catálogo cerrado de fallas (10–20 códigos, con qué se ve, en qué fase y en qué vista), los rangos de referencia y reglas duras: "reportá solo lo que se ve en estos frames o dicen estos números; si la vista no permite evaluar una falla, ponela en `no_evaluable`; nada fuera del catálogo". Salida con `zodOutputFormat`:

  ```
  { vista: "frente" | "atras" | "otra",
    calidad: "buena" | "regular" | "mala",
    fallas: [{ codigo: <enum>, fase: <enum>, confianza: "baja" | "media" | "alta",
               evidencia: { frames: number[], metrica?: string, valor?: number }, nota: string }],
    no_evaluable: <enum[]> }
  ```

  Después del parse, el código valida: cada frame citado existe, cada métrica citada fue enviada, y una falla sin evidencia se descarta. Así "sin inventar" es verificable y no un pedido en el prompt.
- **(d)**, agregación en TypeScript puro y testeado, como el motor WHS de `src/lib/handicap/`: por falla, cantidad de swings donde aparece sobre el total de swings **evaluables** (misma vista, calidad al menos regular), confianza media, desglose por palo y por tramo de hoyos (1–6, 7–12, 13–18) para ver la deriva por cansancio; por métrica, mediana, rango intercuartil y diferencia entre el primer y el último tercio. Cruce con el resultado del golpe: para cada falla, proporción de slice/hook/tope/gordo con y sin la falla, con N en cada rama.
- **(e)**, síntesis: una llamada corta sin imágenes, entrada = el agregado, salida con esquema que obliga a citar `n_swings`, `n_evaluables`, la métrica de soporte y la relación con el resultado si la hay.
- **(f)**: antes de mostrar, el servidor compara cada número del texto con el agregado; si no coincide, ese hallazgo se descarta o se regenera. **Los números que ve el golfista salen siempre del agregado; el texto solo los envuelve.**

### 9.2 Por qué separar medir de narrar

Un modelo que ve 100 swings juntos y "saca conclusiones" produce un texto plausible que no se puede auditar. Con el pipeline de arriba cada frase se rastrea a un conteo y a swings concretos (los `evidencia.frames`), y la app puede mostrar "ver los 15 golpes". Además, 100 requests chicos e independientes se batchean y cachean; uno gigante no. La versión del prompt y del catálogo se guarda con cada lectura, así un cambio de prompt se recorre sobre los mismos frames y se compara.

### 9.3 Cuándo la app tiene derecho a decir algo

Valores iniciales, dimensionados para los ~40 swings completos de una vuelta (§2.1) y a ajustar con el set de evaluación: reportar la falla F solo si (1) aparece en **≥ 10 swings evaluables o en ≥ 25 %** de ellos, lo que sea mayor; (2) en **≥ 60 %** de esos casos la confianza es alta; (3) la precisión de F en el set de evaluación es **≥ 0,7**. Con menos de 20 swings evaluables en una vista, el informe dice "no alcanza para afirmar nada de frente" en lugar de estirar, y ofrece acumular con la próxima partida filmada desde la misma vista. La relación con el resultado de la pelota se reporta solo con ≥ 10 golpes en cada rama de la comparación, y siempre en forma observacional ("en los 15 golpes con X, 11 salieron slice; en los 23 sin X, 4"), nunca causal.

### 9.4 El set de evaluación

150–300 swings de varios golfistas del grupo, en las dos vistas, etiquetados por un instructor con el mismo catálogo cerrado (código, fase, o "no evaluable desde esta vista"); dos instructores en un subconjunto para conocer el techo de acuerdo humano. Métricas: precisión y recall por falla, kappa global, y calibración de la confianza (que "alta" acierte más que "media"). Para las métricas numéricas del teléfono: error contra medición manual en un subconjunto. El skill `claude-api` del repo trae `build-eval` y `hillclimb` para correr el set y ajustar el prompt, y para decidir 8 vs 16 frames, 1024×576 vs 640×360, mosaico sí o no, y el modelo. Hasta tener el set, el informe se marca "provisional" en la interfaz.

### 9.5 Qué no prometer

- **3D desde 2D**: los ángulos son proyecciones; solo se comparan swings de la misma vista y, mejor, de la misma partida; los números se reportan como cambio relativo contra la propia mediana del golfista, no como grados absolutos.
- **Causalidad**: la forma es siempre "en los N golpes con X, M salieron así".
- **Comparación con "el pro"**: sin la misma vista, distancia y encuadre no tiene sentido.
- **Diagnóstico médico**: el catálogo es de forma del swing, no de lesiones.

## 10. Integración con Galf

### 10.1 Lo que ya existe y se reutiliza

- Cliente y modelo: `src/lib/vision/client.ts` (SDK oficial `@anthropic-ai/sdk`, key en Vercel, `GALF_VISION_MODEL` con default `claude-sonnet-5`).
- Llamada con imagen y salida estructurada: `src/lib/vision/scorecard.ts` usa `messages.parse` con `zodOutputFormat`, imagen antes del texto, chequeo de `refusal` y de `parsed_output`. Es exactamente el patrón para clasificar un swing.
- Orquestación: `src/app/(app)/partidas/[id]/photo-actions.ts` son Server Actions (no hay `src/app/api/`): subir primero al bucket privado, analizar después, guardar la salida cruda en `round_photo_extractions` (append-only, con `model`), escribir golpes solo tras confirmación y nunca sobre tarjetas firmadas. No hay reintentos propios (el SDK reintenta 2 veces) ni `maxDuration` configurado.
- Lo nuevo: `client.messages.batches.*` (no usado en el repo), `client.files.upload` si se usa Files API, y un módulo puro `src/lib/swing/` con la agregación y sus tests.

### 10.2 Vocabulario y entidades propuestas (conceptual, sin SQL)

Con el formato de `CONTEXT.md` (término rioplatense, nombre en código, qué evitar) y las convenciones de `docs/db-design.md` (auditoría y baja lógica en negocio; append-only en eventos; índices únicos parciales; FKs `restrict`):

- **Swing** (`Swing`): un golpe filmado de un golfista en un hoyo de una partida. Pertenece a la **Tarjeta** (la partida tiene varios golfistas) y al Hoyo por `hole_id` + `position`, con un número de orden dentro del hoyo. Tiene vista, palo, métricas, frames y resultado; el video es opcional. *Evitar*: tiro, golpe a secas ("Golpes" ya es la cantidad por hoyo).
- **Resultado del golpe** (`ShotOutcome`): cómo salió la pelota, marcado con un toque: derecho, slice, hook, tope, gordo, otro. Corregible.
- **Lectura de swing** (`SwingAnalysis`): la salida cruda de Claude para un Swing (append-only, como `round_photo_extractions`).
- **Informe de swing** (`SwingReport`): la síntesis de una Tarjeta a partir de sus Swings: agregado y texto. Regenerar es agregar otro; vale el último listo (misma idea que las firmas). *Evitar*: análisis, reporte.

| Tabla | Tipo | Columnas clave | Reglas |
|---|---|---|---|
| `swings` | negocio | `scorecard_id`, `hole_id`, `position`, `sequence_in_hole`, `club`, `view` (frente/atrás/otra), `captured_at`, `video_storage_path` (nulo si no se sube), `frames_storage_prefix`, `metrics jsonb`, `metrics_version`, `quality jsonb`, `outcome`, `outcome_source` (reloj/teléfono/inferido) | único parcial por tarjeta, posición y orden; misma FK compuesta hoyo/versión que `hole_scores`; no se escribe sobre tarjeta firmada; cantidad de swings por hoyo ≤ golpes del hoyo |
| `swing_analyses` | evento | `swing_id`, `model`, `prompt_version`, `batch_id`, `custom_id`, `raw_output jsonb`, `usage jsonb` | append-only |
| `swing_reports` | evento | `scorecard_id`, `status` (pendiente/en proceso/listo/fallido), `batch_id`, `model_classify`, `model_synthesis`, `prompt_version`, `aggregate jsonb`, `narrative jsonb`, `swings_count` | append-only; vigente = último `listo` |

RLS como `hole_scores` (participantes y quien comparte grupo, ADR-0002), con una decisión pendiente del dueño: ¿el video y el informe los ve el grupo o solo el propio golfista? Propuesta: métricas e informe como la tarjeta (grupo); video solo el dueño, con un interruptor. Buckets privados `swing-videos` y `swing-frames` con ruta `<scorecard_id>/<swing_id>/…` para que las políticas se resuelvan con `storage.foldername`, como hoy.

### 10.3 Almacenamiento: frames sí, video no

- Supabase (docs oficiales vía el conector, porque `supabase.com` está bloqueado): archivo máximo 50 MB en Free y hasta 500 GB en Pro; almacenamiento incluido **1 GB en Free y 100 GB en Pro**, exceso a US$ 0,0213 por GB-mes; egress 5 GB + 5 GB en Free y 250 GB + 250 GB en Pro, exceso a US$ 0,09/GB ([storage pricing](https://supabase.com/docs/guides/storage/pricing), [egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress)).
- Cien clips de 3 s en HEVC 1080p pesan, **estimado** (Apple no publica bitrate; supuesto 8–12 Mbit/s), **300 a 450 MB por partida**. En Free no entran ni dos partidas. Ocho frames JPEG de 1024×576 más las métricas pesan **~1 MB por swing, ~100 MB por partida**.
- Recomendación: el video completo se queda en el iPhone (que es donde el golfista igual lo va a mirar); al servidor suben frames y métricas; los clips de los 5–10 swings que el informe cita como evidencia se suben después del análisis, a pedido.

### 10.4 Dónde corre Claude

- **Message Batches, disparado desde una Server Action al firmar** (recomendado): la acción arma 100 requests (`custom_id` = id del swing, frames por `file_id` o base64, system cacheado a 1 h, esquema de salida), llama `batches.create`, guarda `batch_id` en `swing_reports` con estado "en proceso" y vuelve en segundos. Un cron (Vercel Cron o `pg_cron` + `pg_net`) consulta `batches.retrieve` cada 5–10 minutos; al terminar, baja los resultados, escribe `swing_analyses`, agrega, sintetiza con una llamada sincrónica y marca "listo". La notificación "te llegó el informe" reutiliza la que el roadmap ya tiene pendiente para "te cargaron golpes".
- Server Action sincrónica con 100 llamadas: frágil (un 429 a mitad obliga a rehacer todo) y sin `maxDuration` verificado (`vercel.com` bloqueado; la doc del conector solo muestra ejemplos de `maxDuration = 1800`). Sirve para una sola llamada corta: la síntesis.
- Edge Function de Supabase: 2 s de CPU por request y sin `sharp` ([límites](https://supabase.com/docs/guides/functions/limits)); no aporta nada que la Server Action no haga con la misma key.

## 11. Validación 1 (2026-10-02): de una grabación a movimiento, fases y métricas

Pregunta del dueño: dado un video de un swing (vista lateral), ¿podemos usar un modelo que detecte los movimientos y la calidad del swing? Prototipo descartable en `prototypes/swing-lab/` (Python; README con cómo correrlo en una Mac con un video propio), corrido en esta sesión sobre el único video de golf con licencia conocida y accesible desde acá: `test_video.mp4` del repo de GolfDB (354×492, 30 fps, 8,8 s, 264 frames, un golfista amateur, cámara en diagonal entre "de frente" y "desde atrás"). No se encontró ningún video de perfil (down-the-line) de libre acceso; CaddieSet publica métricas, no videos.

### 11.1 Qué se corrió

- **Pose**: MediaPipe Pose Landmarker 1.0.1 (modelo heavy, Apache 2.0), 33 puntos por frame con visibilidad. Es el equivalente abierto de Vision de Apple (19 puntos): todos los puntos que usa este prototipo (nariz, hombros, codos, muñecas, caderas, rodillas, tobillos) existen en Vision, así que el port a Swift no pierde nada de lo validado acá.
- **Fases**: heurística propia sobre la trayectoria de las manos (punto medio de las muñecas), sin modelo entrenado: el pico de velocidad marca el downswing; el impacto es el punto más bajo de las manos en los 0,4 s siguientes; el top, el punto más alto en los 1,5 s anteriores (y si hay pausa, el último frame quieto antes de bajar); el address, el último frame quieto con las manos por debajo de la cadera antes del takeaway; el finish, el primer tramo quieto después del impacto; las fases intermedias, por cruces de altura (manos a la altura de la cadera = toe-up y mid-follow-through; muñeca a la altura del hombro = mid-backswing y mid-downswing).
- **Segunda opinión**: SwingNet (el modelo de GolfDB, MobileNetV2 + LSTM bidireccional) con los pesos originales de McNally, encontrados en un espejo de Git LFS en GitHub (Google Drive está bloqueado en la sesión; mismo tamaño en bytes que el archivo del autor; licencia CC BY-NC 4.0, uso no comercial, solo para esta validación), portado a CPU en `swingnet.py`.
- **Vista**: detectada por el ancho proyectado de hombros y caderas respecto del largo del torso en address (≥ 0,45 frente, ≤ 0,25 atrás, en el medio diagonal).
- **Métricas**: las de §4.5, por vista, más la calidad del clip.

### 11.2 Resultado

| Qué | Resultado |
|---|---|
| Pose detectada | 264 de 264 frames; visibilidad media 0,80 en los 12 puntos centrales; cuerpo entero en cuadro en todos los frames |
| Tiempo de proceso | 22 s para 8,8 s de video en CPU (4 núcleos, sin GPU): ~2,5× tiempo real con el modelo heavy |
| Vista detectada | diagonal (ratio 0,34): la cámara está entre el frente y el perfil |
| Fases (frame) | address 84 · toe-up 87 · mid-backswing 101 · top 121 · mid-downswing 130 · impacto 140 · mid-follow-through 146 · finish 176 |
| Tempo | backswing 1,24 s (37 frames, con una pausa de ~0,3 s en el top), downswing 0,63 s (19 frames): **1,95:1** (pros en GolfDB: 3,4:1 y el downswing son 8 frames) |
| Cabeza | se aleja del objetivo 0,15 torsos en el top y vuelve a 0,07 en el impacto |
| Tronco | inclinación 31° en address, 30° en el top, 27° en el impacto (pierde 4°) |
| Rodillas | flexión 134° / 148° en address (izquierda / derecha) |
| Caderas | sway 0,06 torsos en el top; sin stance de referencia (los tobillos se superponen en la diagonal) |
| Brazo adelantado y giro aparente | calculados pero marcados "baja confianza": en diagonal el brazo adelantado se confunde y el ancho proyectado no mide giro |
| SwingNet | pendiente: al cerrar este commit PyTorch todavía se estaba instalando (los wheels de PyPI traen CUDA, varios GB); `analyze.py --swingnet` queda listo y la comparación se agrega en el commit siguiente |

Los ocho frames clave con el esqueleto están en `prototypes/swing-lab/out/golfdb_test_video/` (no se commitean; se regeneran con un comando). A ojo, cada fase cae donde la define GolfDB: el toe-up con la varilla cerca de la horizontal, los mid con el brazo adelantado horizontal, el impacto con la cabeza del palo en la pelota.

### 11.3 Qué aprendimos

1. **La pose de un video de celular a 30 fps alcanza** para seguir el cuerpo entero en todas las fases, incluso en el top, donde los brazos cruzan el tronco. Pregunta respondida: sí se captura el movimiento.
2. **Las 8 fases salen sin modelo entrenado**, solo con la altura y la velocidad de las manos. SwingNet queda como verificación y como plan B; para la app, la heurística es más barata (no hay que portar un modelo a Core ML) y se corrige a mano cuando falla.
3. **La vista manda.** En diagonal, el stance proyectado mide 4 px y el brazo adelantado se identifica mal. Las métricas de frente y de perfil solo valen en su vista; el detector de vista existe justamente para rechazar o avisar cuando el encuadre no es limpio. Para el dueño: filmar de perfil limpio (cámara detrás de las manos, mirando al objetivo) o de frente limpio, nunca en diagonal.
4. **30 fps es poco.** En este amateur el downswing son 19 frames; en un pro serían 8. Para el impacto y el tempo, 120 o 240 fps.
5. **Lo que se mide es 2D y relativo**: inclinaciones en grados proyectados y desplazamientos en largos de torso. Sirve para comparar swings del mismo golfista desde la misma vista, que es lo que el informe de §9 necesita.

### 11.4 Qué falta para cerrar esta validación

- Un video de perfil del dueño (y uno de frente), 120 o 240 fps, cámara quieta: correr el prototipo y mirar si las fases y las métricas de perfil (early extension, pérdida de postura, over the top) salen razonables. Es lo único que esta sesión no pudo hacer: no hay ningún video de perfil accesible.
- Etiquetas humanas de las fases en 10–20 swings, para medir la heurística con el mismo criterio que GolfDB (frame correcto ± 1 a 30 fps).
- Probar la heurística con swings de práctica antes del real, con un zurdo y con clips sin pausa en el top.

## 12. Plan por etapas

Cada etapa tiene un criterio de salida medible. Ninguna necesita cambios en la base de Galf hasta la E3.

| Etapa | Qué se construye | Dónde se prueba | Criterio de salida |
|---|---|---|---|
| **E0 — Prototipo en el range** (1–2 semanas de trabajo) | App Swift mínima: sesión a 1080p240 con trípode, grabación continua, corte por audio del impacto, Vision 2D por clip, las métricas de §4.5, los 8 frames por fase (por velocidad de muñeca, sin SwingNet). Todo se queda en el teléfono | Driving range, 100 swings en una sesión, vista fija | ≥ 90 % de los swings cortados solos; métricas de tempo y desplazamiento de cabeza con error visible tolerable contra revisión manual de 20 clips |
| **E1 — Detección robusta** | Action Classifier entrenado con ≥ 50 clips por clase del grupo; Watch con `CMBatchedSensorManager` como segunda señal; SwingNet en Core ML si las fases por velocidad no alcanzan | Range y primeros hoyos de una partida | Fases correctas en ≥ 80 % de los clips de un set de 100 revisado a mano |
| **E2 — Informe** | Catálogo cerrado con las 7 fallas de TPI medibles en 2D más tempo (§5.3), prompt de clasificación por swing con `zodOutputFormat`, agregación en `src/lib/swing/` con tests (CaddieSet sirve para probarla con datos reales y etiquetados), síntesis y validación cruzada; set de evaluación etiquetado por un instructor | Sobre las sesiones de E0 y E1 | Precisión ≥ 0,7 por falla reportada; el instructor confirma que los 3 hallazgos del informe son los que diría |
| **E3 — En cancha con Galf** | Login con Google en la app Swift, Swing atado a la Tarjeta y al Hoyo, resultado del golpe con un toque, subida de frames y métricas al firmar, Batches y cron en Galf, pantalla del informe en la PWA | Una partida real del dueño | El dueño filma ≥ 30 de sus ~40 swings completos sin que la app se le vuelva una carga; el informe llega antes del día siguiente |

Lo que no está en el plan a propósito: 3D, comparación con pros, análisis de putts, análisis en vivo entre golpe y golpe (lo prohíben las reglas, §7).

## 13. Riesgos y trampas

- **Quién apoya el teléfono.** Es el riesgo número uno y solo se despeja jugando una partida con el prototipo. Si resulta insoportable, el plan B es filmar solo las salidas (tee de cada hoyo, ~14 swings con driver o madera por vuelta) y usar el range para el resto.
- **"100 swings" son 40.** Con ~40 swings completos por vuelta, una partida puede no alcanzar para una afirmación con respaldo en una vista; el informe tiene que poder acumular partidas.
- **Feedback sin guía.** La literatura muestra que el video autograbado sin criterio puede empeorar a corto plazo. El informe se presenta como material para revisar, no como orden, y conviene que un instructor lo vea al menos las primeras veces.
- **Prometer 3D desde 2D.** Un ángulo proyectado cambia con la posición de la cámara. Solo se comparan swings de la misma vista y se habla en términos relativos.
- **Que Claude cuente o mida.** La doc lo dice: cuenta y localiza de forma aproximada. Por eso mide el teléfono, agrega el servidor y Claude solo clasifica y redacta.
- **Correlación vendida como causa.** "X te hace slice" no sale de 100 swings de una persona; sale "en los golpes con X, más slice", y se dice así.
- **La postura de address.** Apple marca a las personas inclinadas como caso difícil para Vision; hay que medir la confianza de los puntos en address antes de confiar en las métricas de postura.
- **Pantalla encendida cuatro horas al sol.** Batería y térmica sin cifras oficiales; medir en la primera partida y bajar a 120 fps si hace falta.
- **Mirar el video en la vuelta.** Las reglas lo prohíben para ayudarse a jugar; la app no muestra nada hasta la firma.
- **El set de evaluación se saltea.** Sin él, el informe es una opinión con formato de estadística. Es la etapa que más tienta saltar y la que hace real la recomendación.
- **Haiku 4.5** tiene fecha de retiro posible en dos semanas; **Sonnet 5** ya es legacy. Construir sobre Sonnet 5.5 u Opus 5.5.

## 14. Preguntas para el dueño

1. ~~¿Trípode chico, clip en el carro, o un amigo?~~ El dueño pidió no ocuparse de esto por ahora (2026-10-02).
2. ¿Vista de frente o desde atrás como primera? El dueño respondió "lateral" (2026-10-02). Queda por confirmar cuál de las dos es: **de perfil** (down-the-line: la cámara detrás de las manos mirando al objetivo, el golfista de costado) o **de frente** (face-on: la cámara mira el pecho). El prototipo de §11 acepta las dos y detecta cuál es; de frente se ven sway, giro y brazo adelantado; de perfil, plano, early extension y postura (detalle en §5).
3. ¿Tiene Apple Watch y de qué modelo? Series 8 o Ultra en adelante habilitan el acelerómetro a 800 Hz.
4. ¿Hay un Mac disponible para compilar (Xcode)? Sin Mac no hay app nativa.
5. ¿Está dispuesto a marcar el resultado de cada golpe con un toque? Sin eso no hay "que hace que Y", solo "hacés X seguido".
6. ¿Conoce un instructor que etiquete 150–300 swings? Es el costo real de "recomendaciones REALES".
7. ¿El video y el informe los ve el grupo o solo cada uno?

## 15. Fuentes

Todas accedidas el 2026-09-30. El proxy de la sesión bloquea `apple.com`, `support.apple.com`, `apple.github.io`, `ai.google.dev`, `supabase.com`, `vercel.com`, `webkit.org`, `developer.mozilla.org`, `platform.openai.com`, `developers.openai.com`, `arxiv.org` y sus espejos, `openaccess.thecvf.com`, PubMed, Wikipedia, `web.archive.org`, `apps.apple.com`, `mytpi.com`, `usga.org`, `randa.org`, `aag.org.ar`, `tourtempo.com` y todos los sitios de productos (Sportsbox, HackMotion, V1, OnForm, Swing Profile, Golfshot, 18Birdies, deWiz, Arccos, Shot Scope, SwingVision, GolfFix, Uneekor, Foresight). Donde se pudo se usó el repositorio fuente en GitHub, el conector MCP de documentación o el extracto del buscador, marcado **(snippet)**; un medio en lugar de la primaria queda marcado **(terciaria)**.

### Apple (developer.apple.com, leído por su endpoint JSON, y sesiones WWDC)

- Captura: [AVCaptureDevice.Format](https://developer.apple.com/documentation/avfoundation/avcapturedevice/format), [videoSupportedFrameRateRanges](https://developer.apple.com/documentation/avfoundation/avcapturedevice/format/videosupportedframerateranges), [activeFormat](https://developer.apple.com/documentation/avfoundation/avcapturedevice/activeformat), [activeVideoMinFrameDuration](https://developer.apple.com/documentation/avfoundation/avcapturedevice/activevideominframeduration), [isAutoVideoFrameRateEnabled](https://developer.apple.com/documentation/avfoundation/avcapturedevice/isautovideoframerateenabled), [AVCaptureSession](https://developer.apple.com/documentation/avfoundation/avcapturesession), [AVCaptureMovieFileOutput](https://developer.apple.com/documentation/avfoundation/avcapturemoviefileoutput), [movieFragmentInterval](https://developer.apple.com/documentation/avfoundation/avcapturemoviefileoutput/moviefragmentinterval), [AVCaptureVideoDataOutput](https://developer.apple.com/documentation/avfoundation/avcapturevideodataoutput), [alwaysDiscardsLateVideoFrames](https://developer.apple.com/documentation/avfoundation/avcapturevideodataoutput/alwaysdiscardslatevideoframes), [TN3121](https://developer.apple.com/documentation/technotes/tn3121-selecting-a-pixel-format-for-an-avcapturevideodataoutput), [Recording movies in alternative formats](https://developer.apple.com/documentation/avfoundation/recording-movies-in-alternative-formats), [AVAssetWriter](https://developer.apple.com/documentation/avfoundation/avassetwriter), [preferredOutputSegmentInterval](https://developer.apple.com/documentation/avfoundation/avassetwriter/preferredoutputsegmentinterval), [AVAssetReader](https://developer.apple.com/documentation/avfoundation/avassetreader), [preferredVideoStabilizationMode](https://developer.apple.com/documentation/avfoundation/avcaptureconnection/preferredvideostabilizationmode), [AVCaptureEventInteraction](https://developer.apple.com/documentation/avkit/avcaptureeventinteraction), [AVCaptureControl](https://developer.apple.com/documentation/avfoundation/avcapturecontrol), [WWDC22 Discover advancements in iOS camera capture](https://developer.apple.com/videos/play/wwdc2022/110429/), foros con respuesta de Apple: [21694](https://developer.apple.com/forums/thread/21694), [681431](https://developer.apple.com/forums/thread/681431), [131542](https://developer.apple.com/forums/thread/131542).
- Vision: [VNDetectHumanBodyPoseRequest](https://developer.apple.com/documentation/vision/vndetecthumanbodyposerequest), [JointName 2D](https://developer.apple.com/documentation/vision/vnhumanbodyposeobservation/jointname), [VNRecognizedPoint](https://developer.apple.com/documentation/vision/vnrecognizedpoint), [VNDetectHumanBodyPose3DRequest](https://developer.apple.com/documentation/vision/vndetecthumanbodypose3drequest), [JointName 3D](https://developer.apple.com/documentation/vision/vnhumanbodypose3dobservation/jointname), [bodyHeight](https://developer.apple.com/documentation/vision/vnhumanbodypose3dobservation/bodyheight), [HeightEstimation](https://developer.apple.com/documentation/vision/vnhumanbodypose3dobservation/heightestimation-swift.enum), [Detecting human body poses in 3D](https://developer.apple.com/documentation/vision/detecting-human-body-poses-in-3d-with-vision), [DetectHumanBodyPoseRequest (iOS 18)](https://developer.apple.com/documentation/vision/detecthumanbodyposerequest), [DetectHumanBodyPose3DRequest](https://developer.apple.com/documentation/vision/detecthumanbodypose3drequest), [VNDetectHumanHandPoseRequest](https://developer.apple.com/documentation/vision/vndetecthumanhandposerequest), [VNDetectTrajectoriesRequest](https://developer.apple.com/documentation/vision/vndetecttrajectoriesrequest), [Identifying trajectories in video](https://developer.apple.com/documentation/vision/identifying-trajectories-in-video), [WWDC20 Detect Body and Hand Pose with Vision](https://developer.apple.com/videos/play/wwdc2020/10653/), [WWDC20 Explore the Action & Vision app](https://developer.apple.com/videos/play/wwdc2020/10099/), [WWDC23 Explore 3D body pose](https://developer.apple.com/videos/play/wwdc2023/111241/).
- Create ML y sonido: [MLActionClassifier](https://developer.apple.com/documentation/createml/mlactionclassifier), [Creating an action classifier model](https://developer.apple.com/documentation/createml/creating-an-action-classifier-model), [Gathering training videos](https://developer.apple.com/documentation/createml/gathering-training-videos-for-an-action-classifier), [Detecting human actions in a live video feed](https://developer.apple.com/documentation/createml/detecting-human-actions-in-a-live-video-feed), [WWDC20 Build an Action Classifier](https://developer.apple.com/videos/play/wwdc2020/10043/), [SNClassifySoundRequest](https://developer.apple.com/documentation/soundanalysis/snclassifysoundrequest), [knownClassifications](https://developer.apple.com/documentation/soundanalysis/snclassifysoundrequest/knownclassifications), [windowDuration](https://developer.apple.com/documentation/soundanalysis/snclassifysoundrequest/windowduration), [WWDC21 built-in sound classification](https://developer.apple.com/videos/play/wwdc2021/10036/), [MLSoundClassifier](https://developer.apple.com/documentation/createml/mlsoundclassifier).
- Apple Watch: [CMMotionManager](https://developer.apple.com/documentation/coremotion/cmmotionmanager), [CMBatchedSensorManager](https://developer.apple.com/documentation/coremotion/cmbatchedsensormanager), [WWDC23 What's new in Core Motion](https://developer.apple.com/videos/play/wwdc2023/10179/), [Running workout sessions](https://developer.apple.com/documentation/healthkit/running-workout-sessions), [HKWorkoutActivityType.golf](https://developer.apple.com/documentation/healthkit/hkworkoutactivitytype/golf), [sendMessage](https://developer.apple.com/documentation/watchconnectivity/wcsession/sendmessage(_:replyhandler:errorhandler:)), [isReachable](https://developer.apple.com/documentation/watchconnectivity/wcsession/isreachable), [transferUserInfo](https://developer.apple.com/documentation/watchconnectivity/wcsession/transferuserinfo(_:)), [App Intents](https://developer.apple.com/documentation/appintents), [LockedCameraCapture](https://developer.apple.com/documentation/lockedcameracapture).
- Core ML y límites: [MLComputeUnits](https://developer.apple.com/documentation/coreml/mlcomputeunits), [Requesting authorization to capture and save media](https://developer.apple.com/documentation/avfoundation/requesting-authorization-to-capture-and-save-media), [AVCaptureSession.InterruptionReason](https://developer.apple.com/documentation/avfoundation/avcapturesession/interruptionreason), [isMultitaskingCameraAccessSupported](https://developer.apple.com/documentation/avfoundation/avcapturesession/ismultitaskingcameraaccesssupported), [thermalState](https://developer.apple.com/documentation/foundation/processinfo/thermalstate-swift.property), [PHPhotoLibrary](https://developer.apple.com/documentation/photos/phphotolibrary).
- Distribución: [Apple Developer Program](https://developer.apple.com/programs/), [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview), [Xcode support](https://developer.apple.com/support/xcode/), [Xcode Cloud](https://developer.apple.com/xcode-cloud/).
- Specs de iPhone (bloqueadas, snippet): [iPhone 17 Pro](https://support.apple.com/en-us/125090), [iPhone 17](https://support.apple.com/en-us/125089), [iPhone 16](https://www.apple.com/iphone-16/specs/), [guía de usuario, slo-mo](https://support.apple.com/guide/iphone/change-video-recording-settings-iphc1827d32f/ios).

### coremltools, MediaPipe y Supabase (repos oficiales en GitHub)

- [coremltools releases](https://github.com/apple/coremltools/releases), [convert-pytorch-workflow](https://github.com/apple/coremltools/blob/main/docs-guides/source/convert-pytorch-workflow.md), [model-exporting](https://github.com/apple/coremltools/blob/main/docs-guides/source/model-exporting.md), [ops recurrentes MIL](https://github.com/apple/coremltools/blob/main/coremltools/converters/mil/mil/ops/defs/iOS15/recurrent.py), [frontend torch ops](https://github.com/apple/coremltools/blob/main/coremltools/converters/mil/frontend/torch/ops.py).
- [MediaPipe PoseLandmark](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/python/solutions/pose.py), [doc legacy de Pose](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/pose.md), [podspec iOS](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/ios/MediaPipeTasksVision.podspec.template), [MPPPoseLandmarker.h](https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/ios/vision/pose_landmarker/sources/MPPPoseLandmarker.h), [sample iOS](https://github.com/google-ai-edge/mediapipe-samples/tree/main/examples/pose_landmarker/ios), [licencia](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE).
- [supabase-swift](https://github.com/supabase/supabase-swift), [Package.swift](https://github.com/supabase/supabase-swift/blob/main/Package.swift), [StorageFileApi.swift](https://github.com/supabase/supabase-swift/blob/main/Sources/Storage/StorageFileApi.swift), [auth Google](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/auth/social-login/auth-google.mdx), [file limits](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/storage/uploads/file-limits.mdx), [standard uploads](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/storage/uploads/standard-uploads.mdx); vía conector MCP: [storage pricing](https://supabase.com/docs/guides/storage/pricing), [egress](https://supabase.com/docs/guides/platform/manage-your-usage/egress), [Edge Functions limits](https://supabase.com/docs/guides/functions/limits).

### Anthropic (platform.claude.com)

[Vision](https://platform.claude.com/docs/en/build-with-claude/vision.md), [Coordinates and resizing](https://platform.claude.com/docs/en/build-with-claude/vision-coordinates.md), [Pricing](https://platform.claude.com/docs/en/about-claude/pricing.md), [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview.md), [Sonnet 5](https://platform.claude.com/docs/en/models/sonnet-5/overview.md), [Files API](https://platform.claude.com/docs/en/build-with-claude/files.md), [Batch processing](https://platform.claude.com/docs/en/build-with-claude/batch-processing.md), [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching.md), [Structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md); skill `claude-api` del repo (caché del 2026-09-25). Otros proveedores, solo snippets: [Gemini video understanding](https://ai.google.dev/gemini-api/docs/video-understanding), [OpenAI cookbook de video](https://developers.openai.com/cookbook/examples/gpt_with_vision_for_video_understanding).

### Ciencia del swing, productos y reglas

- Leídas completas en GitHub: [GolfDB](https://github.com/wmcnally/golfdb) (README, `model.py`, `eval.py`, `util.py`, `data/golfDB.pkl`), [CaddieSet](https://github.com/damilab/CaddieSet) (README, LICENSE), [GolfPose](https://github.com/MingHanLee/GolfPose), [MotionBERT](https://github.com/Walter0807/MotionBERT), [VideoPose3D](https://github.com/facebookresearch/VideoPose3D), [WHAM](https://github.com/yohanshin/WHAM), [cs231n-golf](https://github.com/yanmingzhu/cs231n-golf).
- Papers (snippet): [GolfDB, CVPRW 2019](https://openaccess.thecvf.com/content_CVPRW_2019/papers/CVSports/McNally_GolfDB_A_Video_Database_for_Golf_Swing_Sequencing_CVPRW_2019_paper.pdf) / [arXiv 1903.06528](https://arxiv.org/abs/1903.06528), [CaddieSet, arXiv 2508.20491](https://arxiv.org/html/2508.20491v1), [GolfPose 2022, IEEE](https://ieeexplore.ieee.org/document/9859415/), [arXiv 2606.22876](https://arxiv.org/abs/2606.22876), [arXiv 2506.17505](https://arxiv.org/abs/2506.17505), [StreamTinyNet, arXiv 2407.17524](https://arxiv.org/pdf/2407.17524), [CS231n 2025](https://cs231n.stanford.edu/2025/papers/cs231n_final_report__Revised%20-%20Yanming%20Zhu.pdf), [Ingwersen 2023, DTU](https://backend.orbit.dtu.dk/ws/files/320469602/Evaluating_current_state_of_monocular_3D_pose_models_for_golf.pdf), [Grober y Cholewicki 2006](https://arxiv.org/abs/physics/0611291), [Meister 2011](https://pubmed.ncbi.nlm.nih.gov/21844613/), [Zheng 2008](https://www.thieme-connect.com/products/ejournals/abstract/10.1055/s-2008-1038732), [Myers 2008](https://pubmed.ncbi.nlm.nih.gov/17852693/), [Gulgin 2014](https://pubmed.ncbi.nlm.nih.gov/24476744/), [Guadagnoli 2002](https://pubmed.ncbi.nlm.nih.gov/12190281/), [revisión sistemática 2022](https://www.sciencedirect.com/science/article/abs/pii/S1469029222001455).
- TPI (snippet): [Swing characteristics](https://www.mytpi.com/improve-my-game/swing-characteristics) y las páginas de cada una, [Early extension](https://www.mytpi.com/articles/swing/early-extension-swing-characteristic), [Early extension y potencia](https://www.mytpi.com/articles/swing/why-early-extension-causes-a-reduction-of-power-in-the-golf-swing), [X-factor stretch](https://www.mytpi.com/articles/biomechanics/the-difference-between-x-factor-and-x-factor-stretch). Tempo: [Tour Tempo](https://tourtempo.com/blogs/tips/what-the-numbers-mean). Vuelo: [TrackMan face angle](https://www.trackman.com/blog/what-is-face-angle), [face-to-path](https://www.trackman.com/blog/face-to-path). Muñeca: [HackMotion insights](https://hackmotion.com/insights-from-hackmotion-data/), [impacto](https://hackmotion.com/wrist-position-at-impact-in-golf/).
- Productos (snippet de sitio oficial): [Sportsbox accuracy](https://help.sportsbox.ai/sportsbox-ai-accuracy), [Sportsbox setup](https://help.sportsbox.ai/how-do-i-set-up-my-camera-to-record-a-session), [Sportsbox planes](https://3dgolf.sportsbox.ai/sign-up?plansType=players), [OnForm 3D](https://onform.com/blog/onform-launches-fast-reliable-and-accessible-markerless-3d-motion-capture-for-golf/), [OnForm pricing](https://onform.com/pricing/), [Swing Profile](https://www.swingprofile.com/swing-analysis-software/) y [App Store](https://apps.apple.com/us/app/swing-profile-golf-analyzer/id1039981052), [V1 Golf](https://v1sports.com/athletes/buy-v1-golf-app/), [18Birdies](https://help.18birdies.com/article/593-ai-swing-analyzer), [GolfFix](https://www.golffix.io/en), [HackMotion](https://hackmotion.com/products/), [deWiz](https://us.dewizgolf.com/pages/driver-club-head-speed-new), [Golfshot](https://golfshot.com/blog/auto-shot-tracking-with-apple-watch-is-here), [Arccos](https://www.arccosgolf.com/products/smart-sensors), [Shot Scope V5](https://shotscope.com/us/shop/products/golf-gps-watches/v5/), [Uneekor](https://uneekor.com/golf-launch-monitors/eye-mini), [SwingVision](https://swing.vision/faq), [SnapSwing](https://snapgolfswing.com/).
- Estadísticas de partida (snippet y terciaria): [Shot Scope, 20 hcp](https://shotscope.com/blog/practice-green/game-improvement/reduce-your-handicap-20hcp-averages/), [Shot Scope, tres putts](https://shotscope.com/blog/practice-green/stats-and-data/how-often-do-golfers-three-putt-a-look-at-the-data/), [Arccos, tres putts](https://www.arccosgolf.com/blogs/community/pros-vs-joes-analyzing-3-putts), [MyGolfSpy, putts por hándicap](https://mygolfspy.com/news-opinion/instruction/how-many-putts-should-you-have-per-round-based-on-your-handicap/), [Golf Monthly](https://www.golfmonthly.com/features/i-compared-my-data-to-a-20-handicap-benchmark), [BreakX](https://breakxgolf.com/20-handicap-stats/).
- Reglas (snippet): [R&A, Regla 4](https://www.randa.org/en/rog/the-rules-of-golf/rule-4), [USGA, interpretaciones de la Regla 4](https://www.usga.org/content/usga/home-page/custom-search-pages/rules/2019-golf-rules-and-interpretations/rule-4-interpretations.html), [USGA, equipamiento](https://www.usga.org/content/usga/home-page/custom-search-pages/rules/2019-golf-rules-and-interpretations/pe-rule-4.html), [R&A, dispositivos de distancia](https://www.randa.org/en/players-rule-finder/players-rule-finder/equipment/other-equipment/distance-measuring-devices), [USGA equipment FAQ](https://www.usga.org/equipment-standards/equipment-faq-25852.html), [Guía oficial 2023 en castellano](https://www.usga.org/content/dam/usga/pdf/2023/rules/2023%20Guia%20Oficial%20Golf%20pt1.pdf), [AAG, Reglas 2023](https://www.aag.org.ar/wp-content/uploads/2023/01/Reglas-de-Golf-2023_v3.pdf), [WHS 2.1](https://www.usga.org/handicapping/roh/Content/rules/2%201-Acceptability%20of%20Scores.htm), [WHS 2.1b](https://www.usga.org/handicapping/roh/Content/rules/2%201b%20Played%20by%20the%20Rules%20of%20Golf.htm). Terciarias: [National Club Golfer](https://www.nationalclubgolfer.com/rules/rules-of-golf-tech/), [MyGolfSpy, tecnología en la vuelta](https://mygolfspy.com/news-opinion/golf-tech-rules-explained-what-you-can-and-cant-use-mid-round/).
- Terciarias para datos de fabricantes: [Golf Digest, Sportsbox](https://www.golfdigest.com/story/useful-golf-swingfacts-sportsbox-ai-graph), [Golf Digest, SwingTRU](https://www.golfdigest.com/story/swing-by-numbers-new-study-unlocks-6-swing-secrets), [PGA.com, SwingTRU](https://pga.com/news/pga-merchandise-show/golftecs-swingtru-motion-study-illustrates-big-swing-differences-between).

### Repo Galf

`CLAUDE.md`, `CONTEXT.md`, `docs/handoff.md`, `docs/db-design.md`, `docs/roadmap.md`, `src/lib/vision/client.ts`, `src/lib/vision/scorecard.ts`, `src/app/(app)/partidas/[id]/photo-actions.ts`, `supabase/migrations/0001_init.sql`.

### No verificado en fuente primaria (hipótesis a validar en dispositivo o con un request)

1. Que 1080p240 exija HEVC; MB/s reales de HEVC a 240 fps; rolling shutter en sensores de iPhone.
2. fps de inferencia de Vision (2D y 3D) en iPhone; qué capas corren en el Neural Engine; latencia de MediaPipe en iPhone y su soporte de Swift Package Manager.
3. Que `VNDetectTrajectoriesRequest` capte una pelota de golf; que el clasificador de sonido tenga una clase útil para el impacto.
4. Modelos de Apple Watch posteriores a Series 8/Ultra con `CMBatchedSensorManager`; latencia de WatchConnectivity.
5. Specs de video del iPhone 16 Pro; tasas de cuadro de `getUserMedia` en Safari iOS.
6. Salida estructurada dentro de Batches; tier de resolución de Sonnet 5 (inferido por fecha); límites de duración de funciones en Vercel por plan; rate limits de Messages y Batches por tier.
7. Números de Gemini y OpenAI (solo snippets).
8. Tamaño en parámetros de SwingNet; código público de GolfPose 2022 y de los papers 2506.17505 y GolfMate.
9. Grados de giro de hombros y caderas de amateurs; desplazamiento de la cabeza en centímetros; ratio de tempo de amateurs (el "1:1 a 2:1" es marketing); el "75 % / 85 %" de la cara en la dirección inicial atribuido a TrackMan.
10. Prevalencias TPI de pérdida de postura (~50 %) y casting (~56 %); Yeoman 2020 (solo citado en la revisión).
11. Precio de Golfshot Pro (tres cifras distintas) y de GolfFix; vigencia del precio de deWiz; conformidad de deWiz con las reglas.
12. Discrepancia 33,4 vs 36,1 putts por vuelta para hándicap 20 (ambas atribuidas a Shot Scope).
13. Que exista un producto con clip para bolsa o carro y flujo oficial "en cancha, cada golpe" en video: no se encontró ninguno.
