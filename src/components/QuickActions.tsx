import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../theme';

interface QuickActionsProps {
  onAddFuel: () => void;
  onAddService: () => void;
  onAddExpense: () => void;
  onScanReceipt: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onAddFuel,
  onAddService,
  onAddExpense,
  onScanReceipt,
}) => {
  const { theme, isDark } = useTheme();

  const actions = [
    {
      id: 'fuel',
      title: 'Fuel',
      icon: <Ionicons name="color-fill" size={20} color={theme.colors.fuelIcon} />,
      bgColor: theme.colors.fuelBg,
      onPress: onAddFuel,
    },
    {
      id: 'service',
      title: 'Service',
      icon: <Ionicons name="build" size={20} color={theme.colors.serviceIcon} />,
      bgColor: theme.colors.serviceBg,
      onPress: onAddService,
    },
    {
      id: 'expense',
      title: 'Expense',
      icon: <FontAwesome5 name="coins" size={18} color={theme.colors.expenseIcon} />,
      bgColor: theme.colors.expenseBg,
      onPress: onAddExpense,
    },
    {
      id: 'receipt',
      title: 'Receipt',
      icon: <Ionicons name="receipt" size={20} color={theme.colors.receiptIcon} />,
      bgColor: theme.colors.receiptBg,
      onPress: onScanReceipt,
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {actions.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
                shadowColor: isDark ? '#000' : '#64748B',
              },
            ]}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: item.bgColor }]}>
              {item.icon}
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
});
