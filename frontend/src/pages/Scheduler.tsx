import React, { useState, useEffect } from 'react'
import { api, ScheduleResult } from '../services/api'

export default function Scheduler() {
  const [result, setResult] = useState<ScheduleResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    runSchedule()
  }, [])

  async function runSchedule() {
    const workloadId = localStorage.getItem('lastWorkloadId')
    if (!workloadId) {
      setError('No workload submitted. Please submit a workload first.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const scheduleResult = await api.schedule(parseInt(workloadId))
      setResult(scheduleResult)
    } catch (e: any) {
      setError(e.message || 'Failed to run scheduler')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <h1>Scheduler</h1>
          <p>Running sliding-window optimization...</p>
        </div>
        <div className="card">
          <div className="loading-overlay">
            <div className="loading-spinner" style={{ width: 40, height: 40, borderWidth: 4 }}></div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Analyzing environmental data across all regions...</div>
            <div style={{ fontSize: 14 }}>Evaluating every feasible time window in the next 48 hours</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1>Scheduler</h1>
          <p>Scheduling results</p>
        </div>
        <div className="alert alert-error">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div>
        <div className="page-header">
          <h1>Scheduler</h1>
          <p>No results available</p>
        </div>
      </div>
    )
  }

  const rec = result.recommendation

  return (
    <div>
      <div className="page-header page-header-with-status">
        <div>
          <h1>Scheduling Results</h1>
          <p>
            Analyzed {result.summary.regions_analyzed} regions · 
            Evaluated {result.summary.total_windows_evaluated} time windows · 
            Rejected {result.summary.total_rejected}
          </p>
        </div>
        <div className="status-badge ready">
          <span className="status-dot"></span>
          Analysis Complete
        </div>
      </div>

      <div className="alert alert-warning" style={{ marginBottom: 24 }}>
        <span>🧪</span>
        <div>
          <strong>Simulated Data</strong> — Environmental and infrastructure data is simulated.
          This recommendation demonstrates the orchestration algorithm's decision logic.
        </div>
      </div>

      {/* Query Routing Decision */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h2 className="section-title">🔍 Query Routing Decision</h2>
          <span className="tag tag-blue">{result.query_routing.complexity}</span>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, fontStyle: 'italic' }}>
          Analyze query complexity and route to the smallest capable model to avoid unnecessary computation.
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Selected Model</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{result.query_routing.selected_model}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Compute units: {result.query_routing.compute_units} (illustrative)
            </div>
          </div>
          <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
            {result.query_routing.reason}
          </div>
        </div>

        {/* Routing flow visualization */}
        <div style={{
          background: 'var(--bg)',
          borderRadius: 'var(--radius-sm)',
          padding: 20,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>
            Query Routing Flow (Rule-Based)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              {
                level: 'Simple',
                model: 'Small Model',
                compute: 'Lower Compute',
                color: '#10b981',
                bg: '#d1fae5',
                example: result.query_routing.complexity === 'Simple' ? '→ SELECTED' : '',
              },
              {
                level: 'Moderate',
                model: 'Medium Model',
                compute: 'Moderate Compute',
                color: '#f59e0b',
                bg: '#fef3c7',
                example: result.query_routing.complexity === 'Medium' ? '→ SELECTED' : '',
              },
              {
                level: 'Complex',
                model: 'Large Model',
                compute: 'Higher Compute',
                color: '#ef4444',
                bg: '#fee2e2',
                example: result.query_routing.complexity === 'Complex' ? '→ SELECTED' : '',
              },
            ].map(tier => (
              <div key={tier.level} style={{
                padding: 14,
                borderRadius: 'var(--radius-sm)',
                border: `2px solid ${result.query_routing.complexity === tier.level ? tier.color : 'var(--border)'}`,
                background: result.query_routing.complexity === tier.level ? tier.bg : 'white',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: tier.color, marginBottom: 4 }}>
                  {tier.level}
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{tier.model}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{tier.compute}</div>
                {tier.example && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: tier.color, marginTop: 6 }}>
                    {tier.example}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Example queries for the selected tier */}
        {result.query_routing.example_queries && result.query_routing.example_queries.length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              Example queries for this complexity tier:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {result.query_routing.example_queries.map((q: string, i: number) => (
                <span key={i} style={{
                  padding: '4px 12px',
                  background: 'var(--bg)',
                  borderRadius: 20,
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}>
                  "{q}"
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-light)' }}>
          This is a rule-based router. Future versions can replace it with an ML-based query complexity classifier.
        </div>
      </div>

      {/* Recommended Execution Plan */}
      {rec ? (
        <div className="card" style={{ marginBottom: 24, border: '2px solid var(--primary)' }}>
          <div className="section-header">
            <h2 className="section-title" style={{ color: 'var(--primary-dark)' }}>
              ✅ Recommended Execution Plan
            </h2>
            <span className="tag tag-green">RECOMMENDED</span>
          </div>
          
          <div className="grid-3" style={{ marginBottom: 24 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                Region
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{rec.region}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                Time Window
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {rec.start_hour} – {rec.end_hour}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {result.summary.runtime_hours}h continuous window
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                Estimated Cost
              </div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>₹{rec.estimated_cost.toFixed(0)}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                ₹{rec.gpu_price_per_hour}/hr × {result.summary.runtime_hours}h
              </div>
            </div>
          </div>

          {/* Score Display */}
          <div className="grid-4" style={{ marginBottom: 16 }}>
            {[
              { label: 'Carbon', value: rec.carbon_score, color: '#10b981' },
              { label: 'Water', value: rec.water_score, color: '#3b82f6' },
              { label: 'Cooling', value: rec.cooling_score, color: '#f59e0b' },
              { label: 'Cost', value: rec.cost_score, color: '#8b5cf6' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.value.toFixed(1)}</span>
                </div>
                <div className="score-bar">
                  <div
                    className={`score-bar-fill ${item.value < 33 ? 'score-low' : item.value < 66 ? 'score-medium' : 'score-high'}`}
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            background: 'var(--success-light)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 15,
          }}>
            <span style={{ fontSize: 24 }}>🏆</span>
            <div>
              <strong>Final Environmental-Cost Score: {rec.final_score.toFixed(2)}</strong>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                Lower is better. Best feasible execution plan according to configured weights.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="alert alert-error">
            <span>⚠️</span>
            <div>No feasible execution window found. All options were rejected.</div>
          </div>
        </div>
      )}

      {/* Score Breakdown */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h2 className="section-title">📊 Score Breakdown</h2>
        </div>
        <div style={{
          fontFamily: 'monospace',
          fontSize: 14,
          padding: '16px 20px',
          background: 'var(--bg)',
          borderRadius: 'var(--radius-sm)',
          lineHeight: 1.8,
        }}>
          {result.explanation.score_breakdown}
        </div>
        <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
          Active Weights (from priority "{result.workload.priority}"): Carbon {result.weights.carbon}% · Water {result.weights.water}% ·
          Cooling {result.weights.cooling}% · Cost {result.weights.cost}%
        </div>
      </div>

      {/* Explanation Panel */}
      <div className="explanation-panel" style={{ marginBottom: 24 }}>
        <h3>🔍 Why did FLOState choose this?</h3>
        <div style={{ marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>
          {result.explanation.summary}
        </div>
        
        {result.explanation.why_selected.map((reason, i) => (
          <div key={i} className="explanation-item">
            <span className={reason.startsWith('✓') ? 'explanation-check' : 'explanation-cross'}>
              {reason.charAt(0)}
            </span>
            <span>{reason.substring(2)}</span>
          </div>
        ))}
      </div>

      {/* Rejected Alternatives */}
      {result.rejected.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-header">
            <h2 className="section-title">❌ Rejected Alternatives</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Region</th>
                  <th>GPU</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {result.rejected.map((r, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{r.region}</td>
                    <td>{result.summary.gpu_type}</td>
                    <td style={{ color: 'var(--danger)' }}>{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Region Comparison */}
      {result.all_candidates.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-header">
            <h2 className="section-title">📊 Region Comparison (Top Candidates)</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Region</th>
                  <th>Time Window</th>
                  <th>Carbon</th>
                  <th>Water</th>
                  <th>Cooling</th>
                  <th>Cost</th>
                  <th>Final Score</th>
                  <th>Est. Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {result.all_candidates.map((c, i) => (
                  <tr key={i} className={i === 0 ? 'region-row-recommended' : ''}>
                    <td>
                      {c.region}
                      {i === 0 && <span className="tag tag-green" style={{ marginLeft: 8, fontSize: 10 }}>★</span>}
                    </td>
                    <td>{c.start_hour} – {c.end_hour}</td>
                    <td>{c.carbon_score.toFixed(1)}</td>
                    <td>{c.water_score.toFixed(1)}</td>
                    <td>{c.cooling_score.toFixed(1)}</td>
                    <td>{c.cost_score.toFixed(1)}</td>
                    <td style={{ fontWeight: 700 }}>{c.final_score.toFixed(2)}</td>
                    <td>₹{c.estimated_cost.toFixed(0)}</td>
                    <td>
                      {i === 0
                        ? <span className="tag tag-green">Recommended</span>
                        : <span className="tag tag-blue">Feasible</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Scheduling Timeline */}
      {rec && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="section-header">
            <h2 className="section-title">⏱️ Scheduling Timeline</h2>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
            Next {result.summary.scheduler_horizon} hours · Recommended window highlighted in green
          </div>
          
          {/* Timeline visualization */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            {/* Hour labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: 'var(--text-light)' }}>
              <span>Now</span>
              <span>+12h</span>
              <span>+24h</span>
              <span>+36h</span>
              <span>+48h</span>
            </div>
            
            {/* Score bars for each region */}
            {result.all_candidates.length > 0 && (
              <div>
                {['Mumbai', 'Pune', 'Delhi', 'Bengaluru'].map(region => {
                  const regionCandidates = result.all_candidates.filter(c => c.region === region)
                  const bestForRegion = regionCandidates[0]
                  const isSelected = bestForRegion && region === rec.region
                  
                  return (
                    <div key={region} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '8px 0',
                      borderBottom: '1px solid var(--border-light)',
                    }}>
                      <div style={{
                        width: 80,
                        fontSize: 13,
                        fontWeight: isSelected ? 700 : 500,
                        color: isSelected ? 'var(--primary-dark)' : 'var(--text)',
                      }}>
                        {region}
                      </div>
                      <div style={{
                        flex: 1,
                        height: 28,
                        background: 'var(--bg)',
                        borderRadius: 4,
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        {isSelected && bestForRegion && (
                          <div style={{
                            position: 'absolute',
                            top: 2,
                            bottom: 2,
                            left: `${(parseInt(bestForRegion.start_hour) / 48) * 100}%`,
                            width: `${(result.summary.runtime_hours / 48) * 100}%`,
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.3), rgba(16, 185, 129, 0.15))',
                            border: '2px solid var(--primary)',
                            borderRadius: 4,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--primary-dark)',
                          }}>
                            {bestForRegion.start_hour} – {bestForRegion.end_hour} ✓
                          </div>
                        )}
                      </div>
                      <div style={{ width: 60, textAlign: 'right', fontSize: 13, fontWeight: 600, color: isSelected ? 'var(--primary-dark)' : 'var(--text-secondary)' }}>
                        {bestForRegion ? bestForRegion.final_score.toFixed(1) : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          🔄 Re-analyze
        </button>
        <button className="btn btn-secondary" onClick={runSchedule}>
          ♻️ Run Again
        </button>
      </div>
    </div>
  )
}
