'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { isNetworkError } from '@/lib/api';
import toast from 'react-hot-toast';

const getAddressErrorMessage = (error: any) => {
  if (isNetworkError(error)) {
    return 'The address service is currently unavailable. Please try again shortly.';
  }

  return error.response?.data?.message || 'Something went wrong';
};

const unwrapApiResponse = (response: any) => response?.data ?? response;

export const useAddresses = () => {
  const query = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      try {
        const response = await api.get('/addresses');
        const data = unwrapApiResponse(response);
        return data?.data ?? data ?? [];
      } catch (error) {
        if (isNetworkError(error)) {
          return [];
        }
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    addresses: Array.isArray(query.data)
      ? query.data
      : (query.data?.data ?? query.data ?? []),
  };
};

export const useAddress = (id: number) => {
  const query = useQuery({
    queryKey: ['addresses', id],
    queryFn: async () => {
      try {
        const response = await api.get(`/addresses/${id}`);
        const data = unwrapApiResponse(response);
        return data?.data ?? data ?? null;
      } catch (error) {
        if (isNetworkError(error)) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!id,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    address: query.data,
  };
};

export const usePrimaryAddress = () => {
  const query = useQuery({
    queryKey: ['addresses', 'primary'],
    queryFn: async () => {
      try {
        const response = await api.get('/addresses/primary');
        const data = unwrapApiResponse(response);
        return data?.data ?? data ?? null;
      } catch (error) {
        if (isNetworkError(error)) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    address: query.data,
  };
};

export const useCreateAddress = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/addresses', data);
      const result = unwrapApiResponse(response);
      return result?.data ?? result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address added successfully');
    },
    onError: (error: any) => {
      toast.error(getAddressErrorMessage(error));
    },
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await api.patch(`/addresses/${id}`, data);
      const result = unwrapApiResponse(response);
      return result?.data ?? result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      queryClient.invalidateQueries({ queryKey: ['addresses', variables.id] });
      toast.success('Address updated successfully');
    },
    onError: (error: any) => {
      toast.error(getAddressErrorMessage(error));
    },
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      toast.success('Address deleted successfully');
    },
    onError: (error: any) => {
      toast.error(getAddressErrorMessage(error));
    },
  });
};

export const useSetPrimaryAddress = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.patch(`/addresses/${id}/primary`);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      queryClient.invalidateQueries({ queryKey: ['addresses', 'primary'] });
      toast.success('Primary address updated');
    },
    onError: (error: any) => {
      toast.error(getAddressErrorMessage(error));
    },
  });
};

// Timor-Leste specific hooks
export const useProvinces = () => {
  const query = useQuery({
    queryKey: ['locations', 'provinces'],
    queryFn: async () => {
      const response = await api.get('/locations/countries/TL/provinces');
      const data = unwrapApiResponse(response);
      return data?.data ?? data;
    },
  });

  return {
    ...query,
    provinces: query.data,
  };
};

export const useMunicipalities = () => {
  const query = useQuery({
    queryKey: ['locations', 'municipalities'],
    queryFn: async () => {
      const response = await api.get('/locations/countries/TL/provinces');
      const raw = unwrapApiResponse(response);
      const provinces = raw?.data ?? raw;
      const municipalities = provinces.flatMap((province: any) =>
        (province.municipalities || []).map((municipality: any) => ({
          ...municipality,
          provinceName: province.name,
        })),
      );
      return municipalities;
    },
  });

  return {
    ...query,
    municipalities: query.data,
  };
};

export const usePostos = (municipality: string) => {
  const query = useQuery({
    queryKey: ['timor', 'postos', municipality],
    queryFn: async () => {
      const response = await api.get(`/addresses/timor/municipalities/${municipality}/postos`);
      const data = unwrapApiResponse(response);
      return data?.data ?? data;
    },
    enabled: !!municipality,
  });

  return {
    ...query,
    postos: query.data,
  };
};

export const useSucos = (municipality: string, posto: string) => {
  const query = useQuery({
    queryKey: ['timor', 'sucos', municipality, posto],
    queryFn: async () => {
      const response = await api.get(`/addresses/timor/municipalities/${municipality}/postos/${posto}/sucos`);
      const data = unwrapApiResponse(response);
      return data?.data ?? data;
    },
    enabled: !!municipality && !!posto,
  });

  return {
    ...query,
    sucos: query.data,
  };
};

export const useShippingZones = () => {
  const query = useQuery({
    queryKey: ['shipping', 'zones'],
    queryFn: async () => {
      const response = await api.get('/shipping-zones');
      const data = unwrapApiResponse(response);
      return data?.data ?? data ?? [];
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  type ShippingZoneMunicipality = {
    value: string;
    label: string;
    id?: number;
    name: string;
    provinceId: number | null;
    provinceName: string | null;
  };

  return {
    ...query,
    zones: query.data,
    municipalities: query.data ? Array.from(
      new Map(
        (query.data as any[])
          .map((z) => {
            const municipalityId = z.municipalityRef?.id ?? z.municipalityId;
            const rawMunicipalityName = z.municipality ?? z.municipalityRef?.name ?? `Municipality ${z.id}`;
            const rawProvinceName = z.province ?? z.provinceRef?.name ?? null;
            const municipalityName = rawMunicipalityName?.trim();
            const provinceName = rawProvinceName?.trim() || null;

            if (!municipalityName || municipalityName.toLowerCase() === 'other municipalities') {
              return null;
            }

            const value = municipalityId != null ? String(municipalityId) : municipalityName;
            const label = provinceName ? `${municipalityName} - ${provinceName}` : municipalityName;

            return [value, {
              value,
              label,
              id: municipalityId,
              name: municipalityName,
              provinceId: z.provinceRef?.id ?? z.provinceId ?? null,
              provinceName,
            }];
          })
          .filter(Boolean) as [string, ShippingZoneMunicipality][],
      ).values(),
    ) : [],
  };
};