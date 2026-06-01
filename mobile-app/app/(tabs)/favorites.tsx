/**
 * ============================================================================
 * TÊN FILE: app/(tabs)/favorites.tsx
 * MỤC ĐÍCH: Màn hình Yêu thích (Favorites Screen).
 * CHỨC NĂNG CHÍNH:
 * - Hiển thị danh sách các phòng/khách sạn đã thả tim bằng `FlatList`.
 * - Các `PropertyCard` được truyền cờ `isFavorite={true}` để bật icon Trái tim.
 * ============================================================================
 */
import React from 'react';
import { View, Text, StyleSheet, Platform, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { PropertyCard } from '../../components/PropertyCard';
import { useRouter } from 'expo-router';
import { useFavoriteStore } from '../../store/useFavoriteStore';

export default function FavoritesScreen() {
  const router = useRouter();
  const { favorites, toggleFavorite } = useFavoriteStore();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Yêu thích của bạn</Text>
      
      {favorites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-dislike-outline" size={64} color={Colors.light.border} />
          <Text style={styles.emptyText}>Bạn chưa lưu mục yêu thích nào.</Text>
          <TouchableOpacity style={styles.exploreButton} onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.exploreButtonText}>Khám phá ngay</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PropertyCard 
              property={item} 
              isFavorite={true}
              onPress={() => router.push(`/room/${item.id}` as any)}
              onFavoritePress={() => toggleFavorite(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  title: { ...Typography.h1, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', marginVertical: Spacing.md, color: Colors.primary },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  emptyText: { ...Typography.body1, color: Colors.light.textSecondary, marginTop: Spacing.md, textAlign: 'center' },
  exploreButton: { marginTop: Spacing.xl, backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: 12, borderRadius: BorderRadius.pill },
  exploreButtonText: { ...Typography.button, color: 'white' },
});
