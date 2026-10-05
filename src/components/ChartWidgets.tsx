import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Circle, Polyline, Text as SvgText, G } from 'react-native-svg';
import { MonthlyCostItem, CategoryCost } from '../services/calculations';
import { theme } from '../theme';

const screenWidth = Dimensions.get('window').width;

interface MonthlyBarChartProps {
  data: MonthlyCostItem[];
  currency: string;
}

export const MonthlyBarChart: React.FC<MonthlyBarChartProps> = ({ data, currency }) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No monthly expense history yet</Text>
      </View>
    );
  }

  const chartHeight = 160;
  const chartWidth = screenWidth - 64;
  const maxTotal = Math.max(...data.map((d) => d.total), 100);
  const barWidth = Math.min(32, (chartWidth - 40) / data.length - 8);

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>MONTHLY EXPENSE TREND</Text>
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <Svg width={chartWidth} height={chartHeight + 30}>
          {/* Grid lines */}
          <Line
            x1="0"
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke={theme.colors.cardBorder}
            strokeWidth="1"
          />
          <Line
            x1="0"
            y1={chartHeight / 2}
            x2={chartWidth}
            y2={chartHeight / 2}
            stroke={theme.colors.cardBorder}
            strokeDasharray="4, 4"
            strokeWidth="1"
          />

          {data.map((item, index) => {
            const x = 20 + index * ((chartWidth - 40) / data.length);
            const totalH = (item.total / maxTotal) * (chartHeight - 30);
            const fuelH = (item.fuel / maxTotal) * (chartHeight - 30);
            const serviceH = (item.service / maxTotal) * (chartHeight - 30);
            const otherH = totalH - fuelH - serviceH;

            const yBase = chartHeight;

            return (
              <G key={item.monthKey}>
                {/* Fuel portion (Cyan) */}
                {item.fuel > 0 && (
                  <Rect
                    x={x}
                    y={yBase - fuelH}
                    width={barWidth}
                    height={fuelH}
                    fill={theme.colors.primary}
                    rx={3}
                  />
                )}
                {/* Service portion (Emerald) */}
                {item.service > 0 && (
                  <Rect
                    x={x}
                    y={yBase - fuelH - serviceH}
                    width={barWidth}
                    height={serviceH}
                    fill={theme.colors.secondary}
                    rx={3}
                  />
                )}
                {/* Other/Repairs portion (Amber/Purple) */}
                {otherH > 0 && (
                  <Rect
                    x={x}
                    y={yBase - totalH}
                    width={barWidth}
                    height={otherH}
                    fill={theme.colors.warning}
                    rx={3}
                  />
                )}
                {/* Month label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={chartHeight + 20}
                  fill={theme.colors.textSecondary}
                  fontSize="10"
                  textAnchor="middle"
                >
                  {item.monthLabel.split(' ')[0]}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
          <Text style={styles.legendLabel}>Fuel</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.secondary }]} />
          <Text style={styles.legendLabel}>Service</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.colors.warning }]} />
          <Text style={styles.legendLabel}>Repairs & Other</Text>
        </View>
      </View>
    </View>
  );
};

interface FuelTrendChartProps {
  entries: { date: string; fuelEfficiencyKmL?: number; odometer: number }[];
}

export const FuelTrendChart: React.FC<FuelTrendChartProps> = ({ entries }) => {
  const valid = entries.filter((e) => e.fuelEfficiencyKmL !== undefined && e.fuelEfficiencyKmL > 0);

  if (valid.length < 2) {
    return (
      <View style={styles.container}>
        <Text style={styles.chartTitle}>FUEL EFFICIENCY TREND (KM/L)</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Need at least 2 full tank fill-ups to display trend</Text>
        </View>
      </View>
    );
  }

  // Reverse so oldest is left, newest is right
  const chronological = [...valid].reverse();
  const chartHeight = 130;
  const chartWidth = screenWidth - 64;
  const maxKmL = Math.max(...chronological.map((c) => c.fuelEfficiencyKmL || 0)) * 1.2;
  const minKmL = Math.max(0, Math.min(...chronological.map((c) => c.fuelEfficiencyKmL || 0)) * 0.8);
  const range = maxKmL - minKmL || 1;

  const points = chronological
    .map((item, idx) => {
      const x = 20 + idx * ((chartWidth - 40) / (chronological.length - 1 || 1));
      const val = item.fuelEfficiencyKmL || 0;
      const y = chartHeight - ((val - minKmL) / range) * (chartHeight - 30) - 15;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>FUEL EFFICIENCY TREND (KM/L)</Text>
      <View style={{ alignItems: 'center', marginTop: 10 }}>
        <Svg width={chartWidth} height={chartHeight + 25}>
          {/* Baseline */}
          <Line
            x1="0"
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke={theme.colors.cardBorder}
            strokeWidth="1"
          />
          <Line
            x1="0"
            y1={chartHeight / 2}
            x2={chartWidth}
            y2={chartHeight / 2}
            stroke={theme.colors.cardBorder}
            strokeDasharray="4, 4"
            strokeWidth="1"
          />

          {/* Line curve */}
          <Polyline
            points={points}
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data point dots */}
          {chronological.map((item, idx) => {
            const x = 20 + idx * ((chartWidth - 40) / (chronological.length - 1 || 1));
            const val = item.fuelEfficiencyKmL || 0;
            const y = chartHeight - ((val - minKmL) / range) * (chartHeight - 30) - 15;
            return (
              <G key={idx}>
                <Circle cx={x} cy={y} r="5" fill={theme.colors.background} stroke={theme.colors.primary} strokeWidth="2" />
                <SvgText
                  x={x}
                  y={y - 10}
                  fill={theme.colors.primaryLight}
                  fontSize="10"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {val.toFixed(1)}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    </View>
  );
};

interface CategoryDonutChartProps {
  categories: CategoryCost[];
  totalCost: number;
  currency: string;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categories,
  totalCost,
  currency,
}) => {
  if (!categories || categories.length === 0 || totalCost === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No category expenses recorded</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.chartTitle}>EXPENSE BY CATEGORY</Text>

      {/* Progress Bars for each category */}
      <View style={{ marginTop: 14 }}>
        {categories.map((cat) => (
          <View key={cat.category} style={styles.categoryRow}>
            <View style={styles.catMetaRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.catColorBox, { backgroundColor: cat.color }]} />
                <Text style={styles.catName}>{cat.label}</Text>
              </View>
              <Text style={styles.catAmount}>
                {currency} {cat.amount.toLocaleString()} ({cat.percentage}%)
              </Text>
            </View>
            {/* Progress track */}
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.min(100, Math.max(3, cat.percentage))}%`, backgroundColor: cat.color },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    marginBottom: 16,
  },
  chartTitle: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  categoryRow: {
    marginBottom: 12,
  },
  catMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  catColorBox: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  catName: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  catAmount: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
