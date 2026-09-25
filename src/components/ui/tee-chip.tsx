import { TEE_DOT_CLASS, teeColor } from "@/lib/tee-color";
import { cn } from "@/lib/utils";

/** Punto del color del tee (o nada si el nombre no es un color conocido). */
export function TeeDot({ name, className }: { name: string; className?: string }) {
  const color = teeColor(name);
  if (!color) return null;
  return <span aria-hidden className={cn("inline-block size-3 shrink-0 rounded-full", TEE_DOT_CLASS[color], className)} />;
}

/** Tee como chip: punto de color + nombre. Para elegir un tee, usar dentro de un ToggleGroup. */
export function TeeChip({ name, size = "md", className }: { name: string; size?: "sm" | "md"; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold", size === "sm" ? "text-sm" : "text-base", className)}>
      <TeeDot name={name} className={size === "sm" ? "size-2.5" : undefined} />
      {name}
    </span>
  );
}
