import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  propertyId: string | null;
  createdAt: string;
}

export function useUsers(params: { role?: string; status?: string; propertyId?: string; q?: string } = {}) {
  return useQuery({
    queryKey: ['admin-users', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/users', { params: { pageSize: 50, ...params } });
      return data.rows as AdminUser[];
    },
  });
}

export function useUpdateUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await apiClient.patch(`/users/${id}/status`, { status });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useAssignUserProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      const { data } = await apiClient.patch(`/users/${id}/property`, { propertyId });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export interface InviteUserInput {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  propertyId?: string;
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InviteUserInput) => {
      const { data } = await apiClient.post('/users/invite', input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useAuditLogs(params: { entityType?: string } = {}) {
  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/audit-logs', { params: { pageSize: 50, ...params } });
      return data.rows as Array<{
        id: string;
        action: string;
        entityType: string;
        entityId: string | null;
        description: string | null;
        createdAt: string;
        actor: { firstName: string; lastName: string; email: string } | null;
      }>;
    },
  });
}
