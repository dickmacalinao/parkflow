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
      const pageSize = 200;
      const { data: firstPage } = await apiClient.get('/parking/slots', {
        params: { propertyId, page: 1, pageSize },
      });
      const rows = [...firstPage.rows] as Slot[];
      const total = Number(firstPage.total);

      for (let page = 2; rows.length < total; page += 1) {
        const { data } = await apiClient.get('/parking/slots', {
          params: { propertyId, page, pageSize },
        });
        if (!data.rows.length) break;
        rows.push(...(data.rows as Slot[]));
      }

      return rows;
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
