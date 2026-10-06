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
import { evaluateMaintenancePlans } from './src/services/calculations';
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
import { NotificationsModal } from './src/components/NotificationsModal';
import { ThemeProvider, useTheme } from './src/theme';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.splashContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.splashText}>Something went wrong</Text>
          <Text style={[styles.splashSub, { textAlign: 'center', marginHorizontal: 20 }]}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 20,
              backgroundColor: '#2563EB',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

type TabType = 'dashboard' | 'fuel' | 'maintenance' | 'expenses' | 'reports' | 'settings';

function MainApp() {
  const { theme, isDark } = useTheme();

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  // App State
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

  // Modal State
  const [showAddVehicle, setShowAddVehicle] = useState<boolean>(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showAddFuel, setShowAddFuel] = useState<boolean>(false);
  const [showAddService, setShowAddService] = useState<boolean>(false);
  const [selectedPlanIdForService, setSelectedPlanIdForService] = useState<string | undefined>();
  const [showAddExpense, setShowAddExpense] = useState<boolean>(false);
  const [showAddPlan, setShowAddPlan] = useState<boolean>(false);
  const [showOdometerModal, setShowOdometerModal] = useState<boolean>(false);
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);
  const [selectedReceiptUri, setSelectedReceiptUri] = useState<string | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState<boolean>(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);

  // Maintenance notifications badge count
  const evaluatedAlerts = evaluateMaintenancePlans(plans, activeVehicle?.currentOdometer || 0);
  const notificationCount = evaluatedAlerts.filter(
    (e) => e.status === 'overdue' || e.status === 'due_soon'
  ).length;

  // Load data for active vehicle
  const loadVehicleData = useCallback(async (vehicleId: string) => {
    try {
      const [fuel, services, exps, plns] = await Promise.all([
        getFuelEntries(vehicleId),
        getServiceRecords(vehicleId),
        getExpenses(vehicleId),
        getMaintenancePlans(vehicleId),
      ]);
      setFuelEntries(fuel);
      setServiceRecords(services);
      setExpenses(exps);
      setPlans(plns);
    } catch (err) {
      console.error('Failed to load vehicle data:', err);
    }
  }, []);

  // Full Refresh
  const refreshAll = useCallback(async () => {
    try {
      setRefreshing(true);
      const appSettings = await getSettings();
      setSettings(appSettings);

      const allVehicles = await getAllVehicles();
      setVehicles(allVehicles);

      if (allVehicles.length > 0) {
        const currentId = activeVehicle?.id || allVehicles[0].id;
        const matched = allVehicles.find((v) => v.id === currentId) || allVehicles[0];
        setActiveVehicle(matched);
        await loadVehicleData(matched.id);
      } else {
        setActiveVehicle(null);
        setFuelEntries([]);
        setServiceRecords([]);
        setExpenses([]);
        setPlans([]);
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [activeVehicle?.id, loadVehicleData]);

  // Initial Bootstrap
  useEffect(() => {
    const bootstrap = async () => {
      try {
        await initDatabase();
        await refreshAll();
      } catch (err) {
        console.error('Bootstrap error:', err);
        setLoading(false);
      }
    };
    bootstrap();
  }, []);

  // Switch Vehicle
  const handleSelectVehicle = (vehicle: Vehicle) => {
    setActiveVehicle(vehicle);
    loadVehicleData(vehicle.id);
  };

  // Save/Create Vehicle
  const handleSaveVehicle = async (vehicleData: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingVehicle) {
      const updated: Vehicle = {
        ...editingVehicle,
        ...vehicleData,
        updatedAt: new Date().toISOString(),
      };
      await updateVehicle(updated);
      setEditingVehicle(null);
    } else {
      const newVehicle: Vehicle = {
        id: 'veh_' + Date.now(),
        ...vehicleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await insertVehicle(newVehicle);
      setActiveVehicle(newVehicle);
    }
    await refreshAll();
  };

  // Delete Vehicle
  const handleDeleteVehicle = async (id: string) => {
    await deleteVehicle(id);
    await refreshAll();
  };

  // Update Odometer
  const handleUpdateOdometer = async (newOdometer: number) => {
    if (!activeVehicle) return;
    await updateVehicleOdometer(activeVehicle.id, newOdometer);
    const updated = await getVehicleById(activeVehicle.id);
    if (updated) {
      setActiveVehicle(updated);
    }
    await refreshAll();
  };

  // Fuel Handlers
  const handleSaveFuel = async (fuelData: Omit<FuelEntry, 'id' | 'createdAt'>) => {
    const newEntry: FuelEntry = {
      id: 'fuel_' + Date.now(),
      ...fuelData,
      createdAt: new Date().toISOString(),
    };
    await insertFuelEntry(newEntry);
    if (activeVehicle) {
      await loadVehicleData(activeVehicle.id);
      const updated = await getVehicleById(activeVehicle.id);
      if (updated) setActiveVehicle(updated);
    }
  };

  const handleDeleteFuel = async (id: string) => {
    await deleteFuelEntry(id);
    if (activeVehicle) await loadVehicleData(activeVehicle.id);
  };

  // Service Handlers
  const handleSaveService = async (serviceData: Omit<ServiceRecord, 'id' | 'createdAt'>) => {
    const newService: ServiceRecord = {
      id: 'srv_' + Date.now(),
      ...serviceData,
      createdAt: new Date().toISOString(),
    };
    await insertServiceRecord(newService);
    if (activeVehicle) {
      await loadVehicleData(activeVehicle.id);
      const updated = await getVehicleById(activeVehicle.id);
      if (updated) setActiveVehicle(updated);
    }
  };

  const handleDeleteService = async (id: string) => {
    await deleteServiceRecord(id);
    if (activeVehicle) await loadVehicleData(activeVehicle.id);
  };

  // Expense Handlers
  const handleSaveExpense = async (expenseData: Omit<ExpenseRecord, 'id' | 'createdAt'>) => {
    const newExpense: ExpenseRecord = {
      id: 'exp_' + Date.now(),
      ...expenseData,
      createdAt: new Date().toISOString(),
    };
    await insertExpense(newExpense);
    if (activeVehicle) await loadVehicleData(activeVehicle.id);
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
    if (activeVehicle) await loadVehicleData(activeVehicle.id);
  };

  // Plan Handlers
  const handleSavePlan = async (planData: Omit<MaintenancePlan, 'id' | 'createdAt'>) => {
    const newPlan: MaintenancePlan = {
      id: 'plan_' + Date.now(),
      ...planData,
      createdAt: new Date().toISOString(),
    };
    await insertMaintenancePlan(newPlan);
    if (activeVehicle) await loadVehicleData(activeVehicle.id);
  };

  const handleDeletePlan = async (id: string) => {
    await deleteMaintenancePlan(id);
    if (activeVehicle) await loadVehicleData(activeVehicle.id);
  };

  // Settings Handlers
  const handleSaveSettings = async (newSettings: AppSettings) => {
    await saveSetting('currency', newSettings.currency);
    await saveSetting('distanceUnit', newSettings.distanceUnit);
    await saveSetting('volumeUnit', newSettings.volumeUnit);
    await saveSetting('enableNotifications', String(newSettings.enableNotifications));
    await saveSetting('theme', newSettings.theme);
    setSettings(newSettings);
  };

  // AI Assistant Trigger Action
  const handleAITriggerAction = (actionType: string) => {
    setShowAIAssistant(false);
    if (actionType === 'add_fuel') setShowAddFuel(true);
    else if (actionType === 'add_service') setShowAddService(true);
    else if (actionType === 'add_expense') setShowAddExpense(true);
    else if (actionType === 'update_odo') setShowOdometerModal(true);
  };

  // Receipt Modal Open
  const handleOpenReceipt = (uri: string) => {
    setSelectedReceiptUri(uri);
    setShowReceiptModal(true);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.splashContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.splashText, { color: theme.colors.textPrimary }]}>FixMate</Text>
        <Text style={[styles.splashSub, { color: theme.colors.textSecondary }]}>
          Loading your garage...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />

      {/* Global Header */}
      <Header
        activeVehicle={activeVehicle}
        vehicles={vehicles}
        notificationCount={notificationCount}
        onSelectVehicle={handleSelectVehicle}
        onOpenAddVehicle={() => {
          setEditingVehicle(null);
          setShowAddVehicle(true);
        }}
        onOpenOdometerModal={() => setShowOdometerModal(true)}
        onOpenNotifications={() => setShowNotificationsModal(true)}
        onOpenAIAssistant={() => setShowAIAssistant(true)}
      />

      {/* Main Screen Views */}
      <View style={[styles.screenContainer, { backgroundColor: theme.colors.background }]}>
        {currentTab === 'dashboard' && (
          <DashboardScreen
            vehicle={activeVehicle}
            fuelEntries={fuelEntries}
            serviceRecords={serviceRecords}
            expenses={expenses}
            plans={plans}
            currency={settings.currency}
            onRefresh={refreshAll}
            refreshing={refreshing}
            onOpenAddFuel={() => setShowAddFuel(true)}
            onOpenAddService={(planId) => {
              setSelectedPlanIdForService(planId);
              setShowAddService(true);
            }}
            onOpenAddExpense={() => setShowAddExpense(true)}
            onOpenOdometerModal={() => setShowOdometerModal(true)}
            onOpenReceipt={handleOpenReceipt}
            onNavigateTab={(tab) => {
              if (tab === 'Fuel') setCurrentTab('fuel');
              else if (tab === 'Service') setCurrentTab('maintenance');
              else if (tab === 'Expenses') setCurrentTab('expenses');
              else if (tab === 'Reports') setCurrentTab('reports');
              else if (tab === 'More') setCurrentTab('settings');
            }}
          />
        )}

        {currentTab === 'fuel' && (
          <FuelLogScreen
            vehicle={activeVehicle}
            fuelEntries={fuelEntries}
            currency={settings.currency}
            onOpenAddFuel={() => setShowAddFuel(true)}
            onDeleteFuel={handleDeleteFuel}
            onOpenReceipt={handleOpenReceipt}
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
            onDeleteExpense={handleDeleteExpense}
            onOpenReceipt={handleOpenReceipt}
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
            onSaveSettings={handleSaveSettings}
            onOpenAddVehicle={() => {
              setEditingVehicle(null);
              setShowAddVehicle(true);
            }}
            onEditVehicle={(v) => {
              setEditingVehicle(v);
              setShowAddVehicle(true);
            }}
            onDeleteVehicle={handleDeleteVehicle}
            onSelectVehicle={handleSelectVehicle}
            onRestoreComplete={refreshAll}
          />
        )}
      </View>

      {/* Modern Bottom Navigation Bar with Prominent Floating Action (+) Button */}
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: isDark ? theme.colors.surface : '#FFFFFF',
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            shadowColor: isDark ? '#000' : '#64748B',
          },
        ]}
      >
        {/* 1. Home Tab */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('dashboard')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'dashboard' ? 'home' : 'home-outline'}
            size={22}
            color={currentTab === 'dashboard' ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              { color: currentTab === 'dashboard' ? theme.colors.primary : theme.colors.textMuted },
              currentTab === 'dashboard' && styles.navLabelActive,
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* 2. Vehicles / Maintenance Tab */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('maintenance')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'maintenance' ? 'car-sport' : 'car-sport-outline'}
            size={22}
            color={currentTab === 'maintenance' ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              {
                color:
                  currentTab === 'maintenance' ? theme.colors.primary : theme.colors.textMuted,
              },
              currentTab === 'maintenance' && styles.navLabelActive,
            ]}
          >
            Vehicles
          </Text>
        </TouchableOpacity>

        {/* 3. Center Prominent Action (+) Button */}
        <View style={styles.centerFabContainer}>
          <TouchableOpacity
            style={[
              styles.centerFab,
              {
                backgroundColor: theme.colors.primary,
                shadowColor: theme.colors.primary,
              },
            ]}
            onPress={() => {
              if (currentTab === 'fuel') setShowAddFuel(true);
              else if (currentTab === 'maintenance') setShowAddService(true);
              else if (currentTab === 'expenses') setShowAddExpense(true);
              else setShowAddFuel(true);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* 4. Reports Tab */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('reports')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'reports' ? 'bar-chart' : 'bar-chart-outline'}
            size={22}
            color={currentTab === 'reports' ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              { color: currentTab === 'reports' ? theme.colors.primary : theme.colors.textMuted },
              currentTab === 'reports' && styles.navLabelActive,
            ]}
          >
            Reports
          </Text>
        </TouchableOpacity>

        {/* 5. More / Settings Tab */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('settings')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={currentTab === 'settings' ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'}
            size={22}
            color={currentTab === 'settings' ? theme.colors.primary : theme.colors.textMuted}
          />
          <Text
            style={[
              styles.navLabel,
              { color: currentTab === 'settings' ? theme.colors.primary : theme.colors.textMuted },
              currentTab === 'settings' && styles.navLabelActive,
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

      <NotificationsModal
        visible={showNotificationsModal}
        vehicle={activeVehicle}
        plans={plans}
        onClose={() => setShowNotificationsModal(false)}
        onOpenAddService={(planId) => {
          setSelectedPlanIdForService(planId);
          setShowAddService(true);
        }}
        onNavigateToMaintenance={() => setCurrentTab('maintenance')}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  splashText: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 10,
  },
  splashSub: {
    fontSize: 13,
  },
  bottomNav: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingBottom: 12,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 8,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    alignItems: 'center',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  navLabelActive: {
    fontWeight: '800',
  },
  centerFabContainer: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  centerFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});
