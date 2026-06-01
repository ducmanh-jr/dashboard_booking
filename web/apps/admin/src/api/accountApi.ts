import { api } from "@nowayhome/api-client";

export type AccountOverview = {
  profile: {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl?: string | null;
    role: string;
    title?: string;
    isSuperAdmin?: boolean;
    status: string;
    preferredLanguage: string;
    timezone: string;
    emailVerifiedAt?: string | null;
    lastLoginAt?: string | null;
    createdAt?: string;
  };
  security: {
    googleLinked: boolean;
    twoFactorEnabled: boolean;
    sessions: Array<{
      id: number;
      deviceName: string;
      deviceType: string;
      ipAddress: string | null;
      userAgent: string | null;
      lastActiveAt: string;
      expiresAt: string;
    }>;
  };
  business: null;
  permissions: Array<{ name: string; description: string; enabled: boolean }>;
  notifications: Array<{ key: string; label: string; enabled: boolean }>;
};

export const fetchAccountOverview = async (): Promise<AccountOverview> => {
  return await api("/account");
};

export const updateAccountProfile = async (data: {
  fullName: string;
  phone?: string;
  preferredLanguage?: string;
  avatarUrl?: string;
}) => {
  return await api("/account/profile", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
};

export const uploadAvatarFile = async (file: File): Promise<string> => {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch("/api/account/avatar", {
    method: "POST",
    credentials: "include",
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.avatarUrl) {
    const message = Array.isArray(data.message) ? data.message.join(", ") : data.message;
    throw new Error(message || data.error || "Không thể tải ảnh đại diện.");
  }
  return data.avatarUrl;
};
