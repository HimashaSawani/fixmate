import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MaintenancePlan, Vehicle } from '../types';

// Safely configure notification behavior (guarded for Expo Go)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    }),
  });
} catch (err) {
  console.warn('Notifications handler init skipped/warning:', err);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('fixmate-maintenance', {
        name: 'Vehicle Maintenance Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#06B6D4',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Notification permission request error:', err);
    return false;
  }
}

export async function scheduleMaintenanceNotification(
  vehicle: Vehicle,
  plan: MaintenancePlan,
  daysBefore: number = 7
): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const dueDate = new Date(plan.nextDueDate);
    const triggerDate = new Date(dueDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);

    // Only schedule if trigger date is in future
    if (triggerDate.getTime() <= Date.now()) {
      return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🔧 FixMate Reminder: ${vehicle.name}`,
        body: `${plan.title} is due around ${dueDate.toLocaleDateString()} (or at ${plan.nextDueMileage} km)!`,
        data: { vehicleId: vehicle.id, planId: plan.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: 'fixmate-maintenance',
      },
    });

    return id;
  } catch (err) {
    console.warn('Failed to schedule notification:', err);
    return null;
  }
}

export async function sendInstantOdometerAlert(
  vehicle: Vehicle,
  planTitle: string,
  dueMileage: number
): Promise<void> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `⚠️ Service Due: ${vehicle.name}`,
        body: `${planTitle} has reached the service threshold (${dueMileage} km). Please schedule your service.`,
        data: { vehicleId: vehicle.id },
      },
      trigger: null, // Send immediately
    });
  } catch (err) {
    console.warn('Failed to send instant notification:', err);
  }
}
