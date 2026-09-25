"use client";

import { useState } from "react";
import { AnimatedBoardNumber } from "@/components/ui/animated-board-number";
import { alreadyLaunched } from "@/components/launch-marker";

/**
 * El Hándicap Index del Inicio. Al arrancar la app rueda desde el punto anterior del historial
 * (o desde 0) hasta el actual: muestra la tendencia. En navegaciones internas, quieto.
 * El servidor pinta el valor de partida para que no haya salto al hidratar.
 */
export function HeroIndex({ value, previous }: { value: number | null; previous: number | null }) {
  // En el servidor y al hidratar, alreadyLaunched() es false; en una navegación interna, true.
  const [from] = useState(() => (value == null || alreadyLaunched() ? undefined : (previous ?? 0)));
  return <AnimatedBoardNumber value={value} from={from} kind="index" size="xl" />;
}
