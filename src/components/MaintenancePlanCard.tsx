import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MaintenanceStatusResult } from '../services/calculations';
import { theme } from '../theme';

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
  const { plan, status, remainingKm, remainingDays, progressPercent, formattedDueDate } = item;

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

  return (
    <View style={[styles.card, { borderColor: status === 'good' ? theme.colors.cardBorder : `${statusColor}60` }]}>
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <Text style={styles.title}>{plan.title}</Text>
          <Text style={styles.subtitle}>
            Every {plan.intervalKm.toLocaleString()} km or {plan.intervalMonths} months
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
          <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Progress Track */}
      <View style={styles.progressSection}>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.min(100, Math.max(5, progressPercent))}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: statusColor }]}>{progressPercent}%</Text>
      </View>

      {/* Threshold details */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="speedometer-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>
            Due at: <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{plan.nextDueMileage.toLocaleString()} km</Text>
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
          <Text style={styles.detailText}>
            Due by: <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{formattedDueDate}</Text>
          </Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  track: {
    flex: 1,
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
    width: 38,
    textAlign: 'right',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
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
