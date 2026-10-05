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
import { FuelEntry, Vehicle } from '../types';
import { processFuelEntries } from '../services/calculations';
import { FuelEntryCard } from '../components/FuelEntryCard';
import { StatCard } from '../components/StatCard';
import { FuelTrendChart } from '../components/ChartWidgets';
import { theme } from '../theme';

interface FuelLogScreenProps {
  vehicle: Vehicle | null;
  fuelEntries: FuelEntry[];
  currency: string;
  onOpenAddFuel: () => void;
  onOpenReceipt: (uri: string) => void;
  onDeleteFuel: (id: string) => Promise<void>;
}

export const FuelLogScreen: React.FC<FuelLogScreenProps> = ({
  vehicle,
  fuelEntries,
  currency,
  onOpenAddFuel,
  onOpenReceipt,
  onDeleteFuel,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'full' | 'partial'>('all');

  if (!vehicle) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Please select a vehicle</Text>
      </View>
    );
  }

  const { stats, processedEntries } = processFuelEntries(fuelEntries);

  const filteredEntries = processedEntries.filter((e) => {
    if (filterType === 'full') return e.isFullTank;
    if (filterType === 'partial') return !e.isFullTank;
    return true;
  });

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Fuel Entry',
      'Are you sure you want to delete this fill-up record? Fuel averages will recalculate automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteFuel(id),
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Top Action Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.screenTitle}>Fuel Efficiency & Logs</Text>
          <Text style={styles.screenSub}>Full-to-Full Tank Validation Method</Text>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={onOpenAddFuel} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#0B0F19" />
          <Text style={styles.addBtnText}>Log Fill-up</Text>
        </TouchableOpacity>
      </View>

      {/* Fuel Metric Cards */}
      <View style={styles.statsRow}>
        <StatCard
          title="Average Economy"
          value={stats.overallAvgKmL > 0 ? stats.overallAvgKmL : '—'}
          unit="km/L"
          subtitle={stats.bestKmL > 0 ? `Best: ${stats.bestKmL} km/L` : 'Calculating...'}
          icon="speedometer-outline"
          accentColor={theme.colors.primary}
        />
        <StatCard
          title="Fuel Cost / km"
          value={stats.overallCostPerKm > 0 ? stats.overallCostPerKm.toFixed(2) : '—'}
          unit={`${currency}/km`}
          subtitle={`Total: ${currency} ${stats.totalSpent.toLocaleString()}`}
          icon="pricetag-outline"
          accentColor={theme.colors.secondary}
        />
      </View>

      {/* Efficiency Curve Line Chart */}
      <FuelTrendChart entries={processedEntries} />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
            All ({processedEntries.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'full' && styles.filterChipActive]}
          onPress={() => setFilterType('full')}
        >
          <Text style={[styles.filterChipText, filterType === 'full' && styles.filterChipTextActive]}>
            Full Tanks ({stats.fullFillCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, filterType === 'partial' && styles.filterChipActive]}
          onPress={() => setFilterType('partial')}
        >
          <Text style={[styles.filterChipText, filterType === 'partial' && styles.filterChipTextActive]}>
            Partial ({stats.partialFillCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List of Entries */}
      {filteredEntries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="speedometer-outline" size={36} color={theme.colors.textMuted} />
          <Text style={styles.emptyCardTitle}>No Fuel Fill-Ups Recorded</Text>
          <Text style={styles.emptyCardSub}>
            Tap 'Log Fill-up' to record your petrol/diesel fill-ups and compute your vehicle's exact km/L efficiency.
          </Text>
        </View>
      ) : (
        filteredEntries.map((entry) => (
          <FuelEntryCard
            key={entry.id}
            entry={entry}
            currency={currency}
            onPressReceipt={onOpenReceipt}
            onDelete={handleDelete}
          />
        ))
      )}
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
    backgroundColor: theme.colors.primary,
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primaryMuted,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: theme.colors.primaryLight,
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
