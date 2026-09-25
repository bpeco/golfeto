"use client";

import { useActionState } from "react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { SubmitButton } from "@/components/ui/submit-button";
import { joinGroupAction } from "@/app/(app)/grupos/actions";

export function JoinGroupForm({ code }: { code: string }) {
  const [state, action] = useActionState(joinGroupAction, null);
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
