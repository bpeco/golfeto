"use client";

import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { controlClass } from "./control-class";
import { useFieldControl } from "./field";

export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  const a11y = useFieldControl(props);
  return <input type={type} data-slot="input" className={cn(controlClass, "h-tap px-3", className)} {...props} {...a11y} />;
}
