/**
 * ============================================================================
 * TÊN FILE: app/(auth)/login.tsx
 * MỤC ĐÍCH: Giao diện Đăng nhập. Sử dụng `react-hook-form` để quản lý form 
 * và `zod` để bắt lỗi nhập liệu (Validation) trước khi gửi đi.
 * ============================================================================
 */
import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView, Linking, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from '../../components/SafeImage';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

let GoogleSignin: any = null;
let statusCodes: any = null;
let isGoogleSigninSupported = false;

try {
  const GoogleModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = GoogleModule.GoogleSignin;
  statusCodes = GoogleModule.statusCodes;
  isGoogleSigninSupported = true;
} catch (error) {
  console.warn('Google Sign-In is not supported in Expo Go. Use a development build to test native Google Sign-In.');
}

// 1. Khai báo bộ quy tắc kiểm tra dữ liệu bằng Zod (Validation Schema)
const loginSchema = z.object({
  emailOrPhone: z.string().min(1, 'Vui lòng nhập email hoặc số điện thoại'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const { login, googleLogin, isLoading } = useAuthStore();
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  React.useEffect(() => {
    if (isGoogleSigninSupported && GoogleSignin) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || undefined,
      });
    }
  }, []);

  const handleGoogleLogin = async () => {
    if (!isGoogleSigninSupported || !GoogleSignin) {
      Alert.alert(
        'Không hỗ trợ',
        'Đăng nhập Google yêu cầu Development Build. Hiện tại ứng dụng đang chạy trên Expo Go không hỗ trợ tính năng này.'
      );
      return;
    }
    try {
      setIsGoogleLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      if (!idToken) {
        throw new Error('Không lấy được idToken từ Google.');
      }
      await googleLogin(idToken);
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      let errorMsg = 'Đăng nhập Google thất bại.';
      const codes = statusCodes || {};
      if (error.code === codes.SIGN_IN_CANCELLED) {
        errorMsg = 'Người dùng đã hủy đăng nhập.';
      } else if (error.code === codes.IN_PROGRESS) {
        errorMsg = 'Đang xử lý đăng nhập Google.';
      } else if (error.code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
        errorMsg = 'Thiết bị không hỗ trợ Google Play Services.';
      } else {
        errorMsg = error.message || errorMsg;
      }
      Alert.alert('Lỗi', errorMsg);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // 2. Cài đặt react-hook-form kết hợp với Zod
  const { control, handleSubmit, formState: { errors }, setError, clearErrors } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      emailOrPhone: '',
      password: '',
    },
  });

  // 3. Hàm chạy khi người dùng bấm nút Đăng nhập và dữ liệu đã hợp lệ
  const onSubmit = async (data: LoginForm) => {
    try {
      clearErrors('root');
      await login({ email: data.emailOrPhone, password: data.password });
      router.replace('/(tabs)');
    } catch (error: any) {
      setError('root', {
        type: 'server',
        message: error.message || 'Thông tin đăng nhập không chính xác.',
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Background Image Placeholder - Trong thực tế dùng hình nền bản đồ map */}
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b' }} 
        style={[StyleSheet.absoluteFillObject, styles.backgroundImage]}
        contentFit="cover"
      />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Back Button */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
            </TouchableOpacity>

            {/* Main Card */}
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>Welcome to{'\n'}NoWayHome</Text>
                <Text style={styles.subtitle}>Đăng nhập để bắt đầu hành trình của bạn.</Text>
              </View>

              <View style={styles.form}>
                <Controller
                  control={control}
                  name="emailOrPhone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <CustomInput
                      label="EMAIL / SỐ ĐIỆN THOẠI"
                      placeholder="Nhập email hoặc số điện thoại"
                      autoCapitalize="none"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.emailOrPhone?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <CustomInput
                      label="MẬT KHẨU"
                      placeholder="Nhập mật khẩu"
                      isPassword
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.password?.message}
                    />
                  )}
                />

                <TouchableOpacity style={styles.forgotPassword}>
                  <Link href="/(auth)/forgot-password">
                    <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
                  </Link>
                </TouchableOpacity>

                <CustomButton
                  title="Đăng nhập"
                  onPress={handleSubmit(onSubmit)}
                  isLoading={isLoading}
                  style={styles.loginButton}
                />

                {errors.root && (
                  <View style={styles.inlineErrorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.inlineErrorText}>{errors.root.message}</Text>
                  </View>
                )}
              </View>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>HOẶC ĐĂNG NHẬP VỚI</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                style={[styles.googleLoginButton, (isLoading || isGoogleLoading) && styles.googleLoginButtonDisabled]}
                onPress={handleGoogleLogin}
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <ActivityIndicator color={Colors.light.text} size="small" />
                ) : (
                  <>
                    <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }} style={styles.googleIcon} />
                    <Text style={styles.googleButtonText}>Đăng nhập với Google</Text>
                  </>
                )}
              </TouchableOpacity>


              <View style={styles.footerLinks}>
                <Text style={styles.footerText}>Chưa có tài khoản? </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text style={styles.registerText}>Đăng ký ngay</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <View style={[styles.footerLinks, { marginTop: Spacing.sm }]}>
                <Text style={styles.footerText}>Bạn là đối tác? </Text>
                <TouchableOpacity onPress={() => Linking.openURL('http://localhost:3000')}>
                  <Text style={styles.partnerText}>Đăng nhập dành cho Đối tác</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Screen Footer */}
            <View style={styles.bottomFooter}>
              <Text style={styles.bottomFooterTitle}>NoWayHome</Text>
              <View style={styles.bottomFooterLinks}>
                <Text style={styles.bottomFooterLinkText}>Terms</Text>
                <Text style={styles.bottomFooterLinkText}>Privacy</Text>
                <Text style={styles.bottomFooterLinkText}>Contact</Text>
                <Text style={styles.bottomFooterLinkText}>Journal</Text>
              </View>
              <Text style={styles.copyright}>© 2024 NoWayHome Travel. All rights reserved.</Text>
              <Text style={styles.explorer}>WORLD EXPLORER</Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EBEBEB',
  },
  backgroundImage: {
    opacity: 0.1, // Simulate the light map background
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    ...Typography.body2,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: Spacing.lg,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    ...Typography.body2,
    color: Colors.light.textSecondary,
    textDecorationLine: 'underline',
  },
  loginButton: {
    marginTop: Spacing.sm,
  },
  inlineErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  inlineErrorText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    ...Typography.caption,
    color: Colors.light.textSecondary,
    fontWeight: '600',
  },
  googleLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: BorderRadius.md,
    backgroundColor: 'white',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  googleLoginButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    ...Typography.button,
    color: Colors.light.text,
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    ...Typography.body2,
    color: Colors.light.textSecondary,
  },
  registerText: {
    ...Typography.body2,
    color: Colors.primary,
    fontWeight: '700',
  },
  partnerText: {
    ...Typography.body2,
    color: Colors.primary,
    fontWeight: '700',
  },
  bottomFooter: {
    marginTop: 'auto',
    paddingTop: Spacing.xxl,
    alignItems: 'center',
  },
  bottomFooterTitle: {
    ...Typography.h3,
    color: Colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: Spacing.md,
  },
  bottomFooterLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  bottomFooterLinkText: {
    ...Typography.body2,
    color: Colors.light.textSecondary,
  },
  copyright: {
    ...Typography.caption,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  explorer: {
    ...Typography.h3,
    color: Colors.light.textSecondary,
    letterSpacing: 2,
    opacity: 0.5,
  },
});
