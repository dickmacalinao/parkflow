import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, getApiErrorMessage } from '../../lib/apiClient';
import { DEFAULT_PAGE_SIZE, type PaginatedResponse } from '../../lib/pagination';

export interface Reservation {
  id: string;
  code: string;
  status: string;
  startAt: string;
  endAt: string;
  amount: string;
  slot: { id: string; code: string; type: string };
  property: { id: string; name: string };
  requestedBy: { id: string; firstName: string; lastName: string; email: string };
}

export function useReservations(params: { status?: string; propertyId?: string; page?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['reservations', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/reservations', { params: { pageSize: DEFAULT_PAGE_SIZE, ...params } });
      return data as PaginatedResponse<Reservation>;
    },
  });
}

export interface CreateReservationInput {
  propertyId: string;
  slotId: string;
  type: 'TENANT' | 'VISITOR' | 'CONTRACTOR' | 'EVENT';
  startAt: string;
  endAt: string;
  notes?: string;
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReservationInput) => {
      const { data } = await apiClient.post('/reservations', input);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useDecideReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: 'APPROVED' | 'REJECTED'; reason?: string }) => {
      const { data } = await apiClient.post(`/reservations/${id}/decision`, { status, reason });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
}

export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await apiClient.post(`/reservations/${id}/cancel`);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservations'] }),
  });
}

export { getApiErrorMessage };
