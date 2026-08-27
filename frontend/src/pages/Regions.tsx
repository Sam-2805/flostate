import React, { useState, useEffect } from 'react'
import { api, Region } from '../services/api'

export default function Regions() {
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRegions()
  }, [])

  async function loadRegions() {
    try {
      const data = await api.getRegions()
      setRegions(data)
    } catch (e) {
      console.error('Failed to load regions:', e)
    } finally {
      setLoading(false)
    }
  }

  const gpuTypes = ['T4', 'A10', 'A100', 'H100']

  return (
    <div>
      <div className="page-header page-header-with-status">
        <div>
          <h1>Regions</h1>
          <p>Simulated infrastructure data for available regions</p>
        </div>
        <div className="status-badge ready">
          <span className="status-dot"></span>
          Prototype Data
        </div>
      </div>

      <div className="alert alert-warning" style={{ marginBottom: 24 }}>
        <span>🧪</span>
        <div>
          <strong>Simulated Infrastructure Data</strong> — GPU availability, pricing, and region status
          are prototype values for demonstration purposes. Not connected to real cloud providers.
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            Loading regions...
          </div>
        </div>
      ) : (
        <div className="grid-2">
          {regions.map(region => (
            <div key={region.name} className="card">
              <div className="card-header">
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>{region.name}</h3>
                  <span className="tag tag-green" style={{ marginTop: 4 }}>{region.status}</span>
                </div>
                <div className="card-icon blue">🌐</div>
              </div>

              <div className="table-container" style={{ marginTop: 16 }}>
                <table>
                  <thead>
                    <tr>
                      <th>GPU</th>
                      <th>Status</th>
                      <th>Count</th>
                      <th>Price/hr</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gpuTypes.map(gpu => {
                      const gpuData = region.gpus[gpu]
                      return (
                        <tr key={gpu}>
                          <td style={{ fontWeight: 600 }}>{gpu}</td>
                          <td>
                            {gpuData?.available
                              ? <span className="tag tag-green">Available</span>
                              : <span className="tag tag-red">Unavailable</span>}
                          </td>
                          <td>{gpuData?.count || 0}</td>
                          <td style={{ fontWeight: 600 }}>
                            {gpuData?.available ? `₹${gpuData.price_per_hour}` : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GPU Summary */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="section-header">
          <h2 className="section-title">GPU Availability Summary</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>GPU Type</th>
                {regions.map(r => <th key={r.name}>{r.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {gpuTypes.map(gpu => (
                <tr key={gpu}>
                  <td style={{ fontWeight: 600 }}>{gpu}</td>
                  {regions.map(r => {
                    const gpuData = r.gpus[gpu]
                    return (
                      <td key={r.name}>
                        {gpuData?.available
                          ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>✓ ₹{gpuData.price_per_hour}/hr</span>
                          : <span style={{ color: 'var(--danger)' }}>✕ Unavailable</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
