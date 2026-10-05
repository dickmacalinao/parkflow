import { useState } from "react";
import { Controller } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useSlots, type Slot } from "../parking/parking.hooks";
import { useCreateReservation, getApiErrorMessage } from "./reservations.hooks";
import {
  newReservationSchema,
  type NewReservationInput,
} from "./reservation.schemas";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { FormError } from "../../components/ui/FormError";
import { CalendarDateTimePicker } from "../../components/ui/CalendarDateTimePicker";
import { Alert } from "../../components/ui/Alert";
import { Spinner } from "../../components/ui/Spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { formatPrice } from "../../utils/format";

function calculateStayPrice(slot: Slot, startAt: Date, endAt: Date): number {
  const durationHours = (endAt.getTime() - startAt.getTime()) / 3_600_000;
  const dailyRate = Number(slot.dailyRate);
  const hourlyRate = slot.hourlyRate ? Number(slot.hourlyRate) : dailyRate / 24;
  const fullDays = Math.floor(durationHours / 24);
  const remainderHours = durationHours - fullDays * 24;
  const amount =
    fullDays * dailyRate + Math.min(remainderHours * hourlyRate, dailyRate);
  return Math.round(amount * 100) / 100;
}

export function NewReservationPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const propertyId = user?.propertyId ?? undefined;
  const create = useCreateReservation();

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewReservationInput>({
    resolver: zodResolver(newReservationSchema),
  });
  const [startAt, endAt] = watch(["startAt", "endAt"]);

  const formatDateTime = (value?: string) => {
    if (!value) return undefined;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const selectedDateRange =
    startAt && endAt
      ? `${formatDateTime(startAt) ?? "Choose start"} – ${formatDateTime(endAt) ?? "Choose end"}`
      : startAt
        ? `${formatDateTime(startAt)} – Select end date and time`
        : endAt
          ? `Select start date and time – ${formatDateTime(endAt)}`
          : "Select start and end dates";

  const startDate = startAt ? new Date(startAt) : undefined;
  const endDate = endAt ? new Date(endAt) : undefined;
  const hasValidDateRange = Boolean(
    startDate &&
    endDate &&
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime()) &&
    endDate > startDate,
  );
  const availabilityStartAt = hasValidDateRange
    ? startDate!.toISOString()
    : undefined;
  const availabilityEndAt = hasValidDateRange
    ? endDate!.toISOString()
    : undefined;
  const { data: availableSlots, isLoading: slotsLoading } = useSlots(
    propertyId,
    availabilityStartAt,
    availabilityEndAt,
    hasValidDateRange,
  );

  if (user?.role === "SUPER_ADMIN") {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold">Reserve a slot</h1>
        <Alert tone="info">
          Super Admin accounts are not assigned to a property and cannot reserve
          parking bays.
        </Alert>
      </div>
    );
  }

  if (!propertyId) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-2xl font-semibold">Reserve a slot</h1>
        <Alert tone="destructive">
          Your account is not assigned to a property.
        </Alert>
      </div>
    );
  }

  const onSubmit = async (data: NewReservationInput) => {
    setServerError(null);
    try {
      await create.mutateAsync({
        ...data,
        propertyId,
        type: "TENANT",
        startAt: new Date(data.startAt).toISOString(),
        endAt: new Date(data.endAt).toISOString(),
      });
      navigate("/reservations");
    } catch (err) {
      setServerError(
        getApiErrorMessage(err, "Could not create the reservation."),
      );
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Reserve a slot</h1>
      <Card>
        <CardHeader>
          <CardTitle>Reservation details</CardTitle>
          <CardDescription>
            Your request goes to the property manager/owner for approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {serverError && <Alert tone="destructive">{serverError}</Alert>}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Controller
                  control={control}
                  name="startAt"
                  render={({ field }) => (
                    <CalendarDateTimePicker
                      id="startAt"
                      label="Start"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      error={errors.startAt?.message}
                    />
                  )}
                />
              </div>
              <div>
                <Controller
                  control={control}
                  name="endAt"
                  render={({ field }) => (
                    <CalendarDateTimePicker
                      id="endAt"
                      label="End"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      error={errors.endAt?.message}
                    />
                  )}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="selectedDateRange">Selected date range</Label>
              <Input
                id="selectedDateRange"
                value={selectedDateRange}
                readOnly
                aria-readonly="true"
                className="mt-1 bg-muted"
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Available bays for selected dates
              </legend>
              {!hasValidDateRange ? (
                <p className="text-sm text-muted-foreground">
                  Select a valid Start and End date to see available bays.
                </p>
              ) : slotsLoading ? (
                <Spinner />
              ) : availableSlots?.length ? (
                <div className="overflow-hidden rounded-md border border-border">
                  {availableSlots.map((slot, index) => {
                    const totalPrice = calculateStayPrice(
                      slot,
                      startDate!,
                      endDate!,
                    );
                    return (
                      <label
                        key={slot.id}
                        className={`flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-muted/50 ${index > 0 ? "border-t border-border" : ""}`}
                      >
                        <input
                          type="radio"
                          value={slot.id}
                          className="h-4 w-4 accent-primary"
                          {...register("slotId")}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">
                            {slot.zone.name} · {slot.code}
                          </span>
                          <span className="text-xs capitalize text-muted-foreground">
                            {slot.type.replace(/_/g, " ").toLowerCase()}
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold">
                          Total {formatPrice(totalPrice)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <Alert tone="info">
                  No bays are available for this date and time range.
                </Alert>
              )}
              <FormError message={errors.slotId?.message} />
            </fieldset>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" {...register("notes")} />
            </div>

            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Request reservation
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
