import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  getAllVehicles,
  getFuelEntries,
  getServiceRecords,
  getExpenses,
  getMaintenancePlans,
  restoreAllData,
  BackupRestorePayload,
} from '../database/db';
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

export async function exportAllDataToJson(vehicleId?: string): Promise<string> {
  const vehicles = await getAllVehicles();
  const targetVehicles = vehicleId ? vehicles.filter((v) => v.id === vehicleId) : vehicles;

  const exportPayload: VersionedBackupPayload = {
    schemaVersion: 1,
    app: 'FixMate - Vehicle Manager',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    vehicles: targetVehicles,
    fuelEntries: [],
    serviceRecords: [],
    expenses: [],
    maintenancePlans: [],
  };

  for (const v of targetVehicles) {
    const fuel = await getFuelEntries(v.id);
    const services = await getServiceRecords(v.id);
    const expenses = await getExpenses(v.id);
    const plans = await getMaintenancePlans(v.id);

    // Process receipts to base64 for portability
    const portableFuel = await Promise.all(
      fuel.map(async (f) => {
        let receiptBase64: string | undefined;
        if (f.receiptUri) {
          try {
            receiptBase64 = await FileSystem.readAsStringAsync(f.receiptUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (e) {
            console.warn(`Could not read receipt image for fuel entry ${f.id}:`, e);
          }
        }
        return { ...f, receiptBase64 };
      })
    );

    const portableServices = await Promise.all(
      services.map(async (s) => {
        let receiptBase64: string | undefined;
        if (s.receiptUri) {
          try {
            receiptBase64 = await FileSystem.readAsStringAsync(s.receiptUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (e) {
            console.warn(`Could not read receipt image for service record ${s.id}:`, e);
          }
        }
        return { ...s, receiptBase64 };
      })
    );

    const portableExpenses = await Promise.all(
      expenses.map(async (e) => {
        let receiptBase64: string | undefined;
        if (e.receiptUri) {
          try {
            receiptBase64 = await FileSystem.readAsStringAsync(e.receiptUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (err) {
            console.warn(`Could not read receipt image for expense ${e.id}:`, err);
          }
        }
        return { ...e, receiptBase64 };
      })
    );

    exportPayload.fuelEntries.push(...portableFuel);
    exportPayload.serviceRecords.push(...portableServices);
    exportPayload.expenses.push(...portableExpenses);
    exportPayload.maintenancePlans.push(...plans);
  }

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const fileName = `fixmate_backup_${new Date().toISOString().slice(0, 10)}.json`;
  const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, jsonString, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/json',
      dialogTitle: 'Export FixMate Backup (JSON)',
      UTI: 'public.json',
    });
  }

  return fileUri;
}

// Helper to write base64 receipt to local document directory on restore
async function restoreReceiptImage(base64Data?: string, originalUri?: string): Promise<string | undefined> {
  if (!base64Data) {
    return originalUri;
  }
  try {
    const docDir = FileSystem.documentDirectory || FileSystem.cacheDirectory || '';
    const newFilename = `restored_receipt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
    const targetUri = `${docDir}${newFilename}`;
    await FileSystem.writeAsStringAsync(targetUri, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return targetUri;
  } catch (err) {
    console.warn('Failed to restore receipt image:', err);
    return originalUri;
  }
}

/**
 * Validates version, structure, types, dates, numbers, and relationships of backup JSON.
 */
export function validateBackupPayload(data: any): VersionedBackupPayload {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid backup file: root must be a JSON object.');
  }

  if (!Array.isArray(data.vehicles) || data.vehicles.length === 0) {
    throw new Error('Invalid backup file: "vehicles" array is missing or empty.');
  }

  const vehicleIds = new Set<string>();

  // Validate vehicles
  for (let i = 0; i < data.vehicles.length; i++) {
    const v = data.vehicles[i];
    if (!v.id || typeof v.id !== 'string') {
      throw new Error(`Vehicle at index ${i} is missing a valid 'id'.`);
    }
    if (!v.name || typeof v.name !== 'string') {
      throw new Error(`Vehicle '${v.id}' is missing a valid 'name'.`);
    }
    if (typeof v.currentOdometer !== 'number' || isNaN(v.currentOdometer) || v.currentOdometer < 0) {
      throw new Error(`Vehicle '${v.id}' has an invalid 'currentOdometer'.`);
    }
    if (v.createdAt && isNaN(new Date(v.createdAt).getTime())) {
      throw new Error(`Vehicle '${v.id}' has an invalid 'createdAt' date.`);
    }
    vehicleIds.add(v.id);
  }

  // Validate fuel entries & referential integrity
  if (data.fuelEntries) {
    if (!Array.isArray(data.fuelEntries)) {
      throw new Error('Invalid backup file: "fuelEntries" must be an array.');
    }
    for (let i = 0; i < data.fuelEntries.length; i++) {
      const f = data.fuelEntries[i];
      if (!f.id || typeof f.id !== 'string') {
        throw new Error(`Fuel entry at index ${i} has an invalid 'id'.`);
      }
      if (!f.vehicleId || !vehicleIds.has(f.vehicleId)) {
        throw new Error(`Fuel entry '${f.id}' references unknown vehicleId '${f.vehicleId}'.`);
      }
      if (typeof f.litres !== 'number' || isNaN(f.litres) || f.litres < 0) {
        throw new Error(`Fuel entry '${f.id}' has an invalid 'litres' quantity.`);
      }
      if (typeof f.totalCost !== 'number' || isNaN(f.totalCost) || f.totalCost < 0) {
        throw new Error(`Fuel entry '${f.id}' has an invalid 'totalCost'.`);
      }
      if (f.date && isNaN(new Date(f.date).getTime())) {
        throw new Error(`Fuel entry '${f.id}' has an invalid 'date'.`);
      }
    }
  }

  // Validate service records & referential integrity
  if (data.serviceRecords) {
    if (!Array.isArray(data.serviceRecords)) {
      throw new Error('Invalid backup file: "serviceRecords" must be an array.');
    }
    for (let i = 0; i < data.serviceRecords.length; i++) {
      const s = data.serviceRecords[i];
      if (!s.id || typeof s.id !== 'string') {
        throw new Error(`Service record at index ${i} has an invalid 'id'.`);
      }
      if (!s.vehicleId || !vehicleIds.has(s.vehicleId)) {
        throw new Error(`Service record '${s.id}' references unknown vehicleId '${s.vehicleId}'.`);
      }
      if (typeof s.totalCost !== 'number' || isNaN(s.totalCost) || s.totalCost < 0) {
        throw new Error(`Service record '${s.id}' has an invalid 'totalCost'.`);
      }
      if (s.date && isNaN(new Date(s.date).getTime())) {
        throw new Error(`Service record '${s.id}' has an invalid 'date'.`);
      }
    }
  }

  // Validate expenses & referential integrity
  if (data.expenses) {
    if (!Array.isArray(data.expenses)) {
      throw new Error('Invalid backup file: "expenses" must be an array.');
    }
    for (let i = 0; i < data.expenses.length; i++) {
      const e = data.expenses[i];
      if (!e.id || typeof e.id !== 'string') {
        throw new Error(`Expense at index ${i} has an invalid 'id'.`);
      }
      if (!e.vehicleId || !vehicleIds.has(e.vehicleId)) {
        throw new Error(`Expense '${e.id}' references unknown vehicleId '${e.vehicleId}'.`);
      }
      if (typeof e.amount !== 'number' || isNaN(e.amount) || e.amount < 0) {
        throw new Error(`Expense '${e.id}' has an invalid 'amount'.`);
      }
      if (e.date && isNaN(new Date(e.date).getTime())) {
        throw new Error(`Expense '${e.id}' has an invalid 'date'.`);
      }
    }
  }

  // Validate maintenance plans & referential integrity
  if (data.maintenancePlans) {
    if (!Array.isArray(data.maintenancePlans)) {
      throw new Error('Invalid backup file: "maintenancePlans" must be an array.');
    }
    for (let i = 0; i < data.maintenancePlans.length; i++) {
      const p = data.maintenancePlans[i];
      if (!p.id || typeof p.id !== 'string') {
        throw new Error(`Maintenance plan at index ${i} has an invalid 'id'.`);
      }
      if (!p.vehicleId || !vehicleIds.has(p.vehicleId)) {
        throw new Error(`Maintenance plan '${p.id}' references unknown vehicleId '${p.vehicleId}'.`);
      }
      if (typeof p.intervalKm !== 'number' || isNaN(p.intervalKm) || p.intervalKm < 0) {
        throw new Error(`Maintenance plan '${p.id}' has an invalid 'intervalKm'.`);
      }
    }
  }

  return {
    schemaVersion: data.schemaVersion || 1,
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

export async function restoreBackupFromJsonString(jsonString: string): Promise<{ success: boolean; count: number }> {
  let parsedRaw: any;
  try {
    parsedRaw = JSON.parse(jsonString);
  } catch (err) {
    throw new Error('Backup file contains invalid JSON syntax.');
  }

  // 1. Strict Schema & Referential Validation
  const validated = validateBackupPayload(parsedRaw);

  // 2. Pre-process base64 receipt images asynchronously before the database transaction
  const processedFuel = await Promise.all(
    validated.fuelEntries.map(async (f) => {
      const copy = { ...f };
      if (copy.receiptBase64) {
        copy.receiptUri = await restoreReceiptImage(copy.receiptBase64, copy.receiptUri);
        delete copy.receiptBase64;
      }
      return copy;
    })
  );

  const processedServices = await Promise.all(
    validated.serviceRecords.map(async (s) => {
      const copy = { ...s };
      if (copy.receiptBase64) {
        copy.receiptUri = await restoreReceiptImage(copy.receiptBase64, copy.receiptUri);
        delete copy.receiptBase64;
      }
      return copy;
    })
  );

  const processedExpenses = await Promise.all(
    validated.expenses.map(async (e) => {
      const copy = { ...e };
      if (copy.receiptBase64) {
        copy.receiptUri = await restoreReceiptImage(copy.receiptBase64, copy.receiptUri);
        delete copy.receiptBase64;
      }
      return copy;
    })
  );

  // 3. Atomically restore all data in a single SQLite transaction
  const payload: BackupRestorePayload = {
    vehicles: validated.vehicles,
    fuelEntries: processedFuel,
    serviceRecords: processedServices,
    expenses: processedExpenses,
    maintenancePlans: validated.maintenancePlans,
    odometerEntries: validated.odometerEntries,
  };

  const result = await restoreAllData(payload);
  return { success: true, count: result.count };
}

export async function exportVehicleToCsv(vehicle: Vehicle): Promise<string> {
  const fuel = await getFuelEntries(vehicle.id);
  const services = await getServiceRecords(vehicle.id);
  const expenses = await getExpenses(vehicle.id);

  let csv = `FixMate Report - ${vehicle.name} (${vehicle.make} ${vehicle.model} ${vehicle.year})\n`;
  csv += `Generated On: ${new Date().toLocaleString()}\n`;
  csv += `Current Odometer: ${vehicle.currentOdometer} km\n\n`;

  // Fuel Section
  csv += `--- FUEL FILL-UPS ---\n`;
  csv += `Date,Odometer (km),Litres,Price/Litre,Total Cost,Full Tank,Fuel Station,Notes\n`;
  fuel.forEach((f) => {
    csv += `"${f.date}",${f.odometer},${f.litres},${f.pricePerLitre},${f.totalCost},"${f.isFullTank ? 'Yes' : 'No'}","${f.fuelStation || ''}","${f.notes || ''}"\n`;
  });

  csv += `\n--- SERVICE RECORDS ---\n`;
  csv += `Date,Service Type,Title,Odometer (km),Garage,Labour Cost,Parts Cost,Total Cost,Parts List,Notes\n`;
  services.forEach((s) => {
    csv += `"${s.date}","${s.serviceType}","${s.title}",${s.odometer},"${s.garageName || ''}",${s.labourCost},${s.partsCost},${s.totalCost},"${s.partsList || ''}","${s.notes || ''}"\n`;
  });

  csv += `\n--- OTHER EXPENSES ---\n`;
  csv += `Date,Category,Title,Amount,Vendor,Notes\n`;
  expenses.forEach((e) => {
    if (!e.linkedServiceId && !e.linkedFuelId) {
      csv += `"${e.date}","${e.category}","${e.title}",${e.amount},"${e.vendor || ''}","${e.notes || ''}"\n`;
    }
  });

  const fileName = `fixmate_${vehicle.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: `Export ${vehicle.name} Data (CSV)`,
      UTI: 'public.comma-separated-values-text',
    });
  }

  return fileUri;
}
