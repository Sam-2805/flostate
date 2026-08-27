"""
FLOState Weighted Scoring Engine

Calculates final environmental-cost score for a region + time window.

The final score combines four normalized factors:
  Carbon Score  × Carbon Weight
  Water Score   × Water Weight
  Cooling Score × Cooling Weight
  Cost Score    × Cost Weight

Lower final score = better option.
All weights must sum to 100%.
"""

from typing import Dict, Optional


def calculate_weighted_score(
    carbon_score: float,
    water_score: float,
    cooling_score: float,
    cost_score: float,
    weights: Dict[str, float] = None,
) -> dict:
    """
    Calculate the final weighted score from normalized component scores.
    
    Args:
        carbon_score: Normalized carbon score (0-100)
        water_score: Normalized water score (0-100)
        cooling_score: Normalized cooling score (0-100)
        cost_score: Normalized cost score (0-100)
        weights: Dictionary with keys carbon, water, cooling, cost (must sum to 100)
    
    Returns:
        {
            "carbon_score": float,
            "water_score": float,
            "cooling_score": float,
            "cost_score": float,
            "carbon_contribution": float,
            "water_contribution": float,
            "cooling_contribution": float,
            "cost_contribution": float,
            "final_score": float,
            "weights": dict,
        }
    """
    if weights is None:
        weights = {"carbon": 40, "water": 25, "cooling": 20, "cost": 15}
    
    # Validate weights
    total = sum(weights.values())
    if abs(total - 100) > 0.01:
        raise ValueError(f"Weights must sum to 100%. Current sum: {total}%")
    
    # Normalize weights to decimal
    w_carbon = weights["carbon"] / 100.0
    w_water = weights["water"] / 100.0
    w_cooling = weights["cooling"] / 100.0
    w_cost = weights["cost"] / 100.0
    
    # Calculate contributions
    carbon_contribution = carbon_score * w_carbon
    water_contribution = water_score * w_water
    cooling_contribution = cooling_score * w_cooling
    cost_contribution = cost_score * w_cost
    
    final_score = carbon_contribution + water_contribution + cooling_contribution + cost_contribution
    
    return {
        "carbon_score": round(carbon_score, 2),
        "water_score": round(water_score, 2),
        "cooling_score": round(cooling_score, 2),
        "cost_score": round(cost_score, 2),
        "carbon_contribution": round(carbon_contribution, 2),
        "water_contribution": round(water_contribution, 2),
        "cooling_contribution": round(cooling_contribution, 2),
        "cost_contribution": round(cost_contribution, 2),
        "final_score": round(final_score, 2),
        "weights": weights,
    }


def validate_weights(weights: Dict[str, float]) -> dict:
    """
    Validate that weights are valid and sum to 100.
    
    Returns:
        {"valid": bool, "error": str or None, "total": float}
    """
    required_keys = {"carbon", "water", "cooling", "cost"}
    if not required_keys.issubset(weights.keys()):
        missing = required_keys - set(weights.keys())
        return {"valid": False, "error": f"Missing weight keys: {missing}", "total": 0}
    
    for key in required_keys:
        if weights[key] < 0 or weights[key] > 100:
            return {"valid": False, "error": f"Weight {key} must be between 0 and 100", "total": 0}
    
    total = sum(weights.values())
    if abs(total - 100) > 0.01:
        return {"valid": False, "error": f"Weights must sum to 100%. Current: {total}%", "total": total}
    
    return {"valid": True, "error": None, "total": total}
