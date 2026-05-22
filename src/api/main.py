"""
Fərdi Sahibkar — Tax Autopilot API
Version: 1.0
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from src.tax_engine.regime import get_regime
from src.tax_engine.calculator import (
    calculate_simplified,
    calculate_income_tax,
    check_exempt75,
    calc_dsmf,
    calc_medical_ip,
    calc_total_burden
)
from src.tax_engine.optimizer import optimize

app = FastAPI(
    title="Fərdi Sahibkar — Tax Autopilot API",
    description="API for tax calculation and optimization for Azerbaijan individual entrepreneurs",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────────────────────

class TaxCalculateRequest(BaseModel):
    kvad_code: str = Field(..., description="5-digit KVƏD activity code", example="47711")
    annual_income: float = Field(..., description="Annual income in AZN", example=36000)
    employees: int = Field(0, description="Number of employees", example=3)
    has_social_debt: bool = Field(False, description="Has social insurance debt")
    year: Optional[int] = Field(None, description="Tax year (default: current year)")

class MonthlyBurdenRequest(BaseModel):
    kvad_code: str = Field(..., example="73110")
    monthly_revenues: list[float] = Field(..., description="List of monthly revenues", example=[7500, 2000])
    employees: int = Field(0, example=0)
    has_social_debt: bool = Field(False)
    year: Optional[int] = Field(None)

class DsmfRequest(BaseModel):
    monthly_revenue: float = Field(..., description="Monthly revenue in AZN", example=7500)

class RegimeRequest(BaseModel):
    kvad_code: str = Field(..., description="5-digit KVƏD code", example="47711")


# ─────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "Fərdi Sahibkar — Tax Autopilot API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "legal_base": "NK AR 2026 — e-qanun.az/framework/46948"
    }


@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.get("/v1/kvad/{code}")
def get_kvad_regime(code: str):
    """
    Returns tax regime info for a given KVƏD code.
    """
    try:
        result = get_regime(code)
        return {
            "success": True,
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/v1/tax/calculate")
def calculate_tax(req: TaxCalculateRequest):
    """
    Main endpoint — calculates optimal tax regime and full breakdown.
    Accepts KVƏD code + income + employees → returns best regime + all options.
    """
    try:
        result = optimize(
            annual_income=req.annual_income,
            kvad_code=req.kvad_code,
            employees=req.employees,
            has_social_debt=req.has_social_debt,
            year=req.year
        )
        return {
            "success": True,
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Calculation error: {str(e)}")


@app.post("/v1/tax/burden")
def calculate_burden(req: MonthlyBurdenRequest):
    """
    Calculates full monthly tax burden: simplified + DSMF + medical insurance.
    Pass list of monthly revenues for accurate per-month DSMF calculation.
    """
    try:
        result = calc_total_burden(
            monthly_revenues=req.monthly_revenues,
            kvad_code=req.kvad_code,
            employees=req.employees,
            has_social_debt=req.has_social_debt,
            year=req.year
        )
        return {
            "success": True,
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/v1/dsmf/calculate")
def calculate_dsmf(req: DsmfRequest):
    """
    Calculates DSMF (social insurance) for a single month.
    Formula: 2% of revenue, min 60 AZN, max 400 AZN (Article 14.5.1, from 01.01.2026).
    """
    try:
        result = calc_dsmf(req.monthly_revenue)
        return {
            "success": True,
            "data": result
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/v1/regime/check")
def check_regime(req: RegimeRequest):
    """
    Quick check — returns tax regime for a KVƏD code.
    Useful for onboarding validation.
    """
    try:
        result = get_regime(req.kvad_code)
        return {
            "success": True,
            "data": {
                "kvad_code": result["code"],
                "activity": result["name"],
                "regime": result["regime"],
                "label": result["label"],
                "rate": result["rate"],
                "simplified_allowed": result["simplified_allowed"],
                "exempt75_eligible": result["exempt75_eligible"],
                "articles": result["articles"]
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
