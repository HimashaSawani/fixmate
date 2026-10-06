"""
FixMate OCR Service - Pure Python & PyTorch/EasyOCR receipt extractor.
Extracts text from images and produces structured, validated metadata for vehicle logs.
"""

import io
import re
from datetime import datetime
from typing import List, Optional, Tuple
from pydantic import BaseModel, Field
from PIL import Image, ImageEnhance, ImageFilter

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False


class ReceiptOCRResult(BaseModel):
    success: bool
    category: str = Field(description="'fuel', 'service', or 'expense'")
    merchant: str = Field(default="")
    date: str = Field(default="")
    total: Optional[float] = Field(default=None)
    litres: Optional[float] = Field(default=None)
    pricePerLitre: Optional[float] = Field(default=None)
    serviceType: Optional[str] = Field(default=None)
    labourCost: Optional[float] = Field(default=None)
    partsCost: Optional[float] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    confidence: float = Field(default=0.0)
    rawText: str = Field(default="")
    warnings: List[str] = Field(default_factory=list)


# Lazy reader singleton
_easyocr_reader = None


def get_ocr_reader():
    global _easyocr_reader
    if _easyocr_reader is None and EASYOCR_AVAILABLE:
        try:
            # Initialize for English (and Latin characters) with GPU disabled or enabled
            _easyocr_reader = easyocr.Reader(['en'], gpu=False, verbose=False)
        except Exception as e:
            print(f"EasyOCR initialization warning: {e}")
            _easyocr_reader = None
    return _easyocr_reader


def preprocess_image(image_bytes: bytes) -> Tuple[Image.Image, Image.Image]:
    """
    Validates and preprocesses image:
    1. Loads with PIL in-memory.
    2. Resizes if excessively high resolution (>2500px) to prevent memory exhaustion.
    3. Generates an enhanced grayscale version for OCR clarity.
    """
    img = Image.open(io.BytesIO(image_bytes))
    if img.mode in ('RGBA', 'P', 'LA'):
        img = img.convert('RGB')

    # Clamp max dimension to 2400px while maintaining aspect ratio
    max_dim = 2400
    if max(img.size) > max_dim:
        img.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)

    # Enhance contrast and sharpness for OCR
    gray = img.convert('L')
    contrast_enhancer = ImageEnhance.Contrast(gray)
    enhanced = contrast_enhancer.enhance(1.8)
    sharp_enhancer = ImageEnhance.Sharpness(enhanced)
    processed = sharp_enhancer.enhance(1.5)

    return img, processed


def extract_raw_text(image_bytes: bytes, engine: str = "auto") -> Tuple[str, float]:
    """
    Extracts raw text and confidence score from image bytes using available OCR engine.
    """
    _, processed_img = preprocess_image(image_bytes)
    
    extracted_lines: List[str] = []
    confidences: List[float] = []

    # Strategy 1: Try EasyOCR if available
    reader = get_ocr_reader()
    if (engine in ("auto", "easyocr")) and reader is not None:
        try:
            # Convert PIL image to byte buffer for easyocr
            buf = io.BytesIO()
            processed_img.save(buf, format='PNG')
            buf.seek(0)
            results = reader.readtext(buf.read())
            for bbox, text, conf in results:
                if text.strip():
                    extracted_lines.append(text.strip())
                    confidences.append(float(conf))
            if extracted_lines:
                avg_conf = sum(confidences) / len(confidences) if confidences else 0.8
                return "\n".join(extracted_lines), avg_conf
        except Exception as e:
            print(f"EasyOCR error: {e}")

    # Strategy 2: Try PyTesseract if available
    if (engine in ("auto", "tesseract")) and PYTESSERACT_AVAILABLE:
        try:
            text = pytesseract.image_to_string(processed_img)
            lines = [l.strip() for l in text.splitlines() if l.strip()]
            if lines:
                return "\n".join(lines), 0.85
        except Exception as e:
            print(f"PyTesseract error: {e}")

    # Strategy 3: Fallback heuristic OCR simulation if no native OCR binary installed
    # (used for testing or minimal environments)
    return "", 0.0


def parse_receipt_text(raw_text: str, ocr_confidence: float = 0.85) -> ReceiptOCRResult:
    """
    Parses OCR text into structured vehicle expense metadata with explainable warnings.
    """
    warnings: List[str] = []
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    full_text = " ".join(lines)
    text_upper = full_text.upper()

    if not raw_text.strip():
        return ReceiptOCRResult(
            success=False,
            category="expense",
            merchant="Unrecognized Receipt",
            date=datetime.now().strftime("%Y-%m-%d"),
            total=None,
            confidence=0.0,
            rawText="",
            warnings=["No legible text could be extracted. Please take a clearer, well-lit photo of the receipt."]
        )

    # 1. Determine Category
    is_fuel = any(keyword in text_upper for keyword in [
        "PETROL", "DIESEL", "OCTANE", "AUTO DIESEL", "SUPER DIESEL", "LITRES", "LTRS",
        "PUMP", "NOZZLE", "CEYPETCO", "LAUGFS", "LIOC", "IOC", "SHELL", "FUEL"
    ])
    
    is_service = any(keyword in text_upper for keyword in [
        "SERVICE", "LUBRICANT", "ENGINE OIL", "OIL FILTER", "BRAKE", "ALIGNMENT",
        "WHEEL BALANCE", "LABOUR", "LABOR", "SPARK PLUG", "AUTO MIRAJ", "TOYOTA", "CAR CARE", "GARAGE"
    ])

    category = "fuel" if is_fuel else ("service" if is_service else "expense")

    # 2. Extract Merchant Name
    merchant = ""
    # Check known merchant brands first
    known_merchants = [
        ("CEYPETCO FILLING STATION", ["CEYPETCO", "CEYLON PETROLEUM"]),
        ("LAUGFS PETROLEUM", ["LAUGFS PETROL", "LAUGFS"]),
        ("LANKA IOC", ["LANKA IOC", "LIOC", "INDIAN OIL"]),
        ("AUTO MIRAJ CAR CARE", ["AUTO MIRAJ", "AUTOMIRAJ"]),
        ("TOYOTA LANKA", ["TOYOTA LANKA", "TOYOTA"]),
        ("LAUGFS CAR CARE", ["LAUGFS CAR CARE"]),
        ("CARE POINT SERVICE", ["CARE POINT"]),
        ("DIMO AUTOMOTIVE", ["DIMO"]),
        ("SHELL FILLING STATION", ["SHELL"]),
        ("MOBIL 1 SERVICE CENTRE", ["MOBIL", "MOBIL 1"]),
    ]
    for brand_name, triggers in known_merchants:
        if any(trig in text_upper for trig in triggers):
            merchant = brand_name
            break

    # If not recognized brand, pick top legible line that isn't a date or numbers
    if not merchant and lines:
        for candidate in lines[:3]:
            if len(candidate) >= 3 and not re.match(r'^[\d\s\:\/\-\.\,\$\€\£\¥]+$', candidate):
                merchant = candidate
                break

    if not merchant:
        merchant = "Unknown Merchant"
        warnings.append("Merchant / Station name could not be confidently identified.")

    # 3. Extract Date
    date_str = ""
    # Pattern 1: YYYY-MM-DD
    m1 = re.search(r'(\d{4})[-/.](0[1-9]|1[0-2])[-/.](0[1-9]|[12]\d|3[01])', full_text)
    if m1:
        g = m1.groups()
        date_str = f"{g[0]}-{int(g[1]):02d}-{int(g[2]):02d}"

    # Pattern 2: DD-Mon-YYYY (e.g., 02-Oct-2026 or 04 Oct 2026)
    if not date_str:
        m2 = re.search(r'(\d{1,2})[\s\-\/\.](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-\/\.](\d{2,4})', full_text, re.IGNORECASE)
        if m2:
            g = m2.groups()
            day = int(g[0])
            month_name = g[1][:3].title()
            year = int(g[2])
            if year < 100:
                year += 2000
            try:
                dt = datetime.strptime(f"{day} {month_name} {year}", "%d %b %Y")
                date_str = dt.strftime("%Y-%m-%d")
            except Exception:
                pass

    # Pattern 3: DD/MM/YYYY or DD-MM-YYYY
    if not date_str:
        m3 = re.search(r'(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](20\d{2})', full_text)
        if m3:
            g = m3.groups()
            date_str = f"{g[2]}-{int(g[1]):02d}-{int(g[0]):02d}"

    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
        warnings.append("Receipt date not clearly detected; defaulted to today's date.")

    # 4. Extract Total Amount
    # Common words preceding total
    total_val: Optional[float] = None
    total_patterns = [
        r'(?:NET\s*TOTAL|GRAND\s*TOTAL|TOTAL\s*AMOUNT|AMOUNT\s*DUE|TOTAL|AMOUNT|BALANCE\s*DUE|SALE)\s*[:=]?\s*(?:LKR|RS\.?|\$|EUR)?\s*([\d,]+\.?\d*)',
        r'(?:LKR|RS\.?)\s*([\d,]+\.\d{2})',
        r'TOTAL[\s\:]+([\d,]+)',
    ]

    for pat in total_patterns:
        match = re.search(pat, full_text, re.IGNORECASE)
        if match:
            raw_num = match.group(1).replace(",", "").strip()
            try:
                val = float(raw_num)
                if val > 0:
                    total_val = val
                    break
            except ValueError:
                pass

    # 5. Extract Litres and Unit Price (for Fuel)
    litres_val: Optional[float] = None
    price_per_litre_val: Optional[float] = None

    if is_fuel:
        # Litres pattern: e.g., "Vol: 35.00 L", "Litres: 28.5", "30.00 Ltr"
        litres_patterns = [
            r'(?:VOLUME|VOL|LITRES|LITRE|LTRS|LTR|QTY|QUANTITY)\s*[:=]?\s*(\d+\.?\d*)',
            r'(\d+\.\d{1,3})\s*(?:L|LTR|LITRES)\b',
        ]
        for pat in litres_patterns:
            match = re.search(pat, full_text, re.IGNORECASE)
            if match:
                try:
                    l_val = float(match.group(1))
                    if 1.0 <= l_val <= 300.0:
                        litres_val = l_val
                        break
                except ValueError:
                    pass

        # Price per litre pattern: e.g. "Rate: 370.00", "Price/L: 370.00", "Unit Price: 370"
        price_patterns = [
            r'(?:UNIT\s*PRICE|PRICE\s*/\s*L|PRICE\s*/\s*LTR|RATE|PRC)\s*[:=]?\s*(?:LKR|RS\.?|\$)?\s*(\d+\.?\d*)',
            r'@\s*(\d+\.?\d*)',
        ]
        for pat in price_patterns:
            match = re.search(pat, full_text, re.IGNORECASE)
            if match:
                try:
                    p_val = float(match.group(1))
                    if 50.0 <= p_val <= 2000.0:
                        price_per_litre_val = p_val
                        break
                except ValueError:
                    pass

        # If we have total and litres but not price_per_litre, calculate it!
        if total_val and litres_val and not price_per_litre_val:
            price_per_litre_val = round(total_val / litres_val, 2)
        # Or if we have total and price_per_litre but not litres, calculate it!
        elif total_val and price_per_litre_val and not litres_val:
            litres_val = round(total_val / price_per_litre_val, 2)

        if not litres_val:
            warnings.append("Fuel litres quantity could not be identified; please review fuel volume.")
        if not price_per_litre_val:
            warnings.append("Fuel unit price could not be identified; please review price/L.")

    # 6. Extract Service Specifics
    service_type: Optional[str] = None
    labour_cost: Optional[float] = None
    parts_cost: Optional[float] = None

    if is_service:
        if "OIL" in text_upper:
            service_type = "oil_change"
        elif "BRAKE" in text_upper:
            service_type = "brake_service"
        elif "TIRE" in text_upper or "TYRE" in text_upper:
            service_type = "tire_replacement"
        elif "BATTERY" in text_upper:
            service_type = "battery"
        else:
            service_type = "full_service"

        # Look for labour and parts breakdowns
        lab_match = re.search(r'(?:LABOUR|LABOR|CHARGES)\s*[:=]?\s*(?:LKR|RS\.?)?\s*([\d,]+\.?\d*)', full_text, re.IGNORECASE)
        if lab_match:
            try:
                labour_cost = float(lab_match.group(1).replace(",", ""))
            except ValueError:
                pass

        parts_match = re.search(r'(?:PARTS|MATERIALS)\s*[:=]?\s*(?:LKR|RS\.?)?\s*([\d,]+\.?\d*)', full_text, re.IGNORECASE)
        if parts_match:
            try:
                parts_cost = float(parts_match.group(1).replace(",", ""))
            except ValueError:
                pass

    if total_val is None:
        warnings.append("Total monetary amount could not be detected with high confidence; please enter manually.")
        ocr_confidence *= 0.6

    # Confidence calculation
    final_confidence = round(min(1.0, max(0.1, ocr_confidence if not warnings else ocr_confidence - (0.1 * len(warnings)))), 2)

    return ReceiptOCRResult(
        success=True,
        category=category,
        merchant=merchant,
        date=date_str,
        total=total_val,
        litres=litres_val,
        pricePerLitre=price_per_litre_val,
        serviceType=service_type,
        labourCost=labour_cost,
        partsCost=parts_cost,
        notes=f"Auto-extracted via FixMate OCR from {merchant}",
        confidence=final_confidence,
        rawText=raw_text,
        warnings=warnings
    )
