import {
  Vehicle,
  MaintenancePlan,
  FuelEntry,
  ServiceRecord,
  ExpenseRecord,
  OdometerEntry,
} from '../types';
import {
  evaluateMaintenancePlans,
  calculateUnifiedExpenses,
  processFuelEntries,
  MaintenanceStatusResult,
} from './calculations';
import {
  scheduleMaintenanceNotification,
  cancelScheduledMaintenanceNotification,
  sendInstantOdometerAlert,
} from './notifications';

export interface DrivingForecast {
  hasForecast: boolean;
  avgKmPerDay: number;
  sampleDays: number;
  sampleDistanceKm: number;
  predictedDaysRemaining?: number;
  predictedDueDate?: string;
  explanation: string;
}

export interface AutomatedPlanStatus extends MaintenanceStatusResult {
  forecast: DrivingForecast;
}

export interface AutomationResult {
  vehicle: Vehicle;
  evaluatedPlans: AutomatedPlanStatus[];
  overdueCount: number;
  dueSoonCount: number;
  goodCount: number;
  avgKmPerDay: number;
  currentMonthTotal: number;
  currentMonthLabel: string;
  totalOwnershipCost: number;
  costPerKm: number | null;
  overallAvgKmL: number;
}

/**
 * Calculates historical average daily driving distance from odometer entries.
 * Δkm / Δdays
 */
export function calculateDailyDrivingRate(
  odometerEntries: OdometerEntry[]
): { avgKmPerDay: number; sampleDays: number; sampleDistanceKm: number } {
  if (!odometerEntries || odometerEntries.length < 2) {
    return { avgKmPerDay: 0, sampleDays: 0, sampleDistanceKm: 0 };
  }

  // Sort chronologically
  const sorted = [...odometerEntries].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];

  const oldestDate = new Date(oldest.date).getTime();
  const newestDate = new Date(newest.date).getTime();

  const daysElapsed = Math.max(1, (newestDate - oldestDate) / (1000 * 60 * 60 * 24));
  const distanceTraveled = newest.odometer - oldest.odometer;

  if (distanceTraveled <= 0 || daysElapsed < 1) {
    return { avgKmPerDay: 0, sampleDays: Math.round(daysElapsed), sampleDistanceKm: Math.max(0, distanceTraveled) };
  }

  const avgKmPerDay = Number((distanceTraveled / daysElapsed).toFixed(1));

  return {
    avgKmPerDay,
    sampleDays: Math.round(daysElapsed),
    sampleDistanceKm: distanceTraveled,
  };
}

/**
 * Computes an explainable maintenance forecast based on recent driving rate.
 * Estimated days remaining = Remaining km / Estimated km per day
 */
export function calculateExplainableForecast(
  plan: MaintenancePlan,
  currentOdometer: number,
  avgKmPerDay: number,
  sampleDays: number
): DrivingForecast {
  const remainingKm = plan.nextDueMileage - currentOdometer;

  if (avgKmPerDay <= 0 || sampleDays < 2 || remainingKm <= 0) {
    if (remainingKm <= 0) {
      return {
        hasForecast: false,
        avgKmPerDay,
        sampleDays,
        sampleDistanceKm: 0,
        explanation: 'Mileage threshold reached or exceeded.',
      };
    }
    return {
      hasForecast: false,
      avgKmPerDay,
      sampleDays,
      sampleDistanceKm: 0,
      explanation: 'Log more odometer updates over time to generate driving forecasts.',
    };
  }

  const predictedDays = Math.max(1, Math.round(remainingKm / avgKmPerDay));
  const predictedDate = new Date(Date.now() + predictedDays * 24 * 3600 * 1000);
  const formattedPredicted = predictedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    hasForecast: true,
    avgKmPerDay,
    sampleDays,
    sampleDistanceKm: remainingKm,
    predictedDaysRemaining: predictedDays,
    predictedDueDate: formattedPredicted,
    explanation: `Estimated Date: around ${formattedPredicted} (~${predictedDays} days) based on your recent rate of ~${avgKmPerDay} km/day (${sampleDays} days sample).`,
  };
}

/**
 * Centralized Automation Engine.
 * Evaluates all maintenance plans, triggers notifications with stable IDs,
 * and produces unified metrics for all UI screens.
 */
export async function runVehicleAutomation(
  vehicle: Vehicle,
  plans: MaintenancePlan[],
  fuelEntries: FuelEntry[],
  serviceRecords: ServiceRecord[],
  expenses: ExpenseRecord[],
  odometerEntries: OdometerEntry[],
  enableNotifications: boolean = true
): Promise<AutomationResult> {
  // 1. Calculate historical daily driving rate
  const { avgKmPerDay, sampleDays, sampleDistanceKm } = calculateDailyDrivingRate(odometerEntries);

  // 2. Evaluate all plans using "Whichever comes first" rule
  const basicEvaluated = evaluateMaintenancePlans(plans, vehicle.currentOdometer);

  // 3. Attach explainable forecasts & sync notifications
  const evaluatedPlans: AutomatedPlanStatus[] = [];

  for (const item of basicEvaluated) {
    const forecast = calculateExplainableForecast(
      item.plan,
      vehicle.currentOdometer,
      avgKmPerDay,
      sampleDays
    );

    evaluatedPlans.push({
      ...item,
      forecast,
    });

    // 4. Sync scheduled notifications with stable IDs
    if (enableNotifications) {
      if (item.status === 'overdue' && item.dueReason !== 'date') {
        // Instant alert if triggered by odometer threshold
        await sendInstantOdometerAlert(vehicle, item.plan.title, item.plan.nextDueMileage);
      } else if (item.status !== 'overdue') {
        // Schedule future reminder (stable ID prevents duplicates)
        await scheduleMaintenanceNotification(vehicle, item.plan, 7);
      }
    }
  }

  // 5. Unified expenses and fuel stats
  const unified = calculateUnifiedExpenses(fuelEntries, serviceRecords, expenses, vehicle);
  const fuelStats = processFuelEntries(fuelEntries);

  const overdueCount = evaluatedPlans.filter((p) => p.status === 'overdue').length;
  const dueSoonCount = evaluatedPlans.filter((p) => p.status === 'due_soon').length;
  const goodCount = evaluatedPlans.filter((p) => p.status === 'good').length;

  return {
    vehicle,
    evaluatedPlans,
    overdueCount,
    dueSoonCount,
    goodCount,
    avgKmPerDay,
    currentMonthTotal: unified.currentMonthTotal,
    currentMonthLabel: unified.currentMonthLabel,
    totalOwnershipCost: unified.totalCost,
    costPerKm: unified.costPerKm,
    overallAvgKmL: fuelStats.stats.overallAvgKmL,
  };
}

/**
 * Convenience helper to run full automation for a given vehicle ID by fetching all required state.
 */
export async function runVehicleAutomationForVehicleId(vehicleId: string): Promise<AutomationResult | null> {
  const dbModule = require('../database/db');
  const vehicle = await dbModule.getVehicleById(vehicleId);
  if (!vehicle) return null;
  const [plans, fuel, services, expenses, odos, settings] = await Promise.all([
    dbModule.getMaintenancePlans(vehicleId),
    dbModule.getFuelEntries(vehicleId),
    dbModule.getServiceRecords(vehicleId),
    dbModule.getExpenses(vehicleId),
    dbModule.getOdometerEntries(vehicleId),
    dbModule.getSettings(),
  ]);
  return runVehicleAutomation(
    vehicle,
    plans,
    fuel,
    services,
    expenses,
    odos,
    settings.enableNotifications !== false
  );
}
