import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Initials } from "@/components/ui/initials";
import { List, ListRow } from "@/components/ui/list";
import { PageHeader } from "@/components/ui/page-header";
import { listMyGroups } from "@/lib/db/groups";
import { requirePlayer } from "@/lib/db/player";
import { fmtCount } from "@/lib/format";

export const metadata: Metadata = { title: "Grupos" };

export default async function GroupsPage() {
  const me = await requirePlayer();
  const groups = await listMyGroups(me.id);
  return (
    <>
      <PageHeader
        title="Grupos"
        action={
          <Link href="/grupos/nuevo" aria-label="Nuevo grupo" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <Plus />
          </Link>
        }
      />
      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no estás en ningún grupo"
          body="Creá uno o entrá con el link de invitación que te mandaron por WhatsApp."
          action={
            <Link href="/grupos/nuevo" className={buttonVariants()}>
              Crear grupo
            </Link>
          }
        />
      ) : (
        <List>
          {groups.map((g) => (
            <ListRow
              key={g.id}
              href={`/grupos/${g.id}`}
              leading={<Initials name={g.name} />}
              title={g.name}
              meta={fmtCount(g.memberCount, "golfista")}
            />
          ))}
        </List>
      )}
    </>
  );
}
