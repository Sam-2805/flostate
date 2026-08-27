"""
FLOState - Environmental-Aware AI Workload Orchestrator
FastAPI Backend

Endpoints:
  POST /api/workloads          - Submit a workload
  POST /api/schedule           - Run the scheduling algorithm
  GET  /api/regions            - Get available regions
  GET  /api/regions/{name}     - Get region details
  GET  /api/environment/{region} - Get environmental data for a region
  POST /api/score              - Calculate scores for a region
  POST /api/query-route         - Query Routing: classify complexity and select smallest capable model
  GET  /api/jobs               - Get historical jobs
  GET  /api/jobs/{id}          - Get job details
  GET  /api/weights            - Get default weights
  GET  /api/config             - Get configuration info
"""

import sys
import os

# Ensure the project root is in the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime, timedelta

from backend import database
from backend import config
from backend.services import carbon, weather, water, infrastructure
from backend.engine.normalization import normalize_carbon, normalize_water, normalize_cooling, normalize_cost, get_normalization_info
from backend.engine.scoring import calculate_weighted_score, validate_weights
from backend.engine.model_routing import route_model, route_query, classify_query, get_model_catalog, COMPUTE_UNITS
from backend.engine.scheduler import run_scheduler
from backend.engine.explanation import generate_explanation

# ---------- App Setup ----------
app = FastAPI(
    title="FLOState API",
    description="Environmental-Aware AI Workload Orchestrator",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Pydantic Models ----------

class WorkloadRequest(BaseModel):
    name: str = Field(..., description="Workload name")
    workload_type: str = Field(..., description="Training, Inference, or Fine-tuning")
    complexity: str = Field(..., description="Simple, Medium, or Complex")
    gpu: str = Field(..., description="T4, A10, A100, or H100")
    runtime_hours: float = Field(..., gt=0, description="Estimated runtime in hours")
    deadline: str = Field(..., description="Deadline as ISO datetime string")
    priority: str = Field(default="balanced", description="Sustainability, Balanced, or Cost")
    budget: Optional[float] = Field(default=None, description="Maximum budget in ₹")

class ScoreRequest(BaseModel):
    region: str
    gpu_type: str
    runtime_hours: float
    carbon_value: Optional[float] = None
    temperature: Optional[float] = None
    humidity: Optional[float] = None
    water_stress: Optional[float] = None

class ScheduleRequest(BaseModel):
    workload_id: int
    weights: Optional[Dict[str, float]] = None
    scheduler_horizon: Optional[int] = 48

class QueryRouteRequest(BaseModel):
    query_text: Optional[str] = Field(default=None, description="The user query to classify")
    complexity: Optional[str] = Field(default=None, description="Explicit complexity override")
    workload_type: Optional[str] = None

class WeightsUpdate(BaseModel):
    carbon: float
    water: float
    cooling: float
    cost: float


# ---------- Startup ----------

@app.on_event("startup")
async def startup():
    database.init_db()


# ---------- Workload Endpoints ----------

@app.post("/api/workloads")
async def create_workload(workload: WorkloadRequest):
    """Submit a new workload for analysis."""
    # Validate complexity
    if workload.complexity not in ["Simple", "Medium", "Complex"]:
        raise HTTPException(400, "Complexity must be Simple, Medium, or Complex")
    
    # Validate workload type
    if workload.workload_type not in ["Training", "Inference", "Fine-tuning"]:
        raise HTTPException(400, "Workload type must be Training, Inference, or Fine-tuning")
    
    # Validate GPU
    if workload.gpu not in ["T4", "A10", "A100", "H100"]:
        raise HTTPException(400, "GPU must be T4, A10, A100, or H100")
    
    # Validate priority
    if workload.priority not in ["sustainability", "balanced", "cost"]:
        raise HTTPException(400, "Priority must be sustainability, balanced, or cost")
    
    # Save to database
    wl_dict = workload.dict()
    wl_id = database.save_workload(wl_dict)
    
    return {
        "id": wl_id,
        "message": "Workload submitted successfully",
        "workload": {**wl_dict, "id": wl_id},
    }


@app.get("/api/workloads")
async def list_workloads():
    """Get all workloads."""
    return database.get_all_workloads()


@app.get("/api/workloads/{workload_id}")
async def get_workload(workload_id: int):
    """Get a specific workload."""
    wl = database.get_workload_by_id(workload_id)
    if not wl:
        raise HTTPException(404, "Workload not found")
    return wl


# ---------- Region Endpoints ----------

@app.get("/api/regions")
async def get_regions():
    """Get all available regions with their infrastructure data."""
    infra = infrastructure.get_all_regions_infrastructure()
    result = []
    for name, data in infra.items():
        result.append({
            "name": name,
            "status": data["status"],
            "gpus": data["gpus"],
        })
    return result


@app.get("/api/regions/{region_name}")
async def get_region(region_name: str):
    """Get details for a specific region."""
    if region_name not in ["Mumbai", "Pune", "Delhi", "Bengaluru"]:
        raise HTTPException(404, "Region not found")
    return infrastructure.get_region_infrastructure(region_name)


# ---------- Environmental Data Endpoints ----------

@app.get("/api/environment/{region}")
async def get_environment(region: str):
    """Get environmental data for a region (carbon, weather, water)."""
    if region not in ["Mumbai", "Pune", "Delhi", "Bengaluru"]:
        raise HTTPException(404, "Region not found")
    
    carbon_data = carbon.get_carbon_forecast(region, 48)
    weather_data = weather.get_weather_forecast(region, 48)
    water_data = water.get_water_stress(region)
    
    return {
        "region": region,
        "carbon_forecast": carbon_data,
        "weather_forecast": weather_data,
        "water_stress": water_data,
        "data_mode": config.DATA_MODE,
        "disclaimer": "Prototype/Simulated data. Not from live sources.",
    }


@app.get("/api/environment")
async def get_all_environment():
    """Get environmental data for all regions."""
    regions = ["Mumbai", "Pune", "Delhi", "Bengaluru"]
    result = {}
    for region in regions:
        result[region] = {
            "carbon_forecast": carbon.get_carbon_forecast(region, 48),
            "weather_forecast": weather.get_weather_forecast(region, 48),
            "water_stress": water.get_water_stress(region),
        }
    return {
        "regions": result,
        "data_mode": config.DATA_MODE,
        "disclaimer": "Prototype/Simulated data. Not from live sources.",
    }


# ---------- Scoring Endpoints ----------

@app.post("/api/score")
async def calculate_score(request: ScoreRequest):
    """Calculate normalized and weighted scores for a region."""
    # Get environmental data if not provided
    if request.carbon_value is None:
        forecast = carbon.get_carbon_forecast(request.region, 1)
        request.carbon_value = forecast[0]["carbon_intensity"] if forecast else 50
    
    if request.temperature is None or request.humidity is None:
        w_data = weather.get_weather_forecast(request.region, 1)
        if w_data:
            request.temperature = w_data[0]["temperature"]
            request.humidity = w_data[0]["humidity"]
        else:
            request.temperature = 30
            request.humidity = 60
    
    if request.water_stress is None:
        w_stress = water.get_water_stress(request.region)
        request.water_stress = w_stress["score"]
    
    # Normalize
    carbon_score = normalize_carbon(request.carbon_value)
    water_score = normalize_water(request.water_stress)
    cooling_score = normalize_cooling(request.temperature, request.humidity)
    
    gpu_price = infrastructure.get_gpu_price(request.region, request.gpu_type)
    cost_score = normalize_cost(gpu_price * request.runtime_hours)
    
    # Weighted score with defaults
    scores = calculate_weighted_score(carbon_score, water_score, cooling_score, cost_score)
    
    return {
        "region": request.region,
        "raw": {
            "carbon_intensity": request.carbon_value,
            "temperature": request.temperature,
            "humidity": request.humidity,
            "water_stress": request.water_stress,
            "gpu_price": gpu_price,
            "estimated_cost": gpu_price * request.runtime_hours,
        },
        "normalized": {
            "carbon": carbon_score,
            "water": water_score,
            "cooling": cooling_score,
            "cost": cost_score,
        },
        "weighted": scores,
        "normalization_info": get_normalization_info(),
    }


# ---------- Query Routing Endpoints ----------

@app.post("/api/query-route")
async def api_query_route(request: QueryRouteRequest):
    """
    Level 1 — Query Routing
    Analyze query complexity and route to the smallest capable model.
    
    This answers: "Which AI model should handle this query?"
    Rule-based classifier (not ML). Future versions can use an ML classifier.
    """
    # Route the query
    result = route_query(
        complexity=request.complexity,
        query_text=request.query_text,
        workload_type=request.workload_type,
    )
    
    # Save to history
    database.save_query_route(
        query_text=result["query_text"],
        complexity=result["complexity"],
        selected_model=result["selected_model"],
        compute_units=result["compute_units"],
        reason=result["reason"][:200],
    )
    
    return result


# Backward-compatible alias
@app.post("/api/route-model")
async def api_route_model_compat(request: QueryRouteRequest):
    """Backward-compatible alias for /api/query-route."""
    result = route_query(
        complexity=request.complexity,
        query_text=request.query_text,
        workload_type=request.workload_type,
    )
    return result


@app.get("/api/query-routes")
async def get_query_routes():
    """Get query routing history."""
    return database.get_all_query_routes()


@app.get("/api/query-routing-stats")
async def get_query_routing_stats():
    """Get query routing impact statistics."""
    stats = database.get_query_routing_stats()
    stats["compute_units"] = COMPUTE_UNITS
    stats["disclaimer"] = "Estimated using illustrative compute units; not direct energy measurement."
    return stats


@app.get("/api/model-catalog")
async def api_model_catalog():
    """Get the model catalog with example queries for each tier."""
    return get_model_catalog()


# ---------- Scheduling Endpoints ----------

@app.post("/api/schedule")
async def api_schedule(request: ScheduleRequest):
    """
    Run the full scheduling pipeline:
    1. Load workload
    2. Run model routing
    3. Run sliding-window scheduler
    4. Generate explanation
    5. Save results
    """
    # Load workload
    workload = database.get_workload_by_id(request.workload_id)
    if not workload:
        raise HTTPException(404, "Workload not found")
    
    # Determine weights: explicit > priority-based > defaults
    if request.weights:
        weights = request.weights
    elif workload.get("priority") and workload["priority"] in config.PRIORITY_WEIGHTS:
        weights = config.PRIORITY_WEIGHTS[workload["priority"]]
    else:
        weights = config.DEFAULT_WEIGHTS
    
    # Validate weights
    validation = validate_weights(weights)
    if not validation["valid"]:
        raise HTTPException(400, validation["error"])
    
    # Run query routing — classify complexity and select appropriate model
    model_result = route_model(workload["complexity"], workload["workload_type"])
    
    # Run scheduler
    scheduler_result = run_scheduler(
        workload=workload,
        weights=weights,
        scheduler_horizon=request.scheduler_horizon or config.DEFAULT_SCHEDULER_HORIZON,
    )
    
    # Generate explanation
    explanation = generate_explanation(
        workload=workload,
        best=scheduler_result["best"],
        rejected=scheduler_result["rejected"],
        model_routing=model_result,
        weights=weights,
    )
    
    # Save result if we have a recommendation
    result_id = None
    if scheduler_result["best"]:
        best = scheduler_result["best"]
        save_data = {
            "region": best["region"],
            "start_time": best["start_time"],
            "end_time": best["end_time"],
            "model": model_result["selected_model"],
            "carbon_score": best["carbon_score"],
            "water_score": best["water_score"],
            "cooling_score": best["cooling_score"],
            "cost_score": best["cost_score"],
            "final_score": best["final_score"],
            "estimated_cost": best["estimated_cost"],
            "reason": explanation["summary"],
        }
        result_id = database.save_scheduling_result(request.workload_id, save_data)
    
    return {
        "workload": workload,
        "query_routing": model_result,
        "model_routing": model_result,  # backward-compatible alias
        "recommendation": scheduler_result["best"],
        "all_candidates": scheduler_result["top_candidates"],
        "rejected": scheduler_result["rejected"],
        "summary": scheduler_result["summary"],
        "explanation": explanation,
        "weights": weights,
        "result_id": result_id,
        "data_mode": config.DATA_MODE,
    }


# ---------- Job History Endpoints ----------

@app.get("/api/jobs")
async def get_jobs():
    """Get job history."""
    return database.get_all_job_history()


@app.get("/api/jobs/{job_id}")
async def get_job(job_id: int):
    """Get a specific job's details."""
    workload = database.get_workload_by_id(job_id)
    if not workload:
        raise HTTPException(404, "Job not found")
    
    results = database.get_results_for_workload(job_id)
    return {
        "workload": workload,
        "scheduling_results": results,
    }


# ---------- Configuration Endpoints ----------

@app.get("/api/weights")
async def get_weights():
    """Get default scoring weights and priority presets."""
    return {
        "default": config.DEFAULT_WEIGHTS,
        "presets": config.PRIORITY_WEIGHTS,
        "compute_units": config.COMPUTE_UNITS,
        "description": "Weights must sum to 100%. Lower final score = better option.",
    }


@app.get("/api/config")
async def get_config():
    """Get current configuration."""
    return {
        "data_mode": config.DATA_MODE,
        "scheduler_horizon": config.DEFAULT_SCHEDULER_HORIZON,
        "default_weights": config.DEFAULT_WEIGHTS,
        "data_mode_options": ["DEMO", "LIVE"],
        "scheduler_horizon_options": [24, 48],
        "note": "LIVE mode requires API keys for external services.",
    }


# ---------- Health Check ----------

@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "data_mode": config.DATA_MODE,
    }


# ---------- Static File Serving (for production/Render deployment) ----------

# Find the frontend build directory
FRONTEND_DIST = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend", "dist"
)

if os.path.isdir(FRONTEND_DIST):
    # Serve built frontend static files
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="static-assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve frontend files for all non-API routes (SPA fallback)."""
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # SPA fallback — return index.html for client-side routing
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))


# ---------- Run Server ----------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=config.API_HOST, port=config.API_PORT)
