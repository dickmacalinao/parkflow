import { useParams } from 'react-router-dom';
import { useProperty } from './properties.hooks';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';

export function PropertyDetailPage() {
  const { id } = useParams();
  const { data: property, isLoading } = useProperty(id);

  if (isLoading) return <Spinner />;
  if (!property) return <p>Property not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{property.name}</h1>
        <p className="text-muted-foreground">{property.addressLine1}, {property.city}, {property.state}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {property.zones?.map((zone: { id: string; name: string; slots: { id: string; code: string; status: string; type: string }[] }) => (
          <Card key={zone.id}>
            <CardHeader>
              <CardTitle>{zone.name}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {zone.slots.map((slot) => (
                <Badge key={slot.id} tone={slot.status === 'AVAILABLE' ? 'success' : slot.status === 'BLOCKED' ? 'muted' : 'destructive'}>
                  {slot.code}
                </Badge>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
