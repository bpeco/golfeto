"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { FLASH_COOKIE, parseFlash } from "@/lib/flash-shared";

/** Muestra (una sola vez) el mensaje que dejó una server action antes de redirigir. */
export function FlashToaster() {
  const pathname = usePathname();
  useEffect(() => {
    const raw = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${FLASH_COOKIE}=`))
      ?.slice(FLASH_COOKIE.length + 1);
    const flash = parseFlash(raw);
    if (!raw) return;
    document.cookie = `${FLASH_COOKIE}=; Max-Age=0; path=/`;
    if (!flash) return;
    if (flash.tone === "error") toast.error(flash.message);
    else if (flash.tone === "info") toast(flash.message);
    else toast.success(flash.message);
  }, [pathname]);
  return null;
}
