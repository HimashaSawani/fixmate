# 🚗 FixMate — Intelligent Vehicle Maintenance & Fleet Management

[![Expo SDK 57](https://img.shields.io/badge/Expo-SDK_57-000020.svg?style=flat&logo=expo)](https://expo.dev/)
[![React Native 0.86](https://img.shields.io/badge/React_Native-0.86-61DAFB.svg?style=flat&logo=react)](https://reactnative.dev/)
[![SQLite](https://img.shields.io/badge/Storage-Local_SQLite-003B57.svg?style=flat&logo=sqlite)](https://docs.expo.dev/versions/latest/sdk/sqlite/)
[![FastAPI Backend](https://img.shields.io/badge/Backend-FastAPI_0.115-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Tests Passed](https://img.shields.io/badge/Automated_Tests-16%2F16_Passed-success.svg)](#test-results)

**FixMate** is a modern, privacy-first mobile application for vehicle maintenance tracking, fuel economy monitoring, intelligent receipt OCR scanning, and conversational AI assistance. Built with React Native, Expo, local SQLite, and a FastAPI companion backend.

---

## 📱 Key Features & Visual Walkthrough

### 1. 📊 Central Vehicle Dashboard & Garage Management
A modern, unified vehicle health dashboard displaying real-time vehicle status, active odometer readings, monthly expenditure summaries, quick-action shortcuts, and recent transaction history.

<p align="center">
<img width="342" height="1329" alt="WhatsApp Image 2026-10-06 at 12 09 56" src="https://github.com/user-attachments/assets/dd6fe1ef-fe69-478b-bc2d-6eb4c1793d0d" />
</p>

- **Multi-Vehicle Garage**: Manage cars, SUVs, motorcycles, vans, and trucks with completely isolated service schedules.
- **Quick Logging**: One-tap access to log fuel fill-ups, maintenance services, expenses, and receipt scans.
- **Upcoming Maintenance Widgets**: Real-time status cards highlighting urgent, due-soon, and healthy service items.

---

### 2. 🤖 Conversational AI Copilot (OpenAI + SQLite Tool Bridge)
An intelligent, privacy-conscious AI assistant that answers questions about service history and fuel economy, and generates pre-filled draft records with human-in-the-loop review.

<p align="center">
  <img width="380" height="1329" alt="WhatsApp Image 2026-10-06 at 12 09 56 (1)" src="https://github.com/user-attachments/assets/097c7598-12d8-46cf-ae6a-f64f790de69c" />

</p>

- **Natural Language Parsing**: Ask queries like *"When is my next oil change?"* or command *"I did an oil change today, mileage 45,000, cost 18,000"*.
- **Human-in-the-Loop Review**: Draft actions require explicit confirmation before writing to SQLite.
- **Transactional Idempotency**: Unique draft IDs and persistent SQLite idempotency keys strictly prevent duplicate saves across app restarts.
- **Deterministic Offline Fallback**: Operates cleanly on local rule heuristics when the backend is offline.

---

### 3. 🧾 Smart Receipt OCR Scanner (FastAPI + OpenCV + Tesseract)
Capture paper fuel and garage invoices via camera or gallery to automatically extract metadata into structured records.

<p align="center">
<img width="380" height="1329" alt="WhatsApp Image 2026-10-06 at 12 09 57" src="https://github.com/user-attachments/assets/dc763320-d0b0-4fb5-95d4-cfd7e89d6f9f" />
</p>

- **Automated Metadata Extraction**: Extracts merchant name, transaction date, total amount, and odometer readings.
- **Adaptive Image Preprocessing**: Grayscale filtering and thresholding optimize extraction accuracy even in challenging lighting.
- **Manual Verification Dialog**: Editable verification modal guarantees zero hallucinated fields enter your records.

---

### 4. 🔧 Preventive Maintenance Schedules & Explainable Forecasting
Intelligent maintenance tracking with automatic scheduling, explainable driving forecasts, and native notification alerts.

<p align="center">
<img width="380" height="1329" alt="WhatsApp Image 2026-10-06 at 12 09 57 (2)" src="https://github.com/user-attachments/assets/247e19f5-cfce-4893-8c31-e084e8fd3bc1" />
</p>

- **"Whichever Comes First" Rule**: Evaluates maintenance due status based on distance intervals (km) or calendar intervals (months).
- **Explainable Driving Forecasts**: Computes historical daily driving rate ($\Delta\text{km} / \Delta\text{days}$) to forecast estimated service dates with transparent explanations.
- **Local Notification Alerts**: Native scheduled reminders delivered directly via Android notification channels.

---

### 5. 📈 Financial Analytics & Cost Reporting
Deep financial insights into total vehicle ownership costs with strict double-counting prevention.

<p align="center">
<img width="360" height="1329" alt="WhatsApp Image 2026-10-06 at 12 09 57 (1)" src="https://github.com/user-attachments/assets/4a4d6ec7-6092-439f-9140-f3bfcf8cb714" />
</p>

- **Strict Financial Isolation**: Separates fuel logs, service invoices, and standalone expenses to prevent double-counting.
- **Visual Expenditure Trends**: Monthly cost bar charts and categorical expense distribution breakdowns.
- **Cost per Kilometer Metric**: Accurate ownership cost per km calculated across recorded odometer intervals.
- **Data Portability**: Full JSON backup export & restore with relational ID preservation + CSV export.

---

## 🔒 Privacy & Data Policy

- **100% Local by Default**: All garage vehicles, odometer updates, fuel logs, and service records are stored exclusively in your local on-device SQLite database.
- **AI & OCR Transparency**:
  - Receipt images are transmitted only when the user explicitly triggers "Scan Receipt".
  - Chat queries send localized vehicle summary context (current odometer, service list, recent fuel metrics) to the configured backend.
  - Zero sensitive personal information is stored on external servers.

---

## 🚀 Getting Started & Setup

### Prerequisites
- Node.js (v18+)
- Python 3.10+ (for OCR & AI backend)
- Expo CLI (`npx expo`) and EAS CLI (`npx eas-cli@latest`)

### 1. Mobile Client Setup

```bash
# Clone the repository
git clone https://github.com/HimashaSawani/fixmate.git
cd fixmate

# Install dependencies
npm install

# Start local development server
npx expo start
```

### 2. Backend Setup (AI & OCR)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Set OpenAI API Key for live cloud LLM
set OPENAI_API_KEY=your_openai_api_key_here

# Start the FastAPI server (accessible over local network)
uvicorn main:app --host 0.0.0.0 --port 8000
```

> **Note on Physical Device Testing**: When running the app on a physical phone, `localhost` points to the phone itself. Open **Settings > AI & OCR Server Connection** in FixMate and enter your PC's local Wi-Fi IP address (e.g. `http://192.168.1.50:8000`).

---

## 📦 Building Standalone Preview APK

To build a standalone installable Android APK via Expo Application Services (EAS):

```bash
# 1. Log in to your EAS account
npx eas-cli@latest login

# 2. Build the Android APK using the preview profile
npx eas-cli@latest build --profile preview --platform android
```

Once the build finishes, download the `.apk` file directly to your Android device.

---

## 🧪 Automated Test Verification

FixMate includes a strict end-to-end invariant test suite ([`test_e2e_release_audit.ts`](./test_e2e_release_audit.ts)) validating database consistency, idempotency, and isolation rules:

```bash
npx tsx test_e2e_release_audit.ts
```

### Test Results (16/16 Passed):
| # | Invariant Tested | Result |
|---|---|---|
| 1 | Monthly expense filter strictly isolates current vs. prior months | ✅ Passed |
| 2 | Persistent SQLite idempotency blocks duplicate AI draft confirmation | ✅ Passed |
| 3 | Legitimate identical records with distinct draft IDs succeed | ✅ Passed |
| 4 | Active vehicle switching blocks cross-vehicle record contamination | ✅ Passed |
| 5 | Missing AI extraction fields remain strictly null without hallucination | ✅ Passed |
| 6 | Service confirmation automatically re-evaluates maintenance status | ✅ Passed |
| 7 | Multi-vehicle creation and independent odometer tracking | ✅ Passed |
| 8 | Dynamic vehicle switching in AI Copilot updates context | ✅ Passed |

---

## 📱 Physical Device Verification Checklist

Before final portfolio presentation, perform these manual device checks on the installed APK:

- [ ] **Offline Execution**: Disable Wi-Fi/data. Open app, create a fuel entry and vehicle, close app from recent apps, restart, verify record persistence.
- [ ] **Local Notifications**: Verify test alert in **Settings > Send Test Notification**.
- [ ] **OCR & Live Copilot**: Test receipt scan and AI Copilot with backend connected. Verify that when backend is unreachable, app switches cleanly to offline deterministic assistant.
- [ ] **Full Backup & Restore**: Export JSON backup, reinstall or reset demo data, restore JSON backup and confirm complete data integrity.

---

## ⚠️ Known Limitations & Portfolio Notes

1. **Expo Go Notifications**: In Expo SDK 53+, remote push notifications are disabled in the Expo Go client. Use the standalone preview APK for native notification testing.
2. **OCR Image Quality**: Tesseract OCR performance depends on lighting, focus, and receipt condition. Incomplete scans prompt manual confirmation in the review dialog.
3. **Multi-User Production Hosting**: For production deployment outside portfolio demos, configure an HTTPS reverse proxy (Caddy/Nginx) with JWT user authentication and rate limiting.

---

## 📄 License

FixMate is licensed under the MIT License. Developed for portfolio demonstration.
