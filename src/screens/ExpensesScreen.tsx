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
import { ExpenseRecord, ExpenseCategory, Vehicle, FuelEntry, ServiceRecord } from '../types';
import { calculateUnifiedExpenses } from '../services/calculations';
import { ExpenseCard } from '../components/ExpenseCard';
import { StatCard } from '../components/StatCard';
import { useTheme } from '../theme';

interface ExpensesScreenProps {
  vehicle: Vehicle | null;
  expenses: ExpenseRecord[];
  fuelEntries: FuelEntry[];
  serviceRecords: ServiceRecord[];
  currency: string;
  onOpenAddExpense: () => void;
  onOpenReceipt: (uri: string) => void;
  onDeleteExpense: (id: string) => Promise<void>;
}

export const ExpensesScreen: React.FC<ExpensesScreenProps> = ({
  vehicle,
  expenses,
  fuelEntries,
  serviceRecords,
  currency,
  onOpenAddExpense,
  onOpenReceipt,
  onDeleteExpense,
}) => {
  const { theme, isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');

  if (!vehicle) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Please select a vehicle
        </Text>
      </View>
    );
  }

  const unified = calculateUnifiedExpenses(fuelEntries, serviceRecords, expenses, vehicle);
  const standaloneExpenses = expenses.filter((e) => !e.linkedServiceId && !e.linkedFuelId);

  const filteredExpenses = standaloneExpenses.filter((e) => {
    if (selectedCategory === 'all') return true;
    return e.category === selectedCategory;
  });

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteExpense(id),
        },
      ]
    );
  };

  const categories: { key: ExpenseCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'All Costs' },
    { key: 'repair', label: 'Repairs' },
    { key: 'insurance', label: 'Insurance' },
    { key: 'registration', label: 'Tax/Reg' },
    { key: 'accessories', label: 'Accessories' },
    { key: 'parking_tolls', label: 'Tolls' },
    { key: 'other', label: 'Other' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
            Unified Expense Ledger
          </Text>
          <Text style={[styles.screenSub, { color: theme.colors.textSecondary }]}>
            Non-Duplicating Vehicle Ownership Cost
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          onPress={onOpenAddExpense}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Log Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.statsRow}>
        <StatCard
          title="Total Recorded"
          value={`${currency} ${unified.totalCost.toLocaleString()}`}
          subtitle={`Fuel: ${currency} ${unified.fuelTotal.toLocaleString()}`}
          icon="wallet-outline"
          accentColor={theme.colors.primary}
        />
        <StatCard
          title="Cost / km"
          value={unified.costPerKm ? unified.costPerKm.toFixed(2) : '—'}
          unit={`${currency}/km`}
          subtitle={`Service: ${currency} ${unified.serviceTotal.toLocaleString()}`}
          icon="trending-up-outline"
          accentColor={theme.colors.secondary}
        />
      </View>

      {/* Category Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.key;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: isActive
                    ? theme.colors.primaryMuted
                    : theme.colors.surface,
                  borderColor: isActive
                    ? theme.colors.primary
                    : isDark
                    ? 'rgba(255,255,255,0.08)'
                    : '#E2E8F0',
                },
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                    fontWeight: isActive ? '800' : '600',
                  },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Expenses List */}
      <View style={styles.listSection}>
        {filteredExpenses.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              },
            ]}
          >
            <Ionicons name="receipt-outline" size={36} color={theme.colors.textMuted} />
            <Text style={[styles.emptyCardTitle, { color: theme.colors.textPrimary }]}>
              No Expenses in this Category
            </Text>
            <Text style={[styles.emptyCardSub, { color: theme.colors.textSecondary }]}>
              Tap 'Log Expense' to add insurance renewals, revenue licenses, accessories or repairs.
            </Text>
          </View>
        ) : (
          filteredExpenses.map((expense) => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              currency={currency}
              onPressReceipt={onOpenReceipt}
              onDelete={handleDelete}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    fontSize: 14,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  screenSub: {
    fontSize: 11,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  categoryScroll: {
    marginBottom: 14,
  },
  categoryContainer: {
    gap: 8,
    paddingRight: 16,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
  },
  listSection: {
    gap: 10,
  },
  emptyCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 10,
    gap: 4,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyCardSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
