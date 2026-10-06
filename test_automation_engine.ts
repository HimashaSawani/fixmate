import {
  calculateDailyDrivingRate,
  calculateExplainableForecast,
  runVehicleAutomation,
} from './src/services/automationEngine';
import type { Vehicle, MaintenancePlan, OdometerEntry, FuelEntry, ServiceRecord, ExpenseRecord } from './src/types';

console.log('================================================================');
console.log('⚡ FIXMATE AUTOMATION ENGINE & EXPLAINABLE FORECAST TEST SUITE');
console.log('================================================================\n');

let passed = 0;
let total = 0;

function assert(cond: boolean, msg: string) {
  total++;
  if (!cond) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`  ✓ ${msg}`);
  }
}

// -------------------------------------------------------------
// TEST 1: DAILY DRIVING RATE ESTIMATION (Δkm / Δdays)
// -------------------------------------------------------------
console.log('--- TEST 1: Daily Driving Rate Calculation ---');

const odometers: OdometerEntry[] = [
  {
    id: 'odo_1',
    vehicleId: 'v1',
    odometer: 20000,
    date: '2026-01-01T00:00:00.000Z',
    source: 'manual',
    createdAt: '2026-01-01',
  },
  {
    id: 'odo_2',
    vehicleId: 'v1',
    odometer: 20600, // +600 km
    date: '2026-01-21T00:00:00.000Z', // 20 days later
    source: 'fuel',
    createdAt: '2026-01-21',
  },
];

const rateResult = calculateDailyDrivingRate(odometers);
console.log(`Calculated Rate: ${rateResult.avgKmPerDay} km/day over ${rateResult.sampleDays} days (${rateResult.sampleDistanceKm} km)`);

// 600 km / 20 days = 30.0 km/day
assert(rateResult.avgKmPerDay === 30.0, 'Daily driving rate is exactly 30.0 km/day');
assert(rateResult.sampleDays === 20, 'Sample days equals 20');
assert(rateResult.sampleDistanceKm === 600, 'Sample distance equals 600 km');

// -------------------------------------------------------------
// TEST 2: EXPLAINABLE MAINTENANCE FORECAST
// -------------------------------------------------------------
console.log('\n--- TEST 2: Explainable Maintenance Forecast Generation ---');

const oilPlan: MaintenancePlan = {
  id: 'plan_oil',
  vehicleId: 'v1',
  title: 'Engine Oil & Filter Change',
  category: 'oil_change',
  intervalKm: 5000,
  intervalMonths: 6,
  lastServiceMileage: 20000,
  lastServiceDate: '2026-01-01',
  nextDueMileage: 25000, // 4,400 km remaining from current 20,600
  nextDueDate: '2026-07-01',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

// Current odometer is 20,600 km -> Remaining: 4,400 km
// At 30 km/day -> 4,400 / 30 = 146.67 -> ~147 days
const forecast = calculateExplainableForecast(oilPlan, 20600, rateResult.avgKmPerDay, rateResult.sampleDays);

console.log(`Forecast: ${forecast.explanation}`);
assert(forecast.hasForecast === true, 'Forecast generated successfully');
assert(forecast.predictedDaysRemaining === 147, 'Predicted days remaining is 147 days (4400 / 30)');
assert(forecast.explanation.includes('30 km/day'), 'Forecast explanation includes daily rate');

// -------------------------------------------------------------
// TEST 3: INSUFFICIENT DATA / OVERDUE BOUNDARY CHECK
// -------------------------------------------------------------
console.log('\n--- TEST 3: Insufficient Data / Overdue Edge Cases ---');

// Single entry: not enough data
const singleOdo: OdometerEntry[] = [odometers[0]];
const noRate = calculateDailyDrivingRate(singleOdo);
assert(noRate.avgKmPerDay === 0, 'Single odometer entry produces 0 rate');

const noForecast = calculateExplainableForecast(oilPlan, 20600, noRate.avgKmPerDay, noRate.sampleDays);
assert(noForecast.hasForecast === false, 'Cannot forecast with insufficient data');
assert(noForecast.explanation.includes('Log more odometer updates'), 'Shows helpful prompt to log more updates');

// -------------------------------------------------------------
// TEST 4: FULL AUTOMATION RUN & METRICS INTEGRITY
// -------------------------------------------------------------
console.log('\n--- TEST 4: Vehicle Automation Pipeline Execution ---');

const testVehicle: Vehicle = {
  id: 'v1',
  name: 'Test Vehicle',
  type: 'car',
  make: 'Honda',
  model: 'Civic',
  year: 2022,
  currentOdometer: 20600,
  fuelType: 'petrol',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const fuelEntries: FuelEntry[] = [
  {
    id: 'f1',
    vehicleId: 'v1',
    date: '2026-01-01',
    odometer: 20000,
    litres: 35,
    totalCost: 12950,
    pricePerLitre: 370,
    isFullTank: true,
    createdAt: '2026-01-01',
  },
  {
    id: 'f2',
    vehicleId: 'v1',
    date: '2026-01-21',
    odometer: 20600,
    litres: 30,
    totalCost: 11100,
    pricePerLitre: 370,
    isFullTank: true,
    createdAt: '2026-01-21',
  },
];

const serviceRecords: ServiceRecord[] = [];
const expenses: ExpenseRecord[] = [];

async function testPipeline() {
  const result = await runVehicleAutomation(
    testVehicle,
    [oilPlan],
    fuelEntries,
    serviceRecords,
    expenses,
    odometers,
    false // disable actual native notifications in test
  );

  console.log(`Automation Result:`);
  console.log(`  - Total Cost: LKR ${result.totalOwnershipCost}`);
  console.log(`  - Cost / Km: LKR ${result.costPerKm} / km`);
  console.log(`  - Avg km/L: ${result.overallAvgKmL} km/L`);
  console.log(`  - Avg Driving Rate: ${result.avgKmPerDay} km/day`);
  console.log(`  - Evaluated Plans Count: ${result.evaluatedPlans.length}`);

  assert(result.evaluatedPlans.length === 1, 'Evaluated exactly 1 plan');
  assert(result.evaluatedPlans[0].forecast.hasForecast === true, 'Plan has explainable forecast attached');
  assert(result.totalOwnershipCost === 24050, 'Total ownership cost is 24,050 (12,950 + 11,100)');
  assert(result.overallAvgKmL === 20.0, 'Fuel economy is 20.0 km/L (600km / 30L)');

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed}/${total} AUTOMATION ENGINE TESTS PASSED WITH 100% ACCURACY!`);
  console.log('================================================================');
}

testPipeline();
