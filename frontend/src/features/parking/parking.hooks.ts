import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export interface Slot {
  id: string;
  code: string;
  type: string;
  status: string;
  dailyRate: string;
  zone: { id: string; name: string; propertyId: string };
}

export function useSlots(propertyId?: string) {
  return useQuery({
    queryKey: ['slots', propertyId],
    queryFn: async () => {
      const { data } = await apiClient.get('/parking/slots', { params: { propertyId, pageSize: 200 } });
      return data.rows as Slot[];
    },
    enabled: !!propertyId,
  });
}

export function useSetSlotStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await apiClient.patch(`/parking/slots/${id}/status`, { status });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['slots'] }),
  });
}
