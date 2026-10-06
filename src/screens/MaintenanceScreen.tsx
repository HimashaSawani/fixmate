import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { MaintenancePlan, ServiceRecord, Vehicle } from '../types';
import { evaluateMaintenancePlans } from '../services/calculations';
import { ServiceRecordCard } from '../components/ServiceRecordCard';
import { useTheme } from '../theme';

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
  const { theme, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'plans' | 'history'>('plans');

  if (!vehicle) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="build-outline" size={48} color={theme.colors.textMuted} />
        <Text style={[styles.emptyText, { color: theme.colors.textPrimary }]}>
          Please select a vehicle
        </Text>
      </View>
    );
  }

  const evaluatedPlans = evaluateMaintenancePlans(plans, vehicle.currentOdometer);
  const upcomingCount = evaluatedPlans.filter(
    (p) => p.status === 'due_soon' || p.status === 'overdue' || p.status === 'good'
  ).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Segmented Tabs: Plans vs History */}
      <View style={styles.tabContainer}>
        <View
          style={[
            styles.tabTrack,
            {
              backgroundColor: isDark ? theme.colors.surfaceHighlight : '#E2E8F0',
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'plans' && [
                styles.tabBtnActive,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('plans')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'plans'
                      ? '#FFFFFF'
                      : isDark
                      ? theme.colors.textSecondary
                      : '#64748B',
                },
                activeTab === 'plans' && styles.tabTextActive,
              ]}
            >
              Plans
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabBtn,
              activeTab === 'history' && [
                styles.tabBtnActive,
                { backgroundColor: theme.colors.primary },
              ],
            ]}
            onPress={() => setActiveTab('history')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === 'history'
                      ? '#FFFFFF'
                      : isDark
                      ? theme.colors.textSecondary
                      : '#64748B',
                },
                activeTab === 'history' && styles.tabTextActive,
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Blue Hero Banner: "2 upcoming services" */}
      <TouchableOpacity
        style={[
          styles.bannerCard,
          {
            backgroundColor: isDark ? '#1E3A8A' : '#2563EB',
          },
        ]}
        onPress={() => onOpenAddPlan()}
        activeOpacity={0.85}
      >
        <View style={styles.bannerLeft}>
          <View style={styles.bannerIconWrap}>
            <Ionicons name="calendar-outline" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.bannerTexts}>
            <Text style={styles.bannerCountText}>
              <Text style={styles.bannerCountNumber}>{upcomingCount} </Text>
              upcoming services
            </Text>
            <Text style={styles.bannerSubText}>Keep your vehicle in top condition</Text>
          </View>
        </View>

        <View style={styles.bannerArrow}>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* 3. Tab Contents */}
      {activeTab === 'plans' ? (
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Upcoming services
            </Text>
            <TouchableOpacity onPress={() => onOpenAddPlan()} activeOpacity={0.7}>
              <Text style={[styles.addPlanText, { color: theme.colors.primary }]}>+ New Plan</Text>
            </TouchableOpacity>
          </View>

          {evaluatedPlans.length === 0 ? (
            <View
              style={[
                styles.emptyPlansCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              ]}
            >
              <MaterialCommunityIcons name="car-wrench" size={40} color={theme.colors.textMuted} />
              <Text style={[styles.emptyPlansTitle, { color: theme.colors.textPrimary }]}>
                No Maintenance Plans
              </Text>
              <Text style={[styles.emptyPlansSub, { color: theme.colors.textSecondary }]}>
                Add service intervals to track oil changes, tire rotations, and brake inspections.
              </Text>
              <TouchableOpacity
                style={[styles.createPlanBtn, { backgroundColor: theme.colors.primary }]}
                onPress={onOpenAddPlan}
              >
                <Text style={styles.createPlanBtnText}>Create First Plan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.plansList}>
              {evaluatedPlans.map((item) => {
                const plan = item.plan;
                const currentOdo = vehicle.currentOdometer;
                const interval = plan.intervalKm || 5000;
                const dueOdo = plan.nextDueMileage || currentOdo + interval;
                const kmRemaining = Math.max(0, item.remainingKm);

                // Progress percentage
                const traveled = Math.max(0, interval - kmRemaining);
                const progressPct = item.progressPercent;

                const isOverdue = item.status === 'overdue';
                const isDueSoon = item.status === 'due_soon';

                let iconName = 'car-wrench';
                let iconColor = theme.colors.secondary;
                let iconBg = theme.colors.secondaryMuted;
                let barColor = isOverdue ? '#EF4444' : isDueSoon ? '#F59E0B' : '#0D9488';

                if (plan.category === 'oil_change' || plan.title.toLowerCase().includes('oil')) {
                  iconName = 'oil';
                  iconColor = '#F59E0B';
                  iconBg = '#FEF3E6';
                  barColor = isOverdue ? '#EF4444' : '#F59E0B';
                } else if (plan.category === 'brakes' || plan.title.toLowerCase().includes('brake')) {
                  iconName = 'car-brake-alert';
                  iconColor = '#0D9488';
                  iconBg = '#E6F7ED';
                  barColor = isOverdue ? '#EF4444' : '#0D9488';
                } else if (plan.category === 'tyres' || plan.title.toLowerCase().includes('tyre')) {
                  iconName = 'tire';
                  iconColor = '#3B82F6';
                  iconBg = '#EBF2FF';
                  barColor = isOverdue ? '#EF4444' : '#3B82F6';
                }

                const badgeLabel = isOverdue ? 'Overdue' : isDueSoon ? 'Due soon' : 'On track';
                const badgeBg = isOverdue
                  ? theme.colors.dangerMuted
                  : isDueSoon
                  ? theme.colors.warningMuted
                  : theme.colors.successMuted;
                const badgeTextCol = isOverdue
                  ? theme.colors.danger
                  : isDueSoon
                  ? theme.colors.warning
                  : theme.colors.success;

                return (
                  <View
                    key={plan.id}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                        shadowColor: isDark ? '#000' : '#64748B',
                      },
                    ]}
                  >
                    {/* Header Row */}
                    <View style={styles.planCardHeader}>
                      <View style={styles.planTitleLeft}>
                        <View style={[styles.planIconCircle, { backgroundColor: iconBg }]}>
                          <MaterialCommunityIcons
                            name={iconName as any}
                            size={22}
                            color={iconColor}
                          />
                        </View>
                        <View style={styles.planTitleTexts}>
                          <Text
                            style={[styles.planTitle, { color: theme.colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {plan.title}
                          </Text>
                          <Text
                            style={[styles.planInterval, { color: theme.colors.textSecondary }]}
                          >
                            Every {plan.intervalKm?.toLocaleString()} km
                            {plan.intervalMonths ? ` or ${plan.intervalMonths} months` : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.planBadge, { backgroundColor: badgeBg }]}>
                        <Text style={[styles.planBadgeText, { color: badgeTextCol }]}>
                          {badgeLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Progress Numbers & Bar */}
                    <View style={styles.progressSection}>
                      <View style={styles.progressNumbersRow}>
                        <Text
                          style={[styles.progressNumberMain, { color: theme.colors.textPrimary }]}
                        >
                          {currentOdo.toLocaleString()}
                          <Text style={{ color: theme.colors.textMuted, fontWeight: '500' }}>
                            {' '}
                            / {dueOdo.toLocaleString()} km
                          </Text>
                        </Text>
                        <Text style={[styles.progressPercentText, { color: theme.colors.textSecondary }]}>
                          {progressPct}%
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.progressBarTrack,
                          {
                            backgroundColor: isDark
                              ? theme.colors.surfaceHighlight
                              : '#E2E8F0',
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressBarFill,
                            {
                              width: `${progressPct}%`,
                              backgroundColor: barColor,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Action & Info Row */}
                    <View style={styles.planFooterRow}>
                      <View style={styles.planDueInfo}>
                        <Ionicons
                          name="speedometer-outline"
                          size={16}
                          color={theme.colors.textMuted}
                        />
                        <View>
                          <Text style={[styles.dueMainText, { color: theme.colors.textPrimary }]}>
                            Due at {dueOdo.toLocaleString()} km
                          </Text>
                          <Text style={[styles.dueSubText, { color: theme.colors.textSecondary }]}>
                            In {kmRemaining.toLocaleString()} km left
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={[styles.logServiceBtn, { backgroundColor: theme.colors.primary }]}
                        onPress={() => onOpenAddService(plan.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.logServiceBtnText}>Log service</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Completed Services Section Preview */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Completed services
            </Text>
            <TouchableOpacity onPress={() => setActiveTab('history')} activeOpacity={0.7}>
              <Text style={[styles.addPlanText, { color: theme.colors.primary }]}>View all</Text>
            </TouchableOpacity>
          </View>

          {serviceRecords.slice(0, 3).map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[
                styles.completedItem,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              ]}
              onPress={() => {
                if (s.receiptUri) onOpenReceipt(s.receiptUri);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.completedLeft}>
                <View
                  style={[
                    styles.completedIconCircle,
                    { backgroundColor: theme.colors.primaryMuted },
                  ]}
                >
                  <Ionicons name="document-text" size={18} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={[styles.completedTitle, { color: theme.colors.textPrimary }]}>
                    {s.title}
                  </Text>
                  <Text style={[styles.completedSub, { color: theme.colors.textSecondary }]}>
                    {new Date(s.date).toLocaleDateString()} • {s.odometer.toLocaleString()} km
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        /* History Tab */
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Service Records ({serviceRecords.length})
            </Text>
            <TouchableOpacity onPress={() => onOpenAddService()} activeOpacity={0.7}>
              <Text style={[styles.addPlanText, { color: theme.colors.primary }]}>+ Log New</Text>
            </TouchableOpacity>
          </View>

          {serviceRecords.length === 0 ? (
            <View
              style={[
                styles.emptyPlansCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                },
              ]}
            >
              <Ionicons name="receipt-outline" size={40} color={theme.colors.textMuted} />
              <Text style={[styles.emptyPlansTitle, { color: theme.colors.textPrimary }]}>
                No Service History
              </Text>
              <Text style={[styles.emptyPlansSub, { color: theme.colors.textSecondary }]}>
                Log completed services and repairs with invoices to build vehicle maintenance
                history.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {serviceRecords.map((service) => (
                <ServiceRecordCard
                  key={service.id}
                  service={service}
                  currency={currency}
                  onViewReceipt={onOpenReceipt}
                  onDelete={(id) => {
                    Alert.alert(
                      'Delete Service Record',
                      'Are you sure you want to delete this record?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Delete',
                          style: 'destructive',
                          onPress: () => onDeleteService(id),
                        },
                      ]
                    );
                  }}
                />
              ))}
            </View>
          )}
        </View>
      )}
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
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabTrack: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  tabBtnActive: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  bannerCard: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 10,
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  bannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  bannerIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTexts: {
    flex: 1,
  },
  bannerCountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerCountNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  bannerSubText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  bannerArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
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
  addPlanText: {
    fontSize: 14,
    fontWeight: '700',
  },
  plansList: {
    gap: 14,
  },
  planCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planTitleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  planIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitleTexts: {
    flex: 1,
    gap: 2,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  planInterval: {
    fontSize: 12,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressSection: {
    marginBottom: 14,
  },
  progressNumbersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressNumberMain: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  planFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  planDueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  dueMainText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dueSubText: {
    fontSize: 11,
  },
  logServiceBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  logServiceBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  completedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  completedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  completedIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  completedSub: {
    fontSize: 12,
    marginTop: 1,
  },
  emptyPlansCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyPlansTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyPlansSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  createPlanBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  createPlanBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
