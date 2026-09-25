# Galf — contexto de producto

Contexto para cualquier trabajo de diseño (humano, Impeccable u otro skill). Qué es la app, para quién y en qué condiciones se usa. El lenguaje visual está en `DESIGN.md`; el vocabulario, en `CONTEXT.md`.

> Escrito a mano en la Fase 0 del rediseño: `npx impeccable install` no pudo bajar el bundle de skills desde la sesión (403 del proxy). Si se instala Impeccable más adelante, `/impeccable init` debe reconciliar con este archivo, no reemplazarlo.

## Qué es

Anotador de golf para un grupo cerrado de amigos (cinco hoy) que juegan en Buenos Aires, casi siempre en Miraflores y Los Cedros. Cada uno anota los golpes de su partida hoyo por hoyo o le saca una foto a la tarjeta de papel; la app calcula el Hándicap Index según el WHS (el mismo sistema que usa la AAG) y muestra quién viene mejor.

No es un producto comercial: no hay marketing, onboarding de embudo, planes ni métricas de crecimiento. Se entra con Google y con el link que manda el admin del grupo por WhatsApp.

## Quiénes la usan

- Cinco golfistas amateurs, hándicap de 15 a 30, de entre 25 y 35 años, rioplatenses. Juegan de a 2–4 los fines de semana.
- Uno de ellos (el dueño del proyecto) carga canchas y administra el grupo.
- Invitados sin cuenta aparecen en partidas con nombre y hándicap declarado; no usan la app.

## Dónde y cómo se usa

- **En la cancha, parado, con una mano**: el celular en una mano, el guante puesto en la otra (o el palo). Entre golpe y golpe, 10–20 segundos de atención.
- **Al sol**: pantallas a medio brillo bajo luz directa. Los números tienen que leerse a un brazo de distancia.
- **Red mala**: señal intermitente en muchos hoyos. Anotar un golpe no puede depender de que el servidor responda al instante; si falla, se tiene que ver y se tiene que poder reintentar.
- **Después de jugar, en el bar o en casa**: firmar la tarjeta, mirar cómo quedó el hándicap, comparar con el grupo, cargar la foto de la tarjeta de papel si nadie anotó en vivo.
- PWA instalada en el inicio del teléfono (iOS Safari y Android Chrome). Casi nunca en desktop.

## Tareas principales (en orden de frecuencia)

1. Anotar golpes durante una partida (el momento crítico: rápido, sin errores, con una mano).
2. Firmar la propia tarjeta al terminar y ver el Hándicap Index nuevo.
3. Mirar el propio índice y el ranking del grupo.
4. Crear una partida (cancha, tee, fecha, quiénes juegan).
5. Cargar golpes desde la foto de la tarjeta de papel y revisar lo que leyó el modelo.
6. Comparar con otro golfista (cara a cara) y ver la evolución.
7. Cargar o corregir una cancha (una vez por cancha, idealmente desde la foto de la tarjeta del club).

## Tono

- Español rioplatense, voseo ("Firmá tu tarjeta", "Te faltan 2 tarjetas"). Frases cortas, sin exclamaciones, sin chistes forzados.
- Vocabulario de golf y del WHS tal como lo dice el grupo (ver `CONTEXT.md`): Partida, Tarjeta, Golpes, Firmar, Hoyo no terminado, Hándicap Index, Hándicap de cancha, Gross, Neto, Tee.
- Cada error dice qué pasó y qué hacer. Ningún error se traga.

## Qué tiene que sentirse

Un objeto de golf, no una app de productividad: la tarjeta de papel (grilla, círculos de birdie, cuadrados de bogey, puntitos de golpes recibidos) y la pizarra de resultados de un club (numerales grandes, rojo bajo par). Callado en todo lo demás.

## Qué evitar

- Estética de "IA genérica": kit SaaS de cards con sombra, eyebrows en mayúsculas, metadatos encadenados con "·", gradientes, crema + serif + terracota, negro con verde ácido.
- "Golf = verde + crema + serif". El verde es uno solo y es de acento.
- Animaciones decorativas. Solo una secuencia al entrar y movimiento disparado por el usuario para mostrar qué cambió.
- Botones chicos, texto de menos de 12 px, color como único significado.

## Restricciones técnicas

- Next.js 16 (App Router), React 19, Tailwind v4, Supabase, Vercel. shadcn/ui sobre Base UI como capa de primitivas.
- La base de datos no se toca desde el rediseño (ver `docs/plans/2026-09-25-rediseno-ui-ux.md`, "Excluido").
