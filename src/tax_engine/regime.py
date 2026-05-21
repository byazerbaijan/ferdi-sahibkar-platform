"""
Tax Regime Detector — Vergi Rejimi Müəyyənedici
Maddə 218-220, 218.5, 101, 102 — NK AR 2026
"""

import json
import os

# Load KVƏD mapping once at startup
_BASE = os.path.dirname(os.path.abspath(__file__))
_KVAD_PATH = os.path.join(_BASE, "data", "kvad_mapping.json")

with open(_KVAD_PATH, encoding="utf-8") as f:
    _KVAD_DB = {item["code"]: item for item in json.load(f)["codes"]}

REGIME_LABELS = {
    "SIMPLIFIED_2":          "Sadələşdirilmiş vergi 2% (ticarət)",
    "SIMPLIFIED_4":          "Sadələşdirilmiş vergi 4% (xidmətlər)",
    "EXCLUDED_SIMPLIFIED":   "Sadələşdirilmiş vergi QADAĞAN (Maddə 218.5)",
    "OIL_GAS":               "Neft/qaz — xüsusi rejim (Maddə 218.5)",
    "EXCISE":                "Aksiz + gəlir vergisi 20%",
    "IT_SPECIAL":            "IT sektoru — 5% (2032-ə qədər, Maddə 101)",
    "MEDIA_EXEMPT":          "Media — 6 il azadolma (Maddə 102, 106)",
    "GAMBLING":              "Qumar — xüsusi vergi (Maddə 218.5)",
    "INCOME_20":             "Gəlir vergisi 20% (Maddə 99, 101)",
}


def get_regime(kvad_code: str) -> dict:
    """
    Returns tax regime info for a given KVƏD code.

    Args:
        kvad_code: 5-digit KVƏD activity code (e.g. "47711")

    Returns:
        {
            "code": str,
            "name": str,
            "regime": str,
            "rate": str,
            "articles": list,
            "exempt75_eligible": bool,
            "section": str,
            "label": str,
            "simplified_allowed": bool,
            "found": bool
        }

    Raises:
        ValueError: if code format is invalid
    """
    code = str(kvad_code).strip()

    if not code.isdigit() or len(code) != 5:
        raise ValueError(f"KVƏD kodu 5 rəqəmli olmalıdır: '{code}'")

    if code not in _KVAD_DB:
        return {
            "code": code,
            "name": "Naməlum fəaliyyət növü",
            "regime": "UNKNOWN",
            "rate": "—",
            "articles": [],
            "exempt75_eligible": False,
            "section": code[:2],
            "label": "Kod tapılmadı — vergi orqanına müraciət edin",
            "simplified_allowed": False,
            "found": False
        }

    item = _KVAD_DB[code]
    regime = item["regime"]

    simplified_allowed = regime in ("SIMPLIFIED_2", "SIMPLIFIED_4")

    return {
        "code": code,
        "name": item["name"],
        "regime": regime,
        "rate": item["rate"],
        "articles": item["articles"],
        "exempt75_eligible": item["exempt75"],
        "section": item["section"],
        "label": REGIME_LABELS.get(regime, regime),
        "simplified_allowed": simplified_allowed,
        "found": True
    }


def get_section_codes(section: str) -> list:
    """Returns all codes for a given 2-digit section (e.g. '47')."""
    return [
        item for item in _KVAD_DB.values()
        if item["section"] == section
    ]


def is_simplified_allowed(kvad_code: str) -> bool:
    """Quick check — can this activity use simplified tax?"""
    result = get_regime(kvad_code)
    return result["simplified_allowed"]


def is_exempt75_eligible(kvad_code: str) -> bool:
    """Quick check — is 75% exemption potentially applicable?"""
    result = get_regime(kvad_code)
    return result["exempt75_eligible"]


if __name__ == "__main__":
    # Quick smoke test
    test_codes = [
        ("47711", "Geyim satışı — ticarət"),
        ("62010", "IT — proqram təminatı"),
        ("41200", "Tikinti — qadağan"),
        ("58110", "Media — kitab nəşri"),
        ("06100", "Neft hasilatı"),
        ("99999", "Mövcud olmayan kod"),
    ]

    print("\n🇦🇿 KVƏD → Vergi Rejimi Yoxlaması\n" + "="*50)
    for code, desc in test_codes:
        r = get_regime(code)
        status = "✅" if r["found"] else "❓"
        exempt = "💡 75% güzəşt mümkün" if r["exempt75_eligible"] else ""
        print(f"\n{status} [{code}] {desc}")
        print(f"   Rejim : {r['label']}")
        print(f"   Dərəcə: {r['rate']}")
        print(f"   Maddə : {', '.join(r['articles'])}")
        if exempt:
            print(f"   {exempt}")
