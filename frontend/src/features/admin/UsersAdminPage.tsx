import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useInviteUser, useUpdateUserStatus, useUsers, type InviteUserInput } from './admin.hooks';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Select } from '../../components/ui/Select';
import { Alert } from '../../components/ui/Alert';
import { getApiErrorMessage } from '../../lib/apiClient';

const ROLES = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'PROPERTY_MANAGER', 'PROPERTY_OWNER', 'TENANT', 'VISITOR', 'PARKING_ATTENDANT'];
const STATUS_TONE: Record<string, 'default' | 'success' | 'destructive' | 'muted'> = {
  ACTIVE: 'success',
  PENDING_VERIFICATION: 'default',
  SUSPENDED: 'destructive',
  DEACTIVATED: 'muted',
};

export function UsersAdminPage() {
  const { data: users, isLoading } = useUsers();
  const updateStatus = useUpdateUserStatus();
  const invite = useInviteUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<InviteUserInput>();

  const onInvite = async (data: InviteUserInput) => {
    setError(null);
    try {
      await invite.mutateAsync(data);
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
        <Button onClick={() => setInviteOpen(true)}>Invite user</Button>
      </div>

      {!isLoading && (
        <Table>
          <THead>
            <TR><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Status</TH><TH>Actions</TH></TR>
          </THead>
          <TBody>
            {users?.map((u) => (
              <TR key={u.id}>
                <TD>{u.firstName} {u.lastName}</TD>
                <TD>{u.email}</TD>
                <TD className="capitalize">{u.role.replace(/_/g, ' ').toLowerCase()}</TD>
                <TD><Badge tone={STATUS_TONE[u.status] ?? 'muted'}>{u.status.replace(/_/g, ' ').toLowerCase()}</Badge></TD>
                <TD>
                  {u.status === 'ACTIVE' ? (
                    <Button size="sm" variant="destructive" onClick={() => updateStatus.mutate({ id: u.id, status: 'SUSPENDED' })}>Suspend</Button>
                  ) : u.status === 'SUSPENDED' ? (
                    <Button size="sm" onClick={() => updateStatus.mutate({ id: u.id, status: 'ACTIVE' })}>Reactivate</Button>
                  ) : null}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite a Property Manager or Owner">
        <form id="invite-form" onSubmit={handleSubmit(onInvite)} className="space-y-3">
          {error && <Alert tone="destructive">{error}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="firstName">First name</Label><Input id="firstName" {...register('firstName', { required: true })} /></div>
            <div><Label htmlFor="lastName">Last name</Label><Input id="lastName" {...register('lastName', { required: true })} /></div>
          </div>
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" {...register('email', { required: true })} /></div>
          <div>
            <Label htmlFor="role">Role</Label>
            <Select id="role" {...register('role', { required: true })}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </Select>
          </div>
          <div><Label htmlFor="propertyId">Property ID (for Managers/Owners)</Label><Input id="propertyId" {...register('propertyId')} /></div>
        </form>
      </Dialog>
      {inviteOpen && (
        <div className="fixed inset-x-0 bottom-6 z-[60] flex justify-center">
          <div className="flex gap-2 rounded-md border border-border bg-card p-2 shadow-lg">
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button form="invite-form" type="submit" isLoading={isSubmitting}>Send invite</Button>
          </div>
        </div>
      )}
    </div>
  );
}
