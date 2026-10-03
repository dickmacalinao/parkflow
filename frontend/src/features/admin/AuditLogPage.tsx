import { useAuditLogs } from './admin.hooks';
import { Table, TBody, TD, TH, THead, TR } from '../../components/ui/Table';
import { Spinner } from '../../components/ui/Spinner';

export function AuditLogPage() {
  const { data: logs, isLoading } = useAuditLogs();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Audit Log</h1>
      {isLoading ? (
        <Spinner />
      ) : (
        <Table>
          <THead>
            <TR><TH>When</TH><TH>Actor</TH><TH>Action</TH><TH>Entity</TH><TH>Notes</TH></TR>
          </THead>
          <TBody>
            {logs?.map((log) => (
              <TR key={log.id}>
                <TD className="text-xs">{new Date(log.createdAt).toLocaleString()}</TD>
                <TD>{log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}</TD>
                <TD className="capitalize">{log.action.toLowerCase()}</TD>
                <TD>{log.entityType}{log.entityId ? ` #${log.entityId.slice(0, 8)}` : ''}</TD>
                <TD className="text-xs text-muted-foreground">{log.description}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
