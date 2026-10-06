"""
Unit and Integration Tests for FixMate FastAPI OCR Service.
Tests structured text parsing, fuel & service recognition, warning handling, and image preprocessing.
"""

import io
from PIL import Image, ImageDraw, ImageFont
import pytest
from fastapi.testclient import TestClient

from main import app
from ocr_service import parse_receipt_text, preprocess_image, ReceiptOCRResult


client = TestClient(app)


# -------------------------------------------------------------
# 1. System Health Endpoint Test
# -------------------------------------------------------------
def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "ocr_engine" in data


# -------------------------------------------------------------
# 2. Fuel Receipt Text Parsing Tests
# -------------------------------------------------------------
def test_parse_ceypetco_fuel_receipt():
    raw_sample = """
    CEYPETCO FILLING STATION
    HAVELOCK ROAD, COLOMBO 05
    DATE: 2026-10-04 08:30
    PUMP: 03   NOZZLE: 02
    AUTO DIESEL
    VOLUME: 35.00 L
    RATE: LKR 370.00
    TOTAL AMOUNT: LKR 12,950.00
    THANK YOU COME AGAIN
    """
    result: ReceiptOCRResult = parse_receipt_text(raw_sample, ocr_confidence=0.95)

    assert result.success is True
    assert result.category == "fuel"
    assert result.merchant == "CEYPETCO FILLING STATION"
    assert result.date == "2026-10-04"
    assert result.total == 12950.0
    assert result.litres == 35.0
    assert result.pricePerLitre == 370.0
    assert len(result.warnings) == 0


def test_parse_laugfs_petrol_receipt():
    raw_sample = """
    LAUGFS PETROLEUM (PVT) LTD
    KOHUWALA
    DATE: 15/09/2026
    PETROL 92 OCTANE
    QTY: 28.50 LTRS
    PRC: 325.00
    NET TOTAL: 9,262.50
    """
    result = parse_receipt_text(raw_sample, ocr_confidence=0.92)

    assert result.success is True
    assert result.category == "fuel"
    assert result.merchant == "LAUGFS PETROLEUM"
    assert result.date == "2026-09-15"
    assert result.total == 9262.5
    assert result.litres == 28.5
    assert result.pricePerLitre == 325.0


# -------------------------------------------------------------
# 3. Service Invoice Parsing Tests
# -------------------------------------------------------------
def test_parse_auto_miraj_service_invoice():
    raw_sample = """
    AUTO MIRAJ CAR CARE
    INVOICE # AM-2026-992
    DATE: 02-Oct-2026
    SERVICE: PERIODIC MAINTENANCE & OIL CHANGE
    SYNTHETIC ENGINE OIL 5W-30: 18,500.00
    GENUINE OIL FILTER: 4,500.00
    LABOUR CHARGES: 5,500.00
    TOTAL AMOUNT: LKR 28,500.00
    """
    result = parse_receipt_text(raw_sample, ocr_confidence=0.90)

    assert result.success is True
    assert result.category == "service"
    assert result.merchant == "AUTO MIRAJ CAR CARE"
    assert result.date == "2026-10-02"
    assert result.total == 28500.0
    assert result.serviceType == "oil_change"
    assert result.labourCost == 5500.0


# -------------------------------------------------------------
# 4. Ambiguous / Incomplete Receipt Handling & Warnings
# -------------------------------------------------------------
def test_parse_blurry_receipt_with_missing_fields():
    raw_sample = """
    CORNER FUEL STATION
    SALE: 5,000.00
    """
    result = parse_receipt_text(raw_sample, ocr_confidence=0.70)

    assert result.success is True
    assert result.category == "fuel"
    assert result.total == 5000.0
    # Should flag warnings for missing litres and missing price/L
    assert len(result.warnings) >= 2
    assert any("litres" in w.lower() for w in result.warnings)


def test_parse_completely_unreadable_text():
    raw_sample = ""
    result = parse_receipt_text(raw_sample, ocr_confidence=0.0)

    assert result.success is False
    assert len(result.warnings) > 0
    assert "No legible text" in result.warnings[0]


# -------------------------------------------------------------
# 5. Image Validation & Multipart Upload Endpoint Tests
# -------------------------------------------------------------
def create_test_image(text: str = "TEST RECEIPT\nTOTAL: 1500.00") -> bytes:
    """Helper to generate a lightweight PNG in memory."""
    img = Image.new("RGB", (300, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 30), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_upload_valid_receipt_image():
    img_bytes = create_test_image("CEYPETCO\nTOTAL: 5000.00")
    response = client.post(
        "/ocr/receipt",
        files={"file": ("receipt.png", img_bytes, "image/png")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "category" in data
    assert "merchant" in data
    assert "warnings" in data


def test_reject_invalid_file_type():
    fake_txt = b"This is a text file, not an image"
    response = client.post(
        "/ocr/receipt",
        files={"file": ("document.txt", fake_txt, "text/plain")}
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_reject_empty_file():
    response = client.post(
        "/ocr/receipt",
        files={"file": ("empty.png", b"", "image/png")}
    )
    assert response.status_code == 400
