"use client";

import { useActionState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionResult } from "@/lib/action-result";
import { cancelReplace, expectReplace } from "@/lib/nav-history";
import { joinGroupAction } from "@/app/(app)/grupos/actions";

export function JoinGroupForm({ code }: { code: string }) {
  const [state, action] = useActionState(async (prev: ActionResult | null, formData: FormData) => {
    expectReplace(); // al unirse, el grupo reemplaza a la invitación en el historial
    const r = await joinGroupAction(prev, formData);
    if (r && !r.ok) cancelReplace();
    return r;
  }, null);
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="code" value={code} />
      {state && !state.ok && (
        <Notice tone="error" title={state.error}>
          El link puede haber sido revocado. Pedile uno nuevo a quien administra el grupo.
        </Notice>
      )}
      <SubmitButton size="lg" pendingLabel="Uniéndote…">
        Unirme
      </SubmitButton>
      <Link href="/" className={buttonVariants({ variant: "ghost", size: "lg" })}>
        Ahora no
      </Link>
    </form>
  );
}
