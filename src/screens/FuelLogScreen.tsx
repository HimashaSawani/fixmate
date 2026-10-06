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
import { useTheme } from '../theme';

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
  const { theme, isDark } = useTheme();
  const [filterType, setFilterType] = useState<'all' | 'full' | 'partial'>('all');

  if (!vehicle) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Please select a vehicle
        </Text>
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
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 110 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Action Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
            Fuel Efficiency & Logs
          </Text>
          <Text style={[styles.screenSub, { color: theme.colors.textSecondary }]}>
            Full-to-Full Tank Calculation Method
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
          onPress={onOpenAddFuel}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
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
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filterType === 'all'
                  ? theme.colors.primaryMuted
                  : theme.colors.surface,
              borderColor:
                filterType === 'all'
                  ? theme.colors.primary
                  : isDark
                  ? 'rgba(255,255,255,0.08)'
                  : '#E2E8F0',
            },
          ]}
          onPress={() => setFilterType('all')}
        >
          <Text
            style={[
              styles.filterChipText,
              {
                color:
                  filterType === 'all'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                fontWeight: filterType === 'all' ? '700' : '600',
              },
            ]}
          >
            All ({processedEntries.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filterType === 'full'
                  ? theme.colors.primaryMuted
                  : theme.colors.surface,
              borderColor:
                filterType === 'full'
                  ? theme.colors.primary
                  : isDark
                  ? 'rgba(255,255,255,0.08)'
                  : '#E2E8F0',
            },
          ]}
          onPress={() => setFilterType('full')}
        >
          <Text
            style={[
              styles.filterChipText,
              {
                color:
                  filterType === 'full'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                fontWeight: filterType === 'full' ? '700' : '600',
              },
            ]}
          >
            Full Tanks ({stats.fullFillCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            {
              backgroundColor:
                filterType === 'partial'
                  ? theme.colors.primaryMuted
                  : theme.colors.surface,
              borderColor:
                filterType === 'partial'
                  ? theme.colors.primary
                  : isDark
                  ? 'rgba(255,255,255,0.08)'
                  : '#E2E8F0',
            },
          ]}
          onPress={() => setFilterType('partial')}
        >
          <Text
            style={[
              styles.filterChipText,
              {
                color:
                  filterType === 'partial'
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                fontWeight: filterType === 'partial' ? '700' : '600',
              },
            ]}
          >
            Partial ({stats.partialFillCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List of Entries */}
      {filteredEntries.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            },
          ]}
        >
          <Ionicons name="speedometer-outline" size={36} color={theme.colors.textMuted} />
          <Text style={[styles.emptyCardTitle, { color: theme.colors.textPrimary }]}>
            No Fuel Fill-Ups Recorded
          </Text>
          <Text style={[styles.emptyCardSub, { color: theme.colors.textSecondary }]}>
            Tap 'Log Fill-up' to record your petrol/diesel fill-ups and compute your vehicle's exact
            km/L efficiency.
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
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
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
