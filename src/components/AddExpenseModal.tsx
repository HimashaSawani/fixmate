import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseRecord, ExpenseCategory, Vehicle } from '../types';
import { ReceiptPicker } from './ReceiptPicker';
import { ExtractedReceiptData } from '../services/ocrAssistant';
import { theme } from '../theme';

interface AddExpenseModalProps {
  visible: boolean;
  vehicle: Vehicle | null;
  currency: string;
  onClose: () => void;
  onSave: (expense: ExpenseRecord) => Promise<void>;
}

const expenseCategories: { category: ExpenseCategory; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { category: 'repair', label: 'Repair', icon: 'hammer-outline', color: '#F59E0B' },
  { category: 'insurance', label: 'Insurance', icon: 'shield-checkmark-outline', color: '#8B5CF6' },
  { category: 'registration', label: 'Registration / Tax', icon: 'document-text-outline', color: '#EC4899' },
  { category: 'accessories', label: 'Accessories', icon: 'cart-outline', color: '#06B6D4' },
  { category: 'parking_tolls', label: 'Parking & Tolls', icon: 'car-outline', color: '#0EA5E9' },
  { category: 'other', label: 'Other', icon: 'receipt-outline', color: '#64748B' },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  visible,
  vehicle,
  currency,
  onClose,
  onSave,
}) => {
  const [category, setCategory] = useState<ExpenseCategory>('repair');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (vehicle && visible) {
      setOdometer(vehicle.currentOdometer.toString());
      setDate(new Date().toISOString().slice(0, 10));
      setTitle('');
      setAmount('');
      setVendor('');
      setNotes('');
      setReceiptUri(undefined);
    }
  }, [vehicle, visible]);

  const handleOcrExtracted = (data: ExtractedReceiptData) => {
    if (data.merchantName) setVendor(data.merchantName);
    if (data.totalAmount) setAmount(data.totalAmount.toString());
    if (data.date) setDate(data.date);
    Alert.alert('✨ Receipt Scanned', 'Extracted details from receipt. Please review and save.');
  };

  const handleSubmit = async () => {
    if (!vehicle) return;

    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter an expense title.');
      return;
    }

    const amtNum = parseFloat(amount.trim());
    if (isNaN(amtNum) || amtNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid expense amount.');
      return;
    }

    const odoNum = odometer.trim() ? parseFloat(odometer.trim()) : undefined;

    try {
      setLoading(true);
      const exp: ExpenseRecord = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        vehicleId: vehicle.id,
        category,
        title: title.trim(),
        amount: amtNum,
        date: new Date(date).toISOString(),
        odometer: odoNum,
        vendor: vendor.trim() || undefined,
        notes: notes.trim() || undefined,
        receiptUri,
        createdAt: new Date().toISOString(),
      };

      await onSave(exp);
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  if (!vehicle) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Log Other Expense</Text>
              <Text style={styles.subtitle}>{vehicle.name} • {vehicle.make} {vehicle.model}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Category Selector */}
            <Text style={styles.label}>EXPENSE CATEGORY</Text>
            <View style={styles.catGrid}>
              {expenseCategories.map((c) => {
                const isSelected = category === c.category;
                return (
                  <TouchableOpacity
                    key={c.category}
                    style={[
                      styles.catBtn,
                      isSelected && { backgroundColor: `${c.color}25`, borderColor: c.color },
                    ]}
                    onPress={() => setCategory(c.category)}
                  >
                    <Ionicons
                      name={c.icon}
                      size={16}
                      color={isSelected ? c.color : theme.colors.textSecondary}
                    />
                    <Text style={[styles.catText, isSelected && { color: c.color, fontWeight: '700' }]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Title */}
            <Text style={styles.label}>EXPENSE TITLE *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Annual Comprehensive Insurance, Tyre Puncture Repair"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Amount */}
            <Text style={styles.label}>AMOUNT ({currency}) *</Text>
            <TextInput
              style={[styles.input, { fontSize: 18, fontWeight: '700', color: theme.colors.warning }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="e.g. 68500"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Date & Vendor */}
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>DATE *</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="2026-03-30"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>VENDOR / PAYEE</Text>
                <TextInput
                  style={styles.input}
                  value={vendor}
                  onChangeText={setVendor}
                  placeholder="e.g. Insurance Co"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Odometer (Optional) */}
            <Text style={styles.label}>ODOMETER READING (KM, OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={odometer}
              onChangeText={setOdometer}
              keyboardType="numeric"
              placeholder="e.g. 42350"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Notes */}
            <Text style={styles.label}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. 1-year coverage valid until March 2027"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Receipt Picker */}
            <ReceiptPicker
              receiptUri={receiptUri}
              onImageSelected={setReceiptUri}
              onRemoveImage={() => setReceiptUri(undefined)}
              onOcrExtracted={handleOcrExtracted}
            />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Expense'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  form: {
    marginBottom: 12,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 8,
  },
  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  catBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  catText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    fontSize: 14,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceHighlight,
  },
  cancelBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: theme.colors.warning,
  },
  saveBtnText: {
    color: '#0B0F19',
    fontSize: 14,
    fontWeight: '700',
  },
});
