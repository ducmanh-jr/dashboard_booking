import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, ScrollView, Modal, TextInput, Alert, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export default function TicketScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);

  const parsedId = Number(id);
  const isValidId = !isNaN(parsedId) && parsedId > 0;

  const { data: booking, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: ['booking_details', id],
    queryFn: async () => {
      if (!isValidId) throw new Error('Invalid ID');
      const response = await apiClient.get(`/bookings/${id}`);
      return response as any;
    },
    enabled: isValidId,
    refetchInterval: 5000, // Auto-polling every 5 seconds
  });

  const handleRequestCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập lý do hủy phòng.');
      return;
    }
    setSubmittingCancel(true);
    try {
      await apiClient.post(`/bookings/${booking.id}/request-cancel`, {
        reason: cancelReason.trim(),
      });
      Alert.alert('Thành công', 'Đã gửi yêu cầu hủy đặt phòng cho quản trị viên duyệt.');
      setCancelModalVisible(false);
      setCancelReason('');
      refetch();
    } catch (err: any) {
      Alert.alert('Thất bại', err.message || 'Không thể gửi yêu cầu hủy phòng.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  if (isPending && isValidId) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isError || !booking) {
    console.error("TicketScreen Error: ID =", id, " | API Error =", isError);
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: 'red', marginBottom: Spacing.md }}>Không tìm thấy thông tin vé hoặc ID không hợp lệ.</Text>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.push('/(tabs)')}>
          <Text style={styles.homeBtnText}>Về trang chủ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Parse booking status
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkOut = new Date(booking.checkOutDate);
  checkOut.setHours(0, 0, 0, 0);
  const hasEnded = checkOut < today;

  const isPendingCancel = booking.cancellationReason && booking.cancellationReason.startsWith('PENDING_CANCEL');
  const isCancelled = booking.status === 'cancelled' || booking.status === 'canceled';
  const isCheckedOut = booking.status === 'checked_out' || (!isCancelled && hasEnded);
  const isCheckedIn = booking.status === 'checked_in' && !hasEnded;
  const isUnpaid = booking.paymentStatus === 'unpaid' && !isCancelled && !hasEnded;

  let displayStatus = 'Đang xử lý';
  let badgeBg = '#FEF3C7';
  let badgeText = '#D97706';

  if (isPendingCancel) {
    displayStatus = 'Chờ duyệt hủy';
    badgeBg = '#FFE0B2';
    badgeText = '#F57C00';
  } else if (isCancelled) {
    displayStatus = 'Đã hủy';
    badgeBg = '#FEE2E2';
    badgeText = '#EF4444';
  } else if (isCheckedOut) {
    displayStatus = 'Đã hoàn thành';
    badgeBg = '#D1FAE5';
    badgeText = '#10B981';
  } else if (isCheckedIn) {
    displayStatus = 'Đang ở';
    badgeBg = '#DBEAFE';
    badgeText = '#2563EB';
  } else if (isUnpaid) {
    displayStatus = 'Chưa thanh toán';
    badgeBg = '#FEE2E2';
    badgeText = '#EF4444';
  } else if (booking.status === 'confirmed') {
    displayStatus = 'Đã xác nhận';
    badgeBg = '#D1FAE5';
    badgeText = '#10B981';
  }

  const canCancel = !isCancelled && !isCheckedOut && !isPendingCancel;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/trips' as any)}>
          <Ionicons name="close" size={28} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vé điện tử</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.ticketCard}>
          <View style={styles.qrSection}>
            <Ionicons name="qr-code-outline" size={150} color={Colors.primary} />
            <Text style={styles.bookingId}>Booking ID: {booking.id}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoSection}>
            <Text style={styles.hotelName}>{booking.property?.name}</Text>
            <Text style={styles.roomType}>{booking.roomType?.name || 'Phòng tiêu chuẩn'}</Text>

            {/* Status Badge */}
            <View style={[styles.badge, { backgroundColor: badgeBg, marginBottom: Spacing.lg }]}>
              <Text style={[styles.badgeText, { color: badgeText }]}>{displayStatus.toUpperCase()}</Text>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Nhận phòng</Text>
                <Text style={styles.value}>{formatDate(booking.checkInDate)}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Trả phòng</Text>
                <Text style={styles.value}>{formatDate(booking.checkOutDate)}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Khách</Text>
                <Text style={styles.value}>{(booking.numAdults || 0) + (booking.numChildren || 0)} người</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Phòng</Text>
                <Text style={styles.value}>{booking.roomsNeeded || 1} phòng</Text>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn}>
          <Ionicons name="download-outline" size={20} color={Colors.primary} />
          <Text style={styles.saveBtnText}>Lưu vé vào máy</Text>
        </TouchableOpacity>

        {canCancel && (
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setCancelModalVisible(true)}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
            <Text style={styles.cancelBtnText}>Hủy đặt phòng</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Cancellation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={cancelModalVisible}
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yêu cầu hủy đặt phòng</Text>
            <Text style={styles.modalSubtitle}>Vui lòng nhập lý do hủy đặt phòng bên dưới:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Lý do hủy phòng (Ví dụ: Thay đổi lịch trình...)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              value={cancelReason}
              onChangeText={setCancelReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setCancelModalVisible(false);
                  setCancelReason('');
                }}
                disabled={submittingCancel}
              >
                <Text style={styles.modalCancelBtnText}>Quay lại</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirmBtn]}
                onPress={handleRequestCancel}
                disabled={submittingCancel}
              >
                {submittingCancel ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Gửi yêu cầu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  headerTitle: { ...Typography.h3, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  ticketCard: { backgroundColor: 'white', borderRadius: BorderRadius.xl, ...Shadows.md, overflow: 'hidden' },
  qrSection: { padding: Spacing.xxl, alignItems: 'center', backgroundColor: '#F9F8FF' },
  bookingId: { ...Typography.body1, fontWeight: '700', color: Colors.primary, marginTop: Spacing.md, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: Colors.light.border, width: '100%', borderStyle: 'dashed', borderWidth: 1, borderColor: '#D0CCFF' },
  infoSection: { padding: Spacing.xl },
  hotelName: { ...Typography.h2, color: Colors.light.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: 4 },
  roomType: { ...Typography.body1, color: Colors.light.textSecondary, marginBottom: Spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.lg },
  col: { flex: 1 },
  label: { ...Typography.caption, color: Colors.light.textSecondary, marginBottom: 4 },
  value: { ...Typography.body1, fontWeight: '600', color: Colors.light.text },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.pill },
  badgeText: { fontSize: 10, fontWeight: '700' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.xl, paddingVertical: 16, backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.primary, borderRadius: BorderRadius.pill },
  saveBtnText: { ...Typography.button, color: Colors.primary },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: Spacing.md, paddingVertical: 16, backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444', borderRadius: BorderRadius.pill },
  cancelBtnText: { ...Typography.button, color: '#EF4444' },
  homeBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.pill, marginTop: Spacing.lg },
  homeBtnText: { ...Typography.button, color: 'white' },
  // Modal Styles
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: Spacing.lg },
  modalContent: { width: '100%', backgroundColor: 'white', borderRadius: BorderRadius.xl, padding: Spacing.xl, ...Shadows.lg },
  modalTitle: { ...Typography.h2, color: Colors.light.text, marginBottom: Spacing.sm },
  modalSubtitle: { ...Typography.body2, color: Colors.light.textSecondary, marginBottom: Spacing.md },
  modalInput: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: BorderRadius.md, padding: Spacing.md, height: 100, textAlignVertical: 'top', color: Colors.light.text, marginBottom: Spacing.lg, fontSize: 14 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
  modalBtn: { paddingVertical: 12, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.pill, minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  modalCancelBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.light.border },
  modalCancelBtnText: { ...Typography.button, color: Colors.light.textSecondary },
  modalConfirmBtn: { backgroundColor: Colors.primary },
  modalConfirmBtnText: { ...Typography.button, color: 'white' },
});
