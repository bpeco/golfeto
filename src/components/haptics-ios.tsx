"use client";

import { IOS_HAPTIC_LABEL_ID, iosHapticsEnabled } from "@/lib/haptics";

/**
 * Soporte del truco de haptics en iOS (ver src/lib/haptics.ts). Solo se monta con el flag;
 * invisible y fuera del orden de tabulación.
 */
export function HapticsIOS() {
  if (!iosHapticsEnabled) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed -left-[9999px] size-px overflow-hidden opacity-0">
      <input id={`${IOS_HAPTIC_LABEL_ID}-input`} type="checkbox" tabIndex={-1} {...{ switch: "" }} />
      <label id={IOS_HAPTIC_LABEL_ID} htmlFor={`${IOS_HAPTIC_LABEL_ID}-input`} />
    </div>
  );
}
