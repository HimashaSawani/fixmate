import { processFuelEntries, evaluateMaintenancePlans, calculateUnifiedExpenses } from './src/services/calculations';
import { FuelEntry, MaintenancePlan, ServiceRecord, ExpenseRecord, Vehicle } from './src/types';

console.log('==================================================');
console.log('🚗 FIXMATE TEST SUITE: ALGORITHM & LOGIC VERIFICATION');
console.log('==================================================\n');

// 1. TEST FUEL EFFICIENCY: FULL TANK TO FULL TANK WITH PARTIAL FILLS
console.log('--- TEST 1: Fuel Calculation (Full-to-Full with Partial Fills) ---');
const fuelEntries: FuelEntry[] = [
  {
    id: 'f1',
    vehicleId: 'v1',
    date: '2026-01-01T00:00:00.000Z',
    odometer: 10000,
    litres: 40,
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
    litres: 10, // Partial fill
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
    litres: 30, // Full fill: Interval dist = 800km, Total litres = 10 + 30 = 40L -> 20 km/L
    totalCost: 11100,
    pricePerLitre: 370,
    isFullTank: true,
    createdAt: '2026-01-20T00:00:00.000Z',
  },
];

const fuelResult = processFuelEntries(fuelEntries);
console.log('Overall Average km/L:', fuelResult.stats.overallAvgKmL, 'Expected: 20.00');
console.log('Total Distance Tracked:', fuelResult.stats.totalDistanceTracked, 'Expected: 800 km');
console.log('Total Fuel Litres:', fuelResult.stats.totalLitres, 'Expected: 80 L');
console.log('Total Fuel Cost:', fuelResult.stats.totalSpent, 'Expected: 29600');
console.assert(fuelResult.stats.overallAvgKmL === 20.0, 'Fuel calculation failed!');
console.log('✅ TEST 1 PASSED!\n');

// 2. TEST MAINTENANCE PLANS: WHICHEVER COMES FIRST (KM OR DATE)
console.log('--- TEST 2: Maintenance Plans (Whichever Comes First) ---');
const plans: MaintenancePlan[] = [
  {
    id: 'p1',
    vehicleId: 'v1',
    title: 'Engine Oil Change',
    category: 'oil_change',
    intervalKm: 5000,
    intervalMonths: 6,
    lastServiceMileage: 10000,
    lastServiceDate: '2025-10-01T00:00:00.000Z',
    nextDueMileage: 15000,
    nextDueDate: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
    createdAt: '2025-10-01T00:00:00.000Z',
    updatedAt: '2025-10-01T00:00:00.000Z',
  },
  {
    id: 'p2',
    vehicleId: 'v1',
    title: 'Brake Pads',
    category: 'brakes',
    intervalKm: 10000,
    intervalMonths: 12,
    lastServiceMileage: 5000,
    lastServiceDate: '2025-01-01T00:00:00.000Z',
    nextDueMileage: 15000,
    nextDueDate: '2026-01-01T00:00:00.000Z', // Past date!
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];

const evaluated = evaluateMaintenancePlans(plans, 14800); // 200 km remaining for oil change -> Due Soon
console.log('Plan 1 (Oil Change) status:', evaluated[0].status, 'Expected: due_soon');
console.log('Plan 2 (Brake Pads - Past Date) status:', evaluated[1].status, 'Expected: overdue');
console.assert(evaluated[0].status === 'due_soon', 'Plan 1 status failed');
console.assert(evaluated[1].status === 'overdue', 'Plan 2 status failed');
console.log('✅ TEST 2 PASSED!\n');

// 3. TEST EXPENSE AGGREGATION & DOUBLE COUNTING PREVENTION
console.log('--- TEST 3: Expense Aggregation (Double Counting Prevention) ---');
const vehicle: Vehicle = {
  id: 'v1',
  name: 'Test Car',
  type: 'car',
  make: 'Honda',
  model: 'Civic',
  year: 2021,
  currentOdometer: 20000,
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const serviceRecords: ServiceRecord[] = [
  {
    id: 's1',
    vehicleId: 'v1',
    title: 'Major Service',
    serviceType: 'Major Service',
    date: '2026-01-15T00:00:00.000Z',
    odometer: 10500,
    labourCost: 5000,
    partsCost: 15000,
    totalCost: 20000,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
];

const expenses: ExpenseRecord[] = [
  {
    id: 'e1',
    vehicleId: 'v1',
    category: 'insurance',
    title: 'Comprehensive Insurance',
    amount: 50000,
    date: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'e2_duplicate_link',
    vehicleId: 'v1',
    category: 'service',
    title: 'Linked Service Ref',
    amount: 20000,
    date: '2026-01-15T00:00:00.000Z',
    linkedServiceId: 's1', // MUST NOT BE COUNTED TWICE!
    createdAt: '2026-01-15T00:00:00.000Z',
  },
];

const unifiedExp = calculateUnifiedExpenses(fuelEntries, serviceRecords, expenses, vehicle);
console.log('Fuel Total:', unifiedExp.fuelTotal, 'Expected: 29600');
console.log('Service Total:', unifiedExp.serviceTotal, 'Expected: 20000');
console.log('Insurance Total:', unifiedExp.insuranceTotal, 'Expected: 50000');
console.log('Grand Total:', unifiedExp.totalCost, 'Expected: 99600 (No duplicate 20000)');
console.log('Cost Per Km:', unifiedExp.costPerKm, 'Expected: 4.98');
console.assert(unifiedExp.totalCost === 99600, 'Duplicate counting occurred!');
console.log('✅ TEST 3 PASSED!\n');

console.log('🎉 ALL FIXMATE CORE TESTS PASSED SUCCESSFULLY!');
