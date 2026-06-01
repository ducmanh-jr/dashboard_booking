/**
 * ============================================================================
 * TÊN FILE: app/(tabs)/search.tsx
 * MỤC ĐÍCH: Màn hình Kết quả Tìm kiếm.
 * CHỨC NĂNG CHÍNH:
 * - Render kết quả tìm kiếm khách sạn (Mock data).
 * - Hiển thị Tóm tắt tìm kiếm ở trên cùng (có thể nhấn vào để mở lại `searchModal`).
 * ============================================================================
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform, Modal, Dimensions, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import MultiSlider from '@ptomasroos/react-native-multi-slider';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';
import { PropertyCard, Property } from '../../components/PropertyCard';
import { useSearchStore, FilterState } from '../../store/useSearchStore';
import { useFavoriteStore } from '../../store/useFavoriteStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

export default function SearchResultsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location, checkInDate, checkOutDate, guests, sortMode, filters, setSortMode, setFilters } = useSearchStore();
  const { favorites, toggleFavorite } = useFavoriteStore();

  const [activeModal, setActiveModal] = useState<'sort' | 'price' | 'filter' | null>(null);

  // Local state for Price Range Slider
  const [tempPriceRange, setTempPriceRange] = useState<[number, number]>([filters.minPrice, filters.maxPrice]);

  // Local state for Advanced Filter Modal
  const [activeFilterTab, setActiveFilterTab] = useState('star_rating');
  const [tempAdvancedFilters, setTempAdvancedFilters] = useState<FilterState>({
    stars: filters.stars,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    distCenter: filters.distCenter,
    distBeach: filters.distBeach,
    paymentOptions: [...filters.paymentOptions],
    guestRating: [...filters.guestRating],
    area: [...filters.area],
    propertyType: [...filters.propertyType],
    bedType: [...filters.bedType],
  });

  const areaMap: Record<string, string[]> = {
    "Hà Nội": ["Hoàn Kiếm", "Long Biên", "Hai Bà Trưng", "Tây Hồ"],
    "Đà Nẵng": ["Hải Châu", "Sơn Trà", "Ngũ Hành Sơn"],
    "Hồ Chí Minh": ["Quận 1", "Quận 3", "Phú Nhuận"]
  };

  const STATIC_LISTS = {
    guestRating: ["9+ Trên cả tuyệt vời", "8+ Xuất sắc", "7+ Rất tốt", "6+ Hài lòng", "5+ Bình thường"],
    propertyType: ["Căn hộ", "Căn hộ dịch vụ", "Khách sạn", "Resort", "Nhà khách / Nhà nghỉ B&B", "Nhà nghỉ", "Nhà dân", "Biệt thự nghỉ dưỡng", "Toàn bộ căn nhà", "Khách sạn con nhộng", "Khách sạn tình yêu", "Biệt thự", "Lodge", "Nhà ở ngoại ô", "Bungalow", "Lều", "Chalet", "Nông trại"],
    bedType: ["Giường đôi lớn", "Giường đơn lớn", "Hai giường đơn", "Giường tầng", "Giường đơn 1 người"]
  };

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const currentArray = tempAdvancedFilters[key] as any[];
    const isSelected = currentArray.includes(value);
    setTempAdvancedFilters({
      ...tempAdvancedFilters,
      [key]: isSelected ? currentArray.filter(x => x !== value) : [...currentArray, value]
    });
  };

  const renderCheckboxList = (key: keyof FilterState, options: string[]) => {
    return options.map(opt => {
      const isSelected = (tempAdvancedFilters[key] as string[]).includes(opt);
      return (
        <TouchableOpacity key={opt} style={styles.checkboxRow} onPress={() => toggleArrayFilter(key, opt)}>
          <Ionicons
            name={isSelected ? "checkbox" : "square-outline"}
            size={24}
            color={isSelected ? Colors.primary : Colors.light.textSecondary}
          />
          <Text style={styles.checkboxLabel}>{opt}</Text>
        </TouchableOpacity>
      );
    });
  };

  const filterTabs = [
    { id: 'star_rating', title: 'Xếp hạng sao' },
    { id: 'price', title: 'Giá tiền' },
    { id: 'payment_options', title: 'Lựa chọn thanh toán' },
    { id: 'dist_center', title: 'KC đến trung tâm' },
    { id: 'dist_beach', title: 'KC đến bãi biển' },
    { id: 'guest_rating', title: 'Đánh giá khách' },
    { id: 'area', title: 'Khu vực' },
    { id: 'property_type', title: 'Loại hình nơi ở' },
    { id: 'bed_type', title: 'Loại giường' },
  ];

  const sortOptions = [
    { label: 'Độ phổ biến', value: 'best_match' },
    { label: 'Giá thấp nhất', value: 'lowest_price' },
    { label: 'Giá cao nhất', value: 'highest_price' },
    { label: 'Đánh giá cao nhất', value: 'highest_rating' }
  ];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const currentSortLabel = sortOptions.find(o => o.value === sortMode)?.label || 'Sắp xếp';

  const { data, isPending, isError } = useQuery({
    queryKey: ['search_properties', location, guests, filters, sortMode],
    queryFn: async () => {
      const response = await apiClient.get('/properties/search', {
        params: {
          city: location && location !== 'Mọi nơi' ? location : undefined,
          rooms_needed: guests.rooms || 1,
          min_price: filters.minPrice > 0 ? filters.minPrice : undefined,
          max_price: filters.maxPrice < 50000000 ? filters.maxPrice : undefined,
          property_type: filters.propertyType.length > 0 ? filters.propertyType.join(',') : undefined,
          sort_by: sortMode || undefined,
        },
      });
      let items = response.items as any[];
      return items;
    },
  });

  const properties: Property[] = data
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

  // Render content for advanced filter
  const renderFilterContent = () => {
    switch (activeFilterTab) {
      case 'star_rating':
        return (
          <View>
            <Text style={styles.rightColTitle}>Xếp hạng sao</Text>
            <Text style={styles.sliderValueText}>{tempAdvancedFilters.stars[0]} sao - {tempAdvancedFilters.stars[1]} sao</Text>
            <MultiSlider
              values={[tempAdvancedFilters.stars[0], tempAdvancedFilters.stars[1]]}
              sliderLength={SCREEN_WIDTH * 0.65 - Spacing.md * 2}
              onValuesChange={(v) => setTempAdvancedFilters({ ...tempAdvancedFilters, stars: [v[0], v[1]] })}
              min={0} max={5} step={0.5}
              allowOverlap={false} snapped minMarkerOverlapDistance={20}
              selectedStyle={{ backgroundColor: Colors.primary }}
              unselectedStyle={{ backgroundColor: Colors.light.border }}
              markerStyle={styles.sliderMarker}
            />
          </View>
        );
      case 'price':
        return (
          <View>
            <Text style={styles.rightColTitle}>Giá tiền mỗi đêm</Text>
            <MultiSlider
              values={[tempAdvancedFilters.minPrice, tempAdvancedFilters.maxPrice]}
              sliderLength={SCREEN_WIDTH * 0.65 - Spacing.md * 2}
              onValuesChange={(v) => setTempAdvancedFilters({ ...tempAdvancedFilters, minPrice: v[0], maxPrice: v[1] })}
              min={0} max={50000000} step={1000}
              allowOverlap={false} snapped minMarkerOverlapDistance={40}
              selectedStyle={{ backgroundColor: Colors.primary }}
              unselectedStyle={{ backgroundColor: Colors.light.border }}
              markerStyle={styles.sliderMarker}
            />
            <View style={styles.priceInputRow}>
              <View style={styles.priceInputWrapper}>
                <TextInput
                  style={styles.priceInputInner}
                  value={tempAdvancedFilters.minPrice.toString()}
                  keyboardType="numeric"
                  onChangeText={(t) => setTempAdvancedFilters({ ...tempAdvancedFilters, minPrice: Number(t) || 0 })}
                />
                <Text style={styles.priceUnitText}>đ</Text>
              </View>
              <Text style={{ marginHorizontal: 8 }}>-</Text>
              <View style={styles.priceInputWrapper}>
                <TextInput
                  style={styles.priceInputInner}
                  value={tempAdvancedFilters.maxPrice.toString()}
                  keyboardType="numeric"
                  onChangeText={(t) => setTempAdvancedFilters({ ...tempAdvancedFilters, maxPrice: Number(t) || 0 })}
                />
                <Text style={styles.priceUnitText}>đ</Text>
              </View>
            </View>
          </View>
        );
      case 'payment_options':
        return (
          <View>
            <Text style={styles.rightColTitle}>Lựa chọn thanh toán</Text>
            {renderCheckboxList('paymentOptions', ['Hủy miễn phí', 'Thanh toán tại nơi ở', 'Đặt trước trả tiền sau', 'Trả tiền liền', 'Không cần thẻ tín dụng'])}
          </View>
        );
      case 'guest_rating':
        return (
          <View>
            <Text style={styles.rightColTitle}>Đánh giá của khách</Text>
            {renderCheckboxList('guestRating', STATIC_LISTS.guestRating)}
          </View>
        );
      case 'property_type':
        return (
          <View>
            <Text style={styles.rightColTitle}>Loại hình nơi ở</Text>
            {renderCheckboxList('propertyType', STATIC_LISTS.propertyType)}
          </View>
        );
      case 'bed_type':
        return (
          <View>
            <Text style={styles.rightColTitle}>Loại giường</Text>
            {renderCheckboxList('bedType', STATIC_LISTS.bedType)}
          </View>
        );
      case 'area':
        // Lọc danh sách khu vực dựa trên location hiện tại (nếu có map)
        const areaOptions = Object.entries(areaMap).find(([key]) => location.includes(key))?.[1];
        if (!areaOptions) {
          return (
            <View>
              <Text style={styles.rightColTitle}>Khu vực</Text>
              <Text style={{ ...Typography.body2, color: Colors.light.textSecondary }}>Không có danh sách khu vực chi tiết cho {location || 'địa điểm này'}.</Text>
            </View>
          );
        }
        return (
          <View>
            <Text style={styles.rightColTitle}>Khu vực tại {location}</Text>
            {renderCheckboxList('area', areaOptions)}
          </View>
        );
      case 'dist_center':
      case 'dist_beach':
        const isCenter = activeFilterTab === 'dist_center';
        const range = isCenter ? tempAdvancedFilters.distCenter : tempAdvancedFilters.distBeach;
        return (
          <View>
            <Text style={styles.rightColTitle}>{isCenter ? 'Khoảng cách trung tâm' : 'Khoảng cách bãi biển'}</Text>
            <Text style={styles.sliderValueText}>{range[0]} km - {range[1]} km</Text>
            <MultiSlider
              values={[range[0], range[1]]}
              sliderLength={SCREEN_WIDTH * 0.65 - Spacing.md * 2}
              onValuesChange={(v) => isCenter
                ? setTempAdvancedFilters({ ...tempAdvancedFilters, distCenter: [v[0], v[1]] })
                : setTempAdvancedFilters({ ...tempAdvancedFilters, distBeach: [v[0], v[1]] })}
              min={0} max={50} step={1}
              allowOverlap={false} snapped minMarkerOverlapDistance={20}
              selectedStyle={{ backgroundColor: Colors.primary }}
              unselectedStyle={{ backgroundColor: Colors.light.border }}
              markerStyle={styles.sliderMarker}
            />
          </View>
        );
      default:
        return <Text style={styles.rightColTitle}>Tính năng đang phát triển...</Text>;
    }
  };
  const isSortActive = sortMode !== '';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.logo}>NoWayHome</Text>
        <View style={styles.avatar} />
      </View>

      {/* Search Summary */}
      <View style={styles.searchSummaryContainer}>
        <TouchableOpacity style={styles.searchSummary} activeOpacity={0.8} onPress={() => router.push('/searchModal' as any)}>
          <View style={styles.searchIconBg}>
            <Ionicons name="search" size={20} color={Colors.primary} />
          </View>
          <View style={styles.searchTexts}>
            <Text style={styles.searchDest}>{location || 'Tìm kiếm điểm đến'}</Text>
            <Text style={styles.searchDetails}>{checkInDate} - {checkOutDate} • {guests.adults + guests.children} guests</Text>
          </View>
          <Ionicons name="pencil" size={20} color={Colors.light.textSecondary} />
        </TouchableOpacity>

        {/* Toolbar: Sắp xếp, Giá tiền, Bộ lọc */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.toolbarScroll}
          contentContainerStyle={styles.toolbarRow}
        >
          <TouchableOpacity
            style={[styles.toolbarBtn, isSortActive && { borderColor: Colors.primary, backgroundColor: '#F0F0FF' }]}
            onPress={() => setActiveModal('sort')}
          >
            <Ionicons name="swap-vertical" size={15} color={isSortActive ? Colors.primary : Colors.light.text} />
            <Text style={[styles.toolbarText, isSortActive && { color: Colors.primary }]} numberOfLines={1}>
              {currentSortLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={() => setActiveModal('price')}>
            <Ionicons name="cash-outline" size={15} color={Colors.light.text} />
            <Text style={styles.toolbarText} numberOfLines={1}>Giá tiền</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn} onPress={() => setActiveModal('filter')}>
            <Ionicons name="options" size={15} color={Colors.light.text} />
            <Text style={styles.toolbarText} numberOfLines={1}>Bộ lọc</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* List */}
      {isPending ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : isError ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: 'red' }}>Đã xảy ra lỗi khi tìm kiếm.</Text>
        </View>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
              <Text>Không tìm thấy kết quả nào phù hợp.</Text>
            </View>
          )}
          ListHeaderComponent={() => (
            <Text style={styles.listTitle}>Kết quả tìm kiếm</Text>
          )}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              isFavorite={favorites.some((fav) => fav.id === item.id)}
              onFavoritePress={() => toggleFavorite(item)}
              onPress={() => router.push(`/room/${item.id}` as any)}
            />
          )}
        />
      )}


      {/* ===== MODAL SẮP XẾP ===== */}
      <Modal visible={activeModal === 'sort'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Sắp xếp theo</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeIconBtn}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.sortOptionRow}
                onPress={() => {
                  setSortMode(option.value);
                  setActiveModal(null);
                }}
              >
                <Text style={[styles.sortOptionText, (sortMode === option.value || (sortMode === '' && option.value === 'best_match')) && styles.sortOptionTextActive]}>
                  {option.label}
                </Text>
                {(sortMode === option.value || (sortMode === '' && option.value === 'best_match')) && (
                  <Ionicons name="checkmark" size={24} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* ===== MODAL GIÁ TIỀN ===== */}
      <Modal visible={activeModal === 'price'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Khoảng giá (1 đêm)</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeIconBtn}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.priceValuesRow}>
              <View style={styles.priceValueBox}>
                <Text style={styles.priceValueLabel}>Tối thiểu</Text>
                <Text style={styles.priceValueText}>{formatPrice(tempPriceRange[0])}</Text>
              </View>
              <Text style={styles.priceValueSeparator}>-</Text>
              <View style={styles.priceValueBox}>
                <Text style={styles.priceValueLabel}>Tối đa</Text>
                <Text style={styles.priceValueText}>{formatPrice(tempPriceRange[1])}</Text>
              </View>
            </View>

            <View style={styles.sliderContainer}>
              <MultiSlider
                values={[tempPriceRange[0], tempPriceRange[1]]}
                sliderLength={SCREEN_WIDTH - Spacing.lg * 2 - 20}
                onValuesChange={(values) => setTempPriceRange([values[0], values[1]])}
                min={0}
                max={50000000}
                step={1000}
                allowOverlap={false}
                snapped
                minMarkerOverlapDistance={40}
                selectedStyle={{ backgroundColor: Colors.primary }}
                unselectedStyle={{ backgroundColor: Colors.light.border }}
                markerStyle={{ backgroundColor: 'white', borderWidth: 2, borderColor: Colors.primary, width: 24, height: 24, borderRadius: 12, ...Shadows.sm }}
                trackStyle={{ height: 4, borderRadius: 2 }}
              />
            </View>

            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.sheetClearBtn} onPress={() => setTempPriceRange([0, 50000000])}>
                <Text style={styles.sheetClearText}>Xóa</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sheetApplyBtn}
                onPress={() => {
                  setFilters({ minPrice: tempPriceRange[0], maxPrice: tempPriceRange[1] });
                  setActiveModal(null);
                }}
              >
                <Text style={styles.sheetApplyBtnText}>Tìm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===== MODAL BỘ LỌC NÂNG CAO ===== */}
      <Modal visible={activeModal === 'filter'} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
          <View style={styles.filterHeader}>
            <Text style={styles.sheetTitle}>Bộ lọc nâng cao</Text>
            <TouchableOpacity onPress={() => setActiveModal(null)} style={styles.closeIconBtn}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.splitContainer}>
            {/* CỘT TRÁI */}
            <View style={styles.leftColumn}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {filterTabs.map(tab => (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.filterTab, activeFilterTab === tab.id && styles.filterTabActive]}
                    onPress={() => setActiveFilterTab(tab.id)}
                  >
                    <Text style={[styles.filterTabText, activeFilterTab === tab.id && styles.filterTabTextActive]}>
                      {tab.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* CỘT PHẢI */}
            <View style={styles.rightColumn}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: Spacing.md }}>
                {renderFilterContent()}
              </ScrollView>
            </View>
          </View>

          {/* Sticky Footer */}
          <View style={[styles.filterFooter, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md }]}>
            <TouchableOpacity
              style={styles.sheetClearBtn}
              onPress={() => setTempAdvancedFilters({
                stars: [0, 5], minPrice: 0, maxPrice: 50000000,
                distCenter: [0, 50], distBeach: [0, 50],
                paymentOptions: [], guestRating: [], area: [], propertyType: [], bedType: []
              })}
            >
              <Text style={styles.sheetClearText}>Xóa bộ lọc</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetApplyBtn}
              onPress={() => {
                setFilters(tempAdvancedFilters);
                setActiveModal(null);
              }}
            >
              <Text style={styles.sheetApplyBtnText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  logo: { ...Typography.h2, color: Colors.primary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#D9D9D9' },
  searchSummaryContainer: { paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  searchSummary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', padding: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  searchIconBg: { backgroundColor: '#E0E0FF', padding: 8, borderRadius: 20 },
  searchTexts: { flex: 1, marginLeft: Spacing.sm },
  searchDest: { ...Typography.body1, fontWeight: '600' },
  searchDetails: { ...Typography.caption, color: Colors.light.textSecondary },

  // Toolbar
  toolbarScroll: { marginTop: Spacing.sm },
  toolbarRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: 0, paddingBottom: 2 },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: 'white' },
  toolbarText: { marginLeft: 4, fontSize: 13, fontWeight: '600', color: Colors.light.text },

  // List
  listContent: { padding: Spacing.md, paddingTop: 0 },
  listTitle: { ...Typography.h2, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginBottom: Spacing.md },

  // Modals & Bottom Sheets
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: 'white', borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sheetTitle: { ...Typography.h2, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: Colors.light.text },
  closeIconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },

  // Sort Modal
  sortOptionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  sortOptionText: { ...Typography.body1, color: Colors.light.text },
  sortOptionTextActive: { color: Colors.primary, fontWeight: '700' },

  // Price Modal
  priceValuesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.xl },
  priceValueBox: { flex: 1, borderWidth: 1, borderColor: Colors.light.border, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center' },
  priceValueLabel: { ...Typography.caption, color: Colors.light.textSecondary, marginBottom: 4 },
  priceValueText: { ...Typography.body1, fontWeight: '600', color: Colors.light.text },
  priceValueSeparator: { marginHorizontal: Spacing.md, ...Typography.body1, color: Colors.light.textSecondary },
  sliderContainer: { alignItems: 'center', marginBottom: Spacing.xl },

  // Bottom Sheet Footer (Price & Filter)
  sheetFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  sheetClearBtn: { padding: Spacing.sm },
  sheetClearText: { ...Typography.body1, color: Colors.light.text, textDecorationLine: 'underline' },
  sheetApplyBtn: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 12, borderRadius: BorderRadius.pill },
  sheetApplyBtnText: { ...Typography.button, color: 'white', fontWeight: '700' },
  sliderMarker: { backgroundColor: 'white', borderWidth: 2, borderColor: Colors.primary, width: 24, height: 24, borderRadius: 12, ...Shadows.sm },

  // Advanced Filter Modal
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  splitContainer: { flex: 1, flexDirection: 'row' },
  leftColumn: { width: '35%', backgroundColor: '#F5F5F5' },
  rightColumn: { width: '65%', backgroundColor: 'white' },
  filterTab: { padding: Spacing.md, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  filterTabActive: { backgroundColor: 'white', borderLeftColor: Colors.primary },
  filterTabText: { ...Typography.body1, color: Colors.light.textSecondary },
  filterTabTextActive: { color: Colors.primary, fontWeight: '700' },
  filterFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.light.border },

  // Right Column Content
  rightColTitle: { ...Typography.h3, color: Colors.light.text, marginBottom: Spacing.md },
  sliderValueText: { ...Typography.body1, fontWeight: '600', color: Colors.primary, marginBottom: Spacing.md },
  priceInputRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.md },
  priceInputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.light.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm },
  priceInputInner: { flex: 1, paddingVertical: Spacing.sm, textAlign: 'right' },
  priceUnitText: { ...Typography.body1, color: Colors.light.textSecondary, marginLeft: 4 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  checkboxLabel: { ...Typography.body1, color: Colors.light.text, marginLeft: Spacing.sm, flex: 1 },
});
