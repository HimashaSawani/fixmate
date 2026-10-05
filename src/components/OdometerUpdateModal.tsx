import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle } from '../types';
import { theme } from '../theme';

interface OdometerUpdateModalProps {
  visible: boolean;
  vehicle: Vehicle | null;
  onClose: () => void;
  onSave: (newOdometer: number, notes?: string) => Promise<void>;
}

export const OdometerUpdateModal: React.FC<OdometerUpdateModalProps> = ({
  visible,
  vehicle,
  onClose,
  onSave,
}) => {
  const [odometerStr, setOdometerStr] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (vehicle && visible) {
      setOdometerStr(vehicle.currentOdometer.toString());
      setNotes('');
    }
  }, [vehicle, visible]);

  if (!vehicle) return null;

  const handleSave = async () => {
    const val = parseFloat(odometerStr.trim());
    if (isNaN(val) || val < 0) {
      Alert.alert('Invalid Value', 'Please enter a valid numeric odometer reading.');
      return;
    }

    if (val < vehicle.currentOdometer) {
      Alert.alert(
        '⚠️ Warning: Lower Mileage Entered',
        `The entered odometer (${val.toLocaleString()} km) is lower than the currently recorded odometer (${vehicle.currentOdometer.toLocaleString()} km).\n\nAre you sure you want to log this as a manual correction?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Confirm Correction',
            style: 'destructive',
            onPress: async () => {
              await executeSave(val);
            },
          },
        ]
      );
      return;
    }

    await executeSave(val);
  };

  const executeSave = async (val: number) => {
    try {
      setLoading(true);
      await onSave(val, notes.trim() || 'Manual odometer update');
      onClose();
    } catch (err) {
      Alert.alert('Error', 'Failed to update odometer reading.');
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
              <Text style={styles.title}>Update Odometer</Text>
              <Text style={styles.subtitle}>{vehicle.name} • Current: {vehicle.currentOdometer.toLocaleString()} km</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={styles.inputLabel}>NEW ODOMETER READING (KM)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="speedometer-outline" size={20} color={theme.colors.primary} />
              <TextInput
                style={styles.textInput}
                keyboardType="numeric"
                value={odometerStr}
                onChangeText={setOdometerStr}
                placeholder="e.g. 45000"
                placeholderTextColor={theme.colors.textMuted}
                autoFocus
              />
              <Text style={styles.unitText}>km</Text>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>NOTES (OPTIONAL)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Weekend road trip return"
              placeholderTextColor={theme.colors.textMuted}
            />

            <View style={styles.tipBox}>
              <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.tipText}>
                Updating mileage recalculates due maintenance intervals and triggers threshold alerts automatically.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Update Odometer'}</Text>
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  body: {
    marginBottom: 16,
  },
  inputLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderActive,
  },
  textInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 12,
    marginLeft: 8,
  },
  unitText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: theme.colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.colors.textPrimary,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primaryMuted,
    padding: 10,
    borderRadius: 8,
    marginTop: 14,
  },
  tipText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
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
