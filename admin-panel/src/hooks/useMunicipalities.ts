import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { unwrapApiData } from '@/lib/utils';
import toast from 'react-hot-toast';

export interface ProvinceData {
  id: number;
  name: string;
  code: string;
}

export interface MunicipalityData {
  id: number;
  name: string;
  code?: string | null;
  isActive: boolean;
  provinceId: number;
  createdAt: string;
  updatedAt: string;
  province: ProvinceData;
}

export interface CreateMunicipalityPayload {
  name: string;
  provinceId: number;
  code?: string;
}

export interface UpdateMunicipalityPayload {
  name?: string;
  provinceId?: number;
  code?: string;
  isActive?: boolean;
}

export function useMunicipalities(search?: string) {
  return useQuery<MunicipalityData[]>({
    queryKey: ['municipalities', search ?? ''],
    queryFn: async () => {
      const response = await api.get('/locations/municipalities/admin', {
        params: search ? { search } : undefined,
      });
      return unwrapApiData<MunicipalityData[]>(response.data);
    },
  });
}

export function useProvinces() {
  return useQuery<ProvinceData[]>({
    queryKey: ['provinces'],
    queryFn: async () => {
      const response = await api.get('/locations/countries/TL/provinces');
      return unwrapApiData<ProvinceData[]>(response.data);
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateMunicipality() {
  const queryClient = useQueryClient();

  return useMutation<MunicipalityData, unknown, CreateMunicipalityPayload>({
    mutationFn: async (payload: CreateMunicipalityPayload) => {
      const response = await api.post('/locations/municipalities', payload);
      return unwrapApiData<MunicipalityData>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipalities'] });
      toast.success('Municipality created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create municipality');
    },
  });
}

export function useUpdateMunicipality() {
  const queryClient = useQueryClient();

  return useMutation<MunicipalityData, unknown, { id: number; payload: UpdateMunicipalityPayload }>({
    mutationFn: async ({ id, payload }) => {
      const response = await api.patch(`/locations/municipalities/${id}`, payload);
      return unwrapApiData<MunicipalityData>(response.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipalities'] });
      toast.success('Municipality updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update municipality');
    },
  });
}

export function useDeleteMunicipality() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/locations/municipalities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipalities'] });
      toast.success('Municipality deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete municipality');
    },
  });
}
