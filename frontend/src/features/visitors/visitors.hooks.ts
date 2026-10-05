import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { DEFAULT_PAGE_SIZE, type PaginatedResponse } from '../../lib/pagination';

export interface VisitorPass {
  id: string;
  visitorName: string;
  visitorPhone?: string;
  validFrom: string;
  validTo: string;
  usedAt: string | null;
  qrCodeToken: string;
}

export function useVisitorPasses(params: { page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['visitor-passes', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/visitor-passes', { params: { pageSize: DEFAULT_PAGE_SIZE, ...params } });
      return data as PaginatedResponse<VisitorPass>;
    },
  });
}

export interface CreateVisitorPassInput {
  propertyId: string;
  visitorName: string;
  visitorPhone?: string;
  plateNumber?: string;
  validFrom: string;
  validTo: string;
}

export function useCreateVisitorPass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVisitorPassInput) => {
      const { data } = await apiClient.post('/visitor-passes', input);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitor-passes'] }),
  });
}
