import React, { useState, useEffect } from 'react'
import { api } from '../services/api'

export default function Settings() {
  const [weights, setWeights] = useState({
    carbon: 40,
    water: 25,
    cooling: 20,
    cost: 15,
  })
  const [schedulerHorizon, setSchedulerHorizon] = useState(48)
  const [saved, setSaved] = useState(false)

  const totalWeight = weights.carbon + weights.water + weights.cooling + weights.cost
  const isValid = Math.abs(totalWeight - 100) < 0.01

  const updateWeight = (field: string, value: number) => {
    setWeights(prev => ({ ...prev, [field]: Math.max(0, Math.min(100, value)) }))
    setSaved(false)
  }

  const handleSave = () => {
    if (!isValid) return
    // Save to localStorage for the scheduler to pick up
    localStorage.setItem('flostate_weights', JSON.stringify(weights))
    localStorage.setItem('flostate_horizon', schedulerHorizon.toString())
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const resetDefaults = () => {
    setWeights({ carbon: 40, water: 25, cooling: 20, cost: 15 })
    setSchedulerHorizon(48)
    localStorage.removeItem('flostate_weights')
    localStorage.removeItem('flostate_horizon')
    setSaved(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Configure scoring weights, data mode, and scheduler parameters</p>
      </div>

      {/* Scoring Weights */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h2 className="section-title">⚖️ Scoring Weights</h2>
          <span className={`tag ${isValid ? 'tag-green' : 'tag-red'}`}>
            Total: {totalWeight}%
          </span>
        </div>

        <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
          Adjust the relative importance of each factor. All weights must sum to 100%.
          Lower final score = better option.
        </div>

        {[
          { key: 'carbon', label: 'Carbon Score', color: '#10b981', desc: 'Grid carbon intensity (gCO2eq/kWh)' },
          { key: 'water', label: 'Water Score', color: '#3b82f6', desc: 'Regional water stress level' },
          { key: 'cooling', label: 'Cooling Score', color: '#f59e0b', desc: 'Temperature + humidity cooling cost' },
          { key: 'cost', label: 'Cost Score', color: '#8b5cf6', desc: 'GPU hourly price × runtime' },
        ].map(item => (
          <div key={item.key} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8 }}>
                  {item.desc}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={(weights as any)[item.key]}
                  onChange={e => updateWeight(item.key, parseInt(e.target.value))}
                  style={{ width: 200, accentColor: item.color }}
                />
                <input
                  type="number"
                  value={(weights as any)[item.key]}
                  onChange={e => updateWeight(item.key, parseInt(e.target.value) || 0)}
                  style={{
                    width: 60,
                    padding: '4px 8px',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    fontSize: 14,
                    fontWeight: 600,
                    textAlign: 'center',
                  }}
                />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>%</span>
              </div>
            </div>
            <div className="score-bar" style={{ height: 6 }}>
              <div
                style={{
                  height: '100%',
                  width: `${(weights as any)[item.key]}%`,
                  background: item.color,
                  borderRadius: 4,
                  transition: 'width 0.2s',
                }}
              ></div>
            </div>
          </div>
        ))}

        {!isValid && (
          <div className="alert alert-error" style={{ marginTop: 16 }}>
            <span>⚠️</span>
            <div>
              Weights must sum to 100%. Current total: {totalWeight}%.
              {totalWeight > 100
                ? ` Reduce by ${totalWeight - 100}%.`
                : ` Add ${100 - totalWeight}%.`}
            </div>
          </div>
        )}
      </div>

      {/* Data Mode */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h2 className="section-title">📡 Data Mode</h2>
        </div>

        <div className="form-group">
          <label className="form-label">Environmental Data Source</label>
          <select className="form-select" disabled>
            <option value="DEMO">DEMO — Simulated data (current)</option>
            <option value="LIVE" disabled>LIVE — Real API data (future)</option>
          </select>
          <div className="form-hint">
            Demo mode uses generated environmental data. Live mode (future) will connect to
            Electricity Maps, OpenWeather, and WRI Aqueduct APIs.
          </div>
        </div>
      </div>

      {/* Scheduler Horizon */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h2 className="section-title">⏱️ Scheduler Configuration</h2>
        </div>

        <div className="form-group">
          <label className="form-label">Scheduler Horizon</label>
          <select
            className="form-select"
            value={schedulerHorizon}
            onChange={e => setSchedulerHorizon(parseInt(e.target.value))}
          >
            <option value={24}>24 hours</option>
            <option value={48}>48 hours (default)</option>
          </select>
          <div className="form-hint">
            How far ahead the scheduler looks for optimal execution windows.
          </div>
        </div>
      </div>

      {/* Data Mode Info */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="section-header">
          <h2 className="section-title">🔌 Future API Integrations</h2>
        </div>

        <div className="grid-3">
          {[
            {
              service: 'Carbon Intensity',
              apis: ['Electricity Maps API', 'WattTime API'],
              icon: '🏭',
              status: 'Planned',
            },
            {
              service: 'Weather Forecast',
              apis: ['OpenWeather API', 'Tomorrow.io'],
              icon: '🌡️',
              status: 'Planned',
            },
            {
              service: 'Water Risk',
              apis: ['WRI Aqueduct Water Risk Atlas'],
              icon: '💧',
              status: 'Planned',
            },
          ].map(item => (
            <div key={item.service} style={{
              padding: 20,
              background: 'var(--bg)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{item.service}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {item.apis.join(' · ')}
              </div>
              <span className="tag tag-amber">{item.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save Actions */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!isValid}
        >
          {saved ? '✓ Saved!' : '💾 Save Settings'}
        </button>
        <button className="btn btn-secondary" onClick={resetDefaults}>
          Reset to Defaults
        </button>
        {saved && (
          <span style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 500 }}>
            ✓ Settings saved. New submissions will use updated weights.
          </span>
        )}
      </div>
    </div>
  )
}
