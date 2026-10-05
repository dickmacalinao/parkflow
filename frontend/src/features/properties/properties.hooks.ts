import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { DEFAULT_PAGE_SIZE, type PaginatedResponse } from '../../lib/pagination';

export interface Property {
  id: string;
  name: string;
  type: string;
  status: string;
  deletedAt?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  timezone?: string;
  latitude?: number | string | null;
  longitude?: number | string | null;
  owner?: { id: string } | null;
  managers?: { userId: string }[];
}

export interface PropertyInput {
  name: string;
  type: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  timezone: string;
  latitude: string;
  longitude: string;
}

export function useProperties(params: { status?: string; q?: string; includeDeleted?: boolean } = {}, enabled = true) {
  return useQuery({
    queryKey: ['properties', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/properties', { params: { pageSize: 50, ...params } });
      return data.rows as Property[];
    },
    enabled,
  });
}

export function usePropertiesPage(params: { status?: string; q?: string; includeDeleted?: boolean; page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['properties', 'paged', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/properties', { params: { pageSize: DEFAULT_PAGE_SIZE, ...params } });
      return data as PaginatedResponse<Property>;
    },
  });
}

export function useSetPropertyStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) => {
      const { data } = await apiClient.patch(`/properties/${id}/status`, { status });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}

export function useProperty(id?: string) {
  return useQuery({
    queryKey: ['properties', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/properties/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useDecideProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: 'ACTIVE' | 'REJECTED'; reason?: string }) => {
      const { data } = await apiClient.post(`/properties/${id}/decision`, { status, reason });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await apiClient.post('/properties', input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Record<string, unknown> }) => {
      const { data } = await apiClient.patch(`/properties/${id}`, input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/properties/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}
