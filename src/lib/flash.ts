import "server-only";
import { cookies } from "next/headers";
import { FLASH_COOKIE, type Flash } from "./flash-shared";

/**
 * Mensaje para mostrar como toast después de un redirect (una server action que crea algo y
 * lleva a su pantalla). Cookie de 30 s legible por el cliente; FlashToaster la consume.
 */
export async function flash(message: string, tone: Flash["tone"] = "success") {
  const store = await cookies();
  store.set(FLASH_COOKIE, encodeURIComponent(JSON.stringify({ message, tone } satisfies Flash)), {
    path: "/",
    maxAge: 30,
    sameSite: "lax",
    httpOnly: false,
  });
}
