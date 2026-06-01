import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Platform, Alert, ActivityIndicator, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import { Colors, Spacing, Typography, BorderRadius, Shadows } from '../../constants/theme';

export default function ReviewScreen() {
  const router = useRouter();
  const { id: bookingId } = useLocalSearchParams();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const handlePickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Quyền truy cập', 'Chúng tôi cần quyền truy cập vào thư viện ảnh của bạn để chọn ảnh!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets) {
      const selectedUris = result.assets.map((asset) => asset.uri);
      setImages((prev) => [...prev, ...selectedUris].slice(0, 5));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const createFileFromUri = (uri: string) => {
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
    return {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: filename,
      type,
    } as any;
  };


  const reviewMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('bookingId', bookingId as string);
      formData.append('rating', rating.toString());
      if (comment.trim()) {
        formData.append('comment', comment.trim());
      }

      images.forEach((uri) => {
        const fileObj = createFileFromUri(uri);
        formData.append('files', fileObj);
      });

      return await apiClient.post('/reviews', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    onSuccess: () => {
      Alert.alert('Thành công', 'Đánh giá đã được gửi thành công!', [
        { text: 'Đóng', onPress: () => router.back() }
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Gửi thất bại', error.message || 'Đã xảy ra lỗi khi gửi đánh giá.');
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá chuyến đi</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.question}>Trải nghiệm của bạn như thế nào?</Text>
        
        {/* Star Rating */}
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Ionicons 
                name={star <= rating ? "star" : "star-outline"} 
                size={48} 
                color={Colors.primary} 
                style={styles.starIcon} 
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Comment Input */}
        <Text style={styles.label}>Nhận xét của bạn</Text>
        <TextInput
          style={styles.input}
          placeholder="Hãy chia sẻ trải nghiệm của bạn..."
          placeholderTextColor="#B0B0B0"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          value={comment}
          onChangeText={setComment}
        />

        {/* Real vacation photo upload */}
        <Text style={[styles.label, { marginTop: Spacing.md }]}>Ảnh chụp thực tế kỳ nghỉ (Tối đa 5 ảnh)</Text>
        <View style={styles.imageUploadRow}>
          {images.map((uri, index) => (
            <View key={index} style={styles.thumbnailContainer}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => handleRemoveImage(index)}>
                <Ionicons name="close-circle" size={20} color="red" />
              </TouchableOpacity>
            </View>
          ))}
          {images.length < 5 && (
            <TouchableOpacity style={styles.addImageBtn} onPress={handlePickImages}>
              <Ionicons name="camera-outline" size={28} color={Colors.primary} />
              <Text style={styles.addImageText}>Thêm ảnh</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity 
          style={[styles.submitBtn, reviewMutation.isPending && styles.submitBtnDisabled]} 
          disabled={reviewMutation.isPending}
          onPress={() => reviewMutation.mutate()}
        >
          {reviewMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitBtnText}>GỬI ĐÁNH GIÁ</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  headerTitle: { ...Typography.h3, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  content: { padding: Spacing.lg, flex: 1 },
  question: { ...Typography.h2, textAlign: 'center', marginTop: Spacing.xl, marginBottom: Spacing.lg, color: Colors.light.text },
  starsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: Spacing.xxl },
  starIcon: { marginHorizontal: Spacing.xs },
  label: { ...Typography.body1, fontWeight: '600', marginBottom: Spacing.sm, color: Colors.light.text },
  input: { backgroundColor: 'white', borderWidth: 1, borderColor: Colors.light.border, borderRadius: BorderRadius.md, padding: Spacing.md, ...Typography.body1, height: 120, ...Shadows.sm },
  submitBtn: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.pill, alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.lg },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { ...Typography.button, color: 'white', fontWeight: '700' },
  imageUploadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    position: 'relative',
    ...Shadows.sm,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  addImageBtn: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  addImageText: {
    fontSize: 10,
    color: Colors.light.textSecondary,
    marginTop: 4,
    fontWeight: '700',
  },
});
