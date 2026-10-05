import React, { useEffect, useState, useCallback } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Vehicle,
  FuelEntry,
  ServiceRecord,
  ExpenseRecord,
  MaintenancePlan,
  AppSettings,
} from './src/types';
import {
  initDatabase,
  getAllVehicles,
  getVehicleById,
  getFuelEntries,
  getServiceRecords,
  getExpenses,
  getMaintenancePlans,
  getSettings,
  saveSetting,
  insertVehicle,
  updateVehicle,
  deleteVehicle,
  insertFuelEntry,
  deleteFuelEntry,
  insertServiceRecord,
  deleteServiceRecord,
  insertExpense,
  deleteExpense,
  insertMaintenancePlan,
  deleteMaintenancePlan,
  updateVehicleOdometer,
} from './src/database/db';
import { scheduleMaintenanceNotification } from './src/services/notifications';
import { Header } from './src/components/Header';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { FuelLogScreen } from './src/screens/FuelLogScreen';
import { MaintenanceScreen } from './src/screens/MaintenanceScreen';
import { ExpensesScreen } from './src/screens/ExpensesScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';

// Modals
import { AddVehicleModal } from './src/components/AddVehicleModal';
import { AddFuelModal } from './src/components/AddFuelModal';
import { AddServiceModal } from './src/components/AddServiceModal';
import { AddExpenseModal } from './src/components/AddExpenseModal';
import { AddPlanModal } from './src/components/AddPlanModal';
import { OdometerUpdateModal } from './src/components/OdometerUpdateModal';
import { ReceiptModal } from './src/components/ReceiptModal';
import { AIAssistantModal } from './src/components/AIAssistantModal';
import { theme } from './src/theme';

type TabType = 'home' | 'fuel' | 'maintenance' | 'expenses' | 'reports' | 'settings';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  // State
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeVehicle, setActiveVehicle] = useState<Vehicle | null>(null);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    currency: 'LKR',
    distanceUnit: 'km',
    volumeUnit: 'L',
    enableNotifications: true,
    theme: 'dark',
  });

  // Modals state
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showAddFuel, setShowAddFuel] = useState(false);
  const [showAddService, setShowAddService] = useState(false);
  const [selectedPlanIdForService, setSelectedPlanIdForService] = useState<string | undefined>(undefined);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [showOdometerModal, setShowOdometerModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedReceiptUri, setSelectedReceiptUri] = useState<string | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      const vList = await getAllVehicles();
      const appSettings = await getSettings();
      setSettings(appSettings);
      setVehicles(vList);

      let targetVehicle: Vehicle | null = null;
      if (appSettings.activeVehicleId) {
        targetVehicle = vList.find((v) => v.id === appSettings.activeVehicleId) || null;
      }
      if (!targetVehicle && vList.length > 0) {
        targetVehicle = vList[0];
      }
      setActiveVehicle(targetVehicle);

      if (targetVehicle) {
        await loadVehicleRecords(targetVehicle.id);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, []);

  const loadVehicleRecords = async (vehicleId: string) => {
    const [f, s, e, p] = await Promise.all([
      getFuelEntries(vehicleId),
      getServiceRecords(vehicleId),
      getExpenses(vehicleId),
      getMaintenancePlans(vehicleId),
    ]);
    setFuelEntries(f);
    setServiceRecords(s);
    setExpenses(e);
    setPlans(p);
  };

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDatabase();
        await loadData();
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        setLoading(false);
      }
    }
    bootstrap();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectVehicle = async (v: Vehicle) => {
    setActiveVehicle(v);
    await saveSetting('activeVehicleId', v.id);
    await loadVehicleRecords(v.id);
  };

  // CRUD Handlers
  const handleSaveVehicle = async (vehicle: Vehicle) => {
    if (editingVehicle) {
      await updateVehicle(vehicle);
    } else {
      await insertVehicle(vehicle);
    }
    await loadData();
  };

  const handleDeleteVehicle = async (id: string) => {
    await deleteVehicle(id);
    await loadData();
  };

  const handleSaveFuel = async (entry: FuelEntry) => {
    await insertFuelEntry(entry);
    if (activeVehicle) {
      const updated = await getVehicleById(activeVehicle.id);
      if (updated) setActiveVehicle(updated);
      await loadVehicleRecords(activeVehicle.id);
    }
  };

  const handleDeleteFuel = async (id: string) => {
    await deleteFuelEntry(id);
    if (activeVehicle) await loadVehicleRecords(activeVehicle.id);
  };

  const handleSaveService = async (record: ServiceRecord) => {
    await insertServiceRecord(record);
    if (activeVehicle) {
      const updated = await getVehicleById(activeVehicle.id);
      if (updated) setActiveVehicle(updated);
      await loadVehicleRecords(activeVehicle.id);
    }
  };

  const handleDeleteService = async (id: string) => {
    await deleteServiceRecord(id);
    if (activeVehicle) await loadVehicleRecords(activeVehicle.id);
  };

  const handleSaveExpense = async (expense: ExpenseRecord) => {
    await insertExpense(expense);
    if (activeVehicle) {
      const updated = await getVehicleById(activeVehicle.id);
      if (updated) setActiveVehicle(updated);
      await loadVehicleRecords(activeVehicle.id);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
    if (activeVehicle) await loadVehicleRecords(activeVehicle.id);
  };

  const handleSavePlan = async (plan: MaintenancePlan) => {
    await insertMaintenancePlan(plan);
    if (activeVehicle) {
      await loadVehicleRecords(activeVehicle.id);
      if (settings.enableNotifications) {
        scheduleMaintenanceNotification(activeVehicle, plan);
      }
    }
  };

  const handleDeletePlan = async (id: string) => {
    await deleteMaintenancePlan(id);
    if (activeVehicle) await loadVehicleRecords(activeVehicle.id);
  };

  const handleUpdateOdometer = async (newOdo: number, notes?: string) => {
    if (!activeVehicle) return;
    await updateVehicleOdometer(activeVehicle.id, newOdo, 'manual', notes);
    const updated = await getVehicleById(activeVehicle.id);
    if (updated) setActiveVehicle(updated);
    await loadVehicleRecords(activeVehicle.id);
  };

  const handleUpdateSetting = async (key: string, val: string) => {
    await saveSetting(key, val);
    const newSettings = await getSettings();
    setSettings(newSettings);
  };

  const handleOpenReceipt = (uri: string) => {
    setSelectedReceiptUri(uri);
    setShowReceiptModal(true);
  };

  const handleAITriggerAction = (action: string) => {
    if (action === 'add_fuel') setShowAddFuel(true);
    else if (action === 'add_service') setShowAddService(true);
    else if (action === 'add_expense') setShowAddExpense(true);
    else if (action === 'view_reports') setCurrentTab('reports');
    else if (action === 'view_plans') setCurrentTab('maintenance');
  };

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.splashText}>Starting FixMate...</Text>
        <Text style={styles.splashSub}>Initializing SQLite Vehicle Database</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.backgroundSecondary} />

      {/* Global Header with Vehicle Switcher & AI */}
      <Header
        activeVehicle={activeVehicle}
        vehicles={vehicles}
        onSelectVehicle={handleSelectVehicle}
        onOpenAddVehicle={() => {
          setEditingVehicle(null);
          setShowAddVehicle(true);
        }}
        onOpenOdometerModal={() => setShowOdometerModal(true)}
        onOpenAIAssistant={() => setShowAIAssistant(true)}
      />

      {/* Screen Views */}
      <View style={styles.screenContainer}>
        {currentTab === 'home' && (
          <DashboardScreen
            vehicle={activeVehicle}
            fuelEntries={fuelEntries}
            serviceRecords={serviceRecords}
            expenses={expenses}
            plans={plans}
            currency={settings.currency}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            onOpenAddFuel={() => setShowAddFuel(true)}
            onOpenAddService={(planId) => {
              setSelectedPlanIdForService(planId);
              setShowAddService(true);
            }}
            onOpenAddExpense={() => setShowAddExpense(true)}
            onOpenOdometerModal={() => setShowOdometerModal(true)}
            onOpenReceipt={handleOpenReceipt}
            onNavigateTab={(tab) => setCurrentTab(tab as TabType)}
          />
        )}

        {currentTab === 'fuel' && (
          <FuelLogScreen
            vehicle={activeVehicle}
            fuelEntries={fuelEntries}
            currency={settings.currency}
            onOpenAddFuel={() => setShowAddFuel(true)}
            onOpenReceipt={handleOpenReceipt}
            onDeleteFuel={handleDeleteFuel}
          />
        )}

        {currentTab === 'maintenance' && (
          <MaintenanceScreen
            vehicle={activeVehicle}
            plans={plans}
            serviceRecords={serviceRecords}
            currency={settings.currency}
            onOpenAddService={(planId) => {
              setSelectedPlanIdForService(planId);
              setShowAddService(true);
            }}
            onOpenAddPlan={() => setShowAddPlan(true)}
            onOpenReceipt={handleOpenReceipt}
            onDeleteService={handleDeleteService}
            onDeletePlan={handleDeletePlan}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpensesScreen
            vehicle={activeVehicle}
            expenses={expenses}
            fuelEntries={fuelEntries}
            serviceRecords={serviceRecords}
            currency={settings.currency}
            onOpenAddExpense={() => setShowAddExpense(true)}
            onOpenReceipt={handleOpenReceipt}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsScreen
            vehicle={activeVehicle}
            allVehicles={vehicles}
            fuelEntries={fuelEntries}
            serviceRecords={serviceRecords}
            expenses={expenses}
            plans={plans}
            currency={settings.currency}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsScreen
            settings={settings}
            vehicles={vehicles}
            activeVehicle={activeVehicle}
            onUpdateSetting={handleUpdateSetting}
            onOpenAddVehicle={() => {
              setEditingVehicle(null);
              setShowAddVehicle(true);
            }}
            onEditVehicle={(v) => {
              setEditingVehicle(v);
              setShowAddVehicle(true);
            }}
            onDeleteVehicle={handleDeleteVehicle}
            onReloadAllData={handleRefresh}
          />
        )}
      </View>

      {/* Bottom Navigation Tab Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={currentTab === 'home' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              currentTab === 'home' && { color: theme.colors.primaryLight, fontWeight: '700' },
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('fuel')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'fuel' ? 'speedometer' : 'speedometer-outline'}
            size={22}
            color={currentTab === 'fuel' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              currentTab === 'fuel' && { color: theme.colors.primaryLight, fontWeight: '700' },
            ]}
          >
            Fuel
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('maintenance')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'maintenance' ? 'construct' : 'construct-outline'}
            size={22}
            color={currentTab === 'maintenance' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              currentTab === 'maintenance' && { color: theme.colors.primaryLight, fontWeight: '700' },
            ]}
          >
            Service
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('expenses')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'expenses' ? 'wallet' : 'wallet-outline'}
            size={22}
            color={currentTab === 'expenses' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              currentTab === 'expenses' && { color: theme.colors.primaryLight, fontWeight: '700' },
            ]}
          >
            Expenses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('reports')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'reports' ? 'bar-chart' : 'bar-chart-outline'}
            size={22}
            color={currentTab === 'reports' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              currentTab === 'reports' && { color: theme.colors.primaryLight, fontWeight: '700' },
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('settings')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'settings' ? 'settings' : 'settings-outline'}
            size={22}
            color={currentTab === 'settings' ? theme.colors.primaryLight : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              currentTab === 'settings' && { color: theme.colors.primaryLight, fontWeight: '700' },
            ]}
          >
            More
          </Text>
        </TouchableOpacity>
      </View>

      {/* Global Modals */}
      <AddVehicleModal
        visible={showAddVehicle}
        editingVehicle={editingVehicle}
        onClose={() => setShowAddVehicle(false)}
        onSave={handleSaveVehicle}
      />

      <AddFuelModal
        visible={showAddFuel}
        vehicle={activeVehicle}
        currency={settings.currency}
        onClose={() => setShowAddFuel(false)}
        onSave={handleSaveFuel}
      />

      <AddServiceModal
        visible={showAddService}
        vehicle={activeVehicle}
        plans={plans}
        selectedPlanId={selectedPlanIdForService}
        currency={settings.currency}
        onClose={() => setShowAddService(false)}
        onSave={handleSaveService}
      />

      <AddExpenseModal
        visible={showAddExpense}
        vehicle={activeVehicle}
        currency={settings.currency}
        onClose={() => setShowAddExpense(false)}
        onSave={handleSaveExpense}
      />

      <AddPlanModal
        visible={showAddPlan}
        vehicle={activeVehicle}
        onClose={() => setShowAddPlan(false)}
        onSave={handleSavePlan}
      />

      <OdometerUpdateModal
        visible={showOdometerModal}
        vehicle={activeVehicle}
        onClose={() => setShowOdometerModal(false)}
        onSave={handleUpdateOdometer}
      />

      <ReceiptModal
        visible={showReceiptModal}
        imageUri={selectedReceiptUri}
        onClose={() => setShowReceiptModal(false)}
      />

      <AIAssistantModal
        visible={showAIAssistant}
        vehicle={activeVehicle}
        fuelEntries={fuelEntries}
        serviceRecords={serviceRecords}
        expenses={expenses}
        plans={plans}
        currency={settings.currency}
        onClose={() => setShowAIAssistant(false)}
        onTriggerAction={handleAITriggerAction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  splashContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  splashText: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 10,
  },
  splashSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.cardBorder,
    paddingVertical: 8,
    paddingBottom: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});
