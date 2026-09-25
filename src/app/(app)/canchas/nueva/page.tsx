import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { todayInArgentina } from "@/lib/dates";
import { CourseForm } from "../course-form";

export const metadata: Metadata = { title: "Nueva cancha" };

export default function NewCoursePage() {
  return (
    <>
      <PageHeader title="Nueva cancha" back={{ fallback: "/canchas" }} />
      <CourseForm courseId={null} today={todayInArgentina()} />
    </>
  );
}
