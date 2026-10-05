import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  useCancelReservation,
  useDecideReservation,
  useReservations,
} from "./reservations.hooks";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { RESERVATION_STATUS_TYPES } from "../../components/Types";
import { ActionMenu, ActionMenuItem } from "../../components/ui/ActionMenu";

const STATUS_TONE: Record<
  string,
  "default" | "success" | "destructive" | "muted"
> = {
  PENDING: "default",
  APPROVED: "success",
  REJECTED: "destructive",
  CANCELLED: "muted",
  CHECKED_IN: "success",
  CHECKED_OUT: "muted",
  COMPLETED: "muted",
  EXPIRED: "muted",
  NO_SHOW: "destructive",
};

export function ReservationsListPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | undefined>(undefined);
  const { data: reservations, isLoading } = useReservations({ status });
  const decide = useDecideReservation();
  const cancel = useCancelReservation();

  const isStaff =
    user &&
    ["SUPER_ADMIN", "PROPERTY_MANAGER", "PROPERTY_OWNER"].includes(user.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {user.role === "TENANT" ? "My Reservations" : "Reservations"}
        </h1>
        <Link to="/reservations/new">
          <Button>New Reservation</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ value: undefined, label: "All" }, ...RESERVATION_STATUS_TYPES].map(
          (s) => (
            <Button
              key={s.value ?? "all"}
              size="sm"
              variant={status === s.value ? "default" : "outline"}
              onClick={() => setStatus(s.value)}
            >
              {s.label}
            </Button>
          ),
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Property / Bay</TH>
              {isStaff && <TH>Requested by</TH>}
              <TH>Dates</TH>
              <TH>Amount</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {reservations?.length === 0 && (
              <TR>
                <TD
                  colSpan={7}
                  className="py-8 text-center text-muted-foreground"
                >
                  No record found.
                </TD>
              </TR>
            )}
            {reservations?.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono text-xs">{r.code}</TD>
                <TD>
                  {r.property.name} / {r.slot.code}
                </TD>
                {isStaff && (
                  <TD>
                    {r.requestedBy.firstName} {r.requestedBy.lastName}
                  </TD>
                )}
                <TD className="text-xs">
                  {new Date(r.startAt).toLocaleString()} -&gt;{" "}
                  {new Date(r.endAt).toLocaleString()}
                </TD>
                <TD>${r.amount}</TD>
                <TD>
                  <Badge tone={STATUS_TONE[r.status] ?? "muted"}>
                    {r.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </TD>
                <TD>
                  {((isStaff && r.status === "PENDING") ||
                    "PENDING" === r.status) && (
                    <ActionMenu>
                      {isStaff && r.status === "PENDING" && (
                        <>
                          <ActionMenuItem
                            onClick={() =>
                              decide.mutate({ id: r.id, status: "APPROVED" })
                            }
                          >
                            Approve
                          </ActionMenuItem>
                          <ActionMenuItem
                            destructive
                            onClick={() =>
                              decide.mutate({ id: r.id, status: "REJECTED" })
                            }
                          >
                            Reject
                          </ActionMenuItem>
                        </>
                      )}
                      {"PENDING" === r.status && (
                        <ActionMenuItem onClick={() => cancel.mutate(r.id)}>
                          Cancel
                        </ActionMenuItem>
                      )}
                    </ActionMenu>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
