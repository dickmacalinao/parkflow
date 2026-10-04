import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { Dialog } from "../../components/ui/Dialog";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { getApiErrorMessage } from "../../lib/apiClient";
import { PROPERTY_TYPES } from "../../components/Types";
import {
  useCreateProperty,
  useUpdateProperty,
  type Property,
  type PropertyInput,
} from "./properties.hooks";

const EMPTY_PROPERTY: PropertyInput = {
  name: "",
  type: "RESIDENTIAL_CONDOMINIUM",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  timezone: "UTC",
  latitude: "",
  longitude: "",
};

interface PropertyFormDialogProps {
  open: boolean;
  onClose: () => void;
  property?: Property | null;
}

export function PropertyFormDialog({
  open,
  onClose,
  property,
}: PropertyFormDialogProps) {
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<PropertyInput>({ defaultValues: EMPTY_PROPERTY });

  useEffect(() => {
    if (!open) return;
    setError(null);
    reset(
      property
        ? {
            ...EMPTY_PROPERTY,
            name: property.name,
            type: property.type,
            addressLine1: property.addressLine1 ?? "",
            addressLine2: property.addressLine2 ?? "",
            city: property.city,
            state: property.state,
            postalCode: property.postalCode ?? "",
            country: property.country,
            timezone: property.timezone ?? "UTC",
            latitude: property.latitude?.toString() ?? "",
            longitude: property.longitude?.toString() ?? "",
          }
        : EMPTY_PROPERTY,
    );
  }, [open, property, reset]);

  const onSubmit = async (input: PropertyInput) => {
    setError(null);
    const payload = {
      ...input,
      addressLine2: input.addressLine2 || (property ? null : undefined),
      latitude: input.latitude.trim()
        ? Number(input.latitude)
        : property
          ? null
          : undefined,
      longitude: input.longitude.trim()
        ? Number(input.longitude)
        : property
          ? null
          : undefined,
    };
    try {
      if (property)
        await updateProperty.mutateAsync({ id: property.id, input: payload });
      else await createProperty.mutateAsync(payload);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={property ? "Update Property" : "Register Property"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="property-form" isLoading={isSubmitting}>
            {property ? "Save Changes" : "Register Property"}
          </Button>
        </>
      }
    >
      <form
        id="property-form"
        onSubmit={handleSubmit(onSubmit)}
        className="max-h-[70vh] space-y-3 overflow-y-auto"
      >
        {error && <Alert tone="destructive">{error}</Alert>}
        <div>
          <Label htmlFor="property-name">Property Name</Label>
          <Input
            id="property-name"
            required
            {...register("name", { required: true })}
          />
        </div>
        <div>
          <Label htmlFor="property-type">Property Type</Label>
          <Select
            className="w-full"
            id="property-type"
            {...register("type", { required: true })}
          >
            {PROPERTY_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="property-address1">Address</Label>
          <Input
            id="property-address1"
            required
            {...register("addressLine1", { required: true })}
          />
        </div>
        <div>
          <Label htmlFor="property-address2">Address Line 2</Label>
          <Input id="property-address2" {...register("addressLine2")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="property-city">City</Label>
            <Input
              id="property-city"
              required
              {...register("city", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="property-state">State / Province</Label>
            <Input
              id="property-state"
              required
              {...register("state", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="property-postal">Postal Code</Label>
            <Input
              id="property-postal"
              required
              {...register("postalCode", { required: true })}
            />
          </div>
          <div>
            <Label htmlFor="property-country">Country</Label>
            <Input
              id="property-country"
              required
              {...register("country", { required: true })}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="property-timezone">Timezone</Label>
          <Input
            id="property-timezone"
            required
            {...register("timezone", { required: true })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="property-latitude">Latitude</Label>
            <Input
              id="property-latitude"
              type="number"
              step="any"
              {...register("latitude")}
            />
          </div>
          <div>
            <Label htmlFor="property-longitude">Longitude</Label>
            <Input
              id="property-longitude"
              type="number"
              step="any"
              {...register("longitude")}
            />
          </div>
        </div>
      </form>
    </Dialog>
  );
}
