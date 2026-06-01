import React from 'react';
import { Image as RNImage, ImageProps as RNImageProps, ImageStyle, StyleProp } from 'react-native';

interface SafeImageProps extends Omit<RNImageProps, 'style' | 'onError'> {
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none';
  transition?: number;
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
  onError?: (event: { error: string }) => void;
}

export const Image: React.FC<SafeImageProps> = ({
  source,
  style,
  contentFit,
  transition,
  cachePolicy,
  onError,
  ...props
}) => {
  // Map contentFit to standard React Native resizeMode
  let resizeMode: 'cover' | 'contain' | 'stretch' | 'center' = 'cover';
  if (contentFit === 'contain') resizeMode = 'contain';
  if (contentFit === 'fill') resizeMode = 'stretch';
  if (contentFit === 'none') resizeMode = 'center';

  const handleOnError = (e: any) => {
    if (onError) {
      const errorMsg = e.nativeEvent?.error || 'Failed to load image';
      onError({ error: errorMsg });
    }
  };

  return (
    <RNImage
      source={source}
      style={style as any}
      resizeMode={resizeMode}
      onError={handleOnError}
      {...props}
    />
  );
};
