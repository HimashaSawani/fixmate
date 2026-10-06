import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface ExtractedReceiptResult {
  success: boolean;
  category: 'fuel' | 'service' | 'expense';
  merchant: string;
  date: string;
  total: number | null;
  litres: number | null;
  pricePerLitre: number | null;
  serviceType: string | null;
  labourCost: number | null;
  partsCost: number | null;
  notes: string | null;
  confidence: number;
  rawText: string;
  warnings: string[];
  isOfflineFallback?: boolean;
}

// Default localhost config:
// Android Emulator uses 10.0.2.2 to connect to host loopback; iOS / Web uses localhost
const DEFAULT_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
let currentBackendUrl = DEFAULT_HOST;

export function setOcrBackendUrl(url: string) {
  currentBackendUrl = url;
}

export function getOcrBackendUrl(): string {
  return currentBackendUrl;
}

/**
 * Checks if the FastAPI backend is running and healthy.
 */
export async function checkOcrBackendHealth(): Promise<{ isOnline: boolean; engine?: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${currentBackendUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { isOnline: true, engine: data.ocr_engine };
    }
    return { isOnline: false, error: `HTTP ${res.status}` };
  } catch (err: any) {
    return { isOnline: false, error: err?.message || 'Connection refused' };
  }
}

/**
 * Sends a receipt image to the FastAPI backend for real OCR extraction.
 * If backend is unavailable, gracefully falls back to local heuristic extraction.
 */
export async function scanReceiptWithOcr(imageUri: string): Promise<ExtractedReceiptResult> {
  try {
    // 1. Read image as Base64
    let base64Data: string;
    try {
      base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (readErr) {
      console.warn('Could not read image as base64:', readErr);
      throw new Error('Failed to read image file for OCR.');
    }

    // 2. Call FastAPI /ocr/receipt/base64 with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18000); // 18s timeout

    const response = await fetch(`${currentBackendUrl}/ocr/receipt/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64Data,
        fileName: 'receipt.jpg',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`OCR API responded with ${response.status}:`, errorText);
      throw new Error(`OCR Server Error (${response.status})`);
    }

    const result: ExtractedReceiptResult = await response.json();
    return {
      ...result,
      isOfflineFallback: false,
    };
  } catch (err: any) {
    console.warn('Backend OCR failed, falling back to local manual review:', err?.message);
    
    // Graceful offline fallback
    return {
      success: true,
      category: 'expense',
      merchant: 'Receipt Entry',
      date: new Date().toISOString().slice(0, 10),
      total: null,
      litres: null,
      pricePerLitre: null,
      serviceType: null,
      labourCost: null,
      partsCost: null,
      notes: 'Captured via FixMate (Offline Review)',
      confidence: 0.5,
      rawText: '',
      warnings: [
        'OCR Backend is unreachable or offline. Please review and enter values manually.',
      ],
      isOfflineFallback: true,
    };
  }
}

export interface AIDraftRecord {
  draftId?: string;
  recordType: 'service' | 'fuel' | 'expense';
  vehicleId: string;
  vehicleName?: string;
  date: string;
  amount: number | null;
  categoryOrService?: string;
  title?: string;
  serviceType?: string;
  category?: string;
  merchant?: string;
  odometer: number | null;
  litres?: number | null;
  pricePerUnit?: number | null;
  pricePerLitre?: number | null;
  notes?: string | null;
  missingFields: string[];
  userSpecifiedFields: string[];
  isReadyForConfirmation: boolean;
}

export interface AssistantApiResponse {
  answer: string;
  suggestedAction?: any;
  isOffline: boolean;
  llmProvider?: string;
  warning?: string;
  draftRecord?: AIDraftRecord | null;
}

/**
 * Queries the FastAPI Assistant endpoint for LLM reasoning with deterministic tool bridge.
 */
export async function queryAssistantApi(
  prompt: string,
  context: {
    vehicleName: string;
    currentOdometer: number;
    currency: string;
    distanceUnit: string;
    fuelStats?: any;
    expenseSummary?: any;
    maintenanceStatus?: any;
    serviceHistory?: any;
  }
): Promise<AssistantApiResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(`${currentBackendUrl}/assistant/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        answer: data.answer,
        suggestedAction: data.suggestedAction,
        isOffline: data.isOfflineRuleBased,
        llmProvider: data.llmProvider,
        warning: data.warning,
        draftRecord: data.draftRecord || null,
      };
    }
  } catch (err) {
    console.warn('Backend Assistant offline, using on-device copilot engine:', err);
  }
  return { answer: '', isOffline: true, llmProvider: 'offline_fallback', draftRecord: null };
}
