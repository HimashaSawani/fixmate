import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

export async function pickImageFromGallery(): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Photo library permission is required to select receipts.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return await saveImageLocally(result.assets[0].uri);
    }
    return null;
  } catch (err) {
    console.error('Error picking image:', err);
    return null;
  }
}

export async function takePhotoWithCamera(): Promise<string | null> {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Camera permission is required to capture receipts.');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return await saveImageLocally(result.assets[0].uri);
    }
    return null;
  } catch (err) {
    console.error('Error taking photo:', err);
    return null;
  }
}

export async function saveImageLocally(sourceUri: string): Promise<string> {
  try {
    const fileName = `fixmate_receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const docDir = FileSystem.documentDirectory || '';
    const destPath = `${docDir}${fileName}`;

    await FileSystem.copyAsync({
      from: sourceUri,
      to: destPath,
    });

    return destPath;
  } catch (err) {
    console.warn('Failed to copy image to documents dir, using source uri:', err);
    return sourceUri;
  }
}

export async function deleteLocalImage(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch (err) {
    console.warn('Failed to delete image:', err);
  }
}
