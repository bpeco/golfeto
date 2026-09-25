/**
 * Rutas que el proxy sirve sin sesión. Toda ruta o archivo público nuevo (íconos, splash,
 * manifest) tiene que estar acá: el matcher del proxy solo excluye estáticos por extensión.
 */
const PUBLIC_PREFIXES = [
  "/login",
  "/auth",
  "/manifest.webmanifest",
  "/icon",
  "/apple-icon",
  "/icons",
  "/splash",
  "/favicon.ico",
];

/**
 * El playground de componentes: siempre en desarrollo, en los deploys Preview de Vercel
 * (VERCEL_ENV lo pone Vercel solo) y donde se fuerce con GALF_PLAYGROUND=1. Nunca en producción.
 */
export function playgroundEnabled(env: Record<string, string | undefined> = process.env) {
  return env.NODE_ENV !== "production" || env.VERCEL_ENV === "preview" || env.GALF_PLAYGROUND === "1";
}

export function isPublicPath(pathname: string, opts: { playground?: boolean } = {}) {
  const playground = opts.playground ?? playgroundEnabled();
  const matches = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  if (playground && matches("/dev")) return true;
  return PUBLIC_PREFIXES.some(matches);
}
