/**
 * ============================================================================
 * TÊN FILE: app/(tabs)/offers.tsx
 * MỤC ĐÍCH: Màn hình Ưu đãi (Offers Screen).
 * CHỨC NĂNG CHÍNH:
 * - Có bộ lọc ngang dạng viên thuốc (Pill tabs) để lọc mã giảm giá.
 * - Render các thẻ `CouponCard` theo dạng vé đứt nét.
 * ============================================================================
 */
import React from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { CouponCard } from '../../components/CouponCard';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { useVoucherStore } from '../../store/useVoucherStore';
import { useLocalSearchParams } from 'expo-router';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function OffersScreen() {
  const { saveVoucher, isSaved } = useVoucherStore();
  const { propertyId } = useLocalSearchParams<{ propertyId?: string }>();

  const { data: vouchers, isPending } = useQuery({
    queryKey: ['active_vouchers', propertyId],
    queryFn: async () => {
      const response = await apiClient.get('/vouchers/active', {
        params: propertyId ? { propertyId } : {},
      });
      return (response as any) as any[];
    }
  });

  const coupons = vouchers || [];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Ưu đãi của bạn</Text>

      {/* Coupons List */}
      {isPending ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {coupons.map((coupon: any) => {
            let discountText = '';
            if (coupon.discountType === 'percent') {
              discountText = `Giảm ${coupon.discountValue}%`;
            } else {
              discountText = `Giảm ${Number(coupon.discountValue).toLocaleString('vi-VN')}đ`;
            }

            let subtitle = `Mã: ${coupon.code}`;
            if (coupon.minOrderAmount > 0) {
              subtitle += `\nĐơn tối thiểu: ${Number(coupon.minOrderAmount).toLocaleString('vi-VN')}đ`;
            }

            return (
              <CouponCard 
                key={coupon.id.toString()}
                discount={discountText}
                subtitle={subtitle}
                expiry={formatDate(coupon.endDate)}
                isSaved={isSaved(coupon.code)}
                onSave={() => saveVoucher(coupon.code)}
              />
            );
          })}
          {coupons.length === 0 && (
            <Text style={{ textAlign: 'center', marginTop: 20, color: Colors.light.textSecondary }}>Chưa có ưu đãi nào.</Text>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  title: { ...Typography.h1, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginVertical: Spacing.md, color: Colors.primary },
  pillContainer: { marginBottom: Spacing.lg },
  pill: { paddingHorizontal: Spacing.lg, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: 'white' },
  pillActive: { backgroundColor: Colors.secondary, borderColor: Colors.primary },
  pillText: { ...Typography.body2, color: Colors.light.textSecondary },
  pillTextActive: { color: Colors.primary, fontWeight: '700' },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
});
