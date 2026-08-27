"""
FLOState Query Routing Engine

Level 1 of FLOState: Analyze a user's QUERY and route it to the
smallest capable model.

ARCHITECTURE:
  User Query (text)
        ↓
  QUERY CLASSIFIER / COMPLEXITY ANALYZER (rule-based)
        ↓
  Complexity: Simple | Moderate | Complex
        ↓
  Model: Small (1 unit) | Medium (3 units) | Large (10 units)

The key principle:
  "Use the smallest capable model for the query instead of using
   a large model for every request."

This is a RULE-BASED ROUTER in the current prototype.
Future versions can replace it with an ML-based classifier.

Compute Units (illustrative, NOT actual energy measurements):
  Small Model  = 1 compute unit
  Medium Model = 3 compute units
  Large Model  = 10 compute units
"""

import re
from typing import Optional

# ---------- Compute Units ----------
COMPUTE_UNITS = {
    "Small Model": 1,
    "Medium Model": 3,
    "Large Model": 10,
}

# ---------- Model Catalog ----------
MODEL_CATALOG = {
    "Simple": {
        "model_name": "Small Model",
        "model_id": "small-7b",
        "compute_units": 1,
        "description": "A compact model suitable for basic inference and simple tasks.",
        "example_queries": [
            "What is 2 + 2?",
            "What is the capital of France?",
            "Convert this text to uppercase.",
        ],
    },
    "Moderate": {
        "model_name": "Medium Model",
        "model_id": "medium-13b",
        "compute_units": 3,
        "description": "A balanced model for moderate complexity tasks.",
        "example_queries": [
            "Explain how TCP congestion control works.",
            "Write a Python function to parse CSV files.",
            "Classify the sentiment of this review.",
        ],
    },
    "Complex": {
        "model_name": "Large Model",
        "model_id": "large-70b",
        "compute_units": 10,
        "description": "A large model for complex reasoning and advanced tasks.",
        "example_queries": [
            "Analyze this complex research problem and compare approaches.",
            "Design a distributed system architecture.",
            "Fine-tune a language model on medical data.",
        ],
    },
}

# ---------- Rule-Based Classifier Keywords ----------

# Simple indicators: short queries, factual Q&A, basic operations
SIMPLE_PATTERNS = [
    r"^(what|who|when|where|is|are|do|does|can|could|would|should)\b.{0,30}\??$",
    r"^(define|translate|convert|list|count|how many|how much)\b",
    r"\b(2\s*\+\s*2|10\s*\*\s*5|capital of|color of|day is it)\b",
    r"^(hello|hi|hey|thanks|thank you|yes|no|ok)\s*[.!?]?$",
    r"^(true or false|right or wrong)\b",
]

# Complex indicators: analysis, design, multi-step, research, critique, synthesis
COMPLEX_PATTERNS = [
    r"\b(analyze|analyse|compare multiple|critique|synthesize|synthesise)\b",
    r"\b(design (a|an) (distributed|complex|novel|comprehensive|multi))\b",
    r"\b(fine-tune|finetune|train a model|build a (framework|system|audit))\b",
    r"\b(research (problem|paper|approach)|multiple (approach|algorithm|perspective))\b",
    r"\b(develop (a|an) (novel|advanced|comprehensive))\b",
    r"\b(predict|forecast).{0,30}(market|sector|trend|climate)\b",
    r"\b(create|build|design).{0,40}(optimization|strategy|protocol|framework)\b",
    r"\b(federated learning|byzantine|differential privacy|consensus protocol)\b",
    r"\b(security audit|liability|contract).{0,30}(framework|issues|identify)\b",
    r"\b\d+\s*(research|paper|study|source).{0,30}(find|result|analysis)\b",
]

# Moderate indicators: explanation, comparison, writing, debugging
MODERATE_PATTERNS = [
    r"\b(explain|describe|summarize|summarise|compare|contrast)\b",
    r"\b(write|create|build|implement|code|program)\b.{0,40}\b(function|script|query|code)\b",
    r"\b(debug|fix|refactor|improve|optimize)\b.{0,40}\b(code|function|issue|bug)\b",
    r"\b(difference between|versus|vs\.?|pros and cons)\b",
    r"\b(how does|how do|how can|how to)\b.{0,50}\b(work|implement|use|build)\b",
    r"\b(classify|categorize|categorise|sentiment|analysis of)\b",
]


def classify_query(query: str) -> str:
    """
    Rule-based query complexity classifier.

    Returns: "Simple", "Moderate", or "Complex"
    """
    q = query.strip().lower()

    # Check for Complex patterns first (most specific)
    for pattern in COMPLEX_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return "Complex"

    # Check for Simple patterns (short, factual)
    simple_score = 0
    for pattern in SIMPLE_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            simple_score += 1

    # Short queries with simple structure
    word_count = len(q.split())
    if word_count <= 6 and simple_score > 0:
        return "Simple"
    if word_count <= 4:
        return "Simple"

    # Check for Moderate patterns
    for pattern in MODERATE_PATTERNS:
        if re.search(pattern, q, re.IGNORECASE):
            return "Moderate"

    # Default: moderate for medium-length, complex for long queries
    if word_count <= 10:
        return "Moderate"
    return "Complex"


def route_query(complexity: Optional[str] = None, query_text: Optional[str] = None,
                workload_type: Optional[str] = None) -> dict:
    """
    Analyze query complexity and route to the smallest capable model.

    Args:
        complexity: Explicit complexity override ("Simple", "Moderate", "Complex")
        query_text: The actual user query text (used for classification if complexity not given)
        workload_type: "Training", "Inference", or "Fine-tuning" (optional context)

    Returns:
        {
            "query_text": str,
            "complexity": str,
            "selected_model": str,
            "model_id": str,
            "compute_units": int,
            "reason": str,
            "description": str,
            "example_queries": list,
        }
    """
    # Determine complexity
    if complexity is None:
        if query_text:
            complexity = classify_query(query_text)
        else:
            complexity = "Moderate"  # default fallback

    if complexity not in MODEL_CATALOG:
        raise ValueError(f"Invalid complexity: {complexity}. Must be Simple, Moderate, or Complex.")

    model = MODEL_CATALOG[complexity]
    compute_units = model["compute_units"]

    # Build reason
    if complexity == "Simple":
        reason = (
            f"This query can be handled by a smaller capable model, "
            f"avoiding unnecessary computation. "
            f"Routing to {model['model_name']} saves {10 - compute_units} compute units "
            f"compared to the Large Model."
        )
    elif complexity == "Moderate":
        reason = (
            f"This query requires moderate reasoning and comprehension. "
            f"{model['model_name']} provides good performance without excessive resource usage."
        )
    else:
        reason = (
            f"This query requires complex multi-step reasoning, analysis, or synthesis. "
            f"{model['model_name']} is needed to handle the task effectively."
        )

    display_query = query_text if query_text else "(workload-based routing)"

    return {
        "query_text": display_query,
        "complexity": complexity,
        "selected_model": model["model_name"],
        "model_id": model["model_id"],
        "compute_units": compute_units,
        "reason": reason,
        "description": model["description"],
        "example_queries": model["example_queries"],
    }


def get_model_catalog() -> dict:
    """Get the full model catalog."""
    return MODEL_CATALOG


# Backward-compatible alias
def route_model(complexity: str, workload_type: Optional[str] = None) -> dict:
    """Alias for route_query — backward compatibility.
    
    Maps workload form complexity (Simple/Medium/Complex) to query routing tiers:
    Simple -> Simple, Medium -> Moderate, Complex -> Complex
    """
    # Map workload form values to query routing tiers
    complexity_map = {"Simple": "Simple", "Medium": "Moderate", "Complex": "Complex"}
    mapped = complexity_map.get(complexity, complexity)
    result = route_query(complexity=mapped, workload_type=workload_type)
    result["typical_use"] = MODEL_CATALOG.get(mapped, {}).get("example_queries", [])
    return result
