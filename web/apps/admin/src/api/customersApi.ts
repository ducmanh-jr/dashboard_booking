import { api } from "@nowayhome/api-client";

export const fetchCustomers = async (search: string = "") => {
  return await api(`/admin/customers?search=${encodeURIComponent(search)}`);
};
