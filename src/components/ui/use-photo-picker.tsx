"use client";

import { useRef, type ChangeEvent } from "react";

/**
 * Elegir una foto. Sin `capture` a propósito: el sistema ofrece sacarla en el momento, la
 * fototeca o un archivo (iPhone y Android), así que alcanza con un solo botón. Devuelve el input
 * oculto para poner en el árbol y la acción para el botón.
 */
export function usePhotoPicker(onFile: (file: File) => void) {
  const ref = useRef<HTMLInputElement>(null);

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir la misma foto
    if (file) onFile(file);
  }

  return {
    input: <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />,
    pickPhoto: () => ref.current?.click(),
  };
}
