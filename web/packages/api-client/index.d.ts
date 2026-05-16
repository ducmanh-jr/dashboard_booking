export declare class ApiError extends Error {
  status: number;
  data: any;
  constructor(message: string, status: number, data: any);
}
export declare function createApi(baseUrl?: string): (path: string, opts?: RequestInit) => Promise<any>;
export declare const api: (path: string, opts?: RequestInit) => Promise<any>;
