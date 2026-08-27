"""
FLOState Sliding-Window Scheduling Engine

This is the CORE of the project. The scheduler:

1. Takes a workload and candidate regions
2. Generates every possible continuous window of `runtime` hours
3. For each window in each region:
   a. Collects environmental data for each hour
   b. Normalizes scores
   c. Calculates weighted scores
   d. Checks feasibility
4. Rejects infeasible windows
5. Compares remaining windows
6. Selects the lowest-scoring feasible window

The result is the best region, time window, and score.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from backend.engine.normalization import normalize_carbon, normalize_water, normalize_cooling, normalize_cost
from backend.engine.scoring import calculate_weighted_score
from backend.engine.feasibility import check_feasibility
from backend.services.carbon import get_carbon_forecast
from backend.services.weather import get_weather_forecast
from backend.services.water import get_water_stress
from backend.services.infrastructure import get_gpu_availability, get_gpu_price


def calculate_window_score(
    region: str,
    window_start_idx: int,
    runtime_hours: int,
    carbon_forecast: List[dict],
    weather_forecast: List[dict],
    water_data: dict,
    gpu_type: str,
    weights: Dict[str, float],
) -> dict:
    """
    Calculate the average weighted score for a time window.
    
    For each hour in the window:
    1. Get carbon, temperature, humidity from forecast
    2. Normalize to 0-100
    3. Get water stress (stable per region)
    4. Calculate estimated cost
    5. Compute weighted score
    
    Returns average scores across all hours in window.
    """
    hourly_scores = []
    
    for i in range(runtime_hours):
        idx = window_start_idx + i
        if idx >= len(carbon_forecast) or idx >= len(weather_forecast):
            break
        
        # Get environmental data for this hour
        carbon_val = carbon_forecast[idx]["carbon_intensity"]
        temp = weather_forecast[idx]["temperature"]
        humidity = weather_forecast[idx]["humidity"]
        water_val = water_data["score"]
        
        # Normalize
        carbon_score = normalize_carbon(carbon_val)
        water_score = normalize_water(water_val)
        cooling_score = normalize_cooling(temp, humidity)
        
        # Cost is per hour, so use the GPU price directly as cost proxy
        hourly_cost = get_gpu_price(region, gpu_type)
        cost_score = normalize_cost(hourly_cost)
        
        # Calculate weighted score for this hour
        scores = calculate_weighted_score(
            carbon_score, water_score, cooling_score, cost_score, weights
        )
        hourly_scores.append(scores)
    
    if not hourly_scores:
        return None
    
    # Average across all hours in window
    avg = {
        "carbon_score": round(sum(s["carbon_score"] for s in hourly_scores) / len(hourly_scores), 2),
        "water_score": round(sum(s["water_score"] for s in hourly_scores) / len(hourly_scores), 2),
        "cooling_score": round(sum(s["cooling_score"] for s in hourly_scores) / len(hourly_scores), 2),
        "cost_score": round(sum(s["cost_score"] for s in hourly_scores) / len(hourly_scores), 2),
        "final_score": round(sum(s["final_score"] for s in hourly_scores) / len(hourly_scores), 2),
        "carbon_contributions": [s["carbon_contribution"] for s in hourly_scores],
        "water_contributions": [s["water_contribution"] for s in hourly_scores],
        "cooling_contributions": [s["cooling_contribution"] for s in hourly_scores],
        "cost_contributions": [s["cost_contribution"] for s in hourly_scores],
        "hourly_carbon": [carbon_forecast[window_start_idx + i]["carbon_intensity"] for i in range(runtime_hours) if window_start_idx + i < len(carbon_forecast)],
        "hourly_scores": hourly_scores,
    }
    
    return avg


def run_scheduler(
    workload: dict,
    weights: Dict[str, float],
    scheduler_horizon: int = 48,
) -> dict:
    """
    Run the sliding-window scheduler.
    
    Args:
        workload: {
            "name": str,
            "workload_type": str,
            "complexity": str,
            "gpu": str,
            "runtime_hours": float,
            "deadline": str,  # ISO format datetime
            "priority": str,
            "budget": float or None,
        }
        weights: {"carbon": float, "water": float, "cooling": float, "cost": float}
        scheduler_horizon: hours to look ahead
    
    Returns:
        {
            "best": {...} or None,
            "rejected": [...],
            "all_windows": [...],
            "summary": {...},
        }
    """
    runtime = int(workload["runtime_hours"])
    deadline = datetime.fromisoformat(workload["deadline"].replace("Z", "+00:00").replace("+00:00", ""))
    gpu_type = workload["gpu"]
    budget = workload.get("budget")
    
    # Get environmental forecasts for all regions
    regions = ["Mumbai", "Pune", "Delhi", "Bengaluru"]
    
    all_candidates = []
    rejected = []
    
    for region in regions:
        try:
            # Get environmental data
            carbon_forecast = get_carbon_forecast(region, scheduler_horizon)
            weather_forecast = get_weather_forecast(region, scheduler_horizon)
            water_data = get_water_stress(region)
            
            # Get infrastructure data
            gpu_info = get_gpu_availability(region, gpu_type)
            
            # Sliding window: generate all possible windows
            start_time = datetime.now().replace(minute=0, second=0, microsecond=0)
            
            for window_idx in range(scheduler_horizon - runtime + 1):
                window_start = start_time + timedelta(hours=window_idx)
                window_end = window_start + timedelta(hours=runtime)
                
                # Check feasibility
                feasibility = check_feasibility(
                    region=region,
                    gpu_type=gpu_type,
                    runtime_hours=runtime,
                    window_start=window_start,
                    window_end=window_end,
                    deadline=deadline,
                    gpu_available=gpu_info["available"],
                    estimated_cost=gpu_info["price_per_hour"] * runtime,
                    budget=budget,
                )
                
                if not feasibility["feasible"]:
                    # Only record rejection for first window per region (to avoid spam)
                    if window_idx == 0:
                        rejected.append({
                            "region": region,
                            "gpu_type": gpu_type,
                            "reason": feasibility["rejection_reason"],
                            "checks": feasibility["checks"],
                        })
                    continue
                
                # Calculate scores for this window
                window_scores = calculate_window_score(
                    region=region,
                    window_start_idx=window_idx,
                    runtime_hours=runtime,
                    carbon_forecast=carbon_forecast,
                    weather_forecast=weather_forecast,
                    water_data=water_data,
                    gpu_type=gpu_type,
                    weights=weights,
                )
                
                if window_scores is None:
                    continue
                
                estimated_cost = gpu_info["price_per_hour"] * runtime
                
                candidate = {
                    "region": region,
                    "start_time": window_start.strftime("%Y-%m-%d %H:%M"),
                    "end_time": window_end.strftime("%Y-%m-%d %H:%M"),
                    "start_hour": window_start.strftime("%H:%M"),
                    "end_hour": window_end.strftime("%H:%M"),
                    "final_score": window_scores["final_score"],
                    "carbon_score": window_scores["carbon_score"],
                    "water_score": window_scores["water_score"],
                    "cooling_score": window_scores["cooling_score"],
                    "cost_score": window_scores["cost_score"],
                    "estimated_cost": round(estimated_cost, 2),
                    "gpu_price_per_hour": gpu_info["price_per_hour"],
                    "gpu_available": gpu_info["available"],
                    "hourly_scores": window_scores.get("hourly_scores", []),
                    "hourly_carbon": window_scores.get("hourly_carbon", []),
                    "feasibility": feasibility,
                }
                
                all_candidates.append(candidate)
        
        except Exception as e:
            rejected.append({
                "region": region,
                "gpu_type": gpu_type,
                "reason": f"Error processing region: {str(e)}",
                "checks": [],
            })
    
    # Sort candidates by final score (lower is better)
    all_candidates.sort(key=lambda x: x["final_score"])
    
    best = None
    if all_candidates:
        best = all_candidates[0]
    
    # Summary stats
    summary = {
        "total_windows_evaluated": len(all_candidates),
        "total_rejected": len(rejected),
        "regions_analyzed": len(regions),
        "scheduler_horizon": scheduler_horizon,
        "runtime_hours": runtime,
        "gpu_type": gpu_type,
    }
    
    return {
        "best": best,
        "rejected": rejected,
        "all_windows": all_candidates,
        "summary": summary,
        "top_candidates": all_candidates[:5] if len(all_candidates) > 5 else all_candidates,
    }
