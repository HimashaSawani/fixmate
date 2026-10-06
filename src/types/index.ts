export type VehicleType = 'car' | 'motorcycle' | 'van' | 'suv' | 'truck' | 'other';

export interface Vehicle {
  id: string;
  name: string; // Nickname e.g. "My Civic", "Pulsar 150"
  type: VehicleType;
  make: string; // e.g. "Honda", "Toyota", "Bajaj"
  model: string; // e.g. "Civic", "Corolla", "Pulsar"
  year: number; // e.g. 2019
  regNumber?: string; // e.g. "WP CAD-1234"
  currentOdometer: number; // in km
  photoUri?: string;
  purchaseDate?: string; // ISO date string
  vin?: string;
  fuelType?: 'petrol' | 'diesel' | 'hybrid' | 'electric';
  isPrimary?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OdometerEntry {
  id: string;
  vehicleId: string;
  odometer: number;
  date: string; // ISO string
  notes?: string;
  source: 'manual' | 'fuel' | 'service' | 'expense';
  createdAt: string;
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  date: string; // ISO string
  odometer: number;
  litres: number;
  totalCost: number;
  pricePerLitre: number;
  isFullTank: boolean;
  fuelStation?: string;
  notes?: string;
  receiptUri?: string;
  // Computed interval values (cached or runtime)
  distanceTravelled?: number;
  fuelEfficiencyKmL?: number; // km/L
  costPerKm?: number;
  createdAt: string;
}

export interface MaintenancePlan {
  id: string;
  vehicleId: string;
  title: string; // e.g. "Engine Oil & Filter"
  category: 'oil_change' | 'filter' | 'brakes' | 'tyres' | 'spark_plugs' | 'coolant' | 'transmission' | 'battery' | 'inspection' | 'other';
  intervalKm: number; // e.g. 5000 km
  intervalMonths: number; // e.g. 6 months
  lastServiceMileage: number;
  lastServiceDate: string; // ISO string
  nextDueMileage: number;
  nextDueDate: string; // ISO string
  notes?: string;
  isCustom?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRecord {
  id: string;
  vehicleId: string;
  planId?: string; // linked maintenance plan
  title: string;
  serviceType: string;
  date: string; // ISO string
  odometer: number;
  garageName?: string;
  labourCost: number;
  partsCost: number;
  totalCost: number;
  notes?: string;
  receiptUri?: string;
  partsList?: string; // JSON or comma-separated
  createdAt: string;
}

export type ExpenseCategory =
  | 'fuel'
  | 'service'
  | 'repair'
  | 'insurance'
  | 'registration'
  | 'accessories'
  | 'parking_tolls'
  | 'other';

export interface ExpenseRecord {
  id: string;
  vehicleId: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  date: string; // ISO string
  odometer?: number;
  vendor?: string;
  notes?: string;
  receiptUri?: string;
  linkedServiceId?: string;
  linkedFuelId?: string;
  createdAt: string;
}

export interface ReminderSetting {
  id: string;
  vehicleId: string;
  planId?: string;
  title: string;
  triggerKmBefore: number; // notify X km before due
  triggerDaysBefore: number; // notify Y days before due
  isEnabled: boolean;
}

export interface AppSettings {
  currency: string; // "LKR", "USD", "EUR", "GBP", "INR"
  distanceUnit: 'km' | 'mi';
  volumeUnit: 'L' | 'gal';
  enableNotifications: boolean;
  activeVehicleId?: string;
  theme: 'dark' | 'light';
  backendApiKey?: string;
  backendServerUrl?: string;
}

export interface FuelCalculationResult {
  intervalDistance: number;
  intervalFuelUsed: number;
  intervalCost: number;
  kmPerLitre: number;
  costPerKm: number;
}

export interface VehicleHealthSummary {
  totalSpent: number;
  fuelSpent: number;
  maintenanceSpent: number;
  repairsSpent: number;
  otherSpent: number;
  totalDistance: number;
  averageKmL: number;
  costPerKm: number | null;
  overdueServicesCount: number;
  dueSoonServicesCount: number;
  goodServicesCount: number;
}
