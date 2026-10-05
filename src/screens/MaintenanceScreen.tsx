import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaintenancePlan, ServiceRecord, Vehicle } from '../types';
import { evaluateMaintenancePlans } from '../services/calculations';
import { MaintenancePlanCard } from '../components/MaintenancePlanCard';
import { ServiceRecordCard } from '../components/ServiceRecordCard';
import { StatCard } from '../components/StatCard';
import { theme } from '../theme';

interface MaintenanceScreenProps {
  vehicle: Vehicle | null;
  plans: MaintenancePlan[];
  serviceRecords: ServiceRecord[];
  currency: string;
  onOpenAddService: (planId?: string) => void;
  onOpenAddPlan: () => void;
  onOpenReceipt: (uri: string) => void;
  onDeleteService: (id: string) => Promise<void>;
  onDeletePlan: (id: string) => Promise<void>;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  vehicle,
  plans,
  serviceRecords,
  currency,
  onOpenAddService,
  onOpenAddPlan,
  onOpenReceipt,
  onDeleteService,
  onDeletePlan,
}) => {
  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');

  if (!vehicle) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Please select a vehicle</Text>
      </View>
    );
  }

  const evaluatedPlans = evaluateMaintenancePlans(plans, vehicle.currentOdometer);
  const overdueCount = evaluatedPlans.filter((p) => p.status === 'overdue').length;
  const dueSoonCount = evaluatedPlans.filter((p) => p.status === 'due_soon').length;
  const totalServiceSpent = serviceRecords.reduce((sum, s) => sum + s.totalCost, 0);

  const handleDeleteService = (id: string) => {
    Alert.alert(
      'Delete Service Record',
      'Are you sure you want to delete this completed service record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteService(id),
        },
      ]
    );
  };

  const handleDeletePlan = (id: string) => {
    Alert.alert(
      'Delete Maintenance Plan',
      'Are you sure you want to remove this maintenance schedule interval?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeletePlan(id),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.screenTitle}>Maintenance & Services</Text>
          <Text style={styles.screenSub}>Mileage & Date Threshold Intervals</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => onOpenAddService()}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#0B0F19" />
          <Text style={styles.addBtnText}>Log Service</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Stat Cards */}
      <View style={styles.statsRow}>
        <StatCard
          title="Due Status"
          value={overdueCount > 0 ? `${overdueCount} Overdue` : dueSoonCount > 0 ? `${dueSoonCount} Due Soon` : 'All Good'}
          subtitle={`${evaluatedPlans.length} active service plans`}
          icon="construct-outline"
          accentColor={overdueCount > 0 ? theme.colors.danger : dueSoonCount > 0 ? theme.colors.warning : theme.colors.secondary}
        />
        <StatCard
          title="Service Spent"
          value={`${currency} ${(totalServiceSpent / 1000).toFixed(1)}k`}
          subtitle={`${serviceRecords.length} completed records`}
          icon="receipt-outline"
          accentColor={theme.colors.secondary}
        />
      </View>

      {/* Segmented Control Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'plans' && styles.tabBtnActive]}
          onPress={() => setActiveTab('plans')}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={activeTab === 'plans' ? theme.colors.primaryLight : theme.colors.textSecondary}
          />
          <Text style={[styles.tabBtnText, activeTab === 'plans' && styles.tabBtnTextActive]}>
            Service Plans ({plans.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'history' ? theme.colors.primaryLight : theme.colors.textSecondary}
          />
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
            Service History ({serviceRecords.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab 1: Maintenance Plans */}
      {activeTab === 'plans' && (
        <View>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listSectionTitle}>AUTOMATIC INTERVALS</Text>
            <TouchableOpacity onPress={onOpenAddPlan}>
              <Text style={styles.addPlanLink}>+ Custom Plan</Text>
            </TouchableOpacity>
          </View>

          {evaluatedPlans.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="construct-outline" size={36} color={theme.colors.textMuted} />
              <Text style={styles.emptyCardTitle}>No Service Plans Configured</Text>
              <Text style={styles.emptyCardSub}>
                Add service plans with custom km and month intervals to stay on top of vehicle health.
              </Text>
            </View>
          ) : (
            evaluatedPlans.map((item) => (
              <MaintenancePlanCard
                key={item.plan.id}
                item={item}
                onLogService={(p) => onOpenAddService(p.plan.id)}
                onDelete={item.plan.isCustom ? handleDeletePlan : undefined}
              />
            ))
          )}
        </View>
      )}

      {/* Tab 2: Service History */}
      {activeTab === 'history' && (
        <View>
          <View style={styles.listHeaderRow}>
            <Text style={styles.listSectionTitle}>COMPLETED SERVICE EVENTS</Text>
          </View>

          {serviceRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={36} color={theme.colors.textMuted} />
              <Text style={styles.emptyCardTitle}>No Service History Logged</Text>
              <Text style={styles.emptyCardSub}>
                Log completed maintenance records to keep track of parts, labour costs, and invoices.
              </Text>
            </View>
          ) : (
            serviceRecords.map((record) => (
              <ServiceRecordCard
                key={record.id}
                record={record}
                currency={currency}
                onPressReceipt={onOpenReceipt}
                onDelete={handleDeleteService}
              />
            ))
          )}
        </View>
      )}
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#0B0F19',
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.surfaceHighlight,
  },
  tabBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    color: theme.colors.primaryLight,
    fontWeight: '700',
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  listSectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  addPlanLink: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginTop: 10,
  },
  emptyCardTitle: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptyCardSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
