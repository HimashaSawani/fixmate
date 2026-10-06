import { MaintenancePlan, Vehicle } from '../types';
import { isRunningInExpoGo } from 'expo';

let NotificationsModule: any = null;
let PlatformModule: any = null;

function getPlatform(): any {
  if (PlatformModule) return PlatformModule;
  try {
    PlatformModule = require('react-native').Platform;
    return PlatformModule;
  } catch {
    return { OS: 'web' };
  }
}

function isExpoGo(): boolean {
  try {
    if (typeof isRunningInExpoGo === 'function') {
      return isRunningInExpoGo();
    }
  } catch {
    // fallback
  }
  return false;
}

function getNotificationsModule(): any | null {
  const Platform = getPlatform();
  if (Platform.OS === 'web') {
    return null;
  }

  // In Expo Go on Android (SDK 53+), expo-notifications throws a fatal error on import
  // because remote push functionality was removed from Expo Go.
  // Standalone APK builds (preview/production) will execute notifications natively.
  if (Platform.OS === 'android' && isExpoGo()) {
    return null;
  }

  if (NotificationsModule) return NotificationsModule;
  try {
    // Dynamically load to avoid static initialization error in Expo Go
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-notifications');
    NotificationsModule = mod;
    
    // Configure notification behavior
    if (mod && typeof mod.setNotificationHandler === 'function') {
      mod.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: mod.AndroidNotificationPriority?.HIGH,
        }),
      });
    }
    return NotificationsModule;
  } catch (err) {
    // In Expo Go or unsupported environments, gracefully fall back
    console.log('expo-notifications skipped in current environment');
    return null;
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;

  try {
    const Platform = getPlatform();
    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('fixmate-maintenance', {
        name: 'Vehicle Maintenance Alerts',
        importance: Notifications.AndroidImportance?.HIGH || 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#06B6D4',
      });
    }

    if (typeof Notifications.getPermissionsAsync === 'function') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted' && typeof Notifications.requestPermissionsAsync === 'function') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    }
    return false;
  } catch (err) {
    console.warn('Notification permission error:', err);
    return false;
  }
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return 'undetermined';

  try {
    if (typeof Notifications.getPermissionsAsync === 'function') {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    }
    return 'undetermined';
  } catch {
    return 'undetermined';
  }
}

export async function cancelScheduledMaintenanceNotification(planId: string): Promise<void> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    if (typeof Notifications.cancelScheduledNotificationAsync === 'function') {
      await Notifications.cancelScheduledNotificationAsync(`fixmate_plan_${planId}`);
    }
  } catch (err) {
    console.warn(`Failed to cancel notification for plan ${planId}:`, err);
  }
}

export async function scheduleMaintenanceNotification(
  vehicle: Vehicle,
  plan: MaintenancePlan,
  daysBefore: number = 7
): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return null;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const dueDate = new Date(plan.nextDueDate);
    const triggerDate = new Date(dueDate.getTime() - daysBefore * 24 * 60 * 60 * 1000);

    // Only schedule if trigger date is in future
    if (triggerDate.getTime() <= Date.now()) {
      return null;
    }

    // Cancel previous scheduled reminder for this plan to avoid duplicates
    await cancelScheduledMaintenanceNotification(plan.id);

    if (typeof Notifications.scheduleNotificationAsync === 'function') {
      const id = await Notifications.scheduleNotificationAsync({
        identifier: `fixmate_plan_${plan.id}`,
        content: {
          title: `🔧 FixMate Reminder: ${vehicle.name}`,
          body: `${plan.title} is due around ${dueDate.toLocaleDateString()} (or at ${plan.nextDueMileage.toLocaleString()} km)!`,
          data: { vehicleId: vehicle.id, planId: plan.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes?.DATE || 'date',
          date: triggerDate,
          channelId: 'fixmate-maintenance',
        },
      });
      return id;
    }
    return null;
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
  const Notifications = getNotificationsModule();
  if (!Notifications) return;

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return;

    if (typeof Notifications.scheduleNotificationAsync === 'function') {
      await Notifications.scheduleNotificationAsync({
        identifier: `fixmate_instant_${vehicle.id}_${Date.now()}`,
        content: {
          title: `⚠️ Service Due: ${vehicle.name}`,
          body: `${planTitle} has reached the service threshold (${dueMileage.toLocaleString()} km). Please schedule your service.`,
          data: { vehicleId: vehicle.id },
        },
        trigger: null, // Send immediately
      });
    }
  } catch (err) {
    console.warn('Failed to send instant notification:', err);
  }
}
