# Golfeto

Anotador de golf para un grupo de amigos: cada uno registra sus rondas (a mano o subiendo la foto de la tarjeta de papel) y la app calcula y grafica el hándicap. Términos en español rioplatense; nombre en código entre paréntesis.

## Language

### Personas

**Golfista** (`Player`):
Una persona con cuenta en la app. Tiene un único Hándicap Index, independiente de los grupos a los que pertenezca.
_Avoid_: usuario, miembro, jugador (salvo dentro de una partida)

**Grupo** (`Group`):
Comunidad de golfistas que se ven mutuamente las partidas, tarjetas y hándicaps. Un golfista puede estar en varios grupos.
_Avoid_: liga, club, comunidad

### Juego

**Partida** (`Round`):
Un evento de juego: una cancha, un tee, una fecha y uno o más golfistas. Contiene una tarjeta por golfista.
_Avoid_: ronda, juego, salida, torneo

**Tarjeta** (`Scorecard`):
Los golpes hoyo por hoyo de un golfista en una partida. Es lo que se firma y lo que alimenta el hándicap.
_Avoid_: score, planilla, resultado

**Golpes** (`Strokes`):
Cantidad de golpes reales de un golfista en un hoyo, tal como se jugó. Los ajustes para hándicap se calculan aparte, nunca se guardan sobre los golpes.
_Avoid_: score, tiros, puntos

**Firmar** (`Sign`):
Acto por el cual el golfista da por definitiva su propia tarjeta y la entrega. Solo una tarjeta firmada cuenta para el hándicap.
_Avoid_: entregar, cerrar, confirmar

**Foto de tarjeta** (`ScorecardPhoto`):
Imagen de la tarjeta de papel de una partida. Pertenece a la partida (una hoja suele tener a todos los jugadores), no a una tarjeta individual.

### Cancha

**Cancha** (`Course`):
Un recorrido de golf identificado por club y nombre (un club puede tener más de una cancha).
_Avoid_: campo, club, course

**Tee** (`TeeSet`):
Conjunto de salidas de una cancha identificado por color (blancas, azules, amarillas, rojas), con su propio Course Rating, Slope y distancias por hoyo.
_Avoid_: salida, marcas, color

**Hoyo** (`Hole`):
Uno de los hoyos de una cancha, con número, par y hándicap de hoyo; la distancia depende del tee.

**Hándicap de hoyo** (`StrokeIndex`):
Orden de dificultad (1 a 18) que determina en qué hoyos un golfista recibe golpes.
_Avoid_: índice, dificultad

### Hándicap

**Hándicap Index** (`HandicapIndex`):
El hándicap del golfista según el WHS: promedio de los mejores 8 diferenciales de sus últimas 20 tarjetas firmadas.
_Avoid_: hándicap (a secas), índice

**Hándicap de cancha** (`CourseHandicap`):
Golpes que recibe un golfista en una partida concreta, derivado de su Hándicap Index y del tee jugado.
_Avoid_: hándicap (a secas), hándicap de juego

**Diferencial** (`ScoreDifferential`):
Valor de una tarjeta firmada normalizado por la dificultad del tee; es la unidad con la que se calcula el Hándicap Index.

**Gross** (`GrossScore`):
Total de golpes reales de una tarjeta.

**Neto** (`NetScore`):
Gross menos el hándicap de cancha.
