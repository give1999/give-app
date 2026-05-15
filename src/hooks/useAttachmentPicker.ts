import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import type { Attachment } from '@/src/types';
import { genId } from '@/src/lib/id';

async function copyToCache(uri: string, name: string): Promise<string> {
  const dest = `${FileSystem.cacheDirectory}attachments/${name}`;
  const dir = dest.substring(0, dest.lastIndexOf('/'));
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

export function useAttachmentPicker() {
  const pickImage = useCallback(async (): Promise<Attachment[]> => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Нет доступа', 'Разрешите доступ к фото в настройках');
        return [];
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.9,
      });

      if (result.canceled || !result.assets) return [];

      return Promise.all(result.assets.map(async (asset) => {
        const cachedUri = await copyToCache(asset.uri, asset.fileName ?? `${genId()}.jpg`);
        return {
          id: genId(),
          uri: cachedUri,
          type: 'image' as const,
          mimeType: asset.mimeType ?? 'image/jpeg',
          name: asset.fileName ?? asset.uri.split('/').pop() ?? 'photo.jpg',
          width: asset.width,
          height: asset.height,
        };
      }));
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось выбрать фото');
      return [];
    }
  }, []);

  const takePhoto = useCallback(async (): Promise<Attachment[]> => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Нет доступа', 'Разрешите доступ к камере в настройках');
        return [];
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (result.canceled || !result.assets) return [];

      return Promise.all(result.assets.map(async (asset) => {
        const cachedUri = await copyToCache(asset.uri, asset.fileName ?? `${genId()}.jpg`);
        return {
          id: genId(),
          uri: cachedUri,
          type: 'image' as const,
          mimeType: asset.mimeType ?? 'image/jpeg',
          name: asset.fileName ?? `camera_${Date.now()}.jpg`,
          width: asset.width,
          height: asset.height,
        };
      }));
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось сделать фото');
      return [];
    }
  }, []);

  const pickFile = useCallback(async (): Promise<Attachment[]> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets) return [];

      return Promise.all(result.assets.map(async (asset) => {
        const cachedUri = await copyToCache(asset.uri, asset.name);
        return {
          id: genId(),
          uri: cachedUri,
          type: 'file' as const,
          mimeType: asset.mimeType ?? 'application/octet-stream',
          name: asset.name,
          size: asset.size,
        };
      }));
    } catch (e: any) {
      Alert.alert('Ошибка', e?.message ?? 'Не удалось выбрать файл');
      return [];
    }
  }, []);

  return { pickImage, takePhoto, pickFile };
}
