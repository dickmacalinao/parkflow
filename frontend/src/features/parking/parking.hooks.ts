import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export interface Slot {
  id: string;
  code: string;
  type: string;
  status: string;
  approvalStatus: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  approvalReason: string | null;
  hourlyRate: string | null;
  dailyRate: string;
  monthlyRate: string | null;
  isEvCharging: boolean;
  zone: { id: string; name: string; propertyId: string };
}

export interface SlotInput {
  zoneId: string;
  code: string;
  type: string;
  hourlyRate?: number;
  dailyRate: number;
  monthlyRate?: number;
  isEvCharging: boolean;
}

export interface Zone {
  id: string;
  propertyId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  _count: { slots: number };
}

export interface ZoneInput {
  propertyId: string;
  name: string;
  description?: string;
  sortOrder: number;
}

type ZoneUpdateInput = Partial<Omit<ZoneInput, 'propertyId' | 'description'>> & {
  description?: string | null;
};

export function useZones(propertyId?: string) {
  return useQuery({
    queryKey: ['zones', propertyId],
    queryFn: async () => {
      const { data } = await apiClient.get('/parking/zones', { params: { propertyId } });
      return data as Zone[];
    },
    enabled: !!propertyId,
  });
}

export function useCreateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ZoneInput) => {
      const { data } = await apiClient.post('/parking/zones', input);
      return data as Zone;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['zones', input.propertyId] });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useUpdateZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: input }: { id: string; data: ZoneUpdateInput }) => {
      const { data } = await apiClient.patch(`/parking/zones/${id}`, input);
      return data as Zone;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useDeleteZone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/parking/zones/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useSlots(
  propertyId?: string,
  startAt?: string,
  endAt?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ['slots', propertyId, startAt, endAt],
    queryFn: async () => {
      const pageSize = 200;
      const { data: firstPage } = await apiClient.get('/parking/slots', {
        params: { propertyId, startAt, endAt, page: 1, pageSize },
      });
      const rows = [...firstPage.rows] as Slot[];
      const total = Number(firstPage.total);

      for (let page = 2; rows.length < total; page += 1) {
        const { data } = await apiClient.get('/parking/slots', {
          params: { propertyId, startAt, endAt, page, pageSize },
        });
        if (!data.rows.length) break;
        rows.push(...(data.rows as Slot[]));
      }

      return rows;
    },
    enabled: !!propertyId && enabled,
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

export function useMySlots() {
  return useQuery({
    queryKey: ['my-slots'],
    queryFn: async () => {
      const { data } = await apiClient.get('/parking/slots/mine');
      return data as Slot[];
    },
  });
}

export function usePendingSlots(enabled = true) {
  return useQuery({
    queryKey: ['pending-slots'],
    queryFn: async () => {
      const { data } = await apiClient.get('/parking/slots/pending-verification');
      return data as Slot[];
    },
    enabled,
  });
}

export function useCreateSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SlotInput) => {
      const { data } = await apiClient.post('/parking/slots', input);
      return data as Slot;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-slots'] });
      qc.invalidateQueries({ queryKey: ['pending-slots'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useUpdateSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<Omit<SlotInput, 'zoneId'>> }) => {
      const { data } = await apiClient.patch(`/parking/slots/${id}`, input);
      return data as Slot;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-slots'] });
      qc.invalidateQueries({ queryKey: ['pending-slots'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useDeleteSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/parking/slots/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-slots'] });
      qc.invalidateQueries({ queryKey: ['pending-slots'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useReviewSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision, reason }: { id: string; decision: 'APPROVED' | 'REJECTED'; reason?: string }) => {
      const { data } = await apiClient.patch(`/parking/slots/${id}/approval`, { decision, reason });
      return data as Slot;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-slots'] });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}
