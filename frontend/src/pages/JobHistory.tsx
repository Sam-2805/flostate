import React, { useState, useEffect } from 'react'
import { api, JobHistory as JobHistoryType } from '../services/api'

export default function JobHistory() {
  const [jobs, setJobs] = useState<JobHistoryType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedJob, setSelectedJob] = useState<JobHistoryType | null>(null)

  useEffect(() => {
    loadJobs()
  }, [])

  async function loadJobs() {
    try {
      const data = await api.getJobs()
      setJobs(data)
    } catch (e) {
      console.error('Failed to load jobs:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Job History</h1>
        <p>All submitted workloads and their scheduling results</p>
      </div>

      {loading ? (
        <div className="card">
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            Loading job history...
          </div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No Jobs Yet</h3>
            <p>Workloads submitted through the Workload page will appear here.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Complexity</th>
                    <th>GPU</th>
                    <th>Runtime</th>
                    <th>Region</th>
                    <th>Window</th>
                    <th>Model</th>
                    <th>Score</th>
                    <th>Cost</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr
                      key={job.id}
                      onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: 600 }}>#{job.id}</td>
                      <td style={{ fontWeight: 600 }}>{job.name}</td>
                      <td>
                        <span className="tag tag-blue">{job.workload_type}</span>
                      </td>
                      <td>
                        <span className={`tag ${
                          job.complexity === 'Simple' ? 'tag-green' :
                          job.complexity === 'Medium' ? 'tag-amber' : 'tag-red'
                        }`}>{job.complexity}</span>
                      </td>
                      <td>{job.gpu}</td>
                      <td>{job.runtime_hours}h</td>
                      <td style={{ fontWeight: 600 }}>{job.region || '—'}</td>
                      <td>
                        {job.start_time && job.end_time
                          ? `${job.start_time} – ${job.end_time}`
                          : '—'}
                      </td>
                      <td>{job.model || '—'}</td>
                      <td style={{ fontWeight: 600 }}>
                        {job.final_score ? job.final_score.toFixed(2) : '—'}
                      </td>
                      <td>
                        {job.estimated_cost ? `₹${job.estimated_cost.toFixed(0)}` : '—'}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {job.created_at ? new Date(job.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Job Detail */}
          {selectedJob && (
            <div className="card" style={{ marginTop: 24 }}>
              <div className="section-header">
                <h2 className="section-title">Job #{selectedJob.id} Details</h2>
                <button className="btn btn-secondary" onClick={() => setSelectedJob(null)}>
                  Close
                </button>
              </div>

              <div className="grid-3" style={{ marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Workload</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedJob.name}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Region</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedJob.region || '—'}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Model</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{selectedJob.model || '—'}</div>
                </div>
              </div>

              {selectedJob.reason && (
                <div style={{
                  padding: 16,
                  background: 'var(--success-light)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  lineHeight: 1.6,
                }}>
                  {selectedJob.reason}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
