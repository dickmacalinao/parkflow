import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useParams } from "react-router-dom";
import { useZone } from "../parking/parking.hooks";
import {
  useReservation,
  usePayReservation,
  getApiErrorMessage,
} from "./reservations.hooks";
import { useProfile } from "../profile/profile.hooks";
import {
  payReservationSchema,
  type PayReservationInput,
} from "./reservation.schemas";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Alert } from "../../components/ui/Alert";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { FormError } from "../../components/ui/FormError";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { useAuth } from "../../context/AuthContext";
import { formatPrice, formatDateTime } from "../../utils/format";
import { STATUS_TONE, PAYMENT_METHOD_TYPES } from "../../components/Types";

export function ReservationDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const update = usePayReservation();

  const { data: reservation, isLoading } = useReservation(id);
  const { data: zone } = useZone(reservation?.slot?.zoneId);
  const { data: propertyOwner, isLoading: userProfileLoading } = useProfile(
    reservation?.slot?.ownerUserId,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PayReservationInput>({
    resolver: zodResolver(payReservationSchema),
  });

  const selectedDateRange =
    reservation?.startAt && reservation?.endAt
      ? `${formatDateTime(reservation?.startAt) ?? "Choose start"} – ${formatDateTime(reservation?.endAt) ?? "Choose end"}`
      : reservation?.startAt
        ? `${formatDateTime(reservation?.startAt)} – Select end date and time`
        : reservation?.endAt
          ? `Select start date and time – ${formatDateTime(reservation?.endAt)}`
          : "Select start and end dates";

  useEffect(() => {
    if (!isLoading) {
      reset({
        notes: reservation?.notes,
        method: reservation?.payment?.method,
        providerRef: reservation?.payment?.providerRef,
      });
    }
  }, [reservation, reset, isLoading]);

  if (isLoading) return <Spinner />;
  if (!reservation) return <p>Reservation not found.</p>;

  const isForPayment =
    user?.id === reservation?.requestedBy?.id &&
    reservation?.status === "PENDING" &&
    !reservation?.payment;

  const onSubmit = async (data: PayReservationInput) => {
    setServerError(null);
    setSuccess(false);
    try {
      await update.mutateAsync({
        ...data,
        id: reservation?.id,
        propertyId: reservation?.property?.id,
        amount: reservation?.amount,
      });
      setSuccess(true);
    } catch (err) {
      setServerError(
        getApiErrorMessage(err, "Could not process payment reservation."),
      );
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">
        Reservation Code: {reservation?.code}
      </h1>
      {isForPayment && (
        <Alert tone="info">
          Your request goes to the property owner for approval. Please reach out
          the property owner before payment to inform reservation and to have a
          fast approval.
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
            {success && (
              <Alert tone="success">Reservation payment successful.</Alert>
            )}

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
                    Total {formatPrice(reservation?.amount ?? 0)}
                  </span>
                </label>
              </div>
            </fieldset>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                disabled={!isForPayment}
                {...register("notes")}
              />
            </div>

            {!userProfileLoading && propertyOwner && (
              <div className="border-t border-gray-200 pt-5">
                <CardTitle>Payment Information</CardTitle>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      id="paymentMethod"
                      aria-label="Filter users by property w-full"
                      disabled={!isForPayment}
                      {...register("method")}
                    >
                      <option value="">Select a payment method</option>
                      {PAYMENT_METHOD_TYPES.map((paymentMethod) => (
                        <option
                          key={paymentMethod.value}
                          value={paymentMethod.value}
                        >
                          {paymentMethod.label}
                        </option>
                      ))}
                    </Select>
                    <FormError message={errors.method?.message} />
                  </div>

                  <div>
                    <Label htmlFor="providerRef">Payment Reference No.</Label>
                    <Input
                      id="providerRef"
                      type="number"
                      disabled={!isForPayment}
                      placeholder="XXXXXXXXXXXX"
                      {...register("providerRef")}
                    />
                    <FormError message={errors.providerRef?.message} />
                  </div>
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
                Submit Payment Information
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
