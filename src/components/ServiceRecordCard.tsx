import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServiceRecord } from '../types';
import { theme } from '../theme';

interface ServiceRecordCardProps {
  record: ServiceRecord;
  currency: string;
  onPressReceipt?: (uri: string) => void;
  onDelete?: (id: string) => void;
}

export const ServiceRecordCard: React.FC<ServiceRecordCardProps> = ({
  record,
  currency,
  onPressReceipt,
  onDelete,
}) => {
  const formattedDate = new Date(record.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <Text style={styles.title}>{record.title}</Text>
          <View style={styles.metaRow}>
            <View style={styles.odometerBadge}>
              <Ionicons name="speedometer-outline" size={12} color={theme.colors.primary} />
              <Text style={styles.odometerText}>{record.odometer.toLocaleString()} km</Text>
            </View>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
        </View>

        <View style={styles.rightInfo}>
          <Text style={styles.costText}>
            {currency} {record.totalCost.toLocaleString()}
          </Text>
          <Text style={styles.costSplit}>
            Parts: {record.partsCost.toLocaleString()} | Lab: {record.labourCost.toLocaleString()}
          </Text>
        </View>
      </View>

      {record.garageName && (
        <View style={styles.garageRow}>
          <Ionicons name="business-outline" size={13} color={theme.colors.secondary} />
          <Text style={styles.garageText}>{record.garageName}</Text>
        </View>
      )}

      {record.partsList && (
        <View style={styles.partsStrip}>
          <Text style={styles.partsLabel}>Replaced / Serviced:</Text>
          <Text style={styles.partsListText}>{record.partsList}</Text>
        </View>
      )}

      {record.notes && (
        <Text style={styles.notesText} numberOfLines={2}>
          "{record.notes}"
        </Text>
      )}

      <View style={styles.bottomRow}>
        <View style={styles.serviceTypeBadge}>
          <Text style={styles.serviceTypeText}>{record.serviceType}</Text>
        </View>

        <View style={styles.actions}>
          {record.receiptUri && (
            <TouchableOpacity
              style={styles.receiptBtn}
              onPress={() => onPressReceipt && onPressReceipt(record.receiptUri!)}
            >
              <Ionicons name="receipt-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.receiptBtnText}>Invoice</Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(record.id)}>
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
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftInfo: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  odometerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  odometerText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  rightInfo: {
    alignItems: 'flex-end',
  },
  costText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  costSplit: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  garageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  garageText: {
    color: theme.colors.secondaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  partsStrip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  partsLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  partsListText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  notesText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  serviceTypeBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  serviceTypeText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
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
    backgroundColor: theme.colors.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receiptBtnText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 4,
  },
});
