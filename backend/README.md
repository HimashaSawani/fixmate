# FixMate FastAPI Backend

Backend service providing **Receipt OCR extraction** and **LLM Vehicle Assistant tools** for the FixMate mobile application.

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- (Optional) Tesseract OCR installed on the host system if choosing `tesseract` engine. `easyocr` and PIL preprocessors are bundled out-of-the-box.

### 2. Setup Virtual Environment & Install Dependencies
```bash
cd backend
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\Activate.ps1
# On macOS / Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Run the Development Server
```bash
# Start server with live reload on port 8000
python main.py
# Or with uvicorn directly:
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Server will be running at: `http://localhost:8000`  
Swagger API Documentation: `http://localhost:8000/docs`

---

## 📡 API Endpoints

### 1. Health Check
`GET /health`
```json
{
  "status": "ok",
  "version": "1.0.0",
  "ocr_engine": "easyocr",
  "timestamp": "2026-10-06T08:30:00Z"
}
```

### 2. Receipt OCR
`POST /ocr/receipt`
- Accepts `multipart/form-data` with `file: UploadFile` or `application/json` with Base64 image payload.
- Returns structured suggestions:
```json
{
  "success": true,
  "category": "fuel",
  "merchant": "CEYPETCO FILLING STATION",
  "date": "2026-10-04",
  "total": 12950.0,
  "litres": 35.0,
  "pricePerLitre": 370.0,
  "confidence": 0.95,
  "rawText": "CEYPETCO...\nAuto Diesel\nLitres: 35.0\nRate: 370.0\nTotal: 12950.00",
  "warnings": []
}
```

---

## 🔒 Security & Privacy Policy
1. **Zero Retention**: Uploaded receipt images are processed strictly in-memory or cleaned up immediately after inference. No photos are saved to server disk.
2. **API Key & Rate Limiting**: Header `X-API-Key` can be configured for production deployments. Rate limiter defaults to 60 requests/minute per client IP.
3. **Offline Fallback**: FixMate mobile client contains built-in offline parsing fallbacks so the app operates 100% offline when the backend is unreachable.

---

## 🧪 Running Backend Tests
```bash
cd backend
pytest test_ocr.py -v
```
