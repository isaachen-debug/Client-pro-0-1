import { api } from './http';

export type AddressSuggestion = {
  label: string;
  value: string;
  lat?: string;
  lon?: string;
};

export const geoApi = {
  async autocomplete(query: string) {
    const { data } = await api.get<AddressSuggestion[]>('/geo/autocomplete', {
      params: { query },
    });
    return data;
  },
};
