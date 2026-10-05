import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickImageFromGallery, takePhotoWithCamera } from '../services/fileStorage';
import { parseReceiptImage, ExtractedReceiptData } from '../services/ocrAssistant';
import { theme } from '../theme';

interface ReceiptPickerProps {
  receiptUri?: string;
  onImageSelected: (uri: string) => void;
  onRemoveImage: () => void;
  onOcrExtracted?: (data: ExtractedReceiptData) => void;
}

export const ReceiptPicker: React.FC<ReceiptPickerProps> = ({
  receiptUri,
  onImageSelected,
  onRemoveImage,
  onOcrExtracted,
}) => {
  const [scanning, setScanning] = useState(false);

  const handlePickGallery = async () => {
    const uri = await pickImageFromGallery();
    if (uri) {
      onImageSelected(uri);
      if (onOcrExtracted) {
        runOcr(uri);
      }
    }
  };

  const handleTakePhoto = async () => {
    const uri = await takePhotoWithCamera();
    if (uri) {
      onImageSelected(uri);
      if (onOcrExtracted) {
        runOcr(uri);
      }
    }
  };

  const runOcr = async (uri: string) => {
    try {
      setScanning(true);
      const data = await parseReceiptImage(uri);
      if (onOcrExtracted) {
        onOcrExtracted(data);
      }
    } catch (err) {
      console.warn('OCR error:', err);
    } finally {
      setScanning(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>RECEIPT / INVOICE PHOTO</Text>

      {receiptUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: receiptUri }} style={styles.previewImage} resizeMode="cover" />

          {scanning ? (
            <View style={styles.scanningOverlay}>
              <ActivityIndicator color={theme.colors.primary} size="small" />
              <Text style={styles.scanningText}>Analyzing Receipt with Smart OCR...</Text>
            </View>
          ) : (
            <View style={styles.previewActions}>
              {onOcrExtracted && (
                <TouchableOpacity
                  style={styles.ocrScanBtn}
                  onPress={() => runOcr(receiptUri)}
                >
                  <Ionicons name="scan-outline" size={14} color="#0B0F19" />
                  <Text style={styles.ocrScanBtnText}>Re-Scan OCR</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.removeBtn} onPress={onRemoveImage}>
                <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.buttonsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
            <Ionicons name="camera" size={18} color={theme.colors.primary} />
            <Text style={styles.actionBtnText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={handlePickGallery} activeOpacity={0.8}>
            <Ionicons name="images" size={18} color={theme.colors.secondary} />
            <Text style={styles.actionBtnText}>Choose Gallery</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surfaceHighlight,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  actionBtnText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  previewContainer: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.cardBorderActive,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(11, 15, 25, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanningText: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  previewActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ocrScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ocrScanBtnText: {
    color: '#0B0F19',
    fontSize: 11,
    fontWeight: '700',
  },
  removeBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
});
