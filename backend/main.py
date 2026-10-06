"""
FixMate AI & OCR Backend API
Provides OCR extraction for receipt photos and verified read-only Assistant tools.
"""

import os
import io
import time
import base64
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException, Header, Depends, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from ocr_service import (
    extract_raw_text,
    parse_receipt_text,
    ReceiptOCRResult,
    EASYOCR_AVAILABLE,
    PYTESSERACT_AVAILABLE
)
from assistant_service import (
    OPENAI_AVAILABLE,
    AssistantChatRequest,
    AssistantChatResponse,
    process_assistant_chat,
)

app = FastAPI(
    title="FixMate Vehicle Intelligence Backend",
    description="FastAPI service for Receipt OCR, Expense Intelligence, and LLM Assistant Pair Programming.",
    version="1.0.0",
)

# CORS Configuration - allow local mobile app and web dev origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration from Environment
API_KEY = os.getenv("API_KEY", "")
MAX_IMAGE_SIZE_BYTES = int(os.getenv("MAX_IMAGE_SIZE_MB", "10")) * 1024 * 1024
RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))

# Simple in-memory IP Rate Limiter
_request_history: Dict[str, List[float]] = {}


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    # Exempt health checks from rate limiting
    if request.url.path in ("/health", "/docs", "/openapi.json"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    
    timestamps = _request_history.get(client_ip, [])
    # Filter out requests older than 60 seconds
    timestamps = [t for t in timestamps if now - t < 60]
    
    if len(timestamps) >= RATE_LIMIT_PER_MINUTE:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"detail": "Rate limit exceeded. Please wait a moment before retrying."}
        )
    
    timestamps.append(now)
    _request_history[client_ip] = timestamps
    
    return await call_next(request)


def verify_api_key(x_api_key: Optional[str] = Header(None)):
    """
    Validates the API key if configured in the environment.
    """
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header"
        )
    return True


class Base64ReceiptPayload(BaseModel):
    imageBase64: str = Field(description="Base64 encoded JPEG/PNG image data")
    fileName: Optional[str] = Field(default="receipt.jpg")


# -------------------------------------------------------------
# 1. Health & Status
# -------------------------------------------------------------
@app.get("/health", tags=["System"])
async def health_check():
    engine_name = "easyocr" if EASYOCR_AVAILABLE else ("pytesseract" if PYTESSERACT_AVAILABLE else "heuristic_fallback")
    openai_key = os.getenv("OPENAI_API_KEY", "")
    is_llm_active = bool(openai_key and OPENAI_AVAILABLE)
    llm_provider = "openai_gpt4o_mini" if is_llm_active else "deterministic_rules"
    return {
        "status": "ok",
        "service": "FixMate Vehicle Intelligence Backend",
        "version": "1.0.0",
        "ocr_engine": engine_name,
        "is_llm_active": is_llm_active,
        "llm_provider": llm_provider,
        "timestamp": datetime.now().isoformat(),
    }


# -------------------------------------------------------------
# 2. Receipt OCR Endpoint (Multipart / UploadFile)
# -------------------------------------------------------------
@app.post("/ocr/receipt", response_model=ReceiptOCRResult, tags=["OCR"])
async def scan_receipt_file(
    file: UploadFile = File(...),
    auth: bool = Depends(verify_api_key)
):
    """
    Accepts an uploaded receipt image, performs OCR text recognition,
    and returns structured metadata suggestions (merchant, date, total, litres, price/L).
    No images are permanently saved on disk.
    """
    # 1. Validate content type
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if file.content_type and file.content_type.lower() not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. Please upload a JPEG, PNG, or WebP image."
        )

    # 2. Read and validate file size
    image_bytes = await file.read()
    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image exceeds maximum size of {MAX_IMAGE_SIZE_BYTES // (1024*1024)} MB."
        )
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty."
        )

    # 3. Perform OCR Extraction
    try:
        raw_text, confidence = extract_raw_text(image_bytes)
        parsed = parse_receipt_text(raw_text, ocr_confidence=confidence)
        return parsed
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR processing failed: {str(e)}"
        )


# -------------------------------------------------------------
# 3. Receipt OCR Endpoint (Base64 JSON)
# -------------------------------------------------------------
@app.post("/ocr/receipt/base64", response_model=ReceiptOCRResult, tags=["OCR"])
async def scan_receipt_base64(
    payload: Base64ReceiptPayload,
    auth: bool = Depends(verify_api_key)
):
    """
    Alternative endpoint accepting Base64 encoded images directly from mobile devices.
    """
    try:
        # Strip header if present (e.g. data:image/jpeg;base64,...)
        raw_b64 = payload.imageBase64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]

        image_bytes = base64.b64decode(raw_b64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 string provided."
        )

    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image exceeds maximum size of {MAX_IMAGE_SIZE_BYTES // (1024*1024)} MB."
        )

    raw_text, confidence = extract_raw_text(image_bytes)
    return parse_receipt_text(raw_text, ocr_confidence=confidence)


# -------------------------------------------------------------
# 4. Read-Only Vehicle Assistant Endpoint
# -------------------------------------------------------------
@app.post("/assistant/chat", response_model=AssistantChatResponse, tags=["AI Assistant"])
async def assistant_chat_endpoint(
    payload: AssistantChatRequest,
    auth: bool = Depends(verify_api_key)
):
    """
    Read-only Copilot endpoint. Calculates exact facts deterministically,
    and returns human-friendly explanations with confirmed draft action suggestions.
    """
    return await process_assistant_chat(payload)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    print(f"Starting FixMate Backend on http://{host}:{port} ...")
    uvicorn.run("main:app", host=host, port=port, reload=True)
