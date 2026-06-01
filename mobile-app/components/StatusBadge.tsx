import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';

export type BookingStatus = 'upcoming' | 'completed' | 'cancelled';

interface StatusBadgeProps {
  status: BookingStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let backgroundColor = '';
  let textColor = '';
  let label = '';

  switch (status) {
    case 'upcoming':
      backgroundColor = '#E3F2FD'; // Light Blue
      textColor = '#1976D2'; // Dark Blue
      label = 'Sắp đi';
      break;
    case 'completed':
      backgroundColor = '#E8F5E9'; // Light Green
      textColor = Colors.light.success;
      label = 'Đã hoàn thành';
      break;
    case 'cancelled':
      backgroundColor = '#FFEBEE'; // Light Red
      textColor = Colors.light.error;
      label = 'Đã hủy';
      break;
  }

  return (
    <View style={[styles.badge, { backgroundColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
    alignSelf: 'flex-start',
  },
  text: {
    ...Typography.caption,
    fontWeight: '600',
  },
});
