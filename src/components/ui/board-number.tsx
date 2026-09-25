import { fmtIndex, fmtToPar } from "@/lib/format";
import { cn } from "@/lib/utils";

const SIZES = {
  md: "text-numeral",
  lg: "text-numeral-lg",
  xl: "text-numeral-xl",
} as const;

export type BoardNumberProps = {
  value: number | null | undefined;
  kind?: "index" | "int" | "toPar";
  size?: keyof typeof SIZES;
  tone?: "auto" | "none";
  className?: string;
};

export function boardNumberClass({ value, kind = "int", size = "lg", tone, className }: BoardNumberProps) {
  const autoTone = (tone ?? (kind === "toPar" ? "auto" : "none")) === "auto" && value != null && value !== 0;
  const toneClass = autoTone ? (value! < 0 ? "text-score-under" : "text-score-over") : undefined;
  return cn("font-display font-bold tabular-nums leading-none", SIZES[size], toneClass, value == null && "text-muted-foreground", className);
}

export function boardNumberText(value: number, kind: BoardNumberProps["kind"] = "int") {
  return kind === "index" ? fmtIndex(value) : kind === "toPar" ? fmtToPar(value) : String(value);
}

/**
 * Numeral de pizarra (cara condensada, tabular). `kind`:
 * - index: Hándicap Index con coma ("21,3"; los plus con "+").
 * - int: entero (gross, puesto).
 * - toPar: "E", "+3", "−2", coloreado bajo/sobre par salvo que se fije `tone`.
 * Estático y sin JS; para que ruede de un valor al siguiente, `AnimatedBoardNumber`.
 */
export function BoardNumber(props: BoardNumberProps) {
  const { value, kind } = props;
  return <span className={boardNumberClass(props)}>{value == null ? "—" : boardNumberText(value, kind)}</span>;
}
