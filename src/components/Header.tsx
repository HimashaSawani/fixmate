import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Vehicle } from '../types';
import { theme } from '../theme';

interface HeaderProps {
  activeVehicle: Vehicle | null;
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
  onOpenAddVehicle: () => void;
  onOpenOdometerModal: () => void;
  onOpenAIAssistant: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeVehicle,
  vehicles,
  onSelectVehicle,
  onOpenAddVehicle,
  onOpenOdometerModal,
  onOpenAIAssistant,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Vehicle Switcher */}
        <TouchableOpacity
          style={styles.vehicleSelector}
          onPress={() => setDropdownOpen(!dropdownOpen)}
          activeOpacity={0.8}
        >
          <View style={styles.vehicleIconBadge}>
            <Ionicons
              name={activeVehicle?.type === 'motorcycle' ? 'bicycle' : 'car-sport'}
              size={18}
              color={theme.colors.primary}
            />
          </View>
          <View style={styles.vehicleInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.vehicleName} numberOfLines={1}>
                {activeVehicle ? activeVehicle.name : 'Select Vehicle'}
              </Text>
              <Ionicons
                name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text style={styles.vehicleSubtitle} numberOfLines={1}>
              {activeVehicle
                ? `${activeVehicle.make} ${activeVehicle.model} ${activeVehicle.year}`
                : 'Tap to choose'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Action Buttons: AI Assistant & Quick Odometer */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.aiButton}
            onPress={onOpenAIAssistant}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="robot" size={18} color="#A78BFA" />
            <Text style={styles.aiButtonText}>AI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.odometerPill}
            onPress={onOpenOdometerModal}
            activeOpacity={0.7}
          >
            <Ionicons name="speedometer-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.odometerText}>
              {activeVehicle ? `${activeVehicle.currentOdometer.toLocaleString()} km` : '0 km'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Vehicle Dropdown Menu */}
      {dropdownOpen && (
        <View style={styles.dropdown}>
          <Text style={styles.dropdownHeader}>SWITCH VEHICLE</Text>
          {vehicles.map((v) => {
            const isSelected = v.id === activeVehicle?.id;
            return (
              <TouchableOpacity
                key={v.id}
                style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}
                onPress={() => {
                  onSelectVehicle(v);
                  setDropdownOpen(false);
                }}
              >
                <View style={styles.dropdownItemLeft}>
                  <Ionicons
                    name={v.type === 'motorcycle' ? 'bicycle' : 'car-sport'}
                    size={18}
                    color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <View style={{ marginLeft: 10 }}>
                    <Text
                      style={[
                        styles.dropdownItemName,
                        isSelected && { color: theme.colors.primary, fontWeight: '700' },
                      ]}
                    >
                      {v.name}
                    </Text>
                    <Text style={styles.dropdownItemSub}>
                      {v.make} {v.model} • {v.currentOdometer.toLocaleString()} km
                    </Text>
                  </View>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={styles.addVehicleBtn}
            onPress={() => {
              setDropdownOpen(false);
              onOpenAddVehicle();
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.secondary} />
            <Text style={styles.addVehicleBtnText}>+ Add New Vehicle</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.cardBorder,
    zIndex: 100,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  vehicleIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  vehicleInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  vehicleName: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  vehicleSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  aiButtonText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '700',
  },
  odometerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  odometerText: {
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  dropdown: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderActive,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownHeader: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  dropdownItemSelected: {
    backgroundColor: theme.colors.surfaceHighlight,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownItemName: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownItemSub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  addVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
  },
  addVehicleBtnText: {
    color: theme.colors.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
