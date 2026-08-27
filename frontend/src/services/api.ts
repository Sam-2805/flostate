/**
 * FLOState API Service
 * Handles all communication with the FastAPI backend
 */

const API_BASE = '/api';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(errorData.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// ---------- Types ----------

export interface Workload {
  id: number;
  name: string;
  workload_type: string;
  complexity: string;
  gpu: string;
  runtime_hours: number;
  deadline: string;
  priority: string;
  budget?: number;
  created_at?: string;
}

export interface WorkloadRequest {
  name: string;
  workload_type: string;
  complexity: string;
  gpu: string;
  runtime_hours: number;
  deadline: string;
  priority: string;
  budget?: number;
}

export interface Region {
  name: string;
  status: string;
  gpus: {
    [key: string]: {
      available: boolean;
      price_per_hour: number;
      count: number;
    };
  };
}

export interface EnvironmentData {
  region: string;
  carbon_forecast: { time: string; hour: string; carbon_intensity: number }[];
  weather_forecast: { time: string; hour: string; temperature: number; humidity: number }[];
  water_stress: { region: string; score: number; category: string; description: string };
  data_mode: string;
  disclaimer: string;
}

export interface ScheduleResult {
  workload: Workload;
  query_routing: {
    query_text: string;
    selected_model: string;
    model_id: string;
    complexity: string;
    compute_units: number;
    reason: string;
    description: string;
    example_queries: string[];
  };
  model_routing: {
    query_text: string;
    selected_model: string;
    model_id: string;
    complexity: string;
    compute_units: number;
    reason: string;
    description: string;
    example_queries: string[];
  };
  recommendation: {
    region: string;
    start_time: string;
    end_time: string;
    start_hour: string;
    end_hour: string;
    final_score: number;
    carbon_score: number;
    water_score: number;
    cooling_score: number;
    cost_score: number;
    estimated_cost: number;
    gpu_price_per_hour: number;
    hourly_scores: any[];
    hourly_carbon: number[];
  } | null;
  all_candidates: any[];
  rejected: { region: string; reason: string; checks: any[] }[];
  summary: {
    total_windows_evaluated: number;
    total_rejected: number;
    regions_analyzed: number;
    scheduler_horizon: number;
    runtime_hours: number;
    gpu_type: string;
  };
  explanation: {
    summary: string;
    why_selected: string[];
    rejected_alternatives: { region: string; reason: string }[];
    factors: { [key: string]: string };
    model_explanation: string;
    score_breakdown: string;
  };
  weights: { [key: string]: number };
  result_id: number | null;
  data_mode: string;
}

export interface JobHistory {
  id: number;
  name: string;
  workload_type: string;
  complexity: string;
  gpu: string;
  runtime_hours: number;
  created_at: string;
  region: string | null;
  start_time: string | null;
  end_time: string | null;
  model: string | null;
  final_score: number | null;
  estimated_cost: number | null;
  reason: string | null;
}

// ---------- API Functions ----------

export const api = {
  // Workloads
  createWorkload: (data: WorkloadRequest) =>
    fetchApi<{ id: number; message: string; workload: Workload }>('/workloads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getWorkloads: () => fetchApi<Workload[]>('/workloads'),

  getWorkload: (id: number) => fetchApi<Workload>(`/workloads/${id}`),

  // Regions
  getRegions: () => fetchApi<Region[]>('/regions'),

  getRegion: (name: string) => fetchApi<Region>(`/regions/${name}`),

  // Environment
  getEnvironment: (region: string) => fetchApi<EnvironmentData>(`/environment/${region}`),

  getAllEnvironment: () => fetchApi<{ regions: { [key: string]: EnvironmentData }; data_mode: string; disclaimer: string }>('/environment'),

  // Scheduling
  schedule: (workloadId: number, weights?: { [key: string]: number }, horizon?: number) =>
    fetchApi<ScheduleResult>('/schedule', {
      method: 'POST',
      body: JSON.stringify({
        workload_id: workloadId,
        weights: weights,
        scheduler_horizon: horizon || 48,
      }),
    }),

  // Backward-compatible alias for old model routing
  routeModel: (complexity: string, workloadType?: string) =>
    fetchApi<any>('/route-model', {
      method: 'POST',
      body: JSON.stringify({ complexity, workload_type: workloadType }),
    }),

  // Jobs
  getJobs: () => fetchApi<JobHistory[]>('/jobs'),

  getJob: (id: number) => fetchApi<any>(`/jobs/${id}`),

  // Config
  getWeights: () => fetchApi<any>('/weights'),

  getConfig: () => fetchApi<any>('/config'),

  // Query Routing
  queryRoute: (queryText: string) =>
    fetchApi<any>('/query-route', {
      method: 'POST',
      body: JSON.stringify({ query_text: queryText }),
    }),

  getQueryRoutes: () => fetchApi<any[]>('/query-routes'),

  getQueryRoutingStats: () => fetchApi<any>('/query-routing-stats'),
};
