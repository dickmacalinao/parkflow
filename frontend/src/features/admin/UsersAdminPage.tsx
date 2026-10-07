import { useState } from "react";
import { useForm } from "react-hook-form";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router";
import {
  useAssignUserProperty,
  useInviteUser,
  useUpdateUserStatus,
  useUsers,
  type InviteUserInput,
} from "./admin.hooks";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { Alert } from "../../components/ui/Alert";
import { ActionMenu, ActionMenuItem } from "../../components/ui/ActionMenu";
import { Pagination } from "../../components/ui/Pagination";
import { getApiErrorMessage } from "../../lib/apiClient";
import { useProperties } from "../properties/properties.hooks";
import { useAuth } from "../../context/AuthContext";
import { ROLE_TYPES, STATUS_TYPES } from "../../components/Types";
import type { AdminUser } from "./admin.hooks";

const STATUS_TONE: Record<
  string,
  "default" | "success" | "destructive" | "muted"
> = {
  ACTIVE: "success",
  PENDING_VERIFICATION: "default",
  SUSPENDED: "destructive",
  DEACTIVATED: "muted",
};

export function UsersAdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { data, isLoading } = useUsers({
    role: roleFilter || undefined,
    status: statusFilter || undefined,
    propertyId: propertyFilter || undefined,
    page,
  });
  const users = data?.rows;
  const { data: properties } = useProperties();
  const canManageUsers =
    user && ["SUPER_ADMIN", "PROPERTY_MANAGER"].includes(user.role);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const updateStatus = useUpdateUserStatus();
  const invite = useInviteUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [userToAssign, setUserToAssign] = useState<AdminUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const assignUserProperty = useAssignUserProperty();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { isSubmitting },
  } = useForm<InviteUserInput>({
    defaultValues: { role: "TENANT" },
    shouldUnregister: true,
  });
  const selectedRole = watch("role");
  const selectedPropertyId = watch("propertyId");
  const selectedProperty = isSuperAdmin
    ? properties?.find((property) => property.id === selectedPropertyId)
    : properties?.find((property) => property.id === user?.propertyId);
  const needsCondoAddress =
    ["TENANT", "PROPERTY_OWNER"].includes(selectedRole ?? "") &&
    selectedProperty?.type === "RESIDENTIAL_CONDOMINIUM";
  const {
    register: registerAssignment,
    handleSubmit: handleAssignmentSubmit,
    reset: resetAssignment,
    formState: { isSubmitting: isAssigning },
  } = useForm<{ propertyId: string }>();

  const viewUser = ({ userId }: { userId: string }) => {
    navigate(`/admin/users/${userId}`);
  };

  const openAssignment = (target: AdminUser) => {
    setError(null);
    setUserToAssign(target);
    resetAssignment({ propertyId: target.propertyId ?? "" });
  };

  const onAssign = async ({ propertyId }: { propertyId: string }) => {
    if (!userToAssign) return;
    setError(null);
    try {
      await assignUserProperty.mutateAsync({ id: userToAssign.id, propertyId });
      setUserToAssign(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const onInvite = async (data: InviteUserInput) => {
    setError(null);
    try {
      await invite.mutateAsync(
        isSuperAdmin && data.role !== "SUPER_ADMIN"
          ? data
          : { ...data, propertyId: undefined },
      );
      reset();
      setInviteOpen(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
        {canManageUsers && (
          <Button onClick={() => setInviteOpen(true)}>Invite User</Button>
        )}
      </div>

      <section
        aria-label="Filter users"
        className="rounded-md border border-border bg-card p-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Filters</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-expanded={filtersOpen}
            aria-controls="user-filters-body"
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
            id="user-filters-body"
            className={`mt-4 grid gap-3 ${isSuperAdmin ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
          >
            {isSuperAdmin && (
              <div className="flex flex-row items-center">
                <Label htmlFor="propertyFilter" className="w-20">
                  Property
                </Label>
                <Select
                  id="propertyFilter"
                  aria-label="Filter users by property"
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
            <div className="flex flex-row items-center">
              <Label htmlFor="roleFilter" className="w-20">
                Role
              </Label>
              <Select
                id="roleFilter"
                aria-label="Filter users by role"
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Roles</option>
                {ROLE_TYPES.filter((role) =>
                  isSuperAdmin ? true : role.value !== "SUPER_ADMIN",
                ).map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-row items-center">
              <Label htmlFor="statusFilter" className="w-20">
                Status
              </Label>
              <Select
                id="statusFilter"
                aria-label="Filter users by status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Statuses</option>
                {STATUS_TYPES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}
      </section>

      {!isLoading && (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              {isSuperAdmin && <TH>Property</TH>}
              <TH>Role</TH>
              <TH className="text-center">Status</TH>
              {canManageUsers && <TH className="text-right">Actions</TH>}
            </TR>
          </THead>
          <TBody>
            {users?.length === 0 && (
              <TR>
                <TD
                  colSpan={4 + Number(isSuperAdmin) + Number(!!canManageUsers)}
                  className="py-8 text-center text-muted-foreground"
                >
                  No record found.
                </TD>
              </TR>
            )}
            {users?.map((u) => (
              <TR key={u.id}>
                <TD>
                  {u.firstName} {u.lastName}
                </TD>
                <TD>{u.email}</TD>
                {isSuperAdmin && (
                  <TD>
                    {properties?.find(
                      (property) => property.id === u.propertyId,
                    )?.name ??
                      (u.role === "SUPER_ADMIN" ? "Global" : "Unassigned")}
                  </TD>
                )}
                <TD className="capitalize">
                  {u.role.replace(/_/g, " ").toLowerCase()}
                </TD>
                <TD className="text-center">
                  <Badge tone={STATUS_TONE[u.status] ?? "muted"}>
                    {u.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </TD>
                {canManageUsers && (
                  <TD className="text-right">
                    {(user?.role === "SUPER_ADMIN" &&
                      u.role !== "SUPER_ADMIN") ||
                    (u.status === "PENDING_VERIFICATION" &&
                      (user?.role === "SUPER_ADMIN" || u.id !== user?.id)) ||
                    u.status === "SUSPENDED" ||
                    (u.role !== "SUPER_ADMIN" && u.status === "ACTIVE") ? (
                      <ActionMenu>
                        {["SUPER_ADMIN", "PROPERTY_MANAGER"].includes(
                          user?.role,
                        ) &&
                          u.role !== "SUPER_ADMIN" && (
                            <ActionMenuItem
                              onClick={() => viewUser({ userId: u.id })}
                            >
                              View
                            </ActionMenuItem>
                          )}
                        {u.status === "PENDING_VERIFICATION" &&
                          (user?.role === "SUPER_ADMIN" ||
                            u.id !== user?.id) && (
                            <ActionMenuItem
                              onClick={() =>
                                updateStatus.mutate({
                                  id: u.id,
                                  status: "ACTIVE",
                                })
                              }
                            >
                              Activate
                            </ActionMenuItem>
                          )}
                        {user?.role === "SUPER_ADMIN" &&
                          u.role !== "SUPER_ADMIN" && (
                            <ActionMenuItem onClick={() => openAssignment(u)}>
                              Assign Property
                            </ActionMenuItem>
                          )}
                        {u.role !== "SUPER_ADMIN" && u.status === "ACTIVE" ? (
                          <ActionMenuItem
                            destructive
                            onClick={() =>
                              updateStatus.mutate({
                                id: u.id,
                                status: "SUSPENDED",
                              })
                            }
                          >
                            Suspend
                          </ActionMenuItem>
                        ) : u.status === "SUSPENDED" ? (
                          <ActionMenuItem
                            onClick={() =>
                              updateStatus.mutate({
                                id: u.id,
                                status: "ACTIVE",
                              })
                            }
                          >
                            Reactivate
                          </ActionMenuItem>
                        ) : null}
                      </ActionMenu>
                    ) : null}
                  </TD>
                )}
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

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite User"
      >
        <form
          id="invite-form"
          onSubmit={handleSubmit(onInvite)}
          className="space-y-3"
        >
          {error && <Alert tone="destructive">{error}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                {...register("firstName", { required: true })}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                {...register("lastName", { required: true })}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register("email", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select
              className="w-full"
              id="role"
              {...register("role", { required: true })}
            >
              {ROLE_TYPES.filter(
                (role) =>
                  user?.role === "SUPER_ADMIN" || role.value !== "SUPER_ADMIN",
              ).map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </div>
          {isSuperAdmin && selectedRole !== "SUPER_ADMIN" && (
            <div>
              <Label htmlFor="propertyId">Assigned Property</Label>
              <Select
                className="w-full"
                id="propertyId"
                {...register("propertyId", {
                  required: selectedRole !== "SUPER_ADMIN",
                })}
              >
                <option value="">Choose a Property</option>
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
          {needsCondoAddress && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="buildingNo">Building No.</Label>
                <Input
                  id="buildingNo"
                  {...register("buildingNo", { required: true })}
                />
              </div>
              <div>
                <Label htmlFor="floorNo">Floor No.</Label>
                <Input
                  id="floorNo"
                  {...register("floorNo", { required: true })}
                />
              </div>
              <div>
                <Label htmlFor="unitNo">Unit No.</Label>
                <Input
                  id="unitNo"
                  {...register("unitNo", { required: true })}
                />
              </div>
            </div>
          )}
        </form>
      </Dialog>
      <Dialog
        open={!!userToAssign}
        onClose={() => setUserToAssign(null)}
        title={`Assign Property${userToAssign ? ` to ${userToAssign.firstName} ${userToAssign.lastName}` : ""}`}
      >
        <form
          id="assignment-form"
          onSubmit={handleAssignmentSubmit(onAssign)}
          className="space-y-3"
        >
          {error && <Alert tone="destructive">{error}</Alert>}
          <div>
            <Label htmlFor="assigned-property">Property</Label>
            <Select
              className="w-full"
              id="assigned-property"
              {...registerAssignment("propertyId", { required: true })}
            >
              <option value="">Choose an Active Property</option>
              {properties
                ?.filter((property) => property.status === "ACTIVE")
                .map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
            </Select>
          </div>
        </form>
      </Dialog>
      {inviteOpen && (
        <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center">
          <div className="flex gap-2 rounded-md border border-border bg-card p-2 shadow-lg">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button form="invite-form" type="submit" isLoading={isSubmitting}>
              Send Invite
            </Button>
          </div>
        </div>
      )}
      {userToAssign && (
        <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center">
          <div className="flex gap-2 rounded-md border border-border bg-card p-2 shadow-lg">
            <Button variant="outline" onClick={() => setUserToAssign(null)}>
              Cancel
            </Button>
            <Button
              form="assignment-form"
              type="submit"
              isLoading={isAssigning}
            >
              Save Assignment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
