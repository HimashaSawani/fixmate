import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Vehicle, MaintenancePlan } from '../types';
import { evaluateMaintenancePlans, MaintenanceStatusResult } from '../services/calculations';
import { useTheme } from '../theme';

interface NotificationsModalProps {
  visible: boolean;
  vehicle: Vehicle | null;
  plans: MaintenancePlan[];
  onClose: () => void;
  onOpenAddService: (planId?: string) => void;
  onNavigateToMaintenance: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  vehicle,
  plans,
  onClose,
  onOpenAddService,
  onNavigateToMaintenance,
}) => {
  const { theme, isDark } = useTheme();

  if (!vehicle) return null;

  const evaluated = evaluateMaintenancePlans(plans, vehicle.currentOdometer);
  const overdueItems = evaluated.filter((e) => e.status === 'overdue');
  const dueSoonItems = evaluated.filter((e) => e.status === 'due_soon');
  const goodItems = evaluated.filter((e) => e.status === 'good');

  const totalAlerts = overdueItems.length + dueSoonItems.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.container,
            {
              backgroundColor: theme.colors.surface,
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              },
            ]}
          >
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                <Ionicons name="notifications" size={20} color={theme.colors.danger} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
                  Service Alerts & Reminders
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                  {vehicle.name} ({vehicle.make} {vehicle.model})
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {totalAlerts === 0 ? (
              <View style={styles.allClearBox}>
                <Ionicons name="checkmark-circle" size={48} color={theme.colors.secondary} />
                <Text style={[styles.allClearTitle, { color: theme.colors.textPrimary }]}>
                  All Services Up-To-Date!
                </Text>
                <Text style={[styles.allClearSub, { color: theme.colors.textSecondary }]}>
                  No maintenance items are currently overdue or due soon. Your vehicle is running in optimal health.
                </Text>
              </View>
            ) : (
              <>
                {/* Overdue Section */}
                {overdueItems.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
                      <Text style={[styles.sectionHeading, { color: theme.colors.danger }]}>
                        OVERDUE SERVICES ({overdueItems.length})
                      </Text>
                    </View>

                    {overdueItems.map((item) => (
                      <View
                        key={item.plan.id}
                        style={[
                          styles.alertCard,
                          {
                            backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
                            borderColor: theme.colors.danger,
                          },
                        ]}
                      >
                        <View style={styles.alertTop}>
                          <Text style={[styles.alertTitle, { color: theme.colors.textPrimary }]}>
                            {item.plan.title}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: theme.colors.danger },
                            ]}
                          >
                            <Text style={styles.statusBadgeText}>OVERDUE</Text>
                          </View>
                        </View>

                        <Text style={[styles.alertReason, { color: theme.colors.textSecondary }]}>
                          Due at {item.plan.nextDueMileage.toLocaleString()} km or {item.formattedDueDate} (Whichever comes first).
                        </Text>
                        <Text style={[styles.alertDiff, { color: theme.colors.danger }]}>
                          Exceeded by {Math.abs(item.remainingKm).toLocaleString()} km / {Math.abs(item.remainingDays)} days
                        </Text>

                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: theme.colors.danger }]}
                          onPress={() => {
                            onClose();
                            onOpenAddService(item.plan.id);
                          }}
                        >
                          <Ionicons name="construct" size={14} color="#FFFFFF" />
                          <Text style={styles.actionBtnText}>Log Service Now</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {/* Due Soon Section */}
                {dueSoonItems.length > 0 && (
                  <View style={styles.section}>
                    <View style={styles.sectionTitleRow}>
                      <Ionicons name="time" size={16} color={theme.colors.warning} />
                      <Text style={[styles.sectionHeading, { color: theme.colors.warning }]}>
                        DUE SOON ({dueSoonItems.length})
                      </Text>
                    </View>

                    {dueSoonItems.map((item) => (
                      <View
                        key={item.plan.id}
                        style={[
                          styles.alertCard,
                          {
                            backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB',
                            borderColor: theme.colors.warning,
                          },
                        ]}
                      >
                        <View style={styles.alertTop}>
                          <Text style={[styles.alertTitle, { color: theme.colors.textPrimary }]}>
                            {item.plan.title}
                          </Text>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: theme.colors.warning },
                            ]}
                          >
                            <Text style={[styles.statusBadgeText, { color: '#000000' }]}>DUE SOON</Text>
                          </View>
                        </View>

                        <Text style={[styles.alertReason, { color: theme.colors.textSecondary }]}>
                          Target: {item.plan.nextDueMileage.toLocaleString()} km or {item.formattedDueDate}
                        </Text>
                        <Text style={[styles.alertDiff, { color: theme.colors.warning }]}>
                          {item.remainingKm.toLocaleString()} km or {item.remainingDays} days remaining
                        </Text>

                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: theme.colors.warning }]}
                          onPress={() => {
                            onClose();
                            onOpenAddService(item.plan.id);
                          }}
                        >
                          <Ionicons name="construct" size={14} color="#000000" />
                          <Text style={[styles.actionBtnText, { color: '#000000' }]}>Log Service</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* In Good Standing Count */}
            {goodItems.length > 0 && (
              <View
                style={[
                  styles.goodSection,
                  {
                    backgroundColor: isDark ? theme.colors.surfaceHighlight : '#F8FAFC',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={18} color={theme.colors.secondary} />
                <Text style={[styles.goodText, { color: theme.colors.textSecondary }]}>
                  {goodItems.length} additional maintenance plan{goodItems.length > 1 ? 's' : ''} in good standing.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Action */}
          <View
            style={[
              styles.footer,
              {
                borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.viewAllBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => {
                onClose();
                onNavigateToMaintenance();
              }}
            >
              <Text style={styles.viewAllText}>Manage All Maintenance Plans</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '85%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    padding: 16,
  },
  allClearBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 10,
  },
  allClearTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  allClearSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  alertCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  alertTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  alertReason: {
    fontSize: 12,
    marginBottom: 2,
  },
  alertDiff: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  goodSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  goodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewAllText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
