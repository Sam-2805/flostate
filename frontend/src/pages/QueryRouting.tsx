import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

interface QueryResult {
  query_text: string
  complexity: string
  selected_model: string
  model_id: string
  compute_units: number
  reason: string
  description: string
  example_queries: string[]
}

interface RoutingStats {
  total: number
  small: number
  medium: number
  large: number
  small_pct: number
  medium_pct: number
  large_pct: number
  avoiding_large_pct: number
  baseline_compute: number
  flostate_compute: number
  compute_saved: number
  reduction_pct: number
  compute_units: { [key: string]: number }
  disclaimer: string
}

const EXAMPLE_QUERIES = [
  { text: 'What is 2 + 2?', expected: 'Simple' },
  { text: 'Explain how TCP congestion control works.', expected: 'Moderate' },
  { text: 'Analyze this complex research problem and compare multiple algorithmic approaches.', expected: 'Complex' },
  { text: 'Is Python a programming language?', expected: 'Simple' },
  { text: 'Write a Python function to parse CSV files.', expected: 'Moderate' },
  { text: 'Design a distributed system architecture for a real-time recommendation engine.', expected: 'Complex' },
]

export default function QueryRouting() {
  const [queryInput, setQueryInput] = useState('')
  const [result, setResult] = useState<QueryResult | null>(null)
  const [stats, setStats] = useState<RoutingStats | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    loadStatsAndHistory()
  }, [])

  async function loadStatsAndHistory() {
    try {
      const [s, h] = await Promise.all([
        api.getQueryRoutingStats(),
        api.getQueryRoutes(),
      ])
      setStats(s)
      setHistory(h.slice(0, 50)) // Show last 50
    } catch (e) {
      console.error('Failed to load query routing data:', e)
    } finally {
      setStatsLoading(false)
    }
  }

  async function handleRoute() {
    if (!queryInput.trim()) return
    setLoading(true)
    try {
      const r = await api.queryRoute(queryInput.trim())
      setResult(r)
      // Refresh stats and history
      const [s, h] = await Promise.all([
        api.getQueryRoutingStats(),
        api.getQueryRoutes(),
      ])
      setStats(s)
      setHistory(h.slice(0, 50))
    } catch (e: any) {
      console.error('Routing failed:', e)
    } finally {
      setLoading(false)
    }
  }

  function handleExampleClick(text: string) {
    setQueryInput(text)
  }

  return (
    <div>
      <div className="page-header page-header-with-status">
        <div>
          <h1>Level 1 — Query Routing</h1>
          <p>Analyze query complexity and route to the smallest capable model</p>
        </div>
        <div className="status-badge ready">
          <span className="status-dot"></span>
          Rule-Based Classifier
        </div>
      </div>

      <div className="alert alert-info" style={{ marginBottom: 24 }}>
        <span>🔍</span>
        <div>
          <strong>Query Routing</strong> answers: <em>"Which AI model should handle this query?"</em>
          The goal is to avoid sending every query to a large, compute-intensive model.
          This is a <strong>rule-based router</strong> (not ML). Compute units are illustrative, not direct energy measurements.
        </div>
      </div>

      {/* Query Input */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Enter Your Query</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            className="form-input"
            value={queryInput}
            onChange={e => setQueryInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRoute()}
            placeholder="Type a query, e.g. 'What is 2 + 2?'"
            style={{ flex: 1, fontSize: 15 }}
          />
          <button
            className="btn btn-primary"
            onClick={handleRoute}
            disabled={loading || !queryInput.trim()}
          >
            {loading ? <span className="loading-spinner"></span> : '🔍'} Route Query
          </button>
        </div>

        {/* Example queries */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Try an example:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EXAMPLE_QUERIES.map((ex, i) => (
              <button
                key={i}
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '6px 12px' }}
                onClick={() => handleExampleClick(ex.text)}
              >
                {ex.text.length > 40 ? ex.text.slice(0, 40) + '...' : ex.text}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Routing Result */}
      {result && (
        <div className="card" style={{ marginBottom: 24, border: '2px solid var(--primary)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: 'var(--primary-dark)' }}>
            Routing Result
          </h3>

          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Query</div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>"{result.query_text}"</div>
          </div>

          <div className="grid-3" style={{ marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Complexity</div>
              <span className={`tag ${
                result.complexity === 'Simple' ? 'tag-green' :
                result.complexity === 'Moderate' ? 'tag-amber' : 'tag-red'
              }`} style={{ fontSize: 14, padding: '6px 14px' }}>
                {result.complexity}
              </span>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Selected Model</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{result.selected_model}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Compute Units</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{result.compute_units} unit{result.compute_units !== 1 ? 's' : ''}</div>
              <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Illustrative (not actual energy)</div>
            </div>
          </div>

          <div style={{ padding: 12, background: 'var(--success-light)', borderRadius: 'var(--radius-sm)', fontSize: 14 }}>
            {result.reason}
          </div>
        </div>
      )}

      {/* Impact Dashboard */}
      {stats && stats.total > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Query Routing Impact</h3>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Based on {stats.total.toLocaleString()} routed queries (including demo data)
          </div>

          <div className="grid-4" style={{ marginBottom: 24 }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Queries Analyzed</div>
              <div className="card-value">{stats.total.toLocaleString()}</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Avoiding Large Model</div>
              <div className="card-value" style={{ color: 'var(--primary)' }}>{stats.avoiding_large_pct}%</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: 8 }}>Baseline Compute</div>
              <div className="card-value" style={{ fontSize: 24 }}>{stats.baseline_compute.toLocaleString()}</div>
              <div className="card-subtitle">units</div>
            </div>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="card-title" style={{ marginBottom: 8 }}>FLOState Compute</div>
              <div className="card-value" style={{ fontSize: 24, color: 'var(--primary)' }}>{stats.flostate_compute.toLocaleString()}</div>
              <div className="card-subtitle">units</div>
            </div>
          </div>

          {/* Model Distribution */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Model Distribution</div>
            {[
              { label: 'Small Model', count: stats.small, pct: stats.small_pct, color: '#10b981', units: 1 },
              { label: 'Medium Model', count: stats.medium, pct: stats.medium_pct, color: '#f59e0b', units: 3 },
              { label: 'Large Model', count: stats.large, pct: stats.large_pct, color: '#ef4444', units: 10 },
            ].map(item => (
              <div key={item.label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label} ({item.units} unit{item.units !== 1 ? 's' : ''})</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.count.toLocaleString()} ({item.pct}%)</span>
                </div>
                <div className="score-bar" style={{ height: 10 }}>
                  <div
                    className="score-bar-fill"
                    style={{ width: `${item.pct}%`, background: item.color }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Compute Comparison */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Compute Comparison</div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>All-Large Baseline</div>
                <div style={{
                  height: Math.min(200, (stats.baseline_compute / stats.baseline_compute) * 200),
                  background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: '#dc2626', minHeight: 60,
                }}>
                  {stats.baseline_compute.toLocaleString()} units
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>FLOState Routed</div>
                <div style={{
                  height: Math.max(40, (stats.flostate_compute / stats.baseline_compute) * 200),
                  background: 'linear-gradient(135deg, #d1fae5, #a7f3d0)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 700, color: 'var(--primary-dark)', minHeight: 60,
                }}>
                  {stats.flostate_compute.toLocaleString()} units
                </div>
              </div>
              <div style={{ textAlign: 'center', padding: '0 20px' }}>
                <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--primary)' }}>
                  {stats.reduction_pct}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Estimated Compute<br/>Reduction
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--text-light)', fontStyle: 'italic' }}>
            {stats.disclaimer}
          </div>
        </div>
      )}

      {/* Query Routing History */}
      {history.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Query Routing History</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Complexity</th>
                  <th>Selected Model</th>
                  <th>Compute</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {history.map((r, i) => (
                  <tr key={r.id || i}>
                    <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.query_text}
                    </td>
                    <td>
                      <span className={`tag ${
                        r.complexity === 'Simple' ? 'tag-green' :
                        r.complexity === 'Moderate' ? 'tag-amber' : 'tag-red'
                      }`}>{r.complexity}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{r.selected_model}</td>
                    <td>{r.compute_units} unit{r.compute_units !== 1 ? 's' : ''}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.reason}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
