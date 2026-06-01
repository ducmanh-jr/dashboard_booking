/**
 * ============================================================================
 * TÊN FILE: components/SettingRow.tsx
 * MỤC ĐÍCH: Component tái sử dụng hiển thị 1 dòng cài đặt/liên kết.
 * Dùng trong màn hình Chỉnh sửa hồ sơ (Edit Profile).
 * ============================================================================
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../constants/theme';

interface SettingRowProps {
  icon: string;            // Tên icon Ionicons (VD: 'mail-outline')
  label: string;           // Nội dung bên trái (VD: 'Email: kiet***@gmail.com')
  actionLabel?: string;    // Chữ trên nút bấm bên phải (VD: 'Liên kết')
  onAction?: () => void;   // Hàm gọi khi bấm nút
  showBorder?: boolean;    // Hiển thị đường kẻ dưới hay không
}

export const SettingRow: React.FC<SettingRowProps> = ({
  icon, label, actionLabel, onAction, showBorder = true,
}) => {
  return (
    <View style={[styles.row, showBorder && styles.rowBorder]}>
      {/* Icon + Nội dung */}
      <View style={styles.leftContent}>
        <Ionicons name={icon as any} size={20} color={Colors.primary} style={styles.icon} />
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>

      {/* Nút hành động bên phải */}
      {actionLabel && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.sm,
  },
  icon: {
    marginRight: Spacing.sm,
  },
  label: {
    ...Typography.body1,
    color: Colors.light.text,
    flex: 1,
  },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  actionText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
});
