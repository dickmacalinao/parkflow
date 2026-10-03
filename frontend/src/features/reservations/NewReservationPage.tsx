import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useProperties } from '../properties/properties.hooks';
import { useSlots } from '../parking/parking.hooks';
import { useCreateReservation, getApiErrorMessage } from './reservations.hooks';
import { newReservationSchema, type NewReservationInput } from './reservation.schemas';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { FormError } from '../../components/ui/FormError';
import { Alert } from '../../components/ui/Alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';

export function NewReservationPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const { data: properties } = useProperties({ status: 'ACTIVE' });
  const create = useCreateReservation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<NewReservationInput>({ resolver: zodResolver(newReservationSchema) });

  const propertyId = watch('propertyId');
  const { data: slots } = useSlots(propertyId);
  const availableSlots = slots?.filter((s) => s.status === 'AVAILABLE') ?? [];

  const onSubmit = async (data: NewReservationInput) => {
    setServerError(null);
    try {
      await create.mutateAsync({
        ...data,
        type: 'TENANT',
        startAt: new Date(data.startAt).toISOString(),
        endAt: new Date(data.endAt).toISOString(),
      });
      navigate('/reservations');
    } catch (err) {
      setServerError(getApiErrorMessage(err, 'Could not create the reservation.'));
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Reserve a bay</h1>
      <Card>
        <CardHeader>
          <CardTitle>Reservation details</CardTitle>
          <CardDescription>Your request goes to the property manager for approval.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            {serverError && <Alert tone="destructive">{serverError}</Alert>}

            <div>
              <Label htmlFor="propertyId">Property</Label>
              <Select id="propertyId" {...register('propertyId')}>
                <option value="">Select a property</option>
                {properties?.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <FormError message={errors.propertyId?.message} />
            </div>

            <div>
              <Label htmlFor="slotId">Bay</Label>
              <Select id="slotId" {...register('slotId')} disabled={!propertyId}>
                <option value="">{propertyId ? 'Select a bay' : 'Choose a property first'}</option>
                {availableSlots.map((s) => (
                  <option key={s.id} value={s.id}>{s.code} ({s.type.toLowerCase()}) - ${s.dailyRate}/day</option>
                ))}
              </Select>
              <FormError message={errors.slotId?.message} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="startAt">Start</Label>
                <Input id="startAt" type="datetime-local" {...register('startAt')} />
                <FormError message={errors.startAt?.message} />
              </div>
              <div>
                <Label htmlFor="endAt">End</Label>
                <Input id="endAt" type="datetime-local" {...register('endAt')} />
                <FormError message={errors.endAt?.message} />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input id="notes" {...register('notes')} />
            </div>

            <Button type="submit" className="w-full" isLoading={isSubmitting}>Request reservation</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
