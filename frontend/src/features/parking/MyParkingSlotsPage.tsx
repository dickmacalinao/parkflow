import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ActionMenu, ActionMenuItem } from "../../components/ui/ActionMenu";
import { Alert } from "../../components/ui/Alert";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { Spinner } from "../../components/ui/Spinner";
import { Table, TBody, TD, TH, THead, TR } from "../../components/ui/Table";
import { useAuth } from "../../context/AuthContext";
import { getApiErrorMessage } from "../../lib/apiClient";
import { useClientPagination } from "../../lib/pagination";
import { Pagination } from "../../components/ui/Pagination";
import { useProperties } from "../properties/properties.hooks";
import {
  useCreateSlot,
  useDeleteSlot,
  useMySlots,
  useUpdateSlot,
  useZones,
  type Slot,
} from "./parking.hooks";

const SLOT_TYPES = [
  "STANDARD",
  "COMPACT",
  "ACCESSIBLE",
  "EV_CHARGING",
  "MOTORCYCLE",
  "OVERSIZED",
  "VISITOR",
];

const APPROVAL_TONE: Record<
  string,
  "default" | "success" | "destructive" | "muted"
> = {
  PENDING_VERIFICATION: "default",
  APPROVED: "success",
  REJECTED: "destructive",
};

interface SlotFormValues {
  zoneId: string;
  code: string;
  type: string;
  hourlyRate: string;
  dailyRate: string;
  monthlyRate: string;
  isEvCharging: boolean;
}

const EMPTY_FORM: SlotFormValues = {
  zoneId: "",
  code: "",
  type: "STANDARD",
  hourlyRate: "",
  dailyRate: "",
  monthlyRate: "",
  isEvCharging: false,
};

export function MyParkingSlotsPage() {
  const { user } = useAuth();
  const propertyId = user?.propertyId ?? undefined;
  const { data: properties } = useProperties();
  const property = properties?.find((item) => item.id === propertyId);
  const { data: zones, isLoading: zonesLoading } = useZones(propertyId);
  const { data: slots, isLoading: slotsLoading } = useMySlots();
  const {
    page,
    setPage,
    pageItems: pagedSlots,
    total: slotsTotal,
    pageSize,
  } = useClientPagination(slots);
  const createSlot = useCreateSlot();
  const updateSlot = useUpdateSlot();
  const deleteSlot = useDeleteSlot();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<SlotFormValues>({ defaultValues: EMPTY_FORM });

  useEffect(() => {
    reset(
      editingSlot
        ? {
            zoneId: editingSlot.zone.id,
            code: editingSlot.code,
            type: editingSlot.type,
            hourlyRate: editingSlot.hourlyRate ?? "",
            dailyRate: editingSlot.dailyRate,
            monthlyRate: editingSlot.monthlyRate ?? "",
            isEvCharging: editingSlot.isEvCharging,
          }
        : { ...EMPTY_FORM, zoneId: zones?.[0]?.id ?? "" },
    );
  }, [dialogOpen, editingSlot, reset, zones]);

  const openCreate = () => {
    setError(null);
    setEditingSlot(null);
    setDialogOpen(true);
  };

  const openEdit = (slot: Slot) => {
    setError(null);
    setEditingSlot(slot);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSlot(null);
  };

  const onSubmit = async (values: SlotFormValues) => {
    setError(null);
    const payload = {
      code: values.code.trim(),
      type: values.type,
      dailyRate: Number(values.dailyRate),
      hourlyRate: values.hourlyRate.trim()
        ? Number(values.hourlyRate)
        : undefined,
      monthlyRate: values.monthlyRate.trim()
        ? Number(values.monthlyRate)
        : undefined,
      isEvCharging: values.isEvCharging,
    };
    try {
      if (editingSlot) {
        await updateSlot.mutateAsync({ id: editingSlot.id, input: payload });
      } else {
        await createSlot.mutateAsync({ ...payload, zoneId: values.zoneId });
      }
      closeDialog();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const onDelete = async (slot: Slot) => {
    if (!window.confirm(`Delete parking slot ${slot.code}?`)) return;
    setError(null);
    try {
      await deleteSlot.mutateAsync(slot.id);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  if (!propertyId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">My Parking Slots</h1>
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
          <h1 className="text-2xl font-semibold">My Parking Slots</h1>
          {property && (
            <p className="text-sm text-muted-foreground">{property.name}</p>
          )}
        </div>
        <Button onClick={openCreate} disabled={!zones?.length}>
          Register Parking Slot
        </Button>
      </div>

      {error && <Alert tone="destructive">{error}</Alert>}
      {slotsLoading || zonesLoading ? (
        <Spinner />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Zone</TH>
              <TH>Code</TH>
              <TH>Type</TH>
              <TH>Hourly Rate</TH>
              <TH>Daily Rate</TH>
              <TH>Monthly Rate</TH>
              <TH>Approval</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {pagedSlots.map((slot) => (
              <TR key={slot.id}>
                <TD>{slot.zone.name}</TD>
                <TD className="font-mono">{slot.code}</TD>
                <TD>{slot.type.replace(/_/g, " ").toLowerCase()}</TD>
                <TD>{slot.hourlyRate ? `$${slot.hourlyRate}` : "—"}</TD>
                <TD>${slot.dailyRate}</TD>
                <TD>{slot.monthlyRate ? `$${slot.monthlyRate}` : "—"}</TD>
                <TD>
                  <Badge tone={APPROVAL_TONE[slot.approvalStatus] ?? "muted"}>
                    {slot.approvalStatus.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                  {slot.approvalReason && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {slot.approvalReason}
                    </div>
                  )}
                </TD>
                <TD>
                  <ActionMenu>
                    <ActionMenuItem onClick={() => openEdit(slot)}>
                      Edit
                    </ActionMenuItem>
                    <ActionMenuItem destructive onClick={() => onDelete(slot)}>
                      Delete
                    </ActionMenuItem>
                  </ActionMenu>
                </TD>
              </TR>
            ))}
            {!slots?.length && (
              <TR>
                <TD
                  colSpan={8}
                  className="py-8 text-center text-muted-foreground"
                >
                  No parking slots registered for this property.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        total={slotsTotal}
        onPageChange={setPage}
      />

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        title={editingSlot ? "Edit Parking Slot" : "Register Parking Slot"}
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="owner-slot-form"
              isLoading={isSubmitting}
            >
              {editingSlot ? "Save Changes" : "Submit for Verification"}
            </Button>
          </>
        }
      >
        <form
          id="owner-slot-form"
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-3"
        >
          {error && <Alert tone="destructive">{error}</Alert>}
          <div>
            <Label htmlFor="owner-slot-zone">Zone</Label>
            <Select
              id="owner-slot-zone"
              disabled={!!editingSlot}
              {...register("zoneId", { required: true })}
              className="w-full"
            >
              <option value="">Choose a zone</option>
              {zones?.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="owner-slot-code">Slot Code</Label>
            <Input
              id="owner-slot-code"
              required
              {...register("code", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="owner-slot-type">Slot Type</Label>
            <Select
              id="owner-slot-type"
              className="w-full"
              {...register("type", { required: true })}
            >
              {SLOT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, " ").toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="owner-slot-hourly">Hourly Rate</Label>
              <Input
                id="owner-slot-hourly"
                type="number"
                min="0"
                step="0.01"
                {...register("hourlyRate")}
              />
            </div>
            <div>
              <Label htmlFor="owner-slot-daily">Daily Rate</Label>
              <Input
                id="owner-slot-daily"
                type="number"
                min="0"
                step="0.01"
                required
                {...register("dailyRate", { required: true })}
              />
            </div>
            <div>
              <Label htmlFor="owner-slot-monthly">Monthly Rate</Label>
              <Input
                id="owner-slot-monthly"
                type="number"
                min="0"
                step="0.01"
                {...register("monthlyRate")}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register("isEvCharging")} />
            EV charging
          </label>
        </form>
      </Dialog>
    </div>
  );
}
