import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Vehicle,
  FuelEntry,
  ServiceRecord,
  ExpenseRecord,
  MaintenancePlan,
} from '../types';
import {
  processFuelEntries,
  evaluateMaintenancePlans,
  calculateUnifiedExpenses,
} from '../services/calculations';
import { VehicleHeroCard } from '../components/VehicleHeroCard';
import { QuickActions } from '../components/QuickActions';
import { SummaryMetricCards } from '../components/SummaryMetricCards';
import { UpcomingMaintenanceWidget } from '../components/UpcomingMaintenanceWidget';
import { FuelEntryCard } from '../components/FuelEntryCard';
import { ServiceRecordCard } from '../components/ServiceRecordCard';
import { ExpenseCard } from '../components/ExpenseCard';
import { useTheme } from '../theme';

interface DashboardScreenProps {
  vehicle: Vehicle | null;
  fuelEntries: FuelEntry[];
  serviceRecords: ServiceRecord[];
  expenses: ExpenseRecord[];
  plans: MaintenancePlan[];
  currency: string;
  onRefresh: () => void;
  refreshing: boolean;
  onOpenAddFuel: () => void;
  onOpenAddService: (planId?: string) => void;
  onOpenAddExpense: () => void;
  onOpenOdometerModal: () => void;
  onOpenReceipt: (uri: string) => void;
  onNavigateTab: (tabName: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  vehicle,
  fuelEntries,
  serviceRecords,
  expenses,
  plans,
  currency,
  onRefresh,
  refreshing,
  onOpenAddFuel,
  onOpenAddService,
  onOpenAddExpense,
  onOpenOdometerModal,
  onOpenReceipt,
  onNavigateTab,
}) => {
  const { theme, isDark } = useTheme();

  if (!vehicle) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="car-outline" size={48} color={theme.colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
          No Vehicle Selected
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Add or select a vehicle to view dashboard
        </Text>
      </View>
    );
  }

  const { stats: fuelStats, processedEntries } = processFuelEntries(fuelEntries);
  const expenseSummary = calculateUnifiedExpenses(fuelEntries, serviceRecords, expenses, vehicle);
  const evaluatedPlans = evaluateMaintenancePlans(plans, vehicle.currentOdometer);

  const monthlyDisplayAmount = expenseSummary.currentMonthTotal;
  const monthlyDisplayLabel = expenseSummary.currentMonthLabel;

  // Recent activity: latest 3 events
  const recentFuel = processedEntries.slice(0, 2);
  const recentServices = serviceRecords.slice(0, 2);
  const recentExpenses = expenses
    .filter((e) => !e.linkedServiceId && !e.linkedFuelId)
    .slice(0, 2);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* 1. Vehicle Hero Card */}
      <VehicleHeroCard
        vehicle={vehicle}
        plans={plans}
        onPressOdometer={onOpenOdometerModal}
        onPressService={() => onNavigateTab('Service')}
      />

      {/* 2. Quick Actions Row */}
      <QuickActions
        onAddFuel={onOpenAddFuel}
        onAddService={() => onOpenAddService()}
        onAddExpense={onOpenAddExpense}
        onScanReceipt={onOpenAddExpense}
      />

      {/* 3. Summary Metric Cards with Sparklines */}
      <SummaryMetricCards
        monthlyExpense={monthlyDisplayAmount}
        monthLabel={monthlyDisplayLabel}
        fuelEconomy={fuelStats.overallAvgKmL}
        currency={currency}
        onPressExpenses={() => onNavigateTab('Expenses')}
        onPressFuel={() => onNavigateTab('Fuel')}
      />

      {/* 4. Upcoming Maintenance Section */}
      <UpcomingMaintenanceWidget
        plans={plans}
        vehicle={vehicle}
        onViewAll={() => onNavigateTab('Service')}
        onSelectPlan={(plan) => onOpenAddService(plan.id)}
      />

      {/* 5. Recent Activity List */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Recent activity
          </Text>
          <TouchableOpacity onPress={() => onNavigateTab('Expenses')} activeOpacity={0.7}>
            <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>History</Text>
          </TouchableOpacity>
        </View>

        {recentFuel.length === 0 && recentServices.length === 0 && recentExpenses.length === 0 ? (
          <View
            style={[
              styles.emptyRecentCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              },
            ]}
          >
            <Ionicons name="receipt-outline" size={32} color={theme.colors.textMuted} />
            <Text style={[styles.emptyRecentText, { color: theme.colors.textSecondary }]}>
              No recent logs recorded yet. Use quick actions above to add entries.
            </Text>
          </View>
        ) : (
          <View style={styles.activityList}>
            {recentServices.map((service) => (
              <ServiceRecordCard
                key={service.id}
                service={service}
                currency={currency}
                onViewReceipt={onOpenReceipt}
              />
            ))}

            {recentFuel.map((entry) => (
              <FuelEntryCard
                key={entry.id}
                entry={entry}
                currency={currency}
                onPressReceipt={onOpenReceipt}
              />
            ))}

            {recentExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                currency={currency}
                onViewReceipt={onOpenReceipt}
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  recentSection: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
  },
  activityList: {
    gap: 10,
  },
  emptyRecentCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyRecentText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
