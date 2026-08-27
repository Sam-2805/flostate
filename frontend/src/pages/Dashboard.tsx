import React, { useState, useEffect } from 'react'
import { api, ScheduleResult, JobHistory } from '../services/api'
import { Page } from '../App'

interface Props {
  onNavigate: (page: Page) => void;
}

export default function Dashboard({ onNavigate }: Props) {
  const [jobs, setJobs] = useState<JobHistory[]>([])
  const [lastResult, setLastResult] = useState<ScheduleResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const jobsData = await api.getJobs()
      setJobs(jobsData)
    } catch (e) {
      console.error('Failed to load jobs:', e)
    } finally {
      setLoading(false)
    }
  }

  const recentJob = jobs.length > 0 ? jobs[0] : null
  const totalJobs = jobs.length

  return (
    <div>
      <div className="page-header page-header-with-status">
        <div>
          <h1>FLOState Orchestrator</h1>
          <p>Environmental-Aware AI Workload Orchestrator</p>
        </div>
        <div className="status-badge ready">
          <span className="status-dot"></span>
          Optimization Ready
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <span>ℹ️</span>
        <div>
          <strong>Prototype Mode</strong> — All environmental, infrastructure, and cost data shown is simulated.
          This prototype demonstrates orchestration decision logic, not live cloud operations.
        </div>
      </div>

      {/* Quick Action */}
      <div style={{ marginBottom: 24 }}>
        <button className="btn btn-primary btn-lg" onClick={() => onNavigate('workload')}>
          ⚡ Submit New Workload
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Total Jobs</span>
            <div className="card-icon blue">📋</div>
          </div>
          <div className="card-value">{totalJobs}</div>
          <div className="card-subtitle">Workloads analyzed</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Regions</span>
            <div className="card-icon green">🌐</div>
          </div>
          <div className="card-value">4</div>
          <div className="card-subtitle">Simulated regions</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Data Mode</span>
            <div className="card-icon amber">📡</div>
          </div>
          <div className="card-value" style={{ fontSize: 20 }}>DEMO</div>
          <div className="card-subtitle">Simulated data</div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Scheduler</span>
            <div className="card-icon green">🔄</div>
          </div>
          <div className="card-value" style={{ fontSize: 20 }}>48h</div>
          <div className="card-subtitle">Look-ahead window</div>
        </div>
      </div>

      {/* Recent Job or Empty State */}
      {recentJob ? (
        <div style={{ marginBottom: 32 }}>
          <div className="section-header">
            <h2 className="section-title">Latest Recommendation</h2>
            <button className="btn btn-secondary" onClick={() => onNavigate('history')}>
              View All Jobs →
            </button>
          </div>
          <div className="grid-3">
            <div className="card">
              <div className="card-header">
                <span className="card-title">Job Name</span>
                <div className="card-icon green">⚡</div>
              </div>
              <div className="card-value" style={{ fontSize: 20 }}>{recentJob.name}</div>
              <div className="card-subtitle">{recentJob.workload_type} · {recentJob.complexity}</div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Selected Region</span>
                <div className="card-icon blue">🌐</div>
              </div>
              <div className="card-value" style={{ fontSize: 20 }}>
                {recentJob.region || '—'}
              </div>
              <div className="card-subtitle">
                {recentJob.start_time && recentJob.end_time
                  ? `${recentJob.start_time} – ${recentJob.end_time}`
                  : 'Not scheduled'}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">Environmental Score</span>
                <div className="card-icon green">🌱</div>
              </div>
              <div className="card-value">
                {recentJob.final_score ? recentJob.final_score.toFixed(2) : '—'}
              </div>
              <div className="card-subtitle">
                Estimated cost: {recentJob.estimated_cost ? `₹${recentJob.estimated_cost.toFixed(0)}` : '—'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="empty-state">
            <div className="empty-state-icon">🚀</div>
            <h3>No Jobs Yet</h3>
            <p style={{ marginBottom: 16 }}>Submit your first AI workload to get an environmental-aware scheduling recommendation.</p>
            <button className="btn btn-primary" onClick={() => onNavigate('workload')}>
              Submit Workload →
            </button>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div className="section-header">
          <h2 className="section-title">How FLOState Works</h2>
        </div>

        {/* Level 1 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12, padding: '6px 12px', background: 'var(--success-light)', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
            Level 1 — Query Routing
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 28 }}>
          {[
            { step: '1', title: 'Submit Query / Workload', desc: 'Enter your query or configure a workload with type, GPU, runtime, and deadline.', icon: '📝' },
            { step: '2', title: 'Query Routing', desc: 'Analyze query complexity and select the smallest capable model to avoid unnecessary computation.', icon: '🔍' },
          ].map(item => (
            <div key={item.step} style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 4 }}>
                Step {item.step}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.desc}</div>
            </div>
          ))}
        </div>

        {/* Level 2 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12, padding: '6px 12px', background: 'var(--secondary-light)', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
            Level 2 — Environmental Scheduling
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {[
            { step: '3', title: 'Collect Environmental Data', desc: 'Gather carbon, weather, water and infrastructure data for all regions.', icon: '📡' },
            { step: '4', title: 'Score Feasible Options', desc: 'Normalize carbon, water, cooling and cost to a common 0-100 scale.', icon: '📊' },
            { step: '5', title: 'Schedule', desc: 'Find the best feasible region and continuous time window using sliding-window algorithm.', icon: '🔄' },
            { step: '6', title: 'Recommend', desc: 'Return model + region + time with a transparent explanation of the decision.', icon: '✅' },
          ].map(item => (
            <div key={item.step} style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 13, color: 'var(--secondary)', fontWeight: 600, marginBottom: 4 }}>
                Step {item.step}
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Future Roadmap */}
      <div className="card">
        <div className="section-header">
          <h2 className="section-title">🗺️ Future Roadmap</h2>
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
            {[
              'Multiple real cloud regions (AWS, Azure, GCP)',
              'Real GPU provisioning and job execution',
              'Advanced ML-based workload predictions',
              'Multi-objective optimization algorithms',
              'Real energy and water consumption measurements',
              'Electricity Maps / WattTime integration',
              'OpenWeather API integration',
              'WRI Aqueduct live data',
              'Cost optimization across spot/preemptible instances',
              'Environmental impact validation and reporting',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <span style={{ color: 'var(--text-light)' }}>→</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
