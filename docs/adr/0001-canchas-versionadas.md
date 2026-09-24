# Las canchas se versionan; una partida referencia la versión vigente en su fecha

Las canchas cambian (par, distancias, hándicap de hoyo, rediseños) y queremos que las ediciones queden "en vivo", pero un cambio no puede alterar tarjetas ya jugadas ni el hándicap histórico. Decidimos que editar una cancha crea una nueva `CourseVersion` con vigencia desde/hasta, y cada partida apunta a la versión vigente en su fecha en lugar de a la cancha "actual". La alternativa (una sola fila mutable por cancha) era más simple pero reescribe la historia.
