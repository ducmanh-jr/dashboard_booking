/**
 * ============================================================================
 * TÊN FILE: app/_layout.tsx
 * MỤC ĐÍCH: Root Layout của toàn bộ ứng dụng (File chạy đầu tiên).
 * Định nghĩa cấu trúc điều hướng (Navigation Stack) ở cấp độ cao nhất.
 * ============================================================================
 */
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  // Lấy chế độ màu hiện tại của hệ thống (Dark/Light mode)
  const colorScheme = useColorScheme();
  
  const router = useRouter();
  const segments = useSegments();
  const { isTokenReady, hasToken, checkLocalToken } = useAuthStore();

  useEffect(() => {
    checkLocalToken();
  }, []);

  useEffect(() => {
    if (!isTokenReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!hasToken && !inAuthGroup) {
      // Chuyển hướng người dùng chưa đăng nhập về màn hình login
      router.replace('/(auth)/login' as any);
    } else if (hasToken && inAuthGroup) {
      // Đã đăng nhập nhưng đang ở nhóm auth (login/register), chuyển về trang chủ
      router.replace('/(tabs)' as any);
    }
  }, [hasToken, isTokenReady, segments]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* ThemeProvider giúp áp dụng màu nền, màu chữ theo chế độ màn hình sáng/tối */}
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          {/* Nhóm (tabs): Chứa các màn hình có thanh Bottom Tab (Trang chủ, Yêu thích...) */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          
          {/* Nhóm (auth): Chứa các màn hình Xác thực (Đăng nhập, Đăng ký...) */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          
          {/* Ẩn Header mặc định chứa địa chỉ file vật lý cho màn hình chi tiết và thanh toán */}
          <Stack.Screen name="room/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="payment/index" options={{ headerShown: false }} />
          <Stack.Screen name="payment/success" options={{ headerShown: false }} />
          <Stack.Screen name="ticket/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="review/[id]" options={{ headerShown: false }} />
          
          {/* Màn hình Tìm kiếm nâng cao: Cài đặt hiển thị dưới dạng Modal trượt từ dưới lên */}
          <Stack.Screen name="searchModal" options={{ presentation: 'fullScreenModal', headerShown: false }} />
          
          {/* Màn hình Chỉnh sửa hồ sơ */}
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
        </Stack>
        
        {/* Cấu hình thanh trạng thái (cục pin, giờ) tự động đổi màu tương phản */}
        <StatusBar style="auto" />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
