import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { ActionMenu, ActionMenuItem } from "../../components/ui/ActionMenu";
import { getApiErrorMessage } from "../../lib/apiClient";
import { PropertyFormDialog } from "./PropertyFormDialog";
import {
  useDeleteProperty,
  useProperties,
  useDecideProperty,
  type Property,
} from "./properties.hooks";

const STATUS_TONE: Record<
  string,
  "default" | "success" | "destructive" | "muted"
> = {
  ACTIVE: "success",
  PENDING_APPROVAL: "default",
  REJECTED: "destructive",
  INACTIVE: "muted",
};

export function PropertiesListPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: properties, isLoading } = useProperties({ status });
  const decide = useDecideProperty();
  const deleteProperty = useDeleteProperty();
  const isAdmin = user?.role === "SUPER_ADMIN";
  const canRegister = user?.role === "SUPER_ADMIN";
  const showActions =
    isAdmin ||
    user?.role === "PROPERTY_OWNER" ||
    user?.role === "PROPERTY_MANAGER";

  const openEdit = (property: Property) => {
    setEditingProperty(property);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingProperty(null);
  };

  const onDelete = async (property: Property) => {
    if (
      !window.confirm(
        `Deactivate ${property.name}? It will no longer appear in active property lists.`,
      )
    )
      return;
    setError(null);
    try {
      await deleteProperty.mutateAsync(property.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        {canRegister && (
          <Button
            onClick={() => {
              setEditingProperty(null);
              setFormOpen(true);
            }}
          >
            Register Property
          </Button>
        )}
      </div>

      {error && <Alert tone="destructive">{error}</Alert>}

      <div className="flex gap-2">
        {[
          { value: undefined, label: "All" },
          { value: "PENDING_APPROVAL", label: "Pending Approval" },
          { value: "ACTIVE", label: "Active" },
          { value: "REJECTED", label: "Rejected" },
        ].map((s) => (
          <Button
            key={s.value ?? "all"}
            size="sm"
            variant={status === s.value ? "default" : "outline"}
            onClick={() => setStatus(s.value)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Type</TH>
              <TH>Location</TH>
              <TH>Status</TH>
              {showActions && <TH>Actions</TH>}
            </TR>
          </THead>
          <TBody>
            {properties?.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Link
                    to={`/properties/${p.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                </TD>
                <TD className="capitalize">
                  {p.type.replace(/_/g, " ").toLowerCase()}
                </TD>
                <TD>
                  {p.city}, {p.state}
                </TD>
                <TD>
                  <Badge tone={STATUS_TONE[p.status] ?? "muted"}>
                    {p.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </TD>
                {showActions && (
                  <TD>
                    {isAdmin ||
                    p.owner?.id === user?.id ||
                    p.managers?.some(
                      (manager) => manager.userId === user?.id,
                    ) ? (
                      <ActionMenu>
                        <ActionMenuItem onClick={() => openEdit(p)}>
                          Edit
                        </ActionMenuItem>
                        {isAdmin && p.status === "PENDING_APPROVAL" && (
                          <>
                            <ActionMenuItem
                              onClick={() =>
                                decide.mutate({ id: p.id, status: "ACTIVE" })
                              }
                            >
                              Approve
                            </ActionMenuItem>
                            <ActionMenuItem
                              destructive
                              onClick={() =>
                                decide.mutate({ id: p.id, status: "REJECTED" })
                              }
                            >
                              Reject
                            </ActionMenuItem>
                          </>
                        )}
                        {isAdmin && (
                          <ActionMenuItem
                            destructive
                            disabled={deleteProperty.isPending}
                            onClick={() => onDelete(p)}
                          >
                            Deactivate
                          </ActionMenuItem>
                        )}
                      </ActionMenu>
                    ) : null}
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <PropertyFormDialog
        open={formOpen}
        onClose={closeForm}
        property={editingProperty}
      />
    </div>
  );
}
