"""
Tax Calculator — Vergi Kalkulyatoru
NK AR 2026: Maddə 218-220 (sadələşdirilmiş), 101 (gəlir vergisi)
"""

import yaml
import os
from datetime import datetime
from src.tax_engine.regime import get_regime

# Load tax rates once at startup
_BASE = os.path.dirname(os.path.abspath(__file__))
_RATES_PATH = os.path.join(_BASE, "data", "tax_rates.yaml")

with open(_RATES_PATH, encoding="utf-8") as f:
    _RATES = yaml.safe_load(f)


def _current_year() -> int:
    return datetime.now().year


# ─────────────────────────────────────────────────────────
# SADƏLƏŞDIRILMIŞ VERGİ — Maddə 218-220
# ─────────────────────────────────────────────────────────

def calculate_simplified(annual_income: float, kvad_code: str) -> dict:
    """
    Calculates simplified tax for a given income and KVƏD code.

    Args:
        annual_income: Annual income in AZN
        kvad_code: 5-digit KVƏD code

    Returns:
        {
            "annual_income": float,
            "tax_amount": float,
            "rate": float,
            "regime": str,
            "allowed": bool,
            "reason": str,
            "articles": list
        }
    """
    if annual_income < 0:
        raise ValueError("Gəlir mənfi ola bilməz")

    regime_info = get_regime(kvad_code)

    # Check if simplified tax is allowed
    if not regime_info["simplified_allowed"]:
        return {
            "annual_income": annual_income,
            "tax_amount": 0,
            "rate": 0,
            "regime": regime_info["regime"],
            "allowed": False,
            "reason": f"[{kvad_code}] üçün sadələşdirilmiş vergi qadağandır — {regime_info['label']}",
            "articles": regime_info["articles"]
        }

    rates = _RATES["simplified_tax"]

    if regime_info["regime"] == "SIMPLIFIED_2":
        rate = rates["trade"]["rate"]
        regime_label = rates["trade"]["description"]
    else:
        rate = rates["services"]["rate"]
        regime_label = rates["services"]["description"]

    tax_amount = round(annual_income * rate, 2)

    return {
        "annual_income": annual_income,
        "tax_amount": tax_amount,
        "rate": rate,
        "rate_pct": f"{int(rate * 100)}%",
        "regime": regime_info["regime"],
        "regime_label": regime_label,
        "allowed": True,
        "reason": "Sadələşdirilmiş vergi tətbiq edilir",
        "articles": regime_info["articles"],
        "kvad_code": kvad_code,
        "kvad_name": regime_info["name"]
    }


# ─────────────────────────────────────────────────────────
# GƏLİR VERGİSİ — Maddə 101 (progressiv şkala)
# ─────────────────────────────────────────────────────────

def calculate_income_tax(monthly_income: float, year: int = None) -> dict:
    """
    Calculates progressive income tax based on monthly income.
    Rate changes every year — reads from tax_rates.yaml.

    Args:
        monthly_income: Monthly income in AZN
        year: Tax year (defaults to current year)

    Returns:
        {
            "monthly_income": float,
            "tax_amount": float,
            "net_income": float,
            "rate_applied": float,
            "year": int,
            "bracket": str,
            "annual_tax": float
        }
    """
    if monthly_income < 0:
        raise ValueError("Gəlir mənfi ola bilməz")

    year = year or _current_year()
    year_str = str(year)

    # Fallback: use 2028 rates for future years
    available_years = _RATES["income_tax"]
    # YAML loads keys as integers — try int first, then string
    year_key = year if year in available_years else str(year)
    if year_key not in available_years:
        year_key = max(available_years.keys())

    brackets = available_years[year_key]["brackets"]
    income = monthly_income
    tax = 0.0
    bracket_label = ""

    for b in brackets:
        if b["to"] is None:
            # Last bracket — no upper limit
            if income > b["from"]:
                tax = round(eval(
                    b["formula"].replace("income", str(income))
                ), 2)
                bracket_label = f"{b['from']}+ AZN → {int(b['rate']*100)}%"
            break
        elif b["from"] <= income <= b["to"]:
            tax = round(eval(
                b["formula"].replace("income", str(income))
            ), 2)
            bracket_label = f"{b['from']}–{b['to']} AZN → {int(b['rate']*100)}%"
            break

    net = round(monthly_income - tax, 2)
    effective_rate = round(tax / monthly_income, 4) if monthly_income > 0 else 0

    return {
        "monthly_income": monthly_income,
        "tax_amount": tax,
        "net_income": net,
        "effective_rate": effective_rate,
        "effective_rate_pct": f"{round(effective_rate * 100, 1)}%",
        "year": int(year_str),
        "bracket": bracket_label,
        "annual_tax": round(tax * 12, 2),
        "annual_net": round(net * 12, 2),
        "article": "101"
    }


# ─────────────────────────────────────────────────────────
# GÜZƏŞT 75% — Maddə 102.1
# ─────────────────────────────────────────────────────────

def check_exempt75(
    annual_income: float,
    kvad_code: str,
    employees: int,
    has_social_debt: bool = False
) -> dict:
    """
    Checks eligibility for 75% tax exemption (Article 102.1 NK AR).

    Conditions:
        1. Annual income ≤ 45,000 AZN
        2. Average employees ≥ 3
        3. No social insurance debt

    Args:
        annual_income: Annual income in AZN
        kvad_code: 5-digit KVƏD code
        employees: Average number of employees
        has_social_debt: Whether there is social insurance debt

    Returns:
        {
            "eligible": bool,
            "conditions_met": dict,
            "tax_without_exempt": float,
            "tax_with_exempt": float,
            "saving": float,
            "reason": str
        }
    """
    cfg = _RATES["exempt_75"]
    regime_info = get_regime(kvad_code)

    conditions = {
        "income_ok": annual_income <= cfg["max_annual_income_azn"],
        "employees_ok": employees >= cfg["min_employees"],
        "no_debt_ok": not has_social_debt,
        "regime_ok": regime_info["exempt75_eligible"]
    }

    eligible = all(conditions.values())

    # Calculate tax impact
    tax_full = calculate_simplified(annual_income, kvad_code)
    tax_without = tax_full["tax_amount"] if tax_full["allowed"] else 0

    if eligible:
        taxable_income = annual_income * (1 - cfg["exempt_ratio"])
        rate = tax_full["rate"] if tax_full["allowed"] else 0
        tax_with = round(taxable_income * rate, 2)
        saving = round(tax_without - tax_with, 2)
        reason = "✅ 75% güzəşt tətbiq edilə bilər (Maddə 102.1)"
    else:
        tax_with = tax_without
        saving = 0
        failed = [k for k, v in conditions.items() if not v]
        reasons_map = {
            "income_ok": f"Gəlir {annual_income:,.0f} AZN > 45,000 AZN limitini aşır",
            "employees_ok": f"İşçi sayı {employees} < 3 tələbindən azdır",
            "no_debt_ok": "Sosial sığorta borcu var",
            "regime_ok": f"[{kvad_code}] fəaliyyət növü üçün güzəşt nəzərdə tutulmur"
        }
        reason = " | ".join(reasons_map[f] for f in failed)

    return {
        "eligible": eligible,
        "conditions_met": conditions,
        "annual_income": annual_income,
        "employees": employees,
        "kvad_code": kvad_code,
        "tax_without_exempt": tax_without,
        "tax_with_exempt": tax_with,
        "saving": saving,
        "saving_pct": f"{round((saving/tax_without)*100)}%" if tax_without > 0 else "0%",
        "reason": reason,
        "article": "102.1"
    }


# ─────────────────────────────────────────────────────────
# SMOKE TEST
# ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n🇦🇿 Tax Calculator — Sınaq\n" + "="*50)

    # Test 1: Simplified tax — clothing store
    r1 = calculate_simplified(36000, "47711")
    print(f"\n📦 Sadələşdirilmiş vergi — Geyim mağazası [47711]")
    print(f"   Gəlir  : {r1['annual_income']:,.0f} AZN")
    print(f"   Dərəcə : {r1['rate_pct']}")
    print(f"   Vergi  : {r1['tax_amount']:,.2f} AZN")

    # Test 2: Income tax 2026
    r2 = calculate_income_tax(3000, 2026)
    print(f"\n💼 Gəlir vergisi 2026 — 3,000 AZN/ay")
    print(f"   Vergi  : {r2['tax_amount']:,.2f} AZN")
    print(f"   Net    : {r2['net_income']:,.2f} AZN")
    print(f"   Qrupı  : {r2['bracket']}")
    print(f"   İllik  : {r2['annual_tax']:,.2f} AZN")

    # Test 3: 75% exemption — eligible
    r3 = check_exempt75(36000, "47711", employees=3)
    print(f"\n💡 Güzəşt 75% — 36,000 AZN, 3 işçi")
    print(f"   Nəticə : {r3['reason']}")
    print(f"   Vergisiz: {r3['tax_without_exempt']:,.2f} AZN")
    print(f"   Güzəştlə: {r3['tax_with_exempt']:,.2f} AZN")
    print(f"   Qənaət : {r3['saving']:,.2f} AZN ({r3['saving_pct']})")

    # Test 4: 75% exemption — not eligible (income too high)
    r4 = check_exempt75(60000, "47711", employees=5)
    print(f"\n❌ Güzəşt 75% — 60,000 AZN (limit aşılıb)")
    print(f"   Nəticə : {r4['reason']}")

    # Test 5: Construction — simplified not allowed
    r5 = calculate_simplified(50000, "41200")
    print(f"\n🚫 Tikinti [41200] — sadələşdirilmiş qadağan")
    print(f"   İcazə  : {r5['allowed']}")
    print(f"   Səbəb  : {r5['reason']}")
