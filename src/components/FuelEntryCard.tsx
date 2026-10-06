import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProcessedFuelEntry } from '../services/calculations';
import { useTheme } from '../theme';

interface FuelEntryCardProps {
  entry: ProcessedFuelEntry;
  currency: string;
  onPressReceipt?: (uri: string) => void;
  onDelete?: (id: string) => void;
}

export const FuelEntryCard: React.FC<FuelEntryCardProps> = ({
  entry,
  currency,
  onPressReceipt,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();

  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
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
        <View style={styles.leftInfo}>
          <View
            style={[
              styles.odometerBadge,
              {
                backgroundColor: theme.colors.primaryMuted,
              },
            ]}
          >
            <Ionicons name="speedometer-outline" size={14} color={theme.colors.primary} />
            <Text style={[styles.odometerText, { color: theme.colors.primary }]}>
              {entry.odometer.toLocaleString()} km
            </Text>
          </View>
          <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
            {formattedDate}
          </Text>
        </View>

        <View style={styles.rightInfo}>
          <Text style={[styles.costText, { color: theme.colors.textPrimary }]}>
            {currency} {entry.totalCost.toLocaleString()}
          </Text>
          <Text style={[styles.litresText, { color: theme.colors.textSecondary }]}>
            {entry.litres.toFixed(1)} L @ {currency} {entry.pricePerLitre.toFixed(0)}/L
          </Text>
        </View>
      </View>

      {/* Middle row with Efficiency badge & tags */}
      <View style={styles.middleRow}>
        {entry.isFullTank ? (
          <View
            style={[
              styles.fullTankTag,
              {
                backgroundColor: theme.colors.successMuted,
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={12} color={theme.colors.success} />
            <Text style={[styles.fullTankText, { color: theme.colors.success }]}>Full Tank</Text>
          </View>
        ) : (
          <View
            style={[
              styles.partialTankTag,
              {
                backgroundColor: theme.colors.warningMuted,
              },
            ]}
          >
            <Ionicons name="water-outline" size={12} color={theme.colors.warning} />
            <Text style={[styles.partialTankText, { color: theme.colors.warning }]}>
              Partial Fill
            </Text>
          </View>
        )}

        {/* Calculated Efficiency */}
        {entry.fuelEfficiencyKmL !== undefined && entry.fuelEfficiencyKmL > 0 ? (
          <View
            style={[
              styles.efficiencyBadge,
              {
                backgroundColor: theme.colors.primary,
              },
            ]}
          >
            <Ionicons name="flash" size={12} color="#FFFFFF" />
            <Text style={styles.efficiencyText}>{entry.fuelEfficiencyKmL} km/L</Text>
          </View>
        ) : (
          <Text style={[styles.partialNote, { color: theme.colors.textMuted }]}>
            {entry.isFullTank ? 'Baseline Fill' : 'Calculates on full tank'}
          </Text>
        )}

        {entry.fuelStation && (
          <View
            style={[
              styles.stationTag,
              {
                backgroundColor: isDark ? theme.colors.surfaceHighlight : '#F1F5F9',
              },
            ]}
          >
            <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
            <Text
              style={[styles.stationText, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {entry.fuelStation}
            </Text>
          </View>
        )}
      </View>

      {/* Distance & Cost/km details if available */}
      {entry.distanceTravelled && entry.costPerKm && (
        <View
          style={[
            styles.statsStrip,
            {
              backgroundColor: isDark ? theme.colors.surfaceHighlight : '#F8FAFC',
            },
          ]}
        >
          <Text style={[styles.statsStripText, { color: theme.colors.textSecondary }]}>
            Interval: <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{entry.distanceTravelled} km</Text> • Cost/km:{' '}
            <Text style={{ color: theme.colors.textPrimary, fontWeight: '700' }}>{currency} {entry.costPerKm.toFixed(2)}</Text>
          </Text>
        </View>
      )}

      {/* Bottom notes & receipt preview */}
      <View style={styles.bottomRow}>
        {entry.notes ? (
          <Text
            style={[styles.notesText, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            "{entry.notes}"
          </Text>
        ) : (
          <View />
        )}

        <View style={styles.actionsGroup}>
          {entry.receiptUri && onPressReceipt && (
            <TouchableOpacity
              style={[
                styles.receiptBtn,
                {
                  backgroundColor: theme.colors.receiptBg,
                },
              ]}
              onPress={() => onPressReceipt(entry.receiptUri!)}
            >
              <Ionicons name="image-outline" size={14} color={theme.colors.receiptIcon} />
              <Text style={[styles.receiptBtnText, { color: theme.colors.receiptIcon }]}>
                Receipt
              </Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => onDelete(entry.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
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
    marginBottom: 10,
  },
  leftInfo: {
    gap: 4,
  },
  odometerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  odometerText: {
    fontSize: 13,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 11,
    marginLeft: 2,
  },
  rightInfo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  costText: {
    fontSize: 17,
    fontWeight: '800',
  },
  litresText: {
    fontSize: 12,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  fullTankTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fullTankText: {
    fontSize: 11,
    fontWeight: '700',
  },
  partialTankTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  partialTankText: {
    fontSize: 11,
    fontWeight: '700',
  },
  efficiencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  efficiencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  partialNote: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  stationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stationText: {
    fontSize: 11,
    maxWidth: 120,
  },
  statsStrip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 6,
  },
  statsStripText: {
    fontSize: 11,
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
  notesText: {
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
    marginRight: 10,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
