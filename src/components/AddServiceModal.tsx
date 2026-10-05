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
import { ServiceRecord, MaintenancePlan, Vehicle } from '../types';
import { ReceiptPicker } from './ReceiptPicker';
import { ExtractedReceiptData } from '../services/ocrAssistant';
import { theme } from '../theme';

interface AddServiceModalProps {
  visible: boolean;
  vehicle: Vehicle | null;
  plans: MaintenancePlan[];
  selectedPlanId?: string;
  currency: string;
  onClose: () => void;
  onSave: (record: ServiceRecord) => Promise<void>;
}

export const AddServiceModal: React.FC<AddServiceModalProps> = ({
  visible,
  vehicle,
  plans,
  selectedPlanId,
  currency,
  onClose,
  onSave,
}) => {
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [serviceType, setServiceType] = useState('Scheduled Maintenance');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState('');
  const [garageName, setGarageName] = useState('');
  const [labourCost, setLabourCost] = useState('0');
  const [partsCost, setPartsCost] = useState('0');
  const [totalCost, setTotalCost] = useState('0');
  const [partsList, setPartsList] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (vehicle && visible) {
      setOdometer(vehicle.currentOdometer.toString());
      setDate(new Date().toISOString().slice(0, 10));
      setReceiptUri(undefined);

      if (selectedPlanId) {
        const found = plans.find((p) => p.id === selectedPlanId);
        if (found) {
          setPlanId(found.id);
          setTitle(found.title);
          setServiceType(found.title);
        }
      } else if (plans.length > 0) {
        setPlanId(plans[0].id);
        setTitle(plans[0].title);
        setServiceType(plans[0].title);
      } else {
        setPlanId(undefined);
        setTitle('General Service');
        setServiceType('General Service');
      }
    }
  }, [vehicle, plans, selectedPlanId, visible]);

  const handlePlanSelect = (selectedId: string) => {
    setPlanId(selectedId);
    const p = plans.find((item) => item.id === selectedId);
    if (p) {
      setTitle(p.title);
      setServiceType(p.title);
    }
  };

  const handleCostRecalculation = (parts: string, labour: string) => {
    const p = parseFloat(parts) || 0;
    const l = parseFloat(labour) || 0;
    setPartsCost(parts);
    setLabourCost(labour);
    setTotalCost((p + l).toString());
  };

  const handleOcrExtracted = (data: ExtractedReceiptData) => {
    if (data.merchantName) setGarageName(data.merchantName);
    if (data.totalAmount) {
      setTotalCost(data.totalAmount.toString());
      setPartsCost((data.totalAmount * 0.7).toFixed(0));
      setLabourCost((data.totalAmount * 0.3).toFixed(0));
    }
    if (data.date) setDate(data.date);
    Alert.alert('✨ Invoice Scanned', 'Filled details from invoice. Please review and save.');
  };

  const handleSubmit = async () => {
    if (!vehicle) return;

    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a service title.');
      return;
    }

    const odoNum = parseFloat(odometer.trim());
    if (isNaN(odoNum) || odoNum < 0) {
      Alert.alert('Validation Error', 'Please enter valid odometer reading.');
      return;
    }

    const total = parseFloat(totalCost.trim()) || 0;
    const parts = parseFloat(partsCost.trim()) || 0;
    const labour = parseFloat(labourCost.trim()) || 0;

    try {
      setLoading(true);
      const record: ServiceRecord = {
        id: `srv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        vehicleId: vehicle.id,
        planId,
        title: title.trim(),
        serviceType: serviceType.trim(),
        date: new Date(date).toISOString(),
        odometer: odoNum,
        garageName: garageName.trim() || undefined,
        labourCost: labour,
        partsCost: parts,
        totalCost: total > 0 ? total : parts + labour,
        notes: notes.trim() || undefined,
        receiptUri,
        partsList: partsList.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await onSave(record);
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to save service record.');
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
              <Text style={styles.title}>Log Completed Service</Text>
              <Text style={styles.subtitle}>{vehicle.name} • {vehicle.make} {vehicle.model}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Link to Maintenance Plan */}
            {plans.length > 0 && (
              <>
                <Text style={styles.label}>LINKED MAINTENANCE ITEM</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planPicker}>
                  {plans.map((p) => {
                    const isSelected = planId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.planBadge, isSelected && styles.planBadgeSelected]}
                        onPress={() => handlePlanSelect(p.id)}
                      >
                        <Text style={[styles.planText, isSelected && styles.planTextSelected]}>
                          {p.title}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </>
            )}

            {/* Service Title */}
            <Text style={styles.label}>SERVICE TITLE *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Engine Oil & Filter Change"
              placeholderTextColor={theme.colors.textMuted}
            />

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

            {/* Workshop / Garage Name */}
            <Text style={styles.label}>GARAGE / SERVICE CENTER</Text>
            <TextInput
              style={styles.input}
              value={garageName}
              onChangeText={setGarageName}
              placeholder="e.g. AutoMiraj Grand Workshop, Toyota Plaza"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Parts & Labour Split */}
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>PARTS COST ({currency})</Text>
                <TextInput
                  style={styles.input}
                  value={partsCost}
                  onChangeText={(v) => handleCostRecalculation(v, labourCost)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>LABOUR COST ({currency})</Text>
                <TextInput
                  style={styles.input}
                  value={labourCost}
                  onChangeText={(v) => handleCostRecalculation(partsCost, v)}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Total Cost */}
            <Text style={styles.label}>TOTAL SERVICE COST ({currency}) *</Text>
            <TextInput
              style={[styles.input, { fontSize: 18, fontWeight: '700', color: theme.colors.secondaryLight }]}
              value={totalCost}
              onChangeText={setTotalCost}
              keyboardType="numeric"
              placeholder="e.g. 24500"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Replaced Parts List */}
            <Text style={styles.label}>REPLACED PARTS / ITEMS LIST</Text>
            <TextInput
              style={styles.input}
              value={partsList}
              onChangeText={setPartsList}
              placeholder="e.g. 4L Synthetic Oil, Genuine Oil Filter, Air Filter"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Notes */}
            <Text style={styles.label}>NOTES & RECOMMENDATIONS</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Next brake pad check suggested in 5,000 km"
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
              <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Service Record'}</Text>
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
  planPicker: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginRight: 8,
  },
  planBadgeSelected: {
    backgroundColor: theme.colors.secondaryMuted,
    borderColor: theme.colors.secondary,
  },
  planText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  planTextSelected: {
    color: theme.colors.secondaryLight,
    fontWeight: '700',
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
    backgroundColor: theme.colors.secondary,
  },
  saveBtnText: {
    color: '#0B0F19',
    fontSize: 14,
    fontWeight: '700',
  },
});
