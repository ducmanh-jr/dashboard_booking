/**
 * ============================================================================
 * TÊN FILE: app/(auth)/register.tsx
 * MỤC ĐÍCH: Giao diện Đăng ký tài khoản. Validate các trường họ tên, email, 
 * số điện thoại và mật khẩu bằng Zod.
 * ============================================================================
 */
import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from '../../components/SafeImage';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ionicons } from '@expo/vector-icons';

import { CustomInput } from '../../components/CustomInput';
import { CustomButton } from '../../components/CustomButton';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';

// 1. Bộ quy tắc bắt lỗi đầu vào cho form đăng ký
const registerSchema = z.object({
  fullName: z.string().min(2, 'Vui lòng nhập họ và tên'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().min(10, 'Số điện thoại không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();

  // 2. Thiết lập hook quản lý form
  const { control, handleSubmit, formState: { errors }, setError, clearErrors } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  // 3. Hàm gọi khi nhấn nút "Đăng ký"
  const onSubmit = async (data: RegisterForm) => {
    try {
      clearErrors('root');
      await register({
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        userType: 'customer',
      });
      router.replace('/(auth)/login' as any);
    } catch (error: any) {
      // Map specific errors to form fields if possible
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('email') && msg.includes('exists')) {
        setError('email', { type: 'server', message: 'Email này đã được sử dụng.' });
      } else if (msg.includes('phone') && msg.includes('exists')) {
        setError('phone', { type: 'server', message: 'Số điện thoại này đã được sử dụng.' });
      } else {
        setError('root', {
          type: 'server',
          message: error.message || 'Không thể đăng ký tài khoản.',
        });
      }
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1524661135-423995f22d0b' }} // Map background
        style={[StyleSheet.absoluteFillObject, styles.backgroundImage]}
        contentFit="cover"
      />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
              </TouchableOpacity>
              <Text style={styles.topTitle}>NoWayHome</Text>
              <View style={{width: 40}} />
            </View>

            {/* Main Card */}
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title}>Tạo tài khoản</Text>
                <Text style={styles.subtitle}>Bắt đầu hành trình khám phá{'\n'}cùng NoWayHome</Text>
              </View>

              <View style={styles.form}>
                <Controller
                  control={control}
                  name="fullName"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <CustomInput
                      label="HỌ VÀ TÊN"
                      placeholder="Nhập họ và tên của bạn"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.fullName?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="email"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <CustomInput
                      label="EMAIL"
                      placeholder="Nhập địa chỉ email"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.email?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="phone"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <CustomInput
                      label="SỐ ĐIỆN THOẠI"
                      placeholder="Nhập số điện thoại"
                      keyboardType="phone-pad"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.phone?.message}
                    />
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <CustomInput
                      label="MẬT KHẨU"
                      placeholder="Tạo mật khẩu an toàn"
                      isPassword
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      error={errors.password?.message}
                    />
                  )}
                />

                <CustomButton
                  title="Đăng ký"
                  onPress={handleSubmit(onSubmit)}
                  isLoading={isLoading}
                  style={styles.registerButton}
                />

                {errors.root && (
                  <View style={styles.inlineErrorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.inlineErrorText}>{errors.root.message}</Text>
                  </View>
                )}
              </View>

              <View style={styles.footerLinks}>
                <Text style={styles.footerText}>Đã có tài khoản? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.loginText}>Đăng nhập</Text>
                  </TouchableOpacity>
                </Link>
              </View>
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
    backgroundColor: '#FDFDFD',
  },
  backgroundImage: {
    opacity: 0.1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    flexGrow: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  topTitle: {
    ...Typography.h2,
    color: Colors.light.text,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    ...Shadows.sm,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    ...Typography.h1,
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    ...Typography.body1,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: Spacing.lg,
  },
  registerButton: {
    marginTop: Spacing.lg,
  },
  inlineErrorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
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
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  footerText: {
    ...Typography.body2,
    color: Colors.light.textSecondary,
  },
  loginText: {
    ...Typography.body2,
    color: Colors.primary,
    fontWeight: '600',
  },
});
