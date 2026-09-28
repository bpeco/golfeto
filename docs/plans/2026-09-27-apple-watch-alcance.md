# Galf en Apple Watch: alcance

Fecha: 2026-09-27. Rama: `claude/apple-watch-golf-exploration-1jum5r`. Este documento fija **qué** se va a construir y qué no; **cómo y en qué orden** lo define la sesión de planificación siguiente, que debe leer antes `docs/research/2026-09-27-apple-watch.md` (viabilidad, con fuentes) y `docs/research/2026-09-27-mapear-canchas-osm.md` (cómo se dibujan las canchas).

## Decisiones del dueño (2026-09-27)

| Qué | Decisión |
|---|---|
| Foco | Solo Apple Watch por ahora. "Lo más completo posible." |
| Reloj del dueño | Apple Watch **Series 6, 44 mm**. Los relojes del resto del grupo: sin relevar. |
| Herramientas | Mac con Xcode y **Apple Developer Program ya pago**. |
| iPhone | **Sin app nativa de iPhone.** El reloj es una app independiente (watch-only) que habla con Supabase; el teléfono sigue usando la PWA para todo lo demás. |
| Canchas | **Miraflores Country Club** y **CUBA Villa de Mayo**. "Los Cedros" era una confusión de nombre con la cancha de CUBA (`PRODUCT.md` todavía dice "Miraflores y Los Cedros"; corregir cuando se toque). |
| Geometría | El dueño **dibuja las canchas a mano** en OpenStreetMap siguiendo la guía. |

## Hechos que acotan el alcance

Cada uno con su fuente en los documentos de research salvo que se indique.

1. **El Series 6 se queda en watchOS 26.** watchOS 27 requiere SE 3, Series 9 en adelante o Ultra 2 en adelante (https://www.apple.com/watchos/); watchOS 26 sí incluye Series 6 (página de Apple archivada en marzo de 2026: https://web.archive.org/web/20260306025131/https://www.apple.com/os/watchos/). Xcode 27 compila para watchOS 9 a 27 (https://developer.apple.com/support/xcode/). **Deployment target: watchOS 10** como piso (Map de SwiftUI con polígonos y polilíneas), probado en watchOS 26 en el Series 6.
2. **Sin sensores de alta frecuencia.** `CMBatchedSensorManager` (800 Hz) existe solo en Series 8 y Ultra en adelante. En el Series 6 queda `CMMotionManager` a ~100 Hz. Golfshot y 18Birdies detectan swings completos con eso desde Series 3, pero **la detección de putts queda fuera** y los chips son poco confiables. No hay API de swing de Apple: el detector es propio.
3. **Series 6**: GPS/GNSS L1, brújula, Always-On Retina, agua 50 m, "hasta 18 horas" de batería según spec (https://support.apple.com/en-us/111918). Es un reloj de 2020 con batería usada: **una vuelta de 4 a 5 h con GPS continuo y sensores es el riesgo número uno** y hay que medirlo antes de diseñar alrededor. Sin Double Tap (Series 9 en adelante).
4. **App independiente = login propio.** Apple exige que una app watch-only pueda crear sesión sola. Supabase soporta Sign in with Apple nativo en watchOS (`signInWithIdToken(provider: .apple)`, https://supabase.com/docs/guides/auth/social-login/auth-apple) y `supabase-swift` corre en watchOS 9+. Para que el reloj entre a **la misma cuenta** que hoy usa Google: Supabase vincula automáticamente identidades con el **mismo email** (https://supabase.com/docs/guides/auth/auth-identity-linking); si el usuario elige "Ocultar mi email" de Apple no se vincula, y queda el "manual linking" (beta, hay que habilitarlo en el proyecto). Alternativa a evaluar en la planificación: pasar la sesión desde la PWA con un código corto o un link, que evita el proveedor Apple.
5. **Conectividad.** Sin el iPhone encima y sin Wi-Fi, un reloj solo GPS queda offline. La app tiene que funcionar con la partida y la cancha cacheadas y una cola de golpes por sincronizar.
6. **Mapas y licencias.** Google no tiene SDK para watchOS; cachear imágenes de Google o Apple viola sus licencias. El mapa del hoyo se dibuja con geometría propia (polígonos de green, fairway y bunkers desde OSM, licencia ODbL con atribución) sobre `Map` de SwiftUI o un `Canvas`. Satélite de Apple disponible pero no garantizado en el reloj.
7. **Modelo de datos.** El reloj escribe lo mismo que la PWA: `hole_scores` por tarjeta y posición, con RLS de participante. Firmar, cambiar cancha y todo lo demás sigue en la PWA. Lo único nuevo en la base es la geometría de canchas y lo que necesite la sincronización.

## Dentro del alcance

### A. Geometría de canchas (bloquea todo lo demás)

- El dueño dibuja en OSM greens, tees por color, fairways, bunkers, agua y la línea de cada hoyo con `ref`, `par`, `handicap` y `dist:<tee>`; relación de cancha y relaciones de tee markers. Guía: `docs/research/2026-09-27-mapear-canchas-osm.md`.
- Importador: query Overpass → GeoJSON → tabla nueva en Supabase ligada a la versión de cancha vigente (por hoyo: centro del green, polígono del green, tees por tee set, obstáculos opcionales; WGS84, metros). Mantener el vínculo con los ids de OSM para reimportar. ADR corto: fuente OSM, ODbL, atribución.
- Derivados que calcula la app: frente, centro y fondo del green respecto de la posición del jugador; geocerca por hoyo para saber en cuál está.

### B. App watchOS "Galf" (el producto)

Independiente, SwiftUI, `supabase-swift`, target watchOS 10, probado en el Series 6 del dueño.

- **Entrar**: Sign in with Apple (o handoff desde la PWA; ver hecho 4). Primera vez con el iPhone cerca; después con la sesión guardada en Keychain.
- **Partida**: elegir la partida de hoy (creada en la PWA) y la propia tarjeta. Decidir en la planificación si el reloj también puede **crear** una partida rápida (cancha, tee, yo solo) para no depender del teléfono.
- **Anotar**: golpes del hoyo actual con la corona y botones grandes; Hoyo no terminado; ver la tarjeta completa; corregir cualquier hoyo. Autosave con la misma semántica que la PWA (se ve al instante, queda "sucio" hasta que el servidor confirma) más **cola offline** con reintento y aviso claro.
- **Hoyo actual por GPS**: cambia solo al entrar en la geocerca del hoyo siguiente, con confirmación háptica; siempre se puede cambiar a mano.
- **Distancia al green**: frente / centro / fondo en metros, letras grandes legibles al sol, con indicador de precisión GPS y atenuado si la precisión es peor que 15 m. Opcional: distancia para pasar bunkers y agua si están dibujados.
- **Mapa del hoyo**: green, fairway, bunkers y la línea del hoyo con la posición del jugador, dibujados con geometría propia; satélite si el reloj lo rinde. Atribución "© OpenStreetMap contributors".
- **Workout de golf** (`HKWorkoutSession`, `.golf`, `.outdoor`): mantiene la app viva con la muñeca baja, GPS continuo, hápticos en segundo plano, ruta guardada en Salud. Inicio y fin explícitos. La app avisa si el reloj no tiene batería para la vuelta (umbral a definir con mediciones).
- **Always On**: distancia y golpes visibles sin levantar la muñeca, una actualización por segundo.
- **Complicación / Smart Stack**: hoyo actual, golpes y distancia con la partida activa.
- **Distribución**: TestFlight interno para el grupo (sin revisión de Apple, builds de 90 días); App Store más adelante si se quiere algo permanente.

### C. Detección de golpes asistida (experimento con puerta de salida)

Apple no da API de golpes y el Series 6 no tiene sensores de alta frecuencia, así que esto se construye como experimento y **solo se activa si mide bien**.

- **Recolección**: durante partidas reales de B, grabar acelerómetro y giroscopio a 100 Hz (`CMMotionManager`, dentro del workout) junto con los golpes anotados a mano y la posición GPS. Guardar como archivos en Supabase Storage. Sin esto no hay forma de evaluar nada.
- **Detector**: umbral de pico de velocidad angular en el downswing más pico de aceleración al impacto, con contexto GPS (desplazamiento desde el último golpe, distancia al green) para descartar swings de práctica y gestos. Medir precisión y recall contra los golpes anotados.
- **Producto**: si el detector supera un umbral a definir (orientativo: 90 % de swings completos detectados con menos de un falso positivo por hoyo), la app pasa a **"score sugerido"**: cuenta swings, pide los putts al salir del green y muestra "¿6 golpes?" para confirmar al terminar el hoyo. **Nunca escribe en `hole_scores` sin confirmación.** Putts y penalidades siempre a mano.
- Si no supera el umbral: queda como "vibración al detectar un golpe" o se apaga. Ninguna parte de B depende de C.

### D. Backend y operación

- Tabla de geometría de canchas con RLS de lectura para autenticados (como `holes`), escritura solo por el importador con service role. Sin tocar tarjetas, firmas ni hándicap.
- Proveedor Apple habilitado en Supabase Auth (App ID nativo; para watch-only no hace falta Services ID ni secret rotation, según la doc de Supabase). Decidir automatic vs manual linking.
- Bucket para grabaciones de sensores (C), con RLS por golfista.
- El proyecto Swift vive en este mismo repo (propuesta: carpeta `watch/`), con su `CLAUDE.md` o sección propia, para que roadmap, ADR y vocabulario sigan siendo uno solo.

## Fuera del alcance

- App nativa de iPhone; cualquier intento de PWA en el reloj.
- Comprar o licenciar datos de canchas (golfapi.io, iGolf); calcar sobre Google Maps o Google Earth; cachear tiles o imágenes de Google o Apple.
- Auto-completar la tarjeta sin confirmación; detección de putts; detección de penalidades.
- Firmar la tarjeta desde el reloj; cambiar la cancha desde el reloj; foto de tarjeta; hándicap y ranking (siguen en la PWA).
- Otras canchas que no sean Miraflores y CUBA Villa de Mayo (la mecánica sirve para cualquiera dibujada en OSM, pero no se dibuja ninguna otra).
- Stableford, match play, invitados desde el reloj.
- Android / Wear OS / Garmin.

## Riesgos que la planificación tiene que atacar temprano

1. **Batería del Series 6 en una vuelta completa** con workout, GPS continuo y (en C) sensores. Medir en las primeras semanas con una app mínima, antes de construir la UI.
2. **Offline real** en la cancha sin el iPhone: caché de partida y cancha, cola de golpes, conflicto con el teléfono anotando la misma tarjeta (hoy gana la última escritura; ver "Requiere DB" en el roadmap).
3. **Auth**: que el reloj entre a la misma cuenta que Google sin que el usuario tenga que entender nada. Prototipar antes de decidir.
4. **Precisión de la geocerca** con GPS L1 de ±5 m en hoyos paralelos o tees cercanos a greens de otro hoyo.
5. **Calidad de la geometría**: depende del dibujo del dueño y de la imagen disponible; validar con una vuelta grabada (GPX del workout) antes de confiar.
6. **watchOS 26 congelado en el Series 6**: cualquier API nueva de watchOS 27 queda fuera mientras ese sea el reloj de referencia.

## Cómo se sabe que está terminado

- Una partida real de 18 hoyos en Miraflores anotada **solo desde el reloj**, sin tocar el teléfono, que al terminar aparece completa en la PWA y se firma ahí.
- Distancia al centro del green que coincide con la tarjeta del club dentro de ±10 m desde el tee, en al menos 15 de 18 hoyos.
- El hoyo cambia solo en al menos 16 de 18 transiciones.
- La vuelta completa con workout y GPS termina con batería restante en el Series 6 (cifra a fijar en las mediciones).
- Modo avión durante 3 hoyos: los golpes quedan en cola y se sincronizan al volver la red, sin perder nada.
- Para C: el informe de precisión y recall sobre al menos 3 partidas grabadas, con la decisión escrita de activar o no el score sugerido.

## Preguntas abiertas para la sesión de planificación

- ¿Sign in with Apple con vinculación automática, manual, o handoff de sesión desde la PWA?
- ¿El reloj puede crear una partida rápida o siempre nace en la PWA?
- ¿Quién más del grupo tiene Apple Watch y cuál? Define si se mantiene watchOS 10 como piso o se sube.
- ¿Dónde vive el proyecto Swift (carpeta `watch/` acá o repo aparte) y cómo se versiona junto con la PWA?
- ¿Qué se muestra cuando la cancha no tiene geometría (partida en otra cancha): solo anotador, sin distancias?
- ¿Metros con opción de yardas, o solo metros?

## Orden sugerido de bloques

A (geometría, la puede empezar el dueño ya) → D (auth y tabla) → B en tres cortes: anotador con workout y batería medida, después distancia y hoyo automático, después mapa y complicación → C solo cuando B ya se usa en partidas reales.
