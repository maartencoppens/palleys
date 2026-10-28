import type { ComponentProps } from "react";
import { cn } from "@/core/utils/cn";
import { fieldClassName } from "./styles";

type InputProps = ComponentProps<"input">;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(fieldClassName, className)} {...props} />;
}
