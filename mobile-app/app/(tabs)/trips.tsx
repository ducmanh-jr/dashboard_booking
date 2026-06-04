/**
 * ============================================================================
 * TÊN FILE: app/(tabs)/trips.tsx
 * MỤC ĐÍCH: Màn hình Quản lý Chuyến đi (Trips Screen).
 * CHỨC NĂNG CHÍNH:
 * - Hiển thị chuyến đi Sắp tới và Đã qua.
 * - Nút "Đánh giá chuyến đi" chuyển hướng vào Modal review `app/review/[id].tsx`.
 * ============================================================================
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { ActivityIndicator } from 'react-native';
import { Image } from '../../components/SafeImage';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return Colors.secondary;
    case 'pending':
      return '#E0E0E0';
    case 'checked_in':
      return Colors.primary;
    case 'checked_out':
      return '#E0E0FF';
    case 'cancelled':
      return '#FFCCCC';
    default:
      return '#E0E0E0';
  }
};

const getStatusText = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed': return 'Đã xác nhận';
    case 'checked_in': return 'Đang ở';
    case 'checked_out': return 'Đã ở';
    case 'cancelled': return 'Đã hủy';
    case 'pending': return 'Chờ thanh toán';
    default: return status;
  }
};

export default function TripsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('upcoming');

  const tabs = [
    { id: 'upcoming', label: 'Sắp đi' },
    { id: 'past', label: 'Đã qua' },
    { id: 'cancelled', label: 'Đã hủy' },
  ];

  const { data: allBookings, isPending, refetch, isRefetching } = useQuery({
    queryKey: ['my_bookings'],
    queryFn: async () => {
      const response = await apiClient.get('/bookings/me');
      return response as unknown as any[];
    },
    refetchInterval: 5000,
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const bookings = allBookings || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTrips = bookings.filter(b => {
    const isCancelled = b.status === 'cancelled' || b.status === 'canceled';
    if (isCancelled) return false;
    if (b.status === 'checked_out') return false;
    const checkOut = new Date(b.checkOutDate);
    checkOut.setHours(0, 0, 0, 0);
    return checkOut >= today;
  });

  const pastTrips = bookings.filter(b => {
    const isCancelled = b.status === 'cancelled' || b.status === 'canceled';
    if (isCancelled) return false;
    if (b.status === 'checked_out') return true;
    const checkOut = new Date(b.checkOutDate);
    checkOut.setHours(0, 0, 0, 0);
    return checkOut < today;
  });

  const cancelledTrips = bookings.filter(b => b.status === 'cancelled' || b.status === 'canceled');

  const activeData = activeTab === 'upcoming' ? upcomingTrips : activeTab === 'past' ? pastTrips : cancelledTrips;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Chuyến đi của tôi</Text>
      
      {/* Top Tabs */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity 
            key={tab.id} 
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isPending ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={activeData}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
            renderItem={({ item }) => {
              let statusText = '';
              let statusColor = '#E0E0E0';
              let isUnpaid = false;
              const bookingStatus = item.status;
              const paymentStatus = item.paymentStatus;
              const isPendingCancel = item.cancellationReason && item.cancellationReason.startsWith('PENDING_CANCEL');

              const checkOut = new Date(item.checkOutDate);
              checkOut.setHours(0, 0, 0, 0);
              const hasEnded = checkOut < today;

              if (isPendingCancel) {
                statusText = 'Chờ duyệt hủy';
                statusColor = '#F59E0B'; // Orange
              } else if (bookingStatus === 'canceled' || bookingStatus === 'cancelled') {
                statusText = 'Đã hủy';
                statusColor = '#9CA3AF'; // Gray
              } else if (hasEnded || bookingStatus === 'checked_out') {
                statusText = 'Đã đi / Hoàn thành';
                statusColor = '#4ADE80'; // Green
              } else if (paymentStatus === 'unpaid') {
                isUnpaid = true;
                statusText = 'Chưa thanh toán';
                statusColor = '#EF4444'; // Red
              } else if (paymentStatus === 'paid' && bookingStatus === 'confirmed') {
                statusText = 'Đã thanh toán / Chờ Check-in';
                statusColor = Colors.secondary;
              } else if (bookingStatus === 'checked_in') {
                statusText = 'Đang ở';
                statusColor = Colors.primary;
              } else {
                statusText = 'Chờ xử lý';
                statusColor = '#F59E0B'; // Orange
              }

            const coverImage = item.property?.media?.find((m: any) => m.isCover)?.url 
              || item.property?.media?.[0]?.url 
              || 'https://images.unsplash.com/photo-1566073771259-6a8506099945';

            const showReviewButton = bookingStatus === 'checked_out' || (hasEnded && bookingStatus !== 'cancelled' && bookingStatus !== 'canceled');

            return (
              <TouchableOpacity style={styles.card} onPress={() => {
                console.log("Navigating to ticket with ID:", item.id);
                router.push({ pathname: '/ticket/[id]', params: { id: String(item.id) } });
              }}>
                <Image source={{ uri: coverImage }} style={styles.cardImage} contentFit="cover" />
                <View style={{ flex: 1, marginLeft: Spacing.md }}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.hotelName}>{item.property?.name}</Text>
                    <Text style={styles.date}>{formatDate(item.checkInDate)} - {formatDate(item.checkOutDate)}</Text>
                    {isUnpaid ? (
                      <TouchableOpacity 
                        style={[styles.badge, { backgroundColor: statusColor, paddingVertical: 6, paddingHorizontal: 12, marginTop: 4 }]}
                        onPress={() => router.push({ pathname: '/payment/index', params: { bookingId: String(item.id) } } as any)}
                      >
                        <Text style={[styles.badgeText, { color: 'white' }]}>{statusText}</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.badge, { backgroundColor: statusColor + '20', marginTop: 4 }]}>
                        <Text style={[styles.badgeText, { color: statusColor }]}>{statusText.toUpperCase()}</Text>
                      </View>
                    )}
                  </View>
                  {showReviewButton && (
                    <TouchableOpacity 
                      style={styles.reviewBtn}
                      onPress={() => router.push({ pathname: '/review/[id]', params: { id: String(item.id) } })}
                    >
                      <Text style={styles.reviewBtnText}>Đánh giá chuyến đi</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Không có chuyến đi nào trong danh sách này.</Text>
          }
          ListFooterComponent={
            activeTab === 'upcoming' && activeData.length > 0 ? <Text style={styles.footerText}>Bạn đã xem hết danh sách chuyến đi sắp tới.</Text> : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  title: { ...Typography.h1, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginVertical: Spacing.md },
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.light.border, marginHorizontal: Spacing.lg, marginBottom: Spacing.lg },
  tab: { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  activeTab: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabText: { ...Typography.body1, color: Colors.light.textSecondary },
  activeTabText: { color: Colors.primary, fontWeight: '700' },
  listContent: { paddingHorizontal: Spacing.lg },
  card: { flexDirection: 'row', backgroundColor: 'white', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, ...Shadows.sm, borderWidth: 1, borderColor: '#F0F0F0' },
  cardImage: { width: 80, height: 80, borderRadius: BorderRadius.md, backgroundColor: '#E0E0E0' },
  cardInfo: { flex: 1, marginLeft: Spacing.md, justifyContent: 'center' },
  hotelName: { ...Typography.h3, color: Colors.light.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  date: { ...Typography.body2, color: Colors.light.textSecondary, marginVertical: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: BorderRadius.pill },
  badgeText: { fontSize: 10, fontWeight: '700', color: Colors.primary },
  emptyText: { textAlign: 'center', marginTop: 40, color: Colors.light.textSecondary },
  footerText: { textAlign: 'center', color: Colors.light.textSecondary, marginTop: Spacing.xl, marginBottom: Spacing.xxl },
  reviewBtn: { marginTop: Spacing.md, paddingVertical: 8, borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.md, alignItems: 'center' },
  reviewBtnText: { ...Typography.button, color: Colors.primary, fontSize: 12 },
});
