import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Vehicle, AppSettings } from '../types';
import { exportAllDataToJson, exportVehicleToCsv } from '../services/backupExport';
import { sendInstantOdometerAlert } from '../services/notifications';
import { seedDemoData } from '../database/db';
import { RestoreModal } from '../components/RestoreModal';
import { getOcrBackendUrl, setOcrBackendUrl, checkOcrBackendHealth } from '../services/ocrClient';
import { useTheme } from '../theme';

interface SettingsScreenProps {
  settings: AppSettings;
  vehicles: Vehicle[];
  activeVehicle: Vehicle | null;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onOpenAddVehicle: () => void;
  onEditVehicle: (v: Vehicle) => void;
  onDeleteVehicle: (id: string) => Promise<void>;
  onSelectVehicle: (v: Vehicle) => void;
  onRestoreComplete: () => Promise<void>;
}

const currencies = ['LKR', 'USD', 'EUR', 'GBP', 'INR', 'AUD'];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  vehicles,
  activeVehicle,
  onSaveSettings,
  onOpenAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onSelectVehicle,
  onRestoreComplete,
}) => {
  const { theme, isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState(settings.enableNotifications);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>(getOcrBackendUrl());

  const handleToggleNotifications = async (val: boolean) => {
    setNotifications(val);
    await onSaveSettings({
      ...settings,
      enableNotifications: val,
    });
  };

  const handleSelectCurrency = async (curr: string) => {
    await onSaveSettings({
      ...settings,
      currency: curr,
    });
  };

  const handleResetDemoData = () => {
    Alert.alert(
      'Reload Sample Data',
      'This will seed complete demo data (realistic fuel fill-ups, services, and expenses) to demonstrate the app capabilities.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Load Demo Data',
          onPress: async () => {
            await seedDemoData();
            await onRestoreComplete();
            Alert.alert('Success', 'Sample demonstration data loaded successfully.');
          },
        },
      ]
    );
  };

  const handleDeleteVehicleConfirm = (v: Vehicle) => {
    if (vehicles.length <= 1) {
      Alert.alert('Cannot Delete', 'You must have at least one vehicle profile.');
      return;
    }

    Alert.alert(
      'Delete Vehicle',
      `Are you sure you want to delete "${v.name}" and all of its associated service and fuel records?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await onDeleteVehicle(v.id);
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
          Settings & Management
        </Text>
        <Text style={[styles.screenSub, { color: theme.colors.textSecondary }]}>
          Preferences, Garage, and Data Portability
        </Text>
      </View>

      {/* 1. Appearance / Theme Section */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
          APPEARANCE & THEME
        </Text>
        <View style={styles.toggleSettingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
              Dark Mode (Midnight Navy)
            </Text>
            <Text style={[styles.settingSub, { color: theme.colors.textSecondary }]}>
              {isDark ? 'Deep midnight navy palette active' : 'Cool blue-grey light theme active'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
            thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
          />
        </View>
      </View>

      {/* 2. Garage & Vehicles Section */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          },
        ]}
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
            MY GARAGE ({vehicles.length})
          </Text>
          <TouchableOpacity onPress={onOpenAddVehicle} style={styles.addVehicleLink}>
            <Ionicons name="add" size={14} color={theme.colors.primary} />
            <Text style={[styles.addVehicleLinkText, { color: theme.colors.primary }]}>
              Add Vehicle
            </Text>
          </TouchableOpacity>
        </View>

        {vehicles.map((v) => {
          const isActive = v.id === activeVehicle?.id;
          return (
            <TouchableOpacity
              key={v.id}
              style={[
                styles.vehicleRow,
                {
                  borderBottomColor: isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.05)',
                },
              ]}
              onPress={() => onSelectVehicle(v)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View
                  style={[
                    styles.vehicleIconBox,
                    {
                      backgroundColor: isDark ? theme.colors.surfaceHighlight : '#F1F5F9',
                      borderColor: isActive ? theme.colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Ionicons
                    name={v.type === 'motorcycle' ? 'bicycle' : 'car-sport'}
                    size={18}
                    color={isActive ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.vName, { color: theme.colors.textPrimary }]}>
                      {v.name}
                    </Text>
                    {isActive && (
                      <View
                        style={[
                          styles.activePill,
                          { backgroundColor: theme.colors.primaryMuted },
                        ]}
                      >
                        <Text style={[styles.activePillText, { color: theme.colors.primary }]}>
                          Active
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.vSub, { color: theme.colors.textSecondary }]}>
                    {v.make} {v.model} • {v.currentOdometer.toLocaleString()} km
                  </Text>
                </View>
              </View>

              <View style={styles.vActions}>
                <TouchableOpacity style={styles.vActionBtn} onPress={() => onEditVehicle(v)}>
                  <Ionicons name="pencil-outline" size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.vActionBtn}
                  onPress={() => handleDeleteVehicleConfirm(v)}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Preferences (Currency & Localization) */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
          CURRENCY & LOCALIZATION
        </Text>

        <View style={styles.currencyGrid}>
          {currencies.map((curr) => {
            const isSelected = settings.currency === curr;
            return (
              <TouchableOpacity
                key={curr}
                style={[
                  styles.currBtn,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primaryMuted
                      : isDark
                      ? theme.colors.surfaceHighlight
                      : '#F1F5F9',
                    borderColor: isSelected ? theme.colors.primary : 'transparent',
                  },
                ]}
                onPress={() => handleSelectCurrency(curr)}
              >
                <Text
                  style={[
                    styles.currText,
                    {
                      color: isSelected ? theme.colors.primary : theme.colors.textSecondary,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {curr}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 4. Notifications & Reminders */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
          NOTIFICATIONS & ALERTS
        </Text>

        <View style={styles.toggleSettingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingLabel, { color: theme.colors.textPrimary }]}>
              Maintenance Reminders
            </Text>
            <Text style={[styles.settingSub, { color: theme.colors.textSecondary }]}>
              Receive reminders when upcoming services are due soon or overdue
            </Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#CBD5E1', true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Send Test Notification Button */}
        <TouchableOpacity
          style={[
            styles.actionRowBtn,
            {
              borderBottomColor: 'transparent',
              paddingTop: 12,
            },
          ]}
          onPress={async () => {
            if (!activeVehicle) {
              Alert.alert('No Vehicle', 'Please select or add a vehicle first.');
              return;
            }
            try {
              await sendInstantOdometerAlert(
                activeVehicle,
                'Routine Inspection Test Alert',
                activeVehicle.currentOdometer
              );
              Alert.alert(
                'Test Sent 🔔',
                `A test notification was dispatched for ${activeVehicle.name}. Check your phone status bar or notifications tray.`
              );
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to dispatch test notification.');
            }
          }}
          activeOpacity={0.7}
        >
          <View style={styles.actionRowLeft}>
            <Ionicons name="notifications-outline" size={20} color={theme.colors.accent} />
            <View>
              <Text style={[styles.actionRowTitle, { color: theme.colors.textPrimary }]}>
                Send Test Notification
              </Text>
              <Text style={[styles.actionRowSub, { color: theme.colors.textSecondary }]}>
                Verify local notification alerts and sound on this device
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* 5. Backup & Data Portability */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
          BACKUP & DATA PORTABILITY
        </Text>

        <TouchableOpacity
          style={[
            styles.actionRowBtn,
            {
              borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            },
          ]}
          onPress={() => exportAllDataToJson()}
          activeOpacity={0.7}
        >
          <View style={styles.actionRowLeft}>
            <Ionicons name="cloud-download-outline" size={20} color={theme.colors.primary} />
            <View>
              <Text style={[styles.actionRowTitle, { color: theme.colors.textPrimary }]}>
                Export Full JSON Backup
              </Text>
              <Text style={[styles.actionRowSub, { color: theme.colors.textSecondary }]}>
                Save all vehicles, fuel logs, and service history
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {/* Restore Backup Option */}
        <TouchableOpacity
          style={[
            styles.actionRowBtn,
            {
              borderBottomColor: activeVehicle
                ? isDark
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.05)'
                : 'transparent',
            },
          ]}
          onPress={() => setShowRestoreModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.actionRowLeft}>
            <Ionicons name="cloud-upload-outline" size={20} color={theme.colors.secondary} />
            <View>
              <Text style={[styles.actionRowTitle, { color: theme.colors.textPrimary }]}>
                Restore Backup (JSON)
              </Text>
              <Text style={[styles.actionRowSub, { color: theme.colors.textSecondary }]}>
                Import and merge data from a previous FixMate backup
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>

        {activeVehicle && (
          <TouchableOpacity
            style={[
              styles.actionRowBtn,
              {
                borderBottomColor: 'transparent',
              },
            ]}
            onPress={() => exportVehicleToCsv(activeVehicle)}
            activeOpacity={0.7}
          >
            <View style={styles.actionRowLeft}>
              <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
              <View>
                <Text style={[styles.actionRowTitle, { color: theme.colors.textPrimary }]}>
                  Export {activeVehicle.name} CSV
                </Text>
                <Text style={[styles.actionRowSub, { color: theme.colors.textSecondary }]}>
                  Export spreadsheet compatible mileage & cost table
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* 6. AI & OCR Server Connection */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          AI & OCR SERVER CONNECTION
        </Text>

        <TouchableOpacity
          style={[
            styles.actionRowBtn,
            {
              borderBottomColor: 'transparent',
            },
          ]}
          onPress={() => {
            Alert.alert(
              'Backend Server Host',
              `Current Host: ${serverUrl}\n\nWhen testing on a physical phone over Wi-Fi, ensure your PC backend is running with:\n"uvicorn main:app --host 0.0.0.0 --port 8000"\nand reachable on your local network.`
            );
          }}
          activeOpacity={0.7}
        >
          <View style={styles.actionRowLeft}>
            <Ionicons name="server-outline" size={20} color={theme.colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionRowTitle, { color: theme.colors.textPrimary }]}>
                Backend Server URL
              </Text>
              <Text style={[styles.actionRowSub, { color: theme.colors.textSecondary }]}>
                {serverUrl}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* 7. Developer & Demo Tools */}
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          },
        ]}
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.warning }]}>
          DEMO & DEVELOPER TOOLS
        </Text>

        <TouchableOpacity
          style={[
            styles.actionRowBtn,
            {
              borderBottomColor: 'transparent',
            },
          ]}
          onPress={handleResetDemoData}
          activeOpacity={0.7}
        >
          <View style={styles.actionRowLeft}>
            <Ionicons name="refresh-circle-outline" size={20} color={theme.colors.warning} />
            <View>
              <Text style={[styles.actionRowTitle, { color: theme.colors.textPrimary }]}>
                Seed / Reset Sample Data
              </Text>
              <Text style={[styles.actionRowSub, { color: theme.colors.textSecondary }]}>
                Populate realistic sample vehicles, fuel, services and expenses
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Restore Backup Modal */}
      <RestoreModal
        visible={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        onRestoreSuccess={onRestoreComplete}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  topHeader: {
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  screenSub: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  addVehicleLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addVehicleLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  vehicleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  vehicleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  vName: {
    fontSize: 14,
    fontWeight: '700',
  },
  vSub: {
    fontSize: 11,
    marginTop: 2,
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  vActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  vActionBtn: {
    padding: 6,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  currBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  currText: {
    fontSize: 12,
  },
  toggleSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 11,
    marginTop: 2,
  },
  actionRowBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  actionRowTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionRowSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
