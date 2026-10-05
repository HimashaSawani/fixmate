import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
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
  MaintenanceStatusResult,
} from '../services/calculations';
import { StatCard } from '../components/StatCard';
import { MaintenancePlanCard } from '../components/MaintenancePlanCard';
import { FuelEntryCard } from '../components/FuelEntryCard';
import { ServiceRecordCard } from '../components/ServiceRecordCard';
import { ExpenseCard } from '../components/ExpenseCard';
import { theme } from '../theme';

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
  if (!vehicle) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="car-outline" size={48} color={theme.colors.textMuted} />
        <Text style={styles.emptyTitle}>No Vehicle Selected</Text>
        <Text style={styles.emptySubtitle}>Add or select a vehicle to view dashboard</Text>
      </View>
    );
  }

  const { stats: fuelStats, processedEntries } = processFuelEntries(fuelEntries);
  const expenseSummary = calculateUnifiedExpenses(fuelEntries, serviceRecords, expenses, vehicle);
  const evaluatedPlans = evaluateMaintenancePlans(plans, vehicle.currentOdometer);

  // Urgent alerts
  const urgentPlans = evaluatedPlans.filter(
    (p) => p.status === 'overdue' || p.status === 'due_soon'
  );

  // Recent activity: pick latest items from fuel, services, expenses
  const recentFuel = processedEntries.slice(0, 2);
  const recentServices = serviceRecords.slice(0, 2);
  const recentExpenses = expenses.filter((e) => !e.linkedServiceId && !e.linkedFuelId).slice(0, 2);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
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
      {/* Active Vehicle Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <View style={styles.badgeRow}>
              <View style={styles.typeTag}>
                <Ionicons
                  name={vehicle.type === 'motorcycle' ? 'bicycle' : 'car-sport'}
                  size={12}
                  color={theme.colors.primaryLight}
                />
                <Text style={styles.typeTagText}>{vehicle.type.toUpperCase()}</Text>
              </View>
              {vehicle.regNumber && (
                <View style={styles.regTag}>
                  <Text style={styles.regTagText}>{vehicle.regNumber}</Text>
                </View>
              )}
            </View>
            <Text style={styles.heroName}>{vehicle.name}</Text>
            <Text style={styles.heroModel}>
              {vehicle.make} {vehicle.model} • {vehicle.year}
            </Text>
          </View>

          {/* Odometer Card */}
          <TouchableOpacity
            style={styles.heroOdometerBox}
            onPress={onOpenOdometerModal}
            activeOpacity={0.8}
          >
            <Text style={styles.heroOdoLabel}>ODOMETER</Text>
            <Text style={styles.heroOdoVal}>{vehicle.currentOdometer.toLocaleString()}</Text>
            <View style={styles.heroOdoBtn}>
              <Ionicons name="pencil" size={10} color={theme.colors.primary} />
              <Text style={styles.heroOdoBtnText}>Update</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Action Floating Bar */}
        <View style={styles.quickBar}>
          <TouchableOpacity style={styles.quickBtn} onPress={onOpenAddFuel}>
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(6, 182, 212, 0.2)' }]}>
              <Ionicons name="speedometer-outline" size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.quickBtnText}>+ Fuel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={() => onOpenAddService()}>
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.2)' }]}>
              <Ionicons name="construct-outline" size={16} color={theme.colors.secondary} />
            </View>
            <Text style={styles.quickBtnText}>+ Service</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={onOpenAddExpense}>
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.2)' }]}>
              <Ionicons name="receipt-outline" size={16} color={theme.colors.warning} />
            </View>
            <Text style={styles.quickBtnText}>+ Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickBtn} onPress={onOpenOdometerModal}>
            <View style={[styles.quickIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <Ionicons name="speedometer" size={16} color={theme.colors.accentLight} />
            </View>
            <Text style={styles.quickBtnText}>+ Mileage</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Metric Stats Grid */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>PERFORMANCE & HEALTH</Text>
      </View>
      <View style={styles.statsGrid}>
        <StatCard
          title="Avg Economy"
          value={fuelStats.overallAvgKmL > 0 ? fuelStats.overallAvgKmL : '—'}
          unit="km/L"
          subtitle={fuelStats.lastKmL ? `Last: ${fuelStats.lastKmL} km/L` : 'Need full fill-ups'}
          icon="speedometer"
          accentColor={theme.colors.primary}
        />
        <StatCard
          title="Total Cost"
          value={`${(expenseSummary.totalCost / 1000).toFixed(1)}k`}
          unit={currency}
          subtitle={`Cost/km: ${currency} ${expenseSummary.costPerKm.toFixed(2)}`}
          icon="cash-outline"
          accentColor={theme.colors.secondary}
        />
      </View>

      {/* Urgent Maintenance Banner */}
      {urgentPlans.length > 0 && (
        <View style={styles.urgentSection}>
          <View style={styles.urgentHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="warning" size={16} color={theme.colors.warning} />
              <Text style={styles.urgentTitle}>
                ATTENTION REQUIRED ({urgentPlans.length} DUE)
              </Text>
            </View>
            <TouchableOpacity onPress={() => onNavigateTab('maintenance')}>
              <Text style={styles.viewAllText}>View All Plans →</Text>
            </TouchableOpacity>
          </View>

          {urgentPlans.slice(0, 2).map((item) => (
            <MaintenancePlanCard
              key={item.plan.id}
              item={item}
              onLogService={(plan) => onOpenAddService(plan.plan.id)}
            />
          ))}
        </View>
      )}

      {/* Upcoming Maintenance Preview */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>MAINTENANCE SCHEDULE</Text>
        <TouchableOpacity onPress={() => onNavigateTab('maintenance')}>
          <Text style={styles.viewAllText}>Manage Plans</Text>
        </TouchableOpacity>
      </View>

      {evaluatedPlans.slice(0, 2).map((item) => (
        <MaintenancePlanCard
          key={item.plan.id}
          item={item}
          onLogService={(plan) => onOpenAddService(plan.plan.id)}
        />
      ))}

      {/* Recent Activity Feed */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
        <TouchableOpacity onPress={() => onNavigateTab('fuel')}>
          <Text style={styles.viewAllText}>View Logs</Text>
        </TouchableOpacity>
      </View>

      {recentFuel.length === 0 && recentServices.length === 0 && (
        <View style={styles.emptyFeed}>
          <Text style={styles.emptyFeedText}>No recent fuel or service activities recorded.</Text>
        </View>
      )}

      {recentFuel.map((entry) => (
        <FuelEntryCard
          key={entry.id}
          entry={entry}
          currency={currency}
          onPressReceipt={onOpenReceipt}
        />
      ))}

      {recentServices.map((record) => (
        <ServiceRecordCard
          key={record.id}
          record={record}
          currency={currency}
          onPressReceipt={onOpenReceipt}
        />
      ))}

      {recentExpenses.map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          currency={currency}
          onPressReceipt={onOpenReceipt}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
  heroCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderActive,
    marginBottom: 16,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeTagText: {
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
  },
  regTag: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  regTagText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  heroName: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  heroModel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  heroOdometerBox: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  heroOdoLabel: {
    color: theme.colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroOdoVal: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  heroOdoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  heroOdoBtnText: {
    color: theme.colors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  quickBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  quickBtn: {
    alignItems: 'center',
    flex: 1,
  },
  quickIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  quickBtnText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  viewAllText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  urgentSection: {
    marginBottom: 16,
  },
  urgentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  urgentTitle: {
    color: theme.colors.warning,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  emptyFeed: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  emptyFeedText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
});
