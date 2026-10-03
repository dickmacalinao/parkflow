import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useDecideProperty, useProperties } from './properties.hooks';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';

const STATUS_TONE: Record<string, 'default' | 'success' | 'destructive' | 'muted'> = {
  ACTIVE: 'success',
  PENDING_APPROVAL: 'default',
  REJECTED: 'destructive',
  INACTIVE: 'muted',
};

export function PropertiesListPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | undefined>(undefined);
  const { data: properties, isLoading } = useProperties({ status });
  const decide = useDecideProperty();
  const canApprove = user && ['SUPER_ADMIN', 'SYSTEM_ADMIN'].includes(user.role);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
      </div>

      <div className="flex gap-2">
        {[undefined, 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED'].map((s) => (
          <Button key={s ?? 'all'} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
            {s ? s.replace(/_/g, ' ') : 'All'}
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
              {canApprove && <TH>Actions</TH>}
            </TR>
          </THead>
          <TBody>
            {properties?.map((p) => (
              <TR key={p.id}>
                <TD>
                  <Link to={`/properties/${p.id}`} className="font-medium text-primary hover:underline">{p.name}</Link>
                </TD>
                <TD className="capitalize">{p.type.replace(/_/g, ' ').toLowerCase()}</TD>
                <TD>{p.city}, {p.state}</TD>
                <TD><Badge tone={STATUS_TONE[p.status] ?? 'muted'}>{p.status.replace(/_/g, ' ').toLowerCase()}</Badge></TD>
                {canApprove && (
                  <TD>
                    {p.status === 'PENDING_APPROVAL' && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => decide.mutate({ id: p.id, status: 'ACTIVE' })}>Approve</Button>
                        <Button size="sm" variant="destructive" onClick={() => decide.mutate({ id: p.id, status: 'REJECTED' })}>Reject</Button>
                      </div>
                    )}
                  </TD>
                )}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
