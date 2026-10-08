import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router-dom";
import { useZone, type Slot } from "../parking/parking.hooks";
import { useReservation } from "./reservations.hooks";
import { useProfile } from "../profile/profile.hooks";
import {
  newReservationSchema,
  type NewReservationInput,
} from "./reservation.schemas";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { formatPrice } from "../../utils/format";
import { STATUS_TONE } from "../../components/Types";

export function ReservationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  // const propertyId = user?.propertyId ?? undefined;
  // const create = useCreateReservation();
  const { data: reservation, isLoading } = useReservation(id);
  const { data: zone } = useZone(reservation?.slot?.zoneId);
  const { data: propertyOwner, isLoading: userProfileLoading } = useProfile(
    reservation?.slot?.ownerUserId,
  );

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewReservationInput>({
    resolver: zodResolver(newReservationSchema),
  });

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
    reservation?.startAt && reservation?.endAt
      ? `${formatDateTime(reservation?.startAt) ?? "Choose start"} – ${formatDateTime(reservation?.endAt) ?? "Choose end"}`
      : reservation?.startAt
        ? `${formatDateTime(reservation?.startAt)} – Select end date and time`
        : reservation?.endAt
          ? `Select start date and time – ${formatDateTime(reservation?.endAt)}`
          : "Select start and end dates";

  if (isLoading) return <Spinner />;
  if (!reservation) return <p>Reservation not found.</p>;

  function calculateStayPrice(slot: Slot, startAt: Date, endAt: Date): number {
    const durationHours =
      (new Date(endAt)?.getTime() - new Date(startAt)?.getTime()) / 3_600_000;
    const dailyRate = Number(slot.dailyRate);
    const hourlyRate = slot.hourlyRate
      ? Number(slot.hourlyRate)
      : dailyRate / 24;
    const fullDays = Math.floor(durationHours / 24);
    const remainderHours = durationHours - fullDays * 24;
    const amount =
      fullDays * dailyRate + Math.min(remainderHours * hourlyRate, dailyRate);
    return Math.round(amount * 100) / 100;
  }

  const totalPrice = reservation
    ? calculateStayPrice(
        reservation?.slot,
        reservation?.startAt,
        reservation?.endAt,
      )
    : 0;

  const isForPayment =
    user?.id === reservation?.requestedBy?.id &&
    reservation?.status === "PENDING";

  const onSubmit = async (data: NewReservationInput) => {
    /*
    setServerError(null);
    try {
      await create.mutateAsync({
        ...data,
        propertyId,
        type: "TENANT",
        startAt: new Date(data.startAt).toISOString(),
        endAt: new Date(data.endAt).toISOString(),
      });
      navigate("/my-reservations");
    } catch (err) {
      setServerError(
        getApiErrorMessage(err, "Could not create the reservation."),
      );
    }
    */
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">
        Reservation Code: {reservation?.code}
      </h1>
      {isForPayment && (
        <Alert tone="destructive">
          Your request goes to the property owner for approval. Please reach out
          the property owner before payment to confirm booking.
        </Alert>
      )}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Reservation details</CardTitle>
            <Badge tone={STATUS_TONE[reservation?.status] ?? "muted"}>
              {reservation?.status.replace(/_/g, " ").toLowerCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {serverError && <Alert tone="destructive">{serverError}</Alert>}

            <div>
              <Label htmlFor="requestedBy">Requested By</Label>
              <Input
                id="requestedBy"
                placeholder="e.g. Full Name"
                disabled
                value={`${reservation?.requestedBy?.firstName || ""} ${reservation?.requestedBy?.lastName || ""}`}
              />
            </div>

            <div>
              <Label htmlFor="plateNumber">Vehicle plate no.</Label>
              <Input
                id="plateNumber"
                placeholder="e.g. ABC 123"
                disabled
                value={reservation?.vehicle?.plateNumber || ""}
              />
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
              <legend className="text-sm font-medium">Selected slot</legend>
              <div className="overflow-hidden rounded-md border border-border">
                <label
                  key={reservation?.slot?.id}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-muted/50 border-t border-border}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">
                      {zone?.name} · {reservation?.slot?.code}
                    </span>
                    <span className="text-xs capitalize text-muted-foreground">
                      {reservation?.slot?.type.replace(/_/g, " ").toLowerCase()}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold">
                    Total {formatPrice(totalPrice)}
                  </span>
                </label>
              </div>
            </fieldset>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" disabled value={reservation?.notes || ""} />
            </div>

            {!userProfileLoading && propertyOwner && (
              <div className="border-t border-gray-200 pt-5">
                <CardTitle>Payment Information</CardTitle>
                <div className="mt-5">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Input
                    id="paymentMethod"
                    disabled={!isForPayment}
                    placeholder="e.g. GCash, Maya or Bank Transfer"
                  />
                </div>
                <div className="mt-5">
                  <Label htmlFor="paymentReference">
                    Payment Reference No.
                  </Label>
                  <Input
                    id="paymentReference"
                    disabled={!isForPayment}
                    placeholder="XXXXXXXXXXXX"
                  />
                </div>
                {isForPayment && (
                  <div className="rounded-lg bg-gray-50 p-2 text-sm text-gray-600 mt-2">
                    <p className="text-sm font-medium">Send Payment to:</p>
                    {propertyOwner?.paymentInfo
                      ?.split("\n")
                      ?.map((line: string, index: number) => (
                        <p key={index}>{line}</p>
                      ))}
                  </div>
                )}
              </div>
            )}

            {isForPayment && (
              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Update reservation
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
