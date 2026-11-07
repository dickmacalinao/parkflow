import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { API_URL, getApiErrorMessage } from "../../lib/apiClient";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { PAYMENT_METHOD_TYPES } from "../../components/Types";
import { formatPrice } from "../../utils/format";

type PublicSlot = {
  id: string;
  code: string;
  zone: string;
  dailyRate: string;
  hourlyRate: string | null;
  paymentInfo: string | null;
};
type AvailableSlots = { property: { name: string }; slots: PublicSlot[] };
type Confirmation = { code: string; status: string; amount: string };

export function PublicReservationPage({
  kind,
}: {
  kind?: "owner" | "property";
}) {
  const { id } = useParams();
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [slotId, setSlotId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [method, setMethod] = useState("");
  const [providerRef, setProviderRef] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const start = new Date(startAt);
  const end = new Date(endAt);
  const validRange =
    !!startAt &&
    !!endAt &&
    Number.isFinite(start.getTime()) &&
    Number.isFinite(end.getTime()) &&
    end > start;
  const scope = kind && id ? `${kind}/${encodeURIComponent(id)}` : "";
  const slots = useQuery({
    queryKey: ["public-slots", scope, startAt, endAt],
    enabled: !!scope && validRange,
    queryFn: async () =>
      (
        await axios.get<AvailableSlots>(
          `${API_URL}/public/reservations/${scope}/slots`,
          {
            params: { startAt: start.toISOString(), endAt: end.toISOString() },
          },
        )
      ).data,
  });
  const booking = useMutation({
    mutationFn: async () =>
      (
        await axios.post<Confirmation>(
          `${API_URL}/public/reservations/${scope}/reservations`,
          {
            slotId,
            name,
            email,
            phone,
            plate,
            method,
            providerRef,
            startAt: start.toISOString(),
            endAt: end.toISOString(),
          },
        )
      ).data,
    onSuccess: setConfirmation,
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (validRange && slots.data?.slots.some((slot) => slot.id === slotId))
      booking.mutate();
  };
  const selectedSlot = slots.data?.slots.find((slot) => slot.id === slotId);
  const hours = validRange ? (end.getTime() - start.getTime()) / 3_600_000 : 0;
  const dailyRate = Number(selectedSlot?.dailyRate ?? 0);
  const hourlyRate = selectedSlot?.hourlyRate
    ? Number(selectedSlot.hourlyRate)
    : dailyRate / 24;
  const amount =
    Math.round(
      (Math.floor(hours / 24) * dailyRate +
        Math.min((hours % 24) * hourlyRate, dailyRate)) *
        100,
    ) / 100;

  return (
    <main className="mx-auto max-w-xl space-y-5 px-4 py-8">
      <header>
        <p className="text-sm font-semibold text-primary">ParkFlow</p>
        <h1 className="text-2xl font-semibold">Reserve parking</h1>
        {slots.data && (
          <p className="text-sm text-muted-foreground">
            {slots.data.property.name}
          </p>
        )}
      </header>
      {!scope ? (
        <Alert tone="destructive">A property or owner link is required.</Alert>
      ) : confirmation ? (
        <section className="space-y-2" aria-live="polite">
          <h2 className="text-lg font-semibold">Reservation requested</h2>
          <p>
            Confirmation: <strong>{confirmation.code}</strong>
          </p>
          <p>Status: {confirmation.status.toLowerCase()}</p>
          <p>Amount: {formatPrice(confirmation.amount)}</p>
          <p>Payment status: pending verification</p>
        </section>
      ) : (
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="public-start">Start</Label>
              <Input
                id="public-start"
                type="datetime-local"
                required
                value={startAt}
                onChange={(event) => {
                  setStartAt(event.target.value);
                  setSlotId("");
                }}
              />
            </div>
            <div>
              <Label htmlFor="public-end">End</Label>
              <Input
                id="public-end"
                type="datetime-local"
                required
                value={endAt}
                onChange={(event) => {
                  setEndAt(event.target.value);
                  setSlotId("");
                }}
              />
            </div>
          </div>
          {startAt && endAt && !validRange && (
            <Alert tone="destructive">End must be after start.</Alert>
          )}
          {slots.isError && (
            <Alert tone="destructive">
              {getApiErrorMessage(
                slots.error,
                "Could not load available slots.",
              )}
            </Alert>
          )}
          {booking.isError && (
            <Alert tone="destructive">
              {getApiErrorMessage(
                booking.error,
                "Could not request the reservation.",
              )}
            </Alert>
          )}
          <div>
            <Label htmlFor="public-slot">Parking slot</Label>
            <Select
              id="public-slot"
              className="w-full"
              required
              value={slotId}
              disabled={
                !validRange || slots.isFetching || !slots.data?.slots.length
              }
              onChange={(event) => setSlotId(event.target.value)}
            >
              <option value="">
                {slots.isFetching
                  ? "Loading slots..."
                  : slots.data && !slots.data.slots.length
                    ? "No slots available"
                    : "Select a slot"}
              </option>
              {slots.data?.slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.zone} / {slot.code} ({formatPrice(slot.dailyRate)} per
                  day)
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="public-name">Name</Label>
            <Input
              id="public-name"
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="public-email">Email</Label>
            <Input
              id="public-email"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="public-phone">Phone</Label>
            <Input
              id="public-phone"
              type="tel"
              required
              maxLength={32}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="public-plate">Vehicle plate no.</Label>
            <Input
              id="public-plate"
              required
              maxLength={32}
              value={plate}
              onChange={(event) => setPlate(event.target.value)}
            />
          </div>
          {selectedSlot && (
            <section className="space-y-3 border-t border-border pt-4">
              <h2 className="text-lg font-semibold">Payment information</h2>
              <p className="text-sm">
                Amount: <strong>{formatPrice(amount)}</strong>
              </p>
              {selectedSlot.paymentInfo ? (
                <div className="text-sm">
                  <p className="font-medium">Send payment to:</p>
                  <p className="whitespace-pre-wrap">
                    {selectedSlot.paymentInfo}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Payment instructions are not available for this slot.
                </p>
              )}
              <div>
                <Label htmlFor="public-payment-method">Payment method</Label>
                <Select
                  id="public-payment-method"
                  className="w-full"
                  required
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                >
                  <option value="">Select a payment method</option>
                  {PAYMENT_METHOD_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="public-payment-reference">
                  Payment reference no.
                </Label>
                <Input
                  id="public-payment-reference"
                  required
                  maxLength={32}
                  value={providerRef}
                  onChange={(event) => setProviderRef(event.target.value)}
                />
              </div>
            </section>
          )}
          <Button
            type="submit"
            disabled={!slotId || slots.isFetching}
            isLoading={booking.isPending}
          >
            Request reservation
          </Button>
        </form>
      )}
    </main>
  );
}
