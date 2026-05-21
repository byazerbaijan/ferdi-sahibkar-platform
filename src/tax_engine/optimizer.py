"""
Tax Optimizer — Vergi Optimallaşdırıcı
Fərdi sahibkar üçün ən əlverişli vergi rejimini müəyyən edir.
NK AR 2026: Maddə 101, 102.1, 218-220, 218.5
"""

from datetime import datetime
from src.tax_engine.regime import get_regime
from src.tax_engine.calculator import (
    calculate_simplified,
    calculate_income_tax,
    check_exempt75
)


def optimize(
    annual_income: float,
    kvad_code: str,
    employees: int = 0,
    has_social_debt: bool = False,
    year: int = None
) -> dict:
    """
    Finds the optimal tax regime for a Fərdi Sahibkar.

    Args:
        annual_income:   Annual income in AZN
        kvad_code:       5-digit KVƏD activity code
        employees:       Average number of employees
        has_social_debt: Whether there is social insurance debt
        year:            Tax year (defaults to current year)

    Returns:
        {
            "recommended_regime": str,
            "recommended_label": str,
            "tax_amount": float,
            "effective_rate_pct": str,
            "saving_vs_standard": float,
            "options": list,
            "warnings": list,
            "explanation": str,
            "kvad_code": str,
            "kvad_name": str,
            "year": int
        }
    """
    if annual_income < 0:
        raise ValueError("Gəlir mənfi ola bilməz")

    year = year or datetime.now().year
    regime_info = get_regime(kvad_code)
    options = []
    warnings = []

    # ── Option 1: Simplified tax ──────────────────────────
    simplified = calculate_simplified(annual_income, kvad_code)
    if simplified["allowed"]:
        exempt = check_exempt75(annual_income, kvad_code, employees, has_social_debt)

        if exempt["eligible"]:
            options.append({
                "regime": "SIMPLIFIED_EXEMPT75",
                "label": f"Sadələşdirilmiş {simplified['rate_pct']} + 75% güzəşt (Maddə 102.1)",
                "tax_amount": exempt["tax_with_exempt"],
                "effective_rate": exempt["tax_with_exempt"] / annual_income if annual_income > 0 else 0,
                "effective_rate_pct": f"{round((exempt['tax_with_exempt']/annual_income)*100, 1)}%" if annual_income > 0 else "0%",
                "note": f"Qənaət: {exempt['saving']:,.2f} AZN ({exempt['saving_pct']})",
                "articles": ["218", "219", "220", "102.1"]
            })

        options.append({
            "regime": simplified["regime"],
            "label": f"Sadələşdirilmiş {simplified['rate_pct']} (Maddə 218-220)",
            "tax_amount": simplified["tax_amount"],
            "effective_rate": simplified["rate"],
            "effective_rate_pct": simplified["rate_pct"],
            "note": "Standart sadələşdirilmiş vergi",
            "articles": simplified["articles"]
        })
    else:
        warnings.append(f"⚠️ [{kvad_code}] üçün sadələşdirilmiş vergi qadağandır — {regime_info['label']}")

    # ── Option 2: Income tax (progressive) ───────────────
    monthly_income = annual_income / 12
    income_tax = calculate_income_tax(monthly_income, year)

    options.append({
        "regime": "INCOME_TAX",
        "label": f"Gəlir vergisi — progressiv şkala (Maddə 101, {year})",
        "tax_amount": income_tax["annual_tax"],
        "effective_rate": income_tax["effective_rate"],
        "effective_rate_pct": income_tax["effective_rate_pct"],
        "note": f"Qrup: {income_tax['bracket']}",
        "articles": ["99", "101"]
    })

    # ── Special regimes ───────────────────────────────────
    if regime_info["regime"] == "IT_SPECIAL":
        it_tax = round(annual_income * 0.05, 2)
        options.append({
            "regime": "IT_SPECIAL",
            "label": "IT sektoru — 5% (Maddə 101, 2032-ə qədər)",
            "tax_amount": it_tax,
            "effective_rate": 0.05,
            "effective_rate_pct": "5%",
            "note": "IT üzrə xüsusi güzəşt dərəcəsi",
            "articles": ["101", "102"]
        })

    if regime_info["regime"] == "MEDIA_EXEMPT":
        options.append({
            "regime": "MEDIA_EXEMPT",
            "label": "Media azadolması — 0% (Maddə 102, 106 — 6 il)",
            "tax_amount": 0.0,
            "effective_rate": 0.0,
            "effective_rate_pct": "0%",
            "note": "2023-cü ildən 6 il müddətinə tam azadolma",
            "articles": ["102", "106"]
        })

    # ── Sort by tax amount (lowest first) ─────────────────
    options.sort(key=lambda x: x["tax_amount"])
    best = options[0]

    # ── Standard tax for comparison ───────────────────────
    standard_tax = calculate_simplified(annual_income, kvad_code)
    standard_amount = standard_tax["tax_amount"] if standard_tax["allowed"] else income_tax["annual_tax"]
    saving_vs_standard = round(standard_amount - best["tax_amount"], 2)

    # ── Warnings ──────────────────────────────────────────
    if annual_income > 200000:
        warnings.append("⚠️ İllik dövriyyə 200,000 AZN-i keçir — ƏDV qeydiyyatı məcburidir (Maddə 159)")

    if employees == 0 and annual_income <= 45000:
        warnings.append("💡 3 işçi götürsəniz 75% güzəştdən yararlana bilərsiniz (Maddə 102.1)")

    if not regime_info["simplified_allowed"]:
        warnings.append(f"🚫 Bu fəaliyyət növü üçün sadələşdirilmiş vergi qadağandır (Maddə 218.5)")

    # ── Human-readable explanation ────────────────────────
    explanation = _build_explanation(best, annual_income, employees, warnings)

    return {
        "recommended_regime": best["regime"],
        "recommended_label": best["label"],
        "tax_amount": best["tax_amount"],
        "effective_rate_pct": best["effective_rate_pct"],
        "saving_vs_standard": saving_vs_standard,
        "options": options,
        "warnings": warnings,
        "explanation": explanation,
        "kvad_code": kvad_code,
        "kvad_name": regime_info["name"],
        "year": year,
        "annual_income": annual_income,
        "employees": employees
    }


def _build_explanation(best: dict, income: float, employees: int, warnings: list) -> str:
    lines = [
        f"Gəliriniz {income:,.0f} AZN üçün tövsiyə edilən rejim:",
        f"→ {best['label']}",
        f"→ Vergi məbləği: {best['tax_amount']:,.2f} AZN/il",
        f"→ Effektiv dərəcə: {best['effective_rate_pct']}",
    ]
    if best.get("note"):
        lines.append(f"→ {best['note']}")
    return " | ".join(lines)


# ─────────────────────────────────────────────────────────
# SMOKE TEST
# ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n🇦🇿 Tax Optimizer — Sınaq\n" + "="*55)

    scenarios = [
        ("Geyim mağazası, 36k AZN, 3 işçi",   36000, "47711", 3,  False),
        ("Geyim mağazası, 36k AZN, 0 işçi",   36000, "47711", 0,  False),
        ("Restoran, 80k AZN, 5 işçi",          80000, "56100", 5,  False),
        ("IT developer, 60k AZN",              60000, "62010", 0,  False),
        ("Kitab nəşri, 30k AZN",               30000, "58110", 0,  False),
        ("Tikinti, 50k AZN",                   50000, "41200", 0,  False),
        ("Böyük ticarət, 250k AZN",           250000, "47711", 10, False),
    ]

    for title, income, code, emps, debt in scenarios:
        r = optimize(income, code, emps, debt, 2026)
        print(f"\n📊 {title}")
        print(f"   ✅ Tövsiyə : {r['recommended_label']}")
        print(f"   💰 Vergi   : {r['tax_amount']:,.2f} AZN/il")
        print(f"   📉 Dərəcə  : {r['effective_rate_pct']}")
        if r["saving_vs_standard"] > 0:
            print(f"   💡 Qənaət  : {r['saving_vs_standard']:,.2f} AZN")
        for w in r["warnings"]:
            print(f"   {w}")
