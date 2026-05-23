import { api } from "@nowayhome/api-client";
import { API_PATHS } from "../constants/apiPaths";

export const searchHotels = async (params: Record<string, string>) => {
  const query = new URLSearchParams(params).toString();
  return await api(`${API_PATHS.HOTELS.SEARCH}?${query}`);
};

export const fetchHotelDetail = async (id: string | number, params: Record<string, string> = {}) => {
  const query = new URLSearchParams(params).toString();
  const url = API_PATHS.HOTELS.DETAIL(id);
  return await api(query ? `${url}?${query}` : url);
};
