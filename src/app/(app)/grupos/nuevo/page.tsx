import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { NewGroupForm } from "./new-group-form";

export const metadata: Metadata = { title: "Nuevo grupo" };

export default function NewGroupPage() {
  return (
    <>
      <PageHeader title="Nuevo grupo" back={{ fallback: "/grupos" }} />
      <NewGroupForm />
    </>
  );
}
