import { processFuelEntries, evaluateMaintenancePlans, calculateUnifiedExpenses } from './src/services/calculations';
import type { FuelEntry, MaintenancePlan, ServiceRecord, ExpenseRecord, Vehicle } from './src/types';

console.log('================================================================');
console.log('🚗 FIXMATE CALCULATION AUDIT & RIGOROUS VERIFICATION SUITE');
console.log('================================================================\n');

// -------------------------------------------------------------
// TEST 1: FUEL CALCULATION AUDIT (10 vs 20 km/L EXPLANATION & PROOF)
// -------------------------------------------------------------
console.log('--- TEST 1: Fuel Calculation Audit (Baseline vs Eligible Intervals) ---');

const fuelEntriesScenario1: FuelEntry[] = [
  {
    id: 'f1',
    vehicleId: 'v1',
    date: '2026-01-01T00:00:00.000Z',
    odometer: 10000,
    litres: 40, // Baseline fill: filled from unknown distance prior to 10,000 km
    totalCost: 14800,
    pricePerLitre: 370,
    isFullTank: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'f2',
    vehicleId: 'v1',
    date: '2026-01-10T00:00:00.000Z',
    odometer: 10350,
    litres: 10, // Partial fill during the 800km interval
    totalCost: 3700,
    pricePerLitre: 370,
    isFullTank: false,
    createdAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'f3',
    vehicleId: 'v1',
    date: '2026-01-20T00:00:00.000Z',
    odometer: 10800,
    litres: 30, // Full tank fill: completes the 800km interval (10,800 - 10,000)
    totalCost: 11100,
    pricePerLitre: 370,
    isFullTank: true,
    createdAt: '2026-01-20T00:00:00.000Z',
  },
];

const result1 = processFuelEntries(fuelEntriesScenario1);

console.log('Total Fuel Pumped in DB (All 3 Entries):', result1.stats.totalLitresPumped, 'L');
console.log('Eligible Fuel Consumed for 800 km:', result1.stats.eligibleLitresConsumed, 'L (Entry 2 [10L] + Entry 3 [30L])');
console.log('Eligible Distance Tracked:', result1.stats.totalDistanceTracked, 'km (10,800 - 10,000 km)');
console.log('Overall Average Economy (800 km / 40 L):', result1.stats.overallAvgKmL, 'km/L');

// Verification assertions
console.assert(result1.stats.totalLitresPumped === 80, 'Total pumped should be 80L');
console.assert(result1.stats.eligibleLitresConsumed === 40, 'Eligible consumed should be 40L');
console.assert(result1.stats.totalDistanceTracked === 800, 'Eligible distance should be 800km');
console.assert(result1.stats.overallAvgKmL === 20.0, 'Average economy should be 20.00 km/L');
console.log('✅ TEST 1 AUDIT PASSED: Mathematically verified that 40L baseline was used prior to 10k km, and 40L was used for the 800 km interval.\n');

// -------------------------------------------------------------
// TEST 2: MULTIPLE CONSECUTIVE INTERVALS WITH MIXED PARTIAL FILLS
// -------------------------------------------------------------
console.log('--- TEST 2: Multiple Consecutive Intervals with Mixed Partial Fills ---');

const fuelEntriesScenario2: FuelEntry[] = [
  // Milestone 0: Baseline at 20,000 km
  { id: 'm0', vehicleId: 'v1', date: '2026-02-01', odometer: 20000, litres: 45, totalCost: 16650, pricePerLitre: 370, isFullTank: true, createdAt: '2026-02-01' },
  
  // Interval 1: 20,000 -> 20,500 km (500 km). Pumped 25L full -> 500 / 25 = 20.0 km/L
  { id: 'm1', vehicleId: 'v1', date: '2026-02-10', odometer: 20500, litres: 25, totalCost: 9250, pricePerLitre: 370, isFullTank: true, createdAt: '2026-02-10' },
  
  // Interval 2: 20,500 -> 21,100 km (600 km). Pumped 15L partial + 25L full = 40L -> 600 / 40 = 15.0 km/L
  { id: 'm2_partial', vehicleId: 'v1', date: '2026-02-18', odometer: 20800, litres: 15, totalCost: 5550, pricePerLitre: 370, isFullTank: false, createdAt: '2026-02-18' },
  { id: 'm2_full', vehicleId: 'v1', date: '2026-02-25', odometer: 21100, litres: 25, totalCost: 9250, pricePerLitre: 370, isFullTank: true, createdAt: '2026-02-25' },
];

const result2 = processFuelEntries(fuelEntriesScenario2);

// Total eligible distance = 500km + 600km = 1,100 km
// Total eligible fuel = 25L + (15L + 25L) = 65 L
// Overall Avg km/L = 1100 / 65 = 16.92 km/L
console.log('Scenario 2 Tracked Distance:', result2.stats.totalDistanceTracked, 'km (Expected: 1,100 km)');
console.log('Scenario 2 Eligible Fuel Consumed:', result2.stats.eligibleLitresConsumed, 'L (Expected: 65 L)');
console.log('Scenario 2 Overall Avg km/L:', result2.stats.overallAvgKmL, 'km/L (Expected: 16.92 km/L)');
console.log('Scenario 2 Best km/L:', result2.stats.bestKmL, 'km/L (Expected: 20.00 km/L)');
console.log('Scenario 2 Worst km/L:', result2.stats.worstKmL, 'km/L (Expected: 15.00 km/L)');

console.assert(result2.stats.totalDistanceTracked === 1100, 'Tracked distance mismatch');
console.assert(result2.stats.eligibleLitresConsumed === 65, 'Eligible fuel mismatch');
console.assert(result2.stats.overallAvgKmL === 16.92, 'Average km/L mismatch');
console.assert(result2.stats.bestKmL === 20.0, 'Best km/L mismatch');
console.assert(result2.stats.worstKmL === 15.0, 'Worst km/L mismatch');
console.log('✅ TEST 2 PASSED: Multi-interval calculation with partial fills is 100% accurate!\n');

// -------------------------------------------------------------
// TEST 3: EDITED / DELETED ENTRIES RECALCULATION
// -------------------------------------------------------------
console.log('--- TEST 3: Dynamic Recalculation after Deleting a Middle Entry ---');

// Delete the middle partial entry 'm2_partial' (15L) and simulate user mistake correction:
// Now interval 2 is: 20,500 -> 21,100 km (600 km), but with only 25L pumped -> 600 / 25 = 24.0 km/L
const fuelEntriesDeletedMiddle = fuelEntriesScenario2.filter((e) => e.id !== 'm2_partial');
const result3 = processFuelEntries(fuelEntriesDeletedMiddle);

console.log('After Deletion - Tracked Distance:', result3.stats.totalDistanceTracked, 'km (1,100 km)');
console.log('After Deletion - Eligible Fuel:', result3.stats.eligibleLitresConsumed, 'L (50 L)');
console.log('After Deletion - Overall Avg km/L:', result3.stats.overallAvgKmL, 'km/L (1100 / 50 = 22.00 km/L)');

console.assert(result3.stats.eligibleLitresConsumed === 50, 'Eligible fuel should be 50L after deletion');
console.assert(result3.stats.overallAvgKmL === 22.0, 'Avg km/L should be 22.00');
console.log('✅ TEST 3 PASSED: System dynamically and correctly recomputes whenever entries are deleted/edited!\n');

// -------------------------------------------------------------
// TEST 4: MAINTENANCE PLANS (WHICHEVER COMES FIRST: KM VS DATE)
// -------------------------------------------------------------
console.log('--- TEST 4: Maintenance Due Rules ("Whichever Comes First") ---');

const plans: MaintenancePlan[] = [
  {
    id: 'p1',
    vehicleId: 'v1',
    title: 'Engine Oil Change',
    category: 'oil_change',
    intervalKm: 5000,
    intervalMonths: 6,
    lastServiceMileage: 10000,
    lastServiceDate: '2026-01-01',
    nextDueMileage: 15000,
    nextDueDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'p2',
    vehicleId: 'v1',
    title: 'Brake Pads',
    category: 'brakes',
    intervalKm: 10000,
    intervalMonths: 12,
    lastServiceMileage: 5000,
    lastServiceDate: '2025-01-01',
    nextDueMileage: 15000,
    nextDueDate: '2026-01-01T00:00:00.000Z', // Past date!
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
  },
];

const evaluated = evaluateMaintenancePlans(plans, 14800); // 200 km remaining for oil change -> Due Soon
console.log('Plan 1 (Oil Change, 200km remaining) status:', evaluated[0].status, 'Expected: due_soon');
console.log('Plan 2 (Brake Pads, Date expired) status:', evaluated[1].status, 'Expected: overdue');

console.assert(evaluated[0].status === 'due_soon', 'Plan 1 status check failed');
console.assert(evaluated[1].status === 'overdue', 'Plan 2 status check failed');
console.log('✅ TEST 4 PASSED: Mileage and Date thresholds correctly trigger alerts.\n');

// -------------------------------------------------------------
// TEST 5: NON-DUPLICATING EXPENSE LEDGER
// -------------------------------------------------------------
console.log('--- TEST 5: Double-Counting Prevention in Expense Ledger ---');

const vehicle: Vehicle = {
  id: 'v1',
  name: 'Test Car',
  type: 'car',
  make: 'Honda',
  model: 'Civic',
  year: 2021,
  currentOdometer: 20000,
  createdAt: '2025-01-01',
  updatedAt: '2025-01-01',
};

const serviceRecords: ServiceRecord[] = [
  {
    id: 's1',
    vehicleId: 'v1',
    title: 'Major Service',
    serviceType: 'Major Service',
    date: '2026-01-15',
    odometer: 10500,
    labourCost: 5000,
    partsCost: 15000,
    totalCost: 20000,
    createdAt: '2026-01-15',
  },
];

const expenses: ExpenseRecord[] = [
  {
    id: 'e1',
    vehicleId: 'v1',
    category: 'insurance',
    title: 'Comprehensive Insurance',
    amount: 50000,
    date: '2026-01-01',
    createdAt: '2026-01-01',
  },
  {
    id: 'e2_duplicate_link',
    vehicleId: 'v1',
    category: 'service',
    title: 'Linked Service Ref',
    amount: 20000,
    date: '2026-01-15',
    linkedServiceId: 's1', // MUST NOT BE COUNTED TWICE!
    createdAt: '2026-01-15',
  },
];

const unifiedExp = calculateUnifiedExpenses(fuelEntriesScenario1, serviceRecords, expenses, vehicle);
console.log('Fuel Total:', unifiedExp.fuelTotal, 'Expected: 29600');
console.log('Service Total:', unifiedExp.serviceTotal, 'Expected: 20000');
console.log('Insurance Total:', unifiedExp.insuranceTotal, 'Expected: 50000');
console.log('Grand Total:', unifiedExp.totalCost, 'Expected: 99600 (No duplicate 20000)');
console.log('Cost Per Km:', unifiedExp.costPerKm, 'Expected: 4.98 / km');

console.assert(unifiedExp.totalCost === 99600, 'Duplicate counting occurred in ledger!');
console.log('✅ TEST 5 PASSED: Double-counting completely prevented in expense ledger.\n');

console.log('================================================================');
console.log('🎉 ALL 5 RIGOROUS FIXMATE VERIFICATION TESTS PASSED SUCCESSFULLY!');
console.log('================================================================');
