"""
Unit tests — DSMF + Medical Insurance
NK AR 2026: Maddə 14.5.1 (yeni formula 01.01.2026-dan)
"""

import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))
from src.tax_engine.calculator import calc_dsmf, calc_dsmf_period, calc_medical_ip, calc_total_burden


# ── DSMF — ƏSAS HESABLAMA ────────────────────────────────
class TestDsmf:
    def test_floor_applied_1200(self):
        # 2% × 1200 = 24 < 60 → floor
        r = calc_dsmf(1200)
        assert r["dsmf_amount"] == 60
        assert r["floor_applied"] is True
        assert r["cap_applied"] is False

    def test_floor_applied_zero(self):
        r = calc_dsmf(0)
        assert r["dsmf_amount"] == 60
        assert r["floor_applied"] is True

    def test_floor_boundary_3000(self):
        # 2% × 3000 = 60 = floor exactly
        r = calc_dsmf(3000)
        assert r["dsmf_amount"] == 60
        assert r["floor_applied"] is False

    def test_normal_range_7500(self):
        # 2% × 7500 = 150
        r = calc_dsmf(7500)
        assert r["dsmf_amount"] == 150.0
        assert r["floor_applied"] is False
        assert r["cap_applied"] is False

    def test_normal_range_2000(self):
        # 2% × 2000 = 40 < 60 → floor
        r = calc_dsmf(2000)
        assert r["dsmf_amount"] == 60
        assert r["floor_applied"] is True

    def test_cap_applied_20000(self):
        # 2% × 20000 = 400 = cap exactly
        r = calc_dsmf(20000)
        assert r["dsmf_amount"] == 400
        assert r["cap_applied"] is False

    def test_cap_applied_25000(self):
        # 2% × 25000 = 500 > 400 → cap
        r = calc_dsmf(25000)
        assert r["dsmf_amount"] == 400
        assert r["cap_applied"] is True

    def test_cap_applied_100000(self):
        r = calc_dsmf(100000)
        assert r["dsmf_amount"] == 400
        assert r["cap_applied"] is True

    def test_negative_raises(self):
        with pytest.raises(ValueError):
            calc_dsmf(-100)

    def test_article_reference(self):
        r = calc_dsmf(5000)
        assert r["article"] == "14.5.1"


# ── DSMF — DÖVRƏ HESABLAMA ───────────────────────────────
class TestDsmfPeriod:
    def test_april_may_from_playbook(self):
        # Эталонный кейс из playbook-чата
        r = calc_dsmf_period([7500, 2000])
        assert r["total_dsmf"] == 210.0
        assert r["total_revenue"] == 9500.0
        assert r["month_count"] == 2

    def test_per_month_not_aggregate(self):
        # КРИТИЧНО: 9500 × 2% = 190 ≠ 210
        # Правильно: 150 + 60 = 210
        r = calc_dsmf_period([7500, 2000])
        assert r["total_dsmf"] == 210.0
        assert r["total_dsmf"] != round(9500 * 0.02, 2)

    def test_three_months(self):
        # 3000 → 60, 7500 → 150, 25000 → 400
        r = calc_dsmf_period([3000, 7500, 25000])
        assert r["total_dsmf"] == 610.0
        assert r["month_count"] == 3

    def test_all_floor(self):
        # Все месяцы ниже порога
        r = calc_dsmf_period([1000, 1000, 1000])
        assert r["total_dsmf"] == 180.0

    def test_all_cap(self):
        # Все месяцы выше максимума
        r = calc_dsmf_period([30000, 30000])
        assert r["total_dsmf"] == 800.0

    def test_single_month(self):
        r = calc_dsmf_period([7500])
        assert r["total_dsmf"] == 150.0
        assert r["month_count"] == 1


# ── TİBBİ SIĞORTA ─────────────────────────────────────────
class TestMedicalIp:
    def test_one_month(self):
        r = calc_medical_ip(1)
        assert r["monthly_amount"] == 16.0
        assert r["total_amount"] == 16.0

    def test_two_months(self):
        r = calc_medical_ip(2)
        assert r["total_amount"] == 32.0

    def test_twelve_months(self):
        r = calc_medical_ip(12)
        assert r["total_amount"] == 192.0

    def test_invalid_months(self):
        with pytest.raises(ValueError):
            calc_medical_ip(0)


# ── TAM VERGİ YÜKÜ ────────────────────────────────────────
class TestTotalBurden:
    def test_reklam_april_may_playbook(self):
        # Эталонный кейс: реклама [73110], апрель+май
        r = calc_total_burden([7500, 2000], "73110", year=2026)
        assert r["breakdown"]["dsmf"]["amount"] == 210.0
        assert r["breakdown"]["medical"]["amount"] == 32.0
        assert r["total_burden"] == 622.0

    def test_total_is_sum_of_parts(self):
        r = calc_total_burden([7500, 2000], "73110", year=2026)
        parts = sum(v["amount"] for v in r["breakdown"].values())
        assert abs(r["total_burden"] - parts) < 0.01

    def test_two_months_count(self):
        r = calc_total_burden([7500, 2000], "73110", year=2026)
        assert r["period_months"] == 2
        assert r["total_revenue"] == 9500

    def test_effective_rate_reasonable(self):
        r = calc_total_burden([7500, 2000], "73110", year=2026)
        rate = float(r["effective_rate_pct"].replace("%", ""))
        assert 4.0 < rate < 10.0
