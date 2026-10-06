import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import {
  getAllVehicles,
  getFuelEntries,
  getServiceRecords,
  getExpenses,
  getMaintenancePlans,
  getOdometerEntries,
  restoreAllData,
  BackupRestorePayload,
} from '../database/db';
import { Vehicle, FuelEntry, ServiceRecord, ExpenseRecord, MaintenancePlan, OdometerEntry } from '../types';
import { VersionedBackupPayload, validateBackupPayload } from './backupValidation';

export { VersionedBackupPayload, validateBackupPayload };

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
    odometerEntries: [],
  };

  for (const v of targetVehicles) {
    const fuel = await getFuelEntries(v.id);
    const services = await getServiceRecords(v.id);
    const expenses = await getExpenses(v.id);
    const plans = await getMaintenancePlans(v.id);
    const odometers = await getOdometerEntries(v.id);

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
    if (exportPayload.odometerEntries) {
      exportPayload.odometerEntries.push(...odometers);
    }
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
