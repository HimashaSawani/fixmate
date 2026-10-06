import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
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
  calculateUnifiedExpenses,
  processFuelEntries,
  evaluateMaintenancePlans,
} from '../services/calculations';
import {
  MonthlyBarChart,
  CategoryDonutChart,
  FuelTrendChart,
} from '../components/ChartWidgets';
import { exportVehicleToCsv, exportAllDataToJson } from '../services/backupExport';
import { useTheme } from '../theme';

interface ReportsScreenProps {
  vehicle: Vehicle | null;
  allVehicles?: Vehicle[];
  fuelEntries: FuelEntry[];
  serviceRecords: ServiceRecord[];
  expenses: ExpenseRecord[];
  plans?: MaintenancePlan[];
  currency: string;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  vehicle,
  allVehicles = [],
  fuelEntries,
  serviceRecords,
  expenses,
  plans = [],
  currency,
}) => {
  const { theme, isDark } = useTheme();
  const [exporting, setExporting] = useState(false);

  if (!vehicle) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Please select a vehicle
        </Text>
      </View>
    );
  }

  const unified = calculateUnifiedExpenses(fuelEntries, serviceRecords, expenses, vehicle);
  const { stats: fuelStats, processedEntries } = processFuelEntries(fuelEntries);
  const evaluatedPlans = evaluateMaintenancePlans(plans, vehicle.currentOdometer);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      await exportVehicleToCsv(vehicle);
    } catch (err) {
      Alert.alert('Export Error', 'Failed to generate and share CSV report.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJson = async () => {
    try {
      setExporting(true);
      await exportAllDataToJson(vehicle.id);
    } catch (err) {
      Alert.alert('Export Error', 'Failed to generate JSON backup.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
            Analytics & Reports
          </Text>
          <Text style={[styles.screenSub, { color: theme.colors.textSecondary }]}>
            {vehicle.name} Financial Intelligence
          </Text>
        </View>

        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleExportCsv}
            disabled={exporting}
            activeOpacity={0.8}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={15} color="#FFFFFF" />
                <Text style={styles.exportBtnText}>CSV</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.exportBtn,
              {
                backgroundColor: isDark ? theme.colors.surfaceHighlight : '#E2E8F0',
              },
            ]}
            onPress={handleExportJson}
            disabled={exporting}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={15} color={theme.colors.primary} />
            <Text style={[styles.exportBtnText, { color: theme.colors.primary }]}>JSON</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Total Ownership Cost Card */}
      <View
        style={[
          styles.grandCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            shadowColor: isDark ? '#000' : '#64748B',
          },
        ]}
      >
        <View style={styles.grandHeader}>
          <View>
            <Text style={[styles.grandLabel, { color: theme.colors.textMuted }]}>
              TOTAL RECORDED OWNERSHIP COST
            </Text>
            <Text style={[styles.grandValue, { color: theme.colors.textPrimary }]}>
              {currency} {unified.totalCost.toLocaleString()}
            </Text>
          </View>
          <View style={[styles.costPerKmPill, { backgroundColor: theme.colors.primaryMuted }]}>
            <Text style={[styles.costPerKmText, { color: theme.colors.primary }]}>
              {currency} {unified.costPerKm ? unified.costPerKm.toFixed(2) : '0.00'} / km
            </Text>
          </View>
        </View>

        {/* Distance & Period Indicator */}
        <View style={styles.periodRow}>
          <Text style={[styles.periodText, { color: theme.colors.textSecondary }]}>
            {unified.trackedDistance > 0
              ? `Distance over recorded period: ${unified.trackedDistance.toLocaleString()} km`
              : `Current Odometer: ${vehicle.currentOdometer.toLocaleString()} km`}
          </Text>
        </View>

        {/* Ownership Cost Category Inclusions Disclaimer */}
        <View
          style={[
            styles.disclaimerBox,
            {
              backgroundColor: isDark ? theme.colors.surfaceHighlight : '#F8FAFC',
            },
          ]}
        >
          <Ionicons name="information-circle" size={14} color={theme.colors.primary} />
          <Text style={[styles.disclaimerText, { color: theme.colors.textSecondary }]}>
            Includes recorded Fuel ({currency} {unified.fuelTotal.toLocaleString()}), Services (
            {currency} {unified.serviceTotal.toLocaleString()}), and Expenses.
          </Text>
        </View>
      </View>

      {/* Maintenance Health Status Widget */}
      {plans.length > 0 && (
        <View
          style={[
            styles.grandCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              shadowColor: isDark ? '#000' : '#64748B',
            },
          ]}
        >
          <Text style={[styles.grandLabel, { color: theme.colors.textMuted, marginBottom: 12 }]}>
            MAINTENANCE HEALTH STATUS ({plans.length} PLANS)
          </Text>
          <View style={styles.healthStatsGrid}>
            <View style={[styles.healthStatItem, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2' }]}>
              <Text style={[styles.healthStatNumber, { color: theme.colors.danger }]}>
                {evaluatedPlans.filter((p) => p.status === 'overdue').length}
              </Text>
              <Text style={[styles.healthStatLabel, { color: theme.colors.danger }]}>Overdue</Text>
            </View>

            <View style={[styles.healthStatItem, { backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB' }]}>
              <Text style={[styles.healthStatNumber, { color: theme.colors.warning }]}>
                {evaluatedPlans.filter((p) => p.status === 'due_soon').length}
              </Text>
              <Text style={[styles.healthStatLabel, { color: theme.colors.warning }]}>Due Soon</Text>
            </View>

            <View style={[styles.healthStatItem, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#F0FDF4' }]}>
              <Text style={[styles.healthStatNumber, { color: theme.colors.secondary }]}>
                {evaluatedPlans.filter((p) => p.status === 'good').length}
              </Text>
              <Text style={[styles.healthStatLabel, { color: theme.colors.secondary }]}>Good</Text>
            </View>
          </View>
        </View>
      )}

      {/* 1. Monthly Cost Trend Chart */}
      <MonthlyBarChart data={unified.monthlyBreakdown} currency={currency} />

      {/* 2. Category Distribution Chart */}
      <CategoryDonutChart
        categories={unified.categoryBreakdown}
        totalCost={unified.totalCost}
        currency={currency}
      />

      {/* 3. Fuel Efficiency Trend Curve */}
      <FuelTrendChart entries={processedEntries} />

      {/* 4. Multi-Vehicle Comparison (If user has multiple vehicles) */}
      {allVehicles.length > 1 && (
        <View
          style={[
            styles.vehicleCompareCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            },
          ]}
        >
          <Text style={[styles.sectionHeading, { color: theme.colors.textMuted }]}>
            GARAGE VEHICLES COMPARISON
          </Text>
          {allVehicles.map((v) => (
            <View key={v.id} style={styles.compareRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons
                  name={v.type === 'motorcycle' ? 'bicycle' : 'car-sport'}
                  size={16}
                  color={v.id === vehicle.id ? theme.colors.primary : theme.colors.textSecondary}
                />
                <View>
                  <Text
                    style={[
                      styles.compareName,
                      { color: theme.colors.textPrimary },
                      v.id === vehicle.id && { color: theme.colors.primary, fontWeight: '700' },
                    ]}
                  >
                    {v.name}
                  </Text>
                  <Text style={[styles.compareSub, { color: theme.colors.textSecondary }]}>
                    {v.make} {v.model} • {v.currentOdometer.toLocaleString()} km
                  </Text>
                </View>
              </View>
              {v.id === vehicle.id ? (
                <View style={[styles.activeTag, { backgroundColor: theme.colors.primaryMuted }]}>
                  <Text style={[styles.activeTagText, { color: theme.colors.primary }]}>Active</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* 5. Maintenance Health Check Summary */}
      <View
        style={[
          styles.maintenanceSummaryCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          },
        ]}
      >
        <Text style={[styles.sectionHeading, { color: theme.colors.textMuted }]}>
          MAINTENANCE HEALTH AUDIT
        </Text>
        <View style={styles.healthGrid}>
          <View style={styles.healthItem}>
            <Text style={[styles.healthVal, { color: theme.colors.success }]}>
              {evaluatedPlans.filter((p) => p.status === 'good').length}
            </Text>
            <Text style={[styles.healthLbl, { color: theme.colors.textSecondary }]}>
              Good Condition
            </Text>
          </View>
          <View style={styles.healthItem}>
            <Text style={[styles.healthVal, { color: theme.colors.warning }]}>
              {evaluatedPlans.filter((p) => p.status === 'due_soon').length}
            </Text>
            <Text style={[styles.healthLbl, { color: theme.colors.textSecondary }]}>Due Soon</Text>
          </View>
          <View style={styles.healthItem}>
            <Text style={[styles.healthVal, { color: theme.colors.danger }]}>
              {evaluatedPlans.filter((p) => p.status === 'overdue').length}
            </Text>
            <Text style={[styles.healthLbl, { color: theme.colors.textSecondary }]}>Overdue</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  exportButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  exportBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  grandCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  grandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  grandLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  grandValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  costPerKmPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  costPerKmText: {
    fontSize: 12,
    fontWeight: '800',
  },
  periodRow: {
    marginBottom: 10,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  healthStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  healthStatItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  healthStatNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  healthStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 10,
  },
  disclaimerText: {
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  vehicleCompareCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.1)',
  },
  compareName: {
    fontSize: 13,
    fontWeight: '600',
  },
  compareSub: {
    fontSize: 11,
  },
  activeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  maintenanceSummaryCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  healthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  healthItem: {
    alignItems: 'center',
    gap: 4,
  },
  healthVal: {
    fontSize: 24,
    fontWeight: '900',
  },
  healthLbl: {
    fontSize: 11,
    fontWeight: '600',
  },
});
