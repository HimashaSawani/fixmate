import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface SummaryMetricCardsProps {
  monthlyExpense: number;
  monthLabel?: string;
  fuelEconomy: number | null;
  currency: string;
  onPressExpenses: () => void;
  onPressFuel: () => void;
}

export const SummaryMetricCards: React.FC<SummaryMetricCardsProps> = ({
  monthlyExpense,
  monthLabel,
  fuelEconomy,
  currency,
  onPressExpenses,
  onPressFuel,
}) => {
  const { theme, isDark } = useTheme();

  return (
    <View style={styles.container}>
      {/* Monthly Expense Card */}
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            shadowColor: isDark ? '#000' : '#64748B',
          },
        ]}
        onPress={onPressExpenses}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Ionicons name="bar-chart" size={16} color={theme.colors.primary} />
            <Text style={[styles.headerTitle, { color: theme.colors.textSecondary }]}>
              {monthLabel ? `Month (${monthLabel})` : 'This month'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
        </View>

        <Text style={[styles.valueText, { color: theme.colors.textPrimary }]}>
          {currency} {monthlyExpense.toLocaleString()}
        </Text>

        {/* Mini Bar Sparkline Visual */}
        <View style={styles.barSparkline}>
          {[40, 65, 30, 80, 50, 95, 70, 85].map((h, i) => (
            <View
              key={i}
              style={[
                styles.miniBar,
                {
                  height: (h / 100) * 28,
                  backgroundColor:
                    i === 7
                      ? theme.colors.primary
                      : isDark
                      ? 'rgba(59,130,246,0.3)'
                      : 'rgba(37,99,235,0.2)',
                },
              ]}
            />
          ))}
        </View>
      </TouchableOpacity>

      {/* Fuel Economy Card */}
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            shadowColor: isDark ? '#000' : '#64748B',
          },
        ]}
        onPress={onPressFuel}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Ionicons name="leaf" size={16} color={theme.colors.secondary} />
            <Text style={[styles.headerTitle, { color: theme.colors.textSecondary }]}>
              Fuel economy
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={theme.colors.textMuted} />
        </View>

        <Text style={[styles.valueText, { color: theme.colors.textPrimary }]}>
          {fuelEconomy !== null && fuelEconomy > 0
            ? `${fuelEconomy.toFixed(1)} km/L`
            : 'No fills yet'}
        </Text>

        {/* Mini Line Wave Visual */}
        <View style={styles.waveContainer}>
          <View
            style={[
              styles.waveLine,
              {
                borderColor: theme.colors.secondary,
                backgroundColor: isDark ? 'rgba(20,184,166,0.15)' : 'rgba(13,148,136,0.1)',
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    justifyContent: 'space-between',
    minHeight: 120,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  valueText: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 8,
  },
  barSparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 28,
    marginTop: 4,
  },
  miniBar: {
    width: 6,
    borderRadius: 3,
  },
  waveContainer: {
    height: 28,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  waveLine: {
    height: 18,
    borderRadius: 9,
    borderTopWidth: 2.5,
  },
});
