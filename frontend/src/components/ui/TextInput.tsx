import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export const TextInput = forwardRef<
  HTMLTextAreaElement,
  InputHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "h-20 w-full rounded-md border border-border bg-background px-3 text-sm placeholder:text-muted-foreground",
      "focus:outline-none focus:ring-2 focus:ring-primary/30",
      className,
    )}
    {...props}
  ></textarea>
));
TextInput.displayName = "TextInput";
