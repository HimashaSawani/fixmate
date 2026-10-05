import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  accentColor = theme.colors.primary,
  trend,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title.toUpperCase()}</Text>
        <View style={[styles.iconContainer, { backgroundColor: `${accentColor}20` }]}>
          <Ionicons name={icon} size={16} color={accentColor} />
        </View>
      </View>
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {unit && <Text style={styles.unit}>{unit}</Text>}
      </View>
      {(subtitle || trend) && (
        <View style={styles.footer}>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          {trend && <Text style={[styles.trend, { color: accentColor }]}>{trend}</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
    flex: 1,
    minWidth: 140,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  iconContainer: {
    width: 26,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  unit: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  trend: {
    fontSize: 11,
    fontWeight: '600',
  },
});
