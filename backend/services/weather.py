"""
FLOState Weather Data Service

Provides temperature and humidity data for cooling score calculation.

In DEMO mode: uses simulated forecast data.
In LIVE mode: would connect to OpenWeather API.

Architecture:
- get_weather_data(region, time) -> {temperature, humidity}
- get_weather_forecast(region, hours=48) -> list of hourly weather values
"""

import random
import math
from datetime import datetime, timedelta
from typing import Dict, List

# ---------- Configuration ----------
DATA_MODE = "DEMO"

# Weather profiles per region (simulated typical conditions)
REGION_WEATHER_PROFILES = {
    "Mumbai": {
        "temp_base": 31,       # Warm, coastal
        "temp_var": 4,
        "humidity_base": 78,   # High humidity (coastal)
        "humidity_var": 8,
        "night_cooling": 3,
    },
    "Pune": {
        "temp_base": 29,       # Moderate, plateau
        "temp_var": 5,
        "humidity_base": 55,   # Moderate humidity
        "humidity_var": 10,
        "night_cooling": 5,
    },
    "Delhi": {
        "temp_base": 34,       # Hot, inland
        "temp_var": 7,
        "humidity_base": 45,   # Lower humidity
        "humidity_var": 12,
        "night_cooling": 6,
    },
    "Bengaluru": {
        "temp_base": 27,       # Cooler, elevated
        "temp_var": 4,
        "humidity_base": 62,   # Moderate humidity
        "humidity_var": 8,
        "night_cooling": 4,
    },
}


def _generate_weather_curve(profile: dict, start_time: datetime, hours: int = 48) -> List[dict]:
    """Generate a realistic 48-hour weather curve."""
    curve = []
    seed = hash(profile["temp_base"]) % 10000
    rng = random.Random(seed)
    
    for i in range(hours):
        t = start_time + timedelta(hours=i)
        hour_of_day = t.hour + t.minute / 60.0
        
        # Diurnal temperature cycle: coolest at ~5 AM, warmest at ~2 PM
        temp_cycle = math.sin((hour_of_day - 5) * math.pi / 12) * profile["temp_var"]
        temperature = profile["temp_base"] + temp_cycle + rng.gauss(0, 1.5)
        
        # Humidity inversely correlated with temperature
        humidity_cycle = -temp_cycle * 0.5
        humidity = profile["humidity_base"] + humidity_cycle + rng.gauss(0, 3)
        
        temperature = max(15, min(45, temperature))
        humidity = max(20, min(100, humidity))
        
        curve.append({
            "time": t.strftime("%Y-%m-%d %H:%M"),
            "hour": t.strftime("%H:%M"),
            "temperature": round(temperature, 1),
            "humidity": round(humidity, 1),
        })
    
    return curve


# Cache
_weather_cache: Dict[str, List[dict]] = {}


def get_weather_forecast(region: str, hours: int = 48) -> List[dict]:
    """Get weather forecast for a region."""
    if region not in REGION_WEATHER_PROFILES:
        raise ValueError(f"Unknown region: {region}")
    
    cache_key = f"{region}_{hours}"
    if cache_key not in _weather_cache:
        profile = REGION_WEATHER_PROFILES[region]
        start = datetime.now().replace(minute=0, second=0, microsecond=0)
        _weather_cache[cache_key] = _generate_weather_curve(profile, start, hours)
    
    return _weather_cache[cache_key]


def get_weather_data(region: str, time: datetime = None) -> dict:
    """
    Get weather data for a specific region and time.
    
    Returns: {temperature, humidity}
    """
    if time is None:
        time = datetime.now()
    
    forecast = get_weather_forecast(region, 48)
    time_str = time.strftime("%Y-%m-%d %H:%M")
    
    for entry in forecast:
        if entry["time"] == time_str:
            return {"temperature": entry["temperature"], "humidity": entry["humidity"]}
    
    hour_str = time.strftime("%H:%M")
    for entry in forecast:
        if entry["hour"] == hour_str:
            return {"temperature": entry["temperature"], "humidity": entry["humidity"]}
    
    profile = REGION_WEATHER_PROFILES[region]
    return {"temperature": profile["temp_base"], "humidity": profile["humidity_base"]}


def get_all_regions_weather(hours: int = 48) -> Dict[str, List[dict]]:
    """Get weather forecasts for all regions."""
    return {region: get_weather_forecast(region, hours) for region in REGION_WEATHER_PROFILES}
