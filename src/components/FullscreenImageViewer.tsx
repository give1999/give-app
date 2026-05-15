import React from 'react';
import { TouchableOpacity, Image, Modal, StyleSheet, useWindowDimensions } from 'react-native';

interface FullscreenImageViewerProps {
  uri: string | null;
  onClose: () => void;
}

export default function FullscreenImageViewer({ uri, onClose }: FullscreenImageViewerProps) {
  const { width } = useWindowDimensions();

  return (
    <Modal visible={uri !== null} transparent animationType="fade">
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {uri && (
          <Image
            source={{ uri }}
            style={[styles.image, { width, height: width }]}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
