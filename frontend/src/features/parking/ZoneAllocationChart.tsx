import { cn } from "../../lib/utils";
import type { Slot } from "./parking.hooks";
import type { Reservation } from "../reservations/reservations.hooks";

export type ChartPeriod = "DAY" | "WEEK" | "MONTH";

export interface ChartRange {
  start: Date;
  end: Date;
}

export function getPeriodRange(date: Date, period: ChartPeriod): ChartRange {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (period === "WEEK") {
    start.setDate(start.getDate() - start.getDay());
    end.setDate(start.getDate() + 7);
  } else if (period === "MONTH") {
    start.setDate(1);
    end.setMonth(start.getMonth() + 1, 1);
  } else {
    end.setDate(start.getDate() + 1);
  }
  return { start, end };
}

export function shiftPeriod(
  date: Date,
  period: ChartPeriod,
  direction: -1 | 1,
): Date {
  const next = new Date(date);
  if (period === "WEEK") next.setDate(next.getDate() + 7 * direction);
  else if (period === "MONTH") next.setMonth(next.getMonth() + direction);
  else next.setDate(next.getDate() + direction);
  return next;
}

export function formatRangeLabel(
  range: ChartRange,
  period: ChartPeriod,
): string {
  const { start, end } = range;
  if (period === "DAY") {
    return start.toLocaleDateString(undefined, { dateStyle: "medium" });
  }
  const endInclusive = new Date(end.getTime() - 1);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
  };
  const startLabel = start.toLocaleDateString(undefined, options);
  const endLabel = endInclusive.toLocaleDateString(undefined, {
    ...options,
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatSlotDate(
  reservation: Reservation,
  period: ChartPeriod,
): string {
  const start = new Date(reservation.startAt);
  if (period === "DAY") {
    return start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return start.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const STATUS_STYLES: Record<string, { bar: string; label: string }> = {
  AVAILABLE: {
    bar: "border border-dashed border-border bg-transparent",
    label: "Available",
  },
  RESERVED: { bar: "bg-amber-500", label: "Reserved" },
  OCCUPIED: { bar: "bg-primary", label: "Occupied" },
  BLOCKED: { bar: "bg-muted-foreground/30", label: "Blocked" },
  INACTIVE: { bar: "bg-muted", label: "Inactive" },
};

export const ALLOCATION_LEGEND = [
  ...Object.values(STATUS_STYLES),
  {
    bar: "bg-amber-500 ring-2 ring-foreground/60",
    label: "Allocated in period",
  },
  { bar: "bg-red-500", label: "Now" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

interface DayTimelineProps {
  slots: Slot[];
  reservationsBySlot: Map<string, Reservation[]>;
  range: ChartRange;
}

function DayTimeline({ slots, reservationsBySlot, range }: DayTimelineProps) {
  const dayStart = range.start.getTime();
  const nowPct = ((Date.now() - dayStart) / DAY_MS) * 100;
  const showNowLine = nowPct >= 0 && nowPct <= 100;
  return (
    <div className="space-y-2">
      {slots.map((slot) => {
        const reservations = reservationsBySlot.get(slot.id) ?? [];
        return (
          <div key={slot.id} className="flex items-center gap-2">
            <span className="w-16 shrink-0 truncate text-xs font-medium">
              {slot.code}
            </span>
            <div className="relative h-6 flex-1 overflow-hidden rounded bg-muted/40">
              {reservations.map((r) => {
                const start = new Date(r.startAt).getTime();
                const end = new Date(r.endAt).getTime();
                const left = Math.max(0, ((start - dayStart) / DAY_MS) * 100);
                const width =
                  Math.min(100, ((end - dayStart) / DAY_MS) * 100) - left;
                if (width <= 0) return null;
                return (
                  <div
                    key={r.id}
                    title={`${r.code} — ${new Date(r.startAt).toLocaleTimeString()} to ${new Date(r.endAt).toLocaleTimeString()}`}
                    className="absolute inset-y-0 rounded bg-amber-500/80"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                );
              })}
              {showNowLine && (
                <div
                  className="absolute inset-y-0 w-0.5 bg-red-500"
                  style={{ left: `${nowPct}%` }}
                  title="Current time"
                />
              )}
            </div>
            <span className="w-20 shrink-0 text-right text-[10px] text-muted-foreground">
              {reservations.length === 0
                ? "Free all day"
                : `${reservations.length} booked`}
            </span>
          </div>
        );
      })}
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>12a</span>
        <span>6a</span>
        <span>12p</span>
        <span>6p</span>
        <span>11:59p</span>
      </div>
    </div>
  );
}

interface WeekMonthGridProps {
  slots: Slot[];
  reservationsBySlot: Map<string, Reservation[]>;
  range: ChartRange;
  period: ChartPeriod;
}

function WeekMonthGrid({
  slots,
  reservationsBySlot,
  range,
  period,
}: WeekMonthGridProps) {
  const days: Date[] = [];
  const dayCount =
    period === "WEEK" ? 7 : new Date(range.end.getTime() - 1).getDate();
  for (let index = 0; index < dayCount; index += 1) {
    const day = new Date(range.start);
    day.setDate(day.getDate() + index);
    days.push(day);
  }
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-px rounded-md bg-border"
        style={{
          gridTemplateColumns: `80px repeat(${days.length}, minmax(28px, 1fr))`,
        }}
      >
        <div className="bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground">
          Slot
        </div>
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "bg-card px-1 py-1 text-center text-[9px] font-medium text-muted-foreground",
              day.getTime() === todayMs &&
                "border-x-2 border-x-red-500 text-red-500",
            )}
          >
            {period === "WEEK"
              ? day.toLocaleDateString(undefined, {
                  weekday: "short",
                  day: "numeric",
                })
              : day.getDate()}
          </div>
        ))}
        {slots.map((slot) => (
          <>
            <div
              key={`${slot.id}-label`}
              className="bg-card px-2 py-1 text-xs font-medium"
            >
              {slot.code}
            </div>
            {days.map((day) => {
              const dayStart = day.getTime();
              const dayEnd = dayStart + DAY_MS;
              const booked = (reservationsBySlot.get(slot.id) ?? []).some(
                (r) =>
                  new Date(r.startAt).getTime() < dayEnd &&
                  new Date(r.endAt).getTime() > dayStart,
              );
              return (
                <div
                  key={`${slot.id}-${day.toISOString()}`}
                  title={`${slot.code} — ${day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}${booked ? " (booked)" : ""}`}
                  className={cn(
                    "h-6 bg-card px-1 py-1 text-center text-[9px]",
                    booked && "bg-amber-500/80",
                    day.getTime() === todayMs && "border-x-2 border-x-red-500",
                  )}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

interface ZoneAllocationChartProps {
  zoneName: string;
  slots: Slot[];
  reservationsBySlot: Map<string, Reservation[]>;
  period: ChartPeriod;
  range: ChartRange;
}

export function ZoneAllocationChart({
  zoneName,
  slots,
  reservationsBySlot,
  period,
  range,
}: ZoneAllocationChartProps) {
  const allocatedCount = slots.filter((slot) =>
    reservationsBySlot.has(slot.id),
  ).length;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-medium">{zoneName}</h3>
        <span className="text-xs text-muted-foreground">
          {allocatedCount} of {slots.length} allocated in period
        </span>
      </div>
      {period === "DAY" ? (
        <DayTimeline
          slots={slots}
          reservationsBySlot={reservationsBySlot}
          range={range}
        />
      ) : (
        <WeekMonthGrid
          slots={slots}
          reservationsBySlot={reservationsBySlot}
          range={range}
          period={period}
        />
      )}
    </div>
  );
}
