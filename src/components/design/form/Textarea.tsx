import type { ComponentProps } from "react";
import { cn } from "@/core/utils/cn";
import { fieldClassName } from "./styles";

type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, ...props }: TextareaProps) {
  return <textarea className={cn(fieldClassName, "resize-none py-4", className)} {...props} />;
}
