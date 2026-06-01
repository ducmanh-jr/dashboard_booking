/**
 * ============================================================================
 * TÊN FILE: components/CouponCard.tsx
 * MỤC ĐÍCH: Component hiển thị thẻ giảm giá (Coupon/Voucher).
 * THIẾT KẾ: Mô phỏng chiếc vé có đường cắt nét đứt và lỗ tròn xé ở hai cạnh.
 * ============================================================================
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

// Định nghĩa các tham số truyền vào cho thẻ
interface CouponCardProps {
  discount: string;      // Nội dung giảm giá (VD: Giảm 20%)
  subtitle: string;      // Mô tả phụ (VD: Áp dụng khách sạn 5 sao)
  expiry: string;        // Hạn sử dụng
  onSave?: () => void;   // Hàm gọi khi ấn nút "Lưu mã"
  isSaved?: boolean;     // Cờ hiển thị trạng thái đã lưu
}

export const CouponCard: React.FC<CouponCardProps> = ({ discount, subtitle, expiry, onSave, isSaved }) => {
  return (
    <View style={styles.card}>
      {/* Phía bên trái: Hiển thị Icon và Nội dung giảm giá */}
      <View style={styles.leftSection}>
        <View style={styles.iconContainer}>
          <Ionicons name="pricetag" size={24} color={Colors.primary} />
        </View>
        <View style={styles.textContent}>
          <Text style={styles.discountText}>{discount}</Text>
          <Text style={styles.subtitleText}>{subtitle}</Text>
          <Text style={styles.expiryText}>HSD: {expiry}</Text>
        </View>
      </View>
      
      {/* Phía bên phải: Hiển thị Nút Lưu */}
      <View style={styles.rightSection}>
        <TouchableOpacity 
          style={[styles.saveBtn, isSaved && styles.savedBtn]} 
          onPress={onSave}
          disabled={isSaved}
        >
          <Text style={[styles.saveBtnText, isSaved && styles.savedBtnText]}>
            {isSaved ? 'Đã lưu' : 'Lưu mã'}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Ticket Cutouts: 2 hình tròn đè lên trên và dưới của đường nét đứt 
          để tạo cảm giác vé bị đục lỗ/xé */}
      <View style={[styles.cutout, styles.cutoutTop]} />
      <View style={[styles.cutout, styles.cutoutBottom]} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#EAEBFF', // Soft Lavender
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    position: 'relative',
    overflow: 'hidden',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#D0D2FF',
    borderStyle: 'dashed',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  textContent: {
    flex: 1,
  },
  discountText: {
    ...Typography.h3,
    color: Colors.primary,
    marginBottom: 4,
  },
  subtitleText: {
    ...Typography.body2,
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  expiryText: {
    ...Typography.caption,
    color: Colors.light.textSecondary,
  },
  rightSection: {
    width: 90,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.pill,
  },
  savedBtn: {
    backgroundColor: Colors.light.border,
  },
  saveBtnText: {
    ...Typography.button,
    fontSize: 12,
    color: 'white',
  },
  savedBtnText: {
    color: Colors.light.textSecondary,
  },
  cutout: {
    position: 'absolute',
    right: 80,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FAFAFA', // Match screen background
  },
  cutoutTop: {
    top: -10,
  },
  cutoutBottom: {
    bottom: -10,
  },
});
