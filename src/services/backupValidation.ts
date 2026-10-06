import { Vehicle, FuelEntry, ServiceRecord, ExpenseRecord, MaintenancePlan, OdometerEntry } from '../types';

export interface VersionedBackupPayload {
  schemaVersion: number;
  app: string;
  version: string;
  exportDate: string;
  vehicles: Vehicle[];
  fuelEntries: (FuelEntry & { receiptBase64?: string })[];
  serviceRecords: (ServiceRecord & { receiptBase64?: string })[];
  expenses: (ExpenseRecord & { receiptBase64?: string })[];
  maintenancePlans: MaintenancePlan[];
  odometerEntries?: OdometerEntry[];
}

function isValidIsoDate(str: any): boolean {
  if (typeof str !== 'string' || str.trim() === '') return false;
  const time = new Date(str).getTime();
  return !isNaN(time);
}

/**
 * Validates schema version, structure, types, dates, numbers, duplicate IDs, and linked relationships of backup JSON.
 */
export function validateBackupPayload(data: any): VersionedBackupPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file: root must be a valid JSON object.');
  }

  // 1. Schema version check
  const schemaVersion = data.schemaVersion !== undefined ? data.schemaVersion : 1;
  if (typeof schemaVersion !== 'number' || schemaVersion !== 1) {
    throw new Error(`Unsupported backup schemaVersion '${schemaVersion}'. This version of FixMate only supports schemaVersion 1.`);
  }

  // 2. Validate vehicles
  if (!Array.isArray(data.vehicles) || data.vehicles.length === 0) {
    throw new Error('Invalid backup file: "vehicles" array is missing or empty.');
  }

  const vehicleIds = new Set<string>();
  const fuelIds = new Set<string>();
  const serviceIds = new Set<string>();
  const expenseIds = new Set<string>();
  const planIds = new Set<string>();
  const odometerIds = new Set<string>();

  const allowedVehicleTypes = new Set(['car', 'motorcycle', 'van', 'suv', 'truck', 'other']);
  const allowedFuelTypes = new Set(['petrol', 'diesel', 'electric', 'hybrid', 'other']);
  const allowedExpenseCategories = new Set(['fuel', 'service', 'repair', 'insurance', 'registration', 'accessories', 'other']);
  const allowedOdometerSources = new Set(['manual', 'fuel', 'service', 'ocr', 'import']);

  for (let i = 0; i < data.vehicles.length; i++) {
    const v = data.vehicles[i];
    if (!v.id || typeof v.id !== 'string') {
      throw new Error(`Vehicle at index ${i} is missing a valid 'id'.`);
    }
    if (vehicleIds.has(v.id)) {
      throw new Error(`Duplicate vehicle ID '${v.id}' found in backup.`);
    }
    if (!v.name || typeof v.name !== 'string' || v.name.trim() === '') {
      throw new Error(`Vehicle '${v.id}' is missing a required 'name'.`);
    }
    if (!v.type || !allowedVehicleTypes.has(v.type)) {
      throw new Error(`Vehicle '${v.id}' has an invalid 'type' ('${v.type}').`);
    }
    if (!v.make || typeof v.make !== 'string' || v.make.trim() === '') {
      throw new Error(`Vehicle '${v.id}' is missing a required 'make'.`);
    }
    if (!v.model || typeof v.model !== 'string' || v.model.trim() === '') {
      throw new Error(`Vehicle '${v.id}' is missing a required 'model'.`);
    }
    if (typeof v.year !== 'number' || !Number.isInteger(v.year) || v.year < 1900 || v.year > 2100) {
      throw new Error(`Vehicle '${v.id}' has an invalid manufacturing 'year'.`);
    }
    if (typeof v.currentOdometer !== 'number' || isNaN(v.currentOdometer) || v.currentOdometer < 0) {
      throw new Error(`Vehicle '${v.id}' has an invalid 'currentOdometer'.`);
    }
    if (v.fuelType && !allowedFuelTypes.has(v.fuelType)) {
      throw new Error(`Vehicle '${v.id}' has an invalid 'fuelType' ('${v.fuelType}').`);
    }
    if (!isValidIsoDate(v.createdAt)) {
      throw new Error(`Vehicle '${v.id}' is missing or has an invalid 'createdAt' date.`);
    }
    if (!isValidIsoDate(v.updatedAt)) {
      throw new Error(`Vehicle '${v.id}' is missing or has an invalid 'updatedAt' date.`);
    }
    vehicleIds.add(v.id);
  }

  // 3. Register & Validate Maintenance Plans
  if (data.maintenancePlans) {
    if (!Array.isArray(data.maintenancePlans)) {
      throw new Error('Invalid backup file: "maintenancePlans" must be an array.');
    }
    for (let i = 0; i < data.maintenancePlans.length; i++) {
      const p = data.maintenancePlans[i];
      if (!p.id || typeof p.id !== 'string') {
        throw new Error(`Maintenance plan at index ${i} is missing a valid 'id'.`);
      }
      if (planIds.has(p.id)) {
        throw new Error(`Duplicate maintenance plan ID '${p.id}' found in backup.`);
      }
      if (!p.vehicleId || !vehicleIds.has(p.vehicleId)) {
        throw new Error(`Maintenance plan '${p.id}' references unknown vehicleId '${p.vehicleId}'.`);
      }
      if (!p.title || typeof p.title !== 'string' || p.title.trim() === '') {
        throw new Error(`Maintenance plan '${p.id}' is missing a required 'title'.`);
      }
      if (typeof p.intervalKm !== 'number' || isNaN(p.intervalKm) || p.intervalKm < 0) {
        throw new Error(`Maintenance plan '${p.id}' has an invalid 'intervalKm'.`);
      }
      if (typeof p.intervalMonths !== 'number' || isNaN(p.intervalMonths) || p.intervalMonths < 0) {
        throw new Error(`Maintenance plan '${p.id}' has an invalid 'intervalMonths'.`);
      }
      if (typeof p.nextDueMileage !== 'number' || isNaN(p.nextDueMileage) || p.nextDueMileage < 0) {
        throw new Error(`Maintenance plan '${p.id}' has an invalid 'nextDueMileage'.`);
      }
      if (!isValidIsoDate(p.nextDueDate)) {
        throw new Error(`Maintenance plan '${p.id}' is missing or has an invalid 'nextDueDate'.`);
      }
      if (typeof p.lastServiceMileage !== 'number' || isNaN(p.lastServiceMileage) || p.lastServiceMileage < 0) {
        throw new Error(`Maintenance plan '${p.id}' has an invalid 'lastServiceMileage'.`);
      }
      if (!isValidIsoDate(p.lastServiceDate)) {
        throw new Error(`Maintenance plan '${p.id}' is missing or has an invalid 'lastServiceDate'.`);
      }
      if (p.createdAt && !isValidIsoDate(p.createdAt)) {
        throw new Error(`Maintenance plan '${p.id}' has an invalid 'createdAt' date.`);
      }
      planIds.add(p.id);
    }
  }

  // 4. Register & Validate Fuel entries
  if (data.fuelEntries) {
    if (!Array.isArray(data.fuelEntries)) {
      throw new Error('Invalid backup file: "fuelEntries" must be an array.');
    }
    for (let i = 0; i < data.fuelEntries.length; i++) {
      const f = data.fuelEntries[i];
      if (!f.id || typeof f.id !== 'string') {
        throw new Error(`Fuel entry at index ${i} is missing a valid 'id'.`);
      }
      if (fuelIds.has(f.id)) {
        throw new Error(`Duplicate fuel entry ID '${f.id}' found in backup.`);
      }
      if (!f.vehicleId || !vehicleIds.has(f.vehicleId)) {
        throw new Error(`Fuel entry '${f.id}' references unknown vehicleId '${f.vehicleId}'.`);
      }
      if (typeof f.odometer !== 'number' || isNaN(f.odometer) || f.odometer < 0) {
        throw new Error(`Fuel entry '${f.id}' has an invalid 'odometer'.`);
      }
      if (typeof f.litres !== 'number' || isNaN(f.litres) || f.litres < 0) {
        throw new Error(`Fuel entry '${f.id}' has an invalid 'litres' quantity.`);
      }
      if (typeof f.totalCost !== 'number' || isNaN(f.totalCost) || f.totalCost < 0) {
        throw new Error(`Fuel entry '${f.id}' has an invalid 'totalCost'.`);
      }
      if (typeof f.pricePerLitre !== 'number' || isNaN(f.pricePerLitre) || f.pricePerLitre < 0) {
        throw new Error(`Fuel entry '${f.id}' has an invalid 'pricePerLitre'.`);
      }
      if (!isValidIsoDate(f.date)) {
        throw new Error(`Fuel entry '${f.id}' is missing or has an invalid 'date'.`);
      }
      if (f.createdAt && !isValidIsoDate(f.createdAt)) {
        throw new Error(`Fuel entry '${f.id}' has an invalid 'createdAt' date.`);
      }
      fuelIds.add(f.id);
    }
  }

  // 5. Register & Validate Service records (and check planId link)
  if (data.serviceRecords) {
    if (!Array.isArray(data.serviceRecords)) {
      throw new Error('Invalid backup file: "serviceRecords" must be an array.');
    }
    for (let i = 0; i < data.serviceRecords.length; i++) {
      const s = data.serviceRecords[i];
      if (!s.id || typeof s.id !== 'string') {
        throw new Error(`Service record at index ${i} is missing a valid 'id'.`);
      }
      if (serviceIds.has(s.id)) {
        throw new Error(`Duplicate service record ID '${s.id}' found in backup.`);
      }
      if (!s.vehicleId || !vehicleIds.has(s.vehicleId)) {
        throw new Error(`Service record '${s.id}' references unknown vehicleId '${s.vehicleId}'.`);
      }
      if (!s.title || typeof s.title !== 'string' || s.title.trim() === '') {
        throw new Error(`Service record '${s.id}' is missing a required 'title'.`);
      }
      if (!s.serviceType || typeof s.serviceType !== 'string' || s.serviceType.trim() === '') {
        throw new Error(`Service record '${s.id}' is missing a required 'serviceType'.`);
      }
      if (s.planId && !planIds.has(s.planId)) {
        throw new Error(`Service record '${s.id}' references unknown maintenance planId '${s.planId}'.`);
      }
      if (typeof s.odometer !== 'number' || isNaN(s.odometer) || s.odometer < 0) {
        throw new Error(`Service record '${s.id}' has an invalid 'odometer'.`);
      }
      if (typeof s.totalCost !== 'number' || isNaN(s.totalCost) || s.totalCost < 0) {
        throw new Error(`Service record '${s.id}' has an invalid 'totalCost'.`);
      }
      if (!isValidIsoDate(s.date)) {
        throw new Error(`Service record '${s.id}' is missing or has an invalid 'date'.`);
      }
      if (s.createdAt && !isValidIsoDate(s.createdAt)) {
        throw new Error(`Service record '${s.id}' has an invalid 'createdAt' date.`);
      }
      serviceIds.add(s.id);
    }
  }

  // 6. Register & Validate Expenses (and check linkedServiceId / linkedFuelId references)
  if (data.expenses) {
    if (!Array.isArray(data.expenses)) {
      throw new Error('Invalid backup file: "expenses" must be an array.');
    }
    for (let i = 0; i < data.expenses.length; i++) {
      const e = data.expenses[i];
      if (!e.id || typeof e.id !== 'string') {
        throw new Error(`Expense at index ${i} is missing a valid 'id'.`);
      }
      if (expenseIds.has(e.id)) {
        throw new Error(`Duplicate expense ID '${e.id}' found in backup.`);
      }
      if (!e.vehicleId || !vehicleIds.has(e.vehicleId)) {
        throw new Error(`Expense '${e.id}' references unknown vehicleId '${e.vehicleId}'.`);
      }
      if (!e.title || typeof e.title !== 'string' || e.title.trim() === '') {
        throw new Error(`Expense '${e.id}' is missing a required 'title'.`);
      }
      if (!e.category || !allowedExpenseCategories.has(e.category)) {
        throw new Error(`Expense '${e.id}' has an invalid 'category' ('${e.category}').`);
      }
      if (typeof e.amount !== 'number' || isNaN(e.amount) || e.amount < 0) {
        throw new Error(`Expense '${e.id}' has an invalid 'amount'.`);
      }
      if (!isValidIsoDate(e.date)) {
        throw new Error(`Expense '${e.id}' is missing or has an invalid 'date'.`);
      }
      if (e.createdAt && !isValidIsoDate(e.createdAt)) {
        throw new Error(`Expense '${e.id}' has an invalid 'createdAt' date.`);
      }
      if (e.linkedServiceId && !serviceIds.has(e.linkedServiceId)) {
        throw new Error(`Expense '${e.id}' references unknown linkedServiceId '${e.linkedServiceId}'.`);
      }
      if (e.linkedFuelId && !fuelIds.has(e.linkedFuelId)) {
        throw new Error(`Expense '${e.id}' references unknown linkedFuelId '${e.linkedFuelId}'.`);
      }
      expenseIds.add(e.id);
    }
  }

  // 7. Register & Validate Odometer entries
  if (data.odometerEntries) {
    if (!Array.isArray(data.odometerEntries)) {
      throw new Error('Invalid backup file: "odometerEntries" must be an array.');
    }
    for (let i = 0; i < data.odometerEntries.length; i++) {
      const o = data.odometerEntries[i];
      if (!o.id || typeof o.id !== 'string') {
        throw new Error(`Odometer entry at index ${i} is missing a valid 'id'.`);
      }
      if (odometerIds.has(o.id)) {
        throw new Error(`Duplicate odometer entry ID '${o.id}' found in backup.`);
      }
      if (!o.vehicleId || !vehicleIds.has(o.vehicleId)) {
        throw new Error(`Odometer entry '${o.id}' references unknown vehicleId '${o.vehicleId}'.`);
      }
      if (typeof o.odometer !== 'number' || isNaN(o.odometer) || o.odometer < 0) {
        throw new Error(`Odometer entry '${o.id}' has an invalid 'odometer'.`);
      }
      if (!isValidIsoDate(o.date)) {
        throw new Error(`Odometer entry '${o.id}' is missing or has an invalid 'date'.`);
      }
      if (o.source && !allowedOdometerSources.has(o.source)) {
        throw new Error(`Odometer entry '${o.id}' has an invalid 'source' ('${o.source}').`);
      }
      if (o.createdAt && !isValidIsoDate(o.createdAt)) {
        throw new Error(`Odometer entry '${o.id}' has an invalid 'createdAt' date.`);
      }
      odometerIds.add(o.id);
    }
  }

  return {
    schemaVersion: 1,
    app: data.app || 'FixMate',
    version: data.version || '1.0.0',
    exportDate: data.exportDate || new Date().toISOString(),
    vehicles: data.vehicles,
    fuelEntries: data.fuelEntries || [],
    serviceRecords: data.serviceRecords || [],
    expenses: data.expenses || [],
    maintenancePlans: data.maintenancePlans || [],
    odometerEntries: data.odometerEntries || [],
  };
}
