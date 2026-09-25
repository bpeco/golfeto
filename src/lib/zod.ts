/**
 * zod con mensajes en español por defecto. Los esquemas importan `z` de acá (no de "zod") y
 * además ponen mensajes propios por campo cuando el genérico no alcanza.
 */
import { z } from "zod";

z.config(z.locales.es());

export { z };
