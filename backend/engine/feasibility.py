"""
FLOState Feasibility Checker

Validates whether a scheduling window is feasible for a given workload.

Checks:
1. GPU availability in region
2. Required runtime fits in window
3. Window falls within deadline
4. Region is active
5. Estimated cost within budget (if provided)
"""

from datetime import datetime, timedelta
from typing import Dict, List


def check_feasibility(
    region: str,
    gpu_type: str,
    runtime_hours: float,
    window_start: datetime,
    window_end: datetime,
    deadline: datetime,
    gpu_available: bool,
    estimated_cost: float,
    budget: float = None,
    region_status: str = "Active",
) -> dict:
    """
    Check if a scheduling window is feasible.
    
    Returns:
        {
            "feasible": bool,
            "checks": list of {name, passed, reason},
            "rejection_reason": str or None,
        }
    """
    checks = []
    rejection_reason = None
    
    # 1. Region availability
    region_ok = region_status == "Active"
    checks.append({
        "name": "Region Active",
        "passed": region_ok,
        "reason": f"Region {region} is {region_status}" if not region_ok else f"Region {region} is active",
    })
    if not region_ok and rejection_reason is None:
        rejection_reason = f"Region {region} is not active (status: {region_status})"
    
    # 2. GPU availability
    checks.append({
        "name": "GPU Available",
        "passed": gpu_available,
        "reason": f"{gpu_type} GPU is available in {region}" if gpu_available else f"{gpu_type} GPU is unavailable in {region}",
    })
    if not gpu_available and rejection_reason is None:
        rejection_reason = f"{gpu_type} GPU unavailable in {region}"
    
    # 3. Window within deadline
    within_deadline = window_end <= deadline
    checks.append({
        "name": "Meets Deadline",
        "passed": within_deadline,
        "reason": f"Window ends at {window_end.strftime('%H:%M')}, deadline is {deadline.strftime('%H:%M')}" if within_deadline
                  else f"Window ends at {window_end.strftime('%H:%M')} which exceeds deadline of {deadline.strftime('%H:%M')}",
    })
    if not within_deadline and rejection_reason is None:
        rejection_reason = f"Execution window exceeds deadline"
    
    # 4. Window start within deadline
    start_within = window_start < deadline
    checks.append({
        "name": "Start Before Deadline",
        "passed": start_within,
        "reason": f"Window starts at {window_start.strftime('%H:%M')}, before deadline" if start_within
                  else f"Window starts after deadline",
    })
    if not start_within and rejection_reason is None:
        rejection_reason = "Execution would start after deadline"
    
    # 5. Budget check
    if budget is not None and budget > 0:
        within_budget = estimated_cost <= budget
        checks.append({
            "name": "Within Budget",
            "passed": within_budget,
            "reason": f"Estimated cost ₹{estimated_cost:.0f} within budget ₹{budget:.0f}" if within_budget
                      else f"Estimated cost ₹{estimated_cost:.0f} exceeds budget ₹{budget:.0f}",
        })
        if not within_budget and rejection_reason is None:
            rejection_reason = f"Estimated cost ₹{estimated_cost:.0f} exceeds budget ₹{budget:.0f}"
    else:
        checks.append({
            "name": "Within Budget",
            "passed": True,
            "reason": "No budget constraint specified",
        })
    
    # 6. Runtime check
    window_duration = (window_end - window_start).total_seconds() / 3600
    fits_runtime = window_duration >= runtime_hours
    checks.append({
        "name": "Sufficient Runtime Window",
        "passed": fits_runtime,
        "reason": f"Window duration {window_duration:.1f}h ≥ required {runtime_hours:.1f}h" if fits_runtime
                  else f"Window duration {window_duration:.1f}h < required {runtime_hours:.1f}h",
    })
    if not fits_runtime and rejection_reason is None:
        rejection_reason = "Window too short for required runtime"
    
    all_passed = all(c["passed"] for c in checks)
    
    return {
        "feasible": all_passed,
        "checks": checks,
        "rejection_reason": rejection_reason if not all_passed else None,
    }


def format_feasibility_result(result: dict) -> str:
    """Format feasibility result as a readable string."""
    status = "FEASIBLE ✓" if result["feasible"] else "REJECTED ✕"
    lines = [f"Status: {status}"]
    
    if result["rejection_reason"]:
        lines.append(f"Reason: {result['rejection_reason']}")
    
    for check in result["checks"]:
        icon = "✓" if check["passed"] else "✕"
        lines.append(f"  {icon} {check['name']}: {check['reason']}")
    
    return "\n".join(lines)
