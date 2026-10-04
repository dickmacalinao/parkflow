import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Alert } from "../../components/ui/Alert";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Spinner } from "../../components/ui/Spinner";
import { getApiErrorMessage } from "../../lib/apiClient";
import { PropertyFormDialog } from "./PropertyFormDialog";
import { useDeleteProperty, useProperty } from "./properties.hooks";

export function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: property, isLoading } = useProperty(id);
  const deleteProperty = useDeleteProperty();

  if (isLoading) return <Spinner />;
  if (!property) return <p>Property not found.</p>;

  const isAdmin = user?.role === "SUPER_ADMIN";
  const canEdit =
    isAdmin ||
    property.owner?.id === user?.id ||
    property.managers?.some(
      (manager: { userId: string }) => manager.userId === user?.id,
    );

  const onDelete = async () => {
    if (
      !window.confirm(
        `Deactivate ${property.name}? It will no longer appear in active property lists.`,
      )
    )
      return;
    setError(null);
    try {
      await deleteProperty.mutateAsync(property.id);
      navigate("/properties");
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              to="/properties"
              className="text-sm text-primary hover:underline"
            >
              Properties
            </Link>
            <h1 className="text-2xl font-semibold">{property.name}</h1>
            <p className="text-muted-foreground">
              {property.addressLine1}, {property.city}, {property.state}
            </p>
          </div>
          {(canEdit || isAdmin) && (
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" onClick={() => setFormOpen(true)}>
                  Edit Property
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="destructive"
                  isLoading={deleteProperty.isPending}
                  onClick={onDelete}
                >
                  Deactivate
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && <Alert tone="destructive">{error}</Alert>}

      <div className="grid gap-4 md:grid-cols-2">
        {property.zones?.map(
          (zone: {
            id: string;
            name: string;
            slots: { id: string; code: string; status: string; type: string }[];
          }) => (
            <Card key={zone.id}>
              <CardHeader>
                <CardTitle>{zone.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {zone.slots.map((slot) => (
                  <Badge
                    key={slot.id}
                    tone={
                      slot.status === "AVAILABLE"
                        ? "success"
                        : slot.status === "BLOCKED"
                          ? "muted"
                          : "destructive"
                    }
                  >
                    {slot.code}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ),
        )}
      </div>
      <PropertyFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        property={property}
      />
    </div>
  );
}
