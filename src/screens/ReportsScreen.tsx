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
import { theme } from '../theme';

interface ReportsScreenProps {
  vehicle: Vehicle | null;
  allVehicles: Vehicle[];
  fuelEntries: FuelEntry[];
  serviceRecords: ServiceRecord[];
  expenses: ExpenseRecord[];
  plans: MaintenancePlan[];
  currency: string;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({
  vehicle,
  allVehicles,
  fuelEntries,
  serviceRecords,
  expenses,
  plans,
  currency,
}) => {
  const [exporting, setExporting] = useState(false);

  if (!vehicle) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Please select a vehicle</Text>
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.screenTitle}>Analytics & Reports</Text>
          <Text style={styles.screenSub}>{vehicle.name} Comprehensive Financial Intelligence</Text>
        </View>

        <View style={styles.exportButtons}>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={handleExportCsv}
            disabled={exporting}
            activeOpacity={0.8}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#0B0F19" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={15} color="#0B0F19" />
                <Text style={styles.exportBtnText}>CSV</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: theme.colors.surfaceHighlight }]}
            onPress={handleExportJson}
            disabled={exporting}
            activeOpacity={0.8}
          >
            <Ionicons name="download-outline" size={15} color={theme.colors.primaryLight} />
            <Text style={[styles.exportBtnText, { color: theme.colors.primaryLight }]}>JSON</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Total Ownership Cost Card */}
      <View style={styles.grandCard}>
        <View style={styles.grandHeader}>
          <View>
            <Text style={styles.grandLabel}>TOTAL RECORDED OWNERSHIP COST</Text>
            <Text style={styles.grandValue}>
              {currency} {unified.totalCost.toLocaleString()}
            </Text>
          </View>
          <View style={styles.costPerKmPill}>
            <Text style={styles.costPerKmText}>
              {currency} {unified.costPerKm.toFixed(2)} / km
            </Text>
          </View>
        </View>

        {/* Ownership Cost Category Inclusions Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle" size={14} color={theme.colors.primaryLight} />
          <Text style={styles.disclaimerText}>
            Includes recorded Fuel ({currency} {unified.fuelTotal.toLocaleString()}), Services ({currency}{' '}
            {unified.serviceTotal.toLocaleString()}), Repairs ({currency} {unified.repairTotal.toLocaleString()}), Insurance & Tax (
            {currency} {(unified.insuranceTotal + unified.registrationTotal).toLocaleString()}), Accessories & Other ({currency}{' '}
            {(unified.accessoriesTotal + unified.otherTotal).toLocaleString()}). Does not include unrecorded loan interest or asset depreciation.
          </Text>
        </View>
      </View>

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
        <View style={styles.vehicleCompareCard}>
          <Text style={styles.sectionHeading}>GARAGE VEHICLES COMPARISON</Text>
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
                      v.id === vehicle.id && { color: theme.colors.primaryLight, fontWeight: '700' },
                    ]}
                  >
                    {v.name}
                  </Text>
                  <Text style={styles.compareSub}>
                    {v.make} {v.model} • {v.currentOdometer.toLocaleString()} km
                  </Text>
                </View>
              </View>
              {v.id === vehicle.id ? (
                <View style={styles.activeTag}>
                  <Text style={styles.activeTagText}>Active</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* 5. Maintenance Health Check Summary */}
      <View style={styles.maintenanceSummaryCard}>
        <Text style={styles.sectionHeading}>MAINTENANCE HEALTH AUDIT</Text>
        <View style={styles.healthGrid}>
          <View style={styles.healthItem}>
            <Text style={[styles.healthVal, { color: theme.colors.secondary }]}>
              {evaluatedPlans.filter((p) => p.status === 'good').length}
            </Text>
            <Text style={styles.healthLbl}>Good Condition</Text>
          </View>
          <View style={styles.healthItem}>
            <Text style={[styles.healthVal, { color: theme.colors.warning }]}>
              {evaluatedPlans.filter((p) => p.status === 'due_soon').length}
            </Text>
            <Text style={styles.healthLbl}>Due Soon</Text>
          </View>
          <View style={styles.healthItem}>
            <Text style={[styles.healthVal, { color: theme.colors.danger }]}>
              {evaluatedPlans.filter((p) => p.status === 'overdue').length}
            </Text>
            <Text style={styles.healthLbl}>Overdue</Text>
          </View>
        </View>
      </View>
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
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  screenTitle: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  screenSub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportBtnText: {
    color: '#0B0F19',
    fontSize: 12,
    fontWeight: '700',
  },
  grandCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorderActive,
    marginBottom: 16,
  },
  grandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  grandLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  grandValue: {
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  costPerKmPill: {
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  costPerKmText: {
    color: theme.colors.primaryLight,
    fontSize: 12,
    fontWeight: '700',
  },
  disclaimerBox: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  disclaimerText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    lineHeight: 14,
    flex: 1,
  },
  vehicleCompareCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: 16,
  },
  sectionHeading: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  compareName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  compareSub: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  activeTag: {
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeTagText: {
    color: theme.colors.primaryLight,
    fontSize: 10,
    fontWeight: '700',
  },
  maintenanceSummaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: 16,
  },
  healthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  healthItem: {
    alignItems: 'center',
  },
  healthVal: {
    fontSize: 22,
    fontWeight: '800',
  },
  healthLbl: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
