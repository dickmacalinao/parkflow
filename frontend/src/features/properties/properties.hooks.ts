import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export interface Property {
  id: string;
  name: string;
  type: string;
  status: string;
  city: string;
  state: string;
  country: string;
}

export function useProperties(params: { status?: string; q?: string } = {}) {
  return useQuery({
    queryKey: ['properties', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/properties', { params: { pageSize: 50, ...params } });
      return data.rows as Property[];
    },
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
