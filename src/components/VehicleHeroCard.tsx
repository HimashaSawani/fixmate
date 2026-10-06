import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { evaluateMaintenancePlans } from '../services/calculations';
import { Vehicle, MaintenancePlan } from '../types';
import { useTheme } from '../theme';

interface VehicleHeroCardProps {
  vehicle: Vehicle | null;
  plans: MaintenancePlan[];
  onPressOdometer: () => void;
  onPressService: () => void;
}

export const VehicleHeroCard: React.FC<VehicleHeroCardProps> = ({
  vehicle,
  plans,
  onPressOdometer,
  onPressService,
}) => {
  const { theme, isDark } = useTheme();

  // Evaluate plans for upcoming service
  const evaluated = evaluateMaintenancePlans(plans, vehicle?.currentOdometer || 0);
  const nextItem = evaluated.sort((a, b) => a.remainingKm - b.remainingKm)[0];
  const nextPlan = nextItem?.plan;
  const kmLeft = nextItem?.remainingKm !== undefined ? nextItem.remainingKm : null;

  return (
    <View style={styles.outerContainer}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#0F2744' : '#1D4ED8',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
          },
        ]}
      >
        {/* Background decorative glow/curves */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />

        {/* Top Info Row */}
        <View style={styles.topInfo}>
          <View>
            <Text style={styles.vehicleName} numberOfLines={1}>
              {vehicle ? vehicle.name : 'FixMate Garage'}
            </Text>
            <TouchableOpacity onPress={onPressOdometer} activeOpacity={0.8} style={styles.odoRow}>
              <Text style={styles.odometer}>
                {vehicle ? `${vehicle.currentOdometer.toLocaleString()} km` : '0 km'}
              </Text>
              <Ionicons name="pencil" size={12} color="rgba(255, 255, 255, 0.7)" />
            </TouchableOpacity>
          </View>

          {/* Car Illustration Graphic */}
          <View style={styles.carGraphicContainer}>
            <Ionicons
              name={vehicle?.type === 'motorcycle' ? 'bicycle' : 'car-sport'}
              size={54}
              color="rgba(255, 255, 255, 0.95)"
            />
          </View>
        </View>

        {/* Next Service Banner Pill */}
        <TouchableOpacity
          style={styles.servicePill}
          onPress={onPressService}
          activeOpacity={0.85}
        >
          <View style={styles.servicePillLeft}>
            <View style={styles.spannerIconWrap}>
              <Ionicons name="build" size={14} color="#38BDF8" />
            </View>
            <View>
              <Text style={styles.servicePillTitle}>
                {nextPlan ? `Next service in` : 'Service Schedule'}
              </Text>
              <Text style={styles.servicePillSubtitle}>
                {kmLeft !== null
                  ? `${kmLeft.toLocaleString()} km (${nextPlan?.title})`
                  : 'All services up to date'}
              </Text>
            </View>
          </View>

          <View style={styles.arrowCircle}>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(14, 165, 233, 0.25)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -60,
    left: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
  },
  topInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  vehicleName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  odoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  odometer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E0F2FE',
  },
  carGraphicContainer: {
    width: 74,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  servicePill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  servicePillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  spannerIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servicePillTitle: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  servicePillSubtitle: {
    fontSize: 13,
    color: '#F8FAFC',
    fontWeight: '700',
    marginTop: 1,
  },
  arrowCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
