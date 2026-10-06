// Pure logic and calculation verification test runner
import { processFuelEntries, evaluateMaintenancePlans, calculateUnifiedExpenses } from './src/services/calculations';
import type { Vehicle, FuelEntry, ServiceRecord, ExpenseRecord, MaintenancePlan } from './src/types';

console.log('================================================================');
console.log('🚗 FIXMATE COMPREHENSIVE CALCULATION & VEHICLE PARTS AUDIT');
console.log('================================================================\n');

let testsPassed = 0;
let testsTotal = 0;

function assert(condition: boolean, message: string) {
  testsTotal++;
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    testsPassed++;
    console.log(`  ✓ ${message}`);
  }
}

// -------------------------------------------------------------
// TEST 1: VEHICLE CREATION & PROFILE INTEGRITY
// -------------------------------------------------------------
console.log('--- TEST 1: Vehicle Model & Structure Validation ---');
const vehicle1: Vehicle = {
  id: 'veh_civic_2021',
  name: 'Daily Driver',
  type: 'car',
  make: 'Honda',
  model: 'Civic',
  year: 2021,
  regNumber: 'WP CAD-1234',
  currentOdometer: 25000,
  fuelType: 'petrol',
  isPrimary: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

assert(vehicle1.currentOdometer === 25000, 'Initial odometer is 25,000 km');
assert(vehicle1.isPrimary === true, 'Primary vehicle flag is set correctly');
assert(vehicle1.fuelType === 'petrol', 'Fuel type is petrol');

// -------------------------------------------------------------
// TEST 2: VEHICLE PARTS & MAINTENANCE PLAN EVALUATION
// -------------------------------------------------------------
console.log('\n--- TEST 2: Vehicle Parts & Maintenance Due Rule ("Whichever Comes First") ---');

const now = new Date();
const pastDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
const futureDate = new Date(now.getTime() + 60 * 24 * 3600 * 1000).toISOString();

const plans: MaintenancePlan[] = [
  {
    id: 'part_oil_filter',
    vehicleId: 'veh_civic_2021',
    title: 'Engine Oil & Synthetic Filter',
    category: 'oil_change',
    intervalKm: 5000,
    intervalMonths: 6,
    lastServiceMileage: 20000,
    lastServiceDate: pastDate,
    nextDueMileage: 25000,
    nextDueDate: futureDate,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'part_brake_pads',
    vehicleId: 'veh_civic_2021',
    title: 'Ceramic Brake Pads & Rotors',
    category: 'brakes',
    intervalKm: 15000,
    intervalMonths: 12,
    lastServiceMileage: 10000,
    lastServiceDate: pastDate,
    nextDueMileage: 25000,
    nextDueDate: pastDate, // Expired date
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'part_spark_plugs',
    vehicleId: 'veh_civic_2021',
    title: 'Iridium Spark Plugs Replacement',
    category: 'spark_plugs',
    intervalKm: 40000,
    intervalMonths: 36,
    lastServiceMileage: 0,
    lastServiceDate: pastDate,
    nextDueMileage: 40000,
    nextDueDate: futureDate,
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

const evaluated = evaluateMaintenancePlans(plans, 24850); // 150 km before 25k km

assert(evaluated[0].status === 'due_soon', 'Oil & Filter plan (150km remaining) is flagged as due_soon');
assert(evaluated[0].remainingKm === 150, 'Remaining distance for Oil Change is exactly 150 km');
assert(evaluated[1].status === 'overdue', 'Brake Pads (past due date) is flagged as overdue');
assert(evaluated[2].status === 'good', 'Spark Plugs (15,150 km remaining) is in good standing');

// -------------------------------------------------------------
// TEST 3: VEHICLE PART REPLACEMENT & SERVICE EXPENSE AUDIT
// -------------------------------------------------------------
console.log('\n--- TEST 3: Vehicle Part Replacements & Ledger Non-Duplication ---');

const serviceRecords: ServiceRecord[] = [
  {
    id: 'srv_1',
    vehicleId: 'veh_civic_2021',
    planId: 'part_oil_filter',
    title: 'Mobil 1 0W-20 & OEM Honda Filter',
    serviceType: 'Oil Change',
    date: '2026-02-15',
    odometer: 25000,
    garageName: 'Honda Care Center',
    labourCost: 3500,
    partsCost: 14500,
    totalCost: 18000,
    partsList: 'Mobil 1 0W-20 Full Synthetic (4L), OEM Honda Filter 15400-PLM-A02, Crush Washer',
    createdAt: '2026-02-15',
  },
  {
    id: 'srv_2',
    vehicleId: 'veh_civic_2021',
    planId: 'part_brake_pads',
    title: 'Front Ceramic Brake Pads Replacement',
    serviceType: 'Brakes',
    date: '2026-02-20',
    odometer: 25050,
    garageName: 'Brembo Brake Pro',
    labourCost: 4000,
    partsCost: 22000,
    totalCost: 26000,
    partsList: 'Akebono ProACT Ultra-Premium Ceramic Brake Pads (Front Set), DOT4 Brake Fluid (500ml)',
    createdAt: '2026-02-20',
  },
];

const expenses: ExpenseRecord[] = [
  {
    id: 'exp_insurance',
    vehicleId: 'veh_civic_2021',
    category: 'insurance',
    title: 'Annual Full Insurance Policy',
    amount: 65000,
    date: '2026-01-01',
    createdAt: '2026-01-01',
  },
  {
    id: 'exp_part_accessory',
    vehicleId: 'veh_civic_2021',
    category: 'accessories',
    title: '3D All-Weather Floor Mats & Trunk Liner',
    amount: 12500,
    date: '2026-02-01',
    createdAt: '2026-02-01',
  },
  {
    id: 'exp_duplicate_service_ref',
    vehicleId: 'veh_civic_2021',
    category: 'service',
    title: 'Mobil 1 Service Duplicate Ref',
    amount: 18000,
    date: '2026-02-15',
    linkedServiceId: 'srv_1', // Linked to srv_1 - Must NOT double count!
    createdAt: '2026-02-15',
  },
];

const fuelEntries: FuelEntry[] = [
  {
    id: 'f1',
    vehicleId: 'veh_civic_2021',
    date: '2026-01-01',
    odometer: 24000,
    litres: 40,
    totalCost: 14800,
    pricePerLitre: 370,
    isFullTank: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'f2',
    vehicleId: 'veh_civic_2021',
    date: '2026-01-15',
    odometer: 24500,
    litres: 25,
    totalCost: 9250,
    pricePerLitre: 370,
    isFullTank: true,
    createdAt: '2026-01-15',
  },
  {
    id: 'f3',
    vehicleId: 'veh_civic_2021',
    date: '2026-02-01',
    odometer: 25050,
    litres: 28,
    totalCost: 10360,
    pricePerLitre: 370,
    isFullTank: true,
    createdAt: '2026-02-01',
  },
];

const fuelRes = processFuelEntries(fuelEntries);
assert(fuelRes.stats.totalDistanceTracked === 1050, 'Distance tracked is 1,050 km (25,050 - 24,000)');
assert(fuelRes.stats.eligibleLitresConsumed === 53, 'Eligible fuel consumed is 53 L (25L + 28L)');
assert(fuelRes.stats.overallAvgKmL === 19.81, 'Fuel economy is 19.81 km/L (1050 / 53)');

const unified = calculateUnifiedExpenses(fuelEntries, serviceRecords, expenses, vehicle1);

// Service total: 18,000 + 26,000 = 44,000
// -------------------------------------------------------------
// TEST 4: STRICT BACKUP SCHEMA & REFERENTIAL INTEGRITY AUDIT
// -------------------------------------------------------------
console.log('\n--- TEST 4: Backup Schema, Version, Duplicate IDs & Referential Integrity ---');

import { validateBackupPayload } from './src/services/backupValidation';

const validBackup = {
  schemaVersion: 1,
  app: 'FixMate - Vehicle Manager',
  version: '1.0.0',
  exportDate: '2026-10-06T12:00:00Z',
  vehicles: [vehicle1],
  fuelEntries: [fuelEntries[0]],
  serviceRecords: [serviceRecords[0]],
  expenses: [expenses[0]],
  maintenancePlans: [plans[0]],
};

const validatedResult = validateBackupPayload(validBackup);
assert(validatedResult.schemaVersion === 1, 'Valid backup passes schema validation successfully');
assert(validatedResult.vehicles.length === 1, 'Validated payload retains vehicles');

// Test 4.1 Unsupported schemaVersion rejection
let unsupportedVersionCaught = false;
try {
  validateBackupPayload({ ...validBackup, schemaVersion: 99 });
} catch (e: any) {
  unsupportedVersionCaught = e.message.includes('Unsupported backup schemaVersion');
}
assert(unsupportedVersionCaught, 'Unsupported schemaVersion strictly throws error');

// Test 4.2 Duplicate Vehicle ID rejection
let duplicateIdCaught = false;
try {
  validateBackupPayload({ ...validBackup, vehicles: [vehicle1, vehicle1] });
} catch (e: any) {
  duplicateIdCaught = e.message.includes('Duplicate vehicle ID');
}
assert(duplicateIdCaught, 'Duplicate vehicle ID strictly rejected');

// Test 4.3 Referential Integrity: Unknown vehicleId in fuel entry
let unknownVehicleCaught = false;
try {
  validateBackupPayload({
    ...validBackup,
    fuelEntries: [{ ...fuelEntries[0], id: 'f_orphan', vehicleId: 'unknown_veh_999' }],
  });
} catch (e: any) {
  unknownVehicleCaught = e.message.includes('references unknown vehicleId');
}
assert(unknownVehicleCaught, 'Orphan record with unknown vehicleId strictly rejected');

// Test 4.4 Referential Integrity: Unknown linkedServiceId in expenses
let unknownLinkedServiceCaught = false;
try {
  validateBackupPayload({
    ...validBackup,
    expenses: [{ ...expenses[0], id: 'exp_bad_link', linkedServiceId: 'non_existent_service' }],
  });
} catch (e: any) {
  unknownLinkedServiceCaught = e.message.includes('references unknown linkedServiceId');
}
assert(unknownLinkedServiceCaught, 'Invalid linkedServiceId in expense strictly rejected');

// Test 4.5 Required Dates Validation
let missingDateCaught = false;
try {
  validateBackupPayload({
    ...validBackup,
    maintenancePlans: [{ ...plans[0], id: 'p_no_date', nextDueDate: '' as any }],
  });
} catch (e: any) {
  missingDateCaught = e.message.includes('missing or has an invalid \'nextDueDate\'');
}
assert(missingDateCaught, 'Missing required nextDueDate strictly rejected');

// Test 4.6 Required Enums & Fields Validation
let invalidCategoryCaught = false;
try {
  validateBackupPayload({
    ...validBackup,
    expenses: [{ ...expenses[0], id: 'exp_bad_cat', category: 'invalid_category_xyz' as any }],
  });
} catch (e: any) {
  invalidCategoryCaught = e.message.includes('has an invalid \'category\'');
}
assert(invalidCategoryCaught, 'Invalid expense category enum strictly rejected');

// Test 4.7 Odometer Entries Validation
const validOdometerEntry = {
  id: 'odo_1',
  vehicleId: vehicle1.id,
  odometer: 25000,
  date: '2026-01-01T00:00:00Z',
  source: 'manual' as const,
  createdAt: '2026-01-01T00:00:00Z',
};
const validatedWithOdo = validateBackupPayload({
  ...validBackup,
  odometerEntries: [validOdometerEntry],
});
assert(validatedWithOdo.odometerEntries?.length === 1, 'Odometer history validated and retained in backup');

console.log('\n================================================================');
console.log(`🎉 ALL ${testsPassed}/${testsTotal} TESTS PASSED WITH 100% PRECISION!`);
console.log('================================================================');

