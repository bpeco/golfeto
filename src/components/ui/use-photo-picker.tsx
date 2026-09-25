"use client";

import { useRef, type ChangeEvent } from "react";

/**
 * Elegir una foto de dos maneras: la cámara (`capture`, abre directo la cámara trasera) o la
 * galería (sin `capture`: en iPhone y Android abre el selector de fotos). Devuelve los inputs
 * ocultos para poner en el árbol y las dos acciones para los botones.
 */
export function usePhotoPicker(onFile: (file: File) => void) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  function handle(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir la misma foto
    if (file) onFile(file);
  }

  const inputs = (
    <>
      <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input ref={gallery} type="file" accept="image/*" className="hidden" onChange={handle} />
    </>
  );

  return {
    inputs,
    takePhoto: () => camera.current?.click(),
    pickPhoto: () => gallery.current?.click(),
  };
}
