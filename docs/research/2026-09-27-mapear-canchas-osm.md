# Cómo dibujar las canchas en OpenStreetMap para Galf

Fecha: 2026-09-27. Guía para trazar a mano los hoyos de Miraflores y CUBA Villa de Mayo (y la que sea "Los Cedros") de modo que Galf pueda leer la geometría por Overpass. Todo lo de abajo sale de la wiki oficial de OpenStreetMap, del manual de iD en LearnOSM y de las páginas de permisos de Esri y Bing; cada punto lleva su fuente. Estado de las canchas al 2026-09-27: las tres existen como `leisure=golf_course` pero sin hoyos (ver `2026-09-27-apple-watch.md`, "Verificado desde la Mac").

## 1. Por qué OpenStreetMap y no otra cosa

- Es la única fuente donde el calco sobre imagen satelital está **permitido por escrito**. Esri: "Esri and its imagery contributors grant Users the non-exclusive right to use the World Imagery map to trace features and validate edits in the creation of vector data [...] any vector data contributed to OSM is then governed by and released under the OpenStreetMap License (e.g. ODbL)" (https://wiki.openstreetmap.org/wiki/Esri). Bing: "Bing has granted the right to trace from their aerial imagery for the purpose of contributing content to OpenStreetMap. Please note the only legal use of Bing maps is to use the aerial imagery layer as background to do your own OSM drawing" (https://wiki.openstreetmap.org/wiki/Bing_Maps).
- **Prohibido copiar de Google Maps o de cualquier otro mapa**: "You must not use other maps, including Google Maps and other commercial providers, as a source for changes to OpenStreetMap because they include copyrighted data that is not allowed in the database" (https://wiki.openstreetmap.org/wiki/Good_practice). Tampoco vale calcar en Google Earth para usar afuera: sus términos prohíben "use Google Earth to create or augment any other mapping-related dataset" (https://www.google.com/help/terms_maps-earth/).
- Lo que dibujes queda bajo ODbL y Galf lo usa con atribución. Obligaciones: "Provide credit to OpenStreetMap by displaying our attribution notice. Make clear that the data is available under the Open Database License" (https://www.openstreetmap.org/copyright). En la app: un texto "© OpenStreetMap contributors" con link a esa página donde se muestre el mapa del hoyo.
- Después se consulta con Overpass (query en la sección 7) y se cachea en Supabase.

## 2. Herramientas

| Herramienta | Para qué | Fuente |
|---|---|---|
| **FairwayMapper** (https://fairwaymapper.com) | Editor en el navegador hecho solo para canchas de golf: traza "fairways, greens, tees, bunkers, water and lateral water hazards, roughs, holes and centre lines" sobre imagen satelital, con snapping y herramientas de forma, y **sube a OSM**. "Abstracts many of the tagging norms allowing inexperienced mappers to get started mapping their favourite golf courses accurately and quickly." No edita relaciones. | https://wiki.openstreetmap.org/wiki/FairwayMapper |
| **iD** (botón "Edit" en openstreetmap.org) | Editor por defecto de OSM (78 % de los mapeadores en 2024). Sirve para todo, incluidas relaciones y ajuste de offset de imagen. | https://wiki.openstreetmap.org/wiki/ID |
| Esri World Imagery Wayback | Ver la fecha de la imagen y elegir la más nueva y nítida. | https://wiki.openstreetmap.org/wiki/Esri ("Esri Imagery Date Finder") |
| Overpass turbo (https://overpass-turbo.eu) | Verificar lo dibujado y exportar GeoJSON. | https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example |

Recomendación: formas en FairwayMapper (es más rápido para polígonos de golf), relaciones y retoques en iD. Las dos escriben en la misma base; se necesita una **cuenta de OpenStreetMap** (gratis, en openstreetmap.org).

## 3. Antes de dibujar

1. **Fecha de la imagen.** "Just because it is available doesn't mean that aerial imagery is up to date" (https://wiki.openstreetmap.org/wiki/Good_practice). En iD, tecla `B` abre el panel de fondo; probar Esri World Imagery, Esri (Clarity) y Bing, y quedarse con la más nueva y nítida. En Wayback se ve la fecha exacta.
2. **Offset de la imagen.** "Aerial imagery will, regardless of source, have offsets to the real positions of objects on the ground [...] It is mandatory that you check this before moving existing OSM data, or adding more" (https://wiki.openstreetmap.org/wiki/Good_practice). En iD: panel de fondo → "Adjust imagery offset" (https://learnosm.org/en/beginner/id-editor/). Cómo chequearlo sin GPS: comparar con calles y edificios ya mapeados; mejor aún, con un track GPX propio de una vuelta (se arrastra el archivo `.gpx` al editor y se ve encima).
3. **Zoom.** "The iD Editor hides objects when zoomed out [...] Zoom in until you see these features appear. Only then start mapping" (LearnOSM).
4. **Lo que ya existe.** Miraflores tiene un green, un fairway y tres bunkers sueltos (ways 1123711661 a 1123711665). "Deleting objects and redrawing them instead of improving the shape" es un error listado: si están bien, mejorarlos y agregarles lo que falta; no borrarlos (https://wiki.openstreetmap.org/wiki/Golf_course).

## 4. Qué dibujar por hoyo y con qué tags

Todo esto está en https://wiki.openstreetmap.org/wiki/Golf_course y en la página de cada tag. Reglas generales: no usar `sport=golf` ni `leisure=pitch` en los elementos; la superficie va en `surface=*`, no en `landuse` ni `natural`.

| Elemento | Geometría | Tags | Fuente |
|---|---|---|---|
| **Green** | Área alrededor del green | `golf=green` (+ `surface=grass`) | https://wiki.openstreetmap.org/wiki/Tag:golf%3Dgreen |
| **Tee** | Área de cada plataforma de salida (o un nodo en el primer punto del hoyo) | `golf=tee` + `tee=<color>` (`tee=white`, `tee=blue`, `tee=yellow`, `tee=red`; también `tee=<número>`) | https://wiki.openstreetmap.org/wiki/Tag:golf%3Dtee: "The colour reference a tee belongs to is often mapped as tee=<COLOUR>" |
| **Fairway** | Área | `golf=fairway` | https://wiki.openstreetmap.org/wiki/Tag:golf%3Dfairway |
| **Bunker** | Área | `golf=bunker` (+ `surface=sand`) | https://wiki.openstreetmap.org/wiki/Tag:golf%3Dbunker |
| **Laguna / agua** | Área | `golf=water_hazard` (estacas amarillas) o `golf=lateral_water_hazard` (estacas rojas) **más** `natural=water` + `water=pond` u otro | https://wiki.openstreetmap.org/wiki/Tag:golf%3Dwater_hazard |
| **Rough** | Área (opcional) | `golf=rough` | https://wiki.openstreetmap.org/wiki/Key:golf |
| **Hoyo** | **Línea** del tee al green, por el recorrido normal de juego | `golf=hole` + `ref=<número>` + `par=<par>` + `handicap=<hándicap de hoyo 1..18>` | https://wiki.openstreetmap.org/wiki/Tag:golf%3Dhole: "Draw a way from the tee to the pin and add golf=hole" |
| **Bandera** | Nodo (opcional) | `golf=pin`, "Preferably use the last node of the hole way [...] Position it near to the centre of the green" | https://wiki.openstreetmap.org/wiki/Tag:golf%3Dpin |

Detalles que importan para Galf:

- **La línea del hoyo** empieza en el tee y termina en el centro del green. La wiki sugiere que tenga par − 1 nodos (uno por cada golpe "de scratch"), o sea: par 4 = tee, punto de caída del drive, centro del green. En un dogleg, el nodo intermedio marca el codo. Galf usa el último nodo como **centro del green** y la dirección de la línea para calcular **frente y fondo**.
- **Distancias por tee en el hoyo**: en la misma línea se pueden poner `dist:<tee>=<metros>`, `par:<tee>` y `handicap:<tee>` donde `<tee>` es el color del tee ("This information can usually be found on signage close to the tee area"). Sin unidad se asume **metros**; si es en yardas, `dist:white=375 yd` (https://wiki.openstreetmap.org/wiki/Relation:golf).
- **No poner `name`** en hoyos, greens ni bunkers ("name=18th Hole" es un error listado); el número va en `ref`. Otra forma de numerar (`golf_hole=*`) está desaconsejada.
- **Green y fairway no se superponen**: "If there is no fringe [...] butt the fairway and green together and share nodes. If there is a clear fringe around the green, the fairway should extend around the green and be combined with the green into a multipolygon" (https://wiki.openstreetmap.org/wiki/Golf_course).
- **Una feature, un elemento**; nada de polígonos "chupetín" (un área que rodea otra dejando un hueco); para huecos, multipolígono (en iD: dibujar los contornos por separado, seleccionarlos y tecla `C` para combinarlos; LearnOSM).
- Los caminos de carrito son `highway=path` + `golf_cart=yes` (preset `golf=cartpath` de iD); no duplicar calles que ya existen.

## 5. Cómo se atan los hoyos a una cancha (relaciones, en iD)

Fuente: https://wiki.openstreetmap.org/wiki/Relation:golf.

- **Relación de cancha**: `type=golf` + `golf=course` + `name=<nombre de la cancha>` + `golf:course=18_hole` (o `9_hole`) + `golf:par=<par total>`. Miembros: las 18 líneas `golf=hole` **en orden**, con rol vacío ("Elements will be added with an empty role in order of the holes"). La wiki prefiere esto a poner `golf:course` sobre el polígono del club, porque "it is hard for data consumers to compute which course a golf=hole lies inside of".
- **Relación de tee markers**, una por color: `type=golf` + `golf=tee_markers` + `tee=<color>` + `golf:course_rating:male=` + `golf:slope_rating:male=` (y `:female` si aplica) + `distance=<total en metros>`. Miembros: las áreas `golf=tee` de ese color. Esta relación se agrega como miembro de la relación de cancha.
- Miraflores y CUBA tienen una sola cancha por club, así que alcanza con una relación de cancha por club. CUBA aparece dos veces en OSM como `leisure=golf_course` (way 258487608 en Villa de Mayo y way 50814152 cerca de Pilar): verificar cuál es la que juega el grupo antes de dibujar.

## 6. Guardar

- Al guardar, iD pide un comentario del changeset: "A good changeset comment should concisely and adequately describe an edit" (https://wiki.openstreetmap.org/wiki/Good_practice). Ejemplo: "Miraflores Country Club: hoyos 1–9 (greens, tees, fairways, bunkers, líneas de hoyo) desde Esri World Imagery y conocimiento local".
- En "Sources" poner la imagen usada (Esri World Imagery / Bing) y "local knowledge" para par, hándicap y distancias tomados de la tarjeta del club.
- Si otro editó lo mismo mientras tanto, iD avisa el conflicto y hay que elegir qué versión queda (LearnOSM, "Saving Your Changes").
- Guardar seguido: un changeset por cancha o por grupo de hoyos, no todo al final.

## 7. Verificar con Overpass y exportar

Query para una cancha (en https://overpass-turbo.eu o por `curl` con un `User-Agent` propio, porque overpass-api.de responde 406 sin él):

```
[out:json][timeout:90];
// Miraflores = relation(15569350); CUBA Villa de Mayo = way(258487608); Los Cedros (OSM) = way(176336963)
relation(15569350)->.course;
.course map_to_area->.a;
(
  way["golf"](area.a);
  node["golf"](area.a);
  relation["type"="golf"](area.a);
);
out body geom;
```

Con `way(ID)` en vez de `relation(ID)` para las que son ways. Si `map_to_area` devuelve vacío (pasa cuando el área no está indexada todavía), usar un bbox alrededor del centro: Miraflores `(-34.460,-58.760,-34.425,-58.710)`, Villa de Mayo `(-34.535,-58.705,-34.495,-58.675)`.

Chequeo esperado por cancha de 18: 18 `golf=hole` con `ref` 1..18 sin repetir, 18 `golf=green`, tees por color por hoyo, `par` y `handicap` en cada hoyo. Galf lee esto y deriva: centro del green = centroide del polígono `golf=green` (o último nodo de la línea); frente y fondo = intersección del borde del green con la recta jugador → centro.

## 8. Orden sugerido

1. Cuenta OSM. Abrir Miraflores en FairwayMapper con la imagen más nueva; ajustar offset en iD si hace falta.
2. Por hoyo: green → tees por color → fairway → bunkers y agua → línea del hoyo con `ref`, `par`, `handicap` y `dist:<tee>` de la tarjeta del club.
3. Cada 3 o 4 hoyos, guardar con comentario.
4. Al terminar, en iD: relación de cancha con los 18 hoyos en orden, y una relación de tee markers por color con rating y slope.
5. Correr la query de la sección 7 y guardar el JSON en el repo (`docs/seed/` o donde vaya la geometría) para que la próxima sesión lo importe.

Tiempo estimado: una o dos horas por cancha para greens, tees y líneas; fairways y bunkers agregan una hora más. Con una vuelta grabada en GPX (el Apple Watch la guarda como ruta de workout; se exporta desde Fitness o con apps de terceros) el offset y la posición real de los tees quedan mucho mejor.
