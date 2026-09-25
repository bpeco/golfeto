import { cn } from "@/lib/utils";

/** Dos letras del nombre ("Agustín Pérez" → "AP", "Agus" → "AG"). */
export function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const SIZES = { sm: "size-7 text-xs", md: "size-9 text-sm", lg: "size-11 text-base" } as const;

export function Initials({ name, size = "md", className }: { name: string; size?: keyof typeof SIZES; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-muted font-display font-bold tracking-wide text-foreground",
        SIZES[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
