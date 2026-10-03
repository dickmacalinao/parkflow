import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export interface VisitorPass {
  id: string;
  visitorName: string;
  visitorPhone?: string;
  validFrom: string;
  validTo: string;
  usedAt: string | null;
  qrCodeToken: string;
}

export function useVisitorPasses() {
  return useQuery({
    queryKey: ['visitor-passes'],
    queryFn: async () => {
      const { data } = await apiClient.get('/visitor-passes', { params: { pageSize: 50 } });
      return data.rows as VisitorPass[];
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
