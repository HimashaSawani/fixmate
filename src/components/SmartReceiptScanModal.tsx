import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle, FuelEntry, ServiceRecord, ExpenseRecord } from '../types';
import { pickImageFromGallery, takePhotoWithCamera } from '../services/fileStorage';
import { scanReceiptWithOcr, ExtractedReceiptResult } from '../services/ocrClient';
import { useTheme } from '../theme';

interface SmartReceiptScanModalProps {
  visible: boolean;
  vehicle: Vehicle | null;
  currency: string;
  onClose: () => void;
  onSaveFuel: (data: Omit<FuelEntry, 'id' | 'createdAt'>) => Promise<void>;
  onSaveService: (data: Omit<ServiceRecord, 'id' | 'createdAt'>) => Promise<void>;
  onSaveExpense: (data: Omit<ExpenseRecord, 'id' | 'createdAt'>) => Promise<void>;
}

type RecordCategory = 'fuel' | 'service' | 'expense';

export const SmartReceiptScanModal: React.FC<SmartReceiptScanModalProps> = ({
  visible,
  vehicle,
  currency,
  onClose,
  onSaveFuel,
  onSaveService,
  onSaveExpense,
}) => {
  const { theme, isDark } = useTheme();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<'pick' | 'review'>('pick');

  // Form State
  const [category, setCategory] = useState<RecordCategory>('fuel');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState('');
  const [litres, setLitres] = useState('');
  const [pricePerLitre, setPricePerLitre] = useState('');
  const [odometer, setOdometer] = useState(vehicle ? String(vehicle.currentOdometer) : '');
  const [serviceType, setServiceType] = useState('oil_change');
  const [notes, setNotes] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setImageUri(null);
    setIsScanning(false);
    setScanStep('pick');
    setCategory('fuel');
    setMerchant('');
    setDate(new Date().toISOString().slice(0, 10));
    setTotalAmount('');
    setLitres('');
    setPricePerLitre('');
    setOdometer(vehicle ? String(vehicle.currentOdometer) : '');
    setNotes('');
    setWarnings([]);
    setConfidence(0);
    setIsSaving(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const processImageOcr = async (uri: string) => {
    setImageUri(uri);
    setIsScanning(true);
    setScanStep('review');

    try {
      const result: ExtractedReceiptResult = await scanReceiptWithOcr(uri);
      
      setCategory(result.category);
      setMerchant(result.merchant || '');
      setDate(result.date || new Date().toISOString().slice(0, 10));
      setTotalAmount(result.total !== null && result.total !== undefined ? String(result.total) : '');
      setLitres(result.litres !== null && result.litres !== undefined ? String(result.litres) : '');
      setPricePerLitre(result.pricePerLitre !== null && result.pricePerLitre !== undefined ? String(result.pricePerLitre) : '');
      setNotes(result.notes || '');
      setWarnings(result.warnings || []);
      setConfidence(result.confidence || 0.8);
    } catch (err: any) {
      console.warn('OCR processing warning:', err);
      setWarnings(['Could not reach OCR engine. Please verify fields manually.']);
    } finally {
      setIsScanning(false);
    }
  };

  const handlePickFromGallery = async () => {
    const uri = await pickImageFromGallery();
    if (uri) {
      processImageOcr(uri);
    }
  };

  const handleTakePhoto = async () => {
    const uri = await takePhotoWithCamera();
    if (uri) {
      processImageOcr(uri);
    }
  };

  // Confirm and Save to SQLite database
  const handleConfirmSave = async () => {
    if (!vehicle) {
      Alert.alert('Error', 'No active vehicle selected.');
      return;
    }

    const totalNum = parseFloat(totalAmount);
    if (isNaN(totalNum) || totalNum <= 0) {
      Alert.alert('Required Field', 'Please enter a valid total amount for this receipt.');
      return;
    }

    setIsSaving(true);
    try {
      if (category === 'fuel') {
        const litresNum = parseFloat(litres) || 0;
        const priceNum = parseFloat(pricePerLitre) || (litresNum > 0 ? totalNum / litresNum : 0);
        const odoNum = parseInt(odometer, 10) || vehicle.currentOdometer;

        await onSaveFuel({
          vehicleId: vehicle.id,
          date: date || new Date().toISOString().slice(0, 10),
          odometer: odoNum,
          litres: litresNum,
          pricePerLitre: priceNum,
          totalCost: totalNum,
          fuelStation: merchant || 'Fuel Station',
          isFullTank: true,
          notes: notes ? `${notes} (Scanned via FixMate OCR)` : 'Scanned via FixMate OCR',
          receiptUri: imageUri || undefined,
        });
      } else if (category === 'service') {
        const odoNum = parseInt(odometer, 10) || vehicle.currentOdometer;
        await onSaveService({
          vehicleId: vehicle.id,
          date: date || new Date().toISOString().slice(0, 10),
          odometer: odoNum,
          serviceType: serviceType,
          title: merchant ? `Service at ${merchant}` : 'Vehicle Maintenance Service',
          garageName: merchant || 'Auto Care Center',
          labourCost: 0,
          partsCost: totalNum,
          totalCost: totalNum,
          partsList: '',
          notes: notes ? `${notes} (Scanned via FixMate OCR)` : 'Scanned via FixMate OCR',
          receiptUri: imageUri || undefined,
        });
      } else {
        await onSaveExpense({
          vehicleId: vehicle.id,
          date: date || new Date().toISOString().slice(0, 10),
          category: 'other',
          title: merchant ? `Expense: ${merchant}` : 'General Vehicle Expense',
          amount: totalNum,
          vendor: merchant || 'Vendor',
          notes: notes ? `${notes} (Scanned via FixMate OCR)` : 'Scanned via FixMate OCR',
          receiptUri: imageUri || undefined,
        });
      }

      Alert.alert('Success ✨', 'Receipt record verified and saved to your garage log.');
      handleClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save record.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalSheet, { backgroundColor: theme.colors.background }]}>
          {/* Top Bar */}
          <View
            style={[
              styles.headerRow,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
            ]}
          >
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconCircle, { backgroundColor: theme.colors.primaryMuted }]}>
                <Ionicons name="scan" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  Smart Receipt OCR
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  {vehicle?.name || 'Vehicle'} • Extract & Verify Entry
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Body Content */}
          {scanStep === 'pick' ? (
            <View style={styles.pickContainer}>
              <View style={[styles.scanIntroCard, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="document-text-outline" size={48} color={theme.colors.primary} />
                <Text style={[styles.introTitle, { color: theme.colors.textPrimary }]}>
                  Scan Receipt or Invoice
                </Text>
                <Text style={[styles.introSub, { color: theme.colors.textSecondary }]}>
                  Capture fuel receipts, service bills, or parts invoices. FixMate extracts merchant, date, litres, and totals automatically.
                </Text>
              </View>

              <View style={styles.pickButtonsContainer}>
                <TouchableOpacity
                  style={[styles.primaryPickBtn, { backgroundColor: theme.colors.primary }]}
                  onPress={handleTakePhoto}
                  activeOpacity={0.85}
                >
                  <Ionicons name="camera" size={22} color="#0B0F19" />
                  <Text style={styles.primaryPickBtnText}>Take Photo with Camera</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.secondaryPickBtn,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                    },
                  ]}
                  onPress={handlePickFromGallery}
                  activeOpacity={0.85}
                >
                  <Ionicons name="images-outline" size={20} color={theme.colors.textPrimary} />
                  <Text style={[styles.secondaryPickBtnText, { color: theme.colors.textPrimary }]}>
                    Choose from Gallery
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {/* Receipt Preview Thumbnail & Scanning State */}
              <View style={styles.previewRow}>
                {imageUri && (
                  <View style={styles.thumbnailWrapper}>
                    <Image source={{ uri: imageUri }} style={styles.thumbnailImage} resizeMode="cover" />
                  </View>
                )}

                <View style={styles.previewMeta}>
                  {isScanning ? (
                    <View style={styles.scanningState}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                      <Text style={[styles.scanningLabel, { color: theme.colors.primary }]}>
                        Running Smart OCR Engine...
                      </Text>
                      <Text style={[styles.scanningSub, { color: theme.colors.textSecondary }]}>
                        Analyzing text & extracting figures
                      </Text>
                    </View>
                  ) : (
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="checkmark-circle" size={18} color={theme.colors.secondary} />
                        <Text style={[styles.metaTitle, { color: theme.colors.textPrimary }]}>
                          Extracted ({Math.round(confidence * 100)}% Match)
                        </Text>
                      </View>
                      <Text style={[styles.metaSub, { color: theme.colors.textSecondary }]}>
                        Please verify the fields below before saving.
                      </Text>
                      <TouchableOpacity
                        style={styles.rescanLink}
                        onPress={() => setScanStep('pick')}
                      >
                        <Text style={[styles.rescanLinkText, { color: theme.colors.primary }]}>
                          Change Photo / Re-take
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              {/* Warnings Callout Banner */}
              {warnings.length > 0 && !isScanning && (
                <View
                  style={[
                    styles.warningCard,
                    {
                      backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB',
                      borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A',
                    },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Ionicons name="warning-outline" size={16} color={theme.colors.warning} />
                    <Text style={[styles.warningTitle, { color: theme.colors.warning }]}>
                      Please Review Extracted Details
                    </Text>
                  </View>
                  {warnings.map((w, idx) => (
                    <Text key={idx} style={[styles.warningText, { color: theme.colors.textSecondary }]}>
                      • {w}
                    </Text>
                  ))}
                </View>
              )}

              {/* Category Selector Tabs */}
              <Text style={[styles.fieldSectionHeader, { color: theme.colors.textMuted }]}>
                RECORD CATEGORY
              </Text>
              <View style={styles.categoryTabsRow}>
                {(['fuel', 'service', 'expense'] as RecordCategory[]).map((cat) => {
                  const isSelected = category === cat;
                  const label =
                    cat === 'fuel' ? '⛽ Fuel' : cat === 'service' ? '🔧 Service' : '💰 Expense';
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catTab,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primaryMuted
                            : isDark
                            ? theme.colors.surfaceHighlight
                            : '#F1F5F9',
                          borderColor: isSelected ? theme.colors.primary : 'transparent',
                        },
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.catTabText,
                          {
                            color: isSelected ? theme.colors.primary : theme.colors.textSecondary,
                            fontWeight: isSelected ? '800' : '600',
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Editable Fields Form */}
              <View style={styles.formSection}>
                {/* Merchant */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    {category === 'fuel' ? 'Fuel Station / Merchant' : 'Merchant / Garage'}
                  </Text>
                  <TextInput
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    value={merchant}
                    onChangeText={setMerchant}
                    placeholder="e.g. CEYPETCO Havelock, Toyota Lanka"
                    placeholderTextColor={theme.colors.textMuted}
                  />
                </View>

                {/* Date & Total Row */}
                <View style={styles.formRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Date</Text>
                    <TextInput
                      style={[
                        styles.inputBox,
                        {
                          backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                          color: theme.colors.textPrimary,
                        },
                      ]}
                      value={date}
                      onChangeText={setDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={theme.colors.textMuted}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      Total Amount ({currency})
                    </Text>
                    <TextInput
                      style={[
                        styles.inputBox,
                        {
                          backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                          color: theme.colors.primary,
                          fontWeight: '800',
                          fontSize: 16,
                        },
                      ]}
                      value={totalAmount}
                      onChangeText={setTotalAmount}
                      placeholder="0.00"
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                {/* Fuel-specific: Litres & Price / L */}
                {category === 'fuel' && (
                  <View style={styles.formRow}>
                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                        Litres (L)
                      </Text>
                      <TextInput
                        style={[
                          styles.inputBox,
                          {
                            backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                            color: theme.colors.textPrimary,
                          },
                        ]}
                        value={litres}
                        onChangeText={setLitres}
                        placeholder="e.g. 35.00"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <View style={[styles.inputGroup, { flex: 1 }]}>
                      <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                        Price / L ({currency})
                      </Text>
                      <TextInput
                        style={[
                          styles.inputBox,
                          {
                            backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                            color: theme.colors.textPrimary,
                          },
                        ]}
                        value={pricePerLitre}
                        onChangeText={setPricePerLitre}
                        placeholder="e.g. 370.00"
                        placeholderTextColor={theme.colors.textMuted}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                )}

                {/* Odometer */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Current Odometer (km)
                  </Text>
                  <TextInput
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                        color: theme.colors.textPrimary,
                      },
                    ]}
                    value={odometer}
                    onChangeText={setOdometer}
                    placeholder="e.g. 42350"
                    placeholderTextColor={theme.colors.textMuted}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Confirmation Action Buttons */}
              <View style={styles.confirmButtonsRow}>
                <TouchableOpacity
                  style={[
                    styles.confirmSaveBtn,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  onPress={handleConfirmSave}
                  disabled={isSaving || isScanning}
                  activeOpacity={0.85}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#0B0F19" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done" size={18} color="#0B0F19" />
                      <Text style={styles.confirmSaveBtnText}>Confirm & Save Record</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.discardBtn, { borderColor: theme.colors.danger }]}
                  onPress={handleClose}
                  disabled={isSaving}
                >
                  <Text style={[styles.discardBtnText, { color: theme.colors.danger }]}>
                    Discard
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  pickContainer: {
    padding: 20,
    alignItems: 'center',
  },
  scanIntroCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
  },
  introSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  pickButtonsContainer: {
    width: '100%',
    gap: 12,
  },
  primaryPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryPickBtnText: {
    color: '#0B0F19',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryPickBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  previewRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  thumbnailWrapper: {
    width: 70,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  previewMeta: {
    flex: 1,
  },
  scanningState: {
    gap: 4,
  },
  scanningLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  scanningSub: {
    fontSize: 11,
  },
  metaTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  metaSub: {
    fontSize: 11,
    marginTop: 2,
  },
  rescanLink: {
    marginTop: 6,
  },
  rescanLinkText: {
    fontSize: 11,
    fontWeight: '700',
  },
  warningCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  warningTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  warningText: {
    fontSize: 11,
    lineHeight: 16,
  },
  fieldSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  categoryTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  catTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTabText: {
    fontSize: 12,
  },
  formSection: {
    gap: 12,
    marginBottom: 18,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputGroup: {
    gap: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
  },
  confirmButtonsRow: {
    gap: 10,
    marginBottom: 20,
  },
  confirmSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmSaveBtnText: {
    color: '#0B0F19',
    fontSize: 14,
    fontWeight: '800',
  },
  discardBtn: {
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  discardBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
