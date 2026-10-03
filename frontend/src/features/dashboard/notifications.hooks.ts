import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

interface NotificationsResponse {
  rows: unknown[];
  total: number;
  unread: number;
}

export function useNotificationsUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationsResponse>('/notifications', { params: { pageSize: 1 } });
      return data.unread;
    },
    refetchInterval: 60_000,
  });
}
