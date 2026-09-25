import { Shell } from "@/components/shell";
import { CourseForm } from "../course-form";

export default function NewCoursePage() {
  return (
    <Shell title="Nueva cancha" back="/canchas">
      <CourseForm courseId={null} />
    </Shell>
  );
}
