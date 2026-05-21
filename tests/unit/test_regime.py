"""
Unit tests — get_regime()
NK AR 2026: Maddə 218-220, 218.5, 101, 102
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from src.tax_engine.regime import get_regime, is_simplified_allowed, is_exempt75_eligible


# ── TICARƏT — 2% ──────────────────────────────────────────
class TestTrade:
    def test_clothing_store(self):
        r = get_regime("47711")
        assert r["regime"] == "SIMPLIFIED_2"
        assert r["rate"] == "2%"
        assert r["found"] is True

    def test_food_retail(self):
        r = get_regime("47111")
        assert r["regime"] == "SIMPLIFIED_2"
        assert "218" in r["articles"]

    def test_wholesale(self):
        r = get_regime("46310")
        assert r["regime"] == "SIMPLIFIED_2"
        assert r["simplified_allowed"] is True

    def test_trade_exempt75_eligible(self):
        assert is_exempt75_eligible("47711") is True
        assert is_exempt75_eligible("47210") is True


# ── XİDMƏTLƏR — 4% ───────────────────────────────────────
class TestServices:
    def test_restaurant(self):
        r = get_regime("56100")
        assert r["regime"] == "SIMPLIFIED_4"
        assert r["rate"] == "4%"

    def test_barbershop(self):
        r = get_regime("96020")
        assert r["regime"] == "SIMPLIFIED_4"
        assert r["simplified_allowed"] is True

    def test_tourism(self):
        r = get_regime("79110")
        assert r["regime"] == "SIMPLIFIED_4"
        assert r["exempt75_eligible"] is True

    def test_taxi(self):
        r = get_regime("49320")
        assert r["regime"] == "SIMPLIFIED_4"
        assert r["found"] is True


# ── QADAĞAN — Maddə 218.5 ─────────────────────────────────
class TestExcluded:
    def test_construction_banned(self):
        r = get_regime("41200")
        assert r["regime"] == "EXCLUDED_SIMPLIFIED"
        assert r["simplified_allowed"] is False
        assert "218.5" in r["articles"]

    def test_electrical_works_banned(self):
        r = get_regime("43211")
        assert r["regime"] == "EXCLUDED_SIMPLIFIED"
        assert r["simplified_allowed"] is False

    def test_freight_transport_banned(self):
        r = get_regime("49411")
        assert r["regime"] == "EXCLUDED_SIMPLIFIED"
        assert r["exempt75_eligible"] is False

    def test_bank_banned(self):
        r = get_regime("64190")
        assert r["regime"] == "EXCLUDED_SIMPLIFIED"
        assert r["simplified_allowed"] is False


# ── NEFT/QAZ ──────────────────────────────────────────────
class TestOilGas:
    def test_oil_extraction(self):
        r = get_regime("06100")
        assert r["regime"] == "OIL_GAS"
        assert r["simplified_allowed"] is False
        assert r["exempt75_eligible"] is False

    def test_gas_extraction(self):
        r = get_regime("06200")
        assert r["regime"] == "OIL_GAS"
        assert "218.5" in r["articles"]


# ── AKSİZ ─────────────────────────────────────────────────
class TestExcise:
    def test_alcohol(self):
        r = get_regime("11011")
        assert r["regime"] == "EXCISE"
        assert r["simplified_allowed"] is False
        assert r["exempt75_eligible"] is False

    def test_tobacco(self):
        r = get_regime("12000")
        assert r["regime"] == "EXCISE"
        assert "190" in r["articles"]


# ── IT SEKTORU — 5% ───────────────────────────────────────
class TestIT:
    def test_software_development(self):
        r = get_regime("62010")
        assert r["regime"] == "IT_SPECIAL"
        assert r["rate"] == "5% (2032-ə qədər)"
        assert "101" in r["articles"]

    def test_it_consulting(self):
        r = get_regime("62021")
        assert r["regime"] == "IT_SPECIAL"
        assert r["simplified_allowed"] is False

    def test_it_not_exempt75(self):
        assert is_exempt75_eligible("62010") is False


# ── MEDİA — 0% (6 il) ─────────────────────────────────────
class TestMedia:
    def test_book_publishing(self):
        r = get_regime("58110")
        assert r["regime"] == "MEDIA_EXEMPT"
        assert r["rate"] == "0% (6 il)"
        assert "102" in r["articles"]

    def test_newspaper(self):
        r = get_regime("58130")
        assert r["regime"] == "MEDIA_EXEMPT"
        assert r["simplified_allowed"] is False


# ── GÜZƏŞT 75% ────────────────────────────────────────────
class TestExempt75:
    def test_eligible_codes(self):
        eligible = ["47711", "56100", "96020", "85312", "79110"]
        for code in eligible:
            assert is_exempt75_eligible(code) is True, f"{code} should be eligible"

    def test_not_eligible_codes(self):
        not_eligible = ["41200", "06100", "11011", "62010", "64190"]
        for code in not_eligible:
            assert is_exempt75_eligible(code) is False, f"{code} should NOT be eligible"


# ── SƏHV KODLAR ───────────────────────────────────────────
class TestEdgeCases:
    def test_unknown_code(self):
        r = get_regime("99999")
        assert r["found"] is False
        assert r["regime"] == "UNKNOWN"

    def test_invalid_format_short(self):
        with pytest.raises(ValueError):
            get_regime("123")

    def test_invalid_format_letters(self):
        with pytest.raises(ValueError):
            get_regime("ABCDE")

    def test_invalid_format_empty(self):
        with pytest.raises(ValueError):
            get_regime("")

    def test_string_input(self):
        r = get_regime("47711")
        assert r["found"] is True

    def test_whitespace_stripped(self):
        r = get_regime(" 47711 ")
        assert r["found"] is True
