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
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FuelEntry, Vehicle } from '../types';
import { ReceiptPicker } from './ReceiptPicker';
import { ExtractedReceiptData } from '../services/ocrAssistant';
import { theme } from '../theme';

interface AddFuelModalProps {
  visible: boolean;
  vehicle: Vehicle | null;
  currency: string;
  onClose: () => void;
  onSave: (entry: FuelEntry) => Promise<void>;
}

export const AddFuelModal: React.FC<AddFuelModalProps> = ({
  visible,
  vehicle,
  currency,
  onClose,
  onSave,
}) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState('');
  const [litres, setLitres] = useState('');
  const [pricePerLitre, setPricePerLitre] = useState('370');
  const [totalCost, setTotalCost] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [fuelStation, setFuelStation] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (vehicle && visible) {
      setOdometer(vehicle.currentOdometer.toString());
      setDate(new Date().toISOString().slice(0, 10));
      setLitres('');
      setTotalCost('');
      setIsFullTank(true);
      setFuelStation('');
      setNotes('');
      setReceiptUri(undefined);
    }
  }, [vehicle, visible]);

  // Handle auto calculation
  const handleLitresChange = (val: string) => {
    setLitres(val);
    const l = parseFloat(val);
    const p = parseFloat(pricePerLitre);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setTotalCost((l * p).toFixed(2));
    }
  };

  const handlePriceChange = (val: string) => {
    setPricePerLitre(val);
    const p = parseFloat(val);
    const l = parseFloat(litres);
    if (!isNaN(l) && !isNaN(p) && l > 0 && p > 0) {
      setTotalCost((l * p).toFixed(2));
    }
  };

  const handleTotalCostChange = (val: string) => {
    setTotalCost(val);
    const t = parseFloat(val);
    const p = parseFloat(pricePerLitre);
    if (!isNaN(t) && !isNaN(p) && t > 0 && p > 0) {
      setLitres((t / p).toFixed(2));
    }
  };

  const handleOcrExtracted = (data: ExtractedReceiptData) => {
    if (data.merchantName) setFuelStation(data.merchantName);
    if (data.totalAmount) setTotalCost(data.totalAmount.toString());
    if (data.litres) setLitres(data.litres.toString());
    if (data.pricePerLitre) setPricePerLitre(data.pricePerLitre.toString());
    if (data.date) setDate(data.date);
    Alert.alert('✨ Receipt Scanned', 'Filled details from receipt. Please review and save.');
  };

  const handleSubmit = async () => {
    if (!vehicle) return;

    const odoNum = parseFloat(odometer.trim());
    if (isNaN(odoNum) || odoNum < 0) {
      Alert.alert('Validation Error', 'Please enter a valid odometer reading.');
      return;
    }

    const litresNum = parseFloat(litres.trim());
    if (isNaN(litresNum) || litresNum <= 0) {
      Alert.alert('Validation Error', 'Please enter valid fuel litres.');
      return;
    }

    const costNum = parseFloat(totalCost.trim());
    if (isNaN(costNum) || costNum <= 0) {
      Alert.alert('Validation Error', 'Please enter valid total cost.');
      return;
    }

    const priceNum = parseFloat(pricePerLitre.trim()) || costNum / litresNum;

    try {
      setLoading(true);
      const entry: FuelEntry = {
        id: `fuel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        vehicleId: vehicle.id,
        date: new Date(date).toISOString(),
        odometer: odoNum,
        litres: litresNum,
        totalCost: costNum,
        pricePerLitre: priceNum,
        isFullTank,
        fuelStation: fuelStation.trim() || undefined,
        notes: notes.trim() || undefined,
        receiptUri,
        createdAt: new Date().toISOString(),
      };

      await onSave(entry);
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to save fuel entry.');
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
              <Text style={styles.title}>Log Fuel Fill-Up</Text>
              <Text style={styles.subtitle}>{vehicle.name} • {vehicle.make} {vehicle.model}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Odometer & Date */}
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>ODOMETER (KM) *</Text>
                <TextInput
                  style={styles.input}
                  value={odometer}
                  onChangeText={setOdometer}
                  keyboardType="numeric"
                  placeholder="e.g. 42350"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>DATE (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.input}
                  value={date}
                  onChangeText={setDate}
                  placeholder="2026-03-30"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Litres, Price/Litre, Total Cost */}
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>LITRES (L) *</Text>
                <TextInput
                  style={styles.input}
                  value={litres}
                  onChangeText={handleLitresChange}
                  keyboardType="numeric"
                  placeholder="e.g. 35.5"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>PRICE / L ({currency})</Text>
                <TextInput
                  style={styles.input}
                  value={pricePerLitre}
                  onChangeText={handlePriceChange}
                  keyboardType="numeric"
                  placeholder="e.g. 370"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Total Cost */}
            <Text style={styles.label}>TOTAL COST ({currency}) *</Text>
            <TextInput
              style={[styles.input, { fontSize: 18, fontWeight: '700', color: theme.colors.primaryLight }]}
              value={totalCost}
              onChangeText={handleTotalCostChange}
              keyboardType="numeric"
              placeholder="e.g. 13135"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Full Tank Toggle */}
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Full Tank Fill-up?</Text>
                <Text style={styles.toggleSub}>
                  {isFullTank
                    ? 'Enables precise km/L calculation for this interval'
                    : 'Partial fill (litres will accumulate to next full tank)'}
                </Text>
              </View>
              <Switch
                value={isFullTank}
                onValueChange={setIsFullTank}
                trackColor={{ false: '#334155', true: theme.colors.primary }}
                thumbColor={isFullTank ? '#FFF' : '#94A3B8'}
              />
            </View>

            {/* Fuel Station & Notes */}
            <Text style={styles.label}>FUEL STATION (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={fuelStation}
              onChangeText={setFuelStation}
              placeholder="e.g. Ceypetco, Lanka IOC, Shell"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Text style={styles.label}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Highway trip tank fill"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Receipt Picker & OCR */}
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
              <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Fill-Up'}</Text>
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  toggleTitle: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  toggleSub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
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
    backgroundColor: theme.colors.primary,
  },
  saveBtnText: {
    color: '#0B0F19',
    fontSize: 14,
    fontWeight: '700',
  },
});
