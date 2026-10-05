import * as SQLite from 'expo-sqlite';
import {
  Vehicle,
  OdometerEntry,
  FuelEntry,
  MaintenancePlan,
  ServiceRecord,
  ExpenseRecord,
  AppSettings,
} from '../types';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('fixmate_v1.db');
    await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  const db = await getDb();

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

    CREATE INDEX IF NOT EXISTS idx_fuel_vehicle_date ON fuel_entries(vehicleId, date);
    CREATE INDEX IF NOT EXISTS idx_service_vehicle_date ON service_records(vehicleId, date);
    CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_date ON expenses(vehicleId, date);
    CREATE INDEX IF NOT EXISTS idx_odometer_vehicle ON odometer_entries(vehicleId, date);
  `);

  // Initialize default app settings if not exists
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

  // Check if any vehicle exists, if not create a sample vehicle so user has instant experience
  const vehicleCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM vehicles'
  );
  if (!vehicleCount || vehicleCount.count === 0) {
    await seedDemoData();
  }
}

// ----------------- VEHICLES CRUD -----------------

export async function getAllVehicles(): Promise<Vehicle[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM vehicles ORDER BY isPrimary DESC, createdAt DESC'
  );
  return rows.map((r) => ({
    ...r,
    isPrimary: Boolean(r.isPrimary),
  }));
}

export async function getVehicleById(id: string): Promise<Vehicle | null> {
  const db = await getDb();
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
  const db = await getDb();
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

  // Also log initial odometer entry
  await insertOdometerEntry({
    id: `odo_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    vehicleId: vehicle.id,
    odometer: vehicle.currentOdometer,
    date: new Date().toISOString(),
    notes: 'Initial odometer reading',
    source: 'manual',
    createdAt: new Date().toISOString(),
  });

  // Create default maintenance plans for this vehicle
  await createDefaultMaintenancePlans(vehicle.id, vehicle.currentOdometer);
}

export async function updateVehicle(vehicle: Vehicle): Promise<void> {
  const db = await getDb();
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
  const db = await getDb();
  const current = await getVehicleById(vehicleId);
  if (!current) return;

  // Update vehicle current odometer if higher or if manual correction
  if (newOdometer > current.currentOdometer || source === 'manual') {
    await db.runAsync(
      'UPDATE vehicles SET currentOdometer = ?, updatedAt = ? WHERE id = ?',
      [newOdometer, new Date().toISOString(), vehicleId]
    );
  }

  // Insert odometer history
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
  const db = await getDb();
  await db.runAsync('DELETE FROM vehicles WHERE id = ?', [id]);
}

// ----------------- ODOMETER ENTRIES -----------------

export async function insertOdometerEntry(entry: OdometerEntry): Promise<void> {
  const db = await getDb();
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
  const db = await getDb();
  return await db.getAllAsync<OdometerEntry>(
    'SELECT * FROM odometer_entries WHERE vehicleId = ? ORDER BY date DESC, odometer DESC',
    [vehicleId]
  );
}

// ----------------- FUEL ENTRIES -----------------

export async function insertFuelEntry(entry: FuelEntry): Promise<void> {
  const db = await getDb();
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

  // Update odometer if higher
  await updateVehicleOdometer(entry.vehicleId, entry.odometer, 'fuel', `Fuel fill-up: ${entry.litres.toFixed(1)}L`);
}

export async function getFuelEntries(vehicleId: string): Promise<FuelEntry[]> {
  const db = await getDb();
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
  const db = await getDb();
  await db.runAsync('DELETE FROM fuel_entries WHERE id = ?', [id]);
}

// ----------------- MAINTENANCE PLANS -----------------

export async function getMaintenancePlans(vehicleId: string): Promise<MaintenancePlan[]> {
  const db = await getDb();
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
  const db = await getDb();
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
  const db = await getDb();
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
  const db = await getDb();
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
    {
      title: 'Spark Plugs Replacement',
      category: 'spark_plugs',
      intervalKm: 30000,
      intervalMonths: 24,
      lastServiceMileage: currentOdo,
      lastServiceDate: now.toISOString(),
      nextDueMileage: currentOdo + 30000,
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 24, now.getDate()).toISOString(),
      notes: 'Iridium / Platinum standard',
      isCustom: false,
    },
    {
      title: 'Coolant Flush',
      category: 'coolant',
      intervalKm: 40000,
      intervalMonths: 24,
      lastServiceMileage: currentOdo,
      lastServiceDate: now.toISOString(),
      nextDueMileage: currentOdo + 40000,
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 24, now.getDate()).toISOString(),
      notes: 'Prevents engine overheating',
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

export async function insertServiceRecord(record: ServiceRecord): Promise<void> {
  const db = await getDb();
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

  // If connected to a maintenance plan, update plan's last service and recalculate next due!
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

  // Update vehicle odometer if higher
  await updateVehicleOdometer(record.vehicleId, record.odometer, 'service', `Service: ${record.title}`);
}

export async function getServiceRecords(vehicleId: string): Promise<ServiceRecord[]> {
  const db = await getDb();
  return await db.getAllAsync<ServiceRecord>(
    'SELECT * FROM service_records WHERE vehicleId = ? ORDER BY date DESC, odometer DESC',
    [vehicleId]
  );
}

export async function deleteServiceRecord(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM service_records WHERE id = ?', [id]);
}

// ----------------- EXPENSES -----------------

export async function insertExpense(expense: ExpenseRecord): Promise<void> {
  const db = await getDb();
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

  if (expense.odometer) {
    await updateVehicleOdometer(expense.vehicleId, expense.odometer, 'expense', expense.title);
  }
}

export async function getExpenses(vehicleId: string): Promise<ExpenseRecord[]> {
  const db = await getDb();
  return await db.getAllAsync<ExpenseRecord>(
    'SELECT * FROM expenses WHERE vehicleId = ? ORDER BY date DESC',
    [vehicleId]
  );
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
}

// ----------------- APP SETTINGS -----------------

export async function getSettings(): Promise<AppSettings> {
  const db = await getDb();
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
  };
}

export async function saveSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
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

  // Set active vehicle
  await saveSetting('activeVehicleId', vehicleId);

  // Add realistic Fuel Fill-ups with both full & partial fill-ups to demonstrate fuel calculation accurately
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
      litres: 15.0, // Partial fill
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
      litres: 37.5, // Full fill (Interval distance = 41980 - 41200 = 780km, Fuel = 15 + 37.5 = 52.5L -> 14.85 km/L)
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
      litres: 26.2, // Full fill (Interval = 370km, Fuel = 26.2L -> 14.12 km/L)
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

  // Add realistic past Service Records
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
    {
      vehicleId,
      title: 'Front Brake Pads Replacement',
      serviceType: 'Brakes',
      date: new Date(now.getTime() - 120 * 24 * 3600 * 1000).toISOString(),
      odometer: 35000,
      garageName: 'Sterling Aftercare Hub',
      labourCost: 3500,
      partsCost: 12800,
      totalCost: 16300,
      notes: 'Akebono Ceramic front brake pads fitted',
      partsList: 'Front Brake Pad Set (Akebono)',
      createdAt: new Date(now.getTime() - 120 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  for (let i = 0; i < serviceRecords.length; i++) {
    await insertServiceRecord({
      ...serviceRecords[i],
      id: `srv_demo_${i + 1}`,
    });
  }

  // Add Expenses (Insurance, Revenue Licence, Cleaning)
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
    {
      vehicleId,
      category: 'registration',
      title: 'Annual Revenue Licence & Emission Test',
      amount: 8200,
      date: new Date(now.getFullYear(), 0, 20).toISOString(),
      vendor: 'DriveGreen & Divisional Secretariat',
      notes: 'Eco test passed, sticker issued',
      createdAt: new Date(now.getFullYear(), 0, 20).toISOString(),
    },
    {
      vehicleId,
      category: 'accessories',
      title: '70mai Dual Dash Cam & 128GB SD Card',
      amount: 22500,
      date: new Date(now.getTime() - 50 * 24 * 3600 * 1000).toISOString(),
      vendor: 'Daraz Audio & Tech',
      notes: 'Front and rear 1080p recording kit',
      createdAt: new Date(now.getTime() - 50 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  for (let i = 0; i < expenses.length; i++) {
    await insertExpense({
      ...expenses[i],
      id: `exp_demo_${i + 1}`,
    });
  }
}
