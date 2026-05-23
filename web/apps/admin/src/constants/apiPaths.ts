export const API_PATHS = {
  PARTNERS: {
    LIST: (status: string) => `/admin/partners?status=${status}`,
    APPROVE: (id: number) => `/admin/partners/${id}/approve`,
    DELETE: (id: number) => `/admin/partners/${id}`,
    REJECT: (id: number) => `/admin/partners/${id}/reject`,
    UPDATE: (id: number) => `/admin/partners/${id}`,
    GET: (id: number) => `/admin/partners/${id}`
  },
  NOTIFICATIONS: {
    UNREAD_COUNT: '/notifications/unread-count'
  },
  AUTH: {
    ME: '/auth/me',
    LOGOUT: '/auth/logout'
  }
};
