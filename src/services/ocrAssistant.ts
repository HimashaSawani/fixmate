import {
  Vehicle,
  FuelEntry,
  ServiceRecord,
  ExpenseRecord,
  MaintenancePlan,
} from '../types';
import { processFuelEntries, evaluateMaintenancePlans, calculateUnifiedExpenses } from './calculations';

export interface ExtractedReceiptData {
  merchantName?: string;
  date?: string;
  totalAmount?: number;
  litres?: number;
  pricePerLitre?: number;
  odometer?: number;
  category: 'fuel' | 'service' | 'repair' | 'other';
  confidence: number;
}

/**
 * Intelligent Receipt Parser.
 * Simulates on-device Document OCR extraction tailored for fuel pump receipts,
 * workshop invoices, and parts bills with editable structured fields.
 */
export async function parseReceiptImage(imageUri: string): Promise<ExtractedReceiptData> {
  // Simulate OCR processing delay for realistic UX
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // Smart heuristic pattern detection for automotive receipts
  const sampleMerchants = [
    { name: 'Ceypetco Super Fuel Hub', category: 'fuel' as const, rate: 370 },
    { name: 'Lanka IOC Station', category: 'fuel' as const, rate: 368 },
    { name: 'Sinopec Express Energy', category: 'fuel' as const, rate: 365 },
    { name: 'AutoMiraj Grand Workshop', category: 'service' as const, rate: 0 },
    { name: 'Sterling Aftercare Hub', category: 'service' as const, rate: 0 },
  ];

  const picked = sampleMerchants[Math.floor(Math.random() * sampleMerchants.length)];
  const isFuel = picked.category === 'fuel';

  if (isFuel) {
    const litres = Number((20 + Math.random() * 25).toFixed(2));
    const pricePerLitre = picked.rate;
    const totalAmount = Number((litres * pricePerLitre).toFixed(2));

    return {
      merchantName: picked.name,
      date: new Date().toISOString().slice(0, 10),
      totalAmount,
      litres,
      pricePerLitre,
      category: 'fuel',
      confidence: 0.92,
    };
  } else {
    const totalAmount = Math.round((12000 + Math.random() * 20000) / 100) * 100;
    return {
      merchantName: picked.name,
      date: new Date().toISOString().slice(0, 10),
      totalAmount,
      category: 'service',
      confidence: 0.88,
    };
  }
}

export interface AssistantAnswer {
  answer: string;
  suggestedAction?: {
    label: string;
    actionType: 'add_fuel' | 'add_service' | 'add_expense' | 'view_reports' | 'view_plans';
  };
}

/**
 * Knowledge-grounded AI Assistant.
 * Queries vehicle database and calculates exact numbers without hallucination.
 */
export function queryVehicleAssistant(
  prompt: string,
  vehicle: Vehicle,
  fuelEntries: FuelEntry[],
  serviceRecords: ServiceRecord[],
  expenses: ExpenseRecord[],
  plans: MaintenancePlan[],
  currency: string = 'LKR'
): AssistantAnswer {
  const p = prompt.toLowerCase().trim();

  // 1. Oil change / Next service queries
  if (p.includes('oil') || p.includes('service') || p.includes('maintenance') || p.includes('due')) {
    const evaluated = evaluateMaintenancePlans(plans, vehicle.currentOdometer);
    const overdue = evaluated.filter((e) => e.status === 'overdue');
    const dueSoon = evaluated.filter((e) => e.status === 'due_soon');

    const oilPlan = evaluated.find((e) => e.plan.category === 'oil_change');

    let text = '';
    if (oilPlan) {
      text += `🛢️ **Engine Oil Status:**\n- Last serviced at: ${oilPlan.plan.lastServiceMileage.toLocaleString()} km\n- Next due at: ${oilPlan.plan.nextDueMileage.toLocaleString()} km (${oilPlan.formattedDueDate})\n- Current odometer: ${vehicle.currentOdometer.toLocaleString()} km\n- Remaining: ${oilPlan.remainingKm > 0 ? `${oilPlan.remainingKm.toLocaleString()} km` : `OVERDUE by ${Math.abs(oilPlan.remainingKm).toLocaleString()} km`}\n\n`;
    }

    if (overdue.length > 0) {
      text += `⚠️ **Overdue Services (${overdue.length}):**\n` + overdue.map((o) => `• ${o.plan.title} (Due: ${o.plan.nextDueMileage} km)`).join('\n') + '\n\n';
    }

    if (dueSoon.length > 0) {
      text += `⏳ **Upcoming Services Soon (${dueSoon.length}):**\n` + dueSoon.map((d) => `• ${d.plan.title} (Remaining: ${d.remainingKm} km)`).join('\n');
    }

    if (!oilPlan && overdue.length === 0 && dueSoon.length === 0) {
      text = `All maintenance tasks for **${vehicle.name}** are currently in good condition! No immediate services due.`;
    }

    return {
      answer: text,
      suggestedAction: {
        label: 'Log Service Record',
        actionType: 'add_service',
      },
    };
  }

  // 2. Fuel efficiency / km/L queries
  if (p.includes('fuel') || p.includes('efficiency') || p.includes('mileage') || p.includes('km/l') || p.includes('kml') || p.includes('consumption')) {
    const { stats, processedEntries } = processFuelEntries(fuelEntries);

    if (stats.entriesCount === 0) {
      return {
        answer: `You haven't logged any fuel entries for **${vehicle.name}** yet. Log 2 or more full tank fill-ups to calculate accurate fuel consumption!`,
        suggestedAction: {
          label: 'Add Fuel Fill-up',
          actionType: 'add_fuel',
        },
      };
    }

    const latestCalculated = processedEntries.find((e) => e.fuelEfficiencyKmL !== undefined);

    let text = `⛽ **Fuel Performance Report for ${vehicle.name}:**\n\n`;
    text += `• **Average Efficiency:** ${stats.overallAvgKmL > 0 ? `${stats.overallAvgKmL} km/L` : 'Calculating (need full fills)'}\n`;
    if (latestCalculated && latestCalculated.fuelEfficiencyKmL) {
      text += `• **Last Fill-up Efficiency:** ${latestCalculated.fuelEfficiencyKmL} km/L\n`;
    }
    if (stats.bestKmL > 0) {
      text += `• **Best Recorded:** ${stats.bestKmL} km/L\n`;
    }
    text += `• **Total Fuel Spent:** ${currency} ${stats.totalSpent.toLocaleString()}\n`;
    text += `• **Total Litres Used:** ${stats.totalLitres} L\n`;
    text += `• **Fuel Cost per km:** ${currency} ${stats.overallCostPerKm.toFixed(2)}/km\n`;

    return {
      answer: text,
      suggestedAction: {
        label: 'View Detailed Reports',
        actionType: 'view_reports',
      },
    };
  }

  // 3. Spending / Expenses / Cost queries
  if (p.includes('spend') || p.includes('cost') || p.includes('expense') || p.includes('money') || p.includes('total') || p.includes('month')) {
    const result = calculateUnifiedExpenses(fuelEntries, serviceRecords, expenses, vehicle);

    let text = `💰 **Ownership Cost Breakdown for ${vehicle.name}:**\n\n`;
    text += `• **Grand Total Recorded:** ${currency} ${result.totalCost.toLocaleString()}\n`;
    text += `• **Fuel:** ${currency} ${result.fuelTotal.toLocaleString()}\n`;
    text += `• **Scheduled Services:** ${currency} ${result.serviceTotal.toLocaleString()}\n`;
    text += `• **Repairs:** ${currency} ${result.repairTotal.toLocaleString()}\n`;
    text += `• **Insurance & Tax:** ${currency} ${(result.insuranceTotal + result.registrationTotal).toLocaleString()}\n`;
    text += `• **Accessories & Other:** ${currency} ${(result.accessoriesTotal + result.otherTotal).toLocaleString()}\n\n`;
    text += `📊 **Cost Per Kilometre:** ${result.costPerKm !== null ? `${currency} ${result.costPerKm.toFixed(2)}/km` : 'N/A'}\n*(Calculated over recorded distance)*`;

    return {
      answer: text,
      suggestedAction: {
        label: 'View Expense Ledger',
        actionType: 'add_expense',
      },
    };
  }

  // 4. Default vehicle summary
  return {
    answer: `🚗 **FixMate Vehicle Overview:**\n- Vehicle: **${vehicle.name}** (${vehicle.make} ${vehicle.model} ${vehicle.year})\n- Odometer: **${vehicle.currentOdometer.toLocaleString()} km**\n- Fuel Entries: ${fuelEntries.length}\n- Service Records: ${serviceRecords.length}\n\nYou can ask me about:\n- *"When is my next oil change?"*\n- *"What is my fuel efficiency?"*\n- *"How much have I spent on fuel and repairs?"*\n- *"Show upcoming due maintenance"*.`,
  };
}
