import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProcessedFuelEntry } from '../services/calculations';
import { theme } from '../theme';

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
  const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <View style={styles.odometerBadge}>
            <Ionicons name="speedometer-outline" size={14} color={theme.colors.primary} />
            <Text style={styles.odometerText}>{entry.odometer.toLocaleString()} km</Text>
          </View>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        <View style={styles.rightInfo}>
          <Text style={styles.costText}>
            {currency} {entry.totalCost.toLocaleString()}
          </Text>
          <Text style={styles.litresText}>
            {entry.litres.toFixed(1)} L @ {currency} {entry.pricePerLitre.toFixed(0)}/L
          </Text>
        </View>
      </View>

      {/* Middle row with Efficiency badge & tags */}
      <View style={styles.middleRow}>
        {entry.isFullTank ? (
          <View style={styles.fullTankTag}>
            <Ionicons name="checkmark-circle" size={12} color={theme.colors.secondary} />
            <Text style={styles.fullTankText}>Full Tank</Text>
          </View>
        ) : (
          <View style={styles.partialTankTag}>
            <Ionicons name="water-outline" size={12} color={theme.colors.warning} />
            <Text style={styles.partialTankText}>Partial Fill</Text>
          </View>
        )}

        {/* Calculated Efficiency */}
        {entry.fuelEfficiencyKmL !== undefined && entry.fuelEfficiencyKmL > 0 ? (
          <View style={styles.efficiencyBadge}>
            <Ionicons name="flash" size={12} color="#0B0F19" />
            <Text style={styles.efficiencyText}>{entry.fuelEfficiencyKmL} km/L</Text>
          </View>
        ) : (
          <Text style={styles.partialNote}>
            {entry.isFullTank ? 'Initial Baseline' : 'Calculates on next full tank'}
          </Text>
        )}

        {entry.fuelStation && (
          <View style={styles.stationTag}>
            <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
            <Text style={styles.stationText} numberOfLines={1}>
              {entry.fuelStation}
            </Text>
          </View>
        )}
      </View>

      {/* Distance & Cost/km details if available */}
      {entry.distanceTravelled && entry.costPerKm && (
        <View style={styles.statsStrip}>
          <Text style={styles.statsStripText}>
            Interval: <Text style={{ color: theme.colors.textPrimary }}>{entry.distanceTravelled} km</Text> • Cost/km:{' '}
            <Text style={{ color: theme.colors.textPrimary }}>{currency} {entry.costPerKm.toFixed(2)}</Text>
          </Text>
        </View>
      )}

      {/* Bottom notes & receipt preview */}
      <View style={styles.bottomRow}>
        {entry.notes ? (
          <Text style={styles.notesText} numberOfLines={2}>
            "{entry.notes}"
          </Text>
        ) : (
          <View />
        )}

        <View style={styles.actions}>
          {entry.receiptUri && (
            <TouchableOpacity
              style={styles.receiptButton}
              onPress={() => onPressReceipt && onPressReceipt(entry.receiptUri!)}
            >
              <Ionicons name="receipt-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.receiptButtonText}>Receipt</Text>
            </TouchableOpacity>
          )}

          {onDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => onDelete(entry.id)}
            >
              <Ionicons name="trash-outline" size={14} color={theme.colors.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.cardBorder,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftInfo: {
    gap: 4,
  },
  odometerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  odometerText: {
    color: theme.colors.primaryLight,
    fontSize: 13,
    fontWeight: '700',
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  rightInfo: {
    alignItems: 'flex-end',
  },
  costText: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  litresText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  fullTankTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.secondaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fullTankText: {
    color: theme.colors.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  partialTankTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.warningMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  partialTankText: {
    color: theme.colors.warning,
    fontSize: 11,
    fontWeight: '600',
  },
  efficiencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  efficiencyText: {
    color: '#0B0F19',
    fontSize: 11,
    fontWeight: '800',
  },
  partialNote: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontStyle: 'italic',
  },
  stationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stationText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  statsStrip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  statsStripText: {
    color: theme.colors.textSecondary,
    fontSize: 11,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  notesText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontStyle: 'italic',
    flex: 1,
    marginRight: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.surfaceHighlight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  receiptButtonText: {
    color: theme.colors.primaryLight,
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
  },
});
