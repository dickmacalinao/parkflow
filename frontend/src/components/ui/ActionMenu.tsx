import {
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "./Button";
import { cn } from "../../lib/utils";

export function ActionMenuItem({
  destructive = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { destructive?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "w-full rounded-sm px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus:bg-muted disabled:opacity-50",
        destructive &&
          "text-destructive hover:bg-destructive/10 focus:bg-destructive/10",
        className,
      )}
      {...props}
    />
  );
}

export function ActionMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const updatePosition = () => {
    const trigger = triggerRef.current?.getBoundingClientRect();
    const menu = menuRef.current?.getBoundingClientRect();
    if (!trigger || !menu) return;

    const edge = 8;
    const gap = 4;
    const spaceBelow = window.innerHeight - trigger.bottom;
    const spaceAbove = trigger.top;
    const openAbove = spaceBelow < menu.height + gap && spaceAbove > spaceBelow;
    const top = openAbove
      ? Math.max(edge, trigger.top - menu.height - gap)
      : Math.min(trigger.bottom + gap, window.innerHeight - menu.height - edge);
    const left = Math.max(
      edge,
      Math.min(
        trigger.right - menu.width,
        window.innerWidth - menu.width - edge,
      ),
    );

    setPosition({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) return;

    updatePosition();

    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target) &&
        !menuRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onScroll = () => setOpen(false);

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Row actions"
        aria-expanded={open}
        aria-haspopup="true"
        title="Row actions"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[100] max-h-72 min-w-40 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg"
            style={{ top: position.top, left: position.left }}
            onClick={() => setOpen(false)}
          >
            {children}
          </div>,
          document.body,
        )}
    </div>
  );
}
