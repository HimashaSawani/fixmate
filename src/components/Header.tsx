import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Vehicle } from '../types';
import { useTheme } from '../theme';

interface HeaderProps {
  activeVehicle: Vehicle | null;
  vehicles: Vehicle[];
  notificationCount?: number;
  onSelectVehicle: (vehicle: Vehicle) => void;
  onOpenAddVehicle: () => void;
  onOpenOdometerModal: () => void;
  onOpenNotifications: () => void;
  onOpenAIAssistant: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeVehicle,
  vehicles,
  notificationCount = 0,
  onSelectVehicle,
  onOpenAddVehicle,
  onOpenOdometerModal,
  onOpenNotifications,
  onOpenAIAssistant,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.topRow}>
        {/* Brand Name */}
        <View style={styles.brandRow}>
          <Text style={[styles.brandPrefix, { color: theme.colors.textPrimary }]}>Fix</Text>
          <Text style={[styles.brandSuffix, { color: theme.colors.primary }]}>Mate</Text>
        </View>

        {/* Right Section: Vehicle Selector Pill + Theme Toggle + Bell + AI Button */}
        <View style={styles.rightSection}>
          {/* Vehicle Selector Pill */}
          <TouchableOpacity
            style={[
              styles.vehiclePill,
              {
                backgroundColor: isDark ? theme.colors.surfaceHighlight : theme.colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              },
            ]}
            onPress={() => setDropdownOpen(!dropdownOpen)}
            activeOpacity={0.8}
          >
            <View style={[styles.miniCarCircle, { backgroundColor: theme.colors.primaryMuted }]}>
              <Ionicons
                name={activeVehicle?.type === 'motorcycle' ? 'bicycle' : 'car-sport'}
                size={14}
                color={theme.colors.primary}
              />
            </View>
            <Text
              style={[styles.vehiclePillText, { color: theme.colors.textPrimary }]}
              numberOfLines={1}
            >
              {activeVehicle ? activeVehicle.name : 'Select'}
            </Text>
            <Ionicons
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          {/* Theme Toggle Sun / Moon */}
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                backgroundColor: isDark ? theme.colors.surfaceHighlight : theme.colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              },
            ]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={isDark ? '#FBBF24' : '#2563EB'}
            />
          </TouchableOpacity>

          {/* 1. Notification Bell Button */}
          <TouchableOpacity
            style={[
              styles.iconBtn,
              {
                backgroundColor: isDark ? theme.colors.surfaceHighlight : theme.colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              },
            ]}
            onPress={onOpenNotifications}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={18} color={theme.colors.textPrimary} />
            {notificationCount > 0 && (
              <View style={[styles.badgeCount, { backgroundColor: theme.colors.danger }]}>
                <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* 2. FixMate AI Copilot Button */}
          <TouchableOpacity
            style={[
              styles.iconBtn,
              styles.aiBtn,
              {
                backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.12)',
                borderColor: isDark ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.3)',
              },
            ]}
            onPress={onOpenAIAssistant}
            activeOpacity={0.7}
          >
            <Ionicons name="sparkles" size={16} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Vehicle Dropdown Menu */}
      {dropdownOpen && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0',
              shadowColor: isDark ? '#000' : '#64748B',
            },
          ]}
        >
          <View style={styles.dropdownHeaderRow}>
            <Text style={[styles.dropdownHeader, { color: theme.colors.textMuted }]}>
              MY GARAGE
            </Text>
            <TouchableOpacity onPress={onOpenOdometerModal}>
              <Text style={[styles.updateOdoText, { color: theme.colors.primary }]}>
                + Update Odo
              </Text>
            </TouchableOpacity>
          </View>

          {vehicles.map((v) => {
            const isSelected = v.id === activeVehicle?.id;
            return (
              <TouchableOpacity
                key={v.id}
                style={[
                  styles.dropdownItem,
                  isSelected && {
                    backgroundColor: isDark
                      ? 'rgba(37,99,235,0.15)'
                      : 'rgba(37,99,235,0.08)',
                  },
                ]}
                onPress={() => {
                  onSelectVehicle(v);
                  setDropdownOpen(false);
                }}
              >
                <View style={styles.dropdownItemLeft}>
                  <View
                    style={[
                      styles.vehicleThumb,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : isDark
                          ? theme.colors.surfaceHighlight
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <Ionicons
                      name={v.type === 'motorcycle' ? 'bicycle' : 'car-sport'}
                      size={16}
                      color={isSelected ? '#FFFFFF' : theme.colors.textSecondary}
                    />
                  </View>
                  <View style={styles.dropdownItemDetails}>
                    <Text
                      style={[
                        styles.dropdownItemName,
                        { color: theme.colors.textPrimary },
                        isSelected && { fontWeight: '700', color: theme.colors.primary },
                      ]}
                    >
                      {v.name}
                    </Text>
                    <Text style={[styles.dropdownItemSub, { color: theme.colors.textSecondary }]}>
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
            style={[styles.addVehicleBtn, { borderColor: theme.colors.primary }]}
            onPress={() => {
              setDropdownOpen(false);
              onOpenAddVehicle();
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.addVehicleText, { color: theme.colors.primary }]}>
              Add Another Vehicle
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 8,
    zIndex: 100,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandPrefix: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSuffix: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehiclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    maxWidth: 160,
  },
  miniCarCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehiclePillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  aiBtn: {
    marginLeft: 2,
  },
  badgeCount: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  dropdown: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    elevation: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    zIndex: 999,
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dropdownHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  updateOdoText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 4,
  },
  dropdownItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vehicleThumb: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemDetails: {
    gap: 2,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownItemSub: {
    fontSize: 12,
  },
  addVehicleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addVehicleText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
