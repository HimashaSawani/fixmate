import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { evaluateMaintenancePlans } from '../services/calculations';
import { MaintenancePlan, Vehicle } from '../types';
import { useTheme } from '../theme';

interface UpcomingMaintenanceWidgetProps {
  plans: MaintenancePlan[];
  vehicle: Vehicle | null;
  onViewAll: () => void;
  onSelectPlan: (plan: MaintenancePlan) => void;
}

export const UpcomingMaintenanceWidget: React.FC<UpcomingMaintenanceWidgetProps> = ({
  plans,
  vehicle,
  onViewAll,
  onSelectPlan,
}) => {
  const { theme, isDark } = useTheme();

  const evaluated = evaluateMaintenancePlans(plans, vehicle?.currentOdometer || 0);

  if (evaluated.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
          Upcoming maintenance
        </Text>
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.7}>
          <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>View all</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {evaluated.slice(0, 3).map((item) => {
          const plan = item.plan;
          const currentOdo = vehicle?.currentOdometer || 0;
          const dueOdo = plan.nextDueMileage || currentOdo + (plan.intervalKm || 5000);
          const kmRemaining = Math.max(0, item.remainingKm);
          const isDueSoon = item.status === 'due_soon';
          const isOverdue = item.status === 'overdue';

          // Category icon
          let iconName = 'car-wrench';
          let iconBg = theme.colors.secondaryMuted;
          let iconColor = theme.colors.secondary;

          if (plan.category === 'oil_change' || plan.title.toLowerCase().includes('oil')) {
            iconName = 'oil';
            iconBg = theme.colors.warningMuted;
            iconColor = theme.colors.warning;
          } else if (plan.category === 'tyres' || plan.title.toLowerCase().includes('tyre')) {
            iconName = 'tire';
            iconBg = theme.colors.secondaryMuted;
            iconColor = theme.colors.secondary;
          } else if (plan.category === 'brakes' || plan.title.toLowerCase().includes('brake')) {
            iconName = 'car-brake-alert';
            iconBg = theme.colors.primaryMuted;
            iconColor = theme.colors.primary;
          }

          const badgeLabel = isOverdue ? 'Overdue' : isDueSoon ? 'Due soon' : 'On track';
          const badgeBg = isOverdue
            ? theme.colors.dangerMuted
            : isDueSoon
            ? theme.colors.warningMuted
            : theme.colors.successMuted;
          const badgeColor = isOverdue
            ? theme.colors.danger
            : isDueSoon
            ? theme.colors.warning
            : theme.colors.success;

          return (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.itemCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                  shadowColor: isDark ? '#000' : '#64748B',
                },
              ]}
              onPress={() => onSelectPlan(plan)}
              activeOpacity={0.7}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                  <MaterialCommunityIcons name={iconName as any} size={22} color={iconColor} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>
                    {plan.title}
                  </Text>
                  <Text style={[styles.itemSubtitle, { color: theme.colors.textSecondary }]}>
                    Due at {dueOdo.toLocaleString()} km
                  </Text>
                </View>
              </View>

              <View style={styles.itemRight}>
                <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                  <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
                </View>
                <View style={styles.kmLeftRow}>
                  <Text style={[styles.kmLeftText, { color: theme.colors.textSecondary }]}>
                    {kmRemaining.toLocaleString()} km left
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerRow: {
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
  list: {
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 12,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  kmLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  kmLeftText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
