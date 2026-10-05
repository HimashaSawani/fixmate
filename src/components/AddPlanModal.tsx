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
import { MaintenancePlan, Vehicle } from '../types';
import { theme } from '../theme';

interface AddPlanModalProps {
  visible: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onSave: (plan: MaintenancePlan) => Promise<void>;
}

export const AddPlanModal: React.FC<AddPlanModalProps> = ({
  visible,
  vehicle,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [intervalKm, setIntervalKm] = useState('5000');
  const [intervalMonths, setIntervalMonths] = useState('6');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setTitle('');
      setIntervalKm('5000');
      setIntervalMonths('6');
      setNotes('');
    }
  }, [visible]);

  if (!vehicle) return null;

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Please enter a maintenance plan name.');
      return;
    }

    const km = parseFloat(intervalKm.trim());
    const months = parseInt(intervalMonths.trim(), 10);

    if (isNaN(km) || km <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid km interval.');
      return;
    }

    if (isNaN(months) || months <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid month interval.');
      return;
    }

    try {
      setLoading(true);
      const now = new Date();
      const nextDueMileage = vehicle.currentOdometer + km;
      const nextDueDate = new Date(
        now.getFullYear(),
        now.getMonth() + months,
        now.getDate()
      ).toISOString();

      const plan: MaintenancePlan = {
        id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        vehicleId: vehicle.id,
        title: title.trim(),
        category: 'other',
        intervalKm: km,
        intervalMonths: months,
        lastServiceMileage: vehicle.currentOdometer,
        lastServiceDate: now.toISOString(),
        nextDueMileage,
        nextDueDate,
        notes: notes.trim() || undefined,
        isCustom: true,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      await onSave(plan);
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to save maintenance plan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Add Custom Maintenance Plan</Text>
              <Text style={styles.subtitle}>{vehicle.name} • {vehicle.currentOdometer.toLocaleString()} km</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>SERVICE ITEM NAME *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Gearbox Oil Change, Timing Belt"
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>KM INTERVAL *</Text>
                <TextInput
                  style={styles.input}
                  value={intervalKm}
                  onChangeText={setIntervalKm}
                  keyboardType="numeric"
                  placeholder="e.g. 10000"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>MONTH INTERVAL *</Text>
                <TextInput
                  style={styles.input}
                  value={intervalMonths}
                  onChangeText={setIntervalMonths}
                  keyboardType="numeric"
                  placeholder="e.g. 12"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.label}>NOTES & SPECIFICATIONS</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Genuine manufacturer specified fluid only"
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={styles.tipBox}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.tipText}>
                Whichever comes first (km or date) will automatically trigger notifications and status warnings.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Plan'}</Text>
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
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryMuted,
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  tipText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    flex: 1,
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
