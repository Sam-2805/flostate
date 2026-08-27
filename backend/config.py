"""
FLOState Configuration
Environment-aware AI Workload Orchestrator
"""

import os

# Data Mode: "DEMO" or "LIVE" (future)
DATA_MODE = os.getenv("FLOSTATE_DATA_MODE", "DEMO")

# Scheduler horizon in hours
DEFAULT_SCHEDULER_HORIZON = int(os.getenv("FLOSTATE_SCHEDULER_HORIZON", "48"))

# Database
DATABASE_URL = os.getenv("FLOSTATE_DATABASE_URL", "sqlite:///./flostate.db")

# Default weights for scoring engine
DEFAULT_WEIGHTS = {
    "carbon": 40,
    "water": 25,
    "cooling": 20,
    "cost": 15,
}

# Priority-based weight presets (must sum to 100)
PRIORITY_WEIGHTS = {
    "sustainability": {
        "carbon": 50,
        "water": 25,
        "cooling": 20,
        "cost": 5,
    },
    "balanced": {
        "carbon": 40,
        "water": 25,
        "cooling": 20,
        "cost": 15,
    },
    "cost": {
        "carbon": 20,
        "water": 15,
        "cooling": 15,
        "cost": 50,
    },
}

# Compute units for query routing (illustrative, not actual energy)
COMPUTE_UNITS = {
    "Small Model": 1,
    "Medium Model": 3,
    "Large Model": 10,
}

# Normalization bounds (consistent, documented)
NORMALIZATION_BOUNDS = {
    "carbon": {"min": 10, "max": 100},   # gCO2eq/kWh
    "water": {"min": 20, "max": 80},      # water stress index
    "cost": {"min": 40, "max": 500},       # INR estimated cost
}

# API settings
API_HOST = "0.0.0.0"
API_PORT = 8000

# CORS origins
CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"]
