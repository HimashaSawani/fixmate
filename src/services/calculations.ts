import type {
  FuelEntry,
  MaintenancePlan,
  Vehicle,
  ServiceRecord,
  ExpenseRecord,
  VehicleHealthSummary,
  ExpenseCategory,
} from '../types';

export interface ProcessedFuelEntry extends FuelEntry {
  distanceTravelled?: number;
  fuelEfficiencyKmL?: number;
  costPerKm?: number;
  intervalLitres?: number;
  intervalCost?: number;
}

export interface FuelStats {
  totalLitres: number; // All litres recorded across all fill-ups
  totalLitresPumped: number;
  eligibleLitresConsumed: number; // Litres consumed strictly within valid calculation intervals
  totalSpent: number;
  totalDistanceTracked: number;
  overallAvgKmL: number;
  overallCostPerKm: number;
  bestKmL: number;
  worstKmL: number;
  lastKmL?: number;
  entriesCount: number;
  fullFillCount: number;
  partialFillCount: number;
}

/**
 * Calculates fuel efficiency using the rigorous Full-to-Full Tank method.
 * Handles intermediate partial fill-ups by accumulating litres and costs
 * until the next full tank fill-up.
 */
export function processFuelEntries(entries: FuelEntry[]): {
  processedEntries: ProcessedFuelEntry[];
  stats: FuelStats;
} {
  if (!entries || entries.length === 0) {
    return {
      processedEntries: [],
      stats: {
        totalLitres: 0,
        totalLitresPumped: 0,
        eligibleLitresConsumed: 0,
        totalSpent: 0,
        totalDistanceTracked: 0,
        overallAvgKmL: 0,
        overallCostPerKm: 0,
        bestKmL: 0,
        worstKmL: 0,
        entriesCount: 0,
        fullFillCount: 0,
        partialFillCount: 0,
      },
    };
  }

  // Sort ascending by odometer, then date
  const sorted = [...entries].sort((a, b) => {
    if (a.odometer === b.odometer) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return a.odometer - b.odometer;
  });

  const processed: ProcessedFuelEntry[] = [];
  let lastFullTankIndex = -1;
  let accumulatedPartialLitres = 0;
  let accumulatedPartialCost = 0;

  let totalValidDistance = 0;
  let totalValidFuel = 0;
  let totalValidCost = 0;
  let bestKmL = 0;
  let worstKmL = Infinity;
  let lastCalculatedKmL: number | undefined = undefined;

  let totalAllLitres = 0;
  let totalAllCost = 0;
  let fullCount = 0;
  let partialCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    totalAllLitres += current.litres;
    totalAllCost += current.totalCost;

    const item: ProcessedFuelEntry = { ...current };

    if (current.isFullTank) {
      fullCount++;
      if (lastFullTankIndex !== -1) {
        const prevFull = sorted[lastFullTankIndex];
        const distance = current.odometer - prevFull.odometer;

        if (distance > 0) {
          const totalLitresInInterval = accumulatedPartialLitres + current.litres;
          const totalCostInInterval = accumulatedPartialCost + current.totalCost;
          const kmPerLitre = distance / totalLitresInInterval;
          const costPerKm = totalCostInInterval / distance;

          item.distanceTravelled = distance;
          item.fuelEfficiencyKmL = Number(kmPerLitre.toFixed(2));
          item.costPerKm = Number(costPerKm.toFixed(2));
          item.intervalLitres = Number(totalLitresInInterval.toFixed(2));
          item.intervalCost = Number(totalCostInInterval.toFixed(2));

          totalValidDistance += distance;
          totalValidFuel += totalLitresInInterval;
          totalValidCost += totalCostInInterval;

          if (kmPerLitre > bestKmL) bestKmL = kmPerLitre;
          if (kmPerLitre < worstKmL) worstKmL = kmPerLitre;
          lastCalculatedKmL = kmPerLitre;
        }
      }

      // Reset accumulators for next interval
      accumulatedPartialLitres = 0;
      accumulatedPartialCost = 0;
      lastFullTankIndex = i;
    } else {
      partialCount++;
      // Partial fill: accumulate litres and cost for the next full fill
      accumulatedPartialLitres += current.litres;
      accumulatedPartialCost += current.totalCost;
      item.distanceTravelled = undefined;
      item.fuelEfficiencyKmL = undefined;
      item.costPerKm = undefined;
    }

    processed.push(item);
  }

  // Calculate averages across all valid intervals
  const overallAvgKmL =
    totalValidFuel > 0 && totalValidDistance > 0
      ? Number((totalValidDistance / totalValidFuel).toFixed(2))
      : 0;

  const overallCostPerKm =
    totalValidDistance > 0 && totalValidCost > 0
      ? Number((totalValidCost / totalValidDistance).toFixed(2))
      : 0;

  // Return processed entries sorted descending (newest first for UI display)
  const descending = [...processed].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return {
    processedEntries: descending,
    stats: {
      totalLitres: Number(totalAllLitres.toFixed(1)),
      totalLitresPumped: Number(totalAllLitres.toFixed(1)),
      eligibleLitresConsumed: Number(totalValidFuel.toFixed(1)),
      totalSpent: Number(totalAllCost.toFixed(2)),
      totalDistanceTracked: totalValidDistance,
      overallAvgKmL,
      overallCostPerKm,
      bestKmL: bestKmL > 0 ? Number(bestKmL.toFixed(2)) : 0,
      worstKmL: worstKmL < Infinity && worstKmL > 0 ? Number(worstKmL.toFixed(2)) : 0,
      lastKmL: lastCalculatedKmL ? Number(lastCalculatedKmL.toFixed(2)) : undefined,
      entriesCount: sorted.length,
      fullFillCount: fullCount,
      partialFillCount: partialCount,
    },
  };
}

export interface MaintenanceStatusResult {
  plan: MaintenancePlan;
  status: 'good' | 'due_soon' | 'overdue';
  remainingKm: number;
  remainingDays: number;
  progressPercent: number; // 0% (just serviced) to 100% (due) and >100% (overdue)
  dueReason: 'mileage' | 'date' | 'both';
  formattedDueDate: string;
}

/**
 * Calculates due status for maintenance plans based on current odometer and date.
 * Uses "Whichever comes first" rule.
 */
export function evaluateMaintenancePlans(
  plans: MaintenancePlan[],
  currentOdometer: number
): MaintenanceStatusResult[] {
  const now = new Date();
  const todayMs = now.getTime();

  return plans.map((plan) => {
    const dueDate = new Date(plan.nextDueDate);
    const dueDateMs = dueDate.getTime();
    const remainingKm = plan.nextDueMileage - currentOdometer;
    const remainingDays = Math.ceil((dueDateMs - todayMs) / (1000 * 60 * 60 * 24));

    // Progress percentage based on km interval
    const kmTraveledSinceService = currentOdometer - plan.lastServiceMileage;
    const kmProgress = plan.intervalKm > 0 ? (kmTraveledSinceService / plan.intervalKm) * 100 : 0;

    // Progress percentage based on time interval
    const lastServiceDateMs = new Date(plan.lastServiceDate).getTime();
    const totalTimeSpan = dueDateMs - lastServiceDateMs;
    const timeElapsed = todayMs - lastServiceDateMs;
    const timeProgress = totalTimeSpan > 0 ? (timeElapsed / totalTimeSpan) * 100 : 0;

    // Progress is the higher of the two (since service is due whichever comes first)
    const progressPercent = Math.max(0, Math.round(Math.max(kmProgress, timeProgress)));

    const isMileageOverdue = remainingKm <= 0;
    const isDateOverdue = remainingDays <= 0;
    const isMileageDueSoon = remainingKm <= 500 && remainingKm > 0;
    const isDateDueSoon = remainingDays <= 14 && remainingDays > 0;

    let status: 'good' | 'due_soon' | 'overdue' = 'good';
    let dueReason: 'mileage' | 'date' | 'both' = 'mileage';

    if (isMileageOverdue && isDateOverdue) {
      status = 'overdue';
      dueReason = 'both';
    } else if (isMileageOverdue) {
      status = 'overdue';
      dueReason = 'mileage';
    } else if (isDateOverdue) {
      status = 'overdue';
      dueReason = 'date';
    } else if (isMileageDueSoon || isDateDueSoon) {
      status = 'due_soon';
      dueReason = isMileageDueSoon && isDateDueSoon ? 'both' : isMileageDueSoon ? 'mileage' : 'date';
    }

    return {
      plan,
      status,
      remainingKm,
      remainingDays,
      progressPercent,
      dueReason,
      formattedDueDate: dueDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    };
  });
}

export interface CategoryCost {
  category: ExpenseCategory;
  label: string;
  amount: number;
  percentage: number;
  color: string;
  icon: string;
}

export interface MonthlyCostItem {
  monthKey: string; // "2026-03"
  monthLabel: string; // "Mar 2026"
  fuel: number;
  service: number;
  repairs: number;
  insurance: number;
  other: number;
  total: number;
}

/**
 * Unified Financial & Expense Aggregator.
 * PREVENTS DOUBLE COUNTING:
 * - Fuel costs are aggregated strictly from Fuel Entries.
 * - Service costs are aggregated strictly from Service Records.
 * - Other expenses (repairs, insurance, registration, accessories, etc.) are taken from Expenses table where not linked.
 */
export function calculateUnifiedExpenses(
  fuelEntries: FuelEntry[],
  serviceRecords: ServiceRecord[],
  expenses: ExpenseRecord[],
  vehicle?: Vehicle
): {
  totalCost: number;
  fuelTotal: number;
  serviceTotal: number;
  repairTotal: number;
  insuranceTotal: number;
  registrationTotal: number;
  accessoriesTotal: number;
  otherTotal: number;
  categoryBreakdown: CategoryCost[];
  monthlyBreakdown: MonthlyCostItem[];
  costPerKm: number;
} {
  // 1. Fuel Total
  let fuelTotal = fuelEntries.reduce((sum, f) => sum + f.totalCost, 0);

  // 2. Service Total
  let serviceTotal = serviceRecords.reduce((sum, s) => sum + s.totalCost, 0);

  // 3. Standalone Expenses Breakdown (excluding any duplicated items)
  let repairTotal = 0;
  let insuranceTotal = 0;
  let registrationTotal = 0;
  let accessoriesTotal = 0;
  let otherTotal = 0;

  for (const exp of expenses) {
    // If expense was auto-created from service or fuel, skip to prevent double counting
    if (exp.linkedServiceId || exp.linkedFuelId) continue;

    switch (exp.category) {
      case 'repair':
        repairTotal += exp.amount;
        break;
      case 'insurance':
        insuranceTotal += exp.amount;
        break;
      case 'registration':
        registrationTotal += exp.amount;
        break;
      case 'accessories':
        accessoriesTotal += exp.amount;
        break;
      case 'service':
        // If logged in expenses table manually as a service
        serviceTotal += exp.amount;
        break;
      case 'fuel':
        // If logged in expenses table manually as fuel
        fuelTotal += exp.amount;
        break;
      default:
        otherTotal += exp.amount;
        break;
    }
  }

  const grandTotal =
    fuelTotal +
    serviceTotal +
    repairTotal +
    insuranceTotal +
    registrationTotal +
    accessoriesTotal +
    otherTotal;

  const categories: { cat: ExpenseCategory; label: string; amount: number; color: string; icon: string }[] = [
    { cat: 'fuel', label: 'Fuel', amount: fuelTotal, color: '#06B6D4', icon: 'gas-pump' },
    { cat: 'service', label: 'Scheduled Service', amount: serviceTotal, color: '#10B981', icon: 'wrench' },
    { cat: 'repair', label: 'Repairs', amount: repairTotal, color: '#F59E0B', icon: 'hammer' },
    { cat: 'insurance', label: 'Insurance', amount: insuranceTotal, color: '#8B5CF6', icon: 'shield-check' },
    { cat: 'registration', label: 'Registration / Tax', amount: registrationTotal, color: '#EC4899', icon: 'file-text' },
    { cat: 'accessories', label: 'Accessories & Upgrades', amount: accessoriesTotal, color: '#3B82F6', icon: 'shopping-bag' },
    { cat: 'other', label: 'Other Expenses', amount: otherTotal, color: '#64748B', icon: 'receipt' },
  ];

  const categoryBreakdown: CategoryCost[] = categories
    .filter((c) => c.amount > 0)
    .map((c) => ({
      category: c.cat,
      label: c.label,
      amount: Number(c.amount.toFixed(2)),
      percentage: grandTotal > 0 ? Number(((c.amount / grandTotal) * 100).toFixed(1)) : 0,
      color: c.color,
      icon: c.icon,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Monthly Breakdown (Grouping by Year-Month)
  const monthlyMap: Record<string, MonthlyCostItem> = {};

  const addToMonth = (dateStr: string, cat: string, amount: number) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = {
        monthKey,
        monthLabel,
        fuel: 0,
        service: 0,
        repairs: 0,
        insurance: 0,
        other: 0,
        total: 0,
      };
    }

    const item = monthlyMap[monthKey];
    item.total += amount;

    if (cat === 'fuel') item.fuel += amount;
    else if (cat === 'service') item.service += amount;
    else if (cat === 'repair') item.repairs += amount;
    else if (cat === 'insurance' || cat === 'registration') item.insurance += amount;
    else item.other += amount;
  };

  fuelEntries.forEach((f) => addToMonth(f.date, 'fuel', f.totalCost));
  serviceRecords.forEach((s) => addToMonth(s.date, 'service', s.totalCost));
  expenses.forEach((e) => {
    if (!e.linkedServiceId && !e.linkedFuelId) {
      addToMonth(e.date, e.category, e.amount);
    }
  });

  const monthlyBreakdown = Object.values(monthlyMap).sort((a, b) =>
    a.monthKey.localeCompare(b.monthKey)
  );

  // Current calendar month expenses:
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthItem = monthlyMap[currentMonthKey];
  const currentMonthTotal = currentMonthItem ? Number(currentMonthItem.total.toFixed(2)) : 0;
  const currentMonthLabel = now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  // Overall Cost per Km based on distance travelled over the recorded period
  // We collect odometers from fuel entries, service records, and expenses
  const allRecordedOdometers: number[] = [
    ...fuelEntries.map((f) => f.odometer),
    ...serviceRecords.map((s) => s.odometer),
    ...expenses.filter((e) => e.odometer !== undefined && e.odometer > 0).map((e) => e.odometer!),
  ].filter((odo) => typeof odo === 'number' && odo > 0);

  let trackedDistance = 0;
  if (allRecordedOdometers.length >= 2) {
    const minOdo = Math.min(...allRecordedOdometers);
    const maxOdo = Math.max(...allRecordedOdometers);
    trackedDistance = maxOdo - minOdo;
  }

  let costPerKm = 0;
  if (trackedDistance > 0) {
    costPerKm = Number((grandTotal / trackedDistance).toFixed(2));
  } else if (vehicle && vehicle.currentOdometer > 0) {
    costPerKm = Number((grandTotal / vehicle.currentOdometer).toFixed(2));
  }

  return {
    totalCost: Number(grandTotal.toFixed(2)),
    fuelTotal: Number(fuelTotal.toFixed(2)),
    serviceTotal: Number(serviceTotal.toFixed(2)),
    repairTotal: Number(repairTotal.toFixed(2)),
    insuranceTotal: Number(insuranceTotal.toFixed(2)),
    registrationTotal: Number(registrationTotal.toFixed(2)),
    accessoriesTotal: Number(accessoriesTotal.toFixed(2)),
    otherTotal: Number(otherTotal.toFixed(2)),
    categoryBreakdown,
    monthlyBreakdown,
    currentMonthTotal,
    currentMonthLabel,
    trackedDistance,
    costPerKm,
  };
}

/**
 * Computes a quick health and financial summary for the active vehicle.
 */
export function getVehicleSummary(
  vehicle: Vehicle,
  fuelEntries: FuelEntry[],
  serviceRecords: ServiceRecord[],
  expenses: ExpenseRecord[],
  plans: MaintenancePlan[]
): VehicleHealthSummary {
  const fuelResult = processFuelEntries(fuelEntries);
  const expenseResult = calculateUnifiedExpenses(fuelEntries, serviceRecords, expenses, vehicle);
  const evaluatedPlans = evaluateMaintenancePlans(plans, vehicle.currentOdometer);

  const overdueCount = evaluatedPlans.filter((p) => p.status === 'overdue').length;
  const dueSoonCount = evaluatedPlans.filter((p) => p.status === 'due_soon').length;
  const goodCount = evaluatedPlans.filter((p) => p.status === 'good').length;

  return {
    totalSpent: expenseResult.totalCost,
    fuelSpent: expenseResult.fuelTotal,
    maintenanceSpent: expenseResult.serviceTotal,
    repairsSpent: expenseResult.repairTotal,
    otherSpent:
      expenseResult.insuranceTotal +
      expenseResult.registrationTotal +
      expenseResult.accessoriesTotal +
      expenseResult.otherTotal,
    totalDistance: vehicle.currentOdometer,
    averageKmL: fuelResult.stats.overallAvgKmL,
    costPerKm: expenseResult.costPerKm,
    overdueServicesCount: overdueCount,
    dueSoonServicesCount: dueSoonCount,
    goodServicesCount: goodCount,
  };
}
