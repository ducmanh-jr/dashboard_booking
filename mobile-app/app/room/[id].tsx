import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from '../../components/SafeImage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { useBookingStore } from '../../store/useBookingStore';

const { width } = Dimensions.get('window');

const parseSafeJSON = (data: any) => {
  if (!data) return null;
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    return null;
  }
};

// Helper tự động nhận diện Icon từ tên tiện ích
const getAmenityIcon = (name: string): keyof typeof Ionicons.glyphMap => {
  const lowerName = (name || '').toLowerCase();
  if (lowerName.includes('wifi') || lowerName.includes('internet')) return 'wifi';
  if (lowerName.includes('máy lạnh') || lowerName.includes('điều hòa') || lowerName.includes('air')) return 'snow-outline';
  if (lowerName.includes('tv') || lowerName.includes('tivi')) return 'tv-outline';
  if (lowerName.includes('bồn tắm') || lowerName.includes('bath')) return 'water-outline';
  if (lowerName.includes('ban công') || lowerName.includes('balcony')) return 'partly-sunny-outline';
  if (lowerName.includes('bếp') || lowerName.includes('kitchen')) return 'restaurant-outline';
  if (lowerName.includes('tủ lạnh') || lowerName.includes('fridge')) return 'cube-outline';
  if (lowerName.includes('đỗ xe') || lowerName.includes('parking')) return 'car-outline';
  if (lowerName.includes('nước suối') || lowerName.includes('water')) return 'beaker-outline';
  if (lowerName.includes('hồ bơi') || lowerName.includes('pool')) return 'water-outline';
  if (lowerName.includes('lễ tân') || lowerName.includes('reception')) return 'call-outline';
  return 'checkmark-circle-outline';
};

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const { isFavorite, toggleFavorite } = useFavoriteStore();
  const { setSelectedRoomType } = useBookingStore();
  
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const parsedId = Number(id);
  const isValidId = !isNaN(parsedId) && parsedId > 0;

  // Lấy chi tiết Property từ API
  const { data: property, isPending: isPropertyPending, isError: isPropertyError, refetch: refetchProperty, isRefetching: isRefetchingProperty } = useQuery({
    queryKey: ['property_details', id],
    queryFn: async () => {
      if (!isValidId) throw new Error('Invalid ID');
      return (await apiClient.get(`/properties/${id}`)) as any;
    },
    enabled: isValidId,
  });

  const { data: reviews, refetch: refetchReviews, isRefetching: isRefetchingReviews } = useQuery({
    queryKey: ['property_reviews', id],
    queryFn: async () => {
      if (!isValidId) return [];
      return (await apiClient.get(`/reviews/property/${id}`)) as any[];
    },
    enabled: isValidId,
  });

  // --- Fetch Data Vouchers ---
  const { data: vouchers } = useQuery({
    queryKey: ['active_vouchers', id],
    queryFn: async () => {
      const res = await apiClient.get(`/vouchers/active?propertyId=${id}`);
      return res as unknown as any[];
    },
    enabled: !!id,
  });

  const isRefetchingAll = isRefetchingProperty || isRefetchingReviews;

  const onRefresh = useCallback(() => {
    if (isValidId) {
      refetchProperty();
      refetchReviews();
    }
  }, [isValidId, refetchProperty, refetchReviews]);

  // Render lỗi nếu ID sai hoặc API fail
  if (!isValidId || isPropertyError) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: 'red' }}>Đã xảy ra lỗi khi tải thông tin phòng.</Text>
        <TouchableOpacity style={styles.bookButtonError} onPress={() => router.back()}>
          <Text style={styles.bookButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render Loading
  if (isPropertyPending && !isRefetchingProperty) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // --- MAP DỮ LIỆU ---
  const allMedia = Array.isArray(property?.media) ? property.media : [];
  const defaultImage = 'https://images.unsplash.com/photo-1510798831971-661eb04b3739';

  const avgRating = Array.isArray(reviews) && reviews.length > 0 
    ? (reviews.reduce((acc: number, r: any) => acc + (r?.rating || 0), 0) / reviews.length).toFixed(1) 
    : (property?.avgRating ? Number(property.avgRating).toFixed(1) : 'Chưa có đánh giá');
  const reviewCount = (Array.isArray(reviews) ? reviews.length : null) || property?.totalReviews || 0;

  // Xử lý mảng roomTypes
  const roomTypesList = Array.isArray(property?.roomTypes) && property.roomTypes.length > 0 
    ? property.roomTypes 
    : (Array.isArray(property?.rooms) ? property.rooms : []);
    
  const defaultRoom = roomTypesList[0] || {};
  
  const area = defaultRoom?.areaSqm;
  const bedType = defaultRoom?.bedConfiguration || defaultRoom?.bedType;
  const maxGuests = defaultRoom?.maxOccupancy || defaultRoom?.maxGuests;
  const lowestPrice = property?.min_nightly_price || defaultRoom?.basePrice || 0;
  const formattedLowestPrice = lowestPrice ? Number(lowestPrice).toLocaleString('vi-VN') + ' đ' : 'Đang cập nhật';

  // Tiện ích
  const propAmenities = Array.isArray(property?.amenities) 
    ? property.amenities.map((a: any) => a?.amenity?.name || a?.name).filter(Boolean) 
    : [];
  const roomAmenities = Array.isArray(defaultRoom?.amenities) 
    ? defaultRoom.amenities.map((a: any) => a?.amenity?.name || a?.name).filter(Boolean) 
    : [];
  let mergedAmenities = Array.from(new Set([...propAmenities, ...roomAmenities])); 

  if (mergedAmenities.length === 0 && defaultRoom?.description) {
    mergedAmenities = defaultRoom.description.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  const isFav = isFavorite(property?.id?.toString() || '');
  const handleToggleFavorite = () => {
    if (!property?.id) return;
    toggleFavorite({
      id: property.id.toString(),
      title: property.name || 'Khách sạn',
      location: property.district ? `${property.district}, ${property.city}` : (property.city || ''),
      price: Number(lowestPrice),
      rating: Number(avgRating) || 0,
      reviews: reviewCount,
      imageUrl: allMedia[0]?.url || defaultImage
    });
  };

  // (Đã bỏ tính năng lưu voucher ở đây theo yêu cầu)

  const handleSelectRoom = (room: any) => {
    setSelectedRoomType(room);
    router.push({ pathname: '/payment', params: { propertyId: property?.id } } as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        ref={scrollViewRef} 
        bounces={false} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetchingAll}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        
        {/* --- ẢNH CAROUSEL --- */}
        <View style={styles.imageContainer}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            {allMedia.length > 0 ? (
              allMedia.map((img: any, index: number) => (
                <Image key={index} source={{ uri: img?.url || defaultImage }} style={styles.image} contentFit="cover" />
              ))
            ) : (
              <Image source={{ uri: defaultImage }} style={styles.image} contentFit="cover" />
            )}
          </ScrollView>
          <SafeAreaView edges={['top']} style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <TouchableOpacity style={styles.iconButton} onPress={handleToggleFavorite}>
                <Ionicons name={isFav ? "heart" : "heart-outline"} size={22} color={isFav ? "red" : Colors.light.text} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.content}>
          
          <View style={styles.ratingRow}>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map(i => <Ionicons key={i} name="star" size={14} color="#FFD700" />)}
            </View>
            <Text style={styles.ratingText}>{avgRating} ({reviewCount} đánh giá)</Text>
          </View>
          
          <Text style={styles.title}>{property?.name || 'Đang tải...'}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={Colors.primary} />
            <Text style={styles.locationText}>{property?.address ? `${property.address}, ` : ''}{property?.city}</Text>
          </View>

          <View style={styles.divider} />

          {/* TỔNG QUAN */}
          <Text style={styles.sectionTitle}>Tổng quan</Text>
          <View style={styles.overviewGrid}>
            <View style={styles.overviewItem}>
              <View style={styles.overviewIconWrap}><Ionicons name="scan-outline" size={20} color={Colors.primary} /></View>
              <Text style={styles.overviewLabel}>Diện tích</Text>
              <Text style={styles.overviewValue}>{area ? `${area} m²` : '---'}</Text>
            </View>
            <View style={styles.overviewItem}>
              <View style={styles.overviewIconWrap}><Ionicons name="bed-outline" size={20} color={Colors.primary} /></View>
              <Text style={styles.overviewLabel}>Loại giường</Text>
              <Text style={styles.overviewValue}>{bedType || '---'}</Text>
            </View>
            <View style={styles.overviewItem}>
              <View style={styles.overviewIconWrap}><Ionicons name="people-outline" size={20} color={Colors.primary} /></View>
              <Text style={styles.overviewLabel}>Số người</Text>
              <Text style={styles.overviewValue}>{maxGuests ? `Tối đa ${maxGuests}` : '---'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* MÔ TẢ */}
          <Text style={styles.sectionTitle}>Mô tả</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.description} numberOfLines={isDescExpanded ? undefined : 4}>
              {property?.description || "Chưa cung cấp mô tả chi tiết."}
            </Text>
            {(property?.description && property.description.length > 150) && (
              <TouchableOpacity onPress={() => setIsDescExpanded(!isDescExpanded)} style={{ marginTop: 8 }}>
                <Text style={styles.readMoreText}>{isDescExpanded ? 'Rút gọn' : 'Đọc thêm'}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.divider} />

          {/* TIỆN ÍCH */}
          {mergedAmenities.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Tiện ích nổi bật</Text>
              <View style={styles.amenitiesGrid}>
                {mergedAmenities.map((amenityName: any, index: number) => {
                  const text = typeof amenityName === 'string' ? amenityName : '';
                  if (!text) return null;
                  return (
                    <View key={`am-${index}`} style={styles.amenityCard}>
                      <Ionicons name={getAmenityIcon(text)} size={24} color={Colors.primary} />
                      <Text style={styles.amenityText} numberOfLines={2}>{text}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.divider} />
            </>
          )}



          {/* KẾT NỐI GIAO THÔNG */}
          {(() => {
            const transports = parseSafeJSON(property?.transportConnections) || [];
            const formatDistance = (item: any) => {
              if (item.distanceM !== undefined && item.distanceM !== null) {
                const dist = Number(item.distanceM);
                if (dist >= 1000) return `${(dist / 1000).toFixed(1)} km`;
                return `${dist} m`;
              }
              if (item.distance_km) return `${item.distance_km} km`;
              if (item.distance) {
                const distStr = String(item.distance);
                if (distStr.toLowerCase().endsWith('km') || distStr.toLowerCase().endsWith('m')) return distStr;
                return `${distStr} km`;
              }
              return 'Đang cập nhật';
            };

            const getNearbyIcon = (type: string, nameText?: string) => {
              const t = String(type || '').toLowerCase();
              const n = String(nameText || '').toLowerCase();
              if (t.includes('sân bay') || t.includes('airport') || n.includes('sân bay') || n.includes('airport')) return 'airplane-outline';
              if (t.includes('ga tàu') || t.includes('railway') || t.includes('train') || n.includes('ga tàu') || n.includes('railway') || n.includes('train')) return 'train-outline';
              if (t.includes('bến xe') || t.includes('bus') || n.includes('bến xe') || n.includes('bus')) return 'bus-outline';
              if (t.includes('du lịch') || t.includes('tourism') || t.includes('attraction') || n.includes('du lịch') || n.includes('museum') || n.includes('bảo tàng')) return 'camera-outline';
              if (t.includes('nhà hàng') || t.includes('restaurant') || n.includes('nhà hàng')) return 'restaurant-outline';
              if (t.includes('cà phê') || t.includes('cafe') || n.includes('cà phê') || n.includes('cafe')) return 'cafe-outline';
              if (t.includes('siêu thị') || t.includes('tiện lợi') || t.includes('chợ') || t.includes('tttm') || t.includes('shop') || t.includes('mall') || t.includes('market') || n.includes('siêu thị') || n.includes('chợ') || n.includes('mall')) return 'cart-outline';
              if (t.includes('y tế') || t.includes('bệnh viện') || t.includes('nhà thuốc') || t.includes('hospital') || t.includes('pharmacy') || t.includes('clinic') || n.includes('bệnh viện') || n.includes('nhà thuốc')) return 'medical-outline';
              if (t.includes('trường học') || t.includes('school') || n.includes('trường học')) return 'school-outline';
              if (t.includes('ngân hàng') || t.includes('atm') || t.includes('bank') || n.includes('atm') || n.includes('ngân hàng')) return 'cash-outline';
              if (t.includes('cây xăng') || t.includes('fuel') || n.includes('cây xăng')) return 'color-fill-outline';
              if (t.includes('rạp phim') || t.includes('cinema') || n.includes('rạp phim')) return 'film-outline';
              return 'location-outline';
            };

            return (
              <>
                <Text style={styles.sectionTitle}>Kết nối giao thông</Text>
                {transports.length > 0 ? (
                  <View style={styles.nearbyContainer}>
                    {transports.map((t: any, index: number) => (
                      <View key={`t-${index}`} style={styles.nearbyItem}>
                        <Ionicons name={getNearbyIcon(t.type, t.name)} size={20} color={Colors.primary} />
                        <View style={styles.nearbyTextContainer}>
                          <Text style={styles.nearbyName}>{t.name}</Text>
                          <Text style={styles.nearbyDistance}>{formatDistance(t)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: Colors.light.textSecondary, marginBottom: Spacing.md }}>Chưa có kết nối giao thông</Text>
                )}
                <View style={styles.divider} />
              </>
            );
          })()}

          {/* ĐỊA ĐIỂM LÂN CẬN */}
          {(() => {
            const nearby = parseSafeJSON(property?.nearbyPlaces) || [];
            const formatDistance = (item: any) => {
              if (item.distanceM !== undefined && item.distanceM !== null) {
                const dist = Number(item.distanceM);
                if (dist >= 1000) return `${(dist / 1000).toFixed(1)} km`;
                return `${dist} m`;
              }
              if (item.distance_km) return `${item.distance_km} km`;
              if (item.distance) {
                const distStr = String(item.distance);
                if (distStr.toLowerCase().endsWith('km') || distStr.toLowerCase().endsWith('m')) return distStr;
                return `${distStr} km`;
              }
              return 'Đang cập nhật';
            };

            const getNearbyIcon = (type: string, nameText?: string) => {
              const t = String(type || '').toLowerCase();
              const n = String(nameText || '').toLowerCase();
              if (t.includes('sân bay') || t.includes('airport') || n.includes('sân bay') || n.includes('airport')) return 'airplane-outline';
              if (t.includes('ga tàu') || t.includes('railway') || t.includes('train') || n.includes('ga tàu') || n.includes('railway') || n.includes('train')) return 'train-outline';
              if (t.includes('bến xe') || t.includes('bus') || n.includes('bến xe') || n.includes('bus')) return 'bus-outline';
              if (t.includes('du lịch') || t.includes('tourism') || t.includes('attraction') || n.includes('du lịch') || n.includes('museum') || n.includes('bảo tàng')) return 'camera-outline';
              if (t.includes('nhà hàng') || t.includes('restaurant') || n.includes('nhà hàng')) return 'restaurant-outline';
              if (t.includes('cà phê') || t.includes('cafe') || n.includes('cà phê') || n.includes('cafe')) return 'cafe-outline';
              if (t.includes('siêu thị') || t.includes('tiện lợi') || t.includes('chợ') || t.includes('tttm') || t.includes('shop') || t.includes('mall') || t.includes('market') || n.includes('siêu thị') || n.includes('chợ') || n.includes('mall')) return 'cart-outline';
              if (t.includes('y tế') || t.includes('bệnh viện') || t.includes('nhà thuốc') || t.includes('hospital') || t.includes('pharmacy') || t.includes('clinic') || n.includes('bệnh viện') || n.includes('nhà thuốc')) return 'medical-outline';
              if (t.includes('trường học') || t.includes('school') || n.includes('trường học')) return 'school-outline';
              if (t.includes('ngân hàng') || t.includes('atm') || t.includes('bank') || n.includes('atm') || n.includes('ngân hàng')) return 'cash-outline';
              if (t.includes('cây xăng') || t.includes('fuel') || n.includes('cây xăng')) return 'color-fill-outline';
              if (t.includes('rạp phim') || t.includes('cinema') || n.includes('rạp phim')) return 'film-outline';
              return 'location-outline';
            };

            return (
              <>
                <Text style={styles.sectionTitle}>Địa điểm lân cận</Text>
                {nearby.length > 0 ? (
                  <View style={styles.nearbyContainer}>
                    {nearby.map((p: any, index: number) => (
                      <View key={`p-${index}`} style={styles.nearbyItem}>
                        <Ionicons name={getNearbyIcon(p.type, p.name)} size={20} color={Colors.primary} />
                        <View style={styles.nearbyTextContainer}>
                          <Text style={styles.nearbyName}>{p.name}</Text>
                          <Text style={styles.nearbyDistance}>{formatDistance(p)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: Colors.light.textSecondary, marginBottom: Spacing.md }}>Chưa có địa điểm lân cận</Text>
                )}
                <View style={styles.divider} />
              </>
            );
          })()}

          {/* CHÍNH SÁCH LƯU TRÚ */}
          {(() => {
            const policy = parseSafeJSON(property?.policy);
            console.log("POLICY DATA:", property?.policy);
            if (!policy) {
              return (
                <>
                  <Text style={styles.sectionTitle}>Chính sách lưu trú</Text>
                  <Text style={{ marginHorizontal: Spacing.xl, color: Colors.light.textSecondary, marginBottom: Spacing.md }}>Chưa có thông tin</Text>
                  <View style={styles.divider} />
                </>
              );
            }
            return (
              <>
                <Text style={styles.sectionTitle}>Chính sách lưu trú</Text>
                <View style={styles.policyBox}>
                  <View style={styles.policyRow}>
                    <View style={styles.policyIconContainer}>
                      <Ionicons name="time-outline" size={20} color={Colors.light.textSecondary} />
                    </View>
                    <View style={styles.policyContentRow}>
                      <Text style={styles.policyLabel}>Nhận phòng</Text>
                      <Text style={styles.policyValue}>Từ {(() => {
                        const t = policy?.checkInFrom || property?.checkInTime;
                        if (!t) return '14:00';
                        if (typeof t === 'string') {
                          if (t.includes('T')) {
                            const d = new Date(t);
                            return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
                          }
                          const match = t.match(/^(\d{2}):(\d{2})/);
                          return match ? `${match[1]}:${match[2]}` : t.substring(0, 5);
                        }
                        if (t instanceof Date) {
                          return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
                        }
                        return String(t).substring(0, 5);
                      })()}</Text>
                    </View>
                  </View>
                  <View style={styles.policyRow}>
                    <View style={styles.policyIconContainer}>
                      <Ionicons name="time-outline" size={20} color={Colors.light.textSecondary} />
                    </View>
                    <View style={styles.policyContentRow}>
                      <Text style={styles.policyLabel}>Trả phòng</Text>
                      <Text style={styles.policyValue}>Trước {(() => {
                        const t = policy?.checkOutUntil || property?.checkOutTime;
                        if (!t) return '12:00';
                        if (typeof t === 'string') {
                          if (t.includes('T')) {
                            const d = new Date(t);
                            return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
                          }
                          const match = t.match(/^(\d{2}):(\d{2})/);
                          return match ? `${match[1]}:${match[2]}` : t.substring(0, 5);
                        }
                        if (t instanceof Date) {
                          return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`;
                        }
                        return String(t).substring(0, 5);
                      })()}</Text>
                    </View>
                  </View>
                  <View style={styles.policyRow}>
                    <View style={styles.policyIconContainer}>
                      <Ionicons name="information-circle-outline" size={20} color={Colors.light.textSecondary} />
                    </View>
                    <View style={styles.policyContentRow}>
                      <Text style={styles.policyLabel}>Hủy phòng</Text>
                      <Text style={styles.policyValue}>
                        {policy.cancellationType === 'free' || policy.refundable ? 'Miễn phí hủy' : 
                         policy.cancellationType === 'non_refundable' ? 'Không hoàn tiền' : 'Có phí theo quy định'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.policyRow}>
                    <View style={styles.policyIconContainer}>
                      <Ionicons name="paw-outline" size={20} color={Colors.light.textSecondary} />
                    </View>
                    <View style={styles.policyContentRow}>
                      <Text style={styles.policyLabel}>Vật nuôi</Text>
                      <Text style={styles.policyValue}>{policy.petsAllowed ? 'Cho phép mang theo' : 'Không cho phép'}</Text>
                    </View>
                  </View>
                  <View style={styles.policyRow}>
                    <View style={styles.policyIconContainer}>
                      <Ionicons name="ban-outline" size={20} color={Colors.light.textSecondary} />
                    </View>
                    <View style={styles.policyContentRow}>
                      <Text style={styles.policyLabel}>Hút thuốc</Text>
                      <Text style={styles.policyValue}>{policy.smokingAllowed ? 'Được phép ở khu quy định' : 'Nghiêm cấm hút thuốc'}</Text>
                    </View>
                  </View>
                  <View style={styles.policyRow}>
                    <View style={styles.policyIconContainer}>
                      <Ionicons name="people-outline" size={20} color={Colors.light.textSecondary} />
                    </View>
                    <View style={styles.policyContentRow}>
                      <Text style={styles.policyLabel}>Trẻ em</Text>
                      <Text style={styles.policyValue}>{policy.childrenAllowed ? 'Chào đón trẻ em' : 'Không nhận trẻ em'}</Text>
                    </View>
                  </View>
                  {policy.customRules && (
                    <View style={[styles.policyRow, { alignItems: 'flex-start', marginTop: 4 }]}>
                      <View style={[styles.policyIconContainer, { marginTop: 2 }]}>
                        <Ionicons name="document-text-outline" size={20} color={Colors.light.textSecondary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 2 }}>
                        <Text style={[styles.policyLabel, { marginBottom: 4 }]}>Quy tắc khác</Text>
                        <Text style={{ ...Typography.body2, color: Colors.light.text, lineHeight: 22 }}>{policy.customRules}</Text>
                      </View>
                    </View>
                  )}
                </View>
                <View style={styles.divider} />
              </>
            );
          })()}

          {/* --- DANH SÁCH LOẠI PHÒNG (ROOM TYPES) --- */}
          <Text style={styles.sectionTitle}>Các loại phòng trống</Text>
          {roomTypesList.length > 0 ? (
            roomTypesList.map((room: any, index: number) => {
              const rPrice = room.basePrice ? Number(room.basePrice).toLocaleString('vi-VN') + ' đ' : 'Liên hệ';
              const rArea = room.areaSqm ? `${room.areaSqm} m²` : '---';
              const rBed = room.bedConfiguration || room.bedType || '---';
              const rGuests = room.maxOccupancy || room.maxGuests || 2;
              
              return (
                <View key={`room-${room.id || index}`} style={styles.roomTypeCard}>
                  <Text style={styles.roomTypeName}>{room.name || 'Phòng tiêu chuẩn'}</Text>
                  
                  <View style={styles.roomTypeInfoRow}>
                    <Ionicons name="scan-outline" size={14} color={Colors.light.textSecondary} />
                    <Text style={styles.roomTypeInfoText}>{rArea}</Text>
                    <Text style={styles.roomTypeInfoDot}>•</Text>
                    <Ionicons name="bed-outline" size={14} color={Colors.light.textSecondary} />
                    <Text style={styles.roomTypeInfoText}>{rBed}</Text>
                  </View>
                  
                  <View style={styles.roomTypeInfoRow}>
                    <Ionicons name="people-outline" size={14} color={Colors.light.textSecondary} />
                    <Text style={styles.roomTypeInfoText}>Phù hợp cho {rGuests} người</Text>
                  </View>

                  <View style={styles.roomTypeBottom}>
                    <View>
                      <Text style={styles.roomTypePrice}>{rPrice}</Text>
                      <Text style={styles.roomTypePerNight}>/ đêm</Text>
                    </View>
                    <TouchableOpacity style={styles.btnBookRoom} onPress={() => handleSelectRoom(room)}>
                      <Text style={styles.btnBookRoomText}>Chọn phòng</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={{ color: Colors.light.textSecondary }}>Hiện chưa có thông tin phòng.</Text>
          )}

        </View>
      </ScrollView>

      {/* BOTTOM BAR - NHẮC NGƯỜI DÙNG CUỘN XUỐNG CHỌN PHÒNG */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg }]}>
        <View>
          <Text style={styles.startingFrom}>Chỉ từ</Text>
          <Text style={styles.price}>{formattedLowestPrice} <Text style={styles.perNight}>/ đêm</Text></Text>
        </View>
        <TouchableOpacity 
          style={styles.bookButton} 
          onPress={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          <Text style={styles.bookButtonText}>XEM PHÒNG</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  imageContainer: { width: width, height: width * 1.1, position: 'relative' },
  image: { width: width, height: '100%' },
  headerButtons: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.md },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', ...Shadows.sm },
  content: { padding: Spacing.xl, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -30, ...Shadows.md },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  stars: { flexDirection: 'row', marginRight: Spacing.xs },
  ratingText: { ...Typography.body2, color: Colors.light.textSecondary, fontWeight: '500' },
  title: { ...Typography.h1, fontSize: 28, lineHeight: 36, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: Colors.light.text, marginBottom: Spacing.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { ...Typography.body1, color: Colors.primary, marginLeft: 4, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.light.border, marginVertical: Spacing.xl },
  sectionTitle: { ...Typography.h2, fontSize: 20, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: Colors.light.text, marginBottom: Spacing.lg },
  
  // Overview Grid
  overviewGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  overviewItem: { flex: 1, backgroundColor: '#F9F9FB', borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: '#F0F0F0' },
  overviewIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EBE9FE', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  overviewLabel: { ...Typography.caption, color: Colors.light.textSecondary, marginBottom: 2 },
  overviewValue: { ...Typography.body2, fontWeight: '700', color: Colors.light.text, textAlign: 'center' },
  
  // Description
  descriptionBox: { backgroundColor: '#F9F9FB', padding: Spacing.md, borderRadius: BorderRadius.md },
  description: { ...Typography.body1, color: Colors.light.textSecondary, lineHeight: 26 },
  readMoreText: { ...Typography.body2, color: Colors.primary, fontWeight: '700' },

  // Amenities
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  amenityCard: { width: '48%', flexDirection: 'row', alignItems: 'center', padding: Spacing.md, backgroundColor: '#F9F9FB', borderRadius: BorderRadius.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#F0F0F0' },
  amenityText: { ...Typography.body2, color: Colors.light.text, marginLeft: Spacing.sm, flex: 1, fontWeight: '500' },

  // Room Types
  roomTypeCard: { backgroundColor: '#F9F9FB', borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md, borderWidth: 1, borderColor: '#F0F0F0' },
  roomTypeName: { ...Typography.h3, color: Colors.light.text, marginBottom: Spacing.sm },
  roomTypeInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  roomTypeInfoText: { ...Typography.caption, color: Colors.light.textSecondary, marginLeft: 6 },
  roomTypeInfoDot: { color: Colors.light.textSecondary, marginHorizontal: 8, fontSize: 12 },
  roomTypeBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border },
  roomTypePrice: { ...Typography.h3, color: Colors.primary },
  roomTypePerNight: { ...Typography.caption, color: Colors.light.textSecondary },
  btnBookRoom: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: 10, borderRadius: BorderRadius.pill },
  btnBookRoomText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  // Bottom Bar
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'white',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, borderTopWidth: 1, borderColor: '#F0F0F0',
    ...Shadows.md,
  },
  startingFrom: { ...Typography.caption, color: Colors.light.textSecondary, marginBottom: 2 },
  price: { ...Typography.h2, color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  perNight: { ...Typography.body2, color: Colors.light.textSecondary },
  bookButton: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 14, borderRadius: BorderRadius.pill, ...Shadows.sm },
  bookButtonError: { backgroundColor: Colors.primary, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: BorderRadius.pill, marginTop: Spacing.lg },
  bookButtonText: { ...Typography.button, color: 'white', fontWeight: '700', letterSpacing: 1 },

  // Vouchers
  voucherCard: { flexDirection: 'row', width: width * 0.75, height: 100, marginRight: Spacing.md, backgroundColor: '#FDF7F7', borderRadius: BorderRadius.md, borderWidth: 1, borderColor: '#FAD8D8', overflow: 'hidden' },
  voucherLeft: { flex: 6, backgroundColor: '#EF4444', padding: Spacing.sm, justifyContent: 'center', borderRightWidth: 1, borderRightColor: 'white', borderStyle: 'dashed' },
  voucherDiscount: { ...Typography.h3, color: 'white', marginTop: 4 },
  voucherMinOrder: { ...Typography.caption, color: 'rgba(255,255,255,0.8)' },
  voucherRight: { flex: 4, padding: Spacing.sm, justifyContent: 'center', alignItems: 'center' },
  voucherCode: { ...Typography.caption, fontWeight: '700', color: Colors.light.text, marginBottom: 8 },
  btnSaveVoucher: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.pill },
  btnSaveVoucherText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  // Nearby & Policy
  nearbyContainer: { gap: Spacing.md },
  nearbyItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  nearbyTextContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  nearbyName: { ...Typography.body2, color: Colors.light.text },
  nearbyDistance: { ...Typography.caption, color: Colors.light.textSecondary },
  policyBox: { backgroundColor: '#F9F9FB', padding: Spacing.lg, borderRadius: BorderRadius.md, gap: Spacing.md },
  policyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  policyIconContainer: { width: 24, alignItems: 'center', justifyContent: 'center' },
  policyContentRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  policyLabel: { ...Typography.body2, color: Colors.light.textSecondary, fontWeight: '500' },
  policyValue: { ...Typography.body2, color: Colors.light.text, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: Spacing.md }
});
