import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useProperties } from "../properties/properties.hooks";
import { useSetSlotStatus, useSlots } from "./parking.hooks";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";

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
  const propertyId = isSuperAdmin
    ? selectedPropertyId
    : (user?.propertyId ?? undefined);
  const { data: slots, isLoading } = useSlots(propertyId);
  const setStatus = useSetSlotStatus();

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
            {properties?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        )}
      </div>

      {isLoading && <Spinner />}

      {!propertyId && (
        <p className="text-sm text-muted-foreground">
          {isSuperAdmin
            ? "Choose a property to see its bays."
            : "Your account is not assigned to a property."}
        </p>
      )}

      {slots && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {slots.map((slot) => (
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
                      setStatus.mutate({ id: slot.id, status: "AVAILABLE" })
                    }
                  >
                    Unblock
                  </Button>
                ) : slot.status === "AVAILABLE" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setStatus.mutate({ id: slot.id, status: "BLOCKED" })
                    }
                  >
                    Block
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
