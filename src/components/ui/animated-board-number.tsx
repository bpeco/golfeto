"use client";

import { useEffect, useState } from "react";
import type NumberFlowType from "@number-flow/react";
import { MINUS } from "@/lib/format";
import { BoardNumber, boardNumberClass, type BoardNumberProps } from "./board-number";

let loaded: typeof NumberFlowType | null = null;

/**
 * BoardNumber que rueda de un valor al siguiente (NumberFlow; respeta "reducir movimiento").
 * NumberFlow se baja aparte: hasta que llega se ve el número quieto, idéntico.
 */
export function AnimatedBoardNumber(props: BoardNumberProps) {
  const [NumberFlow, setNumberFlow] = useState(() => loaded);
  useEffect(() => {
    if (NumberFlow) return;
    let alive = true;
    import("@number-flow/react").then((mod) => {
      loaded = mod.default;
      if (alive) setNumberFlow(() => mod.default);
    });
    return () => {
      alive = false;
    };
  }, [NumberFlow]);

  const { value, kind = "int" } = props;
  if (!NumberFlow || value == null || (kind === "toPar" && value === 0)) return <BoardNumber {...props} />;

  const className = boardNumberClass(props);
  if (kind === "index") {
    return (
      <NumberFlow
        className={className}
        value={Math.abs(value)}
        prefix={value < 0 ? "+" : undefined}
        locales="es-AR"
        format={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
      />
    );
  }
  if (kind === "toPar") return <NumberFlow className={className} value={Math.abs(value)} prefix={value > 0 ? "+" : MINUS} />;
  return <NumberFlow className={className} value={value} />;
}
