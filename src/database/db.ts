import { Platform } from 'react-native';
import type * as SQLite from 'expo-sqlite';
import {
  Vehicle,
  OdometerEntry,
  FuelEntry,
  MaintenancePlan,
  ServiceRecord,
  ExpenseRecord,
  AppSettings,
} from '../types';

type SQLiteDatabase = SQLite.SQLiteDatabase;
let SQLiteModule: any = null;
let dbInstance: SQLiteDatabase | null = null;

// In-memory web fallback stores
let webVehicles: Vehicle[] = [];
let webOdometer: OdometerEntry[] = [];
let webFuel: FuelEntry[] = [];
let webPlans: MaintenancePlan[] = [];
let webServices: ServiceRecord[] = [];
let webExpenses: ExpenseRecord[] = [];
let webIdempotencyKeys = new Set<string>();
let webSettings: Record<string, string> = {
  currency: 'LKR',
  distanceUnit: 'km',
  volumeUnit: 'L',
  enableNotifications: 'true',
  theme: 'dark',
};

export async function getDb(): Promise<SQLiteDatabase | null> {
  if (Platform.OS === 'web') return null;
  if (!SQLiteModule) {
    SQLiteModule = require('expo-sqlite');
  }
  if (!dbInstance && SQLiteModule) {
    const instance = await SQLiteModule.openDatabaseAsync('fixmate_v1.db');
    await instance.execAsync('PRAGMA foreign_keys = ON;');
    dbInstance = instance;
  }
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  if (Platform.OS === 'web') {
    if (webVehicles.length === 0) {
      await seedDemoData();
    }
    return;
  }

  const db = await getDb();
  if (!db) return;

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      make TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      regNumber TEXT,
      currentOdometer REAL NOT NULL DEFAULT 0,
      photoUri TEXT,
      purchaseDate TEXT,
      vin TEXT,
      fuelType TEXT DEFAULT 'petrol',
      isPrimary INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS odometer_entries (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL,
      odometer REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      source TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fuel_entries (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL,
      date TEXT NOT NULL,
      odometer REAL NOT NULL,
      litres REAL NOT NULL,
      totalCost REAL NOT NULL,
      pricePerLitre REAL NOT NULL,
      isFullTank INTEGER NOT NULL DEFAULT 1,
      fuelStation TEXT,
      notes TEXT,
      receiptUri TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS maintenance_plans (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      intervalKm REAL NOT NULL,
      intervalMonths INTEGER NOT NULL,
      lastServiceMileage REAL NOT NULL,
      lastServiceDate TEXT NOT NULL,
      nextDueMileage REAL NOT NULL,
      nextDueDate TEXT NOT NULL,
      notes TEXT,
      isCustom INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS service_records (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL,
      planId TEXT,
      title TEXT NOT NULL,
      serviceType TEXT NOT NULL,
      date TEXT NOT NULL,
      odometer REAL NOT NULL,
      garageName TEXT,
      labourCost REAL NOT NULL DEFAULT 0,
      partsCost REAL NOT NULL DEFAULT 0,
      totalCost REAL NOT NULL,
      notes TEXT,
      receiptUri TEXT,
      partsList TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      vehicleId TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      odometer REAL,
      vendor TEXT,
      notes TEXT,
      receiptUri TEXT,
      linkedServiceId TEXT,
      linkedFuelId TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS idempotency_keys (
      key TEXT PRIMARY KEY,
      recordType TEXT NOT NULL,
      recordId TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_date ON fuel_entries(vehicleId, date);
    CREATE INDEX IF NOT EXISTS idx_service_vehicle_date ON service_records(vehicleId, date);
    CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_date ON expenses(vehicleId, date);
    CREATE INDEX IF NOT EXISTS idx_odometer_vehicle ON odometer_entries(vehicleId, date);
    CREATE INDEX IF NOT EXISTS idx_idempotency_key ON idempotency_keys(key);
  `);

  const settingsCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM app_settings'
  );
  if (!settingsCount || settingsCount.count === 0) {
    const defaults: Record<string, string> = {
      currency: 'LKR',
      distanceUnit: 'km',
      volumeUnit: 'L',
      enableNotifications: 'true',
      theme: 'dark',
    };
    for (const [key, val] of Object.entries(defaults)) {
      await db.runAsync(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        [key, val]
      );
    }
  }

  const vehicleCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM vehicles'
  );
  if (!vehicleCount || vehicleCount.count === 0) {
    await seedDemoData();
  }
}

// ----------------- VEHICLES CRUD -----------------

export async function getAllVehicles(): Promise<Vehicle[]> {
  if (Platform.OS === 'web') {
    return [...webVehicles].sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
  }
  const db = await getDb();
  if (!db) return [];
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM vehicles ORDER BY isPrimary DESC, createdAt DESC'
  );
  return rows.map((r) => ({
    ...r,
    isPrimary: Boolean(r.isPrimary),
  }));
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  if (Platform.OS === 'web') {
    return webVehicles.find((v) => v.id === id) || null;
  }
  const db = await getDb();
  if (!db) return null;
  const row = await db.getFirstAsync<any>(
    'SELECT * FROM vehicles WHERE id = ?',
    [id]
  );
  if (!row) return null;
  return {
    ...row,
    isPrimary: Boolean(row.isPrimary),
  };
}

export async function insertVehicle(vehicle: Vehicle): Promise<void> {
  if (Platform.OS === 'web') {
    webVehicles = webVehicles.filter((v) => v.id !== vehicle.id);
    webVehicles.unshift(vehicle);
    await insertOdometerEntry({
      id: `odo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      vehicleId: vehicle.id,
      odometer: vehicle.currentOdometer,
      date: new Date().toISOString(),
      notes: 'Initial odometer reading',
      source: 'manual',
      createdAt: new Date().toISOString(),
    });
    await createDefaultMaintenancePlans(vehicle.id, vehicle.currentOdometer);
    return;
  }

  const db = await getDb();
  if (!db) return;

  await db.runAsync(
    `INSERT INTO vehicles (id, name, type, make, model, year, regNumber, currentOdometer, photoUri, purchaseDate, vin, fuelType, isPrimary, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      vehicle.id,
      vehicle.name,
      vehicle.type,
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.regNumber || null,
      vehicle.currentOdometer,
      vehicle.photoUri || null,
      vehicle.purchaseDate || null,
      vehicle.vin || null,
      vehicle.fuelType || 'petrol',
      vehicle.isPrimary ? 1 : 0,
      vehicle.createdAt,
      vehicle.updatedAt,
    ]
  );

  await insertOdometerEntry({
    id: `odo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    vehicleId: vehicle.id,
    odometer: vehicle.currentOdometer,
    date: new Date().toISOString(),
    notes: 'Initial odometer reading',
    source: 'manual',
    createdAt: new Date().toISOString(),
  });

  await createDefaultMaintenancePlans(vehicle.id, vehicle.currentOdometer);
}

export async function updateVehicle(vehicle: Vehicle): Promise<void> {
  if (Platform.OS === 'web') {
    const idx = webVehicles.findIndex((v) => v.id === vehicle.id);
    if (idx !== -1) webVehicles[idx] = vehicle;
    return;
  }
  const db = await getDb();
  if (!db) return;
  await db.runAsync(
    `UPDATE vehicles 
     SET name = ?, type = ?, make = ?, model = ?, year = ?, regNumber = ?, currentOdometer = ?, photoUri = ?, purchaseDate = ?, vin = ?, fuelType = ?, isPrimary = ?, updatedAt = ?
     WHERE id = ?`,
    [
      vehicle.name,
      vehicle.type,
      vehicle.make,
      vehicle.model,
      vehicle.year,
      vehicle.regNumber || null,
      vehicle.currentOdometer,
      vehicle.photoUri || null,
      vehicle.purchaseDate || null,
      vehicle.vin || null,
      vehicle.fuelType || 'petrol',
      vehicle.isPrimary ? 1 : 0,
      new Date().toISOString(),
      vehicle.id,
    ]
  );
}

export async function updateVehicleOdometer(
  vehicleId: string,
  newOdometer: number,
  source: 'manual' | 'fuel' | 'service' | 'expense' = 'manual',
  notes?: string
): Promise<void> {
  if (Platform.OS === 'web') {
    const v = webVehicles.find((item) => item.id === vehicleId);
    if (v && (newOdometer > v.currentOdometer || source === 'manual')) {
      v.currentOdometer = newOdometer;
      v.updatedAt = new Date().toISOString();
    }
    await insertOdometerEntry({
      id: `odo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      vehicleId,
      odometer: newOdometer,
      date: new Date().toISOString(),
      notes: notes || `Logged via ${source}`,
      source,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  const db = await getDb();
  if (!db) return;
  const current = await getVehicleById(vehicleId);
  if (!current) return;

  if (newOdometer > current.currentOdometer || source === 'manual') {
    await db.runAsync(
      'UPDATE vehicles SET currentOdometer = ?, updatedAt = ? WHERE id = ?',
      [newOdometer, new Date().toISOString(), vehicleId]
    );
  }

  await insertOdometerEntry({
    id: `odo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    vehicleId,
    odometer: newOdometer,
    date: new Date().toISOString(),
    notes: notes || `Logged via ${source}`,
    source,
    createdAt: new Date().toISOString(),
  });
}

export async function deleteVehicle(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    webVehicles = webVehicles.filter((v) => v.id !== id);
    webOdometer = webOdometer.filter((o) => o.vehicleId !== id);
    webFuel = webFuel.filter((f) => f.vehicleId !== id);
    webPlans = webPlans.filter((p) => p.vehicleId !== id);
    webServices = webServices.filter((s) => s.vehicleId !== id);
    webExpenses = webExpenses.filter((e) => e.vehicleId !== id);
    return;
  }
  const db = await getDb();
  if (!db) return;
  await db.runAsync('DELETE FROM vehicles WHERE id = ?', [id]);
}

// ----------------- ODOMETER ENTRIES -----------------

export async function insertOdometerEntry(entry: OdometerEntry): Promise<void> {
  if (Platform.OS === 'web') {
    webOdometer.unshift(entry);
    return;
  }
  const db = await getDb();
  if (!db) return;
  await db.runAsync(
    `INSERT INTO odometer_entries (id, vehicleId, odometer, date, notes, source, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.vehicleId,
      entry.odometer,
      entry.date,
      entry.notes || null,
      entry.source,
      entry.createdAt,
    ]
  );
}

export async function getOdometerEntries(vehicleId: string): Promise<OdometerEntry[]> {
  if (Platform.OS === 'web') {
    return webOdometer.filter((o) => o.vehicleId === vehicleId);
  }
  const db = await getDb();
  if (!db) return [];
  return await db.getAllAsync<OdometerEntry>(
    'SELECT * FROM odometer_entries WHERE vehicleId = ? ORDER BY date DESC, odometer DESC',
    [vehicleId]
  );
}

// ----------------- IDEMPOTENCY KEYS -----------------

export async function checkIdempotencyKey(key: string): Promise<boolean> {
  if (!key) return false;
  if (Platform.OS === 'web') {
    return webIdempotencyKeys.has(key);
  }
  const db = await getDb();
  if (!db) return false;
  const row = await db.getFirstAsync<{ key: string }>(
    'SELECT key FROM idempotency_keys WHERE key = ?',
    [key]
  );
  return !!row;
}

// ----------------- FUEL ENTRIES -----------------

export async function insertFuelEntry(entry: FuelEntry, idempotencyKey?: string): Promise<boolean> {
  if (idempotencyKey) {
    const exists = await checkIdempotencyKey(idempotencyKey);
    if (exists) return false; // Already saved, duplicate prevented
  }

  if (Platform.OS === 'web') {
    webFuel.unshift(entry);
    if (idempotencyKey) webIdempotencyKeys.add(idempotencyKey);
    await updateVehicleOdometer(entry.vehicleId, entry.odometer, 'fuel', `Fuel fill-up: ${entry.litres.toFixed(1)}L`);
    return true;
  }
  const db = await getDb();
  if (!db) return false;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO fuel_entries (id, vehicleId, date, odometer, litres, totalCost, pricePerLitre, isFullTank, fuelStation, notes, receiptUri, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.vehicleId,
        entry.date,
        entry.odometer,
        entry.litres,
        entry.totalCost,
        entry.pricePerLitre,
        entry.isFullTank ? 1 : 0,
        entry.fuelStation || null,
        entry.notes || null,
        entry.receiptUri || null,
        entry.createdAt,
      ]
    );

    if (idempotencyKey) {
      await db.runAsync(
        'INSERT INTO idempotency_keys (key, recordType, recordId, createdAt) VALUES (?, ?, ?, ?)',
        [idempotencyKey, 'fuel', entry.id, new Date().toISOString()]
      );
    }
  });

  await updateVehicleOdometer(entry.vehicleId, entry.odometer, 'fuel', `Fuel fill-up: ${entry.litres.toFixed(1)}L`);
  return true;
}

export async function getFuelEntries(vehicleId: string): Promise<FuelEntry[]> {
  if (Platform.OS === 'web') {
    return webFuel.filter((f) => f.vehicleId === vehicleId).sort((a, b) => a.odometer - b.odometer);
  }
  const db = await getDb();
  if (!db) return [];
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM fuel_entries WHERE vehicleId = ? ORDER BY odometer ASC, date ASC',
    [vehicleId]
  );
  return rows.map((r) => ({
    ...r,
    isFullTank: Boolean(r.isFullTank),
  }));
}

export async function deleteFuelEntry(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    webFuel = webFuel.filter((f) => f.id !== id);
    return;
  }
  const db = await getDb();
  if (!db) return;
  await db.runAsync('DELETE FROM fuel_entries WHERE id = ?', [id]);
}

// ----------------- MAINTENANCE PLANS -----------------

export async function getMaintenancePlans(vehicleId: string): Promise<MaintenancePlan[]> {
  if (Platform.OS === 'web') {
    return webPlans.filter((p) => p.vehicleId === vehicleId).sort((a, b) => a.nextDueMileage - b.nextDueMileage);
  }
  const db = await getDb();
  if (!db) return [];
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM maintenance_plans WHERE vehicleId = ? ORDER BY nextDueMileage ASC',
    [vehicleId]
  );
  return rows.map((r) => ({
    ...r,
    isCustom: Boolean(r.isCustom),
  }));
}

export async function insertMaintenancePlan(plan: MaintenancePlan): Promise<void> {
  if (Platform.OS === 'web') {
    webPlans.push(plan);
    return;
  }
  const db = await getDb();
  if (!db) return;
  await db.runAsync(
    `INSERT INTO maintenance_plans (id, vehicleId, title, category, intervalKm, intervalMonths, lastServiceMileage, lastServiceDate, nextDueMileage, nextDueDate, notes, isCustom, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      plan.id,
      plan.vehicleId,
      plan.title,
      plan.category,
      plan.intervalKm,
      plan.intervalMonths,
      plan.lastServiceMileage,
      plan.lastServiceDate,
      plan.nextDueMileage,
      plan.nextDueDate,
      plan.notes || null,
      plan.isCustom ? 1 : 0,
      plan.createdAt,
      plan.updatedAt,
    ]
  );
}

export async function updateMaintenancePlan(plan: MaintenancePlan): Promise<void> {
  if (Platform.OS === 'web') {
    const idx = webPlans.findIndex((p) => p.id === plan.id);
    if (idx !== -1) webPlans[idx] = plan;
    return;
  }
  const db = await getDb();
  if (!db) return;
  await db.runAsync(
    `UPDATE maintenance_plans 
     SET title = ?, category = ?, intervalKm = ?, intervalMonths = ?, lastServiceMileage = ?, lastServiceDate = ?, nextDueMileage = ?, nextDueDate = ?, notes = ?, updatedAt = ?
     WHERE id = ?`,
    [
      plan.title,
      plan.category,
      plan.intervalKm,
      plan.intervalMonths,
      plan.lastServiceMileage,
      plan.lastServiceDate,
      plan.nextDueMileage,
      plan.nextDueDate,
      plan.notes || null,
      new Date().toISOString(),
      plan.id,
    ]
  );
}

export async function deleteMaintenancePlan(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    webPlans = webPlans.filter((p) => p.id !== id);
    return;
  }
  const db = await getDb();
  if (!db) return;
  await db.runAsync('DELETE FROM maintenance_plans WHERE id = ?', [id]);
}

export async function createDefaultMaintenancePlans(vehicleId: string, currentOdo: number): Promise<void> {
  const now = new Date();
  const defaultPlans: Omit<MaintenancePlan, 'id' | 'vehicleId' | 'createdAt' | 'updatedAt'>[] = [
    {
      title: 'Engine Oil & Filter Change',
      category: 'oil_change',
      intervalKm: 5000,
      intervalMonths: 6,
      lastServiceMileage: currentOdo,
      lastServiceDate: now.toISOString(),
      nextDueMileage: currentOdo + 5000,
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()).toISOString(),
      notes: 'Recommended high-grade synthetic oil',
      isCustom: false,
    },
    {
      title: 'Air Filter Replacement',
      category: 'filter',
      intervalKm: 15000,
      intervalMonths: 12,
      lastServiceMileage: currentOdo,
      lastServiceDate: now.toISOString(),
      nextDueMileage: currentOdo + 15000,
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 12, now.getDate()).toISOString(),
      notes: 'Inspect every 5,000 km',
      isCustom: false,
    },
    {
      title: 'Brake Pads & Fluid Inspection',
      category: 'brakes',
      intervalKm: 10000,
      intervalMonths: 12,
      lastServiceMileage: currentOdo,
      lastServiceDate: now.toISOString(),
      nextDueMileage: currentOdo + 10000,
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 12, now.getDate()).toISOString(),
      notes: 'Check front and rear pad wear',
      isCustom: false,
    },
    {
      title: 'Tyre Rotation & Alignment',
      category: 'tyres',
      intervalKm: 10000,
      intervalMonths: 6,
      lastServiceMileage: currentOdo,
      lastServiceDate: now.toISOString(),
      nextDueMileage: currentOdo + 10000,
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 6, now.getDate()).toISOString(),
      notes: 'Balanced tyre wear increases longevity',
      isCustom: false,
    },
  ];

  for (let i = 0; i < defaultPlans.length; i++) {
    const p = defaultPlans[i];
    await insertMaintenancePlan({
      ...p,
      id: `plan_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
      vehicleId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  }
}

// ----------------- SERVICE RECORDS -----------------

export async function insertServiceRecord(record: ServiceRecord, idempotencyKey?: string): Promise<boolean> {
  if (idempotencyKey) {
    const exists = await checkIdempotencyKey(idempotencyKey);
    if (exists) return false; // Duplicate prevented
  }

  if (Platform.OS === 'web') {
    webServices.unshift(record);
    if (idempotencyKey) webIdempotencyKeys.add(idempotencyKey);
    if (record.planId) {
      const plan = webPlans.find((p) => p.id === record.planId);
      if (plan) {
        plan.lastServiceMileage = record.odometer;
        plan.lastServiceDate = record.date;
        plan.nextDueMileage = record.odometer + plan.intervalKm;
        const svcDate = new Date(record.date);
        plan.nextDueDate = new Date(svcDate.getFullYear(), svcDate.getMonth() + plan.intervalMonths, svcDate.getDate()).toISOString();
      }
    }
    await updateVehicleOdometer(record.vehicleId, record.odometer, 'service', `Service: ${record.title}`);
    return true;
  }

  const db = await getDb();
  if (!db) return false;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO service_records (id, vehicleId, planId, title, serviceType, date, odometer, garageName, labourCost, partsCost, totalCost, notes, receiptUri, partsList, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.vehicleId,
        record.planId || null,
        record.title,
        record.serviceType,
        record.date,
        record.odometer,
        record.garageName || null,
        record.labourCost,
        record.partsCost,
        record.totalCost,
        record.notes || null,
        record.receiptUri || null,
        record.partsList || null,
        record.createdAt,
      ]
    );

    if (idempotencyKey) {
      await db.runAsync(
        'INSERT INTO idempotency_keys (key, recordType, recordId, createdAt) VALUES (?, ?, ?, ?)',
        [idempotencyKey, 'service', record.id, new Date().toISOString()]
      );
    }

    if (record.planId) {
      const plan = await db.getFirstAsync<MaintenancePlan>(
        'SELECT * FROM maintenance_plans WHERE id = ?',
        [record.planId]
      );
      if (plan) {
        const nextDueMileage = record.odometer + plan.intervalKm;
        const svcDate = new Date(record.date);
        const nextDueDate = new Date(
          svcDate.getFullYear(),
          svcDate.getMonth() + plan.intervalMonths,
          svcDate.getDate()
        ).toISOString();

        await db.runAsync(
          `UPDATE maintenance_plans
           SET lastServiceMileage = ?, lastServiceDate = ?, nextDueMileage = ?, nextDueDate = ?, updatedAt = ?
           WHERE id = ?`,
          [
            record.odometer,
            record.date,
            nextDueMileage,
            nextDueDate,
            new Date().toISOString(),
            record.planId,
          ]
        );
      }
    }
  });

  await updateVehicleOdometer(record.vehicleId, record.odometer, 'service', `Service: ${record.title}`);
  return true;
}

export async function getServiceRecords(vehicleId: string): Promise<ServiceRecord[]> {
  if (Platform.OS === 'web') {
    return webServices.filter((s) => s.vehicleId === vehicleId);
  }
  const db = await getDb();
  if (!db) return [];
  return await db.getAllAsync<ServiceRecord>(
    'SELECT * FROM service_records WHERE vehicleId = ? ORDER BY date DESC, odometer DESC',
    [vehicleId]
  );
}

export async function deleteServiceRecord(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    webServices = webServices.filter((s) => s.id !== id);
    return;
  }
  const db = await getDb();
  if (!db) return;
  await db.runAsync('DELETE FROM service_records WHERE id = ?', [id]);
}

// ----------------- EXPENSES -----------------

export async function insertExpense(expense: ExpenseRecord, idempotencyKey?: string): Promise<boolean> {
  if (idempotencyKey) {
    const exists = await checkIdempotencyKey(idempotencyKey);
    if (exists) return false; // Duplicate prevented
  }

  if (Platform.OS === 'web') {
    webExpenses.unshift(expense);
    if (idempotencyKey) webIdempotencyKeys.add(idempotencyKey);
    if (expense.odometer) {
      await updateVehicleOdometer(expense.vehicleId, expense.odometer, 'expense', expense.title);
    }
    return true;
  }

  const db = await getDb();
  if (!db) return false;

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO expenses (id, vehicleId, category, title, amount, date, odometer, vendor, notes, receiptUri, linkedServiceId, linkedFuelId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.id,
        expense.vehicleId,
        expense.category,
        expense.title,
        expense.amount,
        expense.date,
        expense.odometer || null,
        expense.vendor || null,
        expense.notes || null,
        expense.receiptUri || null,
        expense.linkedServiceId || null,
        expense.linkedFuelId || null,
        expense.createdAt,
      ]
    );

    if (idempotencyKey) {
      await db.runAsync(
        'INSERT INTO idempotency_keys (key, recordType, recordId, createdAt) VALUES (?, ?, ?, ?)',
        [idempotencyKey, 'expense', expense.id, new Date().toISOString()]
      );
    }
  });

  if (expense.odometer) {
    await updateVehicleOdometer(expense.vehicleId, expense.odometer, 'expense', expense.title);
  }
  return true;
}

export async function getExpenses(vehicleId: string): Promise<ExpenseRecord[]> {
  if (Platform.OS === 'web') {
    return webExpenses.filter((e) => e.vehicleId === vehicleId);
  }
  const db = await getDb();
  if (!db) return [];
  return await db.getAllAsync<ExpenseRecord>(
    'SELECT * FROM expenses WHERE vehicleId = ? ORDER BY date DESC',
    [vehicleId]
  );
}

export async function deleteExpense(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    webExpenses = webExpenses.filter((e) => e.id !== id);
    return;
  }
  const db = await getDb();
  if (!db) return;
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
}

// ----------------- APP SETTINGS -----------------

export async function getSettings(): Promise<AppSettings> {
  if (Platform.OS === 'web') {
    return {
      currency: webSettings.currency || 'LKR',
      distanceUnit: (webSettings.distanceUnit as 'km' | 'mi') || 'km',
      volumeUnit: (webSettings.volumeUnit as 'L' | 'gal') || 'L',
      enableNotifications: webSettings.enableNotifications === 'true',
      activeVehicleId: webSettings.activeVehicleId,
      theme: (webSettings.theme as 'dark' | 'light') || 'dark',
      backendApiKey: webSettings.backendApiKey || '',
      backendServerUrl: webSettings.backendServerUrl || '',
    };
  }
  const db = await getDb();
  if (!db) {
    return {
      currency: 'LKR',
      distanceUnit: 'km',
      volumeUnit: 'L',
      enableNotifications: true,
      theme: 'dark',
      backendApiKey: '',
      backendServerUrl: '',
    };
  }
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    'SELECT key, value FROM app_settings'
  );
  const map: Record<string, string> = {};
  rows.forEach((r) => {
    map[r.key] = r.value;
  });

  return {
    currency: map.currency || 'LKR',
    distanceUnit: (map.distanceUnit as 'km' | 'mi') || 'km',
    volumeUnit: (map.volumeUnit as 'L' | 'gal') || 'L',
    enableNotifications: map.enableNotifications === 'true',
    activeVehicleId: map.activeVehicleId,
    theme: (map.theme as 'dark' | 'light') || 'dark',
    backendApiKey: map.backendApiKey || '',
    backendServerUrl: map.backendServerUrl || '',
  };
}

export async function saveSetting(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    webSettings[key] = value;
    return;
  }
  const db = await getDb();
  if (!db) return;
  await db.runAsync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

// ----------------- DEMO SEED DATA -----------------

export async function seedDemoData(): Promise<void> {
  const vehicleId = 'demo_vehicle_1';
  const now = new Date();

  const vehicle: Vehicle = {
    id: vehicleId,
    name: 'Daily Driver (Civic)',
    type: 'car',
    make: 'Honda',
    model: 'Civic EX',
    year: 2021,
    regNumber: 'WP CAR-8822',
    currentOdometer: 42350,
    fuelType: 'petrol',
    isPrimary: true,
    purchaseDate: new Date(now.getFullYear() - 2, 3, 15).toISOString(),
    createdAt: new Date(now.getFullYear() - 2, 3, 15).toISOString(),
    updatedAt: now.toISOString(),
  };

  await insertVehicle(vehicle);
  await saveSetting('activeVehicleId', vehicleId);

  const fuelEntries: Omit<FuelEntry, 'id'>[] = [
    {
      vehicleId,
      date: new Date(now.getTime() - 40 * 24 * 3600 * 1000).toISOString(),
      odometer: 41200,
      litres: 40.0,
      totalCost: 14800,
      pricePerLitre: 370,
      isFullTank: true,
      fuelStation: 'Ceypetco Super Fuel',
      notes: 'Initial full tank baseline',
      createdAt: new Date(now.getTime() - 40 * 24 * 3600 * 1000).toISOString(),
    },
    {
      vehicleId,
      date: new Date(now.getTime() - 28 * 24 * 3600 * 1000).toISOString(),
      odometer: 41550,
      litres: 15.0,
      totalCost: 5550,
      pricePerLitre: 370,
      isFullTank: false,
      fuelStation: 'IOC Town Station',
      notes: 'Quick partial top up',
      createdAt: new Date(now.getTime() - 28 * 24 * 3600 * 1000).toISOString(),
    },
    {
      vehicleId,
      date: new Date(now.getTime() - 15 * 24 * 3600 * 1000).toISOString(),
      odometer: 41980,
      litres: 37.5,
      totalCost: 13875,
      pricePerLitre: 370,
      isFullTank: true,
      fuelStation: 'Sinopec Highway Express',
      notes: 'Full tank - highway road trip',
      createdAt: new Date(now.getTime() - 15 * 24 * 3600 * 1000).toISOString(),
    },
    {
      vehicleId,
      date: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      odometer: 42350,
      litres: 26.2,
      totalCost: 9694,
      pricePerLitre: 370,
      isFullTank: true,
      fuelStation: 'Ceypetco City Hub',
      notes: 'City commute fill up',
      createdAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  for (let i = 0; i < fuelEntries.length; i++) {
    await insertFuelEntry({
      ...fuelEntries[i],
      id: `fuel_demo_${i + 1}`,
    });
  }

  const serviceRecords: Omit<ServiceRecord, 'id'>[] = [
    {
      vehicleId,
      title: 'Full 40,000 km Major Service',
      serviceType: 'Major Service',
      date: new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString(),
      odometer: 40000,
      garageName: 'AutoMiraj Grand Workshop',
      labourCost: 8500,
      partsCost: 24500,
      totalCost: 33000,
      notes: 'Synthetic 0W-20 oil, Honda genuine filter, air filter, brake fluid flush',
      partsList: 'Engine Oil 4L, Oil Filter, Engine Air Filter, Brake Fluid DOT4',
      createdAt: new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  for (let i = 0; i < serviceRecords.length; i++) {
    await insertServiceRecord({
      ...serviceRecords[i],
      id: `srv_demo_${i + 1}`,
    });
  }

  const expenses: Omit<ExpenseRecord, 'id'>[] = [
    {
      vehicleId,
      category: 'insurance',
      title: 'Comprehensive Annual Insurance',
      amount: 68500,
      date: new Date(now.getFullYear(), 0, 15).toISOString(),
      vendor: 'Sri Lanka Insurance Corp',
      notes: 'Full policy renewal for 2026',
      createdAt: new Date(now.getFullYear(), 0, 15).toISOString(),
    },
  ];

  for (let i = 0; i < expenses.length; i++) {
    await insertExpense({
      ...expenses[i],
      id: `exp_demo_${i + 1}`,
    });
  }
}

// ----------------- ATOMIC BACKUP RESTORE -----------------

export interface BackupRestorePayload {
  vehicles: Vehicle[];
  fuelEntries?: FuelEntry[];
  serviceRecords?: ServiceRecord[];
  expenses?: ExpenseRecord[];
  maintenancePlans?: MaintenancePlan[];
  odometerEntries?: OdometerEntry[];
}

/**
 * Atomically restores all backup records within a single SQLite transaction.
 * Does not trigger nested transactions, automatic default plan generation,
 * or extraneous side-effects.
 */
export async function restoreAllData(data: BackupRestorePayload): Promise<{ count: number }> {
  let count = 0;

  if (Platform.OS === 'web') {
    if (data.vehicles && data.vehicles.length > 0) {
      for (const v of data.vehicles) {
        const idx = webVehicles.findIndex((x) => x.id === v.id);
        if (idx !== -1) webVehicles[idx] = v;
        else webVehicles.push(v);
        count++;
      }
    }

    if (data.fuelEntries && data.fuelEntries.length > 0) {
      for (const f of data.fuelEntries) {
        const idx = webFuel.findIndex((x) => x.id === f.id);
        if (idx !== -1) webFuel[idx] = f;
        else webFuel.push(f);
        count++;
      }
    }

    if (data.serviceRecords && data.serviceRecords.length > 0) {
      for (const s of data.serviceRecords) {
        const idx = webServices.findIndex((x) => x.id === s.id);
        if (idx !== -1) webServices[idx] = s;
        else webServices.push(s);
        count++;
      }
    }

    if (data.expenses && data.expenses.length > 0) {
      for (const e of data.expenses) {
        const idx = webExpenses.findIndex((x) => x.id === e.id);
        if (idx !== -1) webExpenses[idx] = e;
        else webExpenses.push(e);
        count++;
      }
    }

    if (data.maintenancePlans && data.maintenancePlans.length > 0) {
      for (const p of data.maintenancePlans) {
        const idx = webPlans.findIndex((x) => x.id === p.id);
        if (idx !== -1) webPlans[idx] = p;
        else webPlans.push(p);
        count++;
      }
    }

    if (data.odometerEntries && data.odometerEntries.length > 0) {
      for (const o of data.odometerEntries) {
        const idx = webOdometer.findIndex((x) => x.id === o.id);
        if (idx !== -1) webOdometer[idx] = o;
        else webOdometer.push(o);
        count++;
      }
    }

    return { count };
  }

  const db = await getDb();
  if (!db) return { count: 0 };

  await db.withTransactionAsync(async () => {
    // 1. Vehicles (ON CONFLICT DO UPDATE preserves child records without triggering ON DELETE CASCADE)
    if (data.vehicles && data.vehicles.length > 0) {
      for (const v of data.vehicles) {
        await db.runAsync(
          `INSERT INTO vehicles (
            id, name, type, make, model, year, regNumber,
            currentOdometer, photoUri, purchaseDate, vin, fuelType, isPrimary,
            createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            type = excluded.type,
            make = excluded.make,
            model = excluded.model,
            year = excluded.year,
            regNumber = excluded.regNumber,
            currentOdometer = excluded.currentOdometer,
            photoUri = excluded.photoUri,
            purchaseDate = excluded.purchaseDate,
            vin = excluded.vin,
            fuelType = excluded.fuelType,
            isPrimary = excluded.isPrimary,
            createdAt = excluded.createdAt,
            updatedAt = excluded.updatedAt`,
          [
            v.id,
            v.name,
            v.type,
            v.make,
            v.model,
            v.year,
            v.regNumber || null,
            v.currentOdometer,
            v.photoUri || null,
            v.purchaseDate || null,
            v.vin || null,
            v.fuelType || 'petrol',
            v.isPrimary ? 1 : 0,
            v.createdAt,
            v.updatedAt,
          ]
        );
        count++;
      }
    }

    // 2. Fuel Entries
    if (data.fuelEntries && data.fuelEntries.length > 0) {
      for (const f of data.fuelEntries) {
        await db.runAsync(
          `INSERT INTO fuel_entries (
            id, vehicleId, date, odometer, litres, totalCost,
            pricePerLitre, isFullTank, fuelStation, notes, receiptUri, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            vehicleId = excluded.vehicleId,
            date = excluded.date,
            odometer = excluded.odometer,
            litres = excluded.litres,
            totalCost = excluded.totalCost,
            pricePerLitre = excluded.pricePerLitre,
            isFullTank = excluded.isFullTank,
            fuelStation = excluded.fuelStation,
            notes = excluded.notes,
            receiptUri = excluded.receiptUri,
            createdAt = excluded.createdAt`,
          [
            f.id,
            f.vehicleId,
            f.date,
            f.odometer,
            f.litres,
            f.totalCost,
            f.pricePerLitre,
            f.isFullTank ? 1 : 0,
            f.fuelStation || null,
            f.notes || null,
            f.receiptUri || null,
            f.createdAt,
          ]
        );
        count++;
      }
    }

    // 3. Service Records
    if (data.serviceRecords && data.serviceRecords.length > 0) {
      for (const s of data.serviceRecords) {
        await db.runAsync(
          `INSERT INTO service_records (
            id, vehicleId, planId, title, serviceType, date,
            odometer, garageName, labourCost, partsCost, totalCost,
            notes, receiptUri, partsList, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            vehicleId = excluded.vehicleId,
            planId = excluded.planId,
            title = excluded.title,
            serviceType = excluded.serviceType,
            date = excluded.date,
            odometer = excluded.odometer,
            garageName = excluded.garageName,
            labourCost = excluded.labourCost,
            partsCost = excluded.partsCost,
            totalCost = excluded.totalCost,
            notes = excluded.notes,
            receiptUri = excluded.receiptUri,
            partsList = excluded.partsList,
            createdAt = excluded.createdAt`,
          [
            s.id,
            s.vehicleId,
            s.planId || null,
            s.title,
            s.serviceType,
            s.date,
            s.odometer,
            s.garageName || null,
            s.labourCost,
            s.partsCost,
            s.totalCost,
            s.notes || null,
            s.receiptUri || null,
            s.partsList || null,
            s.createdAt,
          ]
        );
        count++;
      }
    }

    // 4. Expenses
    if (data.expenses && data.expenses.length > 0) {
      for (const e of data.expenses) {
        await db.runAsync(
          `INSERT INTO expenses (
            id, vehicleId, category, title, amount, date,
            odometer, vendor, notes, receiptUri, linkedServiceId,
            linkedFuelId, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            vehicleId = excluded.vehicleId,
            category = excluded.category,
            title = excluded.title,
            amount = excluded.amount,
            date = excluded.date,
            odometer = excluded.odometer,
            vendor = excluded.vendor,
            notes = excluded.notes,
            receiptUri = excluded.receiptUri,
            linkedServiceId = excluded.linkedServiceId,
            linkedFuelId = excluded.linkedFuelId,
            createdAt = excluded.createdAt`,
          [
            e.id,
            e.vehicleId,
            e.category,
            e.title,
            e.amount,
            e.date,
            e.odometer || null,
            e.vendor || null,
            e.notes || null,
            e.receiptUri || null,
            e.linkedServiceId || null,
            e.linkedFuelId || null,
            e.createdAt,
          ]
        );
        count++;
      }
    }

    // 5. Maintenance Plans
    if (data.maintenancePlans && data.maintenancePlans.length > 0) {
      for (const p of data.maintenancePlans) {
        await db.runAsync(
          `INSERT INTO maintenance_plans (
            id, vehicleId, title, category, intervalKm, intervalMonths,
            lastServiceMileage, lastServiceDate, nextDueMileage, nextDueDate,
            notes, isCustom, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            vehicleId = excluded.vehicleId,
            title = excluded.title,
            category = excluded.category,
            intervalKm = excluded.intervalKm,
            intervalMonths = excluded.intervalMonths,
            lastServiceMileage = excluded.lastServiceMileage,
            lastServiceDate = excluded.lastServiceDate,
            nextDueMileage = excluded.nextDueMileage,
            nextDueDate = excluded.nextDueDate,
            notes = excluded.notes,
            isCustom = excluded.isCustom,
            createdAt = excluded.createdAt,
            updatedAt = excluded.updatedAt`,
          [
            p.id,
            p.vehicleId,
            p.title,
            p.category,
            p.intervalKm,
            p.intervalMonths,
            p.lastServiceMileage,
            p.lastServiceDate,
            p.nextDueMileage,
            p.nextDueDate,
            p.notes || null,
            p.isCustom ? 1 : 0,
            p.createdAt,
            p.updatedAt,
          ]
        );
        count++;
      }
    }

    // 6. Odometer Entries
    if (data.odometerEntries && data.odometerEntries.length > 0) {
      for (const o of data.odometerEntries) {
        await db.runAsync(
          `INSERT INTO odometer_entries (
            id, vehicleId, odometer, date, notes, source, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            vehicleId = excluded.vehicleId,
            odometer = excluded.odometer,
            date = excluded.date,
            notes = excluded.notes,
            source = excluded.source,
            createdAt = excluded.createdAt`,
          [
            o.id,
            o.vehicleId,
            o.odometer,
            o.date,
            o.notes || null,
            o.source,
            o.createdAt,
          ]
        );
        count++;
      }
    }
  });

  return { count };
}

