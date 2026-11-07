import { useEffect, useState } from "react";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { getApiErrorMessage } from "../../lib/apiClient";
import { useUpdateSlot, type Slot } from "./parking.hooks";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const PRESETS: { label: string; days: number[] }[] = [
  { label: "Weekends", days: [0, 6] },
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Every day", days: [] },
];

const sameDays = (a: number[], b: number[]) =>
  a.length === b.length && a.every((day) => b.includes(day));

const toDateInput = (value?: string | null) =>
  value ? value.slice(0, 10) : "";

export function describeSharing(slot: Slot): string {
  if (!slot.isShared) return "Personal use";
  const days = slot.availableDays ?? [];
  const parts: string[] = [];
  const preset = PRESETS.find(
    (item) => item.days.length && sameDays(item.days, days),
  );
  if (preset) parts.push(preset.label);
  else if (days.length)
    parts.push(
      [...days]
        .sort()
        .map((day) => DAYS[day])
        .join(", "),
    );
  if (slot.availableFromDate || slot.availableToDate) {
    parts.push(
      `${toDateInput(slot.availableFromDate) || "…"} to ${toDateInput(slot.availableToDate) || "…"}`,
    );
  }
  if (slot.availableStartTime && slot.availableEndTime) {
    parts.push(`${slot.availableStartTime}–${slot.availableEndTime}`);
  }
  return parts.length ? parts.join(" · ") : "Shared, any time";
}

interface SlotSharingDialogProps {
  slot: Slot | null;
  onClose: () => void;
}

export function SlotSharingDialog({ slot, onClose }: SlotSharingDialogProps) {
  const updateSlot = useUpdateSlot();
  const [isShared, setIsShared] = useState(false);
  const [days, setDays] = useState<number[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slot) return;
    setIsShared(slot.isShared ?? false);
    setDays(slot.availableDays ?? []);
    setFromDate(toDateInput(slot.availableFromDate));
    setToDate(toDateInput(slot.availableToDate));
    setStartTime(slot.availableStartTime ?? "");
    setEndTime(slot.availableEndTime ?? "");
    setError(null);
  }, [slot]);

  const toggleDay = (day: number) =>
    setDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    );

  const onSave = async () => {
    if (!slot) return;
    if (fromDate && toDate && toDate < fromDate) {
      setError("The end date must not be before the start date.");
      return;
    }
    if (Boolean(startTime) !== Boolean(endTime)) {
      setError("Set both a start and an end time, or leave both empty.");
      return;
    }
    if (startTime && endTime && endTime <= startTime) {
      setError("The end time must be after the start time.");
      return;
    }
    setError(null);
    try {
      await updateSlot.mutateAsync({
        id: slot.id,
        input: {
          isShared,
          availableDays: days,
          availableFromDate: fromDate || null,
          availableToDate: toDate || null,
          availableStartTime: startTime || null,
          availableEndTime: endTime || null,
        },
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={!!slot}
      onClose={onClose}
      title={slot ? `Availability for ${slot.code}` : "Availability"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            isLoading={updateSlot.isPending}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="destructive">{error}</Alert>}
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={isShared}
            onChange={(event) => setIsShared(event.target.checked)}
          />
          <span>
            Let others reserve this slot
            <span className="block text-xs text-muted-foreground">
              When off, the slot is for your personal use only. Times follow the
              property&apos;s timezone.
            </span>
          </span>
        </label>

        <fieldset
          disabled={!isShared}
          className="space-y-4 disabled:opacity-50"
        >
          <div className="space-y-2">
            <Label>Days of the week</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant={sameDays(days, preset.days) ? "default" : "outline"}
                  onClick={() => setDays(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {DAYS.map((label, day) => (
                <label key={label} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={days.includes(day)}
                    onChange={() => toggleDay(day)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave all unchecked to allow every day.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="share-from">Available from</Label>
              <Input
                id="share-from"
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="share-to">Available until</Label>
              <Input
                id="share-to"
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="share-start">Daily start time</Label>
              <Input
                id="share-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="share-end">Daily end time</Label>
              <Input
                id="share-end"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>
        </fieldset>
      </div>
    </Dialog>
  );
}
