/**
 * ============================================================================
 * TÊN FILE: app/edit-profile.tsx
 * MỤC ĐÍCH: Màn hình Chỉnh sửa hồ sơ cá nhân (Edit Profile Screen).
 * CHỨC NĂNG CHÍNH:
 * - Hiển thị Avatar + Tên người dùng.
 * - Form chỉnh sửa: Họ tên, Ngày sinh, Giới tính, Địa chỉ.
 * - Bảo mật tài khoản: Email, SĐT, Mật khẩu.
 * - Liên kết tài khoản: Gmail, Facebook, WhatsApp.
 * - Nút "Lưu thay đổi" gọi API cập nhật (mock).
 * ============================================================================
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Platform, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';
import { useAuthStore } from '../store/useAuthStore';
import { useMutation, useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import { SettingRow } from '../components/SettingRow';
import { Calendar } from 'react-native-calendars';

// ============================================================================
// 1. ZOD VALIDATION SCHEMA
// ============================================================================
const profileSchema = z.object({
  fullName: z.string().min(2, 'Vui lòng nhập họ và tên'),
  birthday: z.string().optional(),
  address: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

// ============================================================================
// 2. COMPONENT CHÍNH
// ============================================================================
export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setAuth, logout } = useAuthStore();

  // --- State ---
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGender, setSelectedGender] = useState('Nam');
  const [birthdayDate, setBirthdayDate] = useState(new Date(1990, 0, 1)); // Ngày sinh mặc định
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Hàm format Date thành chuỗi dd-mm-yyyy (hiển thị và gửi lên server)
  const formatBirthday = (date: Date): string => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // --- Cấu hình react-hook-form ---
  const { control, handleSubmit, formState: { errors }, reset } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      birthday: '01/01/1990',
      address: '',
    },
  });

  const { data: userProfile } = useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      const response = await apiClient.get('/users/me');
      return response as any;
    }
  });

  React.useEffect(() => {
    if (userProfile) {
      reset({
        fullName: userProfile.fullName || '',
        birthday: '01/01/1990', // Simplified, could parse dateOfBirth
        address: '', // Mock for now
      });
      if (userProfile.customerProfile?.gender) {
        setSelectedGender(userProfile.customerProfile.gender === 'male' ? 'Nam' : userProfile.customerProfile.gender === 'female' ? 'Nữ' : 'Khác');
      }
      if (userProfile.customerProfile?.dateOfBirth) {
        const rawDate = userProfile.customerProfile.dateOfBirth;
        if (rawDate.includes('T')) {
          setBirthdayDate(new Date(rawDate));
        } else {
          // Parse "DD-MM-YYYY" from backend (legacy)
          const parts = rawDate.split('-');
          if (parts.length === 3) {
            setBirthdayDate(new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])));
          }
        }
      }
    }
  }, [userProfile, reset]);

  // ============================================================================
  // 3. HÀM XỬ LÝ
  // ============================================================================

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const payload = {
        fullName: data.fullName,
        dateOfBirth: formatBirthday(birthdayDate),
        gender: selectedGender === 'Nam' ? 'male' : selectedGender === 'Nữ' ? 'female' : 'other',
        phone: user?.phone, // Keep existing phone for now if not in form
      };
      const response = await apiClient.patch('/users/me', payload);
      return response;
    },
    onSuccess: (data) => {
      // Cập nhật Zustand store nếu có data mới (tuỳ vào cấu trúc trả về)
      if (user) {
        setAuth({
          user: { ...user, fullName: data.fullName, gender: data.customerProfile?.gender },
          access_token: useAuthStore.getState().access_token || '',
        });
      }
      Alert.alert('Thành công', 'Thông tin hồ sơ đã được cập nhật!');
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Lỗi', error.message || 'Không thể cập nhật hồ sơ.');
    }
  });

  const onSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate(data);
  };

  // Giả lập hành động liên kết
  const handleLink = (serviceName: string) => {
    Alert.alert('Liên kết', `Hệ thống đang kết nối đến ${serviceName}...`);
  };

  // Hàm xử lý lỗi form
  const onFormError = (formErrors: any) => {
    const messages: string[] = [];
    if (formErrors.fullName) messages.push('• ' + formErrors.fullName.message);
    Alert.alert('Vui lòng kiểm tra lại', messages.join('\n'));
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Xác nhận xóa tài khoản',
      'Bạn có chắc chắn muốn xóa tài khoản không? Hành động này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đồng ý', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  // ============================================================================
  // 4. RENDER GIAO DIỆN
  // ============================================================================
  return (
    <SafeAreaView style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + (insets.bottom > 0 ? insets.bottom : Spacing.lg) }]}>

        {/* ===== AVATAR & TÊN ===== */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="white" />
            </View>
            {/* Nút đổi ảnh đại diện */}
            <TouchableOpacity style={styles.cameraBtn}>
              <Ionicons name="camera" size={14} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{userProfile?.fullName || user?.fullName || 'Khách hàng'}</Text>
          <Text style={styles.memberSince}>Thành viên từ 2024</Text>
        </View>

        {/* ===== THÔNG TIN CÁ NHÂN ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>THÔNG TIN CÁ NHÂN</Text>

          {/* Họ và tên */}
          <Text style={styles.inputLabel}>Họ và tên</Text>
          <Controller control={control} name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput style={[styles.input, errors.fullName && styles.inputError]}
                placeholder="Nhập họ và tên" placeholderTextColor="#B0B0B0"
                onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName.message}</Text>}

          {/* Ngày sinh (Bấm để mở lịch chọn) */}
          <Text style={styles.inputLabel}>Ngày sinh</Text>
          <TouchableOpacity style={styles.datePickerBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.datePickerText}>{formatBirthday(birthdayDate)}</Text>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>

          {/* Lịch chọn ngày sinh (dùng react-native-calendars - đã có sẵn) */}
          {showDatePicker && (
            <Modal transparent animationType="fade">
              <View style={styles.dateModalOverlay}>
                <View style={styles.dateModalCard}>
                  <Text style={styles.dateModalTitle}>Chọn ngày sinh</Text>
                  <Calendar
                    current={`${birthdayDate.getFullYear()}-${String(birthdayDate.getMonth() + 1).padStart(2, '0')}-${String(birthdayDate.getDate()).padStart(2, '0')}`}
                    maxDate={new Date().toISOString().split('T')[0]}
                    onDayPress={(day: any) => {
                      setBirthdayDate(new Date(day.dateString));
                      setShowDatePicker(false);
                    }}
                    markedDates={{
                      [`${birthdayDate.getFullYear()}-${String(birthdayDate.getMonth() + 1).padStart(2, '0')}-${String(birthdayDate.getDate()).padStart(2, '0')}`]: {
                        selected: true, selectedColor: Colors.primary,
                      },
                    }}
                    theme={{
                      todayTextColor: Colors.primary,
                      arrowColor: Colors.primary,
                      selectedDayBackgroundColor: Colors.primary,
                    }}
                  />
                  <TouchableOpacity style={styles.dateModalDoneBtn} onPress={() => setShowDatePicker(false)}>
                    <Text style={styles.dateModalDoneText}>Đóng</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          )}

          {/* Giới tính (Dropdown giả lập) */}
          <Text style={styles.inputLabel}>Giới tính</Text>
          <TouchableOpacity style={styles.dropdownBtn}
            onPress={() => {
              const next = selectedGender === 'Nam' ? 'Nữ' : selectedGender === 'Nữ' ? 'Khác' : 'Nam';
              setSelectedGender(next);
            }}>
            <Text style={styles.dropdownText}>{selectedGender}</Text>
            <Ionicons name="chevron-down" size={18} color={Colors.light.textSecondary} />
          </TouchableOpacity>

          {/* Địa chỉ */}
          <Text style={styles.inputLabel}>Địa chỉ</Text>
          <Controller control={control} name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput style={styles.input} placeholder="Nhập địa chỉ của bạn"
                placeholderTextColor="#B0B0B0"
                onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
        </View>

        {/* ===== BẢO MẬT TÀI KHOẢN ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>BẢO MẬT TÀI KHOẢN</Text>
          <SettingRow
            icon="mail-outline"
            label={`Email: ${userProfile?.email ? userProfile.email.replace(/(.{4}).*(@.*)/, '$1***$2') : 'Đang tải...'}`}
            actionLabel="Liên kết"
            onAction={() => handleLink('Email')}
          />
          <SettingRow
            icon="call-outline"
            label={`Số điện thoại: ${userProfile?.phone ? userProfile.phone.slice(0, 3) + '****' : 'Chưa cập nhật'}`}
            actionLabel="Liên kết"
            onAction={() => handleLink('Số điện thoại')}
          />
          <SettingRow
            icon="lock-closed-outline"
            label="Mật khẩu: ********"
            actionLabel="Đổi mật khẩu"
            onAction={() => router.push('/change-password' as any)}
            showBorder={false}
          />
        </View>

        {/* ===== LIÊN KẾT TÀI KHOẢN ===== */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionLabel}>LIÊN KẾT TÀI KHOẢN</Text>
          <SettingRow icon="mail-outline" label="Gmail" actionLabel="Liên kết" onAction={() => handleLink('Gmail')} />
          <SettingRow icon="logo-facebook" label="Facebook" actionLabel="Liên kết" onAction={() => handleLink('Facebook')} />
          <SettingRow icon="chatbubble-ellipses-outline" label="WhatsApp" actionLabel="Liên kết" onAction={() => handleLink('WhatsApp')} showBorder={false} />
        </View>

        {/* ===== XOÁ TÀI KHOẢN ===== */}
        <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountText}>Xóa tài khoản</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ===== NÚT LƯU THAY ĐỔI (Cố định dưới cùng) ===== */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg }]}>
        <TouchableOpacity
          style={[styles.saveButton, updateProfileMutation.isPending && styles.saveButtonDisabled]}
          disabled={updateProfileMutation.isPending}
          onPress={handleSubmit(onSubmit, onFormError)}>
          {updateProfileMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// 5. STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },

  // --- Header ---
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerTitle: { ...Typography.h3, color: Colors.light.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },

  scrollContent: { paddingHorizontal: Spacing.md },

  // --- Avatar Section ---
  avatarSection: { alignItems: 'center', marginVertical: Spacing.lg },
  avatarWrapper: { position: 'relative', marginBottom: Spacing.sm },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', ...Shadows.md },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'white' },
  userName: { ...Typography.h2, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: Colors.light.text },
  memberSince: { ...Typography.body2, color: Colors.light.textSecondary },

  // --- Section Card ---
  sectionCard: { backgroundColor: 'white', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.sm },
  sectionLabel: { ...Typography.caption, fontWeight: '700', color: Colors.light.textSecondary, letterSpacing: 1, marginBottom: Spacing.sm },

  // --- Input fields ---
  inputLabel: { ...Typography.caption, fontWeight: '600', color: Colors.light.text, marginTop: Spacing.sm, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, ...Typography.body1, color: Colors.light.text },
  inputError: { borderColor: Colors.light.error },
  errorText: { ...Typography.caption, color: Colors.light.error, marginTop: 2 },

  // --- Date Picker ---
  datePickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.light.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  datePickerText: { ...Typography.body1, color: Colors.light.text },
  dateModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dateModalCard: { backgroundColor: 'white', borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg },
  dateModalTitle: { ...Typography.h3, color: Colors.primary, textAlign: 'center', marginBottom: Spacing.sm, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  dateModalDoneBtn: { backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: BorderRadius.pill, alignItems: 'center', marginTop: Spacing.md },
  dateModalDoneText: { ...Typography.button, color: 'white', fontWeight: '700' },

  // --- Dropdown ---
  dropdownBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.light.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 12 },
  dropdownText: { ...Typography.body1, color: Colors.light.text },

  // --- Bottom Bar ---
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.md, backgroundColor: '#F5F3FF' },
  saveButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.pill, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.7 },
  saveButtonText: { ...Typography.button, color: 'white', fontWeight: '700' },

  deleteAccountBtn: { marginTop: Spacing.xl, marginBottom: Spacing.md, padding: Spacing.md, alignItems: 'center' },
  deleteAccountText: { ...Typography.body1, color: '#D32F2F', fontWeight: '700' },
});
