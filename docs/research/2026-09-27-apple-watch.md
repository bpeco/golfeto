# Galf en Apple Watch: investigación de viabilidad

Fecha: 2026-09-27. Rama: `claude/apple-watch-golf-exploration-1jum5r`. Solo investigación: no hay código ni cambios de base en esta rama.

**Pregunta del dueño.** ¿Se puede adaptar Galf al Apple Watch para (1) ver un mapa o imagen satelital de la cancha y la distancia al green, como hacen los relojes Garmin, (2) detectar los golpes con los sensores de movimiento del reloj y (3) que la tarjeta se vaya completando sola?

**Método.** Tres investigaciones en paralelo contra fuentes primarias (documentación de Apple y WWDC, manuales de Garmin, guías oficiales de Golfshot / 18Birdies / Hole19 / Arccos / Shot Scope, esquema de tags de OpenStreetMap, términos de Google Maps Platform y del Apple Developer Program, `Package.swift` de `supabase-swift`, papers). Los informes completos, con una URL por afirmación, están en los apéndices. El proxy de esta sesión bloqueó muchos sitios (garmin.com, apple.com, openstreetmap.org, arxiv, etc.); lo que salió de snippets del buscador y no de la página está marcado así en los apéndices, y lo que no pudo confirmarse dice "sin verificar".

## Respuesta corta

1. **La PWA no corre en el reloj.** watchOS no tiene navegador ni `WKWebView` para terceros. La única vía es una **app nativa en SwiftUI**, que exige una Mac con Xcode y el Apple Developer Program (USD 99 por año). Se distribuye a los cinco amigos por TestFlight interno sin revisión de Apple (las builds vencen a los 90 días) o por el App Store.
2. **Distancia al green: sí, en el reloj y también en el teléfono.** El reloj tiene GPS propio y, dentro de una sesión de workout de golf, ubicación continua en segundo plano. El problema no es el GPS sino **la geometría de la cancha**: la base de Garmin (43.000 canchas) es propietaria y ningún proveedor comercial verificado vende polígonos de greens a precio indie (iGolf arranca en USD 5.000 por año). Para tres canchas la ruta racional es **dibujar los hoyos en OpenStreetMap** sobre imagen Esri o Bing (permiso de calco explícito, licencia ODbL) y leerlos con Overpass. Calcar sobre Google Maps o Google Earth está prohibido por sus términos.
3. **Detección de golpes: parcial, y nadie la usa para llenar la tarjeta a ciegas.** Apple da sensores a 800 Hz (`CMBatchedSensorManager`, watchOS 10, Series 8 / Ultra en adelante) dentro de un workout, pero **no da ninguna API de swing**: el algoritmo hay que hacerlo. Los productos que lo hacen (Golfshot, 18Birdies) detectan bien los swings completos, fallan en putts, chips y golpes de práctica, nunca detectan penalidades, y **todos obligan a confirmar el score al terminar cada hoyo**. El propio Garmin AutoShot no pasa los golpes al score: pide cargar golpes y putts a mano; solo lo automatiza con sensores en cada palo.

## Qué hacen Garmin y las apps de reloj hoy

| Producto | Cómo detecta | Qué no detecta | Cómo llena la tarjeta |
|---|---|---|---|
| Garmin AutoShot (S70, etc.) | Acelerómetro en la muñeca líder, al impacto | Putts ("no se detectan"), chips y contacto pobre | No la llena: pide golpes totales y putts a mano. Score automático solo con sensores CT10 en los palos (incluido el putter), y aun así penalidades y gimmes a mano |
| Golfshot (Apple Watch) | Modelo ML propio; putts con el API de alta frecuencia en Series 8+ | Swings de práctica "casi siempre" ignorados; golpes cortos a veces | Calcula score y putts y **pide confirmarlos al final de cada hoyo**; menú "golpe perdido / cancelar / convertir en putt"; edición posterior |
| 18Birdies (Apple Watch) | ML sobre sensores del reloj, muñeca líder | Putts y chips "por su movimiento sutil"; falsos positivos por "un giro de muñeca" | "Predice" score y putts, botón **Confirmar score** con putts y penalidades |
| Hole19 | Solo GPS: sugiere un golpe cuando dejás de moverte | No usa sensores | Nunca guarda un golpe solo; el usuario acepta o rechaza |
| Arccos / Shot Scope / Golf Pad TAGS | Sensores en el grip de cada palo | Gimmes y tap-ins; penalidades | Confirmar gross al terminar el hoyo; editor de ronda |

Todos cambian de hoyo por geocerca GPS (Garmin y Shot Scope) o al confirmar el score (Golfshot y 18Birdies). Ningún proveedor publica cifras de precisión; en la literatura, un detector por picos de IMU solo llega a 73 % de precisión y 83 % de recall en deportes de raqueta, y mejora solo con una segunda señal (audio o contexto GPS). Detalle y fuentes en el Apéndice B.

## Qué ofrece la plataforma Apple

- **App nativa.** SwiftUI recomendado; apps independientes (sin app de iPhone) desde watchOS 6. Piso razonable para Galf: **watchOS 10** (sensores de alta frecuencia y `Map` con polilíneas y anotaciones).
- **Sensores.** `CMMotionManager` a ~100 Hz en cualquier reloj; `CMBatchedSensorManager` a 800 Hz (acelerómetro) y 200 Hz (device motion) en Series 8 y Ultra en adelante, entregado en lotes de un segundo y **solo con un `HKWorkoutSession` activo**. Apple lo posiciona para "golf, tenis y béisbol" y muestra en WWDC23 cómo detectar el impacto de un swing de béisbol; no hay sample code de golf.
- **Workout de golf.** `HKWorkoutSession(.golf, .outdoor)` habilita ejecución continua en segundo plano, GPS continuo, hápticos con la muñeca baja y pantalla Always On (una actualización por segundo). watchOS puede suspender la app si consume mucha CPU en segundo plano. El workout aparece en Fitness y suma anillos.
- **Ubicación.** `CLLocationManager` con `kCLLocationAccuracyBest` (el default en watchOS es 100 m). Funciona sin iPhone. Apple no publica precisión en metros; GPS.gov habla de ~5 m bajo cielo abierto para teléfonos.
- **Mapas.** `Map` de SwiftUI con `MapPolyline`, `MapCircle`, `Annotation` en watchOS 10+. Satélite (`.imagery`, `.hybrid`) existe, pero Apple avisa que en el reloj puede caer al estilo estándar. **Google Maps no tiene SDK para watchOS.** Mostrar una imagen estática (Google Static Maps o Apple Web Snapshots) se puede, pero **cachearla en el reloj viola ambas licencias**; dibujar geometría propia del hoyo sobre el mapa estándar o en un `Canvas` no tiene ese problema.
- **Backend.** `URLSession` directo desde el reloj (vía iPhone, Wi-Fi o celular). `supabase-swift` soporta watchOS 9+ oficialmente. Auth: Sign in with Apple (watchOS 6+) o `ASWebAuthenticationSession` (watchOS 6.2+). Un reloj solo GPS sin el iPhone encima y sin Wi-Fi queda **offline**: hay que cachear la cancha y encolar golpes.
- **Interacción.** Digital Crown para el contador de golpes, Double Tap (Series 9 / Ultra 2 en adelante) para "+1 golpe" sin la otra mano, hápticos, complicación con hoyo y score.
- **Batería** (cifras de Apple, vía snippet): Series 10 da 7 h de workout con GPS, Ultra 2 12 h, Ultra 3 20 h en bajo consumo. Una vuelta de 4 a 5 h con GPS y sensores a 800 Hz está justa en Series y SE (Golfshot reporta ~10 % extra por su detección de putts).

Detalle y fuentes en el Apéndice A.

## De dónde sale la cancha

- **OpenStreetMap** tiene un esquema de golf: `golf=hole` (línea tee → green con `ref`, `par`, `handicap`), `golf=tee` (área o punto), `golf=green`, `golf=fairway`, `golf=bunker`, `golf=water_hazard` (áreas). No trae "frente / centro / fondo" del green: se derivan del polígono respecto de la posición del jugador.
- **No se pudo consultar Overpass desde esta sesión** (todos los mirrors bloqueados), así que no sé si Miraflores, Los Cedros o CUBA Villa de Mayo tienen hoyos mapeados. La query lista para pegar en https://overpass-turbo.eu está en el Apéndice C, sección 1. Expectativa realista: solo el polígono del club; los hoyos hay que dibujarlos (1 a 2 h por cancha en el editor iD sobre imagen Esri).
- **Vendors**: golfapi.io tiene un endpoint de coordenadas "para canchas seleccionadas" (precios y cobertura de Argentina sin verificar); iGolf licencia desde USD 5.000 por año; Golf Intelligence desde USD 399 por mes. Ninguno sirve para cinco amigos.
- **Licencias**: Google Maps Platform 3.2.3(c) prohíbe "trazar o digitalizar" desde su satélite y 3.2.3(b) prohíbe cachear; Google Earth / My Maps prohíbe crear "otro dataset de mapas". Bing y Esri autorizan expresamente el calco para OSM. Apple no dice nada explícito (riesgo medio).
- **Modelo de datos** por hoyo de una versión de cancha: punto de tee por cada tee set, green como polígono (o tres puntos frente / centro / fondo), obstáculos opcionales como polígonos. WGS84, metros (la app ya guarda metros).
- **Distancia**: haversine alcanza (error de 0,24 m cada 100 m a la latitud de Buenos Aires, calculado); el error del GPS (3 a 5 m) domina. Mostrar la precisión y atenuar la distancia si supera 15 m.
- **En la PWA del teléfono**: `navigator.geolocation.watchPosition` con `enableHighAccuracy` funciona en primer plano; por especificación no llegan actualizaciones con la página oculta, y en iOS tampoco con la pantalla apagada. Mitigación: Screen Wake Lock mientras se muestra la distancia.
- **Mapa en la PWA**: MapKit JS (satélite, 250.000 vistas por día gratis con la membresía de Apple), Mapbox GL JS (50.000 cargas por mes gratis, satélite incluido), o dibujar el hoyo con geometría propia sin tiles.

Detalle y fuentes en el Apéndice C.

## Opciones para Galf

| | A. Distancia al green en la PWA | B. Anotador de muñeca (app watchOS) | C. B + detección automática de swings |
|---|---|---|---|
| Qué da | Mapa del hoyo y metros al frente / centro / fondo del green en el teléfono, para los cinco, hoy | +1 golpe con la corona o Double Tap, distancia al green en la muñeca, hápticos, el hoyo cambia solo por GPS; la tarjeta se escribe en Supabase | Score sugerido por hoyo a partir de swings detectados, con confirmación obligatoria al terminar el hoyo |
| Requiere | Geometría de las 3 canchas en OSM; una tabla nueva de geometría | Mac + Xcode, USD 99 por año, Sign in with Apple habilitado en Supabase, geometría de canchas para el cambio de hoyo | Todo lo de B, más Series 8 / Ultra o posterior, un workout de golf activo y **un modelo propio** entrenado con swings reales del grupo |
| Riesgos | Sin actualizaciones con pantalla apagada; precisión GPS del teléfono | Batería en 4 a 5 h con GPS; reloj solo GPS offline sin el iPhone encima; auth distinta a Google | Falsos positivos (práctica, gestos), putts y chips perdidos, penalidades nunca detectadas; watchOS puede suspender la app por CPU |
| Esfuerzo | Días | Semanas (proyecto Swift aparte del repo) | Meses y datos; resultado incierto |

**Recomendación.** Empezar por **A**: no necesita Mac ni membresía, sirve a los cinco aunque no tengan Apple Watch, y produce la geometría de canchas que B y C necesitan igual. Después **B** si el dueño tiene Mac y al menos dos del grupo usan Apple Watch: es el "Garmin sin Garmin" y ya vale por sí solo. **C** como experimento acotado: grabar swings con `CMBatchedSensorManager` durante partidas reales de B (los batches de 800 Hz se guardan como archivo), medir cuántos golpes reales se detectan y cuántos falsos positivos hay, y solo entonces decidir si vale la pena. El patrón de producto, en cualquier caso, es el de la industria: **score sugerido, confirmar al terminar el hoyo, editar después**, nunca escribir en `hole_scores` sin confirmación.

## Cómo encaja en el modelo actual

- La tarjeta ya se escribe hoyo por hoyo con `saveHoleScore` sobre `hole_scores` (`scorecard_id`, `position`, `strokes`, `picked_up`), con RLS que exige ser participante de la partida. Un reloj o la PWA con GPS escriben exactamente lo mismo; no hace falta tocar tarjetas, firmas ni hándicap.
- Lo que falta en la base es la **geometría**: una tabla ligada a `holes` (o a `course_versions`) con tee por tee set, polígono del green y obstáculos. Va a la lista "Requiere DB" del roadmap y merece un ADR corto (fuente OSM, licencia ODbL, atribución "© OpenStreetMap contributors").
- Auth: la app entra con Google vía Supabase. Un reloj que use Sign in with Apple crea otra identidad salvo que se vincule a la misma cuenta (Supabase permite vincular identidades; sin verificar el flujo exacto en esta sesión). Alternativa: pasar la sesión desde el iPhone por Watch Connectivity, aunque Apple exige que la app también pueda loguearse sola.
- Convenciones: sin borrado físico, `DELETE` para baja lógica, fechas de Buenos Aires; una app Swift tendría que respetar lo mismo que `docs/db-design.md`.

## Pendientes del dueño (no se pueden resolver desde esta sesión)

- [ ] Correr la query de Overpass (Apéndice C.1) para Miraflores, Los Cedros y CUBA Villa de Mayo y anotar cuántos `golf=hole` y `golf=green` hay.
- [ ] Decir qué relojes tiene el grupo (modelo y watchOS) y si hay una Mac disponible: define si B y C son posibles.
- [ ] Confirmar qué cancha es "Los Cedros": el sitio de CUBA indica que la cancha Los Cedros de Villa de Mayo cerró en agosto de 2019 (vía snippet, sin verificar).
- [ ] Opcional: buscar las tres canchas en el localizador de Garmin (https://www.garmin.com/es-AR/golf-courses/) por curiosidad; su base no es reutilizable igual.

---

# Apéndice A. Plataforma Apple watchOS (informe completo)

## Investigación: plataforma Apple watchOS para Galf

Fecha: 2026-09-27. Fuentes primarias únicamente (developer.apple.com, WWDC, Apple Support, Apple Developer Program, GitHub oficial de Supabase, términos de Google Maps Platform).

**Nota sobre el proxy:** `support.apple.com`, `www.apple.com` (incluido Newsroom) y `developers.google.com` están bloqueados por el egress proxy de esta sesión. Para esos hosts sólo pude leer los *snippets* que devuelve el buscador restringido a esos dominios; lo marco como "verificado sólo vía snippet". La documentación de `developer.apple.com` la leí completa a través de su endpoint JSON (`/tutorials/data/documentation/...json`), porque el HTML se renderiza con JS y venía vacío.

---

### 1. ¿Puede correr una web app / PWA en el Apple Watch?

- **No hay Safari ni motor web para apps de terceros en watchOS.** `WKWebView` está disponible en iOS, iPadOS, Mac Catalyst, macOS y visionOS, pero **no en watchOS** (la lista de plataformas del símbolo no incluye watchOS). https://developer.apple.com/documentation/webkit/wkwebview
- `SFSafariViewController` tampoco existe en watchOS (plataformas: iOS, iPadOS, Mac Catalyst, visionOS). https://developer.apple.com/documentation/safariservices/sfsafariviewcontroller
- Lo único que hay es un visor de sistema de sólo lectura: "You can tap website links in Mail and view web-formatted content optimized for Apple Watch"; lo mismo desde Messages. "Most text styles are preserved", se puede hacer doble tap para zoom, y "website links aren't available in all countries or regions". Es una vista Reader sin JS interactivo garantizado, sin instalación, sin acceso a sensores ni GPS. (verificado sólo vía snippet; el proxy bloquea support.apple.com) https://support.apple.com/guide/watch/apddca457a4f/watchos y https://support.apple.com/guide/watch/apdcf848d29e/watchos
- **Conclusión:** una PWA no es instalable ni ejecutable en el reloj. Para mapa, sensores de muñeca y autocompletar la tarjeta, **la única vía realista es una app nativa watchOS**.

### 2. App nativa watchOS: lenguaje, frameworks, independencia, tooling, distribución

- **SwiftUI es el camino recomendado.** Apple: "Building your app with SwiftUI gives you more control over the user interface than designing it in a storyboard. When creating a new watchOS app, strongly consider using SwiftUI." https://developer.apple.com/documentation/watchkit
- **WatchKit no está deprecado como framework** (sigue siendo la infraestructura de app delegate, background tasks, `WKExtendedRuntimeSession`, `WKInterfaceDevice`), pero su capa de UI por storyboard (`WKInterfaceController`, `WKInterfaceMap`, etc.) está relegada: "Because apps built with SwiftUI have more freedom, power, and control over the user interface than apps designed in a storyboard, strongly consider using SwiftUI". Los símbolos de storyboard no muestran `deprecatedAt` en la metadata de la doc. https://developer.apple.com/documentation/watchkit/storyboard-support
- **Apps independientes desde watchOS 6** (WWDC19): "watchOS 6 enables a whole new level of watchOS experiences by allowing fully independent apps and apps built just for Apple Watch, and by bringing the App Store to Apple Watch." https://developer.apple.com/videos/play/wwdc2019/208/
- Dos modalidades: **watch-only app** (sin app iOS; Xcode crea un *stub* iOS que "doesn't create an iOS executable... When someone installs your watch-only app, nothing installs on the paired iPhone") o **app con companion iOS** que puede ser dependiente o independiente (opción "Supports Running Without iOS App Installation"). https://developer.apple.com/documentation/watchos-apps/creating-independent-watchos-apps
- **No hace falta app iPhone.** Pero una app independiente "can't rely on the WatchConnectivity framework to transfer data or files from a companion iOS app... consider using CloudKit, or syncing through your own server." (misma URL)
- Para Galf esto implica: la app watch tiene que poder loguearse y bajar datos sola (ver §7). Apple exige testear "Create new accounts and sign in users", "Download data directly to the watch", push directo al reloj. (misma URL)
- **Tooling: Xcode en una Mac, obligatorio.** Xcode 26.x requiere macOS Sequoia 15.6+ / Tahoe 26.x según versión e incluye SDK watchOS 26.x; Xcode 27 requiere macOS Tahoe 26.6+. https://developer.apple.com/support/xcode/
- **Apple Developer Program: "99 USD per membership year, or in local currency where available."** Incluye TestFlight, App Store, Xcode Cloud (25 h/mes), Sign in with Apple, HealthKit, etc. https://developer.apple.com/programs/whats-included/
- Sin membresía paga sólo hay "Beta Xcode and OS releases" y "On-device testing using Xcode"; para distribuir (TestFlight/App Store) hay que ser miembro del Program. https://developer.apple.com/support/compare-memberships/
- **Distribución para 5 amigos:**
  - **TestFlight** (soporta watchOS): hasta 100 testers internos (roles de App Store Connect), hasta 10.000 externos, hasta 100 builds, 30 dispositivos por tester; "You can test a build for up to 90 days" y "Your build becomes unavailable for testers after 90 days". La primera build para testers externos pasa por Beta App Review; los internos no. https://developer.apple.com/testflight/ y https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/
  - **Ad Hoc**: "Members of the Apple Developer Program ... can register up to 100 of the following devices, per product family, per membership year: Apple TV, Apple Vision Pro, Apple Watch, iPad, iPhone, iPod touch, Mac"; instalación directa sin App Store; el reset del contador es anual. https://developer.apple.com/help/account/devices/devices-overview/ (perfil ad hoc para watchOS: https://developer.apple.com/help/account/provisioning-profiles/create-an-ad-hoc-provisioning-profile/)
  - **App Store** (público o "unlisted", sin verificar el unlisted aquí): revisión completa; se puede comprar/instalar desde el App Store del propio reloj. https://developer.apple.com/documentation/watchos-apps/creating-independent-watchos-apps
  - Recomendación práctica: TestFlight con 5 testers internos (sin Beta Review), re-subiendo build cada 90 días; o App Store si se quiere algo permanente.

### 3. Sensores de movimiento para terceros

- **`CMMotionManager`** (watchOS 2+): accelerometer, gyroscope, magnetometer y device motion (sensor fusion: attitude, rotation rate, gravity, user acceleration). "Create only one CMMotionManager object for your app." https://developer.apple.com/documentation/coremotion/cmmotionmanager
- Frecuencia máxima: "The maximum update frequency is hardware dependent, but is usually at least 100 Hz. If you specify an update frequency greater than what the hardware supports, Core Motion uses the maximum frequency instead." El intervalo se fija con `deviceMotionUpdateInterval`, "capped to minimum and maximum values". https://developer.apple.com/documentation/coremotion/getting-processed-device-motion-data y https://developer.apple.com/documentation/coremotion/cmmotionmanager/devicemotionupdateinterval
- Apple menciona explícitamente el golf como caso de uso del frame de referencia `xArbitraryZVertical`: "For example, a golf swing analysis app might use this frame of reference to measure a person's golf swing." https://developer.apple.com/documentation/coremotion/getting-processed-device-motion-data
- **`CMBatchedSensorManager`**: disponible en **watchOS 10.0+** (la doc lista también iOS/visionOS por herencia del framework, pero la API async `accelerometerUpdates()` está marcada sólo watchOS 10+). API: `isAccelerometerSupported`, `isDeviceMotionSupported`, `accelerometerDataFrequency`, `deviceMotionDataFrequency`, `startAccelerometerUpdates(handler:)` (entrega `[CMAccelerometerData]`), `startDeviceMotionUpdates`, `accelerometerBatch`, `deviceMotionBatch`. https://developer.apple.com/documentation/coremotion/cmbatchedsensormanager
- WWDC23 "What's new in Core Motion" (10179), citas textuales:
  - Frecuencias: "That's 800 Hz accelerometer and 200 Hz device motion, compared to 100 Hz with the existing CMMotionManager." Entrega en lotes: "delivering a batch of data per second".
  - Modelos: "Apple Watch Series 8 and Ultra support both high rate accelerometer and device motion." (modelos posteriores: verificar en runtime con `isAccelerometerSupported`; la sesión sólo nombra Series 8 y Ultra).
  - **Requiere workout activo:** "Because this a workout-centric API, you need to have an active HealthKit workout session to get data."
  - Caso de uso declarado: "Many sports are centered around short-duration impact-based events. This includes activities like golfing, tennis, and baseball..." El ejemplo de la sesión es un swing de béisbol: detectar impacto con acelerómetro a 800 Hz, inicio del swing con rotation rate a 200 Hz, y calcular "time to contact".
  - Cuándo usarla: "If your app has workout-centric features that can benefit from high rate data, but without very tight latency requirements, then CMBatchedSensorManager is well suited."
  https://developer.apple.com/videos/play/wwdc2023/10179/
- **No hay API de detección de swing/golpe lista para usar.** El índice completo de Core Motion (Device motion, Accelerometers, Gyroscopes, Magnetometer, Altitude, Water submersion, Activity, Pedometer, Movement disorder, Fall detection, Historical data) no tiene ningún símbolo de swing, shot ni golf; lo único que Apple da es la materia prima (batches de 800 Hz) y el ejemplo conceptual de WWDC. La detección hay que implementarla (umbral de pico + rotación, o un modelo Core ML propio). https://developer.apple.com/documentation/coremotion
- Consumo: "The device-motion service captures motion data using special hardware, and running this hardware consumes additional power"; parar updates en cuanto no se necesiten. https://developer.apple.com/documentation/coremotion/getting-processed-device-motion-data

### 4. `HKWorkoutSession` con `.golf`

- `HKWorkoutActivityType.golf` existe desde watchOS 2 / iOS 8. https://developer.apple.com/documentation/healthkit/hkworkoutactivitytype/golf
- `HKWorkoutSession` (watchOS 2+): "The session fine-tunes Apple Watch's sensors for the specified activity. All workout sessions generate high-frequency heart rate samples; however, an outdoor cycling activity generates accurate location data, while an indoor cycling activity doesn't." Se configura con `HKWorkoutConfiguration` (`activityType = .golf`, `locationType = .outdoor`). "Apple Watch runs one workout session at a time." https://developer.apple.com/documentation/healthkit/hkworkoutsession
- **Ejecución en background** ("Run in the background"): "Your app continues to run throughout the entire workout session, even when the user lowers their wrist or interacts with a different app... Your app continues to receive data from HealthKit and Apple Watch's sensors in the background... Your app can alert the user using audio or haptic feedback while running in the background." Requiere el background mode **Workout processing** y los usage descriptions `NSHealthShareUsageDescription` / `NSHealthUpdateUsageDescription`. https://developer.apple.com/documentation/healthkit/running-workout-sessions
- Es el habilitador de: sensores de alta frecuencia (§3), hápticos en background (§8), UI Always On con actualización periódica (§8) y ruta GPS (`HKWorkoutRouteBuilder`, §5).
- **Límite de CPU / batería documentado:** "To maintain high performance on Apple Watch, you must limit the amount of work your app performs in the background. If your app uses an excessive amount of CPU while in the background, watchOS may suspend it." (misma URL). En Always On "Apps with active workout sessions can update, at most, once every second". https://developer.apple.com/videos/play/wwdc2021/10009/
- Apple no publica cifras de batería por API; las cifras públicas son por producto (§8). Una vuelta de golf de 4-5 h con GPS + workout está dentro de lo que Apple anuncia para "outdoor workout" en Series 10/Ultra (7 h / 12 h), justo en SE (sin cifra verificada).
- Implicancia de producto: el workout de golf aparece en la app Fitness y suma anillos; Apple pide que la UI "clearly indicate when a workout session is in progress" y que guardar/descartar sea explícito. https://developer.apple.com/documentation/healthkit/running-workout-sessions

### 5. Ubicación en el reloj

- `CLLocationManager` disponible en watchOS 2+; `requestLocation()` (una sola fix) desde watchOS 2; `startUpdatingLocation()` (continuo) desde **watchOS 3**; `allowsBackgroundLocationUpdates` desde **watchOS 4**. https://developer.apple.com/documentation/corelocation/cllocationmanager , https://developer.apple.com/documentation/corelocation/cllocationmanager/startupdatinglocation() , https://developer.apple.com/documentation/corelocation/cllocationmanager/allowsbackgroundlocationupdates
- API moderna async `CLLocationUpdate.liveUpdates()` desde watchOS 10. https://developer.apple.com/documentation/corelocation/cllocationupdate/liveupdates(_:)
- **Precisión:** default en watchOS es `kCLLocationAccuracyHundredMeters` ("For macOS, watchOS, and tvOS, the default value is kCLLocationAccuracyHundredMeters"); hay que pedir `kCLLocationAccuracyBest` explícitamente para distancias al green. https://developer.apple.com/documentation/corelocation/cllocationmanager/desiredaccuracy
- Apple no publica error en metros del GPS del reloj; en el ejemplo oficial de rutas filtran `horizontalAccuracy <= 50.0`. https://developer.apple.com/documentation/healthkit/creating-a-workout-route
- **Sin iPhone:** Core Location "generates location updates using a combination of Wi-Fi, cellular, and GPS hardware" y elige el hardware según la precisión pedida; todos los Apple Watch actuales tienen GPS propio (SE 3: "A gyroscope, an accelerometer, and GPS work together..."; Ultra 3: "L1 and L5 precision dual-frequency GPS"). Apple no documenta en developer.apple.com si el reloj prefiere el GPS del iPhone cuando está cerca (sin verificar). https://developer.apple.com/documentation/corelocation/configuring-your-app-to-use-location-services ; specs verificadas sólo vía snippet: https://support.apple.com/en-us/125094 , https://support.apple.com/en-us/125095
- **Background durante workout:** "With background sessions, your app continues to run in the background, but the sessions can only monitor workouts, track the user's location, or play audio files." El patrón oficial es workout session + `CLLocationManager.startUpdatingLocation()` + `HKWorkoutRouteBuilder.insertRouteData` para guardar la ruta en HealthKit. https://developer.apple.com/documentation/watchkit/using-extended-runtime-sessions y https://developer.apple.com/documentation/healthkit/creating-a-workout-route
- Si la app declara que no funciona sin GPS puede poner `UIRequiredDeviceCapabilities` = `gps`; Apple recomienda hacerlo sólo si se necesita la máxima precisión. https://developer.apple.com/documentation/corelocation/configuring-your-app-to-use-location-services

### 6. Mapas en el reloj

- **SwiftUI `Map` existe en watchOS desde 7.0**, pero el contenido rico (MapContentBuilder) es **watchOS 10+**: `Annotation`, `Marker`, `MapCircle`, `MapPolygon`, `MapPolyline` (con `stroke`), `UserAnnotation`, `MapStyle`, `MapCameraPosition`. https://developer.apple.com/documentation/mapkit/map , https://developer.apple.com/documentation/mapkit/mappolyline , https://developer.apple.com/documentation/mapkit/mapkit-for-swiftui
- **Satélite: sí, con asterisco.** `MapStyle.imagery(elevation:)` y `.hybrid(...)` están disponibles en watchOS 10+, pero Apple advierte: "In watchOS, depending on rendering calculations, MapKit may render the map using the Standard map style rather than requested Hybrid or Imagery styles." https://developer.apple.com/documentation/mapkit/mapstyle/imagery(elevation:)
- `WKInterfaceMap` (storyboard, watchOS 2+): mapa **no interactivo**, máximo 5 anotaciones ("Maps can display no more than five annotations at a time"), tocarlo abre la app Maps; requiere red para bajar tiles ("The Apple Watch must have an active network connection to download map tiles"). Sólo para apps legacy. https://developer.apple.com/documentation/watchkit/wkinterfacemap
- **Google Maps no tiene SDK para watchOS.** El catálogo de Google Maps Platform es Android, iOS, Web y cross-platform; el único soporte wearable es "Maps API on Wear OS" vía Maps SDK for Android. (verificado sólo vía snippet; developers.google.com bloqueado) https://developers.google.com/maps/apis-by-platform y https://developers.google.com/maps/documentation/android-sdk/wear
- **Imagen estática como fallback:** una app watch puede bajar cualquier imagen por HTTPS y mostrarla con `Image`/`AsyncImage`. Opciones: Google **Maps Static API** ("Simple, embeddable map image with minimal code", snippet) o **Apple Maps Web Snapshots** ("Create a static image of a map from a URL", firmado con Maps ID + private key del Developer account; en apps nativas Apple sugiere `MKMapSnapshotter`, que no está en watchOS). https://developer.apple.com/documentation/snapshots
- **Licencias / caché:**
  - Google: "(b) No Caching. Customer will not cache Google Maps Content except as expressly permitted under the Maps Service Specific Terms." Los Service Specific Terms permiten cachear sólo IDs y ciertos valores (p. ej. lat/lng de Directions por 30 días); no hay excepción para tiles/imágenes de Static Maps. Cachear imágenes del hoyo en el reloj para usarlas offline violaría los términos. https://cloud.google.com/maps-platform/terms y https://cloud.google.com/maps-platform/terms/maps-service-terms
  - Apple (Apple Developer Program License Agreement, Attachment 6 "Use of the Apple Maps Service", 2.5): "Map Data may not be cached, pre-fetched, or stored by You or Your Application... other than on a temporary and limited basis solely as necessary (a) for Your use of the Apple Maps Service as permitted herein... and/or (b) to improve the performance..., after which, in all cases, You must delete any such Map Data." Además 2.4: el Map Data sólo puede mostrarse sobre un mapa de Apple. https://developer.apple.com/programs/apple-developer-program-license-agreement/
  - Apple Maps Server API / MapKit JS: cuota gratuita "up to 25,000 service calls per day per team". https://developer.apple.com/documentation/applemapsserverapi
  - Alternativa sin problema de licencia: dibujar el hoyo con geometría propia (polígonos/polylines de fairway y green cargados desde Supabase) sobre `Map` estándar o sobre un `Canvas` propio; eso no es Map Data de nadie.

### 7. Comunicación con el backend

- **HTTPS directo sin iPhone: sí.** "Your watchOS app can connect directly to web services... the system can send data through a paired iPhone as a proxy, over a known Wi-Fi network, or over the watch's own cellular connection." "Always use a URLSession object". Foreground: default/ephemeral sessions; background: background sessions. `waitsForConnectivity` para diferir. https://developer.apple.com/documentation/watchos-apps/keeping-your-watchos-app-s-content-up-to-date y https://developer.apple.com/documentation/watchos-apps/making-default-and-ephemeral-requests
- Orden de rutas: primero proxy por iPhone (Bluetooth), luego Wi-Fi conocida, luego celular (sólo modelos GPS + Cellular). En una cancha sin el iPhone encima y sin Wi-Fi, un reloj **sólo GPS queda offline**: la app debe cachear la ficha del club y encolar los scores para sincronizar después. (misma URL)
- **`supabase-swift` soporta watchOS oficialmente.** `Package.swift` (main): `platforms: [.iOS(.v16), .macCatalyst(.v16), .macOS(.v13), .watchOS(.v9), .tvOS(.v16), .visionOS(.v1)]`, swift-tools-version 6.2; productos `Auth`, `Functions`, `PostgREST`, `Realtime`, `Storage`, `Supabase`. README: "watchOS 9+", "Xcode 26.0+", "Swift 6.2+". https://github.com/supabase/supabase-swift/blob/main/Package.swift y https://github.com/supabase/supabase-swift/blob/main/README.md
- **Watch Connectivity** (`WCSession`, watchOS 2+): mensajes en vivo si ambas apps están activas, `transferUserInfo`/`transferFile` en background, `updateApplicationContext`. Apple: "use the WatchConnectivity framework as an opportunistic optimization, rather than the primary means of supplying fresh data." https://developer.apple.com/documentation/watchconnectivity/wcsession y https://developer.apple.com/documentation/watchos-apps/keeping-your-watchos-app-s-content-up-to-date
- **Auth en el reloj:**
  - **Sign in with Apple**: `ASAuthorizationAppleIDProvider` disponible en **watchOS 6+**; el botón en SwiftUI es `SignInWithAppleButton` (el `ASAuthorizationAppleIDButton` de UIKit no está en watchOS; en storyboard es `WKInterfaceAuthorizationAppleIDButton`). https://developer.apple.com/documentation/authenticationservices/asauthorizationappleidprovider
  - **`ASWebAuthenticationSession` existe en watchOS 6.2+** (OAuth vía web en el reloj). https://developer.apple.com/documentation/authenticationservices/aswebauthenticationsession
  - Formularios propios: `TextField`/`SecureField` con `textContentType(.username/.password)` habilitan autofill desde el iPhone (Continuity Keyboard) y OTP por SMS. https://developer.apple.com/documentation/watchos-apps/authenticating-users-on-apple-watch
  - **Handoff de sesión desde el iPhone**: viable con `WCSession` (mandar refresh token al reloj y guardarlo en Keychain), pero Apple exige que la app también pueda loguearse sola. (mismas URLs)
  - Con Supabase: `supabase-swift` Auth soporta `signInWithIdToken(provider: .apple, ...)` con el token de Sign in with Apple; el proveedor "Apple" tiene que estar habilitado en el proyecto (esto último no lo verifiqué en esta sesión: sin verificar).
- Push directo al reloj: "with watchOS 6 the watch has become a standalone push target". https://developer.apple.com/videos/play/wwdc2019/208/

### 8. Otras capacidades del reloj

- **Always On** (watchOS 8+ para apps): la UI sigue visible con el brazo bajo si la app es frontmost o corre una background session (workout); el sistema baja la frecuencia de refresh y atenúa; `isLuminanceReduced`, `TimelineView`, `privacySensitive`. "Always On isn't available on Apple Watch SE or Apple Watch Series 4 and earlier." Durante workout: "at most, once every second". https://developer.apple.com/documentation/watchos-apps/designing-your-app-for-the-always-on-state y https://developer.apple.com/videos/play/wwdc2021/10009/
- **Hápticos:** `WKInterfaceDevice.current().play(_:)` con `WKHapticType` (`.notification`, `.success`, `.failure`, `.start`, `.stop`, `.click`, `.directionUp/Down`, `.retry`, ...). "By default, you cannot play haptic feedback in the background. The only exception are apps with an active workout session." Mínimo 100 ms entre hápticos; y "Do not call this method while gathering heart rate data using HealthKit. When you engage the haptic engine, HealthKit stops gathering heart rate data until after the haptic engine finishes." https://developer.apple.com/documentation/watchkit/wkinterfacedevice/play(_:) y https://developer.apple.com/documentation/watchkit/wkhaptictype
- **Digital Crown:** SwiftUI `.digitalCrownRotation($binding)` (watchOS 6+) sobre una vista `.focusable()`; desde watchOS 10 es el input primario de navegación. Ideal para cambiar el número de golpes o el palo. https://developer.apple.com/documentation/swiftui/view/digitalcrownrotation(_:) y https://developer.apple.com/design/human-interface-guidelines/digital-crown
- **Complicaciones / Smart Stack:** se hacen con WidgetKit + SwiftUI (accessory widgets); ClockKit sólo para watchOS 8 y anteriores. Sirve para "hoyo actual / score" en la carátula. https://developer.apple.com/documentation/widgetkit/creating-accessory-widgets-and-watch-complications
- **Double Tap:** disponible en Series 9 y Ultra 2 (y posteriores); en watchOS 11+ se asigna una acción primaria por escena con `.handGestureShortcut(.primaryAction)` en un `Button`/`Toggle`. Útil para "+1 golpe" sin usar la otra mano. https://developer.apple.com/documentation/watchos-apps/enabling-double-tap
- **Extended runtime sessions** (`WKExtendedRuntimeSession`, watchOS 6+): tipos self care, mindfulness, physical therapy, smart alarm; no aplica a deporte: para golf corresponde `HKWorkoutSession`. https://developer.apple.com/documentation/watchkit/wkextendedruntimesession
- **Batería / agua (verificado sólo vía snippet de páginas de Apple; el proxy bloquea apple.com y support.apple.com):**
  - Ultra 2: "12 hours of outdoor GPS battery life", 17 h en Low Power con GPS; Series 10: "7 hours of outdoor GPS battery life". https://support.apple.com/en-us/111832 y https://support.apple.com/en-us/121202
  - Ultra 3: "For continuous outdoor workout tracking, Apple Watch Ultra 3 now gets 20 hours of battery life in Low Power Mode with full GPS and heart rate readings"; 42 h normal / 72 h Low Power; agua 100 m ISO 22810:2010 e IP6X. https://www.apple.com/newsroom/2025/09/introducing-apple-watch-ultra-3/ y https://support.apple.com/en-us/125095
  - Series 11: batería "all-day" (24 h con sleep tracking) según spec; cifra de outdoor GPS workout **sin verificar** (no aparece en los snippets; la tabla completa está en https://www.apple.com/watch/battery/, bloqueada). https://support.apple.com/en-us/125093
  - SE 3: "all-day, 18-hour battery life", agua 50 m ISO 22810:2010, GPS; cifra de outdoor GPS workout **sin verificar**. https://support.apple.com/en-us/125094

---

### Síntesis para Galf

1. PWA en el reloj: descartado; sólo app nativa SwiftUI (watchOS 10+ como piso razonable por `CMBatchedSensorManager` y MapKit rico).
2. Se puede hacer **watch-only** sin app iPhone; la app se loguea (Sign in with Apple o ASWebAuthenticationSession) y habla con Supabase por `supabase-swift` (watchOS 9+) vía URLSession.
3. Detección de swing: Apple da sensores a 800 Hz / 200 Hz dentro de un `HKWorkoutSession(.golf, .outdoor)` en Series 8+/Ultra, y el ejemplo conceptual de WWDC23; el algoritmo lo hacemos nosotros. No hay API de golpes.
4. Mapa: `Map` SwiftUI con `MapPolyline`/`MapCircle` propios; satélite disponible pero no garantizado en el reloj; nada de Google en watchOS; cachear tiles de Google o Apple viola ambas licencias, geometría propia no.
5. Costo fijo: Mac + Xcode + USD 99/año; distribución a 5 amigos por TestFlight interno (sin review) o App Store.
6. Riesgo principal: batería en una vuelta de 4-5 h con GPS + sensores de alta frecuencia en Series/SE (7 h anunciadas en Series 10; SE sin cifra), y conectividad offline en relojes sólo-GPS sin iPhone encima.

---

# Apéndice B. Detección automática de golpes y auto-fill (informe completo)

## Detección automática de golpes y auto-fill de la tarjeta (estado del mercado + literatura)

Fecha: 2026-09-27. Alcance: cómo Garmin y las apps de Apple Watch detectan swings desde la muñeca, qué NO detectan, cómo pasan de "golpes detectados + GPS" a un score por hoyo, y qué dice la literatura.

### 0. Nota metodológica (bloqueos del proxy)

- El proxy de egress de la sesión bloqueó con 403 casi todos los hosts primarios: `garmin.com`, `www8.garmin.com`, `support.garmin.com`, `static.garmin.com`, `forums.garmin.com`, `golfshot.com`, `shotzoom.zendesk.com`, `help.hole19golf.com`, `hole19golf.com`, `help.18birdies.com`, `18birdies.com`, `thegrint.com`, `golfpadgps.com`, `support.golfpadgps.com`, `arccosgolf.com`, `support.arccosgolf.com`, `v5support.shotscope.com`, `apps.apple.com`, `www.apple.com`, `arxiv.org`, `nature.com`, `mdpi.com`, `pmc.ncbi.nlm.nih.gov`, `patents.google.com`, `ieeexplore.ieee.org`, `diva-portal.org`, `dcrainmaker.com`, `mygolfspy.com`, `tomsguide.com`.
- Lo que sí se pudo leer completo: `developer.apple.com` (docs JSON, transcript WWDC23, foros) y el PDF oficial "Auto Putt Tracking User Guide" de Golfshot (S3: https://szuserguides.s3.amazonaws.com/en/golfshot-ios-auto-putt-tracking-user-guide.pdf).
- Para el resto, las citas vienen de los **snippets del buscador sobre la página primaria** (marcado "vía snippet"). El texto citado es el de la página oficial, pero no pude leer la página entera; tratar como verificado-parcial.

### 1. Garmin AutoShot

**Qué es y cómo lo describe Garmin**
- Manual Approach S70, "Viewing Measured Shots": "Automatic shot detection works best when you wear the device on your leading wrist and make good contact with the ball. Putts are not detected" (vía snippet) — https://www8.garmin.com/manuals/webhelp/GUID-0F89E6A5-EC1C-4382-964E-27DC4B5FC932/EN-US/GUID-36C094EA-AFF5-4A82-BBEC-E91C445DCF86.html
- Manual S70, "Keeping Score": "Your device features automatic shot detection and recording. Each time you take a shot along the fairway, the device records your shot distance so you can view it later" (vía snippet) — https://www8.garmin.com/manuals/webhelp/GUID-0F89E6A5-EC1C-4382-964E-27DC4B5FC932/EN-US/GUID-36D33AC5-47C1-4644-B0EC-9ACCD89FEDFF.html
- Página de tecnología "Autoshot" (bloqueada, sin verificar contenido): https://www.garmin.com/en-US/garmin-technology/golf-science/distance-measurement/autoshot/
- FAQs de soporte relevantes (bloqueadas; títulos confirmados por buscador): "AutoShot and Other Features on Garmin Golf Devices" https://support.garmin.com/en-US/?faq=PMDFD4p5N74JYxSamVvGg6 ; "My Garmin Golf Watch Is Not Detecting Shots Automatically" https://support.garmin.com/en-US/?faq=WrciF7R3I06tTtkcu48Wv8
- Sensor: Garmin no publica el algoritmo; el manual sólo habla de "contact with the ball" y "leading wrist", consistente con detección por acelerómetro de muñeca en el impacto. Sin verificar más detalle (páginas bloqueadas).

**Qué NO detecta (declarado por Garmin)**
- Putts: "Putts are not detected" (manual S70, arriba).
- Chips / contacto pobre: manual del Approach CT10, "Using a Partial Set of Sensors": "AutoShot on a compatible watch does not track putts and may not track some shots, particularly chip shots around the green, depending upon lie and ball contact" (vía snippet) — https://www8.garmin.com/manuals/webhelp/approachct10/EN-US/GUID-010184AB-69B4-458B-B509-4DCA66277F8A.html
- Fuente secundaria (retailer) que resume la FAQ bloqueada: "Partial swings, rescue, chip shots, and putts are not designed to be detected by the AutoShot feature" — https://shop.golfersauthority.com/blogs/golf/how-autoshot-works-on-a-garmin-golf-watch (secundaria).

**Cómo se llena la tarjeta (clave para Galf)**
- Sin sensores CT10, **AutoShot NO auto-completa el score**: el manual S70 pide ingresar strokes a mano: "From the scorecard, select a hole and enter the total number of strokes taken, including putts, and select Next. Set the number of putts taken, and select Next" (vía snippet) — https://www8.garmin.com/manuals/webhelp/GUID-0F89E6A5-EC1C-4382-964E-27DC4B5FC932/EN-US/GUID-36D33AC5-47C1-4644-B0EC-9ACCD89FEDFF.html
- Los putts van a estadísticas, no al score: "the number of putts taken is used for statistics tracking only and does not increase your score" (vía snippet) — https://www8.garmin.com/manuals-apac/webhelp/approachs70/EN-SG/GUID-483481C5-1123-4A0A-B1E3-B0F4E70069D9-6565.html
- El score automático existe sólo con sensores de palo (CT10) y sensor en el putter: "When a sensor is assigned to your putter, your compatible Garmin golf device automatically records your score based on detected shots. It does not detect gimme putts, penalty strokes, or missed shots, which must be entered manually" (vía snippet) — https://www8.garmin.com/manuals/webhelp/approachct10/EN-US/GUID-1BC3F17A-F75A-4756-9769-3BAB98B92405.html
- Edición posterior de golpes AutoShot: FAQ "Editing AutoShot Information With the Garmin Golf App" https://support.garmin.com/en-US/?faq=imh6LzeTWZ0TeykxOaeUX5 y "…on the Garmin Connect Website" https://support.garmin.com/en-US/?faq=EnSrNc8ssn27gaCtX9ri48 (bloqueadas; usuarios en foros reportan mover/borrar golpes post-ronda, secundario: https://forums.garmin.com/outdoor-recreation/golf/f/approach-s62/325248/how-to-make-sure-autoshot-data-is-saved-and-added-to-a-scorecard/1581191).

**Cambio de hoyo**
- Automático por GPS: "The device shows the current hole you are playing, and automatically transitions when you move to a new hole"; fuera de un hoyo (clubhouse) "defaults to hole 1" (manual S40/S42 vía snippet) — https://www8.garmin.com/manuals/webhelp/approachs40/EN-US/Approach_S40_OM_EN-US.pdf ; FAQ "Automatic Hole Transition on a Garmin Golf Watch" https://support.garmin.com/en-US/?faq=leUAomDugD7UxMH9iQheTA ; cambio manual https://support.garmin.com/en-US/?faq=Kw2lppzbhS22YwAE3GTs47

**Base de canchas**
- "preloaded maps of more than 43,000 golf courses" (press release Approach S44/S50, 21-ene-2025, vía snippet) — https://www.garmin.com/en-US/newsroom/press-release/outdoor/level-up-your-golf-game-with-vibrant-new-approach-s44-and-s50-smartwatches-from-garmin/ ; página "Preloaded Golf Courses" habla de 41.000+ (vía snippet) — https://www.garmin.com/en-US/garmin-technology/maps-for-smartwatches/golf-courses/
- Buscador de canchas: https://www.garmin.com/en-US/golf-courses/ (versión AR: https://www.garmin.com/es-AR/golf-courses/). Bloqueado para fetch.
- Argentina está cubierta: aparecen p. ej. "Ituzaingo Golf Club" (https://www.garmin.com/en-PA/golf-courses/course/40453) y "Tres Arroyos Golf Club" (https://www.garmin.com/en-HN/golf-courses/course/40474) en el Golf Course Guide de Garmin (vía snippet).
- **Miraflores Country Club (Garín) y Los Cedros / CUBA: sin verificar.** Búsquedas `site:garmin.com` con esos nombres sólo devolvieron "Miraflores Club de Golf" (Mijas, España). Que no aparezcan en el índice del buscador no prueba ausencia; hay que consultar el locator a mano. Dato lateral: el sitio de CUBA indica que la cancha Los Cedros (Villa de Mayo) se cerró a partir del 29-ago-2019 con opción de compra (vía snippet) — https://www.cuba.org.ar/villa-de-mayo/los-cedros-golf ; verificar estado actual.
- Alta/corrección de canchas: FAQ "How Do I Request a New Golf Course or Report a Course Error?" https://support.garmin.com/en-US/?faq=c3x0yFvYJJ6OAhq5iX1Kq5 ; updates gratis vía Garmin Golf app / Garmin Express https://support.garmin.com/en-US/?faq=1MNU4rGtXT98VysfHA86q6

### 2. Apple Watch: apps con detección sólo por reloj, y por qué existen los sensores de palo

**Golfshot (Shotzoom) — Auto Shot Tracking (AST) + Auto Putt Tracking (APT)** — el más completo, único con PDF oficial legible
- Modelo ML propio ("Swing ML / SwingML") sobre sensores del Watch; usar en muñeca líder; requiere membresía Pro o Champions (vía snippet) — https://golfshot.com/auto-shot-tracking-golf-app ; https://shotzoom.zendesk.com/hc/en-us/articles/360063182313
- Requisitos: AST original "Apple Watch Series 3 or newer, running watchOS 7.0 or greater" (vía snippet, blog) — https://golfshot.com/blog/auto-shot-tracking-with-apple-watch-is-here ; APT: "Apple Watch Series 8, Ultra, and newer • iOS 17+ & Watch OS15+" y "High-frequency motion sensing is available on Apple Watch Series 8 and newer" (PDF oficial, p.1-3) — https://szuserguides.s3.amazonaws.com/en/golfshot-ios-auto-putt-tracking-user-guide.pdf
- Detección: "When you hit a shot, Golfshot automatically detects the impact and begins tracking the shot distance"; "Practice swings are usually ignored automatically. In some cases, hitting the ground during a practice swing may briefly trigger tracking, but the shot will typically be replaced once your actual shot is detected" (PDF p.5). Soporte: "designed to disregard short swings/duff shots, though occasionally a short/duff shot may be saved" (vía snippet) — https://shotzoom.zendesk.com/hc/en-us/articles/360061266534
- Green: al llegar al green pasa a "Green Mode"; hay que pararse en el hoyo y tocar "Set Pin Location" para distancias de putt; sin pin "Golfshot can still count your putts, but it cannot calculate putt distances accurately" (PDF p.6).
- Correcciones en el reloj: menú con "Missed Putt, Cancel Shot, or Convert to Putt" (PDF p.7); golpe perdido: long press → "Missed Shot" (vía snippet zendesk).
- **Score**: "Golfshot automatically calculates your score and putt count as you play. At the end of each hole, swipe right to review the score screen and confirm your score and putts" (PDF p.7). Post-ronda: Rounds → Tracked Shots para editar pin, putts, club/lie (PDF p.8). Batería: ~10% extra con APT (PDF p.9).
- Golfshot dice que la API de alta frecuencia de watchOS 10 estaría en "Series 8, Apple Watch Ultra and Apple Watch SE (2nd generation)" (vía snippet, blog) — https://golfshot.com/blog/wwdc-2023-new-apple-watch-api-to-enhance-golfshots-swing-id — ojo: Apple en WWDC sólo nombra Series 8 y Ultra (ver §3).

**18Birdies — Auto Swing Detection / Smart Tracking (Premium)**
- "uses the sensors in your Apple Watch and 18Birdies' proprietary machine-learning algorithm to detect swings and combine them with GPS"; sólo Apple Watch; muñeca líder; vibra al detectar (vía snippet) — https://help.18birdies.com/article/722-how-shot-detection-works-in-18birdies
- Limitación declarada: "While most full swings are automatically detected, putting and short chip shots may not always be detected due to their subtle motion" (vía snippet, misma URL).
- Falsos positivos declarados: "we accidentally picked up a flick of the wrist as a swing… you can remove detected shots as you play by clicking on the dot and selecting 'Delete Location'" (vía snippet) — https://help.18birdies.com/article/748-smart-tracking-faqs
- Score: "18Birdies will try its best to predict your total score and number of putts"; "Tap the 'Confirm Score' button after finishing the hole… confirm your score, number of putts, first putt distance, and any penalties"; penalties vía "+ Penalties" (vía snippet) — https://help.18birdies.com/article/734-smart-tracking-automatic-shot-tracking-with-18birdies ; edición post-ronda en Round Summary → "Smart Tracking (Hole by Hole)" (vía snippet, FAQs).
- Modelo mínimo de Watch para swing detection: no encontrado en los snippets (sin verificar). Map View requiere Series 4+.

**Hole19 — "Auto Shot Detection" (plan Intelligence)** — NO es detección de swing por sensores
- "tracks your movement during the hole and suggests where shots may have been played… when you stop moving, it may suggest that a shot was played. Suggested shots appear as grey circles with a '+'… These are proposals only, not saved shots… Auto Shot Detection only suggests locations, it never saves a shot automatically" (vía snippet) — https://help.hole19golf.com/hc/en-us/articles/26053870684444-How-Auto-Shot-Detection-works-Intelligence
- Watch: requiere watchOS 10+; confirmación de golpes desde el reloj (vía snippet) — https://help.hole19golf.com/hc/en-us/articles/7610571948060-What-devices-does-Hole19-work-on

**TheGrint** — tracking manual: "press 'Start Tracking'… a haptic will also pulse every 20 seconds until you mark the completion of your shot"; Series 4+ (vía snippet) — https://thegrint.com/range/post/we-just-invested-a-lot-into-our-smartwatch-heres-why-how-i-use-it . No ofrece detección automática (secundaria: https://www.golfpass.com/travel-advisor/articles/best-apple-watch-golf-apps).

**Golf Pad** — en el reloj el tracking es manual ("one-tap shot tracking"); "You don't need the tags for using the Smart Watch. You can manually choose a golf club in the watch" (vía snippet) — https://support.golfpadgps.com/support/discussions/topics/6000063584 . Sin detección por movimiento.

**Enfoque con sensores de palo (por qué existen)**
- Arccos: el sensor en el grip "detect[s] the impact"; el teléfono (mic + GPS) en "front lead pocket" o el wearable Link; el mapa clasifica drive/approach/chip/putt (vía snippet) — https://www.arccosgolf.com/blogs/community/top-four-things-to-know-before-starting-your-round . Limitaciones oficiales: "gimmes and tap-ins are the most frequently missed"; penalties se cargan a mano; "Smart Edit" marca el hoyo si el score no coincide con los golpes detectados (vía snippet) — https://www.arccosgolf.com/blogs/community/arccos-academy-adding-a-penalty-stroke ; https://eu.arccosgolf.com/blogs/community/smart-edit-is-here-the-scorecard-that-edits-itself
- Shot Scope V5: 16 tags en los grips; la antena está en la malla ("strap positioned on the inside of your arm"), detección por proximidad ≥7 cm; el reloj "goes into 'sleep' mode between shots… If you don't take a practice swing… may not register the shot" (vía snippet) — https://v5support.shotscope.com/hc/en-us/articles/23425587409681 . Putts: pantalla "PinCollect" en el green, se toca 0–3 putts sobre el hoyo (vía snippet) — https://v5support.shotscope.com/hc/en-us/articles/23432843020305 . Penalties se cargan en el reloj (Lost Ball/OB, Penalty Drop, Provisional) — https://v5support.shotscope.com/hc/en-us/articles/23432914588049 . "After each hole is complete, simply confirm your gross score" (vía snippet) — https://x5support.shotscope.com/hc/en-us/articles/13610648920337
- Golf Pad TAGS: NFC pasivo, "tap your club to your phone" antes de cada golpe; "You'll tap the putter for each putt" (vía snippet) — https://golfpadgps.com/tags ; https://support.golfpadgps.com/support/discussions/topics/6000068149
- Garmin CT10: ver §1 (score automático sólo con sensor en el putter).
- Conclusión: los sensores de palo existen porque la muñeca sola (a) no detecta putts/chips con confiabilidad y (b) no sabe qué palo se usó. Todos igual dejan penalties y gimmes a carga manual.

### 3. Apple `CMBatchedSensorManager` (watchOS 10)

- Clase de Core Motion, disponible watchOS 10.0+; API: `isAccelerometerSupported`, `isDeviceMotionSupported`, `accelerometerDataFrequency`, `deviceMotionDataFrequency`, `startAccelerometerUpdates()`, `accelerometerUpdates()`, `startDeviceMotionUpdates()`, `deviceMotionUpdates()`, `accelerometerBatch`, `deviceMotionBatch` (leído del JSON de docs; el abstract está vacío y no menciona Hz ni deportes) — https://developer.apple.com/documentation/coremotion/cmbatchedsensormanager
- Sesión WWDC23 **"What's new in Core Motion" (10179)** — https://developer.apple.com/videos/play/wwdc2023/10179/ (transcript leído): acelerómetro a **800 Hz** y device motion a **200 Hz** (vs 100 Hz de `CMMotionManager`); soportado en **Apple Watch Series 8 y Ultra**; requiere **sesión de workout HealthKit activa**; los batches llegan **una vez por segundo**; ejemplo mostrado: swing de béisbol, impacto detectado en el eje z del acelerómetro a 800 Hz, inicio del swing por rotation rate alrededor de la gravedad a 200 Hz, métrica "time to contact". La sesión enmarca el API para deportes de impacto corto ("golfing, tennis, and baseball") (vía snippet del mismo video).
- Sesión "Build a multi-device workout app" (10023) NO habla de este API (transcript leído) — https://developer.apple.com/videos/play/wwdc2023/10023/
- Un Apple Frameworks Engineer, ante un pedido de IMU a 500–1000 Hz para golf/tenis, remite a la sesión 10179 como respuesta oficial (foro leído) — https://developer.apple.com/forums/thread/796412
- Sample code de detección de swing: **no encontrado** en developer.apple.com; el video sólo muestra snippets conceptuales. El único sample cercano es "Building a multidevice workout app" (HealthKit, sin swings) — https://developer.apple.com/documentation/HealthKit/building-a-multidevice-workout-app
- Apple Newsroom (may-2024) confirma el posicionamiento: "high-frequency motion API released in watchOS 10… to detect rapid changes in velocity and acceleration" usado por Golfshot para "detect exactly when your club hits the ball" (vía snippet; página bloqueada) — https://www.apple.com/newsroom/2024/05/apple-watch-is-the-perfect-golfing-companion/
- Discrepancia a tener en cuenta: Golfshot lista SE (2nd gen) como soportado; Apple en WWDC sólo nombra Series 8 y Ultra. Verificar con `isAccelerometerSupported` en el dispositivo.

### 4. Algoritmos publicados (IMU de muñeca)

Todas las páginas de papers estaban bloqueadas; los datos salen de snippets del abstract/texto. No encontré un paper que reporte precision/recall de **detección de golpe en ronda real** con smartwatch; la literatura académica se concentra en segmentación/cinemática del swing, y los números de detección "en la cancha" están en patentes y productos.

- Kim & Park, *Scientific Reports* 2024, "Enhancing accuracy and convenience of golf swing tracking with a wrist-worn single inertial sensor": 20 golfistas diestros, driver y 7-iron; CNN para orientación; error de trayectoria ~17 cm; trabajo previo (2020) de segmentación de fases con un IMU en muñeca con error 5–92 ms por transición — https://www.nature.com/articles/s41598-024-59949-w (PMC: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11035581/). Es tracking, no detección en la cancha.
- *Sensors* (MDPI) 2013, "Early Improper Motion Detection in Golf Swings Using Wearable Motion Sensors": sensor en brazo líder, gyro ±2000 °/s, accel ±24 g, 1000 Hz; PCA sobre swings de referencia — https://doi.org/10.3390/s130607505 . Muestra los rangos de señal: el impacto satura acelerómetros de ±8 g típicos de smartwatch.
- Tesis KTH 2017, "Recognizing and classifying a golf swing using [smartwatch accelerometer]": clasifica putter / iron / driver desde acelerómetro de smartwatch con una máquina de estados en tiempo real; reporta precision/recall/F; snippet menciona 63% de precision al separar iron vs driver — https://www.diva-portal.org/smash/get/diva2:1114198/FULLTEXT01.pdf (sin verificar el detalle numérico).
- Lauer et al., arXiv 2506.17505 (jun-2025), "Learning golf swing signatures from a single wrist-worn inertial sensor": datos sintéticos de IMU desde video de pros, redes para segmentar fases y predecir club/jugador — https://arxiv.org/abs/2506.17505
- arXiv 2606.22876 (jun-2026), "Full-Body Golf Swing Kinematic Reconstruction From a Smartwatch IMU": Huawei Watch GT 5 Pro en muñeca izquierda, accel+gyro a 100 Hz, 7 palos — https://arxiv.org/abs/2606.22876
- Análogo útil (deportes de raqueta, wearable de muñeca): Sharma et al., arXiv 1805.05456, "Wearable Audio and IMU Based Shot Detection in Racquet Sports": detector sólo-IMU por picos: **73% precision / 83% recall**; fusión IMU+audio con random forest: **F-score 95.6%** — https://arxiv.org/pdf/1805.05456 . Moraleja: el pico de aceleración solo genera muchos falsos positivos.
- Hsu et al., IEEE ICCE-TW 2016, "Golf swing motion detection using an inertial-sensor-based portable instrument": sensor en el palo; segmenta address/backswing/top/downswing/impact/follow-through — https://ieeexplore.ieee.org/document/7521016/
- Patentes (describen la práctica industrial de features y fallos): Microsoft US10097961 "Golf shot detection" (filed 2016-01-12): wearable con sensores de movimiento; "distinguishing practice swings from impact swings"; clasificadores separados para drive/chip/putt disparados por cruces por cero del giroscopio; descarta detecciones de putt lejos del green por GPS; cierra la "sesión de agrupación de golpes" por distancia recorrida o por evento de nuevo hoyo; suprime falsos positivos por "club dropped into a bag" analizando 3–11 s post-impacto (vía snippets) — https://patents.google.com/patent/US10097961B2/en . McCartin US10456657 / US11071902: dispositivo de muñeca con gyro+accel+GPS que compila putts, GIR, fairways "passively" — https://patents.google.com/patent/US10456657
- Features recurrentes: pico de aceleración en el impacto (necesita ≥200–800 Hz para resolverlo), pico de velocidad angular en el downswing, duración/forma del swing, cruce por cero del gyro; contexto GPS (distancia al green, desplazamiento desde el último golpe) para filtrar.
- Fallos conocidos (declarados por vendors/patentes): practice swings (Golfshot los reemplaza con el golpe real), golpes al piso en practice swing, putts y chips (movimiento sutil), "flick of the wrist" (18Birdies), gimmes/tap-ins (Arccos), múltiples golpes desde el mismo lugar (fallar el golpe → no hay desplazamiento GPS).

### 5. Del golpe detectado al score del hoyo (pipeline de los productos)

- **Hoyo actual por geofence GPS**: Garmin cambia de hoyo automáticamente al moverse al siguiente (manual S40/S42, §1); Shot Scope "GPS+Track" y Golfshot "Green Mode" usan la posición para saber que estás en el green (PDF Golfshot p.6; Shot Scope PinCollect).
- **Conteo de golpes**: = swings detectados dentro del hoyo; Golfshot y 18Birdies lo hacen; Garmin sin CT10 no lo transfiere al score (§1).
- **Putts**: Golfshot los detecta con el API de alta frecuencia (Series 8+) y pide confirmación; 18Birdies los "predice" y pide confirmarlos; Garmin/Shot Scope/Arccos sin sensor en putter → carga manual (Garmin pide N° de putts; Shot Scope PinCollect 0–3).
- **Penalties**: nunca detectados. Garmin CT10: "must be entered manually"; Arccos: se agregan sobre el golpe; 18Birdies: "+ Penalties"; Shot Scope: opciones en el reloj.
- **Paso de revisión/confirmación**: todos lo imponen. Golfshot: "swipe right to review the score screen and confirm your score and putts" al final de cada hoyo; 18Birdies: "Confirm Score"; Shot Scope: "confirm your gross score"; Arccos: Smart Edit marca hoyos inconsistentes; Hole19: sólo sugiere, nunca guarda.
- **Edición posterior**: todos permiten editar la ronda en la app del teléfono (Garmin Golf app / Connect; Golfshot "Tracked Shots"; 18Birdies "Smart Tracking (Hole by Hole)"; Arccos round editor; Shot Scope app).
- **Auto-avance de hoyo**: Garmin y Shot Scope avanzan por GPS; Golfshot/18Birdies avanzan al confirmar el score (Golfshot: "One quick tap to confirm and you're off to the next tee", vía snippet https://golfshot.com/blog/auto-putt-tracking-golf-gps-app).

### 6. Expectativas realistas de precisión

- **Ningún vendor publica cifras**. Las afirmaciones oficiales son cualitativas: Garmin "may not track some shots, particularly chip shots… depending upon lie and ball contact" y "Putts are not detected"; 18Birdies "most full swings are automatically detected… it is possible that there will be mistakes"; Golfshot "Practice swings are usually ignored… typically be replaced".
- Secundarias: MyGolfSpy sobre Approach S70: "would miss the occasional shot but not nearly as many as the S44" (vía snippet) — https://mygolfspy.com/we-tried-it/why-the-garmin-approach-s44-gps-watch-is-kind-of-a-disappointment/ . CNN Underscored sobre Golfshot AST en 45 min de range: ningún falso positivo, pero "two or three missed hits" (vía snippet) — https://www.cnn.com/cnn-underscored/health-fitness/golfshot . Ambas secundarias.
- Literatura: detección por pico IMU solo ≈ 73% precision / 83% recall (raqueta, arXiv 1805.05456); mejora sustancial sólo con una segunda modalidad (audio) o contexto GPS.
- Lectura para Galf: full swings en la cancha sí son detectables desde un Apple Watch Series 8+ con `CMBatchedSensorManager` (requiere workout session, batches a 1 s, modelo propio: Apple no da uno). Putts, chips y penalties van a requerir confirmación humana; el patrón de la industria es "score sugerido + confirmar al terminar el hoyo + editar después", no auto-fill ciego. Y la cobertura de canchas de Garmin no es reutilizable (es un dataset propietario); Galf necesitaría sus propios polígonos de hoyos/greens para el geofence.

---

# Apéndice C. Geometría de canchas y distancias (informe completo)

## Geometría de canchas y cálculo de distancias — research (2026-09-27)

Contexto: feature "distancia al green" estilo Garmin para Galf (PWA Next.js + Supabase). Canchas objetivo: Miraflores CC, Los Cedros, CUBA Villa de Mayo.

**Advertencia sobre fuentes:** el proxy de esta sesión bloqueó (403 en CONNECT) a `*.openstreetmap.org`, todos los mirrors de Overpass (`overpass-api.de`, `kumi.systems`, `private.coffee`, `osm.ch`, `openstreetmap.fr/.ru`, `overpass-turbo.eu`), `download.geofabrik.de`, `golfapi.io`, `igolf.com`, `developers.google.com`, `mapsplatform.google.com`, `www.google.com`, `developer.mozilla.org`, `www.w3.org`, `webkit.org`, `gps.gov` (+ mirrors `archive.gps.gov`, `gps.woc.noaa.gov`, `navcen.uscg.gov`), `support.apple.com`, `www.apple.com`, `docs.mapbox.com`, `developers.arcgis.com`, `leafletjs.com`, `documenter.getpostman.com`, `golfcourseapi.com`. Sí funcionaron: `developer.apple.com`, `cloud.google.com`, `raw.githubusercontent.com`. Lo marcado **[snippet]** proviene de resultados de búsqueda (texto del sitio primario visto vía buscador, no fetch directo); lo marcado **sin verificar** no pude confirmar.

---

### 1. OpenStreetMap: tagging de golf y Overpass

#### Esquema de tags (`golf=*`)
- Presets oficiales del editor iD (repo `openstreetmap/id-tagging-schema`, fetch directo): `golf=hole` es geometría **line** con fields `ref_golf_hole`, `par`, `handicap` (https://raw.githubusercontent.com/openstreetmap/id-tagging-schema/main/data/presets/golf/hole.json). `golf=tee` es **vertex o area** con field `tee` (https://raw.githubusercontent.com/openstreetmap/id-tagging-schema/main/data/presets/golf/tee.json). `golf=green`, `golf=fairway`, `golf=bunker`, `golf=rough` son **area** (…/presets/golf/green.json, fairway.json, bunker.json, rough.json). `golf=water_hazard` y `golf=lateral_water_hazard` son area y agregan `natural=water` (…/presets/golf/water_hazard.json). `golf=cartpath` es line y agrega `highway=path` + `golf_cart=yes` (…/presets/golf/cartpath.json). `leisure=golf_course` es area o point (…/presets/leisure/golf_course.json). Field `par`: integer, min 1 (…/fields/par.json).
- Wiki OSM `Tag:golf=hole` **[snippet]**: "The hole is represented by a way along the standard playing path from tee area to the green"; "the number of nodes that make up the way should be one fewer than the par on the hole"; tags `ref=*` (número de hoyo), `par=*`, `dist=*` (distancia), `handicap=*` (1–18), `name=*` (raro) (https://wiki.openstreetmap.org/wiki/Tag:golf=hole).
- Wiki OSM `Tag:golf=tee` **[snippet]**: "Tee areas are drawn as an area around the ground and tagged with golf=tee. There may be up to 4 tee boxes on a given hole" (https://wiki.openstreetmap.org/wiki/Tag:golf=tee).
- Wiki OSM `Tag:golf=green` **[snippet]**: "the area of short grass on smooth ground surrounding a hole" (https://wiki.openstreetmap.org/wiki/Tag:golf=green). Existe también `golf=pin` (posición de bandera, nodo) (https://wiki.openstreetmap.org/wiki/Tag:golf=pin).
- Implicación para Galf: OSM da la **línea de juego** del hoyo (primer nodo ≈ tee, último nodo ≈ green) y **polígonos** de green/tee/bunker; NO da "front/center/back" explícitos: hay que derivarlos del polígono del green (centroide + intersección con la línea de juego). Los tees por set de marcas se distinguen sólo si el mapeador puso `golf=tee` + `tee=*` / `colour=*` por área (sin verificar convención exacta del field `tee`; el field existe en iD).

#### Overpass QL (ejemplo funcional)
```
[out:json][timeout:60];
// 1) la cancha por nombre (o reemplazar por id conocido: way(ID); / rel(ID);)
nwr["leisure"="golf_course"]["name"~"Miraflores",i](-34.75,-59.15,-34.30,-58.40)->.course;
// 2) todo lo golf=* dentro del área de la cancha
.course map_to_area->.a;
(
  way["golf"](area.a);
  node["golf"](area.a);
  relation["golf"](area.a);
);
out body geom;
.course out body geom;
```
- Variante sin nombre (todo lo golf=* del bbox Pilar–Escobar–Malvinas Argentinas): `[out:json][timeout:60]; ( nwr["leisure"="golf_course"](-34.75,-59.15,-34.30,-58.40); way["golf"~"^(hole|green|tee|fairway|bunker|water_hazard)$"](-34.75,-59.15,-34.30,-58.40); ); out tags center;`
- Conteo por tipo: `[out:csv("golf")]; way["golf"](area.a); out tags;` y contar en cliente; o `out count;` por cada subconjunto.
- Ejemplos de queries de golf en Overpass turbo: hilo OSM Help "How to search golf features linked with golf course" (https://help.openstreetmap.org/questions/65315/how-to-search-golf-features-linked-with-golf-course) y guía "Overpass API by Example" (https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example) **[snippet]**.

#### Resultado de correr la query desde esta sesión
- **BLOQUEADO.** Intenté POST y GET a `https://overpass-api.de/api/interpreter` y a 5 mirrors; todos respondieron `CONNECT tunnel failed, response 403` del proxy. Vía HTTP plano: `Host not in allowlist: overpass-api.de`. Nominatim (`nominatim.openstreetmap.org`) y el extract de Geofabrik Argentina (`download.geofabrik.de/south-america/argentina-latest.osm.pbf`, HTTP 403) también bloqueados. **No puedo afirmar si Miraflores, Los Cedros o CUBA Villa de Mayo tienen hoyos/greens mapeados** — sin verificar.
- Qué correr (owner, desde su máquina): pegar la query de arriba en https://overpass-turbo.eu (o `curl -X POST --data-urlencode 'data@q.ql' https://overpass-api.de/api/interpreter`). Repetir con `"name"~"Cedros",i` y `"name"~"CUBA|Villa de Mayo",i`. Si `.course` viene vacío, buscar la cancha en https://www.openstreetmap.org con el buscador o mirar el bbox en overpass turbo con `nwr["leisure"="golf_course"]({{bbox}})`. Contar `golf=hole` y `golf=green` en el JSON (`jq '[.elements[]|select(.tags.golf=="hole")]|length'`).
- Expectativa realista (sin verificar): la mayoría de canchas fuera de EE.UU./Europa tienen sólo el polígono `leisure=golf_course`; hoyos detallados son minoría. Si faltan, el camino es mapearlos (sección 3a) — con la ventaja de que después Overpass devuelve la geometría lista.

---

### 2. Bases de datos comerciales

- **golfapi.io** (Velocor Ltd, Helsinki — https://www.golfapi.io/privacy.html **[snippet]**). Sitio y docs bloqueados. Según su doc Postman **[snippet]** (https://documenter.getpostman.com/view/1756312/UVeDsT2b): REST para buscar clubs/courses "by name, country, state, city, GPS location"; datos "pars, indexes, tees, distances, slope, and ratings" y "hole-by-hole coordinates for selected courses"; endpoints `/clubs`, `/clubs/{id}`, `/courses`, `/courses/{id}`, `/coordinates/{id}`; API key pidiéndola a contact@golfapi.io; cada fetch de course/club consume 1 call, cada search 0.1. **Precios, tiers, licencia y cobertura de Argentina: sin verificar** (página https://golfapi.io/pricing bloqueada). Ojo: "for selected courses" sugiere que las coordenadas no existen para todas las canchas.
- **iGolf** (https://igolf.com/developers-igolf/ y https://igolf.com/solutions/golf-course-data/ **[snippet]**): plataforma "iGolf Connect API" en JSON; "nearly 40,000 GPS mapped golf courses with elevation terrain data"; licencian a "mobile app developers, connected hardware manufacturers, and website operators"; "Pricing starts for as little as $5,000 per year" con modelo por request o ilimitado. Es decir: sí licencian a terceros, pero el piso (~USD 5.000/año) no es para un proyecto de 5 amigos. Cobertura Argentina: sin verificar.
- **Golf Intelligence** (https://golfintelligence.com/api-pricing/ **[snippet]**): GPS layer data (tee boxes, fairways, bunkers, green shapes); planes desde USD 399/mes. Inviable por precio.
- **GolfCourseAPI** (https://golfcourseapi.com/ **[snippet]**): "Free API for 30,000+ golf courses"; sitio bloqueado, no pude confirmar si trae coordenadas por hoyo (sospecho que sólo scorecard). Sin verificar.
- **Zyla "Golf Courses Data API"** (https://zylalabs.com/api-marketplace/sports+&+gaming/golf+courses+data+api/2029 **[snippet]**): USD 49,99/mes por 5.000 requests; parece datos de cancha/ubicación, no geometría de hoyos. Sin verificar.
- **GolfLogix** tiene página "Map Licensing Inquiries" (https://www.golflogix.com/page/map-licensing-inquiries/ **[snippet]**) — enterprise, sin precios públicos. GolfNow/GolfPass: no encontré API pública de geometría (sin verificar). Hole19: no vende datos (afirmación del pedido, no verificada).
- Conclusión: ningún vendor verificado con precio indie + Argentina + polígonos de green. Para 3 canchas, el DIY (sección 3) es la ruta racional.

---

### 3. Mapeo DIY desde imagen satelital

#### (a) Mapear en OSM con iD (Esri/Bing)
- Permisos de calco **[snippet]**, wiki OSM "Aerial imagery" (https://wiki.openstreetmap.org/wiki/Aerial_imagery): "It is OK to trace from Bing aerial imagery, as Microsoft has given specific permission, and Esri aerial imagery, as Esri has given specific permission". Bing: derecho de calco otorgado en nov. 2010 "for the purpose of contributing content to OpenStreetMap" (https://wiki.openstreetmap.org/wiki/Bing_Maps **[snippet]**). Esri: "grant Users the non-exclusive right to use the World Imagery map to trace features and validate edits in the creation of vector data" para OSM (https://wiki.openstreetmap.org/wiki/Esri **[snippet]**).
- Licencia del resultado: ODbL. Los datos derivados van bajo la Open Database License (https://wiki.openstreetmap.org/wiki/Legal_FAQ **[snippet]**); usarlos en Galf exige atribución "© OpenStreetMap contributors" según https://osmfoundation.org/wiki/Licence/Attribution_Guidelines **[snippet]**. Como Galf sólo lee esos datos (no los mezcla con una DB propietaria que redistribuye), el share-alike no complica: la geometría vive en OSM y Galf la cachea.
- Flujo: abrir la cancha en openstreetmap.org → Edit (iD) → fondo "Esri World Imagery" o "Bing" → dibujar `golf=green` (área), `golf=tee` (área) por set de marcas, `golf=hole` (línea tee→green con `ref`, `par`, `handicap`), bunkers opcionales → guardar → Overpass. Pro: dato público, reutilizable, gratis. Contra: edición pública, imagen a veces vieja; los tees por color dependen de una convención.

#### (b) Google Earth / My Maps → KML
- Google Maps Platform ToS 3.2.3(c), fetch directo (https://cloud.google.com/maps-platform/terms): **"No Creating Content From Google Maps Content. Customer will not create content based on Google Maps Content. For example, Customer will not: (i) trace or digitize roadways, building outlines, utility posts, or electrical lines from the Maps JavaScript API Satellite base map type; (ii) create 3D building models from 45° Imagery from Maps JavaScript API; …"**. 3.2.3(a) "No Scraping … (i) pre-fetch, index, store, reshare, or rehost Google Maps Content outside the services"; 3.2.3(b) "No Caching. Customer will not cache Google Maps Content except as expressly permitted under the Maps Service Specific Terms"; 3.2.3(e) "No Use With Non-Google Maps" (no mostrar contenido Google sobre un mapa no-Google).
- Eso rige la **Platform** (APIs). Para Google Earth / My Maps (consumer) rigen los "Google Maps/Google Earth Additional Terms" (https://www.google.com/help/terms_maps-earth/ — bloqueado, **[snippet]**): no se permite copiar contenido salvo lo autorizado por la página de permisos "Using Google Maps, Google Earth, and Street View"; y "you may not use Google Maps to create or augment any other mapping-related dataset for use in a service that is a substitute for, or a substantially similar service to, Google Maps". Un KML dibujado localmente no queda licenciado a Google **[snippet]**. Lectura conservadora: calcar greens/tees sobre imagen Google para usarlos en otra app es "crear un dataset derivado" y está fuera de lo permitido; con Earth/My Maps es zona gris y sin verificar. **Recomendación: no usar imagen Google como base de calco.**

#### (c) Editor propio sobre Apple Maps satélite
- Nativo: `MKMapType.satellite` = "Satellite imagery of the area"; `MKMapType.hybrid` = "A satellite image of the area with road and road name information layered on top" (https://developer.apple.com/documentation/mapkit/mkmaptype/satellite, …/hybrid — fetch directo). En MapKit JS existen `mapkit.Map.MapTypes.Satellite` / `.Hybrid` (https://developer.apple.com/documentation/mapkitjs/mapkit/map/maptypes — página existe; texto no verificado porque el JSON no cargó).
- MapKit JS: "Embed interactive Apple Maps on your website… across different platforms and operating systems, including iOS and Android"; requiere Maps token (JWT) generado desde la cuenta de Apple Developer (https://developer.apple.com/documentation/mapkitjs). Cuota gratis: "250,000 map views and 25,000 service calls per Apple Developer Program membership" por día (https://developer.apple.com/maps/web/). Requiere membresía (USD 99/año, sin verificar en esta sesión).
- Términos de calco sobre Apple: **sin verificar** — no encontré cláusula explícita que permita o prohíba derivar datos de la imagen satelital de Apple (rige el Apple Developer Program License Agreement, no accesible sin login). Tratar como riesgo legal medio; la opción (a) es la única con permiso explícito de calco.

#### Modelo de datos práctico por hoyo
- `hole`: `course_id`, `number` (1–18), `par`, `stroke_index` (handicap), `centerline` opcional (LineString tee→green, para "dogleg" y para proyectar front/back).
- `tee`: `hole_id`, `tee_set` (ej. azul/blanco/rojo), `lat`, `lng` (punto; en OSM sería centroide del área `golf=tee`).
- `green`: `hole_id`, `polygon` (GeoJSON) **o** tres puntos `front`, `center`, `back`. Con polígono se derivan: center = centroide; front/back = intersecciones del borde con la recta jugador→centroide (recomputado por posición del jugador, más útil que un front fijo desde el tee).
- `hazard` opcional: `hole_id`, `type` (bunker/water), `polygon`; distancia "para pasar" = distancia mínima jugador→borde lejano.
- Todo en WGS84, metros. Guardar como `geography` en Postgres/PostGIS o JSON simple; para 3 canchas alcanza JSON en una tabla `course_geometry`.

---

### 4. Cálculo de distancia y precisión GPS

#### Haversine vs Vincenty/Karney
- Cálculo propio (Python + `geographiclib` 2.1, geodésica WGS84 como referencia; lat −34,45, azimuts cada 15°): error máximo de **haversine con R = 6.371.008,8 m**: 50 m → 0,12 m; 100 m → 0,24 m; 200 m → 0,48 m; 300 m → 0,72 m; 500 m → 1,19 m; 1000 m → 2,39 m (≈0,24 % constante, por diferencia entre radio medio y radio local a esa latitud). Con R = 6.378.137 (ecuatorial) el error sube a 0,35 m/100 m. Aproximación equirectangular da lo mismo que haversine a estas escalas (0,24 m/100 m).
- Conclusión: a 50–500 m el error de fórmula (< 1,2 m) es un orden de magnitud menor que el error GPS (sección siguiente). **Haversine alcanza**; Vincenty/Karney sólo si se quiere purismo. Si se quiere bajar a ~0 gratis: usar radio local `R(φ)` de la elipsoide o `geographiclib-geodesic` (npm) — sin verificar el paquete npm en esta sesión.
- Unidades: la app guarda **metros**; Argentina usa metros en tarjetas. Mostrar yardas sólo como preferencia (1 yd = 0,9144 m exacto, definición internacional).

#### Precisión GPS
- GPS.gov **[snippet]** (https://www.gps.gov/gps-accuracy): "GPS-enabled smartphones are typically accurate to within a 4.9 m (16 ft.) radius under open sky", empeora "near buildings, bridges, and trees". El compromiso del gobierno es sobre la señal: "daily global average user range error (URE) of ≤2.0 m (6.6 ft.), with 95% probability", y "accuracy commitments do not apply to GPS devices". Standard oficial: SPS Performance Standard (https://www.gps.gov/sites/default/files/2025-07/2008-SPS-performance-standard.pdf **[snippet]**; la cifra de ~7,8 m 95 % URE de la versión 2008 no pude verificarla — bloqueado).
- Apple Watch Ultra 3 specs **[snippet]** (https://support.apple.com/en-us/125095): "L1 and L5 precision dual-frequency GPS (GPS, GLONASS, Galileo, QZSS, and BeiDou)". Apple **no publica cifra de precisión en metros**; en CoreLocation `horizontalAccuracy` es "The radius of uncertainty for the location, measured in meters… A negative value indicates that the latitude and longitude are invalid" (https://developer.apple.com/documentation/corelocation/cllocation/horizontalaccuracy — fetch directo). Ese valor se expone al web como `coords.accuracy`.
- Implicación: en cancha abierta esperar ±3–5 m en iPhone (L1) y algo mejor en Ultra (L5); mostrar distancias redondeadas al metro y ocultar/atenuar cuando `accuracy > 15 m`.

#### `navigator.geolocation` en la PWA
- Spec W3C (fuente en GitHub, fetch directo: https://raw.githubusercontent.com/w3c/geolocation/main/index.html): `PositionOptions { enableHighAccuracy = false; timeout = 0xFFFFFFFF; maximumAge = 0 }`. `enableHighAccuracy` "provides a hint that the application would like to receive the most accurate location data… can result in slower response times or increased power consumption". `maximumAge` acepta posición cacheada con edad ≤ ms. Requiere **secure context** (HTTPS) si no → `PERMISSION_DENIED`. Clave: "If document's visibility state is 'hidden', wait for the following page visibility change steps to run" — el algoritmo de adquisición **espera** mientras la página no es visible; o sea, por spec no llegan updates con la app en background.
- iOS: PWA en pantalla de inicio puede usar geolocalización en foreground; "neither iOS nor Android supports geofencing or background location tracking in web apps" (https://www.mobiloud.com/blog/progressive-web-apps-ios/ **[snippet]**, secundaria); `watchPosition` "may stop reporting the user's location to PWAs when the screen of the device is turned off" (https://progressier.com/pwa-capabilities/geolocation **[snippet]**, secundaria). Fuente Apple/WebKit directa: **sin verificar** (webkit.org y MDN bloqueados). Práctica: pedir `enableHighAccuracy: true`, `maximumAge: 0`, y usar Screen Wake Lock API para mantener la pantalla encendida mientras se muestra la distancia (soporte iOS 16.4+, sin verificar en esta sesión).
- Apple Watch: una PWA **no corre en el reloj**; para distancia en muñeca hace falta app nativa watchOS (fuera de este slice).

---

### 5. Mostrar el mapa

#### Imágenes estáticas
- **Google Maps Static API** **[snippet]** (https://developers.google.com/maps/documentation/maps-static/usage-and-billing y https://developers.google.com/maps/billing-and-pricing/pricing, bloqueados): USD 2,00 / 1.000 requests; desde marzo 2025 cada SKU "Essentials" tiene 10.000 eventos gratis/mes (no pooled). Caching: prohibido por ToS 3.2.3(a)/(b) (fetch directo, sección 3b); los Service Specific Terms sólo permiten cachear IDs (`place_id`, `pano_ID`, `video_ID`) (https://cloud.google.com/maps-platform/terms/maps-service-terms — fetch directo). Es decir: la imagen debe pedirse a Google en cada carga, no se puede guardar en Supabase Storage.
- **Apple Maps Web Snapshots** (fetch directo): "static map images from a URL"; parámetro `t` = tipo de mapa, valores permitidos `standard | hybrid | satellite | mutedStandard`, default `standard`; `size` entre `[50, 640]` px por lado, `scale=2` para Retina; URL firmada con credenciales del Apple Developer account (https://developer.apple.com/documentation/snapshots/get-a-map-snapshot y https://developer.apple.com/documentation/snapshots). Cuota: "free daily limit of 25,000 unique requests per day per Apple Developer Program membership" (https://developer.apple.com/maps/web/). Apple Maps Server API: "up to 25,000 service calls per day per team between Apple Maps Server API and MapKit JS", 429 si se excede (https://developer.apple.com/documentation/applemapsserverapi). El Server API es geocoding/search/ETA, **no sirve tiles ni imágenes**.
- **Mapbox Static Images API** **[snippet]** (https://docs.mapbox.com/api/maps/static-images/ y https://www.mapbox.com/pricing): gratis hasta 50.000 requests/mes, luego USD 1,00 / 1.000; soporta estilo satélite.

#### Mapas interactivos en PWA
- **MapKit JS**: 250.000 map views/día gratis con membresía Apple Developer (https://developer.apple.com/maps/web/); tipos Satellite/Hybrid (sección 3c). Overlays (polígonos, líneas) soportados: "you can also add annotations and overlays to the map" (https://developer.apple.com/documentation/mapkitjs). Mejor relación costo/satélite para este caso, a cambio de la membresía anual.
- **Mapbox GL JS** **[snippet]** (https://docs.mapbox.com/mapbox-gl-js/guides/pricing/): 50.000 map loads/mes gratis; un "map load" = cada inicialización del objeto `Map`, incluye tiles ilimitados; el estilo (satélite o streets) no cambia el precio. Para 5 usuarios es gratis de sobra. Requiere token público y atribución.
- **Leaflet + Esri World Imagery** **[snippet]** (https://developers.arcgis.com/esri-leaflet/terms-of-use/, https://location.arcgis.com/pricing/, https://community.esri.com/t5/arcgis-location-platform-developers-ques/inquiry-about-world-imagery/td-p/1569266): requiere cuenta ArcGIS Location Platform (gratis), free tier 2.000.000 tiles/mes, luego USD 0,15 / 1.000 tiles; atribución obligatoria a Esri y proveedores. Un hilo de Esri Community dice que es gratis si no hay revenue y < 1M tiles/mes; otro snippet contradictorio ("not available for commercial use") — condiciones exactas **sin verificar** (sitio bloqueado). Leaflet en sí es BSD, sin costo (https://leafletjs.com **[snippet]**).
- Tiles raster de OSM (`tile.openstreetmap.org`) no tienen satélite y su política de uso prohíbe apps con tráfico sin cache propio — no aplica para imagen satelital (sin verificar en esta sesión).

---

### Recomendación corta
1. Correr la Overpass query (sección 1) desde afuera del proxy para ver qué hay de Miraflores / Los Cedros / CUBA. Si no hay hoyos, mapearlos en iD sobre Esri (permiso de calco explícito, ODbL, ~1–2 h por cancha) y consumir por Overpass, cacheando GeoJSON en Supabase.
2. Modelo: tees por set (punto), green como polígono (derivar front/center/back respecto del jugador), hazards opcional. Metros.
3. Distancia con haversine (error < 1,2 m a 500 m, computado); mostrar `accuracy` y atenuar si > 15 m; `watchPosition` con `enableHighAccuracy: true` + Wake Lock; asumir sin updates con pantalla apagada.
4. Mapa: MapKit JS (satélite, 250k views/día) si se paga membresía Apple; si no, Mapbox GL JS (50k loads/mes gratis). Evitar Google como base de calco y de cache por ToS 3.2.3.
