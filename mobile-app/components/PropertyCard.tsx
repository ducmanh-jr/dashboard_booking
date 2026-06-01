/**
 * ============================================================================
 * TÊN FILE: components/PropertyCard.tsx
 * MỤC ĐÍCH: Component hiển thị 1 thẻ chi tiết Khách sạn/Phòng.
 * Tích hợp sẵn hiệu ứng cache ảnh (`expo-image`) và nút Yêu thích (Trái tim).
 * ============================================================================
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from './SafeImage';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../constants/theme';

// Cấu trúc đối tượng Dữ liệu Phòng
export interface Property {
  id: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  imageUrl: string;
}

// Các thuộc tính (props) có thể truyền vào Component
interface PropertyCardProps {
  property: Property;
  onPress?: () => void;             // Hàm xử lý khi bấm vào toàn bộ thẻ
  isFavorite?: boolean;             // Cờ bật/tắt hiển thị Trái tim
  onFavoritePress?: () => void;     // Hàm xử lý khi bấm vào Trái tim
}

// Dùng React.memo để ngăn việc Render lại (re-render) không cần thiết khi cuộn danh sách
export const PropertyCard: React.FC<PropertyCardProps> = React.memo(({ property, onPress, isFavorite, onFavoritePress }) => {
  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onPress} 
      style={styles.card}
    >
      {/* Vùng Hình ảnh & Nút Yêu thích đè lên trên */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: property.imageUrl }}
          style={styles.image}
          contentFit="cover"
          transition={300} // Hiệu ứng làm mờ khi tải xong ảnh
          cachePolicy="memory-disk" // Lưu cache để cuộn mượt hơn
          onError={(e) => console.log('Property image load error for ID:', property.id, 'Error:', e.error, 'URL:', property.imageUrl)}
        />
        {/* Nút thả tim nổi ở góc phải (Chỉ hiện khi isFavorite = true) */}
        {isFavorite && (
          <TouchableOpacity style={styles.favoriteBtn} onPress={onFavoritePress}>
            <Ionicons name="heart" size={20} color="#E91E63" />
          </TouchableOpacity>
        )}
      </View>

      {/* Vùng Nội dung: Tiêu đề, Vị trí, Giá, Đánh giá */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{property.title}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={14} color={Colors.accent} />
            <Text style={styles.ratingText}>{property.rating}</Text>
          </View>
        </View>
        <Text style={styles.location} numberOfLines={1}>
          <Ionicons name="location-outline" size={12} color={Colors.light.textSecondary} /> {property.location}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.priceContainer}>
            <Text style={styles.price}>{Number(property.price).toLocaleString('vi-VN')}đ</Text>
            <Text style={styles.priceNight}> / đêm</Text>
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    overflow: 'hidden',
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.light.border,
  },
  favoriteBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'white',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  content: {
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.h3,
    color: Colors.light.text,
    flex: 1,
    marginRight: Spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  ratingText: {
    ...Typography.caption,
    fontWeight: '700',
    color: Colors.accent,
    marginLeft: 4,
  },
  location: {
    ...Typography.body2,
    color: Colors.light.textSecondary,
    marginBottom: Spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    ...Typography.h2,
    color: Colors.primary,
  },
  priceNight: {
    ...Typography.body2,
    color: Colors.light.textSecondary,
  },
});
