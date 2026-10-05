import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  useCancelReservation,
  useDecideReservation,
  useReservations,
} from "./reservations.hooks";
import { useUsers } from "../admin/admin.hooks";
import { useProperties } from "../properties/properties.hooks";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { Spinner } from "../../components/ui/Spinner";
import { RESERVATION_STATUS_TYPES } from "../../components/Types";
import { ActionMenu, ActionMenuItem } from "../../components/ui/ActionMenu";
import { Pagination } from "../../components/ui/Pagination";
import { formatPrice } from "../../utils/format";

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
  const [statusFilter, setStatusFilter] = useState("");
  const [requestedByFilter, setRequestedByFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useReservations({
    status: statusFilter || undefined,
    requestedById: requestedByFilter || undefined,
    propertyId: propertyFilter || undefined,
    page,
  });
  const reservations = data?.rows;
  const decide = useDecideReservation();
  const cancel = useCancelReservation();

  const isStaff =
    user &&
    ["SUPER_ADMIN", "PROPERTY_MANAGER", "PROPERTY_OWNER"].includes(user.role);
  const canFilterByRequester =
    !!user && ["SUPER_ADMIN", "PROPERTY_MANAGER"].includes(user.role);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { data: usersData } = useUsers({ pageSize: 100 }, canFilterByRequester);
  const requesters = usersData?.rows;
  const { data: properties } = useProperties({}, isSuperAdmin);

  return (
    <div className="space-y-4">
      {user?.role !== "SUPER_ADMIN" && (
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">
            {user?.role === "TENANT" ? "My Reservations" : "Reservations"}
          </h1>
          <Link to="/reservations/new">
            <Button>New Reservation</Button>
          </Link>
        </div>
      )}

      <section
        aria-label="Filter reservations"
        className="rounded-md border border-border bg-card p-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Filters</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={filtersOpen}
            aria-controls="reservation-filters-body"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {filtersOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        {filtersOpen && (
          <div
            id="reservation-filters-body"
            className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          >
            {isSuperAdmin && (
              <div className="flex flex-row items-center">
                <Label htmlFor="propertyFilter" className="w-28">
                  Property
                </Label>
                <Select
                  id="propertyFilter"
                  aria-label="Filter reservations by property"
                  value={propertyFilter}
                  onChange={(event) => {
                    setPropertyFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Properties</option>
                  {properties
                    ?.filter((property) => property.status === "ACTIVE")
                    .map((property) => (
                      <option key={property.id} value={property.id}>
                        {property.name}
                      </option>
                    ))}
                </Select>
              </div>
            )}
            {canFilterByRequester && (
              <div className="flex flex-row items-center">
                <Label htmlFor="requestedByFilter" className="w-28">
                  Requested By
                </Label>
                <Select
                  id="requestedByFilter"
                  aria-label="Filter reservations by requester"
                  value={requestedByFilter}
                  onChange={(event) => {
                    setRequestedByFilter(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Requesters</option>
                  {requesters?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="flex flex-row items-center">
              <Label htmlFor="statusFilter" className="w-28">
                Status
              </Label>
              <Select
                id="statusFilter"
                aria-label="Filter reservations by status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                {RESERVATION_STATUS_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </section>

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
              <TH className="text-right">Amount</TH>
              <TH className="text-center">Status</TH>
              <TH className="text-right">Actions</TH>
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
                <TD className="text-right">{formatPrice(r.amount)}</TD>
                <TD className="text-center">
                  <Badge tone={STATUS_TONE[r.status] ?? "muted"}>
                    {r.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </TD>
                <TD className="text-right">
                  {((isStaff && r.status === "PENDING") ||
                    ["PENDING", "APPROVED"].includes(r.status)) && (
                    <div className="flex justify-end">
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
                        {["PENDING", "APPROVED"].includes(r.status) && (
                          <ActionMenuItem onClick={() => cancel.mutate(r.id)}>
                            Cancel
                          </ActionMenuItem>
                        )}
                      </ActionMenu>
                    </div>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      {!isLoading && data && (
        <Pagination
          page={page}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
