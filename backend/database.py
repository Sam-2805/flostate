"""
FLOState Database Layer
SQLite database for workloads, scheduling results, and environmental cache
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "flostate.db"


def get_connection():
    """Get a new database connection."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Initialize the database schema."""
    conn = get_connection()
    cursor = conn.cursor()

    # Workloads table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workloads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            workload_type TEXT NOT NULL,
            complexity TEXT NOT NULL,
            gpu TEXT NOT NULL,
            runtime_hours REAL NOT NULL,
            deadline TEXT NOT NULL,
            priority TEXT DEFAULT 'balanced',
            budget REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Scheduling results table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS scheduling_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workload_id INTEGER NOT NULL,
            region TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL,
            model TEXT NOT NULL,
            carbon_score REAL NOT NULL,
            water_score REAL NOT NULL,
            cooling_score REAL NOT NULL,
            cost_score REAL NOT NULL,
            final_score REAL NOT NULL,
            estimated_cost REAL NOT NULL,
            reason TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (workload_id) REFERENCES workloads(id)
        )
    """)

    # Environmental cache table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS environmental_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            region TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            carbon REAL,
            temperature REAL,
            humidity REAL,
            water_stress REAL,
            gpu_available INTEGER DEFAULT 1,
            gpu_price REAL
        )
    """)

    # Query routing history table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS query_routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            query_text TEXT NOT NULL,
            complexity TEXT NOT NULL,
            selected_model TEXT NOT NULL,
            compute_units INTEGER NOT NULL,
            reason TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


def save_workload(workload: dict) -> int:
    """Save a workload and return its ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO workloads (name, workload_type, complexity, gpu, runtime_hours, deadline, priority, budget)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        workload["name"],
        workload["workload_type"],
        workload["complexity"],
        workload["gpu"],
        workload["runtime_hours"],
        workload["deadline"],
        workload.get("priority", "balanced"),
        workload.get("budget"),
    ))
    workload_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return workload_id


def save_scheduling_result(workload_id: int, result: dict) -> int:
    """Save a scheduling result and return its ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO scheduling_results
        (workload_id, region, start_time, end_time, model,
         carbon_score, water_score, cooling_score, cost_score,
         final_score, estimated_cost, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        workload_id,
        result["region"],
        result["start_time"],
        result["end_time"],
        result["model"],
        result["carbon_score"],
        result["water_score"],
        result["cooling_score"],
        result["cost_score"],
        result["final_score"],
        result["estimated_cost"],
        result["reason"],
    ))
    result_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return result_id


def save_env_cache(region: str, timestamp: str, data: dict):
    """Save environmental data to cache."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO environmental_cache (region, timestamp, carbon, temperature, humidity, water_stress, gpu_available, gpu_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        region, timestamp,
        data.get("carbon"),
        data.get("temperature"),
        data.get("humidity"),
        data.get("water_stress"),
        1 if data.get("gpu_available", True) else 0,
        data.get("gpu_price"),
    ))
    conn.commit()
    conn.close()


def get_all_workloads():
    """Retrieve all workloads."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM workloads ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_workload_by_id(workload_id: int):
    """Retrieve a single workload by ID."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM workloads WHERE id = ?", (workload_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_results_for_workload(workload_id: int):
    """Retrieve scheduling results for a workload."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM scheduling_results WHERE workload_id = ?", (workload_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_job_history():
    """Get job history with workload info joined."""
    conn = get_connection()
    rows = conn.execute("""
        SELECT w.id, w.name, w.workload_type, w.complexity, w.gpu, w.runtime_hours, w.created_at,
               s.region, s.start_time, s.end_time, s.model, s.final_score, s.estimated_cost, s.reason
        FROM workloads w
        LEFT JOIN scheduling_results s ON w.id = s.workload_id
        ORDER BY w.created_at DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ---------- Query Routing ----------

def save_query_route(query_text: str, complexity: str, selected_model: str, compute_units: int, reason: str) -> int:
    """Save a query routing result and return its ID."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO query_routes (query_text, complexity, selected_model, compute_units, reason)
        VALUES (?, ?, ?, ?, ?)
    """, (query_text, complexity, selected_model, compute_units, reason))
    route_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return route_id


def get_all_query_routes():
    """Retrieve all query routing history."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM query_routes ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_query_routing_stats():
    """Get aggregated query routing statistics."""
    conn = get_connection()
    total = conn.execute("SELECT COUNT(*) as cnt FROM query_routes").fetchone()["cnt"]
    if total == 0:
        conn.close()
        return {
            "total": 0, "small": 0, "medium": 0, "large": 0,
            "small_pct": 0, "medium_pct": 0, "large_pct": 0,
            "avoiding_large_pct": 0,
            "baseline_compute": 0, "flostate_compute": 0, "compute_saved": 0, "reduction_pct": 0,
        }
    small = conn.execute("SELECT COUNT(*) as cnt FROM query_routes WHERE complexity='Simple'").fetchone()["cnt"]
    medium = conn.execute("SELECT COUNT(*) as cnt FROM query_routes WHERE complexity='Moderate'").fetchone()["cnt"]
    large = conn.execute("SELECT COUNT(*) as cnt FROM query_routes WHERE complexity='Complex'").fetchone()["cnt"]
    conn.close()

    # Compute units: Small=1, Medium=3, Large=10
    baseline_compute = total * 10  # If all went to Large Model
    flostate_compute = (small * 1) + (medium * 3) + (large * 10)
    compute_saved = baseline_compute - flostate_compute
    reduction_pct = round((compute_saved / baseline_compute) * 100, 1) if baseline_compute > 0 else 0
    avoiding_large = round(((total - large) / total) * 100, 1) if total > 0 else 0

    return {
        "total": total,
        "small": small,
        "medium": medium,
        "large": large,
        "small_pct": round((small / total) * 100, 1),
        "medium_pct": round((medium / total) * 100, 1),
        "large_pct": round((large / total) * 100, 1),
        "avoiding_large_pct": avoiding_large,
        "baseline_compute": baseline_compute,
        "flostate_compute": flostate_compute,
        "compute_saved": compute_saved,
        "reduction_pct": reduction_pct,
    }


def seed_demo_queries():
    """Seed 1000 demo queries if the table is empty."""
    conn = get_connection()
    count = conn.execute("SELECT COUNT(*) as cnt FROM query_routes").fetchone()["cnt"]
    if count > 0:
        conn.close()
        return

    # Seed 1000 demo queries: 600 Simple, 300 Moderate, 100 Complex
    demo_queries = [
        # 600 Simple
        *("What is 2 + 2?", "What is the capital of France?", "Convert 5 USD to INR.",
          "Is Python a programming language?", "What day is it today?", "Define ""hello"".",
          "What is 10 * 5?", "List the first 3 prime numbers.", "What color is the sky?",
          "Translate ""thank you"" to Spanish.") * 60,
        # 300 Moderate
        *("Explain how TCP congestion control works.", "Summarize this 10-page research paper.",
          "Write a Python function to parse CSV files.", "Classify the sentiment of this product review.",
          "Compare REST and GraphQL API design patterns.", "Debug this JavaScript async/await issue.",
          "Explain the difference between TCP and UDP.", "Write a SQL query to find top 10 customers.",
          "Describe how a neural network learns.", "Refactor this code to use design patterns.") * 30,
        # 100 Complex
        *("Analyze this complex research problem and compare multiple algorithmic approaches.",
          "Design a distributed system architecture for a real-time recommendation engine.",
          "Critique this legal contract and identify potential liability issues.",
          "Fine-tune a language model on domain-specific medical data.",
          "Develop a multi-objective optimization strategy for supply chain logistics.",
          "Synthesize findings from 50 research papers on climate modeling.",
          "Build a comprehensive security audit framework for cloud infrastructure.",
          "Create a novel approach to federated learning with differential privacy.",
          "Analyze market dynamics and predict sector rotation for next quarter.",
          "Design a fault-tolerant consensus protocol for Byzantine environments.") * 10,
    ]

    # Route each query through the classifier
    from backend.engine.model_routing import route_query
    for query_text in demo_queries:
        result = route_query(query_text=query_text)
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO query_routes (query_text, complexity, selected_model, compute_units, reason) VALUES (?, ?, ?, ?, ?)",
            (query_text, result["complexity"], result["selected_model"], result["compute_units"], result["reason"][:200]),
        )

    conn.commit()
    conn.close()


# Initialize on import
init_db()
seed_demo_queries()
