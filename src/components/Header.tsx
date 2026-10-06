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
  const { theme, isDark } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Row 1: Brand Logo & Top Actions (Notifications + AI Copilot) */}
      <View style={styles.topRow}>
        {/* Brand Logo with Icon */}
        <View style={styles.brandContainer}>
          <View style={[styles.logoIconBadge, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name="car-sport" size={16} color="#FFFFFF" />
          </View>
          <View style={styles.brandRow}>
            <Text style={[styles.brandPrefix, { color: theme.colors.textPrimary }]}>Fix</Text>
            <Text style={[styles.brandSuffix, { color: theme.colors.primary }]}>Mate</Text>
          </View>
        </View>

        {/* Right Action Buttons */}
        <View style={styles.actionButtonsRow}>
          {/* 🔔 Notifications Button */}
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
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={20} color={theme.colors.textPrimary} />
            {notificationCount > 0 && (
              <View style={[styles.badgeCount, { backgroundColor: theme.colors.danger }]}>
                <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ✨ FixMate AI Copilot Button */}
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
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="AI Copilot"
          >
            <Ionicons name="sparkles" size={18} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Row 2: Compact Vehicle Selector Bar */}
      <View style={styles.secondRow}>
        <TouchableOpacity
          style={[
            styles.vehicleSelectorBar,
            {
              backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
              shadowColor: isDark ? '#000' : '#64748B',
            },
          ]}
          onPress={() => setDropdownOpen(!dropdownOpen)}
          activeOpacity={0.8}
        >
          <View style={styles.vehicleBarLeft}>
            <View style={[styles.miniCarCircle, { backgroundColor: theme.colors.primaryMuted }]}>
              <Ionicons
                name={activeVehicle?.type === 'motorcycle' ? 'bicycle' : 'car-sport'}
                size={14}
                color={theme.colors.primary}
              />
            </View>

            <View style={styles.vehicleTextCol}>
              <Text style={[styles.vehicleSelectedName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {activeVehicle ? activeVehicle.name : 'Select Vehicle'}
              </Text>
              {activeVehicle && (
                <Text style={[styles.vehicleSelectedSub, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {activeVehicle.make} {activeVehicle.model} {activeVehicle.regNumber ? `• ${activeVehicle.regNumber}` : ''}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.vehicleBarRight}>
            <Ionicons
              name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textSecondary}
            />
          </View>
        </TouchableOpacity>

        {/* Quick Odometer Shortcut Icon */}
        <TouchableOpacity
          style={[
            styles.quickOdoBtn,
            {
              backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
            },
          ]}
          onPress={onOpenOdometerModal}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="speedometer-outline" size={18} color={theme.colors.primary} />
        </TouchableOpacity>
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
              MY GARAGE ({vehicles.length})
            </Text>
            <TouchableOpacity
              onPress={() => {
                setDropdownOpen(false);
                onOpenAddVehicle();
              }}
            >
              <Text style={[styles.updateOdoText, { color: theme.colors.primary }]}>
                + Add Vehicle
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
                          ? theme.colors.primaryMuted
                          : isDark
                          ? theme.colors.surfaceHighlight
                          : '#F1F5F9',
                      },
                    ]}
                  >
                    <Ionicons
                      name={v.type === 'motorcycle' ? 'bicycle' : 'car-sport'}
                      size={16}
                      color={isSelected ? theme.colors.primary : theme.colors.textSecondary}
                    />
                  </View>
                  <View style={styles.dropdownItemDetails}>
                    <Text
                      style={[
                        styles.dropdownItemName,
                        { color: theme.colors.textPrimary },
                        isSelected && { color: theme.colors.primary, fontWeight: '700' },
                      ]}
                      numberOfLines={1}
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
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 8 : 12,
    paddingBottom: 10,
    zIndex: 999,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandPrefix: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSuffix: {
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  aiBtn: {
    // Distinct styling for AI Copilot
  },
  badgeCount: {
    position: 'absolute',
    top: -2,
    right: -2,
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
  secondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vehicleSelectorBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  vehicleBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  miniCarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleTextCol: {
    flex: 1,
  },
  vehicleSelectedName: {
    fontSize: 13,
    fontWeight: '700',
  },
  vehicleSelectedSub: {
    fontSize: 11,
    marginTop: 1,
  },
  vehicleBarRight: {
    paddingLeft: 4,
  },
  quickOdoBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    top: 112,
    left: 16,
    right: 16,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    elevation: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    zIndex: 1000,
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
    flex: 1,
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
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownItemSub: {
    fontSize: 12,
  },
});
