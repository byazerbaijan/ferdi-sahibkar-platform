"""
Unit tests — Tax Calculator
NK AR 2026: Maddə 218-220, 101, 102.1
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from src.tax_engine.calculator import (
    calculate_simplified,
    calculate_income_tax,
    check_exempt75
)


# ── SADƏLƏŞDİRİLMİŞ VERGİ — 2% TİCARƏT ─────────────────
class TestSimplifiedTrade:
    def test_basic_2pct(self):
        r = calculate_simplified(10000, "47711")
        assert r["tax_amount"] == 200.0
        assert r["rate"] == 0.02
        assert r["allowed"] is True

    def test_36000_income(self):
        r = calculate_simplified(36000, "47711")
        assert r["tax_amount"] == 720.0

    def test_zero_income(self):
        r = calculate_simplified(0, "47711")
        assert r["tax_amount"] == 0.0
        assert r["allowed"] is True

    def test_threshold_199999(self):
        r = calculate_simplified(199999, "47711")
        assert r["tax_amount"] == round(199999 * 0.02, 2)
        assert r["allowed"] is True

    def test_negative_income_raises(self):
        with pytest.raises(ValueError):
            calculate_simplified(-100, "47711")

    def test_wholesale_2pct(self):
        r = calculate_simplified(50000, "46310")
        assert r["rate"] == 0.02
        assert r["tax_amount"] == 1000.0


# ── SADƏLƏŞDİRİLMİŞ VERGİ — 4% XİDMƏTLƏR ───────────────
class TestSimplifiedServices:
    def test_basic_4pct(self):
        r = calculate_simplified(10000, "56100")
        assert r["tax_amount"] == 400.0
        assert r["rate"] == 0.04
        assert r["allowed"] is True

    def test_restaurant_20000(self):
        r = calculate_simplified(20000, "56100")
        assert r["tax_amount"] == 800.0

    def test_barbershop(self):
        r = calculate_simplified(15000, "96020")
        assert r["rate"] == 0.04
        assert r["tax_amount"] == 600.0

    def test_taxi(self):
        r = calculate_simplified(24000, "49320")
        assert r["tax_amount"] == 960.0


# ── SADƏLƏŞDİRİLMİŞ QADAĞAN — Maddə 218.5 ───────────────
class TestSimplifiedForbidden:
    def test_construction_forbidden(self):
        r = calculate_simplified(50000, "41200")
        assert r["allowed"] is False
        assert r["tax_amount"] == 0

    def test_freight_forbidden(self):
        r = calculate_simplified(30000, "49411")
        assert r["allowed"] is False

    def test_bank_forbidden(self):
        r = calculate_simplified(100000, "64190")
        assert r["allowed"] is False

    def test_oil_forbidden(self):
        r = calculate_simplified(500000, "06100")
        assert r["allowed"] is False


# ── GƏLİR VERGİSİ 2026 — Maddə 101 ──────────────────────
class TestIncomeTax2026:
    def test_bracket_1_low(self):
        # 0–2500 AZN → 3%
        r = calculate_income_tax(1000, 2026)
        assert r["tax_amount"] == 30.0
        assert r["net_income"] == 970.0

    def test_bracket_1_max(self):
        # 2500 AZN → 3%
        r = calculate_income_tax(2500, 2026)
        assert r["tax_amount"] == 75.0

    def test_bracket_2_mid(self):
        # 3000 AZN → 75 + (3000-2500)*10% = 125
        r = calculate_income_tax(3000, 2026)
        assert r["tax_amount"] == 125.0
        assert r["net_income"] == 2875.0

    def test_bracket_3_high(self):
        # 10000 AZN → 625 + (10000-8000)*14% = 905
        r = calculate_income_tax(10000, 2026)
        assert r["tax_amount"] == 905.0
        assert r["net_income"] == 9095.0

    def test_zero_income(self):
        r = calculate_income_tax(0, 2026)
        assert r["tax_amount"] == 0.0
        assert r["net_income"] == 0.0

    def test_annual_calculation(self):
        r = calculate_income_tax(3000, 2026)
        assert r["annual_tax"] == round(r["tax_amount"] * 12, 2)


# ── GƏLİR VERGİSİ 2027 ───────────────────────────────────
class TestIncomeTax2027:
    def test_bracket_1_rate_5pct(self):
        # 2027: 0–2500 → 5%
        r = calculate_income_tax(1000, 2027)
        assert r["tax_amount"] == 50.0
        assert r["year"] == 2027

    def test_bracket_2_mid(self):
        # 3000 AZN → 125 + (3000-2500)*10% = 175
        r = calculate_income_tax(3000, 2027)
        assert r["tax_amount"] == 175.0


# ── GƏLİR VERGİSİ 2028 ───────────────────────────────────
class TestIncomeTax2028:
    def test_bracket_1_rate_7pct(self):
        # 2028: 0–2500 → 7%
        r = calculate_income_tax(1000, 2028)
        assert r["tax_amount"] == 70.0
        assert r["year"] == 2028

    def test_bracket_2_mid(self):
        # 3000 AZN → 175 + (3000-2500)*10% = 225
        r = calculate_income_tax(3000, 2028)
        assert r["tax_amount"] == 225.0


# ── GÜZƏŞT 75% — Maddə 102.1 ─────────────────────────────
class TestExempt75:
    def test_fully_eligible(self):
        r = check_exempt75(36000, "47711", employees=3)
        assert r["eligible"] is True
        assert r["saving"] == 540.0
        assert r["tax_with_exempt"] == 180.0

    def test_saving_is_75pct(self):
        r = check_exempt75(36000, "47711", employees=3)
        assert r["saving_pct"] == "75%"

    def test_income_limit_exact(self):
        # Exactly 45,000 — still eligible
        r = check_exempt75(45000, "47711", employees=3)
        assert r["eligible"] is True

    def test_income_over_limit(self):
        # 45,001 — not eligible
        r = check_exempt75(45001, "47711", employees=3)
        assert r["eligible"] is False
        assert r["conditions_met"]["income_ok"] is False

    def test_not_enough_employees(self):
        r = check_exempt75(36000, "47711", employees=2)
        assert r["eligible"] is False
        assert r["conditions_met"]["employees_ok"] is False

    def test_has_social_debt(self):
        r = check_exempt75(36000, "47711", employees=3, has_social_debt=True)
        assert r["eligible"] is False
        assert r["conditions_met"]["no_debt_ok"] is False

    def test_forbidden_regime(self):
        # Construction — exempt75 not applicable
        r = check_exempt75(30000, "41200", employees=5)
        assert r["eligible"] is False
        assert r["conditions_met"]["regime_ok"] is False

    def test_multiple_conditions_failed(self):
        # High income + not enough employees
        r = check_exempt75(60000, "47711", employees=1)
        assert r["eligible"] is False
        assert r["conditions_met"]["income_ok"] is False
        assert r["conditions_met"]["employees_ok"] is False

    def test_zero_employees(self):
        r = check_exempt75(36000, "47711", employees=0)
        assert r["eligible"] is False

    def test_saving_zero_when_not_eligible(self):
        r = check_exempt75(60000, "47711", employees=3)
        assert r["saving"] == 0
