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
import { theme } from '../theme';

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
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'all'>('all');

  if (!vehicle) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Please select a vehicle</Text>
      </View>
    );
  }

  const unified = calculateUnifiedExpenses(fuelEntries, serviceRecords, expenses, vehicle);

  // Filter out any linked items from standalone expenses list to guarantee no duplicate views
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.screenTitle}>Expense Ledger</Text>
          <Text style={styles.screenSub}>Unified Non-Duplicated Ownership Costs</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={onOpenAddExpense} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#0B0F19" />
          <Text style={styles.addBtnText}>Log Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.statsRow}>
        <StatCard
          title="Total Recorded"
          value={`${currency} ${(unified.totalCost / 1000).toFixed(1)}k`}
          subtitle={`Fuel: ${(unified.fuelTotal / 1000).toFixed(1)}k • Srv: ${(unified.serviceTotal / 1000).toFixed(1)}k`}
          icon="wallet-outline"
          accentColor={theme.colors.warning}
        />
        <StatCard
          title="Cost / km"
          value={`${currency} ${unified.costPerKm.toFixed(2)}`}
          unit="/km"
          subtitle={`Over ${vehicle.currentOdometer.toLocaleString()} km`}
          icon="analytics-outline"
          accentColor={theme.colors.primary}
        />
      </View>

      {/* Category Filter Pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
        {categories.map((c) => {
          const isSelected = selectedCategory === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              style={[styles.filterPill, isSelected && styles.filterPillActive]}
              onPress={() => setSelectedCategory(c.key)}
            >
              <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Expense List */}
      <View style={{ marginTop: 10 }}>
        {filteredExpenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={36} color={theme.colors.textMuted} />
            <Text style={styles.emptyCardTitle}>No Expenses In This Category</Text>
            <Text style={styles.emptyCardSub}>
              Tap 'Log Expense' to record insurance renewals, repair bills, modifications, and accessories.
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
    backgroundColor: theme.colors.warning,
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
  filtersScroll: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: theme.colors.warningMuted,
    borderColor: theme.colors.warning,
  },
  filterText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterTextActive: {
    color: theme.colors.warning,
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
