import { api } from "@nowayhome/api-client";

export type AccountOverview = {
  profile: {
    id: number;
    email: string;
    fullName: string;
    phone: string | null;
    avatarUrl?: string | null;
    role: string;
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
  business: {
    businessName: string;
    businessType: string;
    kycStatus: string;
    taxCode: string | null;
    bankAccountName: string | null;
    bankAccountNumber: string | null;
    bankName: string | null;
    commissionTier: string;
    hotelName: string;
    address: string | null;
    city: string | null;
    hotelEmail: string;
    hotline: string | null;
    propertyCount: number;
  } | null;
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

export const fetchAvatarUploadUrl = async (): Promise<{
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
}> => {
  return await api("/account/avatar-upload-url");
};

export const uploadAvatarFile = async (file: File): Promise<string> => {
  const config = await fetchAvatarUploadUrl();
  const body = new FormData();
  body.append("file", file);
  body.append("api_key", config.apiKey);
  body.append("timestamp", String(config.timestamp));
  body.append("signature", config.signature);
  body.append("folder", config.folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`, {
    method: "POST",
    body,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || "Không thể tải ảnh đại diện.");
  }
  return data.secure_url;
};
