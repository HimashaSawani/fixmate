import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseRecord, ExpenseCategory } from '../types';
import { theme } from '../theme';

interface ExpenseCardProps {
  expense: ExpenseRecord;
  currency: string;
  onPressReceipt?: (uri: string) => void;
  onDelete?: (id: string) => void;
}

const categoryMeta: Record<
  ExpenseCategory,
  { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  fuel: { label: 'Fuel', color: theme.colors.fuelColor, icon: 'speedometer-outline' },
  service: { label: 'Service', color: theme.colors.serviceColor, icon: 'construct-outline' },
  repair: { label: 'Repair', color: theme.colors.repairColor, icon: 'hammer-outline' },
  insurance: { label: 'Insurance', color: theme.colors.insuranceColor, icon: 'shield-checkmark-outline' },
  registration: { label: 'Registration/Tax', color: theme.colors.registrationColor, icon: 'document-text-outline' },
  accessories: { label: 'Accessories', color: theme.colors.accessoriesColor, icon: 'cart-outline' },
  parking_tolls: { label: 'Parking & Tolls', color: '#0EA5E9', icon: 'car-outline' },
  other: { label: 'Other', color: theme.colors.otherColor, icon: 'receipt-outline' },
};

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  currency,
  onPressReceipt,
  onDelete,
}) => {
  const meta = categoryMeta[expense.category] || categoryMeta.other;
  const formattedDate = new Date(expense.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.left}>
          <View style={[styles.iconBox, { backgroundColor: `${meta.color}20` }]}>
            <Ionicons name={meta.icon} size={18} color={meta.color} />
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>{expense.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.dateText}>{formattedDate}</Text>
              {expense.vendor && (
                <Text style={styles.vendorText}>• {expense.vendor}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={styles.amountText}>
            {currency} {expense.amount.toLocaleString()}
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: `${meta.color}15` }]}>
            <Text style={[styles.categoryLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
      </View>

      {expense.notes && (
        <Text style={styles.notesText} numberOfLines={2}>
          "{expense.notes}"
        </Text>
      )}

      <View style={styles.bottomRow}>
        {expense.odometer ? (
          <Text style={styles.odometerTag}>
            Log Odo: {expense.odometer.toLocaleString()} km
          </Text>
        ) : (
          <View />
        )}

        <View style={styles.actions}>
          {expense.receiptUri && (
            <TouchableOpacity
              style={styles.receiptBtn}
              onPress={() => onPressReceipt && onPressReceipt(expense.receiptUri!)}
            >
              <Ionicons name="receipt-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.receiptBtnText}>Receipt</Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(expense.id)}>
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  info: {
    flex: 1,
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  vendorText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginLeft: 4,
  },
  right: {
    alignItems: 'flex-end',
  },
  amountText: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
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
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
  },
  odometerTag: {
    color: theme.colors.textMuted,
    fontSize: 10,
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
