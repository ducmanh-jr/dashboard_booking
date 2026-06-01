/**
 * ============================================================================
 * TÊN FILE: app/payment/index.tsx
 * MỤC ĐÍCH: Màn hình Xác nhận và Thanh toán (Checkout Screen).
 * ============================================================================
 */
import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Platform, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from '../../components/SafeImage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useSearchStore } from '../../store/useSearchStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookingStore } from '../../store/useBookingStore';
import { useQuery, useMutation } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { useVoucherStore } from '../../store/useVoucherStore';

// Hàm format ngày từ "2026-04-25" thành "25/04/2026"
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '--';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

// Hàm tính số đêm giữa 2 ngày
const calcNights = (checkIn: string, checkOut: string): number => {
  if (!checkIn || !checkOut) return 1;
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  const nights = Math.round(diff / msPerDay);
  return nights > 0 ? nights : 1;
};

// Helper format tiền tệ VNĐ
const formatMoney = (val: number) => {
  return Math.round(val).toLocaleString('vi-VN') + ' đ';
};

// ============================================================================
// 1. ZOD VALIDATION SCHEMA
// ============================================================================
const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Vui lòng nhập họ và tên'),
  phone: z.string().min(9, 'Số điện thoại không hợp lệ'),
  email: z.string().email('Email không hợp lệ'),
  // Trường thẻ tín dụng (chỉ validate khi chọn phương thức credit_card)
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvv: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

// Danh sách yêu cầu đặc biệt
const SPECIAL_REQUESTS = [
  'Phòng trên tầng cao',
  'Phòng yên tĩnh',
  'Gần/Xa thang máy',
  'Thuê xe máy/ô tô',
  'Gửi hành lý trước',
  'Đón sân bay',
];

// ============================================================================
// 3. COMPONENT CHÍNH
// ============================================================================
export default function PaymentScreen() {
  const router = useRouter();
  const { propertyId } = useLocalSearchParams();
  const { user } = useAuthStore();
  const { selectedRoomType } = useBookingStore();
  const { savedVouchers } = useVoucherStore();

  const { data: property, isPending: isPropertyPending } = useQuery({
    queryKey: ['property_details', propertyId],
    queryFn: async () => {
      return await apiClient.get(`/properties/id/${propertyId}`);
    },
    enabled: !!propertyId,
  });

  const { data: activeVouchers } = useQuery({
    queryKey: ['active_vouchers', propertyId],
    queryFn: async () => {
      if (!propertyId) return [];
      const res = await apiClient.get(`/vouchers/active?propertyId=${propertyId}`);
      return res as unknown as any[];
    },
    enabled: !!propertyId
  });

  const savedActiveVouchers = useMemo(() => {
    if (!activeVouchers) return [];
    return activeVouchers.filter((v: any) => 
      savedVouchers.some(savedCode => savedCode.toUpperCase().trim() === v.code.toUpperCase().trim())
    );
  }, [activeVouchers, savedVouchers]);

  // --- Lấy dữ liệu ngày & khách từ Zustand Store ---
  const { checkInDate, checkOutDate, guests } = useSearchStore();
  const numberOfNights = calcNights(checkInDate, checkOutDate);
  const numberOfRooms = guests.rooms;
  const numberOfGuests = guests.adults + guests.children;

  // --- State quản lý giao diện ---
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('credit_card');
  const [selectedRequests, setSelectedRequests] = useState<string[]>([]);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);

  // --- Cấu hình react-hook-form ---
  const { control, handleSubmit, formState: { errors } } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { 
      fullName: user?.fullName || '', 
      phone: user?.phone || '', 
      email: user?.email || '', 
      cardNumber: '', 
      cardExpiry: '', 
      cardCvv: '' 
    },
  });

  const basePricePerNight = selectedRoomType?.basePrice || property?.roomTypes?.[0]?.basePrice || 0;

  // ============================================================================
  // 4. HÀM TÍNH GIÁ TỰ ĐỘNG
  // ============================================================================
  const priceDetails = useMemo(() => {
    // Tính giá dựa trên số phòng và số đêm THẬT từ Store
    const basePrice = numberOfRooms * numberOfNights * Number(basePricePerNight);
    const serviceFee = Math.round(basePrice * 0.10);   // Phí dịch vụ 10%
    const tax = Math.round(basePrice * 0.05);           // Thuế 5%
    const totalFees = serviceFee + tax;
    const additionalServices = 0; // Tất cả yêu cầu đặc biệt đều là dịch vụ không tính phí
    
    let discount = 0;
    if (appliedVoucher) {
      if (appliedVoucher.discountType === 'percent') {
        discount = Math.round(basePrice * (appliedVoucher.discountValue / 100));
        if (appliedVoucher.maxDiscount && discount > appliedVoucher.maxDiscount) {
          discount = appliedVoucher.maxDiscount;
        }
      } else {
        discount = appliedVoucher.discountValue;
      }
    }
    
    const finalTotal = basePrice + totalFees + additionalServices - discount;

    return { basePrice, serviceFee, tax, totalFees, additionalServices, discount, finalTotal };
  }, [selectedRequests, numberOfNights, numberOfRooms, basePricePerNight, appliedVoucher]);

  // --- Mutations ---
  const applyVoucherMutation = useMutation({
    mutationFn: async (code: string) => {
      const payload = { code, propertyId: propertyId as string };
      const res: any = await apiClient.post('/vouchers/apply', payload);
      return res;
    },
    onSuccess: (data) => {
      setAppliedVoucher(data);
      Alert.alert('Thành công', 'Áp dụng mã giảm giá thành công!');
    },
    onError: (error: any) => {
      setAppliedVoucher(null);
      Alert.alert('Lỗi', error.message || 'Mã giảm giá không hợp lệ.');
    }
  });

  const processPaymentMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await apiClient.post('/payments/process', { bookingId });
      return response;
    },
    onSuccess: (data, variables) => {
      setIsPaymentSuccess(true);
      setTimeout(() => {
        setIsPaymentSuccess(false);
        router.push({ pathname: '/payment/success', params: { id: variables } });
      }, 1500);
    },
    onError: (error: any) => {
      Alert.alert('Lỗi thanh toán', error.message || 'Không thể xử lý thanh toán.');
    }
  });

  const createBookingMutation = useMutation({
    mutationFn: async (data: CheckoutForm) => {
      const payload = {
        propertyId: Number(propertyId),
        roomTypeId: selectedRoomType?.id || property?.roomTypes?.[0]?.id,
        ratePlanId: selectedRoomType?.id || property?.roomTypes?.[0]?.id,
        checkInDate: new Date(checkInDate).toISOString(),
        checkOutDate: new Date(checkOutDate).toISOString(),
        numAdults: guests.adults,
        numChildren: guests.children,
        roomsNeeded: guests.rooms,
        voucherId: appliedVoucher ? Number(appliedVoucher.id) : undefined,
        paymentMethod: selectedPaymentMethod,
      };
      // 1. Tạo booking
      const response: any = await apiClient.post('/bookings', payload);
      return response;
    },
    onSuccess: (bookingData) => {
      // 2. Booking thành công, tiến hành gọi API payment
      processPaymentMutation.mutate(bookingData.id.toString());
    },
    onError: (error: any) => {
      Alert.alert('Lỗi đặt phòng', error.message || 'Không thể tạo đơn đặt phòng.');
    }
  });

  // ============================================================================
  // 5. HÀM XỬ LÝ KHI BẤM "XÁC NHẬN THANH TOÁN"
  // ============================================================================
  const onSubmit = (data: CheckoutForm) => {
    if (selectedPaymentMethod === 'credit_card') {
      if (!data.cardNumber || data.cardNumber.replace(/\s/g, '').length < 16) {
        Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ số thẻ (16 chữ số).');
        return;
      }
      if (!data.cardCvv || data.cardCvv.length < 3) {
        Alert.alert('Lỗi', 'Vui lòng nhập mã CVV (3 chữ số).');
        return;
      }
    }
    createBookingMutation.mutate(data);
  };

  const toggleRequest = (item: string) => {
    setSelectedRequests(prev =>
      prev.includes(item) ? prev.filter(r => r !== item) : [...prev, item]
    );
  };

  const onFormError = (formErrors: any) => {
    const messages: string[] = [];
    if (formErrors.fullName) messages.push('• ' + formErrors.fullName.message);
    if (formErrors.phone) messages.push('• ' + formErrors.phone.message);
    if (formErrors.email) messages.push('• ' + formErrors.email.message);
    Alert.alert('Vui lòng điền đầy đủ thông tin', messages.join('\n'));
  };

  // ============================================================================
  // 6. RENDER GIAO DIỆN
  // ============================================================================
  return (
    <SafeAreaView style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận và Thanh toán</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ===== THÔNG TIN PHÒNG ĐÃ CHỌN ===== */}
        {isPropertyPending ? (
          <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : property ? (
          <View style={styles.roomCard}>
            <Image 
              source={{ uri: property.media?.[0]?.url || 'https://images.unsplash.com/photo-1510798831971-661eb04b3739' }} 
              style={styles.roomImage} 
              contentFit="cover" 
              transition={300} 
            />
            <Text style={styles.hotelName}>{property.name}</Text>
            <Text style={styles.roomType}>{selectedRoomType?.name || property.roomTypes?.[0]?.name || 'Phòng tiêu chuẩn'}</Text>

            {/* Ngày nhận / Ngày trả */}
            <View style={styles.datesRow}>
              <View style={styles.dateBox}>
                <Text style={styles.dateLabel}>NHẬN PHÒNG</Text>
                <Text style={styles.dateValue}>{formatDate(checkInDate)}</Text>
              </View>
              <View style={styles.dateBox}>
                <Text style={styles.dateLabel}>TRẢ PHÒNG</Text>
                <Text style={styles.dateValue}>{formatDate(checkOutDate)}</Text>
              </View>
            </View>

            {/* Số khách & Số đêm */}
            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.infoText}>{numberOfGuests} Người lớn  •  {numberOfNights} đêm nghỉ</Text>
            </View>

            {/* Tiện ích (Amenities) */}
            <View style={styles.amenitiesRow}>
              {['Pool', 'Kitchen', 'WiFi', 'Bathtub'].map((a, i) => (
                <View key={i} style={styles.amenityChip}>
                  <Ionicons
                    name={a === 'Pool' ? 'water-outline' : a === 'Kitchen' ? 'restaurant-outline' : a === 'WiFi' ? 'wifi-outline' : 'water-outline'}
                    size={12} color={Colors.primary}
                  />
                  <Text style={styles.amenityText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <Text style={{ color: 'red', textAlign: 'center' }}>Không tải được thông tin phòng.</Text>
        )}

        {/* ===== THÔNG TIN LIÊN HỆ (CONTACT INFO) ===== */}
        <Text style={styles.sectionTitle}>Thông tin liên hệ</Text>
        <View style={styles.sectionCard}>
          {/* Full Name */}
          <Text style={styles.inputLabel}>Họ và tên</Text>
          <Controller control={control} name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput style={[styles.input, errors.fullName && styles.inputError]}
                placeholder="Nhập họ và tên" placeholderTextColor="#B0B0B0"
                onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
          {errors.fullName && <Text style={styles.errorText}>{errors.fullName.message}</Text>}

          {/* Phone */}
          <Text style={styles.inputLabel}>Số điện thoại</Text>
          <Controller control={control} name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput style={[styles.input, errors.phone && styles.inputError]}
                placeholder="Số điện thoại liên hệ" placeholderTextColor="#B0B0B0"
                keyboardType="phone-pad" onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
          {errors.phone && <Text style={styles.errorText}>{errors.phone.message}</Text>}

          {/* Email */}
          <Text style={styles.inputLabel}>Email</Text>
          <Controller control={control} name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput style={[styles.input, errors.email && styles.inputError]}
                placeholder="Địa chỉ Email" placeholderTextColor="#B0B0B0"
                keyboardType="email-address" autoCapitalize="none"
                onBlur={onBlur} onChangeText={onChange} value={value} />
            )} />
          {errors.email && <Text style={styles.errorText}>{errors.email.message}</Text>}
        </View>

        {/* ===== YÊU CẦU ĐẶC BIỆT & DỊCH VỤ THÊM ===== */}
        <Text style={styles.sectionTitle}>Yêu cầu đặc biệt</Text>
        <View style={styles.sectionCard}>
          {SPECIAL_REQUESTS.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.checkboxRow} onPress={() => toggleRequest(item)}>
              <View style={[styles.checkbox, selectedRequests.includes(item) && styles.checkboxActive]}>
                {selectedRequests.includes(item) && <Ionicons name="checkmark" size={14} color="white" />}
              </View>
              <Text style={styles.checkboxLabel}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ===== PHƯƠNG THỨC THANH TOÁN ===== */}
        <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={[styles.paymentOption, selectedPaymentMethod === 'credit_card' && styles.paymentOptionActive]}
            onPress={() => setSelectedPaymentMethod('credit_card')}>
            <Ionicons name="card-outline" size={20} color={Colors.primary} />
            <Text style={styles.paymentOptionText}>Thẻ tín dụng / Ghi nợ</Text>
            <Ionicons
              name={selectedPaymentMethod === 'credit_card' ? 'radio-button-on' : 'radio-button-off'}
              size={22} color={selectedPaymentMethod === 'credit_card' ? Colors.primary : Colors.light.textSecondary} />
          </TouchableOpacity>

          {selectedPaymentMethod === 'credit_card' && (
            <View style={styles.creditCardForm}>
              <Text style={styles.inputLabel}>Số thẻ</Text>
              <Controller control={control} name="cardNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput style={styles.input} placeholder="0000 0000 0000 0000"
                    placeholderTextColor="#B0B0B0" keyboardType="number-pad" maxLength={19}
                    onBlur={onBlur} onChangeText={onChange} value={value} />
                )} />
              <View style={styles.cardRow}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Text style={styles.inputLabel}>Ngày hết hạn (MM/YY)</Text>
                  <Controller control={control} name="cardExpiry"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput style={styles.input} placeholder="MM/YY"
                        placeholderTextColor="#B0B0B0" keyboardType="number-pad" maxLength={5}
                        onBlur={onBlur} onChangeText={onChange} value={value} />
                    )} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <Controller control={control} name="cardCvv"
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput style={styles.input} placeholder="123"
                        placeholderTextColor="#B0B0B0" keyboardType="number-pad" maxLength={4}
                        secureTextEntry onBlur={onBlur} onChangeText={onChange} value={value} />
                    )} />
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.paymentOption, selectedPaymentMethod === 'ewallet' && styles.paymentOptionActive]}
            onPress={() => setSelectedPaymentMethod('ewallet')}>
            <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
            <Text style={styles.paymentOptionText}>Ví điện tử (MoMo / ZaloPay)</Text>
            <Ionicons
              name={selectedPaymentMethod === 'ewallet' ? 'radio-button-on' : 'radio-button-off'}
              size={22} color={selectedPaymentMethod === 'ewallet' ? Colors.primary : Colors.light.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, selectedPaymentMethod === 'pay_later' && styles.paymentOptionActive]}
            onPress={() => setSelectedPaymentMethod('pay_later')}>
            <Ionicons name="time-outline" size={20} color={Colors.primary} />
            <Text style={styles.paymentOptionText}>Thanh toán trả sau (tại khách sạn)</Text>
            <Ionicons
              name={selectedPaymentMethod === 'pay_later' ? 'radio-button-on' : 'radio-button-off'}
              size={22} color={selectedPaymentMethod === 'pay_later' ? Colors.primary : Colors.light.textSecondary} />
          </TouchableOpacity>

          {selectedPaymentMethod === 'pay_later' && (
            <View style={styles.payLaterInfo}>
              <Text style={styles.payLaterTitle}>Xác nhận đặt phòng & Trả sau</Text>
              <Text style={styles.payLaterText}>
                Bạn có thể hoàn tất thủ tục đặt phòng ngay bây giờ mà không cần thanh toán trực tuyến.
                Tổng số tiền <Text style={{ fontWeight: 'bold', color: Colors.primary }}>{formatMoney(priceDetails.finalTotal)}</Text> sẽ được thanh toán trực tiếp tại quầy lễ tân khi bạn đến nhận phòng.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.paymentOption, selectedPaymentMethod === 'bank' && styles.paymentOptionActive]}
            onPress={() => setSelectedPaymentMethod('bank')}>
            <Ionicons name="business-outline" size={20} color={Colors.primary} />
            <Text style={styles.paymentOptionText}>Chuyển khoản ngân hàng</Text>
            <Ionicons
              name={selectedPaymentMethod === 'bank' ? 'radio-button-on' : 'radio-button-off'}
              size={22} color={selectedPaymentMethod === 'bank' ? Colors.primary : Colors.light.textSecondary} />
          </TouchableOpacity>

          {(selectedPaymentMethod === 'ewallet' || selectedPaymentMethod === 'bank') && (
            <View style={styles.qrPlaceholder}>
              <Ionicons name="qr-code-outline" size={80} color={Colors.primary} />
              <Text style={styles.qrText}>Quét mã QR để thanh toán</Text>
            </View>
          )}
        </View>

        {/* ===== MÃ GIẢM GIÁ ===== */}
        <Text style={styles.sectionTitle}>Mã giảm giá</Text>
        <View style={styles.sectionCard}>
          {savedActiveVouchers.length > 0 ? (
            <View style={{ gap: Spacing.sm, marginBottom: Spacing.md }}>
              <Text style={{ ...Typography.caption, color: Colors.light.textSecondary, marginBottom: 4 }}>
                Chọn voucher đã lưu của bạn:
              </Text>
              {savedActiveVouchers.map((voucher: any) => {
                const isSelected = appliedVoucher?.code === voucher.code;
                return (
                  <TouchableOpacity 
                    key={voucher.id} 
                    style={{ 
                      flexDirection: 'row', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: Spacing.md, 
                      backgroundColor: isSelected ? '#FDF7F7' : '#F9F9FB', 
                      borderRadius: BorderRadius.md,
                      borderWidth: 1, 
                      borderColor: isSelected ? Colors.primary : Colors.light.border
                    }}
                    onPress={() => applyVoucherMutation.mutate(voucher.code)}
                  >
                    <View style={{ flex: 1, marginRight: Spacing.sm }}>
                      <Text style={{ ...Typography.body2, fontWeight: '700', color: Colors.light.text }}>
                        {voucher.code} - {voucher.name}
                      </Text>
                      <Text style={{ ...Typography.caption, color: Colors.light.textSecondary, marginTop: 2 }}>
                        Giảm {voucher.discountType === 'percent' ? `${voucher.discountValue}%` : `${voucher.discountValue.toLocaleString('vi-VN')}đ`}
                        {voucher.minOrderAmount > 0 && ` · Đơn tối thiểu: ${voucher.minOrderAmount.toLocaleString('vi-VN')}đ`}
                      </Text>
                    </View>
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: isSelected ? Colors.primary : Colors.light.textSecondary, justifyContent: 'center', alignItems: 'center' }}>
                      {isSelected && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary }} />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={{ paddingVertical: 14, alignItems: 'center', marginBottom: Spacing.sm }}>
              <Ionicons name="pricetag-outline" size={32} color={Colors.light.textSecondary} style={{ marginBottom: 6 }} />
              <Text style={{ ...Typography.body2, color: Colors.light.textSecondary, textAlign: 'center', fontWeight: '500' }}>
                Không tìm thấy voucher đã lưu phù hợp cho chỗ nghỉ này.
              </Text>
              <Text style={{ ...Typography.caption, color: Colors.light.textSecondary, marginTop: 4, textAlign: 'center', paddingHorizontal: Spacing.lg }}>
                Hãy lưu mã giảm giá tại trang "Ưu đãi của bạn" trước khi thanh toán.
              </Text>
            </View>
          )}

          {/* Vẫn cho phép nhập mã khác bằng tay */}
          <View style={{ height: 1, backgroundColor: Colors.light.border, marginVertical: Spacing.md }} />
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextInput 
              style={[styles.input, { flex: 1, marginRight: Spacing.sm, marginBottom: 0 }]} 
              placeholder="Hoặc nhập mã voucher khác"
              placeholderTextColor="#B0B0B0"
              value={voucherCode}
              onChangeText={setVoucherCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity 
              style={{ backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: 12, borderRadius: BorderRadius.md }}
              onPress={() => applyVoucherMutation.mutate(voucherCode)}
              disabled={!voucherCode || applyVoucherMutation.isPending}
            >
              {applyVoucherMutation.isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Áp dụng</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== CHI TIẾT THANH TOÁN ===== */}
        <View style={styles.priceCard}>
          <Text style={styles.priceCardTitle}>Chi tiết thanh toán</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Giá phòng ({numberOfRooms} phòng x {numberOfNights} đêm)</Text>
            <Text style={styles.priceValue}>{formatMoney(priceDetails.basePrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Phí bổ sung</Text>
            <Text style={styles.priceValue}>{formatMoney(priceDetails.serviceFee + priceDetails.tax)}</Text>
          </View>
          <View style={styles.priceSubRow}>
            <Text style={styles.priceSubLabel}>Phí dịch vụ (10%)</Text>
            <Text style={styles.priceSubValue}>{formatMoney(priceDetails.serviceFee)}</Text>
          </View>
          <View style={styles.priceSubRow}>
            <Text style={styles.priceSubLabel}>Thuế (5%)</Text>
            <Text style={styles.priceSubValue}>{formatMoney(priceDetails.tax)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: Colors.light.success }]}>🏷 Voucher giảm giá</Text>
            <Text style={[styles.priceValue, { color: Colors.light.success }]}>-{formatMoney(priceDetails.discount)}</Text>
          </View>

          <View style={styles.divider} />

          {/* Tổng tiền */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng tiền</Text>
            <Text style={styles.totalValue}>{formatMoney(priceDetails.finalTotal)}</Text>
          </View>
        </View>

        {/* ===== NÚT XÁC NHẬN ===== */}
        <TouchableOpacity
          style={[styles.confirmButton, (createBookingMutation.isPending || processPaymentMutation.isPending) && styles.confirmButtonDisabled]}
          disabled={createBookingMutation.isPending || processPaymentMutation.isPending}
          onPress={handleSubmit(onSubmit, onFormError)}>
          {(createBookingMutation.isPending || processPaymentMutation.isPending) ? (
            <ActivityIndicator color="white" />
          ) : (
            <View style={styles.confirmButtonContent}>
              <Ionicons name="lock-closed-outline" size={18} color="white" />
              <Text style={styles.confirmButtonText}>XÁC NHẬN THANH TOÁN</Text>
            </View>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* ===== OVERLAY THANH TOÁN THÀNH CÔNG ===== */}
      <Modal visible={isPaymentSuccess} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-circle" size={72} color={Colors.light.success} />
            </View>
            <Text style={styles.successTitle}>
              {selectedPaymentMethod === 'pay_later' ? 'Đặt phòng thành công!' : 'Thanh toán thành công!'}
            </Text>
            <Text style={styles.successSubtitle}>
              {selectedPaymentMethod === 'pay_later'
                ? 'Đơn đặt phòng của bạn đã được ghi nhận.\nVui lòng thanh toán tại khách sạn khi nhận phòng.'
                : 'Đơn đặt phòng của bạn đã được xác nhận.\nChi tiết đã gửi qua email.'}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerTitle: { ...Typography.h3, color: Colors.light.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  roomCard: { backgroundColor: 'white', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, ...Shadows.sm },
  roomImage: { width: '100%', height: 160, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  hotelName: { ...Typography.caption, color: Colors.light.textSecondary, fontWeight: '600' },
  roomType: { ...Typography.h2, color: Colors.light.text, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: Spacing.md },
  datesRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  dateBox: { flex: 1, backgroundColor: '#F3EEFF', borderRadius: BorderRadius.md, padding: Spacing.sm },
  dateLabel: { ...Typography.caption, color: Colors.primary, fontWeight: '700', marginBottom: 2 },
  dateValue: { ...Typography.body2, color: Colors.primary, fontWeight: '600' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  infoText: { ...Typography.body2, color: Colors.light.textSecondary },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  amenityChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3EEFF', borderRadius: BorderRadius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  amenityText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  sectionTitle: { ...Typography.h3, color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: Spacing.sm, marginTop: Spacing.sm },
  sectionCard: { backgroundColor: 'white', borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.lg, ...Shadows.sm },
  inputLabel: { ...Typography.caption, fontWeight: '700', color: Colors.light.text, marginBottom: 4, marginTop: Spacing.sm },
  input: { borderWidth: 1, borderColor: Colors.light.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, ...Typography.body1, color: Colors.light.text },
  inputError: { borderColor: Colors.light.error },
  errorText: { ...Typography.caption, color: Colors.light.error, marginTop: 2 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: Colors.light.border, marginRight: Spacing.sm, justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxLabel: { ...Typography.body1, color: Colors.light.text },
  paymentOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: Spacing.sm, borderWidth: 1, borderColor: Colors.light.border, borderRadius: BorderRadius.md, marginBottom: Spacing.sm },
  paymentOptionActive: { borderColor: Colors.primary, backgroundColor: '#F9F8FF' },
  paymentOptionText: { flex: 1, marginLeft: Spacing.sm, ...Typography.body1, color: Colors.light.text },
  creditCardForm: { paddingHorizontal: Spacing.xs, marginBottom: Spacing.sm },
  cardRow: { flexDirection: 'row' },
  qrPlaceholder: { alignItems: 'center', paddingVertical: Spacing.xl },
  payLaterInfo: {
    backgroundColor: '#F7F6FF',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E8E5FF',
  },
  payLaterTitle: {
    ...Typography.body2,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  payLaterText: {
    ...Typography.caption,
    color: Colors.light.text,
    lineHeight: 18,
  },
  qrText: { ...Typography.body2, color: Colors.light.textSecondary, marginTop: Spacing.sm },
  priceCard: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg },
  priceCardTitle: { ...Typography.h3, color: 'white', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: Spacing.md },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  priceLabel: { ...Typography.body2, color: '#D0CCFF' },
  priceValue: { ...Typography.body2, color: 'white', fontWeight: '700' },
  priceSubRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4, paddingLeft: Spacing.md },
  priceSubLabel: { ...Typography.caption, color: '#B0ABDD' },
  priceSubValue: { ...Typography.caption, color: '#D0CCFF' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: Spacing.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { ...Typography.body1, color: '#D0CCFF' },
  totalValue: { fontSize: 28, fontWeight: '700', color: 'white' },
  confirmButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.pill, alignItems: 'center', marginBottom: Spacing.lg },
  confirmButtonDisabled: { opacity: 0.7 },
  confirmButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmButtonText: { ...Typography.button, color: 'white', fontWeight: '700', letterSpacing: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  successCard: { backgroundColor: 'white', borderRadius: BorderRadius.xl, padding: Spacing.xl, alignItems: 'center', width: '100%' },
  successIconCircle: { marginBottom: Spacing.md },
  successTitle: { ...Typography.h2, color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: Spacing.sm },
  successSubtitle: { ...Typography.body1, color: Colors.light.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.xl },
});
