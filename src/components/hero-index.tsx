"use client";

import { useEffect, useState } from "react";
import { BoardNumber } from "@/components/ui/board-number";
import { alreadyLaunched } from "@/components/launch-marker";

/**
 * El Hándicap Index del Inicio. Al arrancar la app rueda desde el punto anterior del historial
 * (o desde 0) hasta el actual: muestra la tendencia. En navegaciones internas, quieto.
 */
export function HeroIndex({ value, previous }: { value: number | null; previous: number | null }) {
  const [shown, setShown] = useState<number | null>(value);
  useEffect(() => {
    if (value == null || alreadyLaunched() || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- arranca desde el valor anterior solo en el cliente
    setShown(previous ?? 0);
    const t = setTimeout(() => setShown(value), 350);
    return () => clearTimeout(t);
  }, [value, previous]);
  return <BoardNumber value={shown} kind="index" size="xl" animate />;
}
