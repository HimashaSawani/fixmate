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
import { Vehicle, VehicleType } from '../types';
import { theme } from '../theme';

interface AddVehicleModalProps {
  visible: boolean;
  editingVehicle?: Vehicle | null;
  onClose: () => void;
  onSave: (vehicle: Vehicle) => Promise<void>;
}

const vehicleTypes: { type: VehicleType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'car', label: 'Car', icon: 'car-sport' },
  { type: 'motorcycle', label: 'Motorcycle', icon: 'bicycle' },
  { type: 'suv', label: 'SUV', icon: 'car' },
  { type: 'van', label: 'Van', icon: 'bus' },
  { type: 'truck', label: 'Truck', icon: 'trail-sign' },
];

const fuelTypes = [
  { type: 'petrol', label: 'Petrol' },
  { type: 'diesel', label: 'Diesel' },
  { type: 'hybrid', label: 'Hybrid' },
  { type: 'electric', label: 'Electric' },
] as const;

export const AddVehicleModal: React.FC<AddVehicleModalProps> = ({
  visible,
  editingVehicle,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<VehicleType>('car');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2021');
  const [regNumber, setRegNumber] = useState('');
  const [odometer, setOdometer] = useState('');
  const [fuelType, setFuelType] = useState<'petrol' | 'diesel' | 'hybrid' | 'electric'>('petrol');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (editingVehicle) {
      setName(editingVehicle.name);
      setType(editingVehicle.type);
      setMake(editingVehicle.make);
      setModel(editingVehicle.model);
      setYear(editingVehicle.year.toString());
      setRegNumber(editingVehicle.regNumber || '');
      setOdometer(editingVehicle.currentOdometer.toString());
      setFuelType(editingVehicle.fuelType || 'petrol');
    } else {
      setName('');
      setType('car');
      setMake('');
      setModel('');
      setYear(new Date().getFullYear().toString());
      setRegNumber('');
      setOdometer('0');
      setFuelType('petrol');
    }
  }, [editingVehicle, visible]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter a vehicle nickname.');
      return;
    }
    if (!make.trim() || !model.trim()) {
      Alert.alert('Validation Error', 'Please specify make and model.');
      return;
    }

    const yearNum = parseInt(year.trim(), 10);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 2) {
      Alert.alert('Validation Error', 'Please enter a valid manufacture year.');
      return;
    }

    const odoNum = parseFloat(odometer.trim());
    if (isNaN(odoNum) || odoNum < 0) {
      Alert.alert('Validation Error', 'Please enter a valid initial odometer reading.');
      return;
    }

    try {
      setLoading(true);
      const now = new Date().toISOString();
      const payload: Vehicle = {
        id: editingVehicle ? editingVehicle.id : `veh_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: name.trim(),
        type,
        make: make.trim(),
        model: model.trim(),
        year: yearNum,
        regNumber: regNumber.trim() || undefined,
        currentOdometer: odoNum,
        fuelType,
        isPrimary: editingVehicle ? editingVehicle.isPrimary : false,
        createdAt: editingVehicle ? editingVehicle.createdAt : now,
        updatedAt: now,
      };

      await onSave(payload);
      onClose();
    } catch (err: any) {
      console.error('Failed to save vehicle:', err);
      Alert.alert('Error', err?.message || 'Failed to save vehicle.');
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
            <Text style={styles.title}>
              {editingVehicle ? 'Edit Vehicle Profile' : 'Add New Vehicle'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Vehicle Type Selector */}
            <Text style={styles.label}>VEHICLE TYPE</Text>
            <View style={styles.typeRow}>
              {vehicleTypes.map((t) => {
                const isSelected = type === t.type;
                return (
                  <TouchableOpacity
                    key={t.type}
                    style={[styles.typeBadge, isSelected && styles.typeBadgeSelected]}
                    onPress={() => setType(t.type)}
                  >
                    <Ionicons
                      name={t.icon}
                      size={18}
                      color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                    />
                    <Text style={[styles.typeText, isSelected && styles.typeTextSelected]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Vehicle Nickname */}
            <Text style={styles.label}>NICKNAME / IDENTIFIER *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Daily Civic, Red Pulsar, Family SUV"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Make & Model */}
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>MAKE *</Text>
                <TextInput
                  style={styles.input}
                  value={make}
                  onChangeText={setMake}
                  placeholder="e.g. Honda"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>MODEL *</Text>
                <TextInput
                  style={styles.input}
                  value={model}
                  onChangeText={setModel}
                  placeholder="e.g. Civic"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Year & Registration */}
            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>YEAR *</Text>
                <TextInput
                  style={styles.input}
                  value={year}
                  onChangeText={setYear}
                  keyboardType="numeric"
                  placeholder="e.g. 2021"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>REG NUMBER (OPTIONAL)</Text>
                <TextInput
                  style={styles.input}
                  value={regNumber}
                  onChangeText={setRegNumber}
                  placeholder="e.g. WP CAB-1234"
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>
            </View>

            {/* Current Odometer */}
            <Text style={styles.label}>CURRENT ODOMETER (KM) *</Text>
            <TextInput
              style={styles.input}
              value={odometer}
              onChangeText={setOdometer}
              keyboardType="numeric"
              placeholder="e.g. 42000"
              placeholderTextColor={theme.colors.textMuted}
            />

            {/* Fuel Type */}
            <Text style={styles.label}>FUEL TYPE</Text>
            <View style={styles.fuelRow}>
              {fuelTypes.map((f) => {
                const isSelected = fuelType === f.type;
                return (
                  <TouchableOpacity
                    key={f.type}
                    style={[styles.fuelBadge, isSelected && styles.fuelBadgeSelected]}
                    onPress={() => setFuelType(f.type)}
                  >
                    <Text style={[styles.fuelText, isSelected && styles.fuelTextSelected]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} disabled={loading}>
              <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Vehicle'}</Text>
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
    maxHeight: '90%',
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
    marginTop: 10,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  typeBadgeSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  typeText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  typeTextSelected: {
    color: theme.colors.primaryLight,
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
  fuelRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  fuelBadge: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  fuelBadgeSelected: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  fuelText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  fuelTextSelected: {
    color: theme.colors.primaryLight,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
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
