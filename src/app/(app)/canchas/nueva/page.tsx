import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { CourseForm } from "../course-form";

export const metadata: Metadata = { title: "Nueva cancha" };

export default function NewCoursePage() {
  return (
    <Shell title="Nueva cancha" back="/canchas">
      <CourseForm courseId={null} />
    </Shell>
  );
}
