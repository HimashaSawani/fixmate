import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseRecord, ExpenseCategory } from '../types';
import { useTheme } from '../theme';

interface ExpenseCardProps {
  expense: ExpenseRecord;
  currency: string;
  onViewReceipt?: (uri: string) => void;
  onPressReceipt?: (uri: string) => void;
  onDelete?: (id: string) => void;
}

export const ExpenseCard: React.FC<ExpenseCardProps> = ({
  expense,
  currency,
  onViewReceipt,
  onPressReceipt,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();
  const handleReceipt = onViewReceipt || onPressReceipt;

  const categoryMeta: Record<
    ExpenseCategory,
    { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }
  > = {
    fuel: { label: 'Fuel', color: '#10B981', icon: 'speedometer-outline' },
    service: { label: 'Service', color: '#2563EB', icon: 'construct-outline' },
    repair: { label: 'Repair', color: '#F59E0B', icon: 'hammer-outline' },
    insurance: { label: 'Insurance', color: '#8B5CF6', icon: 'shield-checkmark-outline' },
    registration: { label: 'Registration/Tax', color: '#EC4899', icon: 'document-text-outline' },
    accessories: { label: 'Accessories', color: '#06B6D4', icon: 'cart-outline' },
    parking_tolls: { label: 'Parking & Tolls', color: '#0EA5E9', icon: 'car-outline' },
    other: { label: 'Other', color: '#64748B', icon: 'receipt-outline' },
  };

  const meta = categoryMeta[expense.category] || categoryMeta.other;
  const formattedDate = new Date(expense.date).toLocaleDateString('en-US', {
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
        <View style={styles.left}>
          <View style={[styles.iconBox, { backgroundColor: `${meta.color}20` }]}>
            <Ionicons name={meta.icon} size={18} color={meta.color} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {expense.title}
            </Text>
            <View style={styles.metaRow}>
              <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
                {formattedDate}
              </Text>
              {expense.vendor && (
                <Text style={[styles.vendorText, { color: theme.colors.textMuted }]}>
                  • {expense.vendor}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[styles.amountText, { color: theme.colors.textPrimary }]}>
            {currency} {expense.amount.toLocaleString()}
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: `${meta.color}15` }]}>
            <Text style={[styles.categoryLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
      </View>

      {expense.notes && (
        <Text
          style={[styles.notesText, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          "{expense.notes}"
        </Text>
      )}

      <View style={styles.bottomRow}>
        {expense.odometer ? (
          <Text style={[styles.odometerTag, { color: theme.colors.textMuted }]}>
            Log Odo: {expense.odometer.toLocaleString()} km
          </Text>
        ) : (
          <View />
        )}

        <View style={styles.actions}>
          {expense.receiptUri && handleReceipt && (
            <TouchableOpacity
              style={[
                styles.receiptBtn,
                {
                  backgroundColor: theme.colors.receiptBg,
                },
              ]}
              onPress={() => handleReceipt(expense.receiptUri!)}
            >
              <Ionicons name="receipt-outline" size={14} color={theme.colors.receiptIcon} />
              <Text style={[styles.receiptBtnText, { color: theme.colors.receiptIcon }]}>
                Receipt
              </Text>
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
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
  },
  vendorText: {
    fontSize: 11,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 8,
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
  odometerTag: {
    fontSize: 11,
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
