import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../types';
import { AIDraftRecord } from '../services/ocrClient';
import { useTheme } from '../theme';

interface AIDraftReviewModalProps {
  visible: boolean;
  draft: AIDraftRecord | null;
  vehicle: Vehicle | null;
  currency: string;
  onClose: () => void;
  onConfirmSave: (draft: AIDraftRecord) => Promise<void>;
}

export const AIDraftReviewModal: React.FC<AIDraftReviewModalProps> = ({
  visible,
  draft,
  vehicle,
  currency,
  onClose,
  onConfirmSave,
}) => {
  const { theme, isDark } = useTheme();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState('');
  const [odometer, setOdometer] = useState('');
  const [merchant, setMerchant] = useState('');
  const [litres, setLitres] = useState('');
  const [pricePerLitre, setPricePerLitre] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const saveLockRef = useRef(false);

  useEffect(() => {
    if (draft && visible) {
      setTitle(draft.title || '');
      setDate(draft.date || new Date().toISOString().slice(0, 10));
      setAmount(draft.amount !== null && draft.amount !== undefined ? String(draft.amount) : '');
      setOdometer(
        draft.odometer !== null && draft.odometer !== undefined
          ? String(draft.odometer)
          : vehicle
          ? String(vehicle.currentOdometer)
          : ''
      );
      setMerchant(draft.merchant || '');
      setLitres(draft.litres !== null && draft.litres !== undefined ? String(draft.litres) : '');
      setPricePerLitre(
        draft.pricePerLitre !== null && draft.pricePerLitre !== undefined
          ? String(draft.pricePerLitre)
          : ''
      );
      setNotes(draft.notes || 'Created via FixMate AI Assistant');
      setIsSaving(false);
      saveLockRef.current = false;
    }
  }, [draft, visible, vehicle]);

  if (!draft || !vehicle) return null;

  const userSpecified = draft.userSpecifiedFields || [];
  const isUserProvided = (field: string) => userSpecified.includes(field);

  const handleSave = async () => {
    if (saveLockRef.current || isSaving) return; // Prevent double-tap race conditions

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive cost/amount.');
      return;
    }

    const parsedOdo = parseInt(odometer, 10);
    if (isNaN(parsedOdo) || parsedOdo <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive odometer reading.');
      return;
    }

    saveLockRef.current = true;
    setIsSaving(true);

    try {
      const stableDraftId = draft.draftId || `draft_${draft.recordType}_${vehicle.id}_${date.trim()}_${parsedAmount}_${parsedOdo}`;
      const updatedDraft: AIDraftRecord = {
        ...draft,
        draftId: stableDraftId,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        title: title.trim() || draft.title,
        date: date.trim() || draft.date,
        amount: parsedAmount,
        odometer: parsedOdo,
        merchant: merchant.trim() || draft.merchant,
        litres: parseFloat(litres) || null,
        pricePerLitre: parseFloat(pricePerLitre) || null,
        notes: notes.trim(),
        isReadyForConfirmation: true,
      };

      await onConfirmSave(updatedDraft);
      onClose();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save record.');
      saveLockRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalSheet, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View
            style={[
              styles.headerRow,
              { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
            ]}
          >
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconCircle, { backgroundColor: theme.colors.primaryMuted }]}>
                <Ionicons name="create-outline" size={20} color={theme.colors.primary} />
              </View>
              <View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                  Review AI {draft.recordType.toUpperCase()} Draft
                </Text>
                <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                  {vehicle.name} • Confirm before saving to SQLite
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isSaving}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form Scroll */}
          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Explanatory Notice */}
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: isDark ? 'rgba(37,99,235,0.1)' : '#EFF6FF',
                  borderColor: isDark ? 'rgba(37,99,235,0.25)' : '#BFDBFE',
                },
              ]}
            >
              <Ionicons name="information-circle" size={16} color={theme.colors.primary} />
              <Text style={[styles.noticeText, { color: theme.colors.textSecondary }]}>
                FixMate extracted these details from your prompt. Edit any fields below and tap Confirm to save.
              </Text>
            </View>

            {/* Title Field */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Item Title</Text>
                <View style={[styles.tagPill, isUserProvided('serviceType') ? styles.userTag : styles.defaultTag]}>
                  <Text style={styles.tagPillText}>
                    {isUserProvided('serviceType') ? 'User Input' : 'Inferred'}
                  </Text>
                </View>
              </View>
              <TextInput
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                    color: theme.colors.textPrimary,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Engine Oil & Filter Change"
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            {/* Date & Amount Row */}
            <View style={styles.formRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <View style={styles.labelRow}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Date</Text>
                  <View style={[styles.tagPill, isUserProvided('date') ? styles.userTag : styles.defaultTag]}>
                    <Text style={styles.tagPillText}>
                      {isUserProvided('date') ? 'User Input' : 'Today'}
                    </Text>
                  </View>
                </View>
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
                <View style={styles.labelRow}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Cost ({currency})
                  </Text>
                  <View style={[styles.tagPill, isUserProvided('amount') ? styles.userTag : styles.warningTag]}>
                    <Text style={styles.tagPillText}>
                      {isUserProvided('amount') ? 'User Input' : 'Required'}
                    </Text>
                  </View>
                </View>
                <TextInput
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                      color: theme.colors.primary,
                      fontWeight: '800',
                      fontSize: 15,
                    },
                  ]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Odometer & Merchant Row */}
            <View style={styles.formRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <View style={styles.labelRow}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Odometer (km)
                  </Text>
                  <View style={[styles.tagPill, isUserProvided('odometer') ? styles.userTag : styles.defaultTag]}>
                    <Text style={styles.tagPillText}>
                      {isUserProvided('odometer') ? 'User Input' : 'Current'}
                    </Text>
                  </View>
                </View>
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
                  placeholder="e.g. 45000"
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="number-pad"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <View style={styles.labelRow}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Garage / Station
                  </Text>
                </View>
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
                  placeholder="e.g. Toyota Lanka, Ceypetco"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Fuel Specific: Litres & Price / L */}
            {draft.recordType === 'fuel' && (
              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Litres</Text>
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
                    placeholder="e.g. 30.0"
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

            {/* Notes */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Notes</Text>
              <TextInput
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1',
                    color: theme.colors.textPrimary,
                  },
                ]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes..."
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleSave}
                disabled={isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator color="#0B0F19" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#0B0F19" />
                    <Text style={styles.confirmBtnText}>Confirm and save to SQLite</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.discardBtn, { borderColor: theme.colors.danger }]}
                onPress={onClose}
                disabled={isSaving}
              >
                <Text style={[styles.discardBtnText, { color: theme.colors.danger }]}>
                  Discard Draft
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    maxHeight: '90%',
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
    flex: 1,
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
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  inputGroup: {
    gap: 4,
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  tagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  userTag: {
    backgroundColor: 'rgba(37,99,235,0.15)',
  },
  defaultTag: {
    backgroundColor: 'rgba(100,116,139,0.15)',
  },
  warningTag: {
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  tagPillText: {
    fontSize: 9,
    fontWeight: '700',
  },
  inputBox: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  buttonGroup: {
    gap: 10,
    marginTop: 10,
    marginBottom: 20,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: {
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
