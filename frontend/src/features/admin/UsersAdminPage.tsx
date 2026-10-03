import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { getApiErrorMessage } from "../../lib/apiClient";
import { useProperties } from "../properties/properties.hooks";
import { useAuth } from "../../context/AuthContext";
import type { AdminUser } from "./admin.hooks";

const ROLES = [
  "SUPER_ADMIN",
  "PROPERTY_MANAGER",
  "PROPERTY_OWNER",
  "TENANT",
  "VISITOR",
  "PARKING_ATTENDANT",
];
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
  const [statusFilter, setStatusFilter] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");
  const { data: users, isLoading } = useUsers({
    status: statusFilter || undefined,
    propertyId: propertyFilter || undefined,
  });
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
  } = useForm<InviteUserInput>({ defaultValues: { role: "TENANT" } });
  const selectedRole = watch("role");
  const {
    register: registerAssignment,
    handleSubmit: handleAssignmentSubmit,
    reset: resetAssignment,
    formState: { isSubmitting: isAssigning },
  } = useForm<{ propertyId: string }>();

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
        data.role === "SUPER_ADMIN" ? { ...data, propertyId: undefined } : data,
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
          <Button onClick={() => setInviteOpen(true)}>Invite user</Button>
        )}
      </div>

      {!isLoading && (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Role</TH>
              {isSuperAdmin && (
                <TH>
                  <div className="space-y-2">
                    <span>Property</span>
                    <Select
                      aria-label="Filter users by property"
                      value={propertyFilter}
                      onChange={(event) =>
                        setPropertyFilter(event.target.value)
                      }
                    >
                      <option value="">All properties</option>
                      {properties?.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                </TH>
              )}
              <TH>
                <div className="space-y-2">
                  <span>Status</span>
                  <Select
                    aria-label="Filter users by status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="">All statuses</option>
                    {[
                      "ACTIVE",
                      "PENDING_VERIFICATION",
                      "SUSPENDED",
                      "DEACTIVATED",
                    ].map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ").toLowerCase()}
                      </option>
                    ))}
                  </Select>
                </div>
              </TH>
              {canManageUsers && <TH>Actions</TH>}
            </TR>
          </THead>
          <TBody>
            {users?.map((u) => (
              <TR key={u.id}>
                <TD>
                  {u.firstName} {u.lastName}
                </TD>
                <TD>{u.email}</TD>
                <TD className="capitalize">
                  {u.role.replace(/_/g, " ").toLowerCase()}
                </TD>
                {isSuperAdmin && (
                  <TD>
                    {properties?.find(
                      (property) => property.id === u.propertyId,
                    )?.name ??
                      (u.role === "SUPER_ADMIN" ? "Global" : "Unassigned")}
                  </TD>
                )}
                <TD>
                  <Badge tone={STATUS_TONE[u.status] ?? "muted"}>
                    {u.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </TD>
                {canManageUsers && (
                  <TD>
                    {user?.role === "SUPER_ADMIN" &&
                      u.role !== "SUPER_ADMIN" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAssignment(u)}
                        >
                          Assign property
                        </Button>
                      )}
                    {u.role !== "SUPER_ADMIN" && u.status === "ACTIVE" ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          updateStatus.mutate({ id: u.id, status: "SUSPENDED" })
                        }
                      >
                        Suspend
                      </Button>
                    ) : u.status === "SUSPENDED" ? (
                      <Button
                        size="sm"
                        onClick={() =>
                          updateStatus.mutate({ id: u.id, status: "ACTIVE" })
                        }
                      >
                        Reactivate
                      </Button>
                    ) : null}
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite user"
      >
        <form
          id="invite-form"
          onSubmit={handleSubmit(onInvite)}
          className="space-y-3"
        >
          {error && <Alert tone="destructive">{error}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                {...register("firstName", { required: true })}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
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
            <Select id="role" {...register("role", { required: true })}>
              {ROLES.filter(
                (role) =>
                  user?.role === "SUPER_ADMIN" || role !== "SUPER_ADMIN",
              ).map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
          </div>
          {selectedRole !== "SUPER_ADMIN" && (
            <div>
              <Label htmlFor="propertyId">Assigned property</Label>
              <Select
                id="propertyId"
                {...register("propertyId", {
                  required: selectedRole !== "SUPER_ADMIN",
                })}
              >
                <option value="">Choose a property</option>
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
        </form>
      </Dialog>
      <Dialog
        open={!!userToAssign}
        onClose={() => setUserToAssign(null)}
        title={`Assign property${userToAssign ? ` to ${userToAssign.firstName} ${userToAssign.lastName}` : ""}`}
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
              id="assigned-property"
              {...registerAssignment("propertyId", { required: true })}
            >
              <option value="">Choose an active property</option>
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
              Send invite
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
              Save assignment
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
