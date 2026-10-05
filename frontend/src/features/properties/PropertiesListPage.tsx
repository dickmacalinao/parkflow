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
  usePropertiesPage,
  useDecideProperty,
  useSetPropertyStatus,
  type Property,
} from "./properties.hooks";
import { Pagination } from "../../components/ui/Pagination";

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
  const [status, setStatus] = useState<string | undefined>("ACTIVE");
  const isDeletedView = status === "DELETED";
  const [formOpen, setFormOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const { data, isLoading } = usePropertiesPage({
    status: isDeletedView ? undefined : status,
    includeDeleted: isDeletedView,
    page,
  });
  const properties = data?.rows;
  const decide = useDecideProperty();
  const deleteProperty = useDeleteProperty();
  const setPropertyStatus = useSetPropertyStatus();
  const isAdmin = user?.role === "SUPER_ADMIN";
  const canRegister = user?.role === "SUPER_ADMIN";

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
        `Delete ${property.name}? It will move to Deleted properties.`,
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
          { value: "INACTIVE", label: "Inactive" },
          { value: "REJECTED", label: "Rejected" },
          { value: "DELETED", label: "Deleted" },
        ].map((s) => (
          <Button
            key={s.value ?? "all"}
            size="sm"
            variant={status === s.value ? "default" : "outline"}
            onClick={() => {
              setStatus(s.value);
              setPage(1);
            }}
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
              {!status && <TH>Status</TH>}
              {!isDeletedView && <TH className="text-right">Actions</TH>}
            </TR>
          </THead>
          <TBody>
            {properties?.length === 0 && (
              <TR>
                <TD
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No record found.
                </TD>
              </TR>
            )}

            {properties?.map((p) => (
              <TR key={p.id}>
                <TD>
                  {isDeletedView ? (
                    <span className="font-medium">{p.name}</span>
                  ) : (
                    <Link
                      to={`/properties/${p.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {p.name}
                    </Link>
                  )}
                </TD>
                <TD className="capitalize">
                  {p.type.replace(/_/g, " ").toLowerCase()}
                </TD>
                <TD>
                  {p.city}, {p.state}
                </TD>
                {!status && (
                  <TD>
                    <Badge tone={STATUS_TONE[p.status] ?? "muted"}>
                      {isDeletedView
                        ? "deleted"
                        : p.status.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </TD>
                )}
                {!isDeletedView && (
                  <TD className="text-right">
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
                      {isAdmin && p.status === "ACTIVE" && (
                        <ActionMenuItem
                          destructive
                          disabled={setPropertyStatus.isPending}
                          onClick={() =>
                            setPropertyStatus.mutate({
                              id: p.id,
                              status: "INACTIVE",
                            })
                          }
                        >
                          Deactivate
                        </ActionMenuItem>
                      )}
                      {isAdmin && p.status === "INACTIVE" && (
                        <ActionMenuItem
                          disabled={setPropertyStatus.isPending}
                          onClick={() =>
                            setPropertyStatus.mutate({
                              id: p.id,
                              status: "ACTIVE",
                            })
                          }
                        >
                          Activate
                        </ActionMenuItem>
                      )}
                      {isAdmin && (
                        <ActionMenuItem
                          destructive
                          disabled={deleteProperty.isPending}
                          onClick={() => onDelete(p)}
                        >
                          Delete
                        </ActionMenuItem>
                      )}
                    </ActionMenu>
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
      <PropertyFormDialog
        open={formOpen}
        onClose={closeForm}
        property={editingProperty}
      />
    </div>
  );
}
