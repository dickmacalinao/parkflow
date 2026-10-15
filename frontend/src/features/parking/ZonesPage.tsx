import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { ActionMenu, ActionMenuItem } from "../../components/ui/ActionMenu";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Spinner } from "../../components/ui/Spinner";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { getApiErrorMessage } from "../../lib/apiClient";
import { useClientPagination } from "../../lib/pagination";
import { Pagination } from "../../components/ui/Pagination";
import { useProperties } from "../properties/properties.hooks";
import {
  useCreateZone,
  useDeleteZone,
  useUpdateZone,
  useZones,
  type Zone,
} from "./parking.hooks";

interface ZoneFormValues {
  name: string;
  description: string;
  sortOrder: number;
}

export function ZonesPage() {
  const { user } = useAuth();
  const propertyId = user?.propertyId ?? undefined;
  const { data: properties } = useProperties();
  const property = properties?.find((item) => item.id === propertyId);
  const { data: zones, isLoading } = useZones(propertyId);
  const {
    page,
    setPage,
    pageItems: pagedZones,
    total: zonesTotal,
    pageSize,
  } = useClientPagination(zones);
  const createZone = useCreateZone();
  const updateZone = useUpdateZone();
  const deleteZone = useDeleteZone();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ZoneFormValues>({
    defaultValues: { name: "", description: "", sortOrder: 0 },
  });

  useEffect(() => {
    reset({
      name: editingZone?.name ?? "",
      description: editingZone?.description ?? "",
      sortOrder: editingZone?.sortOrder ?? 0,
    });
  }, [editingZone, dialogOpen, reset]);

  const openCreate = () => {
    setError(null);
    setEditingZone(null);
    setDialogOpen(true);
  };

  const openEdit = (zone: Zone) => {
    setError(null);
    setEditingZone(zone);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingZone(null);
  };

  const onSubmit = async (values: ZoneFormValues) => {
    if (!propertyId) return;
    setError(null);
    const description = values.description.trim() || null;
    try {
      if (editingZone) {
        await updateZone.mutateAsync({
          id: editingZone.id,
          data: {
            name: values.name.trim(),
            description,
            sortOrder: values.sortOrder,
          },
        });
      } else {
        await createZone.mutateAsync({
          propertyId,
          name: values.name.trim(),
          description: description ?? undefined,
          sortOrder: values.sortOrder,
        });
      }
      closeDialog();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const onDelete = async (zone: Zone) => {
    if (
      !window.confirm(
        `Delete zone ${zone.name}? Its parking slots will no longer be available.`,
      )
    )
      return;
    setError(null);
    try {
      await deleteZone.mutateAsync(zone.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  if (!propertyId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Zones</h1>
        <Alert tone="destructive">
          Your account is not assigned to a property.
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Zones</h1>
        </div>
        <Button onClick={openCreate}>Add Zone</Button>
      </div>

      {error && <Alert tone="destructive">{error}</Alert>}
      {isLoading ? (
        <Spinner />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Description</TH>
              <TH>Slots</TH>
              <TH>Sort Order</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {pagedZones.map((zone) => (
              <TR key={zone.id}>
                <TD className="font-medium">{zone.name}</TD>
                <TD>{zone.description || "—"}</TD>
                <TD>{zone._count.slots}</TD>
                <TD>{zone.sortOrder}</TD>
                <TD>
                  <ActionMenu>
                    <ActionMenuItem onClick={() => openEdit(zone)}>
                      Edit
                    </ActionMenuItem>
                    <ActionMenuItem destructive onClick={() => onDelete(zone)}>
                      Delete
                    </ActionMenuItem>
                  </ActionMenu>
                </TD>
              </TR>
            ))}
            {!zones?.length && (
              <TR>
                <TD
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No zones yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={zonesTotal}
        onPageChange={setPage}
      />

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingZone ? "Edit Zone" : "Add Zone"}
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button type="submit" form="zone-form" isLoading={isSubmitting}>
              {editingZone ? "Save Changes" : "Create Zone"}
            </Button>
          </>
        }
      >
        <form
          id="zone-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          {error && <Alert tone="destructive">{error}</Alert>}
          <div>
            <Label htmlFor="zone-name">Zone Name</Label>
            <Input
              id="zone-name"
              required
              {...register("name", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="zone-description">Description</Label>
            <Input id="zone-description" {...register("description")} />
          </div>
          <div>
            <Label htmlFor="zone-sort-order">Sort Order</Label>
            <Input
              id="zone-sort-order"
              type="number"
              min="0"
              step="1"
              {...register("sortOrder", { valueAsNumber: true, min: 0 })}
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
}
