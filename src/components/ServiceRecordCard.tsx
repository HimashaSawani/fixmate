import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServiceRecord } from '../types';
import { useTheme } from '../theme';

interface ServiceRecordCardProps {
  service?: ServiceRecord;
  record?: ServiceRecord;
  currency: string;
  onViewReceipt?: (uri: string) => void;
  onPressReceipt?: (uri: string) => void;
  onDelete?: (id: string) => void;
}

export const ServiceRecordCard: React.FC<ServiceRecordCardProps> = ({
  service,
  record,
  currency,
  onViewReceipt,
  onPressReceipt,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();
  const data = service || record;

  if (!data) return null;

  const handleReceipt = onViewReceipt || onPressReceipt;

  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
          shadowColor: isDark ? '#000' : '#64748B',
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{data.title}</Text>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.odometerBadge,
                {
                  backgroundColor: theme.colors.primaryMuted,
                },
              ]}
            >
              <Ionicons name="speedometer-outline" size={12} color={theme.colors.primary} />
              <Text style={[styles.odometerText, { color: theme.colors.primary }]}>
                {data.odometer.toLocaleString()} km
              </Text>
            </View>
            <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
              {formattedDate}
            </Text>
          </View>
        </View>

        <View style={styles.rightInfo}>
          <Text style={[styles.costText, { color: theme.colors.textPrimary }]}>
            {currency} {data.totalCost.toLocaleString()}
          </Text>
          <Text style={[styles.costSplit, { color: theme.colors.textSecondary }]}>
            Parts: {data.partsCost.toLocaleString()} | Lab: {data.labourCost.toLocaleString()}
          </Text>
        </View>
      </View>

      {data.garageName && (
        <View style={styles.garageRow}>
          <Ionicons name="business-outline" size={13} color={theme.colors.secondary} />
          <Text style={[styles.garageText, { color: theme.colors.textSecondary }]}>
            {data.garageName}
          </Text>
        </View>
      )}

      {data.partsList && (
        <View
          style={[
            styles.partsStrip,
            {
              backgroundColor: isDark ? theme.colors.surfaceHighlight : '#F8FAFC',
            },
          ]}
        >
          <Text style={[styles.partsLabel, { color: theme.colors.textMuted }]}>
            Replaced / Serviced:
          </Text>
          <Text style={[styles.partsListText, { color: theme.colors.textPrimary }]}>
            {data.partsList}
          </Text>
        </View>
      )}

      {data.notes && (
        <Text
          style={[styles.notesText, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          "{data.notes}"
        </Text>
      )}

      <View style={styles.bottomRow}>
        <View
          style={[
            styles.serviceTypeBadge,
            {
              backgroundColor: theme.colors.serviceBg,
            },
          ]}
        >
          <Text style={[styles.serviceTypeText, { color: theme.colors.serviceIcon }]}>
            {data.serviceType}
          </Text>
        </View>

        <View style={styles.actions}>
          {data.receiptUri && handleReceipt && (
            <TouchableOpacity
              style={[
                styles.receiptBtn,
                {
                  backgroundColor: theme.colors.receiptBg,
                },
              ]}
              onPress={() => handleReceipt(data.receiptUri!)}
            >
              <Ionicons name="receipt-outline" size={14} color={theme.colors.receiptIcon} />
              <Text style={[styles.receiptBtnText, { color: theme.colors.receiptIcon }]}>
                Invoice
              </Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(data.id)}>
              <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  leftInfo: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  odometerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  odometerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 11,
  },
  rightInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  costText: {
    fontSize: 16,
    fontWeight: '800',
  },
  costSplit: {
    fontSize: 11,
  },
  garageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  garageText: {
    fontSize: 12,
  },
  partsStrip: {
    padding: 8,
    borderRadius: 8,
    marginVertical: 6,
    gap: 2,
  },
  partsLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  partsListText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginVertical: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  serviceTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceTypeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receiptBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 4,
  },
});
