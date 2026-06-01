import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useAuthStore } from '../../store/useAuthStore';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

export default function ProfileScreen() {
  const logout = useAuthStore(state => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const menuItems = [
    { id: 'trips', icon: 'time-outline', label: 'Lịch sử đặt phòng', color: Colors.secondary, route: '/(tabs)/trips' },
    { id: 'favorites', icon: 'heart-outline', label: 'Danh sách yêu thích', color: Colors.secondary, route: '/(tabs)/favorites' },
    { id: 'settings', icon: 'settings-outline', label: 'Cài đặt', color: Colors.secondary, route: '/edit-profile' },
  ];

  const { data: userProfile } = useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      const response = await apiClient.get('/users/me');
      return response as any;
    }
  });

  const displayUser = userProfile || useAuthStore.getState().user;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Hồ sơ của tôi</Text>
        
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBg} />
          </View>
          <Text style={styles.name}>{displayUser?.fullName || 'Khách hàng'}</Text>
          <Text style={styles.email}>{displayUser?.email || ''}</Text>
          <Text style={styles.phone}>{displayUser?.phone || ''}</Text>
          
          <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/edit-profile' as any)}>
            <Text style={styles.editBtnText}>Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={item.id} style={[styles.menuItem, index < menuItems.length - 1 && styles.menuBorder]} onPress={() => router.push(item.route as any)}>
              <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={20} color={Colors.primary} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>ĐĂNG XUẤT</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  scroll: { padding: Spacing.lg },
  title: { ...Typography.h1, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: Spacing.xl },
  profileHeader: { alignItems: 'center', marginBottom: Spacing.xl },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', backgroundColor: 'black', marginBottom: Spacing.md, ...Shadows.md },
  avatarBg: { flex: 1, backgroundColor: '#006B76' }, // Placeholder for avatar
  name: { ...Typography.h1, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: Colors.light.text, marginBottom: 4 },
  email: { ...Typography.body2, color: Colors.light.textSecondary, marginBottom: 4 },
  phone: { ...Typography.body2, color: Colors.light.textSecondary, marginBottom: Spacing.md },
  editBtn: { paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.primary },
  editBtnText: { color: Colors.primary, ...Typography.body2 },
  menuContainer: { backgroundColor: 'white', borderRadius: BorderRadius.lg, ...Shadows.sm, overflow: 'hidden', marginBottom: Spacing.xl },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  iconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  menuLabel: { flex: 1, ...Typography.body1, color: Colors.light.text },
  logoutBtn: { alignSelf: 'center', padding: Spacing.md },
  logoutText: { color: '#D32F2F', fontWeight: '700', letterSpacing: 1 },
});
