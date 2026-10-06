import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaintenanceStatusResult } from '../services/calculations';
import { theme, useTheme } from '../theme';

interface MaintenancePlanCardProps {
  item: MaintenanceStatusResult;
  onLogService: (plan: MaintenanceStatusResult) => void;
  onDelete?: (planId: string) => void;
}

export const MaintenancePlanCard: React.FC<MaintenancePlanCardProps> = ({
  item,
  onLogService,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();
  const { plan, status, remainingKm, remainingDays, progressPercent, dueReason, formattedDueDate } = item;

  // Status color mapping
  const statusColor =
    status === 'overdue'
      ? theme.colors.danger
      : status === 'due_soon'
      ? theme.colors.warning
      : theme.colors.secondary;

  const statusLabel =
    status === 'overdue'
      ? 'OVERDUE'
      : status === 'due_soon'
      ? 'DUE SOON'
      : 'GOOD';

  const lastServiceDateFormatted = plan.lastServiceDate
    ? new Date(plan.lastServiceDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not logged';

  return (
    <View style={[styles.card, { borderColor: status === 'good' ? theme.colors.cardBorder : `${statusColor}60` }]}>
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <Text style={styles.title}>{plan.title}</Text>
          <Text style={styles.subtitle}>
            Interval: Every {plan.intervalKm.toLocaleString()} km or {plan.intervalMonths} months
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
          <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Progress Track & Label */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <Text style={[styles.intervalProgressLabel, { color: theme.colors.textSecondary }]}>
            Service Interval Progress
          </Text>
          <Text style={[styles.progressText, { color: statusColor }]}>{progressPercent}%</Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(100, Math.max(4, progressPercent))}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>
      </View>

      {/* Last Service vs Next Due Details */}
      <View style={styles.matrixContainer}>
        {/* Last Serviced */}
        <View style={styles.matrixCol}>
          <Text style={[styles.matrixHeading, { color: theme.colors.textMuted }]}>LAST SERVICED</Text>
          <Text style={[styles.matrixVal, { color: theme.colors.textPrimary }]}>
            {plan.lastServiceMileage.toLocaleString()} km
          </Text>
          <Text style={[styles.matrixSub, { color: theme.colors.textSecondary }]}>
            {lastServiceDateFormatted}
          </Text>
        </View>

        <View style={styles.matrixDivider} />

        {/* Next Due */}
        <View style={styles.matrixCol}>
          <Text style={[styles.matrixHeading, { color: theme.colors.textMuted }]}>NEXT DUE (TARGET)</Text>
          <Text style={[styles.matrixVal, { color: theme.colors.textPrimary }]}>
            {plan.nextDueMileage.toLocaleString()} km
          </Text>
          <Text style={[styles.matrixSub, { color: theme.colors.textSecondary }]}>
            {formattedDueDate}
          </Text>
        </View>
      </View>

      {/* Whichever Comes First Indicator */}
      <View style={[styles.triggerBanner, { backgroundColor: isDark ? theme.colors.surfaceHighlight : '#F8FAFC' }]}>
        <Ionicons
          name={dueReason === 'date' ? 'calendar-outline' : 'speedometer-outline'}
          size={14}
          color={statusColor}
        />
        <Text style={[styles.triggerText, { color: theme.colors.textSecondary }]}>
          {status === 'overdue'
            ? `Overdue by ${dueReason === 'both' ? 'Mileage & Date' : dueReason === 'date' ? 'Date threshold' : 'Mileage threshold'}`
            : `Due first by: ${dueReason === 'date' ? `Date (${formattedDueDate})` : `Mileage (${plan.nextDueMileage.toLocaleString()} km)`}`}
        </Text>
      </View>

      {/* Remaining info */}
      <View style={styles.remainingStrip}>
        <Text style={[styles.remainingText, { color: statusColor }]}>
          {status === 'overdue'
            ? `Exceeded by ${Math.abs(remainingKm).toLocaleString()} km / ${Math.abs(remainingDays)} days`
            : `${remainingKm.toLocaleString()} km or ${remainingDays} days remaining`}
        </Text>
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.logButton, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}
          onPress={() => onLogService(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="construct-outline" size={14} color={statusColor} />
          <Text style={[styles.logButtonText, { color: statusColor }]}>Log Completed Service</Text>
        </TouchableOpacity>

        {onDelete && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => onDelete(plan.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={15} color={theme.colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleInfo: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  progressSection: {
    marginTop: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  intervalProgressLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '800',
  },
  matrixContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
  },
  matrixCol: {
    flex: 1,
  },
  matrixHeading: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  matrixVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  matrixSub: {
    fontSize: 11,
    marginTop: 1,
  },
  matrixDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginHorizontal: 10,
  },
  triggerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  triggerText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  remainingStrip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginTop: 8,
  },
  remainingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  logButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 6,
  },
});
