import type { ComponentProps } from "react";
import { cn } from "@/core/utils/cn";
import { labelClassName } from "./styles";

type LabelProps = ComponentProps<"label">;

export function Label({ className, ...props }: LabelProps) {
  return <label className={cn(labelClassName, className)} {...props} />;
}
