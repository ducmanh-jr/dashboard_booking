/**
 * ============================================================================
 * TÊN FILE: app/(tabs)/index.tsx
 * MỤC ĐÍCH: Màn hình Trang Chủ (Home Screen).
 * CHỨC NĂNG CHÍNH:
 * - Hiển thị lời chào.
 * - Thanh tìm kiếm giả (nút bấm để gọi Modal Tìm Kiếm `searchModal.tsx`).
 * - Hiển thị danh mục địa điểm, khách sạn nổi bật.
 * ============================================================================
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, FlatList, ActivityIndicator, RefreshControl, ImageBackground, Modal, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from '../../components/SafeImage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { useSearchStore } from '../../store/useSearchStore';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { PropertyCard, Property } from '../../components/PropertyCard';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Image as ExpoImage } from 'expo-image';

const promoBanners = [
  {
    id: '1',
    badge: 'ƯU ĐÃI MÙA HÈ',
    title: 'Giảm 30% cho Resort ven biển',
    subtitle: 'Tận hưởng không gian nghỉ dưỡng đẳng cấp với mức giá ưu đãi.',
    imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4',
  },
  {
    id: '2',
    badge: 'FLASH SALE',
    title: 'Đêm cuối tuần giá sốc',
    subtitle: 'Đặt phòng phút chót tại các khách sạn trung tâm.',
    imageUrl: 'https://images.unsplash.com/photo-1590490360182-c33d57733427',
  },
  {
    id: '3',
    badge: 'MỚI RA MẮT',
    title: 'Biệt thự sân vườn yên bình',
    subtitle: 'Trải nghiệm thiên nhiên xanh mát cùng gia đình và người thân.',
    imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6',
  },
  {
    id: '4',
    badge: 'ƯU ĐÃI THÀNH VIÊN',
    title: 'Tặng Voucher 150.000 đ',
    subtitle: 'Đăng ký tài khoản và nhận ngay ưu đãi đặt chỗ hôm nay.',
    imageUrl: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d',
  },
];

const flightPartners = [
  { label: 'Vietnam Airlines', appUrl: 'https://www.vietnamairlines.com', webFallbackUrl: 'https://www.vietnamairlines.com' },
  { label: 'Vietjet Air', appUrl: 'https://www.vietjetair.com', webFallbackUrl: 'https://www.vietjetair.com' },
  { label: 'Bamboo Airways', appUrl: 'https://www.bambooairways.com', webFallbackUrl: 'https://www.bambooairways.com' },
];

const transportPartners = [
  { label: 'Grab', appUrl: 'grab://', webFallbackUrl: 'https://www.grab.com' },
  { label: 'Be', appUrl: 'be://', webFallbackUrl: 'https://be.com.vn' },
  { label: 'Xanh SM', appUrl: 'greensm://', webFallbackUrl: 'https://www.greensm.com/vn-vi' },
];

export default function HomeScreen() {
  const router = useRouter();
  const [showFlightModal, setShowFlightModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const { location, checkInDate, checkOutDate, guests } = useSearchStore();
  const { favorites, toggleFavorite, fetchFavorites } = useFavoriteStore();

  const hasToken = useAuthStore((state) => state.hasToken);

  React.useEffect(() => {
    if (hasToken) {
      fetchFavorites();
    }
  }, [hasToken]);
  const authUser = useAuthStore((state) => state.user);

  const { data: userProfile } = useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      const response = await apiClient.get('/users/me');
      return response as any;
    },
    enabled: hasToken,
  });

  const displayUser = userProfile || authUser;

  const handleSearchClick = () => {
    router.push('/searchModal' as any);
  };

  const openPartnerApp = async (appUrl: string, webFallbackUrl: string) => {
    try {
      await Linking.openURL(appUrl);
    } catch {
      await Linking.openURL(webFallbackUrl);
    }
  };

  const handlePartnerPress = async (appUrl: string, webFallbackUrl: string) => {
    setShowFlightModal(false);
    setShowTransportModal(false);
    await openPartnerApp(appUrl, webFallbackUrl);
  };

  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: ['featured_properties'],
    queryFn: async () => {
      const response: any = await apiClient.get('/properties/search', {
        params: { limit: 5 },
      });
      return response.items as any[];
    },
  });

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const featuredProperties: Property[] = data
    ? data.map((item) => ({
      id: item.id.toString(),
      title: item.name,
      location: item.district ? `${item.district}, ${item.city}` : item.city,
      price: item.min_nightly_price,
      rating: item.avg_rating,
      reviews: item.total_reviews,
      imageUrl: item.cover_image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945',
    }))
    : [];

  const renderHeader = () => (
    <>
      {/* Top Section with World Map Background */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828' }}
        style={styles.topSection}
        resizeMode="cover"
      >
        <View style={styles.topSectionOverlay} />
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <ExpoImage
              source={require('../../assets/images/logo1.svg')}
              style={styles.logoImage}
              contentFit="contain"
            />
            <View style={styles.headerRight}>
              <Ionicons name="notifications-outline" size={24} color={Colors.primary} style={styles.bellBg} />
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/profile' as any)}
              >
                <ExpoImage
                  source={
                    displayUser?.avatar
                      ? { uri: displayUser.avatar }
                      : { uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100' }
                  }
                  style={styles.avatar}
                  contentFit="cover"
                />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.heroText}>Chạm đến bình yên, khám phá những điều kỳ diệu.</Text>

          {/* Search Box */}
          <TouchableOpacity style={styles.searchBox} onPress={handleSearchClick} activeOpacity={0.9}>
            <View style={styles.searchRow}>
              <Ionicons name="location-outline" size={20} color={Colors.light.icon} />
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchLabel}>ĐIỂM ĐẾN</Text>
                <Text style={styles.searchValue}>{location}</Text>
              </View>
            </View>
            <View style={styles.searchDivider} />
            <View style={styles.searchRow}>
              <Ionicons name="calendar-outline" size={20} color={Colors.light.icon} />
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchLabel}>NGÀY ĐI - NGÀY VỀ</Text>
                <Text style={styles.searchValue}>{checkInDate} - {checkOutDate}</Text>
              </View>
            </View>
            <View style={styles.searchDivider} />
            <View style={styles.searchRow}>
              <Ionicons name="people-outline" size={20} color={Colors.light.icon} />
              <View style={styles.searchInputContainer}>
                <Text style={styles.searchLabel}>KHÁCH</Text>
                <Text style={styles.searchValue}>{guests.adults + guests.children} khách, {guests.rooms} phòng</Text>
              </View>
            </View>
            <View style={styles.searchButton}>
              <Ionicons name="search" size={20} color="white" />
              <Text style={styles.searchButtonText}>Tìm kiếm</Text>
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </ImageBackground>

      {/* Categories */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        <TouchableOpacity style={[styles.categoryBtn, styles.categoryActive]}>
          <Ionicons name="bed" size={16} color="white" />
          <Text style={[styles.categoryText, { color: 'white' }]}>Khách sạn</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.categoryBtn} onPress={() => setShowFlightModal(true)}>
          <Ionicons name="airplane" size={16} color={Colors.light.text} />
          <Text style={styles.categoryText}>Vé máy bay</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.categoryBtn} onPress={() => setShowTransportModal(true)}>
          <Ionicons name="car" size={16} color={Colors.light.text} />
          <Text style={styles.categoryText}>Phương tiện di chuyển</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Promos */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Chương trình khuyến mại chỗ ở</Text>
          <TouchableOpacity onPress={() => router.push('/offers' as any)}>
            <Text style={styles.seeAll}>Xem tất cả &rarr;</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: Spacing.md }}>
          {promoBanners.map((promo) => (
            <TouchableOpacity
              key={promo.id}
              activeOpacity={0.9}
              onPress={() => router.push('/offers' as any)}
              style={styles.promoCardContainer}
            >
              <View style={styles.promoCard}>
                <Image
                  source={{ uri: promo.imageUrl }}
                  style={styles.promoImg}
                  contentFit="cover"
                  onError={(e) => console.log('Promo image load error for ID:', promo.id, 'Error:', e.error, 'URL:', promo.imageUrl)}
                />
                <View style={styles.promoOverlay}>
                  <View style={styles.promoBadge}>
                    <Text style={styles.promoBadgeText}>{promo.badge}</Text>
                  </View>
                  <Text style={styles.promoTitle}>{promo.title}</Text>
                  <Text style={styles.promoSubtitle}>{promo.subtitle}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Featured Header */}
      <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
        <Text style={styles.sectionTitle}>Khách sạn nổi bật</Text>
      </View>

      {isPending && (
        <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}

      {isError && (
        <View style={{ padding: Spacing.lg, alignItems: 'center' }}>
          <Text style={{ color: 'red' }}>Đã có lỗi xảy ra khi tải dữ liệu.</Text>
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={featuredProperties}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: Spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: Spacing.md }}>
            <PropertyCard
              property={item}
              isFavorite={favorites.some((fav) => fav.id === item.id)}
              onFavoritePress={() => toggleFavorite(item)}
              onPress={() => router.push(`/room/${item.id}` as any)}
            />
          </View>
        )}
      />
      <Modal
        visible={showFlightModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFlightModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowFlightModal(false)}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn hãng bay</Text>
            {flightPartners.map((partner) => (
              <TouchableOpacity
                key={partner.label}
                style={styles.partnerButton}
                onPress={() => handlePartnerPress(partner.appUrl, partner.webFallbackUrl)}
              >
                <Text style={styles.partnerButtonText}>{partner.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowFlightModal(false)}>
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={showTransportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTransportModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowTransportModal(false)}>
          <Pressable style={styles.modalContent}>
            <Text style={styles.modalTitle}>Chọn phương tiện</Text>
            {transportPartners.map((partner) => (
              <TouchableOpacity
                key={partner.label}
                style={styles.partnerButton}
                onPress={() => handlePartnerPress(partner.appUrl, partner.webFallbackUrl)}
              >
                <Text style={styles.partnerButtonText}>{partner.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowTransportModal(false)}>
              <Text style={styles.closeButtonText}>Đóng</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  topSection: { paddingBottom: 80, overflow: 'hidden' },
  topSectionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  logo: { ...Typography.h2, color: 'white', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  logoImage: { width: 120, height: 40 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  bellBg: { backgroundColor: 'white', borderRadius: 20, padding: 4, overflow: 'hidden' },
  avatar: { width: 32, height: 32, borderRadius: 999, backgroundColor: '#D9D9D9' },
  heroText: { ...Typography.h1, color: 'white', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', paddingHorizontal: Spacing.lg, marginVertical: Spacing.lg, textAlign: 'center' },
  searchBox: { backgroundColor: 'white', marginHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, padding: Spacing.md, ...Shadows.lg, marginTop: Spacing.sm, marginBottom: -100 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  searchInputContainer: { marginLeft: Spacing.sm, flex: 1 },
  searchLabel: { ...Typography.caption, color: Colors.light.textSecondary, fontWeight: '700' },
  searchValue: { ...Typography.body1, color: Colors.light.text, marginTop: 4 },
  searchDivider: { height: 1, backgroundColor: Colors.light.border, marginVertical: Spacing.xs },
  searchButton: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: Spacing.md, borderRadius: BorderRadius.md, marginTop: Spacing.md },
  searchButtonText: { ...Typography.button, color: 'white', marginLeft: Spacing.sm },
  categories: { padding: Spacing.md, gap: Spacing.sm, marginTop: 60 },
  categoryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: 'white' },
  categoryActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryText: { marginLeft: Spacing.sm, ...Typography.body2 },
  section: { marginVertical: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  sectionTitle: { ...Typography.h1, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', flex: 1 },
  seeAll: { ...Typography.body2, color: Colors.primary, fontWeight: '600' },
  promoCardContainer: {
    marginRight: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  promoCard: { width: 320, height: 220, borderRadius: BorderRadius.lg, overflow: 'hidden' },
  promoImg: { width: '100%', height: '100%' },
  promoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', padding: Spacing.md, justifyContent: 'flex-end' },
  promoBadge: { backgroundColor: 'white', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: Spacing.sm },
  promoBadgeText: { fontSize: 10, fontWeight: 'bold', color: Colors.primary },
  promoTitle: { ...Typography.h3, color: 'white', marginBottom: 4 },
  promoSubtitle: { ...Typography.caption, color: 'white', opacity: 0.9 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.lg },
  modalContent: { backgroundColor: 'white', borderRadius: BorderRadius.lg, padding: Spacing.lg },
  modalTitle: { ...Typography.h3, color: Colors.light.text, marginBottom: Spacing.md, textAlign: 'center' },
  partnerButton: { padding: Spacing.md, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.light.border, marginBottom: Spacing.sm, backgroundColor: 'white' },
  partnerButtonText: { ...Typography.body1, color: Colors.light.text, fontWeight: '600', textAlign: 'center' },
  closeButton: { padding: Spacing.md, borderRadius: BorderRadius.md, backgroundColor: Colors.primary, marginTop: Spacing.sm },
  closeButtonText: { ...Typography.button, color: 'white', textAlign: 'center' },
});
