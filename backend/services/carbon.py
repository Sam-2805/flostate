"""
FLOState Carbon Data Service

Provides carbon intensity data for each region.

In DEMO mode: uses simulated/synthetic carbon intensity data.
In LIVE mode: would connect to Electricity Maps or WattTime API.

Architecture:
- get_carbon_data(region, time) -> carbon intensity gCO2eq/kWh
- get_carbon_forecast(region, hours=48) -> list of hourly carbon values
"""

import random
import math
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

# ---------- Configuration ----------
DATA_MODE = "DEMO"

# Base carbon intensity profiles per region (gCO2eq/kWh)
# These represent typical grid carbon intensity values for Indian cities
REGION_CARBON_PROFILES = {
    "Mumbai": {
        "base": 55,       # Moderately carbon-intensive grid
        "variance": 15,   # Moderate variance
        "solar_peak_hour": 13,  # Solar peaks around 1 PM
        "solar_effect": 20,     # Carbon drops significantly with solar
    },
    "Pune": {
        "base": 42,       # Lower base (more renewable mix)
        "variance": 12,
        "solar_peak_hour": 13,
        "solar_effect": 18,
    },
    "Delhi": {
        "base": 68,       # Higher carbon (coal-heavy grid)
        "variance": 18,
        "solar_peak_hour": 12,
        "solar_effect": 15,
    },
    "Bengaluru": {
        "base": 50,       # Moderate
        "variance": 14,
        "solar_peak_hour": 13,
        "solar_effect": 22,
    },
}


def _generate_carbon_curve(profile: dict, start_time: datetime, hours: int = 48) -> List[dict]:
    """
    Generate a realistic 48-hour carbon intensity curve for a region.
    
    Uses a combination of:
    - Base carbon intensity
    - Diurnal cycle (higher during evening peak, lower during solar hours)
    - Random variance for realism
    """
    curve = []
    seed = hash(profile["base"]) % 10000  # Deterministic per region
    rng = random.Random(seed)
    
    for i in range(hours):
        t = start_time + timedelta(hours=i)
        hour_of_day = t.hour + t.minute / 60.0
        
        # Diurnal pattern: carbon intensity varies with demand
        # Peak demand in evening (7-10 PM), lowest at night/early morning
        diurnal = math.sin((hour_of_day - 6) * math.pi / 12) * 0.3
        
        # Solar effect: carbon drops when solar generation is high
        solar_distance = abs(hour_of_day - profile["solar_peak_hour"])
        solar_distance = min(solar_distance, 24 - solar_distance)
        solar_factor = max(0, 1 - solar_distance / 6) * profile["solar_effect"]
        
        # Calculate intensity
        intensity = profile["base"] + (diurnal * profile["variance"]) - solar_factor
        intensity += rng.gauss(0, profile["variance"] * 0.3)
        intensity = max(10, min(100, intensity))  # Clamp to 10-100
        
        curve.append({
            "time": t.strftime("%Y-%m-%d %H:%M"),
            "hour": t.strftime("%H:%M"),
            "carbon_intensity": round(intensity, 2),
        })
    
    return curve


# Cache for generated curves (deterministic per session)
_carbon_cache: Dict[str, List[dict]] = {}


def get_carbon_forecast(region: str, hours: int = 48) -> List[dict]:
    """
    Get carbon intensity forecast for a region for the next `hours` hours.
    
    Returns list of dicts with time and carbon_intensity.
    """
    if region not in REGION_CARBON_PROFILES:
        raise ValueError(f"Unknown region: {region}")
    
    cache_key = f"{region}_{hours}"
    if cache_key not in _carbon_cache:
        profile = REGION_CARBON_PROFILES[region]
        start = datetime.now().replace(minute=0, second=0, microsecond=0)
        _carbon_cache[cache_key] = _generate_carbon_curve(profile, start, hours)
    
    return _carbon_cache[cache_key]


def get_carbon_data(region: str, time: datetime = None) -> float:
    """
    Get carbon intensity for a specific region and time.
    
    Returns carbon intensity in gCO2eq/kWh.
    """
    if time is None:
        time = datetime.now()
    
    forecast = get_carbon_forecast(region, 48)
    time_str = time.strftime("%Y-%m-%d %H:%M")
    
    for entry in forecast:
        if entry["time"] == time_str:
            return entry["carbon_intensity"]
    
    # If exact match not found, find closest hour
    hour_str = time.strftime("%H:%M")
    for entry in forecast:
        if entry["hour"] == hour_str:
            return entry["carbon_intensity"]
    
    # Fallback
    return REGION_CARBON_PROFILES[region]["base"]


def get_all_regions_carbon(hours: int = 48) -> Dict[str, List[dict]]:
    """Get carbon forecasts for all regions."""
    return {region: get_carbon_forecast(region, hours) for region in REGION_CARBON_PROFILES}
