"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field";
import { controlClass } from "./control-class";

export function Textarea({ className, rows = 3, ...props }: ComponentProps<"textarea">) {
  const a11y = useFieldControl(props);
  return <textarea rows={rows} data-slot="textarea" className={cn(controlClass, "min-h-tap px-3 py-2.5 leading-snug", className)} {...props} {...a11y} />;
}
