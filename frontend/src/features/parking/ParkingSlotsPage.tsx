import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useProperties } from "../properties/properties.hooks";
import { useSetSlotStatus, useSlots, type Slot } from "./parking.hooks";
import { usePendingSlots, useReviewSlot } from "./parking.hooks";
import {
  useReservations,
  type Reservation,
} from "../reservations/reservations.hooks";
import {
  ALLOCATION_LEGEND,
  ZoneAllocationChart,
  formatRangeLabel,
  getPeriodRange,
  shiftPeriod,
  type ChartPeriod,
} from "./ZoneAllocationChart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { ActionMenu, ActionMenuItem } from "../../components/ui/ActionMenu";
import { Alert } from "../../components/ui/Alert";
import { getApiErrorMessage } from "../../lib/apiClient";

const STATUS_TONE: Record<
  string,
  "default" | "success" | "destructive" | "muted"
> = {
  AVAILABLE: "success",
  RESERVED: "default",
  OCCUPIED: "destructive",
  BLOCKED: "muted",
  INACTIVE: "muted",
};

export function ParkingSlotsPage() {
  const { user } = useAuth();
  const { data: properties } = useProperties();
  const [selectedPropertyId, setSelectedPropertyId] = useState<
    string | undefined
  >(undefined);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isPropertyManager = user?.role === "PROPERTY_MANAGER";
  const propertyId = isSuperAdmin
    ? selectedPropertyId
    : (user?.propertyId ?? undefined);
  const { data: slots, isLoading } = useSlots(propertyId);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("MONTH");
  const [chartDate, setChartDate] = useState(() => new Date());
  const chartRange = getPeriodRange(chartDate, chartPeriod);
  const { data: reservationsData } = useReservations(
    {
      isStaff: true,
      propertyId,
      from: chartRange.start.toISOString(),
      to: chartRange.end.toISOString(),
      pageSize: 100,
    },
    !!propertyId,
  );
  const { data: pendingSlots, isLoading: pendingSlotsLoading } =
    usePendingSlots(isPropertyManager);
  const setStatus = useSetSlotStatus();
  const reviewSlot = useReviewSlot();
  const [reviewError, setReviewError] = useState<string | null>(null);
  const reservationsBySlot = new Map<string, Reservation[]>();
  reservationsData?.rows
    .filter((reservation) =>
      ["APPROVED", "CHECKED_IN"].includes(reservation.status),
    )
    .forEach((reservation) => {
      const list = reservationsBySlot.get(reservation.slot.id) ?? [];
      list.push(reservation);
      reservationsBySlot.set(reservation.slot.id, list);
    });
  const slotsByZone = new Map<string, { name: string; slots: Slot[] }>();
  slots?.forEach((slot) => {
    const zone = slotsByZone.get(slot.zone.id) ?? {
      name: slot.zone.name,
      slots: [],
    };
    zone.slots.push(slot);
    slotsByZone.set(slot.zone.id, zone);
  });
  const pendingSlotsByZone = new Map<string, { name: string; slots: Slot[] }>();
  pendingSlots?.forEach((slot) => {
    const zone = pendingSlotsByZone.get(slot.zone.id) ?? {
      name: slot.zone.name,
      slots: [],
    };
    zone.slots.push(slot);
    pendingSlotsByZone.set(slot.zone.id, zone);
  });

  const onReview = async (slot: Slot, decision: "APPROVED" | "REJECTED") => {
    setReviewError(null);
    try {
      await reviewSlot.mutateAsync({ id: slot.id, decision });
    } catch (err) {
      setReviewError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h1 className="text-2xl font-semibold mr-3">Parking Slots</h1>
        {isSuperAdmin && (
          <Select
            className="w-64"
            value={selectedPropertyId ?? ""}
            onChange={(e) => setSelectedPropertyId(e.target.value || undefined)}
          >
            <option value="">Select a Property</option>
            {properties
              ?.filter((p) => p.status === "ACTIVE")
              ?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </Select>
        )}
      </div>

      {isLoading && <Spinner />}
      {reviewError && <Alert tone="destructive">{reviewError}</Alert>}

      {!propertyId && (
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin
            ? "Choose a property to see its bays."
            : "Your account is not assigned to a property."}
        </p>
      )}

      {slots && slots.length === 0 && propertyId && (
        <p className="text-sm text-muted-foreground">
          No parking slots found for this property.
        </p>
      )}

      {slotsByZone.size > 0 && (
        <div className="space-y-6">
          {[...slotsByZone.entries()]
            .sort(([, first], [, second]) =>
              first.name.localeCompare(second.name),
            )
            .map(([zoneId, zone]) => (
              <section key={zoneId} className="space-y-3">
                <div className="flex items-baseline justify-between border-b border-border pb-2">
                  <h2 className="text-lg font-semibold">{zone.name}</h2>
                  <span className="text-sm text-muted-foreground">
                    {zone.slots.length}{" "}
                    {zone.slots.length === 1 ? "slot" : "slots"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                  {zone.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-md border border-border p-3 text-center"
                    >
                      <div className="font-semibold">{slot.code}</div>
                      <Badge
                        tone={STATUS_TONE[slot.status] ?? "muted"}
                        className="mt-1"
                      >
                        {slot.status.toLowerCase()}
                      </Badge>
                      <div className="mt-2 flex justify-center gap-1">
                        {slot.status === "BLOCKED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setStatus.mutate({
                                id: slot.id,
                                status: "AVAILABLE",
                              })
                            }
                          >
                            Unblock
                          </Button>
                        ) : slot.status === "AVAILABLE" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setStatus.mutate({
                                id: slot.id,
                                status: "BLOCKED",
                              })
                            }
                          >
                            Block
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}

      {isPropertyManager && (
        <section className="space-y-4 border-t border-border pt-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">
              Parking Slots for Verification
            </h2>
            {pendingSlots && (
              <span className="text-sm text-muted-foreground">
                {pendingSlots.length} pending
              </span>
            )}
          </div>
          {pendingSlotsLoading ? (
            <Spinner />
          ) : pendingSlotsByZone.size === 0 ? (
            <p className="text-sm text-muted-foreground">
              No parking slots are waiting for verification.
            </p>
          ) : (
            <div className="space-y-6">
              {[...pendingSlotsByZone.entries()]
                .sort(([, first], [, second]) =>
                  first.name.localeCompare(second.name),
                )
                .map(([zoneId, zone]) => (
                  <section key={zoneId} className="space-y-3">
                    <div className="flex items-baseline justify-between border-b border-border pb-2">
                      <h3 className="text-lg font-semibold">{zone.name}</h3>
                      <span className="text-sm text-muted-foreground">
                        {zone.slots.length}{" "}
                        {zone.slots.length === 1 ? "slot" : "slots"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                      {zone.slots.map((slot) => (
                        <div
                          key={slot.id}
                          className="rounded-md border border-border p-3 text-center"
                        >
                          <div className="font-semibold">{slot.code}</div>
                          <Badge tone="default" className="mt-1">
                            Pending verification
                          </Badge>
                          <div className="mt-2 flex justify-center">
                            <ActionMenu>
                              <ActionMenuItem
                                onClick={() => onReview(slot, "APPROVED")}
                              >
                                Approve
                              </ActionMenuItem>
                              <ActionMenuItem
                                destructive
                                onClick={() => onReview(slot, "REJECTED")}
                              >
                                Reject
                              </ActionMenuItem>
                            </ActionMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          )}
        </section>
      )}

      {slotsByZone.size > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>Parking Allocation</CardTitle>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex gap-1">
                  {(["DAY", "WEEK", "MONTH"] as ChartPeriod[]).map((period) => (
                    <Button
                      key={period}
                      type="button"
                      size="sm"
                      variant={chartPeriod === period ? "default" : "outline"}
                      onClick={() => setChartPeriod(period)}
                    >
                      {period.charAt(0) + period.slice(1).toLowerCase()}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label="Previous period"
                    onClick={() =>
                      setChartDate((date) => shiftPeriod(date, chartPeriod, -1))
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-40 text-center text-sm font-medium">
                    {formatRangeLabel(chartRange, chartPeriod)}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-label="Next period"
                    onClick={() =>
                      setChartDate((date) => shiftPeriod(date, chartPeriod, 1))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {[...slotsByZone.entries()]
              .sort(([, first], [, second]) =>
                first.name.localeCompare(second.name),
              )
              .map(([zoneId, zone]) => (
                <div className="border-b border-border pb-3 mb-5">
                  <ZoneAllocationChart
                    key={zoneId}
                    zoneName={zone.name}
                    slots={zone.slots}
                    reservationsBySlot={reservationsBySlot}
                    period={chartPeriod}
                    range={chartRange}
                  />
                </div>
              ))}
            <div className="flex flex-wrap gap-4">
              {ALLOCATION_LEGEND.map((item) => (
                <span
                  key={item.label}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span className={`h-3 w-3 rounded-sm ${item.bar}`} />
                  {item.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
