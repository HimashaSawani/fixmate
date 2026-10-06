import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme';

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
  accentColor,
  trend,
}) => {
  const { theme, isDark } = useTheme();
  const effectiveAccent = accentColor || theme.colors.primary;

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
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textMuted }]}>
          {title.toUpperCase()}
        </Text>
        <View style={[styles.iconContainer, { backgroundColor: `${effectiveAccent}20` }]}>
          <Ionicons name={icon} size={16} color={effectiveAccent} />
        </View>
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: theme.colors.textPrimary }]}>{value}</Text>
        {unit && <Text style={[styles.unit, { color: theme.colors.textSecondary }]}>{unit}</Text>}
      </View>
      {(subtitle || trend) && (
        <View style={styles.footer}>
          {subtitle && (
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
          {trend && <Text style={[styles.trend, { color: effectiveAccent }]}>{trend}</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    flex: 1,
    minWidth: 140,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
  },
  unit: {
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
    fontSize: 11,
  },
  trend: {
    fontSize: 11,
    fontWeight: '700',
  },
});
