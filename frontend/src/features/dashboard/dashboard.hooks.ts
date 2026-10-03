import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export interface PropertySummary {
  id: string;
  name: string;
  status: string;
  _count: { zones: number };
}

export function useProperties() {
  return useQuery({
    queryKey: ['properties', 'summary'],
    queryFn: async () => {
      const { data } = await apiClient.get('/properties', { params: { pageSize: 50 } });
      return data.rows as PropertySummary[];
    },
  });
}

export function useReservationCounts(propertyId?: string) {
  return useQuery({
    queryKey: ['reservations', 'counts', propertyId],
    queryFn: async () => {
      const statuses = ['PENDING', 'APPROVED', 'CHECKED_IN'] as const;
      const results = await Promise.all(
        statuses.map((status) =>
          apiClient.get('/reservations', { params: { status, propertyId, pageSize: 1 } }).then((r) => r.data.total as number)
        )
      );
      return { pending: results[0], approved: results[1], checkedIn: results[2] };
    },
    enabled: true,
  });
}
