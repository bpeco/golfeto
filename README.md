# Galf

Anotador de golf para un grupo de amigos: partidas, tarjetas (a mano o por foto) y hándicap WHS.

- Vocabulario del dominio: `CONTEXT.md`. Decisiones: `docs/adr/`.
- Stack: Next.js (App Router, PWA), Supabase (Postgres, Auth con Google, Storage), Vercel.
- Esquema: `supabase/migrations/`.

## Desarrollo

```bash
cp .env.example .env.local   # completar con las keys de Supabase y Anthropic
pnpm install
pnpm dev
pnpm test                    # vitest
pnpm typecheck && pnpm lint
```
