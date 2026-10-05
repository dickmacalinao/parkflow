import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { CalendarDays } from "lucide-react";
import { Button } from "./Button";
import { Input } from "./Input";
import { Label } from "./Label";
import { FormError } from "./FormError";

interface CalendarDateTimePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

function parseLocalDateTime(value: string): Date | undefined {
  const [datePart, timePart = "00:00"] = value.split("T");
  if (!datePart) return undefined;
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  if (![year, month, day].every(Number.isFinite)) return undefined;
  return new Date(year, month - 1, day, hours || 0, minutes || 0);
}

function formatDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function CalendarDateTimePicker({
  id,
  label,
  value,
  onChange,
  error,
}: CalendarDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedDateTime = parseLocalDateTime(value);
  const selectedDate = selectedDateTime
    ? new Date(
        selectedDateTime.getFullYear(),
        selectedDateTime.getMonth(),
        selectedDateTime.getDate(),
      )
    : undefined;
  const timeValue = value.split("T")[1] ?? "09:00";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectDate = (date: Date | undefined) => {
    if (!date) return;
    onChange(`${formatDate(date)}T${timeValue}`);
    setOpen(false);
  };

  const selectTime = (time: string) => {
    if (!selectedDate) return;
    onChange(`${formatDate(selectedDate)}T${time}`);
  };

  return (
    <div ref={rootRef} className="relative space-y-2">
      <Label htmlFor={`${id}-date`}>{label}</Label>
      <div className="flex gap-2">
        <Button
          id={`${id}-date`}
          type="button"
          variant="outline"
          className="min-w-0 flex-1 justify-start font-normal"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((current) => !current)}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {selectedDate
              ? selectedDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Choose date"}
          </span>
        </Button>
        <Input
          id={`${id}-time`}
          type="time"
          className="w-32"
          aria-label={`${label} time`}
          disabled={!selectedDate}
          value={timeValue}
          onChange={(event) => selectTime(event.target.value)}
        />
      </div>
      {open && (
        <div className="absolute z-50 mt-2 rounded-md border border-border bg-card p-3 shadow-lg">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={selectDate}
          />
        </div>
      )}
      <FormError message={error} />
    </div>
  );
}
