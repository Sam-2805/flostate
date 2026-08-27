"""
FLOState Explanation Engine

Generates human-readable explanations for scheduling decisions.

The goal is transparency: users should understand WHY FLOState
selected a particular region, time window, and model.
"""

from typing import Dict, List


def generate_explanation(
    workload: dict,
    best: dict,
    rejected: List[dict],
    model_routing: dict,
    weights: Dict[str, float],
) -> dict:
    """
    Generate a comprehensive explanation of the scheduling decision.
    
    Returns:
        {
            "summary": str,
            "why_selected": list of reasons,
            "rejected_alternatives": list of {region, reason},
            "factors": dict of factor explanations,
            "model_explanation": str,
            "score_breakdown": str,
        }
    """
    if best is None:
        return {
            "summary": "No feasible execution plan could be found.",
            "why_selected": [],
            "rejected_alternatives": [
                {"region": r["region"], "reason": r["reason"]} for r in rejected
            ],
            "factors": {},
            "model_explanation": "",
            "score_breakdown": "",
        }
    
    region = best["region"]
    start = best["start_hour"]
    end = best["end_hour"]
    score = best["final_score"]
    cost = best["estimated_cost"]
    runtime = workload["runtime_hours"]
    deadline = workload["deadline"]
    
    # Primary summary
    summary = (
        f"FLOState selected {region} from {start} to {end} because it provided "
        f"the lowest environmental-cost score ({score:.2f}) among all feasible options "
        f"while meeting the {runtime}-hour runtime requirement and {deadline} deadline."
    )
    
    # Why this option - detailed reasons
    why_selected = []
    
    # Carbon reasoning
    if best["carbon_score"] < 40:
        why_selected.append(f"✓ Low carbon intensity during selected window (score: {best['carbon_score']:.1f}/100)")
    else:
        why_selected.append(f"✓ Moderate carbon intensity during selected window (score: {best['carbon_score']:.1f}/100)")
    
    # Cooling reasoning
    if best["cooling_score"] < 40:
        why_selected.append(f"✓ Favorable cooling conditions (score: {best['cooling_score']:.1f}/100)")
    else:
        why_selected.append(f"~ Acceptable cooling conditions (score: {best['cooling_score']:.1f}/100)")
    
    # Water reasoning
    if best["water_score"] < 40:
        why_selected.append(f"✓ Low water stress in this region (score: {best['water_score']:.1f}/100)")
    else:
        why_selected.append(f"~ Acceptable water stress level (score: {best['water_score']:.1f}/100)")
    
    # Cost reasoning
    why_selected.append(f"✓ Estimated cost: ₹{cost:.0f} (score: {best['cost_score']:.1f}/100)")
    
    # GPU
    why_selected.append(f"✓ {workload['gpu']} GPU available in {region}")
    
    # Deadline
    why_selected.append(f"✓ {runtime}-hour continuous window available within deadline")
    
    # Budget
    if workload.get("budget"):
        if cost <= workload["budget"]:
            why_selected.append(f"✓ Within budget (₹{workload['budget']:.0f})")
    
    # Rejected alternatives
    rejected_info = []
    for r in rejected:
        rejected_info.append({
            "region": r["region"],
            "reason": r["reason"],
        })
    
    # Factor explanations
    factors = {
        "carbon": _explain_carbon(best["carbon_score"], weights["carbon"]),
        "water": _explain_water(best["water_score"], weights["water"]),
        "cooling": _explain_cooling(best["cooling_score"], weights["cooling"]),
        "cost": _explain_cost(best["cost_score"], weights["cost"], cost),
    }
    
    # Query routing explanation
    model_explanation = (
        f"Query Routing: Complexity '{workload['complexity']}' → "
        f"{model_routing['selected_model']}. "
        f"{model_routing['reason']}"
    )
    
    # Score breakdown
    score_breakdown = (
        f"Final Score = "
        f"({best['carbon_score']:.1f} × {weights['carbon']}%) + "
        f"({best['water_score']:.1f} × {weights['water']}%) + "
        f"({best['cooling_score']:.1f} × {weights['cooling']}%) + "
        f"({best['cost_score']:.1f} × {weights['cost']}%) = "
        f"{score:.2f}"
    )
    
    return {
        "summary": summary,
        "why_selected": why_selected,
        "rejected_alternatives": rejected_info,
        "factors": factors,
        "model_explanation": model_explanation,
        "score_breakdown": score_breakdown,
    }


def _explain_carbon(score: float, weight: float) -> str:
    """Generate explanation for carbon score."""
    if score < 25:
        return f"Carbon intensity is very low ({score:.1f}/100), indicating clean energy sources during this window."
    elif score < 50:
        return f"Carbon intensity is moderate ({score:.1f}/100), representing a balanced mix of energy sources."
    elif score < 75:
        return f"Carbon intensity is elevated ({score:.1f}/100), suggesting fossil fuel-heavy grid power."
    else:
        return f"Carbon intensity is high ({score:.1f}/100), indicating significant fossil fuel usage."


def _explain_water(score: float, weight: float) -> str:
    """Generate explanation for water stress score."""
    if score < 25:
        return f"Water stress is low ({score:.1f}/100), minimal impact on local water resources."
    elif score < 50:
        return f"Water stress is moderate ({score:.1f}/100), some consideration for water usage."
    elif score < 75:
        return f"Water stress is significant ({score:.1f}/100), notable impact on local water resources."
    else:
        return f"Water stress is high ({score:.1f}/100), substantial concern for water sustainability."


def _explain_cooling(score: float, weight: float) -> str:
    """Generate explanation for cooling score."""
    if score < 25:
        return f"Cooling conditions are excellent ({score:.1f}/100), low energy needed for cooling."
    elif score < 50:
        return f"Cooling conditions are favorable ({score:.1f}/100), moderate cooling energy required."
    elif score < 75:
        return f"Cooling conditions are challenging ({score:.1f}/100), significant cooling energy needed."
    else:
        return f"Cooling conditions are poor ({score:.1f}/100), high cooling energy overhead."


def _explain_cost(score: float, weight: float, actual_cost: float) -> str:
    """Generate explanation for cost score."""
    if score < 25:
        return f"Cost is very competitive at ₹{actual_cost:.0f} ({score:.1f}/100), among the most affordable options."
    elif score < 50:
        return f"Cost is reasonable at ₹{actual_cost:.0f} ({score:.1f}/100), within mid-range pricing."
    elif score < 75:
        return f"Cost is above average at ₹{actual_cost:.0f} ({score:.1f}/100), higher than most alternatives."
    else:
        return f"Cost is high at ₹{actual_cost:.0f} ({score:.1f}/100), among the most expensive options."
