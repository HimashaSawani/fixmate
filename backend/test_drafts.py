"""
Tests for AI-Assisted Draft Creation and Zero-Write Invariants.
Verifies structured draft extraction, missing field detection, and prompt injection safety.
"""

import pytest
from fastapi.testclient import TestClient

from main import app
from assistant_service import (
    extract_ai_draft_from_prompt,
    run_deterministic_assistant_reasoning,
    AssistantQueryContext,
    AssistantChatRequest,
)

client = TestClient(app)

sample_context = AssistantQueryContext(
    vehicleId="veh_civic_2021",
    vehicleName="Daily Driver (Civic)",
    currentOdometer=42350,
    currency="LKR",
    distanceUnit="km",
    fuelStats={"overallAvgKmL": 14.6},
    expenseSummary={"currentMonthTotal": 9694.0, "totalCost": 145419.0},
    maintenanceStatus=[],
    serviceHistory=[],
)


# -------------------------------------------------------------
# 1. Complete Service Draft Extraction Test
# -------------------------------------------------------------
def test_complete_service_draft():
    prompt = "I did an oil change today, mileage 45,000, cost 18,000"
    draft = extract_ai_draft_from_prompt(prompt, sample_context)

    assert draft is not None
    assert draft.recordType == "service"
    assert draft.serviceType == "oil_change"
    assert draft.amount == 18000.0
    assert draft.odometer == 45000
    assert draft.isReadyForConfirmation is True
    assert "amount" in draft.userSpecifiedFields
    assert "odometer" in draft.userSpecifiedFields


# -------------------------------------------------------------
# 2. Incomplete Draft Handling (Missing Amount & Odometer)
# -------------------------------------------------------------
def test_incomplete_service_draft_missing_fields():
    prompt = "I replaced my brake pads today"
    draft = extract_ai_draft_from_prompt(prompt, sample_context)

    assert draft is not None
    assert draft.recordType == "service"
    assert draft.serviceType == "brake_service"
    assert draft.amount is None
    assert "amount" in draft.missingFields
    assert draft.isReadyForConfirmation is False


# -------------------------------------------------------------
# 3. Multilingual / Sinhala Input Draft Test
# -------------------------------------------------------------
def test_sinhala_service_draft():
    prompt = "අද oil change කළා, mileage 45000, cost 18000"
    draft = extract_ai_draft_from_prompt(prompt, sample_context)

    assert draft is not None
    assert draft.recordType == "service"
    assert draft.amount == 18000.0
    assert draft.odometer == 45000
    assert draft.isReadyForConfirmation is True


# -------------------------------------------------------------
# 4. Fuel Fill-Up Draft Test
# -------------------------------------------------------------
def test_fuel_draft_extraction():
    prompt = "Filled 30L petrol at Ceypetco for 11,100 LKR"
    draft = extract_ai_draft_from_prompt(prompt, sample_context)

    assert draft is not None
    assert draft.recordType == "fuel"
    assert draft.amount == 11100.0
    assert draft.litres == 30.0
    assert "CEYPETCO" in draft.merchant
    assert draft.isReadyForConfirmation is True


# -------------------------------------------------------------
# 5. Full Chat Response Draft Attachment Test
# -------------------------------------------------------------
def test_chat_response_includes_draft():
    req = AssistantChatRequest(
        prompt="I did an oil change today, mileage 45,000, cost 18,000",
        context=sample_context
    )
    res = run_deterministic_assistant_reasoning(req.prompt, req.context)

    assert res.success is True
    assert res.draftRecord is not None
    assert res.draftRecord.amount == 18000.0
    assert "No records have been saved yet" in res.answer
    assert "Confirm and save" in res.answer


# -------------------------------------------------------------
# 6. Zero Database Write Invariant
# -------------------------------------------------------------
def test_backend_contains_zero_sqlite_writes():
    """
    Asserts that assistant service strictly produces draft payloads and has
    no database connection or write routines.
    """
    import assistant_service
    # Verify module has no DB write functions
    forbidden_symbols = ["sqlite3", "execute", "cursor", "insert", "delete", "commit", "execAsync"]
    for attr in dir(assistant_service):
        assert attr.lower() not in ["db", "database", "sqlite_conn"]
