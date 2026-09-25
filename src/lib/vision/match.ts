/** Propone a qué jugador de la partida corresponde cada fila leída de la foto. */
export function suggestAssignments(
  rowNames: string[],
  players: { id: string; name: string }[],
): (string | null)[] {
  const taken = new Set<string>();
  return rowNames.map((raw) => {
    const n = normalize(raw);
    if (!n) return null;
    let best: { id: string; score: number } | null = null;
    for (const p of players) {
      if (taken.has(p.id)) continue;
      const score = similarity(n, normalize(p.name));
      if (score > (best?.score ?? 0)) best = { id: p.id, score };
    }
    if (best && best.score >= 0.5) {
      taken.add(best.id);
      return best.id;
    }
    return null;
  });
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/** 1 si un nombre contiene al otro o comparten prefijo largo; si no, ratio de bigramas comunes. */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const words = b.split(" ");
  if (words.some((w) => w.length >= 3 && (w.startsWith(a) || a.startsWith(w)))) return 0.9;
  if (b.includes(a) || a.includes(b)) return 0.8;
  // Apodos rioplatenses: "Javo" → "Javier", "Bauti" → "Bautista": prefijo común de 3+ letras.
  if (words.some((w) => commonPrefix(a, w) >= 3)) return 0.7;
  const ga = bigrams(a);
  const gb = bigrams(b);
  let common = 0;
  for (const g of ga) if (gb.has(g)) common++;
  return (2 * common) / (ga.size + gb.size);
}

function commonPrefix(a: string, b: string) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function bigrams(s: string) {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}
