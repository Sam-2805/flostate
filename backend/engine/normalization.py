"""
FLOState Normalization Engine

Converts raw environmental and cost values to a common 0-100 scale.

Interpretation:
  0 = best condition (low impact, low cost, good cooling)
  100 = worst condition (high impact, high cost, poor cooling)

Functions:
  normalize_carbon(value, min_val=10, max_val=100) -> float
  normalize_water(value, min_val=0, max_val=100) -> float
  normalize_cooling(temperature, humidity) -> float
  normalize_cost(value, min_val=50, max_val=500) -> float
"""

import math


def normalize_carbon(value: float, min_val: float = 10, max_val: float = 100) -> float:
    """
    Normalize carbon intensity to 0-100 scale.
    
    Input: carbon intensity in gCO2eq/kWh
    0 = very clean energy (low carbon)
    100 = very dirty energy (high carbon)
    
    Uses linear normalization with clamping.
    """
    if max_val == min_val:
        return 50.0
    
    normalized = ((value - min_val) / (max_val - min_val)) * 100
    return round(max(0, min(100, normalized)), 2)


def normalize_water(value: float, min_val: float = 20, max_val: float = 80) -> float:
    """
    Normalize water stress to 0-100 scale.
    
    Input: water stress score (already roughly 0-100 from data service)
    0 = no water stress
    100 = extreme water stress
    
    Re-normalizes based on the observed range for better differentiation.
    """
    if max_val == min_val:
        return 50.0
    
    normalized = ((value - min_val) / (max_val - min_val)) * 100
    return round(max(0, min(100, normalized)), 2)


def normalize_cooling(temperature: float, humidity: float) -> float:
    """
    Calculate a cooling score from temperature and humidity.
    
    Higher score = worse cooling conditions (more energy needed for cooling).
    Lower score = better cooling conditions (less energy needed).
    
    Uses a combined metric considering:
    - Temperature (higher = harder to cool)
    - Humidity (higher = harder to cool efficiently)
    
    The formula approximates relative cooling difficulty.
    """
    # Temperature contribution (0-100 scale, assuming 15-45°C range)
    temp_normalized = max(0, min(100, ((temperature - 15) / (45 - 15)) * 100))
    
    # Humidity contribution (0-100 scale, assuming 20-100% range)
    humidity_normalized = max(0, min(100, ((humidity - 20) / (100 - 20)) * 100))
    
    # Weighted combination: temperature has more impact on cooling
    cooling_score = (temp_normalized * 0.65) + (humidity_normalized * 0.35)
    
    return round(max(0, min(100, cooling_score)), 2)


def normalize_cost(value: float, min_val: float = 40, max_val: float = 500) -> float:
    """
    Normalize cost to 0-100 scale.
    
    Input: estimated cost in ₹ (INR)
    0 = very cheap
    100 = very expensive
    """
    if max_val == min_val:
        return 50.0
    
    normalized = ((value - min_val) / (max_val - min_val)) * 100
    return round(max(0, min(100, normalized)), 2)


def get_normalization_info() -> dict:
    """Get information about normalization parameters."""
    return {
        "carbon": {
            "scale": "gCO2eq/kWh (estimated/simulated)",
            "range": "10-100",
            "interpretation": "0 = clean energy, 100 = high carbon",
        },
        "water": {
            "scale": "Water stress index",
            "range": "20-80",
            "interpretation": "0 = no stress, 100 = extreme stress",
        },
        "cooling": {
            "scale": "Estimated Cooling Score (derived from temp + humidity)",
            "inputs": ["temperature (C)", "humidity (%)"],
            "interpretation": "0 = favorable cooling, 100 = unfavorable cooling",
        },
        "cost": {
            "scale": "₹ (INR, estimated compute cost)",
            "range": "40-500",
            "interpretation": "0 = cheapest, 100 = most expensive",
        },
        "note": "All bounds are configured prototype parameters, not live measurements.",
    }
