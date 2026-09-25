---
status: accepted (variante y tipografía provisionales hasta que el dueño confirme la Puerta 1)
---

# La interfaz habla la gramática de la tarjeta de papel y de la pizarra del club

El MVP tenía la interfaz por defecto de cualquier generador (cards redondeadas con sombra, eyebrows en mayúsculas, metadatos con "·") y el camino obvio para "darle cara de golf" (verde club + crema + serif) es otro cliché. Decidimos que la app use el lenguaje de los objetos reales del golf: la tarjeta de papel (grilla rayada Hoyo | Par | Hcp | Golpes, Ida / Vuelta / Total, círculo = birdie, cuadrado = bogey, puntitos de golpes recibidos, colores de tee) en toda la app, y la pizarra manual de resultados (numerales condensados grandes, rojo bajo par) en exactamente dos lugares: el Hándicap Index del Inicio y el ranking del Grupo. Las primitivas son shadcn/ui sobre Base UI, re-estiladas por tokens OKLCH propios (papel teñido en claro, verde-negro en oscuro, un solo verde de acento), y el movimiento se reserva a un reveal al entrar y a cambios disparados por el usuario. La forma de la notación lleva el significado y el color solo lo refuerza, lo que además resuelve la accesibilidad por color. Detalle y reglas: `DESIGN.md`.
