import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-10 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";
