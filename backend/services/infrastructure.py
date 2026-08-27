"""
FLOState Infrastructure Data Service

Provides GPU availability and pricing information for each region.

In DEMO mode: uses simulated infrastructure data.
In LIVE mode: would connect to cloud provider APIs.

Architecture:
- get_region_infrastructure(region) -> region infrastructure details
- get_gpu_availability(region, gpu_type) -> availability status
- get_gpu_price(region, gpu_type) -> hourly price
"""

# ---------- Configuration ----------
DATA_MODE = "DEMO"

# Infrastructure data per region
# Prices in ₹ (INR) per hour - prototype values
REGION_INFRASTRUCTURE = {
    "Mumbai": {
        "region_name": "Mumbai",
        "status": "Active",
        "gpus": {
            "T4":   {"available": True,  "price_per_hour": 45,  "count": 8},
            "A10":  {"available": True,  "price_per_hour": 85,  "count": 6},
            "A100": {"available": True,  "price_per_hour": 195, "count": 4},
            "H100": {"available": False, "price_per_hour": 450, "count": 0},
        },
    },
    "Pune": {
        "region_name": "Pune",
        "status": "Active",
        "gpus": {
            "T4":   {"available": True,  "price_per_hour": 40,  "count": 10},
            "A10":  {"available": True,  "price_per_hour": 78,  "count": 8},
            "A100": {"available": True,  "price_per_hour": 180, "count": 6},
            "H100": {"available": True,  "price_per_hour": 420, "count": 2},
        },
    },
    "Delhi": {
        "region_name": "Delhi",
        "status": "Active",
        "gpus": {
            "T4":   {"available": True,  "price_per_hour": 50,  "count": 6},
            "A10":  {"available": True,  "price_per_hour": 90,  "count": 4},
            "A100": {"available": False, "price_per_hour": 210, "count": 0},
            "H100": {"available": False, "price_per_hour": 480, "count": 0},
        },
    },
    "Bengaluru": {
        "region_name": "Bengaluru",
        "status": "Active",
        "gpus": {
            "T4":   {"available": True,  "price_per_hour": 48,  "count": 12},
            "A10":  {"available": True,  "price_per_hour": 88,  "count": 7},
            "A100": {"available": True,  "price_per_hour": 200, "count": 5},
            "H100": {"available": True,  "price_per_hour": 440, "count": 1},
        },
    },
}


def get_region_infrastructure(region: str) -> dict:
    """Get full infrastructure details for a region."""
    if region not in REGION_INFRASTRUCTURE:
        raise ValueError(f"Unknown region: {region}")
    return REGION_INFRASTRUCTURE[region]


def get_gpu_availability(region: str, gpu_type: str) -> dict:
    """
    Check GPU availability in a region.
    
    Returns: {"available": bool, "count": int, "price_per_hour": float}
    """
    if region not in REGION_INFRASTRUCTURE:
        raise ValueError(f"Unknown region: {region}")
    
    region_data = REGION_INFRASTRUCTURE[region]
    if gpu_type not in region_data["gpus"]:
        return {"available": False, "count": 0, "price_per_hour": 0}
    
    gpu_data = region_data["gpus"][gpu_type]
    return {
        "available": gpu_data["available"],
        "count": gpu_data["count"],
        "price_per_hour": gpu_data["price_per_hour"],
    }


def get_gpu_price(region: str, gpu_type: str) -> float:
    """Get hourly price for a GPU type in a region."""
    availability = get_gpu_availability(region, gpu_type)
    return availability["price_per_hour"]


def get_all_regions_infrastructure() -> dict:
    """Get infrastructure data for all regions."""
    return {region: get_region_infrastructure(region) for region in REGION_INFRASTRUCTURE}


def get_available_regions_for_gpu(gpu_type: str) -> list:
    """Get list of regions where a specific GPU type is available."""
    available = []
    for region in REGION_INFRASTRUCTURE:
        gpu_data = REGION_INFRASTRUCTURE[region].get("gpus", {}).get(gpu_type, {})
        if gpu_data.get("available", False):
            available.append(region)
    return available
