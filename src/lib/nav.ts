/** Pestaña activa: Inicio solo en "/" exacto; el resto también en sus subrutas. */
export function isTabActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
