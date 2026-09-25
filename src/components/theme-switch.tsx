"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Segmented } from "@/components/ui/toggle-group";

const subscribe = () => () => {};

/** Sistema / Claro / Oscuro. Se guarda en este teléfono (localStorage). */
export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // El tema elegido solo existe en el cliente: en el servidor se muestra "Sistema".
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  return (
    <Segmented
      label="Tema"
      className={className}
      value={(mounted ? (theme ?? "system") : "system") as "system" | "light" | "dark"}
      onValueChange={setTheme}
      options={[
        { value: "system", label: <><Monitor aria-hidden className="size-4" /> Sistema</> },
        { value: "light", label: <><Sun aria-hidden className="size-4" /> Claro</> },
        { value: "dark", label: <><Moon aria-hidden className="size-4" /> Oscuro</> },
      ]}
    />
  );
}
