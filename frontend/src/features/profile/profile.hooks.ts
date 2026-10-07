import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export interface ProfileFields {
  firstName: string;
  lastName: string;
  phone: string;
  paymentInfo: string;
  avatarUrl: string;
  buildingNo: string;
  floorNo: string;
  unitNo: string;
}

export function useProfile(id?: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/users/${id}`);
      return data;
    },
    enabled: !!id,
  });
}
