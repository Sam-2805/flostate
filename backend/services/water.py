"""
FLOState Water Risk Data Service

Provides water stress data for each region.

Water stress is a relatively slow-changing regional factor, so values
are stable and do not change hour-to-hour.

In DEMO mode: uses simulated data based on WRI Aqueduct Water Risk Atlas.
In LIVE mode: would connect to WRI Aqueduct data.

Architecture:
- get_water_stress(region) -> water stress score (0-100)
"""

# ---------- Configuration ----------
DATA_MODE = "DEMO"

# Water stress values per region (0-100 scale)
# Based on general water stress indicators for Indian cities
# Higher score = higher water stress
REGION_WATER_STRESS = {
    "Mumbai": {
        "score": 58,  # Moderate-high (coastal but high demand, monsoon dependent)
        "category": "Medium-High",
        "description": "Moderate water stress; dependent on monsoon cycles. High urban demand.",
    },
    "Pune": {
        "score": 42,  # Moderate (better reservoir system)
        "category": "Medium",
        "description": "Moderate water stress; better reservoir infrastructure but growing demand.",
    },
    "Delhi": {
        "score": 72,  # High (severe water stress)
        "category": "High",
        "description": "High water stress; over-extraction of groundwater, high population density.",
    },
    "Bengaluru": {
        "score": 55,  # Medium-High (rapid urbanization impacting water)
        "category": "Medium-High",
        "description": "Medium-high water stress; rapid urbanization affecting water resources.",
    },
}


def get_water_stress(region: str) -> dict:
    """
    Get water stress data for a region.
    
    Returns:
        {
            "region": str,
            "score": int,  # 0-100
            "category": str,
            "description": str
        }
    """
    if region not in REGION_WATER_STRESS:
        raise ValueError(f"Unknown region: {region}")
    
    data = REGION_WATER_STRESS[region]
    return {
        "region": region,
        "score": data["score"],
        "category": data["category"],
        "description": data["description"],
    }


def get_all_regions_water_stress() -> dict:
    """Get water stress data for all regions."""
    return {region: get_water_stress(region) for region in REGION_WATER_STRESS}
