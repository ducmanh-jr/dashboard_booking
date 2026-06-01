/**
 * ============================================================================
 * TÊN FILE: app/searchModal.tsx
 * MỤC ĐÍCH: Màn hình Tìm kiếm nâng cao (Full Screen Modal).
 * CHỨC NĂNG CHÍNH:
 * - Ghi nhận trạng thái bộ lọc từ Zustand (`useSearchStore`).
 * - Chọn địa điểm, chọn dải ngày bằng lịch `react-native-calendars`.
 * - Tự động đổ màu băng ngang cho dải ngày được chọn (Period Marking).
 * - Chọn số khách, số phòng bằng các nút Stepper (+/-).
 * ============================================================================
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../constants/theme';
import { useSearchStore } from '../store/useSearchStore';

export default function SearchModalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location, checkInDate, checkOutDate, guests, setLocation, setDates, setGuests } = useSearchStore();

  const [activeSection, setActiveSection] = useState<'location' | 'dates' | 'guests'>('location');

  // Local state for calendar marking
  const getMarkedDates = () => {
    let marked: any = {};
    if (checkInDate) {
      marked[checkInDate] = { startingDay: true, color: Colors.primary, textColor: 'white' };
    }

    if (checkInDate && checkOutDate && checkInDate < checkOutDate) {
      marked[checkOutDate] = { endingDay: true, color: Colors.primary, textColor: 'white' };

      // Fill dates in between
      let start = new Date(checkInDate);
      let end = new Date(checkOutDate);
      let current = new Date(start);
      current.setDate(current.getDate() + 1);

      while (current < end) {
        const dateString = current.toISOString().split('T')[0];
        marked[dateString] = { color: '#E0E0FF', textColor: Colors.primary };
        current.setDate(current.getDate() + 1);
      }
    } else if (checkInDate && checkOutDate && checkInDate === checkOutDate) {
      marked[checkInDate] = { startingDay: true, endingDay: true, color: Colors.primary, textColor: 'white' };
    }
    return marked;
  };

  const handleDayPress = (day: any) => {
    if (!checkInDate || (checkInDate && checkOutDate)) {
      setDates(day.dateString, '');
    } else {
      if (day.dateString > checkInDate) {
        setDates(checkInDate, day.dateString);
        setTimeout(() => setActiveSection('guests'), 300); // Auto-flow to Guests
      } else if (day.dateString < checkInDate) {
        setDates(day.dateString, '');
      } else {
        setDates(checkInDate, checkInDate);
        setTimeout(() => setActiveSection('guests'), 300); // Auto-flow to Guests
      }
    }
  };

  const locations = ['Hạ Long', 'Đà Nẵng', 'Phú Quốc', 'Nha Trang', 'Đà Lạt'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tìm kiếm</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* 1. Location */}
        <TouchableOpacity
          style={[styles.section, activeSection === 'location' && styles.sectionActive]}
          onPress={() => setActiveSection('location')}
          activeOpacity={1}
        >
          <Text style={styles.sectionTitle}>Địa điểm</Text>
          {activeSection === 'location' ? (
            <View>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={20} color={Colors.light.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Bạn muốn đi đâu?"
                  onSubmitEditing={() => {
                    if (location.trim() !== '') {
                      setActiveSection('dates');
                    }
                  }}
                  returnKeyType="next"
                />
              </View>
              <View style={styles.pillsContainer}>
                {locations.map(loc => (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.pill, location === loc && styles.pillActive]}
                    onPress={() => {
                      setLocation(loc);
                      setTimeout(() => setActiveSection('dates'), 300); // Auto-flow to Dates
                    }}
                  >
                    <Text style={[styles.pillText, location === loc && styles.pillTextActive]}>{loc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <Text style={styles.sectionSummary}>{location || 'Chọn địa điểm'}</Text>
          )}
        </TouchableOpacity>

        {/* 2. Dates */}
        <TouchableOpacity
          style={[styles.section, activeSection === 'dates' && styles.sectionActive]}
          onPress={() => setActiveSection('dates')}
          activeOpacity={1}
        >
          <Text style={styles.sectionTitle}>Ngày đi - Ngày về</Text>
          {activeSection === 'dates' ? (
            <Calendar
              minDate={new Date().toISOString().split('T')[0]}
              markingType={'period'}
              markedDates={getMarkedDates()}
              onDayPress={handleDayPress}
              theme={{
                todayTextColor: Colors.primary,
                arrowColor: Colors.primary,
              }}
            />
          ) : (
            <Text style={styles.sectionSummary}>
              {checkInDate ? `${checkInDate} đến ${checkOutDate || '...'}` : 'Chọn ngày'}
            </Text>
          )}
        </TouchableOpacity>

        {/* 3. Guests */}
        <TouchableOpacity
          style={[styles.section, activeSection === 'guests' && styles.sectionActive]}
          onPress={() => setActiveSection('guests')}
          activeOpacity={1}
        >
          <Text style={styles.sectionTitle}>Khách & Phòng</Text>
          {activeSection === 'guests' ? (
            <View>
              <Stepper
                label="Người lớn"
                sublabel="Từ 13 tuổi trở lên"
                value={guests.adults}
                onChange={(v) => setGuests({ adults: v })}
              />
              <View style={styles.divider} />
              <Stepper
                label="Trẻ em"
                sublabel="Dưới 13 tuổi"
                value={guests.children}
                onChange={(v) => setGuests({ children: v })}
              />
              <View style={styles.divider} />
              <Stepper
                label="Phòng"
                value={guests.rooms}
                onChange={(v) => setGuests({ rooms: v })}
              />
            </View>
          ) : (
            <Text style={styles.sectionSummary}>
              {guests.adults + guests.children} khách, {guests.rooms} phòng
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg }]}>
        <TouchableOpacity style={styles.clearBtn} onPress={() => useSearchStore.getState().resetSearch()}>
          <Text style={styles.clearText}>Xóa tất cả</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.searchBtn} onPress={() => {
          // Validation: Ensure location is not empty
          if (!location || location.trim() === '') {
            Alert.alert('Thông báo', 'Vui lòng nhập địa điểm');
            setActiveSection('location');
            return;
          }

          router.back();
          // Wait for modal to close before pushing
          setTimeout(() => {
            router.push('/(tabs)/search' as any);
          }, 300);
        }}>
          <Ionicons name="search" size={20} color="white" />
          <Text style={styles.searchBtnText}>Tìm kiếm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Stepper({ label, sublabel, value, onChange }: { label: string, sublabel?: string, value: number, onChange: (val: number) => void }) {
  return (
    <View style={styles.stepperContainer}>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepperLabel}>{label}</Text>
        {sublabel && <Text style={styles.stepperSublabel}>{sublabel}</Text>}
      </View>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          style={[styles.stepperBtn, value <= 0 && { borderColor: '#E0E0E0' }]}
          onPress={() => value > 0 && onChange(value - 1)}
          disabled={value <= 0}
        >
          <Ionicons name="remove" size={20} color={value <= 0 ? '#E0E0E0' : Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity style={styles.stepperBtn} onPress={() => onChange(value + 1)}>
          <Ionicons name="add" size={20} color={Colors.light.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, backgroundColor: 'white' },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#FAFAFA' },
  headerTitle: { ...Typography.h3, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  scroll: { padding: Spacing.md },
  section: { backgroundColor: 'white', borderRadius: BorderRadius.xl, padding: Spacing.lg, marginBottom: Spacing.md, ...Shadows.sm },
  sectionActive: { ...Shadows.md },
  sectionTitle: { ...Typography.h2, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', color: Colors.light.text, marginBottom: Spacing.sm },
  sectionSummary: { ...Typography.body1, color: Colors.light.textSecondary },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFA', borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.light.border },
  searchInput: { flex: 1, marginLeft: Spacing.sm, ...Typography.body1 },
  pillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  pill: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.pill, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: 'white' },
  pillActive: { backgroundColor: Colors.secondary, borderColor: Colors.primary },
  pillText: { ...Typography.body2, color: Colors.light.text },
  pillTextActive: { color: Colors.primary, fontWeight: '700' },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  stepperLabel: { ...Typography.body1, color: Colors.light.text, fontWeight: '600' },
  stepperSublabel: { ...Typography.caption, color: Colors.light.textSecondary, marginTop: 2 },
  stepperControls: { flexDirection: 'row', alignItems: 'center' },
  stepperBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.light.border, justifyContent: 'center', alignItems: 'center' },
  stepperValue: { width: 40, textAlign: 'center', ...Typography.body1, fontWeight: '700' },
  divider: { height: 1, backgroundColor: Colors.light.border, marginVertical: Spacing.sm },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: Colors.light.border },
  clearBtn: { padding: Spacing.sm },
  clearText: { ...Typography.body1, color: Colors.light.textSecondary, textDecorationLine: 'underline' },
  searchBtn: { flexDirection: 'row', backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: BorderRadius.md, alignItems: 'center' },
  searchBtnText: { ...Typography.button, color: 'white', marginLeft: Spacing.sm },
});
