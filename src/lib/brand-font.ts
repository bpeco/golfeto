import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** Sofia Sans Extra Condensed 800 (OFL, en src/app/icons/_fonts) para ImageResponse. */
export const BRAND_FONT = "Sofia Sans Extra Condensed";

let cached: Promise<Buffer> | null = null;

export function brandFont() {
  cached ??= readFile(join(process.cwd(), "src/app/icons/_fonts/SofiaSansExtraCondensed-800.ttf"));
  return cached.then((data) => [{ name: BRAND_FONT, data, weight: 800 as const, style: "normal" as const }]);
}
